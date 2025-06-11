// script.js

class Manutencao {
    constructor(data, tipo, custo, descricao = "") {
        if (!this.validar(data, tipo, custo)) {
            throw new Error("Dados de manutenção inválidos.");
        }
        let dataObj;
        if (data instanceof Date) {
            dataObj = data;
        } else if (typeof data === 'string') {
            // Tentativa de corrigir datas YYYY-MM-DD para evitar problemas de fuso horário local
            if (data.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
                dataObj = new Date(data + 'T00:00:00Z'); // Interpreta como UTC
            } else {
                dataObj = new Date(data); // Fallback para outros formatos (pode ter fuso local)
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
        const dataFormatada = this.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Exibe data UTC
        return `${this.tipo} em ${dataFormatada} - R$ ${this.custo.toFixed(2)}${this.descricao ? ` (${this.descricao})` : ''}`;
    }

    validar(data, tipo, custo) {
        const custoNum = parseFloat(custo);
        // A validação da data em si é complexa aqui, confiamos mais no construtor
        if (!tipo || typeof tipo !== 'string' || tipo.trim() === '' || isNaN(custoNum) || custoNum < 0) {
            console.error("Erro de validação (tipo/custo):", { tipo, custo });
            return false;
        }
        return true;
    }

    isFutura() {
        const hoje = new Date();
        hoje.setUTCHours(0, 0, 0, 0); // Compara com UTC 00:00:00
        const dataManutencao = new Date(this.data.getTime());
        // Não precisa ajustar a hora aqui se a data já foi criada como UTC 00:00:00
        // dataManutencao.setUTCHours(0, 0, 0, 0);
        return dataManutencao >= hoje;
    }

    toJSON() {
        return {
            // Salva a data como string ISO (que inclui Z para UTC)
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

        // Inicialização de áudio com fallback
        try {
            this.somLigando = new Audio("mp3/ligando.mp3");
            this.somAcelerando = new Audio("mp3/acelerando.mp3");
            this.somAcelerando.loop = true;
            this.somAcelerando.volume = 0; // Inicia mudo
            this.somBuzina = new Audio("mp3/buzina.mp3");
            this.somFreio = new Audio("mp3/freio.mp3");
        } catch (e) {
            console.warn("Não foi possível inicializar a API de Áudio.", e);
            // Cria objetos dummy para evitar erros se new Audio falhar
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
        // Não toca som de aceleração ao ligar, só quando acelera
        console.log("Carro ligado!");
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
        this.velocidade = 0; // Garante que está 0
        this.atualizarDisplay();
        this.somAcelerando.pause();
        this.somAcelerando.currentTime = 0;
        this.somAcelerando.volume = 0;
        console.log("Carro desligado!");
        this.exibirMensagem(`${this.modelo} desligado.`, 'info');
    }

    acelerar(incremento) {
        if (!this.ligado) {
            this.exibirMensagem("O carro precisa estar ligado para acelerar.", 'erro');
            return;
        }
        const velMaxima = this.maxVelocidadeDisplay; // Usa a velocidade máxima do objeto
        if (this.velocidade >= velMaxima) {
            this.exibirMensagem("O carro já está na velocidade máxima!", 'aviso');
             this.velocidade = velMaxima; // Garante que não ultrapasse
             this.atualizarDisplay();
             // Garante que o som está no volume máximo correspondente
             this.somAcelerando.volume = this._calcularVolumeAceleracao();
             if (this.somAcelerando.paused) this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e));
            return;
        }
        this.velocidade = Math.min(velMaxima, this.velocidade + incremento);
        this.atualizarDisplay();

        // Toca ou ajusta o volume do som de aceleração
        this.somAcelerando.volume = this._calcularVolumeAceleracao();
        if (this.somAcelerando.paused) { // Começa a tocar se estava parado
             this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e));
        }
        console.log("Acelerando! Velocidade:", this.velocidade, "Volume:", this.somAcelerando.volume);
    }

    frear(decremento) {
        if (this.velocidade === 0) {
             // Se já está parado e tenta frear, pausa o som de aceleração (caso ainda esteja tocando por algum delay)
             if (!this.somAcelerando.paused) {
                this.somAcelerando.pause();
                this.somAcelerando.currentTime = 0;
                this.somAcelerando.volume = 0;
             }
            return;
        }
        this.velocidade = Math.max(0, this.velocidade - decremento);
        this.atualizarDisplay();
        this.somFreio.play().catch(e => console.error("Erro ao tocar som freio:", e));

        // Ajusta o volume do som de aceleração ao frear
         if (this.velocidade > 0) {
             this.somAcelerando.volume = this._calcularVolumeAceleracao();
         } else {
             // Para completamente o som de aceleração ao chegar a 0 km/h
             this.somAcelerando.pause();
             this.somAcelerando.currentTime = 0;
             this.somAcelerando.volume = 0;
         }
        console.log("Freando! Velocidade:", this.velocidade);
    }

    buzinar() {
        // Garante que o som pode ser tocado novamente mesmo se já estiver tocando
        this.somBuzina.currentTime = 0;
        this.somBuzina.play().catch(e => console.error("Erro ao tocar som buzina:", e));
    }

    // Método auxiliar para calcular volume baseado na velocidade e volume geral
    _calcularVolumeAceleracao() {
        const volumeRange = document.getElementById('volumeAceleracao');
        const volumeGeral = volumeRange ? parseFloat(volumeRange.value) : 0.5; // Default 0.5 se não achar o range
        const baseVolume = Math.min(this.velocidade / this.maxVelocidadeDisplay, 1) * 0.8 + 0.1; // 0.1 a 0.9
        return Math.max(0, Math.min(1, baseVolume * volumeGeral)); // Aplica volume geral
    }

    adicionarManutencao(manutencao) {
        if (!(manutencao instanceof Manutencao)) {
            console.error("Objeto inválido. Apenas instâncias de Manutencao podem ser adicionadas.");
            throw new Error("Tentativa de adicionar manutenção inválida.");
        }
        this.historicoManutencao.push(manutencao);
        // Ordena por data (mais antiga primeiro)
        this.historicoManutencao.sort((a, b) => a.data.getTime() - b.data.getTime());
        console.log(`Manutenção adicionada ao ${this.modelo}: ${manutencao.toString()}`);
    }

    getHistoricoFormatado() {
        const passadas = this.historicoManutencao.filter(m => !m.isFutura());
        if (passadas.length === 0) {
            return "<p>Nenhuma manutenção passada registrada.</p>";
        }
        // Ordena passadas da mais recente para a mais antiga para exibição
        passadas.sort((a, b) => b.data.getTime() - a.data.getTime());
        return `<ul>${passadas.map(m => `<li>${m.toString()}</li>`).join('')}</ul>`;
    }

    getAgendamentosFormatados() {
        const futuras = this.historicoManutencao.filter(m => m.isFutura());
        if (futuras.length === 0) {
            return "<p>Nenhum agendamento futuro.</p>";
        }
        // Mantém futuras ordenadas da mais próxima para a mais distante (já feito no add)
        return `<ul>${futuras.map(m => `<li>${m.toString()}</li>`).join('')}</ul>`;
    }

    getInformacoesHtml() {
       // Usamos textContent para evitar problemas com HTML injection se nomes tiverem < ou >
       const modeloNode = document.createTextNode(this.modelo);
       const corNode = document.createTextNode(this.cor);
       const statusText = this.ligado ? "Ligado" : "Desligado";
       const statusClass = this.ligado ? 'status-ligado' : 'status-desligado';
       const velocidadeNode = document.createTextNode(this.velocidade);

       // Cria os elementos dinamicamente para segurança
       const container = document.createElement('div');
       container.innerHTML = `
            <strong>Modelo:</strong> <span id="info-modelo"></span> <br>
            <strong>Cor:</strong> <span id="info-cor"></span> <br>
            <strong>Status:</strong> <span id="info-status" class=""></span> <br>
            <strong>Velocidade:</strong> <span id="info-velocidade"></span> km/h
       `;
       container.querySelector('#info-modelo').appendChild(modeloNode);
       container.querySelector('#info-cor').appendChild(corNode);
       const statusSpan = container.querySelector('#info-status');
       statusSpan.textContent = statusText;
       statusSpan.className = statusClass;
       container.querySelector('#info-velocidade').appendChild(velocidadeNode);

       return container.innerHTML; // Retorna o HTML interno do container
    }

    atualizarDisplay() {
        const velocimetroBarra = document.getElementById("velocimetroBarraDisplay");
        const velocidadeElement = document.getElementById("veiculoVelocidadeDisplay");
        const statusElement = document.getElementById("veiculoStatusDisplay");

        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade;
        }
        if (statusElement) {
            statusElement.textContent = this.ligado ? "Ligado" : "Desligado";
            statusElement.className = this.ligado ? "status-ligado" : "status-desligado";
        }
        if (velocimetroBarra) {
            // Garante que maxVelocidadeDisplay seja positivo para evitar divisão por zero
            const maxVel = this.maxVelocidadeDisplay > 0 ? this.maxVelocidadeDisplay : 1;
            const percentualVelocidade = Math.min((this.velocidade / maxVel) * 100, 100);
            velocimetroBarra.style.width = `${percentualVelocidade}%`;
        }

         // Atualiza display específico de subclasses
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
        const mensagemElement = document.getElementById("mensagemStatus"); // Mensagem global da garagem
        if(mensagemElement){
            mensagemElement.textContent = mensagem;
            mensagemElement.className = `mensagem ${tipo}`; // Define a classe correta
            mensagemElement.style.display = 'block'; // Mostra a mensagem

            // Limpa timeout anterior, se houver, para evitar que mensagens antigas fechem a nova
            clearTimeout(mensagemElement.timeoutId);

            // Define um novo timeout
            mensagemElement.timeoutId = setTimeout(() => {
                // Verifica se a mensagem AINDA é a mesma antes de esconder
                // Isso evita esconder uma mensagem nova que apareceu logo em seguida
                if (mensagemElement.textContent === mensagem) {
                     mensagemElement.textContent = "";
                     mensagemElement.style.display = 'none';
                     mensagemElement.className = 'mensagem'; // Reseta a classe
                     delete mensagemElement.timeoutId; // Limpa a referência do timeout
                }
            }, 4500); // Tempo para a mensagem desaparecer
        } else {
            console.warn("Elemento #mensagemStatus não encontrado no HTML.");
            // Fallback para alert se o elemento não existe
            alert(`${tipo.toUpperCase()}: ${mensagem}`);
        }
    }

    toJSON() {
        return {
            id: this.id,
            tipoVeiculo: 'Carro', // Identifica o tipo base
            modelo: this.modelo,
            cor: this.cor,
            velocidade: this.velocidade,
            ligado: this.ligado,
            historicoManutencao: this.historicoManutencao.map(m => m.toJSON()),
            maxVelocidadeDisplay: this.maxVelocidadeDisplay // Salva a vel max do display
        };
    }
}

class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
        this.maxVelocidadeDisplay = 300; // Velocidade máxima específica do esportivo
         try {
            this.somTurbo = new Audio("mp3/turbo.mp3");
         } catch(e) {
            console.warn("Não foi possível carregar som do turbo.");
            this.somTurbo = { play: () => Promise.resolve(), volume: 0, currentTime: 0 };
         }
    }

    ativarTurbo() {
        if (!this.ligado) {
            this.exibirMensagem("Ligue o carro esportivo antes de ativar o turbo.", 'erro');
            return;
        }
         if (this.turboAtivado) {
             this.exibirMensagem("Turbo já está ativado!", 'info');
             return;
         }
        this.turboAtivado = true;
        this.somTurbo.currentTime = 0;
        // Aplicar volume geral ao som do turbo, se desejado (ex: com base no slider de aceleração)
        const volumeRangeAceleracao = document.getElementById('volumeAceleracao');
        this.somTurbo.volume = volumeRangeAceleracao ? parseFloat(volumeRangeAceleracao.value) * 0.8 : 0.4; // Ex: 80% do volume geral

        this.somTurbo.play().catch(e => console.error("Erro ao tocar som turbo:", e));
        this.acelerar(50);
        console.log("Turbo ativado!");
        this.exibirMensagem("Turbo ativado!", 'sucesso');
    }

    desativarTurbo() {
        if (!this.turboAtivado) {
             return;
         }
        this.turboAtivado = false;
        console.log("Turbo desativado.");
        this.exibirMensagem("Turbo desativado.", 'info');
    }

    desligar() {
        if (this.ligado) {
            this.desativarTurbo();
        }
        super.desligar();
    }

    getInformacoesHtml() {
       const baseHtml = super.getInformacoesHtml();
       const turboStatusText = this.turboAtivado ? "Ativado" : "Desativado";
       return `${baseHtml} <br>
               <strong>Turbo:</strong> <span id="info-turbo">${turboStatusText}</span>`;
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
            this.exibirMensagem("Quantidade inválida para carregar.", 'erro');
            return false;
        }
        if (this.cargaAtual + quantNum > this.capacidadeCarga) {
            this.exibirMensagem(`Não é possível carregar ${quantNum}kg. Excede a capacidade de ${this.capacidadeCarga}kg. Carga atual: ${this.cargaAtual}kg.`, 'erro');
            return false;
        }
        this.cargaAtual += quantNum;
        this.exibirMensagem(`Caminhão carregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        return true;
    }

    descarregar(quantidade) {
        const quantNum = parseInt(quantidade);
        if (isNaN(quantNum) || quantNum <= 0) {
            this.exibirMensagem("Quantidade inválida para descarregar.", 'erro');
            return false;
        }
        if (this.cargaAtual - quantNum < 0) {
            const maxDescarregar = this.cargaAtual;
            this.exibirMensagem(`Não é possível descarregar ${quantNum}kg. Carga insuficiente (${this.cargaAtual}kg). Pode descarregar no máximo ${maxDescarregar}kg.`, 'erro');
            return false;
        }
        this.cargaAtual -= quantNum;
        this.exibirMensagem(`Caminhão descarregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        return true;
    }

    getInformacoesHtml() {
       const baseHtml = super.getInformacoesHtml();
       return `${baseHtml} <br>
               <strong>Carga:</strong> <span id="info-carga">${this.cargaAtual}</span> / ${this.capacidadeCarga} kg`;
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
        if (!(veiculo instanceof Carro)) {
             console.error("Tentativa de adicionar objeto que não é Veículo:", veiculo);
             return;
        }
        if (this.veiculos.some(v => v.id === veiculo.id)) {
            console.warn(`Veículo com ID ${veiculo.id} (${veiculo.modelo}) já existe na garagem. Pulando adição.`);
            return;
        }
        this.veiculos.push(veiculo);
        console.log(`Veículo ${veiculo.modelo} (ID: ${veiculo.id}) adicionado à garagem.`);
    }


    selecionarVeiculo(idVeiculo) {
         const veiculoEncontrado = this.veiculos.find(v => v.id === idVeiculo);
         const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo');

         if (veiculoEncontrado) {
            this.veiculoSelecionado = veiculoEncontrado;
            console.log(`Veículo selecionado: ${this.veiculoSelecionado.modelo}`);

            if (detalhesExtrasDiv) {
                // Limpa ao selecionar, mas não exibe "clique em ver detalhes" aqui,
                // isso será feito pelo próprio botão de ver detalhes se necessário.
                detalhesExtrasDiv.innerHTML = `<p>Detalhes adicionais para ${this.veiculoSelecionado?.modelo || ''} aparecerão aqui.</p>`;
                detalhesExtrasDiv.className = 'detalhes-extras-box';
            }
            this.atualizarDisplayGeral();
         } else {
            console.error("Veículo não encontrado para seleção:", idVeiculo);
            this.veiculoSelecionado = null;
            this.limparDisplays();
            this.gerenciarBotoesAcao();
            if (detalhesExtrasDiv) {
                detalhesExtrasDiv.innerHTML = `<p>Selecione um veículo na lista.</p>`;
                detalhesExtrasDiv.className = 'detalhes-extras-box';
            }
            this.atualizarListaVeiculosVisivel();
         }
    }

    limparDisplays() {
        document.getElementById("informacoesVeiculo").textContent = "Selecione um veículo na lista acima.";
        document.getElementById("historicoManutencao").innerHTML = "<p>Selecione um veículo para ver o histórico.</p>";
        document.getElementById("agendamentosFuturos").innerHTML = "<p>Selecione um veículo para ver os agendamentos.</p>";
        document.getElementById("veiculoVelocidadeDisplay").textContent = '0';
        document.getElementById("velocimetroBarraDisplay").style.width = '0%';
        document.getElementById("veiculoStatusDisplay").textContent = 'Desligado';
        document.getElementById("veiculoStatusDisplay").className = 'status-desligado';

        const displayTurbo = document.getElementById("displayTurbo");
        if(displayTurbo) displayTurbo.style.display = 'none';

        const displayCarga = document.getElementById("displayCarga");
        if(displayCarga) displayCarga.style.display = 'none';

        const qtdCargaInput = document.getElementById("quantidadeCarga");
        if(qtdCargaInput) qtdCargaInput.disabled = true;

        const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo');
        if (detalhesExtrasDiv) {
             detalhesExtrasDiv.innerHTML = '<p>Selecione um veículo e clique em "Ver Detalhes" para mais informações.</p>';
             detalhesExtrasDiv.className = 'detalhes-extras-box';
        }
    }

    interagir(acao, valor) {
        if (!this.veiculoSelecionado) {
            this.exibirMensagemGlobal("Selecione um veículo primeiro!", 'erro');
            return;
        }
        let sucessoAcao = true;
        try {
            switch (acao) {
                case "ligar": this.veiculoSelecionado.ligar(); break;
                case "desligar": this.veiculoSelecionado.desligar(); break;
                case "acelerar": this.veiculoSelecionado.acelerar(10); break;
                case "frear": this.veiculoSelecionado.frear(10); break;
                case "buzinar": this.veiculoSelecionado.buzinar(); break;
                case "ativarTurbo":
                    if (this.veiculoSelecionado instanceof CarroEsportivo) {
                        this.veiculoSelecionado.ativarTurbo();
                    } else {
                        this.veiculoSelecionado.exibirMensagem("Este veículo não tem turbo!", 'aviso');
                        sucessoAcao = false;
                    }
                    break;
                case "desativarTurbo":
                     if (this.veiculoSelecionado instanceof CarroEsportivo) {
                        this.veiculoSelecionado.desativarTurbo();
                     } else {
                         sucessoAcao = false; // Ação não aplicável
                     }
                     break;
                case "carregar":
                case "descarregar":
                    if (this.veiculoSelecionado instanceof Caminhao) {
                        const inputQtd = document.getElementById('quantidadeCarga');
                        const quantidade = (valor !== undefined && !isNaN(parseInt(valor)) && parseInt(valor) > 0)
                                             ? parseInt(valor)
                                             : (!isNaN(parseInt(inputQtd?.value)) && parseInt(inputQtd.value) > 0 ? parseInt(inputQtd.value) : 0);

                         if (quantidade > 0) {
                             sucessoAcao = (acao === 'carregar')
                                            ? this.veiculoSelecionado.carregar(quantidade)
                                            : this.veiculoSelecionado.descarregar(quantidade);
                         } else {
                             this.veiculoSelecionado.exibirMensagem(`Informe uma quantidade válida para ${acao}.`, 'erro');
                             sucessoAcao = false;
                         }
                    } else {
                        this.veiculoSelecionado.exibirMensagem(`Este veículo não pode ser ${acao}do!`, 'aviso');
                        sucessoAcao = false;
                    }
                    break;
                default:
                    console.warn("Ação inválida ou desconhecida:", acao);
                    this.exibirMensagemGlobal("Ação desconhecida.", 'erro');
                    sucessoAcao = false;
            }

            this.atualizarDisplayGeral();
            if (sucessoAcao) {
                salvarGaragem();
            }

        } catch (error) {
            console.error("Erro durante a interação:", acao, error);
             this.exibirMensagemGlobal(`Erro ao ${acao}: ${error.message}`, 'erro');
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
            if(infoDiv) infoDiv.innerHTML = this.veiculoSelecionado.getInformacoesHtml();
            this.veiculoSelecionado.atualizarDisplay(); // Atualiza velocímetro, status, turbo/carga específicos
            if(historicoDiv) historicoDiv.innerHTML = this.veiculoSelecionado.getHistoricoFormatado();
            if(agendamentosDiv) agendamentosDiv.innerHTML = this.veiculoSelecionado.getAgendamentosFormatados();

            if(displayTurbo) displayTurbo.style.display = this.veiculoSelecionado instanceof CarroEsportivo ? 'block' : 'none';
            if(displayCarga) displayCarga.style.display = this.veiculoSelecionado instanceof Caminhao ? 'block' : 'none';
            if(inputQtdCarga) inputQtdCarga.disabled = !(this.veiculoSelecionado instanceof Caminhao);
        } else {
            this.limparDisplays();
        }
         this.gerenciarBotoesAcao();
         verificarNotificacoesAgendamento();
    }

    atualizarSeletorVeiculos() {
        const selectVeiculo = document.getElementById('manutencaoVeiculo');
        const fieldsetAgendamento = document.getElementById('fieldsetAgendamento');
        if (!selectVeiculo || !fieldsetAgendamento) {
             console.warn("Elemento select 'manutencaoVeiculo' ou fieldset 'fieldsetAgendamento' não encontrado.");
             return;
        }

        const valorSelecionadoAnteriormente = this.veiculoSelecionado ? this.veiculoSelecionado.id : selectVeiculo.value;
        selectVeiculo.innerHTML = '<option value="">-- Selecione --</option>';

        if (this.veiculos.length > 0) {
            this.veiculos.forEach(veiculo => {
                const option = document.createElement('option');
                option.value = veiculo.id;
                option.textContent = `${veiculo.modelo} (${veiculo.constructor.name})`;
                selectVeiculo.appendChild(option);
            });

            selectVeiculo.value = valorSelecionadoAnteriormente;
            if (!selectVeiculo.value && this.veiculoSelecionado) {
                selectVeiculo.value = this.veiculoSelecionado.id;
            } else if (!selectVeiculo.value){
                 selectVeiculo.value = "";
            }
            fieldsetAgendamento.disabled = false;
        } else {
            selectVeiculo.innerHTML = '<option value="">-- Nenhum veículo --</option>';
            fieldsetAgendamento.disabled = true;
        }
    }

     gerenciarBotoesAcao() {
         const veiculo = this.veiculoSelecionado;
         const nenhumSelecionado = !veiculo;

         const setDisabled = (id, condition) => {
             const btn = document.getElementById(id);
             if (btn) btn.disabled = condition;
         };

         setDisabled('acaoLigarBtn', nenhumSelecionado || veiculo?.ligado);
         setDisabled('acaoDesligarBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade > 0);
         setDisabled('acaoAcelerarBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade >= veiculo?.maxVelocidadeDisplay);
         setDisabled('acaoFrearBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade === 0);
         setDisabled('acaoBuzinarBtn', nenhumSelecionado);

         const ehEsportivo = veiculo instanceof CarroEsportivo;
         setDisabled('acaoAtivarTurboBtn', !(ehEsportivo && veiculo?.ligado && !veiculo?.turboAtivado));
         setDisabled('acaoDesativarTurboBtn', !(ehEsportivo && veiculo?.turboAtivado));

         const ehCaminhao = veiculo instanceof Caminhao;
         const inputQtdCarga = document.getElementById('quantidadeCarga');
         setDisabled('acaoCarregarBtn', !(ehCaminhao && veiculo?.cargaAtual < veiculo?.capacidadeCarga));
         setDisabled('acaoDescarregarBtn', !(ehCaminhao && veiculo?.cargaAtual > 0));
         if (inputQtdCarga) inputQtdCarga.disabled = !ehCaminhao;
     }

    atualizarListaVeiculosVisivel() {
        const container = document.getElementById('selecaoVeiculosContainer');
        if (!container) {
            console.error("Container #selecaoVeiculosContainer não encontrado!");
            return;
        }
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

            let imgUrl = 'img/CarroMoranguinho.jpg'; // Default
            if (veiculo instanceof CarroEsportivo) imgUrl = 'img/CarroEsportivo.jpg';
            else if (veiculo instanceof Caminhao) imgUrl = 'img/Caminhao.jpg';

            divVeiculo.innerHTML = `
                <img src="${imgUrl}" alt="${veiculo.modelo}" onerror="this.onerror=null; this.src='img/default.png'; this.alt='Imagem Padrão';">
                <p>${veiculo.modelo}</p>
                <span style="font-size: 0.8em; color: #555;">(${veiculo.constructor.name})</span>
                <div>
                   <button class="btn-selecionar-veiculo" data-id="${veiculo.id}">Selecionar</button>
                   <button class="btn-ver-detalhes" data-modelo="${veiculo.modelo}">Ver Detalhes</button>
                </div>
            `;

            const btnSelecionar = divVeiculo.querySelector('.btn-selecionar-veiculo');
            if(btnSelecionar) {
                btnSelecionar.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    this.selecionarVeiculo(id); // 'this' aqui é a instância de Garagem
                });
            }

            const btnDetalhes = divVeiculo.querySelector('.btn-ver-detalhes');
            if(btnDetalhes) {
                btnDetalhes.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const modelo = e.target.getAttribute('data-modelo');
                    const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo');

                    if (!modelo || !detalhesExtrasDiv) {
                        console.error("Não foi possível obter o modelo ou a div de detalhes (#detalhesExtrasVeiculo).");
                        this.exibirMensagemGlobal("Erro interno ao tentar ver detalhes do veículo.", "erro"); // 'this' aqui é a instância de Garagem
                        return;
                    }

                    detalhesExtrasDiv.innerHTML = `<p>Carregando detalhes extras para ${modelo}...</p>`;
                    detalhesExtrasDiv.className = 'detalhes-extras-box loading';

                    try {
                        const detalhes = await buscarDetalhesVeiculoAPI(modelo);
                        if (detalhes) {
                            let htmlDetalhes = `<h3>Informações Adicionais: ${modelo}</h3><ul>`;
                            Object.entries(detalhes).forEach(([chave, valor]) => {
                                if (valor !== null && valor !== undefined && valor !== '') {
                                    let chaveFormatada = chave.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    if (chave === 'identificador') return; // Pula 'identificador' da API

                                    let valorFormatado = valor;
                                    if (typeof valor === 'boolean') {
                                         valorFormatado = valor ? '<strong style="color: green;">Sim</strong>' : '<span style="color: #cc8400;">Não</span>';
                                    }
                                    if (chave === 'recallPendente' && valor === true) {
                                        htmlDetalhes += `<li style="color: red; font-weight: bold;"><strong>${chaveFormatada}:</strong> ${valorFormatado} ${detalhes.descricaoRecall ? `(${detalhes.descricaoRecall})` : ''}</li>`;
                                    } else if (chave !== 'descricaoRecall') {
                                        htmlDetalhes += `<li><strong>${chaveFormatada}:</strong> ${valorFormatado}</li>`;
                                    }
                                }
                            });
                            htmlDetalhes += '</ul>';
                            detalhesExtrasDiv.innerHTML = htmlDetalhes;
                            detalhesExtrasDiv.className = 'detalhes-extras-box';
                        } else {
                            detalhesExtrasDiv.innerHTML = `<p>Nenhum detalhe extra encontrado para ${modelo} na API.</p>`;
                            detalhesExtrasDiv.className = 'detalhes-extras-box info';
                        }
                    } catch (error) {
                         console.error("Erro ao buscar ou exibir detalhes da API de veículos:", error);
                         detalhesExtrasDiv.innerHTML = `<p>Erro ao carregar detalhes para ${modelo}: ${error.message}. Verifique o console.</p>`;
                         detalhesExtrasDiv.className = 'detalhes-extras-box error';
                    }
                });
            }
            container.appendChild(divVeiculo);
        });
    }

    exibirMensagemGlobal(mensagem, tipo = 'info') {
        // Reutiliza o método de exibir mensagem do protótipo de Carro,
        // mas chamando-o com um 'this' genérico (já que #mensagemStatus é global)
        Carro.prototype.exibirMensagem.call({ /* this pode ser vazio aqui */ }, mensagem, tipo);
    }
}

// --- FIM DAS CLASSES DA GARAGEM ---

// --- FUNÇÃO ASSÍNCRONA PARA BUSCAR DETALHES DOS VEÍCULOS (API LOCAL SIMULADA) ---
/**
 * @async
 * @function buscarDetalhesVeiculoAPI
 * @description Busca detalhes adicionais de um veículo em uma fonte de dados externa (simulada por JSON local).
 * @param {string} identificadorVeiculo - O identificador único do veículo (neste caso, o modelo) para buscar na API simulada.
 * @returns {Promise<object|null>} Uma Promise que resolve com o objeto contendo os detalhes do veículo encontrado, ou null se não encontrado.
 * @throws {Error} Lança um erro se ocorrer um problema na busca (rede, status HTTP não OK, erro de parse JSON).
 */
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    const apiUrl = './dados_veiculos_api.json'; // Caminho para o arquivo JSON local
    console.log(`Buscando detalhes do veículo: ${identificadorVeiculo} em ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, { cache: "no-cache" }); // Evita cache

        if (!response.ok) {
            console.error(`Erro HTTP ao buscar API de veículos: ${response.status} ${response.statusText}`);
            throw new Error(`Falha ao carregar dados da API de veículos (Status: ${response.status})`);
        }

        const dadosApi = await response.json();
        const detalhesVeiculo = dadosApi.find(veiculo =>
            veiculo.identificador.toLowerCase() === identificadorVeiculo.toLowerCase()
        );

        if (detalhesVeiculo) {
            console.log("Detalhes do veículo encontrados:", detalhesVeiculo);
            return detalhesVeiculo;
        } else {
            console.log(`Nenhum detalhe extra encontrado para o identificador do veículo: ${identificadorVeiculo}`);
            return null;
        }

    } catch (error) {
        console.error("Erro na função buscarDetalhesVeiculoAPI:", error);
        throw error; // Relança para ser tratado no listener do botão
    }
}


// --- LOCALSTORAGE E INICIALIZAÇÃO DA GARAGEM ---
const CHAVE_LOCALSTORAGE = 'garagemDataIFPR_v3';
const garagem = new Garagem();

function salvarGaragem() {
    try {
        const garagemParaSalvar = garagem.veiculos.map(v => v.toJSON());
        localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(garagemParaSalvar));
        console.log("Garagem salva no LocalStorage.");
    } catch (error) {
        console.error("Erro CRÍTICO ao salvar garagem no LocalStorage:", error);
        garagem.exibirMensagemGlobal("ERRO GRAVE: Não foi possível salvar os dados da garagem. Verifique o console.", 'erro');
    }
}

function carregarGaragem() {
    const dadosSalvos = localStorage.getItem(CHAVE_LOCALSTORAGE);
    let veiculosRecuperados = [];

    if (dadosSalvos) {
        try {
            const veiculosSalvos = JSON.parse(dadosSalvos);
            veiculosRecuperados = veiculosSalvos.map(dadosVeiculo => {
                if (!dadosVeiculo || !dadosVeiculo.id || !dadosVeiculo.tipoVeiculo || !dadosVeiculo.modelo) {
                    console.warn("Registro de veículo inválido encontrado no localStorage, pulando:", dadosVeiculo);
                    return null;
                }
                let veiculo;
                const historico = dadosVeiculo.historicoManutencao?.map(m => {
                     try {
                         return new Manutencao(m.data, m.tipo, m.custo, m.descricao);
                     } catch (e) {
                         console.warn("Erro ao recriar manutenção a partir de dados salvos:", m, e);
                         return null;
                     }
                 }).filter(m => m !== null) || [];

                switch (dadosVeiculo.tipoVeiculo) {
                    case 'CarroEsportivo':
                        veiculo = new CarroEsportivo(dadosVeiculo.modelo, dadosVeiculo.cor);
                        veiculo.turboAtivado = dadosVeiculo.turboAtivado || false;
                        break;
                    case 'Caminhao':
                        veiculo = new Caminhao(dadosVeiculo.modelo, dadosVeiculo.cor, dadosVeiculo.capacidadeCarga);
                        veiculo.cargaAtual = dadosVeiculo.cargaAtual || 0;
                        break;
                    case 'Carro':
                    default:
                        veiculo = new Carro(dadosVeiculo.modelo, dadosVeiculo.cor);
                        break;
                }
                 veiculo.id = dadosVeiculo.id;
                 veiculo.velocidade = dadosVeiculo.velocidade || 0;
                 veiculo.ligado = dadosVeiculo.ligado || false;
                 if(dadosVeiculo.maxVelocidadeDisplay) veiculo.maxVelocidadeDisplay = dadosVeiculo.maxVelocidadeDisplay;
                 veiculo.historicoManutencao = historico;
                return veiculo;
            }).filter(v => v !== null);
            console.log(`${veiculosRecuperados.length} veículos carregados do LocalStorage.`);
        } catch (error) {
            console.error("Erro CRÍTICO ao carregar/parsear garagem do LocalStorage:", error);
            garagem.exibirMensagemGlobal("Erro ao carregar dados salvos. Alguns dados podem ter sido perdidos. Verifique o console.", 'erro');
            veiculosRecuperados = [];
        }
    } else {
         console.log("Nenhum dado salvo encontrado no LocalStorage. Iniciando com padrões.");
    }

    garagem.veiculos = [];
    veiculosRecuperados.forEach(v => garagem.adicionarVeiculo(v));
    garantirVeiculosPadrao(); // Adiciona padrões se necessário e salva
    garagem.atualizarDisplayGeral(); // Atualiza toda a UI
    console.log(`Garagem inicializada com ${garagem.veiculos.length} veículos.`);
}

function garantirVeiculosPadrao() {
    const modelosPadrao = {
        "Moranguinho": () => new Carro("Moranguinho", "Rosa"),
        "Veloz": () => new CarroEsportivo("Veloz", "Vermelho"),
        "Brutus": () => new Caminhao("Brutus", "Azul", 1200)
    };
    let algumPadraoAdicionado = false;
    for (const modelo in modelosPadrao) {
        if (!garagem.veiculos.some(v => v.modelo === modelo)) {
            console.log(`Veículo padrão "${modelo}" não encontrado na garagem. Adicionando...`);
            const criarVeiculoFn = modelosPadrao[modelo];
            const novoVeiculoPadrao = criarVeiculoFn();
            garagem.adicionarVeiculo(novoVeiculoPadrao); // Adiciona à lista interna
            algumPadraoAdicionado = true;
        }
    }
    if (algumPadraoAdicionado) {
        console.log("Veículos padrão foram adicionados/restaurados.");
        salvarGaragem(); // Salva o estado com os novos padrões
        // A UI será atualizada no final de carregarGaragem ou pode forçar aqui se necessário
        // garagem.atualizarDisplayGeral();
        // Exibe mensagem APENAS se algum padrão foi adicionado, para não ser repetitivo
        garagem.exibirMensagemGlobal("Veículos padrão restaurados/adicionados.", "info");
    }
}

// --- FUNÇÕES DE ATUALIZAÇÃO DE DISPLAY (Histórico/Agendamentos) ---
// Estas funções são chamadas por garagem.atualizarDisplayGeral()
function atualizarDisplayManutencao(veiculo) { // Chamada indiretamente
    const historicoDiv = document.getElementById('historicoManutencao');
    if (historicoDiv) {
        historicoDiv.innerHTML = veiculo ? veiculo.getHistoricoFormatado() : "<p>Selecione um veículo.</p>";
    }
}
function atualizarDisplayAgendamentos(veiculo) { // Chamada indiretamente
    const agendamentosDiv = document.getElementById('agendamentosFuturos');
    if (agendamentosDiv) {
         agendamentosDiv.innerHTML = veiculo ? veiculo.getAgendamentosFormatados() : "<p>Selecione um veículo.</p>";
    }
}

// --- NOTIFICAÇÕES DE AGENDAMENTO ---
let notificacoesMostradasNestaSessao = new Set();
function verificarNotificacoesAgendamento() {
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setUTCDate(hoje.getUTCDate() + 1);
    let algumaNotificacaoNova = false;

    garagem.veiculos.forEach(veiculo => {
        veiculo.historicoManutencao.forEach(manutencao => {
            if (manutencao.isFutura()) {
                 const dataManutencaoComp = new Date(manutencao.data.getTime());
                 dataManutencaoComp.setUTCHours(0, 0, 0, 0);
                 const idNotificacao = `${veiculo.id}_${manutencao.data.toISOString().substring(0, 10)}`;

                 if (!notificacoesMostradasNestaSessao.has(idNotificacao)) {
                     let msg = null;
                     let tipo = 'info';
                     if (dataManutencaoComp.getTime() === hoje.getTime()) {
                        msg = `🔔 HOJE: ${manutencao.tipo} para ${veiculo.modelo}.`;
                        tipo = 'aviso';
                        algumaNotificacaoNova = true;
                     } else if (dataManutencaoComp.getTime() === amanha.getTime()) {
                        msg = `🔔 AMANHÃ: ${manutencao.tipo} para ${veiculo.modelo}.`;
                        tipo = 'info';
                        algumaNotificacaoNova = true;
                     }
                     if (msg) {
                         garagem.exibirMensagemGlobal(msg, tipo);
                         notificacoesMostradasNestaSessao.add(idNotificacao);
                     }
                 }
            }
        });
    });
    if (algumaNotificacaoNova) {
        console.log("Notificações de agendamento verificadas e exibidas.");
    }
}

// --- EVENT LISTENERS DA GARAGEM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Iniciando aplicação Garagem Virtual.");
    carregarGaragem(); // Carrega a garagem e atualiza a UI inicial

    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log("Formulário de agendamento enviado.");
            const idVeiculo = document.getElementById('manutencaoVeiculo').value;
            const dataInput = document.getElementById('manutencaoData').value;
            const tipo = document.getElementById('manutencaoTipo').value;
            const custoStr = document.getElementById('manutencaoCusto').value;
            const descricao = document.getElementById('manutencaoDescricao').value;

            if (!idVeiculo) {
                garagem.exibirMensagemGlobal("Selecione um veículo válido para agendar/registrar.", 'erro'); return;
            }
            const veiculoParaAgendar = garagem.veiculos.find(v => v.id === idVeiculo);
            if (!veiculoParaAgendar) {
                garagem.exibirMensagemGlobal("Veículo selecionado não encontrado na garagem.", 'erro'); return;
            }
            if (!dataInput || !tipo || !custoStr) {
                 garagem.exibirMensagemGlobal("Preencha Data, Tipo e Custo da manutenção.", 'erro'); return;
            }
            const custo = parseFloat(custoStr);
             if (isNaN(custo) || custo < 0) {
                 garagem.exibirMensagemGlobal("O custo da manutenção deve ser um número válido maior ou igual a zero.", 'erro'); return;
             }
             try {
                const novaManutencao = new Manutencao(dataInput, tipo, custo, descricao);
                veiculoParaAgendar.adicionarManutencao(novaManutencao);
                salvarGaragem();
                const acaoRealizada = novaManutencao.isFutura() ? 'agendada' : 'registrada';
                garagem.exibirMensagemGlobal(`Manutenção '${tipo}' ${acaoRealizada} para ${veiculoParaAgendar.modelo}!`, 'sucesso');
                if (garagem.veiculoSelecionado && garagem.veiculoSelecionado.id === veiculoParaAgendar.id) {
                    // A função atualizarDisplayGeral já cuida de atualizar histórico/agendamentos se o veículo estiver selecionado
                    garagem.atualizarDisplayGeral(); // Isso re-renderiza a lista de manutenção/agendamentos
                }
                 formAgendamento.reset();
                 document.getElementById('manutencaoVeiculo').value = ""; // Limpa o select
             } catch (error) {
                 console.error("Erro ao criar/agendar manutenção:", error);
                 garagem.exibirMensagemGlobal(`Erro ao agendar: ${error.message}`, 'erro');
             }
        });
    } else {
        console.error("CRÍTICO: Formulário #formAgendamento não encontrado no HTML!");
    }

    document.getElementById("acaoLigarBtn")?.addEventListener("click", () => garagem.interagir("ligar"));
    document.getElementById("acaoDesligarBtn")?.addEventListener("click", () => garagem.interagir("desligar"));
    document.getElementById("acaoAcelerarBtn")?.addEventListener("click", () => garagem.interagir("acelerar"));
    document.getElementById("acaoFrearBtn")?.addEventListener("click", () => garagem.interagir("frear"));
    document.getElementById("acaoBuzinarBtn")?.addEventListener("click", () => garagem.interagir("buzinar"));
    document.getElementById("acaoAtivarTurboBtn")?.addEventListener("click", () => garagem.interagir("ativarTurbo"));
    document.getElementById("acaoDesativarTurboBtn")?.addEventListener("click", () => garagem.interagir("desativarTurbo"));
    document.getElementById("acaoCarregarBtn")?.addEventListener("click", () => garagem.interagir("carregar"));
    document.getElementById("acaoDescarregarBtn")?.addEventListener("click", () => garagem.interagir("descarregar"));

    const setupVolumeControl = (controlId, audioProperty) => {
        const control = document.getElementById(controlId);
        if (control) {
            const setVolumeForAll = (volume) => {
                 garagem.veiculos.forEach(v => {
                    if (v[audioProperty] && typeof v[audioProperty].volume !== 'undefined') {
                        v[audioProperty].volume = volume;
                    }
                 });
                 if (audioProperty === 'somAcelerando' && garagem.veiculoSelecionado?.ligado && garagem.veiculoSelecionado.somAcelerando && !garagem.veiculoSelecionado.somAcelerando.paused) {
                      garagem.veiculoSelecionado.somAcelerando.volume = garagem.veiculoSelecionado._calcularVolumeAceleracao();
                 }
            };
            control.addEventListener("input", function() {
                 setVolumeForAll(parseFloat(this.value));
            });
            setVolumeForAll(parseFloat(control.value)); // Define o volume inicial
        } else {
            console.warn(`Controle de volume com ID ${controlId} não encontrado.`);
        }
    };
    setupVolumeControl("volumeBuzina", "somBuzina");
    setupVolumeControl("volumeAceleracao", "somAcelerando");
    setupVolumeControl("volumeFreio", "somFreio");

    console.log("Aplicação Garagem Virtual inicializada e listeners da garagem configurados.");
    verificarNotificacoesAgendamento(); // Verifica notificações uma vez no carregamento

    // INICIALIZA O TÍTULO DA PREVISÃO DO TEMPO
    atualizarTituloPrevisao(null, numDiasPrevisaoSelecionado);
});


// --- INÍCIO DA SEÇÃO DE PREVISÃO DO TEMPO ---

const cidadeInputElement = document.getElementById('cidadeInput');
const verificarClimaBtnElement = document.getElementById('verificarClimaBtn');
const previsaoTempoResultadoElement = document.getElementById('previsaoTempoResultado');
const climaMensagemStatusElement = document.getElementById('climaMensagemStatus');

// NOVO: Variáveis para controle de dias e armazenamento da última previsão
let numDiasPrevisaoSelecionado = 5; // Padrão: 5 dias
let ultimaPrevisaoCompletaProcessada = null; // Armazena a previsão completa (5-6 dias)
let ultimaCidadePesquisada = null; // Armazena a última cidade pesquisada

const tituloPrevisaoTempoElement = document.getElementById('tituloPrevisaoTempo'); // Pega o elemento do título

/**
 * Atualiza o título principal da seção de previsão do tempo.
 * @param {string | null} nomeCidade - Nome da cidade, ou null se nenhuma cidade estiver carregada.
 * @param {number} numDias - Número de dias para exibir no título.
 */
function atualizarTituloPrevisao(nomeCidade, numDias) {
    if (tituloPrevisaoTempoElement) {
        let textoTitulo = `Previsão do Tempo (${numDias} dia${numDias > 1 ? 's' : ''})`;
        if (nomeCidade) {
            const nomeCidadeFormatado = nomeCidade.charAt(0).toUpperCase() + nomeCidade.slice(1);
            textoTitulo += ` para ${nomeCidadeFormatado}`;
        }
        tituloPrevisaoTempoElement.textContent = textoTitulo;
    }
}


/**
 * Exibe uma mensagem na área de status da previsão do tempo.
 * @param {string} mensagem - A mensagem a ser exibida.
 * @param {'info' | 'erro' | 'sucesso' | 'aviso'} [tipo='info'] - O tipo da mensagem para estilização.
 */
function exibirMensagemClima(mensagem, tipo = 'info') {
    if (climaMensagemStatusElement) {
        climaMensagemStatusElement.textContent = mensagem;
        climaMensagemStatusElement.className = `mensagem ${tipo}`;
        climaMensagemStatusElement.style.display = 'block';

        clearTimeout(climaMensagemStatusElement.timeoutId);

        if (tipo === 'erro' || tipo === 'aviso' || tipo === 'info') {
            climaMensagemStatusElement.timeoutId = setTimeout(() => {
                if (climaMensagemStatusElement.textContent === mensagem) {
                    climaMensagemStatusElement.textContent = "";
                    climaMensagemStatusElement.style.display = 'none';
                    climaMensagemStatusElement.className = 'mensagem';
                    delete climaMensagemStatusElement.timeoutId;
                }
            }, 7000); // Tempo para mensagens não-sucesso desaparecerem
        }
    } else {
        console.warn("Elemento #climaMensagemStatus não encontrado para exibir: ", mensagem);
        alert(`${tipo.toUpperCase()}: ${mensagem}`);
    }
}

/**
 * @async
 * @function buscarPrevisaoDetalhada
 * @description Busca a previsão do tempo de 5 dias / 3 horas para uma cidade.
 * @param {string} cidade - O nome da cidade.
 * @returns {Promise<object|null>} Dados da API ou null em erro.
 * @throws {Error} Se a API Key não estiver configurada ou houver erro na API.
 */
async function buscarPrevisaoDetalhada(cidade) {
// COLE ESTE BLOCO DE CÓDIGO DENTRO DA FUNÇÃO buscarPrevisaoDetalhada

    console.log("[Frontend] Iniciando buscarPrevisaoDetalhada para:", cidade);
    
    // A URL agora aponta para o seu servidor backend
    // Atenção à porta! Deve ser a porta do seu server.js (3001 por padrão)
    const backendUrl = `https://carro-digital-pedro.onrender.com/api/previsao/${encodeURIComponent(cidade)}`;
    console.log("[Frontend] URL do backend:", backendUrl);

    if (previsaoTempoResultadoElement) previsaoTempoResultadoElement.innerHTML = `<p class="carregando-clima">Carregando previsão para ${cidade}...</p>`;
    if (climaMensagemStatusElement) climaMensagemStatusElement.style.display = 'none'; // Esconde mensagens antigas
    if(verificarClimaBtnElement) verificarClimaBtnElement.disabled = true;
    if(cidadeInputElement) cidadeInputElement.disabled = true;
     // Atualiza o título para mostrar que está carregando para a cidade, com o número de dias já selecionado
    atualizarTituloPrevisao(cidade, numDiasPrevisaoSelecionado);


    try {
        const response = await fetch(backendUrl);

        if (!response.ok) {
            // Tenta pegar a mensagem de erro do JSON retornado pelo backend
            const errorData = await response.json().catch(() => ({ error: `Erro HTTP ${response.status} do servidor.` }));
            console.error(`[Frontend] Erro na resposta do backend: ${response.status}`, errorData);
            throw new Error(errorData.error || `Erro ${response.status} ao buscar previsão no servidor.`);
        }

        const data = await response.json();
        console.log("[Frontend] Dados da previsão recebidos do backend:", data);

        // A lógica de processarDadosForecast e exibirPrevisaoDetalhada continua a mesma,
        // pois o formato dos dados da OpenWeatherMap não mudou.
        return data; // Retorna os dados brutos para serem processados externamente

    } catch (error) {
        console.error("[Frontend] Erro ao buscar previsão via backend:", error);
        // A exibição de mensagem de erro agora é feita no event listener do botão
        throw error; // Relança o erro para ser tratado no event listener
    } finally {
         if(verificarClimaBtnElement) verificarClimaBtnElement.disabled = false;
         if(cidadeInputElement) cidadeInputElement.disabled = false;
    }

// FIM DO BLOCO A SER COLADO
}

/**
 * @function processarDadosForecast
 * @description Processa os dados da API de forecast.
 * @param {object} dataApi - Dados da API.
 * @returns {Array<object>|null} Array de dias com dados resumidos, ou null.
 */
function processarDadosForecast(dataApi) {
    if (!dataApi || !dataApi.list || !Array.isArray(dataApi.list) || dataApi.list.length === 0) {
        console.error("[CLIMA ERRO] Dados da API de forecast inválidos ou lista vazia.", dataApi);
        return null;
    }

    const previsoesPorDia = {};
    dataApi.list.forEach(item => {
        const dia = item.dt_txt.split(' ')[0]; // "AAAA-MM-DD"
        if (!previsoesPorDia[dia]) {
            previsoesPorDia[dia] = {
                dataISO: dia,
                entradas: []
            };
        }
        previsoesPorDia[dia].entradas.push({
            temp_min_item: item.main.temp_min,
            temp_max_item: item.main.temp_max,
            descricao: item.weather[0].description,
            icone: item.weather[0].icon
        });
    });

    const resultadoFinal = [];
    const diasOrdenados = Object.keys(previsoesPorDia).sort();

    for (const diaKey of diasOrdenados) {
        const diaAgrupado = previsoesPorDia[diaKey];
        if (!diaAgrupado.entradas || diaAgrupado.entradas.length === 0) continue;

        let tempMinDia = Infinity;
        let tempMaxDia = -Infinity;
        const previsaoRepresentativa = diaAgrupado.entradas[0];

        diaAgrupado.entradas.forEach(entrada => {
            if (entrada.temp_min_item < tempMinDia) tempMinDia = entrada.temp_min_item;
            if (entrada.temp_max_item > tempMaxDia) tempMaxDia = entrada.temp_max_item;
        });
        
        const dataObj = new Date(diaAgrupado.dataISO + 'T12:00:00Z');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
        const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();

        resultadoFinal.push({
            data: `${diaSemana}, ${dataFormatada}`,
            temp_min: Math.round(tempMinDia),
            temp_max: Math.round(tempMaxDia),
            descricao: previsaoRepresentativa.descricao.charAt(0).toUpperCase() + previsaoRepresentativa.descricao.slice(1),
            icone: previsaoRepresentativa.icone
        });
    }
    console.log("[CLIMA DEBUG] Previsão processada:", resultadoFinal);
    return resultadoFinal.length > 0 ? resultadoFinal : null;
}

/**
 * @function exibirPrevisaoDetalhada
 * @description Exibe a previsão na UI para um número específico de dias.
 * @param {Array<object>} previsaoDiariaProcessadaCompleta - Array de todos os dias processados (geralmente 5-6 dias).
 * @param {string} nomeCidade - Nome da cidade.
 * @param {number} numDiasExibir - Número de dias que o usuário quer ver.
 */
function exibirPrevisaoDetalhada(previsaoDiariaProcessadaCompleta, nomeCidade, numDiasExibir) {
    if (!previsaoTempoResultadoElement) {
        console.error("[CLIMA ERRO] Elemento #previsaoTempoResultado não encontrado para exibir.");
        return;
    }
    previsaoTempoResultadoElement.innerHTML = ''; // Limpa antes

    // Atualiza o título principal da seção
    atualizarTituloPrevisao(nomeCidade, numDiasExibir);

    if (!previsaoDiariaProcessadaCompleta || previsaoDiariaProcessadaCompleta.length === 0) {
        previsaoTempoResultadoElement.innerHTML = `<p>Não há dados de previsão para exibir para ${nomeCidade.charAt(0).toUpperCase() + nomeCidade.slice(1)}.</p>`;
        return;
    }

    // Fatia a previsão para o número de dias desejado pelo usuário
    const previsaoParaExibir = previsaoDiariaProcessadaCompleta.slice(0, numDiasExibir);

    if (previsaoParaExibir.length === 0) {
        previsaoTempoResultadoElement.innerHTML = `<p>Não há dados de previsão suficientes para exibir ${numDiasExibir} dia(s) para ${nomeCidade.charAt(0).toUpperCase() + nomeCidade.slice(1)}.</p>`;
        return;
    }

    const containerCards = document.createElement('div');
    containerCards.className = 'clima-cards-wrapper';
    previsaoParaExibir.forEach(dia => {
        const cardDia = document.createElement('div');
        cardDia.className = 'clima-card-dia';
        cardDia.innerHTML = `
            <h4>${dia.data}</h4>
            <img src="https://openweathermap.org/img/wn/${dia.icone}@2x.png" alt="${dia.descricao}" title="${dia.descricao}">
            <p class="temperaturas">
                <span class="temp-max">${dia.temp_max}°C</span> / 
                <span class="temp-min">${dia.temp_min}°C</span>
            </p>
            <p class="descricao-clima">${dia.descricao}</p>
        `;
        containerCards.appendChild(cardDia);
    });
    previsaoTempoResultadoElement.appendChild(containerCards);
}

// Event listener para o botão de verificar clima
if (verificarClimaBtnElement && cidadeInputElement) {
    verificarClimaBtnElement.addEventListener('click', async () => {
        const cidade = cidadeInputElement.value.trim();
        if (!cidade) {
            exibirMensagemClima("Por favor, digite o nome de uma cidade.", "aviso");
            cidadeInputElement.focus();
            return;
        }

        if (previsaoTempoResultadoElement) previsaoTempoResultadoElement.innerHTML = `<p class="carregando-clima">Carregando previsão para ${cidade}...</p>`;
        if (climaMensagemStatusElement) climaMensagemStatusElement.style.display = 'none';
        verificarClimaBtnElement.disabled = true;
        cidadeInputElement.disabled = true;
        // Atualiza o título para mostrar que está carregando para a cidade, com o número de dias já selecionado
        atualizarTituloPrevisao(cidade, numDiasPrevisaoSelecionado);


        try {
            const dadosBrutos = await buscarPrevisaoDetalhada(cidade);
            const previsaoProcessadaCompleta = processarDadosForecast(dadosBrutos); // Processa todos os dias disponíveis

            if (previsaoProcessadaCompleta && previsaoProcessadaCompleta.length > 0) {
                ultimaPrevisaoCompletaProcessada = previsaoProcessadaCompleta; // Armazena a previsão completa
                ultimaCidadePesquisada = cidade; // Armazena a cidade
                // Exibe a previsão com o número de dias atualmente selecionado
                exibirPrevisaoDetalhada(ultimaPrevisaoCompletaProcessada, ultimaCidadePesquisada, numDiasPrevisaoSelecionado);
            } else {
                ultimaPrevisaoCompletaProcessada = null;
                ultimaCidadePesquisada = null;
                exibirMensagemClima(`Não foi possível processar os dados da previsão para ${cidade}, ou não há informações disponíveis.`, "info");
                if (previsaoTempoResultadoElement) previsaoTempoResultadoElement.innerHTML = `<p>Sem previsão detalhada disponível para ${cidade}.</p>`;
                atualizarTituloPrevisao(null, numDiasPrevisaoSelecionado); // Reseta título se não houver dados
            }
        } catch (error) {
            ultimaPrevisaoCompletaProcessada = null;
            ultimaCidadePesquisada = null;
            console.error("[CLIMA ERRO] Erro no fluxo de verificação do clima (event listener):", error.message);
            exibirMensagemClima(`Erro: ${error.message || 'Falha desconhecida ao buscar previsão.'}`, "erro");
            if (previsaoTempoResultadoElement) previsaoTempoResultadoElement.innerHTML = `<p>Ocorreu um erro ao buscar a previsão. Tente novamente.</p>`;
            atualizarTituloPrevisao(null, numDiasPrevisaoSelecionado); // Reseta título em caso de erro
        } finally {
            verificarClimaBtnElement.disabled = false;
            cidadeInputElement.disabled = false;
        }
    });

    cidadeInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            verificarClimaBtnElement.click();
        }
    });
} else {
    console.warn("Elementos da UI de previsão do tempo não encontrados (#cidadeInput, #verificarClimaBtn, etc.).");
}

// NOVO: Event Listeners para os botões de seleção de dias
const botoesDiasPrevisao = document.querySelectorAll('.btn-dias-previsao');
if (botoesDiasPrevisao.length > 0) {
    botoesDiasPrevisao.forEach(botao => {
        botao.addEventListener('click', () => {
            botoesDiasPrevisao.forEach(b => b.classList.remove('ativo'));
            botao.classList.add('ativo');

            numDiasPrevisaoSelecionado = parseInt(botao.getAttribute('data-dias'));
            console.log(`Número de dias selecionado: ${numDiasPrevisaoSelecionado}`);

            if (ultimaPrevisaoCompletaProcessada && ultimaCidadePesquisada) {
                exibirPrevisaoDetalhada(ultimaPrevisaoCompletaProcessada, ultimaCidadePesquisada, numDiasPrevisaoSelecionado);
            } else {
                atualizarTituloPrevisao(null, numDiasPrevisaoSelecionado);
            }
        });
    });
}

// --- FIM DA SEÇÃO DE PREVISÃO DO TEMPO ---

// =======================================================
// --- INÍCIO DA SEÇÃO GARAGEM INTELIGENTE ---
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // Definindo a URL do backend em um só lugar para reutilização
    const backendUrl = 'https://carro-digital-pedro.onrender.com';

    // Pegando referências aos novos elementos do HTML
    const carregarDicasBtn = document.getElementById('carregarDicasBtn');
    const dicasGeraisContainer = document.getElementById('dicasGeraisContainer');
    const dicasEspecificasContainer = document.getElementById('dicasEspecificasContainer');
    const viagensContainer = document.getElementById('viagensContainer');

    // -------------------------------------------------------
    // --- Funções de Fetch (buscar dados do backend) ---
    // -------------------------------------------------------

    async function buscarDicasGerais() {
        try {
            const response = await fetch(`${backendUrl}/api/dicas-manutencao`);
            if (!response.ok) throw new Error('Falha ao buscar dicas gerais.');
            return await response.json();
        } catch (error) {
            console.error("Erro em buscarDicasGerais:", error);
            exibirErro(dicasGeraisContainer, 'Não foi possível carregar as dicas de manutenção.');
            return []; // Retorna array vazio em caso de erro para não quebrar a aplicação
        }
    }

    async function buscarViagensPopulares() {
        try {
            const response = await fetch(`${backendUrl}/api/viagens-populares`);
            if (!response.ok) throw new Error('Falha ao buscar viagens.');
            return await response.json();
        } catch (error) {
            console.error("Erro em buscarViagensPopulares:", error);
            exibirErro(viagensContainer, 'Não foi possível carregar as sugestões de viagem.');
            return [];
        }
    }

    async function buscarDicasEspecificas(tipoVeiculo) {
        if (!tipoVeiculo) return []; // Não faz a busca se não houver tipo de veículo
        try {
            // Converte o nome da classe JS (ex: CarroEsportivo) para minúsculas para a URL da API
            const tipoParaApi = tipoVeiculo.toLowerCase(); 
            const response = await fetch(`${backendUrl}/api/dicas-manutencao/${tipoParaApi}`);
            if (!response.ok) throw new Error(`Falha ao buscar dicas para ${tipoVeiculo}.`);
            return await response.json();
        } catch (error) {
            console.error(`Erro em buscarDicasEspecificas para ${tipoVeiculo}:`, error);
            exibirErro(dicasEspecificasContainer, `Não foi possível carregar dicas para ${tipoVeiculo}.`);
            return [];
        }
    }

    // -------------------------------------------------------
    // --- Funções de Display (exibir dados no HTML) ---
    // -------------------------------------------------------

    function exibirDicasGerais(dicas) {
        if (!dicasGeraisContainer) return;
        dicasGeraisContainer.innerHTML = ''; // Limpa o container antes de adicionar conteúdo
        if (dicas.length === 0) return; // Não exibe o título se não houver dicas

        let html = '<h3>Dicas Gerais de Manutenção</h3>';
        dicas.forEach(item => {
            html += `<div class="dica-card">${item.dica}</div>`;
        });
        dicasGeraisContainer.innerHTML = html;
    }

    function exibirViagens(viagens) {
        if (!viagensContainer) return;
        viagensContainer.innerHTML = '';
        if (viagens.length === 0) return;

        let html = '<h3>Sugestões de Viagem</h3>';
        viagens.forEach(viagem => {
            html += `
                <div class="viagem-card">
                    <strong>${viagem.destino}</strong>
                    <p>${viagem.descricao}</p>
                </div>
            `;
        });
        viagensContainer.innerHTML = html;
    }

    function exibirDicasEspecificas(dicas, tipoVeiculo) {
        if (!dicasEspecificasContainer) return;
        dicasEspecificasContainer.innerHTML = ''; // Sempre limpa, mesmo que não haja dicas
        if (dicas.length === 0) return;
        
        // Formata o nome do tipo de veículo para exibição (Ex: 'CarroEsportivo' vira 'Carro Esportivo')
        const nomeTipoFormatado = tipoVeiculo.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

        let html = `<h3>Dicas para seu <strong>${nomeTipoFormatado}</strong></h3>`;
        dicas.forEach(item => {
            html += `<div class="dica-card">${item.dica}</div>`;
        });
        dicasEspecificasContainer.innerHTML = html;
    }

    function exibirErro(container, mensagem) {
        if (container) {
            // Estilo de erro pode ser adicionado no CSS para .error-text
            container.innerHTML = `<p class="error-text" style="color: red; font-style: italic;">${mensagem}</p>`;
        }
    }
    
    // -------------------------------------------------------
    // --- Event Listeners (disparar as ações) ---
    // -------------------------------------------------------
    
    if (carregarDicasBtn) {
        carregarDicasBtn.addEventListener('click', async () => {
            carregarDicasBtn.disabled = true;
            carregarDicasBtn.textContent = 'Carregando...';
            
            // Mostra mensagens de "carregando" para o usuário
            dicasGeraisContainer.innerHTML = '<p class="loading-text">Buscando dicas gerais...</p>';
            viagensContainer.innerHTML = '<p class="loading-text">Buscando sugestões de viagem...</p>';
            dicasEspecificasContainer.innerHTML = ''; // Limpa as dicas específicas

            // Busca os dados de dicas gerais e viagens em paralelo para mais performance
            const [dicas, viagens] = await Promise.all([
                buscarDicasGerais(),
                buscarViagensPopulares()
            ]);

            // Exibe os dados gerais e de viagens
            exibirDicasGerais(dicas);
            exibirViagens(viagens);

            // Se um veículo já estiver selecionado, busca dicas para ele também
            if (garagem.veiculoSelecionado) {
                const tipo = garagem.veiculoSelecionado.constructor.name; // 'Carro', 'CarroEsportivo', 'Caminhao'
                const dicasEsp = await buscarDicasEspecificas(tipo);
                exibirDicasEspecificas(dicasEsp, tipo);
            }

            carregarDicasBtn.disabled = false;
            carregarDicasBtn.textContent = 'Carregar Dicas e Viagens';
        });
    }

    // Listener para o evento personalizado 'veiculoSelecionado'
    // Este código "ouve" quando um veículo é selecionado em outra parte do código
    document.body.addEventListener('veiculoSelecionado', async (event) => {
        // Apenas busca dicas específicas se a seção de dicas já tiver sido carregada uma vez
        if (dicasGeraisContainer && dicasGeraisContainer.children.length > 0) {
            const veiculo = event.detail.veiculo;
            if (veiculo) {
                const tipo = veiculo.constructor.name;
                const dicasEsp = await buscarDicasEspecificas(tipo);
                exibirDicasEspecificas(dicasEsp, tipo);
            } else {
                dicasEspecificasContainer.innerHTML = ''; // Limpa as dicas se nenhum veículo for selecionado
            }
        }
    });
});

// =======================================================
// --- FIM DA SEÇÃO GARAGEM INTELIGENTE ---
// =======================================================