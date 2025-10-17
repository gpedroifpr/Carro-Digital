// models/veiculo.js
import mongoose from 'mongoose';

const veiculoSchema = new mongoose.Schema({
    placa: { type: String, required: true, unique: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    ano: { type: Number, required: true },
    cor: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
}, { timestamps: true });

const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;