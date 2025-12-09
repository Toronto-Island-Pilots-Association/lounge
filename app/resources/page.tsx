import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Resource } from '@/types/database'

export default async function ResourcesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
          <p className="mt-2 text-gray-600">
            Access all available resources for members
          </p>
        </div>

        {!resources || resources.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500">No resources available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {(resources as Resource[]).map((resource) => (
              <div
                key={resource.id}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <div 
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: resource.description }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

