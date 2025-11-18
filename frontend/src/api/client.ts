import axios from 'axios';
import type {
  User,
  Post,
  Comment,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  UpdateProfileRequest,
} from '../types';

// Empty in production (same origin), set for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if not authenticated
      const loginUrl = API_BASE_URL ? `${API_BASE_URL}/auth/login` : '/auth/login';
      window.location.href = loginUrl;
    }
    return Promise.reject(error);
  }
);

// User API
export const userAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/me');
    return response.data;
  },

  getUserProfile: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/api/users/${userId}`);
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.patch<User>('/api/profile', data);
    return response.data;
  },
};

// Post API
export const postAPI = {
  getPosts: async (): Promise<Post[]> => {
    const response = await apiClient.get<Post[]>('/api/posts');
    return response.data;
  },

  getPost: async (postId: number): Promise<Post> => {
    const response = await apiClient.get<Post>(`/api/posts/${postId}`);
    return response.data;
  },

  createPost: async (data: CreatePostRequest): Promise<Post> => {
    const response = await apiClient.post<Post>('/api/posts', data);
    return response.data;
  },

  updatePost: async (postId: number, data: UpdatePostRequest): Promise<Post> => {
    const response = await apiClient.put<Post>(`/api/posts/${postId}`, data);
    return response.data;
  },

  deletePost: async (postId: number): Promise<void> => {
    await apiClient.delete(`/api/posts/${postId}`);
  },
};

// Comment API
export const commentAPI = {
  getComments: async (postId: number): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(`/api/posts/${postId}/comments`);
    return response.data;
  },

  createComment: async (postId: number, data: CreateCommentRequest): Promise<Comment> => {
    const response = await apiClient.post<Comment>(`/api/posts/${postId}/comments`, data);
    return response.data;
  },

  updateComment: async (commentId: number, data: UpdateCommentRequest): Promise<Comment> => {
    const response = await apiClient.put<Comment>(`/api/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/api/comments/${commentId}`);
  },
};

export const getLogoutUrl = () => API_BASE_URL ? `${API_BASE_URL}/auth/logout` : '/auth/logout';
