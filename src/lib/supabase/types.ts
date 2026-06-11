export type Role = 'artist' | 'venue' | 'audience'
export type VenueType = 'pub' | 'turku_bar' | 'live_music' | 'bookstore' | 'theater' | 'cafe' | 'studio' | 'dance_studio' | 'music_school' | 'other'
export type Recurrence = 'weekly' | 'biweekly' | 'once'
export type FeeModel = 'free' | 'door_share' | 'guarantee' | 'negotiable'
export type SlotStatus = 'open' | 'pending' | 'booked'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type EventStatus = 'confirmed' | 'cancelled' | 'pending'
export type EntryType = 'free' | 'paid' | 'door'
export type ListingStatus = 'open' | 'closed'

export interface Profile {
  id: string
  role: Role
  display_name: string
  avatar_url: string | null
  city: string | null
  bio: string | null
  is_premium: boolean
  is_founding_member: boolean
  created_at: string
}

export interface Venue {
  id: string
  owner_id: string
  name: string
  city: string
  district: string
  address: string
  phone: string | null
  email: string | null
  venue_type: VenueType
  venue_types: VenueType[]
  description: string | null
  photo_url: string | null
  logo_url: string | null
  capacity_seated: number | null
  capacity_standing: number | null
  stage_area_m2: number | null
  equipment: string[]
  genres: string[]
  verified: boolean
  created_at: string
}

export interface Slot {
  id: string
  venue_id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurrence: Recurrence
  fee_model: FeeModel
  fee_value: number | null
  max_performers: number | null
  status: SlotStatus
  notes: string | null
  created_at: string
  venues?: Venue
}

export interface Artist {
  id: string
  profile_id: string
  stage_name: string
  genres: string[]
  instruments: string[]
  city: string | null
  bio: string | null
  avatar_url: string | null
  video_urls: string[]
  technical_rider: string | null
  past_venues: string[]
  verified: boolean
  created_at: string
  profiles?: Profile
}

export interface Application {
  id: string
  slot_id: string
  artist_id: string
  message: string | null
  status: ApplicationStatus
  created_at: string
  slots?: Slot
  artists?: Artist
}

export interface Event {
  id: string
  venue_id: string
  artist_id: string
  slot_id: string | null
  title: string
  event_date: string
  start_time: string
  end_time: string
  genre: string | null
  entry_fee: number | null
  entry_type: EntryType
  description: string | null
  status: EventStatus
  created_at: string
  venues?: Venue
  artists?: Artist
}

export interface CrewListing {
  id: string
  poster_id: string
  title: string
  description: string | null
  genres: string[]
  roles_needed: string[]
  city: string | null
  contact_email: string
  status: ListingStatus
  created_at: string
  profiles?: Profile
}

export type BandMemberStatus = 'invited' | 'accepted' | 'declined'

export interface Band {
  id: string
  creator_id: string
  name: string
  genres: string[]
  city: string | null
  bio: string | null
  photo_url: string | null
  social_links: Record<string, string>
  created_at: string
  band_members?: BandMember[]
}

export interface BandMember {
  id: string
  band_id: string
  artist_id: string
  role: string | null
  status: BandMemberStatus
  invited_at: string
  joined_at: string | null
  artists?: Pick<Artist, 'id' | 'stage_name' | 'instruments' | 'city'> & { profiles?: Pick<Profile, 'avatar_url'> | null }
  bands?: Pick<Band, 'id' | 'name' | 'genres' | 'city'>
}

// Supabase Database type — intentionally permissive for MVP.
// Generate precise types with: supabase gen types typescript --project-id <id>
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      venues: {
        Row: Venue
        Insert: Omit<Venue, 'id' | 'created_at' | 'verified'>
        Update: Partial<Omit<Venue, 'id' | 'created_at'>>
        Relationships: []
      }
      slots: {
        Row: Slot
        Insert: Omit<Slot, 'id' | 'created_at' | 'venues'>
        Update: Partial<Omit<Slot, 'id' | 'created_at' | 'venues'>>
        Relationships: []
      }
      artists: {
        Row: Artist
        Insert: Omit<Artist, 'id' | 'created_at' | 'verified' | 'profiles'>
        Update: Partial<Omit<Artist, 'id' | 'created_at' | 'profiles'>>
        Relationships: []
      }
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at' | 'slots' | 'artists'>
        Update: Partial<Omit<Application, 'id' | 'created_at' | 'slots' | 'artists'>>
        Relationships: []
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'venues' | 'artists'>
        Update: Partial<Omit<Event, 'id' | 'created_at' | 'venues' | 'artists'>>
        Relationships: []
      }
      crew_listings: {
        Row: CrewListing
        Insert: Omit<CrewListing, 'id' | 'created_at' | 'profiles'>
        Update: Partial<Omit<CrewListing, 'id' | 'created_at' | 'profiles'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
