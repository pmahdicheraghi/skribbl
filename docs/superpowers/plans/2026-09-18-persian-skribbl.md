# Persian Skribbl Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive multiplayer Persian drawing-and-guessing web game (skribbl clone) using Node.js, WebSockets, React, and Wired Elements.

**Architecture:** A full-stack TypeScript monorepo where client and server share strictly typed WebSocket contracts (`shared/types.ts`). The server runs Express and Socket.io with an in-memory room state machine and Persian text normalization engine. The frontend uses React, Vite, HTML5 Canvas with normalized resolution-independent coordinates, and `wired-elements` for a hand-drawn sketchy UI.

**Tech Stack:** Node.js, Express, Socket.io, TypeScript, React, Vite, `wired-elements`, CSS3 (RTL / Vazirmatn).

**Spec:** [`docs/superpowers/specs/2026-09-18-persian-skribbl-design.md`](file:///e:/Programming/Java_Script/skribbl/docs/superpowers/specs/2026-09-18-persian-skribbl-design.md)

## Global Constraints

- Native Persian RTL (`dir="rtl"`) layout across all user-facing interfaces.
- Hand-drawn sketchy visual components powered by `wired-elements`.
- Zero-tolerance for false-negative Persian guesses: All guesses must pass through Persian normalization (`ي/ی`, `ك/ک`, ZWNJ, diacritics removal).
- No git commands (project does not use git).

---

### Task 1: Root Project Scaffolding & Shared Types

**Files:**
- Create: `package.json`
- Create: `shared/types.ts`
- Create: `shared/tsconfig.json`

**Interfaces:**
- Produces: `Player`, `GameState`, `DrawPoint`, `DrawStroke`, `RoomSettings`, `RoomPublicState`, `ChatMessage`, `ClientToServerEvents`, `ServerToClientEvents`.

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "persian-skribbl",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:server": "npm --prefix server run dev",
    "dev:client": "npm --prefix client run dev",
    "build:client": "npm --prefix client run build",
    "test:server": "npm --prefix server test"
  }
}
```

- [ ] **Step 2: Create shared/types.ts**

Define all shared data structures and Socket.io event interfaces as specified in Section 3 of the design doc.

- [ ] **Step 3: Create shared/tsconfig.json and verify TypeScript syntax**

Check that types compile cleanly with `tsc --noEmit`.

---

### Task 2: Server Persian Normalizer & Word Bank with Unit Tests

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/normalizer.ts`
- Create: `server/src/words.ts`
- Test: `server/src/__tests__/normalizer_words.test.ts`

**Interfaces:**
- Produces: `normalizePersian(text: string): string`
- Produces: `levenshteinDistance(a: string, b: string): number`
- Produces: `getRandomPersianWords(count: number, customWords?: string[]): string[]`
- Produces: `PERSIAN_WORD_BANK: string[]`

- [ ] **Step 1: Create server package.json & tsconfig.json**

Dependencies: `express`, `socket.io`, `cors`.  
DevDependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`.

- [ ] **Step 2: Write failing unit tests for normalizer and word bank**

```typescript
// server/src/__tests__/normalizer_words.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePersian, levenshteinDistance } from '../normalizer.js';
import { getRandomPersianWords, PERSIAN_WORD_BANK } from '../words.js';

test('normalizePersian normalizes Arabic characters and diacritics', () => {
  assert.equal(normalizePersian('ساندويچ'), 'ساندویچ');
  assert.equal(normalizePersian('كتاب'), 'کتاب');
  assert.equal(normalizePersian('خَانِه‌'), 'خانه');
  assert.equal(normalizePersian('ماشین‌حساب'), 'ماشین حساب'); // ZWNJ
  assert.equal(normalizePersian('  گربه  '), 'گربه');
});

test('levenshteinDistance computes edit distance correctly', () => {
  assert.equal(levenshteinDistance('گربه', 'گربه'), 0);
  assert.equal(levenshteinDistance('گربه', 'بربه'), 1);
});

test('getRandomPersianWords returns requested number of unique words', () => {
  const words = getRandomPersianWords(3);
  assert.equal(words.length, 3);
  assert.equal(new Set(words).size, 3);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test` via tsx or node loader. Expected: FAIL (modules not implemented yet).

- [ ] **Step 4: Implement normalizer.ts and words.ts**

Implement `normalizePersian`, `levenshteinDistance`, and a rich curated list of at least 100+ common Persian words grouped by everyday categories (Animals, Food, Objects, Places, etc.), plus support for injecting custom words.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test` in `server/`. Expected: PASS.

---

### Task 3: Server Room State Machine & WebSocket Handler

**Files:**
- Create: `server/src/room.ts`
- Create: `server/src/index.ts`
- Test: `server/src/__tests__/room.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `normalizer.ts`, `words.ts`
- Produces: `Room` class, `RoomManager`, Express/Socket.io server.

- [ ] **Step 1: Write failing room state machine unit test**

```typescript
// server/src/__tests__/room.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../room.js';

test('Room adds players and initiates game', () => {
  const room = new Room('TEST1', 'Ali', 'socket_1');
  assert.equal(room.players.length, 1);
  assert.equal(room.players[0].isHost, true);

  room.addPlayer('Sara', 'socket_2');
  assert.equal(room.players.length, 2);

  room.startGame();
  assert.equal(room.state, 'SELECTING_WORD');
  assert.ok(room.currentDrawerId);
});

test('Room handles correct guess and scores correctly', () => {
  const room = new Room('TEST2', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');
  room.startGame();
  room.selectWord('هواپیما');
  assert.equal(room.state, 'DRAWING');

  const guessResult = room.processGuess('socket_2', 'هواپيما'); // Arabic yeh
  assert.equal(guessResult.isCorrect, true);
  assert.ok(room.players.find(p => p.id === 'socket_2')?.score! > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`. Expected: FAIL.

- [ ] **Step 3: Implement room.ts**

Implement `Room` state machine:
- Manages players, host status, active round, timers (`SELECTING_WORD` 15s, `DRAWING` 80s, `ROUND_ENDED` 5s).
- Generates masked word (e.g. `_ _ _ _`) for guessers, revealed word for drawer and post-round.
- Stores `DrawStroke[]` history for reconnection / mid-round joining.
- Calculates speed-based scores for guesser and bonus for drawer.
- Detects early round completion when all non-drawers guess correctly.

- [ ] **Step 4: Implement index.ts**

Set up Express HTTP server and Socket.io server:
- Listen on port 3001.
- Event handlers: `create_room`, `join_room`, `start_game`, `select_word`, `draw_stroke`, `clear_canvas`, `send_guess`, `disconnect`.
- Emit state updates and chat broadcasts with appropriate filters.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test` in `server/`. Expected: PASS.

---

### Task 4: Client Setup (Vite, React, TypeScript, Wired Elements, RTL)

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/index.html`
- Create: `client/src/index.css`
- Create: `client/src/hooks/useSocket.ts`
- Create: `client/src/types/wired-elements.d.ts`

**Interfaces:**
- Produces: `useSocket` hook providing `socket`, `connected`, `roomState`, and event emitters.

- [ ] **Step 1: Create client package.json and install dependencies**

Dependencies: `react`, `react-dom`, `socket.io-client`, `wired-elements`.  
DevDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`.

- [ ] **Step 2: Configure index.html and index.css**

- Load Google Font **Vazirmatn** (`https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700;900&display=swap`).
- Set `dir="rtl"` and `lang="fa"`.
- Style global background with subtle sketch-paper texture and clean hand-drawn typography.
- Add TypeScript JSX declaration in `wired-elements.d.ts` so custom elements (`<wired-button>`, `<wired-card>`, `<wired-input>`, `<wired-dialog>`, `<wired-divider>`) compile cleanly with zero TypeScript JSX errors.

- [ ] **Step 3: Implement client/src/hooks/useSocket.ts**

Create hook that connects to Socket.io server, synchronizes `roomState`, manages chat messages, and provides typed helper functions (`createRoom`, `joinRoom`, `startGame`, `selectWord`, `drawStroke`, `clearCanvas`, `sendGuess`).

---

### Task 5: Client Components (Lobby, Canvas, Chat, PlayerList, WordModal, GameView)

**Files:**
- Create: `client/src/components/Canvas.tsx`
- Create: `client/src/components/Chat.tsx`
- Create: `client/src/components/PlayerList.tsx`
- Create: `client/src/components/WordModal.tsx`
- Create: `client/src/components/Lobby.tsx`
- Create: `client/src/components/GameView.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/main.tsx`

**Interfaces:**
- Consumes: `useSocket`, `shared/types.ts`
- Produces: Full interactive web application.

- [ ] **Step 1: Implement Canvas.tsx**

- HTML5 Canvas with normalized coordinate scaling $(0.0 \dots 1.0)$ so strokes render identically regardless of screen size.
- Drawing tools: Pen (Charcoal `#222222`), Eraser (`#ffffff` with size 24), Clear Canvas button.
- Pointer event listeners (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) with `touch-action: none`.
- If current player is not the drawer, canvas ignores pointer interactions.
- Syncs with `canvas_history` from server on join.

- [ ] **Step 2: Implement Chat.tsx**

- Persian chat feed displaying user messages, green announcements for correct guesses, and private hints (`خیلی نزدیک شدی!`).
- Persian input using `<wired-input>` with placeholder `حدس خود را بنویسید...` and Enter key submission.

- [ ] **Step 3: Implement PlayerList.tsx**

- Card listing all players with their scores.
- Visual icon for current drawer (`✏️`) and checkmark (`✅`) for players who guessed correctly in the current round.

- [ ] **Step 4: Implement WordModal.tsx**

- Active only for current drawer during `SELECTING_WORD` state.
- Shows 3 Persian word buttons (`<wired-button>`) and a 15-second countdown bar.

- [ ] **Step 5: Implement Lobby.tsx & GameView.tsx**

- `Lobby.tsx`: Create room with username, round count, duration, and custom words textarea. Join room with room code. Copy invite link button.
- `GameView.tsx`: Top bar (round counter, timer, masked word), layout assembling `PlayerList`, `Canvas`, and `Chat`. Includes winner podium on `GAME_OVER`.
- `App.tsx`: Renders `Lobby` when not in a room, `GameView` when inside an active room.

---

### Task 6: Full-Stack Verification & End-to-End Testing

**Files:**
- Modify: `server/package.json` (ensure build and start scripts)
- Modify: `client/package.json` (ensure build scripts)

- [ ] **Step 1: Run server automated test suite**

Run: `npm run test:server`
Expected: All tests for normalizer, word bank, and room state machine pass.

- [ ] **Step 2: Build client assets**

Run: `npm run build:client`
Expected: TypeScript check passes, Vite builds production bundle without warnings or errors.

- [ ] **Step 3: Dual-Player End-to-End Simulation**

Start dev server and test:
1. Client 1 creates room "FA-TEST" as "علی", adds custom word "هلوکاپتر".
2. Client 2 joins room as "سارا".
3. Host starts game.
4. "علی" receives 3 words, selects one.
5. "علی" draws on canvas; "سارا" sees strokes synchronized immediately.
6. "سارا" types Arabic-spelled guess "هلوكاپتر"; server normalizes, awards points, and announces victory in chat.
7. Round concludes and scoreboard updates accurately.
