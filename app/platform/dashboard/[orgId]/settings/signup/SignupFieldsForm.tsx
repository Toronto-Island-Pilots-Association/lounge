'use client'

import { useState } from 'react'
import type { SignupField, SignupFieldType } from '@/lib/settings-shared'

const FIELD_TYPE_LABELS: Record<SignupFieldType, string> = {
  text: 'Text', textarea: 'Long text', select: 'Dropdown',
  checkbox_group: 'Checkboxes', boolean: 'Yes / No',
  number: 'Number', date: 'Date', email: 'Email', phone: 'Phone', url: 'URL',
}
const HAS_OPTIONS: SignupFieldType[] = ['select', 'checkbox_group']
const HAS_PLACEHOLDER: SignupFieldType[] = ['text', 'textarea', 'number', 'email', 'phone', 'url']

type CustomFieldDraft = {
  key: string; label: string; type: SignupFieldType
  placeholder: string; helpText: string; optionsRaw: string; required: boolean
}

const blankDraft = (): CustomFieldDraft => ({
  key: '', label: '', type: 'text', placeholder: '', helpText: '', optionsRaw: '', required: false,
})

function slugKey(label: string) {
  return 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function draftToField(d: CustomFieldDraft): SignupField {
  return {
    key: d.key || slugKey(d.label) || `custom_${Date.now()}`,
    label: d.label,
    isCustom: true,
    type: d.type,
    placeholder: d.placeholder || undefined,
    helpText: d.helpText || undefined,
    options: HAS_OPTIONS.includes(d.type)
      ? d.optionsRaw.split('\n').map(s => s.trim()).filter(Boolean)
      : undefined,
    enabled: true,
    required: d.required,
  }
}

function fieldToDraft(f: SignupField): CustomFieldDraft {
  return {
    key: f.key,
    label: f.label,
    type: f.type ?? 'text',
    placeholder: f.placeholder ?? '',
    helpText: f.helpText ?? '',
    optionsRaw: f.options?.join('\n') ?? '',
    required: f.required,
  }
}

function inputCls() {
  return 'w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none'
}

function CustomFieldEditor({
  draft, onChange, onSave, onCancel,
}: {
  draft: CustomFieldDraft
  onChange: (patch: Partial<CustomFieldDraft>) => void
  onSave: () => void
  onCancel: () => void
}) {
  const ic = inputCls()
  return (
    <div className="rounded-md border border-gray-300 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Label <span className="text-red-500">*</span></label>
          <input className={ic} placeholder="e.g. Emergency Contact" value={draft.label}
            onChange={e => onChange({ label: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Field type</label>
          <select className={ic} value={draft.type}
            onChange={e => onChange({ type: e.target.value as SignupFieldType })}>
            {(Object.keys(FIELD_TYPE_LABELS) as SignupFieldType[]).map(t => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>
      {HAS_PLACEHOLDER.includes(draft.type) && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder text</label>
          <input className={ic} placeholder="Shown inside the field" value={draft.placeholder}
            onChange={e => onChange({ placeholder: e.target.value })} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Help text</label>
        <input className={ic} placeholder="Optional hint below the field" value={draft.helpText}
          onChange={e => onChange({ helpText: e.target.value })} />
      </div>
      {HAS_OPTIONS.includes(draft.type) && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Options <span className="text-gray-400 font-normal">(one per line)</span></label>
          <textarea className={ic} rows={4} placeholder={"Option A\nOption B\nOption C"} value={draft.optionsRaw}
            onChange={e => onChange({ optionsRaw: e.target.value })} />
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
          checked={draft.required} onChange={e => onChange({ required: e.target.checked })} />
        <span className="text-sm text-gray-700">Required</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onSave}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
          Save field
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 border border-gray-200 text-sm rounded-md hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function SignupFieldsForm({
  initial,
  orgId,
}: {
  initial: SignupField[]
  orgId: string
}) {
  const [fields, setFields] = useState<SignupField[]>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CustomFieldDraft>(blankDraft())
  const [addingNew, setAddingNew] = useState(false)
  const [newDraft, setNewDraft] = useState<CustomFieldDraft>(blankDraft())

  const systemFields = fields.filter(f => !f.isCustom)
  const customFields = fields.filter(f => f.isCustom)

  const toggle = (key: string, prop: 'enabled' | 'required') =>
    setFields(p => p.map(f => f.key === key ? { ...f, [prop]: !f[prop] } : f))

  const save = async () => {
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/signup-fields`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed')
      setFields((data as { fields: SignupField[] }).fields)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); await save() }

  const startEdit = (f: SignupField) => { setEditingKey(f.key); setEditDraft(fieldToDraft(f)) }
  const commitEdit = () => {
    if (!editDraft.label.trim()) return
    setFields(p => p.map(f => f.key === editingKey ? { ...draftToField(editDraft), key: editingKey! } : f))
    setEditingKey(null)
  }
  const addField = () => {
    if (!newDraft.label.trim()) return
    const newF = draftToField(newDraft)
    const exists = fields.some(f => f.key === newF.key)
    const finalF = exists ? { ...newF, key: `${newF.key}_${Date.now()}` } : newF
    setFields(p => [...p, finalF])
    setAddingNew(false); setNewDraft(blankDraft())
  }
  const deleteCustom = (key: string) => setFields(p => p.filter(f => f.key !== key))
  const moveCustom = (key: string, dir: -1 | 1) => {
    const customs = fields.filter(f => f.isCustom)
    const idx = customs.findIndex(f => f.key === key)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= customs.length) return
    ;[customs[idx], customs[newIdx]] = [customs[newIdx], customs[idx]]
    setFields([...systemFields, ...customs])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error   && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

      {/* System fields */}
      <div className="space-y-3">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700">Built-in sections</h3>
          <p className="text-xs text-gray-500 mt-0.5">Show or hide the preset sections on the signup form.</p>
        </div>
        <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Section</span>
            <span className="text-center">Show</span>
            <span className="text-center">Required</span>
          </div>
          {systemFields.map(f => (
            <div key={f.key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-3">
              <span className="text-sm text-gray-900">{f.label}</span>
              <div className="flex justify-center">
                <input type="checkbox" checked={f.enabled}
                  onChange={() => toggle(f.key, 'enabled')}
                  className="h-4 w-4 rounded border-gray-300" />
              </div>
              <div className="flex justify-center">
                <input type="checkbox" checked={f.required} disabled={!f.enabled}
                  onChange={() => toggle(f.key, 'required')}
                  className="h-4 w-4 rounded border-gray-300 disabled:opacity-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom fields */}
      <div className="space-y-3">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700">Custom fields</h3>
          <p className="text-xs text-gray-500 mt-0.5">Add your own fields to collect additional info from applicants.</p>
        </div>

        {customFields.length > 0 && (
          <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
            {customFields.map((f, i) => (
              <div key={f.key}>
                {editingKey === f.key ? (
                  <div className="p-3">
                    <CustomFieldEditor
                      draft={editDraft}
                      onChange={p => setEditDraft(d => ({ ...d, ...p }))}
                      onSave={commitEdit}
                      onCancel={() => setEditingKey(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveCustom(f.key, -1)} disabled={i === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                      <button type="button" onClick={() => moveCustom(f.key, 1)} disabled={i === customFields.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{f.label}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                          {FIELD_TYPE_LABELS[f.type ?? 'text']}
                        </span>
                        {f.required && <span className="text-xs text-red-500 shrink-0">required</span>}
                      </div>
                      {f.helpText && <div className="text-xs text-gray-400 truncate mt-0.5">{f.helpText}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300"
                          checked={f.enabled} onChange={() => toggle(f.key, 'enabled')} />
                        Show
                      </label>
                      <button type="button" onClick={() => startEdit(f)}
                        className="ml-2 text-xs text-gray-700 hover:underline">Edit</button>
                      <button type="button" onClick={() => deleteCustom(f.key)}
                        className="text-xs text-red-400 hover:text-red-600 ml-1">×</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingNew ? (
          <CustomFieldEditor
            draft={newDraft}
            onChange={p => setNewDraft(d => ({ ...d, ...p }))}
            onSave={addField}
            onCancel={() => { setAddingNew(false); setNewDraft(blankDraft()) }}
          />
        ) : (
          <button type="button" onClick={() => setAddingNew(true)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add custom field
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save form config'}
        </button>
        {success && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}
