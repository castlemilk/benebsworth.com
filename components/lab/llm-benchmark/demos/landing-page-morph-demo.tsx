'use client'

import { useState } from 'react'
import { BarChart3, Check, Moon, ShieldCheck, Sun, Zap } from 'lucide-react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#f59e0b'

export function LandingPageMorphDemo({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const isDark = theme === 'dark'

  const t = isDark
    ? {
        page: 'bg-[#0b0b10] text-[#f4f4f5]',
        muted: 'text-[#a1a1aa]',
        card: 'bg-[#14141b]',
        border: 'border-[#27272a]',
        hero: 'bg-[#18181f]',
        input: 'bg-[#1c1c24]',
      }
    : {
        page: 'bg-white text-[#18181b]',
        muted: 'text-[#52525b]',
        card: 'bg-[#f4f4f5]',
        border: 'border-[#e4e4e7]',
        hero: 'bg-[#fffbeb]',
        input: 'bg-white',
      }

  const transition = 'transition-colors duration-500 motion-reduce:transition-none'

  const features = [
    {
      icon: Zap,
      title: 'Lightning fast',
      desc: 'Deploy in seconds with edge-optimized builds and global CDN.',
    },
    {
      icon: ShieldCheck,
      title: 'Built-in security',
      desc: 'Authentication, audit logs, and encryption enabled by default.',
    },
    {
      icon: BarChart3,
      title: 'Real-time analytics',
      desc: 'Understand your users with live dashboards and insights.',
    },
  ]

  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: ['1 project', 'Community support', 'Basic analytics'],
    },
    {
      name: 'Pro',
      price: '$29',
      features: ['Unlimited projects', 'Priority support', 'Advanced analytics', 'Custom domains'],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['SSO & SAML', 'Dedicated infrastructure', 'SLA', 'Audit logs'],
    },
  ]

  return (
    <DemoFrame
      title="Landing Page Morph"
      accent={ACCENT}
      blurb="Responsive marketing page with theme toggle"
      className={className}
      controls={
        <button
          type="button"
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          aria-pressed={isDark}
          aria-label="Toggle landing page theme"
          className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-[0.65rem] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
        >
          {isDark ? <Moon size={12} /> : <Sun size={12} />}
          <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
        </button>
      }
    >
      <div
        className={`absolute inset-0 overflow-auto ${transition} ${t.page}`}
        data-theme={theme}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Navigation */}
          <nav className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: ACCENT }}
                aria-hidden
              />
              <span>Astrope</span>
            </div>
            <div className={`flex flex-wrap items-center gap-4 text-xs font-medium ${t.muted} ${transition}`}>
              <a href="#features" className="hover:text-[#f59e0b]">
                Features
              </a>
              <a href="#pricing" className="hover:text-[#f59e0b]">
                Pricing
              </a>
              <a href="#docs" className="hover:text-[#f59e0b]">
                Docs
              </a>
              <button className="rounded-full bg-[#f59e0b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#d97706]">
                Get started
              </button>
            </div>
          </nav>

          {/* Hero */}
          <section
            className={`relative overflow-hidden rounded-2xl px-4 py-10 text-center sm:py-14 ${t.hero} ${transition}`}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
              <div className="h-40 w-40 rounded-full bg-[#f59e0b] blur-3xl" />
              <div className="-ml-8 h-40 w-40 rounded-full bg-[#ec4899] blur-3xl" />
            </div>
            <div className="relative">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Build faster with{' '}
                <span className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444] bg-clip-text text-transparent">
                  Astrope
                </span>
              </h1>
              <p className={`mx-auto mt-3 max-w-lg text-xs sm:text-sm ${t.muted} ${transition}`}>
                A self-contained landing page that morphs between light and dark themes. No
                external images, just responsive components.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button className="rounded-lg bg-[#f59e0b] px-5 py-2 text-xs font-semibold text-white shadow hover:bg-[#d97706]">
                  Start building
                </button>
                <button
                  className={`rounded-lg border px-5 py-2 text-xs font-semibold ${t.border} ${t.card} ${transition}`}
                >
                  View demo
                </button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="py-8 sm:py-10">
            <h2 className={`text-center text-base font-semibold ${transition}`}>Everything you need</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`rounded-xl border p-4 ${t.card} ${t.border} ${transition}`}
                >
                  <div className="mb-3 inline-flex rounded-lg bg-[#f59e0b]/10 p-2 text-[#f59e0b]">
                    <feature.icon size={18} aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className={`mt-1 text-xs leading-relaxed ${t.muted} ${transition}`}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="pb-10 sm:pb-12">
            <h2 className={`text-center text-base font-semibold ${transition}`}>Simple pricing</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const isPro = plan.name === 'Pro'
                return (
                  <div
                    key={plan.name}
                    className={`rounded-xl border p-4 ${isPro ? 'border-[#f59e0b] ring-1 ring-[#f59e0b]' : t.border} ${t.card} ${transition}`}
                  >
                    <h3 className="text-sm font-semibold">{plan.name}</h3>
                    <div className="mt-2 text-2xl font-bold">{plan.price}</div>
                    <ul className="mt-3 space-y-2">
                      {plan.features.map((feat) => (
                        <li
                          key={feat}
                          className={`flex items-start gap-2 text-xs ${t.muted} ${transition}`}
                        >
                          <Check size={14} className="mt-0.5 shrink-0 text-[#f59e0b]" aria-hidden />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`mt-4 w-full rounded-lg py-2 text-xs font-semibold ${
                        isPro
                          ? 'bg-[#f59e0b] text-white hover:bg-[#d97706]'
                          : `border ${t.border} hover:bg-[#f59e0b]/10`
                      }`}
                    >
                      Choose {plan.name}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Footer */}
          <footer className={`border-t py-4 text-center text-xs ${t.border} ${t.muted} ${transition}`}>
            © {new Date().getFullYear()} Astrope. All rights reserved.
          </footer>
        </div>
      </div>
    </DemoFrame>
  )
}
