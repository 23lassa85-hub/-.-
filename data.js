const DB = {
    getUsers() { return JSON.parse(localStorage.getItem('mk_users') || '[]'); },
    saveUsers(users) { localStorage.setItem('mk_users', JSON.stringify(users)); },
    getCurrentUser() { return JSON.parse(localStorage.getItem('mk_current_user') || 'null'); },
    setCurrentUser(user) { localStorage.setItem('mk_current_user', JSON.stringify(user)); },
    getDorms() { return JSON.parse(localStorage.getItem('mk_dorms') || '[]'); },
    saveDorms(dorms) { localStorage.setItem('mk_dorms', JSON.stringify(dorms)); },
    getFavorites() { return JSON.parse(localStorage.getItem('mk_favorites') || '[]'); },
    saveFavorites(favs) { localStorage.setItem('mk_favorites', JSON.stringify(favs)); },
    getChats() { return JSON.parse(localStorage.getItem('mk_chats') || '[]'); },
    saveChats(chats) { localStorage.setItem('mk_chats', JSON.stringify(chats)); },
    getFriends() { return JSON.parse(localStorage.getItem('mk_friends') || '[]'); },
    saveFriends(friends) { localStorage.setItem('mk_friends', JSON.stringify(friends)); },
    getFriendRequests() { return JSON.parse(localStorage.getItem('mk_friend_requests') || '[]'); },
    saveFriendRequests(reqs) { localStorage.setItem('mk_friend_requests', JSON.stringify(reqs)); },
    getNotifications() { return JSON.parse(localStorage.getItem('mk_notifications') || '[]'); },
    saveNotifications(notifs) { localStorage.setItem('mk_notifications', JSON.stringify(notifs)); },
    getModerationQueue() { return JSON.parse(localStorage.getItem('mk_moderation') || '[]'); },
    saveModerationQueue(queue) { localStorage.setItem('mk_moderation', JSON.stringify(queue)); },
    getRooms() { return JSON.parse(localStorage.getItem('mk_rooms') || '[]'); },
    saveRooms(rooms) { localStorage.setItem('mk_rooms', JSON.stringify(rooms)); },
    get2FACodes() { return JSON.parse(localStorage.getItem('mk_2fa_codes') || '{}'); },
    save2FACodes(codes) { localStorage.setItem('mk_2fa_codes', JSON.stringify(codes)); },
    getReviews() { return JSON.parse(localStorage.getItem('mk_reviews') || '[]'); },
    saveReviews(reviews) { localStorage.setItem('mk_reviews', JSON.stringify(reviews)); },
};

function seedData() {
    if (DB.getUsers().length > 0) return;
    const users = [
        {
            id: 'usr_001', email: 'ivan@example.com', password: '123456', type: 'tenant',
            name: 'Иван', surname: 'Петров', patronymic: 'Сергеевич', role: 'student',
            university: 'БФУ им. Канта', district: 'Центральный', gender: 'male',
            interests: 'Спорт, музыка', habits: 'Не курю, рано встаю',
            bio: 'Студент 3 курса, ищу соседа', avatar: '', rating: 4.7, ratingCount: 12,
            userId: 'T10001', twoFactorEnabled: false, verified: true, identityVerified: true,
            createdAt: Date.now(), vkLinked: false
        },
        {
            id: 'usr_002', email: 'sergey@example.com', password: '123456', type: 'landlord',
            name: 'Сергей', surname: 'Смирнов', patronymic: 'Владимирович',
            avatar: '', rating: 4.9, ratingCount: 8, userId: 'L20001',
            twoFactorEnabled: false, verified: true, identityVerified: true,
            createdAt: Date.now(), vkLinked: false
        },
        {
            id: 'usr_moderator', email: 'moder@mail.ru', password: '111111',
            type: 'moderator', name: 'Модератор', surname: 'Системы', patronymic: '',
            avatar: '', userId: 'M99999', twoFactorEnabled: false, verified: true,
            identityVerified: true, createdAt: Date.now(), vkLinked: false
        },
        {
            id: 'usr_003', email: 'demo2@tenant.ru', password: 'demo123', type: 'tenant',
            name: 'Мария', surname: 'Козлова', patronymic: 'Алексеевна', role: 'student',
            university: 'КГТУ', district: 'Московский', gender: 'female',
            interests: 'Кино, путешествия', habits: 'Читаю перед сном',
            bio: 'Ищу комнату недалеко от университета', avatar: '', rating: 4.5, ratingCount: 5,
            userId: 'T10002', twoFactorEnabled: false, verified: true, identityVerified: true,
            createdAt: Date.now(), vkLinked: false
        }
    ];

    const dorms = [
        { id: 'dorm_001', title: 'Общежитие "Волна"', address: 'ул. Ленинского Комсомола, 15, Калининград',
          district: 'Центральный', price: 4500, rating: 4.5, tenantRating: 4.2, reviews: 24,
          rooms: 12, occupied: 8, images: [], description: 'Современное общежитие в центре города.',
          landlordId: 'usr_002', status: 'approved', verified: true, createdAt: Date.now(),
          preferredUniversity: 'БФУ им. Канта', preferredGender: 'male' },
        { id: 'dorm_002', title: 'Дом "Береговой"', address: 'ул. Береговая, 42, Светлогорск',
          district: 'Светлогорск', price: 5500, rating: 4.8, tenantRating: 4.5, reviews: 18,
          rooms: 8, occupied: 3, images: [], description: 'Уютное жильё у берега Балтийского моря.',
          landlordId: 'usr_002', status: 'approved', verified: true, createdAt: Date.now(),
          preferredUniversity: '', preferredGender: '' },
        { id: 'dorm_003', title: 'Студенческий "Альфа"', address: 'ул. Московский проспект, 88, Калининград',
          district: 'Московский', price: 3500, rating: 3.9, tenantRating: 3.8, reviews: 31,
          rooms: 20, occupied: 17, images: [], description: 'Бюджетный вариант для студентов.',
          landlordId: 'usr_002', status: 'approved', verified: true, createdAt: Date.now(),
          preferredUniversity: 'КГТУ', preferredGender: 'female' },
        { id: 'dorm_004', title: 'Общежитие "Солнечное"', address: 'ул. Солнечная, 7, Зеленоградск',
          district: 'Зеленоградск', price: 6200, rating: 4.7, tenantRating: 4.6, reviews: 15,
          rooms: 6, occupied: 4, images: [], description: 'Премиум общежитие в курортном городе.',
          landlordId: 'usr_002', status: 'approved', verified: true, createdAt: Date.now(),
          preferredUniversity: '', preferredGender: '' },
        { id: 'dorm_005', title: 'Комнаты "Университет"', address: 'ул. Университетская, 2, Калининград',
          district: 'Центральный', price: 4000, rating: 4.1, tenantRating: 4.0, reviews: 42,
          rooms: 30, occupied: 25, images: [], description: 'Рядом с БФУ. Специальные условия.',
          landlordId: 'usr_002', status: 'approved', verified: true, createdAt: Date.now(),
          preferredUniversity: 'БФУ им. Канта', preferredGender: '' }
    ];

    const rooms = [
        { id: 'room_001', tenantId: 'usr_001', dormId: 'dorm_001', rentUntil: Date.now() + 30*86400000,
          monthlyPrice: 4500, paidUntil: Date.now() + 30*86400000 }
    ];

    const chats = [
        { id: 'chat_001', participants: ['usr_001', 'usr_002'],
          messages: [
            { id: 'msg_001', senderId: 'usr_001', text: 'Здравствуйте! Есть ли свободные места?', time: Date.now() - 86400000 },
            { id: 'msg_002', senderId: 'usr_002', text: 'Да, есть несколько комнат.', time: Date.now() - 3600000 }
          ]}
    ];

    const friends = [
        { userId: 'usr_001', friendId: 'usr_003', since: Date.now() },
        { userId: 'usr_003', friendId: 'usr_001', since: Date.now() }
    ];

    const reviews = [
        { id: 'rev_001', landlordId: 'usr_002', authorId: 'usr_001', authorName: 'Иван П.',
          rating: 5, text: 'Отличные условия, добрая хозяйка!', date: Date.now() - 86400000 },
        { id: 'rev_002', landlordId: 'usr_002', authorId: 'usr_003', authorName: 'Мария К.',
          rating: 4, text: 'Хорошо, но немного шумно.', date: Date.now() - 172800000 }
    ];

    const notifications = [
        { id: 'notif_001', userId: 'usr_001', type: 'message', text: 'Новое сообщение от Анна Смирнова', read: false, time: Date.now() - 3600000 },
        { id: 'notif_002', userId: 'usr_001', type: 'system', text: 'Добро пожаловать в МояКойка!', read: true, time: Date.now() - 86400000 }
    ];

    DB.saveUsers(users);
    DB.saveDorms(dorms);
    DB.saveRooms(rooms);
    DB.saveChats(chats);
    DB.saveFriends(friends);
    DB.saveReviews(reviews);
    DB.saveNotifications(notifications);
    console.log('Seed data initialized');
}

function generateId(prefix) {
    return prefix + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function generateUserId() {
    const prefix = ['T', 'L', 'M'][Math.floor(Math.random() * 3)];
    return prefix + Math.floor(10000 + Math.random() * 90000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽/мес';
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString('ru-RU');
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getDistricts() {
    return ['Центральный', 'Московский', 'Ленинградский', 'Светлогорск', 'Зеленоградск', 'Балтийск', 'Гвардейск', 'Гусев'];
}

function getUniversities() {
    return ['БФУ им. Канта', 'КГТУ', 'РГУ им. Канта', 'КГМУ', 'Другой'];
}

function addNotification(userId, type, text) {
    const notifs = DB.getNotifications();
    notifs.unshift({ id: generateId('notif'), userId, type, text, read: false, time: Date.now() });
    DB.saveNotifications(notifs);
    updateNotificationBadge();
}

function getUnreadCount() {
    const user = DB.getCurrentUser();
    if (!user) return 0;
    return DB.getNotifications().filter(n => n.userId === user.id && !n.read).length;
}

function updateNotificationBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = getUnreadCount();
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle'}"></i><span>${message}</span>`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function dismissTestMode() {
    document.getElementById('test-mode-modal').classList.add('hidden');
    localStorage.setItem('mk_test_dismissed', 'true');
}

function checkTestMode() {
    if (localStorage.getItem('mk_test_dismissed')) {
        document.getElementById('test-mode-modal').classList.add('hidden');
    }
}

let confirmCallback = null;

function showConfirm(title, message, callback) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes-btn');
    
    if (!modal || !titleEl || !messageEl || !yesBtn) {
        if (confirm(message)) callback();
        return;
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmCallback = callback;
    
    modal.classList.remove('hidden');
    
    yesBtn.onclick = () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    };
}

function closeConfirm() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        confirmCallback = null;
    }
}

seedData();
function getIncomingFriendRequestsCount() {
    const user = DB.getCurrentUser();
    if (!user) return 0;
    return DB.getFriendRequests().filter(r => r.toId === user.id && r.status === 'pending').length;
}

function updateFriendRequestBadge() {
    const badge = document.getElementById('friend-request-badge');
    if (!badge) return;
    const count = getIncomingFriendRequestsCount();
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

/* ========== Inline SVG avatar (no external requests) ========== */
function getAvatarSVG(name, surname, size) {
    size = size || 40;
    const initial = ((name || '').charAt(0) + (surname || '').charAt(0)).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#3B82F6" rx="50%"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${Math.round(size * 0.45)}" font-weight="600">${initial}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}