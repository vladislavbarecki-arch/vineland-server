const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 СЕРВЕР ЗАПУСКАЕТСЯ...');

let db = {
    users: [],
    servers: [],
    smoking: [],
    nextServerId: 1,
    nextSmokingId: 1
};

app.get('/load', (req, res) => {
    console.log('📥 GET /load');
    res.json(db);
});

app.post('/save', (req, res) => {
    console.log('📥 POST /save');
    db = { ...db, ...req.body };
    res.json({ success: true });
});

app.post('/register', (req, res) => {
    console.log('📥 POST /register');
    res.json({ success: true, user: { id: 1, username: 'test' } });
});

app.post('/login', (req, res) => {
    console.log('📥 POST /login');
    res.json({ success: true, user: { id: 1, username: 'test', role: 'user' } });
});

app.post('/me', (req, res) => {
    console.log('📥 POST /me');
    res.json({ success: true, user: { id: 1, username: 'test', role: 'user' } });
});

app.post('/set-role', (req, res) => {
    console.log('📥 POST /set-role');
    res.json({ success: true });
});

app.post('/change-password', (req, res) => {
    console.log('📥 POST /change-password');
    res.json({ success: true });
});

app.post('/change-username', (req, res) => {
    console.log('📥 POST /change-username');
    res.json({ success: true });
});

app.post('/edit-topic', (req, res) => {
    console.log('📥 POST /edit-topic');
    res.json({ success: true });
});

app.post('/edit-comment', (req, res) => {
    console.log('📥 POST /edit-comment');
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ ' + PORT);
});