import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  color: string;
  size?: number;
  className?: string;
}

export const CATEGORY_ICON_OPTIONS = [
  { name: 'utensils-crossed', label: '餐饮' },
  { name: 'coffee', label: '饮品' },
  { name: 'car', label: '汽车' },
  { name: 'bus', label: '公交' },
  { name: 'train-front', label: '火车' },
  { name: 'bike', label: '骑行' },
  { name: 'shopping-bag', label: '购物' },
  { name: 'shopping-cart', label: '日用' },
  { name: 'house', label: '住房' },
  { name: 'lightbulb', label: '水电' },
  { name: 'smartphone', label: '通讯' },
  { name: 'wifi', label: '网络' },
  { name: 'heart-pulse', label: '医疗' },
  { name: 'pill', label: '药品' },
  { name: 'gamepad-2', label: '娱乐' },
  { name: 'drama', label: '演出' },
  { name: 'book-open', label: '教育' },
  { name: 'graduation-cap', label: '学习' },
  { name: 'wallet', label: '工资' },
  { name: 'briefcase-business', label: '工作' },
  { name: 'trending-up', label: '投资' },
  { name: 'gift', label: '红包' },
  { name: 'shirt', label: '衣物' },
  { name: 'paw-print', label: '宠物' },
  { name: 'plane', label: '旅行' },
  { name: 'hotel', label: '住宿' },
  { name: 'baby', label: '母婴' },
  { name: 'dumbbell', label: '运动' },
  { name: 'music', label: '音乐' },
  { name: 'film', label: '影视' },
  { name: 'coins', label: '储蓄' },
  { name: 'more-horizontal', label: '其他' },
] as const;

const nameMap: Record<string, string> = {
    'utensils-crossed': 'UtensilsCrossed',
    'gamepad-2': 'Gamepad2',
    'book-open': 'BookOpen',
    'more-horizontal': 'MoreHorizontal',
    'heart-pulse': 'HeartPulse',
    'trending-up': 'TrendingUp',
    'car': 'Car',
    'shopping-bag': 'ShoppingBag',
    'home': 'Home',
    'smartphone': 'Smartphone',
    'wallet': 'Wallet',
    'briefcase': 'Briefcase',
    'gift': 'Gift',
    'circle': 'Circle',
    'box': 'Box',
    'tag': 'Tag',
    'star': 'Star',
    'heart': 'Heart',
    'zap': 'Zap',
    'flag': 'Flag',
};

function resolveIcon(iconName: string) {
  const lucideName = nameMap[iconName] || iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-./g, s => s[1].toUpperCase());
  return (LucideIcons as unknown as Record<string, LucideIcon>)[lucideName] || LucideIcons.Circle;
}

export default function CategoryIcon({ iconName, color, size = 24, className = '' }: CategoryIconProps) {
  const Icon = resolveIcon(iconName);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl ${className}`}
      style={{ backgroundColor: color + '20', color }}
    >
      <Icon size={size} />
    </div>
  );
}

export function CategoryBadge({ iconName, color, name, size = 18 }: CategoryIconProps & { name: string }) {
  const Icon = resolveIcon(iconName);

  return (
    <div className="flex items-center gap-1.5">
      <Icon size={size} style={{ color }} />
      <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
    </div>
  );
}
