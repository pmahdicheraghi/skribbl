import type {
  Player,
  GameState,
  DrawStroke,
  RoomSettings,
  RoomPublicState
} from '../../shared/types.js';
import { normalizePersian, levenshteinDistance } from './normalizer.js';
import { getRandomPersianWords } from './words.js';

export interface GuessResult {
  isCorrect: boolean;
  isClose?: boolean;
  scoreEarned?: number;
  allGuessed?: boolean;
}

export class Room {
  public readonly roomId: string;
  public state: GameState = 'LOBBY';
  public players: Player[] = [];
  public settings: RoomSettings;

  public currentRound: number = 1;
  public currentDrawerIndex: number = 0;
  public currentDrawerId: string | null = null;
  public secretWord: string = '';
  public wordOptions: string[] = [];

  public secondsLeft: number = 0;
  public canvasHistory: DrawStroke[] = [];
  public hintIndicesToReveal: number[] = [];
  public revealedHintIndices: Set<number> = new Set();

  private timerInterval: NodeJS.Timeout | null = null;
  private stateChangeCallback?: () => void;
  private timerTickCallback?: (seconds: number) => void;

  constructor(
    roomId: string,
    hostName: string,
    hostSocketId: string,
    hostTokenOrSettings?: string | Partial<RoomSettings>,
    settings?: Partial<RoomSettings>
  ) {
    this.roomId = roomId;
    let token = hostSocketId;
    let s: Partial<RoomSettings> | undefined = settings;

    if (typeof hostTokenOrSettings === 'string') {
      token = hostTokenOrSettings;
    } else if (typeof hostTokenOrSettings === 'object') {
      s = hostTokenOrSettings;
    }

    this.settings = {
      maxRounds: s?.maxRounds ?? 3,
      roundDurationSec: s?.roundDurationSec ?? 80,
      customWords: s?.customWords ?? [],
      wordDifficulty: s?.wordDifficulty ?? 'all'
    };

    this.players.push({
      id: hostSocketId,
      token,
      name: hostName,
      score: 0,
      isHost: true,
      hasGuessedCorrectly: false,
      disconnected: false
    });
  }

  public setCallbacks(callbacks: {
    onStateChange?: () => void;
    onTimerTick?: (seconds: number) => void;
  }) {
    this.stateChangeCallback = callbacks.onStateChange;
    this.timerTickCallback = callbacks.onTimerTick;
  }

  public addPlayer(name: string, socketId: string, token?: string): Player {
    const isHost = this.players.length === 0;
    const player: Player = {
      id: socketId,
      token: token || socketId,
      name,
      score: 0,
      isHost,
      hasGuessedCorrectly: false,
      disconnected: false
    };
    this.players.push(player);
    return player;
  }

  public reconnectPlayer(token: string, newSocketId: string): Player | null {
    const player = this.players.find(p => p.token === token);
    if (!player) return null;

    const oldSocketId = player.id;
    player.id = newSocketId;
    player.disconnected = false;

    if (this.currentDrawerId === oldSocketId) {
      this.currentDrawerId = newSocketId;
    }

    this.stateChangeCallback?.();
    return player;
  }

  public markPlayerDisconnected(socketId: string): Player | null {
    const player = this.players.find(p => p.id === socketId);
    if (!player) return null;
    player.disconnected = true;
    this.stateChangeCallback?.();
    return player;
  }

  public removePlayer(socketId: string): void {
    const index = this.players.findIndex(p => p.id === socketId);
    if (index === -1) return;

    const wasHost = this.players[index].isHost;
    const wasDrawer = this.currentDrawerId === socketId;

    this.players.splice(index, 1);

    if (wasHost && this.players.length > 0) {
      const nextHost = this.players.find(p => !p.disconnected) || this.players[0];
      if (nextHost) nextHost.isHost = true;
    }

    if (this.players.length < 2 && (this.state === 'DRAWING' || this.state === 'SELECTING_WORD')) {
      this.clearTimer();
      this.state = 'LOBBY';
      this.stateChangeCallback?.();
      return;
    }

    if (wasDrawer && (this.state === 'DRAWING' || this.state === 'SELECTING_WORD')) {
      this.advanceTurn();
    }
  }

  public startGame(requestingSocketId: string): boolean {
    const player = this.players.find(p => p.id === requestingSocketId);
    if (!player || !player.isHost) return false;
    if (this.players.length < 2) return false;

    this.currentRound = 1;
    this.currentDrawerIndex = 0;
    for (const p of this.players) {
      p.score = 0;
      p.hasGuessedCorrectly = false;
    }

    this.startWordSelection();
    return true;
  }

  private startWordSelection(): void {
    this.clearTimer();
    this.state = 'SELECTING_WORD';
    this.canvasHistory = [];
    this.secretWord = '';
    this.revealedHintIndices.clear();
    this.hintIndicesToReveal = [];

    for (const p of this.players) {
      p.hasGuessedCorrectly = false;
    }

    if (this.currentDrawerIndex >= this.players.length) {
      this.currentDrawerIndex = 0;
    }

    const drawer = this.players[this.currentDrawerIndex];
    this.currentDrawerId = drawer ? drawer.id : null;

    this.wordOptions = getRandomPersianWords(3, this.settings.customWords, this.settings.wordDifficulty);
    this.secondsLeft = 15;

    this.stateChangeCallback?.();

    this.timerInterval = setInterval(() => {
      this.secondsLeft--;
      this.timerTickCallback?.(this.secondsLeft);

      if (this.secondsLeft <= 0) {
        this.clearTimer();
        // Auto select first word on timeout
        this.selectWord(this.currentDrawerId || '', this.wordOptions[0] || 'سیب');
      }
    }, 1000);
    this.timerInterval.unref?.();
  }

  public selectWord(socketId: string, word: string): boolean {
    if (this.state !== 'SELECTING_WORD') return false;
    if (this.currentDrawerId !== socketId) return false;

    this.clearTimer();
    this.secretWord = word;
    this.state = 'DRAWING';
    this.secondsLeft = this.settings.roundDurationSec;
    this.revealedHintIndices.clear();

    // Determine non-space letter indices
    const letterIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ' ') {
        letterIndices.push(i);
      }
    }

    // Determine max hints: at most half the word, capped at 3 hints
    const maxHints = Math.min(3, Math.floor((letterIndices.length - 1) / 2));

    // Fisher-Yates shuffle to pick random letter indices
    const shuffled = [...letterIndices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[j], shuffled[i]] = [shuffled[i], shuffled[j]];
    }
    this.hintIndicesToReveal = shuffled.slice(0, maxHints);

    this.stateChangeCallback?.();

    this.timerInterval = setInterval(() => {
      this.secondsLeft--;
      this.timerTickCallback?.(this.secondsLeft);
      this.checkHintReveal();

      if (this.secondsLeft <= 0) {
        this.clearTimer();
        this.endRound();
      }
    }, 1000);
    this.timerInterval.unref?.();

    return true;
  }

  public checkHintReveal(): boolean {
    if (this.state !== 'DRAWING' || !this.secretWord || this.hintIndicesToReveal.length === 0) {
      return false;
    }

    let newlyRevealed = false;
    const totalHints = this.hintIndicesToReveal.length;

    for (let k = 0; k < totalHints; k++) {
      const threshold = Math.floor(
        this.settings.roundDurationSec * (1 - (k + 1) / (totalHints + 1))
      );
      const targetIndex = this.hintIndicesToReveal[k];
      if (this.secondsLeft <= threshold && !this.revealedHintIndices.has(targetIndex)) {
        this.revealedHintIndices.add(targetIndex);
        newlyRevealed = true;
      }
    }

    if (newlyRevealed) {
      this.stateChangeCallback?.();
    }

    return newlyRevealed;
  }

  public addStroke(stroke: DrawStroke): void {
    this.canvasHistory.push(stroke);
  }

  public clearCanvas(): void {
    this.canvasHistory = [];
  }

  public processGuess(socketId: string, text: string, autoEndRound: boolean = false): GuessResult {
    if (this.state !== 'DRAWING' || !this.secretWord) {
      return { isCorrect: false };
    }

    const player = this.players.find(p => p.id === socketId);
    if (!player || player.id === this.currentDrawerId || player.hasGuessedCorrectly) {
      return { isCorrect: false };
    }

    const normalizedGuess = normalizePersian(text);
    const normalizedSecret = normalizePersian(this.secretWord);

    if (normalizedGuess === normalizedSecret) {
      player.hasGuessedCorrectly = true;
      const scoreEarned = Math.floor((this.secondsLeft / this.settings.roundDurationSec) * 500) + 50;
      player.score += scoreEarned;

      const drawer = this.players.find(p => p.id === this.currentDrawerId);
      if (drawer) {
        drawer.score += 50;
      }

      // Check if all non-drawers guessed correctly
      const nonDrawers = this.players.filter(p => p.id !== this.currentDrawerId);
      const allGuessed = nonDrawers.every(p => p.hasGuessedCorrectly);

      if (allGuessed) {
        this.clearTimer();
        if (autoEndRound) {
          this.endRound();
        }
      }

      return { isCorrect: true, scoreEarned, allGuessed };
    }

    const distance = levenshteinDistance(normalizedGuess, normalizedSecret);
    if (distance === 1) {
      return { isCorrect: false, isClose: true };
    }

    return { isCorrect: false, isClose: false };
  }

  public endRound(): void {
    this.clearTimer();
    this.state = 'ROUND_ENDED';
    this.secondsLeft = 5;

    this.stateChangeCallback?.();

    this.timerInterval = setInterval(() => {
      this.secondsLeft--;
      this.timerTickCallback?.(this.secondsLeft);

      if (this.secondsLeft <= 0) {
        this.clearTimer();
        this.advanceTurn();
      }
    }, 1000);
    this.timerInterval.unref?.();
  }

  public advanceTurn(): void {
    this.clearTimer();
    this.currentDrawerIndex++;

    // If all players have drawn in this round
    if (this.currentDrawerIndex >= this.players.length) {
      this.currentDrawerIndex = 0;
      this.currentRound++;

      if (this.currentRound > this.settings.maxRounds) {
        this.state = 'GAME_OVER';
        this.stateChangeCallback?.();
        return;
      }
    }

    this.startWordSelection();
  }

  public restartToLobby(socketId: string): boolean {
    const player = this.players.find(p => p.id === socketId);
    if (!player || !player.isHost) return false;

    this.clearTimer();
    this.state = 'LOBBY';
    this.currentRound = 1;
    this.currentDrawerIndex = 0;
    this.secretWord = '';
    this.canvasHistory = [];
    this.revealedHintIndices.clear();
    this.hintIndicesToReveal = [];

    for (const p of this.players) {
      p.score = 0;
      p.hasGuessedCorrectly = false;
    }

    this.stateChangeCallback?.();
    return true;
  }

  public getPublicState(forSocketId?: string): RoomPublicState {
    const isDrawer = forSocketId === this.currentDrawerId;
    const isOverOrEnded = this.state === 'ROUND_ENDED' || this.state === 'GAME_OVER';
    const player = this.players.find(p => p.id === forSocketId);
    const hasGuessed = player ? player.hasGuessedCorrectly : false;

    let wordMask = '';
    if (isDrawer || isOverOrEnded || hasGuessed) {
      wordMask = this.secretWord;
    } else if (this.secretWord) {
      wordMask = this.createMask(this.secretWord);
    }

    return {
      roomId: this.roomId,
      state: this.state,
      players: this.players,
      currentDrawerId: this.currentDrawerId,
      currentRound: this.currentRound,
      maxRounds: this.settings.maxRounds,
      secondsLeft: this.secondsLeft,
      wordMask,
      wordLength: this.secretWord.replace(/\s+/g, '').length,
      revealedWord: isOverOrEnded ? this.secretWord : undefined
    };
  }

  private createMask(word: string): string {
    let result = '';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (ch === ' ') {
        result += '   ';
      } else {
        const displayChar = this.revealedHintIndices.has(i) ? ch : '_';
        const needsSpace = result.length > 0 && !result.endsWith('   ');
        result += (needsSpace ? ' ' : '') + displayChar;
      }
    }
    return result;
  }

  public clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
