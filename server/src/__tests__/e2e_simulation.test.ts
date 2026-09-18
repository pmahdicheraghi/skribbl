import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomPublicState,
  ChatMessage
} from '../../../shared/types.js';
import { Room } from '../room.js';

test('End-to-End WebSocket game loop with 2 players', async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

  const rooms = new Map<string, Room>();
  const socketToRoom = new Map<string, string>();

  io.on('connection', (socket) => {
    socket.on('create_room', ({ playerName, settings }, callback) => {
      const roomId = 'TEST-ROOM';
      const room = new Room(roomId, playerName, socket.id, settings);
      rooms.set(roomId, room);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      room.setCallbacks({
        onStateChange: () => {
          for (const p of room.players) {
            io.to(p.id).emit('room_state', room.getPublicState(p.id));
          }
          if (room.state === 'SELECTING_WORD' && room.currentDrawerId) {
            io.to(room.currentDrawerId).emit('word_options', room.wordOptions);
          }
        }
      });

      callback({ success: true, roomId });
      for (const p of room.players) {
        io.to(p.id).emit('room_state', room.getPublicState(p.id));
      }
    });

    socket.on('join_room', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId);
      if (!room) return callback({ success: false, error: 'Not found' });
      room.addPlayer(playerName, socket.id);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);
      callback({ success: true });
      for (const p of room.players) {
        io.to(p.id).emit('room_state', room.getPublicState(p.id));
      }
    });

    socket.on('start_game', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      room.startGame(socket.id);
    });

    socket.on('select_word', (word) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      room.selectWord(socket.id, word);
    });

    socket.on('send_guess', (text) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const res = room.processGuess(socket.id, text);
      if (res.isCorrect) {
        const msg: ChatMessage = {
          id: '1',
          senderName: 'سیستم',
          text: 'حدس درست!',
          type: 'correct'
        };
        io.to(roomId).emit('chat_message', msg);
        for (const p of room.players) {
          io.to(p.id).emit('room_state', room.getPublicState(p.id));
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const port = address.port;
  const url = `http://localhost:${port}`;

  // Connect Client 1 (Host: Ali)
  const client1 = ClientIO(url);
  // Connect Client 2 (Guesser: Sara)
  const client2 = ClientIO(url);

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });

  // Step 1: Ali creates room
  const createRes = await new Promise<{ success: boolean; roomId?: string }>((resolve) => {
    client1.emit('create_room', { playerName: 'علی' }, resolve);
  });
  assert.equal(createRes.success, true);
  assert.equal(createRes.roomId, 'TEST-ROOM');

  // Step 2: Sara joins room
  const joinRes = await new Promise<{ success: boolean }>((resolve) => {
    client2.emit('join_room', { roomId: 'TEST-ROOM', playerName: 'سارا' }, resolve);
  });
  assert.equal(joinRes.success, true);

  // Step 3: Ali starts game
  const wordOptionsPromise = new Promise<string[]>((resolve) => {
    client1.on('word_options', (options) => resolve(options));
  });
  client1.emit('start_game');
  const options = await wordOptionsPromise;
  assert.equal(options.length, 3);

  // Step 4: Ali selects word
  const drawingStatePromise = new Promise<RoomPublicState>((resolve) => {
    client2.on('room_state', (state) => {
      if (state.state === 'DRAWING') resolve(state);
    });
  });
  client1.emit('select_word', 'هواپیما');
  const drawingState = await drawingStatePromise;
  assert.equal(drawingState.state, 'DRAWING');
  assert.equal(drawingState.wordLength, 7); // 'هواپیما' length
  assert.notEqual(drawingState.wordMask, 'هواپیما'); // Masked for Sara

  // Step 5: Sara guesses with Arabic Yeh 'هواپيما'
  const guessPromise = new Promise<ChatMessage>((resolve) => {
    client2.on('chat_message', (msg) => {
      if (msg.type === 'correct') resolve(msg);
    });
  });
  client2.emit('send_guess', 'هواپيما');
  const guessMsg = await guessPromise;
  assert.equal(guessMsg.type, 'correct');

  // Cleanup
  client1.disconnect();
  client2.disconnect();
  for (const r of rooms.values()) {
    r.clearTimer();
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
