// ---------- Configuración de tipo de contenido ----------
const MEDIA_KEY = 'media_type';
const DEFAULT_MEDIA_TYPE = 'movie';
const SUPPORTED_MEDIA_TYPES = ['movie', 'tv'];

function loadMediaType() {
    try {
        const stored = localStorage.getItem(MEDIA_KEY);
        return SUPPORTED_MEDIA_TYPES.includes(stored) ? stored : DEFAULT_MEDIA_TYPE;
    } catch {
        return DEFAULT_MEDIA_TYPE;
    }
}

let mediaType = loadMediaType();
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
