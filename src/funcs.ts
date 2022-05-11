import '@logseq/libs'
import { Toolbar } from 'markmap-toolbar'
import html2canvas from 'html2canvas'

const settingsVersion = 'v1'
export const defaultSettings = {
  keyBindings: {
    openMarkmap: 'ctrl+m ctrl+m',
  },
  settingsVersion,
  disabled: false,
}

export type DefaultSettingsType = typeof defaultSettings

export const initSettings = () => {
  let settings = logseq.settings

  const shouldUpdateSettings =
    !settings || settings.settingsVersion != defaultSettings.settingsVersion

  if (shouldUpdateSettings) {
    settings = defaultSettings
    logseq.updateSettings(settings)
  }
}

export const getSettings = (
  key: string | undefined,
  defaultValue: any = undefined
) => {
  const settings = logseq.settings
  const merged = Object.assign(defaultSettings, settings)
  return key ? (merged[key] ? merged[key] : defaultValue) : merged
}

export const goForwardButtonHandler = async () => {
  // @ts-ignore
  await logseq.App.invokeExternalCommand('logseq.go/forward')
  logseq.hideMainUI()
  logseq.showMainUI({
    autoFocus: true,
  })
}

export const closeButtonHandler = () => {
  logseq.hideMainUI({
    restoreEditingCursor: true,
  })
}

export const goBackButtonHandler = async () => {
  // @ts-ignore
  await logseq.App.invokeExternalCommand('logseq.go/backward')
  logseq.hideMainUI()
  logseq.showMainUI({
    autoFocus: true,
  })
}

export function eventFire(el: any, etype: string) {
  if (el.fireEvent) {
    el.fireEvent('on' + etype)
  } else {
    const evObj = document.createEvent('Events')
    evObj.initEvent(etype, true, false)
    el.dispatchEvent(evObj)
  }
}

const getSVGContent = (svg: SVGElement): string => {
  const xmlVersion = '1.1'
  const svgVersion = '1.1'
  const svgBaseProfile = 'full'
  const svgXmlns = 'http://www.w3.org/2000/svg'
  const svgXmlnsXlink = 'http://www.w3.org/1999/xlink'
  const svgXmlnsEv = 'http://www.w3.org/2001/xml-events'

  let svgContent = `<?xml version="${xmlVersion}"?>
  <svg version="${svgVersion}"
  baseProfile="${svgBaseProfile}"
  xmlns="${svgXmlns}"
  xmlns:xlink="${svgXmlnsXlink}"
  xmlns:ev="${svgXmlnsEv}">
  ${svg.innerHTML}
  </svg>`

  svgContent = svgContent.replace(/<br>/g, '<br/>')
  return svgContent
}

// Customize toolbar
export function addToolbar(mm) {
  const toolbar = new Toolbar()
  toolbar.setItems(['zoomIn', 'zoomOut', 'fit', 'save-png', 'save-svg', 'help'])
  toolbar.setBrand(false)
  toolbar.register({
    id: 'save-png',
    title: 'Save as png',
    content: Toolbar.icon(
      'M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z'
    ),
    onClick: async () => {
      const g = document.querySelector('#markmap g').getBoundingClientRect()
      const el = document.querySelector('#markmap-container') as HTMLElement
      const rect = el.getBoundingClientRect()
      const oldHeight = el.style.height
      const oldWidth = el.style.width
      if (g.height > g.width) {
        el.style.height = `${Math.ceil((g.height * rect.width) / g.width)}px`
      } else {
        el.style.width = `${Math.ceil((g.width * rect.height) / g.height)}px`
      }
      const page = await logseq.Editor.getCurrentPage()
      if (el) {
        html2canvas(el, {}).then(async function (canvas: HTMLCanvasElement) {
          const title = page?.originalName
          const url = canvas.toDataURL('image/png')
          const oA = document.createElement('a')
          oA.download = title || ''
          oA.href = url
          document.body.appendChild(oA)

          oA.click()
          el.style.height = oldHeight
          el.style.width = oldWidth
          await mm.fit()

          oA.remove()
        })
      }
    },
  })
  toolbar.register({
    id: 'save-svg',
    title: 'Save as svg',
    content: Toolbar.icon(
      'M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z'
    ),
    onClick: async () => {
      const svg = document.querySelector('#markmap') as SVGElement
      const content = getSVGContent(svg)

      const mime_type = 'image/svg+xml'

      const blob = new Blob([content], { type: mime_type })

      const page = await logseq.Editor.getCurrentPage()
      const title = page?.originalName || 'markmap'
      const dlink = document.createElement('a')
      dlink.download = `${title}.svg`
      dlink.href = window.URL.createObjectURL(blob)
      dlink.onclick = function (e) {
        // revokeObjectURL needs a delay to work properly
        setTimeout(function () {
          window.URL.revokeObjectURL(dlink.href)
        }, 1500)
      }

      dlink.click()
      dlink.remove()
    },
  })
  toolbar.register({
    id: 'help',
    title: 'Show shortcuts description',
    content: Toolbar.icon(
      'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
    ),
    onClick: async () => {
      // @ts-ignore
      Alpine.store('showHelp').toggle()
    },
  })
  toolbar.attach(mm)
  const el = toolbar.render() as HTMLElement
  el.style.position = 'absolute'
  el.style.bottom = '0.5rem'
  el.style.right = '0.5rem'
  document.getElementById('markmap-toolbar')?.append(el)
}

export const themeWorkflowTag = (str) => {
  return str.replace(/^(TODO|DOING|DONE|LATER|NOW) /, (match, p1) => {
    switch (p1) {
      case 'TODO':
        return (
          '<code style="background: #845EC2; color: #eee">' + p1 + '</code> '
        )
      case 'DOING':
        return (
          '<code style="background: #FF8066; color: #eee">' + p1 + '</code> '
        )
      case 'DONE':
        return (
          '<code style="background: #008B74; color: #eee">' + p1 + '</code> '
        )
      case 'NOW':
        return (
          '<code style="background: #006C9A; color: #eee">' + p1 + '</code> '
        )
      case 'LATER':
        return (
          '<code style="background: #911F27; color: #eee">' + p1 + '</code> '
        )
    }
  })
}

const blockFilter = (it: any) => {
  if (!it) return false
  //uuid, title
  const { children, content, properties } = it
  if (properties?.markMapDisplay === 'hidden') {
    return false
  }
  if (!content || content.startsWith('---\n')) {
    return false
  }
  if (/---+/.test(content.trim())) {
    return false
  }
  const contentFiltered = content
    .split('\n')
    .filter((line: string) => line.indexOf(':: ') === -1)
    .join('\n')
  const topic = contentFiltered.replace(/^[#\s]+/, '').trim()

  if (topic.length === 0 && (!children || children.length === 0)) {
    return false
  } else {
    return true
  }
}

export const walkTransformBlocksFilter = async (blocks) => {
  if (blocks && blocks.length > 0) {
    for (const it of blocks) {
      // uuid, title, content, properties
      let { children } = it
      children = await children
      if (children) {
        it.children = await walkTransformBlocksFilter(children)
      }
    }
    return blocks.filter(blockFilter)
  }
}

export const hexToRgb = function (hex): number[] {
  const hexCode = hex.charAt(0) === '#' ? hex.substr(1, 6) : hex

  const hexR = parseInt(hexCode.substr(0, 2), 16)
  const hexG = parseInt(hexCode.substr(2, 2), 16)
  const hexB = parseInt(hexCode.substr(4, 2), 16)
  return [hexR, hexG, hexB]
}
export const pickTextColorBasedOnBgColorSimple = function (
  rgb: number[],
  lightColor,
  darkColor
) {
  const [r, g, b] = rgb
  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? darkColor : lightColor
}
