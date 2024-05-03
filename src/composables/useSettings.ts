import '@logseq/libs'
import { ref } from 'vue'
const settings = ref(logseq.settings)

export const useSettings = () => {
  const updateSettings = (newSettings) => {
    console.log('newSettings', newSettings)
    settings.value = newSettings
  }
  return { settings, updateSettings }
}
