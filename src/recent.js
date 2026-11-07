// Películas vistas recientemente (localStorage)
//
// Cargar en cualquier punto después de nodes.js: todo se usa en tiempo de ejecución.

const RECENT_KEY = 'recent_movies';
const RECENT_LIMIT = 15;

function loadRecent() {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_KEY));
        return Array.isArray(stored) ? stored : [];
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
    const entry = { id: movie.id, title: movie.title, poster_path: movie.poster_path };

    recentMovies = [entry, ...recentMovies.filter(item => item.id !== entry.id)]
        .slice(0, RECENT_LIMIT);

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