import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  GENDERS,
  JOB_RANKS,
  TEAMS,
  JOB_ROLES,
  WORK_STYLES,
  MBTI_TYPES,
  TRAITS,
  type ProfileInput,
} from '@/lib/validation/profile'

function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
}: {
  id: string
  name: string
  label: string
  options: readonly string[]
  defaultValue: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="border-input h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

function TraitPicker({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked: readonly string[]
}) {
  return (
    <div className="col-span-full">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label} · 최대 5개</p>
      <div className="flex flex-wrap gap-2">
        {TRAITS.map((trait) => (
          <label
            key={trait}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-input bg-background px-3 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground"
          >
            <input
              type="checkbox"
              name={name}
              value={trait}
              defaultChecked={defaultChecked.includes(trait)}
              className="size-3 accent-primary"
            />
            {trait}
          </label>
        ))}
      </div>
    </div>
  )
}

export function ProfileFormFields({
  action,
  profile,
  error,
  submitLabel = '저장하기',
  redirectTo,
}: {
  action: (formData: FormData) => void
  profile: ProfileInput
  error?: string
  submitLabel?: string
  redirectTo?: string
}) {
  return (
    <form action={action} className="grid gap-6 sm:grid-cols-[180px_1fr]">
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-accent/60 p-6 text-center">
        <div className="grid size-20 place-items-center rounded-full border-4 border-background bg-[image:linear-gradient(135deg,#ffdce9,#f2e9ff)] text-4xl shadow-md shadow-primary/20">
          🌸
        </div>
        <p className="text-sm font-extrabold">{profile.name || '나의 캐릭터'}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          이름·팀·직급·직무·성격·능력치를 입력한 뒤 저장해주세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="col-span-full grid gap-2">
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" required maxLength={20} placeholder="주인공 이름" defaultValue={profile.name} />
        </div>

        <SelectField id="gender" name="gender" label="성별" options={GENDERS} defaultValue={profile.gender} />
        <SelectField id="team" name="team" label="소속팀" options={TEAMS} defaultValue={profile.team} />
        <SelectField id="rank" name="rank" label="직급" options={JOB_RANKS} defaultValue={profile.rank} />
        <SelectField id="role" name="role" label="담당 업무" options={JOB_ROLES} defaultValue={profile.role} />
        <SelectField id="work_style" name="work_style" label="업무 스타일" options={WORK_STYLES} defaultValue={profile.work_style} />
        <SelectField id="mbti" name="mbti" label="MBTI" options={MBTI_TYPES} defaultValue={profile.mbti} />

        <div className="grid gap-2">
          <Label htmlFor="skill">실무</Label>
          <Input id="skill" name="skill" type="number" min={0} max={100} defaultValue={profile.skill} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sales">영업</Label>
          <Input id="sales" name="sales" type="number" min={0} max={100} defaultValue={profile.sales} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="crisis">위기대응</Label>
          <Input id="crisis" name="crisis" type="number" min={0} max={100} defaultValue={profile.crisis} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="stress">스트레스</Label>
          <Input id="stress" name="stress" type="number" min={0} max={100} defaultValue={profile.stress} />
        </div>

        <TraitPicker name="traits" label="나의 성격 특성" defaultChecked={profile.traits} />
        <TraitPicker name="pref_traits" label="좋아하는 이성의 성격 특성" defaultChecked={profile.pref_traits} />

        <div className="col-span-full rounded-xl border border-border bg-accent/60 p-3 text-xs leading-relaxed text-muted-foreground">
          저장한 정보는 실제 시뮬레이션에 반영됩니다. 주인공도 회사 인력 1명으로 처리용량·평균 실무력·스트레스 계산에 포함되며, 직무와 업무 스타일에 따라 업무 성과와 관계 이벤트의 내용이 달라집니다.
        </div>

        {error && <p className="col-span-full text-sm text-destructive">{decodeURIComponent(error)}</p>}
        <Button type="submit" className="col-span-full">{submitLabel}</Button>
      </div>
    </form>
  )
}
