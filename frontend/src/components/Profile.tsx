import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../types';
import { getMe, getUserTags, type UserTag } from '../api';

const Profile = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [tags, setTags] = useState<UserTag[]>([]);
    const [tagsExpanded, setTagsExpanded] = useState(false);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const res = await getMe();
            setUser(res.data);

            // Load user tags (first tag acts as project)
            try {
                const tagsRes = await getUserTags(res.data.ID);
                setTags(tagsRes.data);
            } catch (error) {
                console.error('Failed to load user tags', error);
            }
        } catch (error) {
            console.error('Failed to load profile', error);
            // Redirect to login if needed, or show error
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">프로필을 불러오는 중...</div>;
    if (!user) return <div className="empty-state">로그인이 필요합니다.</div>;

    return (
        <div className="container">
            <div className="profile-container">
                <div className="profile-header">
                    <h2>프로필</h2>
                </div>

                <div className="profile-card">
                    <div className="profile-avatar-section">
                        {user.Avatar ? (
                            <img
                                src={user.Avatar}
                                alt="프로필 사진"
                                className="profile-avatar-img"
                                onClick={() => window.open(user.Avatar, '_blank', 'width=800,height=600')}
                                style={{ cursor: 'pointer', display: 'block' }}
                                title="클릭하여 전체 사진 보기"
                            />
                        ) : (
                            <div className="profile-avatar-img" style={{ backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span>No Image</span>
                            </div>
                        )}
                    </div>

                    <div className="profile-section">
                        <h3>기본 정보</h3>
                        <div className="profile-field">
                            <label>사용자명</label>
                            <div className="profile-value">{user.Username || '-'}</div>
                        </div>
                        <div className="profile-field">
                            <label>이메일</label>
                            <div className="profile-value">{user.Email || '-'}</div>
                        </div>
                        <div className="profile-field">
                            <label>소개</label>
                            <div className="profile-value">{user.Intro || '-'}</div>
                        </div>
                        <div className="profile-field">
                            <label>사용자 ID</label>
                            <div className="profile-value">{user.ID || '-'}</div>
                        </div>
                        <div className="profile-field">
                            <label>권한</label>
                            <div className="profile-value">
                                <span className="badge">{user.Role || 'user'}</span>
                            </div>
                        </div>
                    </div>

                    {tags.length > 0 && (
                        <div className="profile-section">
                            <h3>내 태그</h3>
                            <div className="profile-tags-container">
                                {(tagsExpanded ? tags : tags.slice(0, 5)).map((tag, index) => (
                                    <Link
                                        key={index}
                                        to={`/?search=${encodeURIComponent(tag.name)}&type=tag`}
                                        className="profile-tag-badge"
                                    >
                                        #{tag.name}
                                        <span className="profile-tag-count">{tag.count}</span>
                                    </Link>
                                ))}
                                {!tagsExpanded && tags.length > 5 && (
                                    <button
                                        className="profile-tag-more"
                                        onClick={() => setTagsExpanded(true)}
                                    >
                                        +{tags.length - 5}
                                    </button>
                                )}
                                {tagsExpanded && tags.length > 5 && (
                                    <button
                                        className="profile-tag-less"
                                        onClick={() => setTagsExpanded(false)}
                                    >
                                        접기
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="profile-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <Link to="/edit-profile" className="btn btn-primary">프로필 수정</Link>
                        <Link to="/" className="btn btn-secondary">홈으로 돌아가기</Link>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Profile;
