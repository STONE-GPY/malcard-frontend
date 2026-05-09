import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistoryStore, type DailyGoalType } from '../stores/useHistoryStore';
import BottomNav from '../components/common/BottomNav';
import { tokens } from '../theme/tokens';
import {
  achievementStates,
  averageBestScore,
  streakDays,
  totalUniqueCardsLearned,
} from '../lib/stats';
import i18n, { saveLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

const APP_VERSION = '1.0.0-mvp';

export default function ProfilePage() {
  const { t, i18n: i18nInst } = useTranslation();
  const history = useHistoryStore((s) => s.history);
  const goal = useHistoryStore((s) => s.goal);
  const setGoal = useHistoryStore((s) => s.setGoal);

  const [reminders, setReminders] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [strictMode, setStrict] = useState(false);

  const [openModal, setOpenModal] = useState<null | 'language' | 'goal' | 'help' | 'feedback' | 'about'>(null);

  const streak = useMemo(() => streakDays(history), [history]);
  const learned = useMemo(() => totalUniqueCardsLearned(history), [history]);
  const avg = useMemo(() => averageBestScore(history), [history]);
  const achievements = useMemo(
    () => achievementStates(history, streak),
    [history, streak],
  );
  const earnedCount = achievements.filter((a) => a.earned).length;

  // Level: simple derivation (each 10 unique cards levels up)
  const level = Math.max(1, Math.floor(learned / 10) + 1);
  const xp = learned * 30 + avg * 2;
  const xpForLevel = (lvl: number) => lvl * 350;
  const xpNext = xpForLevel(level);
  const pct = Math.min(100, Math.max(0, (xp / xpNext) * 100));

  const currentLang = (i18nInst.language as SupportedLanguage) ?? 'ko';

  const handleChangeLang = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    saveLanguage(lang);
    setOpenModal(null);
  };

  const goalLabel =
    goal.type === 'cardCount'
      ? t('profile.goalCount', { n: goal.target })
      : t('profile.goalAvg', { n: goal.target });

  const langLabel =
    currentLang === 'ko' ? t('language.ko') : currentLang === 'en' ? t('language.en') : t('language.ru');

  return (
    <div
      data-testid="profile-page"
      style={{
        // Outer is a flex column with TWO children: a scrollable content area
        // (flex:1, minHeight:0, overflowY:auto) and the fixed-height BottomNav.
        // We can't put overflow:auto on the outer + flex column directly:
        // flex children default to flex-shrink:1, so a long settings group
        // would be squashed instead of overflowing into a scrollbar.
        // Putting overflow on a flex:1 child with minHeight:0 is the textbook
        // workaround — content scrolls naturally, BottomNav stays pinned.
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
          padding: `28px ${tokens.pad}px 26px`,
          background: tokens.primaryGrad,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          borderBottomLeftRadius: tokens.radiusXl,
          borderBottomRightRadius: tokens.radiusXl,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.13)',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: -20,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.primaryDark,
              fontSize: 26,
              fontWeight: 800,
              // letterSpacing: -1 was crushing the bottom jamo (ㄱ받침) of '학'
              // into invisibility — render at natural width with Noto Sans KR.
              letterSpacing: 0,
              fontFamily: '"Noto Sans KR", system-ui, sans-serif',
              lineHeight: 1.2,
              paddingBottom: 2,
              flexShrink: 0,
            }}
          >
            {currentLang === 'ru' ? 'У' : currentLang === 'en' ? 'L' : '학'}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.4,
                opacity: 0.85,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {t('profile.levelLabel', { level })} · {t('profile.levelTier')}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: -0.4,
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {t('profile.name')}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{t('profile.daysLine')}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 6,
              opacity: 0.95,
            }}
          >
            <span>{Math.round(xp)} XP</span>
            <span>· {Math.max(0, Math.round(xpNext - xp))} XP</span>
          </div>
          <div
            style={{
              height: 8,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 999,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          // Previously this card overlapped the header with margin-top: -18px,
          // which hid the XP progress bar above. Sit cleanly below the header
          // instead so both the XP bar and the stats are fully visible.
          margin: `${tokens.gap + 8}px ${tokens.pad}px 0`,
          padding: 14,
          background: '#FFFFFF',
          borderRadius: tokens.radiusLg,
          border: tokens.border,
          boxShadow: tokens.shadowSm,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {[
          { v: String(streak), lbl: t('profile.streakDays'), icon: '🔥' },
          { v: String(learned), lbl: t('profile.learnedCards') },
          { v: String(avg), lbl: t('profile.avgScore') },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '0 4px',
              borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.icon && <span style={{ marginRight: 4 }}>{s.icon}</span>}
              {s.v}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: '#64748B',
                fontWeight: 600,
                marginTop: 2,
                letterSpacing: 0.2,
              }}
            >
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>
        {t('profile.achievementsHeader', { earned: earnedCount, total: achievements.length })}
      </SectionLabel>
      <div
        style={{
          padding: `0 ${tokens.pad}px`,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {achievements.map((a) => (
          <div
            key={a.id}
            style={{
              minHeight: 116,
              padding: '12px 8px 10px',
              background: a.earned ? '#FFFFFF' : 'rgba(241,245,249,0.5)',
              borderRadius: tokens.radiusMd,
              border: tokens.border,
              boxShadow: a.earned ? tokens.shadowSm : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              opacity: a.earned ? 1 : 0.7,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 26,
                lineHeight: 1,
                marginBottom: 2,
                filter: a.earned ? 'none' : 'grayscale(0.7)',
              }}
            >
              {a.emoji}
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: -0.3,
                textAlign: 'center',
                lineHeight: 1.2,
                wordBreak: 'keep-all',
              }}
            >
              {t(a.nameKey)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#94A3B8',
                fontWeight: 500,
                textAlign: 'center',
                wordBreak: 'keep-all',
              }}
            >
              {t(a.subKey)}
            </div>
            {!a.earned && (
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 8,
                  height: 3,
                  background: '#E2E8F0',
                  borderRadius: 999,
                }}
              >
                <div
                  style={{
                    width: `${a.progress * 100}%`,
                    height: '100%',
                    background: tokens.primary,
                    borderRadius: 999,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionLabel>{t('profile.settings')}</SectionLabel>
      <SettingsGroup>
        <SettingRow
          icon="🔔"
          label="알림"
          sub="저녁 9시"
          trailing={<Toggle on={reminders} onChange={() => setReminders(!reminders)} />}
        />
        <SettingDiv />
        <SettingRow
          icon="🔊"
          label="자동 재생"
          sub="카드 펼칠 때 듣기"
          trailing={<Toggle on={autoplay} onChange={() => setAutoplay(!autoplay)} />}
        />
        <SettingDiv />
        <SettingRow
          icon="🎯"
          label="엄격 모드"
          sub="발음 기준 높임"
          trailing={<Toggle on={strictMode} onChange={() => setStrict(!strictMode)} />}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingRow
          icon="🌐"
          label={t('profile.appLanguage')}
          sub={langLabel}
          onClick={() => setOpenModal('language')}
          trailing={<TriangleArrow />}
        />
        <SettingDiv />
        <SettingRow
          icon="📊"
          label={t('profile.dailyGoal')}
          sub={goalLabel}
          onClick={() => setOpenModal('goal')}
          trailing={<TriangleArrow />}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingRow
          icon="❓"
          label={t('profile.help')}
          onClick={() => setOpenModal('help')}
          trailing={<TriangleArrow />}
        />
        <SettingDiv />
        <SettingRow
          icon="✉️"
          label={t('profile.feedback')}
          onClick={() => setOpenModal('feedback')}
          trailing={<TriangleArrow />}
        />
        <SettingDiv />
        <SettingRow
          icon="ℹ️"
          label={t('profile.about')}
          sub={t('profile.version', { v: APP_VERSION })}
          onClick={() => setOpenModal('about')}
          trailing={<TriangleArrow />}
        />
      </SettingsGroup>

        <div
          style={{
            padding: '20px 0 24px',
            textAlign: 'center',
            fontSize: 11,
            color: '#CBD5E1',
          }}
        >
          {t('profile.footer')}
        </div>
      </div>

      <BottomNav />

      {openModal === 'language' && (
        <LanguageModal current={currentLang} onPick={handleChangeLang} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'goal' && (
        <GoalModal
          initial={goal}
          onSave={(g) => {
            setGoal(g);
            setOpenModal(null);
          }}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'help' && (
        <SimpleModal title={t('help.title')} body={t('help.body')} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'feedback' && <FeedbackModal onClose={() => setOpenModal(null)} />}
      {openModal === 'about' && (
        <SimpleModal
          title={t('about.title')}
          body={`${t('about.body')}\n\n${t('about.versionLine', { v: APP_VERSION })}`}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: '#94A3B8',
        padding: `0 ${tokens.pad}px`,
        marginTop: 18,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        margin: `${tokens.gap + 6}px ${tokens.pad}px 0`,
        padding: 4,
        background: '#FFFFFF',
        borderRadius: tokens.radiusLg,
        border: tokens.border,
        boxShadow: tokens.shadowSm,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  sub,
  trailing,
  onClick,
}: {
  icon: string;
  label: string;
  sub?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const Component: 'button' | 'div' = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        // Button defaults (font, line-height, box-sizing) differ from div and
        // were squashing the row vertically so the sub label visually merged
        // into the next row. Pin every metric so button and div render the same.
        font: 'inherit',
        color: 'inherit',
        lineHeight: 1.4,
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: tokens.primarySoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: -0.2,
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#0F172A',
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: '#64748B',
              marginTop: 2,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {trailing}
    </Component>
  );
}

function SettingDiv() {
  return <div style={{ height: 1, background: '#F1F5F9', margin: '0 14px 0 62px' }} />;
}

function TriangleArrow() {
  return (
    <span style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 700 }}>›</span>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        background: on ? tokens.primaryGradFlat : '#E2E8F0',
        position: 'relative',
        transition: 'background 0.2s',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      data-testid="modal"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 390,
          background: '#fff',
          borderTopLeftRadius: tokens.radiusXl,
          borderTopRightRadius: tokens.radiusXl,
          padding: 22,
          paddingBottom: 32,
          animation: 'mc-fade-up 0.25s both',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, marginBottom: 12 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function LanguageModal({
  current,
  onPick,
  onClose,
}: {
  current: SupportedLanguage;
  onPick: (lang: SupportedLanguage) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ModalShell title={t('language.title')} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang === current;
          return (
            <button
              key={lang}
              onClick={() => onPick(lang)}
              data-testid={`lang-${lang}`}
              style={{
                padding: '14px 16px',
                borderRadius: tokens.radiusMd,
                border: active ? `2px solid ${tokens.primary}` : '1px solid #E2E8F0',
                background: active ? tokens.primarySoft : '#fff',
                color: '#0F172A',
                textAlign: 'left',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {t(`language.${lang}`)}
              {active && <span style={{ float: 'right', color: tokens.primary }}>✓</span>}
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

function GoalModal({
  initial,
  onSave,
  onClose,
}: {
  initial: { type: DailyGoalType; target: number };
  onSave: (g: { type: DailyGoalType; target: number }) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<DailyGoalType>(initial.type);
  const [target, setTarget] = useState<number>(initial.target);

  const min = type === 'cardCount' ? 1 : 50;
  const max = type === 'cardCount' ? 30 : 100;

  return (
    <ModalShell title={t('goal.title')} onClose={onClose}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>{t('goal.description')}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {t('goal.typeLabel')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['cardCount', 'avgScore'] as DailyGoalType[]).map((opt) => {
          const active = type === opt;
          return (
            <button
              key={opt}
              onClick={() => {
                setType(opt);
                setTarget(opt === 'cardCount' ? 5 : 80);
              }}
              data-testid={`goal-type-${opt}`}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 999,
                border: active ? 'none' : '1px solid #E2E8F0',
                background: active ? tokens.primaryGradFlat : '#fff',
                color: active ? '#fff' : '#0F172A',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {opt === 'cardCount' ? t('goal.typeCount') : t('goal.typeAvg')}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {t('goal.targetLabel')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={type === 'cardCount' ? 1 : 5}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          data-testid="goal-target"
          style={{ flex: 1 }}
        />
        <div style={{ width: 64, textAlign: 'right', fontWeight: 700, fontSize: 18 }}>{target}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: tokens.radiusMd,
            background: '#fff',
            border: '1px solid #E2E8F0',
            color: '#0F172A',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {t('goal.cancel')}
        </button>
        <button
          onClick={() => onSave({ type, target })}
          data-testid="goal-save"
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: tokens.radiusMd,
            background: tokens.primaryGrad,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {t('goal.save')}
        </button>
      </div>
    </ModalShell>
  );
}

function SimpleModal({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <ModalShell title={title} onClose={onClose}>
      <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 18 }}>
        {body}
      </div>
      <button
        onClick={onClose}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: tokens.radiusMd,
          background: tokens.primaryGrad,
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {t('help.close')}
      </button>
    </ModalShell>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');

  const submit = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent('[MalCard] Feedback');
    const body = encodeURIComponent(`${message}\n\n---\nContact: ${contact}`);
    window.location.href = `mailto:feedback@malcard.app?subject=${subject}&body=${body}`;
    onClose();
  };

  return (
    <ModalShell title={t('feedbackForm.title')} onClose={onClose}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>{t('feedbackForm.body')}</div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
        {t('feedbackForm.contactLabel')}
      </label>
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="example@mail.com"
        style={{
          width: '100%',
          padding: 10,
          marginTop: 4,
          marginBottom: 12,
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          fontSize: 14,
          fontFamily: 'inherit',
        }}
      />
      <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
        {t('feedbackForm.messageLabel')}
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        style={{
          width: '100%',
          padding: 10,
          marginTop: 4,
          marginBottom: 12,
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: tokens.radiusMd,
            background: '#fff',
            border: '1px solid #E2E8F0',
            color: '#0F172A',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {t('feedbackForm.cancel')}
        </button>
        <button
          onClick={submit}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: tokens.radiusMd,
            background: tokens.primaryGrad,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {t('feedbackForm.submit')}
        </button>
      </div>
    </ModalShell>
  );
}
