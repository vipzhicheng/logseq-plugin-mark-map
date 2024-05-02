import '@logseq/libs'
import { LSPluginBaseInfo } from '@logseq/libs/dist/LSPlugin.user'
import { ref } from 'vue'
const settings = ref(logseq.settings)

export const useSettings = () => {
  const updateSettings = (newSettings) => {
    console.log('newSettings', newSettings)
    settings.value = newSettings
  }
  return { settings, updateSettings }
}
