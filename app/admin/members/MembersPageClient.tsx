'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { UserProfile, MembershipLevel, getMembershipLevelLabel, Payment } from '@/types/database'
import { isOnTrial } from '@/lib/trial'
import Loading from '@/components/Loading'
import MemberDetailModal from './MemberDetailModal'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

type PaymentSummary = { amount: number; currency: string; payment_method: string } | null
type MemberWithPayment = UserProfile & { payment_summary?: PaymentSummary }

function hasPaymentSetUp(member: MemberWithPayment): boolean {
  return !!(member.stripe_subscription_id || member.payment_summary)
}

/** Payment column: subscription status only (no amounts). */
function getPaymentStatus(member: MemberWithPayment): { label: string; badgeClass: string } {
  const hasStripe = !!member.stripe_subscription_id
  const hasPayment = !!member.payment_summary || hasStripe
  const cancellationScheduled = !!member.subscription_cancel_at_period_end
  if (hasStripe && cancellationScheduled) return { label: 'Cancellation scheduled', badgeClass: 'bg-yellow-100 text-yellow-800' }
  if (hasStripe) return { label: 'Subscribed', badgeClass: 'bg-green-100 text-green-800' }
  if (hasPayment) return { label: 'Paid', badgeClass: 'bg-green-100 text-green-800' }
  return { label: 'No payment set up', badgeClass: 'bg-red-100 text-red-800' }
}

const PAGE_SIZE = 50

export type MembersSortKey = 'member_number' | 'full_name' | 'email' | 'status' | 'membership_level' | 'membership_expires_at' | 'created_at'
export type SortDirection = 'asc' | 'desc'

function compareMembers(
  a: MemberWithPayment,
  b: MemberWithPayment,
  key: MembersSortKey,
  dir: SortDirection
): number {
  const mult = dir === 'asc' ? 1 : -1
  switch (key) {
    case 'member_number': {
      const an = a.member_number?.replace(/\D/g, '') || ''
      const bn = b.member_number?.replace(/\D/g, '') || ''
      if (!an && !bn) return 0
      if (!an) return 1
      if (!bn) return -1
      return mult * (parseInt(an, 10) - parseInt(bn, 10))
    }
    case 'full_name':
      return mult * ((a.full_name || '').localeCompare(b.full_name || '', undefined, { sensitivity: 'base' }))
    case 'email':
      return mult * ((a.email || '').localeCompare(b.email || '', undefined, { sensitivity: 'base' }))
    case 'status': {
      const order = { approved: 0, pending: 1, expired: 2, rejected: 3 }
      return mult * ((order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4))
    }
    case 'membership_level':
      return mult * ((a.membership_level || '').localeCompare(b.membership_level || '', undefined, { sensitivity: 'base' }))
    case 'membership_expires_at': {
      const ad = a.membership_expires_at ? new Date(a.membership_expires_at).getTime() : 0
      const bd = b.membership_expires_at ? new Date(b.membership_expires_at).getTime() : 0
      return mult * (ad - bd)
    }
    case 'created_at': {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0
      return mult * (ad - bd)
    }
    default:
      return 0
  }
}

export default function MembersPageClient() {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showBulkInviteForm, setShowBulkInviteForm] = useState(false)
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)
  const [sortKey, setSortKey] = useState<MembersSortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = PAGE_SIZE

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

  const sortedMembers = useMemo(() => {
    const list = [...members] as MemberWithPayment[]
    list.sort((a, b) => compareMembers(a, b, sortKey, sortDir))
    return list
  }, [members, sortKey, sortDir])

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedMembers
    return sortedMembers.filter((m) => {
      const name = (m.full_name || '').toLowerCase()
      const email = (m.email || '').toLowerCase()
      const memberNum = (m.member_number || '').toLowerCase()
      return name.includes(q) || email.includes(q) || memberNum.includes(q)
    })
  }, [sortedMembers, searchQuery])

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize))
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredMembers.slice(start, start + pageSize)
  }, [filteredMembers, page, pageSize])

  const handleSort = useCallback((key: MembersSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
    setPage(1)
  }, [])

  const handleInviteMember = async (memberData: {
    email: string
    firstName?: string
    lastName?: string
    membership_level?: string
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

  const handleBulkInvite = async (file: File, membership_level?: string) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (membership_level) {
        formData.append('membership_level', membership_level)
      }

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

  const handleApproveAll = async () => {
    const pendingMembers = members.filter((m) => m.status === 'pending')
    if (pendingMembers.length === 0) return
    if (!confirm(`Approve all ${pendingMembers.length} pending member${pendingMembers.length === 1 ? '' : 's'}?`)) return

    setApprovingAll(true)
    try {
      const results = await Promise.allSettled(
        pendingMembers.map((m) =>
          fetch('/api/admin/members', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: m.id, status: 'approved' }),
          })
        )
      )
      const failed = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
      ).length
      await loadData()
      if (failed > 0) {
        alert(`Approved ${pendingMembers.length - failed} members. ${failed} failed.`)
      }
    } catch (error) {
      console.error('Error approving all members:', error)
      alert('Failed to approve all members')
    } finally {
      setApprovingAll(false)
    }
  }

  const handleResendReminder = async (memberId: string) => {
    setResendingMemberId(memberId)
    try {
      const response = await fetch(`/api/admin/members/${memberId}/resend-invite`, { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        await loadData()
        setEditingMember((prev) => (prev?.id === memberId ? { ...prev, last_reminder_sent_at: new Date().toISOString(), reminder_count: (prev.reminder_count ?? 0) + 1 } : prev))
        alert('Reminder sent successfully.')
      } else {
        alert(data.error || 'Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Failed to send reminder')
    } finally {
      setResendingMemberId(null)
    }
  }

  if (loading) {
    return <Loading message="Loading members..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:flex-none sm:max-w-xs min-w-0 w-full sm:w-auto">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search by name, email, or member #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] text-sm"
            aria-label="Search members"
          />
        </div>
        <div className="flex flex-row flex-wrap justify-end gap-2 shrink-0">
        {members.some((m) => m.status === 'pending') && (
          <button
            onClick={handleApproveAll}
            disabled={approvingAll}
            className="bg-green-600 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
          >
            {approvingAll ? 'Approving...' : `Approve All Pending (${members.filter((m) => m.status === 'pending').length})`}
          </button>
        )}
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
          className="bg-green-600 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">Export Members</span>
          <span className="sm:hidden">Export</span>
        </button>
        <button
          onClick={() => setShowInviteForm(true)}
          className="bg-[#0d1e26] text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-[#0a171c] text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Invite Member</span>
          <span className="sm:hidden">Invite</span>
        </button>
        <button
          onClick={() => setShowBulkInviteForm(true)}
          className="bg-[#0d1e26] text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-[#0a171c] text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Bulk Invite (CSV)</span>
          <span className="sm:hidden">Bulk</span>
        </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {paginatedMembers.map((member) => (
                <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          className="font-medium text-gray-900 truncate hover:text-[#0d1e26] hover:underline cursor-pointer text-left"
                        >
                          {member.full_name || '-'}
                        </button>
                        {member.status === 'pending' && member.invited_at && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium shrink-0">
                            Invited
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                        <span className="truncate">{member.email}</span>
                        <span className="text-gray-400 shrink-0">· Member #: {hasPaymentSetUp(member) ? (member.member_number || '-') : '-'}</span>
                      </div>
                      {member.is_student_pilot && (
                        <div className="text-xs text-gray-500 mt-1">Student pilot</div>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingMember(member)}
                      className="ml-2 text-[#0d1e26] hover:text-[#0a171c] text-sm shrink-0"
                    >
                      Edit
                    </button>
                    {member.status === 'pending' && member.invited_at && (member.reminder_count ?? 0) < 3 && (
                      <button
                        type="button"
                        onClick={() => handleResendReminder(member.id)}
                        disabled={resendingMemberId === member.id}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-sm shrink-0 disabled:opacity-50"
                      >
                        {resendingMemberId === member.id ? 'Sending…' : 'Resend reminder'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {member.role === 'admin' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                        Admin
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded font-medium ${
                      member.status === 'approved' ? 'bg-green-100 text-green-800' :
                      member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      member.status === 'expired' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {member.status === 'pending' && member.invited_at
                        ? 'Invited'
                        : member.status
                          ? member.status.charAt(0).toUpperCase() + member.status.slice(1)
                          : 'Pending'}
                    </span>
                    <span className="px-2 py-1 rounded font-medium bg-gray-100 text-gray-800">
                      {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Full'}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs whitespace-nowrap">
                    {(() => {
                      const { label, badgeClass } = getPaymentStatus(member)
                      return (
                        <span className={`inline-flex px-2 py-1 rounded font-medium ${badgeClass}`}>
                          {label}
                        </span>
                      )
                    })()}
                  </div>
                  {(member.membership_level === 'Honorary' || member.membership_expires_at) && (
                    <div className="mt-2 text-xs text-gray-500">
                      Expires: {member.membership_level === 'Honorary'
                        ? 'Lifetime'
                        : member.membership_expires_at
                          ? new Date(member.membership_expires_at).toLocaleDateString('en-US', { timeZone: 'UTC' })
                          : '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('member_number')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Member # {sortKey === 'member_number' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('full_name')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Name {sortKey === 'full_name' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('email')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Email {sortKey === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Status {sortKey === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('membership_level')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Membership {sortKey === 'membership_level' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('membership_expires_at')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Expires {sortKey === 'membership_expires_at' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('created_at')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Added {sortKey === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                      {hasPaymentSetUp(member) ? (member.member_number || '-') : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2 flex-nowrap min-w-0">
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          className="truncate min-w-0 text-left font-medium text-gray-900 hover:text-[#0d1e26] hover:underline cursor-pointer"
                        >
                          {member.full_name || '-'}
                        </button>
                        {member.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded font-medium shrink-0">
                            Admin
                          </span>
                        )}
                        {member.status === 'pending' && member.invited_at && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium shrink-0">
                            Invited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit px-2 py-1 text-xs rounded ${
                          member.status === 'approved' ? 'bg-green-100 text-green-800' :
                          member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          member.status === 'expired' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {member.status === 'pending' && member.invited_at
                            ? 'Invited'
                            : member.status
                              ? member.status.charAt(0).toUpperCase() + member.status.slice(1)
                              : 'Pending'}
                        </span>
                        {member.status === 'expired' && member.membership_expires_at && (
                          <span className="text-xs text-amber-700">
                            Expired {new Date(member.membership_expires_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Full'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {(() => {
                        const { label, badgeClass } = getPaymentStatus(member)
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${badgeClass}`}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.membership_level === 'Honorary'
                        ? <span className="text-gray-700 font-medium">Lifetime</span>
                        : member.membership_expires_at
                          ? new Date(member.membership_expires_at).toLocaleDateString('en-US', { timeZone: 'UTC' })
                          : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">
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
                      {member.status === 'pending' && member.invited_at && (member.reminder_count ?? 0) < 3 && (
                        <button
                          type="button"
                          onClick={() => handleResendReminder(member.id)}
                          disabled={resendingMemberId === member.id}
                          className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50"
                        >
                          {resendingMemberId === member.id ? 'Sending…' : 'Resend reminder'}
                        </button>
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

      {/* Pagination */}
      {filteredMembers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 px-0 sm:px-1">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredMembers.length)} of {filteredMembers.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingMember && (
        <MemberDetailModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleUpdateMember}
          onResendReminder={handleResendReminder}
          resendingMemberId={resendingMemberId}
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

function InviteMemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (memberData: { email: string; firstName?: string; lastName?: string; membership_level?: string }) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    membership_level: 'Associate' as 'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary',
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
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Membership Level</label>
              <select
                value={formData.membership_level}
                onChange={(e) => setFormData({ ...formData, membership_level: e.target.value as 'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary' })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
              >
                <option value="Full">Full</option>
                <option value="Student">Student</option>
                <option value="Associate">Associate</option>
                <option value="Corporate">Corporate</option>
                <option value="Honorary">Honorary</option>
              </select>
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
                  membership_level: formData.membership_level,
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
  onSave: (file: File, membership_level?: string) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [membership_level, setMembershipLevel] = useState<'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary'>('Associate')

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
      await onSave(file, membership_level)
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
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Membership Level</label>
            <select
              value={membership_level}
              onChange={(e) => setMembershipLevel(e.target.value as 'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
            >
              <option value="Full">Full</option>
              <option value="Student">Student</option>
              <option value="Associate">Associate</option>
              <option value="Corporate">Corporate</option>
              <option value="Honorary">Honorary</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">All members in the CSV will be assigned this membership level</p>
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
