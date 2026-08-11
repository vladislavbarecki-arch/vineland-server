const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = 'db.json';

// ===== АСИНХРОННОЕ ЧТЕНИЕ =====
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { users: [], servers: [], smoking: [], nextServerId: 1, nextSmokingId: 1 };
    }
}

// ===== АСИНХРОННАЯ ЗАПИСЬ =====
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
    const role = db.users.length === 0 ? 'admin' : 'user';
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

// ===== ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ =====
app.post('/users', async (req, res) => {
    const { token } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.id === token);
    if (!user || user.role !== 'admin') {
        return res.json({ error: 'Доступ запрещён' });
    }
    res.json(db.users);
});

// ===== ИЗМЕНИТЬ РОЛЬ =====
app.post('/set-role', async (req, res) => {
    const { token, targetId, newRole } = req.body;
    const db = await readDB();
    const admin = db.users.find(u => u.id === token);
    if (!admin || admin.role !== 'admin') {
        return res.json({ error: 'Доступ запрещён' });
    }
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    if (target.username === admin.username) {
        return res.json({ error: 'Нельзя изменить себя' });
    }
    target.role = newRole;
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

app.listen(3000, () => console.log('✅ Сервер запущен на порту 3000'));