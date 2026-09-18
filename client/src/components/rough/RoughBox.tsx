import React, { useRef, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';

export interface RoughBoxProps {
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

export const RoughBox: React.FC<RoughBoxProps> = ({
  children,
  stroke = '#2b2b2b',
  strokeWidth = 1.5,
  fill,
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
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width <= 0 || dimensions.height <= 0) return;

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const pad = Math.max(strokeWidth, 2);
    const w = Math.max(dimensions.width - pad * 2, 4);
    const h = Math.max(dimensions.height - pad * 2, 4);

    const rectNode = rc.rectangle(pad, pad, w, h, {
      stroke,
      strokeWidth,
      roughness,
      bowing,
      fill,
      fillStyle,
      seed: seedRef.current
    });

    svg.appendChild(rectNode);
  }, [dimensions, stroke, strokeWidth, fill, fillStyle, roughness, bowing]);

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-block',
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
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  );
};
