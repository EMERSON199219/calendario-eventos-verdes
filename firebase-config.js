// Configuración de Firebase
// Reemplaza estos valores con los de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDICm3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q", // Reemplazar
  authDomain: "tu-proyecto.firebaseapp.com",         // Reemplazar
  projectId: "tu-proyecto",                          // Reemplazar
  storageBucket: "tu-proyecto.appspot.com",         // Reemplazar
  messagingSenderId: "123456789",                   // Reemplazar
  appId: "1:123456789:web:abcd1234efgh5678"        // Reemplazar
};

// Inicializar Firebase
let db = null;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
}
