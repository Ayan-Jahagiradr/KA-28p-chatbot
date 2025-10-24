export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  ERROR = 'error',
}

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
