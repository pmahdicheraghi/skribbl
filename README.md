# Persian Skribbl (اسکربل فارسی)

A real-time multiplayer drawing and guessing game built specifically for Persian (Farsi) speakers, inspired by Skribbl.io. Built with **React 18**, **Node.js/Express**, **Socket.IO**, and styled with a hand-drawn sketchbook aesthetic using **Wired Elements** and **Rough.js**.

---

## 🎨 Features & Highlights

- **Hand-Drawn "Rough" Aesthetic**:
  - Entire UI is styled like an interactive sketchbook powered by [`wired-elements`](https://wiredjs.com/) and [`roughjs`](https://roughjs.com/).
  - Custom sketchy SVG components: speech bubbles, banners, pills, circular badges, and cards.
  - Persian typography using `Dastnevis` handwriting font with `Vazirmatn` fallback in a full RTL layout.

- **Intelligent Persian Text Normalization**:
  - Handles Arabic/Persian keyboard character differences (e.g. unifying `ي` $\rightarrow$ `ی` and `ك` $\rightarrow$ `ک`).
  - Automatically strips diacritics / harakat (`َ ُ ِ ً ٍ ٌ ّ ْ`).
  - Normalizes half-spaces (ZWNJ `\u200c`) and duplicate whitespace.
  - Levenshtein distance check detects near-misses (1 character difference) and alerts guessers privately (*«خیلی نزدیک شدی!»*).

- **Pure Proportional Scoring (Bonus-Free)**:
  - **Guesser Score** ($0 \dots 500$ pts): Strictly proportional to remaining time when the guess is submitted:
    $$\text{Guesser Score} = \text{Math.round}\left(\frac{\text{secondsLeft}}{\text{roundDurationSec}} \times 500\right)$$
  - **Drawer Score** ($0 \dots 500$ pts max): Earns the room's average performance per correct guess:
    $$\text{Drawer Score per guess} = \text{Math.round}\left(\frac{\text{Guesser Score}}{N_{\text{guessers}}}\right)$$
    *(where $N_{\text{guessers}} = \text{total players} - 1$)*
  - Perfectly balanced across room sizes (2 to 10+ players) without arbitrary fixed bonuses.

- **Mobile Keyboard Experience**:
  - Responsive layout for mobile devices ($\le 768\text{px}$).
  - Automatically collapses the chat feed and player chips when the virtual keyboard opens or when input is focused, docking the input bar at the bottom and keeping the canvas 100% visible while typing.
  - Re-expands automatically on submit or blur.

- **Real-Time Canvas & Reliable Clearing**:
  - Subpixel DPR scaling with normalized coordinates $(0.0 \dots 1.0)$ ensuring drawings scale identically across different screen resolutions.
  - Pen, eraser, and color palette.
  - Centralized canvas lifecycle: canvas automatically wipes clean on word selection, turn advances, and timeouts.

- **Reconnection & Resilience**:
  - Persistent player tokens (`localStorage`) with a 45-second reconnect grace period preserving player score and host privileges.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Socket.IO Client, Wired Elements, Rough.js |
| **Backend** | Node.js, Express, Socket.IO, TypeScript, tsx |
| **Architecture** | npm workspaces monorepo (`client`, `server`, `shared`) |
| **Styling & Fonts** | CSS Modules / Global CSS, Hand-drawn Persian fonts (`Dastnevis`, `Vazirmatn`) |
| **Testing** | Node native test runner (`node --test`), tsx |

---

## 📁 Project Structure

```text
skribbl/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # Canvas, Chat, Lobby, PlayerList, WordModal
│   │   │   └── rough/           # Reusable Rough.js SVG components
│   │   ├── hooks/               # useSocket hook (auto dev/prod switching)
│   │   ├── index.css            # Sketchbook theme, responsive rules, mobile collapse
│   │   └── App.tsx              # Root game routing & state
│   ├── package.json
│   └── vite.config.ts           # Vite dev config
├── server/                      # Express + Socket.IO backend
│   ├── src/
│   │   ├── __tests__/           # Unit and E2E simulation tests
│   │   ├── normalizer.ts        # Persian text cleaner & Levenshtein distance
│   │   ├── room.ts              # Room state machine, turn timers, scoring
│   │   ├── words.ts             # Curated Persian word bank & difficulty levels
│   │   └── index.ts             # Express server, Socket.IO events, static serving
│   └── package.json
├── shared/                      # Shared TypeScript types & interfaces
│   └── types.ts
├── Dockerfile                   # Multi-stage production container
└── package.json                 # Monorepo root scripts & workspaces
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Installation
Clone the repository and install all workspace dependencies from the root directory:
```bash
git clone <repo-url>
cd skribbl
npm install
```

---

## 💻 Development & Live Reload

There are two recommended ways to run the project locally:

### Option 1: True Live Reload with Vite HMR (Recommended)

Run the backend and frontend concurrently in two terminals:

1. **Terminal 1 — Backend (`tsx watch`)**:
   ```bash
   npm run dev:server
   ```
   *Starts the Node/Socket.IO backend on `http://localhost:3001` with auto-restart on changes.*

2. **Terminal 2 — Frontend (`vite`)**:
   ```bash
   npm run dev:client
   ```
   *Starts the Vite dev server on `http://localhost:5173` with Hot Module Replacement (HMR).*

3. Open **`http://localhost:5173`** in your browser.
   - Any edits to components or styles reload instantly without refreshing the page or disconnecting players.
   - The frontend automatically routes Socket.IO traffic directly to port `3001` during development.

---

### Option 2: Single-Port Production Mode (`http://localhost:3001`)

If you want to run the full application on a single port (serving the compiled frontend bundle directly from Express):

```bash
# Build client and server
npm run build

# Start production server
npm start
```
Open **`http://localhost:3001`**.

> **Tip for Single-Port Dev**: To automatically rebuild `client/dist` whenever you edit client code, run:
> ```bash
> npm --workspace=client run build -- --watch
> ```
> Then run `npm run dev:server` in another terminal.

---

## 🧪 Testing

The backend includes 21 unit and end-to-end simulation tests powered by Node's native test runner (`node --test`).

Run all tests:
```bash
npm test
```

### What is tested:
- **Persian Text Normalizer**: Arabic characters (`ي`, `ك`), harakat removal, half-spaces (`\u200c`), duplicate spaces.
- **Levenshtein Distance**: Near-miss detection within 1 edit distance.
- **Word Bank**: Unique selection, custom word injection, difficulty filtering.
- **Scoring Formulas**: Proportional scoring verification for 2-player and multiplayer rooms.
- **Game Lifecycle**: Word selection timeouts, turn rotation, canvas history resets on round transitions.
- **E2E WebSocket Simulation**: Multi-player game loop, host disconnect & reconnect, room restarts.

To verify frontend TypeScript types and build:
```bash
npm --workspace=client run build
```

---

## 🎮 How to Play

1. **Create or Join a Room**:
   - Host enters a name and configures rounds (1–5), round time (30–120s), word difficulty, and optional custom Persian words.
   - Other players join via the 4-character room code or via the shareable invite link.
2. **Word Selection (`SELECTING_WORD`)**:
   - The drawer has 15 seconds to choose 1 of 3 Persian words. If time expires, a word is chosen automatically.
3. **Drawing & Guessing (`DRAWING`)**:
   - The drawer sketches the word on the canvas.
   - Guessers type their guesses in the chat.
   - Exact match awards time-based points and hides the secret word from being spoiled in chat.
   - Near misses (1 letter off) receive a private yellow alert.
4. **Round End (`ROUND_ENDED`)**:
   - The secret word is revealed for 5 seconds.
   - Canvas clears and turn advances to the next player.
5. **Game Over (`GAME_OVER`)**:
   - Displays the podium with final scores.
   - Host can click restart to play a new game with the same group.

---

## 📱 Mobile Testing Tips

To test the mobile-optimized chat collapse:
1. Open Chrome DevTools (`F12` or `Ctrl+Shift+I`).
2. Toggle the Device Toolbar (`Ctrl+Shift+M`) and select a mobile view (e.g., **iPhone 14** or **Pixel 7**).
3. Start a game, and click into the chat input:
   - Notice how `.sidebar-players` and `.chat-messages` instantly hide via `:focus-within`.
   - The canvas stays completely visible while typing.
   - Unfocusing or sending a message immediately restores the chat history.

---

## 🐳 Docker Deployment

You can build and run Persian Skribbl in a lightweight Docker container:

```bash
# Build the Docker image
docker build -t persian-skribbl .

# Run container on port 3001
docker run -p 3001:3001 persian-skribbl
```

Access the game at `http://localhost:3001`.

---

## ❓ Troubleshooting & FAQ

#### `Error: listen EADDRINUSE: address already in use :::3001`
A previous server instance is already running on port 3001. Stop the previous terminal or terminate the process holding port 3001:
- **Windows (PowerShell)**:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 -State Listen).OwningProcess -Force
  ```
- **macOS / Linux**:
  ```bash
  kill -9 $(lsof -ti:3001)
  ```

#### How do I test with other devices on my local network (Wi-Fi)?
1. Find your machine's local IP address (e.g. `192.168.1.100` via `ipconfig` or `ifconfig`).
2. Run Vite with the `--host` flag:
   ```bash
   npm --workspace=client run dev -- --host
   ```
3. Open `http://<YOUR_LOCAL_IP>:5173` on your phone or other computers connected to the same Wi-Fi.

---

## 📄 License
MIT
