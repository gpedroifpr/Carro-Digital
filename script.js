// script.js (início do arquivo)

class Manutencao {
    constructor(data, tipo, custo, descricao = "") { // Descrição opcional
        if (!this.validar(data, tipo, custo)) {
            throw new Error("Dados de manutenção inválidos."); // Lança erro se inválido
        }
        this.data = new Date(data); // Armazena como objeto Date
        this.tipo = tipo;
        this.custo = parseFloat(custo);
        this.descricao = descricao;
    }

    // Método para retornar uma string formatada
    toString() {
        // Formata a data para dd/mm/yyyy
        const dataFormatada = this.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Adiciona UTC para evitar problemas de fuso horário
        return `${this.tipo} em ${dataFormatada} - R$ ${this.custo.toFixed(2)}${this.descricao ? ` (${this.descricao})` : ''}`;
    }

    // Método simples de validação
    validar(data, tipo, custo) {
        const dataObj = new Date(data);
        // Verifica se a data é válida, tipo não está vazio e custo é número positivo
        if (isNaN(dataObj.getTime()) || !tipo || typeof tipo !== 'string' || isNaN(parseFloat(custo)) || parseFloat(custo) < 0) {
            console.error("Erro de validação:", { data, tipo, custo });
            return false;
        }
        return true;
    }

    // Método para verificar se a manutenção é futura (agendamento)
    isFutura() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
        const dataManutencao = new Date(this.data); // Garante que é um objeto Date
        dataManutencao.setHours(0,0,0,0); // Zera a hora para comparar apenas a data
        return dataManutencao >= hoje;
    }

     // Método para converter para um objeto simples (para salvar no LocalStorage)
     toJSON() {
        return {
            data: this.data.toISOString(), // Salva data como string ISO 8601
            tipo: this.tipo,
            custo: this.custo,
            descricao: this.descricao
        };
    }
}

// Restante das suas classes (Carro, CarroEsportivo, Caminhao, Garagem)...
// ... (não cole o código restante aqui ainda)

class Carro {
    constructor(modelo, cor) {
        this.modelo = modelo;
        this.cor = cor;
        this.velocidade = 0;
        this.ligado = false;
        this.somLigando = new Audio("mp3/ligando.mp3");
        this.somAcelerando = new Audio("mp3/acelerando.mp3");
        this.somAcelerando.loop = true;
        this.somAcelerando.volume = 0;
        this.somBuzina = new Audio("mp3/buzina.mp3");
        this.somFreio = new Audio("mp3/freio.mp3");
    }

    ligar() {
        if (this.ligado) {
            this.exibirMensagem("O carro já está ligado.");
            return;
        }
        this.ligado = true;
        this.velocidade = 0;
        this.atualizarDisplay();
        this.somLigando.play();
        this.somAcelerando.volume = 0.1;
        this.somAcelerando.play();
        console.log("Carro ligado!");
    }

    desligar() {
        if (!this.ligado) {
            this.exibirMensagem("O carro já está desligado.");
            return;
        }
        this.ligado = false;
        this.velocidade = 0;
        this.atualizarDisplay();
        this.somAcelerando.pause();
        this.somAcelerando.currentTime = 0;
        this.somAcelerando.volume = 0;
        console.log("Carro desligado!");
    }

    acelerar(incremento) {
        if (!this.ligado) {
            this.exibirMensagem("O carro precisa estar ligado para acelerar.");
            return;
        }
        if (this.velocidade >= 200) { // Exemplo de velocidade máxima
            this.exibirMensagem("O carro já está na velocidade máxima!");
            return;
        }
        this.velocidade += incremento;
        this.atualizarDisplay();
        let volume = Math.min(this.velocidade / 100, 1);
        this.somAcelerando.volume = volume;
        console.log("Acelerando! Velocidade:", this.velocidade, "Volume:", volume);
    }

    frear(decremento) {
        if (this.velocidade === 0) {
            this.exibirMensagem("O carro já está parado.");
            return;
        }
        this.velocidade = Math.max(0, this.velocidade - decremento);
        this.atualizarDisplay();
        this.somFreio.play();
        console.log("Freando! Velocidade:", this.velocidade);
    }

    buzinar() {
        this.somBuzina.play();
    }

    exibirInformacoes() {
        return `Modelo: ${this.modelo}, Cor: ${this.cor}, Status: ${this.ligado ? "Ligado" : "Desligado"}, Velocidade: ${this.velocidade} km/h`;
    }

    atualizarDisplay() {
        const statusElement = document.getElementById("carroStatus");
        const velocimetroBarra = document.getElementById("velocimetroMeuCarro");
        const velocidadeElement = document.getElementById("carroVelocidade");

        if (statusElement) {
            statusElement.classList.remove("status-ligado", "status-desligado");
            statusElement.classList.add(this.ligado ? "status-ligado" : "status-desligado");
            statusElement.textContent = this.ligado ? "Ligado" : "Desligado";
        }

        if (velocimetroBarra) {
            velocimetroBarra.style.width = `${Math.min(this.velocidade, 100)}%`;
        }

        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade;
        }
    }

    exibirMensagem(mensagem) {
        document.getElementById("mensagemErro").textContent = mensagem;
        setTimeout(() => {
            document.getElementById("mensagemErro").textContent = "";
        }, 3000);
    }
}

class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
        this.somTurbo = new Audio("mp3/turbo.mp3");
    }

    ativarTurbo() {
        if (!this.ligado) {
            this.exibirMensagem("O carro precisa estar ligado para ativar o turbo.");
            return;
        }
        if (this instanceof Caminhao) {
            this.exibirMensagem("Caminhão não tem turbo.");
            return;
        }
        this.turboAtivado = true;
        this.acelerar(50);
        this.somTurbo.play();
        this.atualizarDisplay();
        console.log("Turbo ativado!");
    }

    desativarTurbo() {
        this.turboAtivado = false;
        this.atualizarDisplay();
        console.log("Turbo desativado.");
    }

    desligar() {
        super.desligar();
        this.desativarTurbo();
    }

    exibirInformacoes() {
        return `${super.exibirInformacoes()}, Turbo: ${this.turboAtivado ? "Ativado" : "Desativado"}`;
    }

    atualizarDisplay() {
        const statusElement = document.getElementById("carroEsportivoStatus");
        const velocimetroBarra = document.getElementById("velocimetroCarroEsportivo");
        const velocidadeElement = document.getElementById("carroEsportivoVelocidade");

        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade;
        }

        if (statusElement) {
            statusElement.classList.remove("status-ligado", "status-desligado");
            statusElement.classList.add(this.ligado ? "status-ligado" : "status-desligado");
            statusElement.textContent = this.ligado ? "Ligado" : "Desligado";
        }

        if (velocimetroBarra) {
            velocimetroBarra.style.width = `${Math.min(this.velocidade, 100)}%`;
        }
        document.getElementById("turboStatus").textContent = this.turboAtivado ? "Ativado" : "Desativado";
    }
}

class Caminhao extends Carro {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        this.capacidadeCarga = capacidadeCarga;
        this.cargaAtual = 0;
    }

    carregar(quantidade) {
        if (this instanceof CarroEsportivo) {
            this.exibirMensagem("Carro Esportivo não pode ser carregado.");
            return;
        }
        if (this.cargaAtual + quantidade > this.capacidadeCarga) {
            this.exibirMensagem(`Não é possível carregar mais que ${this.capacidadeCarga} kg.`);
            return;
        }
        this.cargaAtual += quantidade;
        this.atualizarDisplay();
        console.log(`Caminhão carregado com ${quantidade} kg. Carga atual: ${this.cargaAtual} kg.`);
    }

    descarregar(quantidade) {
        if (this.cargaAtual - quantidade < 0) {
            this.exibirMensagem("Não é possível descarregar mais do que a carga atual.");
            return;
        }
        this.cargaAtual -= quantidade;
        this.atualizarDisplay();
        console.log(`Caminhão descarregado com ${quantidade} kg. Carga atual: ${this.cargaAtual} kg.`);
    }

    frear(decremento) {
        if (this.velocidade === 0) {
            this.exibirMensagem("O caminhão já está parado.");
            return;
        }
        this.velocidade = Math.max(0, this.velocidade - decremento);
        this.atualizarDisplay();
        console.log("Freando! Velocidade:", this.velocidade);
    }

    exibirInformacoes() {
        return `${super.exibirInformacoes()}, Carga: ${this.cargaAtual}/${this.capacidadeCarga} kg`;
    }

    atualizarDisplay() {
        const statusElement = document.getElementById("caminhaoStatus");
        const velocimetroBarra = document.getElementById("velocimetroCaminhao");
        const velocidadeElement = document.getElementById("caminhaoVelocidade");

        if (velocidadeElement) {
            velocidadeElement.textContent = this.velocidade;
        }

        if (statusElement) {
            statusElement.classList.remove("status-ligado", "status-desligado");
            statusElement.classList.add(this.ligado ? "status-ligado" : "status-desligado");
            statusElement.textContent = this.ligado ? "Ligado" : "Desligado";
        }

        if (velocimetroBarra) {
            velocimetroBarra.style.width = `${Math.min(this.velocidade, 100)}%`;
        }
        document.getElementById("cargaAtual").textContent = this.cargaAtual;
    }
}

class Garagem {
    constructor() {
        this.veiculos = [];
        this.veiculoSelecionado = null;
    }

    adicionarVeiculo(veiculo) {
        this.veiculos.push(veiculo);
    }

    selecionarVeiculo(veiculo) {
        this.veiculoSelecionado = veiculo;
        this.atualizarDisplay();
    }

    interagir(acao, quantidade) {
        if (!this.veiculoSelecionado) {
            console.log("Nenhum veículo selecionado.");
            return;
        }

        switch (acao) {
            case "ligar":
                this.veiculoSelecionado.ligar();
                break;
            case "desligar":
                this.veiculoSelecionado.desligar();
                break;
            case "acelerar":
                this.veiculoSelecionado.acelerar(10);
                break;
            case "frear":
                this.veiculoSelecionado.frear(10);
                break;
            case "buzinar":
                this.veiculoSelecionado.buzinar();
                break;
            case "ativarTurbo":
                if (this.veiculoSelecionado instanceof CarroEsportivo) {
                    this.veiculoSelecionado.ativarTurbo();
                } else {
                    this.exibirMensagem("Este veículo não tem turbo!");
                }
                break;
            case "carregar":
                if (this.veiculoSelecionado instanceof Caminhao) {
                    this.veiculoSelecionado.carregar(quantidade);
                } else {
                    this.exibirMensagem("Este veículo não pode ser carregado!");
                }
                break;
            case "descarregar":
                if (this.veiculoSelecionado instanceof Caminhao) {
                    this.veiculoSelecionado.descarregar(quantidade);
                } else {
                    this.exibirMensagem("Este veículo não pode ser descarregado!");
                }
                break;
            default:
                console.log("Ação inválida!");
        }

        this.atualizarDisplay();
    }

    atualizarDisplay() {
        if (this.veiculoSelecionado) {
            document.getElementById("informacoesVeiculo").textContent = this.veiculoSelecionado.exibirInformacoes();
            this.veiculoSelecionado.atualizarDisplay();
        } else {
            document.getElementById("informacoesVeiculo").textContent = "Clique em um botão para exibir as informações.";
        }
    }
        exibirMensagem(mensagem) {
        document.getElementById("mensagemErro").textContent = mensagem;
        setTimeout(() => {
            document.getElementById("mensagemErro").textContent = "";
        }, 3000);
    }
}

// Instanciando os veículos
const meuCarro = new Carro("Sedan", "Prata");
const carroEsportivo = new CarroEsportivo("Ferrari", "Vermelha");
const caminhao = new Caminhao("Caminhao", "Azul", 1000);

// Instanciando a Garagem e adicionando os veículos
const garagem = new Garagem();
garagem.adicionarVeiculo(meuCarro);
garagem.adicionarVeiculo(carroEsportivo);
garagem.adicionarVeiculo(caminhao);

// Inicializa as imagens, tornando-as visíveis
document.getElementById("carroEsportivoImagem").style.display = 'block';
document.getElementById("carroEsportivoImagem").src = "img/CarroEsportivo.jpg";

document.getElementById("caminhaoImagem").style.display = 'block';
document.getElementById("caminhaoImagem").src = "img/Caminhao.jpg";

// Configurando a capacidade de carga inicial
document.getElementById("capacidadeCargaSpan").textContent = caminhao.capacidadeCarga;

// Adicionando eventos aos botões de ação
document.getElementById("acaoLigarBtn").addEventListener("click", function() {
    garagem.interagir("ligar");
});

document.getElementById("acaoDesligarBtn").addEventListener("click", function() {
    garagem.interagir("desligar");
});

document.getElementById("acaoAcelerarBtn").addEventListener("click", function() {
    garagem.interagir("acelerar");
});

document.getElementById("acaoFrearBtn").addEventListener("click", function() {
    garagem.interagir("frear");
});

document.getElementById("acaoAtivarTurboBtn").addEventListener("click", function() {
    garagem.interagir("ativarTurbo");
});

document.getElementById("acaoDesativarTurboBtn").addEventListener("click", function() {
    garagem.interagir("desativarTurbo");
});

document.getElementById("acaoCarregarBtn").addEventListener("click", function() {
    const quantidadeCarga = parseInt(document.getElementById("quantidadeCarga").value);
    garagem.interagir("carregar", quantidadeCarga);
});

document.getElementById("acaoDescarregarBtn").addEventListener("click", function() {
    const quantidadeCarga = parseInt(document.getElementById("quantidadeCarga").value);
    garagem.interagir("descarregar", quantidadeCarga);
});

// Adicionando eventos aos botões de seleção de veículo
document.getElementById("btnMeuCarro").addEventListener("click", function() {
    garagem.selecionarVeiculo(meuCarro);
});

document.getElementById("btnCarroEsportivo").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
});

document.getElementById("btnCaminhao").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
});

// Adicionando eventos aos botões do Carro Base
document.getElementById("ligarBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(meuCarro);
    garagem.interagir("ligar");
});

document.getElementById("desligarBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(meuCarro);
    garagem.interagir("desligar");
});

document.getElementById("acelerarBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(meuCarro);
    garagem.interagir("acelerar");
});

document.getElementById("frearBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(meuCarro);
    garagem.interagir("frear");
});

document.getElementById("buzinarBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(meuCarro);
    garagem.interagir("buzinar");
});

// Adicionando eventos aos botões do Carro Esportivo
document.getElementById("ligarEsportivoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
    garagem.interagir("ligar");
});

document.getElementById("desligarEsportivoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
    garagem.interagir("desligar");
});

document.getElementById("acelerarEsportivoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
    garagem.interagir("acelerar");
});

document.getElementById("frearEsportivoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
    garagem.interagir("frear");
});

document.getElementById("ativarTurboBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
    garagem.interagir("ativarTurbo");
});

document.getElementById("buzinarEsportivoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(carroEsportivo);
    garagem.interagir("buzinar");
});

// Adicionando eventos aos botões do Caminhão
document.getElementById("ligarCaminhaoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
    garagem.interagir("ligar");
});

document.getElementById("desligarCaminhaoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
    garagem.interagir("desligar");
});

document.getElementById("acelerarCaminhaoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
    garagem.interagir("acelerar");
});

document.getElementById("frearCaminhaoBtn").addEventListener("click", function() {
        garagem.selecionarVeiculo(caminhao);
        garagem.interagir("frear");
    });

document.getElementById("buzinarCaminhaoBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
    garagem.interagir("buzinar");
});

document.getElementById("carregarBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
    const quantidadeCarga = parseInt(document.getElementById("quantidadeCarga").value);
    garagem.interagir("carregar", quantidadeCarga);
});

document.getElementById("descarregarBtn").addEventListener("click", function() {
    garagem.selecionarVeiculo(caminhao);
    const quantidadeCarga = parseInt(document.getElementById("quantidadeCarga").value);
    garagem.interagir("descarregar", quantidadeCarga);
});

// Controles de Volume
document.getElementById("volumeBuzina").addEventListener("input", function() {
    meuCarro.somBuzina.volume = this.value;
    carroEsportivo.somBuzina.volume = this.value;
    caminhao.somBuzina.volume = this.value;
});

document.getElementById("volumeAceleracao").addEventListener("input", function() {
    meuCarro.somAcelerando.volume = this.value;
    carroEsportivo.somAcelerando.volume = this.value;
    caminhao.somAcelerando.volume = this.value;
});

document.getElementById("volumeFreio").addEventListener("input", function() {
    meuCarro.somFreio.volume = this.value;
    carroEsportivo.somFreio.volume = this.value;
    caminhao.somFreio.volume = this.value;
});