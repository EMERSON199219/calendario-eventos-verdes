const STORAGE_KEY = 'green-calendar-events-v1';
const USERS_KEY = 'green-calendar-users-v1';
const CURRENT_USER_KEY = 'green-calendar-current-user-v1';

const state = {
  currentDate: new Date(),
  selectedDate: new Date(),
  editingEventId: null,
  currentUser: loadCurrentUser(),
  authMode: 'login',
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
const authToggleBtn = document.getElementById('authToggle');
const authMessage = document.getElementById('authMessage');
const authStatus = document.getElementById('authStatus');
const userIndicator = document.getElementById('userIndicator');
const logoutBtn = document.getElementById('logoutBtn');
const appContent = document.getElementById('appContent');

function encodeEventsForUrl(events) {
  const json = JSON.stringify(events);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeEventsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('events');
  if (!encoded) return null;

  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('No se pudieron cargar los eventos desde la URL', error);
    return null;
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
}

function createUser(username, password) {
  const users = loadUsers();
  if (users[username]) return false;
  users[username] = { password, events: [] };
  saveUsers(users);
  return true;
}

function verifyUser(username, password) {
  const users = loadUsers();
  return users[username] && users[username].password === password;
}

function loadEvents() {
  if (state.currentUser) {
    return pruneDemoEvents(getUserEvents(state.currentUser));
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

function saveEvents() {
  if (state.currentUser) {
    setUserEvents(state.currentUser, state.events);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
    updateUrlWithEvents(state.events);
  }
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
  if (!state.events.length) {
    alert('No hay eventos para compartir todavía. Crea un evento primero.');
    return;
  }

  const url = window.location.href;
  navigator.clipboard.writeText(url)
    .then(() => {
      alert('Enlace compartido copiado al portapapeles.');
    })
    .catch((error) => {
      console.error('No se pudo copiar el enlace', error);
      alert('No se pudo copiar el enlace. Intenta copiarlo manualmente desde la barra de direcciones.');
    });
}

function setAuthMode(mode) {
  state.authMode = mode;
  authSubmitBtn.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
  authToggleBtn.textContent = mode === 'login' ? 'Crear cuenta' : 'Volver a iniciar sesión';
  authMessage.textContent = '';
}

function showAuthMessage(message, success = true) {
  authMessage.textContent = message;
  authMessage.style.color = success ? 'var(--green-800)' : '#b91c1c';
}

function updateAuthDisplay() {
  const isLoggedIn = Boolean(state.currentUser);
  authCard.classList.toggle('hidden', isLoggedIn);
  appContent.classList.toggle('hidden', !isLoggedIn);
  authStatus.classList.toggle('hidden', !isLoggedIn);
  if (isLoggedIn) {
    userIndicator.textContent = `Sesión: ${state.currentUser}`;
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!username || !password) {
    showAuthMessage('Completa usuario y contraseña.', false);
    return;
  }

  if (state.authMode === 'login') {
    if (!verifyUser(username, password)) {
      showAuthMessage('Usuario o contraseña incorrectos.', false);
      return;
    }
    state.currentUser = username;
    saveCurrentUser(username);
    state.events = loadEvents();
    showAuthMessage(`Bienvenido ${username}.`, true);
    updateAuthDisplay();
    resetForm();
    render();
  } else {
    if (!createUser(username, password)) {
      showAuthMessage('El usuario ya existe. Elige otro nombre.', false);
      return;
    }
    state.currentUser = username;
    saveCurrentUser(username);
    state.events = [];
    saveEvents();
    showAuthMessage(`Cuenta creada. Bienvenido ${username}.`, true);
    updateAuthDisplay();
    resetForm();
    render();
  }
}

function handleAuthToggle() {
  setAuthMode(state.authMode === 'login' ? 'register' : 'login');
}

function logout() {
  state.currentUser = null;
  saveCurrentUser(null);
  state.events = [];
  setAuthMode('login');
  updateAuthDisplay();
}

function bootstrap() {
  state.events = loadEvents();
  if (state.events.length) {
    const startingDate = getInitialEventDate(state.events);
    if (startingDate) {
      state.selectedDate = startingDate;
      state.currentDate = new Date(startingDate.getFullYear(), startingDate.getMonth(), 1);
    }
  }

  authForm.addEventListener('submit', handleAuthSubmit);
  authToggleBtn.addEventListener('click', handleAuthToggle);
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
  setAuthMode(state.authMode);
  render();
}

bootstrap();
