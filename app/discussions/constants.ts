import { DiscussionCategory, TIPA_ORG_ID } from '@/types/database'

// ─── Per-org category config ──────────────────────────────────────────────────

export type OrgCategoryConfig = {
  discussionCategories: DiscussionCategory[]
  classifiedCategories: DiscussionCategory[]
  categoryLabels: Record<DiscussionCategory, string>
  categoryDescriptions: Record<DiscussionCategory, string>
}

// Generic labels/descriptions for non-TIPA orgs (reuse existing DB enum keys)
const GENERIC_LABELS: Record<DiscussionCategory, string> = {
  introduce_yourself: 'Introduce Yourself',
  general_aviation: 'General',
  other: 'Other',
  // classifieds
  gear_for_sale: 'For Sale',
  wanted: 'Wanted',
  // unused in generic config but must satisfy the full record type
  aircraft_shares: 'Aircraft Shares',
  instructor_availability: 'Instructor Availability',
  flying_at_ytz: 'Flying at YTZ',
  training_safety_proficiency: 'Training & Safety',
  building_a_better_tipa: 'Feedback',
}

const GENERIC_DESCRIPTIONS: Record<DiscussionCategory, string> = {
  introduce_yourself: 'Say hello to the community — share a bit about yourself and what brings you here.',
  general_aviation: 'General discussion for the community — questions, ideas, and anything on your mind.',
  other: 'Discussions that don\'t fit anywhere else.',
  gear_for_sale: 'Buy, sell, or trade equipment and other items.',
  wanted: 'Post what you\'re looking for.',
  aircraft_shares: '',
  instructor_availability: '',
  flying_at_ytz: '',
  training_safety_proficiency: '',
  building_a_better_tipa: '',
}

export const DEFAULT_CATEGORY_CONFIG: OrgCategoryConfig = {
  discussionCategories: ['introduce_yourself', 'general_aviation', 'other'],
  classifiedCategories: ['gear_for_sale', 'wanted'],
  categoryLabels: GENERIC_LABELS,
  categoryDescriptions: GENERIC_DESCRIPTIONS,
}

export function getCategoryConfig(orgId: string | null): OrgCategoryConfig {
  if (orgId === TIPA_ORG_ID) return TIPA_CATEGORY_CONFIG
  return DEFAULT_CATEGORY_CONFIG
}

// ─── TIPA-specific config (defined after the label maps below) ────────────────
// (exported as TIPA_CATEGORY_CONFIG at the bottom of this file)

export const CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  introduce_yourself: 'Introduce Yourself',
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  flying_at_ytz: 'Flying at YTZ',
  general_aviation: 'General Aviation',
  training_safety_proficiency: 'Training, Safety & Proficiency',
  wanted: 'Wanted',
  building_a_better_tipa: 'Building a Better TIPA',
  other: 'Other',
}

export const CATEGORY_DESCRIPTIONS: Record<DiscussionCategory, string> = {
  introduce_yourself: 'Say hello to the community—share your background, flying goals, and what brought you to TIPA.',
  aircraft_shares: 'Share ownership opportunities, block time arrangements, and aircraft partnerships available at YTZ or nearby airports.',
  instructor_availability: 'Find certified flight instructors, schedule training sessions, and discuss instruction availability and rates.',
  gear_for_sale: 'Buy, sell, or trade aviation equipment, pilot gear, headsets, books, and other flight-related items.',
  flying_at_ytz: 'Open discussion for introductions, general aviation questions, Island-specific flying topics including procedures, access, FBO experiences, and operational heads-ups.',
  general_aviation: 'A place to talk all things general aviation: flying experiences, aircraft, training, safety, airspace, gear, and everyday questions.',
  training_safety_proficiency: 'Questions and discussions related to training, currency, safety, proficiency, IPCs, and recurrent flying skills.',
  wanted: 'Requests for aircraft access, instruction, gear, or other aviation-related needs.',
  building_a_better_tipa: 'Ideas, feedback, and discussions on how to improve TIPA—operations, community, events, and member experience.',
  other: 'General discussions that don\'t fit into the other categories.',
}

export const CATEGORY_ICONS: Record<DiscussionCategory, string> = {
  introduce_yourself: '👋',
  aircraft_shares: '✈️',
  instructor_availability: '👨‍✈️',
  gear_for_sale: '🛒',
  flying_at_ytz: '🛫',
  general_aviation: '🌐',
  training_safety_proficiency: '📚',
  wanted: '🔍',
  building_a_better_tipa: '🏗️',
  other: '📋',
}

export const ALL_CATEGORIES: DiscussionCategory[] = [
  'introduce_yourself',
  'aircraft_shares',
  'instructor_availability',
  'gear_for_sale',
  'flying_at_ytz',
  'general_aviation',
  'training_safety_proficiency',
  'wanted',
  'building_a_better_tipa',
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
  'wanted',
]

// Discussion categories (general discussions)
export const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  'introduce_yourself',
  'flying_at_ytz',
  'general_aviation',
  'training_safety_proficiency',
  'building_a_better_tipa',
  'other',
]

// Optional category-specific placeholders for the title field (fallback: "Enter discussion title...")
export const CATEGORY_TITLE_PLACEHOLDERS: Partial<Record<DiscussionCategory, string>> = {
  introduce_yourself: "e.g. Hi, I'm [Name] or your name",
}

// Category-specific placeholders for the description field
export const CATEGORY_PLACEHOLDERS: Record<DiscussionCategory, string> = {
  introduce_yourself: 'Tell the community a bit about yourself—your flying background, goals, and what brought you to TIPA...',
  aircraft_shares: 'Include aircraft type, share percentage or block time details, pricing, location, and contact information...',
  instructor_availability: 'Include your certifications, availability schedule, rates, experience level, and contact information...',
  gear_for_sale: 'Include item name, condition, price, location, and contact information...',
  flying_at_ytz: 'Share your question or topic about flying at YTZ...',
  general_aviation: 'Share your question or discussion topic...',
  training_safety_proficiency: 'Share your question or discussion about training, safety, or proficiency...',
  wanted: 'Describe what you\'re looking for: aircraft access, instruction, gear, or other aviation-related needs...',
  building_a_better_tipa: 'Share ideas, feedback, or suggestions for improving TIPA...',
  other: 'Describe your discussion...',
}

// TIPA-specific config (uses all categories with original TIPA labels/descriptions)
export const TIPA_CATEGORY_CONFIG: OrgCategoryConfig = {
  discussionCategories: DISCUSSION_CATEGORIES,
  classifiedCategories: CLASSIFIED_CATEGORIES,
  categoryLabels: CATEGORY_LABELS,
  categoryDescriptions: CATEGORY_DESCRIPTIONS,
}
