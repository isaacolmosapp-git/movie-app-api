// Ficha de persona: cabecera con biografía y filmografía por rol (actuación / dirección)
//
// Cargar DESPUÉS de pagination.js y antes de navigation.js.
// Requiere (nodes.js): personPhoto, personName, personMeta, personBio, personBioMore,
//                      personBioNote, personTabs.
// Requiere en tiempo de ejecución: api, createMovies (main.js), appendSkeletons y
// cancelPaginatedList (pagination.js), showGenericMessage (navigation.js).
//
// Una sola petición, person/{id}?append_to_response=movie_credits, da los datos de la
// persona y todos sus créditos. La dirección sale del equipo (crew) con job "Director".

const IMG_PERSON_URL = 'https://image.tmdb.org/t/p/h632';

const PERSON_ROLES = {
    actor: { label: 'Actuación' },
    director: { label: 'Dirección' }
};

// Apariciones como uno mismo (documentales, material de archivo): no son papeles
const SELF_CREDIT = /\b(self|himself|herself|themselves|archive footage)\b/i;

const personCache = new Map();     // id → { person, bioIsFallback, roles }
const personViewState = new Map(); // id → { role, scrollY }
const personRoleHints = new Map(); // id → 'actor' | 'director' (lo rellena la vista Personas)
let personRequest = 0;             // descarta respuestas de una persona anterior
let currentPerson = null;

// ---------- Datos ----------
function uniqueById(list) {
    return [...new Map(list.map(item => [item.id, item])).values()];
}

function buildRoles(credits = {}) {
    const byPopularity = (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0);

    const actor = uniqueById(
        (credits.cast ?? []).filter(movie =>
            movie.poster_path && !SELF_CREDIT.test(movie.character ?? '')
        )
    ).sort(byPopularity);

    const director = uniqueById(
        (credits.crew ?? []).filter(movie =>
            movie.job === 'Director' && movie.poster_path
        )
    ).sort(byPopularity);

    return { actor, director };
}

async function fetchPerson(id) {
    const { data: person } = await api.get(`person/${id}`, {
        params: { append_to_response: 'movie_credits' }
    });

    let bioIsFallback = false;
    const appLanguage = api.defaults.params?.language ?? 'es';

    // Muchas biografías no están traducidas: si viene vacía, se intenta en inglés
    if (!person.biography && !appLanguage.startsWith('en')) {
        const { data } = await api.get(`person/${id}`, { params: { language: 'es-MX' } });
        if (data.biography) {
            person.biography = data.biography;
            bioIsFallback = true;
        }
    }

    return { person, bioIsFallback, roles: buildRoles(person.movie_credits) };
}

// ---------- Cabecera ----------
function formatDate(date) {
    return date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPersonMeta(person) {
    const parts = [];
    const birth = person.birthday ? new Date(`${person.birthday}T00:00:00`) : null;

    if (birth && !Number.isNaN(birth.getTime())) {
        const death = person.deathday ? new Date(`${person.deathday}T00:00:00`) : null;
        const end = death && !Number.isNaN(death.getTime()) ? death : new Date();

        let age = end.getFullYear() - birth.getFullYear();
        const hadBirthday =
            end.getMonth() > birth.getMonth() ||
            (end.getMonth() === birth.getMonth() && end.getDate() >= birth.getDate());
        if (!hadBirthday) age -= 1;

        parts.push(
            death && end === death
                ? `${formatDate(birth)} – ${formatDate(death)} (${age} años)`
                : `${formatDate(birth)} (${age} años)`
        );
    }

    if (person.place_of_birth) {
        parts.push(person.place_of_birth);
    }

    return parts.join(' · ');
}

function setPersonPhoto(path, name) {
    personPhoto.setAttribute('aria-label', name);

    if (path) {
        personPhoto.style.backgroundImage = `url(${IMG_PERSON_URL}${path})`;
        personPhoto.textContent = '';
    } else {
        personPhoto.style.backgroundImage = '';
        personPhoto.textContent = name.charAt(0); // sin foto: la inicial
    }
}

function renderPersonLoading(name) {
    personName.textContent = name;
    personMeta.textContent = '';
    personMeta.classList.add('inactive');

    personBio.textContent = '';
    personBio.classList.remove('is-expanded');
    personBioMore.classList.add('inactive');
    personBioNote.classList.add('inactive');

    personTabs.replaceChildren();
    personTabs.classList.add('inactive');

    setPersonPhoto(null, name);
    personPhoto.classList.add('skeleton');
}

function renderPersonHeader({ person, bioIsFallback }) {
    personPhoto.classList.remove('skeleton');
    setPersonPhoto(person.profile_path, person.name);

    personName.textContent = person.name;

    const meta = formatPersonMeta(person);
    personMeta.textContent = meta;
    personMeta.classList.toggle('inactive', !meta);

    const bio = person.biography?.trim();
    personBio.textContent = bio || 'No hay biografía disponible.';
    personBio.classList.remove('is-expanded');

    personBioNote.textContent = 'Biografía en inglés: no hay traducción disponible.';
    personBioNote.classList.toggle('inactive', !(bio && bioIsFallback));

    // "Leer más" solo si el texto no cabe en las líneas visibles
    personBioMore.textContent = 'Leer más';
    personBioMore.classList.add('inactive');
    requestAnimationFrame(() => {
        const overflows = personBio.scrollHeight > personBio.clientHeight + 1;
        personBioMore.classList.toggle('inactive', !(bio && overflows));
    });
}

personBioMore.addEventListener('click', () => {
    const expanded = personBio.classList.toggle('is-expanded');
    personBioMore.textContent = expanded ? 'Leer menos' : 'Leer más';
});

// ---------- Roles y filmografía ----------
function pickDefaultRole(data) {
    // Si se llegó desde la lista de directores (o de actores), se respeta ese rol
    const hint = personRoleHints.get(String(data.person.id));
    if (hint && data.roles[hint].length > 0) {
        return hint;
    }

    const order = data.person.known_for_department === 'Directing'
        ? ['director', 'actor']
        : ['actor', 'director'];

    return order.find(role => data.roles[role].length > 0) ?? 'actor';
}

function renderPersonTabs(data, activeRole) {
    personTabs.replaceChildren();

    const available = Object.keys(PERSON_ROLES).filter(role => data.roles[role].length > 0);

    // Con un solo rol no hace falta elegir
    personTabs.classList.toggle('inactive', available.length < 2);
    if (available.length < 2) return;

    available.forEach(role => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.classList.add('personInfo-tab');
        tab.dataset.role = role;
        tab.textContent = `${PERSON_ROLES[role].label} (${data.roles[role].length})`;
        tab.setAttribute('aria-pressed', String(role === activeRole));
        tab.addEventListener('click', () => showPersonRole(role));
        personTabs.appendChild(tab);
    });
}

function renderFilmography(movies) {
    cancelPaginatedList(); // genericSection lo comparte la lista paginada

    if (movies.length === 0) {
        showGenericMessage('No hay películas para mostrar.');
        return;
    }

    createMovies(movies, genericSection);
}

function showPersonRole(role) {
    if (!currentPerson) return;

    const state = personViewState.get(String(currentPerson.person.id));
    if (state) state.role = role;

    personTabs.querySelectorAll('.personInfo-tab').forEach(tab => {
        tab.setAttribute('aria-pressed', String(tab.dataset.role === role));
    });

    renderFilmography(currentPerson.roles[role]);
}

function renderPerson(data) {
    currentPerson = data;

    const key = String(data.person.id);
    let state = personViewState.get(key);

    // Rol recordado de una visita anterior, si sigue teniendo películas
    if (!state || data.roles[state.role].length === 0) {
        state = { role: pickDefaultRole(data), scrollY: 0 };
        personViewState.set(key, state);
    }

    renderPersonHeader(data);
    renderPersonTabs(data, state.role);
    renderFilmography(data.roles[state.role]);

    // Al volver desde el detalle de una película, se recupera la posición del scroll.
    // El router hace scrollTo(0, 0) justo después de entrar, por eso se restaura en el siguiente frame.
    if (state.scrollY > 0) {
        const y = state.scrollY;
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
    }
}

// Guarda la posición del scroll de la ficha que se abandona
function personIdFromHash(hash) {
    const match = hash.match(/^#(?:person|actor)=(\d+)/);
    return match ? match[1] : null;
}

window.addEventListener('hashchange', event => {
    const id = personIdFromHash(new URL(event.oldURL).hash);
    const state = id && personViewState.get(id);
    if (state) {
        state.scrollY = window.scrollY;
    }
});

// ---------- Entrada desde el router ----------
async function showPerson(id, nameFromHash) {
    const key = String(id);
    const request = ++personRequest;

    const cached = personCache.get(key);
    if (cached) {
        renderPerson(cached);
        return;
    }

    currentPerson = null;
    renderPersonLoading(nameFromHash);
    cancelPaginatedList();
    createMovies([], genericSection); // vacía la sección y libera el observer de imágenes
    appendSkeletons(12);

    try {
        const data = await fetchPerson(id);
        personCache.set(key, data);

        if (request !== personRequest) return; // el usuario ya abrió otra persona

        renderPerson(data);
    } catch (error) {
        if (request !== personRequest) return;

        console.error('Error al cargar la persona:', error.response?.status ?? error.message);
        personPhoto.classList.remove('skeleton');
        showGenericMessage('No se pudo cargar esta persona. Inténtalo de nuevo.');
    }
}