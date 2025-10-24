// script.js (VERSÃO FINAL COMPLETA COM FEEDBACK E GERENCIAMENTO DE COMPARTILHAMENTO)

// =======================================================
// --- CONFIGURAÇÃO CENTRAL DA API ---
// =======================================================
const API_BASE_URL = 'https://carro-digital-pedro.onrender.com';

// =======================================================
// --- FUNÇÃO GLOBAL DE FEEDBACK ---
// =======================================================
function showGlobalMessage(message, type = 'info') {
    const messageElement = document.getElementById("mensagemStatus");
    if (!messageElement) {
        alert(message); // Fallback para alert se o elemento não existir
        return;
    }
    messageElement.textContent = message;
    messageElement.className = `mensagem ${type}`;
    messageElement.style.display = 'block';

    // Limpa a mensagem após um tempo
    setTimeout(() => {
        if (messageElement.textContent === message) {
            messageElement.style.display = 'none';
        }
    }, 5000);
}


// =======================================================
// --- LÓGICA DE AUTENTICAÇÃO E CONTROLE DE UI ---
// =======================================================
function setupAuthSystem() {
    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const authMessage = document.getElementById('auth-message');
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');

    function showAuthMessage(message, type = 'info') {
        authMessage.textContent = message;
        authMessage.className = `mensagem ${type}`;
        authMessage.style.display = 'block';
    }

    function toggleForms() {
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');

        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginContainer.style.display = 'none';
                registerContainer.style.display = 'block';
                authMessage.style.display = 'none';
            });
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerContainer.style.display = 'none';
                loginContainer.style.display = 'block';
                authMessage.style.display = 'none';
            });
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const button = e.target.querySelector('button');
        button.disabled = true;
        button.textContent = 'Registrando...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falha no registro.');
            
            showAuthMessage(data.message, 'sucesso');
            document.getElementById('register-form').reset();
            document.getElementById('show-login').click();
        } catch (error) {
            showAuthMessage(error.message, 'erro');
        } finally {
            button.disabled = false;
            button.textContent = 'Criar Conta';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const button = e.target.querySelector('button');
        button.disabled = true;
        button.textContent = 'Entrando...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falha no login.');
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userId', data.userId);
            showGlobalMessage(data.message, 'sucesso');
            updateUIForLoggedInUser();
        } catch (error) {
            showAuthMessage(error.message, 'erro');
        } finally {
            button.disabled = false;
            button.textContent = 'Entrar';
        }
    }

    window.handleLogout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        updateUIForLoggedOutUser();
        location.reload();
    }

    function updateUIForLoggedInUser() {
        authSection.style.display = 'none';
        userInfo.style.display = 'flex';
        mainContent.style.display = 'block';
        document.getElementById('user-email-display').textContent = localStorage.getItem('userEmail');
        carregarEExibirVeiculos();
    }

    function updateUIForLoggedOutUser() {
        authSection.style.display = 'block';
        userInfo.style.display = 'none';
        mainContent.style.display = 'none';
    }
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', window.handleLogout);
    toggleForms();

    const token = localStorage.getItem('token');
    if (token) {
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
}

// =======================================================
// --- FUNÇÕES DE API (VEÍCULOS E COMPARTILHAMENTO) ---
// =======================================================
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function carregarEExibirVeiculos() {
    const listaContainer = document.getElementById('lista-veiculos-db');
    if (!listaContainer) return;
    listaContainer.innerHTML = '<p>Carregando seus veículos...</p>';

    const userId = localStorage.getItem('userId');
    if (!userId) {
        listaContainer.innerHTML = '<p>Faça login para ver seus veículos.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/veiculos`, { headers: getAuthHeaders() });
        if (response.status === 401) {
            alert("Sua sessão expirou. Por favor, faça login novamente.");
            window.handleLogout();
            return;
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao buscar veículos do servidor.');
        }
        
        const veiculos = await response.json();
        if (veiculos.length === 0) {
            listaContainer.innerHTML = '<p>Você ainda não cadastrou nenhum veículo. Adicione um acima!</p>';
            return;
        }

        listaContainer.innerHTML = '';
        veiculos.forEach(veiculo => {
            const card = document.createElement('div');
            card.className = 'veiculo-db-card';
            const isOwner = veiculo.owner._id === userId;

            let sharedInfoHTML = '';
            let shareFormHTML = '';
            let sharedWithListHTML = '';

            if (isOwner) {
                shareFormHTML = `
                    <form class="share-form" data-veiculo-id="${veiculo._id}">
                        <input type="email" placeholder="E-mail para compartilhar" required />
                        <button type="submit">Compartilhar</button>
                    </form>
                `;
                if (veiculo.sharedWith && veiculo.sharedWith.length > 0) {
                    sharedWithListHTML = '<h5 class="shared-list-title">Compartilhado com:</h5><ul class="shared-list">';
                    veiculo.sharedWith.forEach(user => {
                        sharedWithListHTML += `<li><span>${user.email}</span> <button class="btn-unshare" data-veiculo-id="${veiculo._id}" data-user-id="${user._id}">X</button></li>`;
                    });
                    sharedWithListHTML += '</ul>';
                }
            } else {
                sharedInfoHTML = `<p class="shared-by">Compartilhado por: <strong>${veiculo.owner.email}</strong></p>`;
            }

            card.innerHTML = `
                <h4>${veiculo.marca} ${veiculo.modelo}</h4>
                ${sharedInfoHTML}
                <p><strong>Placa:</strong> <span class="placa">${veiculo.placa}</span></p>
                <p><strong>Ano:</strong> ${veiculo.ano}</p>
                <p><strong>Cor:</strong> ${veiculo.cor || 'Não informada'}</p>
                <div class="card-actions">
                    <button class="btn-manutencao" data-id="${veiculo._id}" data-nome="${veiculo.marca} ${veiculo.modelo}">Ver Manutenções</button>
                    ${isOwner ? `<button class="btn-deletar-veiculo" data-id="${veiculo._id}">Excluir</button>` : ''}
                </div>
                ${shareFormHTML}
                ${sharedWithListHTML}
            `;
            listaContainer.appendChild(card);
        });
    } catch (error) {
        listaContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

async function adicionarNovoVeiculo(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = "Salvando...";

    const veiculoData = {
        placa: document.getElementById('veiculoPlaca').value,
        marca: document.getElementById('veiculoMarca').value,
        modelo: document.getElementById('veiculoModelo').value,
        ano: document.getElementById('veiculoAno').value,
        cor: document.getElementById('veiculoCor').value,
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/veiculos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(veiculoData)
        });
        const resultado = await response.json();
        if (!response.ok) throw new Error(resultado.error || 'Erro ao salvar o veículo.');
        
        showGlobalMessage('Veículo adicionado com sucesso!', 'sucesso');
        form.reset();
        await carregarEExibirVeiculos();
    } catch (error) {
        showGlobalMessage(`Erro: ${error.message}`, 'erro');
    } finally {
        button.disabled = false;
        button.textContent = "Salvar Veículo";
    }
}

async function deletarVeiculo(veiculoId) {
    if (!confirm('Tem certeza que deseja excluir este veículo? Esta ação é irreversível.')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/veiculos/${veiculoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const resultado = await response.json();
        if (!response.ok) throw new Error(resultado.error || 'Falha ao excluir o veículo.');
        
        showGlobalMessage('Veículo excluído com sucesso!', 'sucesso');
        await carregarEExibirVeiculos();
    } catch (error) {
        showGlobalMessage(`Erro ao excluir: ${error.message}`, 'erro');
    }
}

async function handleShareVehicle(e) {
    e.preventDefault();
    const form = e.target;
    const veiculoId = form.dataset.veiculoId;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput.value;
    const button = form.querySelector('button');

    button.disabled = true;
    button.textContent = '...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/veiculos/${veiculoId}/share`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro.');
        
        showGlobalMessage(result.message, 'sucesso');
        emailInput.value = '';
        await carregarEExibirVeiculos();
    } catch (error) {
        showGlobalMessage(`Erro ao compartilhar: ${error.message}`, 'erro');
    } finally {
        button.disabled = false;
        button.textContent = 'Compartilhar';
    }
}

async function handleUnshare(veiculoId, userIdToRemove) {
    if (!confirm('Tem certeza que deseja remover o acesso deste usuário ao veículo?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/veiculos/${veiculoId}/unshare`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userIdToRemove })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro.');
        
        showGlobalMessage(result.message, 'sucesso');
        await carregarEExibirVeiculos();
    } catch (error) {
        showGlobalMessage(`Erro ao remover acesso: ${error.message}`, 'erro');
    }
}


// =======================================================
// --- CÓDIGO LEGADO (CLASSES, GARAGEM LOCAL, ETC.) ---
// =======================================================
class Manutencao { constructor(data, tipo, custo, descricao = "") { if (!this.validar(data, tipo, custo)) throw new Error("Dados de manutenção inválidos."); let dataObj; if (data instanceof Date) { dataObj = data; } else if (typeof data === 'string') { if (data.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(data)) { dataObj = new Date(data + 'T00:00:00Z'); } else { dataObj = new Date(data); } } if (!dataObj || isNaN(dataObj.getTime())) throw new Error("Formato de data inválido fornecido."); this.data = dataObj; this.tipo = tipo.trim(); this.custo = parseFloat(custo); this.descricao = descricao.trim(); } toString() { const dataFormatada = this.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); return `${this.tipo} em ${dataFormatada} - R$ ${this.custo.toFixed(2)}${this.descricao ? ` (${this.descricao})` : ''}`; } validar(data, tipo, custo) { const custoNum = parseFloat(custo); return !(!tipo || typeof tipo !== 'string' || tipo.trim() === '' || isNaN(custoNum) || custoNum < 0); } isFutura() { const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0); return this.data >= hoje; } toJSON() { return { data: this.data.toISOString(), tipo: this.tipo, custo: this.custo, descricao: this.descricao }; } }
class Carro {
    constructor(modelo, cor) { this.id = `carro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; this.modelo = modelo; this.cor = cor; this.velocidade = 0; this.ligado = false; this.historicoManutencao = []; this.maxVelocidadeDisplay = 200; try { this.somLigando = new Audio("mp3/ligando.mp3"); this.somAcelerando = new Audio("mp3/acelerando.mp3"); this.somAcelerando.loop = true; this.somAcelerando.volume = 0; this.somBuzina = new Audio("mp3/buzina.mp3"); this.somFreio = new Audio("mp3/freio.mp3"); } catch (e) { console.warn("Não foi possível inicializar a API de Áudio.", e); this.somLigando = { play: () => Promise.resolve(), pause: () => { }, volume: 0 }; this.somAcelerando = { play: () => Promise.resolve(), pause: () => { }, volume: 0, currentTime: 0, loop: false }; this.somBuzina = { play: () => Promise.resolve(), pause: () => { }, volume: 0 }; this.somFreio = { play: () => Promise.resolve(), pause: () => { }, volume: 0 }; } }
    ligar() { if (this.ligado) { this.exibirMensagem("O carro já está ligado.", 'info'); return; } this.ligado = true; this.velocidade = 0; this.atualizarDisplay(); this.somLigando.play().catch(e => console.error("Erro ao tocar som ligando:", e)); this.exibirMensagem(`${this.modelo} ligado!`, 'sucesso'); }
    desligar() { if (!this.ligado) { this.exibirMensagem("O carro já está desligado.", 'info'); return; } if (this.velocidade > 0) { this.exibirMensagem("Pare o carro antes de desligar!", 'aviso'); return; } this.ligado = false; this.velocidade = 0; this.atualizarDisplay(); this.somAcelerando.pause(); this.somAcelerando.currentTime = 0; this.somAcelerando.volume = 0; this.exibirMensagem(`${this.modelo} desligado.`, 'info'); }
    acelerar() { if (!this.ligado) { this.exibirMensagem("O carro precisa estar ligado para acelerar.", 'erro'); return; } let incremento = 10; if (this instanceof CarroEsportivo && this.turboAtivado) { incremento = 70; this.exibirMensagem("BOOST! Turbo consumido!", 'sucesso'); this.desativarTurbo(); } const velMaxima = this.maxVelocidadeDisplay; if (this.velocidade >= velMaxima) { this.exibirMensagem("O carro já está na velocidade máxima!", 'aviso'); this.velocidade = velMaxima; this.atualizarDisplay(); if (this.somAcelerando.paused) this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e)); return; } this.velocidade = Math.min(velMaxima, this.velocidade + incremento); this.atualizarDisplay(); this.somAcelerando.volume = this._calcularVolumeAceleracao(); if (this.somAcelerando.paused) { this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e)); } }
    frear() { if (this.velocidade === 0) { if (!this.somAcelerando.paused) { this.somAcelerando.pause(); this.somAcelerando.currentTime = 0; this.somAcelerando.volume = 0; } return; } const decremento = 15; this.velocidade = Math.max(0, this.velocidade - decremento); this.atualizarDisplay(); this.somFreio.play().catch(e => console.error("Erro ao tocar som freio:", e)); if (this.velocidade > 0) { this.somAcelerando.volume = this._calcularVolumeAceleracao(); } else { this.somAcelerando.pause(); this.somAcelerando.currentTime = 0; this.somAcelerando.volume = 0; } }
    buzinar() { this.somBuzina.currentTime = 0; this.somBuzina.play().catch(e => console.error("Erro ao tocar som buzina:", e)); }
    _calcularVolumeAceleracao() { const volumeRange = document.getElementById('volumeAceleracao'); const volumeGeral = volumeRange ? parseFloat(volumeRange.value) : 0.5; const baseVolume = Math.min(this.velocidade / this.maxVelocidadeDisplay, 1) * 0.8 + 0.1; return Math.max(0, Math.min(1, baseVolume * volumeGeral)); }
    adicionarManutencao(manutencao) { if (!(manutencao instanceof Manutencao)) { throw new Error("Tentativa de adicionar manutenção inválida."); } this.historicoManutencao.push(manutencao); this.historicoManutencao.sort((a, b) => a.data.getTime() - b.data.getTime()); }
    getHistoricoFormatado() { const passadas = this.historicoManutencao.filter(m => !m.isFutura()); if (passadas.length === 0) return "<p>Nenhuma manutenção passada registrada.</p>"; passadas.sort((a, b) => b.data.getTime() - a.data.getTime()); return `<ul>${passadas.map(m => `<li>${m.toString()}</li>`).join('')}</ul>`; }
    getAgendamentosFormatados() { const futuras = this.historicoManutencao.filter(m => m.isFutura()); if (futuras.length === 0) return "<p>Nenhum agendamento futuro.</p>"; return `<ul>${futuras.map(m => `<li>${m.toString()}</li>`).join('')}</ul>`; }
    getInformacoesHtml() { const modeloNode = document.createTextNode(this.modelo); const corNode = document.createTextNode(this.cor); const container = document.createElement('div'); container.innerHTML = `<strong>Modelo:</strong> <span id="info-modelo"></span> <br> <strong>Cor:</strong> <span id="info-cor"></span>`; container.querySelector('#info-modelo').appendChild(modeloNode); container.querySelector('#info-cor').appendChild(corNode); return container.innerHTML; }
    atualizarDisplay() { const velocimetroBarra = document.getElementById("velocimetroBarraDisplay"); const velocidadeElement = document.getElementById("veiculoVelocidadeDisplay"); const statusElement = document.getElementById("veiculoStatusDisplay"); if (velocidadeElement) velocidadeElement.textContent = this.velocidade; if (statusElement) { statusElement.textContent = this.ligado ? "Ligado" : "Desligado"; statusElement.className = this.ligado ? "status-ligado" : "status-desligado"; } if (velocimetroBarra) { const maxVel = this.maxVelocidadeDisplay > 0 ? this.maxVelocidadeDisplay : 1; const percentualVelocidade = Math.min((this.velocidade / maxVel) * 100, 100); velocimetroBarra.style.width = `${percentualVelocidade}%`; } if (this instanceof CarroEsportivo) { const turboStatus = document.getElementById("turboStatus"); if (turboStatus) turboStatus.textContent = this.turboAtivado ? "Ativado" : "Desativado"; } else if (this instanceof Caminhao) { const cargaAtual = document.getElementById("cargaAtual"); const capacidadeCargaSpan = document.getElementById("capacidadeCargaSpan"); if (cargaAtual) cargaAtual.textContent = this.cargaAtual; if (capacidadeCargaSpan) capacidadeCargaSpan.textContent = this.capacidadeCarga; } }
    exibirMensagem(mensagem, tipo = 'info') { showGlobalMessage(mensagem, tipo); }
    toJSON() { return { id: this.id, tipoVeiculo: 'Carro', modelo: this.modelo, cor: this.cor, velocidade: this.velocidade, ligado: this.ligado, historicoManutencao: this.historicoManutencao.map(m => m.toJSON()), maxVelocidadeDisplay: this.maxVelocidadeDisplay }; }
}
class CarroEsportivo extends Carro { constructor(modelo, cor) { super(modelo, cor); this.turboAtivado = false; this.maxVelocidadeDisplay = 300; try { this.somTurbo = new Audio("mp3/turbo.mp3"); } catch (e) { this.somTurbo = { play: () => Promise.resolve() }; } } ativarTurbo() { if (!this.ligado) { this.exibirMensagem("Ligue o carro antes de ativar o turbo.", 'erro'); return; } if (this.turboAtivado) { this.exibirMensagem("Turbo já está ativado!", 'info'); return; } this.turboAtivado = true; const volumeRangeAceleracao = document.getElementById('volumeAceleracao'); this.somTurbo.volume = volumeRangeAceleracao ? parseFloat(volumeRangeAceleracao.value) * 0.8 : 0.4; this.somTurbo.play().catch(e => console.error("Erro ao tocar som turbo:", e)); this.atualizarDisplay(); this.exibirMensagem("Turbo armado! A próxima aceleração será potente.", 'sucesso'); } desativarTurbo() { if (!this.turboAtivado) return; this.turboAtivado = false; this.atualizarDisplay(); } desligar() { if (this.ligado) this.desativarTurbo(); super.desligar(); } toJSON() { const baseJSON = super.toJSON(); return { ...baseJSON, tipoVeiculo: 'CarroEsportivo', turboAtivado: this.turboAtivado }; } }
class Caminhao extends Carro { constructor(modelo, cor, capacidadeCarga) { super(modelo, cor); this.capacidadeCarga = !isNaN(parseInt(capacidadeCarga)) && parseInt(capacidadeCarga) > 0 ? parseInt(capacidadeCarga) : 1000; this.cargaAtual = 0; this.maxVelocidadeDisplay = 140; } carregar(quantidade) { const quantNum = parseInt(quantidade); if (isNaN(quantNum) || quantNum <= 0) { this.exibirMensagem("Quantidade inválida.", 'erro'); return false; } if (this.cargaAtual + quantNum > this.capacidadeCarga) { this.exibirMensagem(`Excede a capacidade de ${this.capacidadeCarga}kg.`, 'erro'); return false; } this.cargaAtual += quantNum; this.exibirMensagem(`Carregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso'); return true; } descarregar(quantidade) { const quantNum = parseInt(quantidade); if (isNaN(quantNum) || quantNum <= 0) { this.exibirMensagem("Quantidade inválida.", 'erro'); return false; } if (this.cargaAtual - quantNum < 0) { this.exibirMensagem(`Carga insuficiente (${this.cargaAtual}kg).`, 'erro'); return false; } this.cargaAtual -= quantNum; this.exibirMensagem(`Descarregado ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso'); return true; } toJSON() { const baseJSON = super.toJSON(); return { ...baseJSON, tipoVeiculo: 'Caminhao', capacidadeCarga: this.capacidadeCarga, cargaAtual: this.cargaAtual }; } }
class Garagem { constructor() { this.veiculos = []; this.veiculoSelecionado = null; } adicionarVeiculo(veiculo) { if (!(veiculo instanceof Carro) || this.veiculos.some(v => v.id === veiculo.id)) return; this.veiculos.push(veiculo); } selecionarVeiculo(idVeiculo) { const veiculoEncontrado = this.veiculos.find(v => v.id === idVeiculo); if (veiculoEncontrado) { this.veiculoSelecionado = veiculoEncontrado; document.getElementById('detalhesExtrasVeiculo').innerHTML = `<p>Clique em "Ver Detalhes"...</p>`; this.atualizarDisplayGeral(); if (document.getElementById('dicasGeraisContainer')?.children.length > 0) { buscarEExibirDicasEspecificas(this.veiculoSelecionado.constructor.name); } } else { this.veiculoSelecionado = null; this.limparDisplays(); this.gerenciarBotoesAcao(); this.atualizarListaVeiculosVisivel(); } } limparDisplays() { document.getElementById("informacoesVeiculo").textContent = "Selecione um veículo na lista acima."; document.getElementById("historicoManutencao").innerHTML = "<p>Selecione um veículo.</p>"; document.getElementById("agendamentosFuturos").innerHTML = "<p>Selecione um veículo.</p>"; document.getElementById("veiculoVelocidadeDisplay").textContent = '0'; document.getElementById("velocimetroBarraDisplay").style.width = '0%'; document.getElementById("veiculoStatusDisplay").textContent = 'Desligado'; document.getElementById("veiculoStatusDisplay").className = 'status-desligado'; document.getElementById("displayTurbo").style.display = 'none'; document.getElementById("displayCarga").style.display = 'none'; document.getElementById("detalhesExtrasVeiculo").innerHTML = '<p>Selecione um veículo...</p>'; } interagir(acao) { if (!this.veiculoSelecionado) { showGlobalMessage("Selecione um veículo!", 'erro'); return; } try { switch (acao) { case "ligar": this.veiculoSelecionado.ligar(); break; case "desligar": this.veiculoSelecionado.desligar(); break; case "acelerar": this.veiculoSelecionado.acelerar(); break; case "frear": this.veiculoSelecionado.frear(); break; case "buzinar": this.veiculoSelecionado.buzinar(); break; case "ativarturbo": if (this.veiculoSelecionado instanceof CarroEsportivo) this.veiculoSelecionado.ativarTurbo(); else this.veiculoSelecionado.exibirMensagem("Este veículo não tem turbo!", 'aviso'); break; case "desativarturbo": if (this.veiculoSelecionado instanceof CarroEsportivo) this.veiculoSelecionado.desativarTurbo(); break; case "carregar": case "descarregar": if (this.veiculoSelecionado instanceof Caminhao) { const quantidade = parseInt(document.getElementById('quantidadeCarga').value); if (quantidade > 0) { acao === 'carregar' ? this.veiculoSelecionado.carregar(quantidade) : this.veiculoSelecionado.descarregar(quantidade); } else this.veiculoSelecionado.exibirMensagem(`Quantidade inválida.`, 'erro'); } else this.veiculoSelecionado.exibirMensagem(`Este veículo não pode ser ${acao}do!`, 'aviso'); break; } this.atualizarDisplayGeral(); salvarGaragem(); } catch (error) { showGlobalMessage(`Erro: ${error.message}`, 'erro'); } } atualizarDisplayGeral() { this.atualizarListaVeiculosVisivel(); this.atualizarSeletorVeiculos(); const infoDiv = document.getElementById("informacoesVeiculo"); const historicoDiv = document.getElementById('historicoManutencao'); const agendamentosDiv = document.getElementById('agendamentosFuturos'); if (this.veiculoSelecionado) { infoDiv.innerHTML = this.veiculoSelecionado.getInformacoesHtml(); this.veiculoSelecionado.atualizarDisplay(); historicoDiv.innerHTML = this.veiculoSelecionado.getHistoricoFormatado(); agendamentosDiv.innerHTML = this.veiculoSelecionado.getAgendamentosFormatados(); document.getElementById('displayTurbo').style.display = this.veiculoSelecionado instanceof CarroEsportivo ? 'block' : 'none'; document.getElementById('displayCarga').style.display = this.veiculoSelecionado instanceof Caminhao ? 'block' : 'none'; document.getElementById('quantidadeCarga').disabled = !(this.veiculoSelecionado instanceof Caminhao); } else { this.limparDisplays(); } this.gerenciarBotoesAcao(); verificarNotificacoesAgendamento(); } atualizarSeletorVeiculos() { const selectVeiculo = document.getElementById('manutencaoVeiculo'); const fieldsetAgendamento = document.getElementById('fieldsetAgendamento'); if (!selectVeiculo || !fieldsetAgendamento) return; const valorSelecionadoAnteriormente = this.veiculoSelecionado ? this.veiculoSelecionado.id : selectVeiculo.value; selectVeiculo.innerHTML = '<option value="">-- Selecione --</option>'; if (this.veiculos.length > 0) { this.veiculos.forEach(veiculo => { const option = document.createElement('option'); option.value = veiculo.id; option.textContent = `${veiculo.modelo} (${veiculo.constructor.name})`; selectVeiculo.appendChild(option); }); selectVeiculo.value = valorSelecionadoAnteriormente || ""; fieldsetAgendamento.disabled = false; } else { selectVeiculo.innerHTML = '<option value="">-- Nenhum veículo --</option>'; fieldsetAgendamento.disabled = true; } } gerenciarBotoesAcao() { const veiculo = this.veiculoSelecionado; const setDisabled = (id, condition) => { const btn = document.getElementById(id); if (btn) btn.disabled = condition; }; const nenhumSelecionado = !veiculo; setDisabled('acaoLigarBtn', nenhumSelecionado || veiculo?.ligado); setDisabled('acaoDesligarBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade > 0); setDisabled('acaoAcelerarBtn', nenhumSelecionado || !veiculo?.ligado); setDisabled('acaoFrearBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade === 0); setDisabled('acaoBuzinarBtn', nenhumSelecionado); const ehEsportivo = veiculo instanceof CarroEsportivo; setDisabled('acaoAtivarTurboBtn', !ehEsportivo || nenhumSelecionado || !veiculo?.ligado || veiculo?.turboAtivado); setDisabled('acaoDesativarTurboBtn', !ehEsportivo || nenhumSelecionado || !veiculo?.turboAtivado); const ehCaminhao = veiculo instanceof Caminhao; setDisabled('acaoCarregarBtn', !ehCaminhao || nenhumSelecionado || (veiculo?.cargaAtual >= veiculo?.capacidadeCarga)); setDisabled('acaoDescarregarBtn', !ehCaminhao || nenhumSelecionado || veiculo?.cargaAtual <= 0); document.getElementById('quantidadeCarga').disabled = !ehCaminhao; } atualizarListaVeiculosVisivel() { const container = document.getElementById('selecaoVeiculosContainer'); if (!container) return; container.innerHTML = ''; if (this.veiculos.length === 0) { container.innerHTML = '<p>Nenhum veículo na garagem.</p>'; return; } this.veiculos.forEach(veiculo => { const divVeiculo = document.createElement('div'); divVeiculo.className = 'veiculo-card'; if (this.veiculoSelecionado && this.veiculoSelecionado.id === veiculo.id) { divVeiculo.classList.add('selecionado'); } let imgUrl = 'img/default.png'; if (veiculo.modelo === "Moranguinho") imgUrl = 'img/CarroMoranguinho.jpg'; if (veiculo instanceof CarroEsportivo) imgUrl = 'img/CarroEsportivo.jpg'; if (veiculo instanceof Caminhao) imgUrl = 'img/Caminhao.jpg'; divVeiculo.innerHTML = `<img src="${imgUrl}" alt="${veiculo.modelo}" onerror="this.onerror=null; this.src='img/default.png';"><p>${veiculo.modelo}</p><span style="font-size: 0.8em; color: #555;">(${veiculo.constructor.name})</span><div><button class="btn-selecionar-veiculo" data-id="${veiculo.id}">Selecionar</button><button class="btn-ver-detalhes" data-modelo="${veiculo.modelo}">Detalhes</button></div>`; divVeiculo.querySelector('.btn-selecionar-veiculo').addEventListener('click', (e) => this.selecionarVeiculo(e.target.dataset.id)); divVeiculo.querySelector('.btn-ver-detalhes').addEventListener('click', (e) => { e.stopPropagation(); buscarDetalhesVeiculoAPI(e.target.dataset.modelo).then(detalhes => { const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo'); if (detalhes) { let html = `<h3>Info Adicional: ${detalhes.identificador}</h3><ul>`; for (const [key, value] of Object.entries(detalhes)) { if (key !== 'identificador') html += `<li><strong>${key}:</strong> ${value}</li>`; } html += '</ul>'; detalhesExtrasDiv.innerHTML = html; } else { detalhesExtrasDiv.innerHTML = `<p>Nenhum detalhe extra encontrado.</p>`; } }).catch(err => { document.getElementById('detalhesExtrasVeiculo').innerHTML = `<p style="color:red">Erro ao buscar detalhes.</p>`; }); }); container.appendChild(divVeiculo); }); } }
const CHAVE_LOCALSTORAGE = 'garagemDataIFPR_v4'; const garagem = new Garagem();
function salvarGaragem() { try { const garagemParaSalvar = garagem.veiculos.map(v => v.toJSON()); localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(garagemParaSalvar)); } catch (error) { console.error("Erro ao salvar garagem:", error); } }
function carregarGaragem() { const dadosSalvos = localStorage.getItem(CHAVE_LOCALSTORAGE); if (!dadosSalvos) { garantirVeiculosPadrao(); return; } try { const veiculosSalvos = JSON.parse(dadosSalvos); garagem.veiculos = veiculosSalvos.map(dadosVeiculo => { if (!dadosVeiculo?.id) return null; let veiculo; const historico = dadosVeiculo.historicoManutencao?.map(m => new Manutencao(m.data, m.tipo, m.custo, m.descricao)).filter(Boolean) || []; switch (dadosVeiculo.tipoVeiculo) { case 'CarroEsportivo': veiculo = new CarroEsportivo(dadosVeiculo.modelo, dadosVeiculo.cor); veiculo.turboAtivado = dadosVeiculo.turboAtivado || false; break; case 'Caminhao': veiculo = new Caminhao(dadosVeiculo.modelo, dadosVeiculo.cor, dadosVeiculo.capacidadeCarga); veiculo.cargaAtual = dadosVeiculo.cargaAtual || 0; break; default: veiculo = new Carro(dadosVeiculo.modelo, dadosVeiculo.cor); break; } Object.assign(veiculo, dadosVeiculo, { historicoManutencao: historico }); return veiculo; }).filter(Boolean); } catch (error) { console.error("Erro ao carregar garagem:", error); } garantirVeiculosPadrao(); }
function garantirVeiculosPadrao() { const modelosPadrao = { "Moranguinho": () => new Carro("Moranguinho", "Rosa"), "Veloz": () => new CarroEsportivo("Veloz", "Vermelho"), "Brutus": () => new Caminhao("Brutus", "Azul", 1200) }; let adicionado = false; for (const modelo in modelosPadrao) { if (!garagem.veiculos.some(v => v.modelo === modelo)) { garagem.adicionarVeiculo(modelosPadrao[modelo]()); adicionado = true; } } if (adicionado) salvarGaragem(); }
let notificacoesMostradasNestaSessao = new Set(); function verificarNotificacoesAgendamento() { const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0); const amanha = new Date(hoje); amanha.setUTCDate(hoje.getUTCDate() + 1); garagem.veiculos.forEach(veiculo => { veiculo.historicoManutencao.forEach(m => { if (m.isFutura()) { const idNotificacao = `${veiculo.id}_${m.data.toISOString().substring(0, 10)}`; if (!notificacoesMostradasNestaSessao.has(idNotificacao)) { if (m.data.getTime() === hoje.getTime()) { showGlobalMessage(`🔔 HOJE: ${m.tipo} para ${veiculo.modelo}.`, 'aviso'); notificacoesMostradasNestaSessao.add(idNotificacao); } else if (m.data.getTime() === amanha.getTime()) { showGlobalMessage(`🔔 AMANHÃ: ${m.tipo} para ${veiculo.modelo}.`, 'info'); notificacoesMostradasNestaSessao.add(idNotificacao); } } } }); }); }
async function buscarDetalhesVeiculoAPI(identificador) { try { const response = await fetch('./dados-veiculos-api.json'); if (!response.ok) throw new Error("Falha na rede"); const dados = await response.json(); return dados.find(v => v.identificador.toLowerCase() === identificador.toLowerCase()) || null; } catch (error) { console.error("Erro na API de detalhes:", error); throw error; } }
const previsaoUI = { cidadeInput: document.getElementById('cidadeInput'), btn: document.getElementById('verificarClimaBtn'), resultado: document.getElementById('previsaoTempoResultado'), status: document.getElementById('climaMensagemStatus'), titulo: document.getElementById('tituloPrevisaoTempo'), numDiasSelecionado: 5, ultimaPrevisao: null, ultimaCidade: null }; async function buscarPrevisao(cidade) { previsaoUI.btn.disabled = true; previsaoUI.cidadeInput.disabled = true; previsaoUI.resultado.innerHTML = `<p>Carregando previsão para ${cidade}...</p>`; try { const response = await fetch(`${API_BASE_URL}/api/previsao/${encodeURIComponent(cidade)}`); if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Erro do servidor'); } const data = await response.json(); previsaoUI.ultimaPrevisao = processarDadosForecast(data); previsaoUI.ultimaCidade = cidade; exibirPrevisao(); } catch (error) { showGlobalMessage(`Erro de clima: ${error.message}`, 'erro'); } finally { previsaoUI.btn.disabled = false; previsaoUI.cidadeInput.disabled = false; } }
function processarDadosForecast(dataApi) { if (!dataApi?.list?.length) return null; const porDia = {}; dataApi.list.forEach(item => { const dia = item.dt_txt.split(' ')[0]; if (!porDia[dia]) porDia[dia] = []; porDia[dia].push(item); }); return Object.keys(porDia).sort().map(diaKey => { const diaCompleto = porDia[diaKey]; const temp_min = Math.round(Math.min(...diaCompleto.map(i => i.main.temp_min))); const temp_max = Math.round(Math.max(...diaCompleto.map(i => i.main.temp_max))); const icone = diaCompleto[Math.floor(diaCompleto.length / 2)].weather[0].icon; const descricao = diaCompleto[Math.floor(diaCompleto.length / 2)].weather[0].description; const dataObj = new Date(diaKey + 'T12:00:00Z'); return { data: dataObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).replace('.', ''), temp_min, temp_max, icone, descricao }; }); }
function exibirPrevisao() { if (!previsaoUI.ultimaPrevisao) { previsaoUI.resultado.innerHTML = `<p>Não foi possível obter a previsão.</p>`; return; } const previsaoFiltrada = previsaoUI.ultimaPrevisao.slice(0, previsaoUI.numDiasSelecionado); previsaoUI.titulo.textContent = `Previsão do Tempo (${previsaoUI.numDiasSelecionado} Dias) para ${previsaoUI.ultimaCidade}`; let html = '<div class="clima-cards-wrapper">'; previsaoFiltrada.forEach(dia => { html += `<div class="clima-card-dia"><h4>${dia.data}</h4><img src="https://openweathermap.org/img/wn/${dia.icone}@2x.png" alt="${dia.descricao}"><p class="temperaturas"><span class="temp-max">${dia.temp_max}°C</span> / <span class="temp-min">${dia.temp_min}°C</span></p><p class="descricao-clima">${dia.descricao.charAt(0).toUpperCase() + dia.descricao.slice(1)}</p></div>`; }); html += '</div>'; previsaoUI.resultado.innerHTML = html; }
async function buscarEExibirDicasEspecificas(tipoVeiculo) { const container = document.getElementById('dicasEspecificasContainer'); if (!container || !tipoVeiculo) return; try { const response = await fetch(`${API_BASE_URL}/api/dicas-manutencao/${tipoVeiculo.toLowerCase()}`); if (!response.ok) throw new Error('Falha na rede'); const dicas = await response.json(); if (dicas.length > 0) { const nomeTipo = tipoVeiculo.replace(/([A-Z])/g, ' $1').trim(); let html = `<h3>Dicas para seu <strong>${nomeTipo}</strong></h3>`; dicas.forEach(d => html += `<div class="dica-card">${d.dica}</div>`); container.innerHTML = html; } else container.innerHTML = ''; } catch (err) { container.innerHTML = `<p style="color:red">Erro ao buscar dicas.</p>`; } }
async function carregarDadosAdicionais() { const secoes = { 'cards-veiculos-destaque': { endpoint: '/api/garagem/veiculos-destaque', template: item => `<div class="destaque-card"><img src="${item.imagemUrl || 'img/default.png'}" alt="${item.modelo}"><h3>${item.modelo} (${item.ano})</h3><p><strong>Destaque:</strong> ${item.destaque}</p></div>` }, 'lista-servicos-oferecidos': { endpoint: '/api/garagem/servicos-oferecidos', template: item => `<div class="servico-item"><h3>${item.nome}</h3><p>${item.descricao}</p><span class="preco">Preço: ${item.precoEstimado}</span></div>` }, 'lista-ferramentas-essenciais': { endpoint: '/api/garagem/ferramentas-essenciais', template: item => `<div class="ferramenta-item"><h3>${item.nome}</h3><p>${item.utilidade}</p></div>` } }; for (const [id, config] of Object.entries(secoes)) { const container = document.getElementById(id); if (!container) continue; try { const response = await fetch(`${API_BASE_URL}${config.endpoint}`); if (!response.ok) throw new Error('Falha na rede'); const data = await response.json(); container.innerHTML = data.length > 0 ? data.map(config.template).join('') : '<p>Nenhuma informação disponível.</p>'; } catch (err) { container.innerHTML = `<p style="color:red;">Erro ao carregar dados.</p>`; } } }
async function carregarManutencoes(veiculoId) { const listaContainer = document.getElementById('lista-manutencoes-db'); if (!listaContainer) return; listaContainer.innerHTML = '<p>Carregando histórico...</p>'; try { const response = await fetch(`${API_BASE_URL}/api/veiculos/${veiculoId}/manutencoes`, { headers: getAuthHeaders() }); if (!response.ok) throw new Error('Falha ao buscar as manutenções.'); const manutencoes = await response.json(); if (manutencoes.length === 0) { listaContainer.innerHTML = '<p>Nenhuma manutenção registrada.</p>'; return; } listaContainer.innerHTML = ''; manutencoes.forEach(m => { const item = document.createElement('div'); item.className = 'servico-item'; item.innerHTML = `<h3>${m.descricaoServico}</h3><p>Data: <strong>${new Date(m.data).toLocaleDateString('pt-BR')}</strong></p>${m.quilometragem ? `<p>KM: <strong>${m.quilometragem.toLocaleString('pt-BR')}</strong></p>` : ''}<span class="preco">Custo: R$ ${m.custo.toFixed(2).replace('.', ',')}</span>`; listaContainer.appendChild(item); }); } catch (error) { listaContainer.innerHTML = `<p style="color: red;">${error.message}</p>`; } }
function exibirSecaoManutencoes(veiculoId, veiculoNome) { const secao = document.getElementById('gerenciamento-manutencoes-db'); const titulo = document.getElementById('manutencao-veiculo-selecionado-titulo'); const idOculto = document.getElementById('manutencaoVeiculoId'); titulo.textContent = veiculoNome; idOculto.value = veiculoId; secao.style.display = 'block'; secao.scrollIntoView({ behavior: 'smooth' }); carregarManutencoes(veiculoId); }
async function adicionarNovaManutencao(evento) { evento.preventDefault(); const form = document.getElementById('formAdicionarManutencao'); const submitButton = form.querySelector('button[type="submit"]'); const veiculoId = document.getElementById('manutencaoVeiculoId').value; if (!veiculoId) { alert("Erro: ID do veículo não encontrado."); return; } const dadosManutencao = { descricaoServico: document.getElementById('manutencaoDescricaoServico').value, data: document.getElementById('manutencaoDataServico').value, custo: document.getElementById('manutencaoCustoServico').value, quilometragem: document.getElementById('manutencaoKmServico').value || null }; submitButton.disabled = true; submitButton.textContent = 'Registrando...'; try { const response = await fetch(`${API_BASE_URL}/api/veiculos/${veiculoId}/manutencoes`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(dadosManutencao), }); const resultado = await response.json(); if (!response.ok) throw new Error(resultado.error || `Erro ${response.status}`); showGlobalMessage('Manutenção registrada com sucesso!', 'sucesso'); form.reset(); document.getElementById('manutencaoVeiculoId').value = veiculoId; await carregarManutencoes(veiculoId); } catch (error) { showGlobalMessage(`Erro: ${error.message}`, 'erro'); } finally { submitButton.disabled = false; submitButton.textContent = 'Registrar Manutenção'; } }

// =======================================================
// --- INICIALIZAÇÃO DA APLICAÇÃO ---
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    setupAuthSystem();
    const formAdicionarVeiculo = document.getElementById('formAdicionarVeiculo');
    if (formAdicionarVeiculo) formAdicionarVeiculo.addEventListener('submit', adicionarNovoVeiculo);

    const formAdicionarManutencao = document.getElementById('formAdicionarManutencao');
    if (formAdicionarManutencao) formAdicionarManutencao.addEventListener('submit', adicionarNovaManutencao);

    const listaVeiculosDb = document.getElementById('lista-veiculos-db');
    if (listaVeiculosDb) {
        listaVeiculosDb.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-deletar-veiculo')) {
                deletarVeiculo(e.target.dataset.id);
            }
            if (e.target.classList.contains('btn-manutencao')) {
                exibirSecaoManutencoes(e.target.dataset.id, e.target.dataset.nome);
            }
            if (e.target.classList.contains('btn-unshare')) {
                const veiculoId = e.target.dataset.veiculoId;
                const userIdToRemove = e.target.dataset.userId;
                handleUnshare(veiculoId, userIdToRemove);
            }
        });
        listaVeiculosDb.addEventListener('submit', (e) => {
            if (e.target.classList.contains('share-form')) {
                handleShareVehicle(e);
            }
        });
    }

    carregarGaragem();
    carregarDadosAdicionais();
    garagem.atualizarDisplayGeral();

    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('manutencaoVeiculo').value;
            const veiculo = garagem.veiculos.find(v => v.id === id);
            if (!veiculo) { showGlobalMessage("Selecione um veículo", "erro"); return; }
            try {
                const manutencao = new Manutencao(document.getElementById('manutencaoData').value, document.getElementById('manutencaoTipo').value, document.getElementById('manutencaoCusto').value, document.getElementById('manutencaoDescricao').value);
                veiculo.adicionarManutencao(manutencao);
                salvarGaragem();
                showGlobalMessage("Manutenção registrada!", "sucesso");
                garagem.atualizarDisplayGeral();
                e.target.reset();
            } catch (err) { showGlobalMessage(err.message, "erro"); }
        });
    }

    const botoesAcao = document.querySelector('.botoes-acao');
    if (botoesAcao) {
        botoesAcao.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const acao = e.target.id.replace('acao', '').replace('Btn', '').toLowerCase();
                garagem.interagir(acao);
            }
        });
    }

    if (previsaoUI.btn) previsaoUI.btn.addEventListener('click', () => buscarPrevisao(previsaoUI.cidadeInput.value.trim()));
    if (previsaoUI.cidadeInput) previsaoUI.cidadeInput.addEventListener('keypress', e => { if (e.key === 'Enter') previsaoUI.btn.click(); });

    document.querySelectorAll('.btn-dias-previsao').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-dias-previsao').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            previsaoUI.numDiasSelecionado = parseInt(btn.dataset.dias);
            if (previsaoUI.ultimaPrevisao) exibirPrevisao();
        });
    });

    const carregarDicasBtn = document.getElementById('carregarDicasBtn');
    if (carregarDicasBtn) {
        carregarDicasBtn.addEventListener('click', async (e) => {
            const btn = e.target;
            btn.disabled = true; btn.textContent = 'Carregando...';
            const dicasGerais = document.getElementById('dicasGeraisContainer');
            const viagens = document.getElementById('viagensContainer');
            try {
                const [dicasRes, viagensRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/dicas-manutencao`),
                    fetch(`${API_BASE_URL}/api/viagens-populares`)
                ]);
                const [dicasData, viagensData] = await Promise.all([dicasRes.json(), viagensRes.json()]);
                dicasGerais.innerHTML = '<h3>Dicas Gerais</h3>' + dicasData.map(d => `<div class="dica-card">${d.dica}</div>`).join('');
                viagens.innerHTML = '<h3>Sugestões de Viagem</h3>' + viagensData.map(v => `<div class="viagem-card"><strong>${v.destino}</strong><p>${v.descricao}</p></div>`).join('');
                if (garagem.veiculoSelecionado) buscarEExibirDicasEspecificas(garagem.veiculoSelecionado.constructor.name);
            } catch (err) {
                dicasGerais.innerHTML = '<p style="color:red">Erro ao buscar dicas.</p>';
                viagens.innerHTML = '<p style="color:red">Erro ao buscar viagens.</p>';
            } finally {
                btn.disabled = false; btn.textContent = 'Carregar Dicas e Viagens';
            }
        });
    }
});