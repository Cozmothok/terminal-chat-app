import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface LoginScreenProps {
  onLogin: (username: string) => void;
  socket: Socket | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, socket }) => {
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (socket) {
      socket.on('name_taken', (message: string) => {
        setErrorMessage(message);
      });

      return () => {
        socket.off('name_taken');
      };
    }
  }, [socket]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      setErrorMessage(''); // Clear previous errors
      onLogin(trimmedName);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-transparent text-green-400">
      <div className="w-full max-w-sm p-6 border border-green-700/50 bg-black/50 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-green-400 mb-2 terminal-glow">Terminal Chat</h1>
        <p className="text-gray-400 mb-6">Enter your username to connect</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="[Enter Username]"
            className="w-full px-4 py-3 mb-4 bg-gray-900/80 border border-green-800 text-green-400 placeholder-green-700 focus:outline-none focus:ring-0 focus:border-green-400 transition-colors"
            autoFocus
          />
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-3 bg-green-900/80 text-green-300 font-bold border border-green-700 hover:bg-green-800 hover:text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed transition-all"
          >
            Join Channel
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-4 text-center">Created by Stelin</p>
      </div>
    </div>
  );
};

export default LoginScreen;
