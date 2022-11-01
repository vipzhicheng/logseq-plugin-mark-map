import { defineStore } from 'pinia'
import '@logseq/libs'
export const useHelp = defineStore('help', {
  state: () => ({
    visible: false,
  }),

  actions: {
    toggleHelp() {
      this.visible = !this.visible
    },

    closeHelp() {
      this.visible = false
    },

    openHelp() {
      this.visible = true
    },

    getHelp() {
      return this.visible
    },
  },
})
