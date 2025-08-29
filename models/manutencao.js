// models/manutencao.js
import mongoose from 'mongoose';

// Este é o "molde" para cada registro de manutenção no banco de dados.
const manutencaoSchema = new mongoose.Schema({
    // Campo para a descrição do serviço. É um texto e obrigatório.
    descricaoServico: {
        type: String,
        required: [true, 'A descrição do serviço é obrigatória.'],
    },
    // Campo para a data. É do tipo Data, obrigatório e, se não for informado,
    // pega a data e hora do momento do registro.
    data: {
        type: Date,
        required: true,
        default: Date.now 
    },
    // Custo do serviço. É um número, obrigatório e não pode ser negativo.
    custo: {
        type: Number,
        required: [true, 'O custo é obrigatório.'],
        min: [0, 'O custo não pode ser negativo.']
    },
    // Quilometragem do veículo na hora do serviço. É um número opcional.
    quilometragem: {
        type: Number,
        min: [0, 'A quilometragem não pode ser negativa.']
    },
    // Este é o campo mais importante! Ele conecta a manutenção a um veículo.
    veiculo: {
        type: mongoose.Schema.Types.ObjectId, // Diz que vamos guardar um ID de outro documento.
        ref: 'Veiculo',                      // Diz que esse ID pertence a um 'Veiculo'.
        required: true                       // Garante que toda manutenção tenha um veículo associado.
    }
}, {
    timestamps: true // Adiciona os campos `createdAt` e `updatedAt` automaticamente.
});

// Cria o modelo 'Manutencao' que usaremos no nosso código para interagir com o banco de dados.
const Manutencao = mongoose.model('Manutencao', manutencaoSchema);

export default Manutencao;