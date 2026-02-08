/**
 * Format a date string to a relative time (e.g., "2h ago", "3d ago")
 * For sidebar and list views
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format a date string to a relative time with full date for detail views
 * Includes time for recent dates, full date for older ones
 */
export function formatDetailDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  })
}

/**
 * Strip markdown formatting from text for preview purposes
 * Removes **bold**, line breaks, and other markdown syntax
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''
  
  // Remove markdown bold (**text**)
  let cleaned = text.replace(/\*\*(.+?)\*\*/g, '$1')
  
  // Remove markdown italic (*text* or _text_)
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1')
  cleaned = cleaned.replace(/_(.+?)_/g, '$1')
  
  // Replace line breaks with spaces
  cleaned = cleaned.replace(/\n/g, ' ')
  
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  return cleaned.trim()
}
