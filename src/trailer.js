// Tráiler de la película en un modal (<dialog>) con el reproductor de YouTube
//
// Cargar DESPUÉS de nodes.js.
// Requiere: trailerBtn, trailerModal, trailerFrame y trailerClose (nodes.js).

// Elige el mejor video: tráiler antes que teaser, oficial antes que no oficial,
// y a igualdad, el que está en español
function pickTrailer(videos = []) {
    const candidates = videos.filter(video =>
        video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
    );

    const score = video =>
        (video.type === 'Trailer' ? 4 : 0) +
        (video.official ? 2 : 0) +
        (video.iso_639_1 === 'es' ? 1 : 0);

    return candidates.sort((a, b) => score(b) - score(a))[0] ?? null;
}

// Muestra u oculta el botón según la película tenga o no tráiler
function bindTrailerButton(videos) {
    const trailer = pickTrailer(videos);

    if (!trailer) {
        trailerBtn.classList.add('inactive');
        trailerBtn.onclick = null;
        return;
    }

    trailerBtn.classList.remove('inactive');
    trailerBtn.onclick = () => openTrailer(trailer.key);
}

function openTrailer(youtubeKey) {
    // El iframe se crea al abrir (no antes) para no descargar el reproductor sin necesidad
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`;
    iframe.title = 'Tráiler';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'; // YouTube lo necesita para reproducir

    trailerFrame.replaceChildren(iframe);
    trailerModal.showModal(); // Esc, foco y fondo oscuro los maneja <dialog>
}

function closeTrailer() {
    trailerModal.close();
}

// Al cerrarse (Esc, botón o clic fuera) se elimina el iframe: así el video deja de sonar
trailerModal.addEventListener('close', () => {
    trailerFrame.replaceChildren();
});

trailerClose.addEventListener('click', closeTrailer);

// Clic en el fondo oscuro: el destino es el propio <dialog>, no su contenido
trailerModal.addEventListener('click', event => {
    if (event.target === trailerModal) {
        closeTrailer();
    }
});

// Si se navega a otra vista con el modal abierto, se cierra
window.addEventListener('hashchange', () => {
    if (trailerModal.open) {
        closeTrailer();
    }
});