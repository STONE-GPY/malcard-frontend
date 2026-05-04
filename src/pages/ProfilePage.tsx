import { useState, type ReactNode } from 'react';
import { achievements } from '../data/cards';
import BottomNav from '../components/common/BottomNav';
import { tokens } from '../theme/tokens';
import { IconChevronRight } from '../components/icons';

export default function ProfilePage() {
  const [reminders, setReminders] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [strictMode, setStrict] = useState(false);

  const xp = 2840;
  const xpNext = 3500;
  const level = 8;
  const pct = (xp / xpNext) * 100;

  return (
    <div
      style={{
        minHeight: '100%',
        background: tokens.pageBg,
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: `26px ${tokens.pad}px 22px`,
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
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            А
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
              레벨 {level} · 중급
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
              안나 · Anna
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              러시아어 → 한국어 · 47일째
            </div>
          </div>
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <IconChevronRight size={18} stroke={2.4} />
          </button>
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
            <span>{xp} XP</span>
            <span>다음 레벨까지 {xpNext - xp}</span>
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
          margin: `-18px ${tokens.pad}px 0`,
          padding: 14,
          background: '#FFFFFF',
          borderRadius: tokens.radiusLg,
          border: tokens.border,
          boxShadow: '0 12px 32px -16px rgba(15,23,42,0.18)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {[
          { v: '12', lbl: '연속 일수', icon: '🔥' },
          { v: '186', lbl: '학습 카드' },
          { v: '83', lbl: '평균 점수' },
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

      <SectionLabel>업적 · 3 / 6</SectionLabel>
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
              {a.name}
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
              {a.sub}
            </div>
            {!a.earned && a.progress != null && (
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

      <SectionLabel>설정</SectionLabel>
      <SettingsGroup>
        <SettingRow
          icon="🔔"
          label="매일 알림"
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
        <SettingRow icon="🌐" label="학습 언어" sub="한국어" trailing={<Chev />} />
        <SettingDiv />
        <SettingRow icon="🇷🇺" label="앱 언어" sub="Русский" trailing={<Chev />} />
        <SettingDiv />
        <SettingRow icon="📊" label="목표 점수" sub="평균 85점" trailing={<Chev />} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingRow icon="❓" label="도움말 · 자주 묻는 질문" trailing={<Chev />} />
        <SettingDiv />
        <SettingRow icon="✉️" label="피드백 보내기" trailing={<Chev />} />
        <SettingDiv />
        <SettingRow icon="ℹ️" label="MalCard 정보" sub="v1.4.2" trailing={<Chev />} />
      </SettingsGroup>

      <button
        style={{
          margin: `${tokens.gap + 10}px ${tokens.pad}px 0`,
          padding: '14px 16px',
          borderRadius: tokens.radiusMd,
          background: '#FFFFFF',
          color: '#EF4444',
          border: tokens.border,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        로그아웃
      </button>

      <div
        style={{
          padding: '14px 0 24px',
          textAlign: 'center',
          fontSize: 11,
          color: '#CBD5E1',
        }}
      >
        Made for learners · MalCard
      </div>

      <BottomNav />
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
}: {
  icon: string;
  label: string;
  sub?: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
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
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{sub}</div>}
      </div>
      {trailing}
    </div>
  );
}

function SettingDiv() {
  return <div style={{ height: 1, background: '#F1F5F9', margin: '0 14px 0 62px' }} />;
}

function Chev() {
  return <IconChevronRight size={18} style={{ color: '#CBD5E1' }} />;
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
