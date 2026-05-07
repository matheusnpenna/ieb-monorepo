<template>
  <div>
    <div class="bg-video-controls d-flex justify-content-end">
      <button
        type="button"
        class="btn p-0 m-0 mr-2"
        @click="$emit('mute-sound')"
      >
        <i :class="SOUND_ICON_MAP[soundState]"></i>
      </button>
      <button
        v-if="!miniPlayer"
        type="button"
        class="btn p-0 m-0"
        @click="$emit('play-pause')"
      >
        <i :class="SOUND_VIDEO_MAP[videoState]"></i>
      </button>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    videoState: {
      type: String,
      default: ""
    },
    soundState: {
      type: String,
      default: ""
    },
    miniPlayer: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    SOUND_ICON_MAP() {
      return {
        muted: "icon-mute",
        sound: "icon-sound"
      };
    },
    SOUND_VIDEO_MAP() {
      return {
        paused: "icon-play2",
        ended: "icon-play2",
        playing: "icon-pause"
      };
    }
  }
};
</script>
<style lang="scss" scoped>
.bg-video-controls {
  position: absolute;
  bottom: 5%;
  right: 2%;
  transform: translateX(-2%);
  z-index: 10;
  user-select: none;

  button {
    min-height: 38px;
    min-width: 38px;

    i {
      font-size: 16px;
      color: #fff;
    }
  }
}
</style>
