export type CategoryType = 'income' | 'expense';

const BUBU_CATEGORY_ART_PICKER_ICONS: Record<CategoryType, readonly string[]> = {
  expense: [
    'utensils-crossed', 'car', 'shopping-bag', 'house', 'gamepad-2', 'heart-pulse',
    'book-open', 'coins', 'smartphone', 'shirt', 'paw-print', 'plane',
  ],
  income: ['wallet', 'briefcase-business', 'trending-up', 'gift', 'more-horizontal'],
};

const BUBU_CATEGORY_ART: Record<CategoryType, Record<string, string>> = {
  expense: {
    'utensils-crossed': 'food-v2',
    car: 'transport-v2',
    'shopping-bag': 'shopping-v2',
    home: 'housing-v2',
    house: 'housing-v2',
    'gamepad-2': 'entertainment-v2',
    'heart-pulse': 'health-v2',
    'book-open': 'education-v2',
    coins: 'savings',
    smartphone: 'communication',
    shirt: 'clothing',
    'paw-print': 'pet',
    plane: 'travel',
  },
  income: {
    wallet: 'income-salary',
    briefcase: 'income-part-time',
    'briefcase-business': 'income-part-time',
    'trending-up': 'income-investment',
    gift: 'income-red-packet',
    'more-horizontal': 'income-other',
  },
};

export function getBubuCategoryArt(type: CategoryType, icon: string): string | undefined {
  const artName = BUBU_CATEGORY_ART[type][icon];
  return artName ? `/themes/bubu/categories/${artName}.png` : undefined;
}

export function isBubuCategoryArtPickerIcon(type: CategoryType, icon: string): boolean {
  return BUBU_CATEGORY_ART_PICKER_ICONS[type].includes(icon);
}
