import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPost, createPost, updatePost, uploadImage } from '../api';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';

const PostEditor = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSecret, setIsSecret] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (id) {
            loadPost(parseInt(id));
        }
    }, [id]);

    const loadPost = async (postId: number) => {
        try {
            const res = await getPost(postId);
            const post = res.data;
            setTitle(post.Title);
            setContent(post.Content);
            setTags(post.Tags ? post.Tags.map(t => t.Name) : []);
            setIsSecret(post.IsSecret);
        } catch (error) {
            console.error('Failed to load post', error);
            alert('글을 불러오는데 실패했습니다.');
            navigate('/');
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleImageUpload = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB 이하여야 합니다.');
            return;
        }

        try {
            const res = await uploadImage(file);
            const imageUrl = res.data.url;
            const imageMarkdown = `![이미지](${imageUrl})`;

            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const before = content.substring(0, start);
                const after = content.substring(end);

                // Add spacing if needed
                const needsSpaceBefore = before && !before.endsWith('\n');
                const needsSpaceAfter = after && !after.startsWith('\n');
                const finalMarkdown = (needsSpaceBefore ? '\n' : '') + imageMarkdown + (needsSpaceAfter ? '\n' : '');

                const newContent = before + finalMarkdown + after;
                setContent(newContent);

                // Restore cursor position
                setTimeout(() => {
                    const newPos = start + finalMarkdown.length;
                    textarea.selectionStart = textarea.selectionEnd = newPos;
                    textarea.focus();
                }, 0);
            }
        } catch (error) {
            console.error('Image upload error:', error);
            alert('이미지 업로드 실패');
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await handleImageUpload(file);
                }
            }
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                await handleImageUpload(file);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const data = { title, content, tags, isSecret };
            if (id) {
                await updatePost(parseInt(id), data);
                navigate(`/posts/${id}`);
            } else {
                const res = await createPost(data);
                navigate(`/posts/${res.data.ID}`);
            }
        } catch (error) {
            console.error('Failed to save post', error);
            alert('저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const handleIntermediateSave = async () => {
        if (!title.trim() || !content.trim()) {
            showNotification('제목과 내용을 입력해주세요.', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = { title, content, tags, isSecret };
            if (id) {
                await updatePost(parseInt(id), data);
                showNotification('중간 저장되었습니다.');
            } else {
                const res = await createPost(data);
                // Update URL without reloading page if possible, or just navigate to edit page
                // navigate(`/edit/${res.data.ID}`, { replace: true });
                // Since we are in write mode, switching to edit mode is better
                navigate(`/edit/${res.data.ID}`, { replace: true });
                showNotification('중간 저장되었습니다.');
            }
        } catch (error) {
            console.error('Failed to save post', error);
            showNotification('저장에 실패했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleIntermediateSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [title, content, tags, isSecret, id]); // Dependencies needed for handleIntermediateSave closure

    // ... existing code ...

    return (
        <div className="container wide-mode">
            <form onSubmit={handleSubmit} className="post-form">
                <h2>{id ? '글 수정' : '새 글 작성'}</h2>

                <div className="form-group">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                        required
                    />
                </div>

                <div className="form-group">
                    <div className="tag-input-container" style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', backgroundColor: 'white' }}>
                        <div className="tag-list" style={{ display: 'contents' }}>
                            {tags.map(tag => (
                                <span key={tag} className="tag-badge">
                                    #{tag}
                                    <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="태그를 입력하고 Enter (쉼표로 구분)"
                            style={{ border: 'none', outline: 'none', flex: 1, padding: '0' }}
                        />
                    </div>
                </div>

                <div className="form-group secret-checkbox-container">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={isSecret}
                            onChange={(e) => setIsSecret(e.target.checked)}
                        />
                        비밀글로 작성
                    </label>
                </div>

                <div className="editor-container">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        placeholder="내용을 입력하세요 (Markdown 지원, 이미지 드래그 앤 드롭/붙여넣기 가능)"
                        style={{ padding: '1rem' }}
                    />
                    <div className="editor-preview post-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
                <div className="editor-help">
                    * 이미지를 드래그 앤 드롭하거나 붙여넣기(Ctrl+V)하면 자동으로 업로드됩니다.
                </div>

                <div className="form-actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">취소</button>
                    <button type="button" onClick={handleIntermediateSave} className="btn btn-secondary" disabled={loading} style={{ marginRight: '0.5rem' }}>
                        중간 저장
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '저장 중...' : (id ? '수정 완료' : '작성 완료')}
                    </button>
                </div>
            </form>

            {
                notification && (
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        backgroundColor: notification.type === 'success' ? '#5bd15b' : '#dc3545',
                        color: 'white',
                        padding: '1rem 2rem',
                        borderRadius: '4px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        animation: 'fadeIn 0.3s ease-in-out'
                    }}>
                        {notification.message}
                    </div>
                )
            }
        </div >
    );
};

export default PostEditor;
