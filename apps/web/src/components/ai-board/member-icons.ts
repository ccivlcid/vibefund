// AI 이사회 멤버별 이니셜 (표시용, 이모지 없음)
const AI_BOARD_MEMBER_INITIAL: Record<string, string> = {
  buffett: 'B',
  jobs: 'J',
  karpathy: 'K',
  gates: 'G',
  musk: 'M',
  lynch: 'L',
  thiel: 'T',
}

export function getMemberInitial(key: string): string {
  return AI_BOARD_MEMBER_INITIAL[key] ?? (key.charAt(0).toUpperCase() || '?')
}
