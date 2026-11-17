// ---------- Historial de recientes ----------
const RECENT_KEY = 'recent_movies';
const RECENT_LIMIT = 15;

function loadRecent() {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_KEY));
        if (!Array.isArray(stored)) return [];
        return stored.map(item => ({ ...item, type: item.type ?? 'movie' }));
    } catch {
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

function trackRecentlyViewed(movie) {
    const entry = {
        id: movie.id,
        type: movie.type ?? getMediaType(),
        title: movie.title ?? movie.name ?? '',
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

// ---------- Eventos ----------
window.addEventListener('storage', event => {
    if (event.key !== RECENT_KEY) return;
    recentMovies = loadRecent();
    window.dispatchEvent(new Event('recent:changed'));
});
