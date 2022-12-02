import '@logseq/libs'
import { Toolbar } from 'markmap-toolbar'
import html2canvas from 'html2canvas'
import org from 'org'
import replaceAsync from 'string-replace-async'
import ellipsis from 'text-ellipsis'
import TurndownService from 'turndown'
import { usePen } from '@/stores/pen'
import { useHelp } from '@/stores/help'

const settingsVersion = 'v3'
export const defaultSettings = {
  keyBindings: {
    openMarkmap: 'ctrl+m ctrl+m',
    openMarkmapFull: 'ctrl+alt+shift+m ctrl+alt+shift+m',
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
}

export const closeButtonHandler = () => {
  logseq.hideMainUI({
    restoreEditingCursor: true,
  })
}

export const goBackButtonHandler = async () => {
  // @ts-ignore
  await logseq.App.invokeExternalCommand('logseq.go/backward')
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
  toolbar.setItems([
    'zoomIn',
    'zoomOut',
    'fit',
    'pen',
    'save-png',
    'save-svg',
    'help',
  ])
  toolbar.setBrand(false)
  toolbar.register({
    id: 'pen',
    title: 'Open pen mode',
    content: Toolbar.icon(
      'M12.9 6.858l4.242 4.243L7.242 21H3v-4.243l9.9-9.9zm1.414-1.414l2.121-2.122a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414l-2.122 2.121-4.242-4.242z'
    ),
    onClick: async () => {
      const penStore = usePen()
      penStore.toggle()
    },
  })
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

      // after container resize, fit once manually
      await mm.fit()
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
      const helpStore = useHelp()
      helpStore.toggleHelp()
    },
  })
  toolbar.attach(mm)
  const el = toolbar.render() as HTMLElement
  el.style.position = 'absolute'
  el.style.bottom = '0.5rem'
  el.style.right = '0.5rem'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.rowGap = '2px'
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

export const parseBlockContent = async (
  content: string,
  properties: any = {},
  config: any = {}
) => {
  const contentFiltered = content
    .split('\n')
    .filter((line: string) => line.indexOf(':: ') === -1)
    .join('\n')
  let topic = contentFiltered

  // Process #+BEGIN_WARNING, #+BEGIN_NOTE, #+BEGIN_TIP, #+BEGIN_CAUTION, #+BEGIN_PINNED, #+BEGIN_IMPORTANT, #+BEGIN_QUOTE, #+BEGIN_CENTER

  const regexHashWarning = /#\+BEGIN_WARNING([\s\S]*?)#\+END_WARNING/im
  const regexHashNote = /#\+BEGIN_NOTE([\s\S]*?)#\+END_NOTE/im
  const regexHashTip = /#\+BEGIN_TIP([\s\S]*?)#\+END_TIP/im
  const regexHashCaution = /#\+BEGIN_CAUTION([\s\S]*?)#\+END_CAUTION/im
  const regexHashPinned = /#\+BEGIN_PINNED([\s\S]*?)#\+END_PINNED/im
  const regexHashImportant = /#\+BEGIN_IMPORTANT([\s\S]*?)#\+END_IMPORTANT/im
  const regexHashQuote = /#\+BEGIN_QUOTE([\s\S]*?)#\+END_QUOTE/im
  const regexHashCenter = /#\+BEGIN_CENTER([\s\S]*?)#\+END_CENTER/im
  if (regexHashWarning.test(topic)) {
    topic = topic.replace(regexHashWarning, (match, p1) => {
      return `⚠️ ${p1.trim()}`
    })
  } else if (regexHashNote.test(topic)) {
    topic = topic.replace(regexHashNote, (match, p1) => {
      return `ℹ️ ${p1.trim()}`
    })
  } else if (regexHashTip.test(topic)) {
    topic = topic.replace(regexHashTip, (match, p1) => {
      return `💡 ${p1.trim()}`
    })
  } else if (regexHashCaution.test(topic)) {
    topic = topic.replace(regexHashCaution, (match, p1) => {
      return `☢️ ${p1.trim()}`
    })
  } else if (regexHashPinned.test(topic)) {
    topic = topic.replace(regexHashPinned, (match, p1) => {
      return `📌 ${p1.trim()}`
    })
  } else if (regexHashImportant.test(topic)) {
    topic = topic.replace(regexHashImportant, (match, p1) => {
      return `🔥 ${p1.trim()}`
    })
  } else if (regexHashQuote.test(topic)) {
    topic = topic.replace(regexHashQuote, (match, p1) => {
      return `💬 ${p1.trim()}`
    })
  } else if (regexHashCenter.test(topic)) {
    topic = topic.replace(regexHashCenter, (match, p1) => {
      return `${p1.trim()}`
    })
  }

  // Upstream lib do not support markdown quote syntax
  if (topic.startsWith('> ')) {
    topic = topic.replace(/^> /, '💬 ')
  }

  // transform renderer to specials style
  topic = topic.replace(/(?<!`){{renderer.*?}}(?!`)/g, `✨ Renderer`)
  // transform cloze to it's answer
  topic = topic.replace(/(?<!`){{cloze\s+(.*?)\s*}}(?!`)/g, '$1')

  if (logseq.settings?.replaceLatexMathExpressionEnabled) {
    topic = topic.replace(/\\begin\{equation\}/gm, '$$$$')
    topic = topic.replace(/\\end\{equation\}/gm, '$$$$')
  }

  // Process page tag
  const regexPageTag = /\s+#([^#\s()]+)/gi
  if (regexPageTag.test(topic)) {
    topic = topic.replace(regexPageTag, (match, p1) => {
      return ` <a style="cursor: pointer; font-size: 60%; vertical-align:middle;" target="_blank" onclick="logseq.App.pushState('page', { name: '${p1}' });">#${p1}</a>`
    })
  }

  if (topic) {
    // Theme workflow tag
    topic = themeWorkflowTag(topic)
  }

  // process link block reference
  const regexLinkBlockRef =
    /\[(.*?)\]\(\(\(([0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})\)\)\)/gi
  if (regexLinkBlockRef.test(topic)) {
    topic = await replaceAsync(
      topic,
      regexLinkBlockRef,
      async (match, p1, p2) => {
        const block = await logseq.Editor.getBlock(p2)
        return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${block.uuid}' });">${p1}</a>`
      }
    )
  }

  // process link page reference
  const regexLinkPageRef = /\[(.*?)\]\(\[\[(.*?)\]\]\)/gi
  if (regexLinkPageRef.test(topic)) {
    topic = await replaceAsync(
      topic,
      regexLinkPageRef,
      async (match, p1, p2) => {
        return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${p2}' });">${p1}</a>`
      }
    )
  }

  // Process block reference
  const regexBlockRef =
    /\(\(([0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})\)\)/gi
  const regexEmbedBlockRef =
    /\{\{embed\s+\(\(([0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})\)\)\}\}/gi
  if (regexEmbedBlockRef.test(topic)) {
    topic = await replaceAsync(topic, regexEmbedBlockRef, async (match, p1) => {
      const block = await logseq.Editor.getBlock(p1)
      if (block && block.content) {
        const content = block.content
        const contentFiltered = content
          .split('\n')
          .filter((line: string) => line.indexOf(':: ') === -1)
          .join('\n')

        return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${
          block.uuid
        }' });">${themeWorkflowTag(contentFiltered || '[MISSING BLOCK]')}</a>`
      }
      return '[MISSING BLOCK]'
    })
  }

  if (regexBlockRef.test(topic)) {
    topic = await replaceAsync(topic, regexBlockRef, async (match, p1) => {
      const block = await logseq.Editor.getBlock(p1)
      if (block && block.content) {
        const content = block.content
        const contentFiltered = content
          .split('\n')
          .filter((line: string) => line.indexOf(':: ') === -1)
          .join('\n')
        return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${
          block.uuid
        }' });">${themeWorkflowTag(contentFiltered || '[MISSING BLOCK]')}</a>`
      }
      return '[MISSING BLOCK]'
    })
  }

  // Process org mode
  // @ts-ignore
  if (config.preferredFormat === 'org') {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    })

    turndownService.addRule('strikethrough', {
      filter: ['del', 's', 'strike'],
      replacement: function (content) {
        return '~~' + content + '~~'
      },
    })

    const parser = new org.Parser()
    const orgDocument = parser.parse(topic)
    const orgHTMLDocument = orgDocument.convert(org.ConverterHTML, {
      headerOffset: 1,
      exportFromLineNumber: false,
      suppressSubScriptHandling: false,
      suppressAutoLink: false,
    })
    topic = orgHTMLDocument.toString() // to html
    topic = turndownService.turndown(topic) // to markdown
  }

  // Remove leading heading syntax
  topic = topic.replace(/\^\^/g, '==') // try marked syntax
  topic = topic.replace(/^[#\s]+/, '').trim()

  // Process page reference
  const regexPageRef = /\[\[([^[\]]*?)\]\]/gi
  const regexEmbedPageRef = /\{\{embed\s+\[\[([^[\]]*?)\]\]\}\}/gi
  if (regexEmbedPageRef.test(topic)) {
    topic = topic.replace(regexEmbedPageRef, (match, p1) => {
      return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${p1}' });">${p1}</a>`
    })
  }

  if (regexPageRef.test(topic)) {
    topic = topic.replace(regexPageRef, (match, p1) => {
      if (p1.indexOf('../assets/') === 0) {
        let src = p1
        if (src.indexOf('http') !== 0 && src.indexOf('..') === 0) {
          src =
            config.currentGraph.substring(13) + '/' + src.replace(/\.\.\//g, '')
        }
        return `<a target="_blank" title="${p1}"  data-lightbox="gallery" href="assets://${src}">🖼 ${p1}</a>`
      } else {
        return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${p1}' });">${p1}</a>`
      }
    })
  }

  // Process link parse
  const regexUrl =
    /(https?:\/\/[-a-zA-Z0-9@:%_+.~#?&/=]{2,256}\.[a-z]{2,4}(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?)(?=\s)/gi
  const regexUrlMatchStartEnd =
    /^(https?:\/\/[-a-zA-Z0-9@:%_+.~#?&/=]{2,256}\.[a-z]{2,4}(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?)$/gi

  topic = topic.replace(regexUrl, '<$1>') // add <> to all links that followed by blank, means not markdown link
  topic = topic.replace(regexUrlMatchStartEnd, '<$1>') // add <> to all pure link block

  // Cut block content
  if (properties?.markMapCut) {
    const orgTopic = topic
    topic = ellipsis(topic, parseInt(properties?.markMapCut))
    topic = `<span style="cursor:pointer" title="${orgTopic}">${topic}</span>`
  }

  // Sync Logseq block groundcolor
  if (properties?.backgroundColor) {
    topic = `<span style="padding: 2px 6px; color: ${pickTextColorBasedOnBgColorSimple(
      hexToRgb(properties.backgroundColor),
      '#fff',
      '#000'
    )}; background-color:${properties.backgroundColor};">${topic}</span>`
  }

  // Add prefix to code block
  if (topic.indexOf('```') > -1) {
    topic =
      '\n\n' +
      topic
        .split(/(```[\d\D]*?```)/gm)
        .filter((splited) => splited)
        .map((part) => {
          if (part.indexOf('```') === 0) {
            return '  -\n' + addPrefixToMultipleLinesBlock('    ', part.trim())
          } else {
            return addPrefixToMultipleLinesBlock('  ', '- ' + part.trim())
          }
        })
        .join('\n')
  }

  // Support markdown footnote
  if (/\[\^(.*?)\]/.test(topic)) {
    topic = topic.replace(/\[\^(.*?)\]/g, '［^$1］')
  }

  return topic
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

export const addPrefixToMultipleLinesBlock = (
  prefix: string,
  topic: string
) => {
  return topic
    .split('\n')
    .map((line) => {
      return prefix + line
    })
    .join('\n')
}
