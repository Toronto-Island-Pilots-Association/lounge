/**
 * Supabase SSR stores sessions in cookies (often `base64-` + base64url UTF-8).
 * Corrupted or truncated chunks make @supabase/ssr throw "Invalid UTF-8 sequence"
 * inside getItem → 500 on Vercel. Drop broken sb-* groups so auth treats the
 * user as signed out instead of crashing the handler.
 */
function baseStorageKey(name: string): string {
  const m = name.match(/^(.*)\.(0|[1-9][0-9]*)$/)
  return m ? m[1]! : name
}

function chunkIndex(name: string): number {
  const m = name.match(/\.(0|[1-9][0-9]*)$/)
  return m ? parseInt(m[1]!, 10) : 0
}

function isHealthySupabaseCookiePayload(combined: string): boolean {
  try {
    if (combined.startsWith('base64-')) {
      const b64 = combined.slice('base64-'.length).replace(/[\t\n\r= ]/g, '')
      const buf = Buffer.from(b64, 'base64url')
      new TextDecoder('utf-8', { fatal: true }).decode(buf)
      return true
    }
    if (combined.startsWith('{') || combined.startsWith('[')) {
      JSON.parse(combined)
      return true
    }
    return true
  } catch {
    return false
  }
}

export function sanitizeAuthCookies(
  all: { name: string; value: string }[],
): { name: string; value: string }[] {
  const passthrough: { name: string; value: string }[] = []
  const supabase: { name: string; value: string }[] = []
  for (const c of all) {
    if (c.name.startsWith('sb-')) supabase.push(c)
    else passthrough.push(c)
  }
  if (supabase.length === 0) return all

  const byBase = new Map<string, { name: string; value: string }[]>()
  for (const c of supabase) {
    const base = baseStorageKey(c.name)
    if (!byBase.has(base)) byBase.set(base, [])
    byBase.get(base)!.push(c)
  }

  const badNames = new Set<string>()
  for (const [, group] of byBase) {
    const sorted = [...group].sort((a, b) => chunkIndex(a.name) - chunkIndex(b.name))
    const combined = sorted.map((g) => g.value).join('')
    if (!isHealthySupabaseCookiePayload(combined)) {
      for (const g of group) badNames.add(g.name)
    }
  }

  const kept = supabase.filter((c) => !badNames.has(c.name))
  return [...passthrough, ...kept]
}
