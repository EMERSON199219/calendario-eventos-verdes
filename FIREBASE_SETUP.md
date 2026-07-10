# Configuración de Firebase para Sincronización en la Nube

## Pasos para habilitar la sincronización de eventos en múltiples dispositivos:

### 1. Crear un Proyecto Firebase Gratuito

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **"Crear un proyecto"**
3. Ingresa el nombre: `calendario-eventos` (o el que prefieras)
4. Acepta los términos y crea el proyecto
5. Espera a que se complete la creación

### 2. Configurar Firestore

1. En la consola de Firebase, ve a **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona modo de prueba (para desarrollo)
4. Elige la ubicación más cercana (ej: us-central1 o Sudamérica)
5. Crea la base de datos

### 3. Obtener Configuración de Firebase

1. En Firebase Console, ve a **Configuración del proyecto** (engranaje en la esquina superior derecha)
2. Ve a la pestaña **"Aplicaciones"**
3. Haz clic en **"Agregar aplicación"** y elige **"Web"**
4. Se mostrará un bloque de código similar a esto:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

### 4. Actualizar firebase-config.js

1. Abre el archivo `firebase-config.js` en tu proyecto
2. Reemplaza toda la sección `firebaseConfig` con los valores que obtuviste en el paso anterior
3. Guarda el archivo

### 5. Configurar Reglas de Seguridad (Importante)

1. En Firebase Console, ve a **Firestore Database** → **Reglas**
2. Reemplaza el contenido con esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document=**} {
      allow read, write: if request.auth != null || true;
    }
  }
}
```

3. Haz clic en **"Publicar"**

### 6. Prueba el Sincronización

1. Abre la aplicación en tu navegador
2. Inicia sesión con: `COMBO27` / `Combo2027@`
3. Crea algunos eventos
4. Abre otro navegador o dispositivo
5. Ingresa los mismos datos
6. ¡Verás los mismos eventos sincronizados!

## Notas:
- Los eventos se guardan en Firestore automáticamente
- También se guardan localmente como respaldo
- La sincronización funciona en cualquier dispositivo
- Si Firestore no está disponible, sigue usando el almacenamiento local
