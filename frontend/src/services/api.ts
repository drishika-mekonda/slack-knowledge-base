import axios from 'axios';
import { 
  UserRegister, UserLogin, TokenResponse, User, 
  Document, AskRequest, AskResponse, SlackIngestRequest, 
  SlackIngestResponse, Conversation, Message, SummaryResponse 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT token into all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired token or authentication errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Redirect to login page if unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: UserRegister): Promise<User> => {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },
  login: async (data: UserLogin): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

export const documentApi = {
  upload: async (file: File, scope: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', scope);
    const response = await api.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  list: async (): Promise<Document[]> => {
    const response = await api.get<Document[]>('/documents');
    return response.data;
  },
  get: async (id: string): Promise<Document> => {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};

export const slackApi = {
  ingest: async (data: SlackIngestRequest): Promise<SlackIngestResponse> => {
    const response = await api.post<SlackIngestResponse>('/ingest/slack', data);
    return response.data;
  },
};

export const chatApi = {
  ask: async (data: AskRequest): Promise<AskResponse> => {
    const response = await api.post<AskResponse>('/chat/ask', data);
    return response.data;
  },
  listConversations: async (): Promise<Conversation[]> => {
    const response = await api.get<Conversation[]>('/chat/conversations');
    return response.data;
  },
  getConversation: async (id: string): Promise<Conversation & { messages: Message[] }> => {
    const response = await api.get<Conversation & { messages: Message[] }>(`/chat/conversations/${id}`);
    return response.data;
  },
};

export const summaryApi = {
  generateSummary: async (sourceId: string): Promise<SummaryResponse> => {
    const response = await api.post<SummaryResponse>('/summary', { source_id: sourceId });
    return response.data;
  },
};

export default api;
