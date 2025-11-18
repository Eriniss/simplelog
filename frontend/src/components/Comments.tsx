import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Comment, User } from '../types';
import { commentAPI } from '../api/client';
import { formatDate, countAllComments } from '../utils/markdown';

interface CommentsProps {
  postId: number;
  comments: Comment[];
  user: User | null;
  onUpdate: () => void;
}

export const Comments: React.FC<CommentsProps> = ({ postId, comments, user, onUpdate }) => {
  const navigate = useNavigate();
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);

  const totalComments = countAllComments(comments);

  const handleSubmit = async () => {
    if (!commentInput.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      if (editingCommentId) {
        await commentAPI.updateComment(editingCommentId, { content: commentInput });
      } else {
        await commentAPI.createComment(postId, {
          content: commentInput,
          parent_id: replyToCommentId || undefined,
        });
      }
      setCommentInput('');
      cancelCommentForm();
      onUpdate();
    } catch (error) {
      alert('댓글 작성에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await commentAPI.deleteComment(commentId);
      onUpdate();
    } catch (error) {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleEdit = (commentId: number, content: string) => {
    setEditingCommentId(commentId);
    setReplyToCommentId(null);
    setCommentInput(content);
  };

  const handleReply = (commentId: number) => {
    setReplyToCommentId(commentId);
    setEditingCommentId(null);
    setCommentInput('');
  };

  const cancelCommentForm = () => {
    setEditingCommentId(null);
    setReplyToCommentId(null);
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const canEdit = user && (user.Role === 'admin' || user.ID === comment.AuthorID);
    const hasAvatar = comment.AuthorAvatar && comment.AuthorAvatar.trim() !== '';

    return (
      <div key={comment.ID} className="comment">
        <div className="comment-header">
          <div className="comment-author">
            {hasAvatar && (
              <img
                src={comment.AuthorAvatar}
                alt="프로필"
                className="comment-avatar clickable-profile"
                onClick={() => navigate(`/users/${comment.AuthorID}`)}
              />
            )}
            <span
              className="comment-author-name clickable-profile"
              onClick={() => navigate(`/users/${comment.AuthorID}`)}
            >
              {comment.AuthorUsername || '익명'}
            </span>
            <span className="comment-date">{formatDate(comment.CreatedAt)}</span>
          </div>
          {canEdit && (
            <div className="comment-actions">
              <button
                className="btn btn-secondary edit-comment-btn"
                onClick={() => handleEdit(comment.ID, comment.Content)}
              >
                수정
              </button>
              <button
                className="btn btn-danger delete-comment-btn"
                onClick={() => handleDelete(comment.ID)}
              >
                삭제
              </button>
            </div>
          )}
        </div>
        <div className="comment-content">{comment.Content}</div>
        {!isReply && (
          <button
            className="comment-reply-btn"
            onClick={() => handleReply(comment.ID)}
          >
            답글
          </button>
        )}
        {comment.Replies && comment.Replies.length > 0 && (
          <div className="comment-replies">
            {comment.Replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="comments-section">
      <h3 className="comments-title">댓글 ({totalComments})</h3>
      <div id="comments-container">
        {comments.length === 0 ? (
          <div className="empty-state">아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
      <div className="comment-form-box">
        <input
          type="text"
          className="comment-input"
          placeholder="댓글을 남겨보세요"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          className="comment-submit-btn"
          onClick={handleSubmit}
        >
          {editingCommentId ? '수정' : '등록'}
        </button>
        {(editingCommentId || replyToCommentId) && (
          <button
            id="cancel-comment-btn"
            onClick={() => {
              setCommentInput('');
              cancelCommentForm();
            }}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
};
