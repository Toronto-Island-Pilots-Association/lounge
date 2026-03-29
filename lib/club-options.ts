export type ClubTypeOption = {
  value: string
  label: string
  description: string
  badge: string
}

export const CLUB_TYPE_OPTIONS: ClubTypeOption[] = [
  {
    value: 'professional-associations',
    label: 'Professional Associations',
    description: 'Trade groups, industry chapters, and member-led professional networks.',
    badge: 'PA',
  },
  {
    value: 'car-motorcycle-clubs',
    label: 'Car & Motorcycle Clubs',
    description: 'Driving clubs, enthusiast groups, and member communities built around vehicles.',
    badge: 'CM',
  },
  {
    value: 'hobbyist-groups',
    label: 'Hobby Communities',
    description: 'Photography clubs, maker groups, gaming communities, and other shared-interest groups.',
    badge: 'HC',
  },
  {
    value: 'active-lifestyle-clubs',
    label: 'Active Lifestyle Clubs',
    description: 'Running clubs, outdoor groups, fitness communities, and activity-based memberships.',
    badge: 'AL',
  },
  {
    value: 'parent-groups',
    label: 'Parent Groups',
    description: 'School communities, family networks, and parent-led organizations.',
    badge: 'PG',
  },
  {
    value: 'ski-snow-clubs',
    label: 'Ski & Snow Clubs',
    description: 'Winter sports clubs, mountain communities, and seasonal activity groups.',
    badge: 'SS',
  },
  {
    value: 'cycling-clubs',
    label: 'Cycling Clubs',
    description: 'Road, gravel, triathlon, and community cycling organizations.',
    badge: 'CY',
  },
  {
    value: 'yacht-boating-clubs',
    label: 'Yacht & Boating Clubs',
    description: 'Sailing clubs, marinas, yacht associations, and other boating communities.',
    badge: 'YB',
  },
  {
    value: 'active-adult-communities',
    label: 'Active Adult Communities',
    description: 'Resident associations and social clubs for active adult communities.',
    badge: 'AA',
  },
  {
    value: 'legal-financial-associations',
    label: 'Legal & Financial Associations',
    description: 'Professional member organizations in law, accounting, finance, and advisory services.',
    badge: 'LF',
  },
  {
    value: 'chambers-of-commerce',
    label: 'Chambers of Commerce',
    description: 'Business membership organizations serving local commercial communities.',
    badge: 'CC',
  },
  {
    value: 'aviation-groups',
    label: 'Aviation Clubs',
    description: 'Flying clubs, airport communities, and pilot associations.',
    badge: 'AV',
  },
  {
    value: 'aging-in-place-villages',
    label: 'Aging-in-Place Villages',
    description: 'Village organizations and support communities helping members age in place.',
    badge: 'AP',
  },
  {
    value: 'civic-advocacy-groups',
    label: 'Civic & Advocacy Groups',
    description: 'Member-driven advocacy organizations, civic groups, and issue-based communities.',
    badge: 'CA',
  },
  {
    value: 'homeowner-associations',
    label: 'Homeowner Associations',
    description: 'Resident associations, condo boards, and neighborhood communities.',
    badge: 'HO',
  },
]

export const CLUB_SIZE_OPTIONS = [
  { value: '', label: 'Select club size…' },
  { value: 'under-25', label: 'Under 25 members' },
  { value: '25-99', label: '25 to 99 members' },
  { value: '100-249', label: '100 to 249 members' },
  { value: '250-499', label: '250 to 499 members' },
  { value: '500-999', label: '500 to 999 members' },
  { value: '1000-plus', label: '1,000+ members' },
] as const

export const COMMON_INTEREST_OPTIONS = [
  { value: 'networking', label: 'Networking & community' },
  { value: 'events', label: 'Events & socials' },
  { value: 'learning', label: 'Learning & workshops' },
  { value: 'advocacy', label: 'Advocacy & industry updates' },
  { value: 'member-benefits', label: 'Member benefits & perks' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'leadership', label: 'Leadership & committees' },
  { value: 'local-activities', label: 'Local activities' },
  { value: 'trips', label: 'Trips & outings' },
  { value: 'buying-selling', label: 'Buying & selling' },
  { value: 'other', label: 'Other' },
] as const
