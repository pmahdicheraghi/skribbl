import React, { useRef, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';

export interface RoughSpeechBubbleProps {
  children: React.ReactNode;
  tailPosition?: 'bottom-right' | 'bottom-left' | 'none';
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillStyle?: Options['fillStyle'];
  roughness?: number;
  bowing?: number;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const RoughSpeechBubble: React.FC<RoughSpeechBubbleProps> = ({
  children,
  tailPosition = 'bottom-right',
  stroke = '#2b2b2b',
  strokeWidth = 1.5,
  fill = '#ffffff',
  fillStyle = 'solid',
  roughness = 1.2,
  bowing = 1,
  style,
  className,
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const seedRef = useRef<number>(Math.floor(Math.random() * 2 ** 31));
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.width <= 0 || size.height <= 0) return;

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const pad = Math.max(strokeWidth + 2, 4);
    const w = size.width;
    const h = size.height;
    const tailH = tailPosition === 'none' ? 0 : 8;
    const bodyH = Math.max(h - tailH, 10);

    let points: [number, number][];

    if (tailPosition === 'bottom-right') {
      const tailX = Math.min(w - pad - 12, w - 16);
      points = [
        [pad + 3, pad],
        [w - pad - 3, pad],
        [w - pad, pad + 3],
        [w - pad, bodyH - 3],
        [tailX, bodyH],
        [Math.min(w - pad - 2, tailX + 8), h - pad],
        [Math.max(pad + 10, tailX - 18), bodyH],
        [pad + 3, bodyH],
        [pad, bodyH - 3],
        [pad, pad + 3]
      ];
    } else if (tailPosition === 'bottom-left') {
      const tailX = Math.max(pad + 12, 16);
      points = [
        [pad + 3, pad],
        [w - pad - 3, pad],
        [w - pad, pad + 3],
        [w - pad, bodyH - 3],
        [Math.min(w - pad - 10, tailX + 18), bodyH],
        [Math.max(pad + 2, tailX - 8), h - pad],
        [tailX, bodyH],
        [pad + 3, bodyH],
        [pad, bodyH - 3],
        [pad, pad + 3]
      ];
    } else {
      points = [
        [pad + 4, pad],
        [w - pad - 4, pad],
        [w - pad, pad + 4],
        [w - pad, h - pad - 4],
        [w - pad - 4, h - pad],
        [pad + 4, h - pad],
        [pad, h - pad - 4],
        [pad, pad + 4]
      ];
    }

    const polyNode = rc.polygon(points, {
      stroke,
      strokeWidth,
      roughness,
      bowing,
      fill,
      fillStyle,
      seed: seedRef.current
    });

    svg.appendChild(polyNode);
  }, [size, tailPosition, stroke, strokeWidth, fill, fillStyle, roughness, bowing]);

  const paddingBottom = tailPosition === 'none' ? '8px' : '14px';

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        ...style
      }}
    >
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden'
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: `8px 12px ${paddingBottom} 12px`,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}
      >
        {children}
      </div>
    </div>
  );
};
