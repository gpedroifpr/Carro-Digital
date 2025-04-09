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
            dataObj = new Date(data);
            if (data.length === 10 && !isNaN(dataObj.getTime())) {
                dataObj = new Date(data + 'T00:00:00Z');
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
            console.error("Erro de validação (tipo/custo):", { tipo, custo });
            return false;
        }
        return true;
    }

    isFutura() {
        const hoje = new Date();
        hoje.setUTCHours(0, 0, 0, 0);
        const dataManutencao = new Date(this.data.getTime());
        dataManutencao.setUTCHours(0, 0, 0, 0);
        return dataManutencao >= hoje;
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
            this.somLigando = { play: () => {}, volume: 0 };
            this.somAcelerando = { play: () => {}, pause: () => {}, volume: 0, currentTime: 0, loop: false };
            this.somBuzina = { play: () => {}, volume: 0 };
            this.somFreio = { play: () => {}, volume: 0 };
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
        this.somAcelerando.volume = 0.1;
        this.somAcelerando.play().catch(e => console.error("Erro ao tocar som acelerando:", e));
        console.log("Carro ligado!");
        this.exibirMensagem(`${this.modelo} ligado!`, 'sucesso');
    }

    desligar() {
        if (!this.ligado) {
            this.exibirMensagem("O carro já está desligado.", 'info');
            return;
        }
        this.ligado = false;
        this.velocidade = 0;
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
        const velMaxima = this.maxVelocidadeDisplay;
        if (this.velocidade >= velMaxima) {
            this.exibirMensagem("O carro já está na velocidade máxima!", 'aviso');
             this.velocidade = velMaxima;
             this.atualizarDisplay();
            return;
        }
        this.velocidade = Math.min(velMaxima, this.velocidade + incremento);
        this.atualizarDisplay();
        let volume = Math.min(this.velocidade / velMaxima, 1) * 0.8 + 0.1;
        this.somAcelerando.volume = Math.max(0, Math.min(1, volume));
        console.log("Acelerando! Velocidade:", this.velocidade, "Volume:", this.somAcelerando.volume);
    }

    frear(decremento) {
        if (this.velocidade === 0) {
            return;
        }
        this.velocidade = Math.max(0, this.velocidade - decremento);
        this.atualizarDisplay();
        this.somFreio.play().catch(e => console.error("Erro ao tocar som freio:", e));
         let volume = Math.min(this.velocidade / this.maxVelocidadeDisplay, 1) * 0.8 + 0.1;
         this.somAcelerando.volume = Math.max(0, Math.min(1, volume));
        console.log("Freando! Velocidade:", this.velocidade);
    }

    buzinar() {
        this.somBuzina.play().catch(e => console.error("Erro ao tocar som buzina:", e));
    }

    adicionarManutencao(manutencao) {
        if (!(manutencao instanceof Manutencao)) {
            console.error("Objeto inválido. Apenas instâncias de Manutencao podem ser adicionadas.");
            throw new Error("Tentativa de adicionar manutenção inválida.");
        }
        this.historicoManutencao.push(manutencao);
        this.historicoManutencao.sort((a, b) => a.data - b.data);
        console.log(`Manutenção adicionada ao ${this.modelo}: ${manutencao.toString()}`);
    }

    getHistoricoFormatado() {
        const passadas = this.historicoManutencao.filter(m => !m.isFutura());
        if (passadas.length === 0) {
            return "<p>Nenhuma manutenção passada registrada.</p>";
        }
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
       return `
            <strong>Modelo:</strong> ${this.modelo} <br>
            <strong>Cor:</strong> ${this.cor} <br>
            <strong>Status:</strong> <span class="${this.ligado ? 'status-ligado' : 'status-desligado'}">${this.ligado ? "Ligado" : "Desligado"}</span> <br>
            <strong>Velocidade:</strong> ${this.velocidade} km/h
       `;
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
            const percentualVelocidade = Math.min((this.velocidade / this.maxVelocidadeDisplay) * 100, 100);
            velocimetroBarra.style.width = `${percentualVelocidade}%`;
        }

         if (this instanceof CarroEsportivo) {
             document.getElementById("turboStatus").textContent = this.turboAtivado ? "Ativado" : "Desativado";
         } else if (this instanceof Caminhao) {
             document.getElementById("cargaAtual").textContent = this.cargaAtual;
             document.getElementById("capacidadeCargaSpan").textContent = this.capacidadeCarga;
         }
    }

    exibirMensagem(mensagem, tipo = 'info') {
        const mensagemElement = document.getElementById("mensagemStatus");
        if(mensagemElement){
            mensagemElement.textContent = mensagem;
            mensagemElement.className = `mensagem ${tipo}`;
            mensagemElement.style.display = 'block';
            setTimeout(() => {
                if (mensagemElement.textContent === mensagem) {
                     mensagemElement.textContent = "";
                     mensagemElement.style.display = 'none';
                     mensagemElement.className = 'mensagem';
                }
            }, 4500);
        } else {
            console.warn("Elemento #mensagemStatus não encontrado no HTML.");
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
            historicoManutencao: this.historicoManutencao.map(m => m.toJSON())
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
            console.warn("Não foi possível carregar som do turbo.");
            this.somTurbo = { play: () => {}, volume: 0 };
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
        this.somTurbo.play().catch(e => console.error("Erro ao tocar som turbo:", e));
        this.acelerar(50);
        this.atualizarDisplay();
        console.log("Turbo ativado!");
         this.exibirMensagem("Turbo ativado!", 'sucesso');
    }

    desativarTurbo() {
        if (!this.turboAtivado) {
             return;
         }
        this.turboAtivado = false;
        this.atualizarDisplay();
        console.log("Turbo desativado.");
         this.exibirMensagem("Turbo desativado.", 'info');
    }

    desligar() {
        super.desligar();
        this.desativarTurbo();
    }

    getInformacoesHtml() {
       return `${super.getInformacoesHtml()} <br>
               <strong>Turbo:</strong> ${this.turboAtivado ? "Ativado" : "Desativado"}`;
    }


    toJSON() {
        const baseJSON = super.toJSON();
        return {
            ...baseJSON,
            tipoVeiculo: 'CarroEsportivo',
            turboAtivado: this.turboAtivado,
            maxVelocidadeDisplay: this.maxVelocidadeDisplay
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
        this.atualizarDisplay();
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
            this.exibirMensagem(`Não é possível descarregar ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'erro');
            return false;
        }
        this.cargaAtual -= quantNum;
        this.atualizarDisplay();
        this.exibirMensagem(`Caminhão descarregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        return true;
    }

    getInformacoesHtml() {
       return `${super.getInformacoesHtml()} <br>
               <strong>Carga:</strong> ${this.cargaAtual} / ${this.capacidadeCarga} kg`;
    }

    toJSON() {
        const baseJSON = super.toJSON();
        return {
            ...baseJSON,
            tipoVeiculo: 'Caminhao',
            capacidadeCarga: this.capacidadeCarga,
            cargaAtual: this.cargaAtual,
            maxVelocidadeDisplay: this.maxVelocidadeDisplay
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
        // Verifica se já existe um veículo com o MESMO ID (evita duplicatas exatas)
        if (!this.veiculos.some(v => v.id === veiculo.id)) {
             // Verifica se já existe um veículo com o MESMO MODELO (evita duplicatas lógicas dos padrões)
             if (!this.veiculos.some(v => v.modelo === veiculo.modelo)) {
                this.veiculos.push(veiculo);
                this.atualizarListaVeiculosVisivel();
                this.atualizarSeletorVeiculos();
                salvarGaragem();
                console.log(`Veículo ${veiculo.modelo} adicionado à garagem.`);
                // Não exibe mensagem aqui para não poluir quando restaura padrões
             } else {
                 console.log(`Veículo com modelo ${veiculo.modelo} já existe, não adicionando duplicata.`);
             }
        } else {
            console.warn(`Veículo com ID ${veiculo.id} já existe na garagem.`);
        }
    }

    // REMOVIDO - Função não será mais usada
    /*
    removerVeiculo(idVeiculo) {
        // ... lógica antiga ...
    }
    */

    selecionarVeiculo(idVeiculo) {
         const veiculoEncontrado = this.veiculos.find(v => v.id === idVeiculo);

         if (veiculoEncontrado) {
            this.veiculoSelecionado = veiculoEncontrado;
            console.log(`Veículo selecionado: ${this.veiculoSelecionado.modelo}`);
            this.atualizarDisplayGeral(); // Atualiza interface

            // Atualiza o select do formulário
            const selectVeiculoForm = document.getElementById('manutencaoVeiculo');
            if(selectVeiculoForm) selectVeiculoForm.value = this.veiculoSelecionado.id;

            // Marca o card como selecionado
            this.atualizarListaVeiculosVisivel();

         } else {
            console.error("Veículo não encontrado para seleção:", idVeiculo);
            this.veiculoSelecionado = null;
            this.atualizarDisplayGeral(); // Limpa display
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
        document.getElementById("displayTurbo").style.display = 'none';
        document.getElementById("displayCarga").style.display = 'none';
        document.getElementById("quantidadeCarga").disabled = true;
    }

    interagir(acao, valor) {
        if (!this.veiculoSelecionado) {
            this.exibirMensagem("Selecione um veículo primeiro!", 'erro');
            return;
        }
        let sucesso = true;
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
                        this.exibirMensagem("Este veículo não tem turbo!", 'aviso');
                        sucesso = false;
                    }
                    break;
                case "desativarTurbo":
                     if (this.veiculoSelecionado instanceof CarroEsportivo) {
                        this.veiculoSelecionado.desativarTurbo();
                     } else {
                         this.exibirMensagem("Este veículo não tem turbo!", 'aviso');
                         sucesso = false;
                     }
                     break;
                case "carregar":
                case "descarregar":
                    if (this.veiculoSelecionado instanceof Caminhao) {
                        const inputQtd = document.getElementById('quantidadeCarga');
                        const quantidade = valor !== undefined ? valor : parseInt(inputQtd?.value || '0');
                         if (!isNaN(quantidade) && quantidade > 0) {
                             sucesso = (acao === 'carregar') ? this.veiculoSelecionado.carregar(quantidade) : this.veiculoSelecionado.descarregar(quantidade);
                         } else {
                             this.exibirMensagem(`Informe uma quantidade válida para ${acao}.`, 'erro');
                             sucesso = false;
                         }
                    } else {
                        this.exibirMensagem(`Este veículo não pode ser ${acao}do!`, 'aviso');
                        sucesso = false;
                    }
                    break;
                default:
                    console.log("Ação inválida:", acao);
                    this.exibirMensagem("Ação desconhecida.", 'erro');
                    sucesso = false;
            }
            this.atualizarDisplayGeral();
            if (sucesso) {
                salvarGaragem();
            }
        } catch (error) {
            console.error("Erro durante a interação:", acao, error);
            this.exibirMensagem(`Erro ao ${acao}: ${error.message}`, 'erro');
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
            this.veiculoSelecionado.atualizarDisplay(); // Atualiza velocímetro, status, etc.
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
         setDisabled('acaoDesligarBtn', nenhumSelecionado || !veiculo?.ligado);
         setDisabled('acaoAcelerarBtn', nenhumSelecionado || !veiculo?.ligado);
         setDisabled('acaoFrearBtn', nenhumSelecionado || veiculo?.velocidade === 0);
         setDisabled('acaoBuzinarBtn', nenhumSelecionado);

         const ehEsportivo = veiculo instanceof CarroEsportivo;
         setDisabled('acaoAtivarTurboBtn', !(ehEsportivo && veiculo?.ligado && !veiculo?.turboAtivado));
         setDisabled('acaoDesativarTurboBtn', !(ehEsportivo && veiculo?.turboAtivado));

         const ehCaminhao = veiculo instanceof Caminhao;
         setDisabled('acaoCarregarBtn', !ehCaminhao);
         setDisabled('acaoDescarregarBtn', !(ehCaminhao && veiculo?.cargaAtual > 0));
         const inputQtdCarga = document.getElementById('quantidadeCarga');
         if (inputQtdCarga) inputQtdCarga.disabled = !ehCaminhao;
     }

     // ATUALIZADO: Cria/Atualiza os cards SEM o botão de remover
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
             if(this.veiculoSelecionado && this.veiculoSelecionado.id === veiculo.id){
                 divVeiculo.classList.add('selecionado');
             }

             let imgUrl = 'img/CarroMoranguinho.jpg';
             if (veiculo instanceof CarroEsportivo) imgUrl = 'img/CarroEsportivo.jpg';
             else if (veiculo instanceof Caminhao) imgUrl = 'img/Caminhao.jpg';

             // *** REMOVIDO O BOTÃO DE REMOVER DAQUI ***
             divVeiculo.innerHTML = `
                 <img src="${imgUrl}" alt="${veiculo.modelo}" onerror="this.src='img/default.png'; this.alt='Imagem Padrão';">
                 <p>${veiculo.modelo}</p>
                 <span style="font-size: 0.8em; color: #555;">(${veiculo.constructor.name})</span>
                 <div>
                    <button class="btn-selecionar-veiculo" data-id="${veiculo.id}">Selecionar</button>
                    <!-- Botão remover foi removido daqui -->
                 </div>
             `;

             // Adiciona evento APENAS ao botão selecionar
             divVeiculo.querySelector('.btn-selecionar-veiculo').addEventListener('click', (e) => {
                 const id = e.target.getAttribute('data-id');
                 this.selecionarVeiculo(id);
             });

             // *** REMOVIDO O EVENT LISTENER DO BOTÃO REMOVER ***
             /*
             divVeiculo.querySelector('.btn-remover-veiculo').addEventListener('click', (e) => {
                 // ... lógica antiga ...
             });
             */

             container.appendChild(divVeiculo);
         });
     }

    exibirMensagem(mensagem, tipo = 'info') {
        if (this.veiculoSelecionado) {
            if (typeof this.veiculoSelecionado.exibirMensagem === 'function') {
                 this.veiculoSelecionado.exibirMensagem(mensagem, tipo);
                 return;
            }
        }
         const mensagemElement = document.getElementById("mensagemStatus");
         if(mensagemElement){
            mensagemElement.textContent = mensagem;
            mensagemElement.className = `mensagem ${tipo}`;
            mensagemElement.style.display = 'block';
            setTimeout(() => {
                 if (mensagemElement.textContent === mensagem) {
                     mensagemElement.textContent = "";
                     mensagemElement.style.display = 'none';
                      mensagemElement.className = 'mensagem';
                 }
            }, 4500);
         } else {
            console.warn("Elemento #mensagemStatus não encontrado.");
            alert(`${tipo.toUpperCase()}: ${mensagem}`);
         }
    }
}

// --- FIM DAS CLASSES ---

// --- LOCALSTORAGE E INICIALIZAÇÃO ---

const CHAVE_LOCALSTORAGE = 'garagemDataIFPR_v2';
const garagem = new Garagem();

function salvarGaragem() {
    try {
        const garagemParaSalvar = garagem.veiculos.map(v => v.toJSON());
        localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(garagemParaSalvar));
        console.log("Garagem salva no LocalStorage.");
    } catch (error) {
        console.error("Erro ao salvar garagem no LocalStorage:", error);
        const msgElement = document.getElementById("mensagemStatus");
        if (msgElement) {
            msgElement.textContent = "ERRO GRAVE: Não foi possível salvar os dados da garagem. Verifique o console.";
            msgElement.className = "mensagem erro";
            msgElement.style.display = 'block';
        } else {
             alert("ERRO GRAVE ao salvar dados. Verifique o console.");
        }
    }
}

// ATUALIZADO: Garante que os carros padrão existam após carregar
function carregarGaragem() {
    const dadosSalvos = localStorage.getItem(CHAVE_LOCALSTORAGE);
    let veiculosRecuperados = [];

    if (dadosSalvos) {
        try {
            const veiculosSalvos = JSON.parse(dadosSalvos);
            veiculosRecuperados = veiculosSalvos.map(dadosVeiculo => {
                if (!dadosVeiculo || !dadosVeiculo.id || !dadosVeiculo.tipoVeiculo) {
                    console.warn("Registro de veículo inválido encontrado no localStorage, pulando:", dadosVeiculo);
                    return null;
                }
                let veiculo;
                const historico = dadosVeiculo.historicoManutencao?.map(m => {
                     try {
                         return new Manutencao(m.data, m.tipo, m.custo, m.descricao);
                     } catch (e) {
                         console.warn("Erro ao recriar manutenção:", m, e);
                         return null;
                     }
                 }).filter(m => m !== null) || [];

                switch (dadosVeiculo.tipoVeiculo) {
                    case 'CarroEsportivo':
                        veiculo = new CarroEsportivo(dadosVeiculo.modelo, dadosVeiculo.cor);
                        veiculo.turboAtivado = dadosVeiculo.turboAtivado || false;
                        if(dadosVeiculo.maxVelocidadeDisplay) veiculo.maxVelocidadeDisplay = dadosVeiculo.maxVelocidadeDisplay;
                        break;
                    case 'Caminhao':
                        veiculo = new Caminhao(dadosVeiculo.modelo, dadosVeiculo.cor, dadosVeiculo.capacidadeCarga);
                        veiculo.cargaAtual = dadosVeiculo.cargaAtual || 0;
                         if(dadosVeiculo.maxVelocidadeDisplay) veiculo.maxVelocidadeDisplay = dadosVeiculo.maxVelocidadeDisplay;
                        break;
                    case 'Carro':
                    default:
                        veiculo = new Carro(dadosVeiculo.modelo, dadosVeiculo.cor);
                         if(dadosVeiculo.maxVelocidadeDisplay) veiculo.maxVelocidadeDisplay = dadosVeiculo.maxVelocidadeDisplay;
                        break;
                }
                 veiculo.id = dadosVeiculo.id;
                 veiculo.velocidade = dadosVeiculo.velocidade || 0;
                 veiculo.ligado = dadosVeiculo.ligado || false;
                 veiculo.historicoManutencao = historico;
                return veiculo;
            }).filter(v => v !== null);
            console.log(`${veiculosRecuperados.length} veículos carregados do LocalStorage.`);
        } catch (error) {
            console.error("Erro CRÍTICO ao carregar/parsear garagem do LocalStorage:", error);
            garagem.exibirMensagem("Erro ao carregar dados salvos. Alguns dados podem ter sido perdidos. Verifique o console.", 'erro');
             veiculosRecuperados = [];
        }
    } else {
         console.log("Nenhum dado salvo encontrado.");
         // Se não encontrou nada, a próxima etapa vai criar os padrões
    }

    // Atribui os veículos recuperados (ou array vazio) à garagem
    garagem.veiculos = veiculosRecuperados;

    // *** NOVO: Verifica e adiciona os veículos padrão se estiverem faltando ***
    garantirVeiculosPadrao();

    // Atualiza a interface completa após carregar e garantir padrões
    garagem.atualizarDisplayGeral();
}

// *** NOVO: Função para garantir que os veículos padrão existam ***
function garantirVeiculosPadrao() {
    const modelosPadrao = {
        "Moranguinho": () => new Carro("Moranguinho", "Rosa"),
        "Veloz": () => new CarroEsportivo("Veloz", "Vermelho"),
        "Brutus": () => new Caminhao("Brutus", "Azul", 1200)
    };

    let algumAdicionado = false;
    for (const modelo in modelosPadrao) {
        if (!garagem.veiculos.some(v => v.modelo === modelo)) {
            console.log(`Veículo padrão "${modelo}" não encontrado. Adicionando...`);
            const criarVeiculoFn = modelosPadrao[modelo];
            garagem.adicionarVeiculo(criarVeiculoFn()); // Adiciona sem salvar individualmente aqui
            algumAdicionado = true;
        }
    }

    // Salva a garagem UMA VEZ no final se algum padrão foi adicionado
    if (algumAdicionado) {
        salvarGaragem();
        garagem.exibirMensagem("Veículos padrão restaurados/adicionados.", "info");
    }
}


// --- FUNÇÕES DE ATUALIZAÇÃO DE DISPLAY (Histórico/Agendamentos) ---
// (Sem alterações aqui)
function atualizarDisplayManutencao(veiculo) {
    const historicoDiv = document.getElementById('historicoManutencao');
    if (historicoDiv) {
        historicoDiv.innerHTML = veiculo ? veiculo.getHistoricoFormatado() : "<p>Selecione um veículo.</p>";
    }
}
function atualizarDisplayAgendamentos(veiculo) {
    const agendamentosDiv = document.getElementById('agendamentosFuturos');
    if (agendamentosDiv) {
         agendamentosDiv.innerHTML = veiculo ? veiculo.getAgendamentosFormatados() : "<p>Selecione um veículo.</p>";
    }
}


// --- NOTIFICAÇÕES ---
// (Sem alterações aqui)
let notificacoesMostradasNestaSessao = new Set();
function verificarNotificacoesAgendamento() {
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setUTCDate(hoje.getUTCDate() + 1);
    let algumaNotificacao = false;
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
                     } else if (dataManutencaoComp.getTime() === amanha.getTime()) {
                        msg = `🔔 AMANHÃ: ${manutencao.tipo} para ${veiculo.modelo}.`;
                        tipo = 'info';
                     }
                     if (msg) {
                         garagem.exibirMensagem(msg, tipo);
                         notificacoesMostradasNestaSessao.add(idNotificacao);
                         algumaNotificacao = true;
                     }
                 }
            }
        });
    });
}


// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Iniciando aplicação.");

    // 1. Carrega a garagem (que agora também garante os padrões e atualiza a UI)
    carregarGaragem();

    // 2. Configura o formulário de agendamento
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
            const veiculoParaAgendar = garagem.veiculos.find(v => v.id === idVeiculo);

            if (!veiculoParaAgendar) {
                garagem.exibirMensagem("Selecione um veículo válido para agendar.", 'erro'); return;
            }
            if (!dataInput || !tipo || !custoStr) {
                 garagem.exibirMensagem("Preencha Data, Tipo e Custo da manutenção.", 'erro'); return;
            }
             try {
                const novaManutencao = new Manutencao(dataInput, tipo, parseFloat(custoStr), descricao);
                veiculoParaAgendar.adicionarManutencao(novaManutencao);
                salvarGaragem(); // Salva após adicionar manutenção
                garagem.exibirMensagem(`Manutenção '${tipo}' ${novaManutencao.isFutura() ? 'agendada' : 'registrada'} para ${veiculoParaAgendar.modelo}!`, 'sucesso');
                if (garagem.veiculoSelecionado && garagem.veiculoSelecionado.id === veiculoParaAgendar.id) {
                    atualizarDisplayManutencao(veiculoParaAgendar);
                    atualizarDisplayAgendamentos(veiculoParaAgendar);
                     verificarNotificacoesAgendamento();
                }
                 formAgendamento.reset();
                 document.getElementById('manutencaoVeiculo').value = "";
             } catch (error) {
                 console.error("Erro ao criar/agendar manutenção:", error);
                 garagem.exibirMensagem(`Erro ao agendar: ${error.message}`, 'erro');
             }
        });
    } else {
        console.error("Formulário #formAgendamento não encontrado no HTML!");
    }

    // 3. Listeners para os botões de AÇÃO GERAL
    document.getElementById("acaoLigarBtn")?.addEventListener("click", () => garagem.interagir("ligar"));
    document.getElementById("acaoDesligarBtn")?.addEventListener("click", () => garagem.interagir("desligar"));
    document.getElementById("acaoAcelerarBtn")?.addEventListener("click", () => garagem.interagir("acelerar"));
    document.getElementById("acaoFrearBtn")?.addEventListener("click", () => garagem.interagir("frear"));
    document.getElementById("acaoBuzinarBtn")?.addEventListener("click", () => garagem.interagir("buzinar"));
    document.getElementById("acaoAtivarTurboBtn")?.addEventListener("click", () => garagem.interagir("ativarTurbo"));
    document.getElementById("acaoDesativarTurboBtn")?.addEventListener("click", () => garagem.interagir("desativarTurbo"));
    document.getElementById("acaoCarregarBtn")?.addEventListener("click", () => garagem.interagir("carregar"));
    document.getElementById("acaoDescarregarBtn")?.addEventListener("click", () => garagem.interagir("descarregar"));

    // 4. Listeners para os Controles de Volume
    const setupVolumeControl = (controlId, audioProperty) => {
        const control = document.getElementById(controlId);
        if (control) {
            const setVolumeForAll = (volume) => {
                 garagem.veiculos.forEach(v => {
                    if (v[audioProperty]) v[audioProperty].volume = volume;
                 });
                 // Atualiza volume do som de aceleração se estiver tocando
                 if (audioProperty === 'somAcelerando' && garagem.veiculoSelecionado?.ligado) {
                     const v = garagem.veiculoSelecionado;
                     let volAcel = Math.min(v.velocidade / v.maxVelocidadeDisplay, 1) * 0.8 + 0.1;
                      v.somAcelerando.volume = Math.max(0, Math.min(1, volAcel)) * volume;
                 }
            };
            control.addEventListener("input", function() {
                 setVolumeForAll(parseFloat(this.value));
            });
            setVolumeForAll(parseFloat(control.value)); // Define volume inicial
        }
    };
    setupVolumeControl("volumeBuzina", "somBuzina");
    setupVolumeControl("volumeAceleracao", "somAcelerando");
    setupVolumeControl("volumeFreio", "somFreio");

    console.log("Aplicação inicializada e listeners configurados.");

}); // Fim do DOMContentLoaded