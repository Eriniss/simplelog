import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Post, User } from '../types';
import { getPost, deletePost, getMe, updatePost } from '../api';
import { formatDate } from '../utils';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
import CommentSection from './CommentSection';
import { getAvatarUrl } from '../utils/avatar';
import { useTocExtraction } from '../hooks/useTocExtraction';
import TableOfContents from './TableOfContents';
import ProjectNavigation from './ProjectNavigation';

// Helper function to extract text content from React children
const getTextContent = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(getTextContent).join('');
    if (children && typeof children === 'object' && 'props' in children) {
        const element = children as { props: { children?: React.ReactNode } };
        return getTextContent(element.props.children);
    }
    return '';
};

// Helper function to generate heading ID
const slugify = (children: React.ReactNode): string => {
    const text = getTextContent(children);
    return text
        .toLowerCase()
        .replace(/[^\w가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};

const PostDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Memoize the ReactMarkdown components at the top level (before any returns)
    const markdownComponents = useMemo(() => ({
        h1: ({ node, children, ...props }: any) => (
            <h1 id={slugify(children)} {...props}>{children}</h1>
        ),
        h2: ({ node, children, ...props }: any) => (
            <h2 id={slugify(children)} {...props}>{children}</h2>
        ),
        h3: ({ node, children, ...props }: any) => (
            <h3 id={slugify(children)} {...props}>{children}</h3>
        ),
        input: ({ node, ...props }: any) => (
            <input {...props} disabled={false} readOnly />
        ),
        img: ({ node, ...props }: any) => (
            <img
                {...props}
                style={{ cursor: 'pointer', maxWidth: '100%' }}
                onClick={() => window.open(props.src, '_blank')}
                title="클릭하여 원본 보기"
            />
        )
    }), []);

    // Extract TOC items (safe to call with empty string if post is null)
    const tocItems = useTocExtraction(post?.Content || '');

    useEffect(() => {
        if (id) {
            loadPost(parseInt(id));
        }
        getMe().then(res => setCurrentUser(res.data)).catch(() => setCurrentUser(null));
    }, [id]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadPost = async (postId: number) => {
        try {
            const res = await getPost(postId);
            setPost(res.data);
        } catch (error) {
            console.error('Failed to load post', error);
            alert('글을 불러오는데 실패했습니다.');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!post || !confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deletePost(post.ID);
            navigate('/');
        } catch (error) {
            alert('삭제에 실패했습니다.');
        }
    };

    const handleCheckboxClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLInputElement;
        if (target.tagName !== 'INPUT' || target.type !== 'checkbox') return;

        // Prevent default browser behavior to handle it manually (or let it toggle visually and we update state)
        // Actually, since it's controlled by markdown, we should update the source.
        // But React won't re-render the checkbox state unless the prop changes.
        // We can optimistically update the UI or just force update.

        // Find index of this checkbox among all checkboxes in the content
        const checkboxes = document.querySelectorAll('.post-content input[type="checkbox"]');
        const index = Array.from(checkboxes).indexOf(target);

        if (index === -1 || !post) return;

        // Find the Nth occurrence of - [ ] or - [x] in the markdown content
        const regex = /-\s\[([ x])\]/g;
        let match;
        let currentIndex = 0;
        let newContent = post.Content;

        // We need to iterate to find the correct match
        while ((match = regex.exec(post.Content)) !== null) {
            if (currentIndex === index) {
                // Found the target checkbox in markdown
                const isChecked = match[1] === 'x';
                const newStatus = isChecked ? ' ' : 'x';

                // Replace only this instance
                const start = match.index;
                const end = start + match[0].length;
                newContent = post.Content.substring(0, start) + `- [${newStatus}]` + post.Content.substring(end);
                break;
            }
            currentIndex++;
        }

        if (newContent !== post.Content) {
            // Optimistic update
            const updatedPost = { ...post, Content: newContent };
            setPost(updatedPost);

            try {
                await updatePost(post.ID, {
                    title: post.Title,
                    content: newContent,
                    tags: post.Tags.map(t => t.Name),
                    isSecret: post.IsSecret
                });
            } catch (error) {
                console.error('Failed to update todo status', error);
                // Revert on failure
                setPost(post);
                alert('상태 변경 저장에 실패했습니다.');
            }
        }
    };

    if (loading) return <div className="loading">글을 불러오는 중...</div>;
    if (!post) return <div className="empty-state">글을 찾을 수 없습니다.</div>;

    const isAuthor = currentUser && (currentUser.ID === post.AuthorID || currentUser.Role === 'admin');

    return (
        <div className="post-detail-layout">
            <aside className="post-detail-project-nav">
                <ProjectNavigation postId={post.ID} />
            </aside>
            <div className="post-detail-main">
                <div className="post-detail">
                    <div className="post-header-container">
                        <h1>{post.Title} {post.IsSecret && <span className="secret-icon" title="비밀글">🔒</span>}</h1>
                        {isAuthor && (
                            <div className="post-actions-dropdown" ref={dropdownRef}>
                                <button
                                    className="post-actions-trigger"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    aria-label="게시글 옵션"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="5" r="2" />
                                        <circle cx="12" cy="12" r="2" />
                                        <circle cx="12" cy="19" r="2" />
                                    </svg>
                                </button>
                                {dropdownOpen && (
                                    <div className="post-actions-dropdown-menu">
                                        <Link
                                            to={`/edit/${post.ID}`}
                                            className="dropdown-item"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            ✏️ 수정
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setDropdownOpen(false);
                                                handleDelete();
                                            }}
                                            className="dropdown-item delete-item"
                                        >
                                            🗑️ 삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="post-meta">
                        <div id="detail-author">
                            <img
                                src={getAvatarUrl({ ID: post.AuthorID, Avatar: post.AuthorAvatar } as User)}
                                alt="프로필"
                                className="post-author-avatar"
                            />
                            <span className="post-author-name">{post.AuthorUsername || '익명'}</span>
                        </div>
                        <div id="detail-date">
                            <span>•</span>
                            <span>{formatDate(post.CreatedAt)}</span>
                            {post.UpdatedAt !== post.CreatedAt && <span> • {"수정: " + formatDate(post.UpdatedAt)}</span>}
                        </div>
                    </div>

                    {post.Tags && post.Tags.length > 0 && (
                        <div className="post-tags">
                            {post.Tags.map(tag => (
                                <span key={tag.ID} className={`post-tag ${tag.Name === 'np' ? 'tag-np' : ''}`}>#{tag.Name}</span>
                            ))}
                        </div>
                    )}

                    <div className="post-content" onClick={handleCheckboxClick}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                        >
                            {post.Content}
                        </ReactMarkdown>
                    </div>

                    <div className="post-actions-container" style={{ marginTop: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="post-actions">
                            {isAuthor && (
                                <>
                                    <Link to={`/edit/${post.ID}`} className="btn btn-secondary" style={{ marginRight: '0.5rem' }}>수정</Link>
                                    <button onClick={handleDelete} className="btn btn-danger">삭제</button>
                                </>
                            )}
                        </div>
                        <Link to="/" className="btn btn-secondary">목록으로</Link>
                    </div>

                    <CommentSection postId={post.ID} />
                </div>
            </div>
            <aside className="post-detail-toc">
                <TableOfContents items={tocItems} />
            </aside>
        </div>
    );
};

export default PostDetail;
