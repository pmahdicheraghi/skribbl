import React from 'react';
import type { Player } from '../../../shared/types.js';
import { RoughPill } from './rough/RoughPill.js';

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
    <div className="players-list-wrapper">
      <div className="players-list-header">
        <span className="players-count-label">
          👥 بازیکنان ({players.length}):
        </span>
        <span className="players-legend-label">
          ✏️ نوبت نقاشی | ✅ حدس درست
        </span>
      </div>

      <div className="player-chips-row">
        {sortedPlayers.map((player, index) => {
          const isDrawing = player.id === currentDrawerId;
          const isGuessed = player.hasGuessedCorrectly;
          const isSelf = player.id === currentUserId;

          return (
            <RoughPill
              key={player.id}
              stroke={player.isHost ? '#ea580c' : isSelf ? '#2563eb' : '#cbd5e1'}
              strokeWidth={1.6}
              fill={player.isHost ? '#ffe4d0' : isSelf ? '#dbeafe' : '#f1f5f9'}
            >
              <div className="player-chip-inner" title={isSelf ? 'شما' : player.name}>
                <span className="chip-rank">{index + 1}</span>
                {isDrawing && <span className="chip-badge" title="در حال نقاشی">✏️</span>}
                {isGuessed && <span className="chip-badge" title="حدس درست">✅</span>}
                <span className={`chip-name ${player.isHost ? 'host-name' : isSelf ? 'self-name' : ''}`}>{player.name}</span>
                <span className="chip-score">{player.score}</span>
              </div>
            </RoughPill>
          );
        })}
      </div>
    </div>
  );
};
