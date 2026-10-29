import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : undefined}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !busy && onCancel()}
        >
          <motion.div
            initial={reduceMotion ? false : { scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { scale: 0.94, opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 28 }}
            className="modal-surface w-full max-w-sm rounded-2xl border p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            {description && <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>}
            <div className="mt-5 flex gap-2">
              <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="btn-secondary flex-1 py-2.5 text-sm disabled:opacity-50">
                {cancelLabel}
              </button>
              <button type="button" onClick={() => void onConfirm()} disabled={busy} aria-busy={busy} className="flex-1 rounded-full bg-red-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 disabled:cursor-wait disabled:opacity-60">
                {busy ? '处理中…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
