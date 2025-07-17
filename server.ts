import express, { Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { User, Message } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json()); // Add this line to parse JSON request bodies

// Hardcoded user for demonstration (NOT SECURE FOR PRODUCTION)
const HARDCODED_USERNAME = "user123";
const HARDCODED_PASSWORD = "pass4321";

// In-memory store for active tokens (NOT PERSISTENT ACROSS SERVER RESTARTS)
const activeTokens: Map<string, string> = new Map(); // token -> username

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === HARDCODED_USERNAME && password === HARDCODED_PASSWORD) {
    const authToken = uuidv4();
    activeTokens.set(authToken, username);
    res.json({ success: true, message: "Login successful!", authToken });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials." });
  }
});

// Serve the main frontend files from the root directory
app.use(express.static(path.join(__dirname, '..')) as any);

// Configure Multer for file storage
const uploadsDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use a timestamp and original name to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir) as any);

// API endpoint for file uploads
app.post('/upload', upload.single('file'), (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  console.log(`[SERVER] File uploaded: ${req.file.filename}`);
  // Return the path to access the file
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

let users: User[] = [];

io.on('connection', (socket) => {
  console.log(`[SERVER] User connected: ${socket.id}`);

  socket.on('join_group', (user: User, authToken: string) => {
    if (!activeTokens.has(authToken) || activeTokens.get(authToken) !== user.name) {
      console.log(`[SERVER] Unauthorized user ${user.name} attempted to join with token: ${authToken}`);
      socket.emit('auth_error', 'Authentication failed or token invalid.');
      return;
    }

    // Store token and user data on socket for later use (e.g., disconnect)
    socket.data.authToken = authToken;
    socket.data.user = user;

    users.push(user);
    console.log(`[SERVER] User ${user.name} joined.`);

    // Notify all clients about the new user list
    io.emit('update_users', users);

    // Send a system message to all clients that a user has entered
    const joinMessage: Message = {
      id: `sys-${Date.now()}`,
      sender: { name: 'SYSTEM' },
      text: `${user.name} has entered the channel.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    io.emit('new_message', joinMessage);

    // Send a welcome message specifically to the joining user
    const welcomeMessage: Message = {
      id: `sys-welcome-${Date.now()}`,
      sender: { name: 'SYSTEM' },
      text: `Welcome to the chat, ${user.name}!`, // Personalized welcome
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    socket.emit('new_message', welcomeMessage); // Send only to the joining user
  });

  socket.on('send_message', (message: Omit<Message, 'id' | 'timestamp'>) => {
    // Ensure sender is authenticated (optional, but good practice)
    if (!socket.data.authToken || activeTokens.get(socket.data.authToken) !== message.sender.name) {
      console.log(`[SERVER] Unauthorized message attempt from ${message.sender.name}`);
      socket.emit('auth_error', 'Unauthorized message.');
      return;
    }
    const fullMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    console.log(`[SERVER] Message from ${fullMessage.sender.name}`);
    io.emit('new_message', fullMessage);
  });

  socket.on('disconnect', () => {
    console.log(`[SERVER] User disconnected: ${socket.id}`);
    const leavingUser = socket.data.user;
    const leavingAuthToken = socket.data.authToken;

    if (leavingAuthToken && activeTokens.has(leavingAuthToken)) {
      activeTokens.delete(leavingAuthToken);
      console.log(`[SERVER] Token ${leavingAuthToken} removed.`);
    }

    if (leavingUser) {
      users = users.filter((u) => u.name !== leavingUser.name);
      io.emit('update_users', users);

      const systemMessage: Message = {
        id: `sys-${Date.now()}`,
        sender: { name: 'SYSTEM' },
        text: `${leavingUser.name} has left the channel.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      io.emit('new_message', systemMessage);
      console.log(`[SERVER] User ${leavingUser.name} left.`);
    }
  });
});
