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
  { name: 'apple', label: '水果' },
  { name: 'carrot', label: '蔬菜买菜' },
  { name: 'beef', label: '肉类' },
  { name: 'fish', label: '鱼海鲜' },
  { name: 'egg', label: '鸡蛋' },
  { name: 'milk', label: '牛奶' },
  { name: 'sandwich', label: '早餐' },
  { name: 'pizza', label: '外卖' },
  { name: 'cake', label: '甜点' },
  { name: 'beer', label: '酒水' },
  { name: 'cooking-pot', label: '做饭' },
  { name: 'store', label: '商店' },
  { name: 'package', label: '快递' },
  { name: 'refrigerator', label: '家电' },
  { name: 'washing-machine', label: '洗衣' },
  { name: 'sofa', label: '家具' },
  { name: 'bed', label: '寝具' },
  { name: 'key-round', label: '房租' },
  { name: 'droplets', label: '水费' },
  { name: 'flame', label: '燃气' },
  { name: 'plug', label: '电费' },
  { name: 'fuel', label: '加油' },
  { name: 'parking-circle', label: '停车' },
  { name: 'tram-front', label: '地铁' },
  { name: 'car-taxi-front', label: '打车' },
  { name: 'ticket', label: '票券' },
  { name: 'scissors', label: '理发' },
  { name: 'sparkles', label: '美容' },
  { name: 'umbrella', label: '雨具' },
  { name: 'glasses', label: '眼镜' },
  { name: 'watch', label: '手表' },
  { name: 'laptop', label: '电脑' },
  { name: 'headphones', label: '耳机' },
  { name: 'camera', label: '摄影' },
  { name: 'stethoscope', label: '看病' },
  { name: 'hospital', label: '医院' },
  { name: 'smile', label: '牙齿' },
  { name: 'book', label: '书籍' },
  { name: 'pencil', label: '文具' },
  { name: 'palette', label: '绘画' },
  { name: 'flower', label: '花卉' },
  { name: 'tree-pine', label: '户外' },
  { name: 'dog', label: '狗狗' },
  { name: 'cat', label: '猫咪' },
  { name: 'hand-coins', label: '收款' },
  { name: 'banknote', label: '现金' },
  { name: 'credit-card', label: '银行卡' },
  { name: 'landmark', label: '银行' },
  { name: 'receipt', label: '账单' },
  { name: 'circle-help', label: '杂项' },
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
