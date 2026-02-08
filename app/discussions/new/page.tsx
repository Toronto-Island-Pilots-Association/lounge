import { Suspense } from 'react'
import Sidebar from '../Sidebar'
import NewDiscussionForm from './NewDiscussionForm'

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
            {/* Community Guidelines Disclaimer */}
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-md p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong className="text-gray-900">Community Guidelines:</strong> Keep it respectful, practical, and aviation-focused. Posts may be moved or closed if needed.
                  </p>
                </div>
              </div>
            </div>

            <Suspense fallback={
              <div className="bg-white shadow rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-40 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            }>
              <NewDiscussionForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
