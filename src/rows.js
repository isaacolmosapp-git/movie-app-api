// Filas reutilizables del home. Hay dos tipos:
//   - de API:      { endpoint, params? }  → se piden cuando la fila se acerca a la pantalla;
//                  tienen "Ver todas" (#list=<id>) con la paginación existente.
//   - propias:     { load }               → load() devuelve un arreglo de películas o
//                  { title, movies }; pueden ser locales (sin red, se pintan al instante)
//                  y pueden refrescarse cuando cambian los datos (refreshOn).
//
// Cargar DESPUÉS de nodes.js, favorites.js y recent.js. Todo lo de main.js se usa en
// DOMContentLoaded o después.
// Requiere: homeRowsContainer (nodes.js), api y createMovies (main.js),
//           favoriteMovies e isFavorite (favorites.js), getRecentlyViewed y
//           clearRecentlyViewed (recent.js).

// Fecha (YYYY-MM-DD) a N días de hoy; negativo = pasado
const dateOffset = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// ---------- "Porque te gustó X" ----------
let becauseSource = null; // favorita elegida como origen de las recomendaciones
let becauseCache = null;  // { sourceId, movies }: evita repetir la petición en cada cambio

async function loadBecauseYouLiked() {
    // Se conserva el origen mientras siga en favoritos; si se quita (o aún no hay), se elige otro
    if (!becauseSource || !isFavorite(becauseSource.id)) {
        becauseSource = favoriteMovies.length
            ? favoriteMovies[Math.floor(Math.random() * favoriteMovies.length)]
            : null;
        becauseCache = null;
    }

    if (!becauseSource) return []; // sin favoritos no hay fila

    if (becauseCache?.sourceId !== becauseSource.id) {
        const { data } = await api.get(`movie/${becauseSource.id}/recommendations`);
        becauseCache = { sourceId: becauseSource.id, movies: data.results };
    }

    return {
        title: `Porque te gustó ${becauseSource.title}`,
        movies: becauseCache.movies
    };
}

// ---------- Definición de filas ----------
const HOME_ROWS = [
    {
        id: 'recent',
        title: 'Vistas recientemente',
        local: true,                       // sin red: se pinta al cargar y oculta si está vacía
        load: () => getRecentlyViewed(),
        refreshOn: ['recent:changed'],
        action: {
            label: 'Borrar',
            ariaLabel: 'Borrar historial de películas vistas',
            onClick: () => clearRecentlyViewed()
        }
    },
    {
        id: 'because',
        title: 'Para ti',                   // se sustituye por "Porque te gustó X" al cargar
        load: loadBecauseYouLiked,
        refreshOn: ['favorites:changed']
    },
    {
        id: 'now_playing',
        title: 'En cines',
        endpoint: 'movie/now_playing'
        // Opcional: params: { region: 'ES' } ajusta la fila a un país
    },
    {
        // upcoming y now_playing se solapan casi por completo, por eso se usa discover
        // con estrenos a partir de mañana: ninguna puede estar ya en cines
        id: 'upcoming',
        title: 'Próximos estrenos',
        endpoint: 'discover/movie',
        // función: las fechas se calculan al pedir, no al cargar el archivo
        params: () => ({
            'primary_release_date.gte': dateOffset(1),
            'primary_release_date.lte': dateOffset(180),
            sort_by: 'popularity.desc'
        })
    },
    {
        id: 'top_rated',
        title: 'Mejor valoradas',
        endpoint: 'movie/top_rated'
    }
];

const HOME_ROW_LIMIT = 12;    // películas que se muestran en cada fila del home
const HOME_ROW_SKELETONS = 8; // tarjetas de carga mientras llega la respuesta

const rowStates = new Map();    // id → estado de la fila
const rowBySection = new Map(); // <section> → estado (para el observer)

function resolveRowParams(row) {
    return typeof row.params === 'function' ? row.params() : row.params;
}

// Una sola petición por fila, y solo cuando la fila se acerca a la pantalla
const homeRowsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        homeRowsObserver.unobserve(entry.target);
        loadHomeRow(rowBySection.get(entry.target));
    });
}, { rootMargin: '300px 0px' });

function fillRowSkeletons(list) {
    list.innerHTML = '';

    for (let i = 0; i < HOME_ROW_SKELETONS; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('movie-container', 'movie-container--skeleton', 'skeleton');
        list.appendChild(skeleton);
    }
}

// silent = true: refresco en segundo plano; si falla, se conserva lo que ya hay
async function loadHomeRow(state, silent = false) {
    const { row, list } = state;

    try {
        let result;
        if (row.load) {
            result = await row.load();
        } else {
            const { data } = await api.get(row.endpoint, { params: resolveRowParams(row) });
            result = data.results;
        }

        const isList = Array.isArray(result);
        const source = isList ? result : (result?.movies ?? []);

        // En el home solo películas con póster; la lista completa ("Ver todas") no se filtra
        const movies = source
            .filter(movie => movie.poster_path)
            .slice(0, HOME_ROW_LIMIT);

        if (!isList && result?.title) {
            state.titleEl.textContent = result.title;
        }

        state.loaded = true;
        state.section.classList.toggle('is-empty', movies.length === 0);

        if (movies.length === 0) {
            state.key = '';
            list.innerHTML = '';
            return;
        }

        // Solo se redibuja si cambió el contenido: conserva el scroll de la fila
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

// Vuelve a calcular una fila ya cargada (si aún no se cargó, lo hará al acercarse)
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

    const titleEl = document.createElement('h2');
    titleEl.classList.add('homeRow-title');
    titleEl.id = titleId;
    titleEl.textContent = row.title;
    header.appendChild(titleEl);

    // Botón del encabezado: "Ver todas" si hay endpoint, o la acción propia de la fila
    if (row.endpoint) {
        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.classList.add('homeRow-btn');
        moreBtn.textContent = 'Ver todas';
        moreBtn.setAttribute('aria-label', `Ver todas: ${row.title}`);
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
        section.classList.add('is-empty'); // oculta hasta confirmar que hay contenido
    } else {
        fillRowSkeletons(list); // reserva la altura: así el observer no dispara todas las filas a la vez
    }

    section.append(header, list);

    const state = { row, section, list, titleEl, loaded: false, key: '' };
    rowStates.set(row.id, state);
    rowBySection.set(section, state);

    return section;
}

function buildHomeRows() {
    HOME_ROWS.forEach(row => homeRowsContainer.appendChild(createHomeRow(row)));

    // Se observa (o se carga) cuando todas ya están en el DOM
    rowStates.forEach(state => {
        if (state.row.local) {
            loadHomeRow(state);
        } else {
            homeRowsObserver.observe(state.section);
        }
    });

    // Filas que se recalculan cuando cambian sus datos
    HOME_ROWS.forEach(row => {
        (row.refreshOn ?? []).forEach(eventName => {
            window.addEventListener(eventName, () => refreshHomeRow(row.id));
        });
    });
}

// Para la vista "Ver todas" (#list=<id>): lista completa con la paginación existente
function getMoviesByRow(rowId) {
    const row = HOME_ROWS.find(item => item.id === rowId);
    return startPaginatedList(row.endpoint, resolveRowParams(row));
}

// DOMContentLoaded se dispara con todos los scripts ya cargados
window.addEventListener('DOMContentLoaded', buildHomeRows);