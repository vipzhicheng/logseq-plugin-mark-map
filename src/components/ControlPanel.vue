<script setup lang="ts">
import { Button } from '@/components/ui/button'
import ListIcon from '@/components/icons/ListIcon.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getSVGContent, pageButtonHandler } from '@/funcs'

import '@logseq/libs'
import { namespaceButtonHandler } from '@/funcs'
import { referenceButtonHandler } from '@/funcs'
import { useHelp } from '@/stores/help'
import { usePen } from '@/stores/pen'
import { useMarkmap } from '@/stores/markmap'
import html2canvas from 'html2canvas'

const handlePrevPage = async () => {
  await logseq.App.invokeExternalCommand('logseq.go/backward')
}

const handleNextPage = async () => {
  await logseq.App.invokeExternalCommand('logseq.go/forward')
}

const handleQuit = () => {
  logseq.hideMainUI({
    restoreEditingCursor: true,
  })
}

const handleSettings = () => {
  logseq.hideMainUI({
    restoreEditingCursor: true,
  })
  logseq.showSettingsUI()
}
const handleHelp = () => {
  const helpStore = useHelp()
  helpStore.toggleHelp()
}

const handlePen = () => {
  const penStore = usePen()
  penStore.toggle()
}

const handleSavePNG = async () => {
  const { mm } = useMarkmap()
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
}

const handleSaveSVG = async () => {
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
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        class="z-10 absolute left-0 bottom-0"
        variant="transparent"
        size="transparent"
      >
        <ListIcon />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-56 ml-4">
      <DropdownMenuLabel class="text-xl flex justify-between"
        >Control Panel
        <div class="rounded-md bg-[#f2f2f7] px-2 py-1 cursor-pointer">
          <h2 class="text-sm font-bold">Free</h2>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handlePrevPage"
          >Prev Page</span
        >
        <DropdownMenuShortcut>
          <span class="inline-block font-bold bg-gray-200 text-center px-1"
            >mod</span
          >
          +
          <span class="inline-block font-bold bg-gray-200 text-center px-1"
            >[</span
          ></DropdownMenuShortcut
        >
      </DropdownMenuItem>
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handleNextPage"
          >Next Page</span
        >
        <DropdownMenuShortcut
          ><span class="inline-block font-bold bg-gray-200 text-center px-1"
            >mod</span
          >
          +
          <span class="inline-block font-bold bg-gray-200 text-center px-1"
            >]</span
          ></DropdownMenuShortcut
        >
      </DropdownMenuItem>
      <DropdownMenuSeparator />

      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="pageButtonHandler"
          >Page View</span
        >
        <DropdownMenuShortcut
          ><span class="inline-block font-bold bg-gray-200 text-center px-1"
            >!</span
          ></DropdownMenuShortcut
        >
      </DropdownMenuItem>
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="namespaceButtonHandler"
          >Namespace View</span
        >
        <DropdownMenuShortcut
          ><span class="inline-block font-bold bg-gray-200 text-center px-1"
            >@</span
          ></DropdownMenuShortcut
        >
      </DropdownMenuItem>
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="referenceButtonHandler"
          >Reference View</span
        >
        <DropdownMenuShortcut
          ><span class="inline-block font-bold bg-gray-200 text-center px-1"
            >#</span
          ></DropdownMenuShortcut
        >
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handlePen">Pen</span>
        <DropdownMenuShortcut
          ><span class="inline-block font-bold bg-gray-200 text-center px-1"
            >mod</span
          >
          +
          <span class="inline-block font-bold bg-gray-200 text-center px-1"
            >p</span
          >
        </DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handleSavePNG"
          >Save as PNG</span
        >
      </DropdownMenuItem>
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handleSaveSVG"
          >Save as SVG</span
        >
      </DropdownMenuItem>
      <DropdownMenuSeparator />

      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handleSettings"
          >Settings</span
        >
      </DropdownMenuItem>
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handleHelp">Help</span>
        <span class="inline-block font-bold bg-gray-200 text-center px-1"
          >?</span
        >
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <span class="cursor-pointer flex-1" @click="handleQuit">Quit</span>
        <DropdownMenuShortcut
          ><span class="inline-block font-bold bg-gray-200 text-center px-1"
            >q</span
          ></DropdownMenuShortcut
        >
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
