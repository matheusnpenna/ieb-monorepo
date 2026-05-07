<template>
  <div
    class="lesson-video-player"
    :class="{ vertical }"
    @mouseover="hoverOver"
    @mouseleave="hoverLeave"
  >
    <div
      v-if="isPanda"
      id="lesson-panda-player"
      class="embed-responsive embed-responsive-16by9"
      v-html="oEmbed"
    />

    <video
      v-else-if="isStream"
      controls
      crossorigin
      id="lesson-video-player"
      class="w-100"
      :data-poster="lesson.picture"
    />

    <div
      v-else
      class="embed-responsive embed-responsive-16by9"
      id="lesson-video-player"
    >
      <iframe
        class="embed-responsive-item"
        :src="linkMedia"
        allowfullscreen
      ></iframe>
    </div>

    <background-player-controls
      v-if="isBackground"
      @play-pause="playOrPause"
      @mute-sound="muteOrSound"
      :videoState="videoState"
      :soundState="soundState"
      :mini-player="miniPlayer"
    />
    <button
      v-if="miniPlayer && playBtnVisible"
      type="button"
      class="btn btn-mini-player p-0 m-0"
      @click="playOrPause"
    >
      <i :class="ICON_MAP[videoState]"></i>
    </button>
  </div>
</template>

<script>
import Hls from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import get from "lodash/get";
import isMobile from "ismobilejs";
import BackgroundPlayerControls from "./BackgroundPlayerControls.vue";

const youtubeParser = url => {
  var regExp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=)([^#\&\?]*).*/;
  var match = url.match(regExp);
  return match && match[1].length == 11 ? match[1] : false;
};

const vimeoParser = url => {
  var firstPart = url.split("?")[0].split("/");
  return firstPart[firstPart.length - 1];
};

import axios from "axios";

export default {
  components: { BackgroundPlayerControls },
  props: {
    lesson: {
      type: Object,
      default: () => ({})
    },
    isBackground: {
      type: Boolean,
      default: false
    },
    miniPlayer: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      oEmbed: "",
      player: null,
      vertical: false,
      playBtnVisible: true,
      videoState: "paused",
      soundState: "muted",
      playerOptions: {
        autoplay: false,
        invertTime: false,
        vimeo: {
          playsinline: false
        },
        i18n: {
          speed: "Velocidade",
          quality: "Qualidade",
          qualityLabel: {
            0: "Auto"
          }
        },
        speed: {
          selected: sessionStorage.getItem("bp-player-speed") || 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3]
        }
      }
    };
  },
  computed: {
    ICON_MAP() {
      return {
        paused: "icon-play1",
        ended: "icon-play1",
        playing: "icon-pause2"
      };
    },
    isStream() {
      return this.lesson.link_media.includes(".m3u8");
    },
    isVimeo() {
      return this.lesson.link_media.includes("vimeo");
    },
    isYoutube() {
      return this.lesson.link_media.includes("youtu");
    },
    isPanda() {
      return this.lesson.link_media.includes("pandavideo");
    },
    linkMedia() {
      if (this.isVimeo) {
        return `https://player.vimeo.com/video/${vimeoParser(
          this.lesson.link_media
        )}`;
      }
      if (this.isYoutube) {
        return `https://www.youtube.com/embed/${youtubeParser(
          this.lesson.link_media
        )}`;
      }
      return this.lesson.link_media;
    }
  },
  mounted() {
    if (this.isPanda) {
      axios
        .get(
          `https://api-v2.pandavideo.com/oembed?url=${this.lesson.link_media}`
        )
        .then(response => this.initPanda(response.data));
      return;
    }

    if (!this.isStream) {
      if (this.isVimeo || this.isYoutube) this.initPlayer();
      return;
    }

    const video = document.getElementById("lesson-video-player");

    if (
      video.canPlayType("application/vnd.apple.mpegURL") &&
      !isMobile(window.navigator).android.device
    ) {
      let source = document.createElement("source");
      source.src = this.lesson.link_media;
      source.type = "application/vnd.apple.mpegURL";
      video.appendChild(source);
    } else if (Hls.isSupported()) {
      var config = {
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
        },
        autoStartLoad: false
      };

      const hls = new Hls(config);
      hls.loadSource(this.lesson.link_media);

      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        hls.startLoad();
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const availableQualities = hls.levels.map(l => l.height).reverse();
        this.playerOptions.quality = {
          default: isMobile().any ? 360 : 480,
          options: [0, ...availableQualities],
          forced: true,
          onChange: e => updateQuality(e)
        };
        this.initPlayer();
      });

      const updateQuality = newQuality => {
        if (newQuality === 0) {
          hls.currentLevel = -1;
        } else {
          hls.levels.forEach((level, levelIndex) => {
            if (level.height === newQuality) {
              hls.currentLevel = levelIndex;
            }
          });
        }
      };

      hls.attachMedia(video);
    }
  },

  destroyed() {
    clearInterval(this.interval);
  },

  methods: {
    initPlayer() {
      let controls = [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "captions",
        "settings",
        "pip",
        "airplay"
      ];
      if (!isMobile(window.navigator).any) {
        controls = ["rewind", "fast-forward", ...controls, "fullscreen"];
      }
      this.playerOptions.controls = controls;

      const video = document.getElementById("lesson-video-player");

      this.player = new Plyr(video, this.playerOptions);
      window.player = this.player;
      var firstPlay = true;
      this.player.on("play", () => {
        if (firstPlay) {
          setTimeout(() => {
            this.player.currentTime = get(
              this.lesson,
              "progress.stopped_at",
              0
            );
          }, 1);
          firstPlay = false;
        }
      });

      this.player.on("ratechange", e => {
        const speed = e.detail.plyr.config.speed.selected;
        sessionStorage.setItem("bp-player-speed", speed);
      });

      this.player.on("ready", () => {
        setTimeout(() => {
          const iframe = document.querySelector(
            "#lesson-video-player .plyr__video-wrapper"
          );
          if (iframe && iframe.offsetHeight > iframe.offsetWidth) {
            this.vertical = true;
          }
        }, 2000);
      });

      const saveCurrentPosition = () => {
        this.saveDuration({
          finished: this.player.currentTime === this.duration,
          duration: this.player.currentTime
        });
      };

      this.interval = setInterval(() => {
        if (this.player.playing) {
          saveCurrentPosition();
        }
      }, 20 * 1000);

      this.player.on("pause", saveCurrentPosition);

      this.player.on("ended", event => {
        setTimeout(() => {
          this.saveDuration({ finished: true, duration: 0 });
        }, 200);
        setTimeout(() => {
          this.$emit("ended");
        }, 1000);
      });
    },

    initPanda(data) {
      const params = this.isBackground
        ? new URLSearchParams({
            autoplay: true,
            muted: true,
            saveProgress: false,
            disableForward: false,
            hideControlsOnStart: true,
            restartAfterEnd: true,
            controls: false,
            mutedIndicatorIcon: false,
            mutedIndicatorTextTop: "",
            mutedIndicatorTextBottom: "",
            controlsColor: "transparent",
            color: "transparent"
          }).toString()
        : "";
      this.oEmbed = `<iframe
            id="panda-${data.video_external_id}"
            src="https://player-${data.pullzone_name}.tv.pandavideo.com.br/embed/?v=${data.video_external_id}&${params}"
            style="border:none;top:0"
            allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
            allowfullscreen=true
            class="embed-responsive-item"
          ></iframe>`;

      setTimeout(() => {
        window.pandascripttag = window.pandascripttag || [];
        window.pandascripttag.push(() => {
          const player = new PandaPlayer(`panda-${data.video_external_id}`, {
            onReady: () => {
              player.setCurrentTime(get(this.lesson, "progress.stopped_at", 0));

              const saveCurrentPosition = () => {
                this.saveDuration({
                  finished: player.getCurrentTime() === data.duration,
                  duration: player.getCurrentTime()
                });
              };

              this.interval = setInterval(() => {
                if (!player.isPaused()) {
                  saveCurrentPosition();
                }
              }, 20 * 1000);

              this.playBtnVisible = false;

              player.onEvent(({ message }) => {
                if (message === "panda_pause") {
                  saveCurrentPosition();
                  this.playBtnVisible = true;
                }

                if (message === "panda_ended") {
                  this.playBtnVisible = true;
                  setTimeout(() => {
                    this.saveDuration({ finished: true, duration: 0 });
                  }, 200);
                  setTimeout(() => {
                    this.$emit("ended");
                  }, 1000);
                }
              });
            }
          });
          window.player = player;
          this.player = player;
        });
      }, 1);
    },

    saveDuration({ finished, duration }) {
      if (this.lesson.id) {
        this.$store.dispatch("modules/setProgress", {
          lesson_id: this.lesson.id,
          stopped_at: parseInt(duration),
          finished_at: finished
        });
      }
    },
    playOrPause() {
      if (this.player.isPaused()) {
        this.videoState = "playing";
        this.player.play();
        this.playBtnVisible = false;
      } else {
        this.videoState = "paused";
        this.player.pause();
      }
    },
    muteOrSound() {
      if (this.player.getVolume() == 0) {
        this.player.setVolume(1);
        this.soundState = "sound";
      } else {
        this.player.setVolume(0);
        this.soundState = "muted";
      }
    },
    hoverOver() {
      if (this.isBackground) this.playBtnVisible = true;
    },
    hoverLeave() {
      if (this.isBackground) this.playBtnVisible = false;
    }
  }
};
</script>

<style lang="scss" scoped>
.lesson-video-player {
  &.vertical {
    max-width: 300px;
    margin: auto;
  }
}
</style>
