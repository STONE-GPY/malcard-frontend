interface LevelMeterProps {
  level: number;
  bars?: number;
  active?: boolean;
}

export default function LevelMeter({ level, bars = 24, active = true }: LevelMeterProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
      }}
    >
      {Array.from({ length: bars }, (_, i) => {
        const center = (bars - 1) / 2;
        const distance = Math.abs(i - center) / center;
        const peak = Math.max(0, level * (1 - distance * 0.4));
        const h = 4 + peak * 28;
        return (
          <div
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 2,
              background: active ? 'var(--color-primary)' : 'var(--color-muted)',
              opacity: active ? 0.55 + peak * 0.45 : 0.6,
              transition: 'height 80ms linear, opacity 80ms linear',
            }}
          />
        );
      })}
    </div>
  );
}
