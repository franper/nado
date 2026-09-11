import { useState } from 'preact/hooks'
import { getExercise } from '../../content/exercises'
import { sessionMetres, sessionsForWeek } from '../../domain/generator'
import { kcal } from '../../domain/metrics'
import { addLog, removeLog } from '../../domain/storage'
import type { AppData, Effort, Lang, PlanSession } from '../../domain/types'
import { t } from '../../i18n'
import { Button, Card, Chip, Label, Seg } from '../components'

function isoToday(): string {
  const d = new Date()
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

function weekNumber(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const days = Math.floor((Date.now() - start.getTime()) / 86400000)
  return Math.max(1, Math.floor(days / 7) + 1)
}

function BlockRow({ block, lang }: { block: PlanSession['blocks'][number]; lang: Lang }) {
  const ex = getExercise(block.exerciseId)
  const text = ex[lang]
  const size =
    block.metres > 0
      ? block.reps > 1
        ? `${block.reps} × ${block.metres} m`
        : `${block.metres} m`
      : block.seconds
        ? `${block.reps} × ${block.seconds}″`
        : ''
  return (
    <div style="display:flex;gap:9px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line-2)">
      <div style="flex:1">
        <span style="font-size:14px;font-weight:600">{text.name}</span>
        {ex.equipment ? (
          <span style="margin-left:6px">
            <Chip>{ex.equipment}</Chip>
          </span>
        ) : null}
        {size ? <div class="mono" style="font-size:11.5px;color:var(--ink-2);margin-top:2px">{size}</div> : null}
      </div>
      {block.restSeconds > 0 ? (
        <span class="mono" style="font-size:11.5px;color:var(--ink-3)">{block.restSeconds}″</span>
      ) : null}
    </div>
  )
}

export function Today({ data, lang }: { data: AppData; lang: Lang }) {
  const [effort, setEffort] = useState<Effort>('normal')
  const config = data.config!
  const plan = data.plan
  const week = plan ? weekNumber(plan.startDate) : 1
  const cycleWeeks = plan?.cycleWeeks ?? 8
  const sessions = sessionsForWeek(config, week, cycleWeeks, data.overrides)
  const day = new Date().getDay()
  const todays = sessions.filter((s) => s.day === day)
  const es = lang === 'es'

  return (
    <div style="max-width:34rem;margin:0 auto;padding:44px 20px calc(40px + env(safe-area-inset-bottom,0px))">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <h1 class="dsp" style="font-size:31px;line-height:1">{t(lang, 'tabToday')}</h1>
        <div
          class="mono"
          style="background:var(--card);border:1px solid var(--line);border-radius:var(--r-chip);padding:5px 11px;font-size:11px;font-weight:600;color:var(--accent)"
        >
          {t(lang, 'weekOf', { n: Math.min(week, cycleWeeks), total: cycleWeeks })}
        </div>
      </div>

      {todays.length === 0 ? (
        <div style="margin-top:16px">
          <Card>
            <Chip>{t(lang, 'rest')}</Chip>
            <p style="margin:10px 0 0;font-size:14px;color:var(--ink-2)">
              {es ? 'Hoy no toca. Día libre.' : 'Nothing today. Rest day.'}
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
        return (
          <div key={s.id} style="margin-top:16px">
            <Card pad="16px">
              <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
                <Chip>{s.kind === 'seco' ? (es ? 'En seco' : 'Dry-land') : (es ? 'Piscina' : 'Pool')}</Chip>
                <Chip tone="grey">{s.minutes} min</Chip>
                {sessionMetres(s) > 0 ? <Chip tone="grey">{sessionMetres(s)} m</Chip> : null}
              </div>
              <h2 class="dsp" style="font-size:23px;margin-top:11px">{s.name}</h2>

              <div style="margin-top:9px">
                {s.blocks.map((b) => (
                  <BlockRow key={b.id} block={b} lang={lang} />
                ))}
              </div>

              <div style="margin-top:13px">
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
    </div>
  )
}
