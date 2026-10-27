import type { CSSProperties } from 'react';
import type { Storyboard } from '@aivideos/contracts';
import { interpolate, useCurrentFrame } from 'remotion';

type Scene = Storyboard['scenes'][number];
type Brand = Storyboard['brand'];

export interface TemplateProps {
  scene: Scene;
  brand: Brand;
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 94,
  lineHeight: 1.12,
  letterSpacing: '-0.045em',
  fontWeight: 600,
  overflowWrap: 'anywhere',
};

function entrance(frame: number, delay = 0) {
  return {
    opacity: interpolate(frame, [delay, delay + 14], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    transform: `translateY(${interpolate(frame, [delay, delay + 18], [24, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })}px)`,
  };
}

export function Title({ scene, brand }: TemplateProps) {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...entrance(frame), display: 'flex', flexDirection: 'column', gap: 52 }}>
      <div
        style={{
          width: 112,
          height: 112,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 32,
          color: '#ffffff',
          backgroundColor: brand.primaryColor,
          fontSize: 66,
        }}
      >
        ↗
      </div>
      <div data-layout-text data-text style={{ ...titleStyle, fontSize: 110 }}>
        {scene.onScreenTitle}
      </div>
      <div
        style={{ width: 140, height: 10, borderRadius: 10, backgroundColor: brand.primaryColor }}
      />
    </div>
  );
}

export function Process({ scene, brand }: TemplateProps) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      <div
        data-layout-text
        data-text
        style={{
          ...titleStyle,
          fontSize: scene.onScreenTitle.length > 40 ? 76 : 94,
          ...entrance(frame),
        }}
      >
        {scene.onScreenTitle}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {scene.visualItems.map((item, index) => {
          const active = index === scene.highlightIndex;
          return (
            <div key={index} style={entrance(frame, 7 + index * 4)}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                  minHeight: 182,
                  padding: '32px 34px',
                  borderRadius: 26,
                  border: `3px solid ${active ? brand.primaryColor : `${brand.textColor}24`}`,
                  backgroundColor: active ? brand.primaryColor : '#ffffff',
                  color: active ? '#ffffff' : brand.textColor,
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    fontSize: 28,
                    backgroundColor: active ? '#ffffff24' : `${brand.primaryColor}12`,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  data-layout-text
                  data-text
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: item.length > 32 ? 38 : 44,
                    lineHeight: 1.25,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item}
                </span>
              </div>
              {index < scene.visualItems.length - 1 && (
                <div
                  style={{
                    width: 4,
                    height: 36,
                    marginLeft: 64,
                    backgroundColor: `${brand.primaryColor}44`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Recap({ scene, brand }: TemplateProps) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 60 }}>
      <div
        data-layout-text
        data-text
        style={{
          ...titleStyle,
          fontSize: scene.onScreenTitle.length > 40 ? 76 : 94,
          ...entrance(frame),
        }}
      >
        {scene.onScreenTitle}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {scene.visualItems.map((item, index) => (
          <div
            key={index}
            style={{
              ...entrance(frame, 8 + index * 5),
              display: 'flex',
              alignItems: 'flex-start',
              gap: 28,
              padding: '32px 0',
              borderBottom: `2px solid ${brand.textColor}20`,
            }}
          >
            <span style={{ fontSize: 42, lineHeight: 1.25, color: brand.primaryColor }}>✓</span>
            <span
              data-layout-text
              data-text
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: item.length > 32 ? 44 : 52,
                lineHeight: 1.25,
                overflowWrap: 'anywhere',
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
