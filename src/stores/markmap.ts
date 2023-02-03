import { defineStore } from 'pinia'
import '@logseq/libs'
export const useMarkmap = defineStore('markmap', {
  state: () => ({
    themeMapping: {
      'light-gray': 'bg-gray-100',
      'light-red': 'bg-red-100',
      'light-blue': 'bg-blue-100',
      'light-green': 'bg-green-100',
      'light-yellow': 'bg-yellow-100',
      'light-purple': 'bg-purple-100',
      'light-pink': 'bg-pink-100',
      'light-indigo': 'bg-indigo-100',
      'dark-indigo': 'bg-indigo-900',
      'dark-pink': 'bg-pink-900',
      'dark-purple': 'bg-purple-900',
      'dark-yellow': 'bg-yellow-900',
      'dark-green': 'bg-green-900',
      'dark-blue': 'bg-blue-900',
      'dark-red': 'bg-red-900',
      'dark-gray': 'bg-gray-900',
    },

    themeList: {
      'bg-gray-100': 'text-gray-900',
      'bg-red-100': 'text-red-900',
      'bg-blue-100': 'text-blue-900',
      'bg-green-100': 'text-green-900',
      'bg-yellow-100': 'text-yellow-900',
      'bg-purple-100': 'text-purple-900',
      'bg-pink-100': 'text-pink-900',
      'bg-indigo-100': 'text-indigo-900',
      'bg-indigo-900': 'text-indigo-100',
      'bg-pink-900': 'text-pink-100',
      'bg-purple-900': 'text-purple-100',
      'bg-yellow-900': 'text-yellow-100',
      'bg-green-900': 'text-green-100',
      'bg-blue-900': 'text-blue-100',
      'bg-red-900': 'text-red-100',
      'bg-gray-900': 'text-gray-100',
    },

    theme: 'auto',
    front: 'text-gray-900',
    bg: 'bg-gray-100',
    manual: false,
  }),
  actions: {
    resetTheme() {
      this.manual = false
      this.theme = JSON.parse(localStorage.getItem('theme'))

      if (logseq.settings?.theme && logseq.settings.theme !== 'auto') {
        if (this.themeMapping[logseq.settings.theme]) {
          this.setTheme(this.themeMapping[logseq.settings.theme])
        }
      }
    },

    setTheme(bg) {
      this.bg = bg
      this.front = this.themeList[this.bg]
      this.manual = true
    },
    randomTheme() {
      this.manual = true
      this.bg = Object.keys(this.themeList)[
        Math.floor(Math.random() * Object.keys(this.themeList).length)
      ]
      this.front = this.themeList[this.bg]
    },
  },
})
