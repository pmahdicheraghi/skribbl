import React from 'react';
import type { Player } from '../../../shared/types.js';
import { RoughPill } from './rough/RoughPill.js';
import { RoughCircle } from './rough/RoughCircle.js';

interface PlayerListProps {
  players: Player[];
  currentDrawerId: string | null;
  currentUserId?: string;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentDrawerId,
  currentUserId
}) => {
  // Sort by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{ width: '100%', padding: '4px 6px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}
      >
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
          👥 بازیکنان ({players.length}):
        </span>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          ✏️ نوبت نقاشی | ✅ حدس درست
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
          maxHeight: '120px',
          overflowY: 'auto'
        }}
      >
        {sortedPlayers.map((player, index) => {
          const isDrawing = player.id === currentDrawerId;
          const isGuessed = player.hasGuessedCorrectly;
          const isSelf = player.id === currentUserId;

          let stroke = '#cbd5e1';
          let fill = '#ffffff';
          let strokeWidth = 1.2;

          if (isDrawing) {
            stroke = '#e67e22';
            fill = '#fff7ed';
            strokeWidth = 1.8;
          } else if (isGuessed) {
            stroke = '#16a34a';
            fill = '#f0fdf4';
            strokeWidth = 1.6;
          } else if (isSelf) {
            stroke = '#3b82f6';
            fill = '#eff6ff';
            strokeWidth = 1.4;
          }

          return (
            <RoughPill
              key={player.id}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill={fill}
              style={{
                boxShadow: isDrawing ? '0 0 6px rgba(230,126,34,0.35)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.86rem' }}>
                <RoughCircle
                  stroke={isDrawing ? '#e67e22' : '#9ca3af'}
                  strokeWidth={1}
                  fill={isDrawing ? '#fed7aa' : '#f1f5f9'}
                  style={{ width: '20px', height: '20px' }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1 }}>
                    {index + 1}
                  </span>
                </RoughCircle>

                {player.isHost && <span title="میزبان اتاق">👑</span>}
                {isDrawing && <span title="در حال نقاشی">✏️</span>}
                {isGuessed && <span title="حدس درست">✅</span>}

                <span
                  style={{
                    fontWeight: isDrawing || isGuessed || isSelf ? 800 : 600,
                    color: isDrawing ? '#c2410c' : isGuessed ? '#15803d' : isSelf ? '#1d4ed8' : '#334155'
                  }}
                >
                  {player.name}
                </span>

                {isSelf && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>(شما)</span>}

                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#059669',
                    background: 'rgba(0,0,0,0.06)',
                    padding: '1px 5px',
                    borderRadius: '8px'
                  }}
                >
                  {player.score}
                </span>
              </div>
            </RoughPill>
          );
        })}
      </div>
    </div>
  );
};
