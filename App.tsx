import React, { useState, useEffect } from 'react';
import { User } from './types';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleLogin = (name: string) => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL as string);
    setSocket(newSocket);

    // Temporarily set user with just name, socketId will be added by server
    const initialUser: User = { name, socketId: newSocket.id }; 
    if (initialUser.name.toLowerCase() === 'admin215') {
      initialUser.displayName = 'Admin';
    }
    setUser(initialUser); // Set user immediately for rendering ChatScreen

    newSocket.emit('join_group', initialUser);
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
        <LoginScreen onLogin={handleLogin} socket={socket} onSocketError={() => setSocket(null)} />
      ) : (
        <ChatScreen currentUser={user} socket={socket} isGodmode={user.name.toLowerCase() === 'admin215'} />
      )}
    </div>
  );
};

export default App;
