// Favoritos con localStorage
//
// Cargar DESPUÉS de nodes.js y ANTES de main.js.
// Requiere: favoritesPreviewSection, favoritesContainer y movieDetailFavBtn (nodes.js).
// createMovies (main.js) se usa solo en tiempo de ejecución, no al cargar el archivo.

const FAVORITES_KEY = 'favorite_movies';

function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
        return Array.isArray(stored) ? stored : [];
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

function isFavorite(movieId) {
    return favoriteMovies.some(movie => movie.id === Number(movieId));
}

function toggleFavorite(movie) {
    const id = Number(movie.id);

    if (isFavorite(id)) {
        favoriteMovies = favoriteMovies.filter(m => m.id !== id);
    } else {
        // Solo se guarda lo necesario para dibujar la tarjeta; la más reciente va primero
        favoriteMovies = [
            { id, title: movie.title, poster_path: movie.poster_path },
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('fav-btn');
    btn.dataset.favId = movie.id;
    btn.innerHTML = '<span class="fav-btn__icon" aria-hidden="true"></span>';
    setFavoriteButtonState(btn, isFavorite(movie.id));

    btn.addEventListener('click', event => {
        event.stopPropagation(); // que no abra el detalle de la película
        toggleFavorite(movie);
    });

    return btn;
}

// Botón de la vista de detalle (ya existe en el HTML)
function bindDetailFavoriteButton(movie) {
    movieDetailFavBtn.dataset.favId = movie.id;
    movieDetailFavBtn.onclick = () => toggleFavorite(movie); // onclick evita acumular listeners
    setFavoriteButtonState(movieDetailFavBtn, isFavorite(movie.id));
}

// Mantiene sincronizados todos los corazones visibles
function updateFavoriteButtons() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
        setFavoriteButtonState(btn, isFavorite(btn.dataset.favId));
    });
}

// ---------- Sección del home ----------
function renderFavorites() {
    // is-empty oculta la sección sin favoritos; la clase "inactive" la maneja el router
    favoritesPreviewSection.classList.toggle('is-empty', favoriteMovies.length === 0);

    // Al quitar un favorito del medio de la lista, no se pierde la posición del scroll
    const scrollLeft = favoritesContainer.scrollLeft;
    createMovies(favoriteMovies, favoritesContainer);
    favoritesContainer.scrollLeft = scrollLeft;
}

function refreshFavoritesUI() {
    renderFavorites();
    updateFavoriteButtons();
}

// Cambios hechos en otra pestaña
window.addEventListener('storage', event => {
    if (event.key !== FAVORITES_KEY) return;
    favoriteMovies = loadFavorites();
    refreshFavoritesUI();
});

// DOMContentLoaded se dispara cuando ya cargaron todos los scripts, así que createMovies existe
window.addEventListener('DOMContentLoaded', renderFavorites);