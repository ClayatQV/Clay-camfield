import { useRef, useState } from 'react'
import { activePlan, blockLen } from '../plan/model'
import { toast } from '../components/Toast'
import { CLICK_TONES, getClick, setClick, testClick } from '../lib/click'
import { formatLong, isValidKey, todayKey } from '../lib/dates'
import { planPosition, startDateFor } from '../lib/plan'
import {
  buildBackup,
  exportFileName,
  importBackup,
  resetAll,
  storageHealthy,
  updateSettings,
  useData,
  type Theme,
} from '../store/store'

export function Settings() {
  const data = useData()
  const s = data.settings
  const today = todayKey()
  const plan = activePlan(data)
  const pos = planPosition(s, today, plan)
  const blockLength = (n: number) => blockLen(plan.blocks[n - 1] ?? plan.blocks[0])
  const fileRef = useRef<HTMLInputElement>(null)
  const [pinBlock, setPinBlock] = useState(s.override?.block ?? pos.block)
  const [pinWeek, setPinWeek] = useState(s.override?.week ?? pos.week)
  const [confirmReset, setConfirmReset] = useState(false)
  const [click, setClickState] = useState(getClick)
  const changeClick = (patch: Partial<typeof click>) => {
    setClick(patch)
    setClickState((c) => ({ ...c, ...patch }))
  }

  function doExport() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('Backup downloaded')
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const msg = importBackup(await f.text())
      setClickState(getClick())
      toast(msg, 3200)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 4000)
    }
  }

  const weeksInPin = blockLength(pinBlock)

  return (
    <div className="screen">
      <div className="screen-head">
        <span className="eyebrow">Settings</span>
        <h1>Settings</h1>
      </div>

      {!storageHealthy() && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <strong>Your browser isn't saving data.</strong>
          <p className="small muted">Private browsing or full storage can block saving. Export a backup before closing the app.</p>
        </div>
      )}

      <section className="card">
        <h2>Plan</h2>
        <div className="field">
          <label htmlFor="plan-start">Plan start date</label>
          <input
            id="plan-start"
            className="input"
            type="date"
            value={s.planStart}
            onChange={(e) => isValidKey(e.target.value) && updateSettings({ planStart: e.target.value })}
          />
          <p className="small muted">
            {pos.source === 'override'
              ? `Pinned to Block ${pos.block} · Week ${pos.week}. The start date is ignored while pinned.`
              : pos.status === 'before'
                ? `The plan starts ${formatLong(s.planStart)} (in ${pos.daysUntilStart} day${pos.daysUntilStart === 1 ? '' : 's'}).`
                : pos.status === 'after'
                  ? `All ${plan.totalWeeks} weeks are done. Pick a new start date to run it again.`
                  : `Today is Block ${pos.block} · Week ${pos.week} (plan week ${pos.globalWeek} of ${plan.totalWeeks}).`}
          </p>
        </div>

        <hr className="divider" />
        <div className="stack-sm">
          <span className="label">Current block and week</span>
          <div className="row">
            <select
              className="input grow"
              aria-label="Block"
              value={pinBlock}
              onChange={(e) => {
                const b = Number(e.target.value)
                setPinBlock(b)
                setPinWeek((w) => Math.min(w, blockLength(b)))
              }}
            >
              {plan.blocks.map((b) => (
                <option key={b.n} value={b.n}>
                  Block {b.n} · {b.title}
                </option>
              ))}
            </select>
            <select className="input" style={{ width: 120 }} aria-label="Week" value={pinWeek} onChange={(e) => setPinWeek(Number(e.target.value))}>
              {Array.from({ length: weeksInPin }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <button
              className="btn sm"
              onClick={() => {
                updateSettings({ planStart: startDateFor(pinBlock, pinWeek, today, plan), override: null })
                toast(`Start date moved: today is Block ${pinBlock} · Week ${pinWeek}`)
              }}
            >
              Start this week today
            </button>
            <button
              className="btn sm"
              onClick={() => {
                updateSettings({ override: { block: pinBlock, week: pinWeek } })
                toast(`Pinned to Block ${pinBlock} · Week ${pinWeek}`)
              }}
            >
              Pin it
            </button>
            {s.override && (
              <button className="btn sm ghost" onClick={() => updateSettings({ override: null })}>
                Unpin (use start date)
              </button>
            )}
          </div>
          <p className="small muted">
            "Start this week today" moves the start date so weeks keep advancing on their own. "Pin it" holds this week until you unpin.
          </p>
        </div>
      </section>

      <section className="card">
        <h2>Session</h2>
        <div className="field">
          <span className="label">Default session length</span>
          <div className="seg full" role="group" aria-label="Default session length">
            {([30, 60] as const).map((m) => (
              <button key={m} aria-pressed={s.sessionLength === m} onClick={() => updateSettings({ sessionLength: m })}>
                {m} min
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="ladder">Speed ladder: passes per speed</label>
          <input
            id="ladder"
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={s.ladderPasses}
            onChange={(e) => updateSettings({ ladderPasses: Math.min(20, Math.max(1, Math.round(Number(e.target.value) || 1))) })}
          />
        </div>
      </section>

      <section className="card">
        <h2>Metronome click</h2>
        <p className="small muted">Used by Fretboard Lab's click. You can also change it in the Lab under "Click".</p>
        <div className="field">
          <label htmlFor="click-vol">
            Volume <span className="muted">· {click.vol}%</span>
          </label>
          <input
            id="click-vol"
            className="range"
            type="range"
            min={0}
            max={100}
            step={5}
            value={click.vol}
            onChange={(e) => changeClick({ vol: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <span className="label">Tone</span>
          <div className="seg full" role="group" aria-label="Click tone">
            {CLICK_TONES.map((t) => (
              <button key={t.id} aria-pressed={click.tone === t.id} onClick={() => changeClick({ tone: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn" onClick={() => testClick()}>
          Test click
        </button>
      </section>

      <section className="card">
        <h2>Share with Dad</h2>
        <div className="field">
          <label htmlFor="dad">Dad's phone number</label>
          <input
            id="dad"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+1 555 123 4567"
            value={s.dadPhone}
            onChange={(e) => updateSettings({ dadPhone: e.target.value })}
          />
          <p className="small muted">Used only for the text-message fallback. Stored on this phone, never sent anywhere.</p>
        </div>
      </section>

      <section className="card">
        <h2>Theme</h2>
        <div className="seg full" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} aria-pressed={s.theme === t} onClick={() => updateSettings({ theme: t })}>
              {t === 'system' ? 'Auto' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="small muted">
          Everything lives on this phone: {data.sessions.length} session{data.sessions.length === 1 ? '' : 's'}, lesson reviews, loops and
          settings (plus Fretboard Lab's settings). Export a backup now and then.
        </p>
        <div className="row">
          <button className="btn grow" onClick={doExport}>
            Export backup
          </button>
          <button className="btn grow" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
        </div>
        {!confirmReset ? (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            Reset everything…
          </button>
        ) : (
          <div className="card flat" style={{ borderColor: 'var(--red)' }}>
            <strong>Erase all sessions, streaks, reviews and settings on this phone?</strong>
            <p className="small muted">This can't be undone unless you have a backup.</p>
            <div className="row">
              <button className="btn grow" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                className="btn danger grow"
                onClick={() => {
                  resetAll()
                  setClickState(getClick())
                  setConfirmReset(false)
                  setPinBlock(1)
                  setPinWeek(1)
                  toast('All data erased')
                }}
              >
                Erase
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Practice Coach v0.1 · local-first, no accounts, no tracking
      </p>
    </div>
  )
}
