'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Member {
  id: string
  name: string
  profile_picture_url: string | null
}

interface TrackedMention {
  id: string
  name: string
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  minRows?: number
  id?: string
  required?: boolean
}

const toDisplayText = (value: string): string =>
  value.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')

const extractMentions = (value: string): TrackedMention[] => {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const mentions: TrackedMention[] = []
  let match
  while ((match = regex.exec(value)) !== null) {
    mentions.push({ name: match[1], id: match[2] })
  }
  return mentions
}

const toDataValue = (displayText: string, mentions: TrackedMention[]): string => {
  if (mentions.length === 0) return displayText

  const nameToId = new Map<string, string>()
  for (const m of mentions) nameToId.set(m.name, m.id)

  const namePattern = mentions
    .map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
    .join('|')

  return displayText.replace(
    new RegExp(`@(${namePattern})`, 'g'),
    (_, name) => {
      const id = nameToId.get(name)
      return id ? `@[${name}](${id})` : `@${name}`
    }
  )
}

function renderFormattedContent(
  text: string,
  mentions: TrackedMention[],
  placeholder?: string,
): React.ReactNode {
  if (!text) {
    return placeholder
      ? <span className="text-gray-400 select-none">{placeholder}</span>
      : null
  }

  if (mentions.length === 0) return text

  const namePattern = mentions
    .map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
    .join('|')

  const regex = new RegExp(`@(${namePattern})`, 'g')
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(
      <span
        key={key++}
        className="bg-[#d1ecf9] text-[#1264a3] rounded-sm"
      >
        @{match[1]}
      </span>,
    )
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}

/**
 * Calculates the pixel coordinates of a character position inside a textarea
 * by creating an off-screen mirror div with identical styling.
 */
function getCaretCoords(textarea: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const style = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')

  const copyProps = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
    'textTransform', 'wordSpacing', 'lineHeight', 'paddingTop', 'paddingRight',
    'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth',
    'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'width',
    'wordWrap', 'overflowWrap', 'whiteSpace', 'tabSize',
  ] as const

  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.overflow = 'hidden'
  mirror.style.height = 'auto'
  for (const p of copyProps) mirror.style[p as any] = style[p as any]
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'

  const textBefore = textarea.value.slice(0, position)
  mirror.textContent = textBefore

  const marker = document.createElement('span')
  marker.textContent = '\u200b' // zero-width space
  mirror.appendChild(marker)

  document.body.appendChild(mirror)
  const coords = {
    top: marker.offsetTop - textarea.scrollTop,
    left: marker.offsetLeft,
  }
  document.body.removeChild(mirror)
  return coords
}

export default function MentionInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  minRows = 2,
  id,
  required,
}: MentionInputProps) {
  const [displayValue, setDisplayValue] = useState(() => toDisplayText(value))
  const [mentions, setMentions] = useState<TrackedMention[]>(() => extractMentions(value))
  const [focused, setFocused] = useState(false)

  const [showDropdown, setShowDropdown] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInternalChange = useRef(false)
  // Tracks which @ position was dismissed so we don't re-trigger for the same one
  const dismissedAtRef = useRef<number | null>(null)

  // Sync on external value change (e.g. form reset)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    const newDisplay = toDisplayText(value)
    if (newDisplay !== displayValue) {
      setDisplayValue(newDisplay)
      setMentions(extractMentions(value))
      dismissedAtRef.current = null
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea height
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const lineH = 22
    const pad = 16
    const min = minRows * lineH + pad
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, min), 300)}px`
  }, [displayValue, minRows])

  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const notifyParent = useCallback(
    (newDisplay: string, newMentions: TrackedMention[]) => {
      isInternalChange.current = true
      onChange(toDataValue(newDisplay, newMentions))
    },
    [onChange],
  )

  const fetchMembers = useCallback(async (q: string, atPos: number | null) => {
    if (q.length < 1) { setMembers([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      const results = data.members || []
      setMembers(results)
      // Auto-dismiss: query has a space but nothing matched
      if (results.length === 0 && q.includes(' ') && atPos !== null) {
        dismissedAtRef.current = atPos
        setShowDropdown(false)
        setMentionStart(null)
      }
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showDropdown || !searchQuery) { setMembers([]); return }
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    const atPos = mentionStart
    fetchTimerRef.current = setTimeout(() => fetchMembers(searchQuery, atPos), 120)
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current) }
  }, [searchQuery, showDropdown, fetchMembers, mentionStart])

  const insertMention = (member: Member) => {
    if (mentionStart === null) return
    const cursor = textareaRef.current?.selectionStart ?? mentionStart
    const before = displayValue.slice(0, mentionStart)
    const after = displayValue.slice(cursor)
    const tag = `@${member.name} `
    const newDisplay = before + tag + after

    const newMentions = mentions.find(m => m.id === member.id)
      ? mentions
      : [...mentions, { id: member.id, name: member.name }]

    setDisplayValue(newDisplay)
    setMentions(newMentions)
    notifyParent(newDisplay, newMentions)
    setShowDropdown(false)
    setMentionStart(null)
    setSearchQuery('')
    setSelectedIndex(0)

    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      const pos = before.length + tag.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplay = e.target.value
    const cursor = e.target.selectionStart
    const active = mentions.filter(m => newDisplay.includes(`@${m.name}`))

    setDisplayValue(newDisplay)
    setMentions(active)
    notifyParent(newDisplay, active)

    const before = newDisplay.slice(0, cursor)
    const atIdx = before.lastIndexOf('@')

    if (atIdx >= 0 && dismissedAtRef.current !== atIdx) {
      const charBefore = atIdx > 0 ? before[atIdx - 1] : ' '
      const after = before.slice(atIdx + 1)
      if (
        (charBefore === ' ' || charBefore === '\n' || atIdx === 0) &&
        !after.includes('\n') &&
        after.length <= 30
      ) {
        setMentionStart(atIdx)
        setSearchQuery(after)
        setShowDropdown(true)
        setSelectedIndex(0)

        if (e.target) {
          const coords = getCaretCoords(e.target, atIdx)
          setDropdownPos({ top: coords.top + 22, left: coords.left })
        }
        return
      }
    }
    setShowDropdown(false)
    setMentionStart(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || members.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % members.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + members.length) % members.length)
        break
      case 'Enter':
        e.preventDefault()
        insertMention(members[selectedIndex])
        break
      case 'Escape':
        dismissedAtRef.current = mentionStart
        setShowDropdown(false)
        setMentionStart(null)
        break
    }
  }

  const lineH = 22
  const pad = 16

  return (
    <div className="relative" ref={containerRef}>
      {/* Editor frame */}
      <div
        className={`relative rounded-lg border transition-all duration-150 cursor-text ${
          focused
            ? 'border-[#0d1e26] shadow-[0_0_0_3px_rgba(13,30,38,0.08)] bg-white'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onClick={() => textareaRef.current?.focus()}
      >
        {/* Formatted overlay — mirrors textarea text with pills */}
        <div
          ref={overlayRef}
          className="absolute inset-0 px-3 py-2 text-[15px] leading-[22px] whitespace-pre-wrap break-words overflow-hidden pointer-events-none text-gray-900"
          aria-hidden="true"
        >
          {renderFormattedContent(displayValue, mentions, placeholder)}
        </div>

        {/* Real textarea — text invisible, caret visible */}
        <textarea
          ref={textareaRef}
          id={id}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => {
            setTimeout(() => {
              if (!dropdownRef.current?.contains(document.activeElement))
                setShowDropdown(false)
            }, 200)
            setFocused(false)
            onBlur?.()
          }}
          required={required}
          className="relative w-full px-3 py-2 text-[15px] leading-[22px] bg-transparent text-transparent selection:text-transparent selection:bg-blue-200/60 caret-gray-900 resize-none outline-none"
          style={{ minHeight: minRows * lineH + pad, maxHeight: 300, overflowY: 'auto' }}
          spellCheck
        />
      </div>

      {/* Slack-style mention dropdown — positioned at caret */}
      {showDropdown && (members.length > 0 || loading) && dropdownPos && (
        <div
          ref={dropdownRef}
          className="absolute z-30 w-72 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ top: dropdownPos.top, left: Math.min(dropdownPos.left, (containerRef.current?.offsetWidth ?? 288) - 288) }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {loading && members.length === 0 ? (
              <div className="px-3 py-2.5 text-[13px] text-gray-400 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Searching...
              </div>
            ) : null}
            {members.map((member, i) => (
              <button
                key={member.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); insertMention(member) }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-left transition-colors duration-75 ${
                  i === selectedIndex
                    ? 'bg-[#1264a3] text-white'
                    : 'text-gray-900'
                }`}
              >
                {member.profile_picture_url ? (
                  <div className="relative w-[26px] h-[26px] rounded-[5px] overflow-hidden flex-shrink-0">
                    <Image
                      src={member.profile_picture_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="26px"
                    />
                  </div>
                ) : (
                  <div
                    className={`w-[26px] h-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      i === selectedIndex
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[13px] font-medium truncate">
                  {member.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
