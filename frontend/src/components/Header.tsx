import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getLogoutUrl } from '../api/client';
import type { User } from '../types';

interface HeaderProps {
  user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const closeDropdown = () => {
    setDropdownOpen(false);
  };

  return (
    <header>
      <div className="container">
        <h1 className="logo">
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <img src="/image.png" alt="SimpleLog" style={{ height: '32px', verticalAlign: 'middle' }} />
          </Link>
        </h1>
        <nav>
          {user && (
            <div className="user-info" style={{ display: 'flex' }}>
              <div
                className={`user-menu-trigger ${dropdownOpen ? 'active' : ''}`}
                onClick={toggleDropdown}
              >
                {user.Avatar && (
                  <img
                    id="user-avatar"
                    className="user-avatar"
                    src={user.Avatar}
                    alt="프로필"
                  />
                )}
                <span>{user.Username || user.Email}</span>
                <span className="badge">{user.Role}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 6l4 4 4-4H4z"/>
                </svg>
              </div>
              {dropdownOpen && (
                <div
                  className="user-dropdown"
                  style={{ display: 'block' }}
                  onClick={closeDropdown}
                >
                  <Link to="/profile" className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2 2H6a5 5 0 00-5 5v1h12v-1a5 5 0 00-5-5z"/>
                    </svg>
                    프로필
                  </Link>
                  <div className="dropdown-divider"></div>
                  <a href={getLogoutUrl()} className="dropdown-item logout-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6 13V3H4v10h2zm6-6l-4 4V7l4 4z"/>
                    </svg>
                    로그아웃
                  </a>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
