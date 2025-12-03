import type { User } from '../types';

const DEFAULT_AVATARS = [
  '/cat.jpeg',
  '/deer.jpeg',
  '/dog.jpeg',
  '/ferret.jpeg',
  '/fox.jpeg',
  '/lesser-panda.jpeg',
  '/lesser-panda2.jpeg',
  '/rabbit.jpeg',
  '/raccoon.jpeg'
];

/**
 * Generate a consistent default avatar based on user ID
 * Uses a simple hash function to ensure same user always gets same avatar
 */
export const getDefaultAvatar = (userId: string): string => {
  // Simple hash function for consistent avatar selection
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
};

/**
 * Get avatar URL for a user
 * Returns user's custom avatar if available, otherwise returns a default animal avatar
 */
export const getAvatarUrl = (user: User | null): string => {
  if (!user) return DEFAULT_AVATARS[0];
  if (user.Avatar && user.Avatar.trim() !== '') return user.Avatar;
  return getDefaultAvatar(user.ID);
};
