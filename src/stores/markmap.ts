import { defineStore } from 'pinia'
import '@logseq/libs'
import jQuery from 'jquery'
import lightbox from 'lightbox2'
import 'lightbox2/dist/css/lightbox.min.css'
import { useHelp } from '@/stores/help'
import { usePen } from '@/stores/pen'
import isUUID from 'is-uuid'
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import {
  addPrefixToMultipleLinesBlock,
  addToolbar,
  convertFlatBlocksToTree,
  eventFire,
  namespaceButtonHandler,
  pageButtonHandler,
  parseBlockContent,
  referenceButtonHandler,
  walkTransformBlocksFilter,
} from '@/funcs'
import { format, subDays } from 'date-fns'
import * as d3 from 'd3'
import { INode } from 'markmap-common'
import { Markmap, deriveOptions } from 'markmap-view'
import { Transformer } from 'markmap-lib'
import * as markmap from 'markmap-view'
import hotkeys from 'hotkeys-js'
import { ref } from 'vue'

const transformer = new Transformer()

lightbox.option({
  disableScrolling: true,
  wrapAround: true,
})

// let renderAsBlock = ref(false)
// let editingBlockUUID = ref('')
// let mm: Markmap
let currentLevel: number
let totalLevel: number
let originalRoot: INode
let originalTotalLevel: number

export const useMarkmap = defineStore('markmap', {
  state: () => ({
    mm: null,
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
    editingBlockUUID: '',
    renderAsBlock: false,
  }),
  actions: {
    setEditingBlockUUID(uuid: string) {
      this.editingBlockUUID = uuid
    },
    setRenderAsBlock(renderAsBlock: boolean) {
      this.renderAsBlock = renderAsBlock
    },
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

    async renderMarkmap(route = null, showMessage = false) {
      let config = await logseq.App.getUserConfigs()
      // reload config if graph change
      logseq.App.onCurrentGraphChanged(async () => {
        config = await logseq.App.getUserConfigs()
      })
      const penStore = usePen()
      penStore.init()

      const markmapStore = useMarkmap()
      markmapStore.resetTheme()

      if (logseq.settings?.theme && logseq.settings.theme !== 'auto') {
        if (markmapStore.themeMapping[logseq.settings.theme]) {
          markmapStore.setTheme(
            markmapStore.themeMapping[logseq.settings.theme]
          )
        }
      }

      let blocks = await logseq.Editor.getCurrentPageBlocksTree()
      let page = (await logseq.Editor.getCurrentPage()) as any

      let nodeAnchorEnabled = logseq.settings?.nodeAnchorEnabled || false
      // Make it compatible with block page trigger from markmap
      // When traverse on markmap, hook will pass the route to this function
      if (route) {
        if (route.startsWith('/page/')) {
          const pageName = decodeURIComponent(route.substring(6))
          if (isUUID.anyNonNil(pageName)) {
            this.renderAsBlock = true
            this.editingBlockUUID = pageName
            if (page && page.page) {
              page = await logseq.Editor.getPage(page.page.id)
            }
          } else {
            this.renderAsBlock = false

            page = await logseq.Editor.getPage(pageName)
            blocks = await logseq.Editor.getPageBlocksTree(pageName)
          }
          showMessage && logseq.UI.showMsg('Page view')
        } else if (route.startsWith('/namespace/')) {
          nodeAnchorEnabled = false
          let pageName = decodeURIComponent(route.substring(11))
          this.renderAsBlock = false
          if (pageName.indexOf('/') > -1) {
            pageName = pageName.split('/')[0]
          }
          page = await logseq.Editor.getPage(pageName)

          const namespaces = await logseq.Editor.getPagesFromNamespace(pageName)
          const parse = function (items, pageName) {
            const stack = []

            items.forEach((item) => {
              const cutName = item.originalName.substring(pageName.length + 1)

              const names = cutName.split('/')
              let current = stack
              names.forEach((name) => {
                const search = current.find((item) => item.key === name)

                if (!search) {
                  current.push({
                    key: name,
                    content: `<a style="cursor: pointer" onclick="logseq.App.pushState('page', { name: '${item.originalName}' });">${name}</a>`,
                    children: [],
                  })
                } else {
                  current = search.children
                }
              })
            })

            return stack
          }
          blocks = parse(namespaces, pageName) as BlockEntity[]
          showMessage && logseq.UI.showMsg('Namespace view')
        } else if (route.startsWith('/reference/')) {
          nodeAnchorEnabled = false
          const pageName = decodeURIComponent(route.substring(11))
          this.renderAsBlock = false
          page = await logseq.Editor.getPage(pageName)

          const references = await logseq.Editor.getPageLinkedReferences(
            pageName
          )
          const stack = [] as BlockEntity[]

          if (references) {
            references.forEach((item) => {
              stack.push({
                content: `<a style="cursor: pointer" onclick="logseq.App.pushState('page', { name: '${item[0].originalName}' });">${item[0].originalName}</a>`,
              } as BlockEntity)
            })

            blocks = stack
            showMessage && logseq.UI.showMsg('Reference view')
          } else {
            showMessage &&
              logseq.UI.showMsg(
                'There is no linked reference for current page.',
                'warning'
              )
            return
          }
        }
      } else if (
        // trigger from shortcuts and slash command will not trigger route change
        !this.renderAsBlock &&
        page &&
        page.page &&
        blocks[0] &&
        !blocks[0].uuid
      ) {
        this.renderAsBlock = true
        this.editingBlockUUID = page.uuid
        page = await logseq.Editor.getPage(page.page.id)
      }

      // Parse the proper title and blocks
      let title
      if (this.renderAsBlock) {
        let currentBlock
        if (this.editingBlockUUID) {
          currentBlock = await logseq.Editor.getBlock(this.editingBlockUUID, {
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
            currentBlock.uuid,
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

          const favorites = []
          const currentGraphFav = await logseq.App.getCurrentGraphFavorites()
          for (let i = 0; i < currentGraphFav.length; i++) {
            favorites.push({
              content: `[[${currentGraphFav[i]}]]`,
            })
          }

          blocks.push({
            content: 'Favorites',
            children: favorites,
          } as BlockEntity)

          const recents = []
          const currentGraphRecent = await logseq.App.getCurrentGraphRecent()
          for (let i = 0; i < currentGraphRecent.length; i++) {
            recents.push({
              content: `[[${currentGraphRecent[i]}]]`,
            })
          }

          blocks.push({
            content: 'Recent',
            children: recents,
          } as BlockEntity)

          if (config.enabledJournals) {
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

      // Process blocks limit
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

      // The final blocks to render
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

          const topic = await parseBlockContent(
            content,
            properties,
            uuid,
            config
          )

          // Add leading syntax according to depth.
          let ret = addPrefixToMultipleLinesBlock(
            `${' '.repeat((depth + 1) * 2)}`,
            (nodeAnchorEnabled && page
              ? `- <a class="anchor" style="cursor: pointer; font-size: 60%; vertical-align:middle;" target="_blank" onclick="logseq.App.pushState('page', { name: '${uuid}' }); ">${
                  logseq.settings?.nodeAnchorIcon || '🟢'
                }</a> `
              : '- ') + topic
          )

          if (
            children &&
            (it['collapsed?'] !== true || collapsed !== 'hidden')
          ) {
            ret +=
              '\n\n' +
              (await walkTransformBlocks(children, depth + 1, config)).join(
                '\n'
              )
          }

          newBlocks.push(ret)
        }

        return newBlocks
      }

      let md =
        '- ' +
        (this.renderAsBlock && nodeAnchorEnabled
          ? `<a style="cursor: pointer; font-size: 60%; vertical-align:middle;" target="_blank" onclick="logseq.App.pushState('page', { name: '${page.originalName}' }); ">🏠</a> `
          : '') +
        title +
        '\n\n' +
        (await walkTransformBlocks(filteredBlocks, 0, config)).join('\n')

      // remove image size
      md = md.replace(
        /(!\[.*?\]\(.*?\))\{(:[a-z0-9 ]+(, )?)+\}/gi,
        (match, p1) => {
          return p1
        }
      )

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
          this.mm.setData(root)
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
          this.mm.setData(root)

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
          this.mm.setData(root)
        }
      }

      const focusPrevious = () => {
        const top = stack[stack.length - 1]
        if (top && top.children && pointer - 1 >= 0) {
          root = top.children[--pointer]
          // @ts-ignore
          window.root = root
          this.mm.setData(root)
        }
      }

      const focusReset = () => {
        root = originalRoot
        // @ts-ignore
        window.root = root
        stack = []
        showAll(root)
        this.mm.setData(root)
        totalLevel = originalTotalLevel
        currentLevel = totalLevel
      }

      let svgNode

      const bindKeys = async () => {
        if (hotkeys) {
          // Pen shortcuts
          hotkeys(
            `ctrl+p, command+p, ctrl+z, command+z, ctrl+shift+z, command+shift+z,d,f,s,r,e,t,a,c,
            ctrl+1,command+1,ctrl+2,command+2,ctrl+3,command+3,ctrl+4,command+4,ctrl+5,command+5,ctrl+6,command+6,ctrl+7,command+7,ctrl+8,command+8,ctrl+9,command+9,ctrl+0,command+0,
            ctrl+alt+1,command+alt+1, ctrl+alt+2,command+alt+2, ctrl+alt+3,command+alt+3,
            alt+=,alt+-`,
            (event, handler) => {
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
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-black')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+2':
                  case 'ctrl+2': {
                    penStore.drauu.brush.color = '#ed153d'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-red')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+3':
                  case 'ctrl+3': {
                    penStore.drauu.brush.color = '#ed9a26'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-orange')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+4':
                  case 'ctrl+4': {
                    penStore.drauu.brush.color = '#ede215'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-yellow')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+5':
                  case 'ctrl+5': {
                    penStore.drauu.brush.color = '#30bd20'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-green')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+6':
                  case 'ctrl+6': {
                    penStore.drauu.brush.color = '#2656bf'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-blue')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+7':
                  case 'ctrl+7': {
                    penStore.drauu.brush.color = '#c24aed'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
                    document
                      .getElementById('pen-color-purple')
                      ?.classList.add('active')
                    return false
                  }

                  case 'command+8':
                  case 'ctrl+8': {
                    penStore.drauu.brush.color = '#bf6b26'
                    penStore.colors.forEach((el) =>
                      el.classList.remove('active')
                    )
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
                      document
                        .getElementById('bg-white')
                        ?.classList.add('active')
                    } else {
                      penLayerEl?.classList.add('background-white')
                      document
                        .getElementById('bg-white')
                        ?.classList.add('active')
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
                      document
                        .getElementById('bg-black')
                        ?.classList.add('active')
                    } else {
                      penLayerEl?.classList.add('background-black')
                      document
                        .getElementById('bg-black')
                        ?.classList.add('active')
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
                    document
                      .getElementById('m-ellipse')
                      ?.classList.add('active')
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

          // @ts-ignore
          hotkeys('shift+1', async function () {
            await pageButtonHandler()
          })
          // @ts-ignore
          hotkeys('shift+2', async function () {
            await namespaceButtonHandler()
          })
          // @ts-ignore
          hotkeys('shift+3', async function () {
            await referenceButtonHandler()
          })

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
            'up,down,left,right,esc,space, shift+space, shift+g, `,r,h,j,k,shift+j,shift+k,l,n,shift+l,shift+h,p,b,ctrl+b,command+b,q,-,=,0,9,1,2,3,4,5,shift+/',
            // @ts-ignore
            async (event, handler) => {
              const helpStore = useHelp()
              if (
                helpStore.visible &&
                !['shift+/', 'q', 'esc'].includes(handler.key)
              ) {
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
                  await this.mm?.fit()
                  break
                case 'shift+space': {
                  // await this.mm?.fit()
                  svgNode = this.mm.svg.node()

                  // undefined
                  const { width: offsetWidth, height: offsetHeight } =
                    svgNode.getBoundingClientRect()
                  const { fitRatio } = this.mm.options
                  const { minX, maxX, minY, maxY } = this.mm.state
                  const naturalWidth = maxY - minY
                  const naturalHeight = maxX - minX
                  const aspectRatio = naturalWidth / naturalHeight

                  // 确定基于短边缩放
                  let scale
                  if (aspectRatio > 1) {
                    // 宽度大于高度，基于宽度缩放
                    scale = Math.min(
                      (offsetHeight / naturalHeight) * fitRatio,
                      4
                    )
                  } else {
                    // 高度大于或等于宽度，基于高度缩放
                    scale = Math.min((offsetWidth / naturalWidth) * fitRatio, 4)
                  }

                  if (svgNode) {
                    // @ts-ignore
                    const transform = d3.zoomTransform(this.mm.svg.node())
                    // @ts-ignore
                    let translateX, translateY
                    if (aspectRatio > 1) {
                      // 宽度大于高度，定位到左边
                      translateX = 0 - minY * scale
                      translateY =
                        (offsetHeight - naturalHeight * scale) / 2 -
                        minX * scale
                    } else {
                      // 高度大于或等于宽度，定位到最顶部
                      translateX = 0 - minY * scale
                      translateY = 0 - minX * scale
                    }
                    transform.x = translateX
                    transform.y = translateY
                    transform.k = scale
                    // @ts-ignore
                    this.mm
                      .transition(this.mm.g)
                      .attr(
                        'transform',
                        `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                      )
                  }
                  break
                }
                case 'shift+g': {
                  // await this.mm?.fit()
                  svgNode = this.mm.svg.node()

                  // undefined
                  const { width: offsetWidth, height: offsetHeight } =
                    svgNode.getBoundingClientRect()
                  const { fitRatio } = this.mm.options
                  const { minX, maxX, minY, maxY } = this.mm.state
                  const naturalWidth = maxY - minY
                  const naturalHeight = maxX - minX
                  const aspectRatio = naturalWidth / naturalHeight

                  // 确定基于短边缩放
                  let scale
                  if (aspectRatio > 1) {
                    // 宽度大于高度，基于宽度缩放
                    scale = Math.min(
                      (offsetHeight / naturalHeight) * fitRatio,
                      4
                    )
                  } else {
                    // 高度大于或等于宽度，基于高度缩放
                    scale = Math.min((offsetWidth / naturalWidth) * fitRatio, 4)
                  }

                  if (svgNode) {
                    // @ts-ignore
                    const transform = d3.zoomTransform(this.mm.svg.node())
                    // @ts-ignore
                    let translateX, translateY
                    if (aspectRatio > 1) {
                      // 宽度大于高度，定位到左边
                      translateX =
                        0 - minY * scale - (naturalWidth * scale - offsetWidth)
                      translateY =
                        (offsetHeight - naturalHeight * scale) / 2 -
                        minX * scale
                    } else {
                      // 高度大于或等于宽度，定位到最顶部
                      translateX = 0 - minY * scale
                      translateY =
                        0 -
                        minX * scale -
                        (naturalHeight * scale - offsetHeight)
                    }
                    transform.x = translateX
                    transform.y = translateY
                    transform.k = scale
                    // @ts-ignore
                    this.mm
                      .transition(this.mm.g)
                      .attr(
                        'transform',
                        `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                      )
                  }
                  break
                }
                case '0': // 0
                  currentLevel = 0
                  hideAll(root)
                  this.mm.setData(root)

                  break
                case '9': // 9
                  currentLevel = totalLevel
                  showAll(root)
                  this.mm.setData(root)

                  break
                case '1': // 1
                  hideAll(root)
                  expandLevel(root, 1)
                  currentLevel = 1
                  this.mm.setData(root)

                  break
                case '2': // 2
                  hideAll(root)
                  expandLevel(root, 2)
                  currentLevel = 2
                  this.mm.setData(root)

                  break
                case '3': // 3
                  hideAll(root)
                  expandLevel(root, 3)
                  currentLevel = 3
                  this.mm.setData(root)

                  break
                case '4': // 4
                  hideAll(root)
                  expandLevel(root, 4)
                  currentLevel = 4
                  this.mm.setData(root)

                  break
                case '5': // 5
                  hideAll(root)
                  expandLevel(root, 5)
                  currentLevel = 5
                  this.mm.setData(root)

                  break
                case 'h': // h
                  hideAll(root)
                  expandLevel(root, currentLevel > 0 ? --currentLevel : 0)
                  this.mm.setData(root)
                  break
                case 'l': // l
                  hideAll(root)
                  expandLevel(
                    root,
                    currentLevel < totalLevel ? ++currentLevel : totalLevel
                  )
                  this.mm.setData(root)
                  break

                case 'j': // j
                  expandStepByStep(root)
                  this.mm.setData(root)
                  break
                case 'k': // k
                  collapseStepByStep(root)
                  this.mm.setData(root)
                  break

                case '=': // +
                  await this.mm.rescale(1.25)
                  break
                case '-': // -
                  await this.mm.rescale(0.8)
                  break
                case 'ctrl+b':
                case 'command+b':
                  // eslint-disable-next-line no-case-declarations
                  const elResetButton = document.getElementById('reset-button')
                  eventFire(elResetButton, 'click')
                  break
                case '`':
                  // eslint-disable-next-line no-case-declarations
                  const elRandomButton =
                    document.getElementById('random-button')
                  eventFire(elRandomButton, 'click')
                  break
                case 'up':
                case 'shift+k':
                  svgNode = this.mm.svg.node()
                  if (svgNode) {
                    // @ts-ignore
                    const transform = d3.zoomTransform(this.mm.svg.node())
                    if (transform.x && transform.y && transform.k) {
                      // @ts-ignore
                      transform.y = transform.y + 100
                      // @ts-ignore
                      this.mm
                        .transition(this.mm.g)
                        .attr(
                          'transform',
                          `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                        )
                    }
                  }
                  break
                case 'down':
                case 'shift+j':
                  svgNode = this.mm.svg.node()
                  if (svgNode) {
                    // @ts-ignore
                    const transform = d3.zoomTransform(this.mm.svg.node())
                    if (transform.x && transform.y && transform.k) {
                      // @ts-ignore
                      transform.y = transform.y - 100
                      // @ts-ignore
                      this.mm
                        .transition(this.mm.g)
                        .attr(
                          'transform',
                          `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                        )
                    }
                  }
                  break

                case 'left':
                case 'shift+h':
                  svgNode = this.mm.svg.node()
                  if (svgNode) {
                    // @ts-ignore
                    const transform = d3.zoomTransform(this.mm.svg.node())
                    if (transform.x && transform.y && transform.k) {
                      // @ts-ignore
                      transform.x = transform.x + 100
                      // @ts-ignore
                      this.mm
                        .transition(this.mm.g)
                        .attr(
                          'transform',
                          `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                        )
                    }
                  }
                  break
                case 'right':
                case 'shift+l':
                  svgNode = this.mm.svg.node()
                  if (svgNode) {
                    // @ts-ignore
                    const transform = d3.zoomTransform(this.mm.svg.node())
                    if (transform.x && transform.y && transform.k) {
                      // @ts-ignore
                      transform.x = transform.x - 100
                      // @ts-ignore
                      this.mm
                        .transition(this.mm.g)
                        .attr(
                          'transform',
                          `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`
                        )
                    }
                  }
                  break

                case 'shift+/': {
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

      if (this.mm) {
        // reuse instance, update data
        showAllWithCollapsed(root)
        this.mm.setData(
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
        this.mm = Markmap.create(
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

        // @ts-ignore
        window.mm = this.mm

        // Only bind once
        bindKeys()

        addToolbar(this.mm)
      }
    },
  },
})
