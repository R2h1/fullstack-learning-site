import { defineConfig } from 'vitepress'

// GitHub Pages 项目站点部署在子路径（https://<user>.github.io/fullstack-learning-site/）
// 本地 dev 访问 http://localhost:5174/fullstack-learning-site/（与线上路径一致，避免"本地正常线上 404"）
const base = '/fullstack-learning-site/'
const siteOrigin = 'https://R2h1.github.io'
const siteTitle = '全栈 × AI 学习路径'
const siteDesc = '面试级 · 生产级 · 企业级的全栈 + AI 学习课程（个人笔记，内容优先）'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: siteTitle,
  description: siteDesc,
  cleanUrls: true,
  lastUpdated: true,

  // AGENTS / CLAUDE / README 是仓库内部说明，不该被当成课程页发布
  // （不排除会被构建成页面，同时污染本地搜索索引）
  srcExclude: ['AGENTS.md', 'CLAUDE.md', 'README.md'],
  head: [
    ['link', { rel: 'icon', href: `${base}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#3451b2' }],
    ['meta', { property: 'og:site_name', content: siteTitle }],
  ],

  // 每页补 canonical / OG，社交分享与搜索引擎才有正确的标题与地址
  transformPageData(pageData) {
    const rel = pageData.relativePath
      .replace(/(^|\/)index\.md$/, '$1')
      .replace(/\.md$/, '')
    const url = `${siteOrigin}${base}${rel}`
    const title = pageData.title ? `${pageData.title} | ${siteTitle}` : siteTitle
    const description = pageData.description || siteDesc

    pageData.frontmatter.head = pageData.frontmatter.head || []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:type', content: rel ? 'article' : 'website' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
    )
  },

  // sitemap 插件用 URL 解析拼接，页面路径以 / 开头会把 base 吃掉，所以在这里补回子路径
  sitemap: {
    hostname: siteOrigin,
    transformItems: (items) =>
      items.map((item) => ({
        ...item,
        url: `${base}${item.url.replace(/^\//, '')}`,
      })),
  },


  // 站外链接统一新标签页打开（正文里的 Markdown 外链默认是当前页跳转，会直接离开学习站）
  markdown: {
    config(md) {
      const defaultLinkOpen =
        md.renderer.rules.link_open ||
        ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = tokens[idx].attrGet('href')
        if (href && /^https?:\/\//.test(href)) {
          tokens[idx].attrSet('target', '_blank')
          tokens[idx].attrSet('rel', 'noreferrer')
        }
        return defaultLinkOpen(tokens, idx, options, env, self)
      }
    },
  },

  themeConfig: {
    // 注意：logo 由 VitePress 自动加 base，这里写 public 内的路径即可（手动加 base 会变成双前缀）
    logo: '/logo.svg',
    siteTitle: '全栈 × AI',
    nav: [
      { text: '首页', link: '/' },
      // 路线图是独立的静态页（public/roadmap.html），走 _blank 绕开 SPA 路由
      { text: '🗺️ 路线图', link: '/roadmap.html', target: '_blank', rel: 'noreferrer' },
      { text: '前端底座', link: '/01-JavaScript运行时' },
      { text: '后端', link: '/06-Node.js运行时' },
      { text: 'AI 工程', link: '/15-LLM与RAG' },
      { text: '面试备战', link: '/18-面试备战与行动清单' },
      { text: '优质资源', link: '/resources' },
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
          button: { buttonText: '搜索', buttonAriaLabel: '搜索K' },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    docFooter: { prev: '上一章', next: '下一章' },
    editLink: {
      pattern: 'https://github.com/R2h1/fullstack-learning-site/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/R2h1/fullstack-learning-site' }],
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    returnToTopLabel: '回到顶部',
  },
})
