// Instancia con configuración común: baseURL y parámetros que van en todas las peticiones
const api = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    },
    params: {
        api_key: API_KEY,
        language: 'es-MX'
    }
});

const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const IMG_BG_URL = 'https://image.tmdb.org/t/p/w780';
const IMG_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';
const IMG_PROFILE_URL = 'https://image.tmdb.org/t/p/w185';

async function getTrendingMoviesPreview() {
    createMovieSkeletons(trendingMoviesPreviewContainer);

    try {
        // axios ya parsea el JSON: los datos están en res.data
        const { data } = await api.get('trending/movie/day');
        createMovies(data.results.slice(0, 10), trendingMoviesPreviewContainer);
    } catch (error) {
        console.error('Error al cargar las películas en tendencia:', error.response?.status ?? error.message);
    }
}

async function getTrendingMovies() {
    createMovieSkeletons(genericSection);

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
        createCategorySkeletons(categoriesPreviewContainer, 12);
        const { data } = await api.get('genre/movie/list');
        createCategories(data.genres, categoriesPreviewContainer);
    } catch (error) {
        console.error('Error al cargar las categorías:', error.response?.status ?? error.message);
    }
}


async function getMovieById(movieId) {
    // Estado de carga
    trailerBtn.classList.add('inactive');
    movieDetailSection.classList.add('is-loading');
    movieDetailTitle.textContent = '';
    movieDetailDescription.textContent = '';
    movieDetailScore.textContent = '';
    movieDetailMeta.textContent = '';
    createCategorySkeletons(movieDetailCategoriesList, 3);
    createCastSkeletons(movieDetailCastList);
    movieDetailCastSection.classList.remove('inactive');
    movieDetailSection.style.removeProperty('--movie-bg');
    movieDetailSection.style.removeProperty('--movie-bg-wide');

    try {
        // append_to_response trae el reparto en la misma petición
        const { data: movie } = await api.get(`movie/${movieId}`, {
            params: {
                append_to_response: 'credits,videos',      // ← agrega videos
                include_video_language: 'es,en,null'       // ← nuevo
            }
        });

        movieDetailTitle.textContent = movie.title;
        movieDetailDescription.textContent = movie.overview;
        movieDetailScore.textContent = movie.vote_average;
        bindDetailFavoriteButton(movie);
        bindTrailerButton(movie.videos?.results);

        const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
        movieDetailMeta.textContent = [year, formatRuntime(movie.runtime)]
            .filter(Boolean)
            .join(' · ');

        if (movie.poster_path) {
            movieDetailSection.style.setProperty('--movie-bg', `url(${IMG_BG_URL}${movie.poster_path})`);
        }
        if (movie.backdrop_path) {
            movieDetailSection.style.setProperty('--movie-bg-wide', `url(${IMG_BACKDROP_URL}${movie.backdrop_path})`);
        }

        createCategories(movie.genres, movieDetailCategoriesList);

        // Los primeros 12 del reparto, ya ordenados por importancia en la película
        const cast = (movie.credits?.cast ?? []).slice(0, 12);
        if (cast.length) {
            createCast(cast, movieDetailCastList);
        } else {
            movieDetailCastList.innerHTML = '';
            movieDetailCastSection.classList.add('inactive');
        }
    } catch (error) {
        movieDetailCategoriesList.innerHTML = '';
        movieDetailCastList.innerHTML = '';
        console.error('Error al cargar los detalles de la película:', error.response?.status ?? error.message);
    } finally {
        movieDetailSection.classList.remove('is-loading');
    }
    

}

async function getRelatedMoviesById(movieId) {
    createMovieSkeletons(relatedMoviesContainer);

    try {
        const { data } = await api.get(`movie/${movieId}/similar`);
        createMovies(data.results, relatedMoviesContainer);

        // Al pasar de una película a otra, la lista vuelve al inicio
        relatedMoviesContainer.scrollLeft = 0;
    } catch (error) {
        console.error('Error al cargar las películas similares:', error.response?.status ?? error.message);
    }
}


        ////// HELPERS ////////

// Un observer por contenedor, para reutilizarlo entre renders
const lazyObservers = new WeakMap();

function getLazyObserver(container) {
    if (lazyObservers.has(container)) {
        return lazyObservers.get(container);
    }

    // En listas con scroll horizontal, el "viewport" es el propio contenedor
    const isHorizontal = getComputedStyle(container).overflowX === 'auto';

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const img = entry.target;
            img.src = img.dataset.src;
            obs.unobserve(img); // ya no hace falta vigilarla
        });
    }, {
        root: isHorizontal ? container : null,
        // margen de precarga: ~1 tarjeta antes de que entre en pantalla
        rootMargin: isHorizontal ? '0px 150px' : '200px 0px'
    });

    lazyObservers.set(container, observer);
    return observer;
}

function createMovies(movies, container, clean = true) {
    const observer = getLazyObserver(container);

    if (clean) {
        container.innerHTML = '';
        observer.disconnect();
    }

    movies.forEach(movie => {
        const movieContainer = document.createElement('div');
        movieContainer.classList.add('movie-container', 'skeleton');
        movieContainer.addEventListener('click', () => {
            location.hash = `#movie=${movie.id}`;
        });

        const movieImg = document.createElement('img');
        movieImg.classList.add('movie-img');
        movieImg.setAttribute('alt', movie.title);
        movieImg.setAttribute('decoding', 'async');

        movieImg.addEventListener('load', () => {
            movieContainer.classList.remove('skeleton');
            movieImg.classList.add('is-loaded');
        });
        movieImg.addEventListener('error', () => {
            movieContainer.classList.remove('skeleton');
            movieContainer.classList.add('movie-container--noimg');
            movieImg.remove();

            const label = document.createElement('span');
            label.textContent = movie.title;
            movieContainer.appendChild(label);
        });

        movieContainer.appendChild(movieImg);
        movieContainer.appendChild(createFavoriteButton(movie)); // ← nuevo
        container.appendChild(movieContainer);

        if (movie.poster_path) {
            movieImg.dataset.src = `${IMG_BASE_URL}${movie.poster_path}`;
            observer.observe(movieImg);
        } else {
            movieImg.dispatchEvent(new Event('error'));
        }
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

function formatRuntime(minutes) {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

function createCastSkeletons(container, count = 6) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('cast-skeleton', 'skeleton');
        container.appendChild(skeleton);
    }
}

function createCast(cast, container, clean = true) {
    if (clean) {
        container.innerHTML = '';
    }

    cast.forEach(actor => {
        const card = document.createElement('div');
        card.classList.add('cast-card');
        card.addEventListener('click', () => {
            location.hash = `#actor=${actor.id}-${encodeURIComponent(actor.name)}`;
        });

        let photo;
        if (actor.profile_path) {
            photo = document.createElement('img');
            photo.setAttribute('src', `${IMG_PROFILE_URL}${actor.profile_path}`);
            photo.setAttribute('alt', actor.name);
            photo.setAttribute('loading', 'lazy');
            photo.classList.add('cast-photo');
        } else {
            // Sin foto: círculo con la inicial del actor
            photo = document.createElement('div');
            photo.classList.add('cast-photo', 'cast-photo--empty');
            photo.textContent = actor.name.charAt(0);
        }

        const name = document.createElement('p');
        name.classList.add('cast-name');
        name.textContent = actor.name;

        const character = document.createElement('p');
        character.classList.add('cast-character');
        character.textContent = actor.character;

        card.append(photo, name, character);
        container.appendChild(card);
    });
}

function createMovieSkeletons(container, count = 8) {
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('movie-container', 'movie-container--skeleton', 'skeleton');
        container.appendChild(skeleton);
    }
}

function createCategorySkeletons(container, count = 8) {
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('category-title--skeleton', 'skeleton');
        // Anchos variados para que se vea más natural
        skeleton.style.width = `${70 + ((i * 37) % 60)}px`;
        container.appendChild(skeleton);
    }
}


getTrendingMoviesPreview();
getCategoriesPreview();