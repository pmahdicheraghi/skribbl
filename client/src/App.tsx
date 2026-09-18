import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { Lobby } from './components/Lobby.js';
import { GameView } from './components/GameView.js';
import { WiredCard } from 'wired-elements-react';

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
    startGame,
    selectWord,
    drawStroke,
    clearCanvas,
    sendGuess,
    setErrorMessage
  } = useSocket();

  const [initialRoomCode, setInitialRoomCode] = useState('');

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
    <GameView
      roomState={roomState}
      messages={messages}
      wordOptions={wordOptions}
      socket={socket}
      onStartGame={startGame}
      onSelectWord={selectWord}
      onStroke={drawStroke}
      onClear={clearCanvas}
      onSendMessage={sendGuess}
    />
  );
};

export default App;
