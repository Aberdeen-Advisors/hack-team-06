/**
 * Conductor UI primitives. Import from '@/components/ui' — not from the individual files.
 * Anything interactive (Tabs, Modal, Toast) is a client component; the rest render on the server.
 */

export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { Card, CardHeader } from './Card';
export type { CardProps } from './Card';

export {
  Badge,
  BandBadge,
  QuadrantBadge,
  StatusBadge,
  BAND_TONE,
  QUADRANT_TONE,
  SUBMISSION_TONE,
} from './Badge';
export type { BadgeProps, BadgeTone } from './Badge';

export { Table, THead, TBody, TR, TH, TD } from './Table';
export type { TableProps } from './Table';

export { Tabs } from './Tabs';
export type { TabItem, TabsProps } from './Tabs';

export { Field, Input, Select, Textarea } from './Field';
export type { FieldProps } from './Field';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { ToastProvider, useToast } from './Toast';
export type { ToastMessage, ToastTone } from './Toast';

export {
  ConfidenceBadge,
  EmptyState,
  LevelPill,
  ScoreDial,
  SectionHeader,
  StatCard,
} from './Feedback';
