const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = 'db.json';

// ===== ЧТЕНИЕ ИЗ ФАЙЛА =====
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE);
        return JSON.parse(data);
    } catch {
        return { users: [], servers: [], smoking: [], nextServerId: 1, nextSmokingId: 1 };
    }
}

// ===== ЗАПИСЬ В ФАЙЛ =====
function writeDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== РЕГИСТРАЦИЯ =====
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.username === username)) {
        return res.json({ success: false, error: 'Уже существует' });
    }
    const role = db.users.length === 0 ? 'admin' : 'user';
    db.users.push({ id: Date.now(), username, password, role });
    writeDB(db);
    res.json({ success: true, role });
});

// ===== ВХОД =====
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.json({ success: false, error: 'Неверные данные' });
    }
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

// ===== ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ (админ) =====
app.post('/users', (req, res) => {
    const { token } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === token);
    if (!user || user.role !== 'admin') {
        return res.json({ error: 'Доступ запрещён' });
    }
    res.json(db.users);
});

// ===== ИЗМЕНИТЬ РОЛЬ (админ) =====
app.post('/set-role', (req, res) => {
    const { token, targetId, newRole } = req.body;
    const db = readDB();
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
    writeDB(db);
    res.json({ success: true });
});

// ===== СОХРАНИТЬ ВСЁ =====
app.post('/save', (req, res) => {
    const data = req.body;
    const db = readDB();
    db.users = data.users || [];
    db.servers = data.servers || [];
    db.smoking = data.smoking || [];
    db.nextServerId = data.nextServerId || 1;
    db.nextSmokingId = data.nextSmokingId || 1;
    writeDB(db);
    res.json({ success: true });
});

// ===== ЗАГРУЗИТЬ ВСЁ =====
app.get('/load', (req, res) => {
    const db = readDB();
    res.json(db);
});

app.listen(3000, () => console.log('✅ Сервер запущен на порту 3000'));