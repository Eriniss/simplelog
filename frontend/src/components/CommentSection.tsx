import { useEffect, useState } from 'react';
import type { Comment, User } from '../types';
import { getComments, createComment, updateComment, deleteComment, getMe } from '../api';
import { formatDate } from '../utils';

interface CommentSectionProps {
    postId: number;
}

const CommentSection = ({ postId }: CommentSectionProps) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<number | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [editing, setEditing] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        loadComments();
        getMe().then(res => setCurrentUser(res.data)).catch(() => setCurrentUser(null));
    }, [postId]);

    const loadComments = async () => {
        try {
            const res = await getComments(postId);
            setComments(res.data);
        } catch (error) {
            console.error('Failed to load comments', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await createComment(postId, newComment);
            setNewComment('');
            loadComments();
        } catch (error) {
            alert('댓글 작성에 실패했습니다.');
        }
    };

    const handleReply = async (parentId: number) => {
        if (!replyContent.trim()) return;
        try {
            await createComment(postId, replyContent, parentId);
            setReplyContent('');
            setReplyTo(null);
            loadComments();
        } catch (error) {
            alert('답글 작성에 실패했습니다.');
        }
    };

    const handleUpdate = async (commentId: number) => {
        if (!editContent.trim()) return;
        try {
            await updateComment(commentId, editContent);
            setEditing(null);
            setEditContent('');
            loadComments();
        } catch (error) {
            alert('댓글 수정에 실패했습니다.');
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteComment(commentId);
            loadComments();
        } catch (error) {
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    const renderComment = (comment: Comment, isReply = false) => {
        const isAuthor = currentUser && (currentUser.ID === comment.AuthorID || currentUser.Role === 'admin');

        return (
            <div key={comment.ID} className={`comment-item ${isReply ? 'reply-item' : ''}`} style={isReply ? { marginLeft: '2rem', marginTop: '0.5rem' } : { marginBottom: '1rem' }}>
                <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {comment.AuthorAvatar && <img src={comment.AuthorAvatar} alt="Profile" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
                        <span style={{ fontWeight: 600 }}>{comment.AuthorUsername || '익명'}</span>
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>{formatDate(comment.CreatedAt)}</span>
                    </div>
                    {isAuthor && (
                        <div className="comment-actions">
                            <button onClick={() => { setEditing(comment.ID); setEditContent(comment.Content); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginRight: '0.5rem' }}>수정</button>
                            <button onClick={() => handleDelete(comment.ID)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}>삭제</button>
                        </div>
                    )}
                </div>

                {editing === comment.ID ? (
                    <div className="edit-form">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="comment-input"
                            style={{ marginBottom: '0.5rem' }}
                        />
                        <div style={{ textAlign: 'right', gap: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditing(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>취소</button>
                            <button onClick={() => handleUpdate(comment.ID)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>저장</button>
                        </div>
                    </div>
                ) : (
                    <div className="comment-content" style={{ lineHeight: 1.5 }}>{comment.Content}</div>
                )}

                {!isReply && currentUser && (
                    <div className="reply-action" style={{ marginTop: '0.25rem' }}>
                        <button onClick={() => setReplyTo(replyTo === comment.ID ? null : comment.ID)} style={{ background: 'none', border: 'none', color: '#5bd15b', cursor: 'pointer', fontSize: '0.9rem' }}>답글 달기</button>
                    </div>
                )}

                {replyTo === comment.ID && (
                    <div className="reply-form" style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                        <div className="comment-form-box">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="답글을 작성하세요..."
                                className="comment-input"
                            />
                            <button onClick={() => handleReply(comment.ID)} className="btn btn-primary">등록</button>
                        </div>
                    </div>
                )}

                {comment.Replies && comment.Replies.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()).map(reply => renderComment(reply, true))}
            </div>
        );
    };

    return (
        <div className="comments-section">
            <h3 className="comments-title">댓글 {comments.length}개</h3>

            {currentUser ? (
                <form onSubmit={handleSubmit} className="comment-form-box" style={{ marginBottom: '2rem' }}>
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 작성하세요..."
                        className="comment-input"
                    />
                    <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>등록</button>
                </form>
            ) : (
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '2rem' }}>
                    <a href="/auth/login" style={{ color: '#5bd15b', textDecoration: 'none', fontWeight: 'bold' }}>로그인</a> 후 댓글을 작성할 수 있습니다.
                </div>
            )}

            <div id="comments-container">
                {comments.map(comment => renderComment(comment))}
            </div>
        </div>
    );
};

export default CommentSection;
