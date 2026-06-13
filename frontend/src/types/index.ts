export interface User {
  id: string;
  username: string;
  email: string;
  team_name: string;
  role: string;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  uploaded_by: string;
  scope: 'personal' | 'team' | 'organization';
  tags: string[];
  source: 'pdf' | 'slack';
  channel?: string;
  thread_id?: string;
  chunk_count: string;
  created_at: string;
}

export interface Citation {
  source: string;
  chunk_id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AskRequest {
  question: string;
  scope: string;
  conversation_id?: string;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  conversation_id: string;
}

export interface SlackIngestRequest {
  channel_id: string;
  thread_ts?: string;
  scope: string;
}

export interface SlackIngestResponse {
  document_id: string;
  filename: string;
  channel: string;
  thread_id?: string;
  message_count: number;
  chunk_count: number;
  tags: string[];
}

export interface SummaryResponse {
  summary: string;
}

export interface UserRegister {
  username: string;
  email: string;
  password: string;
  team_name: string;
  role?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

