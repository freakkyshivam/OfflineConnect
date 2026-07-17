export type DeviceStatus = 'online' | 'offline';

export interface Device {
  id: string;
  name: string;
  ip: string;
  status: DeviceStatus;
  lastSeen: number; // Unix timestamp
  avatar?: string;  // Optional avatar URL, falls back to initials
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number; // Unix timestamp
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatSession {
  peerId: string;
  messages: Message[];
  unreadCount: number;
}
