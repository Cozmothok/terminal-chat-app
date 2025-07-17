import React, { useState, useEffect } from 'react';
import { User } from './types';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleHardcodedLogin = (success: boolean) => {
    setIsAuthenticated(success);
  };

  const handleDisplayNameSubmit = (name: string) => {
    const newUser = { name };
    const newSocket = io(import.meta.env.VITE_BACKEND_URL as string);
    setUser(newUser);
    setSocket(newSocket);
    setDisplayName(name);

    // Emit join_group only if authenticated
    // This will now be handled in a separate useEffect
    // if (isAuthenticated) {
    //   newSocket.emit('join_group', newUser, isAuthenticated);
    // }
  };

  useEffect(() => {
    if (socket) {
      const handleAuthError = (message: string) => {
        console.error('Authentication Error:', message);
        setUser(null);
        setSocket(null);
        setIsAuthenticated(false);
        setDisplayName('');
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

  // New useEffect to handle joining the group after authentication and socket connection
  useEffect(() => {
    if (isAuthenticated && user && socket && socket.connected) {
      socket.emit('join_group', user, isAuthenticated);
    }
  }, [isAuthenticated, user, socket]);

  if (!isAuthenticated) {
    return (
      <div className="scanlines relative h-screen w-screen font-mono antialiased overflow-hidden">
        <LoginScreen onLogin={handleHardcodedLogin} />
      </div>
    );
  }

  if (!displayName) {
    return (
      <div className="scanlines relative h-screen w-screen font-mono antialiased overflow-hidden flex items-center justify-center">
        <div className="w-full max-w-sm p-6 border border-green-700/50 bg-black/50 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-green-400 mb-2 terminal-glow">Enter Display Name</h1>
          <p className="text-gray-400 mb-6">Choose a name for the chat.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleDisplayNameSubmit(e.currentTarget.displayName.value); }}>
            <input
              type="text"
              name="displayName"
              placeholder="[Your Chat Name]"
              className="w-full px-4 py-3 mb-4 bg-gray-900/80 border border-green-800 text-green-400 placeholder-green-700 focus:outline-none focus:ring-0 focus:border-green-400 transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="w-full px-4 py-3 bg-green-900/80 text-green-300 font-bold border border-green-700 hover:bg-green-800 hover:text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed transition-all"
            >
              Join Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="scanlines relative h-screen w-screen font-mono antialiased overflow-hidden">
      <ChatScreen currentUser={user!} socket={socket!} />
    </div>
  );
};

export default App;
