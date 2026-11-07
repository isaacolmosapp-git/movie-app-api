// Vista "Personas": actores populares y directores destacados
//
// Cargar en cualquier punto después de nodes.js: todo se usa en tiempo de ejecución.
// Requiere: peopleList, peopleTabs y peopleTitle (nodes.js); api, createCast y
//           createCastSkeletons (main.js); personRoleHints (person.js).

// Tipo de contenido que muestra la app ('movie' o 'tv'). Hoy solo hay películas; cuando
// exista el modo series, este valor vendrá del ajuste guardado.
const PEOPLE_MEDIA_TYPE = 'movie';

// person/popular devuelve 20 por página y no todos son actores con películas conocidas
const PEOPLE_PAGES = 3;

const PEOPLE_KINDS = {
    actors:    { title: 'Actores populares',     role: 'actor' },
    directors: { title: 'Directores destacados', role: 'director' }
};

const PEOPLE_KIND_KEY = 'people_kind';
const DIRECTORS_CACHE_KEY = 'popular_directors';
const DIRECTORS_CACHE_TTL = 24 * 60 * 60 * 1000; // un día

function loadPeopleKind() {
    try {
        const stored = localStorage.getItem(PEOPLE_KIND_KEY);
        return Object.hasOwn(PEOPLE_KINDS, stored) ? stored : 'actors';
    } catch {
        return 'actors'; // localStorage no disponible
    }
}

let peopleKind = loadPeopleKind();
const peopleMemory = new Map(); // tipo de lista → personas; al volver se muestra al instante
let peopleRequest = 0;          // descarta respuestas de una pestaña que ya no está activa

// ---------- Actores ----------
async function fetchActors() {
    const responses = await Promise.all(
        Array.from({ length: PEOPLE_PAGES }, (_, i) =>
            api.get('person/popular', { params: { page: i + 1 } })
        )
    );

    const people = responses
        .flatMap(response => response.data.results)
        .filter(person =>
            person.known_for_department === 'Acting' &&
            person.profile_path &&
            // known_for mezcla películas y series: solo entra quien tiene alguna obra del tipo actual
            person.known_for?.some(work => work.media_type === PEOPLE_MEDIA_TYPE)
        )
        .map(person => {
            const work = person.known_for.find(item => item.media_type === PEOPLE_MEDIA_TYPE);
            return {
                id: person.id,
                name: person.name,
                profile_path: person.profile_path,
                // createCast muestra "character" bajo el nombre: aquí, su obra más conocida
                // de este tipo (las películas usan "title", las series "name")
                character: work.title ?? work.name ?? ''
            };
        });

    // Una persona puede repetirse entre páginas
    return [...new Map(people.map(person => [person.id, person])).values()];
}

// ---------- Directores ----------
// TMDB no tiene una lista de directores populares. Se obtienen del equipo de las películas
// mejor valoradas y más populares: una petición de créditos por película (unas 40 en total,
// solo la primera vez; el resultado se guarda un día en localStorage).
function readDirectorsCache() {
    try {
        const stored = JSON.parse(localStorage.getItem(DIRECTORS_CACHE_KEY));
        const fresh = stored && Date.now() - stored.savedAt < DIRECTORS_CACHE_TTL;
        if (fresh && Array.isArray(stored.list) && stored.list.length > 0) {
            return stored.list;
        }
    } catch {
        // JSON corrupto o localStorage no disponible: se vuelve a calcular
    }
    return null;
}

function writeDirectorsCache(list) {
    try {
        localStorage.setItem(DIRECTORS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), list }));
    } catch (error) {
        console.error('No se pudo guardar la lista de directores:', error);
    }
}

async function fetchDirectors() {
    const cached = readDirectorsCache();
    if (cached) return cached;

    const [topRated, popular] = await Promise.all([
        api.get('movie/top_rated'),
        api.get('movie/popular')
    ]);

    // Películas de referencia, sin repetir
    const movies = [...new Map(
        [...topRated.data.results, ...popular.data.results].map(movie => [movie.id, movie])
    ).values()];

    // allSettled: si falla alguna petición, el resto de directores se conserva
    const credits = await Promise.allSettled(
        movies.map(movie => api.get(`movie/${movie.id}/credits`))
    );

    const directors = new Map();

    credits.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;

        const movie = movies[index];
        const crew = result.value.data.crew ?? [];

        crew
            .filter(member => member.job === 'Director' && member.profile_path)
            .forEach(member => {
                const entry = directors.get(member.id) ?? {
                    id: member.id,
                    name: member.name,
                    profile_path: member.profile_path,
                    popularity: member.popularity ?? 0,
                    count: 0,
                    topMovie: movie
                };

                entry.count += 1;
                // Su película más votada entre las analizadas es la que se muestra bajo el nombre
                if ((movie.vote_count ?? 0) > (entry.topMovie.vote_count ?? 0)) {
                    entry.topMovie = movie;
                }

                directors.set(member.id, entry);
            });
    });

    const list = [...directors.values()]
        .sort((a, b) => b.count - a.count || b.popularity - a.popularity)
        .map(entry => ({
            id: entry.id,
            name: entry.name,
            profile_path: entry.profile_path,
            character: entry.topMovie.title ?? ''
        }));

    if (list.length === 0) {
        throw new Error('No se pudo obtener ningún director');
    }

    writeDirectorsCache(list);
    return list;
}

// ---------- Vista ----------
function updatePeopleHeader() {
    peopleTitle.textContent = PEOPLE_KINDS[peopleKind].title;

    peopleTabs.querySelectorAll('.people-tab').forEach(tab => {
        tab.setAttribute('aria-pressed', String(tab.dataset.kind === peopleKind));
    });
}

// La ficha de la persona abre en el rol de la lista desde la que se llegó
function applyRoleHints(list, kind) {
    list.forEach(person => {
        personRoleHints.set(String(person.id), PEOPLE_KINDS[kind].role);
    });
}

async function renderPeople() {
    const kind = peopleKind;
    const request = ++peopleRequest;

    updatePeopleHeader();

    const cached = peopleMemory.get(kind);
    if (cached) {
        applyRoleHints(cached, kind);
        createCast(cached, peopleList);
        return;
    }

    createCastSkeletons(peopleList, 18);

    try {
        const list = kind === 'directors' ? await fetchDirectors() : await fetchActors();
        peopleMemory.set(kind, list);

        if (request !== peopleRequest) return; // el usuario ya cambió de pestaña

        applyRoleHints(list, kind);
        createCast(list, peopleList);
    } catch (error) {
        if (request !== peopleRequest) return;

        console.error('Error al cargar las personas:', error.response?.status ?? error.message);
        peopleList.innerHTML = '<p class="genericList-empty">No se pudo cargar. Pulsa de nuevo la pestaña para reintentar.</p>';
    }
}

function setPeopleKind(kind) {
    // Pulsar la pestaña activa solo hace algo si su lista aún no se cargó (reintento)
    if (kind === peopleKind && peopleMemory.has(kind)) return;

    peopleKind = kind;

    try {
        localStorage.setItem(PEOPLE_KIND_KEY, kind);
    } catch (error) {
        console.error('No se pudo guardar la pestaña de personas:', error);
    }

    renderPeople();
}

peopleTabs.querySelectorAll('.people-tab').forEach(tab => {
    tab.addEventListener('click', () => setPeopleKind(tab.dataset.kind));
});

// Punto de entrada desde el router
function getPopularPeople() {
    return renderPeople();
}