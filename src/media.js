// Tipo de contenido de la app: 'movie' o 'tv'.
//
// Hoy la app solo funciona con películas. El ajuste ya se guarda y se aplica, de modo que
// el interruptor futuro solo tendrá que llamar a setMediaType('tv') y añadir 'tv' a
// SUPPORTED_MEDIA_TYPES cuando todo lo demás esté listo.
//
// Cargar justo después de nodes.js y antes de favorites.js, recent.js y pagination.js.

const MEDIA_KEY = 'media_type';
const DEFAULT_MEDIA_TYPE = 'movie';

// Tipos que la app ya sabe mostrar de principio a fin
const SUPPORTED_MEDIA_TYPES = ['movie'];

function loadMediaType() {
    try {
        const stored = localStorage.getItem(MEDIA_KEY);
        return SUPPORTED_MEDIA_TYPES.includes(stored) ? stored : DEFAULT_MEDIA_TYPE;
    } catch {
        // localStorage no disponible (modo privado, etc.)
        return DEFAULT_MEDIA_TYPE;
    }
}

let mediaType = loadMediaType();

// Permite cambiar los colores u otros detalles por tipo desde el CSS: html[data-mode="tv"] { ... }
document.documentElement.dataset.mode = mediaType;

function getMediaType() {
    return mediaType;
}

function setMediaType(type) {
    if (!SUPPORTED_MEDIA_TYPES.includes(type) || type === mediaType) return;

    mediaType = type;
    document.documentElement.dataset.mode = type;

    try {
        localStorage.setItem(MEDIA_KEY, type);
    } catch (error) {
        console.error('No se pudo guardar el tipo de contenido:', error);
    }

    window.dispatchEvent(new Event('mediatype:changed'));
}
