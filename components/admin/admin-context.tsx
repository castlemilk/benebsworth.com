'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { ADMIN, isAdminConfigured } from '@/lib/admin/config'

/**
 * Admin auth for the /admin image CRM. Uses Google Identity Services (client-side):
 * one OAuth token-client requests `openid email` + the GCS read/write scope, so
 * the SAME flow yields the signed-in email (for the UI gate) and an access token
 * the browser uses to upload directly to GCS. There is NO server — write security
 * is the bucket's IAM (only the admin's account can write).
 *
 * The email check only governs whether the editor UI renders; a non-admin can
 * sign in but their token has no bucket write grant, so GCS rejects writes.
 */

type Admin = {
  configured: boolean
  ready: boolean
  email: string | null
  isAdmin: boolean
  signIn: () => void
  signOut: () => void
  getToken: () => Promise<string>
}

const Ctx = createContext<Admin | null>(null)
export const useAdmin = () => useContext(Ctx)

type TokenResponse = { access_token?: string; expires_in?: number; error?: string }
type TokenClientError = { type?: string; message?: string }
type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void }
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (c: {
            client_id: string
            scope: string
            callback: (r: TokenResponse) => void
            error_callback?: (e: TokenClientError) => void
          }) => TokenClient
          revoke: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

/** How long a getToken() waiter is allowed to sit before it rejects. A blocked
 *  or dismissed consent popup can fire NO callback at all — without a deadline
 *  the promise never settles and save/upload UIs hang on "Saving…" forever. */
const TOKEN_TIMEOUT_MS = 60_000

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const configured = isAdminConfigured()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const tokenRef = useRef<{ value: string; exp: number } | null>(null)
  const clientRef = useRef<TokenClient | null>(null)
  const pending = useRef<{ resolve: (t: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }[]>([])
  const silentTried = useRef(false)

  // Settle every pending getToken() waiter: resolve with a token, or reject
  // (popup blocked/closed, GIS error, timeout cleanup) — never leave them hanging.
  const settlePending = useCallback((token: string | null, err?: Error) => {
    pending.current.splice(0).forEach((p) => {
      clearTimeout(p.timer)
      if (token) p.resolve(token)
      else p.reject(err ?? new Error('sign-in failed'))
    })
  }, [])

  // Auth is session-scoped (token-client, no refresh token): we deliberately do
  // NOT restore a cached email on load. Restoring email-without-token made the
  // CRM look signed-in while holding no token, so the first upload triggered a
  // sign-in popup mid-file-chooser → blocked. Now a reload shows the Sign-in
  // button; clicking it (a clean gesture) opens the popup and caches the token.

  // dev-only: preview the editor UI without real OAuth (`?previewAdmin=1`).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.get('previewAdmin') === '1') localStorage.setItem('admin:preview', '1')
      if (localStorage.getItem('admin:preview') === '1') setEmail(ADMIN.adminEmail)
    } catch {
      /* localStorage unavailable — dev preview simply doesn't activate */
    }
  }, [])

  const initClient = useCallback(() => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2 || !ADMIN.googleClientId) return
    clientRef.current = oauth2.initTokenClient({
      client_id: ADMIN.googleClientId,
      scope: ADMIN.scope,
      callback: (res) => {
        if (res.error || !res.access_token) {
          settlePending(null, new Error(res.error || 'sign-in failed'))
          return
        }
        tokenRef.current = { value: res.access_token, exp: Date.now() + (res.expires_in ?? 3600) * 1000 - 60_000 }
        try {
          localStorage.setItem('admin:seen', '1') // hint to silently restore next load
        } catch {
          /* localStorage unavailable — silent restore just won't happen next load */
        }
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${res.access_token}` },
        })
          .then((r) => r.json())
          .then((u: { email?: string }) => {
            if (u.email) setEmail(u.email)
          })
          .catch(() => {})
        settlePending(res.access_token)
      },
      // Fires when the consent popup is blocked or closed (or GIS fails to
      // init). Reject the waiters so save/upload flows surface a real error
      // and reset their busy state instead of hanging on "Saving…".
      error_callback: (e) => {
        settlePending(null, new Error(e?.message || e?.type || 'Google sign-in popup was blocked or closed'))
      },
    })
    setReady(true)
  }, [settlePending])

  const signIn = useCallback(() => {
    if (!clientRef.current) initClient()
    clientRef.current?.requestAccessToken({ prompt: '' })
  }, [initClient])

  const signOut = useCallback(() => {
    const t = tokenRef.current?.value
    if (t) window.google?.accounts?.oauth2?.revoke(t)
    tokenRef.current = null
    setEmail(null)
    try {
      localStorage.removeItem('admin:seen')
      localStorage.removeItem('admin:preview')
    } catch {
      /* localStorage unavailable — nothing to clear */
    }
  }, [])

  const getToken = useCallback(() => {
    const cur = tokenRef.current
    if (cur && cur.exp > Date.now()) return Promise.resolve(cur.value)
    return new Promise<string>((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        // Belt-and-braces alongside error_callback: some blocked-popup paths
        // fire no callback at all, so each waiter also self-rejects after a
        // deadline (removing only itself from the queue).
        timer: setTimeout(() => {
          const i = pending.current.indexOf(entry)
          if (i !== -1) pending.current.splice(i, 1)
          reject(new Error('Google sign-in timed out — the popup may have been blocked or closed. Try again.'))
        }, TOKEN_TIMEOUT_MS),
      }
      pending.current.push(entry)
      if (!clientRef.current) initClient()
      clientRef.current?.requestAccessToken({ prompt: '' })
    })
  }, [initClient])

  // On GIS load: create the client, then — if the admin signed in before
  // (`admin:seen`) — try a SILENT token (`prompt: 'none'`, hidden iframe, no
  // popup). Restores the session across refreshes; fails quietly to the
  // Sign-in button if Google has no active session / grant.
  const bootstrap = useCallback(() => {
    initClient()
    try {
      if (!silentTried.current && localStorage.getItem('admin:seen') === '1') {
        silentTried.current = true
        clientRef.current?.requestAccessToken({ prompt: 'none' })
      }
    } catch {
      /* localStorage unavailable — skip the silent-restore attempt */
    }
  }, [initClient])

  const value: Admin = {
    configured,
    ready,
    email,
    isAdmin: !!email && email.toLowerCase() === ADMIN.adminEmail.toLowerCase(),
    signIn,
    signOut,
    getToken,
  }

  return (
    <Ctx.Provider value={value}>
      {configured && (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={bootstrap} />
      )}
      {children}
    </Ctx.Provider>
  )
}
