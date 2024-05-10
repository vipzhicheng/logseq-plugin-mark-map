import '@logseq/libs'
import type { DrawingMode } from 'drauu'
import { createDrauu } from 'drauu'
import { defineStore } from 'pinia'

export const usePen = defineStore('pen', {
  state: () => ({
    inited: false,
    visible: false,
    drauu: null,
    lines: [],
    modes: [],
    colors: [],
    bgColors: [],
  }),

  actions: {
    toggle() {
      this.visible = !this.visible
    },
    close() {
      this.visible = false
    },
    init() {
      if (this.inited) return
      this.inited = true
      this.drauu = createDrauu({
        el: '#svg',
        brush: {
          color: '#ede215',
          size: 5,
        },
      })

      const sizeEl = document.getElementById('size')! as HTMLInputElement
      sizeEl.addEventListener(
        'input',
        () => (this.drauu.brush.size = +sizeEl.value)
      )

      document
        .getElementById('undo')
        ?.addEventListener('click', () => this.drauu.undo())
      document
        .getElementById('redo')
        ?.addEventListener('click', () => this.drauu.redo())
      document
        .getElementById('clear')
        ?.addEventListener('click', () => this.drauu.clear())

      document.getElementById('close')?.addEventListener('click', () => {
        this.visible = false
      })

      // document.getElementById('transparent')?.addEventListener('click', () => {
      //   const app = document.getElementById('pen-mode-layer')
      //   if (app?.classList.contains('background-white')) {
      //     app.classList.remove('background-white')
      //     document.getElementById('transparent')?.classList.remove('active')
      //   } else {
      //     app?.classList.add('background-white')
      //     document.getElementById('transparent')?.classList.add('active')
      //   }
      // })

      this.modes = [
        {
          el: document.getElementById('m-stylus')!,
          brush: { mode: 'stylus', arrowEnd: false },
        },
        {
          el: document.getElementById('m-eraseLine')!,
          brush: { mode: 'eraseLine', arrowEnd: false },
        },
        {
          el: document.getElementById('m-draw')!,
          brush: { mode: 'draw', arrowEnd: false },
        },
        {
          el: document.getElementById('m-line')!,
          brush: { mode: 'line', arrowEnd: false },
        },
        {
          el: document.getElementById('m-arrow')!,
          brush: { mode: 'line', arrowEnd: true },
        },
        {
          el: document.getElementById('m-rectangle')!,
          brush: { mode: 'rectangle', arrowEnd: false },
        },
        {
          el: document.getElementById('m-ellipse')!,
          brush: { mode: 'ellipse', arrowEnd: false },
        },
      ]
      this.modes.forEach(({ el, brush }) => {
        el.addEventListener('click', () => {
          this.modes.forEach(({ el }) => el.classList.remove('active'))
          el.classList.add('active')
          this.drauu.brush.arrowEnd = brush.arrowEnd
          this.drauu.mode = brush.mode as DrawingMode
        })
      })

      this.lines = [
        { el: document.getElementById('l-solid')!, value: undefined },
        { el: document.getElementById('l-dashed')!, value: '4' },
        { el: document.getElementById('l-dotted')!, value: '1 7' },
      ]

      this.lines.forEach(({ el, value }) => {
        el.addEventListener('click', () => {
          this.lines.forEach(({ el }) => el.classList.remove('active'))
          el.classList.add('active')
          this.drauu.brush.dasharray = value
        })
      })

      this.colors = Array.from(document.querySelectorAll('[data-color]'))
      this.colors.forEach((i) => {
        i.addEventListener('click', () => {
          this.colors.forEach((i) => i.classList.remove('active'))
          i.classList.add('active')
          this.drauu.brush.color = (i as HTMLElement).dataset.color!
        })
      })

      this.bgColors = [
        {
          el: document.getElementById('bg-black')!,
          bgClass: 'background-black',
        },
        {
          el: document.getElementById('bg-white')!,
          bgClass: 'background-white',
        },
      ]
      this.bgColors.forEach(({ el, bgClass }) => {
        el.addEventListener('click', () => {
          const penLayerEl = document.getElementById('pen-mode-layer')

          if (penLayerEl?.classList.contains(bgClass)) {
            penLayerEl.classList.remove(bgClass)
            el.classList.remove('active')
          } else {
            this.bgColors.forEach(({ el }) => el.classList.remove('active'))
            penLayerEl.classList.remove('background-white')
            penLayerEl.classList.remove('background-black')
            el.classList.add('active')
            penLayerEl.classList.add(bgClass)
          }
        })
      })
    },
    // async bindKeys() {
    //   if (hotkeys) {
    //     hotkeys('.', function () {

    //     })
    //   }
    // }
  },
})
