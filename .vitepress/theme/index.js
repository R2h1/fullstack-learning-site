import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import ChapterCards from './components/ChapterCards.vue'
import RoadmapEntry from './components/RoadmapEntry.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ChapterCards', ChapterCards)
    app.component('RoadmapEntry', RoadmapEntry)
  },
}
