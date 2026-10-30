// Paginación para genericSection (categorías y búsqueda)
// - Móvil: scroll infinito (1 página = 20 resultados por tanda)
// - Escritorio: botón "Cargar más" (4 páginas = 80 resultados por tanda)
// - Al volver desde otra vista (p. ej. el detalle de una película) se restaura
//   la lista ya cargada y la posición del scroll, sin volver a pedirla a la API.
//
// Cargar DESPUÉS de main.js y ANTES de navigation.js.
// Requiere: api, genericSection, createMovies (main.js).

const DESKTOP_QUERY = window.matchMedia('(min-width: 1024px)');
const DESKTOP_PAGES_PER_BATCH = 2; // 2 × 20 = 40 resultados por tanda
const TMDB_MAX_PAGES = 500;        // límite impuesto por la API

const MAX_CACHED_LISTS = 6;           // listas que se recuerdan a la vez
const CACHE_TTL = 10 * 60 * 1000;     // 10 minutos

let listState = null;                 // lista activa
const listCache = new Map();          // clave: location.hash → estado de la lista

// ---------- Elemento "cargar más" (botón en escritorio / centinela en móvil) ----------
const loadMoreEl = document.createElement('div');
loadMoreEl.className = 'loadMore-container';
loadMoreEl.innerHTML = '<button type="button" class="loadMore-btn">Cargar más</button>';
const loadMoreBtn = loadMoreEl.querySelector('button');

const loadMoreObserver = new IntersectionObserver(entries => {
    // En escritorio solo se carga con el botón
    if (entries[0].isIntersecting && !DESKTOP_QUERY.matches) {
        loadNextBatch();
    }
}, { rootMargin: '400px 0px' });

loadMoreBtn.addEventListener('click', () => loadNextBatch());

// Re-observar fuerza al observer a evaluar de nuevo si el centinela ya está a la vista
function rearmLoadMore() {
    loadMoreObserver.unobserve(loadMoreEl);
    if (loadMoreEl.isConnected) {
        loadMoreObserver.observe(loadMoreEl);
    }
}

DESKTOP_QUERY.addEventListener('change', rearmLoadMore);

function showLoadMore() {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Cargar más';
    genericSection.appendChild(loadMoreEl);
    rearmLoadMore();
}

// ---------- Caché de listas ----------
function cacheList(state) {
    listCache.delete(state.key); // si ya existía, se reinserta como la más reciente
    listCache.set(state.key, state);

    // Descarta la más antigua si se supera el límite
    if (listCache.size > MAX_CACHED_LISTS) {
        listCache.delete(listCache.keys().next().value);
    }
}

function getCachedList(key) {
    const entry = listCache.get(key);
    if (!entry) return null;

    const expired = Date.now() - entry.createdAt > CACHE_TTL;
    if (expired || entry.movies.length === 0) {
        listCache.delete(key);
        return null;
    }

    // Marca como la más recientemente usada
    listCache.delete(key);
    listCache.set(key, entry);
    return entry;
}

// Guarda la posición del scroll de la lista que se abandona.
// Este listener se registra antes que el de navigation.js, así que corre
// antes de que el router haga window.scrollTo(0, 0).
window.addEventListener('hashchange', event => {
    const oldKey = new URL(event.oldURL).hash;
    const entry = listCache.get(oldKey);
    if (entry) {
        entry.scrollY = window.scrollY;
    }
});

// ---------- Helpers ----------
function appendSkeletons(count) {
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('movie-container', 'movie-container--skeleton', 'skeleton');
        genericSection.appendChild(skeleton);
    }
}

function removeSkeletons() {
    genericSection
        .querySelectorAll('.movie-container--skeleton')
        .forEach(el => el.remove());
}

function fetchListPage(state, page) {
    return api.get(state.endpoint, {
        params: { ...state.params, page },
        signal: state.controller.signal
    }).then(res => res.data);
}

// ---------- API pública ----------
function cancelPaginatedList() {
    if (listState) {
        listState.controller.abort(); // la lista sigue en caché, solo se cancela su petición en curso
        listState = null;
    }
    loadMoreObserver.unobserve(loadMoreEl);
}

function restoreList(state) {
    state.controller = new AbortController();
    state.loading = false;
    listState = state;

    createMovies(state.movies, genericSection, true);

    if (state.nextPage <= state.totalPages) {
        showLoadMore();
    }

    // El router hace window.scrollTo(0, 0) justo después de esta función,
    // así que la posición se restaura en el siguiente frame.
    // 'instant' evita la animación del scroll-behavior: smooth del CSS.
    const y = state.scrollY;
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
}

function startPaginatedList(endpoint, params = {}) {
    const key = location.hash;

    cancelPaginatedList(); // evita que una respuesta tardía pinte en la lista equivocada

    const cached = getCachedList(key);
    if (cached) {
        restoreList(cached);
        return Promise.resolve();
    }

    listState = {
        key,
        endpoint,
        params,
        nextPage: 1,
        totalPages: null,   // se conoce al recibir la primera respuesta
        loading: false,
        controller: new AbortController(),
        movies: [],         // películas ya cargadas (solo los campos necesarios)
        scrollY: 0,
        createdAt: Date.now()
    };
    cacheList(listState);

    createMovies([], genericSection); // vacía la sección y libera el observer de imágenes
    appendSkeletons(DESKTOP_QUERY.matches ? 24 : 12);

    return loadNextBatch(true);
}

async function loadNextBatch(isFirst = false) {
    const state = listState;
    if (!state || state.loading) return;
    if (state.totalPages !== null && state.nextPage > state.totalPages) return;

    const controller = state.controller;
    state.loading = true;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Cargando…';

    if (!isFirst) {
        loadMoreObserver.unobserve(loadMoreEl);
        loadMoreEl.remove();
        appendSkeletons(DESKTOP_QUERY.matches ? 16 : 6);
    }

    try {
        const batchSize = DESKTOP_QUERY.matches ? DESKTOP_PAGES_PER_BATCH : 1;
        let page = state.nextPage;
        let results = [];

        // Primera vez: se pide una página para conocer total_pages
        // y no pedir páginas que no existen
        if (state.totalPages === null) {
            const first = await fetchListPage(state, page);
            state.totalPages = Math.min(first.total_pages, TMDB_MAX_PAGES);
            results = first.results;
            page++;
        }

        // El resto de páginas de la tanda se piden en paralelo
        const last = Math.min(state.nextPage + batchSize - 1, state.totalPages);
        const requests = [];
        for (let p = page; p <= last; p++) {
            requests.push(fetchListPage(state, p));
        }
        const responses = await Promise.all(requests);
        results = results.concat(responses.flatMap(r => r.results));

        // Si mientras tanto se inició otra lista, se descarta esta respuesta
        if (state !== listState) return;

        state.nextPage = last + 1;
        removeSkeletons();

        // Se guardan solo los campos que usa createMovies
        const movies = results.map(({ id, title, poster_path }) => ({ id, title, poster_path }));
        state.movies.push(...movies);

        if (state.movies.length === 0) {
            genericSection.innerHTML = '<p class="genericList-empty">No se encontraron resultados.</p>';
            return;
        }

        createMovies(movies, genericSection, false);

        if (state.nextPage <= state.totalPages) {
            showLoadMore();
        }
    } catch (error) {
        if (axios.isCancel(error)) return;

        console.error('Error al cargar más películas:', error.response?.status ?? error.message);

        if (state === listState) {
            removeSkeletons();
            if (state.movies.length === 0) {
                genericSection.innerHTML = '';
            } else {
                // Permite reintentar
                genericSection.appendChild(loadMoreEl);
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Reintentar';
            }
        }
    } finally {
        // Solo si la lista no fue reiniciada/restaurada mientras tanto
        if (state.controller === controller) {
            state.loading = false;
        }
    }
}

// ---------- Funciones que usa el router (reemplazan a las de main.js) ----------
function getMoviesByCategory(categoryId) {
    return startPaginatedList('discover/movie', { with_genres: categoryId });
}

function getMoviesBySearch(query) {
    return startPaginatedList('search/movie', { query });
}

function getMoviesByActor(actorId) {
    return startPaginatedList('discover/movie', { with_cast: actorId });
}