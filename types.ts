export interface User {
  name: string;
  socketId: string;
  displayName?: string;
}

export interface SystemSender {
  name: string;
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string; // Server path, e.g., /uploads/file.png
}

export interface Message {
  id: string;
  sender: User | SystemSender;
  timestamp: string;
  text?: string;
  file?: FileAttachment;
  recipient?: User; // Optional recipient for private messages
  messageType: 'public' | 'private'; // Type of message
}
