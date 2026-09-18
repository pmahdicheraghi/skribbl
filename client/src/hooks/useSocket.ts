import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomPublicState,
  ChatMessage,
  DrawStroke,
  RoomSettings
} from '../../../shared/types.js';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function getPlayerToken(): string {
  try {
    let token = localStorage.getItem('skribbl_player_token');
    if (!token) {
      token = 'tok_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('skribbl_player_token', token);
    }
    return token;
  } catch {
    return 'tok_' + Math.random().toString(36).substring(2, 11);
  }
}

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomPublicState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // In dev, Vite proxies /socket.io to server (or connects to current host)
    const socket: TypedSocket = io('/', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setErrorMessage(null);

      // Attempt auto-reconnect if returning to a room
      try {
        const savedRoomId = localStorage.getItem('skribbl_room_id');
        const token = getPlayerToken();
        const params = new URLSearchParams(window.location.search);
        const urlRoomId = params.get('room')?.toUpperCase();
        const targetRoomId = urlRoomId || savedRoomId;

        if (targetRoomId && token) {
          socket.emit('reconnect_room', { roomId: targetRoomId, playerToken: token }, (res) => {
            if (!res.success) {
              localStorage.removeItem('skribbl_room_id');
            }
          });
        }
      } catch {}
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      try {
        localStorage.setItem('skribbl_room_id', state.roomId);
      } catch {}
      if (state.state !== 'SELECTING_WORD') {
        setWordOptions([]);
      }
    });

    socket.on('word_options', (options) => {
      setWordOptions(options);
    });

    socket.on('chat_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('timer_tick', (secondsLeft) => {
      setRoomState((prev) => (prev ? { ...prev, secondsLeft } : null));
    });

    socket.on('error_message', (err) => {
      setErrorMessage(err);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(
    (
      playerName: string,
      settings?: Partial<RoomSettings>
    ): Promise<{ success: boolean; roomId?: string; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'سوکت متصل نیست' });
        const playerToken = getPlayerToken();
        socketRef.current.emit('create_room', { playerName, playerToken, settings }, (res) => {
          if (res.success && res.roomId) {
            try {
              localStorage.setItem('skribbl_room_id', res.roomId);
            } catch {}
          }
          resolve(res);
        });
      });
    },
    []
  );

  const joinRoom = useCallback(
    (
      roomId: string,
      playerName: string
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'سوکت متصل نیست' });
        const playerToken = getPlayerToken();
        socketRef.current.emit('join_room', { roomId, playerName, playerToken }, (res) => {
          if (res.success) {
            try {
              localStorage.setItem('skribbl_room_id', roomId);
            } catch {}
          }
          resolve(res);
        });
      });
    },
    []
  );

  const reconnectRoom = useCallback(
    (roomId: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'سوکت متصل نیست' });
        const playerToken = getPlayerToken();
        socketRef.current.emit('reconnect_room', { roomId, playerToken }, (res) => {
          if (res.success) {
            try {
              localStorage.setItem('skribbl_room_id', roomId);
            } catch {}
          }
          resolve(res);
        });
      });
    },
    []
  );

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
  }, []);

  const restartGame = useCallback(() => {
    socketRef.current?.emit('restart_game');
  }, []);

  const selectWord = useCallback((word: string) => {
    socketRef.current?.emit('select_word', word);
    setWordOptions([]);
  }, []);

  const drawStroke = useCallback((stroke: DrawStroke) => {
    socketRef.current?.emit('draw_stroke', stroke);
  }, []);

  const clearCanvas = useCallback(() => {
    socketRef.current?.emit('clear_canvas');
  }, []);

  const sendGuess = useCallback((text: string) => {
    socketRef.current?.emit('send_guess', text);
  }, []);

  const leaveRoom = useCallback(() => {
    try {
      localStorage.removeItem('skribbl_room_id');
    } catch {}
    setRoomState(null);
    setWordOptions([]);
    setMessages([]);
    socketRef.current?.disconnect();
    socketRef.current?.connect();
  }, []);

  return {
    socket: socketRef.current,
    connected,
    roomState,
    messages,
    wordOptions,
    errorMessage,
    createRoom,
    joinRoom,
    reconnectRoom,
    leaveRoom,
    startGame,
    restartGame,
    selectWord,
    drawStroke,
    clearCanvas,
    sendGuess,
    setErrorMessage
  };
}


