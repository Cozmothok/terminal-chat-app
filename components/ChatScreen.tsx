import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Message, FileAttachment } from '../types';
import MessageBubble from './MessageBubble';
import SendIcon from './icons/SendIcon';
import PaperclipIcon from './icons/PaperclipIcon';
import CloseIcon from './icons/CloseIcon';
import { Socket } from 'socket.io-client';

interface ChatScreenProps {
  currentUser: User;
  socket: Socket;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ currentUser, socket }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial setup when socket is ready
    socket.emit('join_group', currentUser);

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };
    const handleUpdateUsers = (userList: User[]) => {
      setUsers(userList);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('update_users', handleUpdateUsers);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('update_users', handleUpdateUsers);
    };
  }, [socket, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToSend(file);
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = useCallback(() => {
    setFileToSend(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [filePreviewUrl]);

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedMessage = newMessage.trim();
      if (!trimmedMessage && !fileToSend) return;

      let fileAttachment: FileAttachment | undefined = undefined;

      if (fileToSend) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', fileToSend);

        try {
          const response = await fetch('http://localhost:3001/upload', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('File upload failed');
          const data = await response.json();
          fileAttachment = {
            name: fileToSend.name,
            type: fileToSend.type,
            size: fileToSend.size,
            url: data.filePath,
          };
        } catch (error) {
          console.error(error);
          // Optionally, show an error message to the user
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const messagePayload: Omit<Message, 'id' | 'timestamp'> = {
        sender: currentUser,
        ...(trimmedMessage && { text: trimmedMessage }),
        ...(fileAttachment && { file: fileAttachment }),
      };

      socket.emit('send_message', messagePayload);
      setNewMessage('');
      removeFile();
    },
    [newMessage, currentUser, fileToSend, socket, removeFile],
  );

  return (
    <div className="flex flex-col h-screen max-h-screen bg-transparent text-green-400 overflow-hidden">
      <header className="flex items-center p-4 bg-black/80 border-b border-green-900 shrink-0">
        <div className="w-10 h-10 flex items-center justify-center border-2 border-green-500 mr-4 font-mono text-green-500 text-xl">
          [#]
        </div>
        <div>
          <h1 className="text-xl font-bold text-green-400 terminal-glow">Group Chat</h1>
          <p
            className="text-sm text-green-500 truncate"
            title={users.map((u) => u.name).join(', ')}
          >
            {users.length} users online: {users.map((u) => u.name).join(', ')}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} currentUser={currentUser} />
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-black/80 border-t border-green-900 shrink-0">
        {filePreviewUrl && fileToSend && (
          <div className="mb-3 p-2 border border-green-800 bg-gray-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {fileToSend.type.startsWith('image/') ? (
                <img src={filePreviewUrl} alt="preview" className="w-10 h-10 object-cover" />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-gray-800">
                  <PaperclipIcon />
                </div>
              )}
              <div className="text-sm overflow-hidden whitespace-nowrap">
                <p className="truncate">{fileToSend.name}</p>
                <p className="text-xs text-gray-400">{(fileToSend.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 text-red-500 hover:text-red-400 disabled:opacity-50"
              disabled={isUploading}
            >
              <CloseIcon />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end space-x-2 sm:space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={handleFileAttachment}
            className="p-2 sm:p-3 bg-gray-900/80 border border-green-700 text-green-300 hover:bg-green-800 disabled:opacity-50 disabled:cursor-wait"
            aria-label="Attach file"
            disabled={isUploading}
          >
            <PaperclipIcon />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isUploading ? '[UPLOADING...]' : `[${currentUser.name}, type message...]`}
            className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-gray-900 border border-green-800 placeholder-green-700 focus:outline-none focus:ring-0 focus:border-green-400 transition-colors disabled:opacity-50"
            autoComplete="off"
            disabled={!!fileToSend || isUploading}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !fileToSend) || isUploading}
            className="p-2 sm:p-3 bg-green-900/80 border border-green-700 text-green-300 hover:bg-green-800 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            aria-label="Send Message"
          >
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SendIcon />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatScreen;
