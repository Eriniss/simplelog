import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PostForm } from '../components/PostForm';
import { usePost } from '../hooks/usePosts';

export const EditPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const postId = parseInt(id || '0', 10);
  const { post, loading } = usePost(postId);

  if (loading) {
    return (
      <main className="container">
        <div className="loading">로딩 중...</div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="container">
        <div className="empty-state">글을 찾을 수 없습니다.</div>
      </main>
    );
  }

  return (
    <main className="container">
      <div id="post-form-container">
        <PostForm
          post={post}
          onSaved={() => navigate(`/posts/${postId}`)}
        />
      </div>
    </main>
  );
};
