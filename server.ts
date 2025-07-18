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
  timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
  messageType: 'public',
});

io.on('connection', (socket) => {
  console.log(`[SERVER] User connected: ${socket.id}`);
  const userIpAddress = Array.isArray(socket.handshake.headers['x-forwarded-for']) 
    ? socket.handshake.headers['x-forwarded-for'][0] 
    : socket.handshake.headers['x-forwarded-for'] || socket.handshake.address; // Capture IP address

  socket.on('join_group', (user: User) => {
    const normalizedNewUserName = user.name.toLowerCase();
    const existingUser = users.find(u => u.name.toLowerCase() === normalizedNewUserName);

    const newUserWithSocketId: User = { ...user, socketId: socket.id, ipAddress: userIpAddress };
    if (newUserWithSocketId.name.toLowerCase() === 'admin215') {
      newUserWithSocketId.displayName = 'Admin';
    }

    if (existingUser && existingUser.socketId !== socket.id) {
      // Name is already taken by another active user
      socket.emit('name_taken', `The username '${user.name}' is already taken. Please choose a different one.`);
      console.log(`[SERVER] Username '${user.name}' is taken. Rejecting connection for socket ${socket.id}`);
      socket.disconnect(); // Disconnect the socket
      return; // Stop further processing
    }

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
      io.emit('new_message', createSystemMessage(`${newUserWithSocketId.displayName || newUserWithSocketId.name} has entered the channel.`));
      console.log(`[SERVER] Emitted 'new_message' (join) for ${user.name}`);
    }

    socket.data.user = newUserWithSocketId;

    // Notify all clients about the new user list
    io.emit('update_users', users.map(u => ({ ...u, name: u.displayName || u.name })));
    console.log(`[SERVER] Emitted 'update_users' with: ${users.map(u => u.name).join(', ')}`);

    // Send a welcome message specifically to the joining user
    socket.emit('new_message', createSystemMessage(`Welcome to the chat, ${newUserWithSocketId.displayName || newUserWithSocketId.name}!`)); // Send only to the joining user
    console.log(`[SERVER] Emitted 'new_message' (welcome) to ${user.name}`);

    // Send the current user list to the newly connected socket
    socket.emit('update_users', users.map(u => ({ ...u, name: u.displayName || u.name })));
    console.log(`[SERVER] Emitted 'update_users' to new user ${user.name} with: ${users.map(u => u.name).join(', ')}`);

  }); // End of socket.on('join_group')

  socket.on('send_message', (message: Omit<Message, 'id' | 'timestamp' | 'messageType'>) => {
    const fullMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      messageType: 'public',
    };
    console.log(`[SERVER] Public message from ${fullMessage.sender.name}`);
    io.emit('new_message', fullMessage);
  });

  socket.on('send_private_message', (message: Omit<Message, 'id' | 'timestamp' | 'messageType'> & { recipient: User }) => {
    const fullMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      messageType: 'private',
    };

    const recipientSocket = io.sockets.sockets.get(fullMessage.recipient!.socketId);

    if (recipientSocket) {
      // Send to recipient
      recipientSocket.emit('new_message', fullMessage);
      console.log(`[SERVER] Private message from ${fullMessage.sender.name} to ${fullMessage.recipient!.name}`);

      // Send to sender (so they see their own private message)
      socket.emit('new_message', fullMessage);
    } else {
      console.log(`[SERVER] Private message to ${fullMessage.recipient!.name} failed: recipient not found.`);
      socket.emit('new_message', createSystemMessage(`Private message to ${fullMessage.recipient!.name} failed: user is offline.`));
    }
  });

  socket.on('kick_user_request', (targetSocketId: string) => {
    const godmodeUserName = 'admin215';
    if (socket.data.user && socket.data.user.name.toLowerCase() === godmodeUserName.toLowerCase()) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket && targetSocket.data.user) {
        const kickedUserName = targetSocket.data.user.displayName || targetSocket.data.user.name;
        targetSocket.disconnect(true); // Disconnect the target user
        
        // Remove the kicked user from the users array
        users = users.filter(u => u.socketId !== targetSocketId);
        io.emit('update_users', users.map(u => ({ ...u, name: u.displayName || u.name }))); // Update user list for all clients

        io.emit('new_message', createSystemMessage(`${kickedUserName} has been kicked from the channel by ${socket.data.user.displayName || godmodeUserName}.`));
        console.log(`[SERVER] User ${kickedUserName} (socket: ${targetSocketId}) has been kicked by ${godmodeUserName}.`);
      } else {
        console.log(`[SERVER] Kick request failed: Target socket ${targetSocketId} not found or user data missing.`);
        socket.emit('new_message', createSystemMessage(`Failed to kick user: Target not found.`));
      }
    } else {
      console.log(`[SERVER] Unauthorized kick attempt by ${socket.data.user ? socket.data.user.name : 'unknown user'}.`);
      socket.emit('new_message', createSystemMessage(`Unauthorized: You do not have permission to kick users.`));
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SERVER] User disconnected: ${socket.id}`);
    const leavingUser = socket.data.user;
    if (leavingUser) {
      console.log(`[SERVER] User ${leavingUser.name} is leaving. Users before filter: ${users.map(u => u.name).join(', ')}`);
      users = users.filter((u) => u.socketId !== socket.id);
      console.log(`[SERVER] Users after filter: ${users.map(u => u.name).join(', ')}`);
      io.emit('update_users', users.map(u => ({ ...u, name: u.displayName || u.name })));
      console.log(`[SERVER] Emitted 'update_users' (disconnect) with: ${users.map(u => u.name).join(', ')}`);

      io.emit('new_message', createSystemMessage(`${leavingUser.displayName || leavingUser.name} has left the channel.`));
      console.log(`[SERVER] Emitted 'new_message' (leave) for ${leavingUser.name}`);
      console.log(`[SERVER] User ${leavingUser.name} left.`);
    }
  });

  socket.on('get_user_ips_request', () => {
    const adminUserName = 'admin215';
    if (socket.data.user && socket.data.user.name.toLowerCase() === adminUserName.toLowerCase()) {
      const userIpList = users.map(u => ({
        name: u.displayName || u.name,
        ipAddress: u.ipAddress || 'N/A',
      }));
      socket.emit('user_ips_list', userIpList);
      console.log(`[SERVER] Admin ${socket.data.user.name} requested user IP list.`);
    } else {
      console.log(`[SERVER] Unauthorized IP request by ${socket.data.user ? socket.data.user.name : 'unknown user'}.`);
      socket.emit('new_message', createSystemMessage(`Unauthorized: You do not have permission to view IP addresses.`));
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});