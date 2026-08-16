import { describe, it, expect } from 'vitest'
import {
  REDACTED,
  SECRET_NAME_PATTERN,
  redactArgs,
  redactText,
  redactValue,
} from './redact'

describe('redactText — bearer / authorization headers', () => {
  it('keeps the scheme and drops the token in an Authorization header', () => {
    expect(redactText('Authorization: Bearer sk-abc123def456')).toBe(
      `Authorization: Bearer ${REDACTED}`
    )
  })

  it('redacts a schemeless Authorization value to end of line', () => {
    expect(redactText('authorization=hunter2')).toBe(`authorization=${REDACTED}`)
  })

  it('redacts the JSON header form and keeps the quotes', () => {
    expect(redactText('{"Authorization": "Bearer sk-abc123def456"}')).toBe(
      `{"Authorization": "Bearer ${REDACTED}"}`
    )
  })

  it('redacts a standalone bearer token with no header name', () => {
    expect(redactText('sent Bearer eyJhbGciOiJIUzI1NiJ9 upstream')).toBe(
      `sent Bearer ${REDACTED} upstream`
    )
  })

  it('leaves the English word "bearer" in prose alone', () => {
    expect(redactText('the bearer of bad news')).toBe('the bearer of bad news')
  })
})

describe('redactText — assignments', () => {
  it('redacts a bare env assignment', () => {
    expect(redactText('API_KEY=sk-live-abc123')).toBe(`API_KEY=${REDACTED}`)
  })

  it('keeps the vendor prefix of a prefixed name', () => {
    expect(redactText('MOONSHOT_API_KEY: xyz789')).toBe(`MOONSHOT_API_KEY: ${REDACTED}`)
  })

  it('redacts the JSON assignment form, preserving surrounding quotes', () => {
    expect(redactText('{"api_key": "sk-abc123", "model": "k2"}')).toBe(
      `{"api_key": "${REDACTED}", "model": "k2"}`
    )
  })

  it('is case-insensitive', () => {
    expect(redactText('moonshot_api_key=abc123')).toBe(`moonshot_api_key=${REDACTED}`)
    expect(redactText('SECRET: shhh')).toBe(`SECRET: ${REDACTED}`)
  })

  it('covers the rest of the name set', () => {
    expect(redactText('password=hunter2')).toBe(`password=${REDACTED}`)
    expect(redactText('CONNECTION_STRING=postgres://u:p@h/db')).toBe(
      `CONNECTION_STRING=${REDACTED}`
    )
    expect(redactText('private_key=MIIEpAIBAAK')).toBe(`private_key=${REDACTED}`)
    expect(redactText('jwt=a.b.c')).toBe(`jwt=${REDACTED}`)
  })

  it('stops the value at an angle bracket so it cannot eat the rest of an artifact', () => {
    expect(redactText('<p>API_KEY=sk-abc123</p><footer>ok</footer>')).toBe(
      `<p>API_KEY=${REDACTED}</p><footer>ok</footer>`
    )
    expect(redactText('<span>Authorization: Bearer sk-abc123</span>done')).toBe(
      `<span>Authorization: Bearer ${REDACTED}</span>done`
    )
  })

  it('redacts only the value, leaving the rest of the line intact', () => {
    expect(redactText('env: API_KEY=sk-1 MODEL=k2 (from .env)')).toBe(
      `env: API_KEY=${REDACTED} MODEL=k2 (from .env)`
    )
  })
})

describe('redactText — CLI flags', () => {
  it('redacts a space-separated flag value', () => {
    expect(redactText('agy --api-key sk-abc123 --model gemini')).toBe(
      `agy --api-key ${REDACTED} --model gemini`
    )
  })

  it('redacts an equals-separated flag value', () => {
    expect(redactText('agy --api-key=sk-abc123 --model gemini')).toBe(
      `agy --api-key=${REDACTED} --model gemini`
    )
  })

  it('redacts a single-dash flag', () => {
    expect(redactText('curl -token sk-abc123')).toBe(`curl -token ${REDACTED}`)
  })

  it('leaves --max-tokens alone (name does not END at a secret word)', () => {
    expect(redactText('codex --max-tokens 5000')).toBe('codex --max-tokens 5000')
  })
})

describe('redactText — negative cases (false-positive floor)', () => {
  it('leaves a bare high-entropy literal alone (long literals are an explicit non-goal)', () => {
    const sha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    expect(redactText(sha)).toBe(sha)
    expect(redactText(`promptHash: ${sha}`)).toBe(`promptHash: ${sha}`)
  })

  it('leaves a non-matching name alone', () => {
    expect(redactText('monkey=banana')).toBe('monkey=banana')
    expect(redactText('turnkey=yes')).toBe('turnkey=yes')
  })

  it('leaves the plain word "token" with no assignment alone', () => {
    expect(redactText('the token expired before the retry')).toBe(
      'the token expired before the retry'
    )
    expect(redactText('{"tokensIn":42,"tokensOut":900}')).toBe('{"tokensIn":42,"tokensOut":900}')
  })

  it('leaves benign artifact HTML/CSS/JS untouched', () => {
    const html = [
      '<!DOCTYPE html><html><head><style>',
      '@keyframes spin { to { transform: rotate(360deg) } }',
      '.k { animation: spin 1s }',
      '</style></head><body>',
      '<div data-key="physics" data-keyframe="3">keyboard</div>',
      '<script>document.addEventListener("keydown", (e) => console.log(e.key))</script>',
      '</body></html>',
    ].join('\n')
    expect(redactText(html)).toBe(html)
  })

  it('leaves a CSS custom property named --token alone', () => {
    // A `--token: #333` design-token variable is far more likely in a generated
    // artifact than a colon-form `--token:` CLI flag, which does not exist.
    expect(redactText(':root { --token: #333; --token-fg: #fff }')).toBe(
      ':root { --token: #333; --token-fg: #fff }'
    )
  })
})

describe('redactText — idempotence + short-circuit', () => {
  it('redacting already-redacted text changes nothing', () => {
    const inputs = [
      'Authorization: Bearer sk-abc123',
      '{"api_key": "sk-abc123"}',
      'API_KEY=sk-live-abc123',
      'agy --api-key sk-abc123 --model x',
      'agy --api-key=sk-abc123',
      'sent Bearer eyJhbGciOiJIUzI1NiJ9 upstream',
    ]
    for (const input of inputs) {
      const once = redactText(input)
      expect(redactText(once), `not idempotent for: ${input}`).toBe(once)
      expect(redactText(redactText(once))).toBe(once)
    }
  })

  it('returns the identical string when no credential name is present', () => {
    const text = 'a'.repeat(1000)
    expect(redactText(text)).toBe(text)
    expect(redactText('')).toBe('')
  })
})

describe('SECRET_NAME_PATTERN', () => {
  it('is a non-global regex, so .test() is not stateful', () => {
    expect(SECRET_NAME_PATTERN.global).toBe(false)
    expect(SECRET_NAME_PATTERN.test('API_KEY')).toBe(true)
    expect(SECRET_NAME_PATTERN.test('API_KEY')).toBe(true)
    expect(SECRET_NAME_PATTERN.test('monkey')).toBe(false)
  })
})

describe('redactArgs', () => {
  it('redacts the token AFTER a matching flag', () => {
    expect(redactArgs(['run', '--api-key', 'sk-abc123', '--model', 'k2'])).toEqual([
      'run',
      '--api-key',
      REDACTED,
      '--model',
      'k2',
    ])
  })

  it('redacts the RHS of a --flag=value argument', () => {
    expect(redactArgs(['run', '--api-key=sk-abc123'])).toEqual(['run', `--api-key=${REDACTED}`])
  })

  it('leaves non-secret flags and their values alone', () => {
    expect(redactArgs(['-m', 'opencode/deepseek', '--max-tokens', '5000'])).toEqual([
      '-m',
      'opencode/deepseek',
      '--max-tokens',
      '5000',
    ])
  })

  it('keeps a prompt argument intact except for secrets embedded in it', () => {
    const prompt = 'Build a keyboard shortcut demo using @keyframes and a data-key attribute.'
    expect(redactArgs(['run', prompt])).toEqual(['run', prompt])
    expect(redactArgs(['run', `${prompt} API_KEY=sk-abc`])).toEqual([
      'run',
      `${prompt} API_KEY=${REDACTED}`,
    ])
  })

  it('is idempotent', () => {
    const once = redactArgs(['run', '--api-key', 'sk-abc123', '--api-key=sk-xyz'])
    expect(redactArgs(once)).toEqual(once)
  })
})

describe('redactValue', () => {
  it('walks strings inside nested objects and arrays', () => {
    expect(
      redactValue({
        error: 'CLI exited with code 1: API_KEY=sk-abc123',
        checks: [{ detail: 'Authorization: Bearer sk-abc123' }],
        tokensIn: 42,
        cacheHit: false,
        missing: null,
      })
    ).toEqual({
      error: `CLI exited with code 1: API_KEY=${REDACTED}`,
      checks: [{ detail: `Authorization: Bearer ${REDACTED}` }],
      tokensIn: 42,
      cacheHit: false,
      missing: null,
    })
  })

  it('passes non-string scalars through unchanged', () => {
    expect(redactValue(7)).toBe(7)
    expect(redactValue(undefined)).toBeUndefined()
  })
})
