import '@logseq/libs'
import {
  BlockEntity,
  BlockUUIDTuple,
  SettingSchemaDesc,
} from '@logseq/libs/dist/LSPlugin'
import * as d3 from 'd3'
import { format, subDays } from 'date-fns'
import hotkeys from 'hotkeys-js'
import isUUID from 'is-uuid'
import jQuery from 'jquery'
import lightbox from 'lightbox2'
import 'lightbox2/dist/css/lightbox.min.css'
import { INode } from 'markmap-common'
import { Transformer } from 'markmap-lib'
import * as markmap from 'markmap-view'
import { Markmap, deriveOptions } from 'markmap-view'
import { createPinia } from 'pinia'
import { useHelp } from '@/stores/help'
import { useMarkmap } from '@/stores/markmap'
import { usePen } from '@/stores/pen'
import { createApp } from 'vue'
import App from './App.vue'
import {
  addPrefixToMultipleLinesBlock,
  addToolbar,
  closeButtonHandler,
  eventFire,
  getSettings,
  goBackButtonHandler,
  goForwardButtonHandler,
  initSettings,
  parseBlockContent,
  walkTransformBlocksFilter,
} from './funcs'
import './style.css'

const defineSettings: SettingSchemaDesc[] = [
  {
    title: 'Theme',
    key: 'theme',
    description: 'Set theme',
    type: 'enum',
    enumPicker: 'select',
    enumChoices: [
      'auto',
      'light-gray',
      'light-red',
      'light-blue',
      'light-green',
      'light-yellow',
      'light-purple',
      'light-pink',
      'light-indigo',
      'dark-indigo',
      'dark-pink',
      'dark-purple',
      'dark-yellow',
      'dark-green',
      'dark-blue',
      'dark-red',
      'dark-gray',
    ],
    default: 'auto',
  },
  {
    title: 'Enable Node Anchor',
    key: 'nodeAnchorEnabled',
    description:
      'Node anchor can give you the ability to pick any sub tree as a new markmap',
    type: 'boolean',
    default: false,
  },
  {
    title: 'Node Anchor Icon',
    key: 'nodeAnchorIcon',
    description: 'Use your favorate anchor icon',
    type: 'string',
    default: '🟢',
  },
  {
    title: 'Enable Autofit',
    key: 'autofitEnabled',
    description: 'With autofit, markmap always fit to the window.',
    type: 'boolean',
    default: true,
  },
  {
    title: 'Enable replace Latex math expression',
    key: 'replaceLatexMathExpressionEnabled',
    description:
      'Enable replace Latex math expression to make more math expression work on markmap.',
    type: 'boolean',
    default: false,
  },
  {
    title: 'Sync Collapsed State',
    key: 'syncCollapsedState',
    description: 'Sync Logseq blocks collapsed state to markmap.',
    type: 'boolean',
    default: false,
  },
  {
    title: 'Color Freeze Level',
    key: 'colorFreezeLevel',
    description:
      'From the level you can freeze branches color, 0 means disabled and each branch has random color.',
    type: 'enum',
    enumChoices: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    enumPicker: 'select',
    default: '0',
  },
]
logseq.useSettingsSchema(defineSettings)

const transformer = new Transformer()

let renderAsBlock = false
let editingBlockUUID = ''

const triggerMarkmap = async ({ uuid }) => {
  const blocks = await logseq.Editor.getSelectedBlocks()
  const editing = await logseq.Editor.checkEditing()

  if (uuid && (editing || (blocks && blocks.length > 0))) {
    editingBlockUUID = uuid
    createModel().openMindMap(true)
  } else {
    createModel().openMindMap(false)
  }
}

const triggerMarkmapForceBlock = async ({ uuid }) => {
  editingBlockUUID = uuid
  createModel().openMindMap(true)
}
const triggerMarkmapForceFull = async () => {
  createModel().openMindMap(false)
}

/**
 * User model
 */
function createModel() {
  return {
    openMindMap(blockMode = false) {
      const helpStore = useHelp()
      helpStore.closeHelp()

      const penStore = usePen()
      penStore.close()

      const closeButton = document.getElementById('close-button')
      closeButton.removeEventListener('click', closeButtonHandler, false)
      closeButton.addEventListener('click', closeButtonHandler, false)

      const goBackButton = document.getElementById('go-back-button')
      goBackButton.removeEventListener('click', goBackButtonHandler, false)
      goBackButton.addEventListener('click', goBackButtonHandler, false)

      const goForwardButton = document.getElementById('go-forward-button')
      goForwardButton.removeEventListener(
        'click',
        goForwardButtonHandler,
        false
      )
      goForwardButton.addEventListener('click', goForwardButtonHandler, false)

      if (blockMode === true || blockMode === false) {
        renderAsBlock = blockMode
      } else {
        renderAsBlock = false
      }
      logseq.showMainUI({
        autoFocus: true,
      })
    },
  }
}

async function main() {
  lightbox.option({
    disableScrolling: true,
    wrapAround: true,
  })

  initSettings()
  const keyBindings = getSettings('keyBindings')

  // Set Model Style
  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 1000,
  })

  logseq.App.registerCommandPalette(
    {
      key: 'mark-map-open',
      label: 'Open Markmap',
      keybinding: {
        mode: 'global',
        binding: keyBindings.openMarkmap,
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
        binding: keyBindings.openMarkmapFull,
      },
    },
    triggerMarkmapForceFull
  )
  logseq.Editor.registerSlashCommand('Markmap', triggerMarkmapForceBlock)
  logseq.Editor.registerBlockContextMenuItem(
    `Markmap`,
    triggerMarkmapForceBlock
  )

  // Register icon ui
  logseq.App.registerUIItem('pagebar', {
    key: 'logseq-mark-map',
    template: `
     <a class="button" data-on-click="openMindMap" title="Open mindmap mode" style="transform: scale(-1, 1);">
      <i class="ti ti-tournament" style=""></i>
     </a>
    `,
  })

  const convertFlatBlocksToTree = async (
    blocks: (BlockUUIDTuple | BlockEntity)[]
  ): Promise<BlockEntity[]> => {
    const children = []
    if (blocks && blocks.length > 0) {
      for (const item of blocks) {
        if (Array.isArray(item)) {
          if (!item[1]) {
            continue
          }
          const block = await logseq.Editor.getBlock(item[1], {
            includeChildren: true,
          })
          if (block && block.children && block.children.length > 0) {
            block.children = await convertFlatBlocksToTree(
              block.children as BlockUUIDTuple[]
            )
          }
          children.push(block)
        } else {
          children.push(item)
        }
      }
    }

    return children
  }

  let mm: Markmap
  let currentLevel: number
  let totalLevel: number
  let originalRoot: INode
  let originalTotalLevel: number

  let config = await logseq.App.getUserConfigs()

  // reload config if graph change
  logseq.App.onCurrentGraphChanged(async () => {
    config = await logseq.App.getUserConfigs()
  })

  const defaultLinkRender = transformer.md.renderer.rules.link_open
  transformer.md.inline.ruler.enable(['mark'])
  transformer.md.renderer.rules.link_open = function (
    tokens,
    idx: number,
    ...args: []
  ) {
    let result = defaultLinkRender(tokens, idx, ...args)

    if (tokens[idx] && tokens[idx].href) {
      result = result.replace('>', ' target="_blank">')
    }

    return result
  }

  const matchAttr = (s: string) => {
    const r = /\b(\w+)\s*=\s*"(.*?)"/g
    const d: any = {}

    // ...  this loop will run indefinitely!
    let m = r.exec(s)
    while (m) {
      d[m[1]] = m[2]
      m = r.exec(s)
    }

    return d
  }

  const defaultImageRender = transformer.md.renderer.rules.image
  transformer.md.renderer.rules.image = function (
    tokens,
    idx: number,
    ...args: []
  ) {
    let result = defaultImageRender(tokens, idx, ...args)
    const attr = matchAttr(result)
    let src = attr.src || attr.href
    const alt = attr.alt || attr.title || ''

    if (src.indexOf('http') !== 0 && src.indexOf('..') === 0) {
      src = config.currentGraph.substring(13) + '/' + src.replace(/\.\.\//g, '')
    }

    if (['pdf'].includes(src.substring(src.lastIndexOf('.') + 1))) {
      result = `📄 ${alt}`
    } else {
      result = `<a target="_blank" title="${alt}"  data-lightbox="gallery" href="${
        src.indexOf('http') !== 0 ? 'assets://' : ''
      }${src}">🖼 ${alt}</a>`
    }

    return result
  }

  let uiVisible = false
  logseq.App.onRouteChanged(async (e) => {
    if (uiVisible) {
      await renderMarkmap(e.path)
    }
  })

  // key function
  const renderMarkmap = async (route = null) => {
    const penStore = usePen()
    penStore.init()

    const markmapStore = useMarkmap()
    markmapStore.resetTheme()

    if (logseq.settings?.theme && logseq.settings.theme !== 'auto') {
      if (markmapStore.themeMapping[logseq.settings.theme]) {
        markmapStore.setTheme(markmapStore.themeMapping[logseq.settings.theme])
      }
    }

    let blocks = await logseq.Editor.getCurrentPageBlocksTree()
    let page = (await logseq.Editor.getCurrentPage()) as any

    // Make it compatible with block page trigger from markmap
    // When traverse on markmap, hook will pass the route to this function
    if (route && route.startsWith('/page/')) {
      const pageName = decodeURIComponent(route.substring(6))
      if (isUUID.anyNonNil(pageName)) {
        renderAsBlock = true
        editingBlockUUID = pageName
        if (page && page.page) {
          page = await logseq.Editor.getPage(page.page.id)
        }
      } else {
        renderAsBlock = false

        page = await logseq.Editor.getPage(pageName)
        blocks = await logseq.Editor.getPageBlocksTree(pageName)
      }
    } else if (
      // trigger from shortcuts and slash command will not trigger route change
      !renderAsBlock &&
      page &&
      page.page &&
      blocks[0] &&
      !blocks[0].uuid
    ) {
      renderAsBlock = true
      editingBlockUUID = page.uuid
      page = await logseq.Editor.getPage(page.page.id)
    }

    // Parse the proper title and blocks
    let title
    if (renderAsBlock) {
      let currentBlock
      if (editingBlockUUID) {
        currentBlock = await logseq.Editor.getBlock(editingBlockUUID, {
          includeChildren: true,
        })
      } else {
        currentBlock = await logseq.Editor.getCurrentBlock()
      }

      if (currentBlock) {
        let content = currentBlock.content
        content = await parseBlockContent(
          content,
          currentBlock?.properties,
          config
        )
        title = content
        blocks = await convertFlatBlocksToTree(currentBlock?.children)
      }
    } else {
      if (page) {
        title =
          page?.properties?.markMapTitle || page?.originalName || page?.name
      } else {
        // if page is null, that would be on journal home page, then we use default customized blocks.
        const currentGraph = await logseq.App.getCurrentGraph()
        title = currentGraph.name

        const config = await logseq.App.getUserConfigs()

        blocks = [
          {
            content: '[[Contents]]',
          },
        ] as BlockEntity[]

        const recentJournals = []

        for (let i = 0; i < 10; i++) {
          recentJournals.push({
            content: `[[${format(
              // new Date(`${year}-${month + 1}-${digit}`),
              subDays(new Date(), i),
              config.preferredDateFormat
            )}]]`,
          })
        }
        if (config.enabledJournals) {
          blocks.push({
            content: 'Recent Journals',
            children: recentJournals,
          } as BlockEntity)
        }
      }
    }

    const collapsed = page?.properties?.markMapCollapsed

    // Build markdown
    currentLevel = -1 // reset level;

    let filteredBlocks = await walkTransformBlocksFilter(blocks)
    if (
      page?.properties?.markMapLimitAll &&
      filteredBlocks.length > page?.properties?.markMapLimitAll
    ) {
      const limitBlocks = filteredBlocks.splice(
        0,
        page?.properties?.markMapLimitAll
      )
      filteredBlocks = limitBlocks.concat({
        content: '...',
        'collapsed?': true,
        children: filteredBlocks,
      })
    } else if (
      page?.properties?.markMapLimit &&
      filteredBlocks.length > page?.properties?.markMapLimit
    ) {
      const limitBlocks = filteredBlocks.splice(
        0,
        page?.properties?.markMapLimit
      )
      filteredBlocks = limitBlocks.concat({
        content: '...',
        'collapsed?': true,
        children: filteredBlocks,
      })
    }

    const walkTransformBlocksLimit = (blocks: any, limit = 0) => {
      if (limit && blocks && blocks.length > limit) {
        const limitBlocks = blocks.splice(0, limit)
        blocks = limitBlocks.concat({
          content: '...',
          'collapsed?': true,
          children: blocks,
        })
      }

      if (blocks && blocks.length > 0) {
        for (const it of blocks) {
          //content
          const { children, properties } = it
          if (children) {
            it.children = walkTransformBlocksLimit(
              children,
              page?.properties?.markMapLimitAll || properties?.markMapLimit
            )
          }
        }
      }

      return blocks
    }

    filteredBlocks = walkTransformBlocksLimit(filteredBlocks)

    // iterate blocks
    const walkTransformBlocks = async (
      blocks: any,
      depth = 0,
      config = {}
    ): Promise<string[]> => {
      currentLevel = Math.max(currentLevel, depth + 1)
      totalLevel = Math.max(currentLevel, depth + 1)

      if (!blocks) {
        return []
      }

      const newBlocks = []
      for (const it of blocks) {
        // uuid, title,
        const { children, content, properties, uuid } = it

        const topic = await parseBlockContent(content, properties, config)

        // Add leading syntax according to depth.
        let ret = addPrefixToMultipleLinesBlock(
          `${' '.repeat((depth + 1) * 2)}`,
          (logseq.settings?.nodeAnchorEnabled && page
            ? `- <a style="cursor: pointer; font-size: 60%; vertical-align:middle;" target="_blank" onclick="logseq.App.pushState('page', { name: '${uuid}' }); ">${
                logseq.settings?.nodeAnchorIcon || '🟢'
              }</a> `
            : '- ') + topic
        )

        if (children && (it['collapsed?'] !== true || collapsed !== 'hidden')) {
          ret +=
            '\n\n' +
            (await walkTransformBlocks(children, depth + 1, config)).join('\n')
        }

        newBlocks.push(ret)
      }

      return newBlocks
    }

    let md =
      '- ' +
      (renderAsBlock && logseq.settings.nodeAnchorEnabled
        ? `<a style="cursor: pointer; font-size: 60%; vertical-align:middle;" target="_blank" onclick="logseq.App.pushState('page', { name: '${page.originalName}' }); ">🏠</a> `
        : '') +
      title +
      '\n\n' +
      (await walkTransformBlocks(filteredBlocks, 0, config)).join('\n')
    md = md.replace(
      /(!\[.*?\]\(.*?\))\{(:[a-z0-9 ]+(, )?)+\}/gi,
      (match, p1) => {
        return p1
      }
    ) // remove image size

    // eslint-disable-next-line prefer-const
    let { root, features } = transformer.transform(md.trim())

    // @ts-ignore
    root.properties = page && page.properties ? page.properties : {}

    // want to keep syncing collapsed with Logseq
    const walkTransformRoot = (parent, blocks) => {
      if (parent.children) {
        for (const i in parent.children) {
          parent.children[i].properties =
            (blocks && blocks[i]?.properties) || {}
          parent.children[i]['collapsed?'] =
            (blocks && blocks[i] && blocks[i]['collapsed?']) || false
          if (
            // @ts-ignore
            root?.properties?.markMapCollapsed !== 'extend' &&
            parent.children[i]['collapsed?']
          ) {
            parent.children[i].payload = {
              ...parent.children[i].payload,
              fold: 1,
            }
          }

          walkTransformRoot(
            parent?.children[i],
            (blocks && blocks[i]?.children) || []
          )
        }
      }
    }
    if (logseq.settings?.syncCollapsedState) {
      walkTransformRoot(root, filteredBlocks)
    }
    originalRoot = root
    originalTotalLevel = totalLevel
    // @ts-ignore
    window.root = root
    const { styles, scripts } = transformer.getUsedAssets(features)
    const { Markmap, loadCSS, loadJS } = markmap
    if (styles) loadCSS(styles)
    if (scripts)
      await loadJS(scripts, {
        getMarkmap: () => markmap,
      })

    // Hide all children
    const hideAll = (target: INode) => {
      target.payload = {
        ...target.payload,
        fold: 1,
      }

      target.children?.forEach((t) => {
        hideAll(t)
      })
    }

    // Show all children
    const showAll = (target: INode, depth = -1) => {
      target.payload = {
        ...target.payload,
        fold: 0,
      }

      target.children?.forEach((t) => {
        showAll(t, depth)
      })
    }

    const showAllWithCollapsed = (target: INode, depth = -1) => {
      depth++
      if (
        page?.properties?.markMapCollapsed !== 'extend' &&
        // @ts-ignore
        target['collapsed?']
      ) {
        target.payload = {
          ...target.payload,
          fold: 1,
        }
        currentLevel = depth
      } else {
        target.payload = {
          ...target.payload,
          fold: 0,
        }
      }

      target.children?.forEach((t) => {
        showAllWithCollapsed(t, depth)
      })
    }

    // expand step by step
    const expandStepByStep = (target: INode): boolean => {
      let find = false
      if (target.payload?.fold && target.children) {
        target.payload.fold = 0
        find = true
      }
      if (!find && target.children) {
        for (const t of target.children) {
          find = expandStepByStep(t)
          if (find) {
            return find
          }
        }
      }

      return find
    }

    const collapseStepByStep = (target: INode): boolean => {
      let find = false

      if (target.children) {
        const length = target.children.length
        for (let i = length - 1; i >= 0; i--) {
          const t = target.children[i]
          find = collapseStepByStep(t)
          if (find) {
            return find
          }
        }
      }

      if (!target.payload?.fold && target.children) {
        target.payload.fold = 1
        find = true
      }
      return find
    }

    const expandLevel = (target: INode, level = 1) => {
      if (level <= 0) {
        hideAll(target)
        return
      }
      level--

      target.payload = {
        ...target.payload,
        fold: 0,
      }

      target.children?.forEach((t) => {
        expandLevel(t, level)
      })
    }

    let stack: INode[] = []
    const pointerStack: number[] = []
    let pointer: number

    const focusIn = (root: INode) => {
      if (root.children) {
        pointerStack.push(pointer)
        pointer = 0
        stack.push(root)
        root = root.children[pointer]
        // @ts-ignore
        window.root = root
        showAll(root)
        mm.setData(root)
        totalLevel--
        currentLevel = totalLevel
      }
    }

    const focusOut = () => {
      if (stack.length > 0) {
        root = stack.pop() as INode
        pointer = pointerStack.pop() as number

        // @ts-ignore
        window.root = root
        showAll(root)
        mm.setData(root)

        totalLevel++
        currentLevel = totalLevel
      }
    }

    const focusNext = () => {
      const top = stack[stack.length - 1]
      if (top && top.children && pointer + 1 <= top.children.length - 1) {
        root = top.children[++pointer]
        // @ts-ignore
        window.root = root
        mm.setData(root)
      }
    }

    const focusPrevious = () => {
      const top = stack[stack.length - 1]
      if (top && top.children && pointer - 1 >= 0) {
        root = top.children[--pointer]
        // @ts-ignore
        window.root = root
        mm.setData(root)
      }
    }

    const focusReset = () => {
      root = originalRoot
      // @ts-ignore
      window.root = root
      stack = []
      showAll(root)
      mm.setData(root)
      totalLevel = originalTotalLevel
      currentLevel = totalLevel
    }

    let svgNode

    const bindKeys = async function () {
      if (hotkeys) {
        // Pen shortcuts
        hotkeys(
          `ctrl+p, command+p, ctrl+z, command+z, ctrl+shift+z, command+shift+z,d,f,s,r,e,t,a,c,
          ctrl+1,command+1,ctrl+2,command+2,ctrl+3,command+3,ctrl+4,command+4,ctrl+5,command+5,ctrl+6,command+6,ctrl+7,command+7,ctrl+8,command+8,ctrl+9,command+9,ctrl+0,command+0,
          ctrl+alt+1,command+alt+1, ctrl+alt+2,command+alt+2, ctrl+alt+3,command+alt+3,
          alt+=,alt+-`,
          function (event, handler) {
            const penStore = usePen()

            switch (handler.key) {
              case 'ctrl+p':
              case 'command+p': {
                penStore.toggle()
                return false
              }
            }

            if (penStore.visible) {
              switch (handler.key) {
                case 'command+1':
                case 'ctrl+1': {
                  penStore.drauu.brush.color = '#000000'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-black')
                    ?.classList.add('active')
                  return false
                }

                case 'command+2':
                case 'ctrl+2': {
                  penStore.drauu.brush.color = '#ed153d'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-red')
                    ?.classList.add('active')
                  return false
                }

                case 'command+3':
                case 'ctrl+3': {
                  penStore.drauu.brush.color = '#ed9a26'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-orange')
                    ?.classList.add('active')
                  return false
                }

                case 'command+4':
                case 'ctrl+4': {
                  penStore.drauu.brush.color = '#ede215'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-yellow')
                    ?.classList.add('active')
                  return false
                }

                case 'command+5':
                case 'ctrl+5': {
                  penStore.drauu.brush.color = '#30bd20'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-green')
                    ?.classList.add('active')
                  return false
                }

                case 'command+6':
                case 'ctrl+6': {
                  penStore.drauu.brush.color = '#2656bf'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-blue')
                    ?.classList.add('active')
                  return false
                }

                case 'command+7':
                case 'ctrl+7': {
                  penStore.drauu.brush.color = '#c24aed'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-purple')
                    ?.classList.add('active')
                  return false
                }

                case 'command+8':
                case 'ctrl+8': {
                  penStore.drauu.brush.color = '#bf6b26'
                  penStore.colors.forEach((el) => el.classList.remove('active'))
                  document
                    .getElementById('pen-color-brown')
                    ?.classList.add('active')
                  return false
                }

                case 'command+9':
                case 'ctrl+9': {
                  const penLayerEl = document.getElementById('pen-mode-layer')
                  penStore.bgColors.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  if (penLayerEl?.classList.contains('background-white')) {
                    penLayerEl.classList.remove('background-white')
                    penLayerEl.classList.remove('background-black')
                  } else if (
                    penLayerEl?.classList.contains('background-black')
                  ) {
                    penLayerEl.classList.remove('background-black')
                    penLayerEl?.classList.add('background-white')
                    document.getElementById('bg-white')?.classList.add('active')
                  } else {
                    penLayerEl?.classList.add('background-white')
                    document.getElementById('bg-white')?.classList.add('active')
                  }
                  return false
                }

                case 'command+0':
                case 'ctrl+0': {
                  const penLayerEl = document.getElementById('pen-mode-layer')
                  penStore.bgColors.forEach(({ el }) =>
                    el.classList.remove('active')
                  )

                  if (penLayerEl?.classList.contains('background-black')) {
                    penLayerEl.classList.remove('background-white')
                    penLayerEl.classList.remove('background-black')
                  } else if (
                    penLayerEl?.classList.contains('background-white')
                  ) {
                    penLayerEl.classList.remove('background-white')
                    penLayerEl?.classList.add('background-black')
                    document.getElementById('bg-black')?.classList.add('active')
                  } else {
                    penLayerEl?.classList.add('background-black')
                    document.getElementById('bg-black')?.classList.add('active')
                  }
                  return false
                }

                case 'ctrl+z':
                case 'command+z': {
                  penStore.drauu.undo()
                  return false
                }

                case 'ctrl+shift+z':
                case 'command+shift+z': {
                  penStore.drauu.redo()
                  return false
                }

                case 'd': {
                  penStore.drauu.mode = 'draw'
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document.getElementById('m-draw')?.classList.add('active')
                  return false
                }

                case 's': {
                  penStore.drauu.mode = 'stylus'
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document.getElementById('m-stylus')?.classList.add('active')
                  return false
                }

                case 'r': {
                  penStore.drauu.mode = 'rectangle'
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document
                    .getElementById('m-rectangle')
                    ?.classList.add('active')
                  return false
                }

                case 'e': {
                  penStore.drauu.mode = 'eraseLine'
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document
                    .getElementById('m-eraseLine')
                    ?.classList.add('active')
                  return false
                }

                case 't': {
                  penStore.drauu.mode = 'ellipse'
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document.getElementById('m-ellipse')?.classList.add('active')
                  return false
                }

                case 'a': {
                  penStore.drauu.mode = 'line'
                  penStore.drauu.brush.arrowEnd = true
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document.getElementById('m-arrow')?.classList.add('active')
                  return false
                }

                case 'f': {
                  penStore.drauu.mode = 'line'
                  penStore.drauu.brush.arrowEnd = false
                  penStore.modes.forEach(({ el }) =>
                    el.classList.remove('active')
                  )
                  document.getElementById('m-line')?.classList.add('active')
                  return false
                }

                case 'alt+=': {
                  const sizeEl = document.getElementById(
                    'size'
                  )! as HTMLInputElement
                  penStore.drauu.brush.size = Math.min(
                    10,
                    penStore.drauu.brush.size + 0.5
                  )
                  sizeEl.value = `${penStore.drauu.brush.size}`
                  sizeEl.blur()
                  return false
                }

                case 'alt+-': {
                  const sizeEl = document.getElementById(
                    'size'
                  )! as HTMLInputElement
                  penStore.drauu.brush.size = Math.max(
                    1,
                    penStore.drauu.brush.size - 0.5
                  )
                  sizeEl.value = `${penStore.drauu.brush.size}`
                  sizeEl.blur()
                  return false
                }

                case 'ctrl+alt+1':
                case 'command+alt+1': {
                  penStore.lines.forEach(({ el }) => {
                    el.classList.remove('active')
                  })
                  document.getElementById('l-solid')!.classList.add('active')
                  penStore.drauu.brush.dasharray = undefined
                  return false
                }

                case 'ctrl+alt+2':
                case 'command+alt+2': {
                  penStore.lines.forEach(({ el }) => {
                    el.classList.remove('active')
                  })
                  document.getElementById('l-dashed')!.classList.add('active')
                  penStore.drauu.brush.dasharray = '4'
                  return false
                }

                case 'ctrl+alt+3':
                case 'command+alt+3': {
                  penStore.lines.forEach(({ el }) => {
                    el.classList.remove('active')
                  })
                  document.getElementById('l-dotted')!.classList.add('active')
                  penStore.drauu.brush.dasharray = '1 7'
                  return false
                }

                case 'c': {
                  penStore.drauu.clear()
                  return false
                }
              }
            }
          }
        )

        // markmap shortcuts
        hotkeys('.', function () {
          // @ts-ignore
          const root = window.root
          focusIn(root)
          return false
        })
        hotkeys(',', function () {
          focusReset()
          return false
        })
        // @ts-ignore
        hotkeys('cmd+[', async function () {
          // @ts-ignore
          await logseq.App.invokeExternalCommand('logseq.go/backward')
          return false
        })
        // @ts-ignore
        hotkeys('cmd+]', async function () {
          // @ts-ignore
          await logseq.App.invokeExternalCommand('logseq.go/forward')
          return false
        })
        hotkeys(
          'up,down,left,right,esc,space,`,r,h,j,k,l,n,p,ctrl+b,command+b,q,-,=,0,9,1,2,3,4,5,/',
          // @ts-ignore
          async function (event, handler) {
            const helpStore = useHelp()
            if (helpStore.visible && !['/', 'q', 'esc'].includes(handler.key)) {
              return
            }

            // @ts-ignore
            // const jQuery = window?.jQuery
            if (jQuery) {
              if (
                jQuery('#lightboxOverlay').css('display') === 'block' &&
                !['q', 'esc'].includes(handler.key)
              ) {
                return false
              }
            }

            // @ts-ignore
            const root = window.root
            switch (handler.key) {
              case 'p': // p
                focusPrevious()
                break
              case 'n': // n
                focusNext()
                break
              case 'b': // b
                focusOut()
                break
              case '.': // .
                focusReset()
                break
              case ',': // ,
                focusIn(root)
                break
              case 'esc': // ESC
              case 'q': // q
                // @ts-ignore
                // eslint-disable-next-line no-case-declarations
                // const jQuery = window?.jQuery
                // @ts-ignore
                // eslint-disable-next-line no-case-declarations
                // const lightbox = window?.lightbox

                if (jQuery) {
                  if (jQuery('#lightboxOverlay').css('display') === 'block') {
                    lightbox.end()
                  }
                }
                logseq.hideMainUI({
                  restoreEditingCursor: true,
                })
                break
              case 'space': // space
                await mm?.fit()
                break
              case '0': // 0
                currentLevel = 0
                hideAll(root)
                mm.setData(root)

                break
              case '9': // 9
                currentLevel = totalLevel
                showAll(root)
                mm.setData(root)

                break
              case '1': // 1
                hideAll(root)
                expandLevel(root, 1)
                currentLevel = 1
                mm.setData(root)

                break
              case '2': // 2
                hideAll(root)
                expandLevel(root, 2)
                currentLevel = 2
                mm.setData(root)

                break
              case '3': // 3
                hideAll(root)
                expandLevel(root, 3)
                currentLevel = 3
                mm.setData(root)

                break
              case '4': // 4
                hideAll(root)
                expandLevel(root, 4)
                currentLevel = 4
                mm.setData(root)

                break
              case '5': // 5
                hideAll(root)
                expandLevel(root, 5)
                currentLevel = 5
                mm.setData(root)

                break
              case 'h': // h
                hideAll(root)
                expandLevel(root, currentLevel > 0 ? --currentLevel : 0)
                mm.setData(root)
                break
              case 'l': // l
                hideAll(root)
                expandLevel(
                  root,
                  currentLevel < totalLevel ? ++currentLevel : totalLevel
                )
                mm.setData(root)
                break

              case 'j': // j
                expandStepByStep(root)
                mm.setData(root)
                break
              case 'k': // k
                collapseStepByStep(root)
                mm.setData(root)
                break

              case '=': // +
                await mm.rescale(1.25)
                break
              case '-': // -
                await mm.rescale(0.8)
                break
              case 'ctrl+b':
              case 'command+b':
                // eslint-disable-next-line no-case-declarations
                const elResetButton = document.getElementById('reset-button')
                eventFire(elResetButton, 'click')
                break
              case '`':
                // eslint-disable-next-line no-case-declarations
                const elRandomButton = document.getElementById('random-button')
                eventFire(elRandomButton, 'click')
                break
              case 'up':
                svgNode = mm.svg.node()
                if (svgNode) {
                  // @ts-ignore
                  const transform = d3.zoomTransform(mm.svg.node())
                  if (transform.x && transform.y && transform.k) {
                    // @ts-ignore
                    transform.y = transform.y - 100
                    // @ts-ignore
                    mm.transition(mm.g).attr(
                      'transform',
                      `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                    )
                  }
                }
                break
              case 'down':
                svgNode = mm.svg.node()
                if (svgNode) {
                  // @ts-ignore
                  const transform = d3.zoomTransform(mm.svg.node())
                  if (transform.x && transform.y && transform.k) {
                    // @ts-ignore
                    transform.y = transform.y + 100
                    // @ts-ignore
                    mm.transition(mm.g).attr(
                      'transform',
                      `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                    )
                  }
                }
                break

              case 'left':
                svgNode = mm.svg.node()
                if (svgNode) {
                  // @ts-ignore
                  const transform = d3.zoomTransform(mm.svg.node())
                  if (transform.x && transform.y && transform.k) {
                    // @ts-ignore
                    transform.x = transform.x - 100
                    // @ts-ignore
                    mm.transition(mm.g).attr(
                      'transform',
                      `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                    )
                  }
                }
                break
              case 'right':
                svgNode = mm.svg.node()
                if (svgNode) {
                  // @ts-ignore
                  const transform = d3.zoomTransform(mm.svg.node())
                  if (transform.x && transform.y && transform.k) {
                    // @ts-ignore
                    transform.x = transform.x + 100
                    // @ts-ignore
                    mm.transition(mm.g).attr(
                      'transform',
                      `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                    )
                  }
                }
                break

              case '/': {
                const helpStore = useHelp()
                helpStore.toggleHelp()
                break
              }
              default:
                // console.log(handler.key);
                break
            }
            return false
          }
        )
      }
    }

    if (mm) {
      // reuse instance, update data
      showAllWithCollapsed(root)
      mm.setData(
        root,
        Object.assign(
          deriveOptions({
            pan: true,
            maxWidth: 400,
            colorFreezeLevel: parseInt(logseq.settings?.colorFreezeLevel),
          }),
          {
            autoFit: logseq.settings?.autofitEnabled,
          }
        )
      )
    } else {
      // initialize instance
      showAllWithCollapsed(root)
      mm = Markmap.create(
        '#markmap',
        Object.assign(
          deriveOptions({
            pan: true,
            maxWidth: 400,
            colorFreezeLevel: parseInt(logseq.settings?.colorFreezeLevel),
          }),
          {
            autoFit: logseq.settings?.autofitEnabled,
          }
        ),
        root
      )

      // Only bind once
      bindKeys()

      addToolbar(mm)
    }
  }

  logseq.on('ui:visible:changed', async ({ visible }) => {
    uiVisible = visible
    if (!visible) {
      return
    }

    await renderMarkmap()
  })

  logseq.onSettingsChanged(() => {
    const markmapStore = useMarkmap()
    markmapStore.resetTheme()
    if (logseq.settings?.theme && logseq.settings.theme !== 'auto') {
      if (markmapStore.themeMapping[logseq.settings.theme]) {
        markmapStore.setTheme(markmapStore.themeMapping[logseq.settings.theme])
      }
    }
  })

  const app = createApp(App)
  app.use(createPinia())
  app.mount('#app')
}
logseq.ready(createModel(), main).catch(() => console.error)
