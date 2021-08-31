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

/**
 * User model
 */
function createModel() {
  return {
    openMindMap() {
      // @ts-ignore
      Alpine.store('showHelp').close();
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
     <a data-on-click="openMindMap" title="open mind map 2">
      <svg t="1627350023942" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="670" width="18" height="18"><path d="M840.533333 490.666667l-17.066666-85.333334L554.666667 460.8V170.666667h-85.333334v262.4l-296.533333-192-46.933333 72.533333 324.266666 209.066667L200.533333 849.066667l68.266667 51.2 241.066667-315.733334 179.2 270.933334 72.533333-46.933334-179.2-266.666666z" fill="#CFD8DC" p-id="671"></path><path d="M512 512m-149.333333 0a149.333333 149.333333 0 1 0 298.666666 0 149.333333 149.333333 0 1 0-298.666666 0Z" fill="#C435F3" p-id="672" data-spm-anchor-id="a313x.7781069.0.i0" class=""></path><path d="M512 170.666667m-106.666667 0a106.666667 106.666667 0 1 0 213.333334 0 106.666667 106.666667 0 1 0-213.333334 0Z" fill="#F48233" p-id="673" data-spm-anchor-id="a313x.7781069.0.i4" class="selected"></path><path d="M832 448m-106.666667 0a106.666667 106.666667 0 1 0 213.333334 0 106.666667 106.666667 0 1 0-213.333334 0Z" fill="#F48233" p-id="674" data-spm-anchor-id="a313x.7781069.0.i5" class="selected"></path><path d="M149.333333 277.333333m-106.666666 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z" fill="#F48233" p-id="675" data-spm-anchor-id="a313x.7781069.0.i3" class="selected"></path><path d="M234.666667 874.666667m-106.666667 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z" fill="#F48233" p-id="676" data-spm-anchor-id="a313x.7781069.0.i7" class="selected"></path><path d="M725.333333 832m-106.666666 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z" fill="#F48233" p-id="677" data-spm-anchor-id="a313x.7781069.0.i6" class="selected"></path></svg>
     </a>
    `,
  });

  // iterate blocks
  const walkTransformBlocks = (blocks: any, depth = 0, config = {}) => {
    currentLevel = Math.min(5, Math.max(currentLevel, depth));
    totalLevel = Math.min(5, Math.max(currentLevel, depth));
    return blocks.filter((it: any) => {
      const { children, uuid, title, content } = it;
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
    }).map((it: any) => {
      const { children, uuid, title, content } = it;

      let contentFiltered = content
        .split('\n')
        .filter((line: string) => line.indexOf('::') === -1)
        .join('\n');
      let topic = contentFiltered;

      // @ts-ignore
      if (config.preferredFormat === 'org') {
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
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
      }

      topic = topic.replace(/^[#\s]+/, '').trim();

      let ret = (depth < 5 ? '#'.repeat(depth + 2) + ' ' : '') + topic;

      if (children) {
        ret += '\n' + walkTransformBlocks(children, depth + 1, config).join('\n');
      }

      return ret;
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

    const blocks = await logseq.Editor.getCurrentPageBlocksTree();
    const page = await logseq.Editor.getCurrentPage();
    const title = page?.originalName;

    // Build markdown
    currentLevel = -1; // reset level;
    const md = '# ' + title + '\n\n' + walkTransformBlocks(blocks, 0, config).join('\n');

    let { root, features } = transformer.transform(md);
    originalRoot = root;
    originalTotalLevel = totalLevel;
    // @ts-ignore
    window.root = root;
    const { styles, scripts } = transformer.getUsedAssets(features);
    const { Markmap, loadCSS, loadJS } = markmap;

    if (styles) loadCSS(styles);
    if (scripts) loadJS(scripts, { getMarkmap: () => markmap });

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
    const showAll = (target: INode) => {
      target.p = {
        ...target.p,
        f: false,
      };

      target.c?.forEach(t => {
        showAll(t);
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

    function eventFire(el: any, etype: string){
      if (el.fireEvent) {
        el.fireEvent('on' + etype);
      } else {
        var evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
      }
    }
    let svgNode;
    const listener = async function(e: any) {

      // @ts-ignore
      const showHelp = Alpine.store('showHelp').get();

      if (showHelp && ![191, 81, 27].includes(e.keyCode)) {
        return;
      }

      // @ts-ignore
      const root = window.root;
      switch (e.keyCode) {
        case 37: // LEFT
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
        case 39: // RIGHT
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
        case 38: // UP
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
        case 40: // DOWN
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
        case 191: // /
          // @ts-ignore
          Alpine.store('showHelp').toggle();
          break;
        case 82: // r
          const elRandomButton = document.getElementById('random-button');
          eventFire(elRandomButton, 'click');
          break;
        case 90: // z
          const elResetButton = document.getElementById('reset-button');
          eventFire(elResetButton, 'click');
          break;
        case 80: // p
          focusPrevious();
          break;
        case 78: // n
          focusNext();
          break;
        case 66: // b
          focusOut();
          break;
        case 188: // .
          focusReset();
          break;
        case 190: // ,
          focusIn(root);
          break;
        case 27: // ESC
        case 81: // q
          logseq.hideMainUI();
          break;
        case 32: // space
          await mm?.fit();
          break;
        case 48: // 0
          hideAll(root);
          currentLevel = 0;
          mm.setData(root);

          break;
        case 57: // 9
          showAll(root);
          currentLevel = totalLevel;
          mm.setData(root);

          break;
        case 49: // 1
          hideAll(root);
          expandLevel(root, 1);
          currentLevel = 1;
          mm.setData(root);

          break;
        case 50: // 2
          hideAll(root);
          expandLevel(root, 2);
          currentLevel = 2;
          mm.setData(root);

          break;
        case 51: // 3
          hideAll(root);
          expandLevel(root, 3);
          currentLevel = 3;
          mm.setData(root);

          break;
        case 52: // 4
          hideAll(root);
          expandLevel(root, 4);
          currentLevel = 4;
          mm.setData(root);

          break;
        case 53: // 5
          hideAll(root);
          expandLevel(root, 5);
          currentLevel = 5;
          mm.setData(root);

          break;
        case 72: // h
          hideAll(root);
          expandLevel(root, currentLevel > 0 ? --currentLevel : 0);
          mm.setData(root);
          break;
        case 76: // l
          hideAll(root);
          expandLevel(root, currentLevel < totalLevel ? ++currentLevel : totalLevel);
          mm.setData(root);
          break;

        case 74: // j
          expandStepByStep(root);
          mm.setData(root);
          break;
        case 75: // k
          collapseStepByStep(root);
          mm.setData(root);
          break;

        case 187: // +
          await mm.rescale(1.25);
          break;
        case 189: // -
          await mm.rescale(0.8);
          break;
      }
    };

    if (mm) {
      // reuse instance, update data
      mm.setData(root);
    } else {
      // initialize instance
      mm = Markmap.create(
        '#markmap',
        {
          autoFit: true,
        },
        root
      );

      document.addEventListener( 'keydown', listener, false);

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
    }
  });
}
logseq.ready(createModel(), main).catch(e => console.error);
