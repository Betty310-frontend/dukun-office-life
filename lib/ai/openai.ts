// 사용자 요청으로 "대화하기" 선택지/NPC 답변을 매번 OpenAI로 생성한다. 키가 없거나 요청이
// 실패/타임아웃/스키마 검증 실패하면 null을 반환한다(throw하지 않음) — 호출부(app/actions/talk.ts)가
// null이면 lib/game/talk.ts의 정적 텍스트 뱅크 폴백으로 넘어간다.
import { z } from 'zod'
import type { RelationEntry } from '@/lib/game/relations'
import { type TalkChoice, type TalkGroup, type TalkTopic } from '@/lib/game/talk'
import type { WorkforceMember } from '@/lib/game/types'

// lib/game/talk.ts의 genericChoiceReply가 실제로 쓰는 kind 어휘와 동일 — AI가 이 목록 밖의 값을
// 내면 검증 실패로 처리해 폴백으로 넘어가게 한다.
const KIND_VALUES = [
  'complete', 'priority', 'help', 'schedule', 'collab', 'opinion', 'client', 'performance', 'creative', 'report', 'careful',
  'praise', 'thanks', 'apology', 'care', 'support', 'trust', 'feedback', 'bond',
  'lunch', 'coffee', 'leave', 'weekend', 'smalltalk', 'food', 'snack', 'commute', 'weather', 'condition', 'hobby', 'personality',
] as const satisfies readonly [string, ...string[]]

const GROUP_VALUES = ['업무', '관계', '일상'] as const satisfies readonly [TalkGroup, ...TalkGroup[]]
const TOPIC_VALUES = ['work', 'praise', 'casual', 'worry', 'hobby'] as const satisfies readonly [TalkTopic, ...TalkTopic[]]

const choiceSchema = z.object({
  group: z.enum(GROUP_VALUES),
  kind: z.enum(KIND_VALUES),
  topic: z.enum(TOPIC_VALUES),
  text: z.string().min(1).max(200),
})
const choicesResponseSchema = z.object({ choices: z.array(choiceSchema).length(3) })
const replyResponseSchema = z.object({ reply: z.string().min(1).max(300) })
const fortuneResponseSchema = z.object({ fortune: z.string().min(1).max(150) })

const MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 12000

async function callOpenAI(messages: { role: 'system' | 'user'; content: string }[]): Promise<unknown | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.9,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error('[openai] request failed:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return null
    return JSON.parse(content)
  } catch (err) {
    console.error('[openai] request errored:', err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function relationLine(relation: RelationEntry): string {
  return `호감도 ${Math.round(relation.affection)}/100, 신뢰도 ${Math.round(relation.trust)}/100, 갈등도 ${Math.round(relation.conflict)}/100`
}

// 대사가 그 캐릭터답게 나오도록 WorkforceMember가 가진 정보를 전부 프롬프트에 담는다.
function characterProfileLine(p: WorkforceMember): string {
  return [
    `이름 ${p.name}`,
    `성별 ${p.gender}`,
    `팀 ${p.team}`,
    `직급 ${p.rank}`,
    `직무 ${p.role}`,
    `MBTI ${p.mbti}`,
    `업무스타일 ${p.workStyle}`,
    `성격특성 ${p.traits.join(', ') || '없음'}`,
    `선호특성(끌리는 상대 성향) ${p.prefTraits.join(', ') || '없음'}`,
    `실무 ${p.skill}/100`,
    `영업 ${p.sales}/100`,
    `위기대응 ${p.crisis}/100`,
    `스트레스 ${p.stress}/100`,
  ].join(', ')
}

export interface ConversationTurn {
  speaker: string
  text: string
}

export async function generateTalkChoices(
  npc: WorkforceMember,
  talker: WorkforceMember,
  relation: RelationEntry,
  history: ConversationTurn[] = []
): Promise<TalkChoice[] | null> {
  const system = '당신은 한국 광고대행사를 배경으로 한 회사생활 시뮬레이션 게임의 대화 생성기입니다. 반드시 JSON만 출력하세요.'
  const historyBlock = history.length
    ? `\n최근 대화 내용(오래된 순):\n${history.map((h) => `${h.speaker}: ${h.text}`).join('\n')}\n`
    : ''
  const instruction = history.length
    ? `위 대화 흐름을 자연스럽게 이어가는 ${talker.name}의 다음 발화를 정확히 3개 만들어주세요. 방금 상대가 한 말에 실제로 반응하는 내용이어야 하며, 대화 맥락과 동떨어진 화제로 갑자기 넘어가지 마세요.`
    : `${talker.name}이(가) ${npc.name}에게 건넬 수 있는 대화 시작 문장을 정확히 3개 만들어주세요.`

  const user = `${talker.name}이(가) 동료 ${npc.name}과(와) 메신저로 대화하고 있습니다.

말하는 사람(${talker.name}) 정보: ${characterProfileLine(talker)}
상대방(${npc.name}) 정보: ${characterProfileLine(npc)}
현재 관계(${talker.name}→${npc.name}): ${relationLine(relation)}
${historyBlock}
${instruction} 반드시 업무/관계/일상 카테고리(group)에서 각각 정확히 1개씩이어야 합니다.
- 업무: 실무 관련 대화
- 관계: 칭찬/격려/사과/고민 나누기 등 감정적 교류
- 일상: 점심/커피/취미 같은 사적인 가벼운 대화

각 선택지마다 kind(대화 성격, 다음 중 하나: ${KIND_VALUES.join(', ')})와 topic(다음 중 하나: work, praise, casual, worry, hobby)도 정해주세요.
text는 ${talker.name}이(가) ${npc.name}에게 직접 건네는 1인칭 발화문(직장 동료 사이 존댓말, 한 문장)으로 작성하세요. 두 사람의 성격·업무스타일·직급 차이와 현재 관계를 모두 반영해서, ${talker.name}이(가) ${npc.name}에게 실제로 할 법한 자연스러운 말투로 만들어주세요.

다음 JSON 형식으로만 답하세요: {"choices":[{"group":"...","kind":"...","topic":"...","text":"..."}, ...]} (정확히 3개, group은 각각 업무/관계/일상 하나씩)`

  const parsed = await callOpenAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  if (!parsed) return null

  const result = choicesResponseSchema.safeParse(parsed)
  if (!result.success) {
    console.error('[openai] choices schema validation failed:', result.error.message)
    return null
  }
  if (new Set(result.data.choices.map((c) => c.group)).size !== 3) return null
  return result.data.choices
}

export async function generateNpcReply(
  npc: WorkforceMember,
  talker: WorkforceMember,
  relation: RelationEntry,
  choice: TalkChoice
): Promise<string | null> {
  const system = `당신은 회사생활 시뮬레이션 게임 속 캐릭터 '${npc.name}'을(를) 연기하는 역할극 배우입니다. 반드시 JSON만 출력하세요.`
  const user = `당신의 캐릭터 정보: ${characterProfileLine(npc)}
말을 건 사람(${talker.name}) 정보: ${characterProfileLine(talker)}
방금 동료 ${talker.name}이(가) 당신에게 이렇게 말했습니다: "${choice.text}" (대화 성격: ${choice.group}/${choice.kind})
현재 관계(${talker.name}→당신): ${relationLine(relation)}

당신 캐릭터의 성격·MBTI·업무스타일·직급·스트레스 상태와 상대와의 관계를 전부 반영해서, 이 캐릭터라면 실제로 할 법한 말투로 1~2문장 답변하세요. 직장 동료 사이 존댓말을 쓰고 과도하게 길게 말하지 마세요.

다음 JSON 형식으로만 답하세요: {"reply":"..."}`

  const parsed = await callOpenAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  if (!parsed) return null

  const result = replyResponseSchema.safeParse(parsed)
  if (!result.success) {
    console.error('[openai] reply schema validation failed:', result.error.message)
    return null
  }
  return result.data.reply
}

export async function generateDailyFortune(me: WorkforceMember, dateLabel: string): Promise<string | null> {
  const system = '당신은 한국 광고대행사를 배경으로 한 회사생활 시뮬레이션 게임의 "오늘의 운세" 생성기입니다. 반드시 JSON만 출력하세요.'
  const user = `${dateLabel}, ${me.name}의 오늘의 운세를 만들어주세요.

캐릭터 정보: ${characterProfileLine(me)}

업무운·인간관계운·연애운 중 하나(또는 섞어서) 느낌으로, 귀엽고 산뜻한 톤의 짧은 운세 한두 문장을 만들어주세요. 캐릭터의 성격·MBTI·업무스타일을 살짝 반영하되 점술 용어(사주, 별자리 등)는 쓰지 말고, 회사생활/대화/관계 소재로 자연스럽게 표현하세요.

다음 JSON 형식으로만 답하세요: {"fortune":"..."}`

  const parsed = await callOpenAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  if (!parsed) return null

  const result = fortuneResponseSchema.safeParse(parsed)
  if (!result.success) {
    console.error('[openai] fortune schema validation failed:', result.error.message)
    return null
  }
  return result.data.fortune
}
