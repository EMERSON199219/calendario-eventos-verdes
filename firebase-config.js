// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDHKR1UkqAaT1Jka_v9euo3afb4E2XloA",
  authDomain: "cronograma-47eed.firebaseapp.com",
  projectId: "cronograma-47eed",
  storageBucket: "cronograma-47eed.firebasestorage.app",
  messagingSenderId: "527539901782",
  appId: "1:527539901782:web:OWU4NDdhMDctM2QzNy00YzA5LWE2NDYtzU4ZDUyNGUyOGEy"
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
