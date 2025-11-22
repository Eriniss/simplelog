// Global state
let currentUser = null;
let currentView = 'list'; // 'list', 'single', 'form', 'profile'
let editingPostId = null;
let viewingUserId = null;

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

    // Image upload event listeners
    setupImageUpload();
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

    console.log('Current user data:', currentUser);
    console.log('Avatar value:', currentUser.Avatar);

    document.getElementById('user-name').textContent = currentUser.Username || currentUser.Email;
    document.getElementById('user-role').textContent = currentUser.Role;

    // Show avatar if available
    const avatarImg = document.getElementById('user-avatar');
    if (currentUser.Avatar && currentUser.Avatar.trim() !== '') {
        console.log('Setting avatar src to:', currentUser.Avatar);
        avatarImg.src = currentUser.Avatar;
        avatarImg.style.display = 'block';
    } else {
        console.log('No avatar found or empty avatar');
    }

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

    container.innerHTML = posts.map(post => {
        const avatarUrl = post.AuthorAvatar || '';
        const hasAvatar = avatarUrl && avatarUrl.trim() !== '';

        return `
            <div class="post-card" data-post-id="${post.ID}">
                <h3 class="post-card-title">${escapeHtml(post.Title)}</h3>
                <div class="post-meta">
                    <div class="post-card-author">
                        ${hasAvatar ? `<img src="${escapeHtml(avatarUrl)}" alt="프로필" class="post-card-avatar">` : ''}
                        <span class="post-card-author-name">${escapeHtml(post.AuthorUsername || '익명')}</span>
                    </div>
                    <span>•</span>
                    <span class="post-card-date">${formatDate(post.CreatedAt)}</span>
                </div>
                <div class="post-preview">${getPreview(post.Content)}</div>
            </div>
        `;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.post-card').forEach(card => {
        const postId = card.dataset.postId;

        // Click on card shows post
        card.addEventListener('click', () => {
            showPost(parseInt(postId));
        });
    });
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

        // Load comments for this post
        await loadComments(postId);
    } catch (error) {
        console.error('Error loading post:', error);
        alert('글을 불러오는데 실패했습니다.');
    }
}

function renderSinglePost(post) {
    console.log('Post data:', post);
    document.getElementById('detail-title').textContent = post.Title;
    document.getElementById('detail-title').dataset.postId = post.ID;

    // Render author with avatar
    const authorElement = document.getElementById('detail-author');
    const avatarUrl = post.AuthorAvatar || '';
    const hasAvatar = avatarUrl && avatarUrl.trim() !== '';
    const authorId = post.AuthorID || '';

    authorElement.innerHTML = `
        ${hasAvatar ? `<img src="${escapeHtml(avatarUrl)}" alt="프로필" class="post-author-avatar clickable-profile" data-user-id="${escapeHtml(authorId)}">` : ''}
        <span class="post-author-name clickable-profile" data-user-id="${escapeHtml(authorId)}">${escapeHtml(post.AuthorUsername || '익명')}</span>
    `;

    // Attach click handlers to profile elements
    authorElement.querySelectorAll('.clickable-profile').forEach(el => {
        el.addEventListener('click', () => {
            showUserProfile(el.dataset.userId);
        });
    });

    // Format date with edit info if post was modified
    let dateText = formatDate(post.CreatedAt);
    if (post.UpdatedAt && post.UpdatedAt !== post.CreatedAt) {
        const createdTime = new Date(post.CreatedAt).getTime();
        const updatedTime = new Date(post.UpdatedAt).getTime();
        // Only show edit date if it's actually different (more than 1 second difference)
        if (Math.abs(updatedTime - createdTime) > 1000) {
            dateText += ` • 수정: ${formatDate(post.UpdatedAt)}`;
        }
    }
    document.getElementById('detail-date').innerHTML = `<span>•</span> <span>${dateText}</span>`;

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

// User profile viewing
async function showUserProfile(userId) {
    if (!userId) return;

    try {
        const response = await fetch(`/api/users/${userId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load user profile');
        }

        const user = await response.json();
        renderUserProfile(user);
        showProfileView();
    } catch (error) {
        console.error('Error loading user profile:', error);
        alert('사용자 프로필을 불러오는데 실패했습니다.');
    }
}

function renderUserProfile(user) {
    const container = document.getElementById('profile-view-content');
    const avatarUrl = user.Avatar || '';
    const hasAvatar = avatarUrl && avatarUrl.trim() !== '';

    container.innerHTML = `
        <div class="profile-view-header">
            ${hasAvatar ? `<img src="${escapeHtml(avatarUrl)}" alt="프로필" class="profile-view-avatar">` : '<div class="profile-view-avatar-placeholder">No Avatar</div>'}
            <div class="profile-view-info">
                <h2>${escapeHtml(user.Username || '익명')}</h2>
                <p class="profile-view-email">${escapeHtml(user.Email || '')}</p>
                ${user.Intro ? `<p class="profile-view-intro">${escapeHtml(user.Intro)}</p>` : ''}
                <span class="profile-view-role">${escapeHtml(user.Role || 'user')}</span>
            </div>
        </div>
    `;
}

// View management
function showListView() {
    currentView = 'list';
    document.getElementById('posts-list').style.display = 'block';
    document.getElementById('single-post-view').style.display = 'none';
    document.getElementById('post-form-container').style.display = 'none';
    document.getElementById('profile-view-container').style.display = 'none';
    if (currentUser) {
        document.getElementById('new-post-btn-container').style.display = 'block';
    }
}

function showSingleView() {
    currentView = 'single';
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('single-post-view').style.display = 'block';
    document.getElementById('post-form-container').style.display = 'none';
    document.getElementById('profile-view-container').style.display = 'none';
    document.getElementById('new-post-btn-container').style.display = 'none';
}

function showFormView() {
    currentView = 'form';
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('single-post-view').style.display = 'none';
    document.getElementById('post-form-container').style.display = 'block';
    document.getElementById('profile-view-container').style.display = 'none';
    document.getElementById('new-post-btn-container').style.display = 'none';
}

function showProfileView() {
    currentView = 'profile';
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('single-post-view').style.display = 'none';
    document.getElementById('post-form-container').style.display = 'none';
    document.getElementById('profile-view-container').style.display = 'block';
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

function getPreview(content, maxLength = 50) {
    const text = content.replace(/[#*\-]/g, '').trim();
    return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
}

function renderMarkdown(content) {
    let html = escapeHtml(content);

    // Images - Process BEFORE escaping to preserve URLs
    // Need to unescape the image markdown first
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images = [];
    let match;

    // Extract images before other processing
    while ((match = imageRegex.exec(content)) !== null) {
        images.push({
            full: match[0],
            alt: match[1],
            url: match[2]
        });
    }

    // Replace images in escaped HTML
    images.forEach(img => {
        const escapedMarkdown = escapeHtml(img.full);
        const imageTag = `<img src="${img.url}" alt="${escapeHtml(img.alt)}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;">`;
        html = html.replace(escapedMarkdown, imageTag);
    });

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

// Comment functionality
let currentPostId = null;
let editingCommentId = null;
let replyToCommentId = null;

async function loadComments(postId) {
    currentPostId = postId;
    console.log('Loading comments for post:', postId);

    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            credentials: 'include'
        });

        console.log('Comments response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load comments:', errorText);
            throw new Error('Failed to load comments');
        }

        const comments = await response.json();
        console.log('Comments loaded:', comments);
        renderComments(comments);
        setupCommentFormListeners();
    } catch (error) {
        console.error('Error loading comments:', error);
        document.getElementById('comments-container').innerHTML =
            '<div class="empty-state">댓글을 불러오는데 실패했습니다.</div>';
    }
}

function countAllComments(comments) {
    let count = comments.length;
    for (const comment of comments) {
        if (comment.Replies && comment.Replies.length > 0) {
            count += countAllComments(comment.Replies);
        }
    }
    return count;
}

function renderComments(comments) {
    const container = document.getElementById('comments-container');
    const titleElement = document.querySelector('.comments-title');

    const totalComments = countAllComments(comments);
    titleElement.textContent = `댓글 (${totalComments})`;

    if (comments.length === 0) {
        container.innerHTML = '<div class="empty-state">아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</div>';
        titleElement.textContent = '댓글 (0)';
        return;
    }

    container.innerHTML = comments.map(comment => renderComment(comment)).join('');
    attachCommentEventListeners();
}

function renderComment(comment, isReply = false) {
    const canEdit = currentUser && (currentUser.Role === 'admin' || currentUser.ID === comment.AuthorID);
    const avatarUrl = comment.AuthorAvatar || '';
    const hasAvatar = avatarUrl && avatarUrl.trim() !== '';
    const authorId = comment.AuthorID || '';

    return `
        <div class="comment" data-comment-id="${comment.ID}">
            <div class="comment-header">
                <div class="comment-author">
                    ${hasAvatar ? `<img src="${escapeHtml(avatarUrl)}" alt="프로필" class="comment-avatar clickable-profile" data-user-id="${escapeHtml(authorId)}">` : ''}
                    <span class="comment-author-name clickable-profile" data-user-id="${escapeHtml(authorId)}">${escapeHtml(comment.AuthorUsername || '익명')}</span>
                    <span class="comment-date">${formatDate(comment.CreatedAt)}</span>
                </div>
                ${canEdit ? `
                <div class="comment-actions">
                    <button class="btn btn-secondary edit-comment-btn" data-comment-id="${comment.ID}">수정</button>
                    <button class="btn btn-danger delete-comment-btn" data-comment-id="${comment.ID}">삭제</button>
                </div>
                ` : ''}
            </div>
            <div class="comment-content" data-comment-id="${comment.ID}">${escapeHtml(comment.Content)}</div>
            ${!isReply ? `<button class="comment-reply-btn" data-comment-id="${comment.ID}">답글</button>` : ''}
            ${comment.Replies && comment.Replies.length > 0 ? `
                <div class="comment-replies">
                    ${comment.Replies.map(reply => renderComment(reply, true)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

let commentFormListenersAttached = false;

function setupCommentFormListeners() {
    const submitBtn = document.getElementById('submit-comment-btn');
    const cancelBtn = document.getElementById('cancel-comment-btn');
    const commentInput = document.getElementById('comment-input');

    console.log('Setting up comment form listeners');
    console.log('Submit button:', submitBtn);
    console.log('Comment input:', commentInput);
    console.log('Already attached?', commentFormListenersAttached);

    if (!submitBtn || !commentInput) {
        console.error('Comment form elements not found!');
        return;
    }

    // Only attach listeners once
    if (commentFormListenersAttached) {
        console.log('Comment form listeners already attached, skipping');
        return;
    }

    console.log('Attaching comment form listeners...');

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('Submit button clicked!');
        const content = commentInput.value.trim();
        console.log('Comment content:', content);

        if (!content) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }

        if (editingCommentId) {
            console.log('Updating comment:', editingCommentId);
            await updateComment(editingCommentId, content);
        } else {
            console.log('Creating new comment, reply to:', replyToCommentId);
            await createComment(content, replyToCommentId);
        }

        commentInput.value = '';
        cancelCommentForm();
    });

    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Cancel button clicked!');
        commentInput.value = '';
        cancelCommentForm();
    });

    // Also handle Enter key on input
    commentInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('Enter key pressed on comment input');
            submitBtn.click();
        }
    });

    commentFormListenersAttached = true;
    console.log('Comment form listeners attached successfully');
}

function cancelCommentForm() {
    editingCommentId = null;
    replyToCommentId = null;
    document.getElementById('submit-comment-btn').textContent = '댓글 작성';
    document.getElementById('cancel-comment-btn').style.display = 'none';
}

function attachCommentEventListeners() {
    // Profile click handlers
    document.querySelectorAll('.comment .clickable-profile').forEach(el => {
        el.addEventListener('click', () => {
            showUserProfile(el.dataset.userId);
        });
    });

    // Reply buttons
    document.querySelectorAll('.comment-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = parseInt(btn.dataset.commentId);
            replyToCommentId = commentId;
            editingCommentId = null;

            const commentInput = document.getElementById('comment-input');
            commentInput.focus();
            commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

            document.getElementById('submit-comment-btn').textContent = '작성';
            document.getElementById('cancel-comment-btn').style.display = 'inline-block';
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = parseInt(btn.dataset.commentId);
            const contentEl = document.querySelector(`.comment-content[data-comment-id="${commentId}"]`);
            const currentContent = contentEl.textContent;

            editingCommentId = commentId;
            replyToCommentId = null;

            const commentInput = document.getElementById('comment-input');
            commentInput.value = currentContent;
            commentInput.focus();
            commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

            document.getElementById('submit-comment-btn').textContent = '댓글 수정';
            document.getElementById('cancel-comment-btn').style.display = 'inline-block';
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
                return;
            }

            const commentId = parseInt(btn.dataset.commentId);
            await deleteComment(commentId);
        });
    });
}

async function createComment(content, parentId = null) {
    try {
        const payload = { content };
        if (parentId) {
            payload.parent_id = parentId;
        }

        console.log('Creating comment with payload:', payload);
        console.log('Current post ID:', currentPostId);

        const response = await fetch(`/api/posts/${currentPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        console.log('Create comment response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to create comment:', errorText);
            throw new Error('Failed to create comment');
        }

        const result = await response.json();
        console.log('Comment created:', result);

        await loadComments(currentPostId);
    } catch (error) {
        console.error('Error creating comment:', error);
        alert('댓글 작성에 실패했습니다.');
    }
}

async function updateComment(commentId, content) {
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to update comment');
        }

        await loadComments(currentPostId);
    } catch (error) {
        console.error('Error updating comment:', error);
        alert('댓글 수정에 실패했습니다.');
    }
}

async function deleteComment(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete comment');
        }

        await loadComments(currentPostId);
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('댓글 삭제에 실패했습니다.');
    }
}

// Image Upload Functionality
let uploadedImageUrl = null;

function setupImageUpload() {
    const dropZone = document.getElementById('image-drop-zone');
    const fileInput = document.getElementById('image-file-input');
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const copyMarkdownBtn = document.getElementById('copy-markdown-btn');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const progressContainer = document.getElementById('upload-progress');
    const imageUrlDisplay = document.getElementById('image-url-display');

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selected via input
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        } else {
            alert('이미지 파일만 업로드할 수 있습니다.');
        }
    });

    // Copy markdown button
    copyMarkdownBtn.addEventListener('click', () => {
        if (uploadedImageUrl) {
            const markdown = `![이미지](${uploadedImageUrl})`;
            copyToClipboard(markdown);

            // Insert at cursor position
            const textarea = document.getElementById('post-content');
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            textarea.value = text.substring(0, start) + markdown + text.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + markdown.length, start + markdown.length);

            // Show feedback
            copyMarkdownBtn.textContent = '✓ 삽입 완료!';
            setTimeout(() => {
                copyMarkdownBtn.textContent = '마크다운 복사';
            }, 2000);
        }
    });

    // Remove image button
    removeImageBtn.addEventListener('click', () => {
        resetImageUpload();
    });
}

async function handleImageFile(file) {
    const dropZone = document.getElementById('image-drop-zone');
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const progressContainer = document.getElementById('upload-progress');
    const imageUrlDisplay = document.getElementById('image-url-display');

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Show progress
    dropZone.style.display = 'none';
    progressContainer.style.display = 'block';

    // Upload file
    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload/image', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        uploadedImageUrl = data.url;

        // Show preview
        progressContainer.style.display = 'none';
        previewContainer.style.display = 'block';
        imageUrlDisplay.textContent = `URL: ${data.url}`;

        console.log('Image uploaded successfully:', data);
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('이미지 업로드에 실패했습니다.');
        resetImageUpload();
    }
}

function resetImageUpload() {
    const dropZone = document.getElementById('image-drop-zone');
    const previewContainer = document.getElementById('image-preview-container');
    const progressContainer = document.getElementById('upload-progress');
    const fileInput = document.getElementById('image-file-input');

    dropZone.style.display = 'flex';
    previewContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    fileInput.value = '';
    uploadedImageUrl = null;
}

function copyToClipboard(text) {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
            // Fallback
            fallbackCopyToClipboard(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Could not copy text:', err);
    }
    document.body.removeChild(textArea);
}
