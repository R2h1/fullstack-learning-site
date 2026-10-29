<script setup>
import { withBase } from 'vitepress'

const points = [
  '27–34 周 · 四阶段',
  '逐项勾选，刷新不丢',
  '可切 Java 存量路线',
  '两个可面试项目收口',
]
</script>

<template>
  <div class="roadmap-entry">
    <div class="entry-main">
      <div class="entry-title">🗺️ 交互式学习路线图</div>
      <p class="entry-desc">
        章节解决「知识点」，路线图解决「时间和项目怎么排」：后端全栈 → AI 应用工程 → 生产级深化 → 面试整合，
        每个阶段以一个可面试的项目收口，前端补强嵌在阶段里当质量门槛。
      </p>
      <div class="entry-points">
        <span v-for="p in points" :key="p" class="point">{{ p }}</span>
      </div>
    </div>
    <a
      class="entry-btn"
      :href="withBase('/roadmap.html')"
      target="_blank"
      rel="noreferrer"
    >打开路线图 <span aria-hidden="true">→</span></a>
  </div>
</template>

<style scoped>
.roadmap-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 20px 0 8px;
  padding: 22px 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}
.entry-main { min-width: 0; }
.entry-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.entry-desc {
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.entry-points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.point {
  font-size: 12px;
  line-height: 1;
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.entry-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 999px;
  color: var(--vp-button-brand-text);
  background: var(--vp-button-brand-bg);
  text-decoration: none !important;
  transition: background-color 0.2s;
}
.entry-btn:hover { background: var(--vp-button-brand-hover-bg); }

@media (max-width: 640px) {
  .roadmap-entry {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 18px;
  }
  .entry-btn {
    align-self: stretch;
    justify-content: center;
  }
}
</style>
