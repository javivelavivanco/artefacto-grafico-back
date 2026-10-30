const mongoose = require('mongoose');

exports.ejecutarTransaccion = async (operacion) => {
  // Asistencia de IA en este helper; centraliza transacciones y permite MongoDB standalone sin sesiones.
  if (process.env.MONGO_TRANSACTIONS !== 'true') {
    return operacion(null);
  }

  const session = await mongoose.startSession();
  try {
    let resultado;
    await session.withTransaction(async () => {
      resultado = await operacion(session);
    });
    return resultado;
  } finally {
    await session.endSession();
  }
};
