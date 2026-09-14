// 원본 legacy-reference/원본_V31.html 2693-2704행(topicCompatibility),
// 2721-2735행(employeeSocialContext — 싱글플레이 전역 protagonist 참조를 talker 파라미터로 교체.
// 원본은 sameTeam/senior/junior/peer/close/veryClose/awkward/stressed/tired/calm을 다 반환하지만
// 실제로 genericChoiceReply/workplaceChoiceCompatibility가 쓰는 건 sameTeam/close/stressed뿐이라
// 그 3개만 포팅했다 — senior/junior/peer가 쓰던 rankLevel()도 그래서 포팅하지 않았다),
// 2736-2748행(mbtiSpeechProfile), 2942-2950행(stableHash), 4286-4377행(WORKPLACE_TALK_CHOICES),
// 4380-4390행(seededUnit/shuffledBySeed), 4413-4442행(workplaceChoiceCompatibility),
// 4443-4452행(employeeChoiceTone), 4457-4620행(genericChoiceReply — 실제로 실행되는 답변 생성기.
// employeeReplyForWorkplaceChoice의 switch(choice.id)는 원본에서도 실제 choice id와 하나도 안 맞는
// 죽은 코드라 포팅하지 않았다), 4835-4865행(relationDeltaForWorkplaceChoice), 2916-2930행
// (maybeCreateMemory) 그대로 포팅.
//
// 이 프로젝트는 사용자 요청으로 대화 선택지/답변을 OpenAI로 매번 새로 생성한다(lib/ai/openai.ts).
// 이 파일은 키가 없거나 API 호출이 실패했을 때 쓰는 폴백 경로 + (AI 생성이든 폴백이든 공통으로 쓰는)
// 관계 수치 변화·추억 생성 로직이다 — 관계 변화는 항상 이 결정론적 로컬 계산을 쓰고 AI에 맡기지 않는다.
import { clamp } from './format'
import { hasTrait } from './compatibility'
import type { RelationEntry } from './relations'
import type { WorkforceMember } from './types'

export type TalkGroup = '업무' | '관계' | '일상'
export type TalkTopic = 'work' | 'praise' | 'casual' | 'worry' | 'hobby'

export interface TalkChoice {
  group: TalkGroup
  kind: string
  topic: TalkTopic
  text: string
}

interface LegacyTalkChoice {
  id: string
  group: TalkGroup
  mini: string
  topic: TalkTopic
  player: string
  kind: string
}

export const WORKPLACE_TALK_CHOICES: LegacyTalkChoice[] = [
  { id: 'work_complete', group: '업무', mini: '업무 완료 보고', topic: 'work', player: '요청하신 건 처리 완료해서 공유드렸어요. 확인 부탁드릴게요.', kind: 'complete' },
  { id: 'work_priority', group: '업무', mini: '우선순위 확인', topic: 'work', player: '지금 맡은 것들 중에 어떤 걸 먼저 처리하는 게 좋을까요?', kind: 'priority' },
  { id: 'work_help', group: '업무', mini: '도움 요청', topic: 'work', player: '이 부분에서 조금 막혔는데, 시간 괜찮으시면 잠깐 같이 봐주실 수 있어요?', kind: 'help' },
  { id: 'work_schedule', group: '업무', mini: '일정 확인', topic: 'work', player: '이번 건 일정 괜찮으세요? 제가 맞출 수 있는 부분은 맞춰볼게요.', kind: 'schedule' },
  { id: 'work_share', group: '업무', mini: '업무 분담', topic: 'work', player: '이거 업무량이 좀 많은데 나눠서 진행하는 게 어떨까요?', kind: 'collab' },
  { id: 'work_meeting', group: '업무', mini: '회의 의견', topic: 'work', player: '아까 회의에서 나온 방향, 어떻게 생각하세요?', kind: 'opinion' },
  { id: 'work_client_feedback', group: '업무', mini: '광고주 피드백', topic: 'work', player: '광고주 피드백이 조금 애매한데, 이대로 반영하는 게 맞을까요?', kind: 'client' },
  { id: 'work_budget', group: '업무', mini: '예산 소진', topic: 'work', player: '오늘 예산 소진 속도가 빠른 것 같은데 어떻게 보는 게 좋을까요?', kind: 'performance' },
  { id: 'work_conversion', group: '업무', mini: '전환 감소', topic: 'work', player: '클릭은 나오는데 전환이 줄었어요. 어디부터 확인하는 게 좋을까요?', kind: 'performance' },
  { id: 'work_ctr', group: '업무', mini: 'CTR 하락', topic: 'work', player: '요즘 CTR이 조금 떨어졌는데 소재 교체 타이밍일까요?', kind: 'performance' },
  { id: 'work_cpc', group: '업무', mini: 'CPC 상승', topic: 'work', player: 'CPC가 계속 오르는데 입찰가를 조정하는 게 좋을까요?', kind: 'performance' },
  { id: 'work_landing', group: '업무', mini: '랜딩 이탈', topic: 'work', player: '유입은 괜찮은데 랜딩에서 많이 빠지는 것 같아요. 한번 같이 봐주실래요?', kind: 'performance' },
  { id: 'work_creative', group: '업무', mini: '소재 피로도', topic: 'work', player: '이 소재 오래 돌려서 반응이 빠진 것 같지 않아요?', kind: 'creative' },
  { id: 'work_copy', group: '업무', mini: '카피 의견', topic: 'work', player: '새 카피 두 개 중에 어느 쪽이 더 나아 보여요?', kind: 'creative' },
  { id: 'work_keyword', group: '업무', mini: '키워드 정리', topic: 'work', player: '검색어 보니까 비관련 유입이 좀 많은데 키워드 정리할까요?', kind: 'performance' },
  { id: 'work_exclusion', group: '업무', mini: '제외 키워드', topic: 'work', player: '이 검색어들은 제외 키워드로 넣는 게 좋겠죠?', kind: 'performance' },
  { id: 'work_report', group: '업무', mini: '리포트 작성', topic: 'work', player: '이번 주 리포트에서 어떤 내용을 제일 강조하는 게 좋을까요?', kind: 'report' },
  { id: 'work_bad_report', group: '업무', mini: '성과 하락 보고', topic: 'work', player: '이번 주 성과가 안 좋아서 광고주한테 어떻게 설명할지 고민돼요.', kind: 'client' },
  { id: 'work_tracking', group: '업무', mini: '전환 추적', topic: 'work', player: '전환 수치가 이상한데 태그부터 확인하는 게 맞겠죠?', kind: 'performance' },
  { id: 'work_abtest', group: '업무', mini: 'A/B 테스트', topic: 'work', player: '새 소재 테스트 결과가 나왔는데 바로 예산 더 붙여도 될까요?', kind: 'performance' },
  { id: 'work_delay', group: '업무', mini: '일정 지연', topic: 'work', player: '이 건 생각보다 시간이 더 걸릴 것 같은데 일정 조정 요청드려도 될까요?', kind: 'schedule' },
  { id: 'work_revision', group: '업무', mini: '수정 요청', topic: 'work', player: '수정 요청이 또 들어왔는데 우선순위부터 다시 잡는 게 좋겠죠?', kind: 'client' },
  { id: 'work_setting', group: '업무', mini: '캠페인 세팅', topic: 'work', player: '캠페인 세팅은 다 했는데 마지막으로 한번 확인해주실래요?', kind: 'complete' },
  { id: 'work_upload', group: '업무', mini: '소재 업로드', topic: 'work', player: '소재 업로드까지 끝냈어요. 이대로 집행 시작해도 될까요?', kind: 'complete' },
  { id: 'work_target', group: '업무', mini: '타깃 설정', topic: 'work', player: '타깃이 너무 넓은 것 같은데 조금 줄여보는 게 좋을까요?', kind: 'performance' },
  { id: 'work_device', group: '업무', mini: '디바이스 성과', topic: 'work', player: '모바일이랑 PC 성과 차이가 큰데 예산을 나눠볼까요?', kind: 'performance' },
  { id: 'work_time', group: '업무', mini: '시간대 성과', topic: 'work', player: '밤 시간대 전환이 더 좋은데 시간대 조정해볼까요?', kind: 'performance' },
  { id: 'work_client_call', group: '업무', mini: '광고주 연락', topic: 'work', player: '이 건은 메신저보다 광고주한테 전화로 설명하는 게 낫겠죠?', kind: 'client' },
  { id: 'work_finalcheck', group: '업무', mini: '최종 검수', topic: 'work', player: '전달 전에 한번 최종 체크 같이 해주실 수 있어요?', kind: 'careful' },
  { id: 'work_nextstep', group: '업무', mini: '다음 액션', topic: 'work', player: '지금 데이터 기준으로 다음 액션은 뭐부터 잡는 게 좋을까요?', kind: 'priority' },
  { id: 'rel_praise', group: '관계', mini: '업무 칭찬', topic: 'praise', player: '아까 처리하신 거 깔끔하던데요. 수고하셨어요.', kind: 'praise' },
  { id: 'rel_thanks', group: '관계', mini: '도움 감사', topic: 'praise', player: '아까 도와주셔서 감사해요. 덕분에 잘 마무리했어요.', kind: 'thanks' },
  { id: 'rel_apology', group: '관계', mini: '사과하기', topic: 'casual', player: '제가 아까 말이 좀 딱딱했던 것 같아요. 미안해요.', kind: 'apology' },
  { id: 'rel_condition', group: '관계', mini: '컨디션 묻기', topic: 'worry', player: '오늘 좀 피곤해 보이는데 괜찮으세요?', kind: 'care' },
  { id: 'rel_overwork', group: '관계', mini: '무리하는지 묻기', topic: 'worry', player: '요즘 계속 늦게까지 하던데 너무 무리하는 거 아니에요?', kind: 'care' },
  { id: 'rel_help_offer', group: '관계', mini: '도움 제안', topic: 'worry', player: '지금 바빠 보이는데 제가 나눠서 할 수 있는 거 있으면 주세요.', kind: 'support' },
  { id: 'rel_confidence', group: '관계', mini: '신뢰 표현', topic: 'praise', player: '이 건은 믿고 맡겨도 될 것 같아요. 항상 잘 해주시잖아요.', kind: 'trust' },
  { id: 'rel_feedback', group: '관계', mini: '피드백 부탁', topic: 'casual', player: '제가 같이 일할 때 고치면 좋을 점 있으면 편하게 말해주세요.', kind: 'feedback' },
  { id: 'rel_teamwork', group: '관계', mini: '호흡 이야기', topic: 'casual', player: '요즘 같이 일할 때 호흡이 좀 잘 맞는 것 같지 않아요?', kind: 'bond' },
  { id: 'rel_stress', group: '관계', mini: '스트레스 묻기', topic: 'worry', player: '요즘 업무 스트레스 많이 받으세요?', kind: 'care' },
  { id: 'rel_client_worry', group: '관계', mini: '광고주 고민 듣기', topic: 'worry', player: '요즘 제일 힘든 광고주 있어요? 있으면 얘기해도 돼요.', kind: 'care' },
  { id: 'rel_mistake', group: '관계', mini: '실수 위로', topic: 'worry', player: '아까 실수한 건 너무 신경 쓰지 마요. 누구나 그럴 수 있죠.', kind: 'support' },
  { id: 'rel_goodjob', group: '관계', mini: '수고 인사', topic: 'praise', player: '오늘 진짜 고생 많으셨어요. 일이 계속 몰렸네요.', kind: 'praise' },
  { id: 'rel_teamcompliment', group: '관계', mini: '팀워크 칭찬', topic: 'praise', player: '오늘 팀 분위기 잘 잡아주신 것 같아요. 덕분에 편했어요.', kind: 'praise' },
  { id: 'rel_advice', group: '관계', mini: '조언 부탁', topic: 'casual', player: '제가 요즘 일하는 방식에서 바꿔야 할 점이 있을까요?', kind: 'feedback' },
  { id: 'rel_reconcile', group: '관계', mini: '어색함 풀기', topic: 'casual', player: '아까 분위기 조금 어색했던 것 같은데 괜찮죠?', kind: 'apology' },
  { id: 'rel_listen', group: '관계', mini: '고민 들어주기', topic: 'worry', player: '뭔가 고민 있어 보이는데, 말하고 싶으면 들어줄게요.', kind: 'care' },
  { id: 'rel_support', group: '관계', mini: '응원하기', topic: 'praise', player: '요즘 바쁜데도 잘 버티는 것 같아요. 조금만 더 힘내요.', kind: 'support' },
  { id: 'rel_respect', group: '관계', mini: '존중 표현', topic: 'praise', player: '일 처리하는 거 보면 배울 점이 많다고 생각해요.', kind: 'praise' },
  { id: 'rel_rely', group: '관계', mini: '의지 표현', topic: 'praise', player: '같이 일하면 마음이 좀 놓이는 편이에요.', kind: 'bond' },
  { id: 'rel_checktone', group: '관계', mini: '말투 확인', topic: 'casual', player: '제가 평소에 너무 딱딱하게 말하는 편은 아니죠?', kind: 'feedback' },
  { id: 'rel_private', group: '관계', mini: '사적인 거리감', topic: 'casual', player: '회사에서 친한 사람 생기는 거 어떻게 생각하세요?', kind: 'bond' },
  { id: 'rel_teamfit', group: '관계', mini: '팀 적응', topic: 'casual', player: '지금 팀 분위기는 좀 적응되셨어요?', kind: 'care' },
  { id: 'rel_manager', group: '관계', mini: '상사 고민', topic: 'worry', player: '요즘 위에서 오는 요청 때문에 스트레스 받는 건 없어요?', kind: 'care' },
  { id: 'rel_credit', group: '관계', mini: '공로 인정', topic: 'praise', player: '이번 건은 진짜 본인 공이 큰 것 같아요.', kind: 'praise' },
  { id: 'rel_askfavor', group: '관계', mini: '작은 부탁', topic: 'casual', player: '다음에 제가 정신없어 보이면 한 번만 알려주세요.', kind: 'trust' },
  { id: 'rel_thankpresence', group: '관계', mini: '함께 일해 고마움', topic: 'praise', player: '요즘 같이 일해줘서 고맙다는 생각이 들어요.', kind: 'bond' },
  { id: 'rel_honest', group: '관계', mini: '솔직한 의견', topic: 'casual', player: '저한테 불편한 점 있으면 솔직하게 말해도 괜찮아요.', kind: 'feedback' },
  { id: 'rel_encourage', group: '관계', mini: '자신감 북돋기', topic: 'praise', player: '요즘 일 잘하고 있는 것 같아요. 너무 본인한테 박하게 굴지 마요.', kind: 'support' },
  { id: 'rel_checkrelationship', group: '관계', mini: '관계 확인', topic: 'casual', player: '저희는 그래도 꽤 편하게 일하는 사이인 것 같죠?', kind: 'bond' },
  { id: 'life_lunch', group: '일상', mini: '점심 제안', topic: 'casual', player: '점심 뭐 드실래요? 같이 먹으러 갈까요?', kind: 'lunch' },
  { id: 'life_coffee', group: '일상', mini: '커피 제안', topic: 'casual', player: '잠깐 커피 한 잔 하실래요?', kind: 'coffee' },
  { id: 'life_leave', group: '일상', mini: '퇴근 시간', topic: 'casual', player: '오늘은 몇 시쯤 퇴근할 것 같아요?', kind: 'leave' },
  { id: 'life_weekend', group: '일상', mini: '주말 이야기', topic: 'hobby', player: '주말에는 뭐 하셨어요?', kind: 'weekend' },
  { id: 'life_today', group: '일상', mini: '오늘 하루', topic: 'casual', player: '오늘 하루는 좀 어땠어요?', kind: 'smalltalk' },
  { id: 'life_dinner', group: '일상', mini: '퇴근 후 식사', topic: 'hobby', player: '오늘 일찍 끝나면 뭐 먹으러 갈래요?', kind: 'food' },
  { id: 'life_breakfast', group: '일상', mini: '아침 식사', topic: 'casual', player: '아침은 드셨어요? 저는 정신없어서 못 먹었네요.', kind: 'food' },
  { id: 'life_snack', group: '일상', mini: '간식 이야기', topic: 'casual', player: '당 떨어지는데 뭐 먹을 거 없을까요?', kind: 'snack' },
  { id: 'life_commute', group: '일상', mini: '출근길', topic: 'casual', player: '오늘 출근길 괜찮았어요? 지하철 사람 엄청 많던데요.', kind: 'commute' },
  { id: 'life_weather', group: '일상', mini: '날씨 이야기', topic: 'casual', player: '오늘 날씨 진짜 애매하지 않아요? 옷 입기 어렵네요.', kind: 'weather' },
  { id: 'life_sleep', group: '일상', mini: '수면', topic: 'casual', player: '어제 잘 주무셨어요? 오늘 좀 졸려 보여요.', kind: 'condition' },
  { id: 'life_music', group: '일상', mini: '음악 이야기', topic: 'hobby', player: '일할 때 음악 들으세요? 요즘 뭐 들어요?', kind: 'hobby' },
  { id: 'life_youtube', group: '일상', mini: '유튜브', topic: 'hobby', player: '요즘 자주 보는 유튜브 채널 있어요?', kind: 'hobby' },
  { id: 'life_drama', group: '일상', mini: '드라마·영화', topic: 'hobby', player: '요즘 재밌게 보는 드라마나 영화 있어요?', kind: 'hobby' },
  { id: 'life_game', group: '일상', mini: '게임', topic: 'hobby', player: '게임 좋아하세요? 요즘 하는 거 있어요?', kind: 'hobby' },
  { id: 'life_exercise', group: '일상', mini: '운동', topic: 'hobby', player: '요즘 운동하세요? 저도 좀 시작해야 할 것 같아요.', kind: 'hobby' },
  { id: 'life_cafe', group: '일상', mini: '카페', topic: 'hobby', player: '회사 근처에서 자주 가는 카페 있어요?', kind: 'coffee' },
  { id: 'life_food', group: '일상', mini: '맛집', topic: 'hobby', player: '회사 근처 맛집 중에 괜찮은 데 알아요?', kind: 'food' },
  { id: 'life_holiday', group: '일상', mini: '휴일 계획', topic: 'hobby', player: '다음 휴일에는 뭐 하고 싶어요?', kind: 'weekend' },
  { id: 'life_vacation', group: '일상', mini: '휴가', topic: 'hobby', player: '휴가 생기면 제일 먼저 어디 가고 싶어요?', kind: 'hobby' },
  { id: 'life_home', group: '일상', mini: '집에서 쉬기', topic: 'hobby', player: '퇴근하면 보통 집에서 뭐 하면서 쉬어요?', kind: 'hobby' },
  { id: 'life_mbti', group: '일상', mini: 'MBTI 이야기', topic: 'casual', player: '본인 MBTI 성격이 실제랑 좀 맞는 것 같아요?', kind: 'personality' },
  { id: 'life_personality', group: '일상', mini: '성격 이야기', topic: 'casual', player: '본인은 낯가리는 편이에요, 아니면 금방 친해지는 편이에요?', kind: 'personality' },
  { id: 'life_foodpref', group: '일상', mini: '음식 취향', topic: 'casual', player: '맵거나 자극적인 음식 좋아하세요?', kind: 'food' },
  { id: 'life_drink', group: '일상', mini: '음료 취향', topic: 'casual', player: '커피 말고 자주 마시는 음료 있어요?', kind: 'coffee' },
  { id: 'life_season', group: '일상', mini: '계절 취향', topic: 'casual', player: '어느 계절을 제일 좋아하세요?', kind: 'weather' },
  { id: 'life_morning', group: '일상', mini: '아침형·저녁형', topic: 'casual', player: '아침형이에요, 아니면 밤에 더 멀쩡한 편이에요?', kind: 'personality' },
  { id: 'life_phone', group: '일상', mini: '휴대폰 이야기', topic: 'casual', player: '쉬는 시간엔 휴대폰으로 뭐 제일 많이 봐요?', kind: 'hobby' },
  { id: 'life_weekday', group: '일상', mini: '평일 루틴', topic: 'casual', player: '평일엔 퇴근하고 보통 바로 집에 가요?', kind: 'smalltalk' },
  { id: 'life_random', group: '일상', mini: '가벼운 질문', topic: 'casual', player: '요즘 소소하게 기다리는 거나 기대되는 일 있어요?', kind: 'smalltalk' },
]

export function stableHash(value: string): number {
  const s = String(value || '')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

export function seededUnit(seedText: string): number {
  let x = stableHash(seedText || 'seed') || 1
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return (Math.abs(x >>> 0) % 1000000) / 1000000
}

export function shuffledBySeed<T extends { id: string }>(arr: T[], seed: string): T[] {
  return arr
    .map((item, index) => ({ item, key: seededUnit(String(seed) + '|' + item.id + '|' + index) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item)
}

// OpenAI 실패/키 없음 시 쓰는 폴백 선택지 — 원본 randomWorkplaceChoicesForPerson과 동일하게
// (날짜, NPC) 기준으로 결정적이라 같은 날 다시 열어도 같은 3개가 나온다.
export function fallbackTalkChoices(npcKey: string, dateStr: string): TalkChoice[] {
  const seed = `talkChoices|${dateStr}|${npcKey}`
  const selected: LegacyTalkChoice[] = []
  for (const group of ['업무', '관계', '일상'] as const) {
    const pool = WORKPLACE_TALK_CHOICES.filter((c) => c.group === group)
    const shuffled = shuffledBySeed(pool, seed + '|' + group)
    if (shuffled[0]) selected.push(shuffled[0])
  }
  return shuffledBySeed(selected, seed + '|display').map((c) => ({
    group: c.group,
    kind: c.kind,
    topic: c.topic,
    text: c.player,
  }))
}

export type Tone = 'direct' | 'warm' | 'careful' | 'practical' | 'reserved' | 'neutral'

export function employeeChoiceTone(npc: WorkforceMember): Tone {
  const mb = mbtiSpeechProfile(npc.mbti)
  if (hasTrait(npc, '직설적')) return 'direct'
  if (hasTrait(npc, '공감형') || hasTrait(npc, '친화적') || mb.feeling) return 'warm'
  if (hasTrait(npc, '꼼꼼함') || hasTrait(npc, '완벽주의') || mb.judging) return 'careful'
  if (hasTrait(npc, '경쟁적') || mb.thinking) return 'practical'
  if (hasTrait(npc, '독립적') || mb.introvert) return 'reserved'
  return 'neutral'
}

function mbtiSpeechProfile(mbti: string) {
  const m = String(mbti || '').toUpperCase()
  return {
    extrovert: m[0] === 'E',
    introvert: m[0] === 'I',
    thinking: m[2] === 'T',
    feeling: m[2] === 'F',
    judging: m[3] === 'J',
  }
}

// 원본은 sameTeam/senior/junior/peer/close/veryClose/awkward/stressed/tired/calm을 전부 반환하지만
// genericChoiceReply/workplaceChoiceCompatibility가 실제로 쓰는 건 sameTeam/close/stressed뿐이다.
interface SocialContext {
  sameTeam: boolean
  close: boolean
  stressed: boolean
}

function employeeSocialContext(npc: WorkforceMember, talker: WorkforceMember, relation: RelationEntry): SocialContext {
  return {
    sameTeam: talker.team === npc.team,
    close: (relation.affection + relation.trust) / 2 >= 68,
    stressed: (npc.stress || 0) >= 70,
  }
}

export function workplaceChoiceCompatibility(
  npc: WorkforceMember,
  choice: TalkChoice,
  relation: RelationEntry,
  talker: WorkforceMember
): number {
  const mb = mbtiSpeechProfile(npc.mbti)
  const ctx = employeeSocialContext(npc, talker, relation)
  const kind = choice.kind || 'smalltalk'
  let score = 0

  if (choice.group === '업무') {
    if (hasTrait(npc, '책임감 강함') || hasTrait(npc, '꼼꼼함') || hasTrait(npc, '완벽주의')) score += 1
    if (mb.thinking || mb.judging) score += 0.5
    if (['collab', 'help'].includes(kind) && (hasTrait(npc, '협업형') || hasTrait(npc, '친화적'))) score += 1
    if (kind === 'creative' && (hasTrait(npc, '창의적') || hasTrait(npc, '변화 선호'))) score += 1
    if (['performance', 'priority', 'report'].includes(kind) && (hasTrait(npc, '경쟁적') || hasTrait(npc, '리더십'))) score += 1
  }
  if (choice.group === '관계') {
    if (hasTrait(npc, '친화적') || hasTrait(npc, '공감형') || mb.feeling) score += 1
    if (['praise', 'trust'].includes(kind) && (hasTrait(npc, '경쟁적') || hasTrait(npc, '책임감 강함'))) score += 1
    if (['care', 'support'].includes(kind) && hasTrait(npc, '공감형')) score += 1
    if (['bond', 'feedback'].includes(kind) && hasTrait(npc, '독립적')) score -= 0.5
  }
  if (choice.group === '일상') {
    if (hasTrait(npc, '친화적') || hasTrait(npc, '즉흥적') || mb.extrovert) score += 1
    if (hasTrait(npc, '독립적') || mb.introvert) score -= 0.3
    if (kind === 'hobby' && (hasTrait(npc, '창의적') || hasTrait(npc, '변화 선호'))) score += 1
  }
  if (ctx.sameTeam) score += 0.4
  if (ctx.close) score += 0.7
  if (ctx.stressed && choice.group === '일상') score -= 0.7
  return score
}

// 원본이 실제로 실행하는 답변 생성기(genericChoiceReply) verbatim 포팅.
export function genericChoiceReply(npc: WorkforceMember, choice: TalkChoice, relation: RelationEntry, talker: WorkforceMember): string {
  const tone = employeeChoiceTone(npc)
  const ctx = employeeSocialContext(npc, talker, relation)
  const stress = npc.stress || 0
  const affection = relation.affection || 0
  const close = ctx.close
  const kind = choice.kind || 'smalltalk'

  const warm = tone === 'warm'
  const direct = tone === 'direct' || tone === 'practical'
  const careful = tone === 'careful'
  const reserved = tone === 'reserved'

  const banks: Record<string, string> = {
    complete: careful
      ? '네, 완료한 거 확인해볼게요. 세부 내용만 한번 체크하고 넘어가면 될 것 같아요.'
      : direct
        ? '좋아요, 확인해볼게요. 문제 없으면 바로 다음 단계로 가죠.'
        : warm
          ? '아, 다 끝냈군요. 수고 많았어요. 제가 확인해볼게요.'
          : '네, 확인해볼게요. 작업하느라 수고했어요.',
    priority: direct
      ? '급한 것부터 먼저 잡는 게 맞아요. 마감 기준으로 순서 정하죠.'
      : careful
        ? '일정과 영향도 같이 보고 정하는 게 좋겠어요. 애매하면 제가 같이 볼게요.'
        : '마감 가까운 것부터 먼저 하면 될 것 같아요. 나머지는 그다음에 정리하죠.',
    help: stress >= 75
      ? '지금 조금 바쁘긴 한데 막힌 부분은 한번 볼게요. 핵심만 보여주세요.'
      : warm
        ? '그럼요, 같이 봐요. 혼자 오래 붙잡고 있지 마요.'
        : direct
          ? '네, 어디서 막혔는지 보여주세요. 원인부터 바로 보죠.'
          : '네, 한번 같이 볼게요. 어디서 막혔는지부터 보여주세요.',
    schedule: stress >= 70
      ? '일정이 조금 빡빡하긴 해요. 조정 가능한 부분부터 같이 맞춰보죠.'
      : careful
        ? '현재 일정이면 가능할 것 같아요. 변동만 없으면 그대로 가면 됩니다.'
        : '저는 지금 일정이면 괜찮아요. 바뀌는 게 있으면 서로 바로 공유해요.',
    collab: reserved && !close
      ? '저는 제 파트는 제가 처리해도 괜찮아요. 겹치는 부분만 정리하면 될 것 같아요.'
      : warm
        ? '좋아요, 나눠서 하면 훨씬 편하죠. 서로 맡을 부분만 정해봐요.'
        : '업무량 많으면 나누는 게 낫겠네요. 담당만 깔끔하게 정하죠.',
    opinion: direct
      ? '저는 큰 방향은 괜찮은데 실행 기준이 조금 애매했어요. 담당이랑 일정부터 정하면 좋겠어요.'
      : careful
        ? '방향 자체는 괜찮아 보여요. 다만 세부 조건은 한번 더 확인했으면 좋겠어요.'
        : warm
          ? '내용은 괜찮았어요. 다만 다들 이미 바빠 보여서 현실적으로 가능한 정도로 갔으면 해요.'
          : '저도 대체로 괜찮게 봤어요. 진행 전에 세부 내용만 조금 정리하면 될 것 같아요.',
    client: warm
      ? '그런 요청 계속 받으면 피곤하죠. 일단 필요한 부분부터 정리해서 차분하게 답하는 게 좋겠어요.'
      : direct
        ? '광고주 요청은 기준을 한번 잡아야 해요. 계속 바뀌면 일정만 밀려요.'
        : careful
          ? '요청사항을 항목별로 정리해서 확인받는 게 좋겠어요. 기록 남겨두는 것도 필요하고요.'
          : '한번 정리해서 최종 방향을 확인받는 게 좋겠어요. 그래야 다음 수정도 줄어요.',
    performance: careful
      ? '수치 하나만 보고 결정하긴 어려워요. 기간이랑 세부 지표를 같이 보는 게 좋겠어요.'
      : direct
        ? '성과 안 나는 구간부터 바로 잘라서 봐야죠. 원인부터 찾고 조정하면 돼요.'
        : warm
          ? '일단 너무 급하게 건드리진 말고 같이 원인부터 봐요. 생각보다 단순한 문제일 수도 있어요.'
          : '데이터를 조금 더 나눠서 봐야겠네요. 어디서 변했는지부터 확인해보죠.',
    creative: '기존에 잘 나온 포인트는 살리고 새 버전을 테스트해보면 좋겠어요. 한 번에 너무 많이 바꾸진 말고요.',
    report: careful
      ? '수치, 원인, 다음 액션 순서로 정리하면 설명하기 편해요. 전주 대비 변화도 같이 넣죠.'
      : direct
        ? '안 좋은 숫자도 그대로 보여주고 액션까지 붙이면 돼요. 괜히 돌려 말할 필요는 없어요.'
        : warm
          ? '보고할 때 부담되긴 하죠. 그래도 개선안까지 같이 넣으면 훨씬 낫게 보일 거예요.'
          : '핵심 수치랑 변화 원인, 다음 액션을 같이 정리하면 좋겠어요.',
    careful: careful
      ? '네, 같이 최종 체크해봐요. 빠진 부분 없는지만 보면 될 것 같아요.'
      : '좋아요. 전달 전에 한번 같이 확인하면 마음 편하죠.',
    praise: reserved
      ? '아, 감사합니다. 나름 신경 쓴 부분인데 좋게 봐주셨네요.'
      : direct
        ? '감사해요. 결과가 괜찮았다면 다행이네요.'
        : warm
          ? '아, 고마워요. 그렇게 말해주니까 기분 좋네요.'
          : '고마워요. 다음에도 잘해볼게요.',
    thanks: warm
      ? '아니에요. 잘 끝났다니 다행이네요. 다음에도 필요하면 편하게 말해요.'
      : '별말씀을요. 잘 마무리됐으면 됐죠. 필요하면 또 말씀하세요.',
    apology: (relation.conflict || 0) >= 35
      ? '조금 신경 쓰이긴 했는데 괜찮아요. 이렇게 먼저 말해줬으니까 됐어요.'
      : '괜찮아요. 저는 크게 신경 안 썼어요. 너무 마음 쓰지 마요.',
    care: stress >= 75
      ? '조금 피곤하긴 해요. 요즘 일이 좀 몰렸어요. 그래도 물어봐줘서 고마워요.'
      : reserved
        ? '저는 괜찮아요. 조금 피곤한 정도예요.'
        : warm
          ? '저는 괜찮아요. 당신은요? 요즘도 바빠 보이던데요.'
          : '괜찮아요. 오늘은 그냥 평소 정도예요.',
    support: stress >= 65
      ? '사실 지금 조금 밀려 있어서 도움 받으면 좋을 것 같아요. 고마워요.'
      : '고마워요. 아직은 괜찮은데 바빠지면 그때 부탁할게요.',
    trust: affection >= 70
      ? '그렇게 말해주니까 고맙네요. 저도 같이 일할 때 꽤 믿고 있는 편이에요.'
      : '고마워요. 그렇게 봐주신 만큼 결과로 보여드릴게요.',
    feedback: direct
      ? '굳이 말하면 가끔 너무 혼자 다 처리하려고 하는 것 같아요. 필요한 건 빨리 공유해도 괜찮아요.'
      : careful
        ? '큰 문제는 없는데 중간 공유가 조금만 더 있으면 같이 일하기 편할 것 같아요.'
        : warm
          ? '딱히 불편한 건 없어요. 너무 혼자 부담 안고 있지 않았으면 좋겠어요.'
          : '크게 불편한 건 없어요. 필요한 건 서로 바로 얘기하면 될 것 같아요.',
    bond: close
      ? '저도 그렇게 느껴요. 예전보다 훨씬 편하게 일하는 것 같아요.'
      : reserved
        ? '저도 예전보다는 편해진 것 같아요. 일할 때 호흡도 괜찮고요.'
        : '맞아요. 같이 일할 때 점점 편해지는 것 같아요.',
    lunch: stress >= 80
      ? '오늘은 시간이 좀 애매해서 간단히 먹을 것 같아요. 다음에 같이 먹어요.'
      : reserved && !close
        ? '저는 아무거나 괜찮아요. 가까운 데서 간단히 먹죠.'
        : '좋아요. 저도 배고팠어요. 뭐 먹을까요?',
    coffee: stress >= 80
      ? '지금은 조금 바빠서 바로 나가긴 어렵겠어요. 이거 끝나고 시간 되면 같이 가요.'
      : reserved && !close
        ? '네, 잠깐이면 괜찮아요. 저도 커피는 좀 필요했어요.'
        : '좋아요. 잠깐 다녀와요. 저도 커피 마시고 싶었어요.',
    leave: stress >= 70
      ? '오늘은 조금 늦을 것 같아요. 남은 거만 정리하고 가려고요.'
      : '오늘은 정시에 갈 수 있을 것 같아요. 크게 남은 일은 없어요.',
    weekend: reserved
      ? '그냥 집에서 쉬었어요. 약속 없이 푹 쉬는 편이에요.'
      : '친구 만나거나 카페 갔다가 쉬었어요. 주말은 진짜 빨리 가네요.',
    smalltalk: stress >= 75
      ? '오늘은 좀 정신없었어요. 그래도 이제 거의 끝나가서 다행이네요.'
      : warm
        ? '오늘은 그냥 괜찮았어요. 당신은 오늘 어땠어요?'
        : '그냥 평범했어요. 조금 피곤한 정도예요.',
    food: '저는 너무 멀지만 않으면 괜찮아요. 메뉴는 가서 보고 정해도 될 것 같아요.',
    snack: '저도 단 거 좀 당기네요. 편의점 가면 같이 뭐 하나 사요.',
    commute: '오늘 출근길 좀 힘들었어요. 회사 오기도 전에 체력 빠진 느낌이네요.',
    weather: '그러게요. 요즘 날씨가 애매해서 옷 입기 어렵네요. 아침이랑 낮 차이도 크고요.',
    condition: '어제는 그냥저냥 잤어요. 오늘 조금 피곤하긴 한데 괜찮아요.',
    hobby: reserved
      ? '집에서 혼자 쉬는 걸 제일 좋아해요. 영상 보거나 게임하는 편이에요.'
      : '요즘은 영상 보거나 음악 듣는 시간이 제일 편해요. 주말엔 가끔 밖에도 나가고요.',
    personality: '어느 정도는 맞는 것 같아요. 그래도 사람 상대할 때랑 일할 때는 조금 다른 편인 것 같고요.',
  }

  return (
    banks[kind] ??
    (choice.group === '업무'
      ? '저는 그 방향 괜찮다고 봐요. 세부 내용만 한번 확인해보죠.'
      : choice.group === '관계'
        ? '그렇게 말해줘서 고마워요. 저도 편하게 생각하고 있어요.'
        : '저는 괜찮아요. 이런 얘기 하는 것도 좋네요.')
  )
}

// 원본 relationDeltaForWorkplaceChoice verbatim 포팅.
export function relationDeltaForTalkChoice(
  npc: WorkforceMember,
  choice: TalkChoice,
  relation: RelationEntry,
  talker: WorkforceMember
): { affection: number; trust: number; conflict: number } {
  const compat = workplaceChoiceCompatibility(npc, choice, relation, talker)
  let affection = 0
  let trust = 0
  let conflict = 0
  const kind = choice.kind || 'smalltalk'

  if (choice.group === '업무') {
    trust = 1
    if (['complete', 'priority', 'careful', 'report', 'performance', 'schedule'].includes(kind)) trust += 1
    if (kind === 'complete' && (hasTrait(npc, '책임감 강함') || hasTrait(npc, '꼼꼼함'))) trust += 1
    if (['help', 'collab'].includes(kind) && (hasTrait(npc, '협업형') || hasTrait(npc, '친화적'))) affection += 1
  } else if (choice.group === '관계') {
    affection = 1
    if (['praise', 'thanks', 'support', 'bond', 'trust'].includes(kind)) affection += 1
    if (['trust', 'feedback', 'apology', 'support'].includes(kind)) trust += 1
    if (kind === 'apology') conflict -= 2
  } else if (choice.group === '일상') {
    affection = 1
    if (compat >= 1) affection += 1
    if (compat < 0) affection = 0
  }

  if (compat >= 2 && choice.group !== '일상') trust += 1

  return { affection: clamp(affection, -4, 4), trust: clamp(trust, -4, 4), conflict: clamp(conflict, -4, 4) }
}

// 원본 topicCompatibility verbatim 포팅.
function topicCompatibility(npc: WorkforceMember, topic: TalkTopic): number {
  let score = 0
  if (topic === 'work' && (hasTrait(npc, '책임감 강함') || hasTrait(npc, '꼼꼼함') || npc.workStyle === '성과집착형')) score += 2
  if (topic === 'casual' && (hasTrait(npc, '친화적') || hasTrait(npc, '공감형') || hasTrait(npc, '즉흥적'))) score += 2
  if (topic === 'hobby' && (hasTrait(npc, '창의적') || hasTrait(npc, '변화 선호') || hasTrait(npc, '즉흥적'))) score += 2
  if (topic === 'worry' && (hasTrait(npc, '공감형') || hasTrait(npc, '친화적') || hasTrait(npc, '책임감 강함'))) score += 3
  if (topic === 'praise' && (hasTrait(npc, '경쟁적') || hasTrait(npc, '완벽주의') || hasTrait(npc, '책임감 강함'))) score += 2
  if (topic === 'worry' && hasTrait(npc, '독립적')) score -= 1
  return score
}

export interface TalkMemory {
  topic: TalkTopic
  text: string
}

// 원본 maybeCreateMemory verbatim 포팅 (protagonistMemories.unshift 호출은 저장 책임이 아니라서 뺌 —
// 호출부(app/actions/talk.ts)가 반환값을 talk_memories에 insert한다).
export function maybeCreateTalkMemory(npc: WorkforceMember, choice: TalkChoice, positive: boolean, relation: RelationEntry): TalkMemory | null {
  const compat = topicCompatibility(npc, choice.topic)
  const close = (relation.affection + relation.trust) / 2
  const chance = 0.12 + (positive ? 0.12 : 0) + Math.max(0, compat) * 0.03 + (close >= 70 ? 0.08 : 0)
  if (Math.random() > chance) return null
  const texts: Record<TalkTopic, string> = {
    casual: `별일 없는 날, ${npc.name}과(와) 한참 사소한 이야기를 나눴다.`,
    work: `업무 이야기를 하다가 ${npc.name}의 일하는 방식과 생각을 조금 더 이해하게 됐다.`,
    hobby: `${npc.name}이(가) 좋아하는 것에 대해 처음으로 길게 이야기를 들었다.`,
    worry: `${npc.name}이(가) 평소 쉽게 말하지 않던 속마음을 조금 털어놓았다.`,
    praise: `${npc.name}에게 진심으로 잘한 점을 말해줬고, 그 말이 오래 남은 듯했다.`,
  }
  return { topic: choice.topic, text: texts[choice.topic] ?? `${npc.name}과(와) 기억에 남는 대화를 나눴다.` }
}

// 원본 hasTalkedWithEmployeeToday verbatim: in-game 날짜(state.date) 기준 하루 1회 제한.
export function hasTalkedToday(lastTalkedDate: string | null, companyDate: string): boolean {
  return lastTalkedDate === companyDate
}
