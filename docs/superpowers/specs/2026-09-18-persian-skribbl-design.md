# Persian Skribbl Clone - Design Specification

**Date:** 2026-09-18  
**Status:** Approved  
**Author:** Pair Programming Assistant & User

---

## 1. Overview & Objectives
Build a lightweight, responsive multiplayer drawing-and-guessing web game (inspired by skribbl.io) tailored specifically for Persian (Farsi) speakers.
Key elements:
- Hand-drawn sketchy visual aesthetic powered by [Wired Elements](https://wiredjs.com/).
- Native Persian RTL interface with Vazirmatn typography.
- Curated Persian word bank (Animals, Objects, Food, etc.) with host-configurable custom words.
- Persian text normalizer to handle Arabic/Persian character variations (`ی/ي`, `ک/ك`), diacritics, and half-spaces (`نیم‌فاصله`).
- Room-based multiplayer architecture using WebSockets (`socket.io`).

---

## 2. Architecture & Tech Stack

### Tech Stack
- **Backend:** Node.js, TypeScript, Express, Socket.io.
- **Frontend:** React, Vite, TypeScript, `wired-elements`.
- **Styling:** CSS3 with RTL (`dir="rtl"`), Vazirmatn Persian web font.
- **Protocol:** Real-time WebSockets with typed client/server events.

### Project Structure
```text
skribbl/
├── package.json              # Root workspace scripts
├── shared/
│   └── types.ts              # Shared game models & Socket.io event interfaces
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Express + Socket.io entry point
│       ├── room.ts           # Room state machine & lifecycle management
│       ├── words.ts          # Curated Persian dictionary & random picker
│       ├── normalizer.ts     # Persian text normalization & Levenshtein distance
│       └── __tests__/
│           └── game.test.ts  # Assert-based automated test suite
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx           # Router / Main app view
        ├── main.tsx          # React root
        ├── components/
        │   ├── Lobby.tsx     # Room creation, join, and settings
        │   ├── GameView.tsx  # In-game layout (RTL)
        │   ├── Canvas.tsx    # Responsive HTML5 canvas (pen, eraser, clear)
        │   ├── Chat.tsx      # Persian chat & guess input
        │   ├── PlayerList.tsx# Scoreboard & current drawer indicator
        │   └── WordModal.tsx # 3-word selection modal for drawer
        ├── hooks/
        │   └── useSocket.ts  # Socket.io connection hook
        └── utils/
            └── canvas.ts     # Coordinate normalization & drawing helpers
```

---

## 3. Data Models & Protocols (`shared/types.ts`)

### Player & Room Models
```typescript
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
```

### WebSocket Event Contract
```typescript
export interface ClientToServerEvents {
  create_room: (data: { playerName: string; settings?: Partial<RoomSettings> }, callback: (res: { success: boolean; roomId?: string; error?: string }) => void) => void;
  join_room: (data: { roomId: string; playerName: string }, callback: (res: { success: boolean; error?: string }) => void) => void;
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
```

---

## 4. Game Lifecycle & Logic

1. **Lobby (`LOBBY`)**:
   - Host configures rounds (1–5, default 3), time (30–120s, default 80s), and optional custom Persian words.
   - Host starts when $\ge 2$ players are in the room.

2. **Word Selection (`SELECTING_WORD`)**:
   - Rotates drawer sequentially.
   - Server picks 3 words (curated Persian bank + host custom words).
   - Only drawer receives `word_options`. Drawer has 15 seconds to select. If timeout, auto-selects.

3. **Drawing & Guessing (`DRAWING`)**:
   - Drawer receives full word; guessers receive underscores (`_ _ _ _ (۴ حرف)`).
   - Canvas strokes are normalized $(0.0 \dots 1.0)$ and broadcast; server keeps in-memory stroke history.
   - Non-drawer guesses are normalized:
     - Exact match: Awards $\lfloor (\text{secondsLeft} / \text{totalSeconds}) \times 500 \rfloor + 50$ to guesser, $+50$ to drawer. Announces correct guess. Guesser's subsequent messages are filtered so word is not leaked.
     - Levenshtein distance = 1: Sends private hint `«خیلی نزدیک شدی!»` to the guesser.
     - Regular message: Broadcast to room chat.
   - If all non-drawers guess correctly, round terminates early.

4. **Round End (`ROUND_ENDED`)**:
   - Word revealed to all players for 5 seconds.
   - Canvas cleared.
   - Next drawer chosen or next round started.

5. **Game Over (`GAME_OVER`)**:
   - Displays podium and final scoreboard.
   - Host can reset room back to `LOBBY`.

---

## 5. Persian Text Normalization (`normalizer.ts`)
To accommodate differences between Persian and Arabic keyboards and typing habits:
1. **Character Unification**: Maps `ي` $\rightarrow$ `ی`, `ك` $\rightarrow$ `ک`, `[آأإ]` $\rightarrow$ `ا`, `[ةۀ]` $\rightarrow$ `ه`.
2. **Diacritics Stripping**: Removes harakat/tanween (`[\u064B-\u065F\u0670]`).
3. **Half-Space & Whitespace Normalization**: Replaces ZWNJ (`\u200c`) and duplicate spaces with a single space.
4. **Levenshtein Distance**: Used for close-guess alerts.

---

## 6. Frontend UI/UX with Wired Elements
- **Styling**: `wired-elements` custom web components (`<wired-button>`, `<wired-card>`, `<wired-input>`, etc.) provide a hand-drawn sketchbook aesthetic.
- **RTL**: Global RTL (`dir="rtl"`) with Vazirmatn font.
- **Canvas**:
  - HTML5 Canvas with pointer events (`pointerdown`, `pointermove`, `pointerup`).
  - Tools: Pen (Charcoal `#222222`), Eraser (`#ffffff`), Clear Canvas.
  - Read-only when not drawing.
- **Word Selection Modal**: Styled `<wired-card>` overlay for drawer.

---

## 7. Testing & Verification
- **Automated Tests (`server/src/__tests__/game.test.ts`)**: Built with Node's native test runner (`node --test`). Tests:
  - Persian normalizer rules (Arabic kaf/yeh, diacritics, ZWNJ, whitespace).
  - Levenshtein distance calculation.
  - Word bank random picking and custom word merging.
  - Room state transitions and score calculations.
- **Manual End-to-End Verification**:
  - Two browser tabs playing concurrently: Room creation, drawer selection, real-time drawing sync, chat guess matching, and victory screen.
