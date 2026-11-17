// ---------- Configuración de personas ----------
function getPeopleMediaType() {
    return getMediaType();
}

const PEOPLE_PAGES = 3;

const PEOPLE_KINDS = {
    actors:    { title: 'Actores populares',     role: 'actor' },
    directors: { title: 'Directores destacados', role: 'director' }
};

const PEOPLE_KIND_KEY = 'people_kind';
const DIRECTORS_CACHE_KEY = 'popular_directors';
const DIRECTORS_CACHE_TTL = 24 * 60 * 60 * 1000;

function loadPeopleKind() {
    try {
        const stored = localStorage.getItem(PEOPLE_KIND_KEY);
        return Object.hasOwn(PEOPLE_KINDS, stored) ? stored : 'actors';
    } catch {
        return 'actors';
    }
}

let peopleKind = loadPeopleKind();
const peopleMemory = new Map();
let peopleRequest = 0;

// ---------- Actores ----------
async function fetchActors() {
    const responses = await Promise.all(
        Array.from({ length: PEOPLE_PAGES }, (_, i) =>
            api.get('person/popular', { params: { page: i + 1 } })
        )
    );

    const currentMediaType = getPeopleMediaType();
    const people = responses
        .flatMap(response => response.data.results)
        .filter(person =>
            person.known_for_department === 'Acting' &&
            person.profile_path &&
            person.known_for?.some(work => work.media_type === currentMediaType)
        )
        .map(person => {
            const work = person.known_for.find(item => item.media_type === currentMediaType);
            return {
                id: person.id,
                name: person.name,
                profile_path: person.profile_path,
                character: work.title ?? work.name ?? ''
            };
        });

    return [...new Map(people.map(person => [person.id, person])).values()];
}

// ---------- Directores ----------
function readDirectorsCache() {
    try {
        const stored = JSON.parse(localStorage.getItem(DIRECTORS_CACHE_KEY));
        const fresh = stored && Date.now() - stored.savedAt < DIRECTORS_CACHE_TTL;
        if (fresh && Array.isArray(stored.list) && stored.list.length > 0) {
            return stored.list;
        }
    } catch {
        return null;
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

    const movies = [...new Map(
        [...topRated.data.results, ...popular.data.results].map(movie => [movie.id, movie])
    ).values()];

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

// ---------- Renderizado y pestañas ----------
function updatePeopleHeader() {
    peopleTitle.textContent = PEOPLE_KINDS[peopleKind].title;

    peopleTabs.querySelectorAll('.people-tab').forEach(tab => {
        tab.setAttribute('aria-pressed', String(tab.dataset.kind === peopleKind));
    });
}

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

        if (request !== peopleRequest) return;

        applyRoleHints(list, kind);
        createCast(list, peopleList);
    } catch (error) {
        if (request !== peopleRequest) return;

        console.error('Error al cargar las personas:', error.response?.status ?? error.message);
        peopleList.innerHTML = '<p class="genericList-empty">No se pudo cargar. Pulsa de nuevo la pestaña para reintentar.</p>';
    }
}

function setPeopleKind(kind) {
    if (kind === peopleKind && peopleMemory.has(kind)) return;

    peopleKind = kind;

    try {
        localStorage.setItem(PEOPLE_KIND_KEY, kind);
    } catch (error) {
        console.error('No se pudo guardar la pestaña de personas:', error);
    }

    renderPeople();
}

// ---------- Eventos y navegación ----------
peopleTabs.querySelectorAll('.people-tab').forEach(tab => {
    tab.addEventListener('click', () => setPeopleKind(tab.dataset.kind));
});

function getPopularPeople() {
    return renderPeople();
}
