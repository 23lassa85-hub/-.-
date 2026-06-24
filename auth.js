function isLoggedIn() { return DB.getCurrentUser() !== null; }
function getUser() { return DB.getCurrentUser(); }
function isTenant() { const u = getUser(); return u && u.type === 'tenant'; }
function isLandlord() { const u = getUser(); return u && u.type === 'landlord'; }
function isModerator() { const u = getUser(); return u && u.type === 'moderator'; }

function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const tenantLinks = document.querySelectorAll('.tenant-only');
    const landlordLinks = document.querySelectorAll('.landlord-only');
    const modLinks = document.querySelectorAll('.moderator-only');
    const headerAvatar = document.getElementById('header-avatar');
 

    if (isLoggedIn()) {
        const user = getUser();
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        headerAvatar.src = user.avatar || getAvatarSVG(user.name, user.surname, 40);
        headerAvatar.alt = user.name;

        tenantLinks.forEach(el => el.classList.toggle('hidden', !isTenant() && !isModerator()));
        landlordLinks.forEach(el => el.classList.toggle('hidden', !isLandlord() && !isModerator()));
        modLinks.forEach(el => el.classList.toggle('hidden', !isModerator()));
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
        tenantLinks.forEach(el => el.classList.add('hidden'));
        landlordLinks.forEach(el => el.classList.add('hidden'));
        modLinks.forEach(el => el.classList.add('hidden'));
    }
    updateNotificationBadge();
    updateFriendRequestBadge();
}

function toggleDropdown() {
    document.getElementById('dropdown-menu').classList.toggle('hidden');
}

function logout() {
    const user = getUser();
    if (user) addNotification(user.id, 'system', 'Вы вышли из аккаунта');
    DB.setCurrentUser(null);
    localStorage.removeItem('mk_remember');
    updateAuthUI();
    showToast('Вы вышли из аккаунта', 'info');
    navigateTo('home');
}

/* ========== VK OAuth 2.0 (Implicit Flow) ========== */
// Чтобы включить реальный вход через ВКонтакте:
// 1. Создайте приложение на https://vk.com/dev (тип "Веб-сайт")
// 2. Вставьте ID приложения в переменную ниже (например: '12345678')
// 3. В настройках VK укажите redirect_uri = адрес вашего сайта (должен совпадать с https:// и доменом)
//    Пример: https://ваш-ник.github.io/мой-репозиторий/
// 4. Загрузите обновлённый auth.js на хостинг
// Если VK_APP_ID оставить пустым — будет работать демо-вход
const VK_APP_ID = '';

function initVKOAuth() {
    // Если в URL есть access_token от VK — обрабатываем callback
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        const userId = params.get('user_id');
        const email = params.get('email');
        const state = params.get('state'); // 'login' или 'register_tenant' / 'register_landlord'

        if (token && userId) {
            processVKCallback(userId, email, token, state);
        }
    }
}

function processVKCallback(vkUserId, email, token, state) {
    // Пытаемся получить данные пользователя через VK API (CORS разрешён для GET)
    fetch(`https://api.vk.com/method/users.get?user_ids=${vkUserId}&fields=photo_200,first_name,last_name&access_token=${token}&v=5.199`)
        .then(r => r.json())
        .then(data => {
            const vk = data.response?.[0];
            const users = DB.getUsers();
            let user = users.find(u => u.vkId === parseInt(vkUserId));

            if (!user) {
                const roleType = state && state.startsWith('register_') ? state.replace('register_', '') : 'tenant';
                user = {
                    id: generateId('usr'),
                    email: email || `vk_${vkUserId}@vk.com`,
                    password: generateId('vk'),
                    type: roleType,
                    name: vk ? vk.first_name : 'ВК',
                    surname: vk ? vk.last_name : 'Пользователь',
                    patronymic: '',
                    vkId: parseInt(vkUserId),
                    vkLinked: true,
                    avatar: vk ? vk.photo_200 : '',
                    userId: generateUserId(),
                    rating: 5.0, ratingCount: 0,
                    twoFactorEnabled: false, verified: true, identityVerified: false,
                    createdAt: Date.now()
                };
                if (roleType === 'tenant') {
                    user.role = 'student';
                    user.university = 'БФУ им. Канта';
                    user.district = 'Центральный';
                    user.gender = 'male';
                    user.interests = '';
                    user.habits = '';
                    user.bio = '';
                }
                users.push(user);
                DB.saveUsers(users);
                addNotification(user.id, 'system', 'Регистрация через ВКонтакте завершена. Пройдите верификацию личности.');
                showToast('Регистрация через ВКонтакте успешна!', 'success');
            } else {
                addNotification(user.id, 'system', 'Вы вошли через ВКонтакте');
                showToast('Добро пожаловать через ВКонтакте!', 'success');
            }

            DB.setCurrentUser(user);
            updateAuthUI();
            // Чистим hash из URL
            history.replaceState(null, '', window.location.pathname + window.location.search);
            navigateTo('home');
        })
        .catch(err => {
            showToast('Не удалось получить данные из ВКонтакте. Проверьте VK App ID.', 'error');
            console.error('VK API error:', err);
        });
}

function loginWithVK() {
    if (!VK_APP_ID) {
        showToast('VK App ID не настроен. Используется демо-вход.', 'info');
        setTimeout(vkLoginDemo, 600);
        return;
    }
    const redirectUri = window.location.origin + window.location.pathname;
    const url = `https://oauth.vk.com/authorize?client_id=${VK_APP_ID}&display=page&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email&response_type=token&v=5.199&state=login`;
    window.location.href = url;
}

function vkRegisterWithVK(roleType) {
    if (!VK_APP_ID) {
        showToast('VK App ID не настроен. Используется демо-регистрация.', 'info');
        setTimeout(() => vkRegisterDemo(roleType), 600);
        return;
    }
    const redirectUri = window.location.origin + window.location.pathname;
    const url = `https://oauth.vk.com/authorize?client_id=${VK_APP_ID}&display=page&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email&response_type=token&v=5.199&state=register_${roleType}`;
    window.location.href = url;
}

/* ========== Demo VK (fallback) ========== */
function vkLoginDemo() {
    showToast('Демо-вход через ВКонтакте...', 'info');
    setTimeout(() => {
        const users = DB.getUsers();
        let vkUser = users.find(u => u.vkLinked && u.email && u.email.startsWith('vkuser_') && u.email.endsWith('@vk.com'));
        if (!vkUser) {
            vkUser = {
                id: generateId('usr'), email: 'vkuser_' + Date.now() + '@vk.com', password: generateId('vk'),
                type: 'tenant', name: 'ВК', surname: 'Пользователь', patronymic: '',
                userId: generateUserId(), rating: 5.0, ratingCount: 0,
                twoFactorEnabled: false, verified: true, identityVerified: false,
                createdAt: Date.now(), vkLinked: true, bio: 'Авторизован через ВКонтакте', avatar: ''
            };
            users.push(vkUser);
            DB.saveUsers(users);
        }
        DB.setCurrentUser(vkUser);
        addNotification(vkUser.id, 'system', 'Вы вошли через ВКонтакте (демо)');
        updateAuthUI();
        showToast('Добро пожаловать!', 'success');
        navigateTo('home');
    }, 800);
}

function vkRegisterDemo(roleType) {
    showToast('Демо-регистрация через ВКонтакте...', 'info');
    setTimeout(() => {
        const vkUser = {
            id: generateId('usr'), email: 'vkuser_' + Date.now() + '@vk.com', password: generateId('vk'),
            type: roleType, name: 'ВК', surname: 'Пользователь', patronymic: '',
            userId: generateUserId(), rating: 5.0, ratingCount: 0,
            twoFactorEnabled: false, verified: true, identityVerified: false,
            createdAt: Date.now(), vkLinked: true, bio: 'Авторизован через ВКонтакте', avatar: ''
        };
        if (roleType === 'tenant') {
            vkUser.role = 'student'; vkUser.university = 'БФУ им. Канта';
            vkUser.district = 'Центральный'; vkUser.gender = 'male';
            vkUser.interests = ''; vkUser.habits = '';
        }
        const users = DB.getUsers();
        users.push(vkUser);
        DB.saveUsers(users);
        DB.setCurrentUser(vkUser);
        addNotification(vkUser.id, 'system', 'Регистрация через ВКонтакте завершена (демо). Пройдите верификацию личности.');
        updateAuthUI();
        showToast('Регистрация успешна!', 'success');
        navigateTo('home');
    }, 800);
}

function renderLogin() {
    return `
    <div class="auth-page">
        <div class="auth-card">
            <h2>Вход в аккаунт</h2>
            <p class="subtitle">Введите данные для входа</p>
            <form id="login-form" onsubmit="handleLogin(event)">
                <div class="form-group">
                    <input type="email" id="login-email" placeholder="Email" required>
                </div>
                <div class="form-group">
                    <div class="password-wrapper">
                        <input type="password" id="login-password" placeholder="Пароль" required>
                        <i class="fa-solid fa-eye toggle-password" onclick="togglePassword(this)"></i>
                    </div>
                </div>
                <div id="login-2fa" class="form-group hidden">
                    <input type="text" id="login-2fa-code" placeholder="Код подтверждения" maxlength="6">
                    <small id="login-2fa-hint">Код отправлен на вашу почту</small>
                </div>
                <div class="form-footer">
                    <label class="checkbox-wrapper"><input type="checkbox" id="remember-me"><span>Запомнить меня</span></label>
                    <a href="#forgot-password" class="btn-text">Забыли пароль?</a>
                </div>
                <button type="submit" class="btn-primary btn-block">Войти</button>
            </form>
            <div class="vk-divider"><span>или</span></div>
            <button class="btn-vk btn-block" onclick="loginWithVK()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.339-3.202C4.624 10.857 4 8.673 4 8.231c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.864 2.49 2.354 4.675 2.962 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.18-3.608 2.18-3.608.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.03-2.354 4.03-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>
                Войти через ВКонтакте
            </button>
            <div class="auth-footer">Нет аккаунта? <a href="#register">Зарегистрироваться</a></div>
            <div class="demo-box">
                <strong>Демо:</strong> ivan@example.com / 123456 (жилец) · sergey@example.com / 123456 (арендодатель) · moder@mail.ru / 111111 (модератор)
            </div>
        </div>
    </div>`;
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const twoFaCode = document.getElementById('login-2fa-code')?.value;
    const remember = document.getElementById('remember-me').checked;
    const users = DB.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) { showToast('Неверный email или пароль', 'error'); return; }

    if (user.twoFactorEnabled) {
        const faSection = document.getElementById('login-2fa');
        if (faSection.classList.contains('hidden')) {
            faSection.classList.remove('hidden');
            const code = generateCode();
            const codes = DB.get2FACodes();
            codes[user.id] = { code, expires: Date.now() + 300000 };
            DB.save2FACodes(codes);
            document.getElementById('login-2fa-hint').textContent = 'Код отправлен на ' + user.email + ' (демо: ' + code + ')';
            return;
        }
        const codes = DB.get2FACodes();
        const stored = codes[user.id];
        if (!stored || stored.code !== twoFaCode || stored.expires < Date.now()) {
            showToast('Неверный или просроченный код', 'error'); return;
        }
        delete codes[user.id]; DB.save2FACodes(codes);
    }

    DB.setCurrentUser(user);
    if (remember) localStorage.setItem('mk_remember', 'true');
    addNotification(user.id, 'system', 'Вы вошли в аккаунт');
    updateAuthUI();
    showToast('Добро пожаловать, ' + user.name + '!', 'success');
    navigateTo('home');
}

/* ========== Register Flow ========== */
let selectedRole = null;

function renderRegister() {
    if (!selectedRole) return renderRoleSelect();
    return renderRegisterForm();
}

function renderRoleSelect() {
    return `
    <div class="auth-page">
        <div class="auth-card" style="max-width: 640px;">
            <h2 style="text-align:center;">Создать аккаунт</h2>
            <p class="subtitle" style="text-align:center;">Выберите, как вы будете использовать МояКойку</p>
            <div class="role-grid">
                <div class="role-card" onclick="selectRole('tenant')" id="role-tenant">
                    <div class="role-icon-circle"><i class="fa-solid fa-house"></i></div>
                    <h4>Ищу жильё</h4>
                    <p>Ищите и бронируйте общежития. Используйте избранное и чат.</p>
                    <div class="role-tags">
                        <span>Поиск</span><span>Бронирование</span><span>Чат</span><span>Избранное</span>
                    </div>
                </div>
                <div class="role-card" onclick="selectRole('landlord')" id="role-landlord">
                    <div class="role-icon-circle"><i class="fa-solid fa-building"></i></div>
                    <h4>Сдаю жильё</h4>
                    <p>Публикуйте объявления и управляйте своими объектами.</p>
                    <div class="role-tags">
                        <span>Объявления</span><span>Управление</span><span>Рейтинг</span>
                    </div>
                </div>
            </div>
            <div class="auth-footer" style="margin-top: 24px;">Уже есть аккаунт? <a href="#login">Войти</a></div>
        </div>
    </div>`;
}

function renderRegisterForm() {
    const isTenant = selectedRole === 'tenant';
    const icon = isTenant ? 'fa-house' : 'fa-building';
    const roleLabel = isTenant ? 'Ищу жильё' : 'Сдаю жильё';
    
    return `
    <div class="auth-page">
        <div class="auth-card">
            <button class="auth-back" onclick="backToRoleSelect()"><i class="fa-solid fa-arrow-left"></i> Назад</button>
            <div class="auth-role-header">
                <div class="role-icon-circle"><i class="fa-solid ${icon}"></i></div>
                <div>
                    <h2>Регистрация</h2>
                    <p class="subtitle" style="margin:0;">${roleLabel}</p>
                </div>
            </div>
            <div class="vk-offer-box" style="margin-bottom: 20px;">
                <h3>Быстрая регистрация</h3>
                <p>Зарегистрируйтесь через ВКонтакте — данные заполнятся автоматически</p>
                <button class="btn-vk btn-block" onclick="vkRegisterWithVK('${selectedRole}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.339-3.202C4.624 10.857 4 8.673 4 8.231c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.864 2.49 2.354 4.675 2.962 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.18-3.608 2.18-3.608.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.03-2.354 4.03-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>
                    Зарегистрироваться через ВКонтакте
                </button>
                <div class="vk-divider"><span>или</span></div>
            </div>
            <form id="register-form" onsubmit="handleRegister(event)">
                <div class="form-group">
                    <input type="text" id="reg-fullname" placeholder="Фамилия Имя Отчество" required>
                </div>
                ${isTenant ? `
                <div class="form-group">
                    <div class="toggle-group" id="reg-user-category" data-selected="student">
                        <button type="button" class="toggle-btn active" onclick="setUserCategory(this, 'student')" data-value="student">
                            <i class="fa-solid fa-graduation-cap"></i> Учащийся
                        </button>
                        <button type="button" class="toggle-btn" onclick="setUserCategory(this, 'migrant')" data-value="migrant">
                            <i class="fa-solid fa-briefcase"></i> Трудовой мигрант
                        </button>
                    </div>
                </div>
                ` : ''}
                <div class="form-group">
                    <input type="email" id="reg-email" placeholder="Email" required>
                </div>
                <div class="form-group">
                    <div class="password-wrapper">
                        <input type="password" id="reg-password" placeholder="Пароль" required minlength="6">
                        <i class="fa-solid fa-eye toggle-password" onclick="togglePassword(this)"></i>
                    </div>
                </div>
                <div class="form-group">
                    <div class="password-wrapper">
                        <input type="password" id="reg-password-confirm" placeholder="Повторите пароль" required>
                        <i class="fa-solid fa-eye toggle-password" onclick="togglePassword(this)"></i>
                    </div>
                </div>
                <button type="submit" class="btn-primary btn-block">Создать аккаунт</button>
            </form>
            <div class="auth-footer">Уже есть аккаунт? <a href="#login">Войти</a></div>
        </div>
    </div>`;
}

function selectRole(role) {
    selectedRole = role;
    renderPage();
}

function backToRoleSelect() {
    selectedRole = null;
    renderPage();
}

function setUserCategory(btn, value) {
    document.querySelectorAll('#reg-user-category .toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    btn.parentElement.setAttribute('data-selected', value);
}

function handleRegister(e) {
    e.preventDefault();
    const fullname = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;

    const parts = fullname.split(/\s+/);
    if (parts.length < 2) { showToast('Введите фамилию и имя', 'error'); return; }
    const surname = parts[0];
    const name = parts[1];
    const patronymic = parts.slice(2).join(' ') || '';

    if (password !== confirm) { showToast('Пароли не совпадают', 'error'); return; }

    const users = DB.getUsers();
    if (users.some(u => u.email === email)) { showToast('Email уже зарегистрирован', 'error'); return; }

    const newUser = {
        id: generateId('usr'), email, password, type: selectedRole,
        userId: generateUserId(), rating: 5.0, ratingCount: 0,
        twoFactorEnabled: false, verified: false, identityVerified: false,
        createdAt: Date.now(), vkLinked: false, avatar: ''
    };

    newUser.surname = surname;
    newUser.name = name;
    newUser.patronymic = patronymic;

    if (selectedRole === 'tenant') {
        const catEl = document.getElementById('reg-user-category');
        const category = catEl ? (catEl.getAttribute('data-selected') || 'student') : 'student';
        newUser.role = category;
        newUser.university = category === 'student' ? 'БФУ им. Канта' : '';
        newUser.district = 'Центральный';
        newUser.gender = 'male';
        newUser.interests = '';
        newUser.habits = '';
        newUser.bio = '';
    }

    users.push(newUser);
    DB.saveUsers(users);
    addNotification(newUser.id, 'system', 'Добро пожаловать в МояКойку! Пройдите верификацию личности.');
    showToast('Регистрация успешна! Войдите в аккаунт.', 'success');
    selectedRole = null;
    navigateTo('login');
}

function renderForgotPassword() {
    return `
    <div class="auth-page">
        <div class="auth-card">
            <h2>Восстановление пароля</h2>
            <p class="subtitle">Введите email для получения кода</p>
            <form id="forgot-form" onsubmit="handleForgot(event)">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="forgot-email" placeholder="your@email.ru" required>
                </div>
                <div id="forgot-code-section" class="hidden">
                    <div class="form-group">
                        <label>Код подтверждения</label>
                        <input type="text" id="forgot-code" placeholder="000000" maxlength="6">
                    </div>
                    <div class="form-group">
                        <label>Новый пароль</label>
                        <input type="password" id="forgot-new-password" placeholder="••••••" minlength="6">
                    </div>
                </div>
                <button type="submit" class="btn-primary btn-block" id="forgot-btn">Получить код</button>
            </form>
            <div class="auth-footer"><a href="#login">Вернуться к входу</a></div>
        </div>
    </div>`;
}

let forgotTargetUser = null;
let forgotCode = null;
function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const users = DB.getUsers();
    const user = users.find(u => u.email === email);
    if (!user) { showToast('Пользователь не найден', 'error'); return; }

    const codeSection = document.getElementById('forgot-code-section');
    if (codeSection.classList.contains('hidden')) {
        forgotTargetUser = user;
        forgotCode = generateCode();
        codeSection.classList.remove('hidden');
        document.getElementById('forgot-btn').textContent = 'Сменить пароль';
        showToast('Код отправлен на ' + user.email + ' (демо: ' + forgotCode + ')', 'info');
        return;
    }

    const enteredCode = document.getElementById('forgot-code').value;
    const newPassword = document.getElementById('forgot-new-password').value;

    if (enteredCode !== forgotCode) { showToast('Неверный код', 'error'); return; }
    if (newPassword.length < 6) { showToast('Пароль минимум 6 символов', 'error'); return; }

    user.password = newPassword;
    DB.saveUsers(users);
    addNotification(user.id, 'system', 'Пароль изменён');
    showToast('Пароль успешно изменён', 'success');
    navigateTo('login');
}

function togglePassword(icon) {
    const input = icon.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
}
