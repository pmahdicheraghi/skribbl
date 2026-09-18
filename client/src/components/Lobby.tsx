import React, { useState } from 'react';
import type { RoomSettings, WordDifficulty } from '../../../shared/types.js';
import {
  WiredButton,
  WiredCard,
  WiredInput,
  WiredTextarea,
  WiredRadio,
  WiredRadioGroup
} from 'wired-elements-react';
import { RoughTabs } from './rough/RoughTabs.js';
import { RoughBox } from './rough/RoughBox.js';

interface LobbyProps {
  initialRoomCode?: string;
  onCreateRoom: (playerName: string, settings: Partial<RoomSettings>) => Promise<{ success: boolean; roomId?: string; error?: string }>;
  onJoinRoom: (roomId: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
  setError: (err: string | null) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  error,
  setError
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('skribbl_player_name') || '';
    } catch {
      return '';
    }
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode);

  // Settings
  const [maxRounds, setMaxRounds] = useState<number>(3);
  const [roundDurationSec, setRoundDurationSec] = useState<number>(80);
  const [wordDifficulty, setWordDifficulty] = useState<WordDifficulty>('all');
  const [customWordsText, setCustomWordsText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!playerName.trim()) {
      setError('لطفاً نام خود را وارد کنید.');
      return;
    }

    try {
      localStorage.setItem('skribbl_player_name', playerName.trim());
    } catch {}

    setLoading(true);
    setError(null);

    const customWords = customWordsText
      .split(/[,،\n]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1);

    const res = await onCreateRoom(playerName.trim(), {
      maxRounds,
      roundDurationSec,
      wordDifficulty,
      customWords
    });

    setLoading(false);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!playerName.trim()) {
      setError('لطفاً نام خود را وارد کنید.');
      return;
    }
    if (!roomCode.trim()) {
      setError('لطفاً کد اتاق را وارد کنید.');
      return;
    }

    try {
      localStorage.setItem('skribbl_player_name', playerName.trim());
    } catch {}

    setLoading(true);
    setError(null);

    const res = await onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    setLoading(false);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}
    >
      <WiredCard elevation={3} style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2rem', color: '#e67e22', marginBottom: '6px' }}>
            اسکربل 
          </h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>
            بازی آنلاین حدس نقاشی با دوستان
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '18px', width: '100%' }}>
            <RoughBox
              stroke="#dc2626"
              strokeWidth={1.8}
              fill="#fef2f2"
              fillStyle="solid"
              roughness={1.3}
              style={{ width: '100%' }}
            >
              <div
                style={{
                  color: '#b91c1c',
                  padding: '10px 14px',
                  fontSize: '0.92rem',
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                ⚠️ {error}
              </div>
            </RoughBox>
          </div>
        )}

        {/* Handwritten Tabs for Mode Switching */}
        <RoughTabs
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId as 'create' | 'join');
            setError(null);
          }}
          tabs={[
            { id: 'create', label: 'ساخت اتاق جدید'},
            { id: 'join', label: 'ورود به اتاق'}
          ]}
        />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>
            نام شما:
          </label>
          <WiredInput
            value={playerName}
            onChange={(e: any) => {
              const val = e.target?.value ?? e.detail?.sourceEvent?.target?.value ?? '';
              setPlayerName(val);
              try {
                localStorage.setItem('skribbl_player_name', val);
              } catch {}
            }}
            placeholder="مثلاً: علی، سارا..."
            style={{ width: '100%', direction: 'rtl', display: 'block' }}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                if (activeTab === 'create') handleCreate();
                else handleJoin();
              }
            }}
          />
        </div>

        {activeTab === 'create' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                تعداد دورهای بازی:
              </label>
              <WiredRadioGroup
                selected={String(maxRounds)}
                onselected={(e: any) => {
                  const val = e.detail?.selected;
                  if (val) setMaxRounds(Number(val));
                }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
              >
                <WiredRadio name="2" checked={maxRounds === 2} onClick={() => setMaxRounds(2)}>
                  <span className="radio-label">۲ دور</span>
                </WiredRadio>
                <WiredRadio name="3" checked={maxRounds === 3} onClick={() => setMaxRounds(3)}>
                  <span className="radio-label">۳ دور (استاندارد)</span>
                </WiredRadio>
                <WiredRadio name="4" checked={maxRounds === 4} onClick={() => setMaxRounds(4)}>
                  <span className="radio-label">۴ دور</span>
                </WiredRadio>
                <WiredRadio name="5" checked={maxRounds === 5} onClick={() => setMaxRounds(5)}>
                  <span className="radio-label">۵ دور</span>
                </WiredRadio>
              </WiredRadioGroup>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                زمان هر نقاشی:
              </label>
              <WiredRadioGroup
                selected={String(roundDurationSec)}
                onselected={(e: any) => {
                  const val = e.detail?.selected;
                  if (val) setRoundDurationSec(Number(val));
                }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
              >
                <WiredRadio name="45" checked={roundDurationSec === 45} onClick={() => setRoundDurationSec(45)}>
                  <span className="radio-label">۴۵ ثانیه</span>
                </WiredRadio>
                <WiredRadio name="60" checked={roundDurationSec === 60} onClick={() => setRoundDurationSec(60)}>
                  <span className="radio-label">۶۰ ثانیه</span>
                </WiredRadio>
                <WiredRadio name="80" checked={roundDurationSec === 80} onClick={() => setRoundDurationSec(80)}>
                  <span className="radio-label">۸۰ ثانیه (استاندارد)</span>
                </WiredRadio>
                <WiredRadio name="100" checked={roundDurationSec === 100} onClick={() => setRoundDurationSec(100)}>
                  <span className="radio-label">۱۰۰ ثانیه</span>
                </WiredRadio>
              </WiredRadioGroup>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                سطح سختی کلمات:
              </label>
              <WiredRadioGroup
                selected={wordDifficulty}
                onselected={(e: any) => {
                  const val = e.detail?.selected;
                  if (val) setWordDifficulty(val as WordDifficulty);
                }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
              >
                <WiredRadio name="easy" checked={wordDifficulty === 'easy'} onClick={() => setWordDifficulty('easy')}>
                  <span className="radio-label">🟢 آسان</span>
                </WiredRadio>
                <WiredRadio name="medium" checked={wordDifficulty === 'medium'} onClick={() => setWordDifficulty('medium')}>
                  <span className="radio-label">🟡 متوسط</span>
                </WiredRadio>
                <WiredRadio name="hard" checked={wordDifficulty === 'hard'} onClick={() => setWordDifficulty('hard')}>
                  <span className="radio-label">🔴 سخت</span>
                </WiredRadio>
                <WiredRadio name="all" checked={wordDifficulty === 'all'} onClick={() => setWordDifficulty('all')}>
                  <span className="radio-label">🎲 همه سطوح</span>
                </WiredRadio>
              </WiredRadioGroup>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                کلمات دلخواه فارسی (اختیاری):
              </label>
              <WiredTextarea
                value={customWordsText}
                onChange={(e: any) => {
                  const val = e.target?.value ?? e.detail?.sourceEvent?.target?.value ?? '';
                  setCustomWordsText(val);
                }}
                placeholder="کلمات را با کاما یا خط جدید جدا کنید... مثلاً: قورمه سبزی، دماوند"
                rows={2}
                style={{ width: '100%', direction: 'rtl', display: 'block' }}
              />
            </div>

            <WiredButton
              elevation={3}
              onClick={() => handleCreate()}
              disabled={loading || !playerName.trim()}
              style={{ width: '100%', marginTop: '8px', fontSize: '1.1rem' }}
            >
              {loading ? 'در حال ایجاد...' : '✨ ایجاد اتاق و شروع'}
            </WiredButton>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                کد اتاق:
              </label>
              <WiredInput
                value={roomCode}
                onChange={(e: any) => {
                  const val = e.target?.value ?? e.detail?.sourceEvent?.target?.value ?? '';
                  setRoomCode(val.toUpperCase());
                }}
                placeholder="مثلاً: FA-ABCD"
                style={{ width: '100%', textAlign: 'center', display: 'block' }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') handleJoin();
                }}
              />
            </div>

            <WiredButton
              elevation={3}
              onClick={() => handleJoin()}
              disabled={loading || !playerName.trim() || !roomCode.trim()}
              style={{ width: '100%', marginTop: '8px', fontSize: '1.1rem' }}
            >
              {loading ? 'در حال اتصال...' : '🚀 ورود به بازی'}
            </WiredButton>
          </div>
        )}
      </WiredCard>
    </div>
  );
};
