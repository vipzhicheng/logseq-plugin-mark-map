<script lang="ts" setup>
import { useMarkmap } from '@/stores/markmap'
const markmapStore = useMarkmap()
</script>

<template>
  <div
    class="relative"
    :class="!markmapStore.manual && markmapStore.theme === 'dark' ? 'dark' : ''"
  >
    <Markmap />
    <Help />
    <Pen />
  </div>
</template>

<style></style>
