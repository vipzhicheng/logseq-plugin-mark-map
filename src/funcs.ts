import { useMarkmap } from '@/stores/markmap'
import '@logseq/libs'
import {
  BlockEntity,
  BlockUUIDTuple,
  SettingSchemaDesc,
} from '@logseq/libs/dist/LSPlugin.user'
import { Transformer } from 'markmap-lib'
import { Toolbar } from 'markmap-toolbar'
import org from 'org'
import replaceAsync from 'string-replace-async'
import ellipsis from 'text-ellipsis'
import TurndownService from 'turndown'
import { l } from 'vite/dist/node/types.d-aGj9QkWt'

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
  const viewportWidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth
  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight

  let svgInner = svg.innerHTML
  svgInner = svgInner
    .replace(/onclick=".*?"/g, '')
    .replace(/<a class="anchor".*?>.*?<\/a>/g, '')

  let svgContent = `<?xml version="${xmlVersion}"?>
  <svg version="${svgVersion}"
  baseProfile="${svgBaseProfile}"
  width="${viewportWidth}"
  height="${viewportHeight}"
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
      if (
        block &&
        block.properties &&
        block.properties.lsType === 'annotation' &&
        block.properties.hlType === 'area'
      ) {
        const page = await logseq.Editor.getPage(block.page.id)

        let config = await logseq.App.getUserConfigs()
        // reload config if graph change
        logseq.App.onCurrentGraphChanged(async () => {
          config = await logseq.App.getUserConfigs()
        })
        if (page.properties.filePath) {
          let filePath = page.properties.filePath
          if (filePath.indexOf('http') !== 0 && filePath.indexOf('..') === 0) {
            filePath =
              config.currentGraph.substring(13) +
              '/' +
              filePath.replace(/\.\.\//g, '')

            filePath =
              filePath.slice(0, -4) +
              `/${block.properties.hlPage}_${block.properties.id}_${block.properties.hlStamp}.png`
            let result
            if (
              logseq.settings?.enableRenderImage &&
              ['png', 'jpg', 'jpeg', 'webp'].includes(
                filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase()
              )
            ) {
              const maxSize = logseq.settings?.maxRenderImageSize
                ? logseq.settings.maxRenderImageSize
                : '100'
              const minSize = 20
              result = `<a target="_blank" title="PDF Annotation P${
                block.properties.hlPage
              }"  data-lightbox="gallery" href="${
                filePath.indexOf('http') !== 0 ? 'assets://' : ''
              }${filePath}"><img alt="PDF Annotation P${
                block.properties.hlPage
              }"  src="${
                filePath.indexOf('http') !== 0 ? 'assets://' : ''
              }${filePath}" style="max-width: ${maxSize}px; max-height: ${maxSize}px; min-height: ${minSize}px; min-width: ${minSize}px;"/></a>`
            } else {
              result = `<a target="_blank" title="PDF Annotation P${
                block.properties.hlPage
              }"  data-lightbox="gallery" href="${
                filePath.indexOf('http') !== 0 ? 'assets://' : ''
              }${filePath}">🖼 PDF Annotation P${block.properties.hlPage}</a>`
            }
            if (result) {
              return result
            }
          }
        }
      } else if (block && block.content) {
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
  toolbar.setItems(['zoomIn', 'zoomOut', 'fit'])
  toolbar.setBrand(false)

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

export const hookMarkmapTransformer = async (transformer: Transformer) => {
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
    page = await logseq.Editor.getPage((page as BlockEntity).page.id)
  }
  if (page) {
    await renderMarkmap(`/namespace/${page.originalName}`, true)
  }
}
export const pageButtonHandler = async () => {
  const { renderMarkmap } = useMarkmap()
  let page = await logseq.Editor.getCurrentPage()
  if (page && page.page) {
    page = await logseq.Editor.getPage((page as BlockEntity).page.id)
  }
  if (page) {
    await renderMarkmap(`/page/${page.originalName}`, true)
  }
}
export const referenceButtonHandler = async () => {
  const { renderMarkmap } = useMarkmap()
  let page = await logseq.Editor.getCurrentPage()
  if (page && page.page) {
    page = await logseq.Editor.getPage((page as BlockEntity).page.id)
  }
  if (page) {
    await renderMarkmap(`/reference/${page.originalName}`, true)
  }
}
