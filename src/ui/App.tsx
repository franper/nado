import { useEffect, useState } from 'preact/hooks'
import { detectLang, t } from '../i18n'
import { load, subscribe } from '../domain/storage'
import type { AppData, Lang } from '../domain/types'
import { Welcome } from './screens/Welcome'
import { Today } from './screens/Today'

/**
 * Raíz de la app.
 *
 * Sin configuración guardada se entra por la bienvenida; con configuración, a
 * la app. El resto de pantallas se van enchufando aquí.
 */
export function App() {
  const [data, setData] = useState<AppData>(() => load())
  const [lang, setLang] = useState<Lang>(() => load().config?.lang ?? detectLang())

  useEffect(() => subscribe(setData), [])
  useEffect(() => {
    if (data.config?.lang) setLang(data.config.lang)
  }, [data.config?.lang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t(lang, 'appName')
  }, [lang])

  if (!data.config) {
    return <Welcome lang={lang} onLang={setLang} />
  }

  return <Today data={data} lang={lang} />
}
