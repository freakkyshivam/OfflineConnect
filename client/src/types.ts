export type DeviceStatus = 'online' | 'offline';

export interface Device {
  id: string;
  name: string;
  ip: string;
  status: DeviceStatus;
  lastSeen: number; // Unix timestamp
  avatar?: string;  // Optional avatar URL, falls back to initials
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number; // Unix timestamp
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ChatSession {
  peerId: string;
  messages: Message[];
  unreadCount: number;
}

// Phase 2 stub — visual-only, for the attachment button UI
export interface FileAttachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // MIME
}
