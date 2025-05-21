// server.js

// Importações
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Inicializa o aplicativo Express
const app = express();
const port = process.env.PORT || 3001; // Porta para o servidor backend
                                    // Use uma porta diferente do frontend se rodar ambos localmente
const apiKey = process.env.OPENWEATHER_API_KEY;

// Middleware para permitir que o frontend (rodando em outra porta) acesse este backend
// (CORS - Cross-Origin Resource Sharing)
app.use((req, res, next) => {
    // Em desenvolvimento, '*' é aceitável.
    // Em produção, restrinja para o seu domínio frontend. Ex: 'https://sua-garagem-virtual.vercel.app'
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// ----- NOSSO PRIMEIRO ENDPOINT: Previsão do Tempo -----
app.get('/api/previsao/:cidade', async (req, res) => {
    const { cidade } = req.params; // Pega o parâmetro :cidade da URL

    if (!apiKey) {
        console.error('[Servidor ERRO] Chave da API OpenWeatherMap não configurada no servidor.');
        return res.status(500).json({ error: 'Chave da API OpenWeatherMap não configurada no servidor.' });
    }
    if (apiKey === "SUA_CHAVE_OPENWEATHERMAP_AQUI" || apiKey.length < 32) {
        console.error('[Servidor ERRO] A Chave da API OpenWeatherMap parece ser um placeholder ou é inválida.');
        return res.status(500).json({ error: 'A chave da API OpenWeatherMap configurada no servidor é inválida ou é um placeholder.' });
    }
    if (!cidade) {
        console.warn('[Servidor AVISO] Tentativa de acesso sem nome da cidade.');
        return res.status(400).json({ error: 'Nome da cidade é obrigatório.' });
    }

    const weatherAPIUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        console.log(`[Servidor] Buscando previsão para: ${cidade} na URL: ${weatherAPIUrl}`);
        const apiResponse = await axios.get(weatherAPIUrl);
        console.log(`[Servidor] Dados recebidos da OpenWeatherMap para ${cidade}. Status: ${apiResponse.status}`);
        
        // Apenas para ver a estrutura completa da API no console do servidor pela primeira vez
        // if (cidade.toLowerCase() === "curitiba") { // Exemplo para logar apenas para uma cidade específica
        //    console.log(JSON.stringify(apiResponse.data, null, 2));
        // }

        // Enviamos a resposta da API OpenWeatherMap diretamente para o nosso frontend
        res.json(apiResponse.data);

    } catch (error) {
        console.error(`[Servidor ERRO] Erro ao buscar previsão para ${cidade}:`, error.response?.data || error.message);
        const status = error.response?.status || 500;
        let message = 'Erro ao buscar previsão do tempo no servidor.';
        if (error.response?.data?.message) {
            message = error.response.data.message;
        } else if (error.message) {
            message = error.message;
        }
        
        res.status(status).json({ error: message });
    }
});

// Rota raiz para verificar se o servidor está funcionando
app.get('/', (req, res) => {
    res.send('Servidor Backend da Garagem Virtual está no ar!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando em http://localhost:${port}`);
    if (!apiKey || apiKey === "SUA_CHAVE_OPENWEATHERMAP_AQUI" || apiKey.length < 32) {
        console.warn('\n⚠️ ATENÇÃO: A chave da API OpenWeatherMap (OPENWEATHER_API_KEY) não está configurada corretamente no arquivo .env ou é inválida!');
        console.warn('Verifique o arquivo .env e reinicie o servidor.\n');
    } else {
        console.log('Chave da API OpenWeatherMap carregada com sucesso.');
    }
});