function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        renderNotifications();
        // Автоматически помечаем все уведомления как прочитанные
        markAllNotificationsRead();
    }
}

function markAllNotificationsRead() {
    const user = getUser();
    if (!user) return;
    
    const notifs = DB.getNotifications();
    let changed = false;
    notifs.forEach(n => {
        if (n.userId === user.id && !n.read) {
            n.read = true;
            changed = true;
        }
    });
    
    if (changed) {
        DB.saveNotifications(notifs);
        updateNotificationBadge();
    }
}

function renderNotifications() {
    const user = getUser();
    if (!user) return;
    const notifs = DB.getNotifications().filter(n => n.userId === user.id);
    const list = document.getElementById('notifications-list');

    if (notifs.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">Нет уведомлений</p>';
        return;
    }

    list.innerHTML = notifs.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markRead('${n.id}')">
            <i class="fa-solid ${n.type === 'message' ? 'fa-message' : n.type === 'friend' ? 'fa-user-plus' : n.type === 'favorite' ? 'fa-heart' : 'fa-bell'}"></i>
            <div class="notification-content">
                <p>${n.text}</p>
                <span>${formatTime(n.time)}</span>
            </div>
        </div>
    `).join('');
}

function markRead(id) {
    const notifs = DB.getNotifications();
    const n = notifs.find(n => n.id === id);
    if (n) { n.read = true; DB.saveNotifications(notifs); }
    renderNotifications();
    updateNotificationBadge();
}

function clearAllNotifications() {
    const user = getUser();
    if (!user) return;
    let notifs = DB.getNotifications().filter(n => n.userId !== user.id);
    DB.saveNotifications(notifs);
    renderNotifications();
    updateNotificationBadge();
}

let idPhoto = null;
let idVerified = false;
let idCheckInProgress = false;

function renderIdentity() {
    if (!isTenant() && !isLandlord()) { 
        showToast('Доступно только для жильцов и арендодателей', 'error');
        navigateTo('home'); 
        return ''; 
    }
    
    const user = getUser();
    if (user.identityVerified) {
        return `
        <div style="padding:24px 0;">
            <div class="identity-box verified">
                <i class="fa-solid fa-circle-check"></i>
                <h3>Верификация пройдена</h3>
                <p style="color:var(--text-secondary);">Ваша личность подтверждена. Вы можете пользоваться всеми функциями платформы.</p>
            </div>
        </div>`;
    }

    return `
    <div style="padding:24px 0;">
        <div class="identity-box">
            <i class="fa-solid fa-id-card"></i>
            <h3>Подтверждение личности</h3>
            <p style="color:var(--text-secondary);margin-bottom:20px;">Для безопасности всех пользователей требуется верификация личности через фотографию. Фото будет проверено через сторонний сервис.</p>

            <div class="image-upload-zone" id="id-upload-zone" onclick="document.getElementById('id-photo').click()">
                <i class="fa-solid fa-camera" id="id-upload-icon"></i>
                <p id="id-upload-text">Загрузите фото лица</p>
                <small style="color:var(--text-secondary);">JPG или PNG, макс. 5 МБ</small>
            </div>
            <input type="file" id="id-photo" accept="image/*" class="hidden" onchange="handleIdentityUpload(event)">
            <div id="id-preview" style="margin-bottom:16px;text-align:center;"></div>
            <div id="id-check-result" style="margin:16px 0;padding:16px;border-radius:var(--radius-sm);display:none;"></div>
            <div id="id-loader" class="hidden" style="text-align:center;margin-bottom:16px;">
                <div class="spinner"></div>
                <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:8px;">Проверка через сторонний сервис...</p>
            </div>
            <button class="btn-primary btn-block" onclick="submitIdentity()" id="btn-id-submit" disabled>Отправить на проверку</button>
        </div>
    </div>`;
}

function handleIdentityUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Загрузите изображение (JPG/PNG)', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Файл слишком большой (макс. 5 МБ)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        idPhoto = ev.target.result;
        document.getElementById('id-preview').innerHTML = `<img src="${ev.target.result}" style="max-width:220px;border-radius:var(--radius-sm);border:1px solid var(--border);">`;
        document.getElementById('id-check-result').style.display = 'none';
        document.getElementById('id-check-result').innerHTML = '';
        document.getElementById('btn-id-submit').disabled = false;
        idVerified = false;
        showToast('Фото загружено. Нажмите «Отправить на проверку».', 'success');
    };
    reader.onerror = () => {
        showToast('Ошибка загрузки файла', 'error');
    };
    reader.readAsDataURL(file);
}

function submitIdentity() {
    const user = getUser();
    if (!idPhoto) {
        showToast('Сначала загрузите фото', 'error');
        return;
    }
    if (idCheckInProgress) return;
    
    idCheckInProgress = true;
    const btn = document.getElementById('btn-id-submit');
    const loader = document.getElementById('id-loader');
    const resultDiv = document.getElementById('id-check-result');
    btn.disabled = true;
    btn.textContent = 'Проверка...';
    loader.classList.remove('hidden');
    resultDiv.style.display = 'none';
    
    // Имитация запроса к стороннему сервису (3-5 сек)
    setTimeout(() => {
        const passed = Math.random() > 0.15; // 85% успеха
        idVerified = passed;
        idCheckInProgress = false;
        loader.classList.add('hidden');
        btn.textContent = 'Отправить на проверку';
        resultDiv.style.display = 'block';

        if (passed) {
            resultDiv.style.background = 'rgba(16,185,129,0.1)';
            resultDiv.style.border = '1px solid var(--success)';
            resultDiv.innerHTML = '<i class="fa-solid fa-check-circle" style="color:var(--success);"></i> Лицо распознано. Верификация пройдена. Вы можете пользоваться всеми функциями.';
            
            const users = DB.getUsers();
            const u = users.find(u => u.id === user.id);
            u.identityVerified = true;
            DB.saveUsers(users);
            DB.setCurrentUser(u);
            addNotification(u.id, 'system', 'Верификация личности пройдена');
            showToast('Верификация пройдена!', 'success');
            setTimeout(() => navigateTo('identity'), 1200);
        } else {
            resultDiv.style.background = 'rgba(239,68,68,0.1)';
            resultDiv.style.border = '1px solid var(--danger)';
            resultDiv.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i> Лицо не распознано. Убедитесь, что на фото хорошо видно лицо, и попробуйте снова.';
            btn.disabled = false;
            showToast('Не удалось пройти проверку. Попробуйте другое фото.', 'error');
        }
    }, 3500 + Math.random() * 2000);
}

function renderModeration() {
    if (!isModerator()) { navigateTo('home'); return ''; }
    const queue = DB.getModerationQueue().filter(q => q.status === 'pending');
    const dorms = DB.getDorms();

    return `
    <div style="padding:24px 0;">
        <h2 style="margin-bottom:24px;"><i class="fa-solid fa-shield-halved"></i> Панель модератора</h2>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px;">
            <h3 style="margin-bottom:16px;">Объявления на проверке (${queue.length})</h3>
            ${queue.length === 0 ? '<p style="color:var(--text-secondary);">Нет объявлений на проверке</p>' : `
            <div style="overflow-x:auto;">
            <table class="moderation-table">
                <thead>
                    <tr><th>Объявление</th><th>Арендодатель</th><th>Дата</th><th>Фото</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${queue.map(q => {
                        const dorm = dorms.find(d => d.id === q.targetId);
                        const landlord = DB.getUsers().find(u => u.id === dorm?.landlordId);
                        return `
                        <tr>
                            <td><strong>${dorm?.title || '—'}</strong><br><small style="color:var(--text-secondary);">${dorm?.address || ''}</small></td>
                            <td>${landlord?.surname || ''} ${landlord?.name || ''}</td>
                            <td>${formatDate(q.submittedAt)}</td>
                            <td>${q.images?.length || 0} фото</td>
                            <td>
                                <button class="btn-outline btn-sm" onclick="viewDormForModeration('${dorm?.id}')">Просмотр</button>
                                <button class="btn-success btn-sm" onclick="moderateAd('${q.id}','approve')">Одобрить</button>
                                <button class="btn-danger btn-sm" onclick="moderateAd('${q.id}','reject')">Отклонить</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            </div>`}
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;">
            <h3 style="margin-bottom:16px;">Все объявления</h3>
            <div style="overflow-x:auto;">
            <table class="moderation-table">
                <thead>
                    <tr><th>Объявление</th><th>Статус</th><th>Проверено</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${dorms.map(d => `
                        <tr>
                            <td><strong>${d.title}</strong><br><small>${d.address}</small></td>
                            <td><span class="status-badge status-${d.status}">${d.status === 'approved' ? 'Одобрено' : d.status === 'pending' ? 'На проверке' : 'Отклонено'}</span></td>
                            <td>${d.verified ? '<i class="fa-solid fa-check" style="color:var(--success);"></i>' : '<i class="fa-solid fa-xmark" style="color:var(--danger);"></i>'}</td>
                            <td>
                                <button class="btn-outline btn-sm" onclick="viewDormForModeration('${d.id}')">Просмотр</button>
                                ${d.status !== 'approved' ? `<button class="btn-success btn-sm" onclick="forceApprove('${d.id}')">Одобрить</button>` : ''}
                                ${d.status === 'approved' ? `<button class="btn-danger btn-sm" onclick="forceReject('${d.id}')">Снять</button>` : ''}
                                <button class="btn-danger btn-sm" onclick="moderatorDeleteAd('${d.id}')">Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        </div>
    </div>`;
}

function moderatorDeleteAd(dormId) {
    showConfirm('Удалить объявление?', 'Это действие нельзя отменить. Объявление будет полностью удалено.', () => {
        let dorms = DB.getDorms().filter(d => d.id !== dormId);
        DB.saveDorms(dorms);
        let queue = DB.getModerationQueue().filter(q => q.targetId !== dormId);
        DB.saveModerationQueue(queue);
        showToast('Объявление удалено модератором', 'success');
        renderPage();
    });
}

function viewDormForModeration(dormId) {
    if (dormId) {
        navigateTo('dorm/' + dormId);
    } else {
        showToast('Объявление не найдено', 'error');
    }
}

function moderateAd(queueId, action) {
    showConfirm(
        action === 'approve' ? 'Одобрить объявление?' : 'Отклонить объявление?',
        action === 'approve' ? 'Объявление будет опубликовано и видно всем пользователям.' : 'Объявление будет отклонено и не появится на сайте.',
        () => {
            const queue = DB.getModerationQueue();
            const item = queue.find(q => q.id === queueId);
            if (!item) return;
            item.status = action === 'approve' ? 'approved' : 'rejected';
            item.moderatedAt = Date.now();
            DB.saveModerationQueue(queue);

            const dorms = DB.getDorms();
            const dorm = dorms.find(d => d.id === item.targetId);
            if (dorm) {
                dorm.status = action === 'approve' ? 'approved' : 'rejected';
                dorm.verified = action === 'approve';
                DB.saveDorms(dorms);

                if (dorm.landlordId) {
                    addNotification(dorm.landlordId, 'system', 'Объявление "' + dorm.title + '" ' + (action === 'approve' ? 'одобрено' : 'отклонено') + ' модератором');
                }
            }

            showToast(action === 'approve' ? 'Объявление одобрено' : 'Объявление отклонено', action === 'approve' ? 'success' : 'error');
            renderPage();
        }
    );
}

function forceApprove(dormId) {
    showConfirm('Одобрить объявление?', 'Объявление будет опубликовано.', () => {
        const dorms = DB.getDorms();
        const dorm = dorms.find(d => d.id === dormId);
        if (dorm) { dorm.status = 'approved'; dorm.verified = true; DB.saveDorms(dorms); }
        showToast('Объявление одобрено', 'success');
        renderPage();
    });
}

function forceReject(dormId) {
    showConfirm('Снять объявление?', 'Объявление будет скрыто с сайта.', () => {
        const dorms = DB.getDorms();
        const dorm = dorms.find(d => d.id === dormId);
        if (dorm) { dorm.status = 'rejected'; dorm.verified = false; DB.saveDorms(dorms); }
        showToast('Объявление снято', 'info');
        renderPage();
    });
}

function initTheme() {
    const saved = localStorage.getItem('mk_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeIcon();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mk_theme', next);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function navigateTo(page) {
    location.hash = page;
}

function renderPage() {
    const hash = location.hash.slice(1) || 'home';
    const app = document.getElementById('app');
    document.getElementById('dropdown-menu')?.classList.add('hidden');
    document.getElementById('notifications-panel')?.classList.add('hidden');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[href="#${hash.split('/')[0]}"]`)?.classList.add('active');

    if (hash === 'home') app.innerHTML = renderHome();
    else if (hash === 'search') app.innerHTML = renderSearch();
    else if (hash === 'login') app.innerHTML = renderLogin();
    else if (hash === 'register') app.innerHTML = renderRegister();
    else if (hash === 'forgot-password') app.innerHTML = renderForgotPassword();
    else if (hash === 'favorites') app.innerHTML = renderFavorites();
    else if (hash === 'my-room') app.innerHTML = renderMyRoom();
    else if (hash === 'my-ads') app.innerHTML = renderMyAds();
    else if (hash === 'create-ad') app.innerHTML = renderCreateAd();
    else if (hash === 'chats') app.innerHTML = renderChats();
    else if (hash.startsWith('chat/')) app.innerHTML = renderChat(hash.split('/')[1]);
    else if (hash === 'friends') app.innerHTML = renderFriends();
    else if (hash === 'find-friends') app.innerHTML = renderFindFriends(); // Добавлено
    else if (hash === 'friend-requests') app.innerHTML = renderFriendRequests();
    else if (hash === 'profile') app.innerHTML = renderProfile();
    else if (hash === 'identity') app.innerHTML = renderIdentity();
    else if (hash === 'moderation') app.innerHTML = renderModeration();
    else if (hash.startsWith('profile/')) app.innerHTML = renderProfile(hash.split('/')[1]);
    else if (hash.startsWith('dorm/')) app.innerHTML = renderDormDetail(hash.split('/')[1]);
    else if (hash.startsWith('settings/')) app.innerHTML = renderSettings(hash.split('/')[1]);
    else if (hash === 'settings') app.innerHTML = renderSettings('profile');
    else app.innerHTML = renderHome();

    if (hash === 'search') {
        setTimeout(() => applyFilters(), 100);
    }

    window.scrollTo(0, 0);
}

function renderHome() {
    const dorms = DB.getDorms().filter(d => d.status === 'approved').slice(0, 6);
    return `
    <section class="hero">
        <h1>Найди идеальное общежитие</h1>
        <p>Более 1000 проверенных вариантов в Калининградской области</p>
        <div class="hero-search">
            <input type="text" id="hero-search-input" placeholder="Район, университет или название...">
            <button class="btn-primary" onclick="doHeroSearch()"><i class="fa-solid fa-magnifying-glass"></i>Найти</button>
        </div>
    </section>

    <section class="home-dorms-section">
        <div class="home-dorms-header">
            <h2>Популярные объявления</h2>
            <a href="#search" class="btn-text">Смотреть все →</a>
        </div>
        <div class="dorms-grid">
            ${dorms.map(d => dormCardHTML(d)).join('')}
        </div>
    </section>

    <section class="features-grid">
        <div class="feature-card"><i class="fa-solid fa-shield-halved"></i><h3>Безопасность</h3><p>Все объявления проходят модерацию</p></div>
        <div class="feature-card"><i class="fa-solid fa-user-check"></i><h3>Верификация</h3><p>Подтверждение личности пользователей</p></div>
        <div class="feature-card"><i class="fa-solid fa-star"></i><h3>Отзывы</h3><p>Реальные оценки от жильцов</p></div>
    </section>`;
}

function doHeroSearch() {
    const q = document.getElementById('hero-search-input').value.trim();
    navigateTo('search' + (q ? '?q=' + encodeURIComponent(q) : ''));
}

function getMatchScore(user, dorm) {
    if (!user || !dorm || user.type !== 'tenant') return 0;
    let score = 0;
    if (user.university && dorm.preferredUniversity && user.university === dorm.preferredUniversity) score += 40;
    if (user.district && dorm.district && user.district === dorm.district) score += 30;
    if (user.gender && dorm.preferredGender && user.gender === dorm.preferredGender) score += 20;
    if (user.interests && user.interests.length > 0) score += 10;
    return Math.min(score, 100);
}

function matchBadgeHTML(score) {
    if (score <= 0) return '';
    let label = 'Совместимость';
    if (score >= 80) label = 'Отлично подходит';
    else if (score >= 50) label = 'Хорошо подходит';
    return `<span class="match-badge"><i class="fa-solid fa-bolt"></i> ${label} — ${score}%</span>`;
}

function dormCardHTML(d) {
    const user = getUser();
    const favs = user ? DB.getFavorites().filter(f => f.userId === user.id && f.dormId === d.id) : [];
    const isFav = favs.length > 0;
    const img = d.images && d.images[0] ? `<img src="${d.images[0]}" alt="">` : '<i class="fa-solid fa-image" style="font-size:3rem;color:var(--text-secondary);"></i>';
    const matchScore = getMatchScore(user, d);
    const verifiedBadge = d.verified ? `<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Проверено</span>` : '';
    return `
    <div class="dorm-card" onclick="navigateTo('dorm/${d.id}')">
        <div class="dorm-image">${img}</div>
        <div class="dorm-info">
            <div class="dorm-header">
                <h3>${d.title}</h3>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    ${verifiedBadge}
                    ${user ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation();toggleFavorite('${d.id}')"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i></button>` : ''}
                </div>
            </div>
            <div class="dorm-meta">
                <span><i class="fa-solid fa-location-dot"></i>${d.district}</span>
                <span><i class="fa-solid fa-bed"></i>${d.occupied}/${d.rooms} мест</span>
            </div>
            ${matchScore > 0 ? `<div style="margin-bottom:10px;">${matchBadgeHTML(matchScore)}</div>` : ''}
            <div class="dorm-rating">
                <span class="stars">${'★'.repeat(Math.round(d.rating))}${'☆'.repeat(5 - Math.round(d.rating))}</span>
                <span class="score">${d.rating.toFixed(1)}</span>
                <span class="reviews">(${d.reviews} отзывов)</span>
            </div>
            <div class="dorm-price">${formatPrice(d.price)}</div>
            <div class="dorm-actions">
                <button class="btn-primary btn-sm" onclick="event.stopPropagation();navigateTo('dorm/${d.id}')">Подробнее</button>
            </div>
        </div>
    </div>`;
}

function toggleFavorite(dormId) {
    const user = getUser();
    if (!user) { showToast('Войдите в аккаунт', 'error'); navigateTo('login'); return; }
    let favs = DB.getFavorites();
    const idx = favs.findIndex(f => f.userId === user.id && f.dormId === dormId);
    if (idx >= 0) { favs.splice(idx, 1); showToast('Удалено из избранного', 'info'); }
    else { favs.push({ userId: user.id, dormId, time: Date.now() }); showToast('Добавлено в избранное', 'success'); }
    DB.saveFavorites(favs);
    renderPage();
}

function renderSearch() {
    const user = getUser();
    const showTenantFilter = user && (isTenant() || isModerator());
    const dorms = DB.getDorms().filter(d => d.status === 'approved');
    const universities = getUniversities();
    
    return `
    <div class="search-layout">
        <aside class="filters-sidebar">
            <h3>Фильтры</h3>
            <div class="filter-group">
                <label>Поиск</label>
                <input type="text" id="f-query" placeholder="Название, адрес..." oninput="applyFilters()">
            </div>
            <div class="filter-group">
                <label>Район</label>
                <select id="f-district" onchange="applyFilters()">
                    <option value="">Все районы</option>
                    ${getDistricts().map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>ВУЗ</label>
                <select id="f-university" onchange="applyFilters()">
                    <option value="">Любой</option>
                    ${universities.map(u => `<option value="${u}">${u}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Пол</label>
                <select id="f-gender" onchange="applyFilters()">
                    <option value="">Любой</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Цена, ₽/мес</label>
                <div class="range-inputs">
                    <input type="number" id="f-price-min" placeholder="От" min="0" oninput="applyFilters()">
                    <span>—</span>
                    <input type="number" id="f-price-max" placeholder="До" min="0" oninput="applyFilters()">
                </div>
            </div>
            <div class="filter-group">
                <label>Рейтинг общежития</label>
                <select id="f-rating" onchange="applyFilters()">
                    <option value="0">Любой</option>
                    <option value="4">4.0+</option>
                    <option value="4.5">4.5+</option>
                </select>
            </div>
            ${showTenantFilter ? `
            <div class="filter-group rating-filter" id="tenant-rating-filter">
                <label>Рейтинг жильцов</label>
                <select id="f-tenant-rating" onchange="applyFilters()">
                    <option value="0">Любой</option>
                    <option value="4">4.0+</option>
                    <option value="4.5">4.5+</option>
                </select>
            </div>` : ''}
        </aside>
        <div>
            <div class="dorms-grid" id="search-results">
                ${dorms.length === 0 ? '<p style="text-align:center;color:var(--text-secondary);padding:40px;">Нет доступных объявлений</p>' : dorms.map(d => dormCardHTML(d)).join('')}
            </div>
        </div>
    </div>`;
}

function applyFilters() {
    const q = (document.getElementById('f-query')?.value || '').toLowerCase();
    const district = document.getElementById('f-district')?.value || '';
    const university = document.getElementById('f-university')?.value || '';
    const gender = document.getElementById('f-gender')?.value || '';
    const pmin = parseFloat(document.getElementById('f-price-min')?.value) || 0;
    const pmax = parseFloat(document.getElementById('f-price-max')?.value) || Infinity;
    const rating = parseFloat(document.getElementById('f-rating')?.value) || 0;
    const trEl = document.getElementById('f-tenant-rating');
    const trating = trEl ? (parseFloat(trEl.value) || 0) : 0;

    let dorms = DB.getDorms().filter(d => d.status === 'approved');
    if (q) dorms = dorms.filter(d => (d.title + d.address).toLowerCase().includes(q));
    if (district) dorms = dorms.filter(d => d.district === district);
    if (university) dorms = dorms.filter(d => d.preferredUniversity === university || d.preferredUniversity === '');
    if (gender) dorms = dorms.filter(d => d.preferredGender === gender || d.preferredGender === '');
    dorms = dorms.filter(d => d.price >= pmin && d.price <= pmax);
    if (rating) dorms = dorms.filter(d => d.rating >= rating);
    if (trating) dorms = dorms.filter(d => (d.tenantRating || 0) >= trating);

    const container = document.getElementById('search-results');
    if (!container) return;
    container.innerHTML = dorms.length ? dorms.map(d => dormCardHTML(d)).join('') : '<p style="text-align:center;color:var(--text-secondary);padding:40px;">Ничего не найдено</p>';
}

function renderFavorites() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const favs = DB.getFavorites().filter(f => f.userId === user.id);
    const dorms = DB.getDorms();
    const list = favs.map(f => dorms.find(d => d.id === f.dormId)).filter(Boolean);
    return `
    <div style="padding:24px 0;">
        <h2 style="margin-bottom:24px;"><i class="fa-solid fa-heart"></i> Избранное</h2>
        ${list.length === 0 ? '<p style="color:var(--text-secondary);">Нет избранных объявлений</p>' : `<div class="dorms-grid">${list.map(d => dormCardHTML(d)).join('')}</div>`}
    </div>`;
}

function renderMyRoom() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const rooms = DB.getRooms().filter(r => r.tenantId === user.id);
    if (rooms.length === 0) return `<div style="padding:40px;text-align:center;"><h2>У вас пока нет комнаты</h2><p style="color:var(--text-secondary);margin-top:12px;">Найдите подходящее жильё в разделе <a href="#search" class="btn-text">Поиск</a></p></div>`;
    const r = rooms[0];
    const dorm = DB.getDorms().find(d => d.id === r.dormId);
    return `
    <div class="room-card">
        <h3>Моя комната</h3>
        <div class="room-detail"><span>Общежитие</span><span>${dorm?.title || '—'}</span></div>
        <div class="room-detail"><span>Адрес</span><span>${dorm?.address || '—'}</span></div>
        <div class="room-detail"><span>Ежемесячная плата</span><span>${formatPrice(r.monthlyPrice)}</span></div>
        <div class="room-detail"><span>Оплачено до</span><span>${formatDate(r.paidUntil)}</span></div>
        <div class="room-detail"><span>Аренда до</span><span>${formatDate(r.rentUntil)}</span></div>
    </div>`;
}

function renderMyAds() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    if (!isLandlord() && !isModerator()) { navigateTo('home'); return ''; }
    const dorms = DB.getDorms().filter(d => d.landlordId === user.id || isModerator());
    return `
    <div style="padding:24px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2><i class="fa-solid fa-bullhorn"></i> Мои объявления</h2>
            ${isLandlord() ? `<a href="#create-ad" class="btn-primary"><i class="fa-solid fa-plus"></i>Создать объявление</a>` : ''}
        </div>
        ${dorms.length === 0 ? '<p style="color:var(--text-secondary);">У вас пока нет объявлений</p>' : `
        <div style="overflow-x:auto;">
        <table class="moderation-table">
            <thead><tr><th>Объявление</th><th>Статус</th><th>Цена</th><th>Действия</th></tr></thead>
            <tbody>
                ${dorms.map(d => `
                    <tr>
                        <td><strong>${d.title}</strong><br><small>${d.address}</small></td>
                        <td><span class="status-badge status-${d.status}">${d.status === 'approved' ? 'Одобрено' : d.status === 'pending' ? 'На проверке' : 'Отклонено'}</span></td>
                        <td>${formatPrice(d.price)}</td>
                        <td>
                            <button class="btn-outline btn-sm" onclick="navigateTo('dorm/${d.id}')">Открыть</button>
                            ${isLandlord() ? `<button class="btn-danger btn-sm" onclick="deleteAd('${d.id}')">Удалить</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>`}
    </div>`;
}

function deleteAd(dormId) {
    showConfirm('Удалить объявление?', 'Это действие нельзя отменить.', () => {
        let dorms = DB.getDorms().filter(d => d.id !== dormId);
        DB.saveDorms(dorms);
        let queue = DB.getModerationQueue().filter(q => q.targetId !== dormId);
        DB.saveModerationQueue(queue);
        showToast('Объявление удалено', 'success');
        renderPage();
    });
}

function renderCreateAd() {
    if (!isLandlord()) { navigateTo('home'); return ''; }
    return `
    <div style="padding:24px 0;max-width:700px;margin:0 auto;">
        <h2 style="margin-bottom:24px;"><i class="fa-solid fa-plus"></i> Новое объявление</h2>
        <form id="create-ad-form" onsubmit="handleCreateAd(event)">
            <div class="form-group"><label>Название</label><input type="text" id="ad-title" required></div>
            <div class="form-group"><label>Адрес</label><input type="text" id="ad-address" required></div>
            <div class="form-row">
                <div class="form-group"><label>Район</label><select id="ad-district">${getDistricts().map(d => `<option>${d}</option>`).join('')}</select></div>
                <div class="form-group"><label>Цена, ₽/мес</label><input type="number" id="ad-price" min="0" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Всего мест</label><input type="number" id="ad-rooms" min="1" required></div>
                <div class="form-group"><label>Занято</label><input type="number" id="ad-occupied" min="0" value="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Предпочтительный ВУЗ</label><select id="ad-university"><option value="">Любой</option>${getUniversities().map(u => `<option>${u}</option>`).join('')}</select></div>
                <div class="form-group"><label>Предпочтительный пол</label><select id="ad-gender"><option value="">Любой</option><option value="male">Мужской</option><option value="female">Женский</option></select></div>
            </div>
            <div class="form-group"><label>Описание</label><textarea id="ad-desc" rows="4"></textarea></div>
            <div class="form-group">
                <label>Фото</label>
                <div class="image-upload-zone" onclick="document.getElementById('ad-photos').click()">
                    <i class="fa-solid fa-camera"></i><p>Загрузите фото</p>
                </div>
                <input type="file" id="ad-photos" accept="image/*" multiple class="hidden" onchange="handleAdPhotos(event)">
                <div class="image-preview-grid" id="ad-preview"></div>
            </div>
            <button type="submit" class="btn-primary btn-block">Отправить на модерацию</button>
        </form>
    </div>`;
}

let adPhotos = [];
function handleAdPhotos(e) {
    const files = Array.from(e.target.files);
    files.forEach(f => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            adPhotos.push(ev.target.result);
            renderAdPreview();
        };
        reader.readAsDataURL(f);
    });
}

function renderAdPreview() {
    document.getElementById('ad-preview').innerHTML = adPhotos.map((p, i) => `
        <div class="image-preview">
            <img src="${p}">
            <div class="remove-img" onclick="removeAdPhoto(${i})"><i class="fa-solid fa-xmark"></i></div>
        </div>
    `).join('');
}

function removeAdPhoto(i) { adPhotos.splice(i, 1); renderAdPreview(); }

function handleCreateAd(e) {
    e.preventDefault();
    const user = getUser();
    const dorm = {
        id: generateId('dorm'),
        title: document.getElementById('ad-title').value,
        address: document.getElementById('ad-address').value,
        district: document.getElementById('ad-district').value,
        price: parseFloat(document.getElementById('ad-price').value),
        rooms: parseInt(document.getElementById('ad-rooms').value),
        occupied: parseInt(document.getElementById('ad-occupied').value),
        preferredUniversity: document.getElementById('ad-university').value || '',
        preferredGender: document.getElementById('ad-gender').value || '',
        description: document.getElementById('ad-desc').value,
        images: adPhotos,
        landlordId: user.id,
        rating: 0, tenantRating: 0, reviews: 0,
        status: 'pending', verified: false,
        createdAt: Date.now()
    };
    const dorms = DB.getDorms(); dorms.push(dorm); DB.saveDorms(dorms);

    const queue = DB.getModerationQueue();
    queue.push({ id: generateId('q'), targetId: dorm.id, status: 'pending', submittedAt: Date.now(), images: adPhotos });
    DB.saveModerationQueue(queue);

    const users = DB.getUsers();
    users.filter(u => u.type === 'moderator').forEach(m => {
        addNotification(m.id, 'system', 'Новое объявление "' + dorm.title + '" на проверке');
    });

    adPhotos = [];
    showToast('Объявление отправлено на модерацию', 'success');
    navigateTo('my-ads');
}

function renderDormDetail(id) {
    const dorm = DB.getDorms().find(d => d.id === id);
    if (!dorm) return '<p>Объявление не найдено</p>';
    const landlord = DB.getUsers().find(u => u.id === dorm.landlordId);
    const user = getUser();
    const favs = user ? DB.getFavorites().filter(f => f.userId === user.id && f.dormId === dorm.id) : [];
    const isFav = favs.length > 0;
    const reviews = DB.getReviews().filter(r => r.landlordId === dorm.landlordId);
    const matchScore = getMatchScore(user, dorm);
    const verifiedBadge = dorm.verified ? `<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Проверено модератором</span>` : '';
    const matchHtml = matchScore > 0 ? matchBadgeHTML(matchScore) : '';

    return `
    <div style="padding:24px 0;">
        <button class="btn-outline btn-sm" onclick="history.back()" style="margin-bottom:16px;"><i class="fa-solid fa-arrow-left"></i>Назад</button>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:32px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
                <h1 style="margin:0;">${dorm.title}</h1>
                ${verifiedBadge}
            </div>
            ${matchHtml ? `<div style="margin-bottom:12px;">${matchHtml}</div>` : ''}
            <p style="color:var(--text-secondary);margin-bottom:16px;"><i class="fa-solid fa-location-dot"></i> ${dorm.address}</p>
            ${dorm.images && dorm.images[0] ? `<img src="${dorm.images[0]}" style="width:100%;max-height:400px;object-fit:cover;border-radius:var(--radius);margin-bottom:20px;">` : ''}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:20px;">
                <div class="stat-card"><div class="number">${formatPrice(dorm.price)}</div><div class="label">Цена</div></div>
                <div class="stat-card"><div class="number">${dorm.occupied}/${dorm.rooms}</div><div class="label">Мест</div></div>
                <div class="stat-card"><div class="number">${dorm.rating.toFixed(1)}</div><div class="label">Рейтинг</div></div>
            </div>
            <p style="margin-bottom:20px;">${dorm.description}</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                ${user ? `<button class="btn-primary" onclick="startChat('${dorm.landlordId}')"><i class="fa-solid fa-message"></i>Написать арендодателю</button>` : ''}
                ${user ? `<button class="fav-btn ${isFav ? 'active' : ''}" style="width:auto;padding:10px 20px;" onclick="toggleFavorite('${dorm.id}')"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>${isFav ? 'В избранном' : 'В избранное'}</button>` : ''}
            </div>
            ${landlord ? `<div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);">
                <h3 style="margin-bottom:12px;">Арендодатель</h3>
                <div style="display:flex;align-items:center;gap:16px;">
                    <img src="${landlord.avatar || getAvatarSVG(landlord.name, landlord.surname, 64)}" style="width:64px;height:64px;border-radius:50%;">
                    <div>
                        <strong>${landlord.surname} ${landlord.name}</strong>
                        <div style="color:var(--text-secondary);font-size:0.875rem;">Рейтинг: ${landlord.rating.toFixed(1)} (${landlord.ratingCount} отзывов)</div>
                        <a href="#profile/${landlord.id}" class="btn-text">Профиль</a>
                    </div>
                </div>
            </div>` : ''}
        </div>
    </div>`;
}

function renderChats() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const chats = DB.getChats().filter(c => c.participants.includes(user.id));
    const users = DB.getUsers();
    return `
    <div class="chat-layout">
        <div class="chat-sidebar">
            <div class="chat-sidebar-header"><input type="text" placeholder="Поиск чатов..."></div>
            <div class="chat-list">
                ${chats.length === 0 ? '<p style="padding:20px;text-align:center;color:var(--text-secondary);">Нет чатов</p>' : chats.map(c => {
                    const otherId = c.participants.find(p => p !== user.id);
                    const other = users.find(u => u.id === otherId);
                    if (!other) return '';
                    const lastMsg = c.messages[c.messages.length - 1];
                    const badge = other.type === 'landlord' ? '<span class="chat-badge landlord" title="Арендодатель"><i class="fa-solid fa-house"></i></span>' :
                                  other.type === 'moderator' ? '<span class="chat-badge moderator" title="Модератор"><i class="fa-solid fa-check"></i></span>' : '';
                    return `<div class="chat-item" onclick="navigateTo('chat/${c.id}')">
                        <img src="${other.avatar || getAvatarSVG(other.name, other.surname, 40)}">
                        <div class="chat-item-info">
                            <h4>${other.name} ${other.surname} ${badge}</h4>
                            <p>${lastMsg?.text || ''}</p>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        <div class="chat-main" style="display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">
            <div style="text-align:center;"><i class="fa-solid fa-comments" style="font-size:3rem;margin-bottom:12px;"></i><p>Выберите чат</p></div>
        </div>
    </div>`;
}

function renderChat(id) {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const chats = DB.getChats();
    const chat = chats.find(c => c.id === id);
    if (!chat || !chat.participants.includes(user.id)) return '<p>Чат не найден</p>';
    const users = DB.getUsers();
    const otherId = chat.participants.find(p => p !== user.id);
    const other = users.find(u => u.id === otherId);
    const badge = other.type === 'landlord' ? '<span class="chat-badge landlord" title="Арендодатель"><i class="fa-solid fa-house"></i></span>' :
                  other.type === 'moderator' ? '<span class="chat-badge moderator" title="Модератор"><i class="fa-solid fa-check"></i></span>' : '';

    return `
    <div class="chat-layout">
        <div class="chat-sidebar">
            <div class="chat-sidebar-header"><input type="text" placeholder="Поиск чатов..."></div>
            <div class="chat-list">
                ${chats.filter(c => c.participants.includes(user.id)).map(c => {
                    const oid = c.participants.find(p => p !== user.id);
                    const o = users.find(u => u.id === oid);
                    if (!o) return '';
                    const b = o.type === 'landlord' ? '<span class="chat-badge landlord"><i class="fa-solid fa-house"></i></span>' : o.type === 'moderator' ? '<span class="chat-badge moderator"><i class="fa-solid fa-check"></i></span>' : '';
                    return `<div class="chat-item ${c.id === id ? 'active' : ''}" onclick="navigateTo('chat/${c.id}')">
                        <img src="${o.avatar || getAvatarSVG(o.name, o.surname, 40)}">
                        <div class="chat-item-info"><h4>${o.name} ${o.surname} ${b}</h4></div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        <div class="chat-main">
            <div class="chat-header">
                <img src="${other.avatar || getAvatarSVG(other.name, other.surname, 40)}" style="width:40px;height:40px;border-radius:50%;">
                <h4>${other.name} ${other.surname} ${badge}</h4>
            </div>
            <div class="chat-messages" id="chat-messages">
                ${chat.messages.map(m => {
                    const sent = m.senderId === user.id;
                    const sender = users.find(u => u.id === m.senderId);
                    return `<div class="message ${sent ? 'sent' : 'received'}">
                        ${!sent ? `<div style="font-size:0.75rem;opacity:0.7;margin-bottom:4px;">${sender?.name || ''}</div>` : ''}
                        <div>${m.text}</div>
                        <div class="message-time">${formatTime(m.time)}</div>
                    </div>`;
                }).join('')}
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Сообщение..." onkeypress="if(event.key==='Enter')sendMessage('${id}')">
                <button class="btn-primary" onclick="sendMessage('${id}')"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    </div>`;
}

function sendMessage(chatId) {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    const user = getUser();
    const chats = DB.getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    chat.messages.push({ id: generateId('msg'), senderId: user.id, text, time: Date.now() });
    DB.saveChats(chats);
    const otherId = chat.participants.find(p => p !== user.id);
    addNotification(otherId, 'message', 'Новое сообщение от ' + user.name + ' ' + user.surname);
    renderPage();
    setTimeout(() => {
        const box = document.getElementById('chat-messages');
        if (box) box.scrollTop = box.scrollHeight;
    }, 50);
}

function startChat(otherId) {
    const user = getUser();
    if (!user) { navigateTo('login'); return; }
    if (otherId === user.id) { showToast('Нельзя написать себе', 'error'); return; }
    let chats = DB.getChats();
    let chat = chats.find(c => c.participants.includes(user.id) && c.participants.includes(otherId));
    if (!chat) {
        chat = { id: generateId('chat'), participants: [user.id, otherId], messages: [] };
        chats.push(chat); DB.saveChats(chats);
    }
    navigateTo('chat/' + chat.id);
}

function renderFriends() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const friends = DB.getFriends().filter(f => f.userId === user.id);
    const users = DB.getUsers();
    return `
    <div style="padding:24px 0;">
        <h2 style="margin-bottom:24px;"><i class="fa-solid fa-user-group"></i> Друзья</h2>
        <div class="friends-search">
            <input type="text" id="friend-search" placeholder="Найти пользователя..." oninput="renderFriendSearch()">
        </div>
        <div id="friend-search-results" style="margin-bottom:24px;"></div>
        <h3 style="margin-bottom:16px;">Мои друзья (${friends.length})</h3>
        ${friends.length === 0 ? '<p style="color:var(--text-secondary);">У вас пока нет друзей</p>' : `
        <div class="friends-grid">
            ${friends.map(f => {
                const u = users.find(x => x.id === f.friendId);
                if (!u) return '';
                return `<div class="friend-card">
                    <img src="${u.avatar || getAvatarSVG(u.name, u.surname, 40)}">
                    <div class="friend-card-info">
                        <h4>${u.name} ${u.surname}</h4>
                        <p>${u.type === 'landlord' ? 'Арендодатель' : u.type === 'tenant' ? 'Жилец' : 'Пользователь'}</p>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-outline btn-sm" onclick="startChat('${u.id}')"><i class="fa-solid fa-message"></i></button>
                        <button class="btn-danger btn-sm" onclick="removeFriend('${u.id}')"><i class="fa-solid fa-user-minus"></i></button>
                    </div>
                </div>`;
            }).join('')}
        </div>`}
    </div>`;
}

function renderFindFriends() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const users = DB.getUsers().filter(u => u.id !== user.id && u.type !== 'moderator');
    const friends = DB.getFriends().filter(f => f.userId === user.id).map(f => f.friendId);
    const requests = DB.getFriendRequests();

    return `
    <div style="padding:24px 0;">
        <h2 style="margin-bottom:24px;"><i class="fa-solid fa-magnifying-glass"></i> Поиск друзей</h2>
        <div class="friends-search">
            <input type="text" id="find-friend-search" placeholder="Найти пользователя по имени или фамилии..." oninput="searchFriends()">
        </div>
        <div id="find-friend-results">
            <div class="friends-grid">
                ${users.map(u => {
                    const isFriend = friends.includes(u.id);
                    const hasRequest = requests.some(r => r.fromId === user.id && r.toId === u.id && r.status === 'pending');
                    return `
                    <div class="friend-card" data-name="${(u.name + ' ' + u.surname).toLowerCase()}">
                        <img src="${u.avatar || getAvatarSVG(u.name, u.surname, 40)}">
                        <div class="friend-card-info">
                            <h4>${u.name} ${u.surname}</h4>
                            <p>${u.type === 'landlord' ? 'Арендодатель' : 'Жилец'}</p>
                        </div>
                        ${isFriend ? '<span class="status-badge status-approved">В друзьях</span>' :
                          hasRequest ? '<span class="status-badge status-pending">Заявка отправлена</span>' :
                          `<button class="btn-primary btn-sm" onclick="sendFriendRequest('${u.id}')">Добавить</button>`}
                    </div>`;
                }).join('')}
            </div>
        </div>
    </div>`;
}

function searchFriends() {
    const query = document.getElementById('find-friend-search').value.toLowerCase();
    const cards = document.querySelectorAll('#find-friend-results .friend-card');
    cards.forEach(card => {
        const name = card.getAttribute('data-name');
        card.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

function renderFriendSearch() {
    const q = document.getElementById('friend-search').value.trim().toLowerCase();
    const container = document.getElementById('friend-search-results');
    if (!q) { container.innerHTML = ''; return; }
    const user = getUser();
    const users = DB.getUsers().filter(u => u.id !== user.id && u.type !== 'moderator' && (u.name + ' ' + u.surname).toLowerCase().includes(q));
    const friends = DB.getFriends().filter(f => f.userId === user.id).map(f => f.friendId);
    const requests = DB.getFriendRequests();
    container.innerHTML = users.length === 0 ? '<p style="color:var(--text-secondary);">Ничего не найдено</p>' : `
    <div class="friends-grid">${users.map(u => {
        const isFriend = friends.includes(u.id);
        const hasRequest = requests.some(r => r.fromId === user.id && r.toId === u.id && r.status === 'pending');
        return `<div class="friend-card">
            <img src="${u.avatar || getAvatarSVG(u.name, u.surname, 40)}">
            <div class="friend-card-info"><h4>${u.name} ${u.surname}</h4><p>${u.type === 'landlord' ? 'Арендодатель' : 'Жилец'}</p></div>
            ${isFriend ? '<span class="status-badge status-approved">В друзьях</span>' :
              hasRequest ? '<span class="status-badge status-pending">Заявка отправлена</span>' :
              `<button class="btn-primary btn-sm" onclick="sendFriendRequest('${u.id}')">Добавить</button>`}
        </div>`;
    }).join('')}</div>`;
}

function sendFriendRequest(toId) {
    const user = getUser();
    const reqs = DB.getFriendRequests();
    if (reqs.some(r => r.fromId === user.id && r.toId === toId && r.status === 'pending')) { showToast('Заявка уже отправлена', 'info'); return; }
    reqs.push({ id: generateId('req'), fromId: user.id, toId, status: 'pending', time: Date.now() });
    DB.saveFriendRequests(reqs);
    addNotification(toId, 'friend', user.name + ' ' + user.surname + ' отправил(а) заявку в друзья');
    showToast('Заявка отправлена', 'success');
    renderPage();
}

function removeFriend(friendId) {
    showConfirm('Удалить из друзей?', 'Пользователь будет удалён из списка друзей.', () => {
        const user = getUser();
        let friends = DB.getFriends().filter(f => !(f.userId === user.id && f.friendId === friendId) && !(f.userId === friendId && f.friendId === user.id));
        DB.saveFriends(friends);
        showToast('Удалён из друзей', 'info');
        renderPage();
    });
}

function renderFriendRequests() {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    const reqs = DB.getFriendRequests().filter(r => r.toId === user.id && r.status === 'pending');
    const users = DB.getUsers();
    return `
    <div style="padding:24px 0;">
        <h2 style="margin-bottom:24px;"><i class="fa-solid fa-user-plus"></i> Заявки в друзья</h2>
        ${reqs.length === 0 ? '<p style="color:var(--text-secondary);">Нет новых заявок</p>' : `
        <div class="friends-grid">
            ${reqs.map(r => {
                const u = users.find(x => x.id === r.fromId);
                if (!u) return '';
                const badge = document.getElementById('friend-request-badge');
                if (badge) badge.classList.add('hidden');
                return `<div class="friend-card">
                    <img src="${u.avatar || getAvatarSVG(u.name, u.surname, 40)}">
                    <div class="friend-card-info"><h4>${u.name} ${u.surname}</h4><p>${u.type === 'landlord' ? 'Арендодатель' : 'Жилец'}</p></div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-success btn-sm" onclick="acceptFriend('${r.id}')">Принять</button>
                        <button class="btn-danger btn-sm" onclick="rejectFriend('${r.id}')">Отклонить</button>
                    </div>
                </div>`;
            }).join('')}
        </div>`}
    </div>`;
}

function acceptFriend(reqId) {
    const reqs = DB.getFriendRequests();
    const req = reqs.find(r => r.id === reqId);
    if (!req) return;
    req.status = 'accepted';
    DB.saveFriendRequests(reqs);
    const friends = DB.getFriends();
    friends.push({ userId: req.fromId, friendId: req.toId, since: Date.now() });
    friends.push({ userId: req.toId, friendId: req.fromId, since: Date.now() });
    DB.saveFriends(friends);
    addNotification(req.fromId, 'friend', 'Ваша заявка в друзья принята');
    showToast('Заявка принята', 'success');
    renderPage();
}

function rejectFriend(reqId) {
    let reqs = DB.getFriendRequests().filter(r => r.id !== reqId);
    DB.saveFriendRequests(reqs);
    showToast('Заявка отклонена', 'info');
    renderPage();
}

function renderProfile(userId) {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = userId ? DB.getUsers().find(u => u.id === userId) : getUser();
    if (!user) return '<p>Пользователь не найден</p>';
    const currentUser = getUser();
    const isSelf = currentUser.id === user.id;
    const friends = DB.getFriends().filter(f => f.userId === user.id);
    const reviews = DB.getReviews().filter(r => r.landlordId === user.id);
    const isFriend = !isSelf && DB.getFriends().some(f => f.userId === currentUser.id && f.friendId === user.id);
    const hasRequest = !isSelf && DB.getFriendRequests().some(r => r.fromId === currentUser.id && r.toId === user.id && r.status === 'pending');

    return `
    <div style="padding:24px 0;">
        <div class="profile-header">
            <img class="profile-avatar" src="${user.avatar || getAvatarSVG(user.name, user.surname, 120)}">
            <div class="profile-info" style="flex:1;">
                <h2>${user.surname} ${user.name} ${user.patronymic || ''}</h2>
                <span class="role-badge">${user.type === 'landlord' ? 'Арендодатель' : user.type === 'tenant' ? 'Жилец' : user.type === 'moderator' ? 'Модератор' : 'Пользователь'}</span>
                ${user.identityVerified ? '<span class="role-badge" style="background:rgba(16,185,129,0.15);color:var(--success);"><i class="fa-solid fa-circle-check"></i> Верифицирован</span>' : ''}
                <div class="rating-display"><span class="stars" style="color:var(--warning);">★</span> ${user.rating.toFixed(1)} (${user.ratingCount} отзывов)</div>
                ${user.bio ? `<p class="bio">${user.bio}</p>` : ''}
                ${isSelf && user.userId ? `<div style="margin-top:8px;font-size:0.875rem;color:var(--text-secondary);">Ваш ID: <strong>${user.userId}</strong></div>` : ''}
            </div>
            ${!isSelf && user.type !== 'moderator' ? `
            <div style="display:flex;gap:8px;">
                ${isFriend ? `<button class="btn-danger btn-sm" onclick="removeFriend('${user.id}')">Удалить из друзей</button>` :
                  hasRequest ? `<button class="btn-outline btn-sm" disabled>Заявка отправлена</button>` :
                  `<button class="btn-primary btn-sm" onclick="sendFriendRequest('${user.id}')">Добавить в друзья</button>`}
                <button class="btn-outline btn-sm" onclick="startChat('${user.id}')"><i class="fa-solid fa-message"></i>Написать</button>
            </div>` : ''}
        </div>

        <div class="profile-stats">
            <div class="stat-card"><div class="number">${user.rating.toFixed(1)}</div><div class="label">Рейтинг</div></div>
            <div class="stat-card"><div class="number">${friends.length}</div><div class="label">Друзей</div></div>
            <div class="stat-card"><div class="number">${reviews.length}</div><div class="label">Отзывов</div></div>
        </div>

        ${user.type === 'landlord' ? `
        <div class="reviews-section">
            <h3>Отзывы</h3>
            ${reviews.length === 0 ? '<p style="color:var(--text-secondary);">Пока нет отзывов</p>' :
                reviews.map(r => `<div class="review-card">
                    <div class="review-header">
                        <div><strong>${r.authorName}</strong><div class="stars" style="color:var(--warning);">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div></div>
                        <div class="date">${formatDate(r.date)}</div>
                    </div>
                    <p class="review-text">${r.text}</p>
                </div>`).join('')}
            ${!isSelf && isLoggedIn() ? `
            <div style="margin-top:20px;padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);">
                <h4 style="margin-bottom:12px;">Оставить отзыв</h4>
                <select id="review-rating" style="margin-bottom:12px;">
                    <option value="5">5 ★★★★★</option><option value="4">4 ★★★★☆</option>
                    <option value="3">3 ★★★☆☆</option><option value="2">2 ★★☆☆☆</option><option value="1">1 ★☆☆☆☆</option>
                </select>
                <textarea id="review-text" rows="3" placeholder="Ваш отзыв..." style="margin-bottom:12px;"></textarea>
                <button class="btn-primary" onclick="submitReview('${user.id}')">Отправить</button>
            </div>` : ''}
        </div>` : ''}
    </div>`;
}

function submitReview(landlordId) {
    const user = getUser();
    const rating = parseInt(document.getElementById('review-rating').value);
    const text = document.getElementById('review-text').value.trim();
    if (!text) { showToast('Введите текст отзыва', 'error'); return; }
    const reviews = DB.getReviews();
    reviews.push({ id: generateId('rev'), landlordId, authorId: user.id, authorName: user.name + ' ' + user.surname[0] + '.', rating, text, date: Date.now() });
    DB.saveReviews(reviews);
    const users = DB.getUsers();
    const ll = users.find(u => u.id === landlordId);
    if (ll) {
        const llReviews = reviews.filter(r => r.landlordId === landlordId);
        ll.rating = llReviews.reduce((s, r) => s + r.rating, 0) / llReviews.length;
        ll.ratingCount = llReviews.length;
        DB.saveUsers(users);
    }
    addNotification(landlordId, 'system', user.name + ' оставил(а) вам отзыв');
    showToast('Отзыв отправлен', 'success');
    renderPage();
}

let tempAvatar = null;
function renderSettings(tab = 'profile') {
    if (!isLoggedIn()) { navigateTo('login'); return ''; }
    const user = getUser();
    return `
    <div class="settings-layout">
        <nav class="settings-nav">
            <a href="#settings/profile" class="${tab === 'profile' ? 'active' : ''}"><i class="fa-solid fa-user"></i>Профиль</a>
            <a href="#settings/security" class="${tab === 'security' ? 'active' : ''}"><i class="fa-solid fa-shield"></i>Безопасность</a>
            <a href="#settings/email" class="${tab === 'email' ? 'active' : ''}"><i class="fa-solid fa-envelope"></i>Почта</a>
            <a href="#settings/2fa" class="${tab === '2fa' ? 'active' : ''}"><i class="fa-solid fa-lock"></i>2FA</a>
        </nav>
        <div class="settings-content">
            ${tab === 'profile' ? settingsProfile(user) : ''}
            ${tab === 'security' ? settingsSecurity(user) : ''}
            ${tab === 'email' ? settingsEmail(user) : ''}
            ${tab === '2fa' ? settings2FA(user) : ''}
        </div>
    </div>`;
}

function settingsProfile(user) {
    return `
    <h3>Профиль</h3>
    <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">
            <img id="profile-avatar-preview" src="${user.avatar || getAvatarSVG(user.name, user.surname, 120)}" 
                 style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);">
            <div>
                <button class="btn-outline btn-sm" onclick="document.getElementById('avatar-upload').click()">
                    <i class="fa-solid fa-camera"></i> Изменить фото
                </button>
                <input type="file" id="avatar-upload" accept="image/*" class="hidden" onchange="handleAvatarUpload(event)">
                <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:8px;">JPG, PNG до 5MB</p>
            </div>
        </div>
    </div>
    <form onsubmit="saveProfile(event)">
        <div class="form-row">
            <div class="form-group"><label>Фамилия</label><input type="text" id="set-surname" value="${user.surname || ''}"></div>
            <div class="form-group"><label>Имя</label><input type="text" id="set-name" value="${user.name || ''}"></div>
        </div>
        <div class="form-group"><label>Отчество</label><input type="text" id="set-patr" value="${user.patronymic || ''}"></div>
        <div class="form-group"><label>О себе</label><textarea id="set-bio" rows="3">${user.bio || ''}</textarea></div>
        ${user.userId ? `<div class="form-group"><label>Ваш уникальный ID</label><input type="text" value="${user.userId}" readonly style="background:var(--bg-input);cursor:not-allowed;"></div>` : ''}
        <button type="submit" class="btn-primary">Сохранить</button>
    </form>`;
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast('Файл слишком большой (макс. 5MB)', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        tempAvatar = ev.target.result;
        document.getElementById('profile-avatar-preview').src = tempAvatar;
        showToast('Фото обновлено', 'success');
    };
    reader.readAsDataURL(file);
}

function saveProfile(e) {
    e.preventDefault();
    const user = getUser();
    const users = DB.getUsers();
    const u = users.find(x => x.id === user.id);
    u.surname = document.getElementById('set-surname').value;
    u.name = document.getElementById('set-name').value;
    u.patronymic = document.getElementById('set-patr').value;
    u.bio = document.getElementById('set-bio').value;
    if (tempAvatar) {
        u.avatar = tempAvatar;
        tempAvatar = null;
    }
    DB.saveUsers(users);
    DB.setCurrentUser(u);
    updateAuthUI();
    showToast('Профиль сохранён', 'success');
}

function settingsSecurity(user) {
    return `
    <h3>Смена пароля</h3>
    <form onsubmit="changePassword(event)">
        <div class="form-group"><label>Текущий пароль</label><input type="password" id="cp-old" required></div>
        <div class="form-group"><label>Новый пароль</label><input type="password" id="cp-new" minlength="6" required></div>
        <div class="form-group"><label>Повторите новый пароль</label><input type="password" id="cp-confirm" required></div>
        <div id="cp-code-section" class="hidden">
            <div class="form-group"><label>Код подтверждения (отправлен на почту)</label><input type="text" id="cp-code" maxlength="6"></div>
        </div>
        <button type="submit" class="btn-primary" id="cp-btn">Сменить пароль</button>
    </form>`;
}

function changePassword(e) {
    e.preventDefault();
    const user = getUser();
    const oldP = document.getElementById('cp-old').value;
    const newP = document.getElementById('cp-new').value;
    const conf = document.getElementById('cp-confirm').value;
    if (user.password !== oldP) { showToast('Неверный текущий пароль', 'error'); return; }
    if (newP !== conf) { showToast('Пароли не совпадают', 'error'); return; }
    if (newP.length < 6) { showToast('Пароль минимум 6 символов', 'error'); return; }

    const codeSection = document.getElementById('cp-code-section');
    if (codeSection.classList.contains('hidden')) {
        const code = generateCode();
        const codes = DB.get2FACodes();
        codes[user.id] = { code, expires: Date.now() + 300000 };
        DB.save2FACodes(codes);
        codeSection.classList.remove('hidden');
        document.getElementById('cp-btn').textContent = 'Подтвердить и сменить';
        showToast('Код отправлен на ' + user.email + ' (демо: ' + code + ')', 'info');
        return;
    }
    const code = document.getElementById('cp-code').value;
    const codes = DB.get2FACodes();
    const stored = codes[user.id];
    if (!stored || stored.code !== code || stored.expires < Date.now()) { showToast('Неверный код', 'error'); return; }
    delete codes[user.id]; DB.save2FACodes(codes);

    const users = DB.getUsers();
    const u = users.find(x => x.id === user.id);
    u.password = newP;
    DB.saveUsers(users); DB.setCurrentUser(u);
    addNotification(u.id, 'system', 'Пароль изменён');
    showToast('Пароль изменён', 'success');
    navigateTo('settings/security');
}

function settingsEmail(user) {
    return `
    <h3>Изменение почты</h3>
    <p style="color:var(--text-secondary);margin-bottom:16px;">Текущая почта: <strong>${user.email}</strong></p>
    <form onsubmit="changeEmail(event)">
        <div class="form-group"><label>Новая почта</label><input type="email" id="ce-new" required></div>
        <div id="ce-code-section" class="hidden">
            <div class="form-group"><label>Код подтверждения (отправлен на новую почту)</label><input type="text" id="ce-code" maxlength="6"></div>
        </div>
        <button type="submit" class="btn-primary" id="ce-btn">Изменить почту</button>
    </form>`;
}

let ceNewEmail = null;
let ceCode = null;
function changeEmail(e) {
    e.preventDefault();
    const user = getUser();
    const codeSection = document.getElementById('ce-code-section');
    if (codeSection.classList.contains('hidden')) {
        ceNewEmail = document.getElementById('ce-new').value.trim();
        const users = DB.getUsers();
        if (users.some(u => u.email === ceNewEmail)) { showToast('Почта уже используется', 'error'); return; }
        ceCode = generateCode();
        codeSection.classList.remove('hidden');
        document.getElementById('ce-btn').textContent = 'Подтвердить';
        showToast('Код отправлен на ' + ceNewEmail + ' (демо: ' + ceCode + ')', 'info');
        return;
    }
    const code = document.getElementById('ce-code').value;
    if (code !== ceCode) { showToast('Неверный код', 'error'); return; }

    const users = DB.getUsers();
    const u = users.find(x => x.id === user.id);
    u.email = ceNewEmail;
    DB.saveUsers(users); DB.setCurrentUser(u);
    addNotification(u.id, 'system', 'Почта изменена на ' + ceNewEmail);
    showToast('Почта изменена', 'success');
    navigateTo('settings/email');
}

function settings2FA(user) {
    return `
    <h3>Двухфакторная аутентификация</h3>
    <p style="color:var(--text-secondary);margin-bottom:16px;">Статус: <strong>${user.twoFactorEnabled ? '<span style="color:var(--success);">Включена</span>' : '<span style="color:var(--text-secondary);">Отключена</span>'}</strong></p>
    ${user.twoFactorEnabled ? `
        <form onsubmit="disable2FA(event)">
            <div class="form-group"><label>Код подтверждения (отправлен на почту)</label><input type="text" id="d2fa-code" maxlength="6" required></div>
            <button type="submit" class="btn-danger">Отключить 2FA</button>
        </form>` : `
        <form onsubmit="enable2FA(event)">
            <div class="form-group"><label>Код подтверждения (отправлен на почту)</label><input type="text" id="e2fa-code" maxlength="6" required></div>
            <button type="submit" class="btn-primary">Включить 2FA</button>
            <button type="button" class="btn-outline" onclick="send2FACode()" style="margin-left:8px;">Получить код</button>
        </form>`}
    `;
}

let e2faCode = null;
let d2faCode = null;
function send2FACode() {
    const user = getUser();
    e2faCode = generateCode();
    showToast('Код отправлен на ' + user.email + ' (демо: ' + e2faCode + ')', 'info');
}

function enable2FA(e) {
    e.preventDefault();
    const user = getUser();
    const code = document.getElementById('e2fa-code').value;
    if (!e2faCode || code !== e2faCode) { showToast('Неверный код', 'error'); return; }
    const users = DB.getUsers();
    const u = users.find(x => x.id === user.id);
    u.twoFactorEnabled = true;
    DB.saveUsers(users); DB.setCurrentUser(u);
    addNotification(u.id, 'system', 'Двухфакторная аутентификация включена');
    showToast('2FA включена', 'success');
    navigateTo('settings/2fa');
}

function disable2FA(e) {
    e.preventDefault();
    const user = getUser();
    const code = document.getElementById('d2fa-code').value;
    if (!d2faCode || code !== d2faCode) { showToast('Неверный код', 'error'); return; }
    const users = DB.getUsers();
    const u = users.find(x => x.id === user.id);
    u.twoFactorEnabled = false;
    DB.saveUsers(users); DB.setCurrentUser(u);
    addNotification(u.id, 'system', 'Двухфакторная аутентификация отключена');
    showToast('2FA отключена', 'info');
    navigateTo('settings/2fa');
}

document.addEventListener('DOMContentLoaded', () => {
    initVKOAuth();
    initTheme();
    checkTestMode();
    updateAuthUI();
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    window.addEventListener('hashchange', renderPage);
    renderPage();
    // Hide loading screen after app is ready
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 300); }
    }, 200);
});

document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    const dropdown = document.getElementById('dropdown-menu');
    if (menu && dropdown && !menu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
    const notifBtn = document.getElementById('notif-btn');
    const panel = document.getElementById('notifications-panel');
    if (notifBtn && panel && !notifBtn.contains(e.target) && !panel.contains(e.target)) {
        panel.classList.add('hidden');
    }
    const testModal = document.getElementById('test-mode-modal');
    if (testModal && !testModal.classList.contains('hidden') && e.target === testModal) {
        dismissTestMode();
    }
});