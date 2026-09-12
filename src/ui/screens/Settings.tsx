import { useState } from 'preact/hooks'
import { bmi } from '../../domain/metrics'
import { generatePlan } from '../../domain/generator'
import { exportJson, importJson, setConfig, setPlan, setTest, update } from '../../domain/storage'
import type { AppData, Lang } from '../../domain/types'
import { emptyData } from '../../domain/types'
import { Button, Card, Label, Note, Seg, Sheet } from '../components'
import { isoOf, mondayOf } from '../shared'

function download(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

export function Settings({
  data,
  lang,
  onLang,
}: {
  data: AppData
  lang: Lang
  onLang: (l: Lang) => void
}) {
  const es = lang === 'es'
  const config = data.config
  const [msg, setMsg] = useState<string | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testMetres, setTestMetres] = useState('400')
  const [confirmErase, setConfirmErase] = useState(false)
  if (!config) return null

  const imc = bmi(config.weightKg, config.heightCm)

  const saveTest = (): void => {
    const parts = testInput.split(':')
    const seconds =
      parts.length === 2
        ? Number(parts[0]) * 60 + Number(parts[1])
        : Number(testInput)
    if (!Number.isFinite(seconds) || seconds < 20 || seconds > 1800) {
      setMsg(es ? 'Pon el tiempo como m:ss, por ejemplo 8:56.' : 'Enter the time as m:ss, e.g. 8:56.')
      return
    }
    const metres = testMetres.trim() === '' ? 400 : Number(testMetres)
    if (!Number.isFinite(metres) || metres < 25 || metres > 400) {
      setMsg(es ? 'Pon los metros nadados, entre 25 y 400.' : 'Enter the metres you swam, between 25 and 400.')
      return
    }
    setTest({ date: isoOf(new Date()), seconds, ...(metres !== 400 ? { metres } : {}) })
    setMsg(es ? 'Ritmo guardado.' : 'Pace saved.')
    setTestInput('')
    setTestMetres('400')
  }

  const pickFile = (): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const res = importJson(String(reader.result))
        setMsg(
          res.ok
            ? es
              ? `Restauradas ${res.logs} sesiones.`
              : `Restored ${res.logs} sessions.`
            : es
              ? 'Ese fichero no es una copia de Nado.'
              : 'That file is not a Nado backup.',
        )
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div style="max-width:34rem;margin:0 auto;padding:44px 20px 0">
      <h1 class="dsp" style="font-size:31px;line-height:1">{es ? 'Ajustes' : 'Settings'}</h1>

      <div style="margin-top:15px">
        <Card>
          <Label>{es ? 'Tu configuración' : 'Your setup'}</Label>
          {[
            [es ? 'Objetivo' : 'Goal', config.goal],
            [es ? 'Nivel' : 'Level', config.level],
            [es ? 'Días' : 'Days', String(config.days.length)],
            [es ? 'Minutos' : 'Minutes', String(config.minutesPerSession)],
            [es ? 'Piscina' : 'Pool', `${config.pool} m`],
            [es ? 'Material' : 'Equipment', config.equipment.join(', ') || (es ? 'ninguno' : 'none')],
            [es ? 'Peso' : 'Weight', `${config.weightKg} kg`],
            [es ? 'Altura' : 'Height', `${config.heightCm} cm`],
          ].map(([k, v]) => (
            <div key={k} style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line-2);font-size:13px">
              <span style="color:var(--ink-2)">{k}</span>
              <span class="mono" style="font-weight:600;text-align:right">{v}</span>
            </div>
          ))}
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line-2)">
            <Label>{es ? '¿Sabes nadar mariposa?' : 'Can you swim butterfly?'}</Label>
            <Seg
              value={config.knowsMariposa ? 'si' : 'no'}
              onChange={(v) => setConfig({ ...config, knowsMariposa: v === 'si' })}
              options={[
                { value: 'no' as const, label: 'No' },
                { value: 'si' as const, label: es ? 'Sí, aunque sea mal' : 'Yes, even if badly' },
              ]}
            />
            <p style="margin:6px 0 0;font-size:11px;color:var(--ink-3);line-height:1.45">
              {es
                ? 'Es aparte de tu nivel. Confirmándolo aquí se desbloquea en la rotación de estilos.'
                : 'Separate from your level. Confirming it here unlocks it in the stroke rotation.'}
            </p>
          </div>
          <div style="margin-top:12px">
            <Button
              variant="ghost"
              onClick={() => {
                update((d) => ({ ...d, config: null }))
                setMsg(null)
              }}
            >
              {es ? 'Rehacer la configuración' : 'Redo the setup'}
            </Button>
          </div>
          <p style="margin:8px 0 0;font-size:11px;color:var(--ink-3);line-height:1.45">
            {es
              ? 'Rehacerla genera un plan nuevo. No borra tus sesiones registradas ni el peso.'
              : 'Redoing it generates a new plan. It does not delete your logged sessions or weights.'}
          </p>
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card>
          <Label>{es ? 'Resultado del test de 400 m' : '400 m test result'}</Label>
          <p style="margin:0 0 9px;font-size:12px;color:var(--ink-2);line-height:1.5">
            {es
              ? 'Apunta el tiempo total en minutos y segundos. Si no llegaste a los 400, pon también cuántos metros hiciste — si no, se asume que fueron los 400 completos.'
              : 'Enter the total time in minutes and seconds. If you did not reach 400, also enter how many metres you swam — otherwise the full 400 is assumed.'}
          </p>
          <div style="display:flex;gap:8px">
            <input
              class="mono"
              type="text"
              inputMode="numeric"
              placeholder="8:56"
              aria-label={es ? 'Tiempo, minutos y segundos' : 'Time, minutes and seconds'}
              value={testInput}
              onInput={(e) => setTestInput((e.target as HTMLInputElement).value)}
              style="flex:1;min-width:0;background:var(--card-2);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font-size:16px;font-weight:600"
            />
            <input
              class="mono"
              type="text"
              inputMode="numeric"
              placeholder="400"
              aria-label={es ? 'Metros nadados' : 'Metres swum'}
              value={testMetres}
              onInput={(e) => setTestMetres((e.target as HTMLInputElement).value)}
              style="width:58px;flex:none;background:var(--card-2);border:1px solid var(--line);border-radius:10px;padding:11px 6px;font-size:16px;font-weight:600;text-align:center"
            />
          </div>
          <div style="margin-top:8px">
            <Button onClick={saveTest}>{es ? 'Guardar' : 'Save'}</Button>
          </div>
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card>
          <Label>{es ? 'Idioma' : 'Language'}</Label>
          <div style="display:flex;gap:6px">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                class="mono"
                onClick={() => {
                  onLang(l)
                  setConfig({ ...config, lang: l })
                }}
                style={`flex:1;border:0;cursor:pointer;font-size:13px;font-weight:600;padding:10px;border-radius:10px;${
                  config.lang === l ? 'background:var(--accent);color:var(--card)' : 'background:var(--card-2);color:var(--ink-2)'
                }`}
              >
                {l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card>
          <Label>{es ? 'Índice de masa corporal' : 'Body mass index'}</Label>
          <p class="mono" style="font-size:26px;font-weight:700;margin:2px 0 0">{imc.toFixed(1)}</p>
          <p style="margin:7px 0 0;font-size:11.5px;color:var(--ink-3);line-height:1.5">
            {es
              ? 'El IMC solo relaciona peso y altura: no distingue músculo de grasa y no dice nada sobre composición corporal. Es contexto, no objetivo.'
              : 'BMI only relates weight and height: it does not tell muscle from fat and says nothing about body composition. Context, not a target.'}
          </p>
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card>
          <Label>{es ? 'Copia de seguridad' : 'Backup'}</Label>
          <p style="margin:0 0 11px;font-size:11.5px;color:var(--ink-3);line-height:1.5">
            {es
              ? 'Los datos viven solo en este móvil. iOS puede borrar el almacenamiento de apps web poco usadas cuando el teléfono va justo de espacio, así que exporta de vez en cuando.'
              : 'Your data lives only on this phone. iOS can clear storage for rarely used web apps when space runs low, so export from time to time.'}
          </p>
          <Button variant="ghost" onClick={() => download(exportJson(), `nado-${isoOf(new Date())}.json`)}>
            {es ? 'Exportar copia' : 'Export backup'}
          </Button>
          <Button variant="ghost" onClick={pickFile}>
            {es ? 'Restaurar desde fichero' : 'Restore from file'}
          </Button>
        </Card>
      </div>

      <div style="margin-top:11px">
        <Card>
          <Label>{es ? 'Cómo se calculan las calorías' : 'How calories are worked out'}</Label>
          <p style="margin:0;font-size:11.5px;color:var(--ink-3);line-height:1.5">
            {es
              ? 'MET × peso en kg × horas. Los MET salen del Compendium of Physical Activities: crol suave 5,8 y crol rápido y vigoroso 9,8. A cada sesión se le asigna un valor intermedio, ajustado a la baja porque parte del tiempo se pasa parado en la pared.'
              : 'MET × weight in kg × hours. MET values come from the Compendium of Physical Activities: easy freestyle 5.8, fast vigorous freestyle 9.8. Each session gets an intermediate value, adjusted down because part of the time is spent resting at the wall.'}
          </p>
          <p style="margin:8px 0 0;font-size:11.5px;color:var(--ink-3);line-height:1.5">
            <b style="color:var(--ink)">{es ? 'Es una estimación, no una medición' : 'It is an estimate, not a measurement'}</b>
            {es
              ? ', y puede desviarse un 20-30 %. Sirve para comparar tus semanas entre sí, no como cifra exacta.'
              : ', and can be off by 20-30%. Use it to compare your own weeks, not as an exact figure.'}
          </p>
        </Card>
      </div>

      {msg ? (
        <div style="margin-top:11px">
          <Note>{msg}</Note>
        </div>
      ) : null}

      <div style="margin-top:11px">
        <Card>
          <Label>{es ? 'Restablecer' : 'Reset'}</Label>
          <p style="margin:0 0 11px;font-size:11.5px;color:var(--ink-3);line-height:1.5">
            {es
              ? 'Vuelve a generar el plan desde tu configuración, descartando las ediciones a mano. No toca tus registros.'
              : 'Regenerates the plan from your setup, discarding manual edits. It does not touch your logs.'}
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              update((d) => ({ ...d, overrides: {} }))
              setPlan(generatePlan(config, isoOf(mondayOf(new Date()))))
              setMsg(es ? 'Plan regenerado.' : 'Plan regenerated.')
            }}
          >
            {es ? 'Regenerar el plan' : 'Regenerate the plan'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmErase(true)}>
            {es ? 'Borrarlo todo y empezar de cero' : 'Erase everything and start over'}
          </Button>
        </Card>
      </div>

      <p class="mono" style="margin:18px 0 4px;font-size:11px;color:var(--ink-3);text-align:center">
        Nado v{__APP_VERSION__}
      </p>

      {confirmErase ? (
        <Sheet title={es ? 'Borrar todo' : 'Erase everything'} onClose={() => setConfirmErase(false)}>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:var(--ink-2)">
            {es
              ? 'Esto borra tu configuración, tu plan, tus sesiones registradas y tu peso. Los datos solo viven en este móvil: si no has exportado una copia, no hay forma de recuperarlos.'
              : 'This erases your setup, your plan, your logged sessions and your weight. Your data only lives on this phone: if you have not exported a backup, there is no way to get it back.'}
          </p>
          <Button
            variant="danger"
            onClick={() => {
              update(() => emptyData())
              setConfirmErase(false)
              setMsg(null)
            }}
          >
            {es ? 'Sí, borrarlo todo' : 'Yes, erase everything'}
          </Button>
          <div style="margin-top:8px">
            <Button variant="ghost" onClick={() => setConfirmErase(false)}>
              {es ? 'Cancelar' : 'Cancel'}
            </Button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
