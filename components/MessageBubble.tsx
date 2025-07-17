import React from 'react';
import { Message, User } from '../types';
import FileIcon from './icons/FileIcon';

interface MessageBubbleProps {
  message: Message;
  currentUser: User;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileRenderer: React.FC<{ file: NonNullable<Message['file']> }> = ({ file }) => {
  if (file.type.startsWith('image/')) {
    return (
      <img
        src={file.url}
        alt={file.name}
        className="max-w-xs max-h-64 mt-2 border border-green-900/50"
      />
    );
  }
  if (file.type.startsWith('video/')) {
    return <video src={file.url} controls className="max-w-xs mt-2 border border-green-900/50" />;
  }
  if (file.type.startsWith('audio/')) {
    return <audio src={file.url} controls className="w-full max-w-xs mt-2" />;
  }

  return (
    <a
      href={file.url}
      download={file.name}
      className="flex items-center gap-3 mt-2 p-2 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 transition-colors"
    >
      <FileIcon className="w-8 h-8 shrink-0" />
      <div className="overflow-hidden">
        <p className="truncate font-bold">{file.name}</p>
        <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
      </div>
    </a>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUser }) => {
  const isSystem = message.sender.name === 'SYSTEM';
  const isCurrentUser = !isSystem && message.sender.name === currentUser.name;

  if (isSystem) {
    return (
      <div className="text-center my-2">
        <span className="text-xs text-gray-500 bg-black/30 px-2 py-1">{message.text}</span>
      </div>
    );
  }

  let bubbleClasses = '';
  let containerClasses = '';
  let senderNameColor = '';

  if (isCurrentUser) {
    bubbleClasses = 'bg-green-900/70 border border-green-800 text-green-300 self-end';
    containerClasses = 'justify-end';
    senderNameColor = 'text-green-400';
  } else {
    // Other user
    bubbleClasses = 'bg-gray-800/60 border border-gray-600 text-gray-300 self-start';
    containerClasses = 'justify-start';
    senderNameColor = 'text-yellow-400';
  }

  return (
    <div className={`w-full flex ${containerClasses} my-1 animate-fade-in-up`}>
      <div className={`p-3 max-w-lg lg:max-w-2xl ${bubbleClasses}`}>
        <p className={`font-bold text-xs mb-1 ${senderNameColor}`}>{message.sender.name}</p>
        {message.text && <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>}
        {message.file && <FileRenderer file={message.file} />}
        <p className="text-xs text-right mt-1 text-green-700/70">{message.timestamp}</p>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MessageBubble;
