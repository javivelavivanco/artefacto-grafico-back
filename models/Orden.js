const mongoose = require('mongoose');
const {
  TIPOS_ORDEN,
  TECNICAS_IMPRESION,
  ESTADOS_PRODUCCION,
  PRIORIDADES_PRODUCCION,
  TINTAS_PERMITIDAS,
  ACABADOS_PERMITIDOS,
  GRAMAJES_PERMITIDOS,
  SOPORTES_PERMITIDOS,
  VALORES_POR_DEFECTO_ORDEN
} = require('#utils/opciones-orden');

const especificacionesSchema = new mongoose.Schema({
  ancho: { type: Number, required: true, min: 1 },
  alto: { type: Number, required: true, min: 1 },
  soporte: { type: String, enum: SOPORTES_PERMITIDOS, required: true },
  gramaje: { type: String, enum: GRAMAJES_PERMITIDOS, required: true },
  tintas: { type: String, enum: TINTAS_PERMITIDAS, required: true },
  acabados: [{ type: String, enum: ACABADOS_PERMITIDOS }],
  troquelado: { type: Boolean, default: VALORES_POR_DEFECTO_ORDEN.troquelado },
  numeroTroquel: { type: String, trim: true, default: VALORES_POR_DEFECTO_ORDEN.numeroTroquel },
  manipuladoEspecial: { type: Boolean, default: VALORES_POR_DEFECTO_ORDEN.manipuladoEspecial }
}, { _id: false });

const esquemaOrden = new mongoose.Schema({
  numeroOrden: { type: String, required: true, unique: true, trim: true },
  cliente: {
    nombre: { type: String, required: true, trim: true }
  },
  tipo: { type: String, enum: TIPOS_ORDEN, required: true, trim: true },
  cantidad: {
    type: Number,
    required: true,
    min: 1,
    max: 5000000,
    validate: { validator: Number.isInteger, message: 'La cantidad debe ser un número entero.' }
  },
  tecnicaImpresion: { type: String, enum: TECNICAS_IMPRESION, required: true },
  especificaciones: { type: especificacionesSchema, required: true },
  fechaEntrega: { type: Date, required: true },
  prioridad: { type: String, enum: PRIORIDADES_PRODUCCION, required: true, default: VALORES_POR_DEFECTO_ORDEN.prioridad },
  // Conserva la relación de responsable con el modelo de usuarios.
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  observaciones: { type: String, trim: true, default: '' },
  estado: { type: String, enum: ESTADOS_PRODUCCION, default: VALORES_POR_DEFECTO_ORDEN.estado },
  incidencia: {
    activa: { type: Boolean, default: false }
  }
}, {
  collection: 'ordenes',
  versionKey: false,
  timestamps: true
});

module.exports = mongoose.model('Orden', esquemaOrden);
