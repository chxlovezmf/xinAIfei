import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  gradient?: 'primary' | 'purple' | 'pink' | 'indigo';
  className?: string;
}

const GRADS: Record<string, string> = {
  primary: 'theme-gradient-primary',
  purple: 'theme-gradient-purple',
  pink: 'theme-gradient-pink',
  indigo: 'theme-gradient-indigo',
};

export default function FloatingActionButton({
  icon,
  onClick,
  gradient = 'primary',
  className = '',
}: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      aria-label="新增"
      className={`floating-action-button fixed right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white ${GRADS[gradient]} ${className}`}
    >
      {icon}
    </motion.button>
  );
}
