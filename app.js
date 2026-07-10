const STORAGE_KEY = 'green-calendar-events-v1';
const USERS_KEY = 'green-calendar-users-v1';
const CURRENT_USER_KEY = 'green-calendar-current-user-v1';

const DEFAULT_SUPERADMIN = {
  username: 'COMBO27',
  password: 'Combo2027@'
};

const state = {
  currentDate: new Date(),
  selectedDate: new Date(),
  editingEventId: null,
  currentUser: loadCurrentUser(),
  events: []
};

const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const eventList = document.getElementById('eventList');
const eventForm = document.getElementById('eventForm');
const eventIdInput = document.getElementById('eventId');
const titleInput = document.getElementById('title');
const dateInput = document.getElementById('eventDate');
const timeInput = document.getElementById('time');
const descriptionInput = document.getElementById('description');
const locationInput = document.getElementById('location');
const committeeInput = document.getElementById('committee');
const responsibleInput = document.getElementById('responsible');
const commitmentInput = document.getElementById('commitment');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const exportBtn = document.getElementById('exportBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const authCard = document.getElementById('authCard');
const authForm = document.getElementById('authForm');
const authUsernameInput = document.getElementById('authUsername');
const authPasswordInput = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmit');
const authMessage = document.getElementById('authMessage');
const authHelpText = document.getElementById('authHelpText');
const authStatus = document.getElementById('authStatus');
const userIndicator = document.getElementById('userIndicator');
const logoutBtn = document.getElementById('logoutBtn');
const appContent = document.getElementById('appContent');

function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(encoded) {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeEventsForUrl(events) {
  const json = JSON.stringify(events);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

function decodeEventsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('events');
  if (!encoded) return null;

  try {
    const bytes = base64UrlDecode(encoded);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('No se pudieron cargar los eventos desde la URL', error);
    return null;
  }
}

function encodeObjectForUrl(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

function decodeObjectFromUrl(encoded) {
  if (!encoded) return null;

  try {
    const bytes = base64UrlDecode(encoded);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (error) {
    console.error('No se pudieron cargar los datos desde la URL', error);
    return null;
  }
}

function decodeUsersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return decodeObjectFromUrl(params.get('users'));
}

function decodeSharedUserFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('sharedUser');
}

function loadSharedUsersIfNeeded() {
  const sharedUsers = decodeUsersFromUrl();
  const sharedUser = decodeSharedUserFromUrl();
  if (!sharedUsers) return;

  const existingUsers = loadUsers();
  const mergedUsers = { ...existingUsers, ...sharedUsers };
  saveUsers(mergedUsers);

  if (!state.currentUser && sharedUser && mergedUsers[sharedUser]) {
    state.currentUser = sharedUser;
    saveCurrentUser(sharedUser);
  }
}

function updateUrlWithEvents(events) {
  const params = new URLSearchParams(window.location.search);
  if (events.length) {
    params.set('events', encodeEventsForUrl(events));
  } else {
    params.delete('events');
  }

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', newUrl);
}

function pruneDemoEvents(events) {
  const demoTitles = ['Revisión de agenda', 'Campaña comunitaria'];
  const demoIds = ['demo-1', 'demo-2'];

  return (events || []).filter((event) => {
    const isDemo = demoIds.includes(event.id) || demoTitles.includes(event.title);
    return !isDemo;
  });
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function saveCurrentUser(username) {
  if (username) {
    localStorage.setItem(CURRENT_USER_KEY, username);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function getUserEvents(username) {
  const users = loadUsers();
  return users[username]?.events || [];
}

function setUserEvents(username, events) {
  const users = loadUsers();
  users[username] = users[username] || { password: '', events: [] };
  users[username].events = events;
  saveUsers(users);

  // Guardar en Firestore si está disponible
  if (db) {
    db.collection('users')
      .doc(username)
      .set(
        {
          events: events,
          lastUpdated: new Date()
        },
        { merge: true }
      )
      .catch((error) => console.error('Error al guardar en Firestore:', error));
  }
}

function hasSuperAdmin() {
  const users = loadUsers();
  if (Object.values(users).some((user) => user.isAdmin)) {
    return true;
  }
  return Boolean(DEFAULT_SUPERADMIN.username && DEFAULT_SUPERADMIN.password);
}

function isCurrentUserAdmin() {
  const users = loadUsers();
  if (state.currentUser && users[state.currentUser]?.isAdmin) {
    return true;
  }
  return state.currentUser === DEFAULT_SUPERADMIN.username;
}

function createUser(username, password, isAdmin = false) {
  const users = loadUsers();
  if (users[username]) return false;
  users[username] = { password, events: [], isAdmin };
  saveUsers(users);
  return true;
}

function verifyUser(username, password) {
  const users = loadUsers();
  const storedUser = users[username];

  if (storedUser) {
    return storedUser.password === password;
  }

  if (username === DEFAULT_SUPERADMIN.username && password === DEFAULT_SUPERADMIN.password) {
    users[username] = {
      password,
      events: [],
      isAdmin: true
    };
    saveUsers(users);
    return true;
  }

  return false;
}

function loadEvents() {
  if (state.currentUser) {
    const userEvents = getUserEvents(state.currentUser);
    if (userEvents.length) {
      return pruneDemoEvents(userEvents);
    }

    const sharedEvents = decodeEventsFromUrl();
    if (sharedEvents) {
      setUserEvents(state.currentUser, sharedEvents);
      return pruneDemoEvents(sharedEvents);
    }

    return [];
  }

  const sharedEvents = decodeEventsFromUrl();
  if (sharedEvents) {
    return pruneDemoEvents(sharedEvents);
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return pruneDemoEvents(parsed);
  } catch (error) {
    console.error('No se pudieron cargar los eventos', error);
    return [];
  }
}

function getInitialEventDate(events) {
  if (!events || !events.length) return null;
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return parseDateKey(sortedEvents[0].date);
}

function setSelectedDateFromEvents(events) {
  if (!events || !events.length) return;
  const startingDate = getInitialEventDate(events);
  if (!startingDate) return;
  state.selectedDate = startingDate;
  state.currentDate = new Date(startingDate.getFullYear(), startingDate.getMonth(), 1);
}

function saveEvents() {
  if (state.currentUser) {
    setUserEvents(state.currentUser, state.events);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
    updateUrlWithEvents(state.events);
  }
}

async function loadEventsFromFirestore(username) {
  if (!db) return null;

  try {
    const doc = await db.collection('users').doc(username).get();
    if (doc.exists) {
      return doc.data().events || [];
    }
  } catch (error) {
    console.error('Error al cargar eventos de Firestore:', error);
  }
  return null;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function render() {
  renderCalendar();
  renderSelectedDate();
  renderEvents();
  syncFormWithSelectedDate();
}

function renderCalendar() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const emptyBefore = firstDay.getDay();

  monthLabel.textContent = firstDay.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  calendarGrid.innerHTML = '';

  for (let i = 0; i < emptyBefore; i += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell is-empty';
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const button = document.createElement('button');
    const cellDate = new Date(year, month, day);
    const key = toDateKey(cellDate);
    const matchingEvents = state.events.filter((event) => event.date === key);

    button.type = 'button';
    button.className = 'day-cell';
    if (toDateKey(new Date()) === key) {
      button.classList.add('is-today');
    }
    if (toDateKey(state.selectedDate) === key) {
      button.classList.add('is-selected');
    }

    button.innerHTML = `
      <span class="day-number">${day}</span>
      ${matchingEvents.length ? `<span class="event-count">${matchingEvents.length}</span>` : ''}
    `;

    button.addEventListener('click', () => {
      state.selectedDate = cellDate;
      state.currentDate = new Date(year, month, 1);
      render();
    });

    calendarGrid.appendChild(button);
  }
}

function renderSelectedDate() {
  selectedDateLabel.textContent = formatDate(state.selectedDate);
}

function renderEvents() {
  const key = toDateKey(state.selectedDate);
  const selectedEvents = state.events
    .filter((event) => event.date === key)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!selectedEvents.length) {
    eventList.innerHTML = '<div class="empty-state">No hay eventos para este día. Crea uno desde el formulario.</div>';
    return;
  }

  eventList.innerHTML = '';

  selectedEvents.forEach((event) => {
    const card = document.createElement('article');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-top">
        <div>
          <h4 class="event-title">${event.title}</h4>
          <p class="event-meta">${event.time} · ${event.committee}</p>
        </div>
        <span class="panel-pill">${event.responsible}</span>
      </div>
      <p><strong>Lugar:</strong> ${event.location || 'Sin lugar definido'}</p>
      <p>${event.description || 'Sin descripción'}</p>
      <p><strong>Compromiso:</strong> ${event.commitment || 'Sin compromiso definido'}</p>
      <div class="event-actions">
        <button class="edit" type="button" data-edit="${event.id}">Reprogramar</button>
        <button class="delete" type="button" data-delete="${event.id}">Eliminar</button>
      </div>
    `;

    eventList.appendChild(card);
  });

  eventList.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => startEdit(button.getAttribute('data-edit')));
  });

  eventList.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteEvent(button.getAttribute('data-delete')));
  });
}

function syncFormWithSelectedDate() {
  if (!state.editingEventId) {
    dateInput.value = toDateKey(state.selectedDate);
  }
}

function resetForm() {
  eventForm.reset();
  eventIdInput.value = '';
  state.editingEventId = null;
  submitBtn.textContent = 'Crear evento';
  cancelEditBtn.classList.add('hidden');
  syncFormWithSelectedDate();
}

function startEdit(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;

  state.editingEventId = id;
  state.selectedDate = parseDateKey(event.date);
  state.currentDate = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);

  eventIdInput.value = event.id;
  titleInput.value = event.title;
  dateInput.value = event.date;
  timeInput.value = event.time;
  descriptionInput.value = event.description || '';
  locationInput.value = event.location || '';
  committeeInput.value = event.committee || '';
  responsibleInput.value = event.responsible || '';
  commitmentInput.value = event.commitment || '';

  submitBtn.textContent = 'Actualizar evento';
  cancelEditBtn.classList.remove('hidden');
  render();
}

function deleteEvent(id) {
  state.events = state.events.filter((event) => event.id !== id);
  saveEvents();
  if (state.editingEventId === id) {
    resetForm();
  }
  render();
}

function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
    description: descriptionInput.value.trim(),
    location: locationInput.value.trim(),
    committee: committeeInput.value.trim(),
    responsible: responsibleInput.value.trim(),
    commitment: commitmentInput.value.trim()
  };

  if (!payload.title || !payload.date || !payload.time || !payload.location || !payload.committee || !payload.responsible) {
    alert('Completa los campos obligatorios para guardar el evento.');
    return;
  }

  if (state.editingEventId) {
    state.events = state.events.map((item) => item.id === state.editingEventId ? { ...item, ...payload } : item);
  } else {
    state.events.push({
      id: `${Date.now()}`,
      ...payload
    });
  }

  saveEvents();
  resetForm();
  render();
}

function updateLogoImage() {
  const logo = document.querySelector('.hero-logo');
  if (logo) {
    logo.src = `logo.jpeg?cb=${Date.now()}`;
  }
}

function downloadExcelReport() {
  const rows = state.events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map((event) => ({
      Título: event.title,
      Fecha: event.date,
      Hora: event.time,
      Lugar: event.location || '',
      Descripción: event.description || '',
      Comité: event.committee || '',
      Responsable: event.responsible || '',
      Compromiso: event.commitment || ''
    }));

  const header = ['Título', 'Fecha', 'Hora', 'Lugar', 'Descripción', 'Comité', 'Responsable', 'Compromiso'];
  const body = rows.map((row) => header.map((key) => row[key]));
  const csvLines = [header, ...body]
    .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // Agregar BOM (Byte Order Mark) UTF-8 para que Excel interprete correctamente los acentos
  const BOM = '\ufeff';
  const csvContent = BOM + csvLines;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'eventos-calendario.xls';
  link.click();
  URL.revokeObjectURL(link.href);
}

function copySharedLink() {
  const url = new URL(window.location.href);

  if (state.events.length) {
    url.searchParams.set('events', encodeEventsForUrl(state.events));
  } else {
    url.searchParams.delete('events');
  }

  if (state.currentUser) {
    const users = loadUsers();
    const currentUserData = users[state.currentUser];
    if (currentUserData) {
      const sharedUsers = { [state.currentUser]: currentUserData };
      url.searchParams.set('users', encodeObjectForUrl(sharedUsers));
      url.searchParams.set('sharedUser', state.currentUser);
    }
  }

  if (!url.searchParams.has('events') && !url.searchParams.has('users')) {
    alert('No hay datos para compartir. Crea un evento o inicia sesión como administrador.');
    return;
  }

  navigator.clipboard.writeText(url.toString())
    .then(() => {
      alert('Enlace compartido copiado al portapapeles.');
    })
    .catch((error) => {
      console.error('No se pudo copiar el enlace', error);
      alert('No se pudo copiar el enlace. Intenta copiarlo manualmente desde la barra de direcciones.');
    });
}

function showAuthMessage(message, success = true) {
  authMessage.textContent = message;
  authMessage.style.color = success ? 'var(--green-800)' : '#b91c1c';
}

function updateAuthHelp() {
  if (!authHelpText) return;
  if (!hasSuperAdmin()) {
    authHelpText.textContent = 'Crea la primera cuenta para ser super admin. Luego podrás crear usuarios desde el panel.';
  } else {
    authHelpText.textContent = 'Inicia sesión con tu usuario. El super admin puede crear nuevas cuentas.';
  }
}

function updateAuthDisplay() {
  const isLoggedIn = Boolean(state.currentUser);
  const hasShared = !state.currentUser && Boolean(decodeEventsFromUrl());
  const isAdmin = isCurrentUserAdmin();

  authCard.classList.toggle('hidden', isLoggedIn);
  appContent.classList.toggle('hidden', !isLoggedIn && !hasShared);
  authStatus.classList.toggle('hidden', !isLoggedIn);

  if (isLoggedIn) {
    userIndicator.textContent = `Sesión: ${state.currentUser}${isAdmin ? ' (Super admin)' : ''}`;
  }

  updateAuthHelp();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!username || !password) {
    showAuthMessage('Completa usuario y contraseña.', false);
    return;
  }

  if (!hasSuperAdmin()) {
    const users = loadUsers();
    const existingUser = users[username];

    if (existingUser) {
      if (!verifyUser(username, password)) {
        showAuthMessage('Usuario o contraseña incorrectos.', false);
        return;
      }
      existingUser.isAdmin = true;
      saveUsers(users);
      state.currentUser = username;
      saveCurrentUser(username);
      const firestoreEvents = await loadEventsFromFirestore(username);
      state.events = firestoreEvents || getUserEvents(username);
      showAuthMessage(`Cuenta convertida en super admin. Bienvenido ${username}.`, true);
    } else {
      if (!createUser(username, password, true)) {
        showAuthMessage('No se pudo crear la cuenta de super admin.', false);
        return;
      }
      state.currentUser = username;
      saveCurrentUser(username);
      state.events = [];
      showAuthMessage(`Cuenta de super admin creada. Bienvenido ${username}.`, true);
    }
  } else {
    if (!verifyUser(username, password)) {
      showAuthMessage('Usuario o contraseña incorrectos.', false);
      return;
    }
    state.currentUser = username;
    saveCurrentUser(username);
    
    const firestoreEvents = await loadEventsFromFirestore(username);
    state.events = firestoreEvents || loadEvents();
    
    if (state.events.length) {
      setSelectedDateFromEvents(state.events);
    }
    showAuthMessage(`Bienvenido ${username}.`, true);
  }

  authForm.reset();
  updateAuthDisplay();
  resetForm();
  render();
}

function logout() {
  state.currentUser = null;
  saveCurrentUser(null);
  state.events = loadEvents();
  authForm.reset();
  updateAuthDisplay();
  render();
}

function bootstrap() {
  loadSharedUsersIfNeeded();
  state.events = loadEvents();
  if (state.events.length) {
    const startingDate = getInitialEventDate(state.events);
    if (startingDate) {
      state.selectedDate = startingDate;
      state.currentDate = new Date(startingDate.getFullYear(), startingDate.getMonth(), 1);
    }
  }

  authForm.addEventListener('submit', handleAuthSubmit);
  logoutBtn.addEventListener('click', logout);
  eventForm.addEventListener('submit', handleSubmit);
  cancelEditBtn.addEventListener('click', resetForm);
  exportBtn.addEventListener('click', downloadExcelReport);
  copyLinkBtn.addEventListener('click', copySharedLink);
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1, 1);
    render();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 1);
    render();
  });

  dateInput.addEventListener('change', () => {
    const selectedDate = parseDateKey(dateInput.value);
    state.selectedDate = selectedDate;
    state.currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    render();
  });

  updateLogoImage();
  updateAuthDisplay();
  render();
}

bootstrap();
