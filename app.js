const STORAGE_KEY = 'move-daily-activities';
const GOALS = { steps: 8000, calories: 500, minutes: 30 };
const numberFormat = new Intl.NumberFormat();
const today = localDateKey(new Date());
let activities = loadActivities();

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadActivities() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(item => item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.date === 'string')
      .map(item => ({ id: item.id, type: item.type, date: item.date, duration: safeNumber(item.duration), steps: safeNumber(item.steps), calories: safeNumber(item.calories) }));
  } catch {
    return [];
  }
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function saveActivities() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activities)); } catch {}
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

function setMetric(valueId, fillId, noteId, value, goal, unit) {
  document.querySelector(`#${valueId}`).textContent = numberFormat.format(value);
  const percent = Math.min(100, Math.round((value / goal) * 100));
  document.querySelector(`#${fillId}`).style.width = `${percent}%`;
  document.querySelector(`#${noteId}`).textContent = `${percent}% of ${numberFormat.format(goal)} ${unit} goal`;
}

function iconFor(type) {
  if (type === 'Run') return '<svg viewBox="0 0 24 24"><circle cx="15" cy="5" r="2"/><path d="m12 22 2-6-4-3 2-5 4 3 4 1m-10 4-4 6m6-10-4 1-3 4"/></svg>';
  if (type === 'Cycling') return '<svg viewBox="0 0 24 24"><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/><path d="m6 17 4-8 4 8H6m4-8h4m0 0 2-3h3"/></svg>';
  if (type === 'Workout') return '<svg viewBox="0 0 24 24"><path d="M6.5 6.5h11m-11 11h11M4 9v6m16-6v6M2 10v4m20-4v4M6.5 4v4m11-4v4m-11 8v4m11-4v4"/></svg>';
  return '<svg viewBox="0 0 24 24"><path d="M7 20c1-3 0-5-1-7-1-2-1-4 1-5 2-1 4 1 5 4l2 5c1 2 2 3 4 3"/><path d="M8 9 6 6m6 5 2-3"/></svg>';
}

function renderActivity(item, showDelete = true) {
  const row = document.createElement('article');
  row.className = 'activity-row';
  const icon = document.createElement('span');
  icon.className = 'row-icon';
  icon.innerHTML = iconFor(item.type);
  const info = document.createElement('div');
  info.className = 'activity-info';
  const title = document.createElement('strong');
  title.textContent = item.type;
  const details = document.createElement('span');
  details.textContent = `${formatDate(item.date)} · ${item.duration} min · ${numberFormat.format(item.steps)} steps`;
  info.append(title, details);
  const stats = document.createElement('div');
  stats.className = 'activity-stats';
  const calories = document.createElement('strong');
  calories.textContent = `${numberFormat.format(item.calories)} kcal`;
  const caption = document.createElement('span');
  caption.textContent = 'burned';
  stats.append(calories, caption);
  row.append(icon, info, stats);
  if (showDelete) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-activity';
    remove.setAttribute('aria-label', `Delete ${item.type} activity`);
    remove.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/></svg>';
    remove.addEventListener('click', () => deleteActivity(item.id));
    row.appendChild(remove);
  }
  return row;
}

function formatDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (dateKey === today) return 'Today';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function renderWeek() {
  const days = [];
  const start = new Date();
  start.setDate(start.getDate() - 6);
  for (let index = 0; index < 7; index++) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    const steps = sum(activities.filter(item => item.date === key), 'steps');
    days.push({ key, date, steps });
  }
  const maxSteps = Math.max(GOALS.steps, ...days.map(day => day.steps));
  const chart = document.querySelector('#weeklyChart');
  chart.replaceChildren();
  days.forEach(day => {
    const column = document.createElement('div');
    column.className = 'day';
    column.setAttribute('aria-label', `${formatDate(day.key)}: ${numberFormat.format(day.steps)} steps`);
    const slot = document.createElement('div');
    slot.className = 'bar-slot';
    const bar = document.createElement('div');
    bar.className = `bar${day.key === today ? ' today' : ''}`;
    bar.style.height = `${Math.max(4, Math.round((day.steps / maxSteps) * 88))}px`;
    slot.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'day-label';
    label.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day.date);
    column.append(slot, label);
    chart.appendChild(column);
  });
  const weeklySteps = sum(days, 'steps');
  document.querySelector('#weekTotal').textContent = `${numberFormat.format(weeklySteps)} steps`;
  const activeDays = days.filter(day => day.steps > 0).length;
  document.querySelector('#weekSummary').textContent = activeDays ? `${activeDays} active ${activeDays === 1 ? 'day' : 'days'} this week · ${numberFormat.format(weeklySteps)} total steps` : 'Log activity to see your weekly progress.';
}

function render() {
  const todayActivities = activities.filter(item => item.date === today);
  const steps = sum(todayActivities, 'steps');
  const calories = sum(todayActivities, 'calories');
  const minutes = sum(todayActivities, 'duration');
  const currentHour = new Date().getHours();
  document.querySelector('#greetingLabel').textContent = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  document.querySelector('#activityCount').textContent = `${todayActivities.length} ${todayActivities.length === 1 ? 'activity' : 'activities'}`;
  document.querySelector('#sessionsValue').textContent = numberFormat.format(todayActivities.length);
  setMetric('stepsValue', 'stepsProgress', 'stepsNote', steps, GOALS.steps, 'steps');
  setMetric('caloriesValue', 'caloriesProgress', 'caloriesNote', calories, GOALS.calories, 'kcal');
  setMetric('minutesValue', 'minutesProgress', 'minutesNote', minutes, GOALS.minutes, 'min');
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const recentList = document.querySelector('#recentList');
  recentList.replaceChildren();
  const recent = sorted.slice(0, 3);
  document.querySelector('#recentCount').textContent = recent.length ? 'Latest' : '';
  if (recent.length) recent.forEach(item => recentList.appendChild(renderActivity(item)));
  else recentList.innerHTML = '<p class="empty">No activity logged today. Add a walk, workout, or any movement to start tracking.</p>';
  const allList = document.querySelector('#allList');
  allList.replaceChildren();
  sorted.forEach(item => allList.appendChild(renderActivity(item)));
  document.querySelector('#allCount').textContent = `${sorted.length} total`;
  document.querySelector('#allEmpty').hidden = sorted.length > 0;
  renderWeek();
}

function openForm() {
  document.querySelector('#dateInput').value = today;
  document.querySelector('#formError').textContent = '';
  document.querySelector('#backdrop').classList.add('open');
  document.querySelector('#entrySheet').classList.add('open');
  document.querySelector('#typeInput').focus();
}

function closeForm() {
  document.querySelector('#backdrop').classList.remove('open');
  document.querySelector('#entrySheet').classList.remove('open');
}

function deleteActivity(id) {
  activities = activities.filter(item => item.id !== id);
  saveActivities();
  render();
}

document.querySelectorAll('[data-open-form]').forEach(button => button.addEventListener('click', openForm));
document.querySelectorAll('.nav[data-view]').forEach(button => button.addEventListener('click', () => {
  const view = button.dataset.view;
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `${view}View`));
  document.querySelectorAll('.nav[data-view]').forEach(nav => {
    nav.classList.toggle('active', nav === button);
    if (nav === button) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
  });
}));
document.querySelector('#closeSheet').addEventListener('click', closeForm);
document.querySelector('#cancelForm').addEventListener('click', closeForm);
document.querySelector('#backdrop').addEventListener('click', closeForm);
document.querySelector('#activityForm').addEventListener('submit', event => {
  event.preventDefault();
  const duration = safeNumber(document.querySelector('#durationInput').value);
  const steps = safeNumber(document.querySelector('#stepsInput').value);
  const calories = safeNumber(document.querySelector('#caloriesInput').value);
  const date = document.querySelector('#dateInput').value;
  const error = document.querySelector('#formError');
  if (!date) { error.textContent = 'Choose a date for this activity.'; return; }
  if (!duration && !steps && !calories) { error.textContent = 'Enter at least one value: duration, steps, or calories.'; return; }
  const activity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: document.querySelector('#typeInput').value, date, duration, steps, calories };
  activities.push(activity);
  saveActivities();
  document.querySelector('#activityForm').reset();
  closeForm();
  render();
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === 'overviewView'));
  document.querySelectorAll('.nav[data-view]').forEach(nav => {
    const active = nav.dataset.view === 'overview';
    nav.classList.toggle('active', active);
    if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
  });
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeForm(); });

document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
render();
