import { motion } from 'framer-motion';

export function CardSkeleton() {
  return (
    <div className="glass-card space-y-3 p-4">
      <div className="shimmer-block h-4 w-2/3 rounded" />
      <div className="shimmer-block h-3 w-full rounded" />
      <div className="shimmer-block h-3 w-4/5 rounded" />
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
          className="glass-card flex items-center gap-3 p-3"
        >
          <div className="shimmer-block h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="shimmer-block h-3 w-1/3 rounded" />
            <div className="shimmer-block h-3 w-2/3 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
