// ---------- Reproductor de tráiler ----------
function pickTrailer(videos = []) {
    const candidates = videos.filter(video =>
        video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
    );

    const score = video =>
        (video.type === 'Trailer' ? 4 : 0) +
        (video.official ? 2 : 0) +
        (video.iso_639_1 === 'en' ? 1 : 0);

    return candidates.sort((a, b) => score(b) - score(a))[0] ?? null;
}

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
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`;
    iframe.title = 'Tráiler';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';

    trailerFrame.replaceChildren(iframe);
    trailerModal.showModal();
}

function closeTrailer() {
    trailerModal.close();
}

// ---------- Eventos del modal ----------
trailerModal.addEventListener('close', () => {
    trailerFrame.replaceChildren();
});

trailerClose.addEventListener('click', closeTrailer);

trailerModal.addEventListener('click', event => {
    if (event.target === trailerModal) {
        closeTrailer();
    }
});

window.addEventListener('hashchange', () => {
    if (trailerModal.open) {
        closeTrailer();
    }
});
