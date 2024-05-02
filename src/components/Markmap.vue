<script lang="ts" setup>
import { useMarkmap } from '@/stores/markmap'
import { useSettings } from '@/composables/useSettings'
const markmapStore = useMarkmap()
const { settings } = useSettings()
</script>
<template>
  <div
    class="pointer-events-auto h-screen dark:bg-gray-900 dark:text-gray-50 items-center justify-center flex w-full"
    :class="{
      [markmapStore.front]: true,
      [markmapStore.bg]: true,
      'bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm': Boolean(
        settings?.enableBlurBackground
      ),
    }"
    id="markmap-container"
  >
    <svg class="w-11/12 h-5/6" id="markmap"></svg>

    <div
      class="absolute left-4 flex items-center justify-center opacity-0 hover:opacity-100"
    >
      <div class="flex flex-col gap-2 w-auto">
        <div x-data title="Random">
          <svg
            id="random-button"
            @click="markmapStore.randomTheme()"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 cursor-pointer"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div
          title="Light gray"
          @click="markmapStore.setTheme('bg-gray-100')"
          class="w-4 h-4 bg-gray-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light red"
          @click="markmapStore.setTheme('bg-red-100')"
          class="w-4 h-4 bg-red-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light blue"
          @click="markmapStore.setTheme('bg-blue-100')"
          class="w-4 h-4 bg-blue-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light green"
          @click="markmapStore.setTheme('bg-green-100')"
          class="w-4 h-4 bg-green-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light yellow"
          @click="markmapStore.setTheme('bg-yellow-100')"
          class="w-4 h-4 bg-yellow-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light pink"
          @click="markmapStore.setTheme('bg-pink-100')"
          class="w-4 h-4 bg-purple-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light purple"
          @click="markmapStore.setTheme('bg-purple-100')"
          class="w-4 h-4 bg-pink-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Light indigo"
          @click="markmapStore.setTheme('bg-indigo-100')"
          class="w-4 h-4 bg-indigo-200 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark indigo"
          @click="markmapStore.setTheme('bg-indigo-900')"
          class="w-4 h-4 bg-indigo-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark purple"
          @click="markmapStore.setTheme('bg-purple-900')"
          class="w-4 h-4 bg-pink-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark pink"
          @click="markmapStore.setTheme('bg-pink-900')"
          class="w-4 h-4 bg-purple-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark yellow"
          @click="markmapStore.setTheme('bg-yellow-900')"
          class="w-4 h-4 bg-yellow-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark green"
          @click="markmapStore.setTheme('bg-green-900')"
          class="w-4 h-4 bg-green-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark blue"
          @click="markmapStore.setTheme('bg-blue-900')"
          class="w-4 h-4 bg-blue-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark red"
          @click="markmapStore.setTheme('bg-red-900')"
          class="w-4 h-4 bg-red-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div
          title="Dark gray"
          @click="markmapStore.setTheme('bg-gray-900')"
          class="w-4 h-4 bg-gray-700 rounded-full shadow-2xl cursor-pointer"
        ></div>
        <div title="Reset">
          <svg
            id="reset-button"
            @click="markmapStore.resetTheme()"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 cursor-pointer"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
  <div
    id="markmap-toolbar"
    class="cursor-pointer dark:text-gray-50"
    :class="
      markmapStore.bg.indexOf('900') > -1 ? 'text-gray-50' : 'text-gray-900'
    "
  ></div>
</template>
<style>
.mm-toolbar-item .line {
  opacity: 0.2;
}
</style>
