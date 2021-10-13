import '@logseq/libs';
import { Transformer } from 'markmap-lib';
import * as markmap from 'markmap-view';
import { Markmap } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';
import { INode } from 'markmap-common';
import html2canvas from 'html2canvas';
const transformer = new Transformer();
import * as d3 from 'd3';
import org from 'org';
import TurndownService from 'turndown';
import cheerio from 'cheerio';
import replaceAsync from 'string-replace-async';
import ellipsis from 'text-ellipsis';
import { append } from 'domutils';

function eventFire(el: any, etype: string){
  if (el.fireEvent) {
    el.fireEvent('on' + etype);
  } else {
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }
}

/**
 * User model
 */
function createModel() {
  return {
    openMindMap() {
      // @ts-ignore
      Alpine.store('showHelp').close();

      const closeButton = document.getElementById('close-button');
      const listener = () => {
        logseq.hideMainUI();
      };

      closeButton.removeEventListener('click', listener);
      closeButton.addEventListener('click', listener);

      logseq.showMainUI();
    },
  };
}

async function main() {
  // Set Model Style
  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 12,
  });

  // Register icon ui
  logseq.App.registerUIItem('pagebar', {
    key: 'logseq-mark-map',
    template: `
     <a data-on-click="openMindMap" title="Open mindmap mode">
      <svg t="1627350023942" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="670" width="18" height="18"><path d="M840.533333 490.666667l-17.066666-85.333334L554.666667 460.8V170.666667h-85.333334v262.4l-296.533333-192-46.933333 72.533333 324.266666 209.066667L200.533333 849.066667l68.266667 51.2 241.066667-315.733334 179.2 270.933334 72.533333-46.933334-179.2-266.666666z" fill="#CFD8DC" p-id="671"></path><path d="M512 512m-149.333333 0a149.333333 149.333333 0 1 0 298.666666 0 149.333333 149.333333 0 1 0-298.666666 0Z" fill="#C435F3" p-id="672" data-spm-anchor-id="a313x.7781069.0.i0" class=""></path><path d="M512 170.666667m-106.666667 0a106.666667 106.666667 0 1 0 213.333334 0 106.666667 106.666667 0 1 0-213.333334 0Z" fill="#F48233" p-id="673" data-spm-anchor-id="a313x.7781069.0.i4" class="selected"></path><path d="M832 448m-106.666667 0a106.666667 106.666667 0 1 0 213.333334 0 106.666667 106.666667 0 1 0-213.333334 0Z" fill="#F48233" p-id="674" data-spm-anchor-id="a313x.7781069.0.i5" class="selected"></path><path d="M149.333333 277.333333m-106.666666 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z" fill="#F48233" p-id="675" data-spm-anchor-id="a313x.7781069.0.i3" class="selected"></path><path d="M234.666667 874.666667m-106.666667 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z" fill="#F48233" p-id="676" data-spm-anchor-id="a313x.7781069.0.i7" class="selected"></path><path d="M725.333333 832m-106.666666 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z" fill="#F48233" p-id="677" data-spm-anchor-id="a313x.7781069.0.i6" class="selected"></path></svg>
     </a>
    `,
  });

  const themeWorkflowTag = str => {
    return str.replace(/^(TODO|DOING|DONE|LATER|NOW) /, (match, p1) => {
      switch (p1) {
        case 'TODO':
          return '<code style="background: #845EC2; color: #eee">' + p1 + '</code> ';
        case 'DOING':
          return '<code style="background: #FF8066; color: #eee">' + p1 + '</code> ';
        case 'DONE':
          return '<code style="background: #008B74; color: #eee">' + p1 + '</code> ';
        case 'NOW':
          return '<code style="background: #006C9A; color: #eee">' + p1 + '</code> ';
        case 'LATER':
          return '<code style="background: #911F27; color: #eee">' + p1 + '</code> ';
      }
    });
  };


  let mm: Markmap;
  let currentLevel: number;
  let totalLevel: number;
  let originalRoot: INode;
  let originalTotalLevel: number;

  logseq.on('ui:visible:changed', async ({ visible }) => {
    if (!visible) {
      return;
    }

    const config = await logseq.App.getUserConfigs();
    let blocks = await logseq.Editor.getCurrentPageBlocksTree();
    let page = await logseq.Editor.getCurrentPage() as any;
    const title = page?.properties?.markMapTitle || page?.originalName;
    const collapsed = page?.properties?.markMapCollapsed;

    // Build markdown
    currentLevel = -1; // reset level;

    const blockFilter = (it: any) => {
      const { children, uuid, title, content, properties } = it;
      if (properties?.markMapDisplay === 'hidden') {
        return false;
      }
      if (!content || content.startsWith('---\n')) {
        return false;
      }
      let contentFiltered = content
        .split('\n')
        .filter((line: string) => line.indexOf('::') === -1)
        .join('\n');
      const topic = contentFiltered
        .replace(/^[#\s]+/, '')
        .trim();

      if (topic.length === 0 && children.length === 0) {
        return false;
      } else {
        return true;
      }
    };

    const walkTransformBlocksFilter = async blocks => {
      if (blocks.length > 0) {
        for (let it of blocks) {
          let { children, uuid, title, content, properties } = it;
          children = await children;
          if (children) {
            it.children = await walkTransformBlocksFilter(children);
          }
        }
      }

      return blocks.filter(blockFilter);
    };

    let filteredBlocks = await walkTransformBlocksFilter(blocks);
    if (page?.properties?.markMapLimitAll && filteredBlocks.length > page?.properties?.markMapLimitAll) {
      const limitBlocks = filteredBlocks.splice(0, page?.properties?.markMapLimitAll);
      filteredBlocks = limitBlocks.concat({
        content: '...',
        properties: { collapsed: true },
        children: filteredBlocks
      });
    } else if (page?.properties?.markMapLimit && filteredBlocks.length > page?.properties?.markMapLimit) {
      const limitBlocks = filteredBlocks.splice(0, page?.properties?.markMapLimit);
      filteredBlocks = limitBlocks.concat({
        content: '...',
        properties: { collapsed: true },
        children: filteredBlocks
      });
    }

    const walkTransformBlocksLimit = (blocks:any, limit = 0) => {
      if (limit && blocks.length > limit) {
        const limitBlocks = blocks.splice(0, limit);
        blocks = limitBlocks.concat({
          content: '...',
          properties: { collapsed: true },
          children: blocks
        });
      }

      if (blocks.length > 0) {
        for (let it of blocks) {
          let { children, content, properties } = it;
          if (children) {
            it.children = walkTransformBlocksLimit(children, page?.properties?.markMapLimitAll || properties?.markMapLimit);
          }
        }
      }

      return blocks;


    };

    filteredBlocks = walkTransformBlocksLimit(filteredBlocks);


    // iterate blocks
    const walkTransformBlocks = async (blocks: any, depth = 0, config = {}): Promise<string[]> => {
      currentLevel = Math.min(5, Math.max(currentLevel, depth));
      totalLevel = Math.min(5, Math.max(currentLevel, depth));
      // blocks = blocks.filter(blockFilter);

      let newBlocks = [];
      for (let it of blocks) {
        const { children, uuid, title, content, properties } = it;

        let contentFiltered = content
          .split('\n')
          .filter((line: string) => line.indexOf('::') === -1)
          .join('\n');
        let topic = contentFiltered;

        // Process page tag
        let regexPageTag = /#([^#\s]+)/ig;
        if (regexPageTag.test(topic)) {
          topic = topic.replace(regexPageTag, (match, p1) => {
            return `<a style="cursor: pointer; font-size: 60%; vertical-align:middle;" target="_blank" onclick="logseq.App.pushState('page', { name: '${p1}' }); logseq.hideMainUI();">#${p1}</a>`;
          });
        }

        // Theme workflow tag
        topic = themeWorkflowTag(topic);

        // Process block reference
        let regexBlockRef = /\(\(([0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})\)\)/ig;
        let regexEmbedBlockRef = /\{\{embed\s+\(\(([0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})\)\)\}\}/ig;
        if (regexEmbedBlockRef.test(topic)) {
          topic = await replaceAsync(topic, regexEmbedBlockRef, async (match, p1) => {
            const block = await logseq.Editor.getBlock(p1);
            if (block) {
              return themeWorkflowTag(block.content);
            }
            return '[MISSING BLOCK]';
          });
        }

        if (regexBlockRef.test(topic)) {
          topic = await replaceAsync(topic, regexBlockRef, async (match, p1) => {
            const block = await logseq.Editor.getBlock(p1);
            if (block) {
              return themeWorkflowTag(block.content);
            }
            return '[MISSING BLOCK]';
          });
        }

        // Process page reference
        let regexPageRef = /\[\[([^\[\]]*?)\]\]/ig;
        let regexEmbedPageRef = /\{\{embed\s+\[\[([^\[\]]*?)\]\]\}\}/ig;
        if (regexEmbedPageRef.test(topic)) {
          topic = topic.replace(regexEmbedPageRef, (match, p1) => {
            return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${p1}' }); logseq.hideMainUI();">${p1}</a>`;
          });
        }

        if (regexPageRef.test(topic)) {
          topic = topic.replace(regexPageRef, (match, p1) => {
            return `<a style="cursor: pointer" target="_blank" onclick="logseq.App.pushState('page', { name: '${p1}' }); logseq.hideMainUI();">${p1}</a>`;
          });
        }



        // Process org mode
        // @ts-ignore
        if (config.preferredFormat === 'org') {
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
          });

          turndownService.addRule('strikethrough', {
            filter: ['del', 's', 'strike'],
            replacement: function (content) {
              return '~~' + content + '~~';
            }
          });

          const parser = new org.Parser();
          const orgDocument = parser.parse(topic);
          const orgHTMLDocument = orgDocument.convert(org.ConverterHTML, {
            headerOffset: 1,
            exportFromLineNumber: false,
            suppressSubScriptHandling: false,
            suppressAutoLink: false
          });
          topic = orgHTMLDocument.toString();  // to html
          topic = turndownService.turndown(topic); // to markdown
          topic = topic.replace(/\^\^/g, '=='); // try marked syntax
        }

        // Remove leading heading syntax
        topic = topic.replace(/^[#\s]+/, '').trim();

        // Process link parse
        const regexUrl = /(https?:\/\/[-a-zA-Z0-9@:%_\+.~#?&\/=]{2,256}\.[a-z]{2,4}(\/[-a-zA-Z0-9@:%_\+.~#?&\/=]*)?)(?=\s)/gi;
        const regexUrlMatchStartEnd = /^(https?:\/\/[-a-zA-Z0-9@:%_\+.~#?&\/=]{2,256}\.[a-z]{2,4}(\/[-a-zA-Z0-9@:%_\+.~#?&\/=]*)?)$/gi;

        topic = topic.replace(regexUrl, '<$1>'); // add <> to all links that followed by blank, means not markdown link
        topic = topic.replace(regexUrlMatchStartEnd, '<$1>'); // add <> to all pure link block

        if (properties?.markMapCut) {
          const orgTopic = topic;
          topic = ellipsis(topic, parseInt(properties?.markMapCut));
          topic = `<div style="cursor:pointer" title="${orgTopic}">${topic}</div>`;
        }

        // Optimize code block
        if (topic.indexOf('```') === 0 || topic.indexOf('- ') === 0) {
          topic = '\n' + topic;
        }

        // Add leading syntax according to depth.
        let ret = (depth < 5 ? '#'.repeat(depth + 2) + ' ' : '') + topic;

        if (children && (properties?.collapsed !== true || collapsed !== 'hidden')) {
          ret += '\n' + (await walkTransformBlocks(children, depth + 1, config)).join('\n');
        }

        newBlocks.push(ret);
      };

      return newBlocks;
    };

    const md = '# ' + title + '\n\n' + (await walkTransformBlocks(filteredBlocks, 0, config)).join('\n');

    const defaultLinkRender = transformer.md.renderer.rules.link_open;
    transformer.md.inline.ruler.enable([ 'mark' ]);
    transformer.md.renderer.rules.link_open = function (tokens, idx: number, ...args: []) {
      let result = defaultLinkRender(tokens, idx, ...args);

      if (tokens[idx] && tokens[idx].href) {
        result = result.replace('>', ' target="_blank">');
      }

      return result;
    };

    const defaultImageRender = transformer.md.renderer.rules.image;
    transformer.md.renderer.rules.image = function (tokens, idx: number, ...args: []) {
      let result = defaultImageRender(tokens, idx, ...args);
      const $ = cheerio.load(result);
      let src = $('img').attr('src') || $('a').attr('href');
      const alt = $('img').attr('alt') || $('a').attr('title') || '';

      // For now just support MacOS/Linux，Need to test and fix on Windows.
      if (src.indexOf('http') !== 0 && src.indexOf('..') === 0) {
        src = config.currentGraph.substring(13) + '/' + src.replace(/\.\.\//g, '');
      }

      result = `<a target="_blank" title="${alt}"  data-lightbox="gallery" href="${src}">${alt} 🖼　</a>`;

      return result;
    };


    let { root, features } = transformer.transform(md);

    // @ts-ignore
    root.properties = page.properties || {};

    const walkTransformRoot = (parent, blocks) => {
      if (parent.c) {

        for (let i in parent.c) {
          parent.c[i].properties = blocks[i]?.properties || {};

          // @ts-ignore
          if (root?.properties?.markMapCollapsed !== 'extend' && parent.c[i]?.properties?.collapsed) {
            parent.c[i].p = {
              ...parent.c[i].p,
              f: true,
            };
          }

          walkTransformRoot(parent?.c[i], blocks[i]?.children || []);
        }
      }
    };
    walkTransformRoot(root, filteredBlocks);

    originalRoot = root;
    originalTotalLevel = totalLevel;
    // @ts-ignore
    window.root = root;
    const { styles, scripts } = transformer.getUsedAssets(features);
    const { Markmap, loadCSS, loadJS } = markmap;
    if (styles) loadCSS(styles);
    if (scripts) await loadJS(scripts, {
      getMarkmap: () => markmap
    });

    // 隐藏所有子节点
    const hideAll = (target: INode) => {
      target.p = {
        ...target.p,
        f: true,
      };

      target.c?.forEach(t => {
        hideAll(t);
      });
    };

    // 显示所有子节点
    const showAll = (target: INode, depth = -1) => {
      depth++;
      // @ts-ignore
      if (page?.properties?.markMapCollapsed !== 'extend' && target?.properties?.collapsed) {
        target.p = {
          ...target.p,
          f: true,
        };
        currentLevel = depth;
      } else {
        target.p = {
          ...target.p,
          f: false,
        };
      }

      target.c?.forEach(t => {
        showAll(t, depth);
      });
    };

    // 逐级展开
    const expandStepByStep = (target: INode): boolean => {
      let find = false;
      if (target.p?.f && target.c) {
        target.p.f = false;
        find = true;
      }
      if (!find && target.c) {
          for (let t of target.c) {
            find = expandStepByStep(t);
            if (find) {
              return find;
            }
          }

      }

      return find;
    };

    const collapseStepByStep = (target: INode): boolean => {
      let find = false;

      if (target.c) {
        const length = target.c.length;
        for (let i = length - 1; i >= 0; i--) {
          const t = target.c[i];
          find = collapseStepByStep(t);
          if (find) {
            return find;
          }
        }
      }

      if (!target.p?.f && target.c) {
        target.p.f = true;
        find = true;
      }
      return find;
    };

    const expandLevel = (target: INode, level = 1) => {
      if (level <= 0) {
        hideAll(target);
        return;
      }
      level--;

      target.p = {
        ...target.p,
        f: false,
      };

      target.c?.forEach(t => {
        expandLevel(t, level);
      });
    };

    let stack: INode[] = [];
    let pointerStack: number[] = [];
    let pointer: number;

    const focusIn = (root: INode) => {
      if (root.c) {
        pointerStack.push(pointer);
        pointer = 0;
        stack.push(root);
        root = root.c[pointer];
        // @ts-ignore
        window.root = root;
        showAll(root);
        mm.setData(root);
        totalLevel--;
        currentLevel = totalLevel;
      }
    };

    const focusOut = () => {
      if (stack.length > 0) {
        root = stack.pop() as INode;
        pointer = pointerStack.pop() as number;

        // @ts-ignore
        window.root = root;
        showAll(root);
        mm.setData(root);

        totalLevel++;
        currentLevel = totalLevel;
      }
    };

    const focusNext = () => {
      const top = stack[stack.length - 1];
      if (top && top.c && pointer + 1 <= top.c.length - 1) {
        root = top.c[++pointer];
        // @ts-ignore
        window.root = root;
        mm.setData(root);
      }

    };

    const focusPrevious = () => {
      const top = stack[stack.length - 1];
      if (top && top.c && pointer - 1 >= 0) {
        root = top.c[--pointer];
        // @ts-ignore
        window.root = root;
        mm.setData(root);
      }
    };

    const focusReset = () => {
      root = originalRoot;
      // @ts-ignore
      window.root = root;
      stack = [];
      showAll(root);
      mm.setData(root);
      totalLevel = originalTotalLevel;
      currentLevel = totalLevel;
    };

    let svgNode;

    const hotkeys = (window as any)?.hotkeys;
    const bindKeys = async function() {
      if (hotkeys) {
        hotkeys('.', function() {
          // @ts-ignore
          const root = window.root;
          focusIn(root);
          return false;
        });
        hotkeys(',', function() {
          focusReset();
          return false;
        });
        hotkeys('up,down,left,right,esc,space,z,r,h,j,k,l,n,p,b,q,-,=,0,9,1,2,3,4,5,/', async function (event, handler) {
          // @ts-ignore
          const showHelp = Alpine.store('showHelp').get();

          if (showHelp && !['/', 'q', 'esc'].includes(handler.key)) {
            return;
          }

          // @ts-ignore
          const jQuery = window?.jQuery;
          if (jQuery) {
            if (jQuery('#lightboxOverlay').css('display') === 'block'  && !['q', 'esc'].includes(handler.key)) {
              return false;
            }
          }

          // @ts-ignore
          const root = window.root;
          switch (handler.key) {
            case 'p': // p
              focusPrevious();
              break;
            case 'n': // n
              focusNext();
              break;
            case 'b': // b
              focusOut();
              break;
            case '.': // .
              focusReset();
              break;
            case ',': // ,
              focusIn(root);
              break;
            case 'esc': // ESC
            case 'q': // q

              // @ts-ignore
              const jQuery = window?.jQuery;
              // @ts-ignore
              const lightbox = window?.lightbox;

              if (jQuery) {
                if (jQuery('#lightboxOverlay').css('display') === 'block') {
                  lightbox.end();
                }
              }
              logseq.hideMainUI();
              break;
            case 'space': // space
              await mm?.fit();
              break;
            case '0': // 0
              currentLevel = 0;
              hideAll(root);
              mm.setData(root);

              break;
            case '9': // 9
              currentLevel = totalLevel;
              showAll(root);
              mm.setData(root);

              break;
            case '1': // 1
              hideAll(root);
              expandLevel(root, 1);
              currentLevel = 1;
              mm.setData(root);

              break;
            case '2': // 2
              hideAll(root);
              expandLevel(root, 2);
              currentLevel = 2;
              mm.setData(root);

              break;
            case '3': // 3
              hideAll(root);
              expandLevel(root, 3);
              currentLevel = 3;
              mm.setData(root);

              break;
            case '4': // 4
              hideAll(root);
              expandLevel(root, 4);
              currentLevel = 4;
              mm.setData(root);

              break;
            case '5': // 5
              hideAll(root);
              expandLevel(root, 5);
              currentLevel = 5;
              mm.setData(root);

              break;
            case 'h': // h
              hideAll(root);
              expandLevel(root, currentLevel > 0 ? --currentLevel : 0);
              mm.setData(root);
              break;
            case 'l': // l
              hideAll(root);
              expandLevel(root, currentLevel < totalLevel ? ++currentLevel : totalLevel);
              mm.setData(root);
              break;

            case 'j': // j
              expandStepByStep(root);
              mm.setData(root);
              break;
            case 'k': // k
              collapseStepByStep(root);
              mm.setData(root);
              break;

            case '=': // +
              await mm.rescale(1.25);
              break;
            case '-': // -
              await mm.rescale(0.8);
              break;
            case 'z':
              const elResetButton = document.getElementById('reset-button');
              eventFire(elResetButton, 'click');
            break;
            case 'r':
              const elRandomButton = document.getElementById('random-button');
              eventFire(elRandomButton, 'click');
            break;
            case 'up':
              svgNode = mm.svg.node();
              if (svgNode) {
                // @ts-ignore
                const transform = d3.zoomTransform(mm.svg.node());
                // @ts-ignore
                transform.y = transform.y - 100;
                // @ts-ignore
                mm.transition(mm.g).attr('transform', `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`);
              }
            break;
            case 'down':
              svgNode = mm.svg.node();
              if (svgNode) {
                // @ts-ignore
                const transform = d3.zoomTransform(mm.svg.node());
                // @ts-ignore
                transform.y = transform.y + 100;
                // @ts-ignore
                mm.transition(mm.g).attr('transform', `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`);
              }
            break;

            case 'left':
              svgNode = mm.svg.node();
              if (svgNode) {
                // @ts-ignore
                const transform = d3.zoomTransform(mm.svg.node());
                // @ts-ignore
                transform.x = transform.x - 100;
                // @ts-ignore
                mm.transition(mm.g).attr('transform', `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`);
              }
            break;
            case 'right':
              svgNode = mm.svg.node();
              if (svgNode) {
                // @ts-ignore
                const transform = d3.zoomTransform(mm.svg.node());
                // @ts-ignore
                transform.x = transform.x + 100;
                // @ts-ignore
                mm.transition(mm.g).attr('transform', `translate(${transform.x}, ${transform.y} ) scale(${transform.k})`);
              }
            break;

            case '/':
              // @ts-ignore
              Alpine.store('showHelp').toggle();
            break;
            default:
              // console.log(handler.key);
            break;
          }
          return false;
        });
      }
    };


    if (mm) {
      // reuse instance, update data
      showAll(root);
      mm.setData(root);
    } else {
      // initialize instance
      showAll(root);
      mm = Markmap.create(
        '#markmap',
        {
          autoFit: true,
        },
        root
      );

      // Only bind once
      bindKeys();

      // Customize toolbar
      const toolbar = new Toolbar();
      toolbar.setItems(['zoomIn', 'zoomOut', 'fit', 'save', 'help']);
      toolbar.setBrand(false);
      toolbar.register({
        id: 'save',
        title: 'Save as png',
        content:
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>',
        onClick: async () => {
          let el = document.getElementById('markmap-container');
          const page = await logseq.Editor.getCurrentPage();
          if (el) {
            html2canvas(el).then(function (canvas) {
              const title = page?.originalName;
              let url = canvas.toDataURL('image/png');
              var oA = document.createElement('a');
              oA.download = title || '';
              oA.href = url;
              document.body.appendChild(oA);
              oA.click();
              oA.remove();
            });
          }
        },
      });
      toolbar.register({
        id: 'help',
        title: 'Show shortcuts description',
        content: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /> </svg>',
        onClick: async () => {
          // @ts-ignore
          Alpine.store('showHelp').toggle();
        }
      });
      toolbar.attach(mm);
      const el = toolbar.render();
      el.style.position = 'absolute';
      el.style.bottom = '0.5rem';
      el.style.right = '0.5rem';
      document.getElementById('markmap-toolbar')?.append(el);
    };
  });
}
logseq.ready(createModel(), main).catch(e => console.error);
