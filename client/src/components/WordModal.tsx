import React from 'react';
import { WiredCard, WiredButton } from 'wired-elements-react';
import { RoughBanner } from './rough/RoughBanner.js';
import { RoughPill } from './rough/RoughPill.js';

interface WordModalProps {
  wordOptions: string[];
  secondsLeft: number;
  onSelectWord: (word: string) => void;
}

export const WordModal: React.FC<WordModalProps> = ({
  wordOptions,
  secondsLeft,
  onSelectWord
}) => {
  if (wordOptions.length === 0) return null;

  return (
    <div className="modal-overlay">
      <WiredCard elevation={4} className="modal-content">
        <RoughBanner
          stroke="#e67e22"
          strokeWidth={1.8}
          fill="#fff7ed"
          notchSize={10}
          style={{ width: '100%', marginBottom: '12px' }}
        >
          <h2 style={{ color: '#d35400', fontSize: '1.4rem' }}>✏️ نوبت نقاشی شماست!</h2>
        </RoughBanner>

        <p style={{ color: '#555', marginBottom: '16px' }}>
          یک کلمه از فهرست زیر انتخاب کنید تا نقاشی را آغاز کنید:
        </p>

        <div className="word-options-grid">
          {wordOptions.map((word) => (
            <WiredButton
              key={word}
              elevation={2}
              className="word-btn"
              onClick={() => onSelectWord(word)}
            >
              {word}
            </WiredButton>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <RoughPill stroke="#f97316" strokeWidth={1.3} fill="#fff7ed">
            <span style={{ fontSize: '0.95rem', color: '#c2410c', fontWeight: 600 }}>
              ⏱️ زمان باقی‌مانده برای انتخاب: <strong>{secondsLeft}</strong> ثانیه
            </span>
          </RoughPill>
        </div>
      </WiredCard>
    </div>
  );
};
