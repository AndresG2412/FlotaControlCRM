#!/usr/bin/env node

// Script para asignar el rol de administrador a un usuario existente en Firebase

const admin = require('firebase-admin');

// ============================================================================
// 1. CONFIGURACIÓN: ESCRIBE AQUÍ EL CORREO AL QUE QUIERES DARLE EL ROL DE ADMIN
// ============================================================================
const emailToMakeAdmin = 'cgaviria930@gmail.com'; 


// 2. Inicializar Firebase Admin SDK
// El script busca automáticamente el archivo serviceAccountKey.json que ya pusiste en la raíz
try {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('No se encontró el archivo serviceAccountKey.json en la raíz del proyecto.');
  console.error('Asegúrate de que el archivo se llame exactamente "serviceAccountKey.json" y esté en d:\\programacion\\flota\\');
  process.exit(1);
}

const auth = admin.auth();

// Función principal
async function main() {
  console.log('=== Script para asignar rol de administrador en Firebase ===\n');

  if (emailToMakeAdmin === 'tu_correo_aqui@gmail.com') {
    console.error('Error: Debes cambiar la variable "emailToMakeAdmin" en el archivo scripts/create-admin.js por el correo real de tu usuario.');
    process.exit(1);
  }

  try {
    console.log(`Buscando al usuario con el correo: ${emailToMakeAdmin}...`);
    
    // Buscar el usuario existente por su correo
    const userRecord = await auth.getUserByEmail(emailToMakeAdmin);

    console.log(`Usuario encontrado con UID: ${userRecord.uid}`);

    // Establecer el rol de administrador como claim personalizado
    await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

    console.log('\n¡ÉXITO! Rol de administrador asignado correctamente.');
    console.log(`El usuario ${emailToMakeAdmin} ahora tiene permisos de admin.`);
    console.log('Nota: Es posible que el usuario necesite cerrar sesión y volver a iniciarla para que los cambios surtan efecto en la web.');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\nError: No se encontró ningún usuario con el correo "${emailToMakeAdmin}".`);
      console.error('Verifica que el correo esté escrito correctamente y que el usuario ya se haya registrado en tu aplicación.');
    } else {
      console.error('\nError al asignar el rol:', error.message);
    }
    process.exit(1);
  }
}

main();