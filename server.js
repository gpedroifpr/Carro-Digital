// server.js - VERSÃO FINAL COM PACOTE CORS

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
// Esta linha deve vir ANTES de todas as suas rotas.
// Ela automaticamente adiciona as permissões necessárias para nós.
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

// Rota Raiz
app.get('/', (req, res) => {
    res.send('Servidor Garagem Virtual com CORS habilitado corretamente!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando na porta ${port}`);
});