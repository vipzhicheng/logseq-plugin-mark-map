<script lang="ts" setup>
import { usePen } from '@/stores/pen'
import { useMarkmap } from '@/stores/markmap'
const penStore = usePen()
const markmapStore = useMarkmap()
</script>
<template>
  <div
    id="pen-mode-layer"
    class="fixed top-0 left-0 w-screen h-screen flex flex-col select-none"
    :class="{
      'opacity-0 hidden': !penStore.visible,
      'text-gray-50': markmapStore.bg.indexOf('900') > -1,
      'text-gray-900': !(markmapStore.bg.indexOf('900') > -1),
    }"
  >
    <div
      id="toolbar"
      class="absolute bottom-0 flex justify-center bg-gray-900/20 w-full z-50"
    >
      <div class="px-6 p-2 flex justify-wrap flex-wrap gap-0.5">
        <button class="pen-button" id="undo" aria-label="Undo" title="Undo">
          ↩️
        </button>
        <button class="pen-button" id="redo" aria-label="Redo" title="Redo">
          ↪️
        </button>
        <button class="pen-button" id="clear" aria-label="Clear" title="Clear">
          🗑
        </button>
        <div class="mt-1 mx-2 opacity-25">/</div>
        <button
          class="pen-button"
          id="m-arrow"
          aria-label="Arrow"
          title="Arrow"
        >
          ↗
        </button>
        <button
          class="pen-button active"
          id="m-stylus"
          aria-label="Stylus"
          title="Stylus"
        >
          ✍️
        </button>
        <button class="pen-button" id="m-draw" aria-label="Draw" title="Draw">
          ✏️
        </button>
        <button class="pen-button" id="m-line" aria-label="Line" title="Line">
          ⁄
        </button>

        <button
          class="pen-button"
          id="m-rectangle"
          aria-label="Rect"
          title="Rect"
        >
          ⃞
        </button>
        <button
          class="pen-button"
          id="m-ellipse"
          aria-label="Ellipse"
          title="Ellipse"
        >
          ⃝
        </button>
        <button
          class="pen-button"
          id="m-eraseLine"
          aria-label="Eraser"
          title="Eraser"
        >
          🧹
        </button>
        <div class="mt-1 mx-2 opacity-25">/</div>
        <button class="pen-button" data-color="#000000" id="pen-color-black">
          ​⚫️​
        </button>
        <button
          class="pen-button"
          data-color="#ed153d"
          id="pen-color-red"
          aria-label="Red"
          title="Red"
        >
          ​🔴​
        </button>
        <button
          class="pen-button"
          data-color="#ed9a26"
          id="pen-color-orange"
          aria-label="Orange"
          title="Orange"
        >
          ​🟠​​
        </button>
        <button
          class="pen-button active"
          data-color="#ede215"
          id="pen-color-yellow"
          aria-label="Yellow"
          title="Yellow"
        >
          ​​🟡​​
        </button>
        <button
          class="pen-button"
          data-color="#30bd20"
          id="pen-color-green"
          aria-label="Green"
          title="Green"
        >
          ​🟢​​
        </button>
        <button
          class="pen-button"
          data-color="#2656bf"
          id="pen-color-blue"
          aria-label="Blue"
          title="Blue"
        >
          ​​🔵​​
        </button>
        <button
          class="pen-button"
          data-color="#c24aed"
          id="pen-color-purple"
          aria-label="Purple"
          title="Purple"
        >
          ​🟣​​
        </button>
        <button
          class="pen-button"
          data-color="#bf6b26"
          id="pen-color-brown"
          aria-label="Brown"
          title="Brown"
        >
          ​​🟤​
        </button>
        <div class="mt-1 mx-2 opacity-25">/</div>
        <button
          class="pen-button"
          id="bg-white"
          aria-label="Toggle White Background"
          title="Toggle White Background"
        >
          ⬜
        </button>
        <button
          class="pen-button"
          id="bg-black"
          aria-label="Toggle Black Background"
          title="Toggle Black Background"
        >
          ⬛️
        </button>
        <div class="mt-1 mx-2 opacity-25">/</div>
        <input
          id="size"
          type="range"
          min="1"
          max="10"
          value="1"
          step="0.5"
          name="Size"
          title="Size"
        />
        <div class="mt-1 mx-2 opacity-25">/</div>
        <button
          class="pen-button active"
          id="l-solid"
          aria-label="Solid"
          title="Solid"
        >
          —
        </button>
        <button
          class="pen-button"
          id="l-dashed"
          aria-label="Dashed"
          title="Dashed"
        >
          ┅
        </button>
        <button
          class="pen-button"
          id="l-dotted"
          aria-label="Dotted"
          title="Dotted"
        >
          ⋯
        </button>
        <div class="mt-1 mx-2 opacity-25">/</div>
        <button class="pen-button" id="close" title="Close">❌</button>
      </div>
    </div>

    <svg
      id="svg"
      class="w-full flex-auto z-10"
      style="touch-action: none"
    ></svg>
  </div>
</template>

<style>
#pen-mode-layer {
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
  cursor: url('data:image/svg+xml,%3Csvg%20t%3D%271664251073231%27%20class%3D%27icon%27%20viewBox%3D%270%200%201024%201024%27%20version%3D%271.1%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20p-id%3D%279380%27%20width%3D%2716%27%20height%3D%2716%27%3E%3Cpath%20d%3D%27M508.202667%20270.08l245.76%20245.76-337.066667%20337.493333a107.562667%20107.562667%200%200%201-57.6%2029.866667l-202.24%2033.706667a41.386667%2041.386667%200%200%201-7.253333%200.426666%2043.392%2043.392%200%200%201-30.293334-12.8%2043.861333%2043.861333%200%200%201-12.373333-37.546666l33.706667-202.24A107.562667%20107.562667%200%200%201%20170.666667%20607.146667zM866.133333%20157.866667a173.056%20173.056%200%200%200-245.76%200l-51.626666%2051.626666%20245.76%20245.76%2051.626666-51.626666a173.056%20173.056%200%200%200%200-245.76z%27%20fill%3D%27%2341416E%27%20p-id%3D%279381%27%3E%3C%2Fpath%3E%3C%2Fsvg%3E')
      0 12,
    pointer;
}

#toolbar {
  cursor: pointer;
}

.text-gray-50 #toolbar .active {
}
</style>
