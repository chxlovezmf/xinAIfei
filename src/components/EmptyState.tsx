import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 text-gray-300 dark:text-gray-600">
        {icon || <Inbox size={48} />}
      </div>
      <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
