const express = require('express');
const router = express.Router();
const ordenController = require('#controllers/orden-controller');
const { proteger, requerirRol } = require('#middlewares/auth-middleware');

// Todas las operaciones de órdenes requieren sesión; las mutaciones de producción exigen ese rol.
router.use(proteger);

router.get('/opciones', ordenController.obtenerOpcionesOrden);

router.route('/')
  .get(ordenController.obtenerOrdenes)
  .post(requerirRol('produccion'), ordenController.crearOrden);

router.route('/:id')
  .put(requerirRol('produccion'), ordenController.actualizarOrden)
  .delete(requerirRol('produccion'), ordenController.eliminarOrden);

router.patch('/:id/estado', requerirRol('produccion'), ordenController.cambiarEstadoOrden);
router.patch('/:id/prioridad', requerirRol('produccion'), ordenController.cambiarPrioridadOrden);
router.patch('/:id/incidencia', ordenController.cambiarIncidenciaOrden);

module.exports = router;
