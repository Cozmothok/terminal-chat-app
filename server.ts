import express, { Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import multer from 'multer';
import cors from 'cors';
import { User, Message, SystemSender } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://terminal-chat-frontend.onrender.com',
  },
});

app.use(cors());

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

const createSystemMessage = (text: string): Message => ({
  id: `sys-${Date.now()}`,
  sender: { name: 'SYSTEM' } as SystemSender,
  text,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

io.on('connection', (socket) => {
  console.log(`[SERVER] User connected: ${socket.id}`);

  socket.on('join_group', (user: User) => {
    const normalizedNewUserName = user.name.toLowerCase();
    const existingUser = users.find(u => u.name.toLowerCase() === normalizedNewUserName);

    if (existingUser && existingUser.socketId !== socket.id) {
      // Name is already taken by another active user
      socket.emit('name_taken', `The username '${user.name}' is already taken. Please choose a different one.`);
      console.log(`[SERVER] Username '${user.name}' is taken. Rejecting connection for socket ${socket.id}`);
      socket.disconnect(); // Disconnect the socket
      return; // Stop further processing
    }

    const newUserWithSocketId = { ...user, socketId: socket.id };

    if (existingUser) {
      // User reconnected, update their socketId
      const existingUserIndex = users.findIndex(u => u.name.toLowerCase() === normalizedNewUserName);
      users[existingUserIndex] = newUserWithSocketId;
      console.log(`[SERVER] User ${user.name} reconnected. Updated socketId. Current users: ${users.map(u => u.name).join(', ')}`);
    } else {
      // New user
      users.push(newUserWithSocketId);
      console.log(`[SERVER] User ${user.name} joined. Current users: ${users.map(u => u.name).join(', ')}`);

      // Send a system message to all clients that a user has entered
      io.emit('new_message', createSystemMessage(`${user.name} has entered the channel.`));
      console.log(`[SERVER] Emitted 'new_message' (join) for ${user.name}`);
    }

    socket.data.user = newUserWithSocketId;

    // Notify all clients about the new user list
    io.emit('update_users', users);
    console.log(`[SERVER] Emitted 'update_users' with: ${users.map(u => u.name).join(', ')}`);

    // Send a welcome message specifically to the joining user
    socket.emit('new_message', createSystemMessage(`Welcome to the chat, ${user.name}!`)); // Send only to the joining user
    console.log(`[SERVER] Emitted 'new_message' (welcome) to ${user.name}`);

    // Send the current user list to the newly connected socket
    socket.emit('update_users', users);
    console.log(`[SERVER] Emitted 'update_users' to new user ${user.name} with: ${users.map(u => u.name).join(', ')}`);

  }); // End of socket.on('join_group')

  socket.on('send_message', (message: Omit<Message, 'id' | 'timestamp'>) => {
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
    if (leavingUser) {
      console.log(`[SERVER] User ${leavingUser.name} is leaving. Users before filter: ${users.map(u => u.name).join(', ')}`);
      users = users.filter((u) => u.socketId !== socket.id);
      console.log(`[SERVER] Users after filter: ${users.map(u => u.name).join(', ')}`);
      io.emit('update_users', users);
      console.log(`[SERVER] Emitted 'update_users' (disconnect) with: ${users.map(u => u.name).join(', ')}`);

      io.emit('new_message', createSystemMessage(`${leavingUser.name} has left the channel.`));
      console.log(`[SERVER] Emitted 'new_message' (leave) for ${leavingUser.name}`);
      console.log(`[SERVER] User ${leavingUser.name} left.`);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});