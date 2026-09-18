export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  hasGuessedCorrectly: boolean;
}

export type GameState =
  | 'LOBBY'
  | 'SELECTING_WORD'
  | 'DRAWING'
  | 'ROUND_ENDED'
  | 'GAME_OVER';

export interface DrawPoint {
  x: number; // 0.0 to 1.0 (normalized)
  y: number; // 0.0 to 1.0 (normalized)
}

export interface DrawStroke {
  points: DrawPoint[];
  color: string;
  size: number;
}

export interface RoomSettings {
  maxRounds: number;
  roundDurationSec: number;
  customWords: string[];
}

export interface RoomPublicState {
  roomId: string;
  state: GameState;
  players: Player[];
  currentDrawerId: string | null;
  currentRound: number;
  maxRounds: number;
  secondsLeft: number;
  wordMask: string;          // e.g. "_ _ _ _" for guessers, or actual word for drawer
  wordLength: number;
  revealedWord?: string;     // Populated during ROUND_ENDED or GAME_OVER
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  type: 'chat' | 'system' | 'correct' | 'close';
}

export interface ClientToServerEvents {
  create_room: (
    data: { playerName: string; settings?: Partial<RoomSettings> },
    callback: (res: { success: boolean; roomId?: string; error?: string }) => void
  ) => void;
  join_room: (
    data: { roomId: string; playerName: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;
  start_game: () => void;
  select_word: (word: string) => void;
  draw_stroke: (stroke: DrawStroke) => void;
  clear_canvas: () => void;
  send_guess: (text: string) => void;
}

export interface ServerToClientEvents {
  room_state: (state: RoomPublicState) => void;
  word_options: (words: string[]) => void;
  draw_stroke: (stroke: DrawStroke) => void;
  clear_canvas: () => void;
  canvas_history: (strokes: DrawStroke[]) => void;
  chat_message: (msg: ChatMessage) => void;
  timer_tick: (secondsLeft: number) => void;
  error_message: (err: string) => void;
}
