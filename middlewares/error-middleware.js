exports.notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada - ${req.originalUrl}`, data: null });
};

exports.errorHandler = (err, req, res, next) => {
  // Asistencia de IA en la conversión de errores Mongoose/HTTP y el filtrado de detalles en producción.
  const statusDeError = Number(err.statusCode || err.status);
  let statusCode = Number.isInteger(statusDeError) && statusDeError >= 400 && statusDeError <= 599
    ? statusDeError
    : res.statusCode === 200 ? 500 : res.statusCode;
  if (err.name === 'ValidationError' || err.name === 'CastError') statusCode = 400;
  if (err.code === 11000) statusCode = 409;

  // En producción se devuelve un mensaje neutro para no filtrar detalles internos del servidor.
  const mensaje = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor.'
    : err.message || 'Error interno del servidor.';

  res.status(statusCode).json({
    success: false,
    message: mensaje,
    data: process.env.NODE_ENV === 'production' ? null : { stack: err.stack }
  });
};
