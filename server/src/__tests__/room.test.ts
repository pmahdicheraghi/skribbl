import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../room.js';

test('Room adds players and assigns host correctly', () => {
  const room = new Room('TEST1', 'Ali', 'socket_1');
  assert.equal(room.roomId, 'TEST1');
  assert.equal(room.players.length, 1);
  assert.equal(room.players[0].name, 'Ali');
  assert.equal(room.players[0].isHost, true);

  const player2 = room.addPlayer('Sara', 'socket_2');
  assert.equal(room.players.length, 2);
  assert.equal(player2.isHost, false);
});

test('Room starts game and rotates to word selection', () => {
  const room = new Room('TEST2', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');

  const started = room.startGame('socket_1');
  assert.equal(started, true);
  assert.equal(room.state, 'SELECTING_WORD');
  assert.equal(room.currentDrawerId, 'socket_1');
  assert.equal(room.wordOptions.length, 3);
});

test('Room processes guess matching and scoring', () => {
  const room = new Room('TEST3', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');
  room.startGame('socket_1');
  room.selectWord('socket_1', 'هواپیما');
  assert.equal(room.state, 'DRAWING');

  // Guesser types guess with Arabic Yeh
  const result = room.processGuess('socket_2', 'هواپيما');
  assert.equal(result.isCorrect, true);

  const guesser = room.players.find(p => p.id === 'socket_2');
  const drawer = room.players.find(p => p.id === 'socket_1');

  assert.ok(guesser!.score > 0);
  assert.ok(drawer!.score > 0);
  assert.equal(guesser!.hasGuessedCorrectly, true);
  // Since Sara was the only guesser, all non-drawers guessed correctly -> round ends
  assert.equal(result.allGuessed, true);
});

test('Room detects near miss when guess is 1 edit distance away', () => {
  const room = new Room('TEST4', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');
  room.startGame('socket_1');
  room.selectWord('socket_1', 'گربه');

  const result = room.processGuess('socket_2', 'بربه');
  assert.equal(result.isCorrect, false);
  assert.equal(result.isClose, true);
});

test('Room masks word for guessers and reveals for drawer', () => {
  const room = new Room('TEST5', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');
  room.startGame('socket_1');
  room.selectWord('socket_1', 'سیب سرخ'); // 3 chars, space, 3 chars

  const drawerState = room.getPublicState('socket_1');
  assert.equal(drawerState.wordMask, 'سیب سرخ');

  const guesserState = room.getPublicState('socket_2');
  assert.equal(guesserState.wordMask, '_ _ _   _ _ _');
});

test('Room gradually reveals hint letters as secondsLeft decreases', () => {
  const room = new Room('TEST6', 'Ali', 'socket_1', { roundDurationSec: 80 });
  room.addPlayer('Sara', 'socket_2');
  room.startGame('socket_1');
  room.selectWord('socket_1', 'دایناسور'); // 8 chars, max 3 hints

  assert.equal(room.hintIndicesToReveal.length, 3);
  assert.equal(room.revealedHintIndices.size, 0);

  // Initially, all letters are masked
  let state = room.getPublicState('socket_2');
  assert.equal(state.wordMask.split(' ').filter(c => c === '_').length, 8);

  // First hint threshold: 80 * (1 - 1/4) = 60s
  room.secondsLeft = 60;
  room.checkHintReveal();
  assert.equal(room.revealedHintIndices.size, 1);
  state = room.getPublicState('socket_2');
  assert.equal(state.wordMask.split(' ').filter(c => c === '_').length, 7);

  // Second hint threshold: 80 * (1 - 2/4) = 40s
  room.secondsLeft = 40;
  room.checkHintReveal();
  assert.equal(room.revealedHintIndices.size, 2);
  state = room.getPublicState('socket_2');
  assert.equal(state.wordMask.split(' ').filter(c => c === '_').length, 6);

  // Third hint threshold: 80 * (1 - 3/4) = 20s
  room.secondsLeft = 20;
  room.checkHintReveal();
  assert.equal(room.revealedHintIndices.size, 3);
  state = room.getPublicState('socket_2');
  assert.equal(state.wordMask.split(' ').filter(c => c === '_').length, 5);
});

test('Player who guessed correctly sees full secret word while others see mask', () => {
  const room = new Room('TEST7', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');
  room.addPlayer('Reza', 'socket_3');
  room.startGame('socket_1');
  room.selectWord('socket_1', 'هویج');

  // Sara guesses correctly
  room.processGuess('socket_2', 'هویج');

  // Sara now sees the full word
  const saraState = room.getPublicState('socket_2');
  assert.equal(saraState.wordMask, 'هویج');

  // Reza (hasn't guessed) still sees the masked word
  const rezaState = room.getPublicState('socket_3');
  assert.equal(rezaState.wordMask, '_ _ _ _');
});

test('Room reconnects host preserving isHost status and score', () => {
  const room = new Room('R_RECON', 'Ali', 'socket_old', 'token_host_123');
  room.addPlayer('Sara', 'socket_2', 'token_sara_456');

  // Mark host disconnected
  room.markPlayerDisconnected('socket_old');
  assert.equal(room.players[0].disconnected, true);

  // Host reconnects with new socket ID
  const reconnected = room.reconnectPlayer('token_host_123', 'socket_new');
  assert.ok(reconnected);
  assert.equal(reconnected.id, 'socket_new');
  assert.equal(reconnected.isHost, true);
  assert.equal(reconnected.disconnected, false);
});

test('Room restartToLobby resets scores and round while keeping players', () => {
  const room = new Room('R_RESET', 'Ali', 'socket_1');
  room.addPlayer('Sara', 'socket_2');
  room.players[0].score = 250;
  room.players[1].score = 180;
  room.state = 'GAME_OVER';

  const nonHostSuccess = room.restartToLobby('socket_2');
  assert.equal(nonHostSuccess, false);

  const hostSuccess = room.restartToLobby('socket_1');
  assert.equal(hostSuccess, true);
  assert.equal(room.state, 'LOBBY');
  assert.equal(room.currentRound, 1);
  assert.equal(room.players[0].score, 0);
  assert.equal(room.players[1].score, 0);
  assert.equal(room.players.length, 2);
});

