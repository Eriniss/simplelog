import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPost, getPosts } from '../api';
import type { Post } from '../types';

interface ProjectNavigationProps {
    postId: number;
}

const ProjectNavigation = ({ postId }: ProjectNavigationProps) => {
    const [currentPost, setCurrentPost] = useState<Post | null>(null);
    const [projectPosts, setProjectPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNavigation();
    }, [postId]);

    const loadNavigation = async () => {
        try {
            // Get current post
            const postRes = await getPost(postId);
            const post = postRes.data;
            setCurrentPost(post);

            // Get project name (first tag)
            const projectName = post.Tags?.[0]?.Name;
            if (!projectName) {
                setLoading(false);
                return;
            }

            // Get all posts with this tag
            const postsRes = await getPosts(0, 'all', projectName, 'tag');
            const allPosts = postsRes.data.posts;

            // Filter to only posts where this tag is the FIRST tag, and sort
            const filtered = allPosts
                .filter(p => p.Tags?.[0]?.Name === projectName)
                .sort((a, b) => new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime());

            setProjectPosts(filtered);
        } catch (error) {
            console.error('Failed to load project navigation', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="project-nav-loading">로딩 중...</div>;
    if (!currentPost || !currentPost.Tags?.[0]) return null;

    const projectName = currentPost.Tags[0].Name;

    // 'np' (no project) 예약어는 프로젝트 네비게이션 표시 안 함
    if (projectName === 'np') return null;

    const currentIndex = projectPosts.findIndex(p => p.ID === currentPost.ID);
    const previousPost = currentIndex > 0 ? projectPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < projectPosts.length - 1 ? projectPosts[currentIndex + 1] : null;

    return (
        <aside className="project-navigation">
            <div className="project-nav-header">
                <h3 className="project-nav-title">
                    📁 {projectName}
                </h3>
                <span className="project-post-count">
                    {projectPosts.length}개의 글
                </span>
            </div>

            {/* Previous/Next Navigation */}
            <div className="project-nav-arrows">
                {previousPost ? (
                    <Link to={`/posts/${previousPost.ID}`} className="project-nav-arrow prev">
                        <span className="arrow-icon">←</span>
                        <span className="arrow-text">{previousPost.Title}</span>
                    </Link>
                ) : (
                    <div className="project-nav-arrow disabled">
                        <span className="arrow-icon">←</span>
                        <span className="arrow-text">이전 글 없음</span>
                    </div>
                )}

                {nextPost ? (
                    <Link to={`/posts/${nextPost.ID}`} className="project-nav-arrow next">
                        <span className="arrow-text">{nextPost.Title}</span>
                        <span className="arrow-icon">→</span>
                    </Link>
                ) : (
                    <div className="project-nav-arrow disabled">
                        <span className="arrow-text">다음 글 없음</span>
                        <span className="arrow-icon">→</span>
                    </div>
                )}
            </div>

            {/* All Posts in Project */}
            <div className="project-posts-list">
                <h4 className="project-posts-list-title">시리즈 목록</h4>
                <ul className="project-posts-items">
                    {projectPosts.map((post, index) => (
                        <li
                            key={post.ID}
                            className={`project-post-item ${
                                post.ID === currentPost.ID ? 'active' : ''
                            }`}
                        >
                            <Link to={`/posts/${post.ID}`}>
                                <span className="post-number">{index + 1}</span>
                                <span className="post-title">{post.Title}</span>
                                {post.ID === currentPost.ID && (
                                    <span className="current-indicator">●</span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};

export default ProjectNavigation;
