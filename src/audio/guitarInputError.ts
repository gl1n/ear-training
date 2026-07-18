export type MicrophoneEnvironment = {
  mediaDevicesAvailable: boolean
  permissionState: PermissionState | null
  policyAllowed: boolean | null
  secureContext: boolean
  topLevel: boolean
}

export function guitarInputErrorMessage(
  errorName: string,
  environment: MicrophoneEnvironment,
): string {
  if (!environment.secureContext || !environment.mediaDevicesAvailable) {
    return '麦克风只能在 HTTPS 或 localhost 页面使用，请改用安全地址打开'
  }

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    if (environment.policyAllowed === false || !environment.topLevel) {
      return '当前页面被嵌入在不允许麦克风的窗口中，请直接在浏览器新标签页打开练习地址'
    }
    if (environment.permissionState === 'granted') {
      return '网页权限已允许，但操作系统或当前应用仍拒绝麦克风；请在系统隐私设置中允许正在使用的浏览器（或 Codex），然后彻底退出并重新打开它'
    }
    if (environment.permissionState === 'denied') {
      return '当前环境仍报告麦克风被拒绝；请同时检查站点权限和系统隐私设置，并在修改后重新启动浏览器（或 Codex）'
    }
    return '麦克风请求被浏览器或系统拒绝，请检查站点权限与系统隐私设置后重试'
  }

  if (errorName === 'NotFoundError') return '没有找到可用的麦克风或音频输入设备'
  if (errorName === 'NotReadableError') return '麦克风已授权但无法读取，请关闭其他占用音频输入的应用后重试'
  if (errorName === 'AbortError') return '麦克风启动被中断，请重新连接设备后重试'
  if (errorName === 'OverconstrainedError') return '当前音频设备不支持所需采集设置'
  return '无法启动音频输入，请检查设备连接后重试'
}
