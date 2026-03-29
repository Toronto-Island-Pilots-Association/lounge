import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

async function resolveImageUrl(supabase: ReturnType<typeof createServiceRoleClient>, imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl
  try {
    const { data, error } = await supabase.storage.from('resources').createSignedUrl(imageUrl, 3600)
    if (error || !data) return null
    return data.signedUrl
  } catch {
    return null
  }
}

export default async function PagesListPage() {
  const h = await headers()
  const orgId = h.get('x-org-id')
  if (!orgId) notFound()

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('org_id', orgId)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) notFound()

  const pages = await Promise.all(
    (data || []).map(async (page) => ({
      ...page,
      image_url: await resolveImageUrl(supabase, page.image_url),
    }))
  )

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pages</h1>
        </div>

        {pages.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-500 text-sm">No pages published yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => {
              const excerpt = page.content
                ? page.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 200).trimEnd()
                : ''

              return (
                <Link key={page.id} href={`/pages/${page.slug}`} className="block group">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {page.image_url && (
                        <div className="relative w-full sm:w-32 h-40 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                          <Image
                            src={page.image_url}
                            alt={page.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 128px"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors mb-2">
                          {page.title}
                        </h2>
                        {excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-3">{excerpt}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
