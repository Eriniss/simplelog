import { useThemeStore } from '../stores/themeStore';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle dark mode"
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? (
        // Sun icon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        // Moon icon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
