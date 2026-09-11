import { useState } from 'preact/hooks'
import { sessionMetres, sessionsForWeek } from '../../domain/generator'
import { kcal } from '../../domain/metrics'
import { addLog, removeLog } from '../../domain/storage'
import type { AppData, Effort, Lang, PlanBlock } from '../../domain/types'
import { t } from '../../i18n'
import { Button, Card, Chip, Label, Seg } from '../components'
import { BlockRow, DAY_NAMES, DAY_INDEX, ExerciseSheet, isoToday, weekNumber } from '../shared'

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
  const config = data.config
  const es = lang === 'es'

  if (!config) return null

  const plan = data.plan
  const cycleWeeks = plan?.cycleWeeks ?? 8
  const week = plan ? weekNumber(plan.startDate) : 1
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
          {t(lang, 'weekOf', { n: Math.min(week, cycleWeeks), total: cycleWeeks })}
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
            </Card>
          </div>
        )
      })}

      {open ? <ExerciseSheet block={open} lang={lang} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}
