---
title: Build a Software-Defined Radio in 100 Lines
date: '2026-06-17T00:00:00.000Z'
description: >-
  A radio is no longer hardware. Once you sample the antenna fast enough, every
  classic RF block — mixer, filter, demodulator — becomes a few lines of
  arithmetic on a stream of complex numbers. The antenna is the last analog
  component.
labels: 'electrical engineering,sdr,dsp,radio'
release: true
author: Ben Ebsworth
heroImage: /blog/software-defined-radio-in-100-lines/hero.webp
takeaways:
  - >-
    The antenna is the only irreducibly analog part of an SDR; everything past
    the ADC is arithmetic on a numpy array of complex samples.
  - >-
    Each classic RF block has a one-line software twin: mixing is multiply by a
    complex exponential, filtering is a weighted for-loop (FIR convolution), AM
    demod is np.abs.
  - >-
    Complex (IQ) samples carry amplitude and phase at once, so a rate of f_s
    captures a full f_s-wide band and lets you shift spectrum one way without a
    mirror image.
  - >-
    Software can't repeal physics: antenna size, tuner range, ADC bit depth, and
    aliasing still bound the front end, and real-time SDR rests entirely on the
    O(N log N) FFT.
markdown_url: /blog/software-defined-radio-in-100-lines/
canonical_url: 'https://benebsworth.com/blog/software-defined-radio-in-100-lines/'
---
## Key takeaways

- The antenna is the only irreducibly analog part of an SDR; everything past the ADC is arithmetic on a numpy array of complex samples.
- Each classic RF block has a one-line software twin: mixing is multiply by a complex exponential, filtering is a weighted for-loop (FIR convolution), AM demod is np.abs.
- Complex (IQ) samples carry amplitude and phase at once, so a rate of f_s captures a full f_s-wide band and lets you shift spectrum one way without a mirror image.
- Software can't repeal physics: antenna size, tuner range, ADC bit depth, and aliasing still bound the front end, and real-time SDR rests entirely on the O(N log N) FFT.

There is no radio inside a radio, and once you see why, it feels like cheating. Open a 30-dollar USB dongle that pulls in FM stations, aircraft transponders, and weather satellites, and you won't find a tuned circuit for each band, a mixer chip per service, or a stack of analog filters. You'll find an antenna, one fast analog-to-digital converter, and a USB cable. Everything a textbook calls a "radio" (the mixer that shifts a station down to where you can hear it, the filter that rejects the neighbours, the demodulator that recovers the voice) has dissolved into arithmetic. The mixer is a multiply. The filter is a `for` loop. The demodulator is an absolute value. Once the samples are flowing, a radio is software, and a short program at that.

The trap is the word "radio" itself, which still smells of soldering irons and ferrite cores. That intuition was correct for a century. It stopped being correct the moment converters got fast enough to digitise the antenna directly: the signal stops being a voltage on a wire and becomes a stream of numbers in memory, and numbers don't care whether you process them with a tuned circuit or a `numpy` array. This post is the capstone of the electrical-engineering labs on this site. Every block we build, you've already dragged around with a slider: the spectrum that finds the station, the complex sample stream that carries it, the digital filter that isolates it, the envelope that turns it back into audio. Software-defined radio (SDR) is that same math, assembled into one pipeline.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The very first thing an SDR does is *look*. It grabs a block of samples off the converter and runs a Fast Fourier Transform (FFT) to turn those time-domain numbers into a picture of frequency. Switch **Waveform** to Two Tones and watch the spectrum: each carrier shows up as a spike at its own frequency, the way two stations would. Now drag **Noise (dB)** up toward 0; the noise floor rises until the weaker spike drowns. Finding a station isn't turning a dial. It's finding the peak in this plot, then pointing the rest of the software at its frequency.

## The antenna is the last analog part

Walk the signal path of an old superheterodyne receiver and almost every box is a lump of analog hardware: the RF amplifier, the local oscillator, the mixer, the intermediate-frequency filter, the detector, the audio stage. Each one is a circuit you can hold, chained into a receiver.

An SDR keeps exactly one of those boxes. The antenna catches the electromagnetic field and turns it into a voltage that's genuinely physical, genuinely analog, and no amount of software replaces it. Right behind it sits the analog-to-digital converter (ADC), the border crossing. On the antenna side you have volts; on the far side, a list of samples arriving at a known rate $f_s$, the sample rate. Everything past the ADC is a `for` loop.

```python

from rtlsdr import RtlSdr

sdr = RtlSdr()
sdr.sample_rate = 2.4e6        # 2.4 million complex samples per second
sdr.center_freq = 100.1e6      # park the tuner at 100.1 MHz
sdr.gain = 'auto'

iq = sdr.read_samples(256 * 1024)   # one capture: a numpy array of complex128
sdr.close()
```

That's the only hardware-specific code in the whole project: four lines of setup and one `read_samples`. After it returns, you hold a `numpy` array of complex numbers and the dongle has done its job. Call it 6 lines on the running tally; the rest of this post never touches the device again, only `iq`.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

When you set `sample_rate = 2.4e6`, you're not choosing a station. You're choosing how wide a slice of spectrum to capture at once. Because the samples are complex, a rate of $f_s$ lets you represent a band of width $f_s$ around the tuner's centre frequency (real samples would give you only $f_s/2$, the second reason radios work in IQ). So 2.4 MS/s (megasamples per second) hands you a 2.4 MHz-wide window in a single array. The FFT from the opening lab is how you see what's inside it; picking a station is then a software question: which peak in the 2.4 MHz do you want?

## IQ: why radios speak in complex numbers

Notice the word *complex* a few lines up. The dongle didn't hand you real voltages. It handed you complex numbers, and that's not a quirk of `numpy` but the native language of every modern radio. A signal $A\cos(\omega t + \phi)$ carries two facts at each instant: amplitude $A$ and phase $\phi$. One real number per sample can't hold both; two can. We split the signal into a component in phase with a reference oscillator ($I$, for in-phase) and one a quarter-cycle behind it ($Q$, for quadrature), and the pair $(I, Q)$ pins down both at once.

The clean way to write that pair is as a single complex number: equation 1, the representation everything else rests on.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
x(t) = I(t) + j\,Q(t) = A(t)\,e^{j\phi(t)}
```

$$
x(t) = I(t) + j\,Q(t) = A(t)\,e^{j\phi(t)}
$$

Read it both ways. On the left, $I$ and $Q$ are the two voltages the receiver measures. On the right, the magnitude $A(t) = |x(t)| = \sqrt{I^2 + Q^2}$ is the instantaneous amplitude (the envelope), and the angle $\phi(t) = \arg x(t)$ is the instantaneous phase. AM lives in the magnitude; FM and PM live in the angle. Once your signal is a stream of complex numbers, "demodulate" becomes "take the part of the complex number you care about", which is why radios bother with the complex plane at all.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

This is the IQ stream made visible. Each dot is one complex sample plotted at $(I, Q)$, real part horizontal, imaginary part vertical. A digital transmitter places symbols at agreed points in this plane; set **Modulation** to 16-QAM and you get a 4×4 grid of intended locations. Now drag **SNR (dB)** down: each tight point blooms into a cloud as channel noise jitters $I$ and $Q$. That cloud is the *same* rising noise floor from the opening spectrum, drawn in the radio's own coordinates instead of against frequency. The receiver's job is to look at a noisy dot and decide which clean point it was meant to be. Pure geometry, more or less.

## Mixing = multiply by a complex exponential

You captured 2.4 MHz of spectrum and found your station as a peak off-centre. Say its carrier sits 300 kHz above where the tuner is parked. To process it, we want it at zero: *slide* the whole spectrum down so the carrier lands at DC, the centre of the plot. In analog hardware that slide is a mixer, a nonlinear device fed by a local oscillator. In software it's a multiplication, and a one-liner at that.

Multiplying the sample stream by a complex exponential $e^{-j\omega_0 n}$ rotates every sample's phase at a steady rate, and a steady phase rotation *is* a frequency shift. This is equation 2, the digital downconversion.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
y[n] = x[n]\,e^{-j 2\pi f_0 n / f_s}
```

$$
y[n] = x[n]\,e^{-j 2\pi f_0 n / f_s}
$$

Choose $f_0$ to be the offset of your station from the tuner centre (300 kHz here), and after the multiply the station's carrier sits at 0 Hz; everything else in the captured band slides down with it. In code it's exactly as short as the equation promises.

```python
fs = 2.4e6
f_offset = 300e3                       # station is 300 kHz above tuner centre
n = np.arange(len(iq))
lo = np.exp(-1j * 2 * np.pi * f_offset * n / fs)   # the local oscillator
baseband = iq * lo                     # the mixer: one elementwise multiply
```

That's the mixer. Three working lines, and the only reason it needs three is that you build the oscillator vector first. The local oscillator that took a quartz crystal and a phase-locked loop in hardware is `np.exp` of a ramp. Running tally: about 9 lines, and the station is centred at zero.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The exponent is negative because we're shifting *down*: to cancel a carrier at $+f_0$ you rotate at $-f_0$. And it must be a complex exponential, not a cosine: a real cosine is $\tfrac{1}{2}(e^{j\omega t} + e^{-j\omega t})$, so multiplying by it makes *two* copies of your spectrum, one shifted up and one down, which then overlap and interfere. The complex exponential carries only the single $e^{-j\omega t}$ term, so it slides the spectrum cleanly one way with no mirror image. That's the payoff of working in IQ: a one-sided spectrum you can shift without folding it onto itself.

## Filtering = a for loop

Your station is centred at zero, but it's not alone. The adjacent channels you slid down with it still sit a few hundred kHz to either side, and they'll bleed into your audio if you let them. You need a channel-select filter: keep everything within the station's bandwidth, reject everything outside it. In hardware this was a carefully tuned LC or crystal filter, a physical object with a physical resonance. In software it's a weighted running sum, probably the most ordinary loop you'll write all year.

A finite-impulse-response (FIR) filter slides a short window of coefficients $h[k]$ along the sample stream and, for each output sample, computes a weighted sum of the recent inputs. That is equation 3, a convolution, the workhorse of DSP.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
y[n] = \sum_{k=0}^{N-1} h[k]\,x[n-k]
```

$$
y[n] = \sum_{k=0}^{N-1} h[k]\,x[n-k]
$$

The coefficients $h[k]$ are where the design lives. Choose them for a low-pass shape and the loop passes slow variations (your centred channel) while cancelling fast ones (the neighbours). A windowed-sinc design computes a decent set in one call, and the convolution itself is one more.

```python
from scipy.signal import firwin

channel_bw = 200e3                                  # keep ±100 kHz around DC
taps = firwin(numtaps=64, cutoff=channel_bw/2, fs=fs)
filtered = np.convolve(baseband, taps, mode='same') # equation 3, vectorised
```

Two lines: design the taps, run the convolution. `np.convolve` is equation 3 with the loop hidden inside a C kernel: for each output it multiplies 64 coefficients by 64 recent samples and adds them up. Running tally: about 11 lines, and the neighbouring channels are gone.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

A filter is fully described by what it does at each frequency, and that's what this plot shows: gain on the vertical axis, frequency on the horizontal. Your `firwin` taps produce a curve like this: flat across the band you keep, then a drop into the band you reject. Slide **Pole freq ωn** to move the cutoff, which in `firwin` terms is choosing where the keep/reject boundary falls. The other knob is the tap count: more coefficients in equation 3 buy a steeper transition wall and a sharper line between your channel and the one next door, at the cost of more multiplies per sample. Every FIR design is that negotiation: sharper walls cost arithmetic.

## Demodulation = take the envelope

The station is centred and isolated. One step remains: turn the complex stream back into something a speaker can play. For an AM (amplitude-modulation) signal, such as broadcast medium wave or aircraft voice in the 118–137 MHz airband, the audio is encoded in the carrier's *amplitude*, how big the wave is moment to moment. Equation 1 already told us the amplitude of a complex sample is its magnitude. So AM demodulation is the magnitude of the complex baseband, equation 4, as short as it sounds.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
m[n] = |y[n]| = \sqrt{I[n]^2 + Q[n]^2}
```

$$
m[n] = |y[n]| = \sqrt{I[n]^2 + Q[n]^2}
$$

Because the signal is already complex baseband, you don't need the analog trick of a diode and a capacitor to trace the envelope. It's sitting right there as the magnitude, and `np.abs` reads it off directly.

```python
from scipy.signal import decimate

envelope = np.abs(filtered)            # equation 4: the AM envelope
audio = envelope - np.mean(envelope)   # drop the DC carrier offset
audio = decimate(audio, int(fs / 48e3))  # 2.4 MS/s down to 48 kHz audio
audio /= np.max(np.abs(audio))         # normalise to ±1 for the sound card
```

Take the magnitude, subtract the carrier's DC term, drop the rate to something a sound card wants, normalise. Four lines, and `filtered` has become playable audio. Running tally: about 15 lines of real signal processing on top of the 6-line capture, comfortably under 100 once you add the file plumbing and a `sounddevice.play(audio, 48000)` at the end.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

This is what you're undoing. The **Message** (a slow tone) rides on a fast **Carrier**, and the modulated signal's outline, its envelope, is a copy of the message in the carrier's amplitude. Demodulation just reads that outline back, which `np.abs` does for free on the complex baseband. Now drag **Mod index (m)** past 1.0 into overmodulation: the envelope crosses zero and folds back on itself, so the outline stops being a faithful copy of the message. That folding is audible distortion, and it's why AM transmitters keep the modulation index below 1, a constraint you can *see* here and *hear* in the recovered audio.

## Put it together: 100 lines, a dongle, a voice out of the noise

Let's stack the pieces, and the whole receiver fits on one screen. Capture, downconvert, filter, demodulate: four functions, each a near-transcription of an equation you've now seen in a lab.

```python

from rtlsdr import RtlSdr
from scipy.signal import firwin, decimate

def capture(center, fs=2.4e6, n=1 << 20):
    sdr = RtlSdr()
    sdr.sample_rate, sdr.center_freq, sdr.gain = fs, center, 'auto'
    iq = sdr.read_samples(n)
    sdr.close()
    return iq, fs

def downconvert(iq, f_offset, fs):                     # equation 2
    n = np.arange(len(iq))
    return iq * np.exp(-1j * 2 * np.pi * f_offset * n / fs)

def channel_filter(x, fs, bw=200e3, taps=64):          # equation 3
    h = firwin(taps, bw / 2, fs=fs)
    return np.convolve(x, h, mode='same')

def am_demod(x, fs, audio_fs=48e3):                    # equation 4
    env = np.abs(x) - np.mean(np.abs(x))
    audio = decimate(env, int(fs / audio_fs))
    return audio / np.max(np.abs(audio))

iq, fs = capture(center=120.0e6)        # an airband voice channel (AM, ~118–137 MHz)
bb     = downconvert(iq, f_offset=0, fs=fs)
chan   = channel_filter(bb, fs)
audio  = am_demod(chan, fs)
sd.play(audio, 48000)
```

Count it: roughly 30 lines with the imports, signatures, and the whitespace that makes it readable. The arithmetic, the part that *is* the radio, is four operations: a multiply, a convolution, a magnitude, a rate change. A voice comes out of the speaker, and not one line of it tuned a circuit. The dongle delivered an array; `numpy` did the rest. Not bad for an afternoon.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Every classic RF block has a one-line software twin: the mixer is a multiply, the filter is a for-loop, the demodulator is an absolute value.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The four labs here weren't illustrations of a radio. They *were* the radio, one stage each. The FFT spectrum is how an SDR finds a station. The constellation plot is the IQ stream it computes on. The Bode plot is the channel-select filter's frequency response. The AM modulation lab is the envelope you reverse to get audio. You've been operating the four stages of a software radio with sliders this whole time; this post only connected the wires.

## The same DSP is in every phone in your pocket

Once a radio is a `for` loop, the loop runs everywhere. The pipeline you just wrote (downconvert, filter, demodulate on a complex baseband stream) is roughly the skeleton of the baseband processor in every phone, every Wi-Fi chip, every Bluetooth earbud. The differences are in the demodulator (your phone tracks the *angle* of equation 1 for digital phase modulation, where you tracked the *magnitude* for AM) and in the volume of arithmetic, not the architecture. The constellation lab's 16-QAM isn't a toy; it's how your phone packs bits onto the carrier, and the receiver decides each noisy dot's intended point with the same geometry you watched smear under falling SNR.

The framework that made this style of radio mainstream is [GNU Radio](https://www.gnuradio.org/), where you wire these same blocks (a "source", a "multiply by exponential", a "low-pass filter", an "AM demod") into a flow graph instead of a Python script. Each block is a tidied, optimised version of the four functions above. And the operation underneath all of it, the FFT, turns the opening lab's spectrum from an $O(N^2)$ chore into an $O(N \log N)$ routine fast enough to run in real time on a laptop. Without a fast FFT there is no real-time SDR; the whole edifice rests on that algorithm.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Software doesn't repeal physics. The antenna's size still sets which bands you can hear, and the tuner's range sets the rest. A stock RTL-SDR covers roughly 24 MHz to 1.7 GHz, so the broadcast AM band below it needs an upconverter or a direct-sampling mod. The ADC's bit depth still sets your dynamic range: a strong local station can saturate the converter and bury a weak one no `numpy` can recover. And aliasing is unforgiving. Anything outside your sampled bandwidth folds back in as a phantom, so a real receiver keeps one analog low-pass filter ahead of the ADC. The radio is software, but the *front end* (antenna, gain, anti-alias filter, converter) is an engineering problem you can't code your way out of.

The deeper lesson outlasts radio. Any time you can sample a physical quantity fast and accurately enough, the analog processing that used to be a rack of equipment collapses into arithmetic on a stream of numbers. Software-defined radio is the cleanest example because the math is so old and so exact (Fourier in 1822, Nyquist in 1928, Shannon's information theory in 1948), but the move is general. Digitise early, process in software, and the hardware shrinks to the one component that genuinely touches the physical world. For a radio, that's the antenna. Everything after it is a `for` loop, and once you've seen one analog rack dissolve like this, you'll start spotting the same trick everywhere. Grab a dongle and go listen.

## Reading further

- [Lyons, *Understanding Digital Signal Processing*, 3rd ed., chapter 8](https://www.pearson.com/en-us/subject-catalog/p/understanding-digital-signal-processing/P200000009523): the canonical bridge from DSP theory to real receivers; chapter 8 on quadrature signals and complex down-conversion is the textbook home of equations 1 and 2.
- [Ossmann, *Software Defined Radio with HackRF* (free video course)](https://greatscottgadgets.com/sdr/): Michael Ossmann's hands-on GNU Radio course; it builds IQ, mixing, and filtering intuition by driving real hardware block by block.
- [About RTL-SDR (the cheap-dongle origin story)](https://www.rtl-sdr.com/about-rtl-sdr/): the practical entry point, a 30-dollar dongle plus open-source software, and the discovery that DVB-T tuners could be repurposed as wideband receivers.
- [Cooley & Tukey, *An Algorithm for the Machine Calculation of Complex Fourier Series* (Math. Comp. 19, no. 90, 1965, pp. 297–301)](https://www.ams.org/journals/mcom/1965-19-090/S0025-5718-1965-0178586-1/): the five-page note that makes the opening lab's FFT fast enough to run in real time; without it, software radio stays a thought experiment.
