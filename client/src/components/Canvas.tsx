import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DrawStroke, DrawPoint } from '../../../shared/types.js';
import type { Socket } from 'socket.io-client';
import { WiredCard, WiredButton } from 'wired-elements-react';
import { RoughPill } from './rough/RoughPill.js';


const PEN_SIZE = 3;
const ERASER_SIZE = 18;
const PALETTE_COLORS = [
  '#000000', // مشکی
  '#4b5563', // خاکستری
  '#ef4444', // قرمز
  '#3b82f6', // آبی
  '#10b981', // سبز
  '#f59e0b'  // زرد
];

interface CanvasProps {
  isDrawer: boolean;
  gameState?: string;
  onStroke: (stroke: DrawStroke) => void;
  onClear: () => void;
  socket: Socket | null;
}

const PencilIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const EraserIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

export const Canvas: React.FC<CanvasProps> = ({
  isDrawer,
  gameState,
  onStroke,
  onClear,
  socket
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawPoint[]>([]);
  const historyRef = useRef<DrawStroke[]>([]);

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');

  // Redraw helper for stroke with proportional scaling in physical buffer coordinates
  const drawStrokeOnCanvas = useCallback(
    (stroke: DrawStroke, ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (stroke.points.length < 1) return;

      // Scale stroke size proportionally to standard 800px reference canvas
      const dpr = window.devicePixelRatio || 1;
      const refWidth = 800 * dpr;
      const scale = width / refWidth;
      const scaledSize = Math.max(1.5 * dpr, stroke.size * scale * dpr);

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = scaledSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, scaledSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * width, pt.y * height);
      }

      ctx.stroke();
      ctx.restore();
    },
    []
  );

  // Resize canvas to match CSS display dimensions with devicePixelRatio and replay strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const newWidth = Math.round(rect.width * dpr);
      const newHeight = Math.round(rect.height * dpr);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          for (const stroke of historyRef.current) {
            drawStrokeOnCanvas(stroke, ctx, newWidth, newHeight);
          }
        }
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(canvas);

    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [drawStrokeOnCanvas]);

  // Socket listeners for remote strokes and canvas clear/history
  useEffect(() => {
    if (!socket) return;

    const handleRemoteStroke = (stroke: DrawStroke) => {
      historyRef.current.push(stroke);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawStrokeOnCanvas(stroke, ctx, canvas.width, canvas.height);
    };

    const handleClearCanvas = () => {
      historyRef.current = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleCanvasHistory = (history: DrawStroke[]) => {
      historyRef.current = [...history];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const stroke of history) {
        drawStrokeOnCanvas(stroke, ctx, canvas.width, canvas.height);
      }
    };

    socket.on('draw_stroke', handleRemoteStroke);
    socket.on('clear_canvas', handleClearCanvas);
    socket.on('canvas_history', handleCanvasHistory);

    return () => {
      socket.off('draw_stroke', handleRemoteStroke);
      socket.off('clear_canvas', handleClearCanvas);
      socket.off('canvas_history', handleCanvasHistory);
    };
  }, [socket, drawStrokeOnCanvas]);

  // Defense-in-depth: Automatically wipe canvas when game enters word selection or lobby
  useEffect(() => {
    if (gameState === 'SELECTING_WORD' || gameState === 'LOBBY') {
      historyRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [gameState]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture not supported
    }

    const point = getCoordinates(e);
    if (!point) return;

    isDrawingRef.current = true;
    currentStrokeRef.current = [point];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stroke: DrawStroke = {
      points: [point],
      color: tool === 'eraser' ? '#ffffff' : selectedColor,
      size: tool === 'eraser' ? ERASER_SIZE : PEN_SIZE
    };

    drawStrokeOnCanvas(stroke, ctx, canvas.width, canvas.height);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current) return;
    const point = getCoordinates(e);
    if (!point) return;

    const strokePoints = currentStrokeRef.current;
    if (strokePoints.length === 0) return;
    const lastPoint = strokePoints[strokePoints.length - 1];

    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    if (dx === 0 && dy === 0) return;

    strokePoints.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw segment
    const segmentStroke: DrawStroke = {
      points: [lastPoint, point],
      color: tool === 'eraser' ? '#ffffff' : selectedColor,
      size: tool === 'eraser' ? ERASER_SIZE : PEN_SIZE
    };
    drawStrokeOnCanvas(segmentStroke, ctx, canvas.width, canvas.height);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && e.currentTarget && e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 0) {
      const fullStroke: DrawStroke = {
        points: [...currentStrokeRef.current],
        color: tool === 'eraser' ? '#ffffff' : selectedColor,
        size: tool === 'eraser' ? ERASER_SIZE : PEN_SIZE
      };
      historyRef.current.push(fullStroke);
      onStroke(fullStroke);
      currentStrokeRef.current = [];
    }
  };

  const handleClear = () => {
    if (!isDrawer) return;
    historyRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    onClear();
  };

  return (
    <div className="canvas-inner-container">
      <WiredCard elevation={2} className="canvas-wired-card">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          style={{
            cursor: isDrawer ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
            touchAction: 'none'
          }}
        />
        {!isDrawer && (
          <div style={{ position: 'absolute', top: 10, right: 10, pointerEvents: 'none' }}>
            <RoughPill stroke="#94a3b8" strokeWidth={1.2} fill="rgba(255, 255, 255, 0.94)">
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, padding: '0 4px' }}>
                👀 حالت تماشاچی
              </span>
            </RoughPill>
          </div>
        )}
      </WiredCard>

      {isDrawer && (
        <WiredCard elevation={1} className="tools-wired-card">
          <div className="canvas-tools-bar">
            {/* Tool Selection (Pen / Eraser / Clear) */}
            <div className="canvas-tools-group">
              <WiredButton
                elevation={tool === 'pen' ? 3 : 1}
                className={`tool-wired-btn ${tool === 'pen' ? 'active' : ''}`}
                onClick={() => setTool('pen')}
              >
                <span title="قلم" style={{ display: 'flex', alignItems: 'center' }}>
                  <PencilIcon size={19} color={tool === 'pen' ? '#ea580c' : '#334155'} />
                </span>
              </WiredButton>

              <WiredButton
                elevation={tool === 'eraser' ? 3 : 1}
                className={`tool-wired-btn ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
              >
                <span title="پاک‌کن" style={{ display: 'flex', alignItems: 'center' }}>
                  <EraserIcon size={19} color={tool === 'eraser' ? '#ea580c' : '#334155'} />
                </span>
              </WiredButton>

              <WiredButton
                elevation={1}
                className="tool-wired-btn danger"
                onClick={handleClear}
              >
                <span title="پاک‌کردن کل صفحه" style={{ display: 'flex', alignItems: 'center' }}>
                  <TrashIcon size={19} color="#dc2626" />
                </span>
              </WiredButton>
            </div>

            <div className="canvas-tools-divider" />

            {/* 6 Colors Palette */}
            <div className="canvas-palette-group">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`palette-color-dot ${selectedColor === c && tool === 'pen' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedColor(c);
                    setTool('pen');
                  }}
                  title={c}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </WiredCard>
      )}
    </div>
  );
};
