// ---------- Eventos del header ----------
searchFormBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const query = searchFormInput.value.trim();

    if (query) {
        saveRecentSearch(query);
        location.hash = `#search=${encodeURIComponent(query)}`;
    }
});

trendingBtn.addEventListener('click', () => {
    location.hash = '#trends';
});

let currentDepth = history.state?.depth ?? 0;

function syncDepth() {
    if (typeof history.state?.depth === 'number') {
        currentDepth = history.state.depth;
    } else {
        currentDepth += 1;
        history.replaceState({ depth: currentDepth }, '');
    }
}

window.addEventListener('hashchange', syncDepth);

arrowBtn.addEventListener('click', () => {
    if (currentDepth > 0) {
        history.back();
    } else {
        location.hash = '#home';
    }
});

// ---------- Navegación principal ----------
const NAV_ITEMS = [
    {
        id: 'home',
        label: 'Inicio',
        href: '#home',
        icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
    },
    {
        id: 'search',
        label: 'Buscar',
        href: '#search',
        icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
    },
    {
        id: 'people',
        label: 'Personas',
        href: '#people',
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    {
        id: 'library',
        label: 'Biblioteca',
        href: '#library',
        icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'
    }
];

function renderNav(container) {
    container.innerHTML = '';

    NAV_ITEMS.forEach(item => {
        const link = document.createElement('a');
        link.classList.add('nav-link');
        link.href = item.href;
        link.dataset.tab = item.id;
        link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg><span>${item.label}</span>`;

        link.addEventListener('click', event => {
            const isCurrent = link.getAttribute('aria-current') === 'page';
            if (isCurrent && !location.hash.includes('=')) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        container.appendChild(link);
    });
}

renderNav(navDesktop);
renderNav(navMobile);

function setActiveTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.tab === tabId) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// ---------- Tabla de vistas ----------
const allSections = [
    trendingPreviewSection,
    categoriesPreviewSection,
    favoritesPreviewSection,
    homeRowsContainer,
    genericSection,
    peopleSection,
    personInfoSection,
    searchPanelSection,
    libraryPanelSection,
    listToolbarSection,
    movieDetailSection
];

const resolve = (value, arg) => (typeof value === 'function' ? value(arg) : value);

function setHeaderTitle(text) {
    headerCategoryTitle.textContent = text;
}

function parseIdName(value) {
    const dash = value.indexOf('-');
    if (dash === -1) return { id: value, name: '' };

    return {
        id: value.slice(0, dash),
        name: decodeURIComponent(value.slice(dash + 1))
    };
}

function showGenericMessage(text) {
    cancelPaginatedList();
    createMovies([], genericSection);

    const message = document.createElement('p');
    message.classList.add('genericList-empty');
    message.textContent = text;
    genericSection.appendChild(message);
}

function renderFavoritesView() {
    if (favoriteMovies.length === 0) {
        showGenericMessage('Aún no tienes favoritos. Toca el corazón de una película para guardarla aquí.');
        return;
    }

    cancelPaginatedList();
    createMovies(favoriteMovies, genericSection);
}

const VIEWS = {
    home: {
        sections: [trendingPreviewSection, categoriesPreviewSection, favoritesPreviewSection, homeRowsContainer],
        header: 'brand',
        arrow: false,
        search: true,
        tab: 'home'
    },

    trends: {
        sections: [genericSection],
        header: 'title',
        arrow: true,
        search: false,
        tab: 'home',
        enter: () => {
            setHeaderTitle('Tendencias');
            getTrendingMovies();
        }
    },

    list: {
        sections: [genericSection],
        header: 'title',
        arrow: true,
        search: false,
        tab: 'home',
        enter: rowId => {
            const row = HOME_ROWS.find(item => item.id === rowId);

            if (!row || !row.endpoint) {
                location.hash = '#home';
                return;
            }

            setHeaderTitle(resolveRowTitle(row));
            getMoviesByRow(rowId);
        }
    },

    category: {
        sections: [genericSection],
        header: 'title',
        arrow: true,
        search: false,
        tab: 'home',
        enter: value => {
            const { id, name } = parseIdName(value);
            setHeaderTitle(name);
            getMoviesByCategory(id);
        }
    },

    search: {
        sections: value => (value ? [genericSection] : [searchPanelSection]),
        header: 'none',
        arrow: value => Boolean(value),
        search: true,
        searchOnMobile: true,
        tab: 'search',
        enter: value => {
            if (value) {
                const query = decodeURIComponent(value);
                searchFormInput.value = query;
                getMoviesBySearch(query);
            } else {
                cancelPaginatedList();
                searchFormInput.value = '';
                renderSearchPanel();

                if (window.matchMedia('(min-width: 720px)').matches) {
                    searchFormInput.focus();
                }
            }
        }
    },

    people: {
        sections: [peopleSection],
        header: 'title',
        arrow: false,
        search: false,
        tab: 'people',
        enter: () => {
            setHeaderTitle('Personas');
            getPopularPeople();
        }
    },

    person: {
        sections: [personInfoSection, genericSection],
        header: 'none',
        arrow: true,
        search: false,
        tab: 'people',
        enter: value => {
            const { id, name } = parseIdName(value);
            showPerson(id, name);
        }
    },

    library: {
        sections: [libraryPanelSection],
        header: 'title',
        arrow: false,
        search: false,
        tab: 'library',
        enter: () => {
            setHeaderTitle('Biblioteca');
            renderLibrary();
        }
    },

    favorites: {
        sections: [genericSection],
        header: 'title',
        arrow: true,
        search: false,
        tab: 'library',
        enter: () => {
            setHeaderTitle('Favoritos');
            renderFavoritesView();
        }
    },

    mylist: {
        sections: [listToolbarSection, genericSection],
        header: 'title',
        arrow: true,
        search: false,
        tab: 'library',
        enter: listId => {
            showList(listId);
        }
    },

    movie: {
        sections: [movieDetailSection],
        header: 'none',
        arrow: true,
        search: false,
        tab: null,
        long: true,
        enter: movieId => {
            getMovieById(movieId, 'movie');
            getRelatedMoviesById(movieId, 'movie');
        }
    },

    tv: {
        sections: [movieDetailSection],
        header: 'none',
        arrow: true,
        search: false,
        tab: null,
        long: true,
        enter: tvId => {
            getMovieById(tvId, 'tv');
            getRelatedMoviesById(tvId, 'tv');
        }
    }
};

VIEWS.actor = VIEWS.person;

// ---------- Router ----------
function parseHash() {
    const raw = location.hash.slice(1);
    const eq = raw.indexOf('=');

    return eq === -1
        ? { name: raw, value: '' }
        : { name: raw.slice(0, eq), value: raw.slice(eq + 1) };
}

function applyView(view, value) {
    headerSection.classList.toggle('header-container--long', Boolean(view.long));
    headerSection.classList.toggle('header-container--search', Boolean(view.searchOnMobile));
    headerSection.style.background = '';

    arrowBtn.classList.toggle('inactive', !resolve(view.arrow, value));
    headerTitle.classList.toggle('inactive', view.header !== 'brand');
    headerCategoryTitle.classList.toggle('inactive', view.header !== 'title');
    searchForm.classList.toggle('inactive', !resolve(view.search, value));

    if (mediaTypeSwitcher) {
        mediaTypeSwitcher.classList.toggle('inactive', view !== VIEWS.home);
    }

    const visibleSections = resolve(view.sections, value);
    allSections.forEach(section => {
        section.classList.toggle('inactive', !visibleSections.includes(section));
    });

    setActiveTab(view.tab);
}

// ---------- Switcher de tipo de contenido ----------
function updateMediaTypeSwitcherUI() {
    if (!mediaTypeBtns) return;
    const current = getMediaType();
    mediaTypeBtns.forEach(btn => {
        const isActive = btn.dataset.type === current;
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function initMediaTypeSwitcher() {
    if (!mediaTypeBtns) return;
    updateMediaTypeSwitcherUI();

    mediaTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetType = btn.dataset.type;
            if (targetType && targetType !== getMediaType()) {
                setMediaType(targetType);
            }
        });
    });
}

initMediaTypeSwitcher();

window.addEventListener('mediatype:changed', () => {
    updateMediaTypeSwitcherUI();
    if (currentViewName === 'home') {
        getTrendingMoviesPreview();
        getCategoriesPreview();
    }
});

// ---------- Inicialización y eventos de navegación ----------
let currentViewName = null;

function navigator() {
    const { name, value } = parseHash();
    const viewName = Object.hasOwn(VIEWS, name) ? name : 'home';
    const view = VIEWS[viewName];

    currentViewName = viewName;
    applyView(view, value);
    view.enter?.(value);

    window.scrollTo(0, 0);
}

window.addEventListener('DOMContentLoaded', navigator, false);
window.addEventListener('hashchange', navigator, false);

window.addEventListener('favorites:changed', () => {
    if (currentViewName === 'favorites') {
        renderFavoritesView();
    }
});