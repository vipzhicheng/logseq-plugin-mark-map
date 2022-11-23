<script lang="ts" setup>
import { useHelp } from '@/stores/help'
const helpStore = useHelp()
let dialogVisible = true
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
      title="Tips"
      width="30%"
      :before-close="handleClose"
    >
      <span>This is a message</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="helpStore.visible = false">Cancel</el-button>
          <el-button
            class="bg-blue-500"
            type="primary"
            @click="helpStore.visible = false"
          >
            Confirm
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
