// server.js - VERSÃO FINAL COM PACOTE CORS E NOVOS ENDPOINTS

// Importações
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors'; // 1. IMPORTAMOS O PACOTE CORS

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa o aplicativo Express
const app = express();

// 2. USAMOS O PACOTE CORS
app.use(cors());

const port = process.env.PORT || 3001;
const apiKey = process.env.OPENWEATHER_API_KEY;

// Dados Mock (simulando banco de dados)
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

// ----- NOVOS DADOS MOCK (FASE 1 DA ATIVIDADE) -----
const veiculosDestaque = [
    { id: 10, modelo: "Maverick Híbrido", ano: 2024, destaque: "Economia e Estilo", imagemUrl: "https://i.ytimg.com/vi/0yIyeWwnAFM/maxresdefault.jpg" },
    { id: 11, modelo: "Kombi Elétrica ID.Buzz", ano: 2025, destaque: "Nostalgia Eletrificada", imagemUrl: "https://www.portaldenoticias.net/wp-content/uploads/2022/06/betleehot6669.png" },
    { id: 12, modelo: "Mustang Mach-E", ano: 2024, destaque: "O Futuro da Potência", imagemUrl: "https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/mustang-mach-e/2023/colorizer/azul-estoril/fbr-mustang-mach-e-azul-estoril-01.png.renditions.original.png" }
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
// ----- FIM DOS NOVOS DADOS MOCK -----


// ----- ENDPOINTS DA API -----

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

// Endpoint Dicas Gerais
app.get('/api/dicas-manutencao', (req, res) => {
    res.json(dicasManutencaoGerais);
});

// Endpoint Dicas por Tipo
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const { tipoVeiculo } = req.params;
    const dicas = dicasPorTipo[tipoVeiculo.toLowerCase()];
    res.json(dicas || []);
});

// Endpoint Viagens
app.get('/api/viagens-populares', (req, res) => {
    res.json(viagensPopulares);
});

// ----- NOVOS ENDPOINTS (FASE 2 DA ATIVIDADE) -----

// Endpoint para Veículos em Destaque
app.get('/api/garagem/veiculos-destaque', (req, res) => {
    console.log(`[Servidor] Requisição para /api/garagem/veiculos-destaque`);
    res.json(veiculosDestaque);
});

// Endpoint para Serviços Oferecidos
app.get('/api/garagem/servicos-oferecidos', (req, res) => {
    console.log(`[Servidor] Requisição para /api/garagem/servicos-oferecidos`);
    res.json(servicosGaragem);
});

// Endpoint para Ferramentas Essenciais
app.get('/api/garagem/ferramentas-essenciais', (req, res) => {
    console.log(`[Servidor] Requisição para /api/garagem/ferramentas-essenciais`);
    res.json(ferramentasEssenciais);
});

// (Opcional - mas bom para demonstrar) Endpoint para buscar um serviço por ID
app.get('/api/garagem/servicos-oferecidos/:idServico', (req, res) => {
    const { idServico } = req.params;
    console.log(`[Servidor] Buscando serviço com ID: ${idServico}`);
    const servico = servicosGaragem.find(s => s.id === idServico);
    if (servico) {
        res.json(servico);
    } else {
        res.status(404).json({ error: 'Serviço não encontrado.' });
    }
});
// ----- FIM DOS NOVOS ENDPOINTS -----

// Rota Raiz
app.get('/', (req, res) => {
    res.send('Servidor Garagem Virtual com CORS habilitado corretamente!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando na porta ${port}`);
});