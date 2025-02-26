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
  }
  
  // Criando um objeto Carro
  const meuCarro = new Carro("Sedan", "Prata");
  
  // Exibindo informações do carro na tela
  document.getElementById("carroModelo").textContent = meuCarro.modelo;
  document.getElementById("carroCor").textContent = meuCarro.cor;
  
  // Funções para atualizar a tela
  function atualizarVelocidadeNaTela() {
    document.getElementById("carroVelocidade").textContent = meuCarro.velocidade;
  }
  
  function atualizarStatusNaTela() {
    const statusElement = document.getElementById("carroStatus");
    if (meuCarro.ligado) {
      statusElement.textContent = "Ligado";
    } else {
      statusElement.textContent = "Desligado";
    }
  }
  
  // Adicionando eventos aos botões
  document.getElementById("ligarBtn").addEventListener("click", function() {
    meuCarro.ligar();
  });
  
  document.getElementById("desligarBtn").addEventListener("click", function() {
    meuCarro.desligar();
  });
  
  document.getElementById("acelerarBtn").addEventListener("click", function() {
    meuCarro.acelerar(10); // Acelera em 10 km/h
  });
  
  // Inicializa a tela
  atualizarVelocidadeNaTela();
  atualizarStatusNaTela(); // Inicializa o status