const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { 
    type: String, 
    enum: ['produccion', 'diseno', 'preimpresion', 'impresion', 'manipulado', 'logistica', 'auxiliar'],
    default: 'auxiliar' 
  }
}, {
  // La colección se fija para conservar el nombre del dominio en español.
  collection: 'usuarios',
  versionKey: false,
  timestamps: true
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);