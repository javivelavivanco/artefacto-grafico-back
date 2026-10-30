// Este catálogo alimenta el formulario desde la API y también valida el esquema de Mongoose.
const TIPOS_ORDEN = ['Tarjeta', 'Cartel', 'Revista', 'Folleto', 'Libro', 'Lona', 'Otros'];
const TECNICAS_IMPRESION = ['Offset', 'Digital', 'Digital Gran Formato', 'Flexografía', 'Huecograbado'];
const ESTADOS_PRODUCCION = ['Diseño', 'Preimpresión', 'Impresión', 'Manipulado', 'Finalizado'];
const ESTADO_FILTRO_INCIDENCIA = 'incidencia';
const ESTADOS_FILTRO = [
  ...ESTADOS_PRODUCCION.map((estado) => ({ valor: estado, etiqueta: estado })),
  { valor: ESTADO_FILTRO_INCIDENCIA, etiqueta: 'Incidencia' }
];
const PRIORIDADES_PRODUCCION = ['Baja', 'Normal', 'Urgente'];
const TINTAS_PERMITIDAS = ['Cuatricomía (CMYK)', 'Tintas planas (Pantone)', 'CMYK + Pantone'];
const ACABADOS_PERMITIDOS = ['Barniz UVI', 'Barniz UVI Mate', 'Laminado', 'Plastificado'];
const GRAMAJES_PERMITIDOS = ['80 g/m²', '90 g/m²', '115 g/m²', '135 g/m²', '170 g/m²', '250 g/m²', '300 g/m²', '350 g/m²', '350+ g/m²'];
const SOPORTES_PERMITIDOS = ['Papel estucado', 'Papel mate', 'Cartulina', 'Cartón', 'PVC', 'Otro'];
const ESTADO_FINALIZADO = ESTADOS_PRODUCCION.at(-1);
const ESTADOS_EN_FABRICACION = ESTADOS_PRODUCCION.filter((estado) => estado !== ESTADO_FINALIZADO);
const ESTADO_REAPERTURA = ESTADOS_EN_FABRICACION.at(-1);
const OPCIONES_ORDEN = {
  tipos: TIPOS_ORDEN,
  tecnicasImpresion: TECNICAS_IMPRESION,
  estados: ESTADOS_PRODUCCION,
  estadosFiltro: ESTADOS_FILTRO,
  estadoFiltroIncidencia: ESTADO_FILTRO_INCIDENCIA,
  estadosEnFabricacion: ESTADOS_EN_FABRICACION,
  estadosEditables: ESTADOS_EN_FABRICACION,
  estadoFinalizado: ESTADO_FINALIZADO,
  estadoReapertura: ESTADO_REAPERTURA,
  prioridades: PRIORIDADES_PRODUCCION,
  tintas: TINTAS_PERMITIDAS,
  acabados: ACABADOS_PERMITIDOS,
  gramajes: GRAMAJES_PERMITIDOS,
  soportes: SOPORTES_PERMITIDOS
};
const VALORES_POR_DEFECTO_ORDEN = {
  tecnicaImpresion: '',
  tintas: '',
  troquelado: false,
  numeroTroquel: '',
  manipuladoEspecial: false,
  prioridad: PRIORIDADES_PRODUCCION[1],
  estado: ESTADOS_PRODUCCION[0]
};

module.exports = {
  TIPOS_ORDEN,
  TECNICAS_IMPRESION,
  ESTADOS_PRODUCCION,
  PRIORIDADES_PRODUCCION,
  TINTAS_PERMITIDAS,
  ACABADOS_PERMITIDOS,
  GRAMAJES_PERMITIDOS,
  SOPORTES_PERMITIDOS,
  OPCIONES_ORDEN,
  VALORES_POR_DEFECTO_ORDEN
};
