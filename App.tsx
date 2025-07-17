import React, { useState, useEffect } from 'react';
import { User } from './types';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleLogin = (name: string, isAuthenticated: boolean) => {
    const newUser = { name };
    const newSocket = io(import.meta.env.VITE_BACKEND_URL as string);
    setUser(newUser);
    setSocket(newSocket);

    // Emit join_group only if authenticated
    if (isAuthenticated) {
      newSocket.emit('join_group', newUser, isAuthenticated);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleAuthError = (message: string) => {
        console.error('Authentication Error:', message);
        // Optionally, display this error to the user or redirect to login
        setUser(null);
        setSocket(null);
        alert(message);
      };
      socket.on('auth_error', handleAuthError);

      return () => {
        socket.off('auth_error', handleAuthError);
      };
    }
  }, [socket]);

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
