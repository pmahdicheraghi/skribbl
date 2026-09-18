import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import cors from 'cors';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessage
} from '../../shared/types.js';
import { Room } from './room.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FA-${id}`;
}

function broadcastRoomState(room: Room) {
  for (const player of room.players) {
    const publicState = room.getPublicState(player.id);
    io.to(player.id).emit('room_state', publicState);
  }
}

function attachRoomCallbacks(room: Room) {
  room.setCallbacks({
    onStateChange: () => {
      broadcastRoomState(room);

      // If in SELECTING_WORD state, send word options to current drawer
      if (room.state === 'SELECTING_WORD' && room.currentDrawerId) {
        io.to(room.currentDrawerId).emit('word_options', room.wordOptions);
      }

      // If round just ended or game over, announce revealed word
      if (room.state === 'ROUND_ENDED' || room.state === 'GAME_OVER') {
        const msg: ChatMessage = {
          id: String(Date.now()),
          senderName: 'سیستم',
          text: `پایان دور! کلمه درست «${room.secretWord}» بود.`,
          type: 'system'
        };
        io.to(room.roomId).emit('chat_message', msg);
      }
    },
    onTimerTick: (seconds) => {
      io.to(room.roomId).emit('timer_tick', seconds);
    }
  });
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName, settings }, callback) => {
    const roomId = generateRoomId();
    const room = new Room(roomId, playerName, socket.id, settings);

    rooms.set(roomId, room);
    socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    attachRoomCallbacks(room);

    callback({ success: true, roomId });
    broadcastRoomState(room);

    const welcomeMsg: ChatMessage = {
      id: String(Date.now()),
      senderName: 'سیستم',
      text: `اتاق «${roomId}» توسط ${playerName} ساخته شد. منتظر سایر بازیکنان باشید!`,
      type: 'system'
    };
    socket.emit('chat_message', welcomeMsg);
  });

  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: 'اتاق یافت نشد!' });
      return;
    }

    if (room.players.some(p => p.name === playerName)) {
      callback({ success: false, error: 'این نام کاربری قبلاً در اتاق استفاده شده است.' });
      return;
    }

    room.addPlayer(playerName, socket.id);
    socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    callback({ success: true });
    broadcastRoomState(room);

    // Send existing canvas history to late joiner
    socket.emit('canvas_history', room.canvasHistory);

    const joinMsg: ChatMessage = {
      id: String(Date.now()),
      senderName: 'سیستم',
      text: `${playerName} به اتاق پیوست.`,
      type: 'system'
    };
    io.to(roomId).emit('chat_message', joinMsg);
  });

  socket.on('start_game', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players.length < 2) {
      socket.emit('error_message', 'برای شروع بازی حداقل به ۲ بازیکن نیاز است.');
      return;
    }

    const started = room.startGame(socket.id);
    if (started) {
      broadcastRoomState(room);
      if (room.currentDrawerId) {
        io.to(room.currentDrawerId).emit('word_options', room.wordOptions);
      }
    }
  });

  socket.on('select_word', (word) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const selected = room.selectWord(socket.id, word);
    if (selected) {
      broadcastRoomState(room);
      io.to(roomId).emit('clear_canvas');
    }
  });

  socket.on('draw_stroke', (stroke) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.state === 'DRAWING' && room.currentDrawerId === socket.id) {
      room.addStroke(stroke);
      socket.to(roomId).emit('draw_stroke', stroke);
    }
  });

  socket.on('clear_canvas', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.state === 'DRAWING' && room.currentDrawerId === socket.id) {
      room.clearCanvas();
      io.to(roomId).emit('clear_canvas');
    }
  });

  socket.on('send_guess', (text) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    // If game is in DRAWING state and player is guessing
    if (room.state === 'DRAWING') {
      const result = room.processGuess(socket.id, trimmed);

      if (result.isCorrect) {
        const correctMsg: ChatMessage = {
          id: String(Date.now()),
          senderName: 'سیستم',
          text: `🎉 ${player.name} کلمه را درست حدس زد! (+${result.scoreEarned} امتیاز)`,
          type: 'correct'
        };
        io.to(roomId).emit('chat_message', correctMsg);
        broadcastRoomState(room);
        return;
      }

      if (result.isClose) {
        // Send close hint to this player privately
        const closeMsg: ChatMessage = {
          id: String(Date.now()),
          senderName: 'سیستم',
          text: `«${trimmed}» خیلی به کلمه نزدیک است!`,
          type: 'close'
        };
        socket.emit('chat_message', closeMsg);
      }
    }

    // Normal chat message
    // If player has already guessed correctly, filter out message from guessers who haven't guessed
    if (player.hasGuessedCorrectly && room.state === 'DRAWING') {
      const chatMsg: ChatMessage = {
        id: String(Date.now()) + Math.random(),
        senderName: player.name,
        text: trimmed,
        type: 'chat'
      };
      // Send only to drawer and players who have already guessed correctly
      for (const p of room.players) {
        if (p.id === room.currentDrawerId || p.hasGuessedCorrectly) {
          io.to(p.id).emit('chat_message', chatMsg);
        }
      }
    } else {
      const chatMsg: ChatMessage = {
        id: String(Date.now()) + Math.random(),
        senderName: player.name,
        text: trimmed,
        type: 'chat'
      };
      io.to(roomId).emit('chat_message', chatMsg);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    socketToRoom.delete(socket.id);

    const room = rooms.get(roomId);
    if (!room) return;

    const leavingPlayer = room.players.find(p => p.id === socket.id);
    room.removePlayer(socket.id);

    if (room.players.length === 0) {
      room.clearTimer();
      rooms.delete(roomId);
    } else {
      if (leavingPlayer) {
        const leaveMsg: ChatMessage = {
          id: String(Date.now()),
          senderName: 'سیستم',
          text: `${leavingPlayer.name} از بازی خارج شد.`,
          type: 'system'
        };
        io.to(roomId).emit('chat_message', leaveMsg);
      }
      broadcastRoomState(room);
    }
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const potentialPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../client/dist')
];
const clientDist = potentialPaths.find(p => fs.existsSync(p));

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Persian Skribbl server running on http://localhost:${PORT}`);
});
