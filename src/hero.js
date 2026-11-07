// Hero de tendencias: carrusel con scroll-snap, autoplay y controles
//
// Cargar DESPUÉS de nodes.js, favorites.js y main.js.
// Requiere: heroSection, heroTrack, heroDots, heroPrev, heroNext, heroToggle (nodes.js),
//           createFavoriteButton (favorites.js) e IMG_BG_URL / IMG_BACKDROP_URL (main.js).
// Esas funciones y constantes se usan solo en tiempo de ejecución.

const HERO_SLIDES = 6;       // cuántas películas se muestran
const HERO_INTERVAL = 6000;  // ms entre slides
const IMG_ORIGINAL_URL = 'https://image.tmdb.org/t/p/original';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let heroCount = 0;
let heroIndex = 0;
let heroTimer = null;
let heroHovered = false;
let heroFocused = false;
let heroTouching = false;
let heroVisible = false;
let heroUserPaused = false;

// ---------- Construcción ----------
function createHeroSlide(movie, index, total) {
    const slide = document.createElement('article');
    slide.classList.add('hero-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} de ${total}`);

    // Backdrop (horizontal) en escritorio y póster (vertical) en móvil
    const picture = document.createElement('picture');
    if (movie.backdrop_path) {
        const source = document.createElement('source');
        source.media = '(min-width: 720px)';
        source.sizes = '(min-width: 720px) calc(100vw - 80px)';
        source.srcset = [
            `${IMG_BACKDROP_URL}${movie.backdrop_path} 1280w`,
            `${IMG_ORIGINAL_URL}${movie.backdrop_path} 1920w`
        ].join(', ');
        picture.appendChild(source);
    }

    const img = document.createElement('img');
    img.classList.add('hero-img');
    img.alt = ''; // decorativa: el título ya está en el texto de la slide
    img.src = `${IMG_BG_URL}${movie.poster_path ?? movie.backdrop_path}`;
    img.loading = index === 0 ? 'eager' : 'lazy';
    if (index === 0) img.fetchPriority = 'high';
    picture.appendChild(img);

    const content = document.createElement('div');
    content.classList.add('hero-content');

    const title = document.createElement('h3');
    title.classList.add('hero-title');
    title.textContent = movie.title;
    content.appendChild(title);

    const year = movie.release_date?.slice(0, 4);
    const score = movie.vote_average > 0 ? `★ ${movie.vote_average.toFixed(1)}` : '';
    const metaText = [score, year].filter(Boolean).join(' · ');
    if (metaText) {
        const meta = document.createElement('p');
        meta.classList.add('hero-meta');
        meta.textContent = metaText;
        content.appendChild(meta);
    }

    if (movie.overview) {
        const overview = document.createElement('p');
        overview.classList.add('hero-overview');
        overview.textContent = movie.overview;
        content.appendChild(overview);
    }

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.classList.add('hero-cta');
    cta.textContent = 'Ver detalle';
    cta.addEventListener('click', () => {
        location.hash = `#movie=${movie.id}`;
    });
    content.appendChild(cta);

    slide.append(picture, content, createFavoriteButton(movie));
    return slide;
}

function createHeroDot(index) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.classList.add('hero-dot');
    dot.setAttribute('aria-label', `Ir a la slide ${index + 1}`);
    dot.addEventListener('click', () => {
        goToHero(index);
        restartAutoplay();
    });
    return dot;
}

function showHeroSkeleton() {
    heroCount = 0;
    heroIndex = 0;
    heroSection.classList.remove('inactive', 'is-single');
    heroSection.classList.add('is-loading');
    heroTrack.innerHTML = '<div class="hero-slide hero-slide--skeleton skeleton"></div>';
    heroDots.innerHTML = '';
    updateAutoplay();
}

function renderHero(movies) {
    const slides = movies
        .filter(movie => movie.backdrop_path || movie.poster_path)
        .slice(0, HERO_SLIDES);

    heroTrack.innerHTML = '';
    heroDots.innerHTML = '';
    heroCount = slides.length;
    heroIndex = 0;

    if (heroCount === 0) {
        heroSection.classList.add('inactive');
        updateAutoplay();
        return;
    }

    slides.forEach((movie, i) => {
        heroTrack.appendChild(createHeroSlide(movie, i, heroCount));
        heroDots.appendChild(createHeroDot(i));
    });

    heroTrack.scrollLeft = 0;
    heroSection.classList.remove('is-loading');
    heroSection.classList.toggle('is-single', heroCount < 2);
    setHeroActive(0);
    updateAutoplay();
}

// ---------- Navegación ----------
function setHeroActive(index) {
    heroIndex = index;
    heroDots.querySelectorAll('.hero-dot').forEach((dot, i) => {
        dot.setAttribute('aria-current', String(i === index));
    });
}

function goToHero(index) {
    if (heroCount === 0) return;

    const target = (index + heroCount) % heroCount; // da la vuelta al llegar al final
    heroTrack.scrollTo({
        left: target * heroTrack.clientWidth,
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
}

function currentHeroIndex() {
    const width = heroTrack.clientWidth || 1;
    return Math.min(heroCount - 1, Math.max(0, Math.round(heroTrack.scrollLeft / width)));
}

// El índice activo sale de la posición del scroll, así que también funciona al deslizar con el dedo
let heroScrollTicking = false;
heroTrack.addEventListener('scroll', () => {
    if (heroScrollTicking || heroCount === 0) return;
    heroScrollTicking = true;
    requestAnimationFrame(() => {
        heroScrollTicking = false;
        setHeroActive(currentHeroIndex());
    });
}, { passive: true });

heroPrev.addEventListener('click', () => {
    goToHero(heroIndex - 1);
    restartAutoplay();
});

heroNext.addEventListener('click', () => {
    goToHero(heroIndex + 1);
    restartAutoplay();
});

heroSection.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        goToHero(heroIndex - 1);
        restartAutoplay();
    } else if (event.key === 'ArrowRight') {
        goToHero(heroIndex + 1);
        restartAutoplay();
    }
});

// ---------- Autoplay ----------
function updateAutoplay() {
    const shouldRun =
        heroCount > 1 &&
        !heroUserPaused &&
        !heroHovered &&
        !heroFocused &&
        !heroTouching &&
        heroVisible &&
        !document.hidden &&
        !reduceMotion.matches;

    if (shouldRun && !heroTimer) {
        heroTimer = setInterval(() => goToHero(heroIndex + 1), HERO_INTERVAL);
    } else if (!shouldRun && heroTimer) {
        clearInterval(heroTimer);
        heroTimer = null;
    }

    // Si no rota sola, los lectores de pantalla pueden anunciar el cambio de slide
    heroTrack.setAttribute('aria-live', heroTimer ? 'off' : 'polite');

    heroToggle.textContent = heroUserPaused ? '▶' : '❚❚';
    heroToggle.setAttribute('aria-label', heroUserPaused ? 'Reanudar carrusel' : 'Pausar carrusel');
    heroToggle.classList.toggle('inactive', reduceMotion.matches);
}

// Reinicia la cuenta: tras una interacción, la slide actual se queda un intervalo completo
function restartAutoplay() {
    clearInterval(heroTimer);
    heroTimer = null;
    updateAutoplay();
}

heroToggle.addEventListener('click', () => {
    heroUserPaused = !heroUserPaused;
    restartAutoplay();
});

// Pausa con el mouse encima (los eventos táctiles de hover emulados se ignoran)
heroSection.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    heroHovered = true;
    updateAutoplay();
});

heroSection.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    heroHovered = false;
    restartAutoplay();
});

// Pausa con el foco del teclado; el foco por clic de mouse no cuenta,
// si no el carrusel quedaría detenido tras pulsar una flecha
heroSection.addEventListener('focusin', event => {
    heroFocused = event.target.matches(':focus-visible');
    updateAutoplay();
});

heroSection.addEventListener('focusout', () => {
    heroFocused = false;
    restartAutoplay();
});

// Pausa mientras el dedo está sobre el carrusel
heroTrack.addEventListener('touchstart', () => {
    heroTouching = true;
    updateAutoplay();
}, { passive: true });

['touchend', 'touchcancel'].forEach(type => {
    heroTrack.addEventListener(type, () => {
        heroTouching = false;
        restartAutoplay();
    }, { passive: true });
});

document.addEventListener('visibilitychange', updateAutoplay);
reduceMotion.addEventListener('change', updateAutoplay);

// Solo rota mientras está a la vista. También cubre cuando el router oculta la sección
// (display: none), ya que entonces deja de intersectar.
new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;

    // Al volver a mostrarse, el navegador puede haber reiniciado el scroll: se resincroniza
    if (heroVisible && heroCount > 0) {
        setHeroActive(currentHeroIndex());
    }
    updateAutoplay();
}, { threshold: 0.3 }).observe(heroSection);

updateAutoplay();