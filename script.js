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
        const mensagemElement = document.getElementById("mensagemStatus");
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
            // Ajusta o volume do turbo baseado no controle geral de aceleração? Ou um próprio?
            // Por ora, usaremos volume fixo ou padrão.
            // const volumeRange = document.getElementById('volumeAceleracao');
            // this.somTurbo.volume = volumeRange ? parseFloat(volumeRange.value) * 0.8 : 0.4; // Ex: 80% do volume de aceleração
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
        this.somTurbo.play().catch(e => console.error("Erro ao tocar som turbo:", e));
        this.acelerar(50); // Turbo dá um impulso extra de aceleração
        // A função acelerar já atualiza o display
        console.log("Turbo ativado!");
         this.exibirMensagem("Turbo ativado!", 'sucesso');
         // Display é atualizado no final da interação
         // this.atualizarDisplay(); // Removido pois é chamado no interagir
    }

    desativarTurbo() {
        if (!this.turboAtivado) {
             // Não precisa exibir mensagem se já está desativado
             return;
         }
        this.turboAtivado = false;
        // Não precisa parar o som do turbo imediatamente, ele toca uma vez.
        console.log("Turbo desativado.");
         this.exibirMensagem("Turbo desativado.", 'info');
         // Display é atualizado no final da interação
         // this.atualizarDisplay(); // Removido pois é chamado no interagir
    }

    // Sobrescreve desligar para garantir que o turbo desative junto
    desligar() {
        if (this.ligado) { // Só desativa o turbo se o carro estava ligado
            this.desativarTurbo(); // Chama o método para desativar (atualiza estado e log)
        }
        super.desligar(); // Chama o método da classe pai para desligar o carro
    }

    // Sobrescreve acelerar para desativar o turbo se a velocidade cair muito? (Opcional)
    // acelerar(incremento) {
    //     super.acelerar(incremento);
    //     // Se precisar desativar turbo com velocidade baixa, adicione lógica aqui
    // }

    // Sobrescreve frear para desativar o turbo se frear muito? (Opcional)
    frear(decremento) {
         super.frear(decremento);
         // Se frear bruscamente ou velocidade ficar baixa, desativa turbo?
         if (this.turboAtivado && this.velocidade < 50) { // Exemplo: desativa abaixo de 50km/h
              // this.desativarTurbo(); // Cuidado com chamadas recursivas ou excessivas
         }
    }


    getInformacoesHtml() {
       // Pega o HTML base e adiciona a informação do turbo
       const baseHtml = super.getInformacoesHtml();
       const turboStatusText = this.turboAtivado ? "Ativado" : "Desativado";
       return `${baseHtml} <br>
               <strong>Turbo:</strong> <span id="info-turbo">${turboStatusText}</span>`;
    }


    toJSON() {
        const baseJSON = super.toJSON();
        return {
            ...baseJSON, // Inclui tudo do Carro.toJSON()
            tipoVeiculo: 'CarroEsportivo', // Sobrescreve o tipo
            turboAtivado: this.turboAtivado
            // maxVelocidadeDisplay já está no baseJSON
        };
    }
}

class Caminhao extends Carro {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        // Validação da capacidade de carga
        this.capacidadeCarga = !isNaN(parseInt(capacidadeCarga)) && parseInt(capacidadeCarga) > 0 ? parseInt(capacidadeCarga) : 1000; // Default 1000kg
        this.cargaAtual = 0;
        this.maxVelocidadeDisplay = 140; // Caminhões geralmente têm limite menor
    }

    carregar(quantidade) {
        const quantNum = parseInt(quantidade);
        if (isNaN(quantNum) || quantNum <= 0) {
            this.exibirMensagem("Quantidade inválida para carregar.", 'erro');
            return false; // Indica falha
        }
        if (this.cargaAtual + quantNum > this.capacidadeCarga) {
            this.exibirMensagem(`Não é possível carregar ${quantNum}kg. Excede a capacidade de ${this.capacidadeCarga}kg. Carga atual: ${this.cargaAtual}kg.`, 'erro');
            return false; // Indica falha
        }
        this.cargaAtual += quantNum;
        this.exibirMensagem(`Caminhão carregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        // this.atualizarDisplay(); // Removido pois é chamado no interagir
        return true; // Indica sucesso
    }

    descarregar(quantidade) {
        const quantNum = parseInt(quantidade);
        if (isNaN(quantNum) || quantNum <= 0) {
            this.exibirMensagem("Quantidade inválida para descarregar.", 'erro');
            return false; // Indica falha
        }
        if (this.cargaAtual - quantNum < 0) {
            // Calcula quanto pode descarregar no máximo
            const maxDescarregar = this.cargaAtual;
            this.exibirMensagem(`Não é possível descarregar ${quantNum}kg. Carga insuficiente (${this.cargaAtual}kg). Pode descarregar no máximo ${maxDescarregar}kg.`, 'erro');
            return false; // Indica falha
        }
        this.cargaAtual -= quantNum;
        this.exibirMensagem(`Caminhão descarregado com ${quantNum}kg. Carga atual: ${this.cargaAtual}kg.`, 'sucesso');
        // this.atualizarDisplay(); // Removido pois é chamado no interagir
        return true; // Indica sucesso
    }

     // Sobrescreve acelerar para considerar a carga? (Opcional, mais complexo)
     // acelerar(incremento) {
     //    let fatorCarga = 1 - (this.cargaAtual / (this.capacidadeCarga * 2)); // Ex: 100% carga -> 0.5x aceleração
     //    super.acelerar(incremento * fatorCarga);
     // }

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
            // maxVelocidadeDisplay já está no baseJSON
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
        // Verifica se já existe um veículo com o MESMO ID (evita duplicatas exatas ao recarregar)
        if (this.veiculos.some(v => v.id === veiculo.id)) {
            console.warn(`Veículo com ID ${veiculo.id} (${veiculo.modelo}) já existe na garagem (provavelmente do localStorage). Pulando adição.`);
            return; // Não adiciona se o ID já existe
        }
        // Verifica se já existe um veículo com o MESMO MODELO (regra para evitar duplicatas lógicas dos Padrões)
        // Esta verificação é mais relevante ao ADICIONAR padrões, não ao carregar do storage
        if (this.veiculos.some(v => v.modelo === veiculo.modelo)) {
             console.log(`Veículo com modelo ${veiculo.modelo} já existe, não adicionando duplicata lógica (padrão).`);
             // Poderia decidir não adicionar aqui também, mas a verificação de ID acima já cuida do recarregamento
             // Se for uma adição manual (não implementada), essa verificação seria útil.
        }

        this.veiculos.push(veiculo);
        // Atualizações da UI são adiadas para carregarGaragem ou feitas após adição manual
        console.log(`Veículo ${veiculo.modelo} (ID: ${veiculo.id}) adicionado à lista interna da garagem.`);
        // Não salva aqui individualmente, salva após carregar tudo ou após interação
        // this.atualizarListaVeiculosVisivel(); // Não chama aqui durante o carregamento inicial
        // this.atualizarSeletorVeiculos();
        // salvarGaragem();
    }


    selecionarVeiculo(idVeiculo) {
         const veiculoEncontrado = this.veiculos.find(v => v.id === idVeiculo);
         const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo');

         if (veiculoEncontrado) {
            // Se já estava selecionado, não faz nada (ou pode deselecionar?)
            // if(this.veiculoSelecionado && this.veiculoSelecionado.id === idVeiculo) return;

            this.veiculoSelecionado = veiculoEncontrado;
            console.log(`Veículo selecionado: ${this.veiculoSelecionado.modelo}`);

            // Limpa os detalhes extras da API ao selecionar um novo veículo
            if (detalhesExtrasDiv) {
                detalhesExtrasDiv.innerHTML = `<p>Clique em "Ver Detalhes" para o veículo ${this.veiculoSelecionado?.modelo || ''}.</p>`;
                detalhesExtrasDiv.className = 'detalhes-extras-box'; // Reseta classe
            }

            // Atualiza a interface completa (inclui marcar card, atualizar info, botões, etc.)
            this.atualizarDisplayGeral();

         } else {
            console.error("Veículo não encontrado para seleção:", idVeiculo);
            this.veiculoSelecionado = null;
            // Limpa displays e botões se nenhum veículo foi encontrado
            this.limparDisplays();
            this.gerenciarBotoesAcao();
            // Limpa área de detalhes extras também
            if (detalhesExtrasDiv) {
                detalhesExtrasDiv.innerHTML = `<p>Selecione um veículo na lista.</p>`;
                detalhesExtrasDiv.className = 'detalhes-extras-box'; // Reseta classe
            }
            // Atualiza a lista visual para remover a marca de seleção, se houver
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
        document.getElementById("displayTurbo").style.display = 'none';
        document.getElementById("displayCarga").style.display = 'none';
        document.getElementById("quantidadeCarga").disabled = true;
        document.getElementById('detalhesExtrasVeiculo').innerHTML = '<p>Selecione um veículo e clique em "Ver Detalhes".</p>';
        document.getElementById('detalhesExtrasVeiculo').className = 'detalhes-extras-box';
    }

    interagir(acao, valor) {
        if (!this.veiculoSelecionado) {
            this.exibirMensagemGlobal("Selecione um veículo primeiro!", 'erro');
            return;
        }
        let sucessoAcao = true; // Flag para saber se a ação foi bem-sucedida
        try {
            // Lógica da ação específica do veículo
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
                         // Não precisa de mensagem se o veículo não tem turbo e tentam desativar
                         sucessoAcao = false; // Ação não aplicável
                     }
                     break;
                case "carregar":
                case "descarregar":
                    if (this.veiculoSelecionado instanceof Caminhao) {
                        const inputQtd = document.getElementById('quantidadeCarga');
                        // Usa o valor passado ou pega do input, tratando NaN e <= 0
                        const quantidade = (valor !== undefined && !isNaN(parseInt(valor)) && parseInt(valor) > 0)
                                             ? parseInt(valor)
                                             : (!isNaN(parseInt(inputQtd?.value)) && parseInt(inputQtd.value) > 0 ? parseInt(inputQtd.value) : 0);

                         if (quantidade > 0) {
                             // A própria função carregar/descarregar exibe a mensagem e retorna true/false
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

            // Após qualquer interação, atualiza a UI e salva se a ação foi ok
            this.atualizarDisplayGeral(); // Atualiza tudo: infos, botões, etc.

            if (sucessoAcao) {
                salvarGaragem(); // Salva o estado atual da garagem no LocalStorage
            }

        } catch (error) {
            console.error("Erro durante a interação:", acao, error);
            // Exibe a mensagem de erro usando o método do veículo ou o global
             this.exibirMensagemGlobal(`Erro ao ${acao}: ${error.message}`, 'erro');
        }
    }

     atualizarDisplayGeral() {
        // Atualiza a lista de cards (marcação de selecionado)
        this.atualizarListaVeiculosVisivel();
        // Atualiza o dropdown do formulário
        this.atualizarSeletorVeiculos();

        const infoDiv = document.getElementById("informacoesVeiculo");
        const historicoDiv = document.getElementById('historicoManutencao');
        const agendamentosDiv = document.getElementById('agendamentosFuturos');
        const displayTurbo = document.getElementById('displayTurbo');
        const displayCarga = document.getElementById('displayCarga');
        const inputQtdCarga = document.getElementById('quantidadeCarga');

        if (this.veiculoSelecionado) {
            // Atualiza Bloco de Informações
            infoDiv.innerHTML = this.veiculoSelecionado.getInformacoesHtml();
            // Atualiza Display Dinâmico (velocimetro, status, carga/turbo específico)
            this.veiculoSelecionado.atualizarDisplay();
            // Atualiza Histórico e Agendamentos
            historicoDiv.innerHTML = this.veiculoSelecionado.getHistoricoFormatado();
            agendamentosDiv.innerHTML = this.veiculoSelecionado.getAgendamentosFormatados();
            // Mostra/Esconde campos específicos
            displayTurbo.style.display = this.veiculoSelecionado instanceof CarroEsportivo ? 'block' : 'none';
            displayCarga.style.display = this.veiculoSelecionado instanceof Caminhao ? 'block' : 'none';
            inputQtdCarga.disabled = !(this.veiculoSelecionado instanceof Caminhao);
             // Não mexemos na área de detalhes extras aqui, ela é controlada pelo botão "Ver Detalhes"
        } else {
            // Se nenhum veículo selecionado, limpa tudo
            this.limparDisplays();
        }
         // Habilita/Desabilita botões de ação com base no estado atual
         this.gerenciarBotoesAcao();
         // Verifica notificações de agendamento (pode ser chamado menos vezes se preferir)
         verificarNotificacoesAgendamento();
    }

    atualizarSeletorVeiculos() {
        const selectVeiculo = document.getElementById('manutencaoVeiculo');
        const fieldsetAgendamento = document.getElementById('fieldsetAgendamento');
        if (!selectVeiculo || !fieldsetAgendamento) {
             console.warn("Elemento select 'manutencaoVeiculo' ou fieldset 'fieldsetAgendamento' não encontrado.");
             return;
        }

        // Guarda o valor que estava selecionado ANTES de limpar (se houver)
        const valorSelecionadoAnteriormente = this.veiculoSelecionado ? this.veiculoSelecionado.id : selectVeiculo.value;
        selectVeiculo.innerHTML = '<option value="">-- Selecione --</option>'; // Limpa opções antigas

        if (this.veiculos.length > 0) {
            this.veiculos.forEach(veiculo => {
                const option = document.createElement('option');
                option.value = veiculo.id;
                // Usar textContent para segurança contra XSS em nomes de modelo
                option.textContent = `${veiculo.modelo} (${veiculo.constructor.name})`;
                selectVeiculo.appendChild(option);
            });

            // Tenta restaurar a seleção anterior ou a do veículo ativo
            selectVeiculo.value = valorSelecionadoAnteriormente;
            // Se o valor anterior não é mais válido (ex: veículo removido) OU se não tinha valor E temos um veic. selecionado na garagem
            if (!selectVeiculo.value && this.veiculoSelecionado) {
                selectVeiculo.value = this.veiculoSelecionado.id;
            } else if (!selectVeiculo.value){
                 // Se ainda assim não tem valor (nenhum selecionado e nenhum anterior válido), força para ""
                 selectVeiculo.value = "";
            }

            fieldsetAgendamento.disabled = false; // Habilita o formulário
        } else {
            // Se não há veículos, adiciona opção indicando e desabilita form
            selectVeiculo.innerHTML = '<option value="">-- Nenhum veículo --</option>';
            fieldsetAgendamento.disabled = true;
        }
    }

     gerenciarBotoesAcao() {
         const veiculo = this.veiculoSelecionado;
         const nenhumSelecionado = !veiculo;

         // Função auxiliar para definir o estado 'disabled' de um botão
         const setDisabled = (id, condition) => {
             const btn = document.getElementById(id);
             // Só altera se o botão existir
             if (btn) btn.disabled = condition;
             // else console.warn(`Botão com ID ${id} não encontrado.`); // Opcional: avisar se botão sumir do HTML
         };

         // Lógica de habilitação/desabilitação
         setDisabled('acaoLigarBtn', nenhumSelecionado || veiculo?.ligado);
         setDisabled('acaoDesligarBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade > 0); // Não desliga andando
         setDisabled('acaoAcelerarBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade >= veiculo?.maxVelocidadeDisplay); // Não acelera no max
         setDisabled('acaoFrearBtn', nenhumSelecionado || !veiculo?.ligado || veiculo?.velocidade === 0); // Não freia parado
         setDisabled('acaoBuzinarBtn', nenhumSelecionado); // Buzina sempre pode (se selecionado)

         const ehEsportivo = veiculo instanceof CarroEsportivo;
         setDisabled('acaoAtivarTurboBtn', !(ehEsportivo && veiculo?.ligado && !veiculo?.turboAtivado));
         setDisabled('acaoDesativarTurboBtn', !(ehEsportivo && veiculo?.turboAtivado));

         const ehCaminhao = veiculo instanceof Caminhao;
         const inputQtdCarga = document.getElementById('quantidadeCarga');
         setDisabled('acaoCarregarBtn', !(ehCaminhao && veiculo?.cargaAtual < veiculo?.capacidadeCarga)); // Só carrega se não estiver cheio
         setDisabled('acaoDescarregarBtn', !(ehCaminhao && veiculo?.cargaAtual > 0)); // Só descarrega se tiver carga
         if (inputQtdCarga) inputQtdCarga.disabled = !ehCaminhao; // Habilita/desabilita input de quantidade
     }

    // ATUALIZADO: Inclui botão "Ver Detalhes" e seu listener
    atualizarListaVeiculosVisivel() {
        const container = document.getElementById('selecaoVeiculosContainer');
        // Não pega detalhesExtrasDiv aqui, pois é chamado dentro do listener do botão

        if (!container) {
            console.error("Container #selecaoVeiculosContainer não encontrado!");
            return;
        }
        container.innerHTML = ''; // Limpa os cards antigos

        if (this.veiculos.length === 0) {
            container.innerHTML = '<p>Nenhum veículo na garagem.</p>';
            // Limpa também a área de detalhes se não há veículos (feito em selecionarVeiculo/limparDisplays)
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
            // Adicionar mais 'else if' para outras imagens se necessário

            // HTML do card com botão Selecionar e Ver Detalhes
            divVeiculo.innerHTML = `
                <img src="${imgUrl}" alt="${veiculo.modelo}" onerror="this.onerror=null; this.src='img/default.png'; this.alt='Imagem Padrão';">
                <p>${veiculo.modelo}</p>
                <span style="font-size: 0.8em; color: #555;">(${veiculo.constructor.name})</span>
                <div>
                   <button class="btn-selecionar-veiculo" data-id="${veiculo.id}">Selecionar</button>
                   <button class="btn-ver-detalhes" data-modelo="${veiculo.modelo}">Ver Detalhes</button>
                   <!-- Botão remover não está mais aqui -->
                </div>
            `;

            // Event listener para o botão SELECIONAR
            const btnSelecionar = divVeiculo.querySelector('.btn-selecionar-veiculo');
            if(btnSelecionar) {
                btnSelecionar.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    this.selecionarVeiculo(id);
                    // A lógica de limpar detalhes extras foi movida para dentro de selecionarVeiculo
                });
            }

            // Event listener para o botão VER DETALHES
            const btnDetalhes = divVeiculo.querySelector('.btn-ver-detalhes');
            if(btnDetalhes) {
                btnDetalhes.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Impede que o clique selecione o card inteiro
                    const modelo = e.target.getAttribute('data-modelo');
                    const detalhesExtrasDiv = document.getElementById('detalhesExtrasVeiculo'); // Pega a div de display

                    if (!modelo || !detalhesExtrasDiv) {
                        console.error("Não foi possível obter o modelo ou a div de detalhes (#detalhesExtrasVeiculo).");
                        this.exibirMensagemGlobal("Erro interno ao tentar ver detalhes.", "erro");
                        return;
                    }

                    // Exibe feedback de carregamento
                    detalhesExtrasDiv.innerHTML = `<p>Carregando detalhes extras para ${modelo}...</p>`;
                    detalhesExtrasDiv.className = 'detalhes-extras-box loading'; // Adiciona classe de loading

                    try {
                        const detalhes = await buscarDetalhesVeiculoAPI(modelo);

                        if (detalhes) {
                            console.log("Tentando atualizar a div..."); // Log de depuração
    detalhesExtrasDiv.innerHTML = '<h1>TESTE DE EXIBIÇÃO</h1>'; // Teste simples
                            // Constrói o HTML com os detalhes encontrados
                            let htmlDetalhes = '<ul>';
                            // Usar Object.entries para iterar e mostrar todos os detalhes não vazios
                            Object.entries(detalhes).forEach(([chave, valor]) => {
                                if (valor !== null && valor !== undefined && valor !== '') {
                                    // Formata a chave para melhor leitura (opcional)
                                    let chaveFormatada = chave.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    if (chave === 'identificador') chaveFormatada = 'Modelo'; // Exceção para clareza

                                    let valorFormatado = valor;
                                    // Tratamento especial para boolean (Recall)
                                    if (typeof valor === 'boolean') {
                                         valorFormatado = valor ? 'Sim' : 'Não';
                                    }

                                    // Destaca Recall Pendente
                                    if (chave === 'recallPendente' && valor === true) {
                                        htmlDetalhes += `<li style="color: red;"><strong>${chaveFormatada}:</strong> ${valorFormatado} ${detalhes.descricaoRecall ? '('+detalhes.descricaoRecall+')' : ''}</li>`;
                                    } else if (chave !== 'descricaoRecall') { // Não mostra descricaoRecall separadamente se já mostrado acima
                                        htmlDetalhes += `<li><strong>${chaveFormatada}:</strong> ${valorFormatado}</li>`;
                                    }
                                }
                            });
                            htmlDetalhes += '</ul>';

                            detalhesExtrasDiv.innerHTML = htmlDetalhes;
                            detalhesExtrasDiv.className = 'detalhes-extras-box'; // Remove classe loading/error
                        } else {
                            // Mensagem de não encontrado (API retornou null)
                            detalhesExtrasDiv.innerHTML = `<p>Nenhum detalhe extra encontrado para ${modelo} na API.</p>`;
                            detalhesExtrasDiv.className = 'detalhes-extras-box info'; // Usa classe info para não encontrado
                        }
                    } catch (error) {
                         // Mensagem de erro (fetch falhou, JSON inválido, etc.)
                         console.error("Erro ao buscar ou exibir detalhes da API:", error);
                         detalhesExtrasDiv.innerHTML = `<p>Erro ao carregar detalhes para ${modelo}. Verifique a conexão ou o console.</p>`;
                         detalhesExtrasDiv.className = 'detalhes-extras-box error'; // Adiciona classe de erro
                    }
                });
            }

            container.appendChild(divVeiculo);
        });
    } // Fim de atualizarListaVeiculosVisivel

    // Método para exibir mensagens GLOBAIS (não atreladas a um veículo específico)
    exibirMensagemGlobal(mensagem, tipo = 'info') {
        // Reutiliza a lógica de exibição do Carro, mas chamada diretamente na Garagem
        Carro.prototype.exibirMensagem.call({ /* this vazio ou genérico */ }, mensagem, tipo);
    }
}

// --- FIM DAS CLASSES ---

// --- FUNÇÃO ASSÍNCRONA PARA BUSCAR DETALHES ---

/**
 * @async
 * @function buscarDetalhesVeiculoAPI
 * @description Busca detalhes adicionais de um veículo em uma fonte de dados externa (simulada por JSON local).
 * @param {string} identificadorVeiculo - O identificador único do veículo (neste caso, o modelo) para buscar na API simulada.
 * @returns {Promise<object|null>} Uma Promise que resolve com o objeto contendo os detalhes do veículo encontrado, ou null se não encontrado.
 * @throws {Error} Lança um erro se ocorrer um problema na busca (rede, status HTTP não OK, erro de parse JSON).
 */
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    const apiUrl = './dados_veiculos_api.json'; // Caminho relativo para o arquivo JSON local
    console.log(`Buscando detalhes para: ${identificadorVeiculo} em ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, { cache: "no-cache" }); // Evita cache do navegador

        if (!response.ok) {
            // Trata erros de HTTP (ex: 404 Not Found, 500 Internal Server Error)
            console.error(`Erro HTTP ao buscar API: ${response.status} ${response.statusText}`);
            // Lança um erro específico para ser pego pelo catch no listener do botão
            throw new Error(`Falha ao carregar dados da API (Status: ${response.status})`);
        }

        const dadosApi = await response.json(); // Tenta parsear o JSON

        // Procura o veículo pelo identificador (modelo). Comparação case-insensitive pode ser útil.
        const detalhesVeiculo = dadosApi.find(veiculo =>
            veiculo.identificador.toLowerCase() === identificadorVeiculo.toLowerCase()
        );

        if (detalhesVeiculo) {
            console.log("Detalhes encontrados:", detalhesVeiculo);
            return detalhesVeiculo; // Retorna o objeto encontrado
        } else {
            console.log(`Nenhum detalhe extra encontrado para o identificador: ${identificadorVeiculo}`);
            return null; // Retorna null se não encontrar (não é um erro, apenas não achou)
        }

    } catch (error) {
        // Trata erros de rede (fetch falhou), erros de parse do JSON ou o erro lançado acima
        console.error("Erro na função buscarDetalhesVeiculoAPI:", error);
        // Relança o erro para que o código que chamou a função possa tratar (ex: exibir na UI)
        throw error;
    }
}


// --- LOCALSTORAGE E INICIALIZAÇÃO ---

const CHAVE_LOCALSTORAGE = 'garagemDataIFPR_v3'; // Incrementa versão se estrutura mudar muito
const garagem = new Garagem();

function salvarGaragem() {
    try {
        // Mapeia cada veículo para seu formato JSON
        const garagemParaSalvar = garagem.veiculos.map(v => v.toJSON());
        localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(garagemParaSalvar));
        console.log("Garagem salva no LocalStorage.");
    } catch (error) {
        console.error("Erro CRÍTICO ao salvar garagem no LocalStorage:", error);
        // Tenta exibir a mensagem na interface, se possível
        garagem.exibirMensagemGlobal("ERRO GRAVE: Não foi possível salvar os dados da garagem. Verifique o console.", 'erro');
    }
}

function carregarGaragem() {
    const dadosSalvos = localStorage.getItem(CHAVE_LOCALSTORAGE);
    let veiculosRecuperados = []; // Array para guardar os veículos recriados

    if (dadosSalvos) {
        try {
            const veiculosSalvos = JSON.parse(dadosSalvos);

            // Itera sobre os dados salvos e recria as instâncias dos veículos
            veiculosRecuperados = veiculosSalvos.map(dadosVeiculo => {
                // Validação básica do objeto salvo
                if (!dadosVeiculo || !dadosVeiculo.id || !dadosVeiculo.tipoVeiculo || !dadosVeiculo.modelo) {
                    console.warn("Registro de veículo inválido encontrado no localStorage, pulando:", dadosVeiculo);
                    return null; // Pula este registro inválido
                }

                let veiculo;
                // Recria o histórico de manutenção primeiro
                const historico = dadosVeiculo.historicoManutencao?.map(m => {
                     try {
                         // Recria instância de Manutencao a partir dos dados JSON
                         return new Manutencao(m.data, m.tipo, m.custo, m.descricao);
                     } catch (e) {
                         console.warn("Erro ao recriar manutenção a partir de dados salvos:", m, e);
                         return null; // Pula manutenção inválida
                     }
                 }).filter(m => m !== null) || []; // Filtra nulos e garante array vazio se não houver histórico

                // Cria a instância correta com base no tipoVeiculo salvo
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
                    default: // Se tipo for desconhecido, cria Carro base
                        veiculo = new Carro(dadosVeiculo.modelo, dadosVeiculo.cor);
                        break;
                }

                 // Restaura propriedades comuns e específicas salvas
                 veiculo.id = dadosVeiculo.id; // Usa o ID salvo
                 veiculo.velocidade = dadosVeiculo.velocidade || 0;
                 veiculo.ligado = dadosVeiculo.ligado || false;
                 // Restaura maxVelocidadeDisplay se estava salva, senão usa o default da classe
                 if(dadosVeiculo.maxVelocidadeDisplay) veiculo.maxVelocidadeDisplay = dadosVeiculo.maxVelocidadeDisplay;
                 veiculo.historicoManutencao = historico; // Atribui o histórico recriado

                return veiculo; // Retorna o veículo recriado

            }).filter(v => v !== null); // Filtra quaisquer veículos que falharam na recriação

            console.log(`${veiculosRecuperados.length} veículos carregados do LocalStorage.`);

        } catch (error) {
            console.error("Erro CRÍTICO ao carregar/parsear garagem do LocalStorage:", error);
            // Informa o usuário sobre o problema
            garagem.exibirMensagemGlobal("Erro ao carregar dados salvos. Alguns dados podem ter sido perdidos. Verifique o console.", 'erro');
            veiculosRecuperados = []; // Reseta para vazio em caso de erro grave de parse
            // Considerar limpar o localStorage aqui pode ser perigoso se o erro for temporário
            // localStorage.removeItem(CHAVE_LOCALSTORAGE);
        }
    } else {
         console.log("Nenhum dado salvo encontrado no LocalStorage. Iniciando com padrões.");
         // Se não há dados, a próxima etapa criará os padrões.
    }

    // Limpa a garagem atual antes de adicionar os recuperados/padrões
    garagem.veiculos = [];

    // Adiciona os veículos recuperados (se houver) à garagem
    veiculosRecuperados.forEach(v => garagem.adicionarVeiculo(v));

    // Garante que os veículos padrão existam (adiciona se faltar)
    garantirVeiculosPadrao(); // Esta função agora chama salvarGaragem() se adicionar algum padrão

    // Finalmente, atualiza a interface completa com os veículos carregados/padrões
    garagem.atualizarDisplayGeral();
    console.log(`Garagem inicializada com ${garagem.veiculos.length} veículos.`);
}

function garantirVeiculosPadrao() {
    const modelosPadrao = {
        // Modelo como chave, função para criar como valor
        "Moranguinho": () => new Carro("Moranguinho", "Rosa"),
        "Veloz": () => new CarroEsportivo("Veloz", "Vermelho"),
        "Brutus": () => new Caminhao("Brutus", "Azul", 1200)
    };

    let algumPadraoAdicionado = false;
    for (const modelo in modelosPadrao) {
        // Verifica se NENHUM veículo na garagem atual tem esse MODELO
        if (!garagem.veiculos.some(v => v.modelo === modelo)) {
            console.log(`Veículo padrão "${modelo}" não encontrado na garagem. Adicionando...`);
            const criarVeiculoFn = modelosPadrao[modelo];
            const novoVeiculoPadrao = criarVeiculoFn();
            garagem.adicionarVeiculo(novoVeiculoPadrao); // Adiciona à lista interna
            algumPadraoAdicionado = true;
        }
    }

    // Se algum veículo padrão foi adicionado, salva a garagem e atualiza a UI
    if (algumPadraoAdicionado) {
        console.log("Veículos padrão foram adicionados/restaurados.");
        salvarGaragem(); // Salva o estado com os novos padrões
        garagem.exibirMensagemGlobal("Veículos padrão restaurados/adicionados.", "info");
        // A UI será atualizada no final de carregarGaragem ou pode forçar aqui se necessário
        // garagem.atualizarDisplayGeral();
    }
}


// --- FUNÇÕES DE ATUALIZAÇÃO DE DISPLAY (Histórico/Agendamentos) ---
// (Estas funções são chamadas por atualizarDisplayGeral quando um veículo é selecionado)
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
let notificacoesMostradasNestaSessao = new Set(); // Guarda IDs de notificações já mostradas

function verificarNotificacoesAgendamento() {
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0); // Define para meia-noite UTC de hoje
    const amanha = new Date(hoje);
    amanha.setUTCDate(hoje.getUTCDate() + 1); // Meia-noite UTC de amanhã

    let algumaNotificacaoNova = false;

    garagem.veiculos.forEach(veiculo => {
        veiculo.historicoManutencao.forEach(manutencao => {
            // Verifica apenas manutenções futuras
            if (manutencao.isFutura()) {
                 // Compara a data da manutenção (já em UTC) com hoje e amanhã (também em UTC)
                 const dataManutencaoComp = new Date(manutencao.data.getTime());
                 dataManutencaoComp.setUTCHours(0, 0, 0, 0); // Garante que a comparação seja feita só pela data

                 // Cria um ID único para esta notificação (veículo + data)
                 const idNotificacao = `${veiculo.id}_${manutencao.data.toISOString().substring(0, 10)}`;

                 // Só mostra se ainda não foi mostrada nesta sessão
                 if (!notificacoesMostradasNestaSessao.has(idNotificacao)) {
                     let msg = null;
                     let tipo = 'info'; // Tipo padrão da mensagem

                     if (dataManutencaoComp.getTime() === hoje.getTime()) { // É hoje?
                        msg = `🔔 HOJE: ${manutencao.tipo} para ${veiculo.modelo}.`;
                        tipo = 'aviso'; // Destaca mais
                        algumaNotificacaoNova = true;
                     } else if (dataManutencaoComp.getTime() === amanha.getTime()) { // É amanhã?
                        msg = `🔔 AMANHÃ: ${manutencao.tipo} para ${veiculo.modelo}.`;
                        tipo = 'info';
                        algumaNotificacaoNova = true;
                     }
                     // Poderia adicionar mais lógicas (ex: "Em X dias")

                     // Se gerou uma mensagem, exibe e marca como mostrada
                     if (msg) {
                         // Usa o método global da garagem para exibir a mensagem
                         garagem.exibirMensagemGlobal(msg, tipo);
                         notificacoesMostradasNestaSessao.add(idNotificacao); // Adiciona ao Set
                     }
                 }
            }
        });
    });
    if (algumaNotificacaoNova) {
        console.log("Notificações de agendamento verificadas e exibidas.");
    }
}


// --- EVENT LISTENERS ---

// Executa quando o DOM está completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Iniciando aplicação Garagem Virtual.");

    // 1. Carrega a garagem do LocalStorage (ou inicia com padrões) e atualiza a UI
    carregarGaragem();

    // 2. Configura o formulário de agendamento de manutenção
    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (event) => {
            event.preventDefault(); // Impede o envio padrão do formulário
            console.log("Formulário de agendamento enviado.");

            // Coleta os dados do formulário
            const idVeiculo = document.getElementById('manutencaoVeiculo').value;
            const dataInput = document.getElementById('manutencaoData').value; // Formato YYYY-MM-DD
            const tipo = document.getElementById('manutencaoTipo').value;
            const custoStr = document.getElementById('manutencaoCusto').value;
            const descricao = document.getElementById('manutencaoDescricao').value;

            // Validações básicas
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
                // Cria a nova instância de Manutencao (o construtor valida a data)
                const novaManutencao = new Manutencao(dataInput, tipo, custo, descricao);

                // Adiciona ao histórico do veículo
                veiculoParaAgendar.adicionarManutencao(novaManutencao);
                salvarGaragem(); // Salva o estado atualizado da garagem

                // Exibe mensagem de sucesso
                const acaoRealizada = novaManutencao.isFutura() ? 'agendada' : 'registrada';
                garagem.exibirMensagemGlobal(`Manutenção '${tipo}' ${acaoRealizada} para ${veiculoParaAgendar.modelo}!`, 'sucesso');

                // Se a manutenção foi adicionada ao veículo que está selecionado, atualiza os displays
                if (garagem.veiculoSelecionado && garagem.veiculoSelecionado.id === veiculoParaAgendar.id) {
                    atualizarDisplayManutencao(veiculoParaAgendar);
                    atualizarDisplayAgendamentos(veiculoParaAgendar);
                     verificarNotificacoesAgendamento(); // Re-verifica notificações após adicionar
                }

                 // Limpa o formulário e reseta a seleção do veículo
                 formAgendamento.reset();
                 document.getElementById('manutencaoVeiculo').value = ""; // Limpa o select explicitamente
                 // Poderia re-selecionar o veículo que acabou de receber a manutenção:
                 // document.getElementById('manutencaoVeiculo').value = idVeiculo;

             } catch (error) {
                 // Captura erros da criação da Manutencao (ex: data inválida) ou outros
                 console.error("Erro ao criar/agendar manutenção:", error);
                 garagem.exibirMensagemGlobal(`Erro ao agendar: ${error.message}`, 'erro');
             }
        });
    } else {
        console.error("CRÍTICO: Formulário #formAgendamento não encontrado no HTML!");
    }

    // 3. Listeners para os botões de AÇÃO GERAL da garagem
    // Usando Optional Chaining (?.) para evitar erros se um botão não for encontrado
    document.getElementById("acaoLigarBtn")?.addEventListener("click", () => garagem.interagir("ligar"));
    document.getElementById("acaoDesligarBtn")?.addEventListener("click", () => garagem.interagir("desligar"));
    document.getElementById("acaoAcelerarBtn")?.addEventListener("click", () => garagem.interagir("acelerar"));
    document.getElementById("acaoFrearBtn")?.addEventListener("click", () => garagem.interagir("frear"));
    document.getElementById("acaoBuzinarBtn")?.addEventListener("click", () => garagem.interagir("buzinar"));
    document.getElementById("acaoAtivarTurboBtn")?.addEventListener("click", () => garagem.interagir("ativarTurbo"));
    document.getElementById("acaoDesativarTurboBtn")?.addEventListener("click", () => garagem.interagir("desativarTurbo"));
    document.getElementById("acaoCarregarBtn")?.addEventListener("click", () => garagem.interagir("carregar")); // Passará valor do input
    document.getElementById("acaoDescarregarBtn")?.addEventListener("click", () => garagem.interagir("descarregar")); // Passará valor do input

    // 4. Listeners para os Controles de Volume de Áudio
    const setupVolumeControl = (controlId, audioProperty) => {
        const control = document.getElementById(controlId);
        if (control) {
            // Função para aplicar o volume a todos os veículos existentes
            const setVolumeForAll = (volume) => {
                 garagem.veiculos.forEach(v => {
                    // Verifica se o veículo possui a propriedade de áudio e se ela tem 'volume'
                    if (v[audioProperty] && typeof v[audioProperty].volume !== 'undefined') {
                        v[audioProperty].volume = volume;
                    }
                 });
                 // Caso especial: Atualiza o volume do som de aceleração do veículo selecionado, se estiver tocando
                 if (audioProperty === 'somAcelerando' && garagem.veiculoSelecionado?.ligado && !garagem.veiculoSelecionado.somAcelerando.paused) {
                      garagem.veiculoSelecionado.somAcelerando.volume = garagem.veiculoSelecionado._calcularVolumeAceleracao();
                 }
            };

            // Define o listener para o evento 'input' (quando o usuário arrasta)
            control.addEventListener("input", function() {
                 setVolumeForAll(parseFloat(this.value));
            });

            // Define o volume inicial para todos os veículos ao carregar a página
            setVolumeForAll(parseFloat(control.value));
        } else {
            console.warn(`Controle de volume com ID ${controlId} não encontrado.`);
        }
    };

    // Configura os controles de volume para cada tipo de som
    setupVolumeControl("volumeBuzina", "somBuzina");
    setupVolumeControl("volumeAceleracao", "somAcelerando");
    setupVolumeControl("volumeFreio", "somFreio");
    // Nota: O som do turbo não tem controle de volume dedicado neste exemplo.

    console.log("Aplicação Garagem Virtual inicializada e listeners configurados.");
    // Verifica notificações logo após carregar tudo
    verificarNotificacoesAgendamento();

}); // Fim do DOMContentLoaded