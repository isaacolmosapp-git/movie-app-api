// ---------- Configuración y estado ----------
const DESKTOP_QUERY = window.matchMedia('(min-width: 1024px)');
const DESKTOP_PAGES_PER_BATCH = 2;
const TMDB_MAX_PAGES = 500;

const MAX_CACHED_LISTS = 6;
const CACHE_TTL = 10 * 60 * 1000;

let listState = null;
const listCache = new Map();

// ---------- Elemento cargar más ----------
const loadMoreEl = document.createElement('div');
loadMoreEl.className = 'loadMore-container';
loadMoreEl.innerHTML = '<button type="button" class="loadMore-btn">Cargar más</button>';
const loadMoreBtn = loadMoreEl.querySelector('button');

const loadMoreObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !DESKTOP_QUERY.matches) {
        loadNextBatch();
    }
}, { rootMargin: '400px 0px' });

loadMoreBtn.addEventListener('click', () => loadNextBatch());

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
    listCache.delete(state.key);
    listCache.set(state.key, state);

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

    listCache.delete(key);
    listCache.set(key, entry);
    return entry;
}

window.addEventListener('hashchange', event => {
    const oldKey = `${getMediaType()}:${new URL(event.oldURL).hash}`;
    const entry = listCache.get(oldKey);
    if (entry) {
        entry.scrollY = window.scrollY;
    }
});

// ---------- Helpers de carga ----------
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

// ---------- API de listas paginadas ----------
function cancelPaginatedList() {
    if (listState) {
        listState.controller.abort();
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

    const y = state.scrollY;
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
}

function startPaginatedList(endpoint, params = {}) {
    const key = `${getMediaType()}:${location.hash}`;

    cancelPaginatedList();

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
        totalPages: null,
        loading: false,
        controller: new AbortController(),
        movies: [],
        scrollY: 0,
        createdAt: Date.now()
    };
    cacheList(listState);

    createMovies([], genericSection);
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

        if (state.totalPages === null) {
            const first = await fetchListPage(state, page);
            state.totalPages = Math.min(first.total_pages, TMDB_MAX_PAGES);
            results = first.results;
            page++;
        }

        const last = Math.min(state.nextPage + batchSize - 1, state.totalPages);
        const requests = [];
        for (let p = page; p <= last; p++) {
            requests.push(fetchListPage(state, p));
        }
        const responses = await Promise.all(requests);
        results = results.concat(responses.flatMap(r => r.results));

        if (state !== listState) return;

        state.nextPage = last + 1;
        removeSkeletons();

        const currentType = getMediaType();
        const movies = results.map(item => ({
            id: item.id,
            title: item.title ?? item.name ?? '',
            poster_path: item.poster_path,
            type: item.type ?? currentType
        }));
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
                genericSection.appendChild(loadMoreEl);
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Reintentar';
            }
        }
    } finally {
        if (state.controller === controller) {
            state.loading = false;
        }
    }
}

// ---------- Consultas por categoría y búsqueda ----------
function getMoviesByCategory(categoryId) {
    return startPaginatedList(`discover/${getMediaType()}`, { with_genres: categoryId });
}

function getMoviesBySearch(query) {
    return startPaginatedList(`search/${getMediaType()}`, { query });
}

