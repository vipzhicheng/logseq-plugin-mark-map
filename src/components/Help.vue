<script lang="ts" setup>
import { useHelp } from '@/stores/help'
const helpStore = useHelp()
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

    <div
      class="modal-container bg-white w-11/12 md:max-w-xl mx-auto rounded shadow-lg z-40 overflow-y-auto"
    >
      <!-- Add margin if you want to see some of the overlay behind the modal-->
      <div class="modal-content py-4 text-left px-6">
        <!--Title-->
        <div class="flex justify-between items-center pb-3">
          <p class="text-2xl font-bold">Key bindings</p>
          <div class="modal-close cursor-pointer z-50">
            <svg
              class="fill-current text-black"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 18 18"
            >
              <path
                d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"
              ></path>
            </svg>
          </div>
        </div>

        <div class="mb-2 text-gray-900">
          Using shortcuts, you can fine-grained control the mindmap.
        </div>

        <table
          class="border-collapse border border-blue-900 text-sm leading-relaxed text-gray-900 w-full"
        >
          <tr>
            <th class="border border-blue-900 text-center w-24">Key</th>
            <th class="border border-blue-900 text-center">Description</th>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">SPACE</td>
            <td class="pl-2 border border-blue-900">
              Fit window in center in case you move or zoom it.
            </td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">0</td>
            <td class="pl-2 border border-blue-900">
              Hide all except the central one.
            </td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">9</td>
            <td class="pl-2 border border-blue-900">Show all.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">1</td>
            <td class="pl-2 border border-blue-900">Expand to level 1.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">2</td>
            <td class="pl-2 border border-blue-900">Expand to level 2.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">3</td>
            <td class="pl-2 border border-blue-900">Expand to level 3.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">4</td>
            <td class="pl-2 border border-blue-900">Expand to level 4.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">5</td>
            <td class="pl-2 border border-blue-900">Expand to level 5.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">+</td>
            <td class="pl-2 border border-blue-900">Zoom in.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">-</td>
            <td class="pl-2 border border-blue-900">Zoom out.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">h</td>
            <td class="pl-2 border border-blue-900">Level up.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">l</td>
            <td class="pl-2 border border-blue-900">Level down.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">j</td>
            <td class="pl-2 border border-blue-900">Expand step by step.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">k</td>
            <td class="pl-2 border border-blue-900">Collapse step by step.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">UP</td>
            <td class="pl-2 border border-blue-900">Move mindmap up.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">DOWN</td>
            <td class="pl-2 border border-blue-900">Move mindmap down.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">LEFT</td>
            <td class="pl-2 border border-blue-900">Move mindmap left.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">RIGHT</td>
            <td class="pl-2 border border-blue-900">Move mindmap right.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">.</td>
            <td class="pl-2 border border-blue-900">Focus into child level.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">b</td>
            <td class="pl-2 border border-blue-900">
              Focus out to parent level.
            </td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">,</td>
            <td class="pl-2 border border-blue-900">Reset to original tree.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">n</td>
            <td class="pl-2 border border-blue-900">Focus to next sibling.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">p</td>
            <td class="pl-2 border border-blue-900">
              Focus to previous sibling.
            </td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">r</td>
            <td class="pl-2 border border-blue-900">Random change theme.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">z</td>
            <td class="pl-2 border border-blue-900">
              Reset theme according to Logseq theme.
            </td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">ESC & q</td>
            <td class="pl-2 border border-blue-900">Close the mindmap.</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">cmd+[</td>
            <td class="pl-2 border border-blue-900">Go backward</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">cmd+]</td>
            <td class="pl-2 border border-blue-900">Go forward</td>
          </tr>
          <tr>
            <td class="pl-2 border border-blue-900">/</td>
            <td class="pl-2 border border-blue-900">Toggle this modal.</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>
