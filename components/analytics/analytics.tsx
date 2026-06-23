import { GoogleAnalytics } from '@next/third-parties/google'

/**
 * Production-only, env-gated analytics. Two cookieless/GA providers:
 *
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID   GA4 (like ../shorted). Renders the gtag
 *                                   loader via @next/third-parties.
 *   NEXT_PUBLIC_CF_BEACON_TOKEN     Cloudflare Web Analytics beacon. OPTIONAL —
 *                                   leave UNSET when CF Web Analytics is set to
 *                                   "automatic" injection at the edge (the
 *                                   default in this project's Terraform), so the
 *                                   beacon isn't injected twice.
 *
 * Both only render in production builds, so dev/preview ship no third-party JS.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const CF_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN
const IS_PROD = process.env.NODE_ENV === 'production'

export function Analytics() {
  return (
    <>
      {IS_PROD && GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      {IS_PROD && CF_TOKEN ? (
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: CF_TOKEN })}
        />
      ) : null}
    </>
  )
}
