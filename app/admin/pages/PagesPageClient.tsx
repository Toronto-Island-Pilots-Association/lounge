'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { Page } from '@/types/database'
import { PageStatus, slugifyPageSlug } from '@/lib/pages'
import Loading from '@/components/Loading'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

type PageFormValues = Partial<Page> & { status?: PageStatus }

export default function PagesPageClient() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/pages')
      const data = await response.json()
      setPages(data.pages || [])
    } catch (error) {
      console.error('Error loading pages:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (pageData: PageFormValues) => {
    const response = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageData),
    })
    if (response.ok) {
      await loadData()
      setShowForm(false)
    } else {
      const err = await response.json()
      alert(err.error || 'Failed to create page')
    }
  }

  const handleUpdate = async (page: Page, updates: PageFormValues) => {
    const response = await fetch(`/api/pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (response.ok) {
      await loadData()
      setEditingPage(null)
    } else {
      const err = await response.json()
      alert(err.error || 'Failed to update page')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page? This cannot be undone.')) return
    const response = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await loadData()
    } else {
      const err = await response.json()
      alert(err.error || 'Failed to delete page')
    }
  }

  if (loading) return <Loading message="Loading Pages..." />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditingPage(null); setShowForm(true) }}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-md hover:bg-[#0a171c] text-sm w-full sm:w-auto"
        >
          Add Page
        </button>
      </div>

      <div className="space-y-4">
        {pages.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No pages yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Create your first public page from HTML content and publish it when it is ready.
            </p>
          </div>
        )}

        {pages.map((page) => {
          const excerpt = page.content
            ? page.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 200).trimEnd()
            : ''

          return (
            <div key={page.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{page.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                        page.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {page.published ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">/{page.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {page.published && (
                      <a
                        href={`/pages/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] hover:text-[#0a171c] text-sm font-medium"
                      >
                        View
                      </a>
                    )}
                    {page.published && <span className="text-gray-300">|</span>}
                    <button
                      onClick={() => setEditingPage(page)}
                      className="text-[var(--color-primary)] hover:text-[#0a171c] text-sm font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {excerpt && (
                  <p className="text-sm text-gray-600 line-clamp-2">{excerpt}</p>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  {page.updated_at && page.updated_at !== page.created_at
                    ? `Updated ${new Date(page.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                    : `Created ${new Date(page.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(showForm || editingPage) && (
        <Suspense fallback={<div className="fixed inset-0 bg-gray-600 bg-opacity-10 z-50 flex items-center justify-center"><Loading message="Loading form..." /></div>}>
          <PageFormDrawer
            page={editingPage}
            onClose={() => { setShowForm(false); setEditingPage(null) }}
            onSave={editingPage
              ? async (_, updates) => handleUpdate(editingPage, updates)
              : async (_, updates) => handleCreate(updates)
            }
          />
        </Suspense>
      )}
    </div>
  )
}

function PageFormDrawer({
  page,
  onClose,
  onSave,
}: {
  page: Page | null
  onClose: () => void
  onSave: (page: Page | null, updates: PageFormValues) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    status: (page?.published ? 'published' : 'draft') as PageStatus,
  })

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{page ? 'Edit Page' : 'Add Page'}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Nav Name *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                const nextTitle = e.target.value
                setFormData((current) => ({
                  ...current,
                  title: nextTitle,
                  slug: !page && current.slug === slugifyPageSlug(current.title) ? slugifyPageSlug(nextTitle) : current.slug,
                }))
              }}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              placeholder="e.g. About TIPA"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: slugifyPageSlug(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              placeholder="about"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Public URL: `/pages/your-slug`</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PageStatus })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">HTML Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="min-h-[320px] w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              placeholder="<h1>About</h1>&#10;<p>Your page HTML goes here.</p>"
            />
            <p className="mt-1 text-xs text-gray-500">Rendered as raw HTML on the public page.</p>
          </div>
        </div>
        <DrawerFooter>
          <div className="flex justify-end space-x-2">
            <DrawerClose asChild>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
            </DrawerClose>
            <button
              onClick={async () => {
                if (!formData.title.trim()) { alert('Nav name is required'); return }
                if (!formData.slug.trim()) { alert('Slug is required'); return }
                await onSave(page, {
                  title: formData.title.trim(),
                  slug: formData.slug.trim(),
                  content: formData.content,
                  status: formData.status,
                })
                onClose()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-md hover:bg-[#0a171c]"
            >
              {page ? 'Update' : 'Create'}
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
