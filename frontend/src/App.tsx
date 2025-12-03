import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import PostEditor from './components/PostEditor';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import { useThemeStore } from './stores/themeStore';

function App() {
  const { isDark, setTheme } = useThemeStore();

  useEffect(() => {
    // Apply theme on app load
    setTheme(isDark);
  }, [isDark, setTheme]);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<PostList />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/write" element={<PostEditor />} />
        <Route path="/edit/:id" element={<PostEditor />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

