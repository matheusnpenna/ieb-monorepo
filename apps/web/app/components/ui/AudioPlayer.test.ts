import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AudioPlayer from './AudioPlayer.vue'

const { createWaveSurfer, loadWaveform, destroyWaveform, onWaveformEvent } = vi.hoisted(() => ({
  createWaveSurfer: vi.fn(),
  loadWaveform: vi.fn(),
  destroyWaveform: vi.fn(),
  onWaveformEvent: vi.fn()
}))

vi.mock('wavesurfer.js', () => ({
  default: {
    create: createWaveSurfer
  }
}))

const findButtonByLabel = (wrapper: ReturnType<typeof mount>, label: string) => {
  const button = wrapper.findAll('button').find((item) => item.attributes('aria-label') === label)

  if (!button) {
    throw new Error(`Button ${label} not found`)
  }

  return button
}

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    createWaveSurfer.mockReturnValue({
      load: loadWaveform.mockResolvedValue(undefined),
      destroy: destroyWaveform,
      on: onWaveformEvent
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the waveform and resumes from the initial position', async () => {
    const wrapper = mount(AudioPlayer, {
      props: {
        src: '/aula.mp3',
        title: 'Aula em audio',
        initialPositionInSeconds: 42,
        progressDebounceMs: 0
      }
    })

    await flushPromises()
    await flushPromises()

    const audio = wrapper.get('audio').element as HTMLAudioElement
    Object.defineProperty(audio, 'duration', {
      configurable: true,
      value: 120
    })

    await wrapper.get('audio').trigger('loadedmetadata')
    vi.runOnlyPendingTimers()

    expect(createWaveSurfer).toHaveBeenCalledWith(expect.objectContaining({ interact: false }))
    expect(loadWaveform).toHaveBeenCalledWith('/aula.mp3')
    expect(audio.currentTime).toBe(42)
    expect(wrapper.emitted('loaded')).toEqual([[{ durationInSeconds: 120 }]])
    expect(wrapper.emitted('progress')).toEqual([
      [
        {
          currentTimeInSeconds: 42,
          durationInSeconds: 120,
          percentage: 35
        }
      ]
    ])
  })

  it('controls play and pause through the transport button', async () => {
    const wrapper = mount(AudioPlayer, {
      props: {
        src: '/aula.mp3'
      }
    })
    const audio = wrapper.get('audio').element as HTMLAudioElement
    Object.defineProperty(audio, 'duration', {
      configurable: true,
      value: 60
    })

    await wrapper.get('audio').trigger('loadedmetadata')
    await findButtonByLabel(wrapper, 'Reproduzir audio').trigger('click')

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()

    await wrapper.get('audio').trigger('playing')
    await findButtonByLabel(wrapper, 'Pausar audio').trigger('click')

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(wrapper.emitted('play')).toHaveLength(1)
  })

  it('seeks through the progress slider and ten-second controls', async () => {
    const wrapper = mount(AudioPlayer, {
      props: {
        src: '/aula.mp3',
        progressDebounceMs: 0
      }
    })
    const audio = wrapper.get('audio').element as HTMLAudioElement
    Object.defineProperty(audio, 'duration', {
      configurable: true,
      value: 120
    })

    await wrapper.get('audio').trigger('loadedmetadata')
    const progressInput = wrapper.findAll('input[type="range"]')[0]!

    await progressInput.setValue('80')
    await findButtonByLabel(wrapper, 'Avancar 10 segundos').trigger('click')

    expect(audio.currentTime).toBe(90)
    expect(wrapper.emitted('seek')?.at(-1)).toEqual([
      {
        currentTimeInSeconds: 90,
        durationInSeconds: 120,
        percentage: 75
      }
    ])
  })

  it('changes playback speed and volume', async () => {
    const wrapper = mount(AudioPlayer, {
      props: {
        src: '/aula.mp3'
      }
    })
    const audio = wrapper.get('audio').element as HTMLAudioElement
    Object.defineProperty(audio, 'duration', {
      configurable: true,
      value: 120
    })

    await wrapper.get('audio').trigger('loadedmetadata')
    await wrapper.findAll('button').find((button) => button.text() === '1.5x')?.trigger('click')
    await wrapper.findAll('input[type="range"]')[1]!.setValue('0.35')

    expect(audio.playbackRate).toBe(1.5)
    expect(audio.volume).toBe(0.35)
    expect(wrapper.emitted('rate-change')).toEqual([[1.5]])
    expect(wrapper.emitted('volume-change')).toEqual([[0.35]])
  })
})
