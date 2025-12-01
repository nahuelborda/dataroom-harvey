import axios, { AxiosError } from 'axios';
import type { User, Dataroom, File, DriveFile, ApiError } from '../types';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Check if it's an OAuth revoked error
      const data = error.response.data;
      if (data?.error === 'OAUTH_REVOKED') {
        // Don't clear token, let the UI handle reconnection
        console.error('OAuth access revoked, user needs to reconnect');
      } else {
        // Clear token for other auth errors
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  getMe: async (): Promise<{ user: User; google_connected: boolean }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('authToken');
  },

  getGoogleAuthUrl: (): string => {
    return `${API_URL}/auth/google/start`;
  },
};

// Datarooms API
export const dataroomsApi = {
  list: async (): Promise<{ datarooms: Dataroom[] }> => {
    const response = await api.get('/api/datarooms');
    return response.data;
  },

  get: async (id: string): Promise<Dataroom> => {
    const response = await api.get(`/api/datarooms/${id}`);
    return response.data;
  },

  create: async (name: string, description?: string): Promise<Dataroom> => {
    const response = await api.post('/api/datarooms', { name, description });
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<Dataroom> => {
    const response = await api.put(`/api/datarooms/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/datarooms/${id}`);
  },

  getFiles: async (id: string): Promise<{ files: File[] }> => {
    const response = await api.get(`/api/datarooms/${id}/files`);
    return response.data;
  },
};

// Drive API
export const driveApi = {
  listFiles: async (params?: {
    page_size?: number;
    page_token?: string;
    q?: string;
  }): Promise<{ files: DriveFile[]; next_page_token: string | null }> => {
    const response = await api.get('/api/drive/files', { params });
    return response.data;
  },
};

// Files API
export const filesApi = {
  import: async (dataroomId: string, googleFileId: string): Promise<File> => {
    const response = await api.post('/api/files/import', {
      dataroom_id: dataroomId,
      google_file_id: googleFileId,
    });
    return response.data;
  },

  get: async (id: string): Promise<File> => {
    const response = await api.get(`/api/files/${id}`);
    return response.data;
  },

  download: async (id: string): Promise<Blob> => {
    const response = await api.get(`/api/files/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/files/${id}`);
  },
};

