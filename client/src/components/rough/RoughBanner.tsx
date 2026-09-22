import React, { useRef, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';

export interface RoughBannerProps {
  children: React.ReactNode;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillStyle?: Options['fillStyle'];
  roughness?: number;
  bowing?: number;
  notchSize?: number;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const RoughBanner: React.FC<RoughBannerProps> = ({
  children,
  stroke = '#2c3e50',
  strokeWidth = 1.6,
  fill = '#ffffff',
  fillStyle = 'solid',
  roughness = 1.2,
  bowing = 1,
  notchSize = 12,
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
    const pad = Math.max(strokeWidth, 2);
    const w = size.width;
    const h = size.height;
    const midY = h / 2;
    const n = Math.min(notchSize, w * 0.15);

    // Chevron / swallowtail banner:
    // Left notched end (<) and right pointed end (>)
    const points: [number, number][] = [
      [pad + n, pad],
      [w - pad - n, pad],
      [w - pad, midY],
      [w - pad - n, h - pad],
      [pad + n, h - pad],
      [pad, midY]
    ];

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
  }, [size, stroke, strokeWidth, fill, fillStyle, roughness, bowing, notchSize]);

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          padding: `3px ${notchSize + 8}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        {children}
      </div>
    </div>
  );
};
