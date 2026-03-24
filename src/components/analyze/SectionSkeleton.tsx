import { forwardRef } from 'react';

const SectionSkeleton = forwardRef<HTMLDivElement, { label?: string }>(({ label }, ref) => {
  return (
    <div ref={ref} style={{ padding: '48px 0' }}>
      {label && (
        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: 'var(--text-muted)',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          {label}
        </p>
      )}
      <div className="flex flex-col items-center gap-4">
        {[260, 180, 220].map((w, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: 14,
              width: w,
              maxWidth: '100%',
              borderRadius: 6,
              backgroundColor: 'var(--divider)',
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
        <div
          className="animate-pulse"
          style={{
            height: 120,
            width: '100%',
            borderRadius: 12,
            backgroundColor: 'var(--surface-input)',
            marginTop: 16,
            animationDelay: '450ms',
          }}
        />
      </div>
    </div>
  );
});

SectionSkeleton.displayName = 'SectionSkeleton';

export default SectionSkeleton;
