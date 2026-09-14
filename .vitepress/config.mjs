import { defineConfig } from 'vitepress'

// GitHub Pages 项目站点部署在子路径（https://<user>.github.io/fullstack-learning-site/）
// 本地 dev 访问 http://localhost:5174/fullstack-learning-site/（与线上路径一致，避免"本地正常线上 404"）
const base = '/fullstack-learning-site/'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: '全栈 × AI 学习路径',
  description: '面试级 · 生产级 · 企业级的全栈 + AI 学习课程（个人笔记，内容优先）',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: `${base}logo.svg` }]],

  themeConfig: {
    logo: `${base}logo.svg`,
    siteTitle: '全栈 × AI',
    nav: [
      { text: '首页', link: '/' },
      { text: '前端底座', link: '/01-JavaScript运行时' },
      { text: '后端', link: '/06-Node.js运行时' },
      { text: 'AI 工程', link: '/15-LLM与RAG' },
      { text: '面试备战', link: '/18-面试备战与行动清单' },
    ],

    sidebar: [
      {
        text: '前端底座',
        items: [
          { text: '01 · JavaScript 运行时', link: '/01-JavaScript运行时' },
          { text: '02 · TypeScript', link: '/02-TypeScript' },
          { text: '03 · 前端框架原理', link: '/03-前端框架原理' },
          { text: '04 · 前端工程化', link: '/04-前端工程化' },
          { text: '05 · 浏览器·网络·性能', link: '/05-浏览器网络与性能' },
        ],
      },
      {
        text: '后端',
        items: [
          { text: '06 · Node.js 运行时', link: '/06-Node.js运行时' },
          { text: '07 · HTTP 框架与中间件', link: '/07-HTTP框架与中间件' },
          { text: '08 · 认证与授权', link: '/08-认证与授权' },
          { text: '09 · API 设计', link: '/09-API设计' },
          { text: '10 · 后端工程化', link: '/10-后端工程化' },
          { text: '11 · 数据库', link: '/11-数据库' },
          { text: '12 · 缓存与分布式基础', link: '/12-缓存与分布式基础' },
          { text: '13 · 系统设计实战', link: '/13-系统设计实战' },
        ],
      },
      {
        text: 'AI',
        items: [
          { text: '14 · AI 协作工作流', link: '/14-AI协作工作流' },
          { text: '15 · LLM 与 RAG', link: '/15-LLM与RAG' },
          { text: '16 · Agent 与 MCP', link: '/16-Agent与MCP' },
          { text: '17 · AI 原生 UI 与端侧', link: '/17-AI原生UI与端侧AI' },
        ],
      },
      {
        text: '面试',
        items: [{ text: '18 · 面试备战与行动清单', link: '/18-面试备战与行动清单' }],
      },
    ],

    outline: { label: '本页目录', level: [2, 3] },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    docFooter: { prev: '上一章', next: '下一章' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/R2h1/fullstack-learning-site' }],
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    returnToTopLabel: '回到顶部',
  },
})
