import { useLocation, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import { IconHome, IconClock, IconUser } from '../icons';
import { tokens } from '../../theme/tokens';

interface IconCmpProps {
  size?: number;
  stroke?: number;
}

interface Tab {
  path: string;
  label: string;
  Icon: ComponentType<IconCmpProps>;
}

const tabs: Tab[] = [
  { path: '/', label: '홈', Icon: IconHome },
  { path: '/history', label: '기록', Icon: IconClock },
  { path: '/profile', label: '프로필', Icon: IconUser },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        marginTop: 'auto',
        padding: '10px 24px 30px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(15,23,42,0.06)',
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 30,
      }}
    >
      {tabs.map(({ path, label, Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '4px 12px',
              color: active ? tokens.primary : '#94A3B8',
            }}
          >
            <Icon size={24} stroke={active ? 2.4 : 2} />
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                letterSpacing: -0.1,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
