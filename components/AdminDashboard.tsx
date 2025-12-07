'use client'

import { useEffect, useState } from 'react'
import { UserProfile, Resource, Event } from '@/types/database'

export default function AdminDashboard() {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'resources' | 'events' | 'settings'>('members')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [membershipFee, setMembershipFee] = useState('99')
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [membersRes, resourcesRes, eventsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/members'),
        fetch('/api/resources'),
        fetch('/api/events'),
        fetch('/api/settings'),
      ])

      const membersData = await membersRes.json()
      const resourcesData = await resourcesRes.json()
      const eventsData = await eventsRes.json()
      const settingsData = await settingsRes.json()

      setMembers(membersData.members || [])
      setResources(resourcesData.resources || [])
      setEvents(eventsData.events || [])
      setSettings(settingsData.settings || {})
      setMembershipFee(settingsData.settings?.annual_membership_fee || '99')
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async (memberData: {
    email: string
    firstName?: string
    lastName?: string
    phone?: string
    pilotLicenseType?: string
    aircraftType?: string
    callSign?: string
    howOftenFlyFromYTZ?: string
    howDidYouHear?: string
    role?: string
    membershipLevel?: string
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
        alert('Invitation sent successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error inviting member:', error)
      alert('Failed to send invitation')
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

  const handleUpdateMembershipFee = async () => {
    const fee = parseFloat(membershipFee)
    if (isNaN(fee) || fee < 0) {
      alert('Please enter a valid membership fee')
      return
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'annual_membership_fee',
          value: fee.toString(),
        }),
      })

      if (response.ok) {
        await loadData()
        alert('Membership fee updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update membership fee')
      }
    } catch (error) {
      console.error('Error updating membership fee:', error)
      alert('Failed to update membership fee')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
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
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Members ({members.length})
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'resources'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resources ({resources.length})
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'events'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Events ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Invite New Member
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
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
                            {member.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              member.membership_level === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.membership_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setEditingMember(member)}
                              className="text-blue-600 hover:text-blue-900"
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
            )}

            {activeTab === 'resources' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setEditingResource(null)
                      setShowResourceForm(true)
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Add Resource
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resources.map((resource) => (
                    <div key={resource.id} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => setEditingResource(resource)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
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
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Create Event
                  </button>
                </div>
                <div className="space-y-4">
                  {events.map((event) => {
                    const startDate = new Date(event.start_time)
                    const endDate = event.end_time ? new Date(event.end_time) : null
                    return (
                      <div key={event.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
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
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-900 text-sm ml-4"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Membership Settings</h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Annual Membership Fee (USD)
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-gray-500 mr-2">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={membershipFee}
                              onChange={(e) => setMembershipFee(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 text-gray-900 bg-white"
                            />
                            <span className="text-gray-500 ml-2">/year</span>
                          </div>
                          <button
                            onClick={handleUpdateMembershipFee}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          This fee will be displayed to members when they upgrade to paid membership.
                        </p>
                      </div>
                    </div>
                  </div>
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
        )}

        {/* Event Form Modal */}
        {showEventForm && (
          <EventFormModal
            onClose={() => {
              setShowEventForm(false)
              setEditingEvent(null)
            }}
            onSave={async (eventData) => {
              await handleCreateEvent(eventData)
            }}
          />
        )}

        {/* Invite Member Modal */}
        {showInviteForm && (
          <InviteMemberModal
            onClose={() => setShowInviteForm(false)}
            onSave={handleInviteMember}
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
  })

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Member</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Membership Level</label>
            <select
              value={formData.membership_level}
              onChange={(e) => setFormData({ ...formData, membership_level: e.target.value as 'free' | 'paid' })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(member, formData)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
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
    description: resource?.description || '',
    url: resource?.url || '',
    content: resource?.content || '',
    resource_type: resource?.resource_type || 'link' as const,
  })

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {resource ? 'Edit Resource' : 'Add Resource'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Type</label>
            <select
              value={formData.resource_type}
              onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as any })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="link">Link</option>
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (resource) {
                  await onSave(resource, formData)
                } else {
                  await onSave({}, formData)
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {resource ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    phone?: string
    pilotLicenseType?: string
    aircraftType?: string
    callSign?: string
    howOftenFlyFromYTZ?: string
    howDidYouHear?: string
    role?: string
    membershipLevel?: string
  }) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    pilotLicenseType: '',
    aircraftType: '',
    callSign: '',
    howOftenFlyFromYTZ: '',
    howDidYouHear: '',
    role: 'member' as 'member' | 'admin',
    membershipLevel: 'free' as 'free' | 'paid',
  })

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Invite New Member</h3>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Pilot License Type
              </label>
              <input
                type="text"
                value={formData.pilotLicenseType}
                onChange={(e) => setFormData({ ...formData, pilotLicenseType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Aircraft Type
              </label>
              <input
                type="text"
                value={formData.aircraftType}
                onChange={(e) => setFormData({ ...formData, aircraftType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Call Sign
              </label>
              <input
                type="text"
                value={formData.callSign}
                onChange={(e) => setFormData({ ...formData, callSign: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                How Often Fly From YTZ
              </label>
              <input
                type="text"
                value={formData.howOftenFlyFromYTZ}
                onChange={(e) => setFormData({ ...formData, howOftenFlyFromYTZ: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                How Did You Hear
              </label>
              <input
                type="text"
                value={formData.howDidYouHear}
                onChange={(e) => setFormData({ ...formData, howDidYouHear: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Membership Level
              </label>
              <select
                value={formData.membershipLevel}
                onChange={(e) => setFormData({ ...formData, membershipLevel: e.target.value as 'free' | 'paid' })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
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
                  phone: formData.phone || undefined,
                  pilotLicenseType: formData.pilotLicenseType || undefined,
                  aircraftType: formData.aircraftType || undefined,
                  callSign: formData.callSign || undefined,
                  howOftenFlyFromYTZ: formData.howOftenFlyFromYTZ || undefined,
                  howDidYouHear: formData.howDidYouHear || undefined,
                  role: formData.role,
                  membershipLevel: formData.membershipLevel,
                })
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Send Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (eventData: Partial<Event>) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time) {
      alert('Title and start time are required')
      return
    }
    await onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Event</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
