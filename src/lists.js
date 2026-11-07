// Listas personales (localStorage) y vista Biblioteca
//
// Cargar DESPUÉS de nodes.js, media.js y favorites.js, y ANTES de navigation.js.
// Requiere (nodes.js): libraryGrid, libraryNewBtn, listToolbarCount, listRenameBtn,
//   listDeleteBtn, listFormDialog, listForm, listFormTitle, listFormInput, listFormError,
//   listFormCancel, addToListDialog, addToListItems, addToListForm, addToListInput,
//   addToListError, addToListClose y movieDetailListBtn.
// Requiere en tiempo de ejecución: createMovies, IMG_BASE_URL (main.js), setHeaderTitle,
//   showGenericMessage y currentViewName (navigation.js), cancelPaginatedList (pagination.js),
//   favoriteMovies (favorites.js), getMediaType (media.js).
//
// Cada lista es { id, name, createdAt, items: [{ id, type, title, poster_path }] }.
// El id es generado: el nombre puede repetirse en otro momento o cambiar.

const LISTS_KEY = 'user_lists';
const LIST_NAME_MAX = 40;

// ---------- Datos ----------
function loadLists() {
    try {
        const stored = JSON.parse(localStorage.getItem(LISTS_KEY));
        if (!Array.isArray(stored)) return [];

        return stored
            .filter(list => list && typeof list.id === 'string' && typeof list.name === 'string')
            .map(list => ({
                ...list,
                items: Array.isArray(list.items)
                    ? list.items.map(item => ({ ...item, type: item.type ?? 'movie' }))
                    : []
            }));
    } catch {
        // JSON corrupto o localStorage no disponible
        return [];
    }
}

let userLists = loadLists();

function saveLists() {
    try {
        localStorage.setItem(LISTS_KEY, JSON.stringify(userLists));
    } catch (error) {
        console.error('No se pudieron guardar las listas:', error);
    }
}

function notifyListsChanged() {
    saveLists();
    window.dispatchEvent(new Event('lists:changed'));
}

function newListId() {
    const id = globalThis.crypto?.randomUUID?.()
        ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return id.replace(/[^a-z0-9-]/gi, ''); // el id va en el hash: solo caracteres seguros
}

function getList(id) {
    return userLists.find(list => list.id === id);
}

// Limpia espacios, recorta y comprueba que no esté vacío ni repetido (sin distinguir mayúsculas)
function validateListName(rawName, exceptId = null) {
    const name = rawName.trim().replace(/\s+/g, ' ').slice(0, LIST_NAME_MAX);

    if (!name) {
        return { error: 'Escribe un nombre para la lista.' };
    }

    const exists = userLists.some(list =>
        list.id !== exceptId && list.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
        return { error: 'Ya tienes una lista con ese nombre.' };
    }

    return { name };
}

function createList(rawName) {
    const { name, error } = validateListName(rawName);
    if (error) return { error };

    const list = { id: newListId(), name, createdAt: Date.now(), items: [] };
    userLists = [list, ...userLists]; // la más reciente primero
    notifyListsChanged();

    return { list };
}

function renameList(id, rawName) {
    const list = getList(id);
    if (!list) return { error: 'La lista ya no existe.' };

    const { name, error } = validateListName(rawName, id);
    if (error) return { error };

    list.name = name;
    notifyListsChanged();

    return { list };
}

function deleteList(id) {
    userLists = userLists.filter(list => list.id !== id);
    notifyListsChanged();
}

function listHasItem(list, movieId, type) {
    return list.items.some(item => item.id === Number(movieId) && item.type === type);
}

function toggleListItem(listId, movie) {
    const list = getList(listId);
    if (!list) return;

    const id = Number(movie.id);
    const type = movie.type ?? getMediaType();

    if (listHasItem(list, id, type)) {
        list.items = list.items.filter(item => !(item.id === id && item.type === type));
    } else {
        // Solo lo necesario para dibujar la tarjeta; la más reciente primero
        list.items = [{ id, type, title: movie.title, poster_path: movie.poster_path }, ...list.items];
    }

    notifyListsChanged();
}

function removeListItem(listId, movieId, type) {
    const list = getList(listId);
    if (!list) return;

    list.items = list.items.filter(item => !(item.id === Number(movieId) && item.type === type));
    notifyListsChanged();
}

// ---------- Utilidades de interfaz ----------
function showFormError(element, text) {
    element.textContent = text;
    element.classList.remove('inactive');
}

function hideFormError(element) {
    element.textContent = '';
    element.classList.add('inactive');
}

// Clic en el fondo oscuro: el destino es el propio <dialog>, no su contenido
function enableBackdropClose(dialog) {
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
}

enableBackdropClose(listFormDialog);
enableBackdropClose(addToListDialog);

function countLabel(count) {
    return `${count} ${count === 1 ? 'película' : 'películas'}`;
}

// ---------- Biblioteca ----------
function createListCard({ href, name, count, posters, icon }) {
    const card = document.createElement('a');
    card.classList.add('listCard');
    card.href = href;

    const cover = document.createElement('div');
    cover.classList.add('listCard-cover');

    const covers = posters.filter(movie => movie.poster_path).slice(0, 4);
    if (covers.length === 0) {
        cover.classList.add('is-empty');
        cover.textContent = icon;
    } else {
        cover.dataset.count = covers.length;
        covers.forEach(movie => {
            const img = document.createElement('img');
            img.src = `${IMG_BASE_URL}${movie.poster_path}`;
            img.alt = '';
            img.loading = 'lazy';
            cover.appendChild(img);
        });
    }

    const title = document.createElement('h3');
    title.classList.add('listCard-name');
    title.textContent = name; // textContent: el nombre lo escribió el usuario

    const total = document.createElement('p');
    total.classList.add('listCard-count');
    total.textContent = countLabel(count);

    card.append(cover, title, total);
    return card;
}

function renderLibrary() {
    const cards = [
        createListCard({
            href: '#favorites',
            name: 'Favoritos',
            count: favoriteMovies.length,
            posters: favoriteMovies,
            icon: '♥'
        }),
        ...userLists.map(list => createListCard({
            href: `#mylist=${list.id}`,
            name: list.name,
            count: list.items.length,
            posters: list.items,
            icon: '☰'
        }))
    ];

    libraryGrid.replaceChildren(...cards);
}

libraryNewBtn.addEventListener('click', () => openListForm({ type: 'create' }));

// ---------- Diálogo de nombre (crear / renombrar) ----------
let listFormMode = null; // { type: 'create' } | { type: 'rename', id }

function openListForm(mode) {
    listFormMode = mode;

    const renaming = mode.type === 'rename';
    listFormTitle.textContent = renaming ? 'Renombrar lista' : 'Nueva lista';
    listFormInput.value = renaming ? (getList(mode.id)?.name ?? '') : '';
    hideFormError(listFormError);

    if (!listFormDialog.open) listFormDialog.showModal();
    listFormInput.focus();
    listFormInput.select();
}

listForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!listFormMode) return;

    const result = listFormMode.type === 'rename'
        ? renameList(listFormMode.id, listFormInput.value)
        : createList(listFormInput.value);

    if (result.error) {
        showFormError(listFormError, result.error);
        listFormInput.focus();
        return;
    }

    listFormDialog.close();
});

listFormCancel.addEventListener('click', () => listFormDialog.close());

// ---------- Vista de una lista ----------
let activeListId = null;

function addRemoveFromListButton(card, movie) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('card-remove-btn');
    btn.textContent = '✕';
    btn.setAttribute('aria-label', `Quitar "${movie.title}" de la lista`);

    btn.addEventListener('click', event => {
        event.stopPropagation(); // que no abra el detalle
        removeListItem(activeListId, movie.id, movie.type ?? 'movie');
    });

    card.appendChild(btn);
}

function renderListView() {
    const list = getList(activeListId);

    if (!list) {
        location.hash = '#library'; // la lista se borró (por ejemplo, desde otra pestaña)
        return;
    }

    setHeaderTitle(list.name);
    listToolbarCount.textContent = countLabel(list.items.length);

    if (list.items.length === 0) {
        showGenericMessage('Esta lista está vacía. Abre una película y pulsa "Añadir a lista".');
        return;
    }

    cancelPaginatedList(); // genericSection lo comparte la lista paginada
    createMovies(list.items, genericSection, true, addRemoveFromListButton);
}

function showList(listId) {
    if (!getList(listId)) {
        location.hash = '#library';
        return;
    }

    activeListId = listId;
    renderListView();
}

listRenameBtn.addEventListener('click', () => {
    if (activeListId) openListForm({ type: 'rename', id: activeListId });
});

listDeleteBtn.addEventListener('click', () => {
    const list = getList(activeListId);
    if (!list) return;

    const confirmed = window.confirm(
        `¿Eliminar la lista "${list.name}"? Las películas no se borran de la app.`
    );
    if (!confirmed) return;

    const id = activeListId;
    activeListId = null; // evita que el aviso de cambios intente redibujarla
    deleteList(id);
    location.hash = '#library';
});

// ---------- Añadir una película a listas (desde el detalle) ----------
let addToListMovie = null;

function updateListRow(row, list) {
    const inList = listHasItem(list, addToListMovie.id, addToListMovie.type);
    row.setAttribute('aria-pressed', String(inList));
    row.querySelector('.addToList-count').textContent = list.items.length;
}

function createAddToListRow(list) {
    const item = document.createElement('li');

    const row = document.createElement('button');
    row.type = 'button';
    row.classList.add('addToList-row');
    row.innerHTML =
        '<span class="addToList-check" aria-hidden="true">✓</span>' +
        '<span class="addToList-name"></span>' +
        '<span class="addToList-count"></span>';
    row.querySelector('.addToList-name').textContent = list.name; // textContent: texto del usuario

    updateListRow(row, list);

    // Se actualiza solo esta fila (sin redibujar todo) para no perder el foco del teclado
    row.addEventListener('click', () => {
        toggleListItem(list.id, addToListMovie);
        updateListRow(row, list);
    });

    item.appendChild(row);
    return item;
}

function renderAddToListRows() {
    if (userLists.length === 0) {
        const empty = document.createElement('li');
        empty.classList.add('addToList-empty');
        empty.textContent = 'Aún no tienes listas. Crea la primera aquí abajo.';
        addToListItems.replaceChildren(empty);
        return;
    }

    addToListItems.replaceChildren(...userLists.map(createAddToListRow));
}

function openAddToList(movie) {
    addToListMovie = movie;
    addToListInput.value = '';
    hideFormError(addToListError);
    renderAddToListRows();

    if (!addToListDialog.open) addToListDialog.showModal();
}

// Crear una lista nueva y añadir la película en el mismo paso
addToListForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!addToListMovie) return;

    const { list, error } = createList(addToListInput.value);
    if (error) {
        showFormError(addToListError, error);
        addToListInput.focus();
        return;
    }

    toggleListItem(list.id, addToListMovie);
    addToListInput.value = '';
    hideFormError(addToListError);
    renderAddToListRows();
});

addToListClose.addEventListener('click', () => addToListDialog.close());

// ---------- Botón del detalle ----------
let detailListMovie = null;

function updateDetailListButton() {
    if (!detailListMovie) return;

    const count = userLists.filter(list =>
        listHasItem(list, detailListMovie.id, detailListMovie.type)
    ).length;

    movieDetailListBtn.textContent = count
        ? `✓ En ${count} ${count === 1 ? 'lista' : 'listas'}`
        : '+ Añadir a lista';
}

function bindDetailListButton(movie) {
    detailListMovie = {
        id: movie.id,
        type: movie.type ?? getMediaType(),
        title: movie.title,
        poster_path: movie.poster_path
    };

    movieDetailListBtn.classList.remove('inactive');
    movieDetailListBtn.onclick = () => openAddToList(detailListMovie); // onclick evita acumular listeners
    updateDetailListButton();
}

// ---------- Sincronización ----------
window.addEventListener('lists:changed', () => {
    renderLibrary();
    updateDetailListButton();

    if (currentViewName === 'mylist' && activeListId) {
        renderListView();
    }
});

// Los favoritos también aparecen en la Biblioteca
window.addEventListener('favorites:changed', renderLibrary);

// Cambios hechos en otra pestaña
window.addEventListener('storage', event => {
    if (event.key !== LISTS_KEY) return;

    userLists = loadLists();
    window.dispatchEvent(new Event('lists:changed'));
});
