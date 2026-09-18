import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { Lobby } from './components/Lobby.js';
import { GameView } from './components/GameView.js';
import { WiredCard, WiredButton } from 'wired-elements-react';

export const App: React.FC = () => {
  const {
    socket,
    connected,
    roomState,
    messages,
    wordOptions,
    errorMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    restartGame,
    selectWord,
    drawStroke,
    clearCanvas,
    sendGuess,
    setErrorMessage
  } = useSocket();

  const [initialRoomCode, setInitialRoomCode] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // Update URL search query when room is active
  useEffect(() => {
    if (roomState?.roomId) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomState.roomId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [roomState?.roomId]);

  // Trap browser/hardware back button and beforeunload when in an active room
  useEffect(() => {
    if (!roomState?.roomId) return;

    // Push state into history stack to intercept back navigation
    window.history.pushState({ inGame: true }, '', window.location.href);

    const handlePopState = () => {
      setShowExitConfirm(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomState?.roomId]);

  const handleCancelExit = () => {
    setShowExitConfirm(false);
    // Push state again so the next back button press will still be trapped
    window.history.pushState({ inGame: true }, '', window.location.href);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.pathname);
    leaveRoom();
  };

  if (!connected) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px'
        }}
      >
        <WiredCard elevation={3} style={{ textAlign: 'center', padding: '32px' }}>
          <h2 style={{ color: '#e67e22', marginBottom: '8px' }}>در حال اتصال به سرور...</h2>
          <p style={{ color: '#666' }}>لطفاً شکیبا باشید.</p>
        </WiredCard>
      </div>
    );
  }

  if (!roomState) {
    return (
      <Lobby
        initialRoomCode={initialRoomCode}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        error={errorMessage}
        setError={setErrorMessage}
      />
    );
  }

  return (
    <>
      <GameView
        roomState={roomState}
        messages={messages}
        wordOptions={wordOptions}
        socket={socket}
        onStartGame={startGame}
        onRestartGame={restartGame}
        onSelectWord={selectWord}
        onStroke={drawStroke}
        onClear={clearCanvas}
        onSendMessage={sendGuess}
      />

      {showExitConfirm && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <WiredCard elevation={4} style={{ textAlign: 'center', maxWidth: '380px', width: '90%', padding: '24px' }}>
            <h3 style={{ color: '#e67e22', marginBottom: '12px', fontSize: '1.3rem' }}>
              ⚠️ خروج از بازی؟
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '20px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              آیا مطمئن هستید که می‌خواهید از اتاق بازی خارج شوید؟
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <WiredButton
                elevation={2}
                onClick={handleCancelExit}
                style={{ flex: 1, fontWeight: 700 }}
              >
                ادامه بازی
              </WiredButton>
              <WiredButton
                elevation={2}
                onClick={handleConfirmExit}
                style={{ flex: 1, color: '#dc2626', fontWeight: 700 }}
              >
                خروج
              </WiredButton>
            </div>
          </WiredCard>
        </div>
      )}
    </>
  );
};

export default App;

