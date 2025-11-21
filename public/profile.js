// Global state
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initProfile();
    setupEventListeners();
});

async function initProfile() {
    try {
        await loadCurrentUser();
        displayProfile();
    } catch (error) {
        console.error('Failed to initialize profile:', error);
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
}

async function loadCurrentUser() {
    const response = await fetch('/api/me', {
        credentials: 'include'
    });

    if (response.ok) {
        currentUser = await response.json();
        showUserInfo();
    } else {
        throw new Error('Not authenticated');
    }
}

function showUserInfo() {
    const userInfo = document.getElementById('user-info');

    document.getElementById('user-name').textContent = currentUser.Username || currentUser.Email;
    document.getElementById('user-role').textContent = currentUser.Role;

    // Show avatar if available
    const avatarImg = document.getElementById('user-avatar');
    if (currentUser.Avatar) {
        avatarImg.src = currentUser.Avatar;
        avatarImg.style.display = 'block';
    }

    userInfo.style.display = 'flex';
}

function displayProfile() {
    if (!currentUser) return;

    // Show avatar if available
    const avatarImg = document.getElementById('profile-avatar-img');
    if (currentUser.Avatar) {
        avatarImg.src = currentUser.Avatar;
        avatarImg.style.display = 'block';

        // Add click event to open in new window
        avatarImg.addEventListener('click', () => {
            window.open(currentUser.Avatar, '_blank', 'width=800,height=600');
        });
    }

    document.getElementById('profile-name').textContent = currentUser.Username || '-';
    document.getElementById('profile-email').textContent = currentUser.Email || '-';
    document.getElementById('profile-intro').textContent = currentUser.Intro || '-';
    document.getElementById('profile-id').textContent = currentUser.ID || '-';

    const roleElement = document.getElementById('profile-role');
    roleElement.innerHTML = `<span class="badge">${currentUser.Role || 'user'}</span>`;

    if (currentUser.CreatedAt) {
        document.getElementById('profile-created').textContent = formatDate(currentUser.CreatedAt);
    }

    if (currentUser.UpdatedAt) {
        document.getElementById('profile-updated').textContent = formatDate(currentUser.UpdatedAt);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
