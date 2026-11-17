// ---------- Recomendaciones personalizadas ----------
const dateOffset = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

let becauseSource = null;
let becauseCache = null;

async function loadBecauseYouLiked() {
    const currentType = getMediaType();
    const typeFavorites = favoriteMovies.filter(m => (m.type ?? 'movie') === currentType);

    if (!becauseSource || !isFavorite(becauseSource.id, currentType) || (becauseSource.type ?? 'movie') !== currentType) {
        becauseSource = typeFavorites.length
            ? typeFavorites[Math.floor(Math.random() * typeFavorites.length)]
            : null;
        becauseCache = null;
    }

    if (!becauseSource) return [];

    if (becauseCache?.sourceId !== becauseSource.id) {
        const { data } = await api.get(`${currentType}/${becauseSource.id}/recommendations`);
        const items = data.results.map(item => ({ ...item, type: currentType }));
        becauseCache = { sourceId: becauseSource.id, movies: items };
    }

    return {
        title: `Porque te gustó ${becauseSource.title ?? becauseSource.name}`,
        movies: becauseCache.movies
    };
}

function resolveRowTitle(row) {
    return typeof row.title === 'function' ? row.title() : row.title;
}

function resolveRowEndpoint(row) {
    return typeof row.endpoint === 'function' ? row.endpoint() : row.endpoint;
}

function resolveRowParams(row) {
    return typeof row.params === 'function' ? row.params() : row.params;
}

// ---------- Configuración de filas del home ----------
const HOME_ROWS = [
    {
        id: 'recent',
        title: 'Vistas recientemente',
        local: true,
        load: () => getRecentlyViewed().filter(m => (m.type ?? 'movie') === getMediaType()),
        refreshOn: ['recent:changed'],
        action: {
            label: 'Borrar',
            ariaLabel: 'Borrar historial',
            onClick: () => clearRecentlyViewed()
        }
    },
    {
        id: 'because',
        title: 'Para ti',
        load: loadBecauseYouLiked,
        refreshOn: ['favorites:changed']
    },
    {
        id: 'now_playing',
        title: () => (getMediaType() === 'tv' ? 'En emisión' : 'En cines'),
        endpoint: () => (getMediaType() === 'tv' ? 'tv/on_the_air' : 'movie/now_playing')
    },
    {
        id: 'upcoming',
        title: () => (getMediaType() === 'tv' ? 'Al aire hoy' : 'Próximos estrenos'),
        endpoint: () => (getMediaType() === 'tv' ? 'tv/airing_today' : 'discover/movie'),
        params: () => (getMediaType() === 'tv' ? {} : {
            'primary_release_date.gte': dateOffset(1),
            'primary_release_date.lte': dateOffset(180),
            sort_by: 'popularity.desc'
        })
    },
    {
        id: 'top_rated',
        title: 'Mejor valoradas',
        endpoint: () => `${getMediaType()}/top_rated`
    }
];

const HOME_ROW_LIMIT = 12;
const HOME_ROW_SKELETONS = 8;

const rowStates = new Map();
const rowBySection = new Map();

// ---------- Carga y renderizado de filas ----------
function fillRowSkeletons(list) {
    list.innerHTML = '';

    for (let i = 0; i < HOME_ROW_SKELETONS; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('movie-container', 'movie-container--skeleton', 'skeleton');
        list.appendChild(skeleton);
    }
}

async function loadHomeRow(state, silent = false) {
    const { row, list } = state;

    try {
        let result;
        if (row.load) {
            result = await row.load();
        } else {
            const endpoint = resolveRowEndpoint(row);
            const { data } = await api.get(endpoint, { params: resolveRowParams(row) });
            result = data.results.map(item => ({ ...item, type: getMediaType() }));
        }

        const isList = Array.isArray(result);
        const source = isList ? result : (result?.movies ?? []);

        const movies = source
            .filter(movie => movie.poster_path)
            .slice(0, HOME_ROW_LIMIT);

        if (!isList && result?.title) {
            state.titleEl.textContent = result.title;
        } else {
            state.titleEl.textContent = resolveRowTitle(row);
        }

        state.loaded = true;
        state.section.classList.toggle('is-empty', movies.length === 0);

        if (movies.length === 0) {
            state.key = '';
            list.innerHTML = '';
            return;
        }

        const key = movies.map(movie => movie.id).join(',');
        if (key !== state.key) {
            state.key = key;
            createMovies(movies, list);
        }
    } catch (error) {
        console.error(`Error al cargar "${row.title}":`, error.response?.status ?? error.message);

        if (silent && state.loaded) return;

        state.key = '';
        list.innerHTML = '';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.classList.add('homeRow-retry');
        retry.textContent = 'No se pudo cargar. Reintentar';
        retry.addEventListener('click', () => {
            fillRowSkeletons(list);
            loadHomeRow(state);
        });
        list.appendChild(retry);
    }
}

function refreshHomeRow(rowId) {
    const state = rowStates.get(rowId);
    if (state?.loaded) {
        loadHomeRow(state, true);
    }
}

function createHomeRow(row) {
    const section = document.createElement('section');
    section.classList.add('homeRow');

    const titleId = `homeRow-title-${row.id}`;
    section.setAttribute('aria-labelledby', titleId);

    const header = document.createElement('div');
    header.classList.add('homeRow-header');

    const titleText = resolveRowTitle(row);
    const titleEl = document.createElement('h2');
    titleEl.classList.add('homeRow-title');
    titleEl.id = titleId;
    titleEl.textContent = titleText;
    header.appendChild(titleEl);

    if (row.endpoint) {
        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.classList.add('homeRow-btn');
        moreBtn.textContent = 'Ver todas';
        moreBtn.setAttribute('aria-label', `Ver todas: ${titleText}`);
        moreBtn.addEventListener('click', () => {
            location.hash = `#list=${row.id}`;
        });
        header.appendChild(moreBtn);
    } else if (row.action) {
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.classList.add('homeRow-btn');
        actionBtn.textContent = row.action.label;
        if (row.action.ariaLabel) actionBtn.setAttribute('aria-label', row.action.ariaLabel);
        actionBtn.addEventListener('click', row.action.onClick);
        header.appendChild(actionBtn);
    }

    const list = document.createElement('div');
    list.classList.add('homeRow-list');

    if (row.local) {
        section.classList.add('is-empty');
    } else {
        fillRowSkeletons(list);
    }

    section.append(header, list);

    const state = { row, section, list, titleEl, loaded: false, key: '' };
    rowStates.set(row.id, state);
    rowBySection.set(section, state);

    return section;
}

function getMoviesByRow(rowId) {
    const row = HOME_ROWS.find(item => item.id === rowId);
    return startPaginatedList(resolveRowEndpoint(row), resolveRowParams(row));
}

// ---------- Observador de visibilidad ----------
const homeRowsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        homeRowsObserver.unobserve(entry.target);
        loadHomeRow(rowBySection.get(entry.target));
    });
}, { rootMargin: '300px 0px' });

// ---------- Inicialización y eventos ----------
function buildHomeRows() {
    HOME_ROWS.forEach(row => homeRowsContainer.appendChild(createHomeRow(row)));

    rowStates.forEach(state => {
        if (state.row.local) {
            loadHomeRow(state);
        } else {
            homeRowsObserver.observe(state.section);
        }
    });

    HOME_ROWS.forEach(row => {
        (row.refreshOn ?? []).forEach(eventName => {
            window.addEventListener(eventName, () => refreshHomeRow(row.id));
        });
    });
}

function handleMediaTypeChangedInRows() {
    becauseSource = null;
    becauseCache = null;

    rowStates.forEach(state => {
        state.key = '';
        state.titleEl.textContent = resolveRowTitle(state.row);
        if (!state.row.local) {
            fillRowSkeletons(state.list);
        }
        loadHomeRow(state, true);
    });
}

window.addEventListener('mediatype:changed', handleMediaTypeChangedInRows);
window.addEventListener('DOMContentLoaded', buildHomeRows);
