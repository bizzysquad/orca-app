import { Disc3, Mic2, PartyPopper, Sparkles, Sun, Theater, Lightbulb, Music2, MapPin, Palette, ListChecks, LucideIcon } from 'lucide-react'

export interface CommunityEvent {
  id: string
  slug: string
  name: string
  flyer_url: string | null
  description: string
  city: string
  state: string
  venue: string
  status: string
  start_time: string | null
  music_genres: string[]
  is_paid: boolean
  goal: number | null
  supporters: number | null
}

export interface Idea {
  id: string
  title: string
  category: string
  description: string
  location: string
  music: string
  artist: string
  theme: string
  upvotes: number
  voted: boolean
  created_at: string
  trending: number
}

export interface Poll {
  id: string
  kind: string
  question: string
  event: { slug: string; name: string }
  options: { id: string; label: string; votes: number | null }[]
  totalVotes: number | null
}

export interface CommunityStats {
  ideas: number
  ideaVotes: number
  supporters: number
  eventsInMotion: number
}

export const CATEGORIES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'party', label: 'Party', icon: PartyPopper },
  { key: 'live_music', label: 'Live Music', icon: Mic2 },
  { key: 'dj_set', label: 'DJ Set', icon: Disc3 },
  { key: 'day_party', label: 'Day Party', icon: Sun },
  { key: 'themed_night', label: 'Themed Night', icon: Theater },
  { key: 'experience', label: 'Experience', icon: Sparkles },
  { key: 'other', label: 'Other', icon: Lightbulb },
]

export function categoryMeta(key: string) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

export const POLL_KINDS: Record<string, { label: string; icon: LucideIcon }> = {
  artist: { label: 'DJ / Artist', icon: Disc3 },
  genre: { label: 'Music', icon: Music2 },
  venue: { label: 'Venue', icon: MapPin },
  theme: { label: 'Theme', icon: Palette },
  format: { label: 'Format', icon: ListChecks },
  custom: { label: 'Community Poll', icon: ListChecks },
}

// Lifecycle buckets shown on the homepage
export type Stage = 'proposed' | 'confirmed' | 'upcoming' | 'past'

export function stageOf(status: string): Stage {
  if (status === 'collecting_interest' || status === 'voting_open') return 'proposed'
  if (status === 'date_selected') return 'confirmed'
  if (status === 'completed') return 'past'
  return 'upcoming'
}

export const STAGE_META: Record<Stage, { label: string; badge: string }> = {
  proposed: { label: 'Proposed', badge: 'bg-violet-500/20 text-violet-200 border-violet-400/30' },
  confirmed: { label: 'Confirmed', badge: 'bg-sky-500/20 text-sky-200 border-sky-400/30' },
  upcoming: { label: 'Upcoming', badge: 'bg-gold-liquid/20 text-gold-highlight border-gold-liquid/40' },
  past: { label: 'Past', badge: 'bg-white/10 text-text-secondary border-white/10' },
}

export const STATUS_CTA: Record<string, string> = {
  collecting_interest: "I'm Interested",
  voting_open: 'Vote & Shape It',
  date_selected: 'See Details',
  rsvp_open: 'RSVP Now',
  tickets_on_sale: 'Get Tickets',
  sold_out: 'Join Waitlist',
  completed: 'View Recap',
}

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
