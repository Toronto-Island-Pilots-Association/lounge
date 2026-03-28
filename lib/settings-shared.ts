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
  { key: 'phone',               label: 'Phone',               group: 'contact',     enabled: true,  required: false },
  { key: 'address',             label: 'Mailing Address',     group: 'address',     enabled: true,  required: false },
  { key: 'statement_of_interest', label: 'Statement of Interest', group: 'application', enabled: true, required: false },
  { key: 'interests',           label: 'Interests',           group: 'application', enabled: true,  required: false },
  { key: 'how_did_you_hear',    label: 'How Did You Hear',    group: 'application', enabled: true,  required: false },
]

