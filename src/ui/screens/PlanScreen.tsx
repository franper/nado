import { useState } from 'preact/hooks'
import { cyclePosition, sessionMetres, sessionsForWeek } from '../../domain/generator'
import type { AppData, Lang, PlanBlock, PlanSession } from '../../domain/types'
import { t } from '../../i18n'
import { Card, Chip, Label } from '../components'
import { BlockRow, DAY_INDEX, DAY_NAMES, ExerciseSheet, weekNumber } from '../shared'

function WeekDots({ week, total }: { week: number; total: number }) {
  return (
    <div style="display:flex;gap:4px">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const state = n < week ? 'done' : n === week ? 'now' : 'todo'
        const style =
          state === 'done'
            ? 'background:var(--accent);color:var(--card)'
            : state === 'now'
              ? 'background:var(--card);border:2px solid var(--accent);color:var(--accent)'
              : 'background:var(--card-2);color:var(--ink-3)'
        return (
          <div
            key={n}
            class="mono"
            style={`flex:1;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;${style}`}
          >
            {n}
          </div>
        )
      })}
    </div>
  )
}

export function PlanScreen({ data, lang }: { data: AppData; lang: Lang }) {
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [openBlock, setOpenBlock] = useState<PlanBlock | null>(null)
  const config = data.config
  const es = lang === 'es'
  if (!config) return null

  const plan = data.plan
  const cycleWeeks = plan?.cycleWeeks ?? 8
  const week = plan ? cyclePosition(weekNumber(plan.startDate), cycleWeeks) : 1
  const sessions = sessionsForWeek(config, week, cycleWeeks, data.overrides)
  const byDay = new Map<number, PlanSession[]>()
  for (const s of sessions) {
    byDay.set(s.day, [...(byDay.get(s.day) ?? []), s])
  }

  return (
    <div style="max-width:34rem;margin:0 auto;padding:44px 20px 0">
      <h1 class="dsp" style="font-size:31px;line-height:1">{t(lang, 'tabPlan')}</h1>
      <p style="margin:3px 0 0;font-size:12.5px;color:var(--ink-3)">
        {config.days.length} {es ? 'días' : 'days'} · {config.minutesPerSession} min · {es ? 'piscina de ' : 'pool '}
        {config.pool} m
      </p>

      <div style="margin-top:15px">
        <Card pad="14px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px">
            <Label>{es ? 'Ciclo actual' : 'Current cycle'}</Label>
            <span class="mono" style="font-size:11px;color:var(--accent);font-weight:600">
              {t(lang, 'weekOf', { n: week, total: cycleWeeks })}
            </span>
          </div>
          <WeekDots week={week} total={cycleWeeks} />
        </Card>
      </div>

      <div style="display:flex;flex-direction:column;gap:7px;margin-top:15px">
        {DAY_INDEX.map((d, i) => {
          const list = byDay.get(d) ?? []
          if (list.length === 0) {
            return (
              <div
                key={d}
                style="display:flex;gap:11px;align-items:center;padding:11px 13px;background:var(--card-2);border-radius:12px"
              >
                <span class="mono" style="width:34px;font-size:11px;color:var(--ink-3);font-weight:700">
                  {DAY_LABEL(lang, i)}
                </span>
                <span style="flex:1;font-size:13px;color:var(--ink-3)">{t(lang, 'rest')}</span>
              </div>
            )
          }
          return list.map((s) => {
            const isOpen = openSession === s.id
            const metres = sessionMetres(s)
            return (
              <div key={s.id} style="background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden">
                <button
                  type="button"
                  onClick={() => setOpenSession(isOpen ? null : s.id)}
                  style="width:100%;text-align:left;background:none;border:0;display:flex;gap:11px;align-items:center;padding:12px 13px;cursor:pointer;min-height:48px"
                >
                  <span class="mono" style="width:34px;font-size:11px;color:var(--accent);font-weight:700">
                    {DAY_LABEL(lang, i)}
                  </span>
                  <span style="flex:1">
                    <span style="font-size:13.5px;font-weight:600;display:block">{s.name}</span>
                    <span class="mono" style="font-size:10.5px;color:var(--ink-3);display:block;margin-top:1px">
                      {s.minutes} min{metres > 0 ? ` · ${metres} m` : ''}
                    </span>
                  </span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-3)"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style={isOpen ? 'transform:rotate(90deg)' : ''}
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
                {isOpen ? (
                  <div style="padding:0 13px 10px">
                    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px">
                      <Chip>{s.kind === 'seco' ? (es ? 'En seco' : 'Dry-land') : es ? 'Piscina' : 'Pool'}</Chip>
                      <Chip tone="grey">{es ? 'intensidad ' : 'intensity '}{s.intensity}</Chip>
                    </div>
                    {s.blocks.map((b) => (
                      <BlockRow key={b.id} block={b} lang={lang} onPick={() => setOpenBlock(b)} />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })
        })}
      </div>

      {openBlock ? <ExerciseSheet block={openBlock} lang={lang} onClose={() => setOpenBlock(null)} /> : null}
    </div>
  )
}

function DAY_LABEL(lang: Lang, visualIndex: number): string {
  return DAY_NAMES[lang][visualIndex]?.slice(0, 3).toUpperCase() ?? ''
}
