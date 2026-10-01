/**
 * ORCA Outfit — domain model.
 *
 * Persistence: these shapes live in localStorage under the `orca-outfit-*` keys
 * (see OUTFIT_KEYS) and sync cross-device through SYNC_KEYS → profiles.local_data,
 * the same mechanism every other ORCA feature uses. Images live in Supabase
 * Storage (bucket `orca-outfit`) and are referenced by URL — never inlined —
 * except for a small data-URL thumbnail fallback when an upload fails.
 *
 * Each interface is flat and id-keyed so it maps 1:1 onto a future normalized
 * table (wardrobe_items, outfits, outfit_items, outfit_prefs) if the feature
 * ever outgrows the local_data blob.
 */

export type Gender = 'men' | 'women'

export type Category =
  | 'shirt' | 'tshirt' | 'sweater' | 'blouse' | 'jacket' | 'coat' | 'blazer'
  | 'pants' | 'jeans' | 'shorts' | 'skirt' | 'dress' | 'suit'
  | 'shoes' | 'sneakers' | 'boots' | 'heels'
  | 'hat' | 'watch' | 'jewelry' | 'bag' | 'belt' | 'accessory'

/** Where a piece sits in an outfit. `onepiece` (dress/suit) fills top + bottom. */
export type Slot = 'top' | 'bottom' | 'onepiece' | 'outerwear' | 'shoes' | 'accessory'

/** Wardrobe tab grouping. */
export type WardrobeGroup = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories'

export type Pattern = 'solid' | 'striped' | 'plaid' | 'floral' | 'graphic' | 'textured' | 'print'
export type Season = 'spring' | 'summer' | 'fall' | 'winter'
export type Style = 'casual' | 'smart' | 'formal' | 'streetwear' | 'athletic' | 'boho' | 'minimal' | 'classic'

/** 1 = loungewear … 5 = black tie */
export type Formality = 1 | 2 | 3 | 4 | 5

/** Id of a named color in COLOR_PALETTE (src/lib/outfit/colors.ts). */
export type ColorId = string

export type ItemSource = 'photo' | 'closet-scan' | 'url' | 'manual' | 'sample'

export interface WardrobeItem {
  id: string
  name: string
  category: Category
  primaryColor: ColorId
  accentColors: ColorId[]
  pattern: Pattern
  styles: Style[]
  seasons: Season[]
  formality: Formality
  /** Supabase Storage public URL, or a small data URL if upload failed. */
  imageUrl?: string
  /** Storage object path, kept so the image can be deleted with the item. */
  imagePath?: string
  brand?: string
  productUrl?: string
  price?: number
  favorite: boolean
  source: ItemSource
  /** Recognition confidence 0–1 per field, from whichever provider detected it. */
  confidence?: Partial<Record<'category' | 'color' | 'pattern', number>>
  wearCount: number
  lastWornAt?: string
  createdAt: string
}

/** Partial item produced by a recognition provider, awaiting user review. */
export type DetectedItem = Omit<WardrobeItem, 'id' | 'favorite' | 'wearCount' | 'createdAt'> & {
  /** Local preview while the upload is pending. */
  previewUrl?: string
  /** Original or cropped image blob to upload on confirm. */
  blob?: Blob
}

/** Map of slot → item id. Accessories can hold several. */
export interface OutfitPieces {
  top?: string
  bottom?: string
  onepiece?: string
  outerwear?: string
  shoes?: string
  accessories: string[]
}

export type Occasion =
  | 'casual' | 'business-casual' | 'work' | 'date-night' | 'wedding' | 'formal'
  | 'vacation' | 'beach' | 'night-out' | 'streetwear' | 'dinner' | 'church'
  | 'travel' | 'cold-weather' | 'summer' | 'fall' | 'winter' | 'spring'

export interface SavedOutfit {
  id: string
  name: string
  gender: Gender
  pieces: OutfitPieces
  occasion?: Occasion
  note?: string
  favorite: boolean
  /** ISO dates this look was worn — the outfit-calendar hook. */
  wornOn: string[]
  /** Optional rendered preview (try-on or collage) for future use. */
  previewUrl?: string
  createdAt: string
  updatedAt: string
}

export interface OutfitPrefs {
  gender: Gender
  /** Last-used occasion in the generator. */
  lastOccasion?: Occasion
}

/** A garment ORCA can suggest but the user doesn't own — used for gap-filling and purchases. */
export interface CatalogPiece {
  key: string
  name: string
  category: Category
  primaryColor: ColorId
  pattern: Pattern
  styles: Style[]
  seasons: Season[]
  formality: Formality
  genders: Gender[]
}

/** A generated or in-progress outfit: owned items plus any suggested (unowned) fillers. */
export interface OutfitDraft {
  pieces: OutfitPieces
  /** Slots filled with a catalog suggestion because the wardrobe had nothing suitable. */
  suggestions: Partial<Record<Slot, CatalogPiece>>
  score: number
  reasons: string[]
}

export const OUTFIT_KEYS = {
  wardrobe: 'orca-outfit-wardrobe',
  outfits: 'orca-outfit-looks',
  prefs: 'orca-outfit-prefs',
} as const
