import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Post, User } from '../types';
import { formatDate } from '../utils/markdown';
import { postAPI } from '../api/client';
import { CustomReactMarkdown } from './MarkdownEditor';

interface PostDetailProps {
  post: Post;
  user: User | null;
  onDeleted: () => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, user, onDeleted }) => {
  const navigate = useNavigate();
  const canEdit = user && (user.Role === 'admin' || user.ID === post.AuthorID);

  const handleDelete = async () => {
    if (!window.confirm('정말 이 글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await postAPI.deletePost(post.ID);
      onDeleted();
      navigate('/');
    } catch (error) {
      alert('글 삭제에 실패했습니다.');
    }
  };

  const handleEdit = () => {
    navigate(`/posts/${post.ID}/edit`);
  };

  const hasAvatar = post.AuthorAvatar && post.AuthorAvatar.trim() !== '';

  let dateText = formatDate(post.CreatedAt);
  if (post.UpdatedAt && post.UpdatedAt !== post.CreatedAt) {
    const createdTime = new Date(post.CreatedAt).getTime();
    const updatedTime = new Date(post.UpdatedAt).getTime();
    if (Math.abs(updatedTime - createdTime) > 1000) {
      dateText += ` • 수정: ${formatDate(post.UpdatedAt)}`;
    }
  }

  return (
    <article className="post-detail">
      <h1>{post.Title}</h1>
      <div className="post-meta">
        <div id="detail-author">
          {hasAvatar && (
            <img
              src={post.AuthorAvatar}
              alt="프로필"
              className="post-author-avatar clickable-profile"
              onClick={() => navigate(`/users/${post.AuthorID}`)}
            />
          )}
          <span
            className="post-author-name clickable-profile"
            onClick={() => navigate(`/users/${post.AuthorID}`)}
          >
            {post.AuthorUsername || '익명'}
          </span>
        </div>
        <span id="detail-date">
          <span>•</span> <span>{dateText}</span>
        </span>
      </div>
      <div className="post-content">
        <CustomReactMarkdown contents={post.Content} />
      </div>
      <div className="post-actions-container">
        {canEdit && (
          <div className="post-actions">
            <button onClick={handleEdit} className="btn btn-secondary">
              수정
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              삭제
            </button>
          </div>
        )}
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          목록으로
        </button>
      </div>
    </article>
  );
};
