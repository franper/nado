import { useState } from 'preact/hooks'
import { getExercise } from '../../content/exercises'
import { cyclePosition, sessionMetres, sessionsForWeek, trimSession, type TrimmedBlock } from '../../domain/generator'
import { kcal } from '../../domain/metrics'
import { addLog, removeLog, saveOverride } from '../../domain/storage'
import type { AppData, Config, Effort, Equipment, Lang, PlanBlock, PlanSession } from '../../domain/types'
import { t } from '../../i18n'
import { Button, Card, Chip, Label, Seg, Sheet } from '../components'
import { BlockRow, DAY_NAMES, DAY_INDEX, ExerciseSheet, blockSize, isoToday, weekNumber } from '../shared'

const EQUIP_LABEL: Record<Equipment, { es: string; en: string }> = {
  aletas: { es: 'Aletas', en: 'Fins' },
  pull: { es: 'Pull-buoy', en: 'Pull buoy' },
  tabla: { es: 'Tabla', en: 'Kickboard' },
  tubo: { es: 'Tubo frontal', en: 'Snorkel' },
  palas: { es: 'Palas', en: 'Paddles' },
}

/** Tres opciones de menos tiempo que el normal, redondeadas a múltiplos de 5. */
function trimOptions(normalMinutes: number): number[] {
  const opts = [0.33, 0.5, 0.75]
    .map((f) => Math.max(10, Math.round((normalMinutes * f) / 5) * 5))
    .filter((m) => m < normalMinutes)
  return [...new Set(opts)]
}

function TrimSheet({
  session,
  config,
  week,
  cycleWeeks,
  lang,
  onClose,
  onUse,
}: {
  session: PlanSession
  config: Config
  week: number
  cycleWeeks: number
  lang: Lang
  onClose: () => void
  onUse: (trimmed: PlanSession) => void
}) {
  const es = lang === 'es'
  const options = trimOptions(session.minutes)
  const [minutes, setMinutes] = useState<number>(options[options.length - 1] ?? session.minutes)
  const [missing, setMissing] = useState<Equipment[]>([])

  const toggle = (e: Equipment): void => {
    setMissing((m) => (m.includes(e) ? m.filter((x) => x !== e) : [...m, e]))
  }

  const result = trimSession(session, config, minutes, missing, week, cycleWeeks)
  const metres = sessionMetres(result.session)

  const changedLine = (diff: TrimmedBlock, i: number) => {
    if (!diff.after) {
      const name = diff.before ? getExercise(diff.before.exerciseId)[lang].name : ''
      return (
        <div key={i} style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;font-size:13px;border-top:1px solid var(--line-2);color:var(--ink-3);text-decoration:line-through">
          <span>{name}</span>
          <span class="mono" style="font-size:11px">{es ? 'quitado' : 'removed'}</span>
        </div>
      )
    }
    const ex = getExercise(diff.after.exerciseId)
    const size = blockSize(diff.after)
    const changedExercise = diff.before?.exerciseId !== diff.after.exerciseId
    const changedSize = diff.before && (diff.before.reps !== diff.after.reps || diff.before.metres !== diff.after.metres)
    const before = diff.before ? blockSize(diff.before) : ''
    return (
      <div key={i} style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;font-size:13px;border-top:1px solid var(--line-2)">
        <span style="font-weight:600">
          {ex[lang].name}
          {size ? ` · ${size}` : ''}
        </span>
        {changedExercise ? (
          <span class="mono" style="font-size:11px;color:var(--ink-3)">{es ? 'sin material' : 'no equipment'}</span>
        ) : changedSize ? (
          <span class="mono" style="font-size:11px;color:var(--ink-3)">{es ? 'era ' : 'was '}{before}</span>
        ) : null}
      </div>
    )
  }

  return (
    <Sheet title={es ? 'Hoy no puedo con esto' : "Can't do this today"} onClose={onClose}>
      <p style="margin:0 0 16px;font-size:13px;color:var(--ink-2);line-height:1.5">
        {es
          ? 'Dime qué ha cambiado y recorto la sesión respetando su estructura. No la pierdes, se adapta.'
          : 'Tell me what changed and I trim the session, keeping its structure. You do not lose it, it adapts.'}
      </p>

      <Label>{es ? 'Tiempo disponible' : 'Time available'}</Label>
      <Seg
        value={minutes}
        onChange={setMinutes}
        options={options.map((m) => ({ value: m, label: `${m} min` }))}
      />

      {config.equipment.length > 0 ? (
        <div style="margin-top:16px">
          <Label>{es ? 'Material que hoy no tienes' : "Equipment you don't have today"}</Label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            {config.equipment.map((e) => (
              <button
                key={e}
                type="button"
                class="mono"
                onClick={() => toggle(e)}
                style={`text-align:center;padding:9px 12px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;background:var(--card);${
                  missing.includes(e) ? 'border:2px solid var(--accent);color:var(--accent)' : 'border:1px solid var(--line);color:var(--ink-3)'
                }`}
              >
                {EQUIP_LABEL[e][lang]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style="margin-top:18px;background:var(--card-2);border-radius:14px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
          <Label>{es ? 'Sesión recortada' : 'Trimmed session'}</Label>
          <span class="mono" style="font-size:11px;color:var(--ink-3)">
            {metres > 0 ? `${metres} m · ` : ''}{result.session.minutes} min
          </span>
        </div>
        {result.blocks.map((b, i) => changedLine(b, i))}
      </div>

      <div style="margin-top:14px">
        <Button
          onClick={() => {
            onUse(result.session)
            onClose()
          }}
        >
          {es ? 'Usar esta versión' : 'Use this version'}
        </Button>
      </div>
    </Sheet>
  )
}

function dayName(lang: Lang, day: number): string {
  return DAY_NAMES[lang][DAY_INDEX.indexOf(day)] ?? ''
}

function nextLine(lang: Lang, next: { day: number; name: string }): string {
  const d = dayName(lang, next.day)
  return lang === 'es'
    ? ` La próxima sesión es el ${d.toLowerCase()}: ${next.name.toLowerCase()}.`
    : ` Next session is ${d}: ${next.name.toLowerCase()}.`
}

export function Today({ data, lang }: { data: AppData; lang: Lang }) {
  const [effort, setEffort] = useState<Effort>('normal')
  const [open, setOpen] = useState<PlanBlock | null>(null)
  const [trimFor, setTrimFor] = useState<PlanSession | null>(null)
  const config = data.config
  const es = lang === 'es'

  if (!config) return null

  const plan = data.plan
  const cycleWeeks = plan?.cycleWeeks ?? 8
  const week = plan ? cyclePosition(weekNumber(plan.startDate), cycleWeeks) : 1
  const sessions = sessionsForWeek(config, week, cycleWeeks, data.overrides)
  const day = new Date().getDay()
  const todays = sessions.filter((s) => s.day === day)

  const next = (() => {
    for (let i = 1; i <= 7; i += 1) {
      const d = (day + i) % 7
      const found = sessions.find((s) => s.day === d)
      if (found) return { day: d, name: found.name }
    }
    return null
  })()

  return (
    <div style="max-width:34rem;margin:0 auto;padding:44px 20px 0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <h1 class="dsp" style="font-size:31px;line-height:1">{t(lang, 'tabToday')}</h1>
          <p style="margin:3px 0 0;font-size:12.5px;color:var(--ink-3)">
            {dayName(lang, day)}
          </p>
        </div>
        <div
          class="mono"
          style="background:var(--card);border:1px solid var(--line);border-radius:var(--r-chip);padding:5px 11px;font-size:11px;font-weight:600;color:var(--accent);white-space:nowrap"
        >
          {t(lang, 'weekOf', { n: week, total: cycleWeeks })}
        </div>
      </div>

      {todays.length === 0 ? (
        <div style="margin-top:16px">
          <Card>
            <Chip>{t(lang, 'rest')}</Chip>
            <p style="margin:10px 0 0;font-size:14px;color:var(--ink-2);line-height:1.5">
              {es ? 'Hoy no toca. Día libre.' : 'Nothing today. Rest day.'}
              {next ? nextLine(lang, next) : ''}
            </p>
          </Card>
        </div>
      ) : null}

      {todays.map((s) => {
        const logId = `${isoToday()}__${s.id}`
        const done = Boolean(data.logs[logId])
        const burn = kcal({
          kind: s.kind,
          intensity: s.intensity,
          weightKg: config.weightKg,
          minutes: s.minutes,
          effort,
        })
        const metres = sessionMetres(s)
        return (
          <div key={s.id} style="margin-top:16px">
            <Card pad="16px">
              <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
                <Chip>{s.kind === 'seco' ? (es ? 'En seco' : 'Dry-land') : es ? 'Piscina' : 'Pool'}</Chip>
                <Chip tone="grey">{s.minutes} min</Chip>
                {metres > 0 ? <Chip tone="grey">{metres} m</Chip> : null}
              </div>
              <h2 class="dsp" style="font-size:23px;margin-top:11px">{s.name}</h2>

              <div style="margin-top:9px">
                {s.blocks.map((b) => (
                  <BlockRow key={b.id} block={b} lang={lang} onPick={() => setOpen(b)} />
                ))}
              </div>

              <div style="margin-top:14px">
                <Label>{t(lang, 'effort')}</Label>
                <Seg
                  value={effort}
                  onChange={setEffort}
                  options={[
                    { value: 'suave' as Effort, label: t(lang, 'effortEasy') },
                    { value: 'normal' as Effort, label: t(lang, 'effortNormal') },
                    { value: 'fuerte' as Effort, label: t(lang, 'effortHard') },
                  ]}
                />
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:13px;padding-top:13px;border-top:1px solid var(--line-2)">
                <span style="font-size:13px;color:var(--ink-2)">{t(lang, 'estimatedBurn')}</span>
                <span>
                  <span class="mono" style="font-size:26px;font-weight:700">{burn}</span>
                  <span style="font-size:12px;color:var(--ink-3);font-weight:600;margin-left:3px">kcal</span>
                </span>
              </div>

              <div style="margin-top:11px">
                {done ? (
                  <Button variant="ghost" onClick={() => removeLog(logId)}>
                    ✓ {t(lang, 'logged')}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      addLog({
                        id: logId,
                        date: isoToday(),
                        sessionId: s.id,
                        name: s.name,
                        minutes: s.minutes,
                        effort,
                        kcal: burn,
                        weightKg: config.weightKg,
                        ts: Date.now(),
                      })
                    }
                  >
                    {t(lang, 'logSession')}
                  </Button>
                )}
              </div>

              {s.kind === 'piscina' ? (
                <div style="margin-top:10px;text-align:center">
                  <button
                    type="button"
                    onClick={() => setTrimFor(s)}
                    style="background:none;border:0;padding:6px;font-size:13px;color:var(--accent);font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer"
                  >
                    {es ? 'Hoy no puedo con esto' : "Can't do this today"}
                  </button>
                </div>
              ) : null}
            </Card>
          </div>
        )
      })}

      {open ? <ExerciseSheet block={open} lang={lang} onClose={() => setOpen(null)} /> : null}
      {trimFor ? (
        <TrimSheet
          session={trimFor}
          config={config}
          week={week}
          cycleWeeks={cycleWeeks}
          lang={lang}
          onClose={() => setTrimFor(null)}
          onUse={(trimmed) => saveOverride(trimmed)}
        />
      ) : null}
    </div>
  )
}
