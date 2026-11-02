import { db } from "../firebase.js";
import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
let activeHousehold = null;
let stopEvents = null;
let stopTasks = null;
let memberCache = [];

const avatarEmoji = {
  padre1: "👨", madre1: "👩", nino1: "👦", nina1: "👧",
  abuelo1: "👴", abuela1: "👵", mascota1: "🐾"
};
const roleLabel = { padre: "Padre", madre: "Madre", hijo: "Hijo/a", invitado: "Invitado" };
const dayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function mondayKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = d.getDay() || 7;
  d.setDate(d.getDate() - weekday + 1);
  return localDateKey(d);
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.add("hidden"));
  $(screenId)?.classList.remove("hidden");
  document.querySelectorAll(".bottom-nav [data-screen]").forEach(btn => {
    btn.classList.toggle("nav-active", btn.dataset.screen === screenId);
  });
  document.getElementById("bottomMenuPanel")?.classList.remove("show");
  if (screenId === "workCalendarScreen" && window.workCalendar) {
    setTimeout(() => window.workCalendar.updateSize(), 80);
  }
}

document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open-screen]");
  if (opener) showScreen(opener.dataset.openScreen);
});

window.addEventListener("micasa:menu-updated", () => { if (activeHousehold) loadTodayMeals(); });
window.addEventListener("micasa:shopping-updated", () => { if (activeHousehold) loadShoppingSummary(activeHousehold); });
window.addEventListener("micasa:work-updated", () => { if (activeHousehold) loadTodayWork(activeHousehold); });
window.addEventListener("micasa:profiles-updated", async () => {
  if (!activeHousehold) return;
  await loadFamilyMembers(activeHousehold);
  await loadTodayWork(activeHousehold);
});

window.addEventListener("micasa:household-ready", (event) => {
  const householdId = event.detail?.householdId || window.currentHouseholdId;
  if (!householdId) return;
  activeHousehold = householdId;
  startDashboard(householdId).catch(err => console.error("No se pudo cargar Hoy en casa:", err));
});

async function startDashboard(householdId) {
  if (stopEvents) stopEvents();
  if (stopTasks) stopTasks();
  const now = new Date();
  $("hubDate").textContent = now.toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" });
  await loadFamilyMembers(householdId);
  await Promise.all([loadTodayMeals(), loadTodayWork(householdId), loadShoppingSummary(householdId)]);
  subscribeEvents(householdId);
  subscribeTasks(householdId);
}

async function loadFamilyMembers(householdId) {
  const householdSnap = await getDoc(doc(db, "households", householdId));
  const memberMap = householdSnap.exists() ? householdSnap.data().members || {} : {};
  const members = [];
  for (const uid of Object.keys(memberMap)) {
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) continue;
      members.push({ uid, ...userSnap.data() });
    } catch (err) { console.warn("No se pudo leer perfil", uid, err); }
  }
  memberCache = members;
  populateWorkMemberSelect(members);
  renderProfiles(members);
}


function populateWorkMemberSelect(members) {
  const select = $("workMemberSelect");
  if (!select) return;
  const previous = select.value || window.selectedWorkMember || "";
  select.replaceChildren(new Option("Seleccionar miembro", ""));
  members.forEach(member => {
    const option = new Option(member.name || member.displayName || "Miembro", member.uid);
    select.add(option);
  });
  const stillExists = members.some(member => member.uid === previous);
  if (stillExists) {
    select.value = previous;
    window.selectedWorkMember = previous;
    if (typeof window.loadWorkDaysForMember === "function") {
      window.loadWorkDaysForMember(previous).catch(err => console.warn("No se pudieron restaurar los turnos:", err));
    }
  } else {
    select.value = "";
    window.selectedWorkMember = null;
  }
  select.disabled = members.length === 0;
  select.setAttribute("aria-label", "Seleccionar miembro de la familia para consultar su calendario laboral");
}

function renderProfiles(members) {
  const compact = $("dashboardFamilyProfiles");
  const full = $("familyProfilesGrid");
  if (!members.length) {
    if (compact) compact.innerHTML = '<p class="hub-empty">Aún no hay miembros para mostrar.</p>';
    if (full) full.innerHTML = '<p class="hub-empty">Invita a tu familia para empezar.</p>';
    return;
  }
  const markup = members.map(member => {
    const name = escapeHTML(member.name || "Miembro");
    const role = escapeHTML(roleLabel[member.role] || "Familia");
    const avatar = avatarEmoji[member.avatar] || "🙂";
    return `<button class="family-profile-chip" data-profile-uid="${escapeHTML(member.uid)}"><span class="profile-avatar">${avatar}</span><span class="profile-chip-copy"><strong>${name}</strong><small>${role}</small></span><span class="profile-chevron">›</span></button>`;
  }).join("");
  if (compact) compact.innerHTML = markup;
  if (full) full.innerHTML = members.map(member => {
    const name = escapeHTML(member.name || "Miembro");
    const role = escapeHTML(roleLabel[member.role] || "Familia");
    const avatar = avatarEmoji[member.avatar] || "🙂";
    return `<button class="family-profile-card" data-profile-uid="${escapeHTML(member.uid)}"><span class="family-profile-avatar">${avatar}</span><span class="family-profile-name">${name}</span><span class="family-profile-role">${role}</span><span class="family-profile-open">Ver perfil <b>→</b></span></button>`;
  }).join("");
}

document.addEventListener("click", (event) => {
  const profile = event.target.closest("[data-profile-uid]");
  if (profile) window.openFamilyProfile?.(profile.dataset.profileUid);
});

async function loadTodayMeals(householdId = activeHousehold) {
  const target = $("todayMeals");
  if (!target) return;

  if (!householdId) {
    target.innerHTML = '<p class="hub-empty">No hay un hogar activo.</p>';
    return;
  }

  const requestedHousehold = householdId;
  const date = new Date();
  const key = dayKey[date.getDay()];

  try {
    const weekId = mondayKey(date);

    // Leer exclusivamente el menú de la familia activa
    const menuRef = doc(
      db,
      "households",
      requestedHousehold,
      "menus",
      weekId
    );

    const menuSnap = await getDoc(menuRef);

    // Evitar mostrar datos de otra familia
    if (requestedHousehold !== activeHousehold) return;

    const menu = menuSnap.exists()
      ? (menuSnap.data()[key] || {})
      : {};

    const lunch = menu.lunch || "Sin comida planificada";
    const dinner = menu.dinner || "Sin cena planificada";

    const foodIcon = (name, type) => {
      const t = String(name).toLocaleLowerCase("es-ES");

if (/sin .*planificad/.test(t)) return type === "lunch" ? "🍽️" : "🌙";
      if (/ensalada|gazpacho|salmorejo|verdura|espinaca|tomate|aguacate/.test(t)) return "🥗";
      if (/pasta|espagueti|macarr|lasaña|fideo/.test(t)) return "🍝";
      if (/arroz|paella|risotto/.test(t)) return "🍚";
      if (/pollo|pavo|alitas|nugget/.test(t)) return "🍗";
      if (/ternera|cerdo|carne|alb[oó]ndiga|hamburguesa|chorizo/.test(t)) return "🥩";
      if (/pescado|merluza|salm[oó]n|bacalao|at[uú]n|gamba|marisco|pulpo|lubina|dorada/.test(t)) return "🐟";
      if (/lenteja|garbanzo|jud[ií]a|potaje|cocido/.test(t)) return "🥘";
      if (/pizza|empanada|tarta salada/.test(t)) return "🍕";
      if (/tortilla|huevo|revuelto|omelet/.test(t)) return "🍳";
      if (/sopa|crema|pur[eé]/.test(t)) return "🥣";
      if (/bocadillo|s[aá]ndwich|tosta|tostada/.test(t)) return "🥪";
      if (/fruta|yogur|postre|bizcocho|flan/.test(t)) return "🍓";
      return type === "lunch" ? "🍲" : "🥙";
    };

    target.innerHTML = `
      <div class="hub-meal-row">
        <span>${foodIcon(lunch, "lunch")}</span>
        <div>
          <small>COMIDA</small>
          <strong>${escapeHTML(lunch)}</strong>
        </div>
      </div>

      <div class="hub-meal-row">
        <span>${foodIcon(dinner, "dinner")}</span>
        <div>
          <small>CENA</small>
          <strong>${escapeHTML(dinner)}</strong>
        </div>
      </div>
    `;

  } catch (err) {
    console.error("Error cargando menú:", err);

    if (requestedHousehold === activeHousehold) {
      target.innerHTML =
        '<p class="hub-empty">No se ha podido cargar el menú de hoy.</p>';
    }
  }
}

async function loadTodayWork(householdId) {
  const target = $("todayFamilyWork");
  if (!target) return;
  const dateKey = localDateKey();
  if (!memberCache.length) {
    target.innerHTML = '<p class="hub-empty">No hay perfiles familiares.</p>';
    return;
  }
  const rows = await Promise.all(memberCache.map(async member => {
    try {
      const daySnap = await getDoc(doc(db, "households", householdId, "workSchedules", member.uid, "days", dateKey));
      const shifts = daySnap.exists() ? daySnap.data().shifts || [] : [];
      return { member, shifts };
    } catch (err) { return { member, shifts: [], error: true }; }
  }));
  target.innerHTML = rows.map(({member, shifts, error}) => {
    const name = escapeHTML(member.name || "Miembro");
    const label = error ? "No disponible" : shifts.length ? shifts.map(s => escapeHTML(s.name || "Turno")).join(" + ") : "Sin turno registrado";
    const times = shifts.map(s => s.start && s.end ? `${escapeHTML(s.start)}–${escapeHTML(s.end)}` : "").filter(Boolean).join(" · ");
    return `<div class="hub-work-row"><span class="hub-work-avatar">${avatarEmoji[member.avatar] || "🙂"}</span><div><strong>${name}</strong><small>${label}${times ? ` · ${times}` : ""}</small></div><i class="${shifts.length ? "is-working" : "is-free"}"></i></div>`;
  }).join("");
}

async function loadShoppingSummary(householdId) {
  const target = $("dashboardShoppingSummary");
  if (!target) return;
  try {
    const listsSnap = await getDocs(query(collection(db, "shoppingLists"), where("householdId", "==", householdId)));
    let pending = 0;
    for (const listDoc of listsSnap.docs) {
      const products = await getDocs(collection(db, "shoppingLists", listDoc.id, "products"));
      products.forEach(product => { if (!product.data().completed) pending++; });
    }
    target.innerHTML = `<strong>${pending}</strong><span>${pending === 1 ? "producto pendiente" : "productos pendientes"}</span>`;
  } catch (err) {
    target.innerHTML = '<strong>—</strong><span>sin datos disponibles</span>';
  }
}

function subscribeEvents(householdId) {
  const target = $("homeTodayEvents");
  const weekTarget = $("homeWeekEvents");
  if (!target || !weekTarget) return;
  const today = localDateKey();
  const start = new Date(); start.setHours(0,0,0,0);
  const weekEnd = new Date(start); weekEnd.setDate(start.getDate() + (7 - (start.getDay() || 7)));
  const endKey = localDateKey(weekEnd);
  stopEvents = onSnapshot(collection(db, "households", householdId, "events"), snapshot => {
    const events = snapshot.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => `${a.date} ${a.time||""}`.localeCompare(`${b.date} ${b.time||""}`));
    const todayEvents = events.filter(e => e.date === today);
    const weekEvents = events.filter(e => e.date > today && e.date <= endKey);
    target.innerHTML = todayEvents.length ? todayEvents.map(e => `<li class="dashboard-event-item">${escapeHTML(e.time || "")} · ${escapeHTML(e.shortTitle || e.description || "Evento")}</li>`).join("") : '<li class="hub-empty">No hay eventos para hoy.</li>';
    weekTarget.innerHTML = weekEvents.length ? weekEvents.map(e => `<li>${escapeHTML(e.date)} · ${escapeHTML(e.shortTitle || e.description || "Evento")}</li>`).join("") : '<li class="hub-empty">No hay más eventos esta semana.</li>';
  });
}

function subscribeTasks(householdId) {
  const target = $("homeTasks");
  if (!target) return;
  stopTasks = onSnapshot(collection(db, "households", householdId, "tasks"), snapshot => {
    const tasks = snapshot.docs.map(d => d.data()).filter(task => !task.completed);
    target.innerHTML = tasks.length ? tasks.slice(0,5).map(task => `<li>${escapeHTML(task.title || "Tarea pendiente")}</li>`).join("") : '<li class="hub-empty">Todo al día. ¡Buen trabajo!</li>';
  });
}
