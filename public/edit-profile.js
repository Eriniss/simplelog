// Global state
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initEditProfile();
    setupEventListeners();
});

async function initEditProfile() {
    try {
        await loadCurrentUser();
        populateForm();
    } catch (error) {
        console.error('Failed to initialize edit profile:', error);
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

    // Form submission
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
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

function populateForm() {
    document.getElementById('edit-username').value = currentUser.Username || '';
    document.getElementById('edit-avatar').value = currentUser.Avatar || '';
    document.getElementById('edit-intro').value = currentUser.Intro || '';
}

async function updateProfile() {
    const username = document.getElementById('edit-username').value.trim();
    const avatar = document.getElementById('edit-avatar').value.trim();
    const intro = document.getElementById('edit-intro').value.trim();

    if (!username) {
        alert('사용자명은 필수 항목입니다.');
        return;
    }

    const payload = {};

    if (username && username !== currentUser.Username) {
        payload.username = username;
    }
    if (avatar !== currentUser.Avatar) {
        payload.avatar = avatar || null;
    }
    if (intro !== currentUser.Intro) {
        payload.intro = intro || null;
    }

    if (Object.keys(payload).length === 0) {
        alert('변경사항이 없습니다.');
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('프로필이 성공적으로 업데이트되었습니다!');
            window.location.href = '/profile.html';
        } else {
            const error = await response.json();

            // Check if it's a duplicate username error (500 status)
            if (response.status === 500) {
                alert('이미 사용 중인 사용자명입니다. 다른 사용자명을 선택해주세요.');
            } else {
                alert('프로필 업데이트 실패: ' + (error.error || '알 수 없는 오류'));
            }
        }
    } catch (error) {
        console.error('Failed to update profile:', error);
        alert('프로필 업데이트 중 오류가 발생했습니다.');
    }
}
