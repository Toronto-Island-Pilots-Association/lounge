export type ClubTypeOption = {
  value: string
  label: string
  description: string
  emoji: string
}

export const CLUB_TYPE_OPTIONS: ClubTypeOption[] = [
  {
    value: 'professional-associations',
    label: 'Professional Associations',
    description: 'Trade groups, industry chapters, and member-led professional networks.',
    emoji: '🏛️',
  },
  {
    value: 'car-motorcycle-clubs',
    label: 'Car & Motorcycle Clubs',
    description: 'Driving clubs and enthusiast communities built around vehicles.',
    emoji: '🏎️',
  },
  {
    value: 'hobbyist-groups',
    label: 'Hobby Communities',
    description: 'Photography, maker, gaming, and other shared-interest groups.',
    emoji: '🎨',
  },
  {
    value: 'active-lifestyle-clubs',
    label: 'Active Lifestyle Clubs',
    description: 'Running, outdoor, and fitness communities with active memberships.',
    emoji: '🏃',
  },
  {
    value: 'parent-groups',
    label: 'Parent Groups',
    description: 'School communities, family networks, and parent-led groups.',
    emoji: '👨‍👩‍👧‍👦',
  },
  {
    value: 'ski-snow-clubs',
    label: 'Ski & Snow Clubs',
    description: 'Winter sports clubs, mountain communities, and seasonal groups.',
    emoji: '🎿',
  },
  {
    value: 'cycling-clubs',
    label: 'Cycling Clubs',
    description: 'Road, gravel, triathlon, and community cycling clubs.',
    emoji: '🚴',
  },
  {
    value: 'yacht-boating-clubs',
    label: 'Yacht & Boating Clubs',
    description: 'Sailing clubs, marinas, yacht associations, and boating groups.',
    emoji: '⛵',
  },
  {
    value: 'active-adult-communities',
    label: 'Active Adult Communities',
    description: 'Resident associations and social clubs for active adult communities.',
    emoji: '🌿',
  },
  {
    value: 'legal-financial-associations',
    label: 'Legal & Financial Associations',
    description: 'Member organizations in law, accounting, finance, and advisory.',
    emoji: '⚖️',
  },
  {
    value: 'chambers-of-commerce',
    label: 'Chambers of Commerce',
    description: 'Business membership organizations serving local communities.',
    emoji: '🤝',
  },
  {
    value: 'aviation-groups',
    label: 'Aviation Clubs',
    description: 'Flying clubs, airport communities, and pilot associations.',
    emoji: '✈️',
  },
  {
    value: 'aging-in-place-villages',
    label: 'Aging-in-Place Villages',
    description: 'Village organizations helping members age in place.',
    emoji: '🏡',
  },
  {
    value: 'civic-advocacy-groups',
    label: 'Civic & Advocacy Groups',
    description: 'Advocacy organizations, civic groups, and issue-based communities.',
    emoji: '📣',
  },
  {
    value: 'homeowner-associations',
    label: 'Homeowner Associations',
    description: 'Resident associations, condo boards, and neighborhood communities.',
    emoji: '🏘️',
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
