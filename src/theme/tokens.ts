export const tokens = {
  primary: '#6366F1',
  primaryDark: '#8B5CF6',
  primaryDeep: '#A855F7',
  primaryGrad: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%)',
  primaryGradFlat: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  primaryTint: '#EDE9FE',
  primarySoft: 'rgba(99,102,241,0.12)',
  primaryShadow: 'rgba(99,102,241,0.55)',
  primaryShadowSoft: 'rgba(99,102,241,0.18)',
  bgGrad: 'linear-gradient(180deg, #F5F3FF 0%, #FAFAFC 40%)',
  pageBg: '#FAFAFC',
  emojiBgGrad: 'linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)',
  chipText: '#475569',
  streakA: '#FEF3C7',
  streakB: '#FDE68A',
  streakText: '#B45309',

  deckGrads: [
    'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%)',
    'linear-gradient(135deg, #FB923C 0%, #F97316 55%, #EA580C 100%)',
    'linear-gradient(135deg, #14B8A6 0%, #0D9488 55%, #0F766E 100%)',
    'linear-gradient(135deg, #EC4899 0%, #DB2777 55%, #BE185D 100%)',
  ],
  deckAccents: ['#6366F1', '#F97316', '#14B8A6', '#EC4899'],

  pad: 14,
  gap: 8,
  emojiBig: 72,
  emojiBigFs: 40,
  korean: 30,
  fab: 64,
  cardPad: 12,
  listGap: 8,

  radiusXl: 28,
  radiusLg: 22,
  radiusMd: 18,
  radiusSm: 14,
  shadowSm: '0 1px 3px rgba(15,23,42,0.03), 0 4px 14px -8px rgba(15,23,42,0.06)',
  border: '1px solid rgba(15,23,42,0.05)',
} as const;

export type Tokens = typeof tokens;
