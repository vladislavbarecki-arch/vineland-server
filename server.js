const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_FILE = 'db.json';

async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { users: [], servers: [], smoking: [], nextServerId: 1, nextSmokingId: 1 };
    }
}

async function writeDB(db) {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== РЕГИСТРАЦИЯ =====
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const db = await readDB();
    if (db.users.find(u => u.username === username)) {
        return res.json({ success: false, error: 'Уже существует' });
    }
    const role = db.users.length === 0 ? 'tech_specialist' : 'user';
    const user = { id: Date.now(), username, password, role };
    db.users.push(user);
    await writeDB(db);
    res.json({ success: true, role, user });
});

// ===== ВХОД =====
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.json({ success: false, error: 'Неверные данные' });
    }
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

// ===== ПРОВЕРКА СЕССИИ =====
app.post('/me', async (req, res) => {
    const { token } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.id === token);
    if (!user) {
        return res.json({ success: false, error: 'Сессия не найдена' });
    }
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

// ===== ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ =====
app.post('/users', async (req, res) => {
    const { token } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.id === token);
    if (!user || (user.role !== 'tech_specialist' && user.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    res.json(db.users);
});

// ===== ИЗМЕНИТЬ РОЛЬ =====
app.post('/set-role', async (req, res) => {
    const { token, targetId, newRole } = req.body;
    const db = await readDB();
    const admin = db.users.find(u => u.id === token);
    if (!admin || (admin.role !== 'tech_specialist' && admin.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    if (target.username === admin.username) {
        return res.json({ error: 'Нельзя изменить себя' });
    }
    if (target.role === 'tech_specialist' && admin.role !== 'tech_specialist') {
        return res.json({ error: 'Нельзя изменить Техспециалиста' });
    }
    target.role = newRole;
    await writeDB(db);
    res.json({ success: true });
});

// ===== СМЕНА ПАРОЛЯ =====
app.post('/change-password', async (req, res) => {
    const { token, targetId, newPassword } = req.body;
    const db = await readDB();
    
    const admin = db.users.find(u => u.id === token);
    if (!admin || (admin.role !== 'tech_specialist' && admin.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    
    if (target.role === 'tech_specialist' && admin.role !== 'tech_specialist') {
        return res.json({ error: 'Нельзя менять пароль Техспециалиста' });
    }
    
    target.password = newPassword;
    await writeDB(db);
    res.json({ success: true, message: 'Пароль изменён' });
});

// ===== ИЗМЕНИТЬ ИМЯ ПОЛЬЗОВАТЕЛЯ =====
app.post('/change-username', async (req, res) => {
    const { token, targetId, newUsername } = req.body;
    const db = await readDB();
    
    const admin = db.users.find(u => u.id === token);
    if (!admin || (admin.role !== 'tech_specialist' && admin.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    
    if (db.users.find(u => u.username === newUsername && u.id !== targetId)) {
        return res.json({ error: 'Имя уже занято' });
    }
    
    const oldUsername = target.username;
    target.username = newUsername;
    
    // Обновляем имя во всех темах и комментариях
    db.servers.forEach(server => {
        server.categories?.forEach(category => {
            category.topics?.forEach(topic => {
                if (topic.author === oldUsername) topic.author = newUsername;
                topic.comments?.forEach(comment => {
                    if (comment.author === oldUsername) comment.author = newUsername;
                });
            });
        });
    });
    
    db.smoking.forEach(topic => {
        if (topic.author === oldUsername) topic.author = newUsername;
        topic.comments?.forEach(comment => {
            if (comment.author === oldUsername) comment.author = newUsername;
        });
    });
    
    await writeDB(db);
    res.json({ success: true, message: 'Имя изменено' });
});

// ===== РЕДАКТИРОВАТЬ ТЕМУ =====
app.post('/edit-topic', async (req, res) => {
    const { token, serverId, categoryId, topicId, title, content, status } = req.body;
    const db = await readDB();
    
    const user = db.users.find(u => u.id === token);
    if (!user) return res.json({ error: 'Не авторизован' });
    
    let topic = null;
    
    // Ищем в серверах
    for (const server of db.servers) {
        for (const category of server.categories || []) {
            const found = category.topics?.find(t => t.id === topicId);
            if (found) {
                topic = found;
                break;
            }
        }
        if (topic) break;
    }
    
    // Ищем в курилке
    if (!topic) {
        topic = db.smoking.find(t => t.id === topicId);
    }
    
    if (!topic) return res.json({ error: 'Тема не найдена' });
    
    const isAdmin = ['tech_specialist', 'senior_admin', 'admin'].includes(user.role);
    const isAuthor = topic.author === user.username;
    
    if (!isAuthor && !isAdmin) {
        return res.json({ error: 'Нет прав на редактирование' });
    }
    
    if (title) topic.title = title;
    if (content) topic.content = content;
    if (status && isAdmin) topic.status = status;
    
    await writeDB(db);
    res.json({ success: true });
});

// ===== РЕДАКТИРОВАТЬ КОММЕНТАРИЙ =====
app.post('/edit-comment', async (req, res) => {
    const { token, serverId, categoryId, topicId, commentIndex, text } = req.body;
    const db = await readDB();
    
    const user = db.users.find(u => u.id === token);
    if (!user) return res.json({ error: 'Не авторизован' });
    
    let comments = null;
    
    // Ищем в серверах
    for (const server of db.servers) {
        for (const category of server.categories || []) {
            const found = category.topics?.find(t => t.id === topicId);
            if (found && found.comments && found.comments[commentIndex]) {
                comments = found.comments;
                break;
            }
        }
        if (comments) break;
    }
    
    // Ищем в курилке
    if (!comments) {
        const found = db.smoking.find(t => t.id === topicId);
        if (found && found.comments && found.comments[commentIndex]) {
            comments = found.comments;
        }
    }
    
    if (!comments) return res.json({ error: 'Комментарий не найден' });
    
    const comment = comments[commentIndex];
    
    const isAdmin = ['tech_specialist', 'senior_admin', 'admin'].includes(user.role);
    const isAuthor = comment.author === user.username;
    
    if (!isAuthor && !isAdmin) {
        return res.json({ error: 'Нет прав на редактирование' });
    }
    
    comment.text = text;
    comment.edited = true;
    comment.editedAt = Date.now();
    
    await writeDB(db);
    res.json({ success: true });
});

// ===== СОХРАНИТЬ ВСЁ =====
app.post('/save', async (req, res) => {
    const data = req.body;
    const db = await readDB();
    db.users = data.users || [];
    db.servers = data.servers || [];
    db.smoking = data.smoking || [];
    db.nextServerId = data.nextServerId || 1;
    db.nextSmokingId = data.nextSmokingId || 1;
    await writeDB(db);
    res.json({ success: true });
});

// ===== ЗАГРУЗИТЬ ВСЁ =====
app.get('/load', async (req, res) => {
    const db = await readDB();
    res.json(db);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('✅ Сервер запущен на порту ' + PORT));