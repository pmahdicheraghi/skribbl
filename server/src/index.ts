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
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

function cancelPlayerDisconnectTimeout(roomId: string, token: string) {
  const key = `${roomId}:${token}`;
  const timeout = disconnectTimeouts.get(key);
  if (timeout) {
    clearTimeout(timeout);
    disconnectTimeouts.delete(key);
  }
}

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
          id: `${Date.now()}-reveal`,
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
  socket.on('create_room', ({ playerName, playerToken, settings }, callback) => {
    const roomId = generateRoomId();
    const token = playerToken || socket.id;
    const room = new Room(roomId, playerName, socket.id, token, settings);

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

  socket.on('join_room', ({ roomId, playerName, playerToken }, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: 'اتاق یافت نشد!' });
      return;
    }

    const token = playerToken || socket.id;

    // Check if player with this token already exists in room
    const existingPlayer = room.players.find(p => p.token === token);
    if (existingPlayer) {
      cancelPlayerDisconnectTimeout(roomId, token);
      room.reconnectPlayer(token, socket.id);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      callback({ success: true });
      broadcastRoomState(room);
      socket.emit('canvas_history', room.canvasHistory);

      const welcomeBackMsg: ChatMessage = {
        id: String(Date.now()),
        senderName: 'سیستم',
        text: `${existingPlayer.name} مجدداً به اتاق متصل شد.`,
        type: 'system'
      };
      io.to(roomId).emit('chat_message', welcomeBackMsg);
      return;
    }

    if (room.players.some(p => p.name === playerName && !p.disconnected)) {
      callback({ success: false, error: 'این نام کاربری قبلاً در اتاق استفاده شده است.' });
      return;
    }

    room.addPlayer(playerName, socket.id, token);
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

  socket.on('reconnect_room', ({ roomId, playerToken }, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: 'اتاق یافت نشد یا منقضی شده است.' });
      return;
    }

    const reconnected = room.reconnectPlayer(playerToken, socket.id);
    if (!reconnected) {
      callback({ success: false, error: 'بازیکن در این اتاق یافت نشد.' });
      return;
    }

    cancelPlayerDisconnectTimeout(roomId, playerToken);
    socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    callback({ success: true });
    broadcastRoomState(room);

    socket.emit('canvas_history', room.canvasHistory);
    if (room.state === 'SELECTING_WORD' && room.currentDrawerId === socket.id) {
      socket.emit('word_options', room.wordOptions);
    }

    const reconMsg: ChatMessage = {
      id: String(Date.now()),
      senderName: 'سیستم',
      text: `${reconnected.name} دوباره به بازی متصل شد.`,
      type: 'system'
    };
    io.to(roomId).emit('chat_message', reconMsg);
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

  socket.on('restart_game', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('error_message', 'تنها میزبان بازی می‌تواند بازی را مجدداً آغاز کند.');
      return;
    }

    const restarted = room.restartToLobby(socket.id);
    if (restarted) {
      io.to(roomId).emit('clear_canvas');
      broadcastRoomState(room);

      const restartMsg: ChatMessage = {
        id: String(Date.now()),
        senderName: 'سیستم',
        text: 'میزبان اتاق را برای دور جدید مجدداً راه‌اندازی کرد.',
        type: 'system'
      };
      io.to(roomId).emit('chat_message', restartMsg);
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
          id: `${Date.now()}-correct-${player.id}`,
          senderName: 'سیستم',
          text: `🎉 ${player.name} کلمه را درست حدس زد! (+${result.scoreEarned} امتیاز)`,
          type: 'correct'
        };
        io.to(roomId).emit('chat_message', correctMsg);

        if (result.allGuessed) {
          room.endRound();
        } else {
          broadcastRoomState(room);
        }
        return;
      }

      // If player has already guessed correctly, filter out message from guessers who haven't guessed
      if (player.hasGuessedCorrectly) {
        const chatMsg: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        return;
      }

      // Normal chat message from active guesser - broadcast message to room first
      const chatMsg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderName: player.name,
        text: trimmed,
        type: 'chat'
      };
      io.to(roomId).emit('chat_message', chatMsg);

      // If close guess, send private hint to guesser AFTER their message has been sent
      if (result.isClose) {
        const closeMsg: ChatMessage = {
          id: `${Date.now()}-close-${Math.random().toString(36).slice(2, 7)}`,
          senderName: 'سیستم',
          text: `«${trimmed}» خیلی به کلمه نزدیک است!`,
          type: 'close'
        };
        socket.emit('chat_message', closeMsg);
      }
      return;
    }

    // Normal chat message when outside DRAWING state
    const chatMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderName: player.name,
      text: trimmed,
      type: 'chat'
    };
    io.to(roomId).emit('chat_message', chatMsg);
  });

  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    socketToRoom.delete(socket.id);

    const room = rooms.get(roomId);
    if (!room) return;

    const leavingPlayer = room.players.find(p => p.id === socket.id);
    if (!leavingPlayer) return;

    room.markPlayerDisconnected(socket.id);
    broadcastRoomState(room);

    const tokenKey = `${roomId}:${leavingPlayer.token}`;
    if (disconnectTimeouts.has(tokenKey)) {
      clearTimeout(disconnectTimeouts.get(tokenKey)!);
    }

    // Give 45 seconds grace period for player/host to reconnect
    const timeout = setTimeout(() => {
      disconnectTimeouts.delete(tokenKey);
      const currentRoom = rooms.get(roomId);
      if (!currentRoom) return;

      const p = currentRoom.players.find(x => x.token === leavingPlayer.token);
      if (p && p.disconnected) {
        currentRoom.removePlayer(p.id);

        if (currentRoom.players.length === 0) {
          currentRoom.clearTimer();
          rooms.delete(roomId);
        } else {
          const leaveMsg: ChatMessage = {
            id: String(Date.now()),
            senderName: 'سیستم',
            text: `${p.name} به دلیل قطع طولانی ارتباط از بازی خارج شد.`,
            type: 'system'
          };
          io.to(roomId).emit('chat_message', leaveMsg);
          broadcastRoomState(currentRoom);
        }
      }
    }, 45000);

    disconnectTimeouts.set(tokenKey, timeout);
  });
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const potentialPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve('/opt/render/project/src/client/dist')
];
const clientDist = potentialPaths.find(p => fs.existsSync(p));

app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

if (clientDist) {
  console.log(`Serving client dist from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.error('WARNING: client/dist directory was not found! Searched in:', potentialPaths);
  app.get('*', (_req, res) => {
    res.status(200).send('<h1>Persian Skribbl Server</h1><p>Server is running, but client build was not found.</p>');
  });
}

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Persian Skribbl server running on http://0.0.0.0:${PORT}`);
});
