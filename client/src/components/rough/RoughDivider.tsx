import React, { useRef, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';

export interface RoughDividerProps {
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  orientation?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
}

export const RoughDivider: React.FC<RoughDividerProps> = ({
  stroke = '#cfc9b4',
  strokeWidth = 1.5,
  roughness = 1.2,
  bowing = 1,
  orientation = 'horizontal',
  style,
  className
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

    if (orientation === 'horizontal') {
      const midY = size.height / 2;
      const lineNode = rc.line(2, midY, size.width - 2, midY, {
        stroke,
        strokeWidth,
        roughness,
        bowing,
        seed: seedRef.current
      });
      svg.appendChild(lineNode);
    } else {
      const midX = size.width / 2;
      const lineNode = rc.line(midX, 2, midX, size.height - 2, {
        stroke,
        strokeWidth,
        roughness,
        bowing,
        seed: seedRef.current
      });
      svg.appendChild(lineNode);
    }
  }, [size, stroke, strokeWidth, roughness, bowing, orientation]);

  const defaultHeight = orientation === 'horizontal' ? '6px' : '100%';
  const defaultWidth = orientation === 'horizontal' ? '100%' : '6px';

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: defaultWidth,
        height: defaultHeight,
        margin: orientation === 'horizontal' ? '6px 0' : '0 6px',
        flexShrink: 0,
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
    </div>
  );
};
