import DefaultTheme from 'vitepress/theme'
import ChapterCards from './components/ChapterCards.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ChapterCards', ChapterCards)
  },
}
