import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  gradient?: 'primary' | 'purple' | 'pink' | 'indigo';
  className?: string;
}

const GRADS: Record<string, string> = {
  primary: 'bg-gradient-to-br from-primary-500 to-primary-700',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-700',
  pink: 'bg-gradient-to-br from-pink-500 to-rose-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-blue-600',
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
      className={`fixed bottom-20 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-primary-500/30 ${GRADS[gradient]} ${className}`}
    >
      {icon}
    </motion.button>
  );
}
