type AudioContextConstructor = typeof AudioContext

function getAudioContextClass(): AudioContextConstructor {
  if (typeof window.AudioContext !== 'undefined') {
    return window.AudioContext
  }
  const webkit = (window as Window & { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext
  if (webkit) {
    return webkit
  }
  throw new Error('Web Audio API is not supported in this browser')
}

export function createAudioContext(): AudioContext {
  const AudioCtx = getAudioContextClass()
  return new AudioCtx()
}

/** Call synchronously inside a click/tap handler (required by Safari). */
export function unlockAudioContextSync(ctx: AudioContext): void {
  void ctx.resume()

  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
  source.stop(ctx.currentTime + 0.05)
}

export async function unlockAudioContext(ctx: AudioContext): Promise<void> {
  unlockAudioContextSync(ctx)
  if (ctx.state !== 'running') {
    await ctx.resume()
  }
}

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  const ua = navigator.userAgent
  return (
    /AppleWebKit/i.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|EdgiOS/i.test(ua)
  )
}
