import { abortError, throwIfAborted } from '../utils/abort'

function getChineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((voice) => voice.lang === 'zh-CN') ??
    voices.find((voice) => voice.lang.startsWith('zh')) ??
    voices.find((voice) => voice.lang.includes('CN'))
  )
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices()
  if (voices.length > 0) {
    return Promise.resolve(voices)
  }

  return new Promise((resolve) => {
    const onVoicesChanged = () => {
      speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
      resolve(speechSynthesis.getVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
  })
}

function primeSafariSpeech(): void {
  if (typeof speechSynthesis.resume === 'function') {
    speechSynthesis.resume()
  }
}

export async function speak(text: string, signal?: AbortSignal): Promise<void> {
  await waitForVoices()
  primeSafariSpeech()

  if (signal) {
    throwIfAborted(signal)
  }

  return new Promise((resolve, reject) => {
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9

    const voice = getChineseVoice()
    if (voice) {
      utterance.voice = voice
    }

    const onAbort = () => {
      speechSynthesis.cancel()
      signal?.removeEventListener('abort', onAbort)
      reject(abortError())
    }

    utterance.onend = () => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }

    utterance.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      reject(new Error('语音播报失败'))
    }

    signal?.addEventListener('abort', onAbort)
    speechSynthesis.speak(utterance)
  })
}

export function cancelSpeech(): void {
  speechSynthesis.cancel()
}
