const Usuario = require('#models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Por favor, introduce tu email y tu contraseña.', data: null });
    }

    // Busca el usuario con el correo normalizado antes de comprobar su clave.
    const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return res.status(401).json({ success: false, message: '¡Datos incorrectos! Vuelve a intentarlo...', data: null });
    }

    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login correcto.',
      data: {
        token,
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
