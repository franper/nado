import type { ComponentChildren } from 'preact'

/** Primitivas visuales compartidas. Todo sale de los tokens de tokens.css. */

export function Screen({ children, footer }: { children: ComponentChildren; footer?: ComponentChildren }) {
  return (
    <div style="min-height:100dvh;display:flex;flex-direction:column;max-width:34rem;margin:0 auto">
      <div style="flex:1;padding:46px 22px 0">{children}</div>
      {footer ? <div style="padding:12px 22px calc(30px + env(safe-area-inset-bottom,0px))">{footer}</div> : null}
    </div>
  )
}

export function Title({ children, sub }: { children: ComponentChildren; sub?: string }) {
  return (
    <div>
      <h1 class="dsp" style="font-size:30px;line-height:1.02">
        {children}
      </h1>
      {sub ? <p style="margin:5px 0 0;font-size:13px;color:var(--ink-3)">{sub}</p> : null}
    </div>
  )
}

export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div style="display:flex;gap:4px;margin-bottom:22px">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={`height:3px;flex:1;border-radius:2px;background:${
            i < step ? 'var(--accent)' : 'var(--line)'
          }`}
        />
      ))}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ComponentChildren
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const styles: Record<string, string> = {
    primary: 'background:var(--accent);color:var(--card);font-weight:700;font-size:16px;padding:15px',
    ghost: 'background:var(--card-2);color:var(--ink-2);font-weight:600;font-size:14px;padding:13px',
    danger: 'background:transparent;color:var(--danger);font-weight:600;font-size:14px;padding:13px;border:1px solid var(--line)',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={`width:100%;border:0;border-radius:var(--r-btn);text-align:center;cursor:pointer;${
        styles[variant]
      };${disabled ? 'opacity:.45' : ''}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, pad = '15px' }: { children: ComponentChildren; pad?: string }) {
  return (
    <div style={`background:var(--card);border:1px solid var(--line);border-radius:var(--r-card);padding:${pad}`}>
      {children}
    </div>
  )
}

export function Chip({ children, tone = 'soft' }: { children: ComponentChildren; tone?: 'soft' | 'grey' }) {
  const s =
    tone === 'soft'
      ? 'background:var(--accent-soft);color:var(--accent)'
      : 'background:var(--card-2);color:var(--ink-2)'
  return (
    <span class="mono" style={`${s};font-size:10px;font-weight:600;padding:3px 7px;border-radius:5px;white-space:nowrap`}>
      {children}
    </span>
  )
}

export function Option({
  title,
  body,
  selected,
  onClick,
  badge,
  locked,
  lockNote,
}: {
  title: string
  body: string
  selected?: boolean
  onClick?: () => void
  badge?: string
  locked?: boolean
  lockNote?: string
}) {
  if (locked) {
    return (
      <div style="background:var(--card);border:1px dashed var(--ink-3);border-radius:14px;padding:13px 14px;display:flex;gap:12px;align-items:center;opacity:.72">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--ink-2)">{title}</div>
          <div style="font-size:12px;color:var(--ink-3);line-height:1.42;margin-top:3px">{lockNote ?? body}</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" stroke-width="2" stroke-linecap="round">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={`width:100%;text-align:left;background:var(--card);border:${
        selected ? '2px solid var(--accent)' : '1px solid var(--line)'
      };border-radius:14px;padding:13px 14px;display:flex;gap:12px;align-items:flex-start;cursor:pointer`}
    >
      <span style="flex:1">
        <span style="font-size:15px;font-weight:700;letter-spacing:-.01em;display:block">
          {title}
          {badge ? <span style="margin-left:7px"><Chip tone="grey">{badge}</Chip></span> : null}
        </span>
        <span style="font-size:12px;color:var(--ink-2);line-height:1.42;margin-top:3px;display:block">{body}</span>
      </span>
      <span
        style={`flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;${
          selected ? 'background:var(--accent)' : 'border:1.5px solid var(--ink-3)'
        }`}
      >
        {selected ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--card)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 13 4.5 4.5L19 7" />
          </svg>
        ) : null}
      </span>
    </button>
  )
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style="display:flex;gap:3px;background:var(--card-2);border-radius:11px;padding:3px">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          class="mono"
          onClick={() => onChange(o.value)}
          style={`flex:1;border:0;text-align:center;padding:9px 2px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;${
            o.value === value
              ? 'background:var(--card);color:var(--accent);box-shadow:0 1px 2px rgba(16,21,24,.12)'
              : 'background:transparent;color:var(--ink-2)'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Label({ children }: { children: ComponentChildren }) {
  return (
    <div style="font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:9px">
      {children}
    </div>
  )
}

export function Note({ children, tone = 'teal' }: { children: ComponentChildren; tone?: 'teal' | 'amber' }) {
  const bg = tone === 'teal' ? 'var(--accent-soft)' : 'var(--warn-soft)'
  const bc = tone === 'teal' ? 'var(--accent)' : 'var(--warn)'
  return (
    <div style={`background:${bg};border-left:3px solid ${bc};border-radius:0 11px 11px 0;padding:11px 13px;font-size:12px;line-height:1.5;color:var(--ink)`}>
      {children}
    </div>
  )
}

export function Mark({ size = 58 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--accent-deep)" />
      <path
        d="M4 34C13 25 21 25 26 32c3 5 9 5 12 0 5-7 13-7 22 2"
        stroke="var(--accent-soft)"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="32" cy="27" r="5" fill="var(--accent-soft)" />
      <path
        d="M7 50c5-4 10-4 15 0s10 4 15 0 10-4 14 0"
        stroke="var(--accent)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}
