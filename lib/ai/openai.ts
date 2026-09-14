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

function npcProfileLine(npc: WorkforceMember): string {
  return `이름 ${npc.name}, 팀 ${npc.team}, 직급 ${npc.rank}, 직무 ${npc.role}, MBTI ${npc.mbti}, 업무스타일 ${npc.workStyle}, 성격특성 ${npc.traits.join(', ') || '없음'}, 스트레스 ${npc.stress}/100`
}

export async function generateTalkChoices(
  npc: WorkforceMember,
  talker: WorkforceMember,
  relation: RelationEntry
): Promise<TalkChoice[] | null> {
  const system = '당신은 한국 광고대행사를 배경으로 한 회사생활 시뮬레이션 게임의 대화 생성기입니다. 반드시 JSON만 출력하세요.'
  const user = `${talker.name}이(가) 동료 ${npc.name}에게 말을 걸려고 합니다.

NPC 정보: ${npcProfileLine(npc)}
현재 관계(${talker.name}→${npc.name}): ${relationLine(relation)}

${talker.name}이(가) ${npc.name}에게 건넬 수 있는 대화 시작 문장을 정확히 3개 만들어주세요. 반드시 업무/관계/일상 카테고리(group)에서 각각 정확히 1개씩이어야 합니다.
- 업무: 실무 관련 대화
- 관계: 칭찬/격려/사과/고민 나누기 등 감정적 교류
- 일상: 점심/커피/취미 같은 사적인 가벼운 대화

각 선택지마다 kind(대화 성격, 다음 중 하나: ${KIND_VALUES.join(', ')})와 topic(다음 중 하나: work, praise, casual, worry, hobby)도 정해주세요.
text는 ${talker.name}이(가) ${npc.name}에게 직접 건네는 1인칭 발화문(직장 동료 사이 존댓말, 한 문장)으로 작성하세요. NPC의 성격과 현재 관계를 고려해서 자연스럽게 만들어주세요.

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
  const user = `당신의 캐릭터 정보: ${npcProfileLine(npc)}
방금 동료 ${talker.name}이(가) 당신에게 이렇게 말했습니다: "${choice.text}" (대화 성격: ${choice.group}/${choice.kind})
현재 관계(${talker.name}→당신): ${relationLine(relation)}

이 캐릭터의 성격과 현재 관계에 맞게 1~2문장으로 자연스럽게 답변하세요. 직장 동료 사이 존댓말을 쓰고 과도하게 길게 말하지 마세요.

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
