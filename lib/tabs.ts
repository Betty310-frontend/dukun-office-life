export const TABS = [
  { id: 'sim', label: '🎲 시뮬레이션' },
  { id: 'logs', label: '📰 일일 로그' },
  { id: 'messenger', label: '💬 메신저' },
  { id: 'me', label: '🌷 내정보' },
  { id: 'talk', label: '🗨️ 대화하기' },
  { id: 'relationships', label: '💞 인간관계' },
  { id: 'resetdata', label: '🗑️ 데이터 초기화' },
] as const

export type TabId = (typeof TABS)[number]['id']

export const TAB_IDS: readonly TabId[] = TABS.map((tab) => tab.id)
export const DEFAULT_TAB: TabId = 'sim'
