// ============================================
// FOOD IMAGE UTILITY
// Generates food images using LoremFlickr
// ============================================

const FALLBACK_IMAGE = '/fallback-food.svg';

/**
 * Generate a food image URL
 * Uses LoremFlickr for reliable image delivery
 */
export function getFoodImageUrl(foodName: string, size: number = 100): string {
  const query = buildSearchQuery(foodName);
  // LoremFlickr format: https://loremflickr.com/{width}/{height}/{keywords}
  return `https://loremflickr.com/${size}/${size}/${encodeURIComponent(query)}`;
}

/**
 * Build search query optimized for food images
 */
function buildSearchQuery(foodName: string): string {
  const name = foodName.toLowerCase().trim();

  // Map specific foods to better search terms
  const foodMappings: Record<string, string> = {
    'roti': 'flatbread',
    'paratha': 'flatbread',
    'aloo paratha': 'stuffed,flatbread',
    'dal': 'lentil,soup',
    'dal fry': 'lentil,curry',
    'rice + dal': 'rice,lentils',
    'paneer': 'cheese,curry',
    'paneer curry': 'paneer,masala',
    'chole': 'chickpea,curry',
    'rajma': 'kidney,beans',
    'khichdi': 'rice,lentils',
    'poha': 'rice,flakes',
    'upma': 'semolina,breakfast',
    'idli': 'steamed,rice,cake',
    'dosa': 'crepe,indian',
    'samosa': 'samosa,fried',
    'biryani': 'biryani,rice',
    'veg biryani': 'vegetable,biryani',
    'pulao': 'pilaf,rice',
    'pav bhaji': 'bread,curry',
    'lassi': 'yogurt,drink',
    'buttermilk': 'buttermilk',
    'makhana': 'snack,food',
    'namkeen': 'snack,mix',
    'momos': 'dumplings',
    'noodles': 'noodles,asian',
    'fried rice': 'fried,rice',
  };

  // Check for specific mapping
  for (const [key, value] of Object.entries(foodMappings)) {
    if (name.includes(key)) {
      return value;
    }
  }

  // Extract main food word and add "food" tag
  const mainWord = name.split(/[\s()]+/)[0];
  return `${mainWord},food`;
}

/**
 * Get fallback image path
 */
export function getFallbackImage(): string {
  return FALLBACK_IMAGE;
}
