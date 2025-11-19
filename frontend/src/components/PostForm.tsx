import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAPI } from '../api/client';
import type { Post } from '../types';
import { MarkdownEditor } from './MarkdownEditor';

interface PostFormProps {
  post?: Post;
  onSaved: () => void;
}

export const PostForm: React.FC<PostFormProps> = ({ post, onSaved }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(post?.Title || '');
  const [content, setContent] = useState(post?.Content || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.Title);
      setContent(post.Content);
    }
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      if (post) {
        await postAPI.updatePost(post.ID, { title, content });
      } else {
        const newPost = await postAPI.createPost({ title, content });
        navigate(`/posts/${newPost.ID}`);
      }
      onSaved();
    } catch (error) {
      alert('글 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="post-form">
      <h2>{post ? '글 수정' : '새 글 작성'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="post-title">제목</label>
          <input
            type="text"
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="마크다운을 입력하세요..."
        />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
};
