// server.js - VERSÃO FINAL, COMPLETA E CORRIGIDA COM SINTAXE "import"

// Importações de Pacotes
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Importações de Arquivos Locais
import Veiculo from './models/veiculo.js';
import Manutencao from './models/manutencao.js';
import User from './models/user.js';
import authMiddleware from './middleware/auth.js';

// Configuração Inicial
dotenv.config();
const app = express();

// Conexão com o Banco de Dados
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("ERRO CRÍTICO: MONGO_URI não definida no ambiente.");
    process.exit(1);
}
mongoose.connect(mongoUri)
  .then(() => console.log('[Servidor] Conectado com sucesso ao MongoDB!'))
  .catch(err => console.error('[Servidor] Erro ao conectar ao MongoDB:', err));

// Middlewares Globais
app.use(cors());
app.use(express.json());

// Segurança: Limitador de Requisições
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Muitas requisições, tente novamente em 15 minutos." } });
const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: "Limite de criação de itens atingido, tente novamente mais tarde." } });
app.use('/api/', apiLimiter);


// =======================================================
// ROTAS DE AUTENTICAÇÃO (PÚBLICAS)
// =======================================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Este e-mail já está em uso.' });
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        
        res.status(201).json({ message: 'Usuário registrado com sucesso! Você já pode fazer o login.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor ao registrar usuário.' });
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
        
        res.status(200).json({ message: `Login bem-sucedido! Bem-vindo(a) de volta, ${user.email}.`, token, userId: user._id, email: user.email });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor ao fazer login.' });
    }
});


// =======================================================
// ROTAS DE VEÍCULOS (PROTEGIDAS)
// =======================================================

app.get('/api/veiculos', authMiddleware, async (req, res) => {
    try {
        const veiculos = await Veiculo.find({
            $or: [
                { owner: req.userId },       // Veículos que eu possuo
                { sharedWith: req.userId }   // Veículos compartilhados comigo
            ]
        })
        .populate('owner', 'email') // Popula o dono
        .populate('sharedWith', 'email') // Popula a lista de compartilhados
        .sort({ createdAt: -1 });

        res.json(veiculos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar veículos.' });
    }
});

app.post('/api/veiculos', authMiddleware, createLimiter, async (req, res) => {
    try {
        const novoVeiculoData = { ...req.body, owner: req.userId };
        const veiculoCriado = await Veiculo.create(novoVeiculoData);
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'Veículo com esta placa já existe.' });
        if (error.name === 'ValidationError') return res.status(400).json({ error: Object.values(error.errors).map(val => val.message).join(' ') });
        res.status(500).json({ error: 'Erro interno ao criar veículo.' });
    }
});

app.delete('/api/veiculos/:id', authMiddleware, async (req, res) => {
    try {
        const veiculo = await Veiculo.findById(req.params.id);
        if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado." });
        if (veiculo.owner.toString() !== req.userId) return res.status(403).json({ error: "Acesso negado." });
        
        await Veiculo.findByIdAndDelete(req.params.id);
        res.json({ message: "Veículo deletado com sucesso." });
    } catch (err) {
        res.status(500).json({ error: "Erro ao deletar veículo." });
    }
});

// ROTA PARA COMPARTILHAR UM VEÍCULO
app.post('/api/veiculos/:veiculoId/share', authMiddleware, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: 'O e-mail do usuário é obrigatório.' });

        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado.' });
        if (veiculo.owner.toString() !== req.userId) return res.status(403).json({ error: 'Acesso negado. Você não é o proprietário.' });

        const userToShareWith = await User.findOne({ email });
        if (!userToShareWith) return res.status(404).json({ error: `Usuário com o e-mail '${email}' não encontrado.` });
        if (userToShareWith._id.toString() === req.userId) return res.status(400).json({ error: 'Você não pode compartilhar um veículo consigo mesmo.' });
        if (veiculo.sharedWith.includes(userToShareWith._id)) return res.status(409).json({ error: 'Este veículo já foi compartilhado com este usuário.' });

        veiculo.sharedWith.push(userToShareWith._id);
        await veiculo.save();

        res.status(200).json({ message: `Veículo compartilhado com sucesso com ${email}!` });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao compartilhar o veículo.' });
    }
});

// ROTA PARA REMOVER COMPARTILHAMENTO DE UM VEÍCULO
app.post('/api/veiculos/:veiculoId/unshare', authMiddleware, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const { userIdToRemove } = req.body;

        if (!userIdToRemove) return res.status(400).json({ error: 'ID do usuário a ser removido é obrigatório.' });
        
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado.' });
        if (veiculo.owner.toString() !== req.userId) return res.status(403).json({ error: 'Acesso negado. Você não é o proprietário.' });

        await Veiculo.updateOne(
            { _id: veiculoId },
            { $pull: { sharedWith: userIdToRemove } }
        );

        res.status(200).json({ message: 'Acesso do usuário removido com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao remover compartilhamento.' });
    }
});


// =======================================================
// ROTAS DE MANUTENÇÕES (PROTEGIDAS)
// =======================================================

app.post('/api/veiculos/:veiculoId/manutencoes', authMiddleware, createLimiter, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado.' });
        if (veiculo.owner.toString() !== req.userId) return res.status(403).json({ error: 'Acesso negado a este veículo.' });
        
        const novaManutencao = await Manutencao.create({ ...req.body, veiculo: veiculoId });
        res.status(201).json(novaManutencao);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao criar manutenção.' });
    }
});

app.get('/api/veiculos/:veiculoId/manutencoes', authMiddleware, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo || veiculo.owner.toString() !== req.userId) return res.status(404).json({ error: 'Veículo não encontrado ou não pertence a você.' });
        
        const manutencoes = await Manutencao.find({ veiculo: veiculoId }).sort({ data: -1 });
        res.json(manutencoes);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao buscar manutenções.' });
    }
});


// =======================================================
// SUAS ROTAS ANTIGAS (MOCK / PÚBLICAS)
// =======================================================

const port = process.env.PORT || 3001;
const apiKey = process.env.OPENWEATHER_API_KEY;

// Dados Mock...
const dicasManutencaoGerais = [
    { id: 1, dica: "Verifique o nível do óleo do motor a cada 1.000km ou antes de viagens longas." },
    { id: 2, dica: "Calibre os pneus semanalmente, seguindo a pressão indicada no manual do veículo." }
];
const dicasPorTipo = {
    carro: [{ id: 10, dica: "Faça o rodízio dos pneus a cada 10.000 km." }],
    carroesportivo: [{ id: 20, dica: "Use somente combustível de alta octanagem." }],
    caminhao: [{ id: 30, dica: "Verifique o sistema de freios a ar regularmente." }]
};
const viagensPopulares = [
    { id: 1, destino: "Serra Gaúcha, RS", descricao: "Estradas sinuosas com paisagens incríveis." },
    { id: 2, destino: "Litoral de Santa Catarina", descricao: "Explore praias paradisíacas." }
];
const veiculosDestaque = [
    { id: 10, modelo: "Maverick Híbrido", ano: 2024, destaque: "Economia e Estilo", imagemUrl: "https://i.ytimg.com/vi/0yIyeWwnAFM/maxresdefault.jpg" },
    { id: 11, modelo: "Kombi Elétrica ID.Buzz", ano: 2025, destaque: "Nostalgia Eletrificada", imagemUrl: "https://www.portaldenoticias.net/wp-content/uploads/2022/06/betleehot6669.png" },
    { id: 12, modelo: "Mustang Mach-E", ano: 2024, destaque: "O Futuro da Potência", imagemUrl: "https://i.ytimg.com/vi/MkUtKO1uWpQ/maxresdefault.jpg" }
];
const servicosGaragem = [
    { id: "svc001", nome: "Diagnóstico Eletrônico Completo", descricao: "Verificação de todos os sistemas eletrônicos do veículo.", precoEstimado: "R$ 250,00" },
    { id: "svc002", nome: "Alinhamento e Balanceamento 3D", descricao: "Para uma direção perfeita e maior durabilidade dos pneus.", precoEstimado: "R$ 180,00" },
    { id: "svc003", nome: "Troca de Óleo e Filtros Premium", descricao: "Utilizamos apenas produtos de alta qualidade.", precoEstimado: "A partir de R$ 350,00" },
    { id: "svc004", nome: "Limpeza e Higienização Interna", descricao: "Cuidado completo com o interior do seu veículo.", precoEstimado: "R$ 200,00" }
];
const ferramentasEssenciais = [
    { id: "f01", nome: "Chave de Roda Cruz", utilidade: "Essencial para trocar pneus em uma emergência." },
    { id: "f02", nome: "Macaco Hidráulico tipo Jacaré", utilidade: "Levanta o veículo com segurança e menos esforço." },
    { id: "f03", nome: "Kit de Soquetes e Catraca", utilidade: "Versátil para a maioria dos parafusos e porcas." }
];

// Endpoints Mock
app.get('/api/previsao/:cidade', async (req, res) => {
    const { cidade } = req.params;
    const weatherAPIUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;
    try {
        const apiResponse = await axios.get(weatherAPIUrl);
        res.json(apiResponse.data);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ error: error.response?.data?.message || 'Erro ao buscar previsão.' });
    }
});
app.get('/api/dicas-manutencao', (req, res) => res.json(dicasManutencaoGerais));
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => res.json(dicasPorTipo[req.params.tipoVeiculo.toLowerCase()] || []));
app.get('/api/viagens-populares', (req, res) => res.json(viagensPopulares));
app.get('/api/garagem/veiculos-destaque', (req, res) => res.json(veiculosDestaque));
app.get('/api/garagem/servicos-oferecidos', (req, res) => res.json(servicosGaragem));
app.get('/api/garagem/ferramentas-essenciais', (req, res) => res.json(ferramentasEssenciais));
app.get('/api/garagem/servicos-oferecidos/:idServico', (req, res) => {
    const servico = servicosGaragem.find(s => s.id === req.params.idServico);
    if (servico) res.json(servico);
    else res.status(404).json({ error: 'Serviço não encontrado.' });
});

// Rota Raiz
app.get('/', (req, res) => {
    res.send('Servidor Garagem Virtual com Autenticação está no ar!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando na porta ${port}`);
});