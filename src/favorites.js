// Favoritos con localStorage
//
// Cargar DESPUÉS de nodes.js y media.js, y ANTES de main.js.
// Requiere: favoritesPreviewSection, favoritesContainer, favoritesMoreBtn y movieDetailFavBtn
//           (nodes.js), getMediaType (media.js).
// createMovies (main.js) se usa solo en tiempo de ejecución, no al cargar el archivo.
//
// Cada favorito es { id, type, title, poster_path }. El tipo ('movie' | 'tv') es necesario
// porque los id de películas y series se solapan.

const FAVORITES_KEY = 'favorite_movies';

function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
        if (!Array.isArray(stored)) return [];

        // Los favoritos guardados antes de existir el tipo eran todos películas
        return stored.map(item => ({ ...item, type: item.type ?? 'movie' }));
    } catch {
        // JSON corrupto o localStorage no disponible (modo privado, etc.)
        return [];
    }
}

// Copia en memoria: evita leer y parsear localStorage por cada tarjeta
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
        // Solo se guarda lo necesario para dibujar la tarjeta; la más reciente va primero
        favoriteMovies = [
            { id, type, title: movie.title, poster_path: movie.poster_path },
            ...favoriteMovies
        ];
    }

    saveFavorites();
    refreshFavoritesUI();
}

// ---------- Botones corazón ----------
function setFavoriteButtonState(btn, active) {
    btn.setAttribute('aria-pressed', String(active));

    const icon = btn.querySelector('.fav-btn__icon');
    icon.textContent = active ? '♥' : '♡'; // el glifo cambia, no solo el color

    const label = btn.querySelector('.fav-btn__label');
    const text = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
    if (label) {
        label.textContent = text;
    } else {
        btn.setAttribute('aria-label', text);
    }
}

// Botón para las tarjetas de película
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
        event.stopPropagation(); // que no abra el detalle de la película
        toggleFavorite({ ...movie, type });
    });

    return btn;
}

// Botón de la vista de detalle (ya existe en el HTML)
function bindDetailFavoriteButton(movie) {
    const type = movie.type ?? getMediaType();

    movieDetailFavBtn.dataset.favId = movie.id;
    movieDetailFavBtn.dataset.favType = type;
    // onclick evita acumular listeners
    movieDetailFavBtn.onclick = () => toggleFavorite({
        id: movie.id,
        type,
        title: movie.title,
        poster_path: movie.poster_path
    });
    setFavoriteButtonState(movieDetailFavBtn, isFavorite(movie.id, type));
}

// Mantiene sincronizados todos los corazones visibles
function updateFavoriteButtons() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
        setFavoriteButtonState(btn, isFavorite(btn.dataset.favId, btn.dataset.favType));
    });
}

// ---------- Sección del home ----------
const FAVORITES_PREVIEW_LIMIT = 12; // el resto se ve en la vista Favoritos

favoritesMoreBtn.addEventListener('click', () => {
    location.hash = '#favorites';
});

function renderFavorites() {
    // is-empty oculta la sección sin favoritos; la clase "inactive" la maneja el router
    favoritesPreviewSection.classList.toggle('is-empty', favoriteMovies.length === 0);

    // "Ver todos" solo aparece si hay más favoritos de los que caben en la vista previa
    const hasMore = favoriteMovies.length > FAVORITES_PREVIEW_LIMIT;
    favoritesMoreBtn.classList.toggle('inactive', !hasMore);
    favoritesMoreBtn.textContent = `Ver todos (${favoriteMovies.length})`;

    // Al quitar un favorito del medio de la lista, no se pierde la posición del scroll
    const scrollLeft = favoritesContainer.scrollLeft;
    createMovies(favoriteMovies.slice(0, FAVORITES_PREVIEW_LIMIT), favoritesContainer);
    favoritesContainer.scrollLeft = scrollLeft;
}

function refreshFavoritesUI() {
    renderFavorites();
    updateFavoriteButtons();
    window.dispatchEvent(new Event('favorites:changed'));
}

// Cambios hechos en otra pestaña
window.addEventListener('storage', event => {
    if (event.key !== FAVORITES_KEY) return;
    favoriteMovies = loadFavorites();
    refreshFavoritesUI();
});

// DOMContentLoaded se dispara cuando ya cargaron todos los scripts, así que createMovies existe
window.addEventListener('DOMContentLoaded', renderFavorites);