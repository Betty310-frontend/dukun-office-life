// 원본 legacy-reference/원본_V31.html 2115-2168행(톤/분위기), 2169-2301행(응답 뱅크),
// 2302-2472행(씬 타입/문구/생성), 2535-2590행(하루치 메신저 오케스트레이션)을 그대로 포팅.
// 문구·확률·가중치는 한 글자도 바꾸지 않음.
//
// 원본의 shortLine()은 파일 전체에서 정의만 되고 어디서도 호출되지 않는 죽은 코드라 포팅하지 않았다.
import { pick } from './format'
import { hasTrait, traitPairScore, workStyleCompatibility } from './compatibility'
import { relationshipScore, type ActorRef, type RelationsMap } from './relations'
import { pickTwo } from './social-events'
import { teamMembers, pickTeamWithAtLeast } from './team-events'
import type { WorkforceMember } from './types'

export function messengerTone(p: WorkforceMember): string {
  if (hasTrait(p, '직설적')) return 'direct'
  if (hasTrait(p, '공감형') || hasTrait(p, '친화적')) return 'warm'
  if (hasTrait(p, '경쟁적') || p.workStyle === '성과집착형') return 'competitive'
  if (hasTrait(p, '꼼꼼함') || p.workStyle === '정확도중시형') return 'precise'
  if (hasTrait(p, '창의적') || p.workStyle === '창의탐색형') return 'creative'
  return 'neutral'
}

export function pairMood(map: RelationsMap, a: WorkforceMember, b: WorkforceMember): number {
  const rel = (relationshipScore(map, a, b) + relationshipScore(map, b, a)) / 2
  const compat = traitPairScore(a, b) + workStyleCompatibility(a, b) * 0.5
  return rel + compat * 0.25
}

export function messengerCloseness(map: RelationsMap, a: WorkforceMember, b: WorkforceMember): string {
  const mood = pairMood(map, a, b)
  if (mood >= 0.72) return 'close'
  if (mood >= 0.3) return 'comfortable'
  if (mood <= -0.2) return 'awkward'
  return 'normal'
}

function messengerWorkReply(p: WorkforceMember, kind: string): string {
  const tone = messengerTone(p)
  const banks: Record<string, Record<string, string[]>> = {
    budget: {
      direct: ['일단 예산부터 조절해요. 이 속도면 저녁 전에 다 빠져요.', '캠페인별 소진 속도 보고 바로 나눠야겠는데요.'],
      warm: ['많이 빨리 빠지네요. 같이 캠페인별로 한번 볼까요?', '오늘 유독 빠르네요. 너무 급하게 만지지 말고 같이 확인해봐요.'],
      competitive: ['전환 좋은 쪽은 유지하고 효율 낮은 데서 바로 빼죠.', '예산은 성과 나는 쪽으로 더 몰아주는 게 낫겠어요.'],
      precise: ['시간대별 소진이랑 전환 같이 봐야 해요. 단순히 예산만 줄이면 안 될 것 같아요.', '캠페인별 일예산과 오전 소진률부터 비교해볼게요.'],
      creative: ['혹시 소재 하나가 갑자기 많이 타는 건 아닌지 봐야겠네요.', '새 소재 반응 때문에 특정 세트만 빨리 빠지는 걸 수도 있어요.'],
      neutral: ['캠페인별로 어디서 많이 쓰였는지 먼저 봐야겠네요.', '예산 소진 속도 한번 확인해볼게요.'],
    },
    conversion: {
      direct: ['클릭만 나오고 전환 없으면 랜딩이든 유입 질이든 바로 봐야죠.', '어제랑 달라진 거부터 찾는 게 빠르겠네요.'],
      warm: ['이럴 때 진짜 보고하기 부담스럽죠. 같이 원인부터 찾아봐요.', '하루 정도면 몰라도 계속 그러면 신경 쓰이겠네요. 같이 봐요.'],
      competitive: ['CTR만 좋아서는 의미 없죠. 전환 기준으로 다시 잘라야겠어요.', '전환 안 붙는 세트는 과감하게 줄이고 잘 나오는 쪽 살려야죠.'],
      precise: ['전환 태그 이상 없는지 먼저 보고, 디바이스랑 시간대까지 나눠볼게요.', '클릭 이후 이탈률이랑 전환 추적부터 확인하는 게 순서겠어요.'],
      creative: ['소재 메시지랑 랜딩 첫 화면이 안 맞는 걸 수도 있어요.', '클릭은 끌었는데 구매 의도가 약한 소재일 수도 있겠네요.'],
      neutral: ['전환 추적이랑 랜딩부터 한번 확인해보죠.', '어제랑 비교해서 달라진 부분부터 보면 될 것 같아요.'],
    },
    ctr: {
      direct: ['CTR 빠졌으면 소재 피로도부터 의심해야죠.', '노출은 같은데 클릭만 빠진 거면 소재부터 갈아야겠네요.'],
      warm: ['요즘 같은 소재 오래 써서 그런가 봐요. 새 소재 준비해두는 게 좋겠어요.', '반응이 좀 식었나 보네요. 너무 걱정 말고 새 안 한번 보죠.'],
      competitive: ['CTR 떨어진 소재는 빨리 교체하는 게 낫죠. 새 안으로 테스트 가요.', '상위 소재 기준으로 카피 다시 뽑아서 붙여보죠.'],
      precise: ['빈도랑 소재별 CTR 추이를 같이 봐야 정확해요.', '평균만 보지 말고 소재별로 떨어진 시점을 확인해보죠.'],
      creative: ['카피 톤을 완전히 한번 바꿔보면 좋겠어요. 같은 결로만 가서 익숙해진 것 같아요.', '첫 문구나 썸네일을 확 다르게 잡아봐요.'],
      neutral: ['소재별 CTR 한번 비교해봐야겠네요.', '새 소재 몇 개 테스트해보는 게 좋겠어요.'],
    },
    cpc: {
      direct: ['CPC 오른 건 경쟁 강해졌거나 품질이 빠진 거겠죠. 입찰이랑 소재 둘 다 봐야 해요.', '무작정 입찰 올리기보단 비싼 구간부터 줄이죠.'],
      warm: ['요즘 단가가 좀 오른 것 같긴 해요. 너무 급하게 건드리진 말고 같이 봐요.', '비용 올라가면 괜히 불안하죠. 그래도 전환까지 같이 봐야 할 것 같아요.'],
      competitive: ['비싼데 전환 안 나는 키워드는 바로 정리하죠.', '단가 오른 만큼 성과 못 따라오면 과감하게 빼야죠.'],
      precise: ['평균 CPC보다 키워드·디바이스별 변화를 봐야 해요.', '입찰 변경 이력부터 확인해보는 게 좋겠어요.'],
      creative: ['경쟁 센 키워드 말고 다른 메시지나 세부 키워드로 빼는 방법도 있겠네요.', '정면 경쟁 말고 다른 니즈를 잡는 소재도 테스트해보죠.'],
      neutral: ['어디서 단가가 많이 오른 건지 먼저 봐야겠네요.', 'CPC랑 전환율 같이 비교해볼게요.'],
    },
    creative: {
      direct: ['이 소재는 이제 반응 다 빠진 것 같아요. 새 거 올리죠.', '같은 소재 오래 썼으니 교체 타이밍이긴 해요.'],
      warm: ['처음엔 잘 나왔는데 이제 좀 지친 것 같네요. 새 안 준비하면 될 것 같아요.', '소재 오래 갔네요. 제작 쪽에 여유 있게 요청해볼까요?'],
      competitive: ['상위 소재 하나 더 만들어서 바로 A/B 돌리죠.', '잘 된 소재 구조는 살리고 더 센 버전 하나 뽑죠.'],
      precise: ['빈도랑 최근 7일 CTR 추이 보고 교체 시점 잡는 게 좋겠어요.', '소재별 성과 편차 확인하고 하위부터 내리죠.'],
      creative: ['이제 완전히 다른 비주얼로 한번 가보고 싶네요.', '같은 카피 말고 고객 고민부터 시작하는 버전 어때요?'],
      neutral: ['새 소재 몇 개 추가하는 게 좋겠네요.', '반응 떨어진 소재부터 교체해보죠.'],
    },
    tracking: {
      direct: ['전환 0이면 일단 추적부터 확인해야죠. 성과 판단은 그 다음이에요.', '태그 깨진 거 아닌지 먼저 체크해요.'],
      warm: ['진짜 전환 0인지 추적 문제인지부터 봐야겠네요. 괜히 광고주 놀라게 하면 안 되니까요.', '이럴 때 제일 식은땀 나죠. 일단 태그부터 확인해봐요.'],
      competitive: ['트래킹 문제면 빨리 잡아야죠. 데이터 없으면 최적화도 못 해요.', '픽셀부터 정상화하고 다시 성과 보죠.'],
      precise: ['태그 이벤트랑 랜딩 완료 페이지까지 순서대로 확인하겠습니다.', '광고 관리자 수치랑 실제 문의 데이터도 대조해봐야 해요.'],
      creative: ['랜딩 수정하면서 스크립트 빠진 건 아닌지도 봐야겠네요.', '최근 페이지 수정 이력 있으면 그쪽부터 확인해봐요.'],
      neutral: ['전환 추적부터 확인해보는 게 좋겠어요.', '실제 문의랑 광고 수치가 맞는지도 봐야겠네요.'],
    },
  }
  const group = banks[kind] || banks.conversion
  const arr = group[tone] || group.neutral
  return pick(arr)
}

function messengerClientReply(p: WorkforceMember, kind: string): string {
  const tone = messengerTone(p)
  const banks: Record<string, Record<string, string[]>> = {
    flipflop: {
      direct: ['그럼 기준을 한번 문서로 확정 받아요. 계속 바뀌면 우리도 못 맞춰요.', '말 바뀔 때마다 다 맞추면 일정만 밀려요. 이번엔 기준 잡고 가죠.'],
      warm: ['아... 그건 진짜 힘들겠네요. 계속 맞춰드리다 보면 지치죠.', '그럴 때 제일 애매하죠. 그래도 한번 정리해서 확인받는 게 좋겠어요.'],
      competitive: ['결과를 원하면 방향도 어느 정도는 맡겨줘야죠. 그건 한번 강하게 정리할 필요 있어요.', '계속 바꾸면 테스트 자체가 안 되니까 데이터 기준으로 설득해봐요.'],
      precise: ['변경 요청 이력 정리해서 최종안을 확인받는 게 좋겠어요.', '요청사항을 항목별로 정리해서 확정 답변을 받아두죠.'],
      creative: ['광고주가 원하는 그림이 계속 바뀌는 것 같네요. 레퍼런스를 몇 개 놓고 고르게 하면 낫지 않을까요?', '말로만 맞추기 어려우면 방향 세 개 정도 보여주고 선택받죠.'],
      neutral: ['한번 정리해서 최종 방향을 확인받는 게 좋겠어요.', '계속 바뀌면 우리도 힘드니까 이번엔 확답 받고 가죠.'],
    },
    pressure: {
      direct: ['성과 압박하는 건 이해해도 하루 만에 숫자 바뀌진 않죠. 데이터 기준으로 말해야 해요.', '목표 자체가 현실적인지부터 다시 얘기해야겠네요.'],
      warm: ['그런 연락 계속 받으면 진짜 부담되죠. 너무 혼자 안고 있진 마요.', '광고주 마음도 이해는 되는데 매일 압박받으면 힘들죠. 같이 정리해봐요.'],
      competitive: ['그럼 목표를 다시 쪼개서 보여줘요. 어디까지 개선 가능한지 수치로 말하는 게 낫죠.', '성과 자신 있는 구간부터 확실히 만들어서 보여주는 게 좋겠어요.'],
      precise: ['현재 지표랑 목표치 차이를 숫자로 정리해서 설명하는 게 좋겠습니다.', '단기간 개선 가능한 지표와 시간이 필요한 지표를 나눠서 보고하죠.'],
      creative: ['숫자만 보여주면 더 불안해할 수도 있어요. 개선 계획까지 같이 보여주면 좀 낫겠네요.', '전후 비교랑 다음 테스트 계획까지 한 장으로 보여주는 건 어때요?'],
      neutral: ['현재 상황이랑 개선 계획을 같이 정리해서 설명하는 게 좋겠어요.', '목표까지 얼마나 차이 나는지 먼저 보여주죠.'],
    },
    urgent: {
      direct: ['또 오늘 안에요? 우선순위부터 다시 잡아야겠네요.', '급한 건 알겠는데 기존 일정이랑 같이 조정해야죠.'],
      warm: ['또 급하게 왔어요? 오늘 일정 꽉 찼는데 힘들겠네요.', '아이고... 일단 같이 나눠서 할 수 있는지 봐요.'],
      competitive: ['급하면 핵심만 먼저 내고 나머지는 다음 차수로 넘기죠.', '시간 없으면 중요한 것부터 만들어야죠.'],
      precise: ['마감 시간과 필수 수정 범위부터 확인해주세요. 전부 다 하면 늦어요.', '우선순위와 완료 기준을 먼저 받아야 일정 계산이 됩니다.'],
      creative: ['급한 수정이면 완전히 새로 가기보다 기존 안 살려서 빠르게 잡죠.', '시간 없으니 구조는 두고 카피랑 비주얼 포인트만 바꾸는 게 낫겠어요.'],
      neutral: ['일단 꼭 필요한 수정부터 정리해보죠.', '오늘 안이면 범위를 좀 줄여야 할 것 같아요.'],
    },
    report: {
      direct: ['안 좋은 숫자 숨길 순 없죠. 원인이랑 액션까지 같이 말하면 돼요.', '성과 안 나온 건 그대로 말하고 다음 조치까지 붙이죠.'],
      warm: ['보고하기 좀 부담되죠. 그래도 원인이랑 개선안 같이 있으면 괜찮을 거예요.', '숫자 안 좋을 때 보고가 제일 싫죠. 제가 한번 같이 봐드릴까요?'],
      competitive: ['하락한 건 인정하고 다음 테스트에서 어떻게 뒤집을지 보여주죠.', '이번 주 수치보다 다음 액션을 더 확실하게 잡아야겠어요.'],
      precise: ['전주 대비 변동 원인과 조치사항을 분리해서 쓰면 됩니다.', '수치, 원인, 다음 액션 순서로 정리하면 설명하기 편해요.'],
      creative: ['리포트를 그냥 숫자 나열 말고 스토리 있게 잡아보죠. 왜 변했고 뭘 할 건지 한눈에 보이게요.', '안 좋은 수치도 테스트 인사이트로 정리하면 덜 부정적으로 보여요.'],
      neutral: ['원인이랑 개선안까지 같이 적으면 괜찮을 것 같아요.', '수치만 보내지 말고 다음 액션을 붙여서 보고하죠.'],
    },
  }
  const group = banks[kind] || banks.report
  const arr = group[tone] || group.neutral
  return pick(arr)
}

function messengerCasualReply(p: WorkforceMember, kind: string, closeEnough: boolean): string {
  const tone = messengerTone(p)
  const banks: Record<string, string[]> = {
    lunch: ['저는 오늘 국밥 같은 거 먹고 싶어요.', '저는 아무거나 괜찮은데 너무 멀지만 않았으면 좋겠어요.', '오늘은 면 종류 어때요?', '점심은 좀 제대로 먹죠. 오전부터 너무 길었어요.'],
    coffee: ['저도 커피 필요해요. 잠깐 다녀와요.', '좋아요. 저 지금 카페인 없으면 못 버틸 것 같아요.', '저는 아이스 아메리카노요. 같이 가요.', '잠깐 바람도 쐴 겸 다녀오죠.'],
    leave: ['오늘은 진짜 정시에 가고 싶네요.', '저는 이것만 마무리하면 갈 수 있을 것 같아요.', '오늘은 조금 늦을 것 같아요.', '제발 오늘은 추가 수정만 안 왔으면 좋겠어요.'],
    weekend: ['이번 주말엔 그냥 집에서 쉬려고요.', '주말엔 회사 메신저 안 보고 싶어요.', '저는 친구 만나기로 했어요.', '아무 계획 없어요. 늦잠이나 자려고요.'],
    snack: ['아까부터 단 거 계속 생각나요.', '편의점 갈 건데 뭐 필요한 거 있어요?', '누가 과자 좀 안 사오나 싶었는데요.', '저는 초콜릿 있으면 하나 부탁할게요.'],
    commute: ['오늘 지하철 진짜 사람 많더라고요.', '출근길부터 체력 다 쓴 느낌이에요.', '오늘은 생각보다 빨리 왔어요.', '비 오면 출근하는 것부터 힘들어요.'],
  }
  let arr = banks[kind] || banks.lunch
  // 원본의 tone==='reserved' 분기: messengerTone()은 절대 'reserved'를 반환하지 않아 원본에서도 죽은
  // 코드였다. 동작 동등성을 위해 그대로 옮기되, 실행되지 않는다는 점은 그대로 유지한다.
  if (tone === 'reserved' && !closeEnough) {
    if (kind === 'coffee') arr = ['저는 괜찮아요. 다녀오세요.', '잠깐이면 같이 갈게요.']
    if (kind === 'weekend') arr = ['그냥 집에서 쉬려고요.', '별 계획은 없어요.']
  }
  return pick(arr)
}

const WORK_SCENE_TYPES = [
  'budget', 'conversion', 'ctr', 'cpc', 'creative', 'tracking',
  'client_flipflop', 'client_pressure', 'client_urgent', 'client_report',
  'keyword', 'landing', 'report_deadline', 'test_result',
]
const CASUAL_SCENE_TYPES = ['lunch', 'coffee', 'leave', 'weekend', 'snack', 'commute']
const CLIENT_SCENE_TYPES = ['client_flipflop', 'client_pressure', 'client_urgent', 'client_report']

export function performanceMessengerSceneType(forced = false): string {
  const roll = Math.random()
  if (forced) {
    if (roll < 0.65) return pick(WORK_SCENE_TYPES)
    return pick(CASUAL_SCENE_TYPES)
  }
  if (roll < 0.58) return pick(WORK_SCENE_TYPES)
  if (roll < 0.78) return pick(CLIENT_SCENE_TYPES)
  return pick(CASUAL_SCENE_TYPES)
}

const SCENE_TITLES: Record<string, string> = {
  budget: '예산 소진 체크',
  conversion: '전환 급감',
  ctr: 'CTR 하락',
  cpc: 'CPC 상승',
  creative: '소재 피로도',
  tracking: '전환 추적 점검',
  client_flipflop: '광고주 방향 변경 고민',
  client_pressure: '광고주 성과 압박',
  client_urgent: '광고주 긴급 수정 요청',
  client_report: '광고주 리포트 고민',
  keyword: '검색어·키워드 정리',
  landing: '랜딩 전환 고민',
  report_deadline: '리포트 마감',
  test_result: '테스트 성과 공유',
  lunch: '점심시간',
  coffee: '커피 타임',
  leave: '퇴근 직전',
  weekend: '주말 이야기',
  snack: '간식 이야기',
  commute: '출근길 이야기',
}

export function messengerSceneTitle(type: string): string {
  return SCENE_TITLES[type] || '메신저 대화'
}

export interface MessengerLine {
  speaker: string
  text: string
}

export interface MessengerScene {
  date: string
  scene: string
  sceneType: string
  participants: ActorRef[]
  names: string[]
  lines: MessengerLine[]
  forced: boolean
  team?: string
}

function performanceMessengerLines(
  map: RelationsMap,
  type: string,
  a: WorkforceMember,
  b: WorkforceMember
): MessengerLine[] {
  const close = messengerCloseness(map, a, b)
  const lines: MessengerLine[] = []
  const add = (speaker: WorkforceMember, text: string) => lines.push({ speaker: speaker.name, text })

  if (type === 'budget') {
    add(a, pick(['오늘 예산 소진 왜 이렇게 빠르죠? 오전인데 벌써 많이 빠졌어요.', '이 캠페인 오늘 소진 속도 좀 이상해요. 평소보다 훨씬 빨라요.']))
    add(b, messengerWorkReply(b, 'budget'))
    add(a, pick(['저도 캠페인별로 나눠서 다시 볼게요.', '일단 전환 안 나오는 쪽부터 확인해볼게요.']))
  } else if (type === 'conversion') {
    add(a, pick(['클릭은 계속 나오는데 전환이 어제부터 거의 안 붙어요.', '유입은 괜찮은데 문의가 갑자기 줄었어요.']))
    add(b, messengerWorkReply(b, 'conversion'))
    add(a, pick(['추적부터 확인하고 랜딩도 같이 볼게요.', '어제 변경된 거 있는지부터 찾아볼게요.']))
  } else if (type === 'ctr') {
    add(a, pick(['소재 CTR이 지난주보다 꽤 떨어졌어요.', '노출은 비슷한데 클릭률이 계속 내려가네요.']))
    add(b, messengerWorkReply(b, 'ctr'))
    add(a, pick(['새 소재 요청 넣어둘게요.', '일단 하위 소재부터 정리해볼게요.']))
  } else if (type === 'cpc') {
    add(a, pick(['요즘 CPC가 계속 오르는데 좀 신경 쓰이네요.', '같은 키워드인데 클릭 단가가 갑자기 많이 올랐어요.']))
    add(b, messengerWorkReply(b, 'cpc'))
    add(a, pick(['비싼 구간부터 따로 볼게요.', '전환율이랑 같이 비교해서 정리해볼게요.']))
  } else if (type === 'creative') {
    add(a, pick(['이 소재 처음엔 잘 나왔는데 이제 반응이 다 빠진 것 같아요.', '소재를 너무 오래 돌렸나 봐요. 빈도도 많이 올랐어요.']))
    add(b, messengerWorkReply(b, 'creative'))
    add(a, pick(['제작팀에 새 안 요청해볼게요.', '기존 상위 소재 참고해서 새 버전 잡아볼게요.']))
  } else if (type === 'tracking') {
    add(a, pick(['광고 관리자에는 전환이 0인데 실제 문의는 들어왔다고 하네요.', '어제부터 전환 수치가 이상한데 추적 문제 같아요.']))
    add(b, messengerWorkReply(b, 'tracking'))
    add(a, pick(['랜딩 태그부터 확인해볼게요.', '실제 DB랑 광고 수치 한번 대조해볼게요.']))
  } else if (type === 'client_flipflop') {
    add(a, pick(['광고주가 어제는 A안으로 가자더니 오늘 다시 B안이 좋대요. 계속 말이 바뀌네요.', '광고주가 컨펌한 걸 또 뒤집었어요. 솔직히 조금 지쳐요.']))
    add(b, messengerClientReply(b, 'flipflop'))
    add(a, close === 'close'
      ? pick(['맞아요. 이번엔 확답 받고 움직여야겠어요.', '진짜 이번엔 정리해서 보내야겠어요. 들어줘서 고마워요.'])
      : pick(['이번에는 변경사항 정리해서 확인받아볼게요.', '최종안 확정 요청 한번 드려볼게요.']))
  } else if (type === 'client_pressure') {
    add(a, pick(['광고주가 매일 전환 왜 안 나오냐고 연락 와요. 저도 숫자 볼 때마다 부담돼요.', '성과가 조금 떨어졌는데 광고주가 계속 언제 오르냐고 물어보네요.']))
    add(b, messengerClientReply(b, 'pressure'))
    add(a, close === 'close'
      ? pick(['하... 그래도 같이 봐줘서 좀 낫네요.', '맞아요. 제가 너무 혼자 압박받고 있었나 봐요.'])
      : pick(['개선 계획까지 묶어서 다시 말씀드려볼게요.', '목표랑 현재 차이부터 정리해볼게요.']))
  } else if (type === 'client_urgent') {
    add(a, pick(['광고주가 또 오늘 안에 소재 전부 수정해달래요. 지금 다른 마감도 있는데요.', '방금 광고주가 급하게 수정 요청 보냈어요. 오늘 안에 가능하냐는데 애매하네요.']))
    add(b, messengerClientReply(b, 'urgent'))
    add(a, pick(['우선순위부터 다시 잡아볼게요.', '필수 수정만 먼저 되는지 물어봐야겠어요.']))
  } else if (type === 'client_report') {
    add(a, pick(['이번 주 성과가 별로라 광고주 리포트 보내기가 좀 부담되네요.', '전주 대비 전환이 빠졌는데 이걸 어떻게 설명해야 할지 고민이에요.']))
    add(b, messengerClientReply(b, 'report'))
    add(a, pick(['원인이랑 다음 액션까지 같이 넣어볼게요.', '그렇게 정리하면 설명하기 좀 낫겠네요.']))
  } else if (type === 'keyword') {
    add(a, pick(['검색어 보고 있는데 생각보다 엉뚱한 유입이 많아요.', '키워드 확장해둔 뒤로 비관련 검색어가 좀 많이 붙네요.']))
    add(b, messengerWorkReply(b, 'cpc'))
    add(a, pick(['제외 키워드부터 정리해둘게요.', '전환 없는 확장 키워드는 좀 줄여볼게요.']))
  } else if (type === 'landing') {
    add(a, pick(['광고 클릭은 괜찮은데 랜딩에서 많이 빠지는 것 같아요.', '소재 반응은 좋은데 문의까지 안 이어져요. 랜딩 문제일까요?']))
    add(b, messengerWorkReply(b, 'conversion'))
    add(a, pick(['모바일 첫 화면부터 다시 볼게요.', '폼 이탈이 어디서 나는지도 확인해볼게요.']))
  } else if (type === 'report_deadline') {
    add(a, pick(['오늘 리포트 마감인데 아직 데이터 정리가 덜 됐어요.', '월간 보고서 오늘 보내야 하는데 오전부터 일이 계속 끼네요.']))
    add(b, messengerClientReply(b, 'report'))
    add(a, pick(['일단 핵심 지표부터 먼저 정리할게요.', '오늘은 집중해서 먼저 끝내야겠네요.']))
  } else if (type === 'test_result') {
    add(a, pick(['새 소재 테스트했는데 기존 소재보다 전환율이 더 잘 나왔어요.', '어제 바꾼 타깃이 생각보다 반응이 괜찮네요.']))
    add(b, pick([
      messengerTone(b) === 'competitive' ? '좋네요. 그럼 예산 조금 더 붙여서 확실히 검증해보죠.' : '좋네요. 며칠 더 보고 안정적으로 유지되는지 확인해봐요.',
      '오, 잘됐네요. 바로 크게 늘리기보다 조금 더 데이터 쌓아보죠.',
    ]))
    add(a, pick(['네, 급하게 키우진 않고 조금 더 볼게요.', '이번 주까지 보고 다음 액션 잡아볼게요.']))
  } else if (CASUAL_SCENE_TYPES.includes(type)) {
    const starters: Record<string, string[]> = {
      lunch: ['점심 뭐 먹을까요? 오전부터 머리 너무 썼어요.', '오늘 점심은 좀 맛있는 거 먹고 싶네요.'],
      coffee: ['커피 마시러 갈 건데 같이 갈래요?', '잠깐 커피 사러 다녀올까요?'],
      leave: ['오늘은 다들 몇 시쯤 갈 것 같아요?', '저 오늘은 제발 정시에 가고 싶어요.'],
      weekend: ['주말에 뭐 해요? 저는 아직 아무 계획 없어요.', '이번 주말은 진짜 회사 생각 안 하고 싶네요.'],
      snack: ['당 떨어지는데 뭐 먹을 거 없나요?', '편의점 갈 건데 뭐 필요한 사람 있어요?'],
      commute: ['오늘 출근길 진짜 힘들지 않았어요?', '아침부터 지하철에 사람 너무 많았어요.'],
    }
    add(a, pick(starters[type]))
    add(b, messengerCasualReply(b, type, close === 'close' || close === 'comfortable'))
    if (Math.random() < 0.75) {
      const casualFollow: Record<string, string[]> = {
        lunch: ['좋아요. 메뉴만 빨리 정하죠.', '그럼 가까운 데로 가요.'],
        coffee: ['저도 같이 갈게요.', '잠깐 쉬었다 와요.'],
        leave: ['오늘 추가 요청만 안 오면 가능할 것 같아요.', '저도 이것만 끝내고 갈래요.'],
        weekend: ['저도 그냥 쉬고 싶어요.', '주말은 진짜 빨리 오고 빨리 끝나요.'],
        snack: ['그럼 저도 하나 부탁할게요.', '제가 같이 갈게요.'],
        commute: ['출근만 했는데 벌써 피곤하네요.', '오늘은 좀 일찍 자야겠어요.'],
      }
      add(a, pick(casualFollow[type]))
    }
  }

  if ((close === 'close' || close === 'comfortable') && Math.random() < 0.22 && lines.length < 5) {
    const tails = [
      { speaker: b.name, text: '아무튼 너무 혼자 끌어안고 있지는 마요.' },
      { speaker: b.name, text: '필요하면 제가 같이 한번 볼게요.' },
      { speaker: b.name, text: '이따 좀 한가해지면 다시 얘기해요.' },
      { speaker: b.name, text: '오늘은 너무 늦게까지 하지는 말고요.' },
    ]
    lines.push(pick(tails))
  }
  return lines
}

export function generateMessengerScene(
  map: RelationsMap,
  a: WorkforceMember,
  b: WorkforceMember,
  dateStr: string,
  forced = false
): MessengerScene {
  const type = performanceMessengerSceneType(forced)
  const lines = performanceMessengerLines(map, type, a, b)
  return {
    date: dateStr,
    scene: messengerSceneTitle(type),
    sceneType: type,
    participants: [{ type: a.type, id: a.id }, { type: b.type, id: b.id }],
    names: [a.name, b.name],
    lines,
    forced,
  }
}

export function generateDailyMessenger(map: RelationsMap, workforce: WorkforceMember[], dateStr: string): MessengerScene[] {
  if (workforce.length < 2) return []
  let count = 1
  if (workforce.length >= 4) count = 2
  if (workforce.length >= 7 && Math.random() < 0.45) count = 3

  const scenes: MessengerScene[] = []
  const used = new Set<string>()

  for (let i = 0; i < count; i++) {
    let pair: [WorkforceMember, WorkforceMember] | null = null
    for (let tries = 0; tries < 14; tries++) {
      const p = pickTwo(workforce)
      if (!p) break
      const key = [`${p[0].type}:${p[0].id}`, `${p[1].type}:${p[1].id}`].sort().join('-')
      if (!used.has(key)) {
        used.add(key)
        pair = p
        break
      }
    }
    if (pair) scenes.push(generateMessengerScene(map, pair[0], pair[1], dateStr, false))
  }

  if (Math.random() < 0.34) {
    const team = pickTeamWithAtLeast(workforce, 2)
    if (team) {
      const members = teamMembers(workforce, team)
      const shuffled = [...members].sort(() => Math.random() - 0.5).slice(0, Math.min(3, members.length))
      if (shuffled.length >= 2) {
        const s = generateMessengerScene(map, shuffled[0], shuffled[1], dateStr, false)
        s.scene = team + ' 팀 메신저 · ' + s.scene
        s.team = team
        if (shuffled.length === 3) {
          const t = s.sceneType
          let third: string
          if ([...WORK_SCENE_TYPES].includes(t)) {
            third = pick([
              '저도 데이터 한번 같이 볼게요. 필요한 거 있으면 말씀해주세요.',
              '관련 수치 제가 확인할 수 있는 건 같이 확인해볼게요.',
              '이거 정리되면 팀에 한번 공유해주세요.',
            ])
          } else if (/^client_/.test(t)) {
            third = pick([
              '광고주 쪽 요청사항 한번 정리해서 공유해주세요. 같이 맞춰보죠.',
              '필요하면 저도 같이 이야기 들어볼게요.',
              '그 건은 혼자 대응하지 말고 팀에서 같이 보는 게 좋겠어요.',
            ])
          } else {
            const casualType = pick(['lunch', 'coffee', 'leave', 'weekend', 'snack'])
            const close = messengerCloseness(map, shuffled[2], shuffled[0])
            third = messengerCasualReply(shuffled[2], casualType, close === 'close' || close === 'comfortable')
          }
          s.lines.push({ speaker: shuffled[2].name, text: third })
        }
        scenes.push(s)
      }
    }
  }

  return scenes
}
