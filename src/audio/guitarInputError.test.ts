import { describe, expect, it } from 'vitest'
import {
  guitarInputErrorMessage,
  type MicrophoneEnvironment,
} from './guitarInputError'

const ALLOWED_ENVIRONMENT: MicrophoneEnvironment = {
  mediaDevicesAvailable: true,
  permissionState: 'granted',
  policyAllowed: true,
  secureContext: true,
  topLevel: true,
}

describe('guitar input errors', () => {
  it('distinguishes a system-level rejection from a denied site permission', () => {
    expect(guitarInputErrorMessage('NotAllowedError', ALLOWED_ENVIRONMENT))
      .toContain('操作系统或当前应用')
    expect(guitarInputErrorMessage('NotAllowedError', {
      ...ALLOWED_ENVIRONMENT,
      permissionState: 'denied',
    })).toContain('仍报告麦克风被拒绝')
  })

  it('explains insecure and embedded contexts', () => {
    expect(guitarInputErrorMessage('NotAllowedError', {
      ...ALLOWED_ENVIRONMENT,
      secureContext: false,
    })).toContain('HTTPS')
    expect(guitarInputErrorMessage('NotAllowedError', {
      ...ALLOWED_ENVIRONMENT,
      policyAllowed: false,
    })).toContain('直接在浏览器新标签页打开')
  })

  it('reports device access failures separately from permission failures', () => {
    expect(guitarInputErrorMessage('NotReadableError', ALLOWED_ENVIRONMENT))
      .toContain('已授权但无法读取')
    expect(guitarInputErrorMessage('NotFoundError', ALLOWED_ENVIRONMENT))
      .toContain('没有找到')
  })
})
