<script setup>
defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue", "upload", "createFolder"]);
</script>
<template>
  <div class="popup">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="popup-modal"
        @click="emit('update:modelValue', false)"
      ></div>
    </Transition>
    <Transition name="slide-up">
      <div v-if="modelValue" class="popup-content">
        <div class="popup-handle" aria-hidden="true"></div>
        <div class="popup-title">添加到当前文件夹</div>
        <div class="button-grid">
          <button onclick="this.lastElementChild.click()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
              <path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 384c-53 0-96-43-96-96s43-96 96-96s96 43 96 96s-43 96-96 96z" />
            </svg>
            <span>拍照上传</span>
            <input type="file" accept="image/*" capture="camera" hidden @change="emit('upload', $event.target)" />
          </button>
          <button onclick="this.lastElementChild.click()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" aria-hidden="true">
              <path d="M256 0H576c35.3 0 64 28.7 64 64V288c0 35.3-28.7 64-64 64H256c-35.3 0-64-28.7-64-64V64c0-35.3 28.7-64 64-64zM476 106.7C471.5 100 464 96 456 96s-15.5 4-20 10.7l-56 84L362.7 169c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h80 48H552c8.9 0 17-4.9 21.2-12.7s3.7-17.3-1.2-24.6l-96-144zM336 96c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zM64 128h96V384v32c0 17.7 14.3 32 32 32H320c17.7 0 32-14.3 32-32V384H512v64c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V192c0-35.3 28.7-64 64-64zm8 64c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V208c0-8.8-7.2-16-16-16H72zm0 104c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V312c0-8.8-7.2-16-16-16H72zm336 16v16c0 8.8 7.2 16 16 16h16c8.8 0 16-7.2 16-16V416c0-8.8-7.2-16-16-16H424c-8.8 0-16 7.2-16 16z" />
            </svg>
            <span>图片 / 视频</span>
            <input type="file" accept="image/*,video/*" multiple hidden @change="emit('upload', $event.target)" />
          </button>
          <button onclick="this.lastElementChild.click()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true">
              <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z" />
            </svg>
            <span>选择文件</span>
            <input type="file" accept="*" multiple hidden @change="emit('upload', $event.target)" />
          </button>
          <button type="button" @click="emit('createFolder')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
              <path d="M512 416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H181.5c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7H448c35.3 0 64 28.7 64 64V416zM232 376c0 13.3 10.7 24 24 24s24-10.7 24-24V312h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H280V200c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H168c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z" />
            </svg>
            <span>新建文件夹</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.popup-modal {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(12, 12, 20, 0.34);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.popup-content {
  position: fixed;
  left: 50%;
  bottom: 0;
  width: min(680px, 100%);
  z-index: 46;
  padding: 9px 14px calc(14px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-bottom: 0;
  border-radius: 25px 25px 0 0;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 -18px 60px rgba(24, 21, 45, 0.16);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
}

.popup-handle {
  width: 38px;
  height: 4px;
  margin: 2px auto 11px;
  border-radius: 999px;
  background: #d5d5de;
}

.popup-title {
  margin: 0 4px 11px;
  color: #777889;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.popup .button-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.popup button {
  min-height: 92px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 6px;
  color: #292937;
  border: 1px solid rgba(35, 35, 55, 0.06);
  border-radius: 17px;
  background: rgba(248, 248, 252, 0.88);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.popup button:hover {
  transform: translateY(-2px);
  border-color: rgba(118, 87, 246, 0.14);
  background: #f3f0ff;
}

.popup button:active {
  transform: scale(0.97);
}

.popup svg {
  width: 28px;
  height: 28px;
  fill: var(--primary, #7657f6);
}

.popup button span {
  font-size: 12px;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .popup-content {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(27, 27, 37, 0.95);
  }

  .popup-handle { background: #555565; }
  .popup-title { color: #9998a8; }
  .popup button {
    color: #f1f0f6;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(38, 38, 49, 0.86);
  }

  .popup button:hover { background: rgba(118, 87, 246, 0.14); }
}

@media (max-width: 520px) {
  .popup-content {
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 22px 22px 0 0;
  }

  .popup .button-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .popup button {
    min-height: 84px;
  }
}
</style>
