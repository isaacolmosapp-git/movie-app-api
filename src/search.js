// ---------- Historial de búsqueda ----------
const SEARCH_HISTORY_KEY = 'recent_searches';
const SEARCH_HISTORY_LIMIT = 8;

function loadSearchHistory() {
    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY));
        return Array.isArray(stored) ? stored.filter(item => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

let searchHistory = loadSearchHistory();

function persistSearchHistory() {
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    } catch (error) {
        console.error('No se pudo guardar el historial de búsquedas:', error);
    }
}

function saveRecentSearch(query) {
    const clean = query.trim();
    if (!clean) return;

    searchHistory = [
        clean,
        ...searchHistory.filter(item => item.toLowerCase() !== clean.toLowerCase())
    ].slice(0, SEARCH_HISTORY_LIMIT);

    persistSearchHistory();
}

function removeRecentSearch(query) {
    searchHistory = searchHistory.filter(item => item !== query);
    persistSearchHistory();
    renderRecentSearches();
}

function clearRecentSearches() {
    searchHistory = [];
    persistSearchHistory();
    renderRecentSearches();
}

searchRecentClear.addEventListener('click', clearRecentSearches);

// ---------- Búsquedas recientes ----------
function createRecentSearchItem(query) {
    const item = document.createElement('li');
    item.classList.add('searchRecent-item');

    const open = document.createElement('button');
    open.type = 'button';
    open.classList.add('searchRecent-query');
    open.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        '<span></span>';
    open.querySelector('span').textContent = query;
    open.addEventListener('click', () => {
        saveRecentSearch(query);
        location.hash = `#search=${encodeURIComponent(query)}`;
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.classList.add('searchRecent-remove');
    remove.textContent = '✕';
    remove.setAttribute('aria-label', `Quitar "${query}" del historial`);
    remove.addEventListener('click', () => removeRecentSearch(query));

    item.append(open, remove);
    return item;
}

function renderRecentSearches() {
    searchRecentBlock.classList.toggle('is-empty', searchHistory.length === 0);
    searchRecentList.replaceChildren(...searchHistory.map(createRecentSearchItem));
}

// ---------- Categorías de búsqueda ----------
const searchGenresCache = new Map();

async function renderSearchCategories() {
    const type = getMediaType();
    if (!searchGenresCache.has(type)) {
        try {
            const { data } = await api.get(`genre/${type}/list`);
            searchGenresCache.set(type, data.genres);
        } catch (error) {
            console.error('Error al cargar las categorías de búsqueda:', error.response?.status ?? error.message);
            return;
        }
    }

    createCategories(searchGenresCache.get(type), searchCategoriesList);
}

// ---------- Panel de búsqueda ----------
function renderSearchPanel() {
    renderRecentSearches();
    renderSearchCategories();
}