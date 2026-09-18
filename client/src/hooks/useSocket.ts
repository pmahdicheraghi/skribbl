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
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
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
        socketRef.current.emit('create_room', { playerName, settings }, (res) => {
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
        socketRef.current.emit('join_room', { roomId, playerName }, (res) => {
          resolve(res);
        });
      });
    },
    []
  );

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
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

  return {
    socket: socketRef.current,
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
  };
}
