import { useEffect, useErrorBoundary, useState } from 'preact/hooks'
import { detectLang, t } from '../i18n'
import { load, subscribe } from '../domain/storage'
import type { AppData, Lang } from '../domain/types'
import { Welcome } from './screens/Welcome'
import { Today } from './screens/Today'
import { PlanScreen } from './screens/PlanScreen'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { Button, TabBar, type TabId } from './components'

/**
 * Si algo falla al pintar, Preact deja el DOM anterior en pantalla y no avisa:
 * la app parece congelada. Esto lo convierte en un mensaje legible con el error
 * a la vista, para poder arreglarlo en vez de adivinar.
 */
function Crash({ error, onReset, lang }: { error: unknown; onReset: () => void; lang: Lang }) {
  const es = lang === 'es'
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const stack = error instanceof Error && error.stack ? error.stack : ''
  return (
    <div style="max-width:34rem;margin:0 auto;padding:48px 22px">
      <h1 class="dsp" style="font-size:26px">{es ? 'Algo se ha roto' : 'Something broke'}</h1>
      <p style="font-size:14px;color:var(--ink-2);line-height:1.5;margin:10px 0 0">
        {es
          ? 'La app ha fallado al dibujar esta pantalla. Tus datos siguen guardados. Copia este texto y pásamelo, es lo que necesito para arreglarlo.'
          : 'The app failed while drawing this screen. Your data is still saved. Copy this text and send it over — it is what I need to fix it.'}
      </p>
      <pre
        class="mono"
        style="margin:14px 0 0;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:var(--danger);max-height:44vh;overflow:auto"
      >
        {msg}
        {stack ? '\n\n' + stack : ''}
      </pre>
      <div style="margin-top:14px">
        <Button variant="ghost" onClick={onReset}>
          {es ? 'Volver a intentarlo' : 'Try again'}
        </Button>
      </div>
    </div>
  )
}

export function App() {
  const [data, setData] = useState<AppData>(() => load())
  const [lang, setLang] = useState<Lang>(() => load().config?.lang ?? detectLang())
  const [tab, setTab] = useState<TabId>('hoy')
  const [error, resetError] = useErrorBoundary()

  useEffect(() => subscribe(setData), [])

  useEffect(() => {
    if (data.config?.lang) setLang(data.config.lang)
  }, [data.config?.lang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t(lang, 'appName')
  }, [lang])

  if (error) return <Crash error={error} onReset={resetError} lang={lang} />

  if (!data.config) return <Welcome lang={lang} onLang={setLang} />

  const labels: Record<TabId, string> = {
    hoy: t(lang, 'tabToday'),
    plan: t(lang, 'tabPlan'),
    prog: t(lang, 'tabProgress'),
    ajustes: t(lang, 'tabSettings'),
  }

  return (
    <>
      <div style="padding-bottom:calc(66px + env(safe-area-inset-bottom,0px))">
        {tab === 'hoy' ? <Today data={data} lang={lang} /> : null}
        {tab === 'plan' ? <PlanScreen data={data} lang={lang} /> : null}
        {tab === 'prog' ? <Progress data={data} lang={lang} /> : null}
        {tab === 'ajustes' ? <Settings data={data} lang={lang} onLang={setLang} /> : null}
      </div>
      <TabBar active={tab} onChange={setTab} labels={labels} />
    </>
  )
}
