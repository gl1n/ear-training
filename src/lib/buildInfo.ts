export const gitCommit = __GIT_COMMIT__

export const gitCommitDate = __GIT_COMMIT_DATE__

export function formatGitCommitDate(isoDate: string): string {
  if (!isoDate) return '—'

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate))
}
