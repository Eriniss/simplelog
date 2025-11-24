import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { getMe, updateProfile } from '../api';

const EditProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState('');
    const [intro, setIntro] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const res = await getMe();
            const userData = res.data;
            setUser(userData);
            setUsername(userData.Username || '');
            setAvatar(userData.Avatar || '');
            setIntro(userData.Intro || '');
        } catch (error) {
            console.error('Failed to load profile', error);
            alert('프로필을 불러오는데 실패했습니다.');
            navigate('/profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile({
                username: username,
                avatar: avatar,
                intro: intro
            });
            alert('프로필이 수정되었습니다.');
            navigate('/profile');
        } catch (error) {
            console.error('Failed to update profile', error);
            alert('프로필 수정에 실패했습니다.');
        }
    };

    if (loading) return <div className="loading">로딩 중...</div>;
    if (!user) return <div className="empty-state">로그인이 필요합니다.</div>;

    return (
        <div className="container">
            <div className="profile-container">
                <div className="profile-header">
                    <h2>프로필 수정</h2>
                </div>

                <form onSubmit={handleSubmit} className="profile-card">
                    <div className="profile-avatar-section" style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                        {avatar ? (
                            <img
                                src={avatar}
                                alt="Preview"
                                className="profile-avatar-img"
                                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #5bd15b' }}
                            />
                        ) : (
                            <div className="profile-avatar-img" style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #ddd' }}>
                                <span>No Image</span>
                            </div>
                        )}
                    </div>

                    <div className="profile-section">
                        <h3>기본 정보</h3>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>사용자명</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="comment-input"
                                style={{ width: '100%', padding: '0.5rem' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>프로필 이미지 URL</label>
                            <input
                                type="text"
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                                className="comment-input"
                                style={{ width: '100%', padding: '0.5rem' }}
                                placeholder="https://example.com/avatar.png"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>소개</label>
                            <textarea
                                value={intro}
                                onChange={(e) => setIntro(e.target.value)}
                                className="comment-input"
                                style={{ width: '100%', padding: '0.5rem', minHeight: '100px' }}
                            />
                        </div>
                    </div>

                    <div className="profile-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <button type="submit" className="btn btn-primary">저장</button>
                        <button type="button" onClick={() => navigate('/profile')} className="btn btn-secondary">취소</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfile;
