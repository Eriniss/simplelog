import { useEffect, useState, useRef } from 'react';
import { getMe } from '../api';
import type { User } from '../types';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const [user, setUser] = useState<User | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getMe().then(res => setUser(res.data)).catch(() => setUser(null));

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

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    return (
        <header>
            <div className="container">
                <a href="/" className="logo">
                    <img src="/image.png" alt="SimpleLog" style={{ height: '40px', marginRight: '10px', verticalAlign: 'middle' }} />
                </a>
                <nav>
                    {user ? (
                        <div className="user-info" ref={dropdownRef}>
                            <div className={`user-menu-trigger ${dropdownOpen ? 'active' : ''}`} onClick={toggleDropdown}>
                                {user.Avatar && <img src={user.Avatar} alt="Profile" className="user-avatar" />}
                                <span>{user.Username || user.ID}</span>
                                <span className="badge">{user.Role || 'user'}</span>
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4 6l4 4 4-4H4z" />
                                </svg>
                            </div>
                            {dropdownOpen && (
                                <div className="user-dropdown">
                                    <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                        프로필
                                    </Link>
                                    <div className="dropdown-divider"></div>
                                    <a href="/auth/logout" className="dropdown-item logout-item">
                                        로그아웃
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <a href="/auth/login" className="btn btn-primary">Login</a>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
