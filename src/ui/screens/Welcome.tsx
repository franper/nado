import { useState } from 'preact/hooks'
import { t } from '../../i18n'
import type { Lang } from '../../domain/types'
import { importJson } from '../../domain/storage'
import { Button, Mark, Screen } from '../components'
import { Onboarding } from './Onboarding'

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  )
}

export function Welcome({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (started) return <Onboarding lang={lang} onCancel={() => setStarted(false)} />

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
        if (!res.ok) setError(lang === 'en' ? 'That file is not a Nado backup.' : 'Ese fichero no es una copia de Nado.')
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const bullets = [t(lang, 'free'), t(lang, 'offline'), t(lang, 'private')]

  return (
    <Screen
      footer={
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                class="mono"
                onClick={() => onLang(l)}
                style={`border:0;cursor:pointer;font-size:12px;font-weight:600;padding:6px 14px;border-radius:var(--r-chip);${
                  lang === l ? 'background:var(--accent);color:var(--card)' : 'background:var(--card-2);color:var(--ink-2)'
                }`}
              >
                {l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
          <Button onClick={() => setStarted(true)}>{t(lang, 'createPlan')}</Button>
          <Button variant="ghost" onClick={pickFile}>
            {t(lang, 'restore')}
          </Button>
          {error ? <p style="margin:0;font-size:12px;color:var(--danger);text-align:center">{error}</p> : null}
          <p style="margin:6px 0 0;font-size:10.5px;line-height:1.5;color:var(--ink-3);text-align:center">
            {t(lang, 'disclaimer')}
          </p>
        </div>
      }
    >
      <div style="padding-top:18px">
        <Mark />
        <h1 class="dsp" style="font-size:42px;line-height:.98;margin-top:26px">
          {t(lang, 'appName')}
        </h1>
        <p style="margin:14px 0 0;font-size:16px;line-height:1.45;color:var(--ink-2);max-width:300px">
          {t(lang, 'tagline')}
        </p>
        <div style="display:flex;flex-direction:column;gap:11px;margin-top:26px">
          {bullets.map((b) => (
            <div key={b} style="display:flex;gap:10px;align-items:center">
              <Tick />
              <span style="font-size:14px">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  )
}
