import { cn } from '@/lib/utils';
import { UploadIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { RefObject } from 'react';

export function MediaDropZone({
  dropZoneRef,
  isDraggingOverDropZone,
  label,
  shouldReduceMotion,
}: {
  dropZoneRef: RefObject<HTMLDivElement | null>;
  isDraggingOverDropZone: boolean;
  label: string;
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.div
      key="media-drop-zone"
      initial={
        shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985, y: 8 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985, y: 8 }
      }
      transition={{
        duration: shouldReduceMotion ? 0 : 0.18,
        ease: 'easeOut',
      }}
      className="w-full bg-transparent px-4 pb-3"
    >
      <div
        ref={dropZoneRef}
        aria-live="polite"
        className={cn(
          'flex h-30 items-center justify-center gap-2.5 rounded-2xl border border-dashed border-brand/60 px-4 text-brand shadow-sm transition-colors duration-150',
          isDraggingOverDropZone ? 'bg-brand/10' : 'bg-muted/40',
        )}
      >
        <UploadIcon className="size-6" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </motion.div>
  );
}
