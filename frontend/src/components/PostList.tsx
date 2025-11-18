import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../types';
import { formatDate, getPreview } from '../utils/markdown';

interface PostListProps {
  posts: Post[];
  loading: boolean;
  error: Error | null;
}

export const PostList: React.FC<PostListProps> = ({ posts, loading, error }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (error) {
    return <div className="empty-state">글을 불러오는데 실패했습니다.</div>;
  }

  if (posts.length === 0) {
    return <div className="empty-state">아직 작성된 글이 없습니다.</div>;
  }

  return (
    <div id="posts-container">
      {posts.map((post) => {
        const hasAvatar = post.AuthorAvatar && post.AuthorAvatar.trim() !== '';

        return (
          <div
            key={post.ID}
            className="post-card"
            onClick={() => navigate(`/posts/${post.ID}`)}
          >
            <h3 className="post-card-title">{post.Title}</h3>
            <div className="post-meta">
              <div className="post-card-author">
                {hasAvatar && (
                  <img
                    src={post.AuthorAvatar}
                    alt="프로필"
                    className="post-card-avatar"
                  />
                )}
                <span className="post-card-author-name">
                  {post.AuthorUsername || '익명'}
                </span>
              </div>
              <span>•</span>
              <span className="post-card-date">{formatDate(post.CreatedAt)}</span>
            </div>
            <div className="post-preview">{getPreview(post.Content)}</div>
          </div>
        );
      })}
    </div>
  );
};
