if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('#routes/auth-routes');
const ordenRoutes = require('#routes/orden-routes');
const { notFound, errorHandler } = require('#middlewares/error-middleware');

const app = express();
const esProduccion = process.env.NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL?.trim()
  || (esProduccion ? '' : 'mongodb://localhost:27017/artefacto_grafico_db');
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL debe configurarse en producción.');
}
if (!process.env.JWT_SECRET?.trim()) {
  throw new Error('JWT_SECRET debe configurarse en el entorno.');
}
const frontendUrl = process.env.FRONTEND_URL?.trim()
  || (esProduccion ? '' : 'http://localhost:5173');
if (!frontendUrl) {
  throw new Error('FRONTEND_URL debe configurarse en producción.');
}
const allowedOrigins = frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
let databaseConnection;

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Asistencia de IA en la conexión serverless: conecta a demanda y reutiliza la promesa entre solicitudes.
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      databaseConnection ||= mongoose.connect(DATABASE_URL).catch((error) => {
        databaseConnection = null;
        throw error;
      });
      await databaseConnection;
    }
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => res.status(200).json({ success: true, message: 'API disponible.', data: { estado: 'ok' } }));
app.use('/api/auth', authRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const puerto = Number(process.env.PORT) || 3000;
  mongoose.connect(DATABASE_URL)
    .then(() => {
      process.stdout.write('Conexión con MongoDB establecida correctamente.\n');
      app.listen(puerto, () => {
        process.stdout.write(`Servidor Express escuchando en el puerto ${puerto}.\n`);
      });
    })
    .catch((error) => {
      process.stderr.write(`No se pudo establecer la conexión con MongoDB: ${error.message}\n`);
      process.exit(1);
    });
}

module.exports = app;
