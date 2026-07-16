import { formatGitCommitDate, gitCommit, gitCommitDate } from '../lib/buildInfo'

export function VersionInfo() {
  return (
    <div className="text-center text-xs text-[var(--text-secondary)]">
      <p>版本 {gitCommit}</p>
      <p className="mt-0.5">提交于 {formatGitCommitDate(gitCommitDate)}</p>
    </div>
  )
}
