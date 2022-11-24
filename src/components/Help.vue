<script lang="ts" setup>
import { useHelp } from '@/stores/help'
const helpStore = useHelp()
let dialogVisible = true

const handleClose = () => {
  helpStore.visible = false
}
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
      <span>This is a message</span>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col bg-blue-200">
          <ul>
            <li>1</li>
            <li>2</li>
            <li>3</li>
            <li>4</li>
            <li>5</li>
          </ul>
        </div>
        <div class="flex flex-col bg-blue-200">
          <ul>
            <li>1</li>
            <li>2</li>
            <li>3</li>
            <li>4</li>
            <li>5</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>
