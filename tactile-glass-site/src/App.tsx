import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Glass } from '@samasante/liquid-glass'
import { animate, createTimeline, onScroll, spring, svg } from 'animejs'
import './App.css'

const ScrollInstrument = lazy(() => import('./ScrollInstrument').then(({ ScrollInstrument: Instrument }) => ({ default: Instrument })))

type ScanResult = {
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS'
  risk_score: number
  reasons: { title: string; detail: string }[]
  recommended_action: string
}

const API_BASE_URL = 'http://localhost:5000'

function analyzeOffline(message: string): ScanResult {
  const text = message.toLowerCase()
  const rules = [
    { match: /urgent|act now|immediately|limited time|expires/, title: 'Urgent language', detail: 'The message pressures you to act quickly.' },
    { match: /(?:https?:\/\/|www\.)/, title: 'Link present', detail: 'A link was included. Check its destination before opening it.' },
    { match: /you won|claim your prize|congratulations|free gift/, title: 'Reward claim', detail: 'Unexpected prizes are commonly used to draw people into scams.' },
    { match: /verify your account|otp|password|bank details|pin|card number/, title: 'Sensitive information request', detail: 'The message appears to request credentials or payment information.' },
    { match: /dear customer|dear user/, title: 'Generic greeting', detail: 'The sender uses a broad greeting instead of identifying you.' },
  ]
  const fired: { title: string; detail: string }[] = rules
    .filter((rule) => rule.match.test(text))
    .map(({ title, detail }) => ({ title, detail }))
  const links = message.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) ?? []
  const trustedBrandHosts: Record<string, string[]> = {
    paypal: ['paypal.com', 'paypal.co.uk'],
    microsoft: ['microsoft.com', 'live.com', 'outlook.com'],
    apple: ['apple.com', 'icloud.com'],
    amazon: ['amazon.com', 'amazon.co.uk'],
    google: ['google.com', 'accounts.google.com'],
  }
  let linkRisk = 0
  for (const rawLink of links) {
    const link = rawLink.replace(/[.,;:!?)}\]]+$/, '')
    let parsed: URL
    try {
      parsed = new URL(/^https?:\/\//i.test(link) ? link : `http://${link}`)
    } catch {
      linkRisk = Math.max(linkRisk, 40)
      fired.push({ title: 'Malformed link', detail: 'The link could not be parsed safely. Do not open it.' })
      continue
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const mentionedBrand = Object.entries(trustedBrandHosts).find(([brand]) =>
      new RegExp(`(?:^|[^a-z0-9])${brand}\\.(?:com|co\\.uk|co\\.jp|net)`, 'i').test(link),
    )
    if (mentionedBrand) {
      const [brand, hosts] = mentionedBrand
      const hostMatchesBrand = hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
      if (!hostMatchesBrand) {
        linkRisk = Math.max(linkRisk, 75)
        fired.push({ title: 'Brand/domain mismatch', detail: `The URL mentions ${brand[0].toUpperCase()}${brand.slice(1)} but leads to ${hostname}. Check the registered domain before opening it.` })
      }
    }
    if (!/^https:\/\//i.test(link)) {
      linkRisk = Math.max(linkRisk, 25)
      fired.push({ title: 'Link without HTTPS', detail: 'The link does not use an encrypted HTTPS connection.' })
    }
  }
  const ruleRisk = fired.reduce((sum, rule) => sum + (
    rule.title === 'Brand/domain mismatch' ? 75
      : rule.title === 'Link without HTTPS' ? 25
        : rule.title === 'Sensitive information request' ? 25
          : rule.title === 'Urgent language' || rule.title === 'Reward claim' ? 20 : 15
  ), 8)
  const risk = Math.min(100, Math.max(ruleRisk, linkRisk))
  const verdict = risk > 60 ? 'DANGEROUS' : risk > 30 ? 'SUSPICIOUS' : 'SAFE'
  return {
    verdict,
    risk_score: risk,
    reasons: fired.map(({ title, detail }) => ({ title, detail })),
    recommended_action: verdict === 'SAFE' ? 'No action needed. Stay alert for unexpected requests.' : verdict === 'SUSPICIOUS' ? 'Verify through an official channel before acting.' : 'Do not click links or reply. Delete and report this message.',
  }
}

function App() {
  const rootRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const loupeRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [serverNote, setServerNote] = useState('')
  const [sceneReady, setSceneReady] = useState(false)

  useEffect(() => {
    const sceneTimer = window.setTimeout(() => setSceneReady(true), 180)
    return () => window.clearTimeout(sceneTimer)
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scrollObservers: ReturnType<typeof onScroll>[] = []
    const timeline = createTimeline({ defaults: { ease: 'out(3)' } })
    timeline
      .add('.masthead', { opacity: [0, 1], y: [-10, 0], duration: reduceMotion ? 1 : 650 })
      .add('.hero-kicker, .hero-title, .hero-copy, .hero-actions', { opacity: [0, 1], y: [20, 0], duration: reduceMotion ? 1 : 700, delay: (_element: unknown, i = 0) => i * (reduceMotion ? 0 : 90) }, '-=350')
      .add('.specimen-stage', { opacity: [0, 1], x: [24, 0], duration: reduceMotion ? 1 : 800 }, '-=650')

    if (!reduceMotion) {
      const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]')
      reveals.forEach((element) => {
        scrollObservers.push(onScroll({
          target: element,
          enter: 'top 88%',
          repeat: false,
          onEnter: () => animate(element, { opacity: [0.82, 1], y: [15, 0], duration: 680, ease: 'out(3)' }),
        }))
      })
      const shape = document.querySelector<SVGPathElement>('#scan-stamp-path')
      if (shape) {
        scrollObservers.push(onScroll({
          target: '#method',
          enter: 'top 80%',
          repeat: false,
          onEnter: () => animate(shape, { d: svg.morphTo('#scan-stamp-target'), duration: 480, ease: spring({ bounce: 0.35 }) }),
        }))
      }
    }
    return () => {
      timeline.cancel()
      scrollObservers.forEach((observer) => observer.revert())
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = document.querySelectorAll<HTMLElement>('.button-primary:not(:disabled), .nav-glass-link, .method-list article')
    const cleanups: (() => void)[] = []
    items.forEach((item) => {
      const enter = () => animate(item, { y: -2, scale: item.matches('.method-list article') ? 1.008 : 1.025, duration: 240, ease: spring({ bounce: 0.32 }) })
      const leave = () => animate(item, { y: 0, scale: 1, duration: 360, ease: spring({ bounce: 0.2 }) })
      item.addEventListener('pointerenter', enter)
      item.addEventListener('pointerleave', leave)
      item.addEventListener('focus', enter)
      item.addEventListener('blur', leave)
      cleanups.push(() => {
        item.removeEventListener('pointerenter', enter)
        item.removeEventListener('pointerleave', leave)
        item.removeEventListener('focus', enter)
        item.removeEventListener('blur', leave)
      })
    })
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const track = document.querySelector<HTMLElement>('.risk-track span')
    if (track && result) animate(track, { width: `${result.risk_score}%`, duration: 720, ease: 'out(3)' })
    const spinner = document.querySelector<HTMLElement>('.review-mark')
    if (spinner && isScanning) {
      const rotation = animate(spinner, { rotate: 360, duration: 1000, ease: 'linear', loop: true })
      return () => { rotation.pause() }
    }
  }, [result, isScanning])

  function moveLoupe(event: PointerEvent<HTMLElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !loupeRef.current || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    animate(loupeRef.current, { rotateY: x * 8, rotateX: -y * 6, x: x * 8, y: y * 6, duration: 460, ease: spring({ bounce: 0.22 }) })
  }

  async function submitScan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || isScanning) return
    setIsScanning(true)
    setResult(null)
    setServerNote('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, type: 'Message' }),
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) throw new Error(`Server returned ${response.status}`)
      const data = await response.json() as ScanResult
      setResult(data)
    } catch {
      setServerNote('Offline preview · local rules used; connect the Flask API for full analysis.')
      setResult(analyzeOffline(trimmed))
    } finally {
      setIsScanning(false)
    }
  }

  const verdictClass = result?.verdict.toLowerCase() ?? ''

  return (
    <>
    {sceneReady && <Suspense fallback={null}><ScrollInstrument /></Suspense>}
    <main className="site-shell" ref={rootRef}>
      <div className="paper-grain" aria-hidden="true" />
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="Signal Office home"><span className="wordmark-seal" aria-hidden="true">S</span><span>SIGNAL OFFICE<small>Independent message security</small></span></a>
        <nav aria-label="Main navigation">
          <a href="#method">Method</a><a href="#scanner">Try the scanner</a>
          <a className="nav-glass-link" href="#scanner">
            <Glass className="nav-glass" radius={999} optics={{ depth: 0.18, strength: 0.08, dispersion: 0.025, frost: 0.4, brightness: 0.12, specular: 0.3, sheenAngle: 135 }} refract={<span className="nav-refract" />}>
              <span>Open case file <span aria-hidden="true">↗</span></span>
            </Glass>
          </a>
        </nav>
      </header>

      <section className="hero" id="top" ref={heroRef} onPointerMove={moveLoupe}>
        <div className="hero-copy-block">
          <p className="hero-kicker"><span className="status-dot" /> FIELD NOTE 01 <span>·</span> MESSAGE AUTHENTICITY</p>
          <h1 className="hero-title">A second look<br />before you <em>click.</em></h1>
          <p className="hero-copy">Suspicious messages borrow urgency, familiar names and convincing links. Signal Office helps you slow the moment down and see what deserves a closer look.</p>
          <div className="hero-actions"><a className="button-primary" href="#scanner">Examine a message <span aria-hidden="true">↘</span></a><a className="text-link" href="#method">How the review works</a></div>
          <div className="hero-footnote"><span>01 / 03</span><span>RULES-BASED REVIEW · NO MESSAGE STORED</span></div>
        </div>

        <div className="specimen-stage" aria-label="Illustration of a message under a refractive inspection lens">
          <div className="stage-ruler" aria-hidden="true"><span>SPECIMEN A</span><span>FIELD OF VIEW · 1.8×</span></div>
          <article className="message-specimen">
            <div className="specimen-header"><span>INCOMING / SMS</span><span>09:41 · UNKNOWN</span></div>
            <p className="sender-line">Delivery Notice <span>+1 (•••) •••-0182</span></p>
            <p className="specimen-message">Your parcel is being held. Confirm your address <strong>immediately</strong> to avoid return: <u>post-track.help/confirm</u></p>
            <div className="specimen-rule"><span /><span>LINK DESTINATION UNVERIFIED</span></div>
          </article>
          <div className="loupe-assembly" ref={loupeRef} aria-hidden="true">
            <div className="loupe-rim"><div className="loupe-inside"><div className="loupe-glass" /></div></div>
            <div className="loupe-handle" />
            <span className="loupe-coordinate">35° 41′ N</span>
          </div>
          <div className="stage-note"><span className="note-line" />Urgency + unfamiliar link<br /><b>two signals to inspect</b></div>
          <span className="stage-index">FIG. 01</span>
        </div>
      </section>

      <section className="ticker" aria-label="Service principles"><span>PAUSE BEFORE YOU TRUST</span><span aria-hidden="true">✳</span><span>CHECK THE SENDER</span><span aria-hidden="true">✳</span><span>FOLLOW THE LINK, NOT THE CLAIM</span><span aria-hidden="true">✳</span><span>PAUSE BEFORE YOU TRUST</span></section>

      <section className="method-section" id="method" data-reveal>
        <div className="section-index">A / THE METHOD</div>
        <div className="method-main"><p className="section-overline">CLEAR SIGNALS, EXPLAINED</p><h2>More context.<br /><em>Less guesswork.</em></h2><p className="method-intro">A message can be suspicious without being malicious. Our review surfaces the language patterns and link clues that warrant a human check.</p></div>
        <div className="method-list">
          <article><span className="method-number">01</span><div><h3>Read the pressure</h3><p>Urgency, prize claims and requests for account details are surfaced as separate signals.</p></div><span className="method-mark">↗</span></article>
          <article><span className="method-number">02</span><div><h3>Inspect the link</h3><p>Visible URLs are checked for suspicious hosts, insecure schemes and misleading patterns.</p></div><span className="method-mark">↗</span></article>
          <article><span className="method-number">03</span><div><h3>Keep your judgment</h3><p>Results explain why a message was flagged. Verify important requests through a known channel.</p></div><span className="method-mark">↗</span></article>
        </div>
      </section>

      <section className="scanner-section" id="scanner" data-reveal>
        <div className="scanner-heading"><div><p className="section-overline">B / PRIVATE MESSAGE REVIEW</p><h2>Bring the message.<br /><em>Keep the context.</em></h2></div><p>Paste the text you want to inspect. This demo sends it only to your configured local API; if unavailable, a small in-browser ruleset provides a preview.</p></div>
        <div className="scanner-layout">
          <form ref={formRef} className="scan-form" onSubmit={submitScan}>
            <label htmlFor="message-input">MESSAGE SPECIMEN <span>TEXT ONLY</span></label>
            <textarea id="message-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Paste an email, text or direct message here…" rows={7} maxLength={6000} aria-describedby="privacy-note" />
            <div className="form-footer"><span id="privacy-note">Avoid including passwords or personal account details.</span><button type="button" onClick={() => void submitScan()} className="button-primary" disabled={!message.trim() || isScanning}>{isScanning ? 'Reviewing…' : 'Review message'} <span aria-hidden="true">→</span></button></div>
          </form>
          <aside className={`result-sheet ${result ? `is-${verdictClass}` : ''}`} aria-live="polite" aria-busy={isScanning}>
            <div className="result-topline"><span>REVIEW SUMMARY</span><span>{isScanning ? 'IN PROGRESS' : result ? 'COMPLETE' : 'AWAITING INPUT'}</span></div>
            {isScanning ? <div className="reviewing-state"><span className="review-mark" /><p>Comparing message signals…</p></div> : result ? <>
              <div className="verdict-row"><div><p className="section-overline">RISK INDICATION</p><h3 className="verdict-title">{result.verdict}</h3></div><span className="risk-number">{result.risk_score}<small>/100</small></span></div>
              <div className="risk-track"><span style={{ width: `${result.risk_score}%` }} /></div>
              <ul className="reason-list">{result.reasons.length ? result.reasons.map((reason) => <li key={reason.title}><span aria-hidden="true">↗</span><div><b>{reason.title}</b><p>{reason.detail}</p></div></li>) : <li><span aria-hidden="true">✓</span><div><b>No obvious rule matches</b><p>This is not a guarantee that the message is safe.</p></div></li>}</ul>
              <p className="recommended-action"><b>Suggested next step</b>{result.recommended_action}</p>
              <p className="server-note">{serverNote}</p>
            </> : <div className="empty-result"><svg viewBox="0 0 48 48" role="img" aria-label="Unreviewed message"><circle cx="24" cy="24" r="18" /><path id="scan-stamp-path" d="M16 24h16" /><path id="scan-stamp-target" d="M16 28l8 8 18-22" visibility="hidden" /></svg><p>Your notes will appear here<br />after review.</p></div>}
          </aside>
        </div>
      </section>

      <section className="closing-note" data-reveal><span className="closing-rule" /><p>When in doubt, contact the person or organization using details you already trust.</p><a href="#top">Back to the top ↑</a></section>
      <footer className="site-footer"><a className="wordmark" href="#top"><span className="wordmark-seal" aria-hidden="true">S</span><span>SIGNAL OFFICE<small>Independent message security</small></span></a><span>AN EDUCATIONAL DEMO · VERIFY BEFORE YOU ACT</span><a href="#method">Detection notes ↗</a></footer>
    </main>
    </>
  )
}

export default App
