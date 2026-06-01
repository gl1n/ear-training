import { useState } from 'react'
import { Button } from './ui/Button'

type ResetStatsButtonProps = {
  onReset: () => void
}

export function ResetStatsButton({ onReset }: ResetStatsButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3">
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">
          将清空失误分布、薄弱项和最佳记录，此操作不可撤销。
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} className="flex-1">
            取消
          </Button>
          <Button
            onClick={() => {
              onReset()
              setConfirming(false)
            }}
            className="flex-1 bg-red-500 hover:bg-red-400"
          >
            确认重置
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button variant="ghost" onClick={() => setConfirming(true)} className="w-full max-w-sm">
      重置统计数据
    </Button>
  )
}
