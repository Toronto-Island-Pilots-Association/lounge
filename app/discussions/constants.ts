import { DiscussionCategory } from '@/types/database'

export const CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  flying_at_ytz: 'Flying at YTZ',
  general_aviation: 'General Aviation',
  training_safety_proficiency: 'Training, Safety & Proficiency',
  wanted: 'Wanted',
  other: 'Other',
}

export const CATEGORY_DESCRIPTIONS: Record<DiscussionCategory, string> = {
  aircraft_shares: 'Share ownership opportunities, block time arrangements, and aircraft partnerships available at YTZ or nearby airports.',
  instructor_availability: 'Find certified flight instructors, schedule training sessions, and discuss instruction availability and rates.',
  gear_for_sale: 'Buy, sell, or trade aviation equipment, pilot gear, headsets, books, and other flight-related items.',
  flying_at_ytz: 'Open discussion for introductions, general aviation questions, Island-specific flying topics including procedures, access, FBO experiences, and operational heads-ups.',
  general_aviation: 'A place to talk all things general aviation: flying experiences, aircraft, training, safety, airspace, gear, and everyday questions.',
  training_safety_proficiency: 'Questions and discussions related to training, currency, safety, proficiency, IPCs, and recurrent flying skills.',
  wanted: 'Requests for aircraft access, instruction, gear, or other aviation-related needs.',
  other: 'General discussions that don\'t fit into the other categories.',
}

export const CATEGORY_ICONS: Record<DiscussionCategory, string> = {
  aircraft_shares: '✈️',
  instructor_availability: '👨‍✈️',
  gear_for_sale: '🛒',
  flying_at_ytz: '🏝️',
  general_aviation: '🌐',
  training_safety_proficiency: '📚',
  wanted: '🔍',
  other: '📋',
}

export const ALL_CATEGORIES: DiscussionCategory[] = [
  'aircraft_shares',
  'instructor_availability',
  'gear_for_sale',
  'flying_at_ytz',
  'general_aviation',
  'training_safety_proficiency',
  'wanted',
  'other',
]

export const CATEGORIES_WITH_ALL: (DiscussionCategory | 'all')[] = [
  'all',
  ...ALL_CATEGORIES,
]

// Classified categories (for sale/rental listings)
export const CLASSIFIED_CATEGORIES: DiscussionCategory[] = [
  'aircraft_shares',
  'instructor_availability',
  'gear_for_sale',
]

// Discussion categories (general discussions)
export const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  'flying_at_ytz',
  'general_aviation',
  'training_safety_proficiency',
  'wanted',
  'other',
]

// Category-specific placeholders for the description field
export const CATEGORY_PLACEHOLDERS: Record<DiscussionCategory, string> = {
  aircraft_shares: 'Include aircraft type, share percentage or block time details, pricing, location, and contact information...',
  instructor_availability: 'Include your certifications, availability schedule, rates, experience level, and contact information...',
  gear_for_sale: 'Include item name, condition, price, location, and contact information...',
  flying_at_ytz: 'Share your question or topic about flying at YTZ...',
  general_aviation: 'Share your question or discussion topic...',
  training_safety_proficiency: 'Share your question or discussion about training, safety, or proficiency...',
  wanted: 'Describe what you\'re looking for: aircraft access, instruction, gear, or other aviation-related needs...',
  other: 'Describe your discussion...',
}
