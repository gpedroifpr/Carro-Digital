# Garagem Virtual IFPR

Projeto de uma Garagem Virtual com simulação de carros, manutenções e integração com API de previsão do tempo.
Utiliza um backend Node.js/Express para atuar como proxy para a API OpenWeatherMap, protegendo a API Key.

## Funcionalidades Principais

*   Gerenciamento e interação com veículos (Carro, CarroEsportivo, Caminhão).
*   Registro de manutenções.
*   Previsão do tempo via backend seguro.

## Como Rodar o Projeto Localmente

### Pré-requisitos

*   Node.js e npm: [https://nodejs.org/](https://nodejs.org/)
*   Navegador Web

### Configuração

1.  **Obtenha os arquivos do projeto.**
2.  **Navegue até a pasta raiz do projeto no terminal.**
3.  **Crie o arquivo de ambiente `.env`:**
    *   Na raiz do projeto, crie um arquivo chamado `.env`.
    *   Dentro dele, adicione sua chave da API OpenWeatherMap:
        ```
        dda597bae6f39668bd0f837710a9b86e
        ```
    *   **Substitua `SUA_CHAVE_OPENWEATHERMAP_AQUI` pela sua chave real.**
4.  **Instale as dependências do backend:**
    ```bash
    npm install
    ```

### Execução

1.  **Inicie o Servidor Backend:**
    No terminal, execute:
    ```bash
    node server.js
    ```
    O servidor deve iniciar em `http://localhost:3001`.

2.  **Acesse o Frontend:**
    Abra o arquivo `index.html` no seu navegador.

## Endpoint do Backend

*   **`GET /api/previsao/:cidade`**: Retorna a previsão do tempo para a cidade especificada.