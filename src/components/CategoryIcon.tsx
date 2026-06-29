import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  color: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ iconName, color, size = 24, className = '' }: CategoryIconProps) {
  // Map our icon names to Lucide component names
  const nameMap: Record<string, string> = {
    'utensils-crossed': 'UtensilsCrossed',
    'gamepad-2': 'Gamepad2',
    'book-open': 'BookOpen',
    'more-horizontal': 'MoreHorizontal',
    'heart-pulse': 'HeartPulse',
    'trending-up': 'TrendingUp',
  };

  const lucideName = nameMap[iconName] || iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-./g, s => s[1].toUpperCase());
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[lucideName] || LucideIcons.Circle;

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
  const nameMap: Record<string, string> = {
    'utensils-crossed': 'UtensilsCrossed',
    'gamepad-2': 'Gamepad2',
    'book-open': 'BookOpen',
    'more-horizontal': 'MoreHorizontal',
    'heart-pulse': 'HeartPulse',
    'trending-up': 'TrendingUp',
  };

  const lucideName = nameMap[iconName] || iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-./g, s => s[1].toUpperCase());
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[lucideName] || LucideIcons.Circle;

  return (
    <div className="flex items-center gap-1.5">
      <Icon size={size} style={{ color }} />
      <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
    </div>
  );
}
