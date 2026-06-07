import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, Tooltip, YAxis, BarChart, Bar } from 'recharts';
import { useCardStore } from '../stores/useCardStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { tokens } from '../theme/tokens';
import { IconAlert, IconArrowRight, IconRotate, IconX } from '../components/icons';
import {
  ScoreCard,
  PhonemeSection,
  IssuesSection,
  ProsodySection,
  FeedbackBubble,
} from '../components/result/ResultSections';
import { sectionStyle, resolveFeedback } from '../components/result/resultHelpers';
import { errorI18nKey } from '../api/client';
import { dailyProgress, recentAttempts } from '../lib/stats';

export default function ResultPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    analysisResult,
    analysisError,
    currentCard,
    nextCard,
    setAudioBlob,
    setAnalysisResult,
    setAnalysisError,
  } = useCardStore();
  const recordAttempt = useHistoryStore((s) => s.recordAttempt);
  const history = useHistoryStore((s) => s.history);
  const goal = useHistoryStore((s) => s.goal);
  const lastSeenGoalDate = useHistoryStore((s) => s.lastSeenGoalDate);
  const markGoalSeenToday = useHistoryStore((s) => s.markGoalSeenToday);
  const recordedRef = useRef(false);
  const navigatedToCompleteRef = useRef(false);
  // Set when retry/next intentionally navigate to /learn. Those handlers clear
  // analysisResult, which would otherwise re-trigger the guard below and bounce
  // the user to '/' before the /learn route commits.
  const leavingRef = useRef(false);

  useEffect(() => {
    if (leavingRef.current) return;
    if (!analysisError && (!analysisResult || !currentCard)) {
      navigate('/', { replace: true });
      return;
    }
    if (recordedRef.current) return;
    if (analysisResult && currentCard && analysisResult.status === 'ready') {
      recordedRef.current = true;
      recordAttempt({
        cardId: currentCard.id,
        score: analysisResult.score,
        korean: currentCard.korean,
        type: currentCard.type,
      });
    }
  }, [analysisResult, analysisError, currentCard, recordAttempt, navigate]);

  const today = new Date();
  const todayKeyStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const progress = dailyProgress(history, goal, today);

  // After recordAttempt fires, jump to /daily-complete the first time today's goal is achieved.
  useEffect(() => {
    if (!recordedRef.current) return;
    if (!analysisResult || analysisResult.status !== 'ready') return;
    if (navigatedToCompleteRef.current) return;
    if (progress.achieved && lastSeenGoalDate !== todayKeyStr) {
      navigatedToCompleteRef.current = true;
      markGoalSeenToday();
      navigate('/daily-complete', { replace: false });
    }
  }, [progress.achieved, lastSeenGoalDate, todayKeyStr, analysisResult, markGoalSeenToday, navigate]);

  if (!currentCard && !analysisError) return null;

  const handleRetry = () => {
    leavingRef.current = true;
    setAudioBlob(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    navigate('/learn');
  };
  const handleNext = () => {
    leavingRef.current = true;
    setAnalysisError(null);
    nextCard();
    navigate('/learn');
  };
  const handleClose = () => {
    setAnalysisError(null);
    navigate('/');
  };

  // Error path
  if (analysisError) {
    return (
      <PageShell
        title={t('result.title')}
        onClose={handleClose}
        actions={<ActionsBar onRetry={handleRetry} onNext={handleNext} />}
      >
        <div
          data-testid="result-error"
          style={{
            margin: `12px ${tokens.pad}px 0`,
            padding: 20,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: tokens.radiusLg,
            color: '#991B1B',
            animation: 'mc-fade-up 0.4s both',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {t('result.errorTitle')}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            {t(errorI18nKey(analysisError.code))}
          </div>
          <div style={{ fontSize: 11, marginTop: 8, opacity: 0.6 }}>
            {t('result.errorCode', { code: analysisError.code })}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!analysisResult || !currentCard) return null;

  const r = analysisResult;

  // retry / discarded
  if (r.status === 'retry' || r.status === 'discarded') {
    const isRetry = r.status === 'retry';
    return (
      <PageShell
        title={t('result.title')}
        onClose={handleClose}
        actions={<ActionsBar onRetry={handleRetry} onNext={handleNext} />}
      >
        <div
          data-testid={isRetry ? 'retry-banner' : 'discarded-banner'}
          style={{
            margin: `12px ${tokens.pad}px 0`,
            padding: 20,
            background: isRetry ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${isRetry ? '#FDE68A' : '#FECACA'}`,
            borderRadius: tokens.radiusLg,
            color: isRetry ? '#B45309' : '#991B1B',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            animation: 'mc-fade-up 0.4s both',
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <IconAlert size={22} stroke={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {isRetry ? t('result.retryBannerTitle') : t('result.discardedBannerTitle')}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {isRetry ? t('result.retryBannerBody') : t('result.discardedBannerBody')}
            </div>
            {r.statusMessage && (
              <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
                {t('result.detail')}: {r.statusMessage}
              </div>
            )}
          </div>
        </div>
        <FeedbackBubble text={resolveFeedback(t, r.aiFeedback)} />
      </PageShell>
    );
  }

  // ready
  const attempts = recentAttempts(history, String(currentCard.id));

  return (
    <PageShell
      title={t('result.title')}
      onClose={handleClose}
      actions={<ActionsBar onRetry={handleRetry} onNext={handleNext} />}
    >
      <ScoreCard result={r} reference={currentCard.korean} />

      {/* Daily progress mini bar */}
      <div
        style={{
          margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
          padding: '12px 14px',
          background: '#FFFFFF',
          borderRadius: tokens.radiusMd,
          border: tokens.border,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: tokens.shadowSm,
        }}
        data-testid="daily-progress"
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: '#94A3B8',
            }}
          >
            {t('result.todayProgressLabel')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {progress.current} / {progress.target}{' '}
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
              ({goal.type === 'cardCount' ? t('goal.typeCount') : t('goal.typeAvg')})
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 6,
              background: tokens.primarySoft,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.ratio * 100}%`,
                height: '100%',
                background: tokens.primaryGradFlat,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
        {progress.achieved && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#10B981',
              background: '#ECFDF5',
              padding: '4px 8px',
              borderRadius: 999,
            }}
          >
            ✓
          </div>
        )}
      </div>

      <PhonemeSection result={r} />

      <IssuesSection result={r} />

      <ProsodySection result={r} />

      {/* Score history mini chart */}
      <div style={sectionStyle} data-testid="history-mini">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>
            {t('result.historyTitle')}
          </div>
        </div>
        {attempts.length <= 1 ? (
          <div style={{ fontSize: 13, color: '#94A3B8' }}>{t('result.historyEmpty')}</div>
        ) : (
          <div style={{ height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attempts.slice(-10).map((a, i) => ({ i: i + 1, score: a.score }))}
                margin={{ top: 4, right: 4, left: -32, bottom: 0 }}
              >
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    background: '#0F172A',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#A5B4FC' }}
                />
                <Bar dataKey="score" fill={tokens.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <FeedbackBubble text={resolveFeedback(t, r.aiFeedback)} />
    </PageShell>
  );
}

function PageShell({
  title,
  onClose,
  actions,
  children,
}: {
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="result-page"
      style={{
        // Outer is flex column; the middle wrapper owns the scroll.
        // Actions bar (if any) sits OUTSIDE the scroll wrapper so it is always
        // pinned to the bottom of the page (no need for sticky/marginTop:auto
        // tricks). Putting overflow:auto on the same element as flex column
        // would shrink children instead of scrolling — see ProfilePage fix.
        height: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
      <div
        style={{
          padding: `26px ${tokens.pad}px 14px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: 40 }} />
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
        <button
          onClick={onClose}
          aria-label={t('result.closeAria')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <IconX size={20} />
        </button>
      </div>
      {children}
      </div>
      {actions}
    </div>
  );
}

function ActionsBar({ onRetry, onNext }: { onRetry: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        marginTop: 20,
        padding: '14px 20px 30px',
        background: 'rgba(250,250,252,0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(15,23,42,0.06)',
        display: 'flex',
        gap: 10,
        zIndex: 20,
      }}
    >
      <button
        onClick={onRetry}
        style={{
          flex: 1,
          padding: '14px 16px',
          borderRadius: tokens.radiusMd,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        }}
      >
        <IconRotate size={18} stroke={2.2} /> {t('result.actionRetry')}
      </button>
      <button
        onClick={onNext}
        style={{
          flex: 1,
          padding: '14px 16px',
          borderRadius: tokens.radiusMd,
          background: tokens.primaryGrad,
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          boxShadow: `0 8px 18px -6px ${tokens.primaryShadow}`,
        }}
      >
        {t('result.actionNext')} <IconArrowRight size={18} stroke={2.4} />
      </button>
    </div>
  );
}
