import React, { useRef, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';

export interface RoughPillProps {
  children: React.ReactNode;
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

export const RoughPill: React.FC<RoughPillProps> = ({
  children,
  stroke = '#2b2b2b',
  strokeWidth = 1.4,
  fill,
  fillStyle = 'solid',
  roughness = 1.1,
  bowing = 0.9,
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
    const r = Math.min((h - pad * 2) / 2, (w - pad * 2) / 2);

    const d = `
      M ${pad + r} ${pad}
      L ${w - pad - r} ${pad}
      A ${r} ${r} 0 0 1 ${w - pad} ${pad + r}
      A ${r} ${r} 0 0 1 ${w - pad - r} ${h - pad}
      L ${pad + r} ${h - pad}
      A ${r} ${r} 0 0 1 ${pad} ${h - pad - r}
      A ${r} ${r} 0 0 1 ${pad + r} ${pad}
      Z
    `.trim();

    const pathNode = rc.path(d, {
      stroke,
      strokeWidth,
      roughness,
      bowing,
      fill,
      fillStyle,
      seed: seedRef.current
    });

    svg.appendChild(pathNode);
  }, [size, stroke, strokeWidth, fill, fillStyle, roughness, bowing]);

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
          overflow: 'visible'
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '3px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap'
        }}
      >
        {children}
      </div>
    </div>
  );
};
