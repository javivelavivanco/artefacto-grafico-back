const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fs = require('node:fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('#models/Usuario');
const Orden = require('#models/Orden');
const Contador = require('#models/Contador');

// Convierte Extended JSON de los ficheros semilla a tipos BSON antes de guardarlos.
function decodificarExtendedJson(valor) {
  if (Array.isArray(valor)) return valor.map(decodificarExtendedJson);
  if (valor && typeof valor === 'object') {
    if ('$oid' in valor) return new mongoose.Types.ObjectId(valor.$oid);
    if ('$date' in valor) return new Date(valor.$date);
    return Object.fromEntries(Object.entries(valor).map(([clave, contenido]) => [clave, decodificarExtendedJson(contenido)]));
  }
  return valor;
}

async function ejecutarSeed() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL debe configurarse antes de ejecutar el seed.');
  await mongoose.connect(process.env.DATABASE_URL);

  const usuarios = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-usuarios.json'), 'utf8'));
  const ordenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-ordenes.json'), 'utf8'));

  for (const origen of usuarios) {
    const usuario = decodificarExtendedJson(origen);
    usuario.email = usuario.email.trim().toLowerCase();
    usuario.password = await bcrypt.hash(usuario.password, 12);
    // El seed vuelve a cifrar cada clave de demostración y nunca almacena texto plano.
    const { _id, createdAt, updatedAt, ...datosUsuario } = usuario;
    await Usuario.updateOne(
      { _id },
      { $set: datosUsuario },
      { upsert: true, runValidators: true }
    );
  }

  for (const origen of ordenes) {
    const orden = decodificarExtendedJson(origen);
    // El identificador fijo permite volver a cargar los registros sin duplicarlos.
    const { _id, createdAt, updatedAt, ...datosOrden } = orden;
    await Orden.updateOne(
      { _id },
      { $set: datosOrden, $setOnInsert: { _id } },
      { upsert: true, runValidators: true }
    );
  }

  const secuenciaSeed = ordenes.reduce((mayor, orden) => {
    const numero = Number(String(orden.numeroOrden).match(/^#(\d+)$/)?.[1] || 0);
    return Math.max(mayor, numero);
  }, 0);
  // El seed deja el contador por encima del número más alto de las órdenes cargadas.
  await Contador.updateOne({ _id: 'ordenes' }, { $max: { valor: secuenciaSeed } }, { upsert: true });

  process.stdout.write(`Siembra de datos completada con éxito: ${usuarios.length} usuarios y ${ordenes.length} órdenes de producción.\n`);
}

ejecutarSeed()
  .catch((error) => {
    process.stderr.write(`No se pudo cargar el seed: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());