import type {
  CatalogPiece, Category, Formality, Gender, Occasion, Pattern, Season, Slot, Style,
  WardrobeGroup, WardrobeItem,
} from './types'

// ── Categories ────────────────────────────────────────────────────────────

export interface CategoryConfig {
  label: string
  plural: string
  slot: Slot
  group: WardrobeGroup
  genders: Gender[]
  /** Slots this piece fills on its own (a dress covers top + bottom). */
  covers?: Slot[]
  formality: Formality
  seasons: Season[]
  styles: Style[]
  /** Filename / product-title keywords used for best-effort type detection. */
  keywords: RegExp
}

const ALL: Season[] = ['spring', 'summer', 'fall', 'winter']
const BOTH: Gender[] = ['men', 'women']

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  shirt:     { label: 'Shirt',     plural: 'Shirts',      slot: 'top',       group: 'tops',        genders: BOTH,      formality: 3, seasons: ALL, styles: ['smart', 'classic'], keywords: /\b(shirt|button[- ]?(down|up)|oxford shirt|flannel|polo|overshirt)\b/ },
  tshirt:    { label: 'T-Shirt',   plural: 'T-Shirts',    slot: 'top',       group: 'tops',        genders: BOTH,      formality: 1, seasons: ['spring', 'summer', 'fall'], styles: ['casual', 'streetwear', 'minimal'], keywords: /\b(t[- ]?shirt|tee|tank|henley)\b/ },
  sweater:   { label: 'Sweater',   plural: 'Sweaters',    slot: 'top',       group: 'tops',        genders: BOTH,      formality: 2, seasons: ['fall', 'winter'], styles: ['casual', 'classic'], keywords: /\b(sweater|knit|cardigan|hoodie|sweatshirt|crewneck|pullover|turtleneck|quarter[- ]zip)\b/ },
  blouse:    { label: 'Blouse',    plural: 'Blouses',     slot: 'top',       group: 'tops',        genders: ['women'], formality: 3, seasons: ALL, styles: ['smart', 'classic'], keywords: /\b(blouse|cami|camisole|bodysuit|crop top)\b/ },
  jacket:    { label: 'Jacket',    plural: 'Jackets',     slot: 'outerwear', group: 'outerwear',   genders: BOTH,      formality: 2, seasons: ['spring', 'fall'], styles: ['casual'], keywords: /\b(jacket|bomber|shacket|windbreaker|field jacket|trucker)\b/ },
  coat:      { label: 'Coat',      plural: 'Coats',       slot: 'outerwear', group: 'outerwear',   genders: BOTH,      formality: 3, seasons: ['fall', 'winter'], styles: ['classic'], keywords: /\b(coat|parka|trench|overcoat|puffer|peacoat)\b/ },
  blazer:    { label: 'Blazer',    plural: 'Blazers',     slot: 'outerwear', group: 'outerwear',   genders: BOTH,      formality: 4, seasons: ALL, styles: ['smart', 'classic'], keywords: /\b(blazer|sport ?coat)\b/ },
  pants:     { label: 'Pants',     plural: 'Pants',       slot: 'bottom',    group: 'bottoms',     genders: BOTH,      formality: 3, seasons: ALL, styles: ['smart', 'classic'], keywords: /\b(pants|trousers?|chinos?|slacks|joggers|cargos?)\b/ },
  jeans:     { label: 'Jeans',     plural: 'Jeans',       slot: 'bottom',    group: 'bottoms',     genders: BOTH,      formality: 2, seasons: ALL, styles: ['casual', 'streetwear'], keywords: /\b(jeans?|denim pants)\b/ },
  shorts:    { label: 'Shorts',    plural: 'Shorts',      slot: 'bottom',    group: 'bottoms',     genders: BOTH,      formality: 1, seasons: ['spring', 'summer'], styles: ['casual'], keywords: /\bshorts\b/ },
  skirt:     { label: 'Skirt',     plural: 'Skirts',      slot: 'bottom',    group: 'bottoms',     genders: ['women'], formality: 3, seasons: ALL, styles: ['smart', 'classic'], keywords: /\b(skirt|skort)\b/ },
  dress:     { label: 'Dress',     plural: 'Dresses',     slot: 'onepiece',  group: 'tops',        genders: ['women'], covers: ['top', 'bottom'], formality: 3, seasons: ALL, styles: ['classic', 'smart'], keywords: /\b(dress|gown|jumpsuit|romper)\b/ },
  suit:      { label: 'Suit',      plural: 'Suits',       slot: 'onepiece',  group: 'outerwear',   genders: BOTH,      covers: ['bottom', 'outerwear'], formality: 5, seasons: ALL, styles: ['formal', 'classic'], keywords: /\b(suit|tuxedo|tux)\b/ },
  shoes:     { label: 'Shoes',     plural: 'Shoes',       slot: 'shoes',     group: 'shoes',       genders: BOTH,      formality: 4, seasons: ALL, styles: ['smart', 'classic'], keywords: /\b(shoes?|loafers?|oxfords|derby|flats|sandals?|mules?|slides|espadrilles?)\b/ },
  sneakers:  { label: 'Sneakers',  plural: 'Sneakers',    slot: 'shoes',     group: 'shoes',       genders: BOTH,      formality: 1, seasons: ALL, styles: ['casual', 'streetwear', 'athletic'], keywords: /\b(sneakers?|trainers?|runners?|jordans?|kicks|vans|converse|air force)\b/ },
  boots:     { label: 'Boots',     plural: 'Boots',       slot: 'shoes',     group: 'shoes',       genders: BOTH,      formality: 3, seasons: ['fall', 'winter', 'spring'], styles: ['casual', 'classic'], keywords: /\b(boots?|chelsea|chukka)\b/ },
  heels:     { label: 'Heels',     plural: 'Heels',       slot: 'shoes',     group: 'shoes',       genders: ['women'], formality: 4, seasons: ALL, styles: ['smart', 'formal'], keywords: /\b(heels?|pumps?|stiletto|slingbacks?)\b/ },
  hat:       { label: 'Hat',       plural: 'Hats',        slot: 'accessory', group: 'accessories', genders: BOTH,      formality: 1, seasons: ALL, styles: ['casual', 'streetwear'], keywords: /\b(hat|cap|beanie|fedora|bucket)\b/ },
  watch:     { label: 'Watch',     plural: 'Watches',     slot: 'accessory', group: 'accessories', genders: BOTH,      formality: 3, seasons: ALL, styles: ['classic', 'smart'], keywords: /\b(watch|timepiece)\b/ },
  jewelry:   { label: 'Jewelry',   plural: 'Jewelry',     slot: 'accessory', group: 'accessories', genders: BOTH,      formality: 3, seasons: ALL, styles: ['classic'], keywords: /\b(necklace|ring|bracelet|earrings?|hoops?|chain|pendant|jewelry)\b/ },
  bag:       { label: 'Bag',       plural: 'Bags',        slot: 'accessory', group: 'accessories', genders: BOTH,      formality: 3, seasons: ALL, styles: ['classic'], keywords: /\b(bag|tote|purse|backpack|clutch|crossbody|satchel)\b/ },
  belt:      { label: 'Belt',      plural: 'Belts',       slot: 'accessory', group: 'accessories', genders: BOTH,      formality: 3, seasons: ALL, styles: ['classic'], keywords: /\bbelt\b/ },
  accessory: { label: 'Accessory', plural: 'Accessories', slot: 'accessory', group: 'accessories', genders: BOTH,      formality: 2, seasons: ALL, styles: ['casual'], keywords: /\b(scarf|tie|bow ?tie|sunglasses|gloves|pocket square)\b/ },
}

export const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[]

export function categoriesFor(gender: Gender): Category[] {
  return CATEGORIES.filter(c => CATEGORY_CONFIG[c].genders.includes(gender))
}

/** Best-effort category from free text; undefined when nothing matches. */
export function categoryFromText(text: string): Category | undefined {
  const t = text.toLowerCase().replace(/[_\-]+/g, ' ')
  // Check specific types before generic ones ("denim jacket" is a jacket, "shirt dress" a dress).
  const order: Category[] = ['dress', 'suit', 'blazer', 'coat', 'jacket', 'sneakers', 'boots', 'heels', 'jeans', 'shorts', 'skirt',
    'tshirt', 'sweater', 'blouse', 'shirt', 'pants', 'shoes', 'watch', 'jewelry', 'bag', 'belt', 'hat', 'accessory']
  return order.find(c => CATEGORY_CONFIG[c].keywords.test(t))
}

export const GROUP_LABELS: Record<WardrobeGroup, string> = {
  tops: 'Tops', bottoms: 'Bottoms', outerwear: 'Outerwear', shoes: 'Shoes', accessories: 'Accessories',
}

export const SLOT_LABELS: Record<Slot, string> = {
  top: 'Top', bottom: 'Bottom', onepiece: 'Dress / Suit', outerwear: 'Outerwear', shoes: 'Shoes', accessory: 'Accessories',
}

export const PATTERNS: Pattern[] = ['solid', 'striped', 'plaid', 'floral', 'graphic', 'textured', 'print']
export const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter']
export const STYLES: Style[] = ['casual', 'smart', 'formal', 'streetwear', 'athletic', 'boho', 'minimal', 'classic']
export const FORMALITY_LABELS: Record<Formality, string> = {
  1: 'Relaxed', 2: 'Casual', 3: 'Smart casual', 4: 'Dressy', 5: 'Formal',
}

export function currentSeason(date = new Date()): Season {
  const m = date.getMonth()
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'fall'
}

// ── Occasions ─────────────────────────────────────────────────────────────

export interface OccasionConfig {
  label: string
  emoji: string
  formality: [Formality, Formality]
  styles: Style[]
  /** Forces a season; otherwise the current season is used. */
  season?: Season
  outerwear: 'required' | 'optional' | 'avoid'
  /** Categories this occasion favors (beach → shorts, wedding → suit). Keeps similar-formality occasions distinct. */
  prefer?: Category[]
  avoidCategories?: Category[]
}

export const OCCASIONS: Record<Occasion, OccasionConfig> = {
  'casual':          { label: 'Casual',          emoji: '☕', formality: [1, 2], styles: ['casual', 'minimal', 'streetwear'], outerwear: 'optional' },
  'business-casual': { label: 'Business Casual', emoji: '💼', formality: [3, 4], styles: ['smart', 'classic', 'minimal'], outerwear: 'optional', prefer: ['shirt', 'sweater', 'pants', 'shoes', 'blouse'], avoidCategories: ['shorts', 'tshirt', 'hat'] },
  'work':            { label: 'Work',            emoji: '🏢', formality: [3, 4], styles: ['smart', 'classic', 'minimal'], outerwear: 'optional', prefer: ['blazer', 'shirt', 'blouse', 'pants', 'shoes', 'skirt'], avoidCategories: ['shorts', 'hat'] },
  'date-night':      { label: 'Date Night',      emoji: '🌹', formality: [3, 4], styles: ['smart', 'minimal', 'classic'], outerwear: 'optional', prefer: ['sweater', 'jeans', 'boots', 'dress', 'heels', 'jacket'], avoidCategories: ['shorts', 'hat'] },
  'wedding':         { label: 'Wedding',         emoji: '💍', formality: [4, 5], styles: ['formal', 'smart', 'classic'], outerwear: 'optional', prefer: ['suit', 'blazer', 'shoes', 'dress', 'heels', 'shirt'], avoidCategories: ['jeans', 'shorts', 'sneakers', 'tshirt', 'hat'] },
  'formal':          { label: 'Formal',          emoji: '🎩', formality: [5, 5], styles: ['formal', 'classic'], outerwear: 'optional', prefer: ['suit', 'shoes', 'dress', 'heels'], avoidCategories: ['jeans', 'shorts', 'sneakers', 'tshirt', 'hat'] },
  'vacation':        { label: 'Vacation',        emoji: '🌴', formality: [1, 3], styles: ['casual', 'boho', 'minimal'], season: 'summer', outerwear: 'avoid', prefer: ['shorts', 'dress', 'tshirt', 'sneakers'] },
  'beach':           { label: 'Beach',           emoji: '🏖️', formality: [1, 2], styles: ['casual', 'boho'], season: 'summer', outerwear: 'avoid', prefer: ['shorts', 'skirt', 'tshirt', 'sneakers'], avoidCategories: ['boots', 'heels', 'coat', 'jeans', 'pants', 'blazer', 'suit', 'sweater'] },
  'night-out':       { label: 'Night Out',       emoji: '🌃', formality: [2, 4], styles: ['streetwear', 'smart', 'minimal'], outerwear: 'optional', prefer: ['jeans', 'jacket', 'boots', 'heels', 'dress'] },
  'streetwear':      { label: 'Streetwear',      emoji: '🧢', formality: [1, 2], styles: ['streetwear', 'casual'], outerwear: 'optional', prefer: ['tshirt', 'sneakers', 'jeans', 'hat', 'jacket'] },
  'dinner':          { label: 'Dinner',          emoji: '🍽️', formality: [3, 4], styles: ['smart', 'classic'], outerwear: 'optional', prefer: ['shirt', 'blouse', 'pants', 'shoes', 'dress', 'sweater'], avoidCategories: ['shorts', 'hat'] },
  'church':          { label: 'Church',          emoji: '⛪', formality: [3, 4], styles: ['classic', 'smart'], outerwear: 'optional', prefer: ['shirt', 'pants', 'dress', 'skirt', 'shoes', 'blazer'], avoidCategories: ['shorts', 'hat'] },
  'travel':          { label: 'Travel',          emoji: '✈️', formality: [1, 2], styles: ['casual', 'athletic', 'minimal'], outerwear: 'optional', avoidCategories: ['heels'] },
  'cold-weather':    { label: 'Cold Weather',    emoji: '🧣', formality: [1, 4], styles: ['casual', 'classic'], season: 'winter', outerwear: 'required', prefer: ['coat', 'sweater', 'boots'], avoidCategories: ['shorts'] },
  'summer':          { label: 'Summer',          emoji: '☀️', formality: [1, 3], styles: ['casual', 'minimal'], season: 'summer', outerwear: 'avoid' },
  'fall':            { label: 'Fall',            emoji: '🍂', formality: [1, 3], styles: ['casual', 'classic'], season: 'fall', outerwear: 'optional' },
  'winter':          { label: 'Winter',          emoji: '❄️', formality: [1, 4], styles: ['casual', 'classic'], season: 'winter', outerwear: 'required', prefer: ['coat', 'sweater', 'boots'], avoidCategories: ['shorts'] },
  'spring':          { label: 'Spring',          emoji: '🌷', formality: [1, 3], styles: ['casual', 'minimal'], season: 'spring', outerwear: 'optional' },
}

export const OCCASION_IDS = Object.keys(OCCASIONS) as Occasion[]

/**
 * Local parser for free-text requests ("rooftop dinner in Miami"). Used directly when
 * no AI stylist is configured, and as the fallback when the AI call fails.
 */
export function parseRequest(text: string): { occasion: Occasion; season?: Season; matched: string[] } {
  const t = text.toLowerCase()
  const matched: string[] = []
  const hit = (re: RegExp, label: string) => { if (re.test(t)) { matched.push(label); return true } return false }

  let season: Season | undefined
  if (hit(/\b(miami|beach|tropical|hawaii|cancun|vegas|caribbean|bahamas|phoenix|la\b|los angeles|summer|hot|pool)\b/, 'warm weather')) season = 'summer'
  else if (hit(/\b(snow|ski|freezing|cold|winter|chicago|new york in (dec|jan|feb))\b/, 'cold weather')) season = 'winter'
  else if (hit(/\b(fall|autumn|october|november)\b/, 'fall')) season = 'fall'
  else if (hit(/\b(spring|april|may)\b/, 'spring')) season = 'spring'

  const rules: [RegExp, Occasion, string][] = [
    [/\b(black tie|gala|tux|formal|funeral|opera)\b/, 'formal', 'formal event'],
    [/\b(wedding|bridal|reception)\b/, 'wedding', 'wedding'],
    [/\b(interview|office|meeting|presentation|conference)\b/, 'work', 'work'],
    [/\b(business casual|networking|client)\b/, 'business-casual', 'business casual'],
    [/\b(date|anniversary|romantic)\b/, 'date-night', 'date'],
    [/\b(rooftop|dinner|restaurant|steakhouse|brunch)\b/, 'dinner', 'dinner'],
    [/\b(club|party|night out|bar|lounge|concert|festival)\b/, 'night-out', 'night out'],
    [/\b(church|service|sunday)\b/, 'church', 'church'],
    [/\b(beach|pool|boat|lake)\b/, 'beach', 'beach'],
    [/\b(vacation|resort|cruise|getaway)\b/, 'vacation', 'vacation'],
    [/\b(flight|airport|road trip|travel)\b/, 'travel', 'travel'],
    [/\b(street|sneakerhead|hype)\b/, 'streetwear', 'streetwear'],
  ]
  for (const [re, occ, label] of rules) {
    if (hit(re, label)) return { occasion: occ, season, matched }
  }
  return { occasion: season === 'winter' ? 'cold-weather' : 'casual', season, matched }
}

// ── Staples catalog (gap-filling + Complete Your Wardrobe) ────────────────

const P = (
  key: string, name: string, category: Category, primaryColor: string, formality: Formality,
  styles: Style[], seasons: Season[], genders: Gender[] = BOTH, pattern: Pattern = 'solid',
): CatalogPiece => ({ key, name, category, primaryColor, formality, styles, seasons, genders, pattern })

export const STAPLES: CatalogPiece[] = [
  P('white-sneakers', 'White Leather Sneakers', 'sneakers', 'white', 2, ['casual', 'minimal', 'streetwear'], ALL),
  P('white-oxford', 'White Oxford Shirt', 'shirt', 'white', 3, ['smart', 'classic'], ALL),
  P('light-blue-shirt', 'Light Blue Button-Down', 'shirt', 'light-blue', 3, ['smart', 'classic'], ALL),
  P('white-tee', 'White Crew T-Shirt', 'tshirt', 'white', 1, ['casual', 'minimal'], ['spring', 'summer', 'fall']),
  P('black-tee', 'Black Crew T-Shirt', 'tshirt', 'black', 1, ['casual', 'minimal', 'streetwear'], ['spring', 'summer', 'fall']),
  P('navy-sweater', 'Navy Crewneck Sweater', 'sweater', 'navy', 3, ['classic', 'smart'], ['fall', 'winter']),
  P('cream-sweater', 'Cream Knit Sweater', 'sweater', 'cream', 2, ['casual', 'classic'], ['fall', 'winter']),
  P('dark-jeans', 'Dark Wash Jeans', 'jeans', 'denim', 2, ['casual', 'smart'], ALL),
  P('black-jeans', 'Black Slim Jeans', 'jeans', 'black', 2, ['casual', 'streetwear', 'minimal'], ALL),
  P('khaki-chinos', 'Khaki Chinos', 'pants', 'khaki', 3, ['smart', 'classic'], ALL, ['men']),
  P('black-trousers', 'Black Tailored Trousers', 'pants', 'black', 4, ['smart', 'minimal'], ALL),
  P('khaki-shorts', 'Khaki Shorts', 'shorts', 'khaki', 1, ['casual'], ['spring', 'summer'], ['men']),
  P('denim-shorts', 'Denim Shorts', 'shorts', 'denim', 1, ['casual'], ['spring', 'summer'], ['women']),
  P('navy-blazer', 'Navy Blazer', 'blazer', 'navy', 4, ['smart', 'classic'], ALL),
  P('camel-coat', 'Camel Overcoat', 'coat', 'camel', 4, ['classic', 'smart'], ['fall', 'winter']),
  P('denim-jacket', 'Denim Jacket', 'jacket', 'denim', 2, ['casual', 'streetwear'], ['spring', 'fall']),
  P('leather-jacket', 'Black Leather Jacket', 'jacket', 'black', 2, ['streetwear', 'casual'], ['spring', 'fall']),
  P('brown-boots', 'Brown Chelsea Boots', 'boots', 'brown', 3, ['casual', 'classic'], ['fall', 'winter', 'spring']),
  P('brown-loafers', 'Brown Leather Loafers', 'shoes', 'brown', 4, ['smart', 'classic'], ALL),
  P('black-dress-shoes', 'Black Oxford Dress Shoes', 'shoes', 'black', 5, ['formal'], ALL, ['men']),
  P('navy-suit', 'Navy Two-Piece Suit', 'suit', 'navy', 5, ['formal', 'classic'], ALL, ['men']),
  P('black-heels', 'Black Pointed Heels', 'heels', 'black', 4, ['smart', 'formal'], ALL, ['women']),
  P('black-flats', 'Black Ballet Flats', 'shoes', 'black', 3, ['classic', 'minimal'], ALL, ['women']),
  P('little-black-dress', 'Little Black Dress', 'dress', 'black', 4, ['classic', 'formal'], ALL, ['women']),
  P('linen-dress', 'White Linen Sundress', 'dress', 'white', 2, ['casual', 'boho'], ['spring', 'summer'], ['women']),
  P('silk-blouse', 'Cream Silk Blouse', 'blouse', 'cream', 3, ['smart', 'classic'], ALL, ['women']),
  P('black-midi-skirt', 'Black Midi Skirt', 'skirt', 'black', 3, ['smart', 'minimal'], ALL, ['women']),
  P('gold-watch', 'Gold Watch', 'watch', 'gold', 3, ['classic', 'smart'], ALL),
  P('silver-watch', 'Silver Watch', 'watch', 'silver', 3, ['classic', 'minimal'], ALL),
  P('brown-belt', 'Brown Leather Belt', 'belt', 'brown', 3, ['classic'], ALL, ['men']),
  P('gold-hoops', 'Gold Hoop Earrings', 'jewelry', 'gold', 3, ['classic', 'minimal'], ALL, ['women']),
  P('tan-tote', 'Tan Leather Tote', 'bag', 'tan', 3, ['classic'], ALL, ['women']),
]

export function staplesFor(gender: Gender): CatalogPiece[] {
  return STAPLES.filter(s => s.genders.includes(gender))
}

// ── Sample wardrobes ──────────────────────────────────────────────────────

type SampleSpec = [name: string, category: Category, primary: string, accents?: string[], pattern?: Pattern]

const MEN_SAMPLE: SampleSpec[] = [
  ['White Oxford Shirt', 'shirt', 'white'],
  ['Light Blue Button-Down', 'shirt', 'light-blue'],
  ['Black Crew Tee', 'tshirt', 'black'],
  ['White Crew Tee', 'tshirt', 'white'],
  ['Cream Cable-Knit Sweater', 'sweater', 'cream', [], 'textured'],
  ['Navy Merino Crewneck', 'sweater', 'navy'],
  ['Olive Chinos', 'pants', 'olive'],
  ['Khaki Chinos', 'pants', 'khaki'],
  ['Black Slim Jeans', 'jeans', 'black'],
  ['Dark Wash Jeans', 'jeans', 'denim'],
  ['Tan Field Jacket', 'jacket', 'tan'],
  ['Navy Blazer', 'blazer', 'navy'],
  ['Camel Overcoat', 'coat', 'camel'],
  ['White Leather Sneakers', 'sneakers', 'white'],
  ['Brown Chelsea Boots', 'boots', 'brown'],
  ['Gold Watch', 'watch', 'gold'],
  ['Brown Leather Belt', 'belt', 'brown'],
]

const WOMEN_SAMPLE: SampleSpec[] = [
  ['White Fitted Tee', 'tshirt', 'white'],
  ['Cream Silk Blouse', 'blouse', 'cream'],
  ['Navy Breton Stripe Top', 'shirt', 'navy', ['white'], 'striped'],
  ['Camel Knit Sweater', 'sweater', 'camel', [], 'textured'],
  ['High-Rise Blue Jeans', 'jeans', 'denim'],
  ['Black Tailored Trousers', 'pants', 'black'],
  ['Cream Wide-Leg Pants', 'pants', 'cream'],
  ['Black Midi Skirt', 'skirt', 'black'],
  ['Little Black Dress', 'dress', 'black'],
  ['Floral Summer Dress', 'dress', 'blush', ['sage'], 'floral'],
  ['Denim Jacket', 'jacket', 'denim'],
  ['Black Blazer', 'blazer', 'black'],
  ['Camel Wrap Coat', 'coat', 'camel'],
  ['White Sneakers', 'sneakers', 'white'],
  ['Black Pointed Heels', 'heels', 'black'],
  ['Brown Ankle Boots', 'boots', 'brown'],
  ['Gold Hoop Earrings', 'jewelry', 'gold'],
  ['Tan Leather Tote', 'bag', 'tan'],
]

export function buildSampleWardrobe(gender: Gender): WardrobeItem[] {
  const specs = gender === 'men' ? MEN_SAMPLE : WOMEN_SAMPLE
  const now = new Date().toISOString()
  return specs.map(([name, category, primary, accents = [], pattern = 'solid'], i) => {
    const cfg = CATEGORY_CONFIG[category]
    return {
      id: `sample-${gender}-${i}`,
      name, category,
      primaryColor: primary,
      accentColors: accents,
      pattern,
      styles: cfg.styles,
      seasons: cfg.seasons,
      formality: cfg.formality,
      favorite: false,
      source: 'sample',
      wearCount: 0,
      createdAt: now,
    }
  })
}

/** Turn a catalog suggestion into a real wardrobe item ("Add to Wardrobe"). */
export function itemFromCatalog(piece: CatalogPiece): WardrobeItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: piece.name,
    category: piece.category,
    primaryColor: piece.primaryColor,
    accentColors: [],
    pattern: piece.pattern,
    styles: piece.styles,
    seasons: piece.seasons,
    formality: piece.formality,
    favorite: false,
    source: 'manual',
    wearCount: 0,
    createdAt: new Date().toISOString(),
  }
}
