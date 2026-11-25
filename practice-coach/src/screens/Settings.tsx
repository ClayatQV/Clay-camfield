import { useRef, useState } from 'react'
import { activePlan, blockLen } from '../plan/model'
import { toast } from '../components/Toast'
import { CLICK_TONES, getClick, setClick, testClick } from '../lib/click'
import { setPasscode } from '../ai/actions'
import { verifyPasscode } from '../ai/client'
import { useAiStatus } from '../ai/hooks'
import { formatLong, isValidKey, todayKey } from '../lib/dates'
import { planPosition, startDateFor } from '../lib/plan'
import {
  buildBackup,
  exportFileName,
  importBackup,
  resetAll,
  storageHealthy,
  update,
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
          <span className="label">Session length</span>
          <p className="small muted">Set it on the Practice page (Edit next to the minutes). {s.sessionMinutes ? `Currently ${s.sessionMinutes} min.` : "Currently the plan's own length."}</p>
        </div>
        <div className="field">
          <span className="label">Practice page</span>
          <div className="seg full" role="group" aria-label="Practice page mode">
            <button aria-pressed={!s.guided} onClick={() => updateSettings({ guided: false })}>
              List · all four parts
            </button>
            <button aria-pressed={s.guided} onClick={() => updateSettings({ guided: true })}>
              Guided · one part at a time
            </button>
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

      <AiCoachSettings />

      <section className="card">
        <h2>Activity log</h2>
        <p className="small muted">
          The app records what you do in it (pages, timers, Lab tempo, loops, videos, song picks) on this device, so the coach can see how you actually practice. Nothing leaves the device except a daily summary when you ask the coach for a review.
          {' '}{data.events.length} lines kept, 60 days at most.
        </p>
        <div className="row">
          <button className="btn" onClick={() => updateSettings({ activityLog: !s.activityLog })}>
            {s.activityLog ? 'Pause recording' : 'Resume recording'}
          </button>
          <button className="btn ghost" onClick={() => update((d) => ({ ...d, events: [] }))}>
            Clear the log
          </button>
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

function AiCoachSettings() {
  const data = useData()
  const st = useAiStatus()
  const [code, setCode] = useState(data.ai.passcode)
  const [busy, setBusy] = useState(false)
  return (
    <section className="card">
      <h2>AI coach</h2>
      <p className="small muted">
        {st.loading
          ? 'Checking…'
          : !st.server
            ? 'Not available on this address. The coach runs on the Vercel version of the app.'
            : !st.configured
              ? 'The server is missing its API key or passcode.'
              : data.ai.passcode
                ? 'Ready.'
                : 'Enter the passcode to unlock it.'}
      </p>
      <div className="field">
        <label htmlFor="ai-pc">Passcode</label>
        <div className="row">
          <input id="ai-pc" className="input grow" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
          <button
            className="btn"
            disabled={!code.trim() || busy || !st.server}
            onClick={async () => {
              setBusy(true)
              try {
                await verifyPasscode(code.trim())
                setPasscode(code)
                toast('Passcode saved')
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Wrong passcode', 3200)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Checking…' : 'Save'}
          </button>
        </div>
        <p className="small muted">Stored on this device only. It keeps strangers from using the coach on your account.</p>
      </div>
    </section>
  )
}
