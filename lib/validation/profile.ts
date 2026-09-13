import { z } from 'zod'

// 원본 프로토타입(legacy-reference/원본_V31.html)의 옵션 목록을 그대로 이식
export const GENDERS = ['남성', '여성', '기타/비공개'] as const
export const JOB_RANKS = [
  '대표', '팀장', '과장', '차장', '파트장', '대리', '사원', '인턴',
] as const
export const TEAMS = [
  '기획1팀', '기획2팀', '기획3팀', '기획4팀', '전략팀', '제작팀', '경영지원팀',
] as const
export const JOB_ROLES = [
  'AM', 'AE', '퍼포먼스 마케팅', '디자인', '웹페이지 코딩·제작', '전략기획팀', '인사담당', '회계담당', '결재담당',
] as const
export const WORK_STYLES = [
  '속도중시형', '정확도중시형', '협업중시형', '독립처리형', '문제해결형', '안정운영형', '성과집착형', '창의탐색형',
] as const
export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const
export const TRAITS = [
  '책임감 강함', '완벽주의', '직설적', '친화적', '경쟁적', '독립적', '협업형', '공감형',
  '감정기복', '갈등 회피', '꼼꼼함', '즉흥적', '리더십', '눈치 빠름', '창의적', '야근 내성', '변화 선호', '안정 선호',
] as const

export const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  gender: z.enum(GENDERS),
  team: z.enum(TEAMS),
  rank: z.enum(JOB_RANKS),
  role: z.enum(JOB_ROLES),
  work_style: z.enum(WORK_STYLES),
  mbti: z.enum(MBTI_TYPES),
  traits: z.array(z.enum(TRAITS)).max(5, '성격 특성은 최대 5개까지 선택할 수 있어요'),
  pref_traits: z.array(z.enum(TRAITS)).max(5, '선호 특성은 최대 5개까지 선택할 수 있어요'),
  skill: z.number().int().min(0).max(100),
  sales: z.number().int().min(0).max(100),
  crisis: z.number().int().min(0).max(100),
  stress: z.number().int().min(0).max(100),
})

export type ProfileInput = z.infer<typeof profileSchema>

export const DEFAULT_PROFILE: ProfileInput = {
  name: '',
  gender: '여성',
  team: '기획1팀',
  rank: '사원',
  role: 'AE',
  work_style: '협업중시형',
  mbti: 'ENFP',
  traits: ['친화적', '공감형'],
  pref_traits: [],
  skill: 70,
  sales: 50,
  crisis: 60,
  stress: 25,
}
