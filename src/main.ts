import '@logseq/libs';
import { Transformer } from 'markmap-lib';

// load with <script>
import * as markmap from 'markmap-view';

const transformer = new Transformer();

/**
 * User model
 */
function createModel() {
  return {
    openMindMap() {
      // logseq.App.showMsg('hello, mind map')
      logseq.showMainUI();
    },
  };
}

async function main() {
  // logseq.provideStyle(`
  //   @import url("https://at.alicdn.com/t/font_2409735_lkeod9mm2ej.css");
  // `);

  // Set Model Style
  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 12,
  });

  // Register icon
  logseq.App.registerUIItem('pagebar', {
    key: 'logseq-mark-map',
    template: `
     <a data-on-click="openMindMap" title="open mind map 2">
       <i class="iconfont icon-icons-mind_map" style="font-size: 18px; line-height: 1em;"></i>
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


  document.addEventListener(
    'load',
    function () {
      console.log('load');
    },
    false
  );

  const el = document.getElementById('markmap');
  console.log(`${window.innerHeight}`, `${window.innerWidth}`);
  // el?.setAttribute('width',  `${window.innerHeight}`);
  // el?.setAttribute('height', `${window.innerWidth}`);
  logseq.on('ui:visible:changed', async ({ visible }) => {
    console.log('ui:visible:changed', visible);
    console.log(`${window.innerHeight}`, `${window.innerWidth}`);
  });

  setTimeout(() => {
    console.log(`${window.innerHeight}`, `${window.innerWidth}`);
  }, 1000);

  // 1. transform markdown
  const { root, features } = transformer.transform(`
# aaa

## bbb

### dddd

### eeee

## ccc

`);

  const { styles, scripts } = transformer.getUsedAssets(features);

  const { Markmap, loadCSS, loadJS } = markmap;

  // 1. load assets
  if (styles) loadCSS(styles);
  if (scripts) loadJS(scripts, { getMarkmap: () => markmap });

  // 2. create markmap
  // `options` is optional, i.e. `undefined` can be passed her
    const mm = Markmap.create(
      '#markmap',
      {
        autoFit: true,
      },
      root
    );
    await mm.fit();
}
logseq.ready(createModel(), main).catch(e => console.error);
