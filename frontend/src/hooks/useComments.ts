import { useState, useEffect } from 'react';
import { commentAPI } from '../api/client';
import type { Comment } from '../types';

export const useComments = (postId: number | null) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadComments = async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const data = await commentAPI.getComments(postId);
      setComments(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  return { comments, loading, error, refetch: loadComments };
};
