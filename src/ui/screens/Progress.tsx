import { formatTime, pacePer100 } from '../../domain/metrics'
import type { AppData, Lang, SessionLog } from '../../domain/types'
import { t } from '../../i18n'
import { Card, Chip, Label, Stat } from '../components'
import { DAY_LABELS, addDays, isoOf, mondayOf } from '../shared'

function logsList(data: AppData): SessionLog[] {
  return Object.values(data.logs)
}

function Bars({ rows, lang }: { rows: { label: string; value: number }[]; lang: Lang }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  const es = lang === 'es'
  return (
    <>
      <div class="mono" style="font-size:10px;color:var(--ink-2);font-weight:600;margin-bottom:7px">
        {max > 0 ? `${es ? 'máx' : 'max'} ${max} kcal` : es ? 'sin datos todavía' : 'no data yet'}
      </div>
      <div style="display:flex;gap:5px;align-items:flex-end;height:96px">
        {rows.map((r) => {
          const h = r.value > 0 ? Math.max(5, Math.round((78 * r.value) / (max || 1))) : 3
          return (
            <div key={r.label} style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end">
              <div
                style={`width:100%;height:${h}px;border-radius:4px;background:${
                  r.value > 0 ? 'var(--accent)' : 'var(--card-2)'
                }`}
              />
              <span class="mono" style="font-size:9.5px;color:var(--ink-3)">{r.label}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function Progress({ data, lang }: { data: AppData; lang: Lang }) {
  const es = lang === 'es'
  const logs = logsList(data)
  const monday = mondayOf(new Date())

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = isoOf(addDays(monday, i))
    const value = logs.filter((l) => l.date === date).reduce((s, l) => s + (l.kcal || 0), 0)
    return { label: DAY_LABELS[lang][i] ?? '', value }
  })

  const weekTotal = week.reduce((s, r) => s + r.value, 0)
  const weekCount = logs.filter((l) => {
    const a = isoOf(monday)
    const b = isoOf(addDays(monday, 6))
    return l.date >= a && l.date <= b
  }).length

  let streak = 0
  for (let w = 0; w < 60; w += 1) {
    const start = addDays(monday, -7 * w)
    const a = isoOf(start)
    const b = isoOf(addDays(start, 6))
    const any = logs.some((l) => l.date >= a && l.date <= b)
    if (any) streak += 1
    else if (w === 0) continue
    else break
  }

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(monday, -7 * (7 - i))
    const a = isoOf(start)
    const b = isoOf(addDays(start, 6))
    const value = logs.filter((l) => l.date >= a && l.date <= b).reduce((s, l) => s + (l.kcal || 0), 0)
    return { label: `${start.getDate()}/${start.getMonth() + 1}`, value }
  })

  const history = logs.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 12)
  const test = data.test

  return (
    <div style="max-width:34rem;margin:0 auto;padding:44px 20px 0">
      <h1 class="dsp" style="font-size:31px;line-height:1">{t(lang, 'tabProgress')}</h1>

      <div style="display:flex;gap:7px;margin-top:15px">
        <Stat value={String(weekCount)} label={es ? 'sesiones' : 'sessions'} />
        <Stat value={String(weekTotal)} label="kcal" />
        <Stat value={String(streak)} label={es ? 'semanas' : 'weeks'} />
      </div>

      {test ? (
        <div style="margin-top:11px">
          <Card pad="14px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div>
                <Label>{es ? 'Tu ritmo · test 400 m' : 'Your pace · 400 m test'}</Label>
                <div style="font-size:11.5px;color:var(--ink-2)">{test.date}</div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-size:21px;font-weight:700">{formatTime(pacePer100(test.seconds))}</div>
                <div class="mono" style="font-size:10.5px;color:var(--ink-3)">/100 m</div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div style="margin-top:11px">
          <Card pad="14px">
            <Label>{es ? 'Tu ritmo' : 'Your pace'}</Label>
            <p style="margin:0;font-size:12.5px;color:var(--ink-2);line-height:1.5">
              {es
                ? 'Todavía no has hecho el test de 400 m. Es la primera sesión del ciclo: cuando lo hagas y apuntes el tiempo, aquí saldrá tu ritmo de referencia.'
                : 'You have not done the 400 m test yet. It is the first session of the cycle: once you do it and enter the time, your reference pace shows up here.'}
            </p>
          </Card>
        </div>
      )}

      <div style="margin-top:11px">
        <Card pad="14px">
          <Label>{es ? 'Esta semana' : 'This week'}</Label>
          <Bars rows={week} lang={lang} />
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card pad="14px">
          <Label>{es ? 'Últimas 8 semanas' : 'Last 8 weeks'}</Label>
          <Bars rows={weeks} lang={lang} />
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card pad="14px">
          <Label>{es ? 'Historial' : 'History'}</Label>
          {history.length === 0 ? (
            <p style="margin:0;font-size:13px;color:var(--ink-3);text-align:center;padding:14px 0">
              {es ? 'Todavía no hay sesiones registradas.' : 'No sessions logged yet.'}
            </p>
          ) : (
            history.map((l) => (
              <div
                key={l.id}
                style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:9px 0;border-bottom:1px solid var(--line-2)"
              >
                <span style="flex:1">
                  <span style="font-size:13.5px;font-weight:600;display:block">{l.name}</span>
                  <span class="mono" style="font-size:10.5px;color:var(--ink-3)">
                    {l.date} · {l.minutes} min
                  </span>
                </span>
                <Chip tone="grey">{l.kcal} kcal</Chip>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
