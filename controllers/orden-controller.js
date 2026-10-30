const Orden = require('#models/Orden');
const Contador = require('#models/Contador');
const { ejecutarTransaccion } = require('#utils/ejecutar-transaccion');
const {
  ESTADOS_PRODUCCION,
  PRIORIDADES_PRODUCCION,
  OPCIONES_ORDEN,
  VALORES_POR_DEFECTO_ORDEN
} = require('#utils/opciones-orden');

function regexSeguro(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizarCliente(cliente) {
  return { nombre: String(cliente?.nombre || '').trim() };
}

function numeroOpcional(valor) {
  if (valor === '' || valor === null || valor === undefined) return undefined;
  return Number(valor);
}

// Asistencia de IA en la normalización de altas y ediciones, preservando campos omitidos y valores del catálogo.
function normalizarEntradaOrden(entrada, ordenExistente, usuario) {
  const anterior = ordenExistente?.toObject ? ordenExistente.toObject() : (ordenExistente || {});
  const especificacion = entrada.especificaciones || anterior.especificaciones || {};
  const especificacionAnterior = anterior.especificaciones || {};
  const troquelado = (especificacion.troquelado ?? especificacionAnterior.troquelado ?? VALORES_POR_DEFECTO_ORDEN.troquelado) === true;

  return {
    numeroOrden: String(anterior.numeroOrden || '').trim(),
    cliente: normalizarCliente(entrada.cliente ?? anterior.cliente),
    tipo: String(entrada.tipo ?? anterior.tipo ?? '').trim(),
    cantidad: Number(entrada.cantidad ?? anterior.cantidad ?? 0),
    tecnicaImpresion: entrada.tecnicaImpresion ?? anterior.tecnicaImpresion ?? VALORES_POR_DEFECTO_ORDEN.tecnicaImpresion,
    especificaciones: {
      ancho: numeroOpcional(especificacion.ancho ?? especificacionAnterior.ancho),
      alto: numeroOpcional(especificacion.alto ?? especificacionAnterior.alto),
      soporte: String(especificacion.soporte ?? especificacionAnterior.soporte ?? '').trim(),
      gramaje: String(especificacion.gramaje ?? especificacionAnterior.gramaje ?? '').trim(),
      tintas: String(especificacion.tintas ?? especificacionAnterior.tintas ?? VALORES_POR_DEFECTO_ORDEN.tintas).trim(),
      acabados: Array.isArray(especificacion.acabados)
        ? especificacion.acabados
        : Array.isArray(especificacionAnterior.acabados) ? especificacionAnterior.acabados : [],
      troquelado,
      numeroTroquel: troquelado
        ? String(especificacion.numeroTroquel ?? especificacionAnterior.numeroTroquel ?? VALORES_POR_DEFECTO_ORDEN.numeroTroquel).trim()
        : VALORES_POR_DEFECTO_ORDEN.numeroTroquel,
      manipuladoEspecial: (especificacion.manipuladoEspecial ?? especificacionAnterior.manipuladoEspecial ?? VALORES_POR_DEFECTO_ORDEN.manipuladoEspecial) === true
    },
    fechaEntrega: entrada.fechaEntrega ?? anterior.fechaEntrega,
    prioridad: entrada.prioridad ?? anterior.prioridad ?? VALORES_POR_DEFECTO_ORDEN.prioridad,
    responsable: entrada.responsable || anterior.responsable || usuario.id,
    observaciones: String(entrada.observaciones ?? anterior.observaciones ?? '').trim(),
    estado: anterior.estado || VALORES_POR_DEFECTO_ORDEN.estado
  };
}

function validarNumeroTroquel(orden) {
  const especificacion = orden.especificaciones;
  if (especificacion.troquelado && !especificacion.numeroTroquel) {
    return 'Indica el número de troquel.';
  }
  return null;
}

function serializarOrden(documento) {
  return documento.toObject ? documento.toObject() : documento;
}

function ordenFinalizada(orden) {
  return orden.estado === OPCIONES_ORDEN.estadoFinalizado;
}

exports.obtenerOpcionesOrden = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Opciones de producción recuperadas.',
    data: { ...OPCIONES_ORDEN, valoresPorDefecto: VALORES_POR_DEFECTO_ORDEN }
  });
};

async function generarNumeroOrden(session) {
  const consultaCantidad = Orden.countDocuments();
  const consultaNumeros = Orden.find({ numeroOrden: /^#\d+$/ }).select('numeroOrden').lean();
  if (session) {
    consultaCantidad.session(session);
    consultaNumeros.session(session);
  }
  const [cantidadOrdenes, ordenesNumeradas] = await Promise.all([consultaCantidad, consultaNumeros]);
  const mayorNumero = ordenesNumeradas.reduce((mayor, orden) => {
    const numero = Number(orden.numeroOrden.slice(1));
    return Math.max(mayor, numero);
  }, cantidadOrdenes);

  // Asistencia de IA en la secuencia atómica, ligada a la transacción que guarda la nueva orden.
  const opcionesContador = { upsert: true };
  if (session) opcionesContador.session = session;
  await Contador.updateOne({ _id: 'ordenes' }, { $max: { valor: mayorNumero } }, opcionesContador);
  const opcionesIncremento = { new: true };
  if (session) opcionesIncremento.session = session;
  const contador = await Contador.findOneAndUpdate(
    { _id: 'ordenes' },
    { $inc: { valor: 1 } },
    opcionesIncremento
  );
  return `#${String(contador.valor).padStart(4, '0')}`;
}

exports.obtenerOrdenes = async (req, res, next) => {
  try {
    const { busqueda } = req.query;
    const expresion = busqueda ? new RegExp(regexSeguro(busqueda), 'i') : null;
    // Asistencia de IA en la consulta segura, limitada al cliente y al número de orden.
    const consulta = expresion
      ? { $or: [
        { 'cliente.nombre': expresion },
        { numeroOrden: expresion }
      ] }
      : {};
    const ordenes = await Orden.find(consulta).sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Órdenes de producción recuperadas.', data: ordenes.map(serializarOrden) });
  } catch (error) { next(error); }
};

exports.crearOrden = async (req, res, next) => {
  try {
    // Asistencia de IA en la validación del troquel y el alta atómica con número secuencial.
    const datos = normalizarEntradaOrden(req.body, null, req.usuario);
    const errorValidacion = validarNumeroTroquel(datos);
    if (errorValidacion) return res.status(400).json({ success: false, message: errorValidacion, data: null });

    const nuevaOrden = new Orden(datos);
    // Reserva el número y guarda la ficha en la misma transacción para evitar saltos si falla el alta.
    await ejecutarTransaccion(async (session) => {
      nuevaOrden.numeroOrden = await generarNumeroOrden(session);
      await nuevaOrden.save(session ? { session } : {});
    });
    res.status(201).json({ success: true, message: 'Orden de producción creada.', data: serializarOrden(nuevaOrden) });
  } catch (error) { next(error); }
};

exports.actualizarOrden = async (req, res, next) => {
  try {
    // Asistencia de IA en la aplicación conjunta de validaciones, bloqueos y actualización transaccional.
    const resultado = await ejecutarTransaccion(async (session) => {
      const consulta = Orden.findById(req.params.id);
      if (session) consulta.session(session);
      const orden = await consulta;
      if (!orden) return { noEncontrada: true };
      if (orden.incidencia?.activa) return { bloqueada: true };
      if (ordenFinalizada(orden)) return { finalizada: true };

      const datos = normalizarEntradaOrden(req.body, orden, req.usuario);
      const errorValidacion = validarNumeroTroquel(datos);
      if (errorValidacion) return { errorValidacion };

      Object.assign(orden, datos);
      await orden.save(session ? { session } : {});
      return { orden };
    });

    if (resultado.errorValidacion) return res.status(400).json({ success: false, message: resultado.errorValidacion, data: null });
    if (resultado.bloqueada) return res.status(423).json({ success: false, message: 'La orden está bloqueada por una incidencia. Resuélvela antes de editarla.', data: null });
    if (resultado.finalizada) return res.status(423).json({ success: false, message: 'No se puede editar una orden finalizada.', data: null });
    if (resultado.noEncontrada) return res.status(404).json({ success: false, message: 'Orden no encontrada.', data: null });
    res.status(200).json({ success: true, message: 'Ficha de producción actualizada.', data: serializarOrden(resultado.orden) });
  } catch (error) { next(error); }
};

exports.cambiarEstadoOrden = async (req, res, next) => {
  try {
    // Asistencia de IA en el flujo canónico, el bloqueo por incidencia y la reapertura de órdenes finalizadas.
    const { nuevoEstado } = req.body;
    if (!ESTADOS_PRODUCCION.includes(nuevoEstado)) {
      return res.status(400).json({ success: false, message: 'El estado no pertenece al flujo de producción vigente.', data: null });
    }
    const resultado = await ejecutarTransaccion(async (session) => {
      const consulta = Orden.findById(req.params.id);
      if (session) consulta.session(session);
      const orden = await consulta;
      if (!orden) return null;
      if (orden.incidencia?.activa) return { bloqueada: true };
      if (orden.estado === nuevoEstado) return orden;
      if (ordenFinalizada(orden) && nuevoEstado !== OPCIONES_ORDEN.estadoReapertura) return { finalizada: true };
      orden.estado = nuevoEstado;
      await orden.save(session ? { session } : {});
      return orden;
    });

    if (!resultado) return res.status(404).json({ success: false, message: 'Orden no encontrada.', data: null });
    if (resultado.bloqueada) return res.status(423).json({ success: false, message: 'La orden está bloqueada por una incidencia. Resuélvela antes de cambiar su estado.', data: null });
    if (resultado.finalizada) return res.status(423).json({
      success: false,
      message: `Una orden finalizada solo puede reabrirse en ${OPCIONES_ORDEN.estadoReapertura}.`,
      data: null
    });
    res.status(200).json({ success: true, message: 'Estado de producción actualizado.', data: serializarOrden(resultado) });
  } catch (error) { next(error); }
};

exports.cambiarPrioridadOrden = async (req, res, next) => {
  try {
    const { prioridad } = req.body;
    if (!PRIORIDADES_PRODUCCION.includes(prioridad)) {
      return res.status(400).json({ success: false, message: 'La prioridad debe ser Baja, Normal o Urgente.', data: null });
    }

    // Asistencia de IA en el cambio transaccional de prioridad, excluyendo incidencias y órdenes finalizadas.
    const orden = await ejecutarTransaccion((session) => {
      const opcionesActualizacion = { new: true, runValidators: true };
      if (session) opcionesActualizacion.session = session;
      return Orden.findOneAndUpdate(
        {
          _id: req.params.id,
          'incidencia.activa': { $ne: true },
          estado: { $ne: OPCIONES_ORDEN.estadoFinalizado }
        },
        { $set: { prioridad } },
        opcionesActualizacion
      );
    });
    if (!orden) {
      const existe = await Orden.findById(req.params.id).select('incidencia.activa estado');
      if (!existe) return res.status(404).json({ success: false, message: 'Orden no encontrada.', data: null });
      if (ordenFinalizada(existe)) return res.status(423).json({ success: false, message: 'No se puede cambiar la prioridad de una orden finalizada.', data: null });
      return res.status(423).json({ success: false, message: 'La orden está bloqueada por una incidencia. Resuélvela antes de cambiar su prioridad.', data: null });
    }
    res.status(200).json({ success: true, message: 'Prioridad de producción actualizada.', data: serializarOrden(orden) });
  } catch (error) { next(error); }
};

exports.eliminarOrden = async (req, res, next) => {
  try {
    // Asistencia de IA en el borrado condicionado: una orden bloqueada o finalizada se conserva.
    const eliminada = await ejecutarTransaccion((session) => {
      const consulta = Orden.findOneAndDelete({
        _id: req.params.id,
        'incidencia.activa': { $ne: true },
        estado: { $ne: OPCIONES_ORDEN.estadoFinalizado }
      });
      if (session) consulta.session(session);
      return consulta;
    });
    if (!eliminada) {
      const existe = await Orden.findById(req.params.id).select('estado');
      if (!existe) return res.status(404).json({ success: false, message: 'Orden no encontrada.', data: null });
      if (ordenFinalizada(existe)) return res.status(423).json({ success: false, message: 'No se puede eliminar una orden finalizada.', data: null });
      return res.status(423).json({ success: false, message: 'La orden está bloqueada por una incidencia. Resuélvela antes de eliminarla.', data: null });
    }
    res.status(200).json({ success: true, message: 'Orden de producción eliminada.', data: { id: eliminada._id } });
  } catch (error) { next(error); }
};

exports.cambiarIncidenciaOrden = async (req, res, next) => {
  try {
    // Asistencia de IA en el bloqueo operativo y la resolución de incidencias, respetando órdenes finalizadas.
    const { activa } = req.body;
    if (typeof activa !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Indica si la incidencia queda activa o resuelta.', data: null });
    }
    const resultado = await ejecutarTransaccion(async (session) => {
      const consulta = Orden.findById(req.params.id);
      if (session) consulta.session(session);
      const orden = await consulta;
      if (!orden) return null;
      if (ordenFinalizada(orden)) return { finalizada: true };
      if (orden.incidencia?.activa === activa) return orden;

      orden.incidencia = { activa };
      await orden.save(session ? { session } : {});
      return orden;
    });
    if (!resultado) return res.status(404).json({ success: false, message: 'Orden no encontrada.', data: null });
    if (resultado.finalizada) return res.status(423).json({ success: false, message: 'No se puede registrar una incidencia en una orden finalizada.', data: null });
    res.status(200).json({
      success: true,
      message: activa ? 'Orden bloqueada por incidencia.' : 'Incidencia resuelta; orden desbloqueada.',
      data: serializarOrden(resultado)
    });
  } catch (error) { next(error); }
};
