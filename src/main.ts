import '@logseq/libs';
import { Transformer } from 'markmap-lib';
import * as markmap from 'markmap-view';
import { Markmap } from 'markmap-view';

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
       x
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
    }
  });
}
logseq.ready(createModel(), main).catch(e => console.error);
