import '@logseq/libs'

import { useHelp } from '@/stores/help'
import { useMarkmap } from '@/stores/markmap'
import { usePen } from '@/stores/pen'

import { useSettings } from '@/composables/useSettings'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/index.css'
import { getSettings, getSettingsDefinition, initSettings } from './funcs'

const app = createApp(App)
app.use(createPinia())

const {
  renderMarkmap,
  setRenderAsBlock,
  setEditingBlockUUID,
  resetTheme,
  setTheme,
  themeMapping,
} = useMarkmap()

async function main() {
  // @ts-ignore
  window.renderMarkmap = renderMarkmap

  // Set Model Style
  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 1000,
  })

  // Process Settings
  logseq.useSettingsSchema(getSettingsDefinition())
  initSettings()
  const keyBindings = getSettings('keyBindings')

  // Define Logseq Models
  function createModel() {
    return {
      openMindMap(blockMode = false) {
        const helpStore = useHelp()
        helpStore.closeHelp()

        const penStore = usePen()
        penStore.close()

        if (blockMode === true || blockMode === false) {
          setRenderAsBlock(blockMode)
        } else {
          setRenderAsBlock(false)
        }
        logseq.showMainUI({
          autoFocus: true,
        })
      },
    }
  }

  logseq.provideModel(createModel())

  // Register Commands, Keybindings, UI to Logseq
  {
    const triggerMarkmap = async ({ uuid }) => {
      const blocks = await logseq.Editor.getSelectedBlocks()
      const editing = await logseq.Editor.checkEditing()

      if (!uuid) {
        const block = await logseq.Editor.getCurrentBlock()
        if (block && block.uuid) {
          uuid = block.uuid
        }
      }

      if (uuid && (editing || (blocks && blocks.length > 0))) {
        setEditingBlockUUID(uuid)
        createModel().openMindMap(true)
      } else {
        createModel().openMindMap(false)
      }
    }

    const triggerMarkmapForceBlock = async ({ uuid }) => {
      setEditingBlockUUID(uuid)
      createModel().openMindMap(true)
    }
    const triggerMarkmapForceFull = async () => {
      createModel().openMindMap(false)
    }

    logseq.App.registerCommandPalette(
      {
        key: 'mark-map-open',
        label: 'Open Markmap',
        keybinding: {
          mode: 'global',
          binding: logseq.settings?.disableShortcuts
            ? null
            : keyBindings.openMarkmap,
        },
      },
      triggerMarkmap
    )
    logseq.App.registerCommandPalette(
      {
        key: 'mark-map-open-full',
        label: 'Open Full Markmap',
        keybinding: {
          mode: 'global',
          binding: logseq.settings?.disableShortcuts
            ? null
            : keyBindings.openMarkmapFull,
        },
      },
      triggerMarkmapForceFull
    )
    logseq.Editor.registerSlashCommand('Markmap', triggerMarkmapForceBlock)
    logseq.Editor.registerBlockContextMenuItem(
      `Markmap`,
      triggerMarkmapForceBlock
    )

    logseq.App.registerUIItem('pagebar', {
      key: 'logseq-mark-map',
      template: `
     <a class="button" data-on-click="openMindMap" title="Open mindmap mode" style="transform: scale(-1, 1);">
      <i class="ti ti-tournament" style=""></i>
     </a>
    `,
    })
  }

  // Hooks
  let uiVisible = false
  logseq.App.onRouteChanged(async (e) => {
    if (uiVisible) {
      await renderMarkmap(e.path)
    }
  })

  logseq.on('ui:visible:changed', async ({ visible }) => {
    uiVisible = visible
    if (!visible) {
      return
    }

    await renderMarkmap()
  })

  const { updateSettings } = useSettings()
  updateSettings(logseq.settings)
  logseq.onSettingsChanged((newSettings) => {
    updateSettings(newSettings)
    resetTheme()
    if (logseq.settings?.theme && logseq.settings.theme !== 'auto') {
      if (themeMapping[logseq.settings.theme as string]) {
        setTheme(themeMapping[logseq.settings.theme as string])
      }
    }
  })

  app.mount('#app')
}
logseq.ready(main).catch(() => console.error)
