'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Resource } from '@/types/database'
import Loading from '@/components/Loading'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded" />
})

const AdminResourceUpload = dynamic(() => import('@/components/AdminResourceUpload'), {
  ssr: false,
  loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded" />
})

export default function ResourcesPageClient() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [showResourceForm, setShowResourceForm] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/resources')
      const data = await response.json()
      setResources(data.resources || [])
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateResource = async (resourceData: Partial<Resource>) => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceData),
      })

      if (response.ok) {
        await loadData()
        setShowResourceForm(false)
        setEditingResource(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create resource')
      }
    } catch (error) {
      console.error('Error creating resource:', error)
      alert('Failed to create resource')
    }
  }

  const handleUpdateResource = async (resource: Resource, updates: Partial<Resource>) => {
    try {
      const response = await fetch(`/api/resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await loadData()
        setEditingResource(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update resource')
      }
    } catch (error) {
      console.error('Error updating resource:', error)
      alert('Failed to update resource')
    }
  }

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete resource')
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Failed to delete resource')
    }
  }

  if (loading) {
    return <Loading message="Loading resources..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingResource(null)
            setShowResourceForm(true)
          }}
          className="bg-[#0d1e26] text-white px-4 py-2 rounded-md hover:bg-[#0a171c] text-sm w-full sm:w-auto"
        >
          Add Resource
        </button>
      </div>
      <div className="space-y-4">
        {resources.map((resource) => {
          // Helper function to strip HTML and truncate text for preview
          const truncateText = (html: string | null, maxLength: number = 200): string => {
            if (!html) return ''
            const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
            if (text.length <= maxLength) return text
            return text.substring(0, maxLength).trim() + '...'
          }

          const previewText = truncateText(resource.content || resource.description, 200)
          const isExternalLink = resource.url && resource.url.trim() !== ''

          return (
            <div key={resource.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {resource.image_url && (
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      <img
                        src={resource.image_url}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1">
                        {resource.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/resources/${resource.id}`}
                          className="text-[#0d1e26] hover:text-[#0a171c] text-sm font-medium"
                        >
                          View
                        </Link>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setEditingResource(resource)}
                          className="text-[#0d1e26] hover:text-[#0a171c] text-sm font-medium"
                        >
                          Edit
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {/* Preview text */}
                    {previewText && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {previewText}
                      </p>
                    )}
                    
                    {/* Metadata and badges */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-xs text-gray-500">
                        {resource.updated_at && resource.updated_at !== resource.created_at ? (
                          <>Updated: {new Date(resource.updated_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</>
                        ) : (
                          <>Published: {new Date(resource.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</>
                        )}
                      </div>
                      
                      {/* Badges */}
                      {resource.file_url && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span>Attachment</span>
                        </span>
                      )}
                      {isExternalLink && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          <span>External Link</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(showResourceForm || editingResource) && (
        <Suspense fallback={<div className="fixed inset-0 bg-gray-600 bg-opacity-10 z-50 flex items-center justify-center"><Loading message="Loading form..." /></div>}>
          <ResourceFormModal
            resource={editingResource}
            onClose={() => {
              setShowResourceForm(false)
              setEditingResource(null)
            }}
            onSave={editingResource 
              ? async (resource, updates) => {
                  if ('id' in resource && resource.id) {
                    await handleUpdateResource(resource as Resource, updates)
                  }
                }
              : async (_, updates) => {
                  await handleCreateResource(updates)
                }
            }
          />
        </Suspense>
      )}
    </div>
  )
}

function ResourceFormModal({
  resource,
  onClose,
  onSave,
}: {
  resource: Resource | null
  onClose: () => void
  onSave: (resource: Resource | Partial<Resource>, updates: Partial<Resource>) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    content: resource?.content || resource?.description || '', // Use content, fallback to description for existing resources
    url: resource?.url || '',
    image_url: resource?.image_url || null,
    file_url: resource?.file_url || null,
    file_name: resource?.file_name || null,
    resource_type: resource?.resource_type || 'other' as Resource['resource_type'],
    category: resource?.category || 'other' as Resource['category'],
  })
  
  const [isExternalLink, setIsExternalLink] = useState(!!resource?.url)

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
              required
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Resource['category'] })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
              required
            >
              <option value="cytz">CYTZ</option>
              <option value="general_aviation">General Aviation</option>
              <option value="tipa">TIPA</option>
              <option value="aviation_news">Aviation News</option>
              <option value="other">Other</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Categorize this resource for easier organization and filtering</p>
          </div>

          {/* Resource Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Resource Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resourceType"
                  checked={!isExternalLink}
                  onChange={() => {
                    setIsExternalLink(false)
                    setFormData({ ...formData, url: '' })
                  }}
                  className="text-[#0d1e26] focus:ring-[#0d1e26]"
                />
                <span className="text-sm text-gray-700">Content</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resourceType"
                  checked={isExternalLink}
                  onChange={() => setIsExternalLink(true)}
                  className="text-[#0d1e26] focus:ring-[#0d1e26]"
                />
                <span className="text-sm text-gray-700">External Link</span>
              </label>
            </div>
          </div>

          {/* External URL (only show if external link) */}
          {isExternalLink && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">External URL *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                required={isExternalLink}
              />
              <p className="mt-1 text-xs text-gray-500">This resource will open the external link when clicked</p>
            </div>
          )}

          {/* Content (available for both content and external link types) */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Content {isExternalLink && <span className="text-gray-500 font-normal">(Optional)</span>}
            </label>
            <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded" />}>
              <RichTextEditor
                content={formData.content || ''}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder={
                  isExternalLink
                    ? "Optional: Add a description or additional information about this external link..."
                    : "Enter the blog post content. The beginning will be automatically used as a preview on the resources list page..."
                }
              />
            </Suspense>
            {isExternalLink && (
              <p className="mt-1 text-xs text-gray-500">You can add a description or additional context for this external link</p>
            )}
          </div>

          {/* Image & File Upload (combined) */}
          <div>
            <Suspense fallback={<div className="h-24 bg-gray-100 animate-pulse rounded" />}>
              <AdminResourceUpload
                currentImageUrl={formData.image_url}
                currentFileUrl={!isExternalLink ? formData.file_url : null}
                currentFileName={!isExternalLink ? formData.file_name : null}
                onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                onFileChange={(url, fileName) => setFormData({ ...formData, file_url: url, file_name: fileName || null })}
                imageUploadEndpoint="/api/resources/upload-image"
                fileUploadEndpoint="/api/resources/upload-file"
                label="Resource Image & File Attachment"
              />
            </Suspense>
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
                const submitData = {
                  ...formData,
                  url: isExternalLink ? formData.url : null,
                  resource_type: isExternalLink ? 'link' : formData.resource_type,
                  description: null, // Remove description field, use content only
                }
                if (resource) {
                  await onSave(resource, submitData)
                } else {
                  await onSave({}, submitData)
                }
                onClose()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
            >
              {resource ? 'Update' : 'Create'}
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
