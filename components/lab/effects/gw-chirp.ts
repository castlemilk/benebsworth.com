import type { EffectModule } from '@/lib/lab/types'

/**
 * Gravitational-Wave Chirp
 *
 * The strain h(t) radiated by two inspiralling compact objects. As the binary
 * loses energy to gravitational waves the orbit shrinks, so both the orbital
 * frequency and the wave amplitude sweep upward — the "chirp" — culminating in
 * merger, followed by an exponentially damped "ringdown" as the remnant
 * black hole settles to a Kerr geometry.
 *
 * Physics (leading post-Newtonian / quadrupole order, geometric units G = c = 1):
 *
 *   Chirp mass:   M_c = (m₁ m₂)^(3/5) / (m₁ + m₂)^(1/5)
 *
 *   Frequency evolution (df_gw/dt from the quadrupole luminosity):
 *     df/dt = (96/5) π^(8/3) M_c^(5/3) f^(11/3)
 *   integrating from coalescence time t_c gives the closed form
 *     f(t) = (1/π) (5/256)^(3/8) M_c^(-5/8) (t_c − t)^(-3/8)
 *
 *   Strain amplitude (sky/orientation-averaged, distance D):
 *     A(t) ∝ M_c^(5/3) f(t)^(2/3) / D      (rises with f → louder near merger)
 *
 *   h(t) = A(t) cos(φ(t)),   φ(t) = 2π ∫ f dt  (the GW phase, twice the orbital phase)
 *
 *   Inspiral ends near the ISCO frequency of the total mass M = m₁ + m₂:
 *     f_ISCO = 1 / (6^(3/2) π M)
 *
 *   Ringdown: damped sinusoid at the l=m=2 quasi-normal mode of the remnant,
 *     h(t) = A_r e^(-(t−t_c)/τ) cos(2π f_qnm (t−t_c))
 *
 * This renderer works in convenient solar-mass / second-ish units so the
 * waveform is legible; the *shapes* and scalings are physically faithful.
 */

const controls = [
  { key: 'm1', label: 'm₁ (M☉)', type: 'range', min: 5, max: 80, step: 1 },
  { key: 'm2', label: 'm₂ (M☉)', type: 'range', min: 5, max: 80, step: 1 },
  { key: 'showSpectrogram', label: 'Spectrogram', type: 'toggle' },
] as const

const defaults = {
  m1: 36,
  m2: 29, // ≈ GW150914, the first direct detection
  showSpectrogram: true,
}

// Total / chirp mass in solar masses.
function chirpMass(m1: number, m2: number) {
  return Math.pow(m1 * m2, 0.6) / Math.pow(m1 + m2, 0.2)
}

// ISCO (merger) GW frequency in Hz for total mass M (solar masses).
// f_ISCO = c^3 / (6^(3/2) π G M) ≈ 4400 Hz / (M / M☉).
function fISCO(mTotal: number) {
  return 4397.2 / mTotal
}

// Ringdown quasi-normal-mode frequency in Hz for the remnant (≈ 0.95 M_total,
// dimensionless spin a ≈ 0.7). f_qnm ≈ 12000 Hz / (M_remnant / M☉) for the
// dominant l=m=2 mode (Berti et al. fit, a≈0.7).
function fQNM(mTotal: number) {
  const mRemnant = mTotal * 0.95
  return 32000 / mRemnant // tuned so f_qnm sits a little above f_ISCO, as observed
}

// Newtonian closed-form inspiral frequency at time-before-coalescence tau (s).
// f(tau) = (1/π) (5/256)^(3/8) (G M_c / c^3)^(-5/8) tau^(-3/8).
// We fold the constants into a single prefactor calibrated in solar masses + seconds.
function inspiralFreq(mChirp: number, tau: number) {
  // (G M☉ / c^3) = 4.925e-6 s.
  const tChirpMass = 4.925e-6 * mChirp
  const k = (1 / Math.PI) * Math.pow(5 / 256, 3 / 8) * Math.pow(tChirpMass, -5 / 8)
  return k * Math.pow(Math.max(tau, 1e-6), -3 / 8)
}

export const gwChirp: EffectModule = {
  controls: controls as unknown as EffectModule['controls'],
  defaults,

  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const bg = theme.bg
    const fg = theme.fg

    // Crisp hairlines regardless of DPR.
    const hair = 1 / Math.max(1, Math.round(dims.dpr || 1)) + 0.5

    // --- Precomputed waveform for the current params -------------------------
    // We build a fixed-length sampled strain waveform once per param change,
    // then sweep a playhead across it for animation. This keeps the per-frame
    // cost trivial and the spectrogram stable.
    const NSAMP = 1400
    const strain = new Float32Array(NSAMP) // h(t), normalised to ~[-1, 1]
    const freqHz = new Float32Array(NSAMP) // instantaneous GW frequency (Hz)
    const ampEnv = new Float32Array(NSAMP) // |envelope|, normalised to [0, 1]
    let durationS = 0 // physical duration of the window (seconds)
    let mergerFrac = 0 // fraction of the window at which merger occurs
    let fMergeHz = 0
    let fRingHz = 0
    let mcVal = 0
    let mTotVal = 0

    let lastHash = ''

    function build(m1: number, m2: number) {
      const mTot = m1 + m2
      const mc = chirpMass(m1, m2)
      mcVal = mc
      mTotVal = mTot

      const fMerge = fISCO(mTot)
      const fRing = fQNM(mTot)
      fMergeHz = fMerge
      fRingHz = fRing

      // Pick a start frequency so the inspiral window is a few cycles long but
      // shows the sweep clearly. Lighter binaries chirp at higher frequencies
      // (the whole event is faster), so anchor the start to f_merge.
      const fStart = fMerge * 0.18

      // Solve the closed-form for tau at fStart and at fMerge:
      //   tau(f) = (5/256) (π f)^(-8/3) (G M_c / c^3)^(-5/3)
      const tChirpMass = 4.925e-6 * mc
      const tauOf = (f: number) =>
        (5 / 256) * Math.pow(Math.PI * f, -8 / 3) * Math.pow(tChirpMass, -5 / 3)
      const tauStart = tauOf(fStart) // seconds before coalescence at fStart
      const tauMerge = tauOf(fMerge) // (smaller)
      const inspiralDur = tauStart - tauMerge // seconds of inspiral shown

      // Give the ringdown a slice of the window proportional to a few QNM cycles.
      const tau = (mTot * 0.95) * 4.925e-6 * 11.0 // QNM damping time τ ≈ 11 M_remnant (s-units)
      const ringDur = Math.min(tau * 4, inspiralDur * 0.35)
      durationS = inspiralDur + ringDur
      mergerFrac = inspiralDur / durationS

      const dt = durationS / (NSAMP - 1)
      let phase = 0
      let maxAmp = 0

      // First pass: instantaneous frequency + raw (un-normalised) envelope.
      const rawAmp = new Float32Array(NSAMP)
      for (let i = 0; i < NSAMP; i++) {
        const t = i * dt
        let f: number
        let a: number
        if (t < inspiralDur) {
          // time-before-coalescence runs DOWN as t runs up
          const tauT = tauStart - t
          f = inspiralFreq(mc, tauT)
          f = Math.min(f, fMerge) // cap at merger
          // A ∝ M_c^(5/3) f^(2/3); we only need the shape, normalise later.
          a = Math.pow(mc, 5 / 3) * Math.pow(f, 2 / 3)
        } else {
          // Ringdown: frequency snaps to the QNM, amplitude decays exponentially.
          const tr = t - inspiralDur
          f = fRing
          const aMerge =
            Math.pow(mc, 5 / 3) * Math.pow(fMerge, 2 / 3)
          a = aMerge * Math.exp(-tr / tau)
        }
        freqHz[i] = f
        rawAmp[i] = a
        if (a > maxAmp) maxAmp = a
      }

      // Second pass: integrate phase φ = 2π ∫ f dt and synthesise h = A cos φ.
      const inv = maxAmp > 0 ? 1 / maxAmp : 1
      for (let i = 0; i < NSAMP; i++) {
        phase += 2 * Math.PI * freqHz[i] * dt
        const env = rawAmp[i] * inv
        ampEnv[i] = env
        strain[i] = env * Math.cos(phase)
      }
    }

    // Rolling playhead (fraction 0..1 of the window).
    let head = 0
    let lastT = 0

    function fmt(n: number) {
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
      if (n >= 100) return n.toFixed(0)
      return n.toFixed(1)
    }

    return {
      step(t, p) {
        const m1 = (p.m1 ?? defaults.m1) as number
        const m2 = (p.m2 ?? defaults.m2) as number
        const showSpec = (p.showSpectrogram ?? defaults.showSpectrogram) as boolean

        const hash = `${m1}|${m2}`
        if (hash !== lastHash) {
          build(m1, m2)
          lastHash = hash
          head = 0
          lastT = t
        }

        // Advance the playhead. One full sweep ~ 6 s of wall-clock, then loop
        // with a short pause at merger feel by easing near the end.
        const dtMs = Math.min(100, t - lastT)
        lastT = t
        head += dtMs / 6000
        if (head > 1.18) head = 0 // small post-merger hold then restart

        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        const playFrac = Math.min(1, head)

        // ---------------------------------------------------------------------
        // Layout: optional spectrogram on top, strain waveform below.
        // Adapts to small canvases (compact embeds / mini home tiles) so nothing
        // overflows: shrink paddings, and drop the spectrogram if there is no
        // room for both panels.
        // ---------------------------------------------------------------------
        const compact = h < 220
        const padL = w < 260 ? 30 : 52
        const padR = 16
        const padTop = compact ? 16 : 30
        const padBot = compact ? 16 : 30
        const plotW = Math.max(10, w - padL - padR)

        // Only show the spectrogram if the toggle is on AND there is vertical
        // room for both it and a usable waveform panel.
        const innerH = h - padTop - padBot
        const wantSpec = showSpec && innerH > 150
        const specH = wantSpec ? Math.min(140, innerH * 0.42) : 0
        const gap = wantSpec ? 18 : 0
        const waveTop = padTop + specH + gap
        const waveH = Math.max(30, h - waveTop - padBot)
        const waveMid = waveTop + waveH / 2

        // Map a sample index -> x (clamped to the plot rect).
        const idxToX = (i: number) => {
          const x = padL + (i / (NSAMP - 1)) * plotW
          return Math.max(padL, Math.min(padL + plotW, x))
        }

        // ---- Spectrogram (frequency track) ----------------------------------
        if (wantSpec) {
          const specTop = padTop
          const specBot = padTop + specH
          // Log frequency axis from fLo to fHi.
          const fLo = Math.max(8, fMergeHz * 0.04)
          const fHi = Math.max(fRingHz, fMergeHz) * 1.5
          const lLo = Math.log10(fLo)
          const lHi = Math.log10(fHi)
          const fToY = (f: number) => {
            const lf = Math.log10(Math.max(fLo, Math.min(fHi, f)))
            const yy = specBot - ((lf - lLo) / (lHi - lLo)) * specH
            return Math.max(specTop, Math.min(specBot, yy))
          }

          // Panel frame.
          ctx.strokeStyle = fg
          ctx.globalAlpha = 0.18
          ctx.lineWidth = hair
          ctx.strokeRect(padL, specTop, plotW, specH)
          ctx.globalAlpha = 1

          // Frequency gridlines + labels.
          ctx.font = '9px monospace'
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          const ticks = [10, 30, 100, 300, 1000, 3000]
          for (const fk of ticks) {
            if (fk < fLo || fk > fHi) continue
            const y = fToY(fk)
            ctx.strokeStyle = fg
            ctx.globalAlpha = 0.08
            ctx.beginPath()
            ctx.moveTo(padL, y)
            ctx.lineTo(padL + plotW, y)
            ctx.stroke()
            ctx.globalAlpha = 0.4
            ctx.fillStyle = fg
            ctx.fillText(fk >= 1000 ? fk / 1000 + 'k' : String(fk), padL - 5, y)
          }
          ctx.globalAlpha = 1

          // Frequency track, intensity ∝ amplitude envelope, drawn up to the
          // playhead. Colour ramps from cool (cold inspiral) to hot (merger).
          const headIdx = Math.floor(playFrac * (NSAMP - 1))
          ctx.lineCap = 'round'
          for (let i = 1; i <= headIdx; i++) {
            const x0 = idxToX(i - 1)
            const x1 = idxToX(i)
            const y0 = fToY(freqHz[i - 1])
            const y1 = fToY(freqHz[i])
            const env = ampEnv[i]
            // Hue 210 (blue) -> 0 (red) as we approach merger.
            const hue = 210 - 210 * Math.min(1, (i / (NSAMP - 1)) / mergerFrac)
            ctx.strokeStyle = `hsla(${hue}, 85%, 60%, ${0.25 + 0.65 * env})`
            ctx.lineWidth = 1.2 + 2.6 * env
            ctx.beginPath()
            ctx.moveTo(x0, y0)
            ctx.lineTo(x1, y1)
            ctx.stroke()
          }

          // Axis caption.
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.4
          ctx.font = '9px monospace'
          ctx.fillText('f_gw (Hz)', padL + 4, specTop + 11)
          ctx.globalAlpha = 1
        }

        // ---- Strain waveform -------------------------------------------------
        // Zero line.
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.15
        ctx.lineWidth = hair
        ctx.beginPath()
        ctx.moveTo(padL, waveMid)
        ctx.lineTo(padL + plotW, waveMid)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Envelope (faint) — the |A(t)| amplitude that "loudens" toward merger.
        const ampScale = waveH * 0.46
        const sToY = (s: number) => {
          const y = waveMid - Math.max(-1, Math.min(1, s)) * ampScale
          return Math.max(waveTop, Math.min(waveTop + waveH, y))
        }

        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.12
        ctx.lineWidth = hair
        ctx.beginPath()
        for (let i = 0; i < NSAMP; i++) {
          const x = idxToX(i)
          const y = sToY(ampEnv[i])
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.beginPath()
        for (let i = 0; i < NSAMP; i++) {
          const x = idxToX(i)
          const y = sToY(-ampEnv[i])
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.globalAlpha = 1

        // The strain trace, drawn up to the playhead.
        const headIdx = Math.floor(playFrac * (NSAMP - 1))
        const mergerIdx = Math.floor(mergerFrac * (NSAMP - 1))

        // Inspiral portion (teal) then ringdown portion (warm) for clarity.
        ctx.lineWidth = 1.4
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        // inspiral
        ctx.strokeStyle = '#37d6c0'
        ctx.beginPath()
        let started = false
        const upToInsp = Math.min(headIdx, mergerIdx)
        for (let i = 0; i <= upToInsp; i++) {
          const x = idxToX(i)
          const y = sToY(strain[i])
          if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
        }
        ctx.stroke()
        // ringdown
        if (headIdx > mergerIdx) {
          ctx.strokeStyle = '#ff8a4c'
          ctx.beginPath()
          started = false
          for (let i = mergerIdx; i <= headIdx; i++) {
            const x = idxToX(i)
            const y = sToY(strain[i])
            if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        // Merger marker (vertical dashed line).
        const mx = idxToX(mergerIdx)
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.3
        ctx.setLineDash([3, 4])
        ctx.lineWidth = hair
        ctx.beginPath()
        ctx.moveTo(mx, waveTop)
        ctx.lineTo(mx, waveTop + waveH)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1

        // Playhead dot at the current tip.
        if (headIdx >= 0 && headIdx < NSAMP) {
          const px = idxToX(headIdx)
          const py = sToY(strain[headIdx])
          ctx.fillStyle = headIdx > mergerIdx ? '#ffb37a' : '#7af0e2'
          ctx.shadowColor = ctx.fillStyle
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }

        // Phase labels under the wave (only if there is room below it).
        const labelY = waveTop + waveH + 12
        if (!compact && labelY < h - 6) {
          ctx.font = '9px monospace'
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.4
          ctx.textAlign = 'center'
          ctx.fillText('inspiral', padL + (mx - padL) / 2, labelY)
          ctx.fillStyle = '#ff8a4c'
          ctx.globalAlpha = 0.55
          ctx.fillText('merger · ringdown', mx + (padL + plotW - mx) / 2, labelY)
          ctx.globalAlpha = 1
        }

        // Y-axis caption for strain (skip on very narrow canvases).
        if (padL >= 40) {
          ctx.save()
          ctx.translate(14, waveMid)
          ctx.rotate(-Math.PI / 2)
          ctx.textAlign = 'center'
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.4
          ctx.font = '9px monospace'
          ctx.fillText('strain h(t)', 0, 0)
          ctx.restore()
          ctx.globalAlpha = 1
        }

        // ---- Title + readout -------------------------------------------------
        const titleY = compact ? 12 : 18
        ctx.textAlign = 'left'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.85
        ctx.font = compact ? 'bold 10px monospace' : 'bold 12px monospace'
        ctx.fillText('Gravitational-wave chirp', padL, titleY)

        if (!compact) {
          ctx.font = '10px monospace'
          ctx.globalAlpha = 0.5
          ctx.textAlign = 'right'
          ctx.fillText(
            `m₁ ${m1}  m₂ ${m2} M☉   M_c ${mcVal.toFixed(1)} M☉`,
            w - padR,
            18,
          )
          ctx.globalAlpha = 1

          // Bottom-line physics readout.
          ctx.textAlign = 'left'
          ctx.font = '10px monospace'
          ctx.fillStyle = fg
          ctx.globalAlpha = 0.5
          ctx.fillText(
            `f_merge ≈ ${fmt(fMergeHz)} Hz   f_ring ≈ ${fmt(fRingHz)} Hz   M_total ${mTotVal} M☉`,
            padL,
            h - 10,
          )
          ctx.globalAlpha = 1
        }
      },
    }
  },
}
