import React, { useState } from 'react';
import type { RoomPublicState, ChatMessage, DrawStroke } from '../../../shared/types.js';
import type { Socket } from 'socket.io-client';
import { WiredCard, WiredButton } from 'wired-elements-react';
import { RoughBox } from './rough/RoughBox.js';
import { RoughPill } from './rough/RoughPill.js';
import { RoughBanner } from './rough/RoughBanner.js';
import { RoughCircle } from './rough/RoughCircle.js';
import { RoughDivider } from './rough/RoughDivider.js';
import { Canvas } from './Canvas.js';
import { Chat } from './Chat.js';
import { PlayerList } from './PlayerList.js';
import { WordModal } from './WordModal.js';

interface GameViewProps {
  roomState: RoomPublicState;
  messages: ChatMessage[];
  wordOptions: string[];
  socket: Socket | null;
  onStartGame: () => void;
  onRestartGame?: () => void;
  onSelectWord: (word: string) => void;
  onStroke: (stroke: DrawStroke) => void;
  onClear: () => void;
  onSendMessage: (text: string) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  roomState,
  messages,
  wordOptions,
  socket,
  onStartGame,
  onRestartGame,
  onSelectWord,
  onStroke,
  onClear,
  onSendMessage
}) => {
  const [copied, setCopied] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const currentSocketId = socket?.id;
  const isDrawer = roomState.currentDrawerId === currentSocketId;
  const currentPlayer = roomState.players.find((p) => p.id === currentSocketId);
  const isHost = currentPlayer?.isHost ?? false;
  const hasGuessedCorrectly = currentPlayer?.hasGuessedCorrectly ?? false;

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWordDisplayText = () => {
    if (roomState.state === 'LOBBY') {
      return 'در انتظار شروع...';
    }
    if (roomState.state === 'SELECTING_WORD') {
      return isDrawer ? 'انتخاب کلمه...' : 'در حال انتخاب...';
    }
    if (roomState.state === 'ROUND_ENDED' || roomState.state === 'GAME_OVER') {
      return `کلمه: ${roomState.revealedWord}`;
    }
    if (isDrawer) {
      return `کلمه: ${roomState.wordMask}`;
    }
    return `${roomState.wordMask} (${roomState.wordLength})`;
  };

  return (
    <div className="game-screen">
      {/* Top Header: Balanced Layout */}
      <header className="header-bar">
        <div className="header-brand">
          <span className="logo">اسکربل</span>
        </div>

        <div className="header-center">
          <RoughBanner
            stroke="#2c3e50"
            strokeWidth={1.6}
            fill="#ffffff"
            notchSize={8}
            style={{ maxWidth: '100%', minWidth: 0, flexShrink: 1 }}
          >
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#2c3e50', padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getWordDisplayText()}
            </span>
          </RoughBanner>

          <RoughPill stroke="#d35400" strokeWidth={1.4} fill="#fdf2e9">
            <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#d35400', padding: '0 6px', whiteSpace: 'nowrap' }}>
              {roomState.secondsLeft} ثانیه
            </span>
          </RoughPill>
        </div>

        <div className="header-left">
          <RoughPill stroke="#94a3b8" strokeWidth={1.2} fill="#ffffff">
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', padding: '0 6px', whiteSpace: 'nowrap' }}>
              دور {roomState.currentRound}/{roomState.maxRounds}
            </span>
          </RoughPill>
        </div>
      </header>

      {/* Hand-drawn divider below header */}
      <RoughDivider stroke="#cfc9b4" strokeWidth={1.8} style={{ margin: 0, flexShrink: 0 }} />

      {/* Main Game Layout (Flexbox) */}
      <main className={`game-layout ${isDrawer ? 'role-drawer' : 'role-guesser'}`}>
        {/* Canvas Section */}
        <section className="canvas-section">
          <div className="canvas-card">
            <Canvas
              isDrawer={isDrawer && roomState.state === 'DRAWING'}
              gameState={roomState.state}
              onStroke={onStroke}
              onClear={onClear}
              socket={socket}
            />

            {/* Drawer Word Selection Modal */}
            {isDrawer && roomState.state === 'SELECTING_WORD' && (
              <WordModal
                wordOptions={wordOptions}
                secondsLeft={roomState.secondsLeft}
                onSelectWord={onSelectWord}
              />
            )}

            {/* Lobby Waiting Overlay */}
            {roomState.state === 'LOBBY' && (
              <div className="modal-overlay" style={{ background: 'rgba(255, 255, 255, 0.88)' }}>
                <WiredCard elevation={3} style={{ textAlign: 'center', maxWidth: '440px', width: '90%', padding: '24px' }}>
                  <h2 style={{ marginBottom: '10px', color: '#e67e22', fontSize: '1.5rem' }}>
                    اتاق بازی آماده است!
                  </h2>

                  <RoughBox stroke="#d1d5db" strokeWidth={1.2} fill="#fafaf9" style={{ width: '100%', margin: '14px 0' }}>
                    <div style={{ padding: '10px', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
                        بازیکنان حاضر در اتاق ({roomState.players.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {roomState.players.map((p) => (
                          <RoughPill
                            key={p.id}
                            stroke={p.isHost ? '#e67e22' : '#9ca3af'}
                            strokeWidth={1.2}
                            fill={p.isHost ? '#fff7ed' : '#ffffff'}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: p.isHost ? 700 : 400, padding: '0 4px' }}>
                              {p.isHost ? '👑 ' : ''}{p.name}{p.id === currentSocketId ? ' (شما)' : ''}
                            </span>
                          </RoughPill>
                        ))}
                      </div>
                    </div>
                  </RoughBox>

                  <p style={{ color: '#4b5563', marginBottom: '16px', fontSize: '0.92rem' }}>
                    {roomState.players.length < 2
                      ? 'برای شروع بازی حداقل به ۲ بازیکن نیاز است. لینک زیر را کپی کرده و برای دوستانتان بفرستید:'
                      : isHost
                      ? 'همه آماده‌اند! برای آغاز دور اول، روی دکمه شروع بازی کلیک کنید:'
                      : 'همه آماده‌اند! منتظر میزبان برای شروع بازی باشید...'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isHost ? (
                      <WiredButton
                        elevation={3}
                        onClick={onStartGame}
                        disabled={roomState.players.length < 2}
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: roomState.players.length < 2 ? '#9ca3af' : '#059669',
                          padding: '6px 16px'
                        }}
                      >
                        {'🚀 شروع بازی!'}
                      </WiredButton>
                    ) : (
                      <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.9rem', color: '#4b5563' }}>
                        ⏳ در انتظار شروع بازی توسط میزبان...
                      </div>
                    )}

                    <WiredButton elevation={2} onClick={handleCopyLink}>
                      {copied ? '✅ لینک کپی شد!' : '🔗 کپی لینک دعوت'}
                    </WiredButton>
                  </div>
                </WiredCard>
              </div>
            )}

            {/* Game Over Podium */}
            {roomState.state === 'GAME_OVER' && (
              <div className="modal-overlay">
                <WiredCard elevation={4} style={{ textAlign: 'center', maxWidth: '460px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.8rem', color: '#e67e22', marginBottom: '10px' }}>
                    🏆 پایان بازی!
                  </h2>
                  <p style={{ color: '#666', marginBottom: '18px' }}>
                    جدول برترین بازیکنان:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {[...roomState.players]
                      .sort((a, b) => b.score - a.score)
                      .map((p, idx) => {
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                        return (
                          <RoughBox
                            key={p.id}
                            stroke={idx === 0 ? '#f59e0b' : '#cbd5e1'}
                            strokeWidth={idx === 0 ? 1.8 : 1.2}
                            fill={idx === 0 ? '#fef3c7' : '#f9fafb'}
                            style={{ width: '100%' }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 14px',
                                fontWeight: 700
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RoughCircle
                                  stroke={idx === 0 ? '#f59e0b' : '#94a3b8'}
                                  strokeWidth={1.3}
                                  fill={idx === 0 ? '#fef3c7' : '#ffffff'}
                                >
                                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{medal}</span>
                                </RoughCircle>
                                <span>{p.name}</span>
                              </div>
                              <span style={{ color: '#059669' }}>{p.score} امتیاز</span>
                            </div>
                          </RoughBox>
                        );
                      })}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isHost ? (
                      <WiredButton
                        elevation={3}
                        onClick={onRestartGame}
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: '#059669',
                          width: '100%'
                        }}
                      >
                        🔄 شروع دور جدید با همین بازیکنان
                      </WiredButton>
                    ) : (
                      <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.92rem', color: '#4b5563' }}>
                        ⏳ در انتظار میزبان برای شروع دور جدید...
                      </div>
                    )}
                  </div>
                </WiredCard>
              </div>
            )}

          </div>
        </section>

        <aside
          className={`game-sidebar ${isInputFocused ? 'input-focused' : ''}`}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        >
          <WiredCard elevation={2} className="game-sidebar-wired">
            <div className="game-sidebar-inner">
              <div className="sidebar-players">
                <PlayerList
                  players={roomState.players}
                  currentDrawerId={roomState.currentDrawerId}
                  currentUserId={currentSocketId}
                />
                <RoughDivider stroke="#d1ccb8" strokeWidth={1.4} style={{ margin: '4px 0', flexShrink: 0 }} />
              </div>

              {/* Chat Feed */}
              <Chat
                messages={messages}
                onSendMessage={onSendMessage}
                isDrawer={isDrawer && roomState.state === 'DRAWING'}
                hasGuessedCorrectly={hasGuessedCorrectly}
              />
            </div>
          </WiredCard>
        </aside>
      </main>
    </div>
  );
};
