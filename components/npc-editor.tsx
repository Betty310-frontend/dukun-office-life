'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toast } from '@/components/toast'
import { updateNpcAction, toggleNpcActiveAction } from '@/app/actions/npc'
import { GENDERS, TEAMS, JOB_RANKS, JOB_ROLES, WORK_STYLES, MBTI_TYPES, TRAITS } from '@/lib/validation/profile'

interface NpcData {
  id: number
  name: string
  gender: string
  team: string
  rank: string
  role: string
  work_style: string
  mbti: string
  traits: string[]
  pref_traits: string[]
  skill: number
  sales: number
  crisis: number
  stress: number
  active: boolean
}

const STAT_FIELDS: { key: 'skill' | 'sales' | 'crisis' | 'stress'; label: string }[] = [
  { key: 'skill', label: '실무' },
  { key: 'sales', label: '영업' },
  { key: 'crisis', label: '위기대응' },
  { key: 'stress', label: '스트레스' },
]

function SelectField({
  id,
  label,
  options,
  defaultValue,
}: {
  id: string
  label: string
  options: readonly string[]
  defaultValue: string
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function TraitPicker({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: string[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{label} · 최대 5개</p>
      <div className="flex flex-wrap gap-1">
        {TRAITS.map((t) => (
          <label
            key={t}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-input bg-background px-2 py-1 text-[11px] has-[:checked]:border-primary has-[:checked]:bg-accent"
          >
            <input type="checkbox" name={name} value={t} defaultChecked={defaultChecked.includes(t)} className="size-3 accent-primary" />
            {t}
          </label>
        ))}
      </div>
    </div>
  )
}

export function NpcEditor({ npc }: { npc: NpcData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateNpcAction(npc.id, formData)
      if (!result.ok) {
        setErrorMessage(result.message)
        return
      }
      setErrorMessage(null)
      setToast(result.message)
      if (detailsRef.current) detailsRef.current.open = false
      router.refresh()
    })
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleNpcActiveAction(npc.id)
      if (!result.ok) {
        setErrorMessage(result.message)
        return
      }
      setErrorMessage(null)
      setToast(result.message)
      if (detailsRef.current) detailsRef.current.open = false
      router.refresh()
    })
  }

  return (
    <>
      <details ref={detailsRef} className="rounded-xl border border-border">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">직원 정보 수정</summary>
        <form action={handleSave} className="grid gap-3 border-t border-border p-3">
          <div className="grid gap-1">
            <Label htmlFor={`name-${npc.id}`} className="text-[11px] text-muted-foreground">
              이름
            </Label>
            <Input id={`name-${npc.id}`} name="name" defaultValue={npc.name} className="h-8 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SelectField id="team" label="팀" options={TEAMS} defaultValue={npc.team} />
            <SelectField id="rank" label="직급" options={JOB_RANKS} defaultValue={npc.rank} />
            <SelectField id="role" label="직무" options={JOB_ROLES} defaultValue={npc.role} />
            <SelectField id="work_style" label="업무 스타일" options={WORK_STYLES} defaultValue={npc.work_style} />
            <SelectField id="gender" label="성별" options={GENDERS} defaultValue={npc.gender} />
            <SelectField id="mbti" label="MBTI" options={MBTI_TYPES} defaultValue={npc.mbti} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STAT_FIELDS.map((s) => (
              <div key={s.key} className="grid gap-1">
                <Label htmlFor={`${s.key}-${npc.id}`} className="text-[11px] text-muted-foreground">
                  {s.label}
                </Label>
                <Input
                  id={`${s.key}-${npc.id}`}
                  name={s.key}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={npc[s.key]}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>

          <TraitPicker name="traits" label="성격 특성" defaultChecked={npc.traits} />
          <TraitPicker name="pref_traits" label="선호하는 이성 특성" defaultChecked={npc.pref_traits} />

          {errorMessage && <p className="text-[11px] font-semibold text-destructive">{errorMessage}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending} className="flex-1">
              저장
            </Button>
            <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={handleToggleActive}>
              {npc.active ? '퇴사 처리' : '퇴사 취소'}
            </Button>
          </div>
        </form>
      </details>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  )
}
