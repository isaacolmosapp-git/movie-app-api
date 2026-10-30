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

arrowBtn.addEventListener('click', () => {
    // Si hay historial previo dentro del mismo dominio, retrocedemos, si no, vamos al home
    if (document.referrer && document.referrer.startsWith(window.location.origin) && history.length > 1) {
        history.back();
    } else {
        location.hash = '#home'; // O simplemente limpiar el hash o asignar '#'
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

    const [categoryId, categoryName] = location.hash.split('=')[1].split('-');
    headerCategoryTitle.textContent = decodeURIComponent(categoryName);
    getMoviesByCategory(categoryId);
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

    // Se separa en el primer guion: los nombres pueden tener guiones (p. ej. Jean-Claude)
    const value = location.hash.split('=')[1];
    const dash = value.indexOf('-');
    const actorId = value.slice(0, dash);
    const actorName = decodeURIComponent(value.slice(dash + 1));

    headerCategoryTitle.textContent = actorName;
    getMoviesByActor(actorId);
}