import { getExercise } from '../content/exercises'
import type { Lang, PlanBlock } from '../domain/types'
import { Chip, Sheet } from './components'

export function isoToday(): string {
  const d = new Date()
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

export function isoOf(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + n)
  return x
}

export function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7))
}

export function weekNumber(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const days = Math.floor((Date.now() - start.getTime()) / 86400000)
  return Math.max(1, Math.floor(days / 7) + 1)
}

export const DAY_LABELS: Record<Lang, string[]> = {
  es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
}
export const DAY_NAMES: Record<Lang, string[]> = {
  es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
}
/** Índice visual (lunes primero) → Date#getDay(). */
export const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]

export function blockSize(block: PlanBlock): string {
  if (block.metres > 0) {
    return block.reps > 1 ? `${block.reps} × ${block.metres} m` : `${block.metres} m`
  }
  if (block.seconds) {
    const s = block.seconds >= 60 ? `${Math.round(block.seconds / 60)} min` : `${block.seconds}″`
    return block.reps > 1 ? `${block.reps} × ${s}` : s
  }
  return ''
}

function ytSearch(q: string): string {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q)
}

export function BlockRow({
  block,
  lang,
  onPick,
}: {
  block: PlanBlock
  lang: Lang
  onPick: () => void
}) {
  const ex = getExercise(block.exerciseId)
  const text = ex[lang]
  const size = blockSize(block)
  return (
    <button
      type="button"
      onClick={onPick}
      style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line-2);display:flex;gap:9px;align-items:center;padding:11px 2px;cursor:pointer;min-height:48px"
    >
      <span style="flex:1">
        <span style="font-size:14px;font-weight:600;display:block">
          {text.name}
          {ex.equipment ? <span style="margin-left:6px"><Chip>{ex.equipment}</Chip></span> : null}
        </span>
        {size ? <span class="mono" style="font-size:11.5px;color:var(--ink-2);margin-top:2px;display:block">{size}</span> : null}
      </span>
      {block.restSeconds > 0 ? (
        <span class="mono" style="font-size:11.5px;color:var(--ink-3)">{block.restSeconds}″</span>
      ) : null}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  )
}

export function ExerciseSheet({
  block,
  lang,
  onClose,
}: {
  block: PlanBlock
  lang: Lang
  onClose: () => void
}) {
  const ex = getExercise(block.exerciseId)
  const text = ex[lang]
  const es = lang === 'es'
  const size = blockSize(block)
  return (
    <Sheet title={text.name} onClose={onClose}>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px">
        {size ? <Chip tone="grey">{size}</Chip> : null}
        {block.restSeconds > 0 ? (
          <Chip tone="grey">{(es ? 'descanso ' : 'rest ') + block.restSeconds + '″'}</Chip>
        ) : null}
        <Chip>{ex.equipment ?? (es ? 'sin material' : 'no equipment')}</Chip>
      </div>
      <div style="font-size:14px;line-height:1.62;color:var(--ink-2)">
        {text.detail.map((p, i) => (
          <p key={i} style="margin:0 0 12px">{p}</p>
        ))}
      </div>
      <a
        href={ytSearch(text.query)}
        target="_blank"
        rel="noopener"
        style="display:flex;align-items:center;justify-content:center;gap:9px;background:var(--accent);color:var(--card);border-radius:var(--r-btn);padding:14px;font-size:15px;font-weight:700;text-decoration:none;margin-top:4px"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2.5" y="5" width="19" height="14" rx="4" />
          <path d="m10.5 9.5 5 2.5-5 2.5z" />
        </svg>
        {es ? 'Ver en YouTube' : 'Watch on YouTube'}
      </a>
      <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:var(--ink-3)">
        {es
          ? 'Abre YouTube con una búsqueda ya escrita para este ejercicio. No fijamos un vídeo concreto porque los enlaces se rompen cuando el canal los borra.'
          : 'Opens YouTube with a search already written for this drill. We do not pin a specific video because links break when channels delete them.'}
      </p>
    </Sheet>
  )
}
