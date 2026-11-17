// ---------- Almacenamiento de favoritos ----------
const FAVORITES_KEY = 'favorite_movies';

function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
        if (!Array.isArray(stored)) return [];
        return stored.map(item => ({ ...item, type: item.type ?? 'movie' }));
    } catch {
        return [];
    }
}

let favoriteMovies = loadFavorites();

function saveFavorites() {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteMovies));
    } catch (error) {
        console.error('No se pudieron guardar los favoritos:', error);
    }
}

function isFavorite(movieId, type = getMediaType()) {
    return favoriteMovies.some(movie => movie.id === Number(movieId) && movie.type === type);
}

function toggleFavorite(movie) {
    const id = Number(movie.id);
    const type = movie.type ?? getMediaType();

    if (isFavorite(id, type)) {
        favoriteMovies = favoriteMovies.filter(m => !(m.id === id && m.type === type));
    } else {
        favoriteMovies = [
            { id, type, title: movie.title ?? movie.name ?? '', poster_path: movie.poster_path },
            ...favoriteMovies
        ];
    }

    saveFavorites();
    refreshFavoritesUI();
}

// ---------- Botones de favoritos ----------
function setFavoriteButtonState(btn, active) {
    btn.setAttribute('aria-pressed', String(active));

    const icon = btn.querySelector('.fav-btn__icon');
    icon.textContent = active ? '♥' : '♡';

    const label = btn.querySelector('.fav-btn__label');
    const text = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
    if (label) {
        label.textContent = text;
    } else {
        btn.setAttribute('aria-label', text);
    }
}

function createFavoriteButton(movie) {
    const type = movie.type ?? getMediaType();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('fav-btn');
    btn.dataset.favId = movie.id;
    btn.dataset.favType = type;
    btn.innerHTML = '<span class="fav-btn__icon" aria-hidden="true"></span>';
    setFavoriteButtonState(btn, isFavorite(movie.id, type));

    btn.addEventListener('click', event => {
        event.stopPropagation();
        toggleFavorite({ ...movie, type });
    });

    return btn;
}

function bindDetailFavoriteButton(movie) {
    const type = movie.type ?? getMediaType();

    movieDetailFavBtn.dataset.favId = movie.id;
    movieDetailFavBtn.dataset.favType = type;
    movieDetailFavBtn.onclick = () => toggleFavorite({
        id: movie.id,
        type,
        title: movie.title ?? movie.name ?? '',
        poster_path: movie.poster_path
    });
    setFavoriteButtonState(movieDetailFavBtn, isFavorite(movie.id, type));
}

function updateFavoriteButtons() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
        setFavoriteButtonState(btn, isFavorite(btn.dataset.favId, btn.dataset.favType));
    });
}

// ---------- Vista previa de favoritos ----------
const FAVORITES_PREVIEW_LIMIT = 12;

favoritesMoreBtn.addEventListener('click', () => {
    location.hash = '#favorites';
});

function renderFavorites() {
    const currentType = getMediaType();
    const typeFavorites = favoriteMovies.filter(m => (m.type ?? 'movie') === currentType);

    favoritesPreviewSection.classList.toggle('is-empty', typeFavorites.length === 0);

    const hasMore = typeFavorites.length > FAVORITES_PREVIEW_LIMIT;
    favoritesMoreBtn.classList.toggle('inactive', !hasMore);
    favoritesMoreBtn.textContent = `Ver todos (${typeFavorites.length})`;

    const scrollLeft = favoritesContainer.scrollLeft;
    createMovies(typeFavorites.slice(0, FAVORITES_PREVIEW_LIMIT), favoritesContainer);
    favoritesContainer.scrollLeft = scrollLeft;
}

function refreshFavoritesUI() {
    renderFavorites();
    updateFavoriteButtons();
    window.dispatchEvent(new Event('favorites:changed'));
}

// ---------- Eventos ----------
window.addEventListener('storage', event => {
    if (event.key !== FAVORITES_KEY) return;
    favoriteMovies = loadFavorites();
    refreshFavoritesUI();
});

window.addEventListener('mediatype:changed', refreshFavoritesUI);
window.addEventListener('DOMContentLoaded', renderFavorites);
