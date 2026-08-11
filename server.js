const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = 'db.json';

function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE);
        return JSON.parse(data);
    } catch {
        return { users: [], servers: [], smoking: [] };
    }
}

function writeDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

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

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.json({ success: false, error: 'Неверные данные' });
    }
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/users', (req, res) => {
    const { token } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === token);
    if (!user || user.role !== 'admin') {
        return res.json({ error: 'Доступ запрещён' });
    }
    res.json(db.users);
});

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

app.listen(3000, () => console.log('✅ Сервер запущен на порту 3000'));