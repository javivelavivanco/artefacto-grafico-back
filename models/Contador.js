const mongoose = require('mongoose');

// Guarda de forma atómica la última secuencia asignada a las órdenes.
const contadorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  valor: { type: Number, default: 0, min: 0 }
}, { collection: 'contadores', versionKey: false });

module.exports = mongoose.models.Contador || mongoose.model('Contador', contadorSchema);