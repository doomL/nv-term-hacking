import { Server, Socket } from 'socket.io';
import {
  activateBracket,
  createGame,
  guessWord,
  serializeGameState,
  type Difficulty,
  type GameState,
  type BracketPair,
} from '@nv-hacking/shared';

interface PlayerInfo {
  odId: string;
  odUserId?: number;
  username: string;
  ready: boolean;
  finished: boolean;
  score: number;
  status: 'playing' | 'won' | 'locked';
}

interface Room {
  id: string;
  hostId: string;
  difficulty: Difficulty;
  language: 'en' | 'it';
  players: Map<string, PlayerInfo>;
  gameState?: GameState & { brackets: BracketPair[] };
  status: 'waiting' | 'playing' | 'finished';
  winnerId?: string;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getPublicRoom(room: Room) {
  return {
    id: room.id,
    difficulty: room.difficulty,
    status: room.status,
    winnerId: room.winnerId,
    players: Array.from(room.players.values()).map((p) => ({
      odId: p.odId,
      username: p.username,
      ready: p.ready,
      finished: p.finished,
      score: p.score,
      status: p.status,
    })),
  };
}

function getClientGameState(room: Room, odId: string) {
  if (!room.gameState) return null;
  const serialized = serializeGameState(room.gameState);
  // Don't send password to client during play
  return {
    ...serialized,
    password: room.status === 'finished' ? room.gameState.password : undefined,
  };
}

/** First room still waiting for a second player — used for quick match instead of a room code. */
function findOpenRoom(): Room | undefined {
  for (const room of rooms.values()) {
    if (room.status === 'waiting' && room.players.size === 1) return room;
  }
  return undefined;
}

function getLobbyStats(io: Server) {
  return {
    onlinePlayers: io.of('/').sockets.size,
    openRooms: Array.from(rooms.values()).filter((r) => r.status === 'waiting' && r.players.size === 1)
      .length,
  };
}

function broadcastLobbyStats(io: Server) {
  io.emit('lobby:stats', getLobbyStats(io));
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;
    let odId = socket.id;

    socket.emit('lobby:stats', getLobbyStats(io));
    broadcastLobbyStats(io);

    socket.on('lobby:stats', () => {
      socket.emit('lobby:stats', getLobbyStats(io));
    });

    socket.on('room:quickmatch', ({ username, difficulty, language, userId }: { username: string; difficulty: Difficulty; language?: 'en' | 'it'; userId?: number }) => {
      const open = findOpenRoom();
      if (open) {
        open.players.set(socket.id, {
          odId: socket.id,
          odUserId: userId,
          username,
          ready: false,
          finished: false,
          score: 0,
          status: 'playing',
        });
        currentRoom = open.id;
        socket.join(open.id);
        io.to(open.id).emit('room:updated', { room: getPublicRoom(open) });
        socket.emit('room:joined', { room: getPublicRoom(open), gameState: null, isHost: false });
        broadcastLobbyStats(io);
        return;
      }

      const code = generateRoomCode();
      const room: Room = {
        id: code,
        hostId: socket.id,
        difficulty,
        language: language === 'it' ? 'it' : 'en',
        players: new Map(),
        status: 'waiting',
      };
      room.players.set(socket.id, {
        odId: socket.id,
        odUserId: userId,
        username,
        ready: false,
        finished: false,
        score: 0,
        status: 'playing',
      });
      rooms.set(code, room);
      currentRoom = code;
      socket.join(code);
      socket.emit('room:joined', { room: getPublicRoom(room), gameState: null, isHost: true });
      broadcastLobbyStats(io);
    });

    socket.on('room:create', ({ username, difficulty, language, userId }: { username: string; difficulty: Difficulty; language?: 'en' | 'it'; userId?: number }) => {
      const code = generateRoomCode();
      const room: Room = {
        id: code,
        hostId: socket.id,
        difficulty,
        language: language === 'it' ? 'it' : 'en',
        players: new Map(),
        status: 'waiting',
      };
      room.players.set(socket.id, {
        odId: socket.id,
        odUserId: userId,
        username,
        ready: false,
        finished: false,
        score: 0,
        status: 'playing',
      });
      rooms.set(code, room);
      currentRoom = code;
      socket.join(code);
      socket.emit('room:joined', { room: getPublicRoom(room), gameState: null, isHost: true });
      broadcastLobbyStats(io);
    });

    socket.on('room:join', ({ code, username, userId }: { code: string; username: string; userId?: number }) => {
      const room = rooms.get(code.toUpperCase());
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }
      if (room.players.size >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      room.players.set(socket.id, {
        odId: socket.id,
        odUserId: userId,
        username,
        ready: false,
        finished: false,
        score: 0,
        status: 'playing',
      });
      currentRoom = code.toUpperCase();
      socket.join(code.toUpperCase());
      io.to(code.toUpperCase()).emit('room:updated', { room: getPublicRoom(room) });
      socket.emit('room:joined', { room: getPublicRoom(room), gameState: null, isHost: false });
      broadcastLobbyStats(io);
    });

    socket.on('room:ready', () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (player) player.ready = true;

      io.to(currentRoom).emit('room:updated', { room: getPublicRoom(room) });

      const allReady = room.players.size === 2 && Array.from(room.players.values()).every((p) => p.ready);
      if (allReady) {
        room.gameState = createGame({ difficulty: room.difficulty, language: room.language, seed: Date.now() });
        room.status = 'playing';
        io.to(currentRoom).emit('game:start', {
          room: getPublicRoom(room),
          gameState: getClientGameState(room, socket.id),
        });
      }
    });

    socket.on('game:guess', ({ word }: { word: string }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room?.gameState || room.status !== 'playing') return;

      const player = room.players.get(socket.id);
      if (!player || player.finished) return;

      const result = guessWord(room.gameState, word.toUpperCase());
      room.gameState = { ...room.gameState, ...result.state };

      player.status = result.state.status;
      if (result.state.status === 'won') {
        player.finished = true;
        player.score = calculateMultiplayerScore(result.state);
        if (!room.winnerId) {
          room.winnerId = socket.id;
          room.status = 'finished';
        }
      } else if (result.state.status === 'locked') {
        player.finished = true;
        player.score = 0;
      }

      socket.emit('game:update', {
        gameState: getClientGameState(room, socket.id),
        result: { likeness: result.likeness, wordLength: result.wordLength, message: result.state.lastMessage },
      });

      io.to(currentRoom).emit('room:updated', { room: getPublicRoom(room) });

      if (room.status === 'finished') {
        io.to(currentRoom).emit('game:end', {
          room: getPublicRoom(room),
          gameState: serializeGameState(room.gameState),
          password: room.gameState.password,
        });
      }
    });

    socket.on('game:bracket', ({ bracketId }: { bracketId: string }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room?.gameState || room.status !== 'playing') return;

      const player = room.players.get(socket.id);
      if (!player || player.finished) return;

      const result = activateBracket(room.gameState, bracketId);
      room.gameState = { ...room.gameState, ...result.state };

      socket.emit('game:update', {
        gameState: getClientGameState(room, socket.id),
        result: {
          bracketEffect: result.bracketEffect,
          removedWord: result.removedWord,
          message: result.state.lastMessage,
        },
      });
    });

    socket.on('room:leave', () => {
      handleDisconnect(socket, currentRoom);
      currentRoom = null;
    });

    socket.on('disconnect', () => {
      if (currentRoom) {
        handleDisconnect(socket, currentRoom);
      } else {
        // Not in a room yet — still an online-player count change nobody else heard about.
        setImmediate(() => broadcastLobbyStats(io));
      }
    });
  });
}

function calculateMultiplayerScore(state: GameState): number {
  if (state.status !== 'won') return 0;
  const elapsed = (state.endTime ?? Date.now()) - state.startTime;
  const timeBonus = Math.max(0, 60000 - elapsed);
  const attemptBonus = state.attemptsLeft * 500;
  const diffMultiplier = { novice: 1, advanced: 1.5, expert: 2, veryHard: 3 }[state.difficulty];
  return Math.round((1000 + timeBonus / 100 + attemptBonus) * diffMultiplier);
}

function handleDisconnect(socket: Socket, roomId: string | null) {
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(socket.id);
  socket.leave(roomId);

  const io = socket.nsp.server;
  if (room.players.size === 0) {
    rooms.delete(roomId);
    broadcastLobbyStats(io);
    return;
  }

  if (room.status === 'waiting') {
    io.to(roomId).emit('room:updated', { room: getPublicRoom(room) });
  }
  broadcastLobbyStats(io);
}
