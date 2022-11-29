<script lang="ts" setup>
import { useHelp } from '@/stores/help'
const helpStore = useHelp()
let dialogVisible = true

const handleClose = () => {
  helpStore.visible = false
}

const penShortcuts = [
  {
    key: 'mod+p',
    description: 'Open pen mode toolbar.',
  },
  {
    key: 'mod+z',
    description: 'Undo.',
  },
  {
    key: 'mod+shift+z',
    description: 'Redo.',
  },
  {
    key: 'c',
    description: 'Clear screen.',
  },
  {
    key: 's',
    description: 'Stylus.',
  },
  {
    key: 'd',
    description: 'Draw.',
  },
  {
    key: 'f',
    description: 'Line.',
  },
  {
    key: 'a',
    description: 'Arrow.',
  },
  {
    key: 'r',
    description: 'Rectangle.',
  },
  {
    key: 't',
    description: 'Circle.',
  },
  {
    key: 'e',
    description: 'Eraser.',
  },
  {
    key: 'mod+1',
    description: 'Black.',
  },
  {
    key: 'mod+2',
    description: 'Red.',
  },
  {
    key: 'mod+3',
    description: 'Orange.',
  },
  {
    key: 'mod+4',
    description: 'Yellow.',
  },
  {
    key: 'mod+5',
    description: 'Green.',
  },
  {
    key: 'mod+6',
    description: 'Blue.',
  },
  {
    key: 'mod+7',
    description: 'Purple.',
  },
  {
    key: 'mod+8',
    description: 'Brown.',
  },
  {
    key: 'mod+9',
    description: 'Toggle white background.',
  },
  {
    key: 'mod+0',
    description: 'Toggle black background.',
  },
  {
    key: 'alt+=',
    description: 'Increase line weight.',
  },
  {
    key: 'alt+-',
    description: 'Decrease line weight.',
  },
  {
    key: 'mod+alt+1',
    description: 'Line solid.',
  },
  {
    key: 'mod+alt+2',
    description: 'Line dashed.',
  },
  {
    key: 'mod+alt+3',
    description: 'Line dotted.',
  },
]

const markmapShortcuts = [
  {
    key: 'SPACE',
    description: 'Fit window in center in case you move or zoom it.',
  },
  {
    key: '0',
    description: 'Hide all except the central one.',
  },
  {
    key: '9',
    description: 'Show all.',
  },
  {
    key: '1',
    description: 'Expand to level 1.',
  },
  {
    key: '2',
    description: 'Expand to level 2.',
  },
  {
    key: '3',
    description: 'Expand to level 3.',
  },
  {
    key: '4',
    description: 'Expand to level 4.',
  },
  {
    key: '5',
    description: 'Expand to level 5.',
  },
  {
    key: '=',
    description: 'Zoom in.',
  },
  {
    key: '-',
    description: 'Zoom out.',
  },
  {
    key: 'h',
    description: 'Level up.',
  },
  {
    key: 'l',
    description: 'Level down.',
  },
  {
    key: 'j',
    description: 'Expand step by step.',
  },
  {
    key: 'k',
    description: 'Collapse step by step.',
  },
  {
    key: '⬆️',
    description: 'Move mindmap up.',
  },
  {
    key: '⬇️',
    description: 'Move mindmap down.',
  },
  {
    key: '⬅️',
    description: 'Move mindmap left.',
  },
  {
    key: '➡️',
    description: 'Move mindmap right.',
  },
  {
    key: '.',
    description: 'Focus into child level.',
  },
  {
    key: 'b',
    description: 'Focus out to parent level.',
  },
  {
    key: ',',
    description: 'Reset to original tree.',
  },
  {
    key: 'n',
    description: 'Focus to next sibling.',
  },
  {
    key: 'p',
    description: 'Focus to previous sibling.',
  },
  {
    key: '`',
    description: 'Random change theme.',
  },
  {
    key: 'mod+b',
    description: 'Reset theme according to Logseq theme.',
  },
  {
    key: 'ESC & q',
    description: 'Close the mindmap.',
  },
  {
    key: 'mod+[',
    description: 'Go backward',
  },
  {
    key: 'mod+]',
    description: 'Go forward',
  },
  {
    key: '/',
    description: 'Toggle this modal.',
  },
]
</script>
<template>
  <div
    id="help-modal"
    class="modal fixed w-full h-full top-0 left-0 flex items-center justify-center z-50"
    :class="helpStore.visible ? '' : 'opacity-0 hidden'"
  >
    <div
      class="modal-overlay absolute w-full h-full bg-gray-900 opacity-95"
    ></div>

    <el-dialog
      v-model="helpStore.visible"
      title="Key bindings"
      width="70%"
      :before-close="handleClose"
    >
      <div class="flex flex-col justify-center h-full">
        <!-- Table -->
        <div class="w-full mx-auto bg-white shadow-lg rounded-sm">
          <div class="mb-2 text-gray-900">
            Using shortcuts, you can fine-grained control the mindmap.
          </div>
          <div class="p-3">
            <div class="grid grid-cols-2 gap-4">
              <table class="table-auto">
                <thead
                  class="text-xs font-semibold uppercase text-gray-400 bg-gray-50"
                >
                  <tr>
                    <th class="p-2 whitespace-nowrap">
                      <div class="font-semibold text-left">Shortcut</div>
                    </th>
                    <th class="p-2 whitespace-nowrap">
                      <div class="font-semibold text-left">Description</div>
                    </th>
                  </tr>
                </thead>
                <tbody class="text-sm divide-y divide-gray-100">
                  <tr v-for="item in markmapShortcuts" :key="item.key">
                    <td class="p-2 whitespace-nowrap">
                      <div class="flex items-center">
                        <div
                          class="font-medium text-gray-800 border border-gray-300 px-2 py-1"
                        >
                          {{ item.key }}
                        </div>
                      </div>
                    </td>
                    <td class="p-2 whitespace-nowrap">
                      <div class="text-left">
                        {{ item.description }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table class="table-auto">
                <thead
                  class="text-xs font-semibold uppercase text-gray-400 bg-gray-50"
                >
                  <tr>
                    <th class="p-2 whitespace-nowrap">
                      <div class="font-semibold text-left">Shortcut</div>
                    </th>
                    <th class="p-2 whitespace-nowrap">
                      <div class="font-semibold text-left">Description</div>
                    </th>
                  </tr>
                </thead>
                <tbody class="text-sm divide-y divide-gray-100">
                  <tr v-for="item in penShortcuts" :key="item.key">
                    <td class="p-2 whitespace-nowrap">
                      <div class="flex items-center">
                        <div
                          class="font-medium text-gray-800 border border-gray-300 px-2 py-1"
                        >
                          {{ item.key }}
                        </div>
                      </div>
                    </td>
                    <td class="p-2 whitespace-nowrap">
                      <div class="text-left">
                        {{ item.description }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>
