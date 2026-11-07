// Películas vistas recientemente (localStorage)
//
// Cargar DESPUÉS de media.js; el resto se usa en tiempo de ejecución.
//
// Cada entrada es { id, type, title, poster_path }. El tipo ('movie' | 'tv') es necesario
// porque los id de películas y series se solapan.

const RECENT_KEY = 'recent_movies';
const RECENT_LIMIT = 15;

function loadRecent() {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_KEY));
        if (!Array.isArray(stored)) return [];

        // Las entradas guardadas antes de existir el tipo eran todas películas
        return stored.map(item => ({ ...item, type: item.type ?? 'movie' }));
    } catch {
        // JSON corrupto o localStorage no disponible
        return [];
    }
}

let recentMovies = loadRecent();

function saveRecent() {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(recentMovies));
    } catch (error) {
        console.error('No se pudo guardar el historial:', error);
    }
}

function getRecentlyViewed() {
    return recentMovies;
}

// Se llama al abrir el detalle de una película: la deja la primera y sin duplicados
function trackRecentlyViewed(movie) {
    const entry = {
        id: movie.id,
        type: movie.type ?? getMediaType(),
        title: movie.title,
        poster_path: movie.poster_path
    };

    recentMovies = [
        entry,
        ...recentMovies.filter(item => !(item.id === entry.id && item.type === entry.type))
    ].slice(0, RECENT_LIMIT);

    saveRecent();
    window.dispatchEvent(new Event('recent:changed'));
}

function clearRecentlyViewed() {
    recentMovies = [];
    saveRecent();
    window.dispatchEvent(new Event('recent:changed'));
}

// Cambios hechos en otra pestaña
window.addEventListener('storage', event => {
    if (event.key !== RECENT_KEY) return;
    recentMovies = loadRecent();
    window.dispatchEvent(new Event('recent:changed'));
});