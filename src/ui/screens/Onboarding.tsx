import { useState } from 'preact/hooks'
import type { Config, ContinuousMetres, Equipment, Goal, Lang, LevelId, PoolLength } from '../../domain/types'
import { generatePlan, paddlesLocked, sessionMetres } from '../../domain/generator'
import { setConfig, setPlan, setSettings } from '../../domain/storage'
import { buildSessions } from '../../domain/generator'
import { Button, Card, Chip, Label, Note, Option, Screen, Seg, StepBar, Title } from '../components'

/** Lunes de la semana en curso, en ISO. */
function mondayIso(d = new Date()): string {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  const z = new Date(x.getTime() - x.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

const GOAL_COPY: Record<Goal, { es: [string, string]; en: [string, string] }> = {
  grasa: {
    es: ['Perder grasa', 'Más sesiones de intervalos y gasto alto. Ojo: lo decide el déficit de comida, no la piscina.'],
    en: ['Lose fat', 'More intervals and higher burn. Careful: the calorie deficit decides it, not the pool.'],
  },
  fondo: {
    es: ['Ganar fondo', 'Nadar más tiempo sin ahogarte. Volumen progresivo y respiración.'],
    en: ['Build endurance', 'Swim longer without gasping. Progressive volume and breathing.'],
  },
  tecnica: {
    es: ['Mejorar la técnica', 'Menos metros y más ejercicios. Para quien se cansa por técnica, no por forma física.'],
    en: ['Improve technique', 'Fewer metres, more drills. For people limited by technique, not fitness.'],
  },
  rendimiento: {
    es: ['Rendimiento', 'Series por ritmos a partir del test. Pide nadar ya con soltura.'],
    en: ['Performance', 'Pace-based sets from your test. Assumes you already swim comfortably.'],
  },
  tono: {
    es: ['Fuerza y tono', 'Brazos y cadera en el agua, más un bloque en seco. El tono lo construye el bloque en seco, no el agua.'],
    en: ['Strength and tone', 'Arms and hips in the water plus a dry-land block. The tone comes from the dry-land block, not the water.'],
  },
}

const EQUIP_COPY: Record<Equipment, { es: [string, string]; en: [string, string] }> = {
  aletas: {
    es: ['Aletas cortas', 'Ondulación, patada de costado y trabajo de tobillo'],
    en: ['Short fins', 'Undulation, side kicking and ankle mobility'],
  },
  pull: {
    es: ['Pull-buoy', 'Series de brazos y trabajo de dorsal'],
    en: ['Pull buoy', 'Arms-only sets and lat work'],
  },
  tabla: {
    es: ['Tabla', 'Series de piernas clásicas'],
    en: ['Kickboard', 'Classic leg sets'],
  },
  tubo: {
    es: ['Tubo frontal', 'Técnica sin tener que girar a respirar'],
    en: ['Front snorkel', 'Technique without turning to breathe'],
  },
  palas: {
    es: ['Palas', 'Más agarre y más carga en el hombro'],
    en: ['Paddles', 'More grip and more shoulder load'],
  },
}

const PADDLE_LOCK = {
  es: 'Se desbloquean a partir de nivel medio: con brazada defectuosa multiplican el riesgo de hombro.',
  en: 'Unlocked from intermediate level: with a faulty stroke they multiply shoulder risk.',
}

const DAY_LABELS = { es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] }
/** Índice visual (lunes primero) → Date#getDay(). */
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]

const CONTINUOUS: { value: ContinuousMetres; label: string; level: LevelId }[] = [
  { value: 'lt50', label: '<50', level: 'inicio' },
  { value: 'm50_200', label: '50-200', level: 'basico' },
  { value: 'm200_600', label: '200-600', level: 'medio' },
  { value: 'gt600', label: '+600', level: 'avanzado' },
]

export function Onboarding({ lang, onCancel }: { lang: Lang; onCancel: () => void }) {
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState<Goal>('grasa')
  const [days, setDays] = useState<number[]>([2, 4, 6, 0])
  const [minutes, setMinutes] = useState<30 | 45 | 60 | 75>(60)
  const [equipment, setEquipment] = useState<Equipment[]>(['aletas', 'pull'])
  const [pool, setPool] = useState<PoolLength>(25)
  const [continuous, setContinuous] = useState<ContinuousMetres>('m50_200')
  const [breathEvery, setBreathEvery] = useState<2 | 3 | 4>(3)
  const [weightKg, setWeightKg] = useState(75)
  const [heightCm, setHeightCm] = useState(175)

  const level: LevelId = CONTINUOUS.find((c) => c.value === continuous)?.level ?? 'basico'

  const config: Config = {
    goal, days, minutesPerSession: minutes, equipment, pool,
    level, continuous, breathEvery, weightKg, heightCm, lang,
  }

  const es = lang === 'es'
  const back = (): void => (step === 1 ? onCancel() : setStep(step - 1))
  const next = (): void => setStep(step + 1)

  const finish = (): void => {
    setConfig(config)
    setPlan(generatePlan(config, mondayIso()))
    setSettings({ reviewWeeks: 8, lastReview: mondayIso(), goalNoticeSeen: false })
  }

  const toggleDay = (d: number): void =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const toggleEquip = (e: Equipment): void =>
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const footer = (
    <div style="display:flex;gap:9px">
      <div style="flex:0 0 34%">
        <Button variant="ghost" onClick={back}>
          {es ? 'Atrás' : 'Back'}
        </Button>
      </div>
      <div style="flex:1">
        {step < 5 ? (
          <Button onClick={next} disabled={step === 2 && days.length === 0}>
            {es ? 'Continuar' : 'Continue'}
          </Button>
        ) : (
          <Button onClick={finish}>{es ? 'Empezar el ciclo' : 'Start the cycle'}</Button>
        )}
      </div>
    </div>
  )

  return (
    <Screen footer={footer}>
      <StepBar step={step} total={5} />

      {step === 1 ? (
        <>
          <Title sub={es ? 'Paso 1 de 5 · puedes cambiarlo cuando quieras' : 'Step 1 of 5 · you can change it later'}>
            {es ? '¿Qué buscas?' : 'What are you after?'}
          </Title>
          <div style="display:flex;flex-direction:column;gap:9px;margin-top:20px">
            {(Object.keys(GOAL_COPY) as Goal[]).map((g) => {
              const [title, body] = GOAL_COPY[g][lang]
              return (
                <Option
                  key={g}
                  title={title}
                  body={body}
                  selected={goal === g}
                  onClick={() => setGoal(g)}
                  badge={g === 'rendimiento' ? (es ? 'nivel medio' : 'intermediate') : undefined}
                />
              )
            })}
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Title sub={es ? 'Paso 2 de 5' : 'Step 2 of 5'}>{es ? '¿Cuánto puedes entrenar?' : 'How much can you train?'}</Title>
          <div style="margin-top:24px">
            <Label>{es ? 'Minutos por sesión' : 'Minutes per session'}</Label>
            <Seg
              value={minutes}
              onChange={(v) => setMinutes(v)}
              options={[30, 45, 60, 75].map((m) => ({ value: m as 30 | 45 | 60 | 75, label: String(m) }))}
            />
          </div>
          <div style="margin-top:20px">
            <Label>{es ? '¿Qué días?' : 'Which days?'}</Label>
            <div style="display:flex;gap:6px">
              {DAY_INDEX.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  class="mono"
                  onClick={() => toggleDay(d)}
                  style={`flex:1;border:0;text-align:center;padding:11px 0;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;${
                    days.includes(d)
                      ? 'background:var(--accent);color:var(--card)'
                      : 'background:var(--card);color:var(--ink-3);border:1px solid var(--line)'
                  }`}
                >
                  {DAY_LABELS[lang][i]}
                </button>
              ))}
            </div>
          </div>
          <div style="margin-top:22px">
            <Card>
              <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
                <span style="font-size:13px;color:var(--ink-2)">{es ? 'Volumen semanal estimado' : 'Estimated weekly volume'}</span>
                <span class="mono" style="font-size:20px;font-weight:700">
                  {buildSessions({ config, week: 3 }).reduce((t, s) => t + sessionMetres(s), 0).toLocaleString(lang)} m
                </span>
              </div>
              <div style="font-size:11.5px;color:var(--ink-3);line-height:1.45;margin-top:7px">
                {es
                  ? 'Se ajusta con tu nivel en el paso 4. En la semana 1 siempre se empieza por debajo.'
                  : 'It adjusts with your level in step 4. Week 1 always starts below this.'}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Title sub={es ? 'Paso 3 de 5 · sin material también hay plan' : 'Step 3 of 5 · there is a plan with no kit too'}>
            {es ? '¿Qué material tienes?' : 'What kit do you have?'}
          </Title>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px">
            {(Object.keys(EQUIP_COPY) as Equipment[]).map((e) => {
              const [title, body] = EQUIP_COPY[e][lang]
              const locked = e === 'palas' && paddlesLocked({ ...config, equipment: [...equipment, 'palas'] })
              return (
                <Option
                  key={e}
                  title={title}
                  body={body}
                  selected={equipment.includes(e)}
                  onClick={() => toggleEquip(e)}
                  locked={locked && equipment.includes(e)}
                  lockNote={PADDLE_LOCK[lang]}
                />
              )
            })}
          </div>
          <div style="margin-top:20px">
            <Label>{es ? 'Longitud de la piscina' : 'Pool length'}</Label>
            <Seg
              value={pool}
              onChange={(v) => setPool(v)}
              options={[
                { value: 25 as PoolLength, label: '25 m' },
                { value: 50 as PoolLength, label: '50 m' },
              ]}
            />
          </div>
          <div style="margin-top:16px">
            <Note>
              {es
                ? 'En piscina de 50 las series se reescriben, no se dividen: hay la mitad de paredes y los mismos metros cuestan más.'
                : 'In a 50 m pool the sets are rewritten, not halved: half the walls means the same metres cost more.'}
            </Note>
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Title sub={es ? 'Paso 4 de 5' : 'Step 4 of 5'}>{es ? '¿Cómo andas en el agua?' : 'How are you in the water?'}</Title>
          <div style="margin-top:22px">
            <Label>{es ? 'Metros que aguantas sin parar' : 'Metres you can swim without stopping'}</Label>
            <Seg value={continuous} onChange={(v) => setContinuous(v)} options={CONTINUOUS.map((c) => ({ value: c.value, label: c.label }))} />
          </div>
          <div style="margin-top:20px">
            <Label>{es ? 'Respiras cada' : 'You breathe every'}</Label>
            <Seg
              value={breathEvery}
              onChange={(v) => setBreathEvery(v)}
              options={[
                { value: 2 as const, label: es ? '2 brazadas' : '2 strokes' },
                { value: 3 as const, label: '3' },
                { value: 4 as const, label: '4+' },
              ]}
            />
          </div>
          <div style="margin-top:20px">
            <Label>{es ? 'Peso y altura' : 'Weight and height'}</Label>
            <div style="display:flex;gap:9px">
              {([
                { v: weightKg, set: setWeightKg, unit: 'kg', min: 30, max: 250 },
                { v: heightCm, set: setHeightCm, unit: 'cm', min: 120, max: 230 },
              ] as const).map((f) => (
                <div
                  key={f.unit}
                  style="flex:1;display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:9px 12px"
                >
                  <input
                    class="mono"
                    type="number"
                    inputMode="decimal"
                    value={f.v}
                    min={f.min}
                    max={f.max}
                    onInput={(e) => {
                      const n = Number((e.target as HTMLInputElement).value)
                      if (Number.isFinite(n)) f.set(Math.min(f.max, Math.max(f.min, n)))
                    }}
                    style="width:100%;border:0;background:transparent;font-size:16px;font-weight:600;outline:none"
                  />
                  <span class="mono" style="font-size:12px;color:var(--ink-3)">{f.unit}</span>
                </div>
              ))}
            </div>
            <p style="margin:7px 0 0;font-size:11.5px;color:var(--ink-3);line-height:1.45">
              {es
                ? 'Solo se usan para estimar el gasto calórico y el IMC. No salen del móvil.'
                : 'Only used to estimate calorie burn and BMI. They never leave your phone.'}
            </p>
          </div>
          <div style="margin-top:22px;background:var(--accent-deep);border-radius:var(--r-card);padding:17px;color:#FFFFFF">
            <div class="dsp" style="font-size:17px;color:#FFFFFF">
              {es ? 'Tu primera sesión es el test de 400 m' : 'Your first session is the 400 m test'}
            </div>
            <p style="margin:9px 0 0;font-size:13px;line-height:1.5;color:#B7D4D8">
              {es
                ? 'De ahí sale tu ritmo de referencia, y con él las velocidades de todas las series. Es lo que hace un entrenador, y quita de en medio la pregunta de “¿a qué ritmo voy?”.'
                : 'It gives your reference pace, and with it the speed of every set. It is what a coach does, and it removes the “how fast should I go?” question.'}
            </p>
          </div>
        </>
      ) : null}

      {step === 5 ? (
        <>
          <Title sub={es ? 'Paso 5 de 5 · ciclo de 8 semanas' : 'Step 5 of 5 · 8-week cycle'}>{es ? 'Tu plan' : 'Your plan'}</Title>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:14px">
            <Chip>{GOAL_COPY[goal][lang][0]}</Chip>
            <Chip tone="grey">{days.length} {es ? 'días' : 'days'}</Chip>
            <Chip tone="grey">{minutes} min</Chip>
            <Chip tone="grey">{pool} m</Chip>
            {equipment.length > 0 ? <Chip tone="grey">{equipment.join(' + ')}</Chip> : null}
          </div>
          <div style="margin-top:14px">
            <Card>
              <Label>{es ? 'Semana 1' : 'Week 1'}</Label>
              {buildSessions({ config, week: 1 }).map((s) => (
                <div key={s.id} style="display:flex;gap:11px;align-items:baseline;padding:10px 0;border-top:1px solid var(--line-2)">
                  <span class="mono" style="width:30px;font-size:11px;color:var(--ink-3);font-weight:600">
                    {DAY_LABELS[lang][DAY_INDEX.indexOf(s.day)]}
                  </span>
                  <span style="flex:1;font-size:13.5px;font-weight:600">{s.name}</span>
                  <span class="mono" style="font-size:11px;color:var(--ink-3)">
                    {sessionMetres(s) > 0 ? `${sessionMetres(s)} m` : `${s.minutes} min`}
                  </span>
                </div>
              ))}
            </Card>
          </div>
          {goal === 'grasa' ? (
            <div style="margin-top:14px">
              <Note tone="amber">
                {es ? (
                  <>
                    <b>Antes de empezar, algo que la app no puede hacer por ti.</b> La grasa la decide el déficit calórico.
                    Nadar suma del orden de 400-600 kcal por sesión, y el hambre al salir del agua se lo come entero si no lo vigilas.
                  </>
                ) : (
                  <>
                    <b>One thing the app cannot do for you.</b> Fat loss is decided by the calorie deficit. Swimming adds
                    roughly 400-600 kcal per session, and post-swim hunger eats all of it if you don’t watch it.
                  </>
                )}
              </Note>
            </div>
          ) : null}
          {goal === 'tono' ? (
            <div style="margin-top:14px">
              <Note tone="amber">
                {es ? (
                  <>
                    <b>El agua no tonifica por sí sola.</b> No permite carga progresiva. Por eso tu plan incluye un bloque
                    en seco: esa es la parte que construye el músculo.
                  </>
                ) : (
                  <>
                    <b>Water alone does not build tone.</b> It offers no progressive overload. That is why your plan includes
                    a dry-land block: that is the part that builds muscle.
                  </>
                )}
              </Note>
            </div>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}
