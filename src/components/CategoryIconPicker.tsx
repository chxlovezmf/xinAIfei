import CategoryIcon, { CATEGORY_ICON_OPTIONS } from './CategoryIcon';
import { getBubuCategoryArt, isBubuCategoryArtPickerIcon, type CategoryType } from '../utils/categoryArt';

interface CategoryIconPickerProps {
  value: string;
  color: string;
  type: CategoryType;
  showBubuArt: boolean;
  onChange: (iconName: string) => void;
}

export default function CategoryIconPicker({ value, color, type, showBubuArt, onChange }: CategoryIconPickerProps) {
  return (
    <div className="mt-2 grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6">
      {CATEGORY_ICON_OPTIONS.map(({ name, label }) => {
        const artPath = showBubuArt && isBubuCategoryArtPickerIcon(type, name)
          ? getBubuCategoryArt(type, name)
          : undefined;
        return (
          <button
            key={name}
            type="button"
            aria-label={`选择${label}图标`}
            aria-pressed={value === name}
            onClick={() => onChange(name)}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border p-1 transition-colors ${
              value === name
                ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-300 dark:bg-primary-900/30'
                : 'border-transparent bg-gray-50 hover:border-gray-200 dark:bg-gray-800 dark:hover:border-gray-600'
            }`}
            title={label}
          >
            {artPath ? (
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg" style={{ backgroundColor: `${color}20` }}>
                <img src={artPath} alt="" className="h-full w-full object-contain" />
              </span>
            ) : (
              <CategoryIcon iconName={name} color={color} size={18} className="h-8 w-8 rounded-lg" />
            )}
            <span className="w-full truncate text-center text-[10px] leading-tight text-gray-600 dark:text-gray-300">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
