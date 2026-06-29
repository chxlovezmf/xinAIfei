import { motion } from 'framer-motion';

export function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800"
        >
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
