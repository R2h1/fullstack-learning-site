<script setup>
import DefaultTheme from 'vitepress/theme'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const { Layout } = DefaultTheme
const route = useRoute()

// 默认主题的 .VPContent 是 div，补上 main 地标，读屏用户才能跳到正文
function markMain() {
  const el = document.querySelector('.VPContent')
  if (el && el.getAttribute('role') !== 'main') el.setAttribute('role', 'main')
}

onMounted(() => nextTick(markMain))
watch(() => route.path, () => nextTick(markMain))
</script>

<template>
  <Layout />
</template>
