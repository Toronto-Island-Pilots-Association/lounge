import { Suspense } from 'react'
import Sidebar from '../Sidebar'
import NewDiscussionForm from './NewDiscussionForm'

export const dynamic = 'force-dynamic'

export default function NewDiscussionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Start New Discussion</h1>
          <p className="mt-2 text-gray-600">
            Start a new discussion in the TIPA community
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar - Hidden on Mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <NewDiscussionForm />
          </div>
        </div>
      </div>
    </div>
  )
}
