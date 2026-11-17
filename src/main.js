// ---------- Cliente API ----------
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

// ---------- Rutas de imágenes ----------
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const IMG_BG_URL = 'https://image.tmdb.org/t/p/w780';
const IMG_BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';
const IMG_PROFILE_URL = 'https://image.tmdb.org/t/p/w185';

// ---------- Peticiones de datos ----------
async function getTrendingMoviesPreview() {
    showHeroSkeleton();
    try {
        const type = getMediaType();
        const { data } = await api.get(`trending/${type}/day`);
        const items = data.results.map(item => ({ ...item, type }));
        renderHero(items);
    } catch (error) {
        heroSection.classList.add('inactive');
        console.error('Error al cargar las tendencias:', error.response?.status ?? error.message);
    }
}

async function getTrendingMovies() {
    createMovieSkeletons(genericSection);

    try {
        const type = getMediaType();
        const { data } = await api.get(`trending/${type}/day`);
        const items = data.results.map(item => ({ ...item, type }));
        createMovies(items, genericSection);
    } catch (error) {
        console.error('Error al cargar las tendencias:', error.response?.status ?? error.message);
    }
}

async function getCategoriesPreview() {
    try {
        createCategorySkeletons(categoriesPreviewContainer, 12);
        const type = getMediaType();
        const { data } = await api.get(`genre/${type}/list`);
        createCategories(data.genres, categoriesPreviewContainer);
    } catch (error) {
        console.error('Error al cargar las categorías:', error.response?.status ?? error.message);
    }
}

async function getMovieById(movieId, type = getMediaType()) {
    trailerBtn.classList.add('inactive');
    movieDetailListBtn.classList.add('inactive');
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
        const { data: movie } = await api.get(`${type}/${movieId}`, {
            params: {
                append_to_response: 'credits,videos',
                include_video_language: 'es,en,null'
            }
        });

        const title = movie.title ?? movie.name ?? '';
        const normalizedMovie = { ...movie, id: movie.id, type, title };

        movieDetailTitle.textContent = title;
        movieDetailDescription.textContent = movie.overview;
        movieDetailScore.textContent = movie.vote_average ? movie.vote_average.toFixed(1) : '';
        bindDetailFavoriteButton(normalizedMovie);
        bindTrailerButton(movie.videos?.results);
        bindDetailListButton(normalizedMovie);
        trackRecentlyViewed(normalizedMovie);

        const date = movie.release_date ?? movie.first_air_date;
        const year = date ? date.slice(0, 4) : '';

        let durationText = '';
        if (type === 'tv' || movie.number_of_seasons) {
            const seasons = movie.number_of_seasons;
            const episodes = movie.number_of_episodes;
            if (seasons) {
                durationText = `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}`;
            } else if (episodes) {
                durationText = `${episodes} eps`;
            }
        } else {
            durationText = formatRuntime(movie.runtime);
        }

        movieDetailMeta.textContent = [year, durationText]
            .filter(Boolean)
            .join(' · ');

        if (movie.poster_path) {
            movieDetailSection.style.setProperty('--movie-bg', `url(${IMG_BG_URL}${movie.poster_path})`);
        }
        if (movie.backdrop_path) {
            movieDetailSection.style.setProperty(
                '--movie-bg-wide',
                `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`
            );
        }

        createCategories(movie.genres, movieDetailCategoriesList);

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
        console.error('Error al cargar los detalles:', error.response?.status ?? error.message);
    } finally {
        movieDetailSection.classList.remove('is-loading');
    }
}

async function getRelatedMoviesById(movieId, type = getMediaType()) {
    createMovieSkeletons(relatedMoviesContainer);

    try {
        const { data } = await api.get(`${type}/${movieId}/similar`);
        const items = data.results.map(item => ({ ...item, type }));
        createMovies(items, relatedMoviesContainer);
        relatedMoviesContainer.scrollLeft = 0;
    } catch (error) {
        console.error('Error al cargar contenido similar:', error.response?.status ?? error.message);
    }
}

// ---------- Renderizado y helpers ----------
const lazyObservers = new WeakMap();

function getLazyObserver(container) {
    if (lazyObservers.has(container)) {
        return lazyObservers.get(container);
    }

    const isHorizontal = getComputedStyle(container).overflowX === 'auto';

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const img = entry.target;
            img.src = img.dataset.src;
            obs.unobserve(img);
        });
    }, {
        root: isHorizontal ? container : null,
        rootMargin: isHorizontal ? '0px 150px' : '200px 0px'
    });

    lazyObservers.set(container, observer);
    return observer;
}

function createMovies(movies, container, clean = true, decorate = null) {
    const observer = getLazyObserver(container);

    if (clean) {
        container.innerHTML = '';
        observer.disconnect();
    }

    movies.forEach(movie => {
        const type = movie.type ?? getMediaType();
        const title = movie.title ?? movie.name ?? '';
        const item = { ...movie, type, title };

        const movieContainer = document.createElement('div');
        movieContainer.classList.add('movie-container', 'skeleton');
        movieContainer.addEventListener('click', () => {
            location.hash = `#${type}=${movie.id}`;
        });

        const movieImg = document.createElement('img');
        movieImg.classList.add('movie-img');
        movieImg.setAttribute('alt', title);
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
            label.textContent = title;
            movieContainer.appendChild(label);
        });

        movieContainer.appendChild(movieImg);
        movieContainer.appendChild(createFavoriteButton(item));
        if (decorate) decorate(movieContainer, item);
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
        skeleton.style.width = `${70 + ((i * 37) % 60)}px`;
        container.appendChild(skeleton);
    }
}

// ---------- Carga inicial ----------
getTrendingMoviesPreview();
getCategoriesPreview();
