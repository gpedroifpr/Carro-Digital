const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const Veiculo = require('./models/veiculo.js');
const Manutencao = require('./models/manutencao.js');
const User = require('./models/user.js');
const authMiddleware = require('./middleware/auth.js');

dotenv.config();
const app = express();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("ERRO CRÍTICO: MONGO_URI não definida.");
    process.exit(1);
}
mongoose.connect(mongoUri)
  .then(() => console.log('[Servidor] Conectado ao MongoDB!'))
  .catch(err => console.error('[Servidor] Erro ao conectar:', err));

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
app.use('/api/', apiLimiter);

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Este e-mail já está em uso.' });
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor ao registrar.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Credenciais inválidas.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Credenciais inválidas.' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, userId: user._id, email: user.email });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor ao logar.' });
    }
});

app.get('/api/veiculos', authMiddleware, async (req, res) => {
    try {
        const veiculos = await Veiculo.find({ owner: req.userId }).sort({ createdAt: -1 });
        res.json(veiculos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar veículos.' });
    }
});
// ... (O resto das suas rotas)
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));