import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts @[Name](id) mention format to clean @Name for plain-text contexts
 */
export const stripMentionFormat = (text: string): string =>
  text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')

/**
 * Strips markdown, HTML tags, and mention format from text.
 * Use for email previews, plain-text truncation, etc.
 */
export const stripFormatting = (text: string): string =>
  text
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()

/**
 * Converts @[Name](id) mentions to styled HTML spans for emails
 */
export const mentionsToEmailHtml = (text: string): string =>
  text.replace(
    /@\[([^\]]+)\]\([^)]+\)/g,
    '<span style="color: #1264a3; font-weight: 600;">@$1</span>'
  )
