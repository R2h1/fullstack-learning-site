# SaaS 后端脚手架 (23 章)

这是 23 章「项目实操册」的起点，目标是让你第 1 周就能把 docker-compose + Prisma schema + NestJS 模块跑起来，而不是被环境配置卡住。

## 🎯 一句话目标

**一个多租户任务管理 SaaS 的后端骨架**：注册/登录（JWT 双 token）、团队/租户模型、任务 CRUD、操作审计日志、webhook 出站队列、Docker 部署流水线。

---

## 📁 目录结构

```
saas-backend/
├─ docker/
│  ├─ Dockerfile          # 多阶段构建
│  └─ docker-compose.yml  # 本地开发环境
├─ prisma/
│  ├─ schema.prisma       # ORM 模型定义
│  └─ migrations/         # 版本化迁移
├─ src/
│  ├─ main.ts             # NestJS 入口
│  ├─ modules/
│  │  ├─ auth/            # 认证与授权 (JWT + OAuth2)
│  │  │  ├─ auth.service.ts
│  │  │  ├─ auth.controller.ts
│  │  │  └─ jwt.strategy.ts
│  │  ├─ tenant/          # 多租户模型（团队/角色/权限）
│  │  │  ├─ tenant.service.ts
│  │  │  └─ tenant.controller.ts
│  │  ├─ tasks/           # 任务 CRUD
│  │  │  ├─ tasks.service.ts
│  │  │  └─ tasks.controller.ts
│  │  ├─ audit/           # 操作审计日志
│  │  │  ├─ audit.service.ts
│  │  │  └─ audit.middleware.ts
│  │  └─ webhook/         # 出站 webhook（重试 + 死信队列）
│  │     ├─ webhook.service.ts
│  │     └─ webhook.processor.ts
│  ├─ common/
│  │  ├─ guards/          # RBAC 守卫
│  │  └─ decorators/      # 装饰器（@Roles(), @CurrentTenant()）
│  └─ config/             # 环境变量配置
├─ tests/
│  ├─ e2e/                # 端到端测试
│  └─ integration/         # 集成测试
├─ nginx/                  # 反向代理（可选）
└─ package.json
```

---

## 🔧 Docker + Prisma 起步

### 1. docker-compose.yml（本地开发环境）

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: saas-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/saas
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - .:/app           # 代码热重载
      - /app/node_modules # 避免覆盖 npm install 的包
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    container_name: saas-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saas
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: saas-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### 2. Dockerfile（多阶段构建）

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 3. Prisma Schema（核心模型）

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 租户（团队）模型
model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  users     TenantUser[]
  tasks     Task[]
  webhooks  Webhook[]
}

// 租户成员模型（RBAC）
model TenantUser {
  id        String   @id @default(uuid())
  tenantId  String
  userId    String
  role      String   // admin / member / viewer
  createdAt DateTime @default(now())
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  user      User     @relation("tenantMembers", fields: [userId], references: [id])
  
  @@unique([tenantId, userId])
}

// 用户模型（全局）
model User {
  id        String      @id @default(uuid())
  email     String      @unique
  password  String      // BCrypt 哈希
  createdAt DateTime    @default(now())
  
  tenants   TenantUser[]
  audits    AuditLog[]  // 审计日志记录者
}

// 任务模型（CRUD）
model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      String   // todo | in_progress | done
  assigneeId  String?
  tenantId    String
  createdBy   String
  
  tenant   Tenant       @relation(fields: [tenantId], references: [id])
  assignee User        @relation("taskAssignees", fields: [assigneeId], references: [id])
  creator  User        @relation("taskCreators", fields: [createdBy], references: [id])
  
  audits   AuditLog[]
  
  @@index([tenantId])
}

// 操作审计日志（10 章内容落地）
model AuditLog {
  id          String   @id @default(uuid())
  action      String   // created | updated | deleted
  resource    String   // task | user | tenant
  resourceId  String
  userId      String   // 操作者
  details     Json?    // diff 数据
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  user         User        @relation(fields: [userId], references: [id])
}

// 出站 Webhook（重试队列 + 死信）
model Webhook {
  id          String   @id @default(uuid())
  tenantId    String
  url         String
  event       String   // task.created | task.updated | task.deleted
  payload     Json
  status      String   // pending | sent | failed | dead_letter
  attempts    Int      @default(0)
  lastError   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([status])
  @@index([tenantId])
}
```

---

## ⚡️ NestJS 模块实现模板

### 1. JWT 双 Token 策略（`src/modules/auth/jwt.strategy.ts`）

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: any) {
    return { sub: payload.sub, email: payload.email };
  }
}

// Refresh token 策略（更长过期时间，存储在 httpOnly cookie）
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: any) {
    return { sub: payload.sub, refreshId: payload.refreshId };
  }
}
```

### 2. RBAC 守卫（`src/common/guards/roles.guard.ts`）

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// 装饰器定义
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### 3. 多租户中间件（`src/common/middleware/tenant.middleware.ts`）

```typescript
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../../modules/tenant/tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    if (!tenantSlug) {
      throw new BadRequestException('Missing X-Tenant-Slug header');
    }

    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    (req as any).tenant = tenant;
    next();
  }
}
```

### 4. Webhook 出站队列（`src/modules/webhook/webhook.processor.ts`）

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';

export interface WebhookJobData {
  url: string;
  payload: Record<string, any>;
  maxRetries?: number;
}

export class WebhookProcessor {
  constructor(
    @InjectQueue('webhooks') private webhookQueue: Queue,
  ) {}

  async emitEvent(event: string, payload: WebhookJobData) {
    await this.webhookQueue.add({
      event,
      ...payload,
      attempts: 0,
    });
  }

  async process(job) {
    const { url, payload, attempts = 0, maxRetries = 3 } = job.data;

    try {
      await axios.post(url, payload, { timeout: 5000 });
      return 'success';
    } catch (error) {
      if (attempts < maxRetries) {
        // 指数退避重试
        const delay = Math.pow(2, attempts) * 1000;
        await this.webhookQueue.add(job.data, { delay });
        throw error;
      } else {
        // 进入死信状态
        throw new Error('Max retries exceeded');
      }
    }
  }
}
```

---

## 🚀 CI/CD 流水线（GitHub Actions）

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Run tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      
      - name: Build
        run: npm run build
      
      - name: Docker login
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Push Docker image
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: ${{ secrets.DOCKER_REGISTRY }}/saas-backend:${{ github.sha }}
      
      - name: Deploy to production
        run: |
          ssh ${{ secrets.PRODUCTION_HOST }} << 'EOF'
            cd /opt/saas-backend
            docker pull ${{ secrets.DOCKER_REGISTRY }}/saas-backend:${{ github.sha }}
            docker compose up -d
          EOF
```

---

## ✅ 验收清单（23 章项目一）

- [ ] `docker-compose up -d` 启动成功 → 访问 `http://localhost:3000` 返回健康检查
- [ ] `npx prisma migrate dev` → schema 正确同步到数据库
- [ ] JWT 登录流程完整 → access token + refresh token（httpOnly cookie）
- [ ] RBAC 守卫生效 → `@Roles('admin')` 只能被管理员访问
- [ ] 多租户 middleware → 通过 `X-Tenant-Slug` 自动隔离
- [ ] 任务 CRUD API 正常 → GET/POST/PUT/DELETE + pagination
- [ ] 审计日志自动记录 → 每次 write 操作都有 entry
- [ ] Webhook 队列 → 失败自动重试，最终进入 dead letter 状态
- [ ] GitHub Actions CI 全绿（lint/test/build）
- [ ] Docker 镜像构建 + 推送成功

---

## 🧪 测试骨架（E2E）

```typescript
describe('Tasks E2E', () => {
  let app;
  let accessToken;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // 登录获取 token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);
    
    accessToken = loginRes.body.access_token;
  });

  it('GET /tasks should return tasks for current tenant', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Slug', 'acme-corp')
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('POST /tasks should create task with audit log', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Slug', 'acme-corp')
      .send({ title: 'New task' })
      .expect(201);

    // 验证审计日志生成
    await request(app.getHttpServer())
      .get('/audit?action=created&resource=task')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(res => {
        expect(res.body.data.length).toBeGreaterThan(0);
      });
  });
});
```

---

## 📚 参考资源

- NestJS 官方文档：https://docs.nestjs.com/
- Prisma ORM：https://www.prisma.io/docs/
- BullMQ 队列：https://docs.bullmq.io/
- PostgreSQL 最佳实践：https://wiki.postgresql.org/wiki/Achieve_Maximum_Concurrency

---

## 🛠️ 实施路线图

| 周次 | 任务 | 里程碑 |
|---|---|---|
| Week 1 | docker-compose + Prisma schema + NestJS 模块骨架 | localhost:3000 可访问 + 健康检查 green |
| Week 2 | 认证模块（JWT + 刷新 token）+ OAuth2 对接 | 登录流程完整 |
| Week 3 | 多租户模型 + RBAC 守卫 + 中间件 | `X-Tenant-Slug` 工作正常 |
| Week 4 | 任务 CRUD + audit 日志模块 | E2E 测试全绿 |
| Week 5 | Webhook 队列 + 重试逻辑 | 死信队列有 entry |
| Week 6 | CI/CD + Docker 部署流水线 | GitHub Actions 自动部署 |
| Week 7–8 | 公开上线 + 找真实用户 | 20 个活跃用户截图 |
