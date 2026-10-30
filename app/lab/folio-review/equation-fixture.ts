/** Layout variants only. Existing RLC/attention expressions are reproduced unchanged;
 * these are not new research claims or measured results. String.raw keeps TeX exact. */
export const equationFixture = String.raw`
## Equation and source

These are layout specimens using existing article expressions, not new findings. Inline math $\omega_0 = 1/\sqrt{LC}$ remains part of the sentence. Follow the [numbered equation](#eqn:review-rlc).

<Equation id="eqn:review-rlc" number="1" caption="The series-RLC step response: a second-order ODE for the capacitor voltage. ω₀ is the natural frequency, ζ the damping ratio." latex="\frac{d^2 v_C}{dt^2} + 2\zeta\omega_0\,\frac{dv_C}{dt} + \omega_0^2\,v_C = \omega_0^2\,V_{step}">

$$
\frac{d^2 v_C}{dt^2} + 2\zeta\omega_0\,\frac{dv_C}{dt} + \omega_0^2\,v_C = \omega_0^2\,V_{step}
$$

</Equation>

### A long expression keeps its source

<Equation id="eqn:review-multihead" caption="Multi-head attention, reproduced as a long-expression layout specimen." latex="\text{MultiHead}(Q,K,V) = \operatorname{Concat}(\text{head}_1, \dots, \text{head}_h)\, W_O">

$$
\text{MultiHead}(Q,K,V) = \operatorname{Concat}(\text{head}_1, \dots, \text{head}_h)\, W_O
$$

</Equation>

### No caption or number

<Equation latex="\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}">

$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$

</Equation>

### Multiline mathematics without copy actions

This variant deliberately omits the optional copy source. The displayed children still render through KaTeX.

<Equation number="2" caption="Gray–Scott equations reproduced as a multiline layout specimen; no copy source is supplied.">

$$
\begin{aligned} \frac{\partial u}{\partial t} &= D_u\,\nabla^2 u - u v^2 + F(1 - u) \\[4pt] \frac{\partial v}{\partial t} &= D_v\,\nabla^2 v + u v^2 - (F + k)\,v \end{aligned}
$$

</Equation>

### A full-width multiplier identity

This overflow specimen reproduces the equation, caption and copy source from [PLL from first principles](/blog/pll-from-first-principles/#eqn:pll-multiply) unchanged; only its local cross-reference ID differs. Scroll the equation region to inspect the full identity.

<Equation id="eqn:review-pll-multiply" number="1" caption="A multiplier phase detector. The high-frequency term is filtered out; the low-frequency term carries the phase error." latex="2 \sin(\omega_\text{ref} t + \phi_\text{ref}) \cdot \sin(\omega_\text{vco} t + \phi_\text{vco}) = \cos\!\big((\omega_\text{ref} - \omega_\text{vco})\,t + (\phi_\text{ref} - \phi_\text{vco})\big) - \cos\!\big((\omega_\text{ref} + \omega_\text{vco})\,t + (\phi_\text{ref} + \phi_\text{vco})\big)">

$$
2 \sin(\omega_\text{ref} t + \phi_\text{ref}) \cdot \sin(\omega_\text{vco} t + \phi_\text{vco}) =
   \cos\!\big((\omega_\text{ref} - \omega_\text{vco})\,t + (\phi_\text{ref} - \phi_\text{vco})\big) - \cos\!\big((\omega_\text{ref} + \omega_\text{vco})\,t + (\phi_\text{ref} + \phi_\text{vco})\big)
$$

</Equation>
`;
