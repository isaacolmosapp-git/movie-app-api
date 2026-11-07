searchFormBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const query = searchFormInput.value.trim();

    if (query) {
        location.hash = `#search=${encodeURIComponent(query)}`;
    }
});

trendingBtn.addEventListener('click', () => {
    location.hash = '#trends';
});

let currentDepth = history.state?.depth ?? 0;

function syncDepth() {
    if (typeof history.state?.depth === 'number') {
        currentDepth = history.state.depth; // volvió o avanzó a una entrada ya conocida
    } else {
        currentDepth += 1;                  // entrada nueva
        history.replaceState({ depth: currentDepth }, '');
    }
}

window.addEventListener('hashchange', syncDepth);

arrowBtn.addEventListener('click', () => {
    if (currentDepth > 0) {
        history.back();
    } else {
        location.hash = '#home'; // la página se abrió directamente en esta vista
    }
});

homeBtn.addEventListener('click', () => {
    location.hash = '#home';
});

window.addEventListener('DOMContentLoaded', navigator, false);
window.addEventListener('hashchange', navigator, false);

function navigator() {
    

    if (location.hash.startsWith('#trends')) {
        trendsPage();
    } else if (location.hash.startsWith('#search=')) {
        searchPage();
    } else if (location.hash.startsWith('#movie=')) {
        moviePage();
    } else if (location.hash.startsWith('#category=')) {
        categoryPage();
    } else if (location.hash.startsWith('#actor=')) {
        actorPage();
    } else if (location.hash.startsWith('#list=')) {
        listPage();
    } else {
        homePage();
    }

    window.scrollTo(0, 0);
}

function homePage() {

    headerSection.classList.remove('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.add('inactive');
    headerTitle.classList.remove('inactive');
    headerCategoryTitle.classList.add('inactive');
    searchForm.classList.remove('inactive');
    favoritesPreviewSection.classList.remove('inactive');
    homeBtn.classList.add('inactive');

    trendingPreviewSection.classList.remove('inactive');
    categoriesPreviewSection.classList.remove('inactive');
    genericSection.classList.add('inactive');
    movieDetailSection.classList.add('inactive');
    homeRowsContainer.classList.remove('inactive');

    
}

function trendsPage() {

    headerSection.classList.remove('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.remove('inactive');
    headerTitle.classList.add('inactive');
    headerCategoryTitle.classList.remove('inactive');
    searchForm.classList.add('inactive');
    favoritesPreviewSection.classList.add('inactive');
    homeBtn.classList.remove('inactive');

    trendingPreviewSection.classList.add('inactive');
    categoriesPreviewSection.classList.add('inactive');
    genericSection.classList.remove('inactive');
    movieDetailSection.classList.add('inactive');
    homeRowsContainer.classList.add('inactive');

    headerCategoryTitle.textContent = 'Tendencias';

    getTrendingMovies();


}

function searchPage() {

    headerSection.classList.remove('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.remove('inactive');
    headerTitle.classList.add('inactive');
    headerCategoryTitle.classList.add('inactive');
    searchForm.classList.remove('inactive');
    favoritesPreviewSection.classList.add('inactive');
    homeBtn.classList.remove('inactive');

    trendingPreviewSection.classList.add('inactive');
    categoriesPreviewSection.classList.add('inactive');
    genericSection.classList.remove('inactive');
    movieDetailSection.classList.add('inactive');
    homeRowsContainer.classList.add('inactive');

    const [_, query] = location.hash.split('=');
    getMoviesBySearch(decodeURIComponent(query));


}

function moviePage() {

    headerSection.classList.add('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.remove('inactive');
    headerTitle.classList.add('inactive');
    headerCategoryTitle.classList.add('inactive');
    searchForm.classList.add('inactive');
    favoritesPreviewSection.classList.add('inactive');
    homeBtn.classList.remove('inactive');

    trendingPreviewSection.classList.add('inactive');
    categoriesPreviewSection.classList.add('inactive');
    genericSection.classList.add('inactive');
    movieDetailSection.classList.remove('inactive');
    homeRowsContainer.classList.add('inactive');

    const [_, movieId] = location.hash.split('=');
    getMovieById(movieId);
    getRelatedMoviesById(movieId);
}

function categoryPage() {

    headerSection.classList.remove('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.remove('inactive');
    headerTitle.classList.add('inactive');
    headerCategoryTitle.classList.remove('inactive');
    searchForm.classList.add('inactive');
    favoritesPreviewSection.classList.add('inactive');
    homeBtn.classList.remove('inactive');

    trendingPreviewSection.classList.add('inactive');
    categoriesPreviewSection.classList.add('inactive');
    genericSection.classList.remove('inactive');
    movieDetailSection.classList.add('inactive');
    homeRowsContainer.classList.add('inactive');

    const value = location.hash.split('=')[1];
    const dash = value.indexOf('-');
    const categoryId = value.slice(0, dash);
    const categoryName = decodeURIComponent(value.slice(dash + 1));

    headerCategoryTitle.textContent = categoryName;
    getMoviesByCategory(categoryId);

}

function listPage() {
    const rowId = location.hash.split('=')[1];
    const row = HOME_ROWS.find(item => item.id === rowId);

    if (!row || !row.endpoint) {
        location.hash = '#home';
        return;
    }

    headerSection.classList.remove('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.remove('inactive');
    headerTitle.classList.add('inactive');
    headerCategoryTitle.classList.remove('inactive');
    searchForm.classList.add('inactive');
    favoritesPreviewSection.classList.add('inactive');
    homeBtn.classList.remove('inactive');

    trendingPreviewSection.classList.add('inactive');
    categoriesPreviewSection.classList.add('inactive');
    genericSection.classList.remove('inactive');
    movieDetailSection.classList.add('inactive');
    homeRowsContainer.classList.add('inactive');

    headerCategoryTitle.textContent = row.title;
    getMoviesByRow(rowId);
}

function actorPage() {

    headerSection.classList.remove('header-container--long');
    headerSection.style.background = '';
    arrowBtn.classList.remove('inactive');
    headerTitle.classList.add('inactive');
    headerCategoryTitle.classList.remove('inactive');
    searchForm.classList.add('inactive');
    favoritesPreviewSection.classList.add('inactive');
    homeBtn.classList.remove('inactive');

    trendingPreviewSection.classList.add('inactive');
    categoriesPreviewSection.classList.add('inactive');
    genericSection.classList.remove('inactive');
    movieDetailSection.classList.add('inactive');
    homeRowsContainer.classList.add('inactive');

    // Se separa en el primer guion: los nombres pueden tener guiones (p. ej. Jean-Claude)
    const value = location.hash.split('=')[1];
    const dash = value.indexOf('-');
    const actorId = value.slice(0, dash);
    const actorName = decodeURIComponent(value.slice(dash + 1));

    headerCategoryTitle.textContent = actorName;
    getMoviesByActor(actorId);
}