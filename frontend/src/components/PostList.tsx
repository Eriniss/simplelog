import { useEffect, useState } from 'react';
import type { Post } from '../types';
import { getPosts } from '../api';
import { formatDate } from '../utils';
import { Link, useSearchParams } from 'react-router-dom';

const PostList = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit') || '10';
    const limit = limitParam === 'all' ? 'all' : parseInt(limitParam);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'title';

    useEffect(() => {
        loadPosts();
    }, [page, limit, search, type]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const offset = limit === 'all' ? 0 : (page - 1) * (limit as number);
            const res = await getPosts(offset, limit, search, type);
            setPosts(res.data.posts || []);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error('Failed to load posts', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        setSearchParams({
            page: '1',
            limit: limitParam,
            search: formData.get('search') as string,
            type: formData.get('type') as string,
        });
    };

    const handlePageChange = (newPage: number) => {
        setSearchParams({
            page: newPage.toString(),
            limit: limitParam,
            search,
            type,
        });
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSearchParams({
            page: '1',
            limit: e.target.value,
            search,
            type,
        });
    };

    const totalPages = limit === 'all' ? 1 : Math.ceil(total / (limit as number));

    if (loading) return <div className="loading">게시글을 불러오는 중...</div>;

    return (
        <div className="container">
            <div id="posts-list">
                <div className="search-container">
                    <form onSubmit={handleSearch} style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
                        <select name="type" defaultValue={type} id="search-type">
                            <option value="title">제목</option>
                            <option value="tag">태그</option>
                        </select>
                        <input
                            type="text"
                            name="search"
                            defaultValue={search}
                            id="search-input"
                            placeholder="검색어를 입력하세요..."
                        />
                    </form>
                </div>

                <div id="new-post-btn-container" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                    <Link to="/write" className="btn btn-primary">새 글 작성</Link>
                </div>

                <div id="posts-container">
                    {posts.length === 0 ? (
                        <div className="empty-state">아직 작성된 글이 없습니다.</div>
                    ) : (
                        posts.map(post => (
                            <Link to={`/posts/${post.ID}`} key={post.ID} style={{ textDecoration: 'none' }}>
                                <div className="post-card">
                                    <h3 className="post-card-title">
                                        {post.Title} {post.IsSecret && <span className="secret-icon" title="비밀글">🔒</span>}
                                    </h3>
                                    <div className="post-meta">
                                        <div className="post-card-author">
                                            {post.AuthorAvatar && <img src={post.AuthorAvatar} alt="프로필" className="post-card-avatar" />}
                                            <span className="post-card-author-name">{post.AuthorUsername || '익명'}</span>
                                        </div>
                                        <span>•</span>
                                        <span className="post-card-date">{formatDate(post.CreatedAt)}</span>
                                    </div>
                                    {post.Tags && post.Tags.length > 0 && (
                                        <div className="post-tags">
                                            {post.Tags.map(tag => (
                                                <span key={tag.ID} className="post-tag">#{tag.Name}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="post-preview">
                                        {post.Content.substring(0, 150)}{post.Content.length > 150 ? '...' : ''}
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <div className="pagination-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem', gap: '1rem', position: 'relative' }}>
                    <div className="pagination-container" id="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(page - 1)}
                        >
                            이전
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                className={`pagination-btn ${p === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(p)}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            className="pagination-btn"
                            disabled={page >= totalPages}
                            onClick={() => handlePageChange(page + 1)}
                        >
                            다음
                        </button>
                    </div>
                    <div style={{ position: 'absolute', right: 0 }}>
                        <select
                            id="page-size-select"
                            className="page-size-selector"
                            value={limitParam}
                            onChange={handleLimitChange}
                        >
                            <option value="10">10개씩 보기</option>
                            <option value="25">25개씩 보기</option>
                            <option value="50">50개씩 보기</option>
                            <option value="100">100개씩 보기</option>
                            <option value="all">전체 보기</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostList;
