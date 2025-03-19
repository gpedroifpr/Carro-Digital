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
  }

  ligar() {
    if (!this.ligado) {
      this.ligado = true;
      this.velocidade = 0;
      this.atualizarDisplay();
      this.somLigando.play();
      this.somAcelerando.volume = 0.1;
      this.somAcelerando.play();
      console.log("Carro ligado!");
    } else {
      console.log("O carro já está ligado.");
    }
  }

  desligar() {
    if (this.ligado) {
      this.ligado = false;
      this.velocidade = 0;
      this.atualizarDisplay();
      this.somAcelerando.pause();
      this.somAcelerando.currentTime = 0;
      this.somAcelerando.volume = 0;
      console.log("Carro desligado!");
    } else {
      console.log("O carro já está desligado.");
    }
  }

  acelerar(incremento) {
    if (this.ligado) {
      this.velocidade += incremento;
      this.atualizarDisplay();

      // Ajusta o volume do som de acordo com a velocidade
      let volume = Math.min(this.velocidade / 100, 1);
      this.somAcelerando.volume = volume;

      console.log("Acelerando! Velocidade:", this.velocidade, "Volume:", volume);
    } else {
      console.log("O carro precisa estar ligado para acelerar.");
    }
  }

  frear(decremento) {
    this.velocidade = Math.max(0, this.velocidade - decremento);
    this.atualizarDisplay();
    console.log("Freando! Velocidade:", this.velocidade);
  }

  exibirInformacoes() {
    return `Modelo: ${this.modelo}, Cor: ${this.cor}, Status: ${this.ligado ? "Ligado" : "Desligado"}, Velocidade: ${this.velocidade} km/h`;
  }

  // Método genérico para atualizar a tela. Precisa ser sobrescrito nas subclasses.
  atualizarDisplay() {}
}

class CarroEsportivo extends Carro {
  constructor(modelo, cor) {
    super(modelo, cor);
    this.turboAtivado = false;
    this.somTurbo = new Audio("mp3/turbo.mp3"); // Adicione um som de turbo
  }

  ativarTurbo() {
    if (this.ligado) {
      this.turboAtivado = true;
      this.acelerar(50); // Aumenta a velocidade com o turbo
      this.somTurbo.play();
      this.atualizarDisplay();
      console.log("Turbo ativado!");
    } else {
      console.log("O carro precisa estar ligado para ativar o turbo.");
    }
  }

  desativarTurbo() {
    this.turboAtivado = false;
    this.atualizarDisplay();
    console.log("Turbo desativado.");
  }

  desligar() {
    super.desligar(); // Chama o método desligar da classe pai
    this.desativarTurbo(); // Desativa o turbo quando o carro é desligado
  }

  exibirInformacoes() {
    return `${super.exibirInformacoes()}, Turbo: ${this.turboAtivado ? "Ativado" : "Desativado"}`;
  }

  atualizarDisplay() {
    document.getElementById("carroEsportivoVelocidade").textContent = this.velocidade;
    document.getElementById("carroEsportivoStatus").textContent = this.ligado ? "Ligado" : "Desligado";
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
    if (this.cargaAtual + quantidade <= this.capacidadeCarga) {
      this.cargaAtual += quantidade;
      this.atualizarDisplay();
      console.log(`Caminhão carregado com ${quantidade} kg. Carga atual: ${this.cargaAtual} kg.`);
    } else {
      console.log(`Não é possível carregar mais que ${this.capacidadeCarga} kg.`);
    }
  }

  descarregar(quantidade) {
    if (this.cargaAtual - quantidade >= 0) {
      this.cargaAtual -= quantidade;
      this.atualizarDisplay();
      console.log(`Caminhão descarregado com ${quantidade} kg. Carga atual: ${this.cargaAtual} kg.`);
    } else {
      console.log("Não é possível descarregar mais do que a carga atual.");
    }
  }

  frear(decremento) {
    this.velocidade = Math.max(0, this.velocidade - decremento);
    this.atualizarDisplay();
    console.log("Freando! Velocidade:", this.velocidade);
  }

  exibirInformacoes() {
    return `${super.exibirInformacoes()}, Carga: ${this.cargaAtual}/${this.capacidadeCarga} kg`;
  }

  atualizarDisplay() {
    document.getElementById("caminhaoVelocidade").textContent = this.velocidade;
    document.getElementById("caminhaoStatus").textContent = this.ligado ? "Ligado" : "Desligado";
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
      case "ativarTurbo":
        if (this.veiculoSelecionado instanceof CarroEsportivo) {
          this.veiculoSelecionado.ativarTurbo();
        } else {
          console.log("Este veículo não tem turbo!");
        }
        break;
      case "desativarTurbo":
        if (this.veiculoSelecionado instanceof CarroEsportivo) {
          this.veiculoSelecionado.desativarTurbo();
        } else {
          console.log("Este veículo não tem turbo!");
        }
        break;
      case "carregar":
        if (this.veiculoSelecionado instanceof Caminhao) {
          this.veiculoSelecionado.carregar(quantidade);
        } else {
          console.log("Este veículo não pode ser carregado!");
        }
        break;
      case "descarregar":
        if (this.veiculoSelecionado instanceof Caminhao) {
          this.veiculoSelecionado.descarregar(quantidade);
        } else {
          console.log("Este veículo não pode ser descarregado!");
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
      this.veiculoSelecionado.atualizarDisplay(); // Chama o método específico do veículo para atualizar a tela
    } else {
      document.getElementById("informacoesVeiculo").textContent = "Clique em um botão para exibir as informações.";
    }
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