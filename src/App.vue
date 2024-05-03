<script lang="ts" setup>
import Help from './components/Help.vue'
import Markmap from './components/Markmap.vue'
import Pen from './components/Pen.vue'
import ControlPanel from './components/ControlPanel.vue'

import { useMarkmap } from '@/stores/markmap'
const markmapStore = useMarkmap()
</script>

<template>
  <div
    class="relative"
    :class="!markmapStore.manual && markmapStore.theme === 'dark' ? 'dark' : ''"
  >
    <ControlPanel />
    <Markmap />
    <Help />
    <Pen />
  </div>
</template>

<style></style>
