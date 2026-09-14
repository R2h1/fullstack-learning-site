<script setup>
import { withBase } from 'vitepress'

const tracks = {
  frontend: { label: '前端', color: '#3b82f6' },
  backend: { label: '后端', color: '#10b981' },
  ai: { label: 'AI', color: '#8b5cf6' },
  interview: { label: '面试', color: '#f59e0b' },
}

const chapters = [
  { no: '01', title: 'JavaScript 运行时', desc: '闭包/this · 事件循环 · Promise 手写 · GC 内存', link: '/01-JavaScript运行时', track: 'frontend' },
  { no: '02', title: 'TypeScript', desc: '类型系统 · 工具类型 · 类型体操 · zod 校验', link: '/02-TypeScript', track: 'frontend' },
  { no: '03', title: '前端框架原理', desc: 'Vue 响应式 · diff 与编译优化 · React Fiber 对照', link: '/03-前端框架原理', track: 'frontend' },
  { no: '04', title: '前端工程化', desc: '打包原理 · 测试 · CI/CD · Monorepo', link: '/04-前端工程化', track: 'frontend' },
  { no: '05', title: '浏览器·网络·性能', desc: 'URL 全链路 · 缓存 · Vitals · 安全', link: '/05-浏览器网络与性能', track: 'frontend' },
  { no: '06', title: 'Node.js 运行时', desc: '事件循环 · 进程模型 · Stream · 异步', link: '/06-Node.js运行时', track: 'backend' },
  { no: '07', title: 'HTTP 框架与中间件', desc: 'Fastify/Express · 请求生命周期 · 校验', link: '/07-HTTP框架与中间件', track: 'backend' },
  { no: '08', title: '认证与授权', desc: 'JWT/session · Cookie 安全 · OAuth2 · 权限', link: '/08-认证与授权', track: 'backend' },
  { no: '09', title: 'API 设计', desc: 'REST · 分页 · 幂等 · 限流 · 版本化', link: '/09-API设计', track: 'backend' },
  { no: '10', title: '后端工程化', desc: '测试分层 · 部署运维 · 可观测 · 优雅关闭', link: '/10-后端工程化', track: 'backend' },
  { no: '11', title: '数据库', desc: 'SQL/索引 · 事务并发 · ORM 选型', link: '/11-数据库', track: 'backend' },
  { no: '12', title: '缓存与分布式基础', desc: '缓存三连 · Redis · CAP · MQ', link: '/12-缓存与分布式基础', track: 'backend' },
  { no: '13', title: '系统设计实战', desc: '五步法 · 估算 · 经典题', link: '/13-系统设计实战', track: 'backend' },
  { no: '14', title: 'AI 协作工作流', desc: 'vibe coding · 上下文工程 · 审查 AI 产出', link: '/14-AI协作工作流', track: 'ai' },
  { no: '15', title: 'LLM 与 RAG', desc: '调用 · prompt · 结构化输出 · 检索增强', link: '/15-LLM与RAG', track: 'ai' },
  { no: '16', title: 'Agent 与 MCP', desc: '工具调用 · Agent 编排 · MCP · 评估', link: '/16-Agent与MCP', track: 'ai' },
  { no: '17', title: 'AI 原生 UI 与端侧', desc: '生成式交互 · 人在环中 · 端侧推理', link: '/17-AI原生UI与端侧AI', track: 'ai' },
  { no: '18', title: '面试备战与行动清单', desc: '手写题 · 系统设计 · 项目深挖 · 90 天计划', link: '/18-面试备战与行动清单', track: 'interview' },
]
</script>

<template>
  <div class="chapter-grid">
    <a v-for="c in chapters" :key="c.no" class="chapter-card" :href="withBase(c.link)">
      <div class="card-top">
        <span class="no">{{ c.no }}</span>
        <span class="tag" :style="{ background: tracks[c.track].color }">{{ tracks[c.track].label }}</span>
      </div>
      <div class="title">{{ c.title }}</div>
      <div class="desc">{{ c.desc }}</div>
      <div class="arrow">→</div>
    </a>
  </div>
</template>

<style scoped>
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 14px;
  margin: 20px 0 8px;
}
.chapter-card {
  position: relative;
  display: block;
  padding: 16px 16px 34px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.chapter-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.no {
  font-size: 13px;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}
.tag {
  font-size: 11px;
  line-height: 1;
  padding: 4px 9px;
  border-radius: 999px;
  color: #fff;
}
.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.45;
}
.desc {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
.arrow {
  position: absolute;
  right: 14px;
  bottom: 12px;
  font-size: 14px;
  color: var(--vp-c-text-3);
  transition: transform 0.2s, color 0.2s;
}
.chapter-card:hover .arrow {
  transform: translateX(3px);
  color: var(--vp-c-brand-1);
}
</style>
