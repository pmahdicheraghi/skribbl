import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DrawStroke, DrawPoint } from '../../../shared/types.js';
import type { Socket } from 'socket.io-client';
import { WiredButton } from 'wired-elements-react';
import { RoughBox } from './rough/RoughBox.js';
import { RoughDivider } from './rough/RoughDivider.js';
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
  onStroke: (stroke: DrawStroke) => void;
  onClear: () => void;
  socket: Socket | null;
}

export const Canvas: React.FC<CanvasProps> = ({
  isDrawer,
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div className="canvas-box">
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
            <RoughPill stroke="#94a3b8" strokeWidth={1.2} fill="rgba(255, 255, 255, 0.92)">
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
                👀 حالت تماشاچی (نوبت نقاشی شما نیست)
              </span>
            </RoughPill>
          </div>
        )}
      </div>

      {isDrawer && (
        <div style={{ flexShrink: 0, marginTop: '6px', width: '100%', maxWidth: '800px', margin: '6px auto 0' }}>
          <RoughBox
            stroke="#475569"
            strokeWidth={1.3}
            fill="#ffffff"
            style={{ width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              {/* Tool Selection (Pen / Eraser / Clear) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <WiredButton
                  elevation={tool === 'pen' ? 3 : 1}
                  onClick={() => setTool('pen')}
                  style={{
                    color: tool === 'pen' ? '#e67e22' : 'inherit',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>✏️ قلم</span>
                </WiredButton>

                <WiredButton
                  elevation={tool === 'eraser' ? 3 : 1}
                  onClick={() => setTool('eraser')}
                  style={{
                    color: tool === 'eraser' ? '#e67e22' : 'inherit',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>🧹 پاک‌کن</span>
                </WiredButton>

                <WiredButton
                  elevation={1}
                  onClick={handleClear}
                  style={{
                    color: '#dc2626',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>🗑️ پاک‌کردن</span>
                </WiredButton>
              </div>

              {/* 6 Colors Palette */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, justifyContent: 'center' }}>
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c);
                      setTool('pen');
                    }}
                    title={c}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: selectedColor === c && tool === 'pen' ? '2.5px solid #e67e22' : '1.5px solid #94a3b8',
                      cursor: 'pointer',
                      transform: selectedColor === c && tool === 'pen' ? 'scale(1.18)' : 'scale(1)',
                      transition: 'transform 0.1s ease',
                      boxShadow: selectedColor === c && tool === 'pen' ? '0 0 5px rgba(230,126,34,0.7)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          </RoughBox>
        </div>
      )}
    </div>
  );
};
