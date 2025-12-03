import axios from 'axios';
import type { Post, Comment, User, Template } from '../types';

const client = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// Add response interceptor for 401 errors
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login page
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

export const getMe = () => client.get<User>('/me');
export const getPosts = (offset: number, limit: number | 'all', search?: string, type?: string) =>
    client.get<{ posts: Post[], total: number }>(`/posts`, { params: { offset, limit, search, type } });
export const getPost = (id: number) => client.get<Post>(`/posts/${id}`);
export const createPost = (data: { title: string; content: string; tags: string[]; isSecret: boolean }) => client.post<Post>('/posts', data);
export const updatePost = (id: number, data: { title: string; content: string; tags: string[]; isSecret: boolean }) => client.put<Post>(`/posts/${id}`, data);
export const deletePost = (id: number) => client.delete(`/posts/${id}`);

export const getComments = (postId: number) => client.get<Comment[]>(`/posts/${postId}/comments`);
export const createComment = (postId: number, content: string, parentId?: number) =>
    client.post<Comment>(`/posts/${postId}/comments`, { content, parent_id: parentId });
export const updateComment = (id: number, content: string) => client.put<Comment>(`/comments/${id}`, { content });
export const deleteComment = (id: number) => client.delete(`/comments/${id}`);

export const uploadImage = (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return client.post<{ url: string }>('/upload/image', formData);
};

export const updateProfile = (data: { username?: string; avatar?: string; intro?: string }) =>
    client.patch('/profile', data);

export const getTemplates = () => client.get<Template[]>('/templates');
export const getTemplate = (id: number) => client.get<Template>(`/templates/${id}`);
export const createTemplate = (data: { name: string; content: string; isPublic?: boolean }) => client.post<Template>('/templates', data);
export const updateTemplate = (id: number, data: { name: string; content: string; isPublic?: boolean }) => client.put<Template>(`/templates/${id}`, data);
export const deleteTemplate = (id: number) => client.delete(`/templates/${id}`);
