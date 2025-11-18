import React from 'react';
import { PostForm } from '../components/PostForm';
import { usePosts } from '../hooks/usePosts';

export const NewPostPage: React.FC = () => {
  const { refetch } = usePosts();

  return (
    <main className="container">
      <div id="post-form-container">
        <PostForm onSaved={refetch} />
      </div>
    </main>
  );
};
