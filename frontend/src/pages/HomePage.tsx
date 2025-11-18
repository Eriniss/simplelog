import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PostList } from '../components/PostList';
import { usePosts } from '../hooks/usePosts';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { posts, loading, error } = usePosts();

  return (
    <main className="container">
      <div id="new-post-btn-container">
        <button
          id="new-post-btn"
          className="btn btn-primary"
          onClick={() => navigate('/posts/new')}
        >
          새 글 작성
        </button>
      </div>
      <div id="posts-list">
        <h2>최근 글</h2>
        <PostList posts={posts} loading={loading} error={error} />
      </div>
    </main>
  );
};
