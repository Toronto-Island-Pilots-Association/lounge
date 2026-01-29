'use client'

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { UserProfile, Resource, Event, MembershipLevel, getMembershipLevelLabel } from '@/types/database'
import Loading from './Loading'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

// Lazy load heavy components - only load when modals are opened
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded" />
})

const AdminImageUpload = dynamic(() => import('./AdminImageUpload'), {
  ssr: false,
  loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded" />
})

const AdminFileUpload = dynamic(() => import('./AdminFileUpload'), {
  ssr: false,
  loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded" />
})

export default function AdminDashboard() {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'resources' | 'events' | 'settings'>('members')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showBulkInviteForm, setShowBulkInviteForm] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // Load data in parallel with error handling
      const [membersRes, resourcesRes, eventsRes, settingsRes] = await Promise.allSettled([
        fetch('/api/admin/members'),
        fetch('/api/resources'),
        fetch('/api/events'),
        fetch('/api/settings'),
      ])

      const membersData = membersRes.status === 'fulfilled' 
        ? await membersRes.value.json().catch(() => ({ members: [] }))
        : { members: [] }
      const resourcesData = resourcesRes.status === 'fulfilled'
        ? await resourcesRes.value.json().catch(() => ({ resources: [] }))
        : { resources: [] }
      const eventsData = eventsRes.status === 'fulfilled'
        ? await eventsRes.value.json().catch(() => ({ events: [] }))
        : { events: [] }
      const settingsData = settingsRes.status === 'fulfilled'
        ? await settingsRes.value.json().catch(() => ({ settings: {} }))
        : { settings: {} }

      setMembers(membersData.members || [])
      setResources(resourcesData.resources || [])
      setEvents(eventsData.events || [])
      setSettings(settingsData.settings || {})
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Memoize expensive computations - MUST be before any conditional returns
  const pendingMembers = useMemo(() => 
    members.filter(m => m.status === 'pending'), 
    [members]
  )

  const topResources = useMemo(() => 
    resources.slice(0, 5), 
    [resources]
  )

  // Memoize callbacks to prevent unnecessary re-renders
  const handleSetActiveTab = useCallback((tab: 'members' | 'resources' | 'events' | 'settings') => {
    setActiveTab(tab)
  }, [])

  const handleInviteMember = async (memberData: {
    email: string
    firstName?: string
    lastName?: string
  }) => {
    try {
      const response = await fetch('/api/admin/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberData),
      })

      if (response.ok) {
        await loadData()
        setShowInviteForm(false)
        alert('Account created and invitation email sent successfully!')
      } else {
        const error = await response.json()
        const errorMessage = error.details 
          ? `${error.error}\n\n${error.details}`
          : error.error || 'Failed to create account'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error inviting member:', error)
      alert('Failed to create account')
    }
  }

  const handleBulkInvite = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/bulk-invite', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        await loadData()
        setShowBulkInviteForm(false)
        
        const message = `Bulk invite completed!\n\n` +
          `Total: ${data.results.total}\n` +
          `Success: ${data.results.success}\n` +
          `Skipped: ${data.results.skipped}\n` +
          `Errors: ${data.results.errors}`
        
        alert(message)
        
        // Show detailed results if there are errors or skipped
        if (data.results.details.errors.length > 0 || data.results.details.skipped.length > 0) {
          console.log('Detailed results:', data.results.details)
        }
      } else {
        alert(data.error || 'Failed to process bulk invite')
      }
    } catch (error) {
      console.error('Error processing bulk invite:', error)
      alert('Failed to process bulk invite')
    }
  }

  const handleUpdateMember = async (member: UserProfile, updates: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: member.id, ...updates }),
      })

      if (response.ok) {
        await loadData()
        setEditingMember(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update member')
      }
    } catch (error) {
      console.error('Error updating member:', error)
      alert('Failed to update member')
    }
  }

  const handleCreateResource = async (resourceData: Partial<Resource>) => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (response.ok) {
        await loadData()
        setShowEventForm(false)
        setEditingEvent(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event')
    }
  }

  const handleUpdateEvent = async (event: Event, updates: Partial<Event>) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await loadData()
        setEditingEvent(null)
        setShowEventForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Loading message="Loading..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => handleSetActiveTab('members')}
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'members'
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Members ({members.length})
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'resources'
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Announcements ({resources.length})
              </button>
              <button
                onClick={() => handleSetActiveTab('events')}
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'events'
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Events ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'members' && (
              <div className="space-y-4">
                {/* Pending Review Section */}
                {pendingMembers.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                      Pending Review ({pendingMembers.length})
                    </h3>
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <div key={member.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{member.full_name || 'N/A'}</div>
                              <div className="text-sm text-gray-600">{member.email}</div>
                              {member.call_sign && (
                                <div className="text-xs text-gray-500 mt-1">Call Sign: {member.call_sign}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/members', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: member.id, status: 'approved' }),
                                    })
                                    if (response.ok) {
                                      loadData()
                                    } else {
                                      alert('Failed to approve member')
                                    }
                                  } catch (error) {
                                    console.error('Error approving member:', error)
                                    alert('Failed to approve member')
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to reject this member?')) return
                                  try {
                                    const response = await fetch('/api/admin/members', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: member.id, status: 'rejected' }),
                                    })
                                    if (response.ok) {
                                      loadData()
                                    } else {
                                      alert('Failed to reject member')
                                    }
                                  } catch (error) {
                                    console.error('Error rejecting member:', error)
                                    alert('Failed to reject member')
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/export-members')
                        if (!response.ok) {
                          const error = await response.json()
                          alert(error.error || 'Failed to export members')
                          return
                        }
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        const contentDisposition = response.headers.get('Content-Disposition')
                        const filename = contentDisposition
                          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'members-export.csv'
                          : 'members-export.csv'
                        a.download = filename
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                      } catch (error) {
                        console.error('Error exporting members:', error)
                        alert('Failed to export members')
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Export Members</span>
                    <span className="sm:hidden">Export</span>
                  </button>
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="bg-[#0d1e26] text-white px-4 py-2 rounded-md hover:bg-[#0a171c] text-sm"
                  >
                    Invite Member
                  </button>
                  <button
                    onClick={() => setShowBulkInviteForm(true)}
                    className="bg-[#0d1e26] text-white px-4 py-2 rounded-md hover:bg-[#0a171c] text-sm"
                  >
                    Bulk Invite (CSV)
                  </button>
                </div>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                      {/* Mobile Card View */}
                      <div className="sm:hidden space-y-3">
                        {members.map((member) => (
                          <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{member.full_name || 'N/A'}</div>
                                <div className="text-xs text-gray-500 mt-1 truncate">{member.email}</div>
                              </div>
                              <button
                                onClick={() => setEditingMember(member)}
                                className="ml-2 text-[#0d1e26] hover:text-[#0a171c] text-sm shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={`px-2 py-1 rounded ${
                                member.status === 'approved' ? 'bg-green-100 text-green-800' :
                                member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                member.status === 'expired' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Pending'}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {member.role}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${
                                member.membership_level === 'Full' || member.membership_level === 'Corporate' || member.membership_level === 'Honorary'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Full'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Desktop Table View */}
                      <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Membership
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {members.map((member) => (
                            <tr key={member.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {member.full_name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  member.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  member.status === 'expired' ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.role}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  member.membership_level === 'Full' || member.membership_level === 'Corporate' || member.membership_level === 'Honorary'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Full'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {member.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const response = await fetch('/api/admin/members', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: member.id, status: 'approved' }),
                                          })
                                          if (response.ok) {
                                            loadData()
                                          } else {
                                            alert('Failed to approve member')
                                          }
                                        } catch (error) {
                                          console.error('Error approving member:', error)
                                          alert('Failed to approve member')
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-900 mr-3"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!confirm('Are you sure you want to reject this member?')) return
                                        try {
                                          const response = await fetch('/api/admin/members', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: member.id, status: 'rejected' }),
                                          })
                                          if (response.ok) {
                                            loadData()
                                          } else {
                                            alert('Failed to reject member')
                                          }
                                        } catch (error) {
                                          console.error('Error rejecting member:', error)
                                          alert('Failed to reject member')
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-900 mr-3"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setEditingMember(member)}
                                  className="text-[#0d1e26] hover:text-[#0a171c]"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resources.map((resource) => (
                    <div key={resource.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingResource(resource)}
                            className="text-[#0d1e26] hover:text-[#0a171c] text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteResource(resource.id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {resource.updated_at && resource.updated_at !== resource.created_at ? (
                          <>
                            Updated: {new Date(resource.updated_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </>
                        ) : (
                          <>
                            Published: {new Date(resource.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </>
                        )}
                      </div>
                      {resource.description && (
                        <div 
                          className="prose prose-sm max-w-none text-gray-700"
                          dangerouslySetInnerHTML={{ __html: resource.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setEditingEvent(null)
                      setShowEventForm(true)
                    }}
                    className="bg-[#0d1e26] text-white px-4 py-2 rounded-md hover:bg-[#0a171c] text-sm w-full sm:w-auto"
                  >
                    Create Event
                  </button>
                </div>
                <div className="space-y-4">
                  {events.map((event) => {
                    const startDate = new Date(event.start_time)
                    const endDate = event.end_time ? new Date(event.end_time) : null
                    return (
                      <div key={event.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-[#0d1e26]">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{event.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Date:</strong> {startDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Time:</strong> {startDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                              {endDate && ` - ${endDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}`}
                            </p>
                            {event.location && (
                              <p className="text-sm text-gray-600">
                                <strong>Location:</strong> {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                            )}
                          </div>
                          <div className="flex space-x-2 shrink-0">
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="text-[#0d1e26] hover:text-[#0a171c] text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="text-center py-12 text-gray-500">
                  <p>No settings available at this time.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Member Edit Modal */}
        {editingMember && (
          <MemberEditModal
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onSave={handleUpdateMember}
          />
        )}

        {/* Resource Form Modal */}
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

        {/* Event Form Modal */}
        {(showEventForm || editingEvent) && (
          <Suspense fallback={<div className="fixed inset-0 bg-gray-600 bg-opacity-10 z-50 flex items-center justify-center"><Loading message="Loading form..." /></div>}>
            <EventFormModal
              event={editingEvent}
              onClose={() => {
                setShowEventForm(false)
                setEditingEvent(null)
              }}
              onSave={async (eventData) => {
                if (editingEvent) {
                  await handleUpdateEvent(editingEvent, eventData)
                } else {
                  await handleCreateEvent(eventData)
                }
              }}
            />
          </Suspense>
        )}

        {/* Invite Member Modal */}
        {showInviteForm && (
          <InviteMemberModal
            onClose={() => setShowInviteForm(false)}
            onSave={handleInviteMember}
          />
        )}

        {/* Bulk Invite Modal */}
        {showBulkInviteForm && (
          <BulkInviteModal
            onClose={() => setShowBulkInviteForm(false)}
            onSave={handleBulkInvite}
          />
        )}
      </div>
    </div>
  )
}

function MemberEditModal({
  member,
  onClose,
  onSave,
}: {
  member: UserProfile
  onClose: () => void
  onSave: (member: UserProfile, updates: Partial<UserProfile>) => void
}) {
  const [formData, setFormData] = useState({
    full_name: member.full_name || '',
    role: member.role,
    membership_level: member.membership_level,
    status: member.status,
  })

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Member</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserProfile['status'] })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="expired">Expired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Membership Level</label>
            <select
              value={formData.membership_level}
              onChange={(e) => setFormData({ ...formData, membership_level: e.target.value as MembershipLevel })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
            >
              <option value="Full">Full</option>
              <option value="Student">Student</option>
              <option value="Associate">Associate</option>
              <option value="Corporate">Corporate</option>
              <option value="Honorary">Honorary</option>
            </select>
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
              onClick={() => {
                onSave(member, formData)
                onClose()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
            >
              Save
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
  const [formData, setFormData] = useState<{
    title: string
    description: string
    image_url: string | null
    file_url: string | null
    file_name: string | null
  }>({
    title: resource?.title || '',
    description: resource?.description || '',
    image_url: resource?.image_url || null,
    file_url: (resource as any)?.file_url || null,
    file_name: (resource as any)?.file_name || null,
  })

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <RichTextEditor
              content={formData.description || ''}
              onChange={(content) => setFormData({ ...formData, description: content })}
              placeholder="Enter resource description with rich text formatting..."
            />
          </div>
          <div>
            <AdminImageUpload
              currentImageUrl={formData.image_url}
              onImageChange={(url) => setFormData({ ...formData, image_url: url })}
              uploadEndpoint="/api/resources/upload-image"
              label="Resource Image"
            />
          </div>
          <div>
            <AdminFileUpload
              currentFileUrl={formData.file_url}
              currentFileName={formData.file_name}
              onFileChange={(url, fileName) => setFormData({ ...formData, file_url: url, file_name: fileName || null })}
              uploadEndpoint="/api/resources/upload-file"
              label="File Attachment"
            />
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
                if (resource) {
                  await onSave(resource, formData)
                } else {
                  await onSave({}, formData)
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


function InviteMemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (memberData: {
    email: string
    firstName?: string
    lastName?: string
  }) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  })

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Invite New Member</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Create an account for a new member. A temporary password will be sent to their email. They can also sign in with Google if their email matches.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                placeholder="member@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                First Name (optional)
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Last Name (optional)
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                placeholder="Doe"
              />
            </div>
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
                if (!formData.email) {
                  alert('Email is required')
                  return
                }
                await onSave({
                  email: formData.email,
                  firstName: formData.firstName || undefined,
                  lastName: formData.lastName || undefined,
                })
                onClose()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
            >
              Create Account & Send Invitation
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function BulkInviteModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (file: File) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      alert('Please select a CSV file')
      return
    }

    setUploading(true)
    try {
      await onSave(file)
      onClose()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Bulk Invite Members (CSV)</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Upload a CSV file with member information. Accounts will be created with temporary passwords sent via email.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">CSV Format:</p>
            <p className="text-sm text-gray-700 mb-2">
              Your CSV should have the following columns (header row optional):
            </p>
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
              <li><strong className="text-gray-900">Column 1:</strong> Email (required)</li>
              <li><strong className="text-gray-900">Column 2:</strong> First Name (optional)</li>
              <li><strong className="text-gray-900">Column 3:</strong> Last Name (optional)</li>
            </ul>
            <p className="text-sm font-medium text-gray-900 mt-3 mb-1">
              Example:
            </p>
            <pre className="text-xs text-gray-900 bg-gray-100 border border-gray-300 p-2 rounded mt-1 overflow-x-auto font-mono">
{`email,firstName,lastName
john@example.com,John,Doe
jane@example.com,Jane,Smith`}
            </pre>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              CSV File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>
        <DrawerFooter>
          <div className="flex justify-end space-x-2">
            <DrawerClose asChild>
              <button
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </DrawerClose>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function EventFormModal({
  event,
  onClose,
  onSave,
}: {
  event: Event | null
  onClose: () => void
  onSave: (eventData: Partial<Event>) => Promise<void>
}) {
  // Format datetime for input fields (YYYY-MM-DDTHH:mm)
  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_time: event ? formatDateTimeForInput(event.start_time) : '',
    end_time: event?.end_time ? formatDateTimeForInput(event.end_time) : '',
    image_url: event?.image_url || null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time) {
      alert('Title and start time are required')
      return
    }
    
    // Convert datetime-local strings to ISO strings with timezone
    // datetime-local gives us local time without timezone, so we need to create a Date object
    // and convert it to ISO string which includes timezone info
    const submitData = {
      ...formData,
      start_time: formData.start_time ? new Date(formData.start_time).toISOString() : '',
      end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
    }
    
    await onSave(submitData)
  }

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{event ? 'Edit Event' : 'Create Event'}</DrawerTitle>
        </DrawerHeader>
        <form 
          onSubmit={async (e) => {
            e.preventDefault()
            await handleSubmit(e)
            onClose()
          }} 
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1">
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
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Start Time *</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <AdminImageUpload
                currentImageUrl={formData.image_url}
                onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                uploadEndpoint="/api/events/upload-image"
                label="Event Image"
              />
            </div>
          </div>
          <DrawerFooter>
            <div className="flex justify-end space-x-2">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </DrawerClose>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
              >
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
