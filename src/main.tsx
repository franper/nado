import { render } from 'preact'
import { App } from './ui/App'
import './styles/tokens.css'

const root = document.getElementById('app')
if (root) render(<App />, root)
