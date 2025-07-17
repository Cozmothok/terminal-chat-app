import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (success: boolean, authToken?: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !password) {
      setError('Username and password are required.');
      return;
    }

    setError(''); // Clear previous errors

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedName, password }),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(true, data.authToken); // Pass true for success and the authToken
      } else {
        setError(data.message || 'Login failed.');
        onLogin(false); // Pass false for failure
      }
    } catch (err) {
      console.error('Login API error:', err);
      setError('Could not connect to login service.');
      onLogin(false); // Pass false for failure
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-transparent text-green-400">
      <div className="w-full max-w-sm p-6 border border-green-700/50 bg-black/50 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-green-400 mb-2 terminal-glow">Terminal Chat</h1>
        <p className="text-gray-400 mb-6">Enter your username and password to connect</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="[Username]"
            className="w-full px-4 py-3 mb-4 bg-gray-900/80 border border-green-800 text-green-400 placeholder-green-700 focus:outline-none focus:ring-0 focus:border-green-400 transition-colors"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="[Password]"
            className="w-full px-4 py-3 mb-4 bg-gray-900/80 border border-green-800 text-green-400 placeholder-green-700 focus:outline-none focus:ring-0 focus:border-green-400 transition-colors"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={!name.trim() || !password.trim()}
            className="w-full px-4 py-3 bg-green-900/80 text-green-300 font-bold border border-green-700 hover:bg-green-800 hover:text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed transition-all"
          >
            Login
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-4 text-center">Created by Stelin</p>
      </div>
    </div>
  );
};

export default LoginScreen;
