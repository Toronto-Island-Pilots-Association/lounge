'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { UserProfile, MembershipLevel, getMembershipLevelLabel } from '@/types/database'
import Loading from '@/components/Loading'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

export default function MembersPageClient() {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showBulkInviteForm, setShowBulkInviteForm] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/members')
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const pendingMembers = useMemo(() => 
    members.filter(m => m.status === 'pending'), 
    [members]
  )

  const handleInviteMember = async (memberData: {
    email: string
    firstName?: string
    lastName?: string
  }) => {
    try {
      const response = await fetch('/api/admin/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  const handleApproveReject = async (memberId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, status }),
      })
      if (response.ok) {
        await loadData()
      } else {
        alert(`Failed to ${status} member`)
      }
    } catch (error) {
      console.error(`Error ${status}ing member:`, error)
      alert(`Failed to ${status} member`)
    }
  }

  if (loading) {
    return <Loading message="Loading members..." />
  }

  return (
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
                    {member.member_number && (
                      <div className="text-xs text-gray-500 mt-1">Member #: {member.member_number}</div>
                    )}
                    {member.call_sign && (
                      <div className="text-xs text-gray-500 mt-1">Call Sign: {member.call_sign}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveReject(member.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm('Are you sure you want to reject this member?')) return
                        handleApproveReject(member.id, 'rejected')
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
                      {member.member_number && (
                        <div className="text-xs text-gray-400 mt-1">Member #: {member.member_number}</div>
                      )}
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
                      'bg-red-100 text-red-800'
                    }`}>
                      {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Pending'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {member.role}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      member.membership_level === 'Active' || member.membership_level === 'Lifetime'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Regular'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.member_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs rounded ${
                        member.status === 'approved' ? 'bg-green-100 text-green-800' :
                        member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.membership_level === 'Active' || member.membership_level === 'Lifetime'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Regular'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {member.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveReject(member.id, 'approved')}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm('Are you sure you want to reject this member?')) return
                              handleApproveReject(member.id, 'rejected')
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

      {/* Modals */}
      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleUpdateMember}
        />
      )}

      {showInviteForm && (
        <InviteMemberModal
          onClose={() => setShowInviteForm(false)}
          onSave={handleInviteMember}
        />
      )}

      {showBulkInviteForm && (
        <BulkInviteModal
          onClose={() => setShowBulkInviteForm(false)}
          onSave={handleBulkInvite}
        />
      )}
    </div>
  )
}

// Modal components (extracted from AdminDashboard)
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
              <option value="Active">Active</option>
              <option value="Regular">Regular</option>
              <option value="Resident">Resident</option>
              <option value="Retired">Retired</option>
              <option value="Student">Student</option>
              <option value="Lifetime">Lifetime</option>
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

function InviteMemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (memberData: { email: string; firstName?: string; lastName?: string }) => Promise<void>
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
            Create an account for a new member. A temporary password will be sent to their email.
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
              <label className="block text-sm font-medium text-gray-900 mb-1">First Name (optional)</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Last Name (optional)</label>
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
            <p className="text-sm font-medium text-gray-900 mt-3 mb-1">Example:</p>
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
