// script.js (VERSÃO CORRIGIDA E MELHORADA - LÓGICA DO TURBO AJUSTADA)

// =======================================================
// --- CONFIGURAÇÃO CENTRAL DA API ---
// =======================================================
const API_BASE_URL = 'https://carro-digital-pedro.onrender.com'; 

class Manutencao {
    constructor(data, tipo, custo, descricao = "") {
        if (!this.validar(data, tipo, custo)) {
            throw new Error("Dados de manutenção inválidos.");
        }
        let dataObj;
        if (data instanceof Date) {
            dataObj = data;
        } else if (typeof data === 'string') {
            if (data.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
                dataObj = new Date(data + 'T00:00:00Z');
            } else {
                dataObj = new Date(data);
            }
        }

        if (!dataObj || isNaN(dataObj.getTime())) {
            console.error("Erro ao criar data a partir de:", data);
            throw new Error("Formato de data inválido fornecido.");
        }

        this.data = dataObj;
        this.tipo = tipo.trim();
        this.custo = parseFloat(custo);
        this.descricao = descricao.trim();
    }

    toString() {
        const dataFormatada = this.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        return `${this.tipo} em ${dataFormatada} - R$ ${this.custo.toFixed(2)}${this.descricao ? ` (${this.descricao})` : ''}`;
    }

    validar(data, tipo, custo) {
        const custoNum = parseFloat(custo);
        if (!tipo || typeof tipo !== 'string' || tipo.trim() === '' || isNaN(custoNum) || custoNum < 0) {
            return false;
        }
        return true;
    }

    isFutura() {
        const hoje = new Date();
        hoje.setUTCHours(0, 0, 0, 0);
        return this.data >= hoje;
    }

    toJSON() {
        return {
            data: this.data.toISOString(),
            tipo: this.tipo,
            custo: this.custo,
            descricao: this.descricao
        };
    }
}

class Carro {
    constructor(modelo, cor) {
        this.id = `carro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        this.modelo = modelo;
        this.cor = cor;
        this.velocidade = 0;
        this.ligado = false;
        this.historicoManutencao = [];
        this.maxVelocidadeDisplay = 200;

        try {
            this.somLigando = new Audio("mp3/ligando.mp3");
            this.somAcelerando = new Audio("mp3/acelerando.mp3");
            this.somAcelerando.loop = true;
            this.somAcelerando.volume = 0; 
            this.somBuzina = new Audio("mp3/buzina.mp3");
            this.somFreio = new Audio("mp3/freio.mp3");
        } catch (e) {
            console.warn("Não foi possível inicializar a API de Áudio.", e);
            this.somLigando = { play: () => Promise.resolve(), pause: () => {}, volume: 0 };
            this.somAcelerando = { play: () => Promise.resolve(), pause: () => {}, volume: 0, currentTime: 0, loop: false };
            this.somBuzina = { play: () => Promise.resolve(), pause: () => {}, volume: 0 };
            this.somFreio = { play: () => Promise.resolve(), pause: () => {}, volume: 0 };
        }
    }

    ligar() {
        if (this.ligado) {
            this.exibirMensagem("O carro já está ligado.", 'info');
            return;
        }
        this.ligado = true;
        this.velocidade = 0;
        this.atualizarDisplay();
        this.somLigando.play().catch(e => console.error("Erro ao tocar som ligando:", e));
        this.exibirMensagem(`${this.modelo} ligado!`, 'sucesso');
    }

    desligar() {
        if (!this.ligado) {
            this.exibirMensagem("O carro já está desligado.", 'info');
            return;
        }
        if (this.velocidade > 0) {
            this.exibirMensagem("Pare o carro antes de desligar!", 'aviso');
            return;
        }
        this.ligado = false;
        this.velocidade = 0; 
        this.atualizarDisplay();
        this.somAcelerando.pause();
        this.somAcelerando.currentTime = 0;
        this.somAcelerando.volume = 0;
        this.exibirMensagem(`${this.modelo} desligado.`, 'info');
    }

    acelerar() { // <- REMOVEMOS O PARÂMETRO 'incremento' DAQUI
        if (!this.ligado) {
            this.exibirMensagem("O carro precisa estar ligado para acelerar.", 'erro');
            return;
        }

        // ===== NOVA LÓGICA DE ACELERAÇÃO =====
        let incremento = 10; // Aceleração padrão
        if (this instanceof CarroEsportivo && this.turboAtivado) {
            incremento = 70; // Aceleração com TURBO! É bem mais forte.
            this.exibirMensagem("BOOST! Turbo consumido!", 'sucesso');
            this.desativarTurbo(); // Turbo é consumido após o uso
        }
        // ===================================

        const velMaxima = this.maxVelocidadeDisplay;
        if (this.velocidade >= velMaxima) {
            this.exibirMensagem("O carro já está na velocidade máxima!", 'aviso');
             this.velocidade = velMaxima;
             this.atualizarDisplay();
             if (this.somAcelerando.paused) this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e));
            return;
        }
        this.velocidade = Math.min(velMaxima, this.velocidade + incremento);
        this.atualizarDisplay();
        this.somAcelerando.volume = this._calcularVolumeAceleracao();
        if (this.somAcelerando.paused) {
             this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e));
        }
    }

    frear() { // <- REMOVEMOS O PARÂMETRO 'decremento'
        if (this.velocidade === 0) {
             if (!this.somAcelerando.paused) {
                this.somAcelerando.pause();
                this.somAcelerando.currentTime = 0;
                this.somAcelerando.volume = 0;
             }
            return;
        }
        const decremento = 15; // Valor fixo de frenagem
        this.velocidade = Math.max(0, this.velocidade - decremento);
        this.atualizarDisplay();
        this.somFreio.play().catch(e => console.error("Erro ao tocar som freio:", e));

         if (this.velocidade > 0) {
             this.somAcelerando.volume = this._calcularVolumeAceleracao();
         } else {
             this.somAcelerando.pause();
             this.somAcelerando.currentTime = 0;
             this.somAcelerando.volume = 0;
         }
    }

    buzinar() {
        this.somBuzina.currentTime = 0;
        this.somBuzina.play().catch(e => console.error("Erro ao tocar som buzina:", e));
    }

    _calcularVolumeAceleracao() {
        const volumeRange = document.getElementById('volumeAceleracao');
        const volumeGeral = volumeRange ? parseFloat(volumeRange.value) : 0.5;
        const baseVolume = Math.min(this.velocidade / this.maxVelocidadeDisplay, 1) * 0.8 + 0.1;
        return Math.max(0, Math.min(1, baseVolume * volumeGeral));
    }

    adicionarManutencao(manutencao) {
        if (!(manutencao instanceof Manutencao)) {
            throw new Error("Tentativa de adicionar manutenção inválida.");
        }
        this.historicoManutencao.push(manutencao);
        this.historicoManutencao.sort((a, b) => a.data.getTime() - b.data.getTime());
    }

    getHistoricoFormatado() {
        const passadas = this.historicoManutencao.filter(m => !m.isFutura());
        if (passadas.length === 0) {
            return "<p>Nenhuma manutenção passada registrada.</p>";
        }
        passadas.sort((a, b) => b.data.getTime() - a.data.getTime());
        return `<ul>${passadas.map(m => `<li>${m.toString()}</li>`).join('')}</ul>`;
    }

    getAgendamentosFormatados() {
        const futuras = this.historicoManutencao.filter(m => m.isFutura());
        if (futuras.length === 0) {
            return "<p>Nenhum agendamento futuro.</p>";
        }
        return `<ul>${futuras.map(m => `<li>${m.toString()}</li>`).join('')}</ul>`;
    }

    getInformacoesHtml() {
       const modeloNode = document.createTextNode(this.modelo);
       const corNode = document.createTextNode(this.cor);
       const container = document.createElement('div');
       container.innerHTML = `
            <strong>Modelo:</strong> <span id="info-modelo"></span> <br>
            <strong>Cor:</strong> <span id="info-cor"></span>
       `;
       container.querySelector('#info-modelo').appendChild(modeloNode);
       container.querySelector('#info-cor').appendChild(corNode);
       return container.innerHTML;
    }

    atualizarDisplay() {
        const velocimetroBarra = document.getElementById("velocimetroBarraDisplay");
        const velocidadeElement = document.getElementById("veiculoVelocidadeDisplay");
        const statusElement = document.getElementById("veiculoStatusDisplay");

        if (velocidadeElement) velocidadeElement.textContent = this.velocidade;
        
        if (statusElement) {
            statusElement.textContent = this.ligado ? "Ligado" : "Desligado";
            statusElement.className = this.ligado ? "status-ligado" : "status-desligado";
        }
        if (velocimetroBarra) {
            const maxVel = this.maxVelocidadeDisplay > 0 ? this.maxVelocidadeDisplay : 1;
            const percentualVelocidade = Math.min((this.velocidade / maxVel) * 100, 100);
            velocimetroBarra.style.width = `${percentualVelocidade}%`;
        }

         if (this instanceof CarroEsportivo) {
             const turboStatus = document.getElementById("turboStatus");
             if(turboStatus) turboStatus.textContent = this.turboAtivado ? "Ativado" : "Desativado";
         } else if (this instanceof Caminhao) {
             const cargaAtual = document.getElementById("cargaAtual");
             const capacidadeCargaSpan = document.getElementById("capacidadeCargaSpan");
             if(cargaAtual) cargaAtual.textContent = this.cargaAtual;
             if(capacidadeCargaSpan) capacidadeCargaSpan.textContent = this.capacidadeCarga;
         }
    }

    exibirMensagem(mensagem, tipo = 'info') {
        const mensagemElement = document.getElementById("mensagemStatus");
        if(mensagemElement){
            mensagemElement.textContent = mensagem;
            mensagemElement.className = `mensagem ${tipo}`;
            mensagemElement.style.display = 'block';

            clearTimeout(mensagemElement.timeoutId);
            mensagemElement.timeoutId = setTimeout(() => {
                if (mensagemElement.textContent === mensagem) {
                     mensagemElement.style.display = 'none';
                }
            }, 4500);
        } else {
            alert(`${tipo.toUpperCase()}: ${mensagem}`);
        }
    }

    toJSON() {
        return {
            id: this.id,
            tipoVeiculo: 'Carro',
            modelo: this.modelo,
            cor: this.cor,
            velocidade: this.velocidade,
            ligado: this.ligado,
            historicoManutencao: this.historicoManutencao.map(m => m.toJSON()),
            maxVelocidadeDisplay: this.maxVelocidadeDisplay
        };
    }
}

class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
        this.maxVelocidadeDisplay = 300;
         try {
            this.somTurbo = new Audio("mp3/turbo.mp3");
         } catch(e) {
            this.somTurbo = { play: () => Promise.resolve() };
         }
    }

    ativarTurbo() {
        if (!this.ligado) {
            this.exibirMensagem("Ligue o carro antes de ativar o turbo.", 'erro');
            return;
        }
        if (this.turboAtivado) {
            this.exibirMensagem("Turbo já está ativado!", 'info');
            return;
        }
        this.turboAtivado = true;
        
        const volumeRangeAceleracao = document.getElementById('volumeAceleracao');
        this.somTurbo.volume = volumeRangeAceleracao ? parseFloat(volumeRangeAceleracao.value) * 0.8 : 0.4;
        this.somTurbo.play().catch(e => console.error("Erro ao tocar som turbo:", e));
        
        // ===== LÓGICA DO TURBO ALTERADA =====
        // NÃO acelera mais o carro, apenas "arma" o turbo
        this.atualizarDisplay(); // Atualiza o status "Turbo: Ativado"
        this.exibirMensagem("Turbo armado! A próxima aceleração será potente.", 'sucesso');
        // ===================================
    }

    desativarTurbo() {
        if (!this.turboAtivado) return;
        this.turboAtivado = false;
        this.atualizarDisplay(); // Atualiza o status "Turbo: Desativado"
    }

    desligar() {
        if (this.ligado) this.desativarTurbo();
        super.desligar();
    }

    toJSON() {
        const baseJSON = super.toJSON();
        return {
            ...baseJSON,
            tipoVeiculo: 'CarroEsportivo',
            turboAtivado: this.turboAtivado
        };
    }
}

class Caminhao extends Carro {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        this.capacidadeCarga = !isNaN(parseInt(capacidadeCarga)) && parseInt(capacidadeCarga) > 0 ? parseInt(capacidadeCarga) : 1000;
        this.cargaAtual = 0;
        this.maxVelocidadeDisplay = 140;
    }

    carregar(quantidade) {
        const quantNum = parseInt(quantidade);
        if (isNaN(quantNum) || quantNum <= 0) {
            this.exibirMensagem("Quantidade inválida.", 'erro');
            return false;
        }
        if (this.cargaAtual + quantNum > this.capacidadeCarga) {
            this.exibirMensagem(`Excede a capacidade de ${this.capacidadeCarga}kg.`, 'erro');
            return false;
        }
        this.cargaAtual += quantNum;
        this.exibirMensagem(`Carregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        return true;
    }

    descarregar(quantidade) {
        const quantNum = parseInt(quantidade);
        if (isNaN(quantNum) || quantNum <= 0) {
            this.exibirMensagem("Quantidade inválida.", 'erro');
            return false;
        }
        if (this.cargaAtual - quantNum < 0) {
            this.exibirMensagem(`Carga insuficiente (${this.cargaAtual}kg).`, 'erro');
            return false;
        }
        this.cargaAtual -= quantNum;
        this.exibirMensagem(`Descarregado ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        return true;
    }

    toJSON() {
        const baseJSON = super.toJSON();
        return {
            ...baseJSON,
            tipoVeiculo: 'Caminhao',
            capacidadeCarga: this.capacidadeCarga,
            cargaAtual: this.cargaAtual
        };
    }
}

class Garagem {
    constructor() {
        this.veiculos = [];
        this.veiculoSelecionado = null;
    }

    adicionarVeiculo(veiculo) {
        if (!(veiculo instanceof Carro)) return;
        if (this.veiculos.some(v => v.id === veiculo.id)) return;
        this.veiculos.push(veiculo);
    }

    selecionarVeiculo(idVeiculo) {
         const veiculoEncontrado = this.veiculos.find(v => v.id === idVeiculo);
         if (veiculoEncontrado) {
            this.veiculoSelecionado = veiculoEncontrado;
            document.getElementById('detalhesExtrasVeiculo').innerHTML = `<p>Clique em "Ver Detalhes"...</p>`;
            this.atualizarDisplayGeral();

            const dicasGeraisContainer = document.getElementById('dicasGeraisContainer');
            if (dicasGeraisContainer && dicasGeraisContainer.children.length > 0) {
                buscarEExibirDicasEspecificas(this.veiculoSelecionado.constructor.name);
            }
         } else {
            this.veiculoSelecionado = null;
            this.limparDisplays();
            this.gerenciarBotoesAcao();
            this.atualizarListaVeiculosVisivel();
         }
    }

    limparDisplays() {
        document.getElementById("informacoesVeiculo").textContent = "Selecione um veículo na lista acima.";
        document.getElementById("historicoManutencao").innerHTML = "<p>Selecione um veículo.</p>";
        document.getElementById("agendamentosFuturos").innerHTML = "<p>Selecione um veículo.</p>";
        document.getElementById("veiculoVelocidadeDisplay").textContent = '0';
        document.getElementById("velocimetroBarraDisplay").style.width = '0%';
        document.getElementById("veiculoStatusDisplay").textContent = 'Desligado';
        document.getElementById("veiculoStatusDisplay").className = 'status-desligado';
        document.getElementById("displayTurbo").style.display = 'none';
        document.getElementById("displayCarga").style.display = 'none';
        document.getElementById("detalhesExtrasVeiculo").innerHTML = '<p>Selecione um veículo...</p>';
    }

    interagir(acao) {
        if (!this.veiculoSelecionado) {
            this.exibirMensagemGlobal("Selecione um veículo!", 'erro');
            return;
        }
        let sucessoAcao = true;
        try {
            switch (acao) {
                case "ligar": this.veiculoSelecionado.ligar(); break;
                case "desligar": this.veiculoSelecionado.desligar(); break;
                case "acelerar": this.veiculoSelecionado.acelerar(); break;
                case "frear": this.veiculoSelecionado.frear(); break;
                case "buzinar": this.veiculoSelecionado.buzinar(); break;
                case "ativarturbo": // Note que agora os IDs são minúsculos
                    if (this.veiculoSelecionado instanceof CarroEsportivo) this.veiculoSelecionado.ativarTurbo();
                    else this.veiculoSelecionado.exibirMensagem("Este veículo não tem turbo!", 'aviso');
                    break;
                case "desativarturbo":
                     if (this.veiculoSelecionado instanceof CarroEsportivo) this.veiculoSelecionado.desativarTurbo();
                     break;
                case "carregar":
                case "descarregar":
                    if (this.veiculoSelecionado instanceof Caminhao) {
                        const inputQtd = document.getElementById('quantidadeCarga');
                        const quantidade = parseInt(inputQtd.value);
                         if (quantidade > 0) {
                             sucessoAcao = (acao === 'carregar')
                                            ? this.veiculoSelecionado.carregar(quantidade)
                                            : this.veiculoSelecionado.descarregar(quantidade);
                         } else {
                             this.veiculoSelecionado.exibirMensagem(`Quantidade inválida.`, 'erro');
                             sucessoAcao = false;
                         }
                    } else {
                        this.veiculoSelecionado.exibirMensagem(`Este veículo não pode ser ${acao}do!`, 'aviso');
                        sucessoAcao = false;
                    }
                    break;
                default:
                    sucessoAcao = false;
            }
            this.atualizarDisplayGeral();
            if (sucessoAcao) salvarGaragem();
        } catch (error) {
             this.exibirMensagemGlobal(`Erro: ${error.message}`, 'erro');
        }
    }

     atualizarDisplayGeral() {
        this.atualizarListaVeiculosVisivel();
        this.atualizarSeletorVeiculos();

        const infoDiv = document.getElementById("informacoesVeiculo");
        const historicoDiv = document.getElementById('historicoManutencao');
        const agendamentosDiv = document.getElementById('agendamentosFuturos');
        const displayTurbo = document.getElementById('displayTurbo');
        const displayCarga = document.getElementById('displayCarga');
        const inputQtdCarga = document.getElementById('quantidadeCarga');

        if (this.veiculoSelecionado) {
            infoDiv.innerHTML = this.veiculoSelecionado.getInformacoesHtml();
            this.veiculoSelecionado.atualizarDisplay();
            historicoDiv.innerHTML = this.veiculoSelecionado.getHistoricoFormatado();
            agendamentosDiv.innerHTML = this.veiculoSelecionado.getAgendamentosFormatados();
            displayTurbo.style.display = this.veiculoSelecionado instanceof CarroEsportivo ? 'block' : 'none';
            displayCarga.style.display = this.veiculoSelecionado instanceof Caminhao ? 'block' : 'none';
            inputQtdCarga.disabled = !(this.veiculoSelecionado instanceof Caminhao);
        } else {
            this.limparDisplays();
        }
         this.gerenciarBotoesAcao();
         verificarNotificacoesAgendamento();
    }

    atualizarSeletorVeiculos() {
        const selectVeiculo = document.getElementById('manutencaoVeiculo');
        const fieldsetAgendamento = document.getElementById('fieldsetAgendamento');
        if (!selectVeiculo || !fieldsetAgendamento) return;
        const valorSelecionadoAnteriormente = this.veiculoSelecionado ? this.veiculoSelecionado.id : selectVeiculo.value;
        selectVeiculo.innerHTML = '<option value="">-- Selecione --</option>';

        if (this.veiculos.length > 0) {
            this.veiculos.forEach(veiculo => {
                const option = document.createElement('option');
                option.value = veiculo.id;
                option.textContent = `${veiculo.modelo} (${veiculo.constructor.name})`;
                selectVeiculo.appendChild(option);
            });
            selectVeiculo.value = valorSelecionadoAnteriormente || "";
            fieldsetAgendamento.disabled = false;
        } else {
            selectVeiculo.innerHTML = '<option value="">-- Nenhum veículo --</option>';
            fieldsetAgendamento.disabled = true;
        }
    }

     gerenciarBotoesAcao() {
         const veiculo = this.veiculoSelecionado;
         const setDisabled = (id, condition) => {
             const btn = document.getElementById(id);
             if (btn) btn.disabled = condition;
         };
         
         const nenhumSelecionado = !veiculo;
         setDisabled('acaoLigarBtn',       nenhumSelecionado || veiculo?.ligado);
         setDisabled('acaoDesligarBtn',    nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade > 0);
         setDisabled('acaoAcelerarBtn',    nenhumSelecionado || !veiculo?.ligado);
         setDisabled('acaoFrearBtn',       nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade === 0);
         setDisabled('acaoBuzinarBtn',     nenhumSelecionado);

         const ehEsportivo = veiculo instanceof CarroEsportivo;
         setDisabled('acaoAtivarTurboBtn',   !ehEsportivo || nenhumSelecionado || !veiculo?.ligado || veiculo?.turboAtivado);
         setDisabled('acaoDesativarTurboBtn',!ehEsportivo || nenhumSelecionado || !veiculo?.turboAtivado);

         const ehCaminhao = veiculo instanceof Caminhao;
         setDisabled('acaoCarregarBtn',    !ehCaminhao || nenhumSelecionado || veiculo?.cargaAtual >= veiculo?.capacidadeCarga);
         setDisabled('acaoDescarregarBtn', !ehCaminhao || nenhumSelecionado || veiculo?.cargaAtual <= 0);
         document.getElementById('quantidadeCarga').disabled = !ehCaminhao;
     }

    atualizarListaVeiculosVisivel() {
        const container = document.getElementById('selecaoVeiculosContainer');
        if (!container) return;
        container.innerHTML = '';

        if (this.veiculos.length === 0) {
            container.innerHTML = '<p>Nenhum veículo na garagem.</p>';
            return;
        }

        this.veiculos.forEach(veiculo => {
            const divVeiculo = document.createElement('div');
            divVeiculo.className = 'veiculo-card';
            if (this.veiculoSelecionado && this.veiculoSelecionado.id === veiculo.id) {
                divVeiculo.classList.add('selecionado');
            }

            let imgUrl = 'img/default.png';
            if (veiculo.modelo === "Moranguinho") imgUrl = 'img/CarroMoranguinho.jpg';
            if (veiculo instanceof CarroEsportivo) imgUrl = 'img/CarroEsportivo.jpg';
            if (veiculo instanceof Caminhao) imgUrl = 'img/Caminhao.jpg';

            divVeiculo.innerHTML = `
                <img src="${imgUrl}" alt="${veiculo.modelo}" onerror="this.onerror=null; this.src='img/default.png';">
                <p>${veiculo.modelo}</p>
                <span style="font-size: 0.8em; color: #555;">(${veiculo.constructor.name})</span>
                <div>
                   <button class="btn-selecionar-veiculo" data-id="${veiculo.id}">Selecionar</button>
                   <button class="btn-ver-detalhes" data-modelo="${veiculo.modelo}">Detalhes</button>
                </div>
            `;

            divVeiculo.querySelector('.btn-selecionar-veiculo').addEventListener('click', (e) => this.selecionarVeiculo(e.target.dataset.id));
            divVeiculo.querySelector('.btn-ver-detalhes').addEventListener('click', (e) => {
                e.stopPropagation();
                buscarDetalhesVeiculoAPI(e.target.dataset.modelo).then(detalhes => {
                    const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo');
                    if (detalhes) {
                        let html = `<h3>Info Adicional: ${detalhes.identificador}</h3><ul>`;
                        for(const [key, value] of Object.entries(detalhes)){
                            if(key !== 'identificador') html += `<li><strong>${key}:</strong> ${value}</li>`;
                        }
                        html += '</ul>';
                        detalhesExtrasDiv.innerHTML = html;
                    } else {
                        detalhesExtrasDiv.innerHTML = `<p>Nenhum detalhe extra encontrado para este veículo.</p>`;
                    }
                }).catch(err => {
                    document.getElementById('detalhesExtrasVeiculo').innerHTML = `<p style="color:red">Erro ao buscar detalhes.</p>`;
                });
            });
            container.appendChild(divVeiculo);
        });
    }

    exibirMensagemGlobal(mensagem, tipo = 'info') {
        Carro.prototype.exibirMensagem.call({}, mensagem, tipo);
    }
}

// ... Restante do código (funções de localStorage, API, listeners) continua aqui ...
// O código abaixo é uma versão condensada e funcional das suas funções globais.

const CHAVE_LOCALSTORAGE = 'garagemDataIFPR_v4';
const garagem = new Garagem();

function salvarGaragem() {
    try {
        const garagemParaSalvar = garagem.veiculos.map(v => v.toJSON());
        localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(garagemParaSalvar));
    } catch (error) {
        console.error("Erro ao salvar garagem:", error);
    }
}

function carregarGaragem() {
    const dadosSalvos = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!dadosSalvos) {
        garantirVeiculosPadrao();
        return;
    }
    try {
        const veiculosSalvos = JSON.parse(dadosSalvos);
        const veiculosRecuperados = veiculosSalvos.map(dadosVeiculo => {
            if (!dadosVeiculo?.id) return null;
            let veiculo;
            const historico = dadosVeiculo.historicoManutencao?.map(m => new Manutencao(m.data, m.tipo, m.custo, m.descricao)).filter(Boolean) || [];
            switch (dadosVeiculo.tipoVeiculo) {
                case 'CarroEsportivo':
                    veiculo = new CarroEsportivo(dadosVeiculo.modelo, dadosVeiculo.cor);
                    veiculo.turboAtivado = dadosVeiculo.turboAtivado || false;
                    break;
                case 'Caminhao':
                    veiculo = new Caminhao(dadosVeiculo.modelo, dadosVeiculo.cor, dadosVeiculo.capacidadeCarga);
                    veiculo.cargaAtual = dadosVeiculo.cargaAtual || 0;
                    break;
                default:
                    veiculo = new Carro(dadosVeiculo.modelo, dadosVeiculo.cor);
                    break;
            }
            Object.assign(veiculo, dadosVeiculo, { historicoManutencao: historico });
            return veiculo;
        }).filter(Boolean);
        garagem.veiculos = [];
        veiculosRecuperados.forEach(v => garagem.adicionarVeiculo(v));
    } catch (error) {
        console.error("Erro ao carregar garagem:", error);
    }
    garantirVeiculosPadrao();
}

function garantirVeiculosPadrao() {
    const modelosPadrao = { "Moranguinho": () => new Carro("Moranguinho", "Rosa"), "Veloz": () => new CarroEsportivo("Veloz", "Vermelho"), "Brutus": () => new Caminhao("Brutus", "Azul", 1200) };
    let adicionado = false;
    for (const modelo in modelosPadrao) {
        if (!garagem.veiculos.some(v => v.modelo === modelo)) {
            garagem.adicionarVeiculo(modelosPadrao[modelo]());
            adicionado = true;
        }
    }
    if (adicionado) salvarGaragem();
}

let notificacoesMostradasNestaSessao = new Set();
function verificarNotificacoesAgendamento() {
    const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
    const amanha = new Date(hoje); amanha.setUTCDate(hoje.getUTCDate() + 1);
    garagem.veiculos.forEach(veiculo => {
        veiculo.historicoManutencao.forEach(m => {
            if (m.isFutura()) {
                const idNotificacao = `${veiculo.id}_${m.data.toISOString().substring(0, 10)}`;
                if (!notificacoesMostradasNestaSessao.has(idNotificacao)) {
                    if (m.data.getTime() === hoje.getTime()) {
                        garagem.exibirMensagemGlobal(`🔔 HOJE: ${m.tipo} para ${veiculo.modelo}.`, 'aviso');
                        notificacoesMostradasNestaSessao.add(idNotificacao);
                    } else if (m.data.getTime() === amanha.getTime()) {
                        garagem.exibirMensagemGlobal(`🔔 AMANHÃ: ${m.tipo} para ${veiculo.modelo}.`, 'info');
                        notificacoesMostradasNestaSessao.add(idNotificacao);
                    }
                }
            }
        });
    });
}

async function buscarDetalhesVeiculoAPI(identificador) {
    try {
        const response = await fetch('./dados-veiculos-api.json');
        if (!response.ok) throw new Error("Falha na rede");
        const dados = await response.json();
        return dados.find(v => v.identificador.toLowerCase() === identificador.toLowerCase()) || null;
    } catch (error) {
        console.error("Erro na API de detalhes:", error);
        throw error;
    }
}

// --- Funções de API (Clima, Dicas, etc) ---
const previsaoUI = {
    cidadeInput: document.getElementById('cidadeInput'),
    btn: document.getElementById('verificarClimaBtn'),
    resultado: document.getElementById('previsaoTempoResultado'),
    status: document.getElementById('climaMensagemStatus'),
    titulo: document.getElementById('tituloPrevisaoTempo'),
    numDiasSelecionado: 5,
    ultimaPrevisao: null,
    ultimaCidade: null
};

async function buscarPrevisao(cidade) {
    previsaoUI.btn.disabled = true;
    previsaoUI.cidadeInput.disabled = true;
    previsaoUI.resultado.innerHTML = `<p class="carregando-clima">Carregando previsão para ${cidade}...</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/api/previsao/${encodeURIComponent(cidade)}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro do servidor');
        }
        const data = await response.json();
        previsaoUI.ultimaPrevisao = processarDadosForecast(data);
        previsaoUI.ultimaCidade = cidade;
        exibirPrevisao();
    } catch (error) {
        previsaoUI.status.textContent = `Erro: ${error.message}`;
        previsaoUI.status.className = 'mensagem erro';
        previsaoUI.status.style.display = 'block';
    } finally {
        previsaoUI.btn.disabled = false;
        previsaoUI.cidadeInput.disabled = false;
    }
}

function processarDadosForecast(dataApi) {
    if (!dataApi?.list?.length) return null;
    const porDia = {};
    dataApi.list.forEach(item => {
        const dia = item.dt_txt.split(' ')[0];
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(item);
    });
    return Object.keys(porDia).sort().map(diaKey => {
        const diaCompleto = porDia[diaKey];
        const temp_min = Math.round(Math.min(...diaCompleto.map(i => i.main.temp_min)));
        const temp_max = Math.round(Math.max(...diaCompleto.map(i => i.main.temp_max)));
        const icone = diaCompleto[Math.floor(diaCompleto.length/2)].weather[0].icon;
        const descricao = diaCompleto[Math.floor(diaCompleto.length/2)].weather[0].description;
        const dataObj = new Date(diaKey + 'T12:00:00Z');
        return {
            data: dataObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).replace('.', ''),
            temp_min, temp_max, icone, descricao
        };
    });
}

function exibirPrevisao() {
    if (!previsaoUI.ultimaPrevisao) {
        previsaoUI.resultado.innerHTML = `<p>Não foi possível obter a previsão.</p>`;
        return;
    }
    const previsaoFiltrada = previsaoUI.ultimaPrevisao.slice(0, previsaoUI.numDiasSelecionado);
    previsaoUI.titulo.textContent = `Previsão do Tempo (${previsaoUI.numDiasSelecionado} Dias) para ${previsaoUI.ultimaCidade}`;
    let html = '<div class="clima-cards-wrapper">';
    previsaoFiltrada.forEach(dia => {
        html += `<div class="clima-card-dia">
            <h4>${dia.data}</h4>
            <img src="https://openweathermap.org/img/wn/${dia.icone}@2x.png" alt="${dia.descricao}">
            <p class="temperaturas"><span class="temp-max">${dia.temp_max}°C</span> / <span class="temp-min">${dia.temp_min}°C</span></p>
            <p class="descricao-clima">${dia.descricao.charAt(0).toUpperCase() + dia.descricao.slice(1)}</p>
        </div>`;
    });
    html += '</div>';
    previsaoUI.resultado.innerHTML = html;
}

async function buscarEExibirDicasEspecificas(tipoVeiculo) {
    const container = document.getElementById('dicasEspecificasContainer');
    if (!container || !tipoVeiculo) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/dicas-manutencao/${tipoVeiculo.toLowerCase()}`);
        if (!response.ok) throw new Error('Falha na rede');
        const dicas = await response.json();
        if (dicas.length > 0) {
            const nomeTipo = tipoVeiculo.replace(/([A-Z])/g, ' $1').trim();
            let html = `<h3>Dicas para seu <strong>${nomeTipo}</strong></h3>`;
            dicas.forEach(d => html += `<div class="dica-card">${d.dica}</div>`);
            container.innerHTML = html;
        } else {
            container.innerHTML = '';
        }
    } catch(err) { container.innerHTML = `<p style="color:red">Erro ao buscar dicas.</p>`; }
}

async function carregarDadosAdicionais() {
    const secoes = {
        'cards-veiculos-destaque': { endpoint: '/api/garagem/veiculos-destaque', template: item => `<div class="destaque-card"><img src="${item.imagemUrl || 'img/default.png'}" alt="${item.modelo}"><h3>${item.modelo} (${item.ano})</h3><p><strong>Destaque:</strong> ${item.destaque}</p></div>` },
        'lista-servicos-oferecidos': { endpoint: '/api/garagem/servicos-oferecidos', template: item => `<div class="servico-item"><h3>${item.nome}</h3><p>${item.descricao}</p><span class="preco">Preço: ${item.precoEstimado}</span></div>` },
        'lista-ferramentas-essenciais': { endpoint: '/api/garagem/ferramentas-essenciais', template: item => `<div class="ferramenta-item"><h3>${item.nome}</h3><p>${item.utilidade}</p></div>` }
    };
    for (const [id, config] of Object.entries(secoes)) {
        const container = document.getElementById(id);
        if (!container) continue;
        try {
            const response = await fetch(`${API_BASE_URL}${config.endpoint}`);
            if (!response.ok) throw new Error('Falha na rede');
            const data = await response.json();
            container.innerHTML = data.length > 0 ? data.map(config.template).join('') : '<p>Nenhuma informação disponível.</p>';
        } catch(err) { container.innerHTML = `<p style="color:red;">Erro ao carregar dados.</p>`; }
    }
}

// --- Inicialização e Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    carregarGaragem();
    carregarDadosAdicionais();
    garagem.atualizarDisplayGeral();
    verificarNotificacoesAgendamento();

    document.getElementById('formAgendamento').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('manutencaoVeiculo').value;
        const veiculo = garagem.veiculos.find(v => v.id === id);
        if (!veiculo) { garagem.exibirMensagemGlobal("Selecione um veículo", "erro"); return; }
        try {
            const manutencao = new Manutencao(
                document.getElementById('manutencaoData').value,
                document.getElementById('manutencaoTipo').value,
                document.getElementById('manutencaoCusto').value,
                document.getElementById('manutencaoDescricao').value
            );
            veiculo.adicionarManutencao(manutencao);
            salvarGaragem();
            garagem.exibirMensagemGlobal("Manutenção registrada!", "sucesso");
            garagem.atualizarDisplayGeral();
            e.target.reset();
        } catch (err) { garagem.exibirMensagemGlobal(err.message, "erro"); }
    });

    document.querySelector('.botoes-acao').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const acao = e.target.id.replace('acao', '').replace('Btn', '').toLowerCase();
            garagem.interagir(acao);
        }
    });

    previsaoUI.btn.addEventListener('click', () => buscarPrevisao(previsaoUI.cidadeInput.value.trim()));
    previsaoUI.cidadeInput.addEventListener('keypress', e => { if (e.key === 'Enter') previsaoUI.btn.click(); });
    document.querySelectorAll('.btn-dias-previsao').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-dias-previsao').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            previsaoUI.numDiasSelecionado = parseInt(btn.dataset.dias);
            if(previsaoUI.ultimaPrevisao) exibirPrevisao();
        });
    });

    document.getElementById('carregarDicasBtn').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.disabled = true; btn.textContent = 'Carregando...';
        const dicasGerais = document.getElementById('dicasGeraisContainer');
        const viagens = document.getElementById('viagensContainer');
        try {
            const [dicasRes, viagensRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/dicas-manutencao`),
                fetch(`${API_BASE_URL}/api/viagens-populares`)
            ]);
            const dicasData = await dicasRes.json();
            const viagensData = await viagensRes.json();
            dicasGerais.innerHTML = '<h3>Dicas Gerais</h3>' + dicasData.map(d => `<div class="dica-card">${d.dica}</div>`).join('');
            viagens.innerHTML = '<h3>Sugestões de Viagem</h3>' + viagensData.map(v => `<div class="viagem-card"><strong>${v.destino}</strong><p>${v.descricao}</p></div>`).join('');
            if (garagem.veiculoSelecionado) buscarEExibirDicasEspecificas(garagem.veiculoSelecionado.constructor.name);
        } catch(err) {
            dicasGerais.innerHTML = '<p style="color:red">Erro ao buscar dicas.</p>';
            viagens.innerHTML = '<p style="color:red">Erro ao buscar viagens.</p>';
        } finally {
            btn.disabled = false; btn.textContent = 'Carregar Dicas e Viagens';
        }
    });
});