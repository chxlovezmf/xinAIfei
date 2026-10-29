import { motion, useReducedMotion } from 'framer-motion';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  illustration?: string;
  illustrationAlt?: string;
}

export default function EmptyState({ icon, title, description, action, illustration, illustrationAlt = '' }: EmptyStateProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : undefined}
      className="flex flex-col items-center justify-center py-16 text-center"
      role="status"
      aria-live="polite"
    >
      {illustration ? (
        <img src={illustration} alt={illustrationAlt} decoding="async" className="mb-3 h-44 w-44 object-contain" />
      ) : (
        <div className="mb-4 flex h-20 w-20 animate-float items-center justify-center rounded-full grad-card grad-primary text-white shadow-lg shadow-primary-500/30"
          style={{ animationDuration: '6s' }}>
          {icon || <Inbox size={40} />}
        </div>
      )}
      <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
