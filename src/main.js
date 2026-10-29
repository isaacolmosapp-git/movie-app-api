// Instancia con configuración común: baseURL y parámetros que van en todas las peticiones
const api = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    },
    params: {
        api_key: API_KEY,
        language: 'es'
    }
});

const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const IMG_BG_URL = 'https://image.tmdb.org/t/p/w780';
const IMG_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

async function getTrendingMoviesPreview() {
    try {
        // axios ya parsea el JSON: los datos están en res.data
        const { data } = await api.get('trending/movie/day');
        createMovies(data.results, trendingMoviesPreviewContainer);
    } catch (error) {
        console.error('Error al cargar las películas en tendencia:', error.response?.status ?? error.message);
    }
}

async function getTrendingMovies() {
    try {
        // axios ya parsea el JSON: los datos están en res.data
        const { data } = await api.get('trending/movie/day');
        createMovies(data.results, genericSection);
    } catch (error) {
        console.error('Error al cargar las películas en tendencia:', error.response?.status ?? error.message);
    }
}

async function getCategoriesPreview() {
    try {
        const { data } = await api.get('genre/movie/list');
        createCategories(data.genres, categoriesPreviewContainer);
    } catch (error) {
        console.error('Error al cargar las categorías:', error.response?.status ?? error.message);
    }
}
 async function getMoviesByCategory(categoryId) {
    try {
        const { data } = await api.get('discover/movie', {
            params: {
                with_genres: categoryId
            }
        });
        createMovies(data.results, genericSection);

    } catch (error) {
        console.error('Error al cargar las películas por categoría:', error.response?.status ?? error.message);
    }
}

function getMoviesBySearch(query) {
    api.get('search/movie', {
        params: {
            query: query
        }
    })
    .then(response => {
        createMovies(response.data.results, genericSection);
    })
    .catch(error => {
        console.error('Error al cargar las películas por búsqueda:', error.response?.status ?? error.message);
    });
}

async function getMovieById(movieId) {
    try {
        // Limpia los fondos de la película anterior mientras carga la nueva
        movieDetailSection.style.removeProperty('--movie-bg');
        movieDetailSection.style.removeProperty('--movie-bg-wide');

        const { data: movie } = await api.get(`movie/${movieId}`);

        movieDetailTitle.textContent = movie.title;
        movieDetailDescription.textContent = movie.overview;
        movieDetailScore.textContent = movie.vote_average;

        // Póster (vertical) para móvil
        if (movie.poster_path) {
            movieDetailSection.style.setProperty('--movie-bg', `url(${IMG_BG_URL}${movie.poster_path})`);
        }

        // Backdrop (horizontal) para escritorio
        if (movie.backdrop_path) {
            movieDetailSection.style.setProperty('--movie-bg-wide', `url(${IMG_BACKDROP_URL}${movie.backdrop_path})`);
        }

        createCategories(movie.genres, movieDetailCategoriesList);
    } catch (error) {
        console.error('Error al cargar los detalles de la película:', error.response?.status ?? error.message);
    }
}

async function getRelatedMoviesById(movieId) {
    try {
        const { data } = await api.get(`movie/${movieId}/similar`);
        createMovies(data.results, relatedMoviesContainer);

        // Al pasar de una película a otra, la lista vuelve al inicio
        relatedMoviesContainer.scrollLeft = 0;
    } catch (error) {
        console.error('Error al cargar las películas similares:', error.response?.status ?? error.message);
    }
}
function createMovies(movies, container, clean = true) {
    if (clean) {
        container.innerHTML = '';
    }
 
    movies.forEach(movie => {
        const movieContainer = document.createElement('div');
        movieContainer.classList.add('movie-container');
        movieContainer.addEventListener('click', () => {
            location.hash = `#movie=${movie.id}`;
        });
        movieContainer.setAttribute('id', `id${movie.id}`);
        
    
 
        const movieImg = document.createElement('img');
        movieImg.classList.add('movie-img');
        movieImg.setAttribute('alt', movie.title);
        movieImg.setAttribute('src', `${IMG_BASE_URL}${movie.poster_path}`);

 
        movieContainer.appendChild(movieImg);
        container.appendChild(movieContainer);

        
    });
}

function createCategories(categories, container, clean = true) {
    if (clean) {
        container.innerHTML = '';
    }
 
    categories.forEach(category => {
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('category-container');
 
        const categoryTitle = document.createElement('h3');
        categoryTitle.classList.add('category-title');
        categoryTitle.addEventListener('click', () => {
            location.hash = `#category=${category.id}-${encodeURIComponent(category.name)}`;
        });
        categoryTitle.setAttribute('id', `id${category.id}`);
        categoryTitle.textContent = category.name;
 
        categoryContainer.appendChild(categoryTitle);
        container.appendChild(categoryContainer);
    });
}

getTrendingMoviesPreview();
getCategoriesPreview();