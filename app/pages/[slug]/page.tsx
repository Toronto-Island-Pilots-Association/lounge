import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// Pages are always public — no auth check required.

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const h = await headers()
  const orgId = h.get('x-org-id')
  if (!orgId) notFound()

  const { slug } = await params
  const supabase = createServiceRoleClient()

  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('org_id', orgId)
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error || !page) notFound()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/pages"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <article className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 md:p-10">
            {page.content && (
              <div
                className="prose prose-lg max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
