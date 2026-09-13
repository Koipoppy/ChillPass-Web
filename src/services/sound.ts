/**
 * 交互音效服务
 * 使用 Web Audio API 实时合成，不依赖任何音频资源文件
 * 首次调用发生在用户点击回调中，可正常解锁 AudioContext
 */

type OscillatorShape = OscillatorType

let audioCtx: AudioContext | null = null

/** 惰性创建 AudioContext（浏览器策略要求创建/恢复需在用户手势中） */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null

  if (!audioCtx) {
    try {
      audioCtx = new Ctor()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

interface ToneOptions {
  /** 起始频率（Hz） */
  freq: number
  /** 相对当前时刻的延迟（秒） */
  delay?: number
  /** 持续时长（秒） */
  duration: number
  /** 峰值音量 0-1 */
  gain: number
  type?: OscillatorShape
  /** 结束频率（用于滑音） */
  toFreq?: number
}

/** 播放单个音符：快速起音 + 指数衰减，听感干净不拖尾 */
function playTone(ctx: AudioContext, opts: ToneOptions): void {
  const { freq, delay = 0, duration, gain, type = 'triangle', toFreq } = opts
  const t0 = ctx.currentTime + delay

  const osc = ctx.createOscillator()
  const amp = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (toFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(toFreq, 1), t0 + duration)
  }

  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t0 + 0.008)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)

  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** 选项点击音：短促轻脆的一声，音量很低，不打扰 */
export function playClickSound(): void {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, { freq: 1250, duration: 0.045, gain: 0.05, type: 'triangle', toFreq: 900 })
}

/** 答对音：C-E-G 上行琶音 + 高音点缀，明快爽利 */
export function playCorrectSound(): void {
  const ctx = getContext()
  if (!ctx) return
  // 上行三音琶音（C6 / E6 / G6）
  playTone(ctx, { freq: 1046.5, duration: 0.16, gain: 0.14 })
  playTone(ctx, { freq: 1318.5, delay: 0.075, duration: 0.17, gain: 0.13 })
  playTone(ctx, { freq: 1568.0, delay: 0.15, duration: 0.26, gain: 0.12 })
  // 尾音高八度轻点，增加“亮”的收束感
  playTone(ctx, { freq: 2093.0, delay: 0.225, duration: 0.22, gain: 0.06, type: 'sine' })
}
