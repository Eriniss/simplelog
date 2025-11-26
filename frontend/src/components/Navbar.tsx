import { useEffect, useState, useRef } from 'react';
import { getMe } from '../api';
import type { User } from '../types';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const [user, setUser] = useState<User | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [logoUrl, setLogoUrl] = useState<string>('/image.png');

    const LOGO_BASE_URL = 'https://assets.polipixel.link/v1/AUTH_0afbe81aa22d4db88e82e7c158f4bf6b/assets/';
    const LOGO_IMAGES = [
        'IMG_0322.PNG',
        'IMG_0339.PNG',
        'IMG_0341.PNG',
        'IMG_0343.PNG',
        'IMG_0344.PNG',
        'IMG_0345.PNG',
        'IMG_0346.PNG',
        'IMG_0347.PNG',
        'IMG_0349.PNG'
    ];

    useEffect(() => {
        getMe().then(res => setUser(res.data)).catch(() => setUser(null));

        const randomIndex = Math.floor(Math.random() * LOGO_IMAGES.length);
        const selectedLogo = LOGO_BASE_URL + LOGO_IMAGES[randomIndex];
        setLogoUrl(selectedLogo);

        // Update favicon
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
            link.href = selectedLogo;
        } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = selectedLogo;
            document.head.appendChild(newLink);
        }

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
        <header style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'white', borderBottom: '2px solid #5bd15b' }}>
            <div className="container">
                <a href="/" className="logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <img src={logoUrl} alt="SimpleLog" style={{ height: '40px', marginRight: '10px', verticalAlign: 'middle' }} />
                    <span style={{ color: '#5bd15b', fontWeight: 'bold', fontSize: '1.5rem' }}>SimpleLog</span>
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
