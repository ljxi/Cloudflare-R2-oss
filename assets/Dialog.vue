<script setup>
defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="dialog-mask"
      @click="emit('update:modelValue', false)"
    >
      <div class="dialog-container" @click.stop>
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<style>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(12, 12, 20, 0.42);
  backdrop-filter: blur(8px) saturate(110%);
  -webkit-backdrop-filter: blur(8px) saturate(110%);
}

.dialog-container {
  width: min(440px, 100%);
  max-height: min(720px, calc(100vh - 40px));
  overflow: auto;
  color: var(--text, #181827);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 22px;
  background: var(--surface-strong, rgba(255, 255, 255, 0.96));
  box-shadow: 0 28px 80px rgba(20, 18, 38, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  -webkit-overflow-scrolling: touch;
}

@media (prefers-color-scheme: dark) {
  .dialog-container {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(28, 28, 38, 0.96);
  }
}

@media (max-width: 680px) {
  .dialog-mask {
    align-items: flex-end;
    padding: 12px;
  }

  .dialog-container {
    width: 100%;
    max-height: calc(100vh - 24px);
    border-radius: 22px;
  }
}
</style>
