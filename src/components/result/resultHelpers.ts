// Non-component helpers shared by the analysis-result UI. Kept out of
// ResultSections.tsx so that file exports only components (react-refresh).

import type { CSSProperties } from 'react';
import { tokens } from '../../theme/tokens';

export const sectionStyle: CSSProperties = {
  margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
  padding: 18,
  background: '#FFFFFF',
  borderRadius: tokens.radiusLg,
  border: '1px solid rgba(15,23,42,0.05)',
  boxShadow: '0 1px 3px rgba(15,23,42,0.03), 0 4px 14px -8px rgba(15,23,42,0.06)',
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

// Resolve a feedback descriptor produced by the analyzer:
//   "feedback.perfect|<ref>"            → t('feedback.perfect', { ref })
//   "feedback.imperfect|<ko>|<score>|<note>"
//   plain string → returned as-is
export function resolveFeedback(
  t: (key: string, vars?: Record<string, string | number>) => string,
  descriptor: string,
): string {
  if (!descriptor) return '';
  if (descriptor === 'feedback.retry' || descriptor === 'feedback.discarded') {
    return t(descriptor);
  }
  const [head, ...rest] = descriptor.split('|');
  if (head === 'feedback.perfect') {
    return t('feedback.perfect', { ref: rest[0] ?? '' });
  }
  if (head === 'feedback.imperfect') {
    const [ko = '', score = '0', note = ''] = rest;
    const noteSuffix = note ? interpolate(t('feedback.noteSuffix'), { note }) : '';
    return interpolate(t('feedback.imperfect'), { ko, score, noteSuffix });
  }
  return descriptor;
}
