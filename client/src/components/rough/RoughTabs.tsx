import React, { useRef, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

export interface RoughTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

interface SingleTabProps {
  tab: TabItem;
  isActive: boolean;
  onClick: () => void;
}

const SingleRoughTab: React.FC<SingleTabProps> = ({ tab, isActive, onClick }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const seedRef = useRef<number>(Math.floor(Math.random() * 2 ** 31));
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = btnRef.current;
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
    const pad = 2;
    const w = Math.max(size.width - pad * 2, 4);
    const h = Math.max(size.height - pad * 2, 4);

    if (isActive) {
      // Active tab: warm sketchy border + subtle solid warm fill
      const node = rc.rectangle(pad, pad, w, h, {
        stroke: '#e67e22',
        strokeWidth: 2,
        roughness: 1.2,
        bowing: 1,
        fill: '#fffbf2',
        fillStyle: 'solid',
        seed: seedRef.current
      });
      svg.appendChild(node);
    } else {
      // Inactive tab: light sketchy border
      const node = rc.rectangle(pad, pad, w, h, {
        stroke: '#cbd5e1',
        strokeWidth: 1.2,
        roughness: 1.0,
        bowing: 0.8,
        fill: '#f8fafc',
        fillStyle: 'solid',
        seed: seedRef.current
      });
      svg.appendChild(node);
    }
  }, [size, isActive]);

  return (
    <button
      ref={btnRef}
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      type="button"
      style={{
        position: 'relative',
        flex: 1,
        border: 'none',
        background: 'transparent',
        padding: '10px 16px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '1rem',
        fontWeight: isActive ? 800 : 500,
        color: isActive ? '#d35400' : '#64748b',
        outline: 'none',
        transition: 'color 0.2s ease, transform 0.1s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
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
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {tab.icon && <span>{tab.icon}</span>}
        <span>{tab.label}</span>
      </span>
    </button>
  );
};

export const RoughTabs: React.FC<RoughTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  style,
  className
}) => {
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: 'flex',
        gap: '8px',
        width: '100%',
        marginBottom: '20px',
        ...style
      }}
    >
      {tabs.map((tab) => (
        <SingleRoughTab
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        />
      ))}
    </div>
  );
};
