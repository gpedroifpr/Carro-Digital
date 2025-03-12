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

  // Métodos do carro
  ligar() {
    if (!this.ligado) {
      this.ligado = true;
      this.velocidade = 0;
      atualizarVelocidadeNaTela();
      atualizarStatusNaTela(); // Atualiza o status na tela
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
      atualizarVelocidadeNaTela();
      atualizarStatusNaTela(); // Atualiza o status na tela
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
      atualizarVelocidadeNaTela();

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
    atualizarVelocidadeNaTela();
    console.log("Freando! Velocidade:", this.velocidade);
  }
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
      atualizarTurboStatus();
      console.log("Turbo ativado!");
    } else {
      console.log("O carro precisa estar ligado para ativar o turbo.");
    }
  }

  desativarTurbo() { // Adicionado para desativar o turbo
    this.turboAtivado = false;
    atualizarTurboStatus();
    console.log("Turbo desativado.");
  }

  desligar() {
    super.desligar(); // Chama o método desligar da classe pai
    this.desativarTurbo(); // Desativa o turbo quando o carro é desligado
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
      atualizarCargaAtual();
      console.log(`Caminhão carregado com ${quantidade} kg. Carga atual: ${this.cargaAtual} kg.`);
    } else {
      console.log(`Não é possível carregar mais que ${this.capacidadeCarga} kg.`);
    }
  }

  descarregar(quantidade) { // Adicionado para descarregar
    if (this.cargaAtual - quantidade >= 0) {
      this.cargaAtual -= quantidade;
      atualizarCargaAtual();
      console.log(`Caminhão descarregado com ${quantidade} kg. Carga atual: ${this.cargaAtual} kg.`);
    } else {
      console.log("Não é possível descarregar mais do que a carga atual.");
    }
  }

  frear(decremento) {
    this.velocidade = Math.max(0, this.velocidade - decremento);
    atualizarVelocidadeCaminhaoNaTela();
    console.log("Freando! Velocidade:", this.velocidade);
  }
}
// Variáveis para os objetos
const meuCarro = new Carro("Sedan", "Prata");
let carroEsportivo = new CarroEsportivo("Ferrari", "Vermelha");
let caminhao = new Caminhao("Caminhao", "Azul", 1000);

// Inicializa as imagens, tornando-as visíveis
document.getElementById("carroEsportivoImagem").style.display = 'block';
document.getElementById("carroEsportivoImagem").src = "img/CarroEsportivo.jpg";

document.getElementById("caminhaoImagem").style.display = 'block';
document.getElementById("caminhaoImagem").src = "img/Caminhao.jpg";

// Funções para atualizar a tela
function atualizarVelocidadeNaTela() {
  document.getElementById("carroVelocidade").textContent = meuCarro.velocidade;
}

function atualizarStatusNaTela() {
  const statusElement = document.getElementById("carroStatus");
  statusElement.textContent = meuCarro.ligado ? "Ligado" : "Desligado";
}

function atualizarVelocidadeEsportivaNaTela() {
  if (carroEsportivo) {
    document.getElementById("carroEsportivoVelocidade").textContent = carroEsportivo.velocidade;
  } else {
    document.getElementById("carroEsportivoVelocidade").textContent = 0;
  }
}

function atualizarStatusEsportivoNaTela() {
    const statusElement = document.getElementById("carroEsportivoStatus");
    if (carroEsportivo) {
        statusElement.textContent = carroEsportivo.ligado ? "Ligado" : "Desligado";
    } else {
        statusElement.textContent = "Desligado";
    }
}


function atualizarTurboStatus() {
  const turboStatusElement = document.getElementById("turboStatus");
  if (carroEsportivo) {
    turboStatusElement.textContent = carroEsportivo.turboAtivado ? "Ativado" : "Desativado";
  } else {
    turboStatusElement.textContent = "Desativado";
  }
}

function atualizarCargaAtual() {
  if (caminhao) {
    document.getElementById("cargaAtual").textContent = caminhao.cargaAtual;
  }
}

function atualizarVelocidadeCaminhaoNaTela() {
  if (caminhao) {
    document.getElementById("caminhaoVelocidade").textContent = caminhao.velocidade;
  } else {
    document.getElementById("caminhaoVelocidade").textContent = 0;
  }
}

function atualizarStatusCaminhaoNaTela() {
  const statusElement = document.getElementById("caminhaoStatus");
  if (caminhao) {
    statusElement.textContent = caminhao.ligado ? "Ligado" : "Desligado";
  } else {
    statusElement.textContent = "Desligado";
  }
}

// Adicionando eventos aos botões do Carro Base
document.getElementById("ligarBtn").addEventListener("click", function() {
  meuCarro.ligar();
});

document.getElementById("desligarBtn").addEventListener("click", function() {
  meuCarro.desligar();
});

document.getElementById("acelerarBtn").addEventListener("click", function() {
  meuCarro.acelerar(10); // Acelera em 10 km/h
});

document.getElementById("frearBtn").addEventListener("click", function() {
  meuCarro.frear(10);
});

document.getElementById("ligarEsportivoBtn").addEventListener("click", function() {
    if (carroEsportivo) {
        carroEsportivo.ligar();
        atualizarStatusEsportivoNaTela();
        atualizarVelocidadeEsportivaNaTela();
    }
});

document.getElementById("desligarEsportivoBtn").addEventListener("click", function() {
    if (carroEsportivo) {
        carroEsportivo.desligar();
        atualizarStatusEsportivoNaTela();
        atualizarVelocidadeEsportivaNaTela();
        atualizarTurboStatus();
    }
});

document.getElementById("acelerarEsportivoBtn").addEventListener("click", function() {
    if (carroEsportivo) {
        carroEsportivo.acelerar(10);
        atualizarVelocidadeEsportivaNaTela();
    }
});

document.getElementById("frearEsportivoBtn").addEventListener("click", function() {
    if (carroEsportivo) {
        carroEsportivo.frear(10);
        atualizarVelocidadeEsportivaNaTela();
    }
});

document.getElementById("ativarTurboBtn").addEventListener("click", function() {
    if (carroEsportivo) {
        carroEsportivo.ativarTurbo();
        atualizarTurboStatus();
        atualizarVelocidadeEsportivaNaTela();
    }
});

document.getElementById("ligarCaminhaoBtn").addEventListener("click", function() {
  if (caminhao) {
    caminhao.ligar();
    atualizarStatusCaminhaoNaTela();
    atualizarVelocidadeCaminhaoNaTela();
  }
});

document.getElementById("desligarCaminhaoBtn").addEventListener("click", function() {
  if (caminhao) {
    caminhao.desligar();
    atualizarStatusCaminhaoNaTela();
    atualizarVelocidadeCaminhaoNaTela();
  }
});

document.getElementById("acelerarCaminhaoBtn").addEventListener("click", function() {
  if (caminhao) {
    caminhao.acelerar(10);
    atualizarVelocidadeCaminhaoNaTela();
  }
});

document.getElementById("frearCaminhaoBtn").addEventListener("click", function() {
  if (caminhao) {
    caminhao.frear(10);
    atualizarVelocidadeCaminhaoNaTela();
  }
});

document.getElementById("carregarBtn").addEventListener("click", function() {
  if (caminhao) {
    const quantidadeCarga = parseInt(document.getElementById("quantidadeCarga").value);
    caminhao.carregar(quantidadeCarga);
    atualizarCargaAtual();
  }
});

document.getElementById("descarregarBtn").addEventListener("click", function() {
  if (caminhao) {
    const quantidadeCarga = parseInt(document.getElementById("quantidadeCarga").value);
    caminhao.descarregar(quantidadeCarga);
    atualizarCargaAtual();
  }
});

// Inicializa a tela
atualizarVelocidadeNaTela();
atualizarStatusNaTela();
atualizarTurboStatus(); // Inicializa o status do turbo
atualizarCargaAtual(); // Inicializa a carga atual
atualizarStatusEsportivoNaTela();
atualizarVelocidadeEsportivaNaTela();
atualizarStatusCaminhaoNaTela();
atualizarVelocidadeCaminhaoNaTela();