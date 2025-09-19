// limpeza.js - SCRIPT PARA RODAR LOCALMENTE

// URL da sua API no Render
const API_BASE_URL = 'https://carro-digital-pedro.onrender.com';

// Função auxiliar para criar uma pausa
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function limparBancoDeDados() {
    console.log("-----------------------------------------");
    console.log("INICIANDO SCRIPT DE LIMPEZA DE EMERGÊNCIA");
    console.log("-----------------------------------------");

    try {
        // 1. Buscar a lista completa de veículos
        console.log("Buscando a lista de todos os veículos na API...");
        const response = await fetch(`${API_BASE_URL}/api/veiculos`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar veículos: ${response.statusText}`);
        }
        const veiculos = await response.json();
        const idsParaDeletar = veiculos.map(v => v._id);
        const total = idsParaDeletar.length;

        if (total === 0) {
            console.log("✅ O banco de dados já está vazio. Nenhuma ação necessária.");
            return;
        }

        console.log(`Encontrados ${total} veículos para deletar.`);

        // 2. Deletar um por um, com calma
        for (let i = 0; i < total; i++) {
            const id = idsParaDeletar[i];
            const numeroAtual = i + 1;

            try {
                process.stdout.write(`Deletando veículo ${numeroAtual} de ${total} (ID: ${id})... `);
                
                const deleteResponse = await fetch(`${API_BASE_URL}/api/veiculos/${id}`, {
                    method: 'DELETE'
                });

                if (deleteResponse.ok) {
                    process.stdout.write("OK!\n");
                } else {
                    process.stdout.write(`FALHOU! (Status: ${deleteResponse.status})\n`);
                }

            } catch (err) {
                console.log(`\n❌ Erro de rede ao deletar o veículo ${id}: ${err.message}`);
            }
            
            // Pausa pequena para não sobrecarregar a API
            await esperar(50); // espera 50 milissegundos
        }

        console.log("-----------------------------------------");
        console.log("🎉 LIMPEZA CONCLUÍDA! 🎉");
        console.log("-----------------------------------------");
        console.log("Verifique sua aplicação. O banco de dados deve estar vazio.");

    } catch (error) {
        console.error("\n❌ ERRO CRÍTICO DURANTE A EXECUÇÃO DO SCRIPT:");
        console.error(error.message);
    }
}

// Inicia a função
limparBancoDeDados();