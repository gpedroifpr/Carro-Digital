// server.js - VERSÃO ORIGINAL COM PROTEÇÃO DE SEGURANÇA (RATE LIMIT)

// Importações
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit'; // <-- 1. IMPORTAÇÃO DA SEGURANÇA
import Veiculo from './models/veiculo.js'; 
import Manutencao from './models/manutencao.js';

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa o aplicativo Express
const app = express();

// --- Conexão com o MongoDB Atlas ---
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("ERRO: A variável de ambiente MONGO_URI não está definida.");
    process.exit(1);
}
mongoose.connect(mongoUri)
  .then(() => console.log('[Servidor] Conectado com sucesso ao MongoDB Atlas!'))
  .catch(err => console.error('[Servidor] Erro ao conectar ao MongoDB:', err));

// Middlewares
app.use(cors());
app.use(express.json());

// =======================================================
// --- 2. CONFIGURAÇÃO DA SEGURANÇA (RATE LIMIT) ---
// =======================================================
// REGRA GERAL: Protege toda a API contra ataques básicos.
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 200, // Permite 200 requisições a cada 15 minutos por IP
	standardHeaders: true,
	legacyHeaders: false,
    message: { error: "Muitas requisições enviadas deste IP, por favor, tente novamente após 15 minutos." }
});

// REGRA RESTRITA: Protege especificamente contra spam de criação.
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // Permite criar no máximo 10 itens por hora por IP
    message: { error: "Você atingiu o limite de criação de itens, por favor, tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
});

// APLICA O LIMITADOR GERAL A TODAS AS ROTAS
app.use(apiLimiter);
// =======================================================

const port = process.env.PORT || 3001;
const apiKey = process.env.OPENWEATHER_API_KEY;

// Dados Mock (Mantidos)
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
    { id: "svc003", nome: "Troca de Óleo e Filtros Premium", descricao: "Utilizamos apenas produtos de alta qualidade recomendados pela montadora.", precoEstimado: "A partir de R$ 350,00" },
    { id: "svc004", nome: "Limpeza e Higienização Interna", descricao: "Cuidado completo com o interior do seu veículo.", precoEstimado: "R$ 200,00" }
];
const ferramentasEssenciais = [
    { id: "f01", nome: "Chave de Roda Cruz", utilidade: "Essencial para trocar pneus em uma emergência." },
    { id: "f02", nome: "Macaco Hidráulico tipo Jacaré", utilidade: "Levanta o veículo com segurança e menos esforço." },
    { id: "f03", nome: "Kit de Soquetes e Catraca", utilidade: "Versátil para a maioria dos parafusos e porcas do veículo." }
];

// ----- ENDPOINTS DA API -----

// Endpoint: GET /api/veiculos (Ler todos os veículos)
app.get('/api/veiculos', async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find().sort({ createdAt: -1 });
        res.json(todosOsVeiculos);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao buscar veículos.' });
    }
});

// Endpoint: POST /api/veiculos (Criar um novo veículo)
// <-- 3. APLICAÇÃO DA SEGURANÇA EXTRA NESTA ROTA -->
app.post('/api/veiculos', createLimiter, async (req, res) => {
    try {
        const novoVeiculoData = req.body;
        const veiculoCriado = await Veiculo.create(novoVeiculoData);
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Veículo com esta placa já existe.' });
        }
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ error: messages.join(' ') });
        }
        res.status(500).json({ error: 'Erro interno ao criar veículo.' });
    }
});

// Endpoint para CRIAR uma manutenção para um veículo
// <-- 3. APLICAÇÃO DA SEGURANÇA EXTRA NESTA ROTA TAMBÉM -->
app.post('/api/veiculos/:veiculoId/manutencoes', createLimiter, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculoExiste = await Veiculo.findById(veiculoId);
        if (!veiculoExiste) {
            return res.status(404).json({ error: 'Veículo não encontrado.' });
        }
        const novaManutencao = await Manutencao.create({
            ...req.body,
            veiculo: veiculoId
        });
        res.status(201).json(novaManutencao);
    } catch (error) {
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ error: messages.join(' ') });
        }
        res.status(500).json({ error: 'Erro interno ao criar manutenção.' });
    }
});

// Endpoint para LISTAR todas as manutenções de um veículo
app.get('/api/veiculos/:veiculoId/manutencoes', async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const manutencoes = await Manutencao.find({ veiculo: veiculoId }).sort({ data: -1 });
        res.json(manutencoes);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao buscar manutenções.' });
    }
});

// Endpoint de Previsão do Tempo
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

// Outros endpoints (Dicas, Viagens, Destaques, etc.)
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
    res.send('Servidor Garagem Virtual com CORS, Mongoose e CRUD de Veículos!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando na porta ${port}`);
});