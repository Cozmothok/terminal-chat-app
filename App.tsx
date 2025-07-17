import React, { useState, useEffect } from 'react';
import { User } from './types';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleLogin = (name: string) => {
    const newUser = { name };
    // Connect to server. You might need to change this URL if your server is not on localhost.
    const newSocket = io(process.env.VITE_BACKEND_URL as string);
    setUser(newUser);
    setSocket(newSocket);
  };

  useEffect(() => {
    // Disconnect socket when the component unmounts
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <div className="scanlines relative h-screen w-screen font-mono antialiased overflow-hidden">
      {!user || !socket ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <ChatScreen currentUser={user} socket={socket} />
      )}
    </div>
  );
};

export default App;
