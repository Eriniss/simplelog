// Global state
let currentUser = null;
let currentView = 'list'; // 'list', 'single', 'form'
let editingPostId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    try {
        await loadCurrentUser();
        await loadPosts();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Redirect to login if not authenticated
        window.location.href = '/auth/login';
    }
}

function setupEventListeners() {
    // User menu dropdown toggle
    const userMenuTrigger = document.querySelector('.user-menu-trigger');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuTrigger && userDropdown) {
        userMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = userDropdown.style.display === 'block';
            userDropdown.style.display = isActive ? 'none' : 'block';
            userMenuTrigger.classList.toggle('active', !isActive);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            userDropdown.style.display = 'none';
            userMenuTrigger.classList.remove('active');
        });

        userDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        window.location.href = '/auth/logout';
    });

    document.getElementById('new-post-btn')?.addEventListener('click', () => {
        showPostForm();
    });

    document.getElementById('cancel-btn')?.addEventListener('click', () => {
        hidePostForm();
    });

    document.getElementById('post-form')?.addEventListener('submit', handleSubmitPost);

    document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
        showListView();
    });

    document.getElementById('edit-post-btn')?.addEventListener('click', () => {
        const postId = document.getElementById('detail-title').dataset.postId;
        showPostForm(parseInt(postId));
    });

    document.getElementById('delete-post-btn')?.addEventListener('click', handleDeletePost);
}

async function loadCurrentUser() {
    const response = await fetch('/api/me', {
        credentials: 'include'
    });

    if (response.ok) {
        currentUser = await response.json();
        showUserInfo();
        document.getElementById('new-post-btn-container').style.display = 'block';
    } else {
        // Not authenticated - throw error to trigger redirect
        throw new Error('Not authenticated');
    }
}

function showUserInfo() {
    const userInfo = document.getElementById('user-info');

    document.getElementById('user-name').textContent = currentUser.Name || currentUser.Email;
    document.getElementById('user-role').textContent = currentUser.Role;

    userInfo.style.display = 'flex';
}

async function loadPosts() {
    try {
        const response = await fetch('/api/posts', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load posts');
        }

        const posts = await response.json();
        renderPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('posts-container').innerHTML =
            '<div class="empty-state">글을 불러오는데 실패했습니다.</div>';
    }
}

function renderPosts(posts) {
    const container = document.getElementById('posts-container');

    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state">아직 작성된 글이 없습니다.</div>';
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="post-card" onclick="showPost(${post.ID})">
            <h3>${escapeHtml(post.Title)}</h3>
            <div class="post-meta">
                <span>${post.Author?.Name || '익명'}</span> •
                <span>${formatDate(post.CreatedAt)}</span>
            </div>
            <div class="post-preview">${getPreview(post.Content)}</div>
        </div>
    `).join('');
}

async function showPost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load post');
        }

        const post = await response.json();
        renderSinglePost(post);
        showSingleView();
    } catch (error) {
        console.error('Error loading post:', error);
        alert('글을 불러오는데 실패했습니다.');
    }
}

function renderSinglePost(post) {
    console.log('Post data:', post);
    console.log('Author data:', post.Author);
    document.getElementById('detail-title').textContent = post.Title;
    document.getElementById('detail-title').dataset.postId = post.ID;
    document.getElementById('detail-author').textContent = post.Author?.Name || '익명';

    // Format date with edit info if post was modified
    let dateText = `작성: ${formatDate(post.CreatedAt)}`;
    if (post.UpdatedAt && post.UpdatedAt !== post.CreatedAt) {
        const createdTime = new Date(post.CreatedAt).getTime();
        const updatedTime = new Date(post.UpdatedAt).getTime();
        // Only show edit date if it's actually different (more than 1 second difference)
        if (Math.abs(updatedTime - createdTime) > 1000) {
            dateText += ` • 수정: ${formatDate(post.UpdatedAt)}`;
        }
    }
    document.getElementById('detail-date').textContent = dateText;

    document.getElementById('detail-content').innerHTML = renderMarkdown(post.Content);

    // Show edit/delete buttons if user is author or admin
    const actionsDiv = document.getElementById('detail-actions');
    if (currentUser && (currentUser.Role === 'admin' || currentUser.ID === post.AuthorID)) {
        actionsDiv.style.display = 'flex';
    } else {
        actionsDiv.style.display = 'none';
    }
}

function showPostForm(postId = null) {
    editingPostId = postId;

    if (postId) {
        // Load post data for editing
        loadPostForEdit(postId);
        document.getElementById('form-title').textContent = '글 수정';
    } else {
        // Clear form for new post
        document.getElementById('post-form').reset();
        document.getElementById('post-id').value = '';
        document.getElementById('form-title').textContent = '새 글 작성';
    }

    showFormView();
}

async function loadPostForEdit(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load post');
        }

        const post = await response.json();
        document.getElementById('post-id').value = post.ID;
        document.getElementById('post-title').value = post.Title;
        document.getElementById('post-content').value = post.Content;
    } catch (error) {
        console.error('Error loading post:', error);
        alert('글을 불러오는데 실패했습니다.');
    }
}

function hidePostForm() {
    editingPostId = null;
    showListView();
}

async function handleSubmitPost(e) {
    e.preventDefault();

    const postId = document.getElementById('post-id').value;
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;

    try {
        let response;
        if (postId) {
            // Update existing post
            response = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ title, content })
            });
        } else {
            // Create new post
            response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ title, content })
            });
        }

        if (!response.ok) {
            throw new Error('Failed to save post');
        }

        const post = await response.json();
        hidePostForm();
        await loadPosts();
        showPost(post.ID);
    } catch (error) {
        console.error('Error saving post:', error);
        alert('글 저장에 실패했습니다.');
    }
}

async function handleDeletePost() {
    if (!confirm('정말 이 글을 삭제하시겠습니까?')) {
        return;
    }

    const postId = document.getElementById('detail-title').dataset.postId;

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete post');
        }

        showListView();
        await loadPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('글 삭제에 실패했습니다.');
    }
}

// View management
function showListView() {
    currentView = 'list';
    document.getElementById('posts-list').style.display = 'block';
    document.getElementById('single-post-view').style.display = 'none';
    document.getElementById('post-form-container').style.display = 'none';
    if (currentUser) {
        document.getElementById('new-post-btn-container').style.display = 'block';
    }
}

function showSingleView() {
    currentView = 'single';
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('single-post-view').style.display = 'block';
    document.getElementById('post-form-container').style.display = 'none';
    document.getElementById('new-post-btn-container').style.display = 'none';
}

function showFormView() {
    currentView = 'form';
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('single-post-view').style.display = 'none';
    document.getElementById('post-form-container').style.display = 'block';
    document.getElementById('new-post-btn-container').style.display = 'none';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function getPreview(content, maxLength = 150) {
    const text = content.replace(/[#*\-]/g, '').trim();
    return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
}

function renderMarkdown(content) {
    let html = escapeHtml(content);

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}
