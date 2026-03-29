export type PageStatus = 'draft' | 'published'

export function slugifyPageSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function validatePageSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) return { valid: false, error: 'Slug is required.' }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens.' }
  }
  if (slug.length > 80) {
    return { valid: false, error: 'Slug must be 80 characters or less.' }
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen.' }
  }
  return { valid: true }
}

export function pageStatusFromPublished(published: boolean): PageStatus {
  return published ? 'published' : 'draft'
}

export function pagePublishedFromInput(input: unknown): boolean {
  if (input === 'published') return true
  if (input === 'draft') return false
  return input === true
}
