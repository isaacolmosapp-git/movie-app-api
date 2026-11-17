# MovieApp (Películas & Series)

Aplicación web interactiva SPA (Single Page Application) para explorar y descubrir películas y series en tiempo real, consumiendo la API de **The Movie Database (TMDB)**. Desarrollada con JavaScript Vanilla (ES6+), HTML5 semántico y CSS moderno, ofreciendo una experiencia fluida, responsiva y adaptable.

---

## Características y Funcionalidades

- **Selector Dinámico (Películas / Series):** Permite alternar la plataforma completa entre contenido cinematográfico y televisivo con un solo clic, adaptando automáticamente las categorías, tendencias, recomendaciones y el tema visual. La selección se persiste en `localStorage`.
- **Hero Carrusel Interactivo:** Carrusel accesible en la página de inicio con controles de reproducción/pausa, paginación con puntos táctiles, soporte para gestos táctiles (swipe) y navegación por teclado.
- **Vistas y Navegación sin Recargas:** Enrutamiento basado en hash (`#home`, `#trends`, `#category`, `#search`, `#people`, `#library`, `#movie`, `#tv`, etc.) con persistencia y restauración del scroll al volver atrás.
- **Paginación Adaptativa:** Scroll infinito para dispositivos móviles y botón *"Cargar más"* optimizado en paralelo para escritorio, junto con estados de carga animados (*skeletons*).
- **Buscador Integral e Historial:** Panel de búsqueda con guardado de consultas recientes, sugerencias por categorías y resultados en tiempo real.
- **Explorador de Reparto y Personas:** Fichas detalladas de actores y directores con biografía y filmografía categorizada por rol.
- **Gestión de Favoritos y Listas Personalizadas:** Creación y renombrado de listas personalizadas en el navegador (`localStorage`) y marcado rápido de favoritos con sincronización entre pestañas.
- **Reproductor de Tráilers:** Integración de tráilers oficiales en ventana modal (`<dialog>`) embebida mediante YouTube.

---

## Tecnologías Utilizadas

- **HTML5:** Estructura semántica y componentes nativos (`<dialog>`, `<picture>`, atributos ARIA).
- **CSS3:** Variables CSS para temas dinámicos, Flexbox, Grid y diseño totalmente *Mobile First* y *Desktop Responsive*.
- **JavaScript Vanilla (ES6+):** Arquitectura modular basada en eventos (`EventTarget`, `IntersectionObserver`, `AbortController`).
- **Axios:** Cliente HTTP para comunicación eficiente con los endpoints REST de TMDB.

---

## Cómo Ejecutar en Modo Desarrollador

Dado que la aplicación es puramente frontend estática, solo requieres un servidor web local para servir los archivos correctamente.

### 1. Clonar el repositorio
```bash
git clone https://github.com/isaacolmosapp-git/movie-app-api.git
cd movie-app-api-v2
```

### 2. Configurar la API Key de TMDB
Copia el archivo de ejemplo para generar tu archivo de configuración de credenciales:

```bash
# En Windows (PowerShell)
Copy-Item src/secrets.example.js src/secrets.js

# En Linux / macOS
cp src/secrets.example.js src/secrets.js
```

Abre `src/secrets.js` y reemplaza el valor con tu clave privada:
```javascript
const API_KEY = 'TU_API_KEY_DE_TMDB';
```

> **Nota:** El archivo `src/secrets.js` está incluido en `.gitignore` para garantizar que tus credenciales nunca se suban al repositorio.

### 3. Iniciar un servidor de desarrollo local

Puedes utilizar cualquiera de las siguientes opciones:

- **Opción A (Extensión de VS Code):**
  Instala la extensión **Live Server** en Visual Studio Code, haz clic derecho sobre `index.html` y selecciona *"Open with Live Server"*.

- **Opción B (Python):**
  ```bash
  python -m http.server 3000
  ```
  Luego abre en tu navegador: `http://localhost:3000`

- **Opción C (Node.js / npx):**
  ```bash
  npx serve .
  ```

---

## Dónde y Cómo Generar la API Key de TMDB

Para utilizar la aplicación necesitas una cuenta gratuita de desarrollador en TMDB:

1. Ingresa a [The Movie Database (TMDB)](https://www.themoviedb.org/) y regístrate o inicia sesión.
2. Ve a los ajustes de tu cuenta haciendo clic en tu avatar en la esquina superior derecha y seleccionando **Ajustes** (o ingresa directo a [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)).
3. En el menú lateral izquierdo, haz clic en **API**.
4. En la sección *"Solicitar una clave de API"*, selecciona la opción **Developer** (Desarrollador) y completa el formulario con datos básicos de uso personal/educativo.
5. Una vez aprobada de forma instantánea, copia tu **Clave de API (v3 auth)** y pégala en tu archivo `src/secrets.js`.
