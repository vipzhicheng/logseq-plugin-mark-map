import '@logseq/libs';
import { Transformer } from 'markmap-lib';
import * as markmap from 'markmap-view';
import { Markmap } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';

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

  // Esc close model
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.keyCode === 27) {
        logseq.hideMainUI();
      }
    },
    false
  );

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

    const { root, features } = transformer.transform(md);
    const { styles, scripts } = transformer.getUsedAssets(features);

    const { Markmap, loadCSS, loadJS } = markmap;

    if (styles) loadCSS(styles);
    if (scripts) loadJS(scripts, { getMarkmap: () => markmap });

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
      toolbar.setItems(['zoomIn', 'zoomOut', 'fit']);
      toolbar.setBrand(false);
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
