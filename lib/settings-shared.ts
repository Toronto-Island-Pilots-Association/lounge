/** Open string — orgs can define any level key */
export type MembershipLevelKey = string

export type SignupFieldType =
  | 'text' | 'textarea' | 'select' | 'checkbox_group'
  | 'boolean' | 'number' | 'date' | 'email' | 'phone' | 'url'

export type SignupField = {
  key: string
  label: string
  group?: string
  enabled: boolean
  required: boolean
  // Only set on custom (admin-created) fields:
  isCustom?: boolean
  type?: SignupFieldType
  placeholder?: string
  helpText?: string
  options?: string[] // for select / checkbox_group
}

export const DEFAULT_SIGNUP_FIELDS: SignupField[] = [
  { key: 'phone', label: 'Phone', group: 'contact', enabled: true, required: false },
  { key: 'address', label: 'Mailing Address', group: 'address', enabled: true, required: false },
  { key: 'membership_class', label: 'Membership Class', group: 'membership', enabled: true, required: true },
  { key: 'aviation_info', label: 'Aviation Information', group: 'aviation', enabled: true, required: false },
  { key: 'fly_frequency', label: 'How Often Fly From YTZ', group: 'aviation', enabled: false, required: false },
  { key: 'student_pilot', label: 'Student Pilot Info', group: 'student', enabled: true, required: false },
  { key: 'copa_membership', label: 'COPA Membership', group: 'copa', enabled: false, required: false },
  { key: 'statement_of_interest', label: 'Statement of Interest', group: 'application', enabled: true, required: false },
  { key: 'interests', label: 'Interests', group: 'application', enabled: true, required: false },
  { key: 'how_did_you_hear', label: 'How Did You Hear', group: 'application', enabled: true, required: false },
]

