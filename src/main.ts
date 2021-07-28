import '@logseq/libs';
import { Transformer } from 'markmap-lib';
import * as markmap from 'markmap-view';
import { Markmap } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';
import { INode } from 'markmap-common';
import html2canvas from 'html2canvas';
const transformer = new Transformer();

/**
 * User model
 */
function createModel() {
  return {
    openMindMap() {
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
  const walkTransformBlocks = (blocks: any, depth = 0) => {
    return blocks.map((it: any) => {
      const { children, uuid, title, content } = it;

      let contentFiltered = content
        .split('\n')
        .filter((line: string) => line.indexOf('::') === -1)
        .join('\n');
      const topic = contentFiltered
        .replace(/^[#\s]+/, '')
        .replace(/#[\s\S]+/, '')
        .trim();

      let ret = (depth < 5 ? '#'.repeat(depth + 2) + ' ' : '') + topic;

      if (children) {
        ret += '\n' + walkTransformBlocks(children, depth + 1).join('\n');
      }

      return ret;
    });
  };

  let mm: Markmap;

  logseq.on('ui:visible:changed', async ({ visible }) => {
    if (!visible) {
      return;
    }

    const blocks = await logseq.Editor.getCurrentPageBlocksTree();
    const page = await logseq.Editor.getCurrentPage();
    const title = page?.originalName;

    // Build markdown
    const md = '# ' + title + '\n\n' + walkTransformBlocks(blocks).join('\n');

    let { root, features } = transformer.transform(md);
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

    // 展开指定级别
    const expandLevel = (target: INode, level = 1) => {
      if (level <= 0) {
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

    // Shortcuts
    document.addEventListener(
      'keydown',
      async function (e) {
        if (e.keyCode === 27) { // Esc
          logseq.hideMainUI();
        }

        if (e.keyCode === 32) { // Space
          await mm?.fit();
        }

        if (e.keyCode === 48) { // press 0
          hideAll(root);
          mm.setData(root);
        }

        if (e.keyCode === 57) { // press 9
          showAll(root);
          mm.setData(root);
        }

        if (e.keyCode === 49) { // press 1
          hideAll(root);
          expandLevel(root, 1);
          mm.setData(root);
        }

        if (e.keyCode === 50) { // press 2
          hideAll(root);
          expandLevel(root, 2);
          mm.setData(root);
        }

        if (e.keyCode === 51) { // press 3
          hideAll(root);
          expandLevel(root, 3);
          mm.setData(root);
        }
      },
      false
    );

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

      // Customize toolbar
      const toolbar = new Toolbar();
      toolbar.setItems(['zoomIn', 'zoomOut', 'fit', 'save']);
      toolbar.setBrand(false);
      toolbar.register({
        id: 'save',
        title: 'Save as png',
        content: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>',
        onClick: async () => {
          await mm.fit();
          let el = document.getElementById('markmap-container');
          if (el) {
            html2canvas(el).then(function(canvas) {
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
      toolbar.attach(mm);
      const el = toolbar.render();
      el.style.position = 'absolute';
      el.style.bottom = '0.5rem';
      el.style.right = '0.5rem';
      document.getElementById('markmap-container')?.append(el);
    }
  });
}
logseq.ready(createModel(), main).catch(e => console.error);
