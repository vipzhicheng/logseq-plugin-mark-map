import '@logseq/libs'
import { Toolbar } from 'markmap-toolbar'
import html2canvas from 'html2canvas'
import org from 'org'
import replaceAsync from 'string-replace-async'
import ellipsis from 'text-ellipsis'
import TurndownService from 'turndown'
import { usePen } from '@/stores/pen'
import { useMarkmap } from '@/stores/markmap'
import { useHelp } from '@/stores/help'
import {
  BlockEntity,
  BlockUUIDTuple,
  SettingSchemaDesc,
} from '@logseq/libs/dist/LSPlugin.user'
import { Transformer } from 'markmap-lib'
const transformer = new Transformer()

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

export function eventFire(el: any, etype: string) {
  if (el.fireEvent) {
    el.fireEvent('on' + etype)
  } else {
    const evObj = document.createEvent('Events')
    evObj.initEvent(etype, true, false)
    el.dispatchEvent(evObj)
  }
}

export const getSVGContent = (svg: SVGElement): string => {
  const xmlVersion = '1.1'
  const svgVersion = '1.1'
  const svgBaseProfile = 'full'
  const svgXmlns = 'http://www.w3.org/2000/svg'
  const svgXmlnsXlink = 'http://www.w3.org/1999/xlink'
  const svgXmlnsEv = 'http://www.w3.org/2001/xml-events'

  let svgInner = svg.innerHTML
  svgInner = svgInner
    .replace(/onclick=".*?"/g, '')
    .replace(/<a class="anchor".*?>.*?<\/a>/g, '')

  let svgContent = `<?xml version="${xmlVersion}"?>
  <svg version="${svgVersion}"
  baseProfile="${svgBaseProfile}"
  width="1920"
  height="1080"
  xmlns="${svgXmlns}"
  xmlns:xlink="${svgXmlnsXlink}"
  xmlns:ev="${svgXmlnsEv}">
  ${svgInner}
  </svg>`

  svgContent = svgContent.replace(/<br>/g, '<br/>')
  return svgContent
}

// Customize toolbar

export const themeWorkflowTag = (str, uuid: string) => {
  return str.replace(
    /^(TODO|DOING|DONE|LATER|NOW|WAITING|CANCELLED) /,
    (match, p1) => {
      switch (p1) {
        case 'TODO':
          return (
            `<a style="cursor:pointer;" data-task="TODO" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #845EC2; color: #eee">` +
            p1 +
            '</code></a> '
          )
        case 'DOING':
          return (
            `<a style="cursor:pointer;" data-task="DOING" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #FF8066; color: #eee">` +
            p1 +
            '</code></a> '
          )
        case 'DONE':
          return (
            `<a style="cursor:pointer;" data-task="DONE" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #008B74; color: #eee">` +
            p1 +
            '</code></a> '
          )
        case 'NOW':
          return (
            `<a style="cursor:pointer;" data-task="NOW" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #006C9A; color: #eee">` +
            p1 +
            '</code></a> '
          )
        case 'LATER':
          return (
            `<a style="cursor:pointer;" data-task="LATER" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #911F27; color: #eee">` +
            p1 +
            '</code></a> '
          )
        case 'WAITING':
          return (
            `<a style="cursor:pointer;" data-task="WAITING" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #3180FF; color: #eee">` +
            p1 +
            '</code></a> '
          )
        case 'CANCELLED':
          return (
            `<a style="cursor:pointer;" data-task="CANCELLED" data-uuid="${uuid}" onclick="rollTaskStatus(this, event);"><code style="background: #C7C7C7; color: #222">` +
            p1 +
            '</code></a> '
          )
      }
    }
  )
}

const blockFilter = (it: any) => {
  if (!it) return false
  //uuid, title
  const { children, content, properties } = it
  if (properties?.markMapDisplay === 'hidden') {
    return false
  }
  if (content.startsWith('---\n')) {
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
  uuid: string,
  config: any = {}
) => {
  const contentFiltered = content
    .split('\n')
    .filter((line: string) => line.indexOf(':: ') === -1)
    .join('\n')
  let topic = contentFiltered

  // Process #+BEGIN_WARNING, #+BEGIN_NOTE, #+BEGIN_TIP, #+BEGIN_CAUTION, #+BEGIN_PINNED, #+BEGIN_IMPORTANT, #+BEGIN_QUOTE, #+BEGIN_CENTER

  const regexHashWarning = /#\+BEGIN_WARNING([\s\S]*?)#\+END_WARNING/im
  const regexQuery = /#\+BEGIN_QUERY([\s\S]*?)#\+END_QUERY/im
  const regexHashNote = /#\+BEGIN_NOTE([\s\S]*?)#\+END_NOTE/im
  const regexHashTip = /#\+BEGIN_TIP([\s\S]*?)#\+END_TIP/im
  const regexHashCaution = /#\+BEGIN_CAUTION([\s\S]*?)#\+END_CAUTION/im
  const regexHashPinned = /#\+BEGIN_PINNED([\s\S]*?)#\+END_PINNED/im
  const regexHashImportant = /#\+BEGIN_IMPORTANT([\s\S]*?)#\+END_IMPORTANT/im
  const regexHashQuote = /#\+BEGIN_QUOTE([\s\S]*?)#\+END_QUOTE/im
  const regexHashCenter = /#\+BEGIN_CENTER([\s\S]*?)#\+END_CENTER/im
  const regexLogBook = /:LOGBOOK:[\s\S]*?:END:/m
  const regexMarkdownTable = /\|[\s-|]*?\|/m

  // remove logbook syntax
  if (regexLogBook.test(topic)) {
    topic = topic.replace(regexLogBook, (match, p1) => {
      return ''
    })
  }

  if (regexMarkdownTable.test(topic)) {
    topic = `🗓️ <a style="cursor: pointer" onclick="logseq.App.pushState('page', { name: '${uuid}' });">Markdown Table</a>`
  } else if (regexHashWarning.test(topic)) {
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
  } else if (regexQuery.test(topic)) {
    topic = topic.replace(regexQuery, (match, p1) => {
      return `🔍 <a style="cursor: pointer" onclick="logseq.App.pushState('page', { name: '${uuid}' });">LOGSEQ QUERY</a>`
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
    topic = themeWorkflowTag(topic, uuid)
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
        }' });">${themeWorkflowTag(
          contentFiltered || '[MISSING BLOCK]',
          block.uuid
        )}</a>`
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
        }' });">${themeWorkflowTag(
          contentFiltered || '[MISSING BLOCK]',
          block.uuid
        )}</a>`
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

export const convertFlatBlocksToTree = async (
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

export const getSettingsDefinition = (): SettingSchemaDesc[] => {
  return [
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
      title: 'Enable Blur Background',
      key: 'enableBlurBackground',
      description: 'If you like blur background, you can enable this option',
      type: 'boolean',
      default: false,
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
    {
      title: 'Disable shortcuts',
      key: 'disableShortcuts',
      description:
        'If you think markmap shortcuts conflict with others, you can check this option to disable it or change bindings in settings file then reload the application.',
      type: 'boolean',
      default: false,
    },
    {
      title: '(Experimental) Enable rendering images on markmap',
      key: 'enableRenderImage',
      description:
        'By default render images as icon and image alt text. If you want to render images as image, check this option.',
      type: 'boolean',
      default: false,
    },
    {
      title: '(Experimental) Max images size for rendering',
      key: 'maxRenderImageSize',
      description:
        'The longest image side length will be less than this setting.',
      type: 'enum',
      enumChoices: ['200', '150', '100', '50'],
      default: '100',
    },
  ]
}

export const addToolbar = (mm) => {
  const toolbar = new Toolbar()
  toolbar.setItems([
    'forward',
    'back',
    'line',
    'page',
    'namespace',
    'reference',
    'line',
    'zoomIn',
    'zoomOut',
    'fit',
    'line',
    'pen',
    'save-png',
    'save-svg',
    'line',
    'help',
    'close',
  ])
  toolbar.setBrand(false)

  toolbar.register({
    id: 'forward',
    title: 'Go forward',
    content: Toolbar.icon(
      'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z'
    ),
    onClick: async () => {
      // @ts-ignore
      await logseq.App.invokeExternalCommand('logseq.go/forward')
    },
  })
  toolbar.register({
    id: 'back',
    title: 'Go back',
    content: Toolbar.icon(
      'M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z'
    ),
    onClick: async () => {
      // @ts-ignore
      await logseq.App.invokeExternalCommand('logseq.go/backward')
    },
  })
  toolbar.register({
    id: 'page',
    title: 'Switch to page mode',
    content: Toolbar.icon(
      'M13 1v1h1v1h1v1h1v1h1v1h1v1h1v13h-1v1H4v-1H3V2h1V1zm0 3h-1v4h4V7h-1V6h-1V5h-1zM5 3v16h12v-9h-6V9h-1V3z'
    ),
    onClick: async () => {
      await pageButtonHandler()
    },
  })
  toolbar.register({
    id: 'namespace',
    title: 'Switch to namespace mode',
    content: Toolbar.icon(
      'M3 3h6v4H3zm12 7h6v4h-6zm0 7h6v4h-6zm-2-4H7v5h6v2H5V9h2v2h6z'
    ),
    onClick: async () => {
      await namespaceButtonHandler()
    },
  })
  toolbar.register({
    id: 'reference',
    title: 'Switch to reference mode',
    content: Toolbar.icon(
      'M10.615 16.077H7.077q-1.692 0-2.884-1.192Q3 13.693 3 12q0-1.691 1.193-2.885q1.192-1.193 2.884-1.193h3.538v1H7.077q-1.27 0-2.173.904T4 12q0 1.27.904 2.173t2.173.904h3.538zM8.5 12.5v-1h7v1zm4.885 3.577v-1h3.538q1.27 0 2.173-.904T20 12q0-1.27-.904-2.173t-2.173-.904h-3.538v-1h3.538q1.692 0 2.885 1.192Q21 10.307 21 12q0 1.691-1.193 2.885q-1.192 1.193-2.884 1.193z'
    ),
    onClick: async () => {
      await referenceButtonHandler()
    },
  })
  toolbar.register({
    id: 'line',
    title: '',
    content: Toolbar.icon(
      'M2 14a1 1 0 0 1 1-1h22a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1',
      {
        class: 'line',
      }
    ),
    onClick: async () => {
      // do nothing
    },
  })

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
  toolbar.register({
    id: 'close',
    title: 'Close Markmap',
    content: Toolbar.icon(
      'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
    ),
    onClick: async () => {
      logseq.hideMainUI({
        restoreEditingCursor: true,
      })
    },
  })
  toolbar.attach(mm)
  const el = toolbar.render() as HTMLElement
  el.style.position = 'absolute'
  el.style.bottom = '1rem'
  el.style.right = '1rem'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.rowGap = '2px'
  document.getElementById('markmap-toolbar')?.append(el)
}

export const hookMarkmapTransformer = async () => {
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
    } else if (
      logseq.settings?.enableRenderImage &&
      ['png', 'jpg', 'jpeg', 'webp'].includes(
        src.substring(src.lastIndexOf('.') + 1).toLowerCase()
      )
    ) {
      const maxSize = logseq.settings?.maxRenderImageSize
        ? logseq.settings.maxRenderImageSize
        : '100'
      const minSize = 20
      result = `<a target="_blank" title="${alt}"  data-lightbox="gallery" href="${
        src.indexOf('http') !== 0 ? 'assets://' : ''
      }${src}"><img alt="${alt}"  src="${
        src.indexOf('http') !== 0 ? 'assets://' : ''
      }${src}" style="max-width: ${maxSize}px; max-height: ${maxSize}px; min-height: ${minSize}px; min-width: ${minSize}px;"/></a>`
    } else {
      result = `<a target="_blank" title="${alt}"  data-lightbox="gallery" href="${
        src.indexOf('http') !== 0 ? 'assets://' : ''
      }${src}">🖼 ${alt}</a>`
    }

    return result
  }
}

export const namespaceButtonHandler = async () => {
  const { renderMarkmap } = useMarkmap()
  let page = await logseq.Editor.getCurrentPage()
  if (page && page.page) {
    page = await logseq.Editor.getPage(page.page.id)
  }
  if (page) {
    await renderMarkmap(`/namespace/${page.originalName}`)
  }
}
export const pageButtonHandler = async () => {
  const { renderMarkmap } = useMarkmap()
  let page = await logseq.Editor.getCurrentPage()
  if (page && page.page) {
    page = await logseq.Editor.getPage(page.page.id)
  }
  if (page) {
    await renderMarkmap()
  }
}
export const referenceButtonHandler = async () => {
  const { renderMarkmap } = useMarkmap()
  let page = await logseq.Editor.getCurrentPage()
  if (page && page.page) {
    page = await logseq.Editor.getPage(page.page.id)
  }
  if (page) {
    await renderMarkmap(`/reference/${page.originalName}`)
  }
}
