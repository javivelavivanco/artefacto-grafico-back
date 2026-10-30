const jwt = require('jsonwebtoken');

// Asistencia de IA en la validación del bearer token y la extracción de identidad y rol del JWT.
exports.proteger = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Debes iniciar sesión para continuar.', data: null });
  }

  try {
    // El rol firmado en el JWT acompaña cada solicitud para aplicar permisos por ruta.
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'La sesión no es válida o ha caducado.', data: null });
  }
};

// Asistencia de IA en la comprobación de permisos por rol antes de ejecutar operaciones restringidas.
exports.requerirRol = (...rolesPermitidos) => (req, res, next) => {
  if (!rolesPermitidos.includes(req.usuario?.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta operación.', data: null });
  }
  next();
};
