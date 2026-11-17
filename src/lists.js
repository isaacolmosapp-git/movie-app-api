// ---------- Almacenamiento y datos de listas ----------
const LISTS_KEY = 'user_lists';
const LIST_NAME_MAX = 40;

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
    return id.replace(/[^a-z0-9-]/gi, '');
}

function getList(id) {
    return userLists.find(list => list.id === id);
}

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
    userLists = [list, ...userLists];
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

// ---------- Diálogos y utilidades ----------
function showFormError(element, text) {
    element.textContent = text;
    element.classList.remove('inactive');
}

function hideFormError(element) {
    element.textContent = '';
    element.classList.add('inactive');
}

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

// ---------- Vista de biblioteca ----------
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
    title.textContent = name;

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

// ---------- Diálogo de creación y edición ----------
let listFormMode = null;

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

// ---------- Vista de lista individual ----------
let activeListId = null;

function addRemoveFromListButton(card, movie) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('card-remove-btn');
    btn.textContent = '✕';
    btn.setAttribute('aria-label', `Quitar "${movie.title}" de la lista`);

    btn.addEventListener('click', event => {
        event.stopPropagation();
        removeListItem(activeListId, movie.id, movie.type ?? 'movie');
    });

    card.appendChild(btn);
}

function renderListView() {
    const list = getList(activeListId);

    if (!list) {
        location.hash = '#library';
        return;
    }

    setHeaderTitle(list.name);
    listToolbarCount.textContent = countLabel(list.items.length);

    if (list.items.length === 0) {
        showGenericMessage('Esta lista está vacía. Abre una película y pulsa "Añadir a lista".');
        return;
    }

    cancelPaginatedList();
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
    activeListId = null;
    deleteList(id);
    location.hash = '#library';
});

// ---------- Diálogo añadir a lista ----------
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
    row.querySelector('.addToList-name').textContent = list.name;

    updateListRow(row, list);

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

// ---------- Botón de detalle ----------
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
    movieDetailListBtn.onclick = () => openAddToList(detailListMovie);
    updateDetailListButton();
}

// ---------- Sincronización y eventos ----------
window.addEventListener('lists:changed', () => {
    renderLibrary();
    updateDetailListButton();

    if (currentViewName === 'mylist' && activeListId) {
        renderListView();
    }
});

window.addEventListener('favorites:changed', renderLibrary);

window.addEventListener('storage', event => {
    if (event.key !== LISTS_KEY) return;

    userLists = loadLists();
    window.dispatchEvent(new Event('lists:changed'));
});
