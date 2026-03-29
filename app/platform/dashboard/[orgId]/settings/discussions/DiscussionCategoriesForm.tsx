'use client'

import { useState } from 'react'
import type { OrgDiscussionCategory } from '@/lib/settings'

const EMOJI_SUGGESTIONS = ['💬', '👋', '🌐', '📋', '✈️', '🛒', '🔍', '📚', '🏗️', '🛫', '👨‍✈️', '🎯', '📣', '🤝', '💡', '📰']

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function DiscussionCategoriesForm({
  initial,
  orgId,
}: {
  initial: OrgDiscussionCategory[]
  orgId: string
}) {
  const [categories, setCategories] = useState<OrgDiscussionCategory[]>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New category form state
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('💬')
  const [newType, setNewType] = useState<'discussion' | 'classified'>('discussion')

  const toggleEnabled = (slug: string) => {
    setCategories(prev => prev.map(c => c.slug === slug ? { ...c, enabled: !c.enabled } : c))
  }

  const updateLabel = (slug: string, label: string) => {
    setCategories(prev => prev.map(c => c.slug === slug ? { ...c, label } : c))
  }

  const updateEmoji = (slug: string, emoji: string) => {
    setCategories(prev => prev.map(c => c.slug === slug ? { ...c, emoji } : c))
  }

  const removeCategory = (slug: string) => {
    setCategories(prev => prev.filter(c => c.slug !== slug))
  }

  const addCategory = () => {
    if (!newLabel.trim()) return
    const slug = slugify(newLabel)
    if (!slug || categories.some(c => c.slug === slug)) return
    setCategories(prev => [...prev, { slug, label: newLabel.trim(), emoji: newEmoji, type: newType, enabled: true }])
    setNewLabel('')
    setNewEmoji('💬')
    setNewType('discussion')
    setAdding(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/discussions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const discussionCats = categories.filter(c => c.type === 'discussion')
  const classifiedCats = categories.filter(c => c.type === 'classified')

  const renderList = (cats: OrgDiscussionCategory[]) => (
    <ul className="space-y-2">
      {cats.map(cat => (
        <li key={cat.slug} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50">
          <input
            type="text"
            value={cat.emoji}
            onChange={e => updateEmoji(cat.slug, e.target.value)}
            className="w-10 text-center text-lg bg-transparent border border-gray-200 rounded p-0.5"
            maxLength={2}
          />
          <input
            type="text"
            value={cat.label}
            onChange={e => updateLabel(cat.slug, e.target.value)}
            className="flex-1 text-sm bg-white border border-gray-200 rounded-md px-2 py-1 focus:border-gray-400 focus:outline-none"
          />
          <span className="min-w-0 truncate text-xs font-mono text-gray-400 hidden sm:block">{cat.slug}</span>
          <button
            type="button"
            onClick={() => toggleEnabled(cat.slug)}
            className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cat.enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
            title={cat.enabled ? 'Disable' : 'Enable'}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cat.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <button
            type="button"
            onClick={() => removeCategory(cat.slug)}
            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove category"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Discussion categories</h3>
        {discussionCats.length > 0 ? renderList(discussionCats) : (
          <p className="text-sm text-gray-400 italic">No discussion categories yet.</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Classified categories</h3>
        <p className="text-xs text-gray-400">For sale / listing-style posts with structured fields.</p>
        {classifiedCats.length > 0 ? renderList(classifiedCats) : (
          <p className="text-sm text-gray-400 italic">No classified categories yet.</p>
        )}
      </div>

      {adding ? (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">New category</p>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Emoji</label>
              <input
                type="text"
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                className="w-12 text-center text-lg border border-gray-200 rounded-md p-1"
                maxLength={2}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-500">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Flight Reports"
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:border-gray-400 focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as 'discussion' | 'classified')}
                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:border-gray-400 focus:outline-none"
              >
                <option value="discussion">Discussion</option>
                <option value="classified">Classified</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_SUGGESTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setNewEmoji(e)}
                className={`text-lg p-1 rounded hover:bg-gray-100 ${newEmoji === e ? 'bg-gray-100 ring-1 ring-gray-300' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={addCategory}
              disabled={!newLabel.trim()}
              className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewLabel('') }}
              className="px-3 py-1.5 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add category
        </button>
      )}

      <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
