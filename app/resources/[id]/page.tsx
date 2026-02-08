import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Resource } from '@/types/database'

// Helper function to get signed URL for resource file/image
async function getResourceFileUrl(supabase: any, fileUrl: string | null): Promise<string | null> {
  if (!fileUrl) return null
  
  // If it's already a full URL (signed URL), return as-is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl
  }
  
  // Otherwise, it's a storage path - create signed URL
  try {
    const { data, error } = await supabase.storage
      .from('resources')
      .createSignedUrl(fileUrl, 3600) // 1 hour expiration
    
    if (error || !data) {
      console.error('Error creating signed URL for resource file:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error getting resource file URL:', error)
    return null
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Redirect pending users to approval page
  if (user.profile.status !== 'approved' && user.profile.role !== 'admin') {
    redirect('/pending-approval')
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch the resource directly from database
  const { data: resource, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !resource) {
    notFound()
  }

  // Get signed URLs for image and file
  const signedImageUrl = await getResourceFileUrl(supabase, resource.image_url)
  const signedFileUrl = await getResourceFileUrl(supabase, resource.file_url)

  const resourceWithUrls: Resource = {
    ...resource,
    image_url: signedImageUrl,
    file_url: signedFileUrl,
  }

  // Use content if available, otherwise fall back to description
  const content = resourceWithUrls.content || resourceWithUrls.description

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          href="/resources"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to YTZ Flying Updates
        </Link>

        <article className="bg-white shadow rounded-lg overflow-hidden">
          {/* Image */}
          {resourceWithUrls.image_url && (
            <div className="relative w-full h-64 md:h-96 overflow-hidden">
              <Image
                src={resourceWithUrls.image_url}
                alt={resourceWithUrls.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                priority
                unoptimized // For signed URLs from private buckets
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {resourceWithUrls.title}
            </h1>

            <div className="text-sm text-gray-500 mb-6">
              {new Date(resourceWithUrls.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>

            {/* Full content */}
            {content && (
              <div
                className="prose prose-lg max-w-none text-gray-700 mb-6"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}

            {/* File attachment */}
            {resourceWithUrls.file_url && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h2>
                <a
                  href={resourceWithUrls.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors group"
                >
                  {/* PDF Document Icon with Badge */}
                  <div className="relative flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      {/* Document */}
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {/* PDF Badge */}
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                      PDF
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {resourceWithUrls.file_name || 'Download File'}
                  </span>
                  {/* External link icon */}
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors"
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
                </a>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
