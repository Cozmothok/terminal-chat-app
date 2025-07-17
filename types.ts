export interface User {
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
  sender: User;
  timestamp: string;
  text?: string;
  file?: FileAttachment;
}
