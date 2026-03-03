// ======================================================
//  AUTH + NAVEGACIÓN + AGENDA + CALENDARIO + COMPRAS + NOTAS
// ======================================================

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  deleteField,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import 
{ sendPasswordResetEmail 

} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const resetModal = document.getElementById("resetModal");
const resetEmail = document.getElementById("resetEmail");
const sendResetBtn = document.getElementById("sendResetBtn");
const closeResetModal = document.getElementById("closeResetModal");

// Abrir modal
forgotPasswordLink.addEventListener("click", () => {
  resetModal.classList.remove("hidden");
});

// Cerrar modal
closeResetModal.addEventListener("click", () => {
  resetModal.classList.add("hidden");
});

// Enviar email de reseteo
sendResetBtn.addEventListener("click", async () => {
  const email = resetEmail.value.trim();

  if (!email) {
    alert("Introduce tu correo.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Se ha enviado un enlace para restablecer tu contraseña.");
    resetModal.classList.add("hidden");
    resetEmail.value = "";
  } catch (err) {
    alert("Error: " + err.message);
  }
});


document.addEventListener("DOMContentLoaded", () => {

  // ===============================
// AVATARES SVG (SIN IMÁGENES)
// ===============================
const AVATARS = {
padre1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="8" r="4" fill="#8E9AAF"/>
  <rect x="6" y="13" width="12" height="8" rx="4" fill="#4C5C68"/>
</svg>
`,

madre1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="8" r="4" fill="#F4A9C4"/>
  <rect x="6" y="13" width="12" height="8" rx="4" fill="#C06C84"/>
</svg>
`,

nino1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="8" r="3.5" fill="#F2DDA4"/>
  <rect x="7" y="13" width="10" height="7" rx="3.5" fill="#81B29A"/>
</svg>
`,

nina1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="8" r="3.5" fill="#F7C5A8"/>
  <rect x="7" y="13" width="10" height="7" rx="3.5" fill="#E9C46A"/>
</svg>
`,

abuelo1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="8" r="4" fill="#D3D3D3"/>
  <rect x="6" y="13" width="12" height="8" rx="4" fill="#6C757D"/>
</svg>
`,

abuela1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="8" r="4" fill="#E8D4C8"/>
  <rect x="6" y="13" width="12" height="8" rx="4" fill="#9A8C98"/>
</svg>
`,

mascota1: `
<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="10" r="4" fill="#A47148"/>
  <circle cx="10" cy="8" r="1" fill="#5C3D2E"/>
  <circle cx="14" cy="8" r="1" fill="#5C3D2E"/>
  <rect x="8" y="14" width="8" height="5" rx="2.5" fill="#8D6E63"/>
</svg>
`,

};


  let currentHouseholdId = null;
  let currentUserNameValue = "";
  let unsubscribeTasks = null;


  // ======================================================
  //  ELEMENTOS DOM
  // ======================================================
  const authScreen = document.getElementById("authScreen");
  const loginBox = document.getElementById("loginBox");
  const registerForm = document.getElementById("registerForm");
  const joinForm = document.getElementById("joinForm");
  const app = document.getElementById("app");
  const appHeader = document.getElementById("appHeader");

  const homeName = document.getElementById("homeName");
  const currentUserName = document.getElementById("currentUserName");
 

  // LOGIN
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // REGISTRO
  const nameInput = document.getElementById("name");
  const regEmailInput = document.getElementById("regEmail");
  const regPasswordInput = document.getElementById("regPassword");
  const registerBtn = document.getElementById("registerBtn");

  // UNIRSE
  const joinNameInput = document.getElementById("joinName");
  const joinEmailInput = document.getElementById("joinEmail");
  const joinPasswordInput = document.getElementById("joinPassword");
  const inviteCodeInput = document.getElementById("inviteCode");
  const joinHouseholdBtn = document.getElementById("joinHouseholdBtn");

  // INVITACIONES
  const inviteBtnInside = document.getElementById("inviteBtnInside");

  const inviteModal = document.getElementById("inviteModal");
  const inviteCodeBox = document.getElementById("inviteCodeBox");
  const closeInviteModal = document.getElementById("closeInviteModal");

  // BOTONES DE FORMULARIOS (FALTABAN)
  const showRegisterBtn = document.getElementById("showRegisterBtn");
  const showJoinBtn = document.getElementById("showJoinBtn");
  const backFromRegister = document.getElementById("backFromRegister");
  const backFromJoin = document.getElementById("backFromJoin");

     const avatarSelect = document.getElementById("profileAvatar");
const avatarPreview = document.getElementById("profileAvatarPreview");

avatarSelect.addEventListener("change", (e) => {
  avatarPreview.src = `img/avatars/${e.target.value}.png`;
});

  // PANTALLAS
  const screens = {
    home: document.getElementById("homeScreen"),
    agenda: document.getElementById("agendaScreen"),
    calendar: document.getElementById("calendarScreen"),
    compra: document.getElementById("compraScreen"),
    notes: document.getElementById("notesScreen"),
  };

// ===============================
// RENOMBRAR HOGAR (VERSIÓN FINAL)
// ===============================

const renameModal = document.getElementById("renameModal");
const newHouseNameInput = document.getElementById("newHouseName");
const saveHouseNameBtn = document.getElementById("saveHouseNameBtn");
const closeRenameModal = document.getElementById("closeRenameModal");
const houseNameText = document.getElementById("houseNameText");

// Abrir modal al pulsar el nombre del hogar
homeName.addEventListener("click", async () => {
  const snap = await getDoc(doc(db, "households", currentHouseholdId));

  // Solo el dueño puede renombrar
  if (snap.data().owner !== auth.currentUser.uid) {
    alert("Solo el creador del hogar puede cambiar el nombre.");
    return;
  }

  renameModal.classList.remove("hidden");
});

// Guardar nuevo nombre
saveHouseNameBtn.addEventListener("click", async () => {
  const newName = newHouseNameInput.value.trim();
  if (!newName) return alert("Introduce un nombre válido.");

  await updateDoc(doc(db, "households", currentHouseholdId), {
    name: newName
  });

  houseNameText.textContent = newName;
  renameModal.classList.add("hidden");
  newHouseNameInput.value = "";
});

// Cerrar modal
closeRenameModal.addEventListener("click", () => {
  renameModal.classList.add("hidden");
});


const futureHeader = document.getElementById("futureEventsHeader");
const futureList = document.getElementById("futureEventsList");
const futureArrow = document.getElementById("futureEventsArrow");

futureHeader.addEventListener("click", () => {
  futureList.classList.toggle("hidden");
  futureArrow.style.transform = futureList.classList.contains("hidden")
    ? "rotate(0deg)"
    : "rotate(180deg)";
});


// ===============================
// ===============================
function updateWelcomeBlock() {
  const welcomeText = document.getElementById("welcomeText");
  const dateTime = document.getElementById("dateTime");
  const welcomeIcon = document.getElementById("welcomeIcon");

  const now = new Date();
  const hour = now.getHours();

  let saludo = "Hola";
  let icono = "☀️";

  if (hour >= 6 && hour < 12) {
    saludo = "Buenos días";
    icono = "🌅";
  } else if (hour >= 12 && hour < 20) {
    saludo = "Buenas tardes";
    icono = "☀️";
  } else {
    saludo = "Buenas noches";
    icono = "🌙";
  }

  const fecha = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const hora = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  welcomeText.textContent = `${saludo}, ${currentUserNameValue}`;
  dateTime.textContent = `${fecha} — ${hora}`;
  welcomeIcon.textContent = icono;
}

setInterval(updateWelcomeBlock, 1000);
updateWelcomeBlock();



  // ======================================================
  //  NAVEGACIÓN ENTRE PANTALLAS
  // ======================================================

document.querySelectorAll(".home-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-screen");

    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");

    updateBottomNavActive(target);

    if (target === "calendarScreen" && calendar) {
      setTimeout(() => calendar.updateSize(), 50);
    }
  });
});

// ======================================================
//  ACTUALIZAR BARRA INFERIOR ACTIVA
// ======================================================

function updateBottomNavActive(screenId) {

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("nav-active");
  });

  const activeBtn = document.querySelector(
    `.nav-btn[data-screen="${screenId}"]`
  );

  if (activeBtn) {
    activeBtn.classList.add("nav-active");
  }
}

  document.querySelectorAll(".backHome").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
      screens.home.classList.remove("hidden");
    });
  });

  // ======================================================
  //  FORMULARIOS AUTH (CORREGIDO)
  // ======================================================

  showRegisterBtn.addEventListener("click", () => {
    loginBox.classList.add("hidden");
    registerForm.classList.remove("hidden");
    joinForm.classList.add("hidden");
  });

  showJoinBtn.addEventListener("click", () => {
    loginBox.classList.add("hidden");
    registerForm.classList.add("hidden");
    joinForm.classList.remove("hidden");
  });

  backFromRegister.addEventListener("click", () => {
    registerForm.classList.add("hidden");
    joinForm.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });

  backFromJoin.addEventListener("click", () => {
    joinForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });

  // ======================================================
  //  VISIBILIDAD
  // ======================================================
  function showLogin() {
    authScreen.classList.remove("hidden");
    loginBox.classList.remove("hidden");
    registerForm.classList.add("hidden");
    joinForm.classList.add("hidden");
    app.classList.add("hidden");
    appHeader.classList.add("hidden");
  }

 function showApp() {
  authScreen.classList.add("hidden");
  app.classList.remove("hidden");
  appHeader.classList.remove("hidden");

  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  screens.home.classList.remove("hidden");
}


  // ======================================================
  //  LOGIN
  // ======================================================
  loginBtn.addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (err) {
      alert(err.message);
    }
  });

  logoutBtn.addEventListener("click", () => signOut(auth));

  // ======================================================
  //  REGISTRO
  // ======================================================
  registerBtn.addEventListener("click", async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmailInput.value, regPasswordInput.value);
      const uid = cred.user.uid;

      await setDoc(doc(db, "users", uid), {
        name: nameInput.value,
        email: regEmailInput.value,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "households", uid), {
        name: "Mi Casa",
        owner: uid,
        members: { [uid]: true },
        createdAt: serverTimestamp()
      });

      alert("Usuario y hogar creados");
      showLogin();
    } catch (err) {
      alert(err.message);
    }
  });

  // ======================================================
  //  UNIRSE CON CÓDIGO
  // ======================================================
  joinHouseholdBtn.addEventListener("click", async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, joinEmailInput.value, joinPasswordInput.value);
      const uid = cred.user.uid;

      const code = inviteCodeInput.value.toUpperCase();
      const snap = await getDoc(doc(db, "invitations", code));

      if (!snap.exists()) {
        alert("Código inválido");
        return;
      }

      const householdId = snap.data().householdId;

      await setDoc(doc(db, "users", uid), {
        name: joinNameInput.value,
        email: joinEmailInput.value,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "households", householdId), {
        [`members.${uid}`]: true
      });

      alert("Te has unido al hogar");
      showLogin();
    } catch (err) {
      alert(err.message);
    }
  });

  // ======================================================
  //  CAMBIO DE USUARIO
  // ======================================================
  onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLogin();
    return;
  }

  // 1. Mostrar app
  showApp();

  // 2. Cargar datos del usuario
  const userDoc = await getDoc(doc(db, "users", user.uid));
  currentUserNameValue = userDoc.data().name;

  // 3. Buscar hogar del usuario
  const q = query(
    collection(db, "households"),
    where(`members.${user.uid}`, "==", true)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    // Crear hogar si no existe
    await setDoc(doc(db, "households", user.uid), {
      name: "Mi Casa",
      owner: user.uid,
      members: { [user.uid]: true },
      createdAt: serverTimestamp()
    });

    currentHouseholdId = user.uid;
    homeName.textContent = "Mi Casa";
  } else {
    currentHouseholdId = snap.docs[0].id;
    homeName.textContent = snap.docs[0].data().name;
  }

  // 4. Esperar a que el DOM actualice visibilidad
  setTimeout(() => {
    loadMembers();
    loadAgendaEvents();
    loadCalendarEventsForMonth(new Date());
    loadShoppingLists();
    loadTasks();
    loadHomeDashboardRealtime();
  }, 50);
});



  // ======================================================
  //  MIEMBROS
  // ======================================================
async function loadMembers() {
  const snap = await getDoc(doc(db, "households", currentHouseholdId));
  const familyList = document.getElementById("familyMembersList");
  familyList.innerHTML = "";

  for (const uid in snap.data().members) {
    const u = await getDoc(doc(db, "users", uid));
    const data = u.data();

    const name = data.name;
    const avatar = data.avatar || "padre1";

    const item = document.createElement("div");
    item.classList.add("family-member");

    item.innerHTML = `
      <div class="family-avatar">${AVATARS[avatar]}</div>
      <span>${name}</span>
    `;

    familyList.appendChild(item);

    item.addEventListener("click", () => openProfile(uid));
  }
}


document.getElementById("familyMenuBtn").addEventListener("click", () => {
  document.getElementById("familyMenu").classList.toggle("hidden");
});

// ======================================================
// ======================================================
// ======================================================
//  MENÚ DESPLEGABLE DE LA BARRA
// ======================================================

const menuNav = document.getElementById("menuNav");
const bottomMenuPanel = document.getElementById("bottomMenuPanel");

if (menuNav && bottomMenuPanel) {

  // 🔥 Abrir / cerrar menú
  menuNav.addEventListener("click", (e) => {
    e.stopPropagation();
    bottomMenuPanel.classList.toggle("show");
  });

  // 🔥 Navegar desde el menú
  bottomMenuPanel.addEventListener("click", async (e) => {

    const btn = e.target.closest(".menu-item");
    if (!btn) return;

    const screenId = btn.dataset.screen;

    // Ocultar todas las pantallas
    document.querySelectorAll(".screen").forEach(s => {
      s.classList.add("hidden");
    });

    // Mostrar la seleccionada
    const target = document.getElementById(screenId);
    if (target) target.classList.remove("hidden");

    // Cerrar menú
    bottomMenuPanel.classList.remove("show");

    // 🔥 Actualizar barra activa
    updateBottomNavActive(screenId);
  });

  document.addEventListener("click", (e) => {
  if (!e.target.closest("#bottomMenuPanel") && 
      !e.target.closest("#menuNav")) {
    bottomMenuPanel?.classList.remove("show");
  }
});

}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#familyMenu") && !e.target.closest("#familyMenuBtn")) {
    document.getElementById("familyMenu").classList.add("hidden");
  }
});





  // ======================================================
//  INVITAR MIEMBROS (CORREGIDO)
// ======================================================

inviteBtnInside.addEventListener("click", async () => {

  if (!currentHouseholdId || !auth.currentUser) {
    alert("No se ha cargado el hogar actual.");
    return;
  }

  // Generar código
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Guardarlo en Firestore
  await setDoc(doc(db, "invitations", code), {
    householdId: currentHouseholdId,
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  // Mostrar modal
  inviteCodeBox.textContent = code;
  inviteModal.classList.remove("hidden");
});

// Cerrar modal
closeInviteModal.addEventListener("click", () => {
  inviteModal.classList.add("hidden");
});

const closeEventModal = document.getElementById("closeEventModal");

closeEventModal.addEventListener("click", () => {
  document.getElementById("addEventModal").classList.add("hidden");
});


  // ======================================================
  //  AGENDA
  // ======================================================
  const agendaList = document.getElementById("agendaList");
  const addEventBtn = document.getElementById("addEventBtn");

  async function loadAgenda() {
    agendaList.innerHTML = "";

    const q = query(collection(db, "agenda"), where("householdId", "==", currentHouseholdId));
    const snap = await getDocs(q);

    snap.forEach(docu => {
      const li = document.createElement("li");
      li.textContent = `${docu.data().date} - ${docu.data().title}`;
      agendaList.appendChild(li);
    });
  }

 

  // ===============================
// AÑADIR EVENTO
// ===============================

const addEventModal = document.getElementById("addEventModal");

const saveEventBtn = document.getElementById("saveEventBtn");

addEventBtn.addEventListener("click", () => {
  loadNotifyList(); // ← AQUÍ CARGAMOS LOS MIEMBROS
  addEventModal.classList.remove("hidden");
});
async function loadNotifyList() {
  const snap = await getDoc(doc(db, "households", currentHouseholdId));
  const members = snap.data().members;

  const notifyList = document.getElementById("notifyList");
  notifyList.innerHTML = "";

  for (const uid in members) {
    if (uid === auth.currentUser.uid) continue; // No te notificas a ti mismo

    const u = await getDoc(doc(db, "users", uid));
    const data = u.data();

    const div = document.createElement("div");
    div.classList.add("notify-item");

    div.innerHTML = `
      <label>
        <input type="checkbox" class="notify-check" data-email="${data.email}" data-name="${data.name}">
        ${data.name} (${data.email})
      </label>
    `;

    notifyList.appendChild(div);
  }
}


// Guardar evento
saveEventBtn.addEventListener("click", async () => {
  const date = document.getElementById("eventDate").value;
  const time = document.getElementById("eventTime").value;
  const description = document.getElementById("eventDescription").value;
  const category = document.getElementById("eventCategory").value;
  const shortTitle = document.getElementById("eventShortTitle").value;





  if (!date || !time || !description) {
    alert("Completa todos los campos.");
    return;
  }

  const colors = {
    padres: "#ff6b6b",
    hijos: "#4dabf7",
    casa: "#51cf66"
  };

await addDoc(collection(db, "households", currentHouseholdId, "events"), {
  date,
  time,
  description,
  shortTitle,
  category,
  color: colors[category],
  createdAt: serverTimestamp()
});

  // 1. Recoger los miembros seleccionados
const checks = document.querySelectorAll(".notify-check:checked");

// 2. Enviar email a cada uno
checks.forEach(chk => {
  emailjs.send("service_2yful4g", "template_rg45ekn", {
    to_email: chk.dataset.email,
    to_name: chk.dataset.name,
    from_name: currentUserNameValue,
    event_title: shortTitle,
    event_date: date,
    event_time: time,
    description: description,
  });
});


  addEventModal.classList.add("hidden");
  loadAgendaEvents();
  loadCalendarEventsForMonth(new Date());
});


async function loadAgendaEvents() {

  const list = document.getElementById("agendaList");
  const todayAlert = document.getElementById("todayAlert");
  const todayEventsList = document.getElementById("todayEventsList");
  const futureList = document.getElementById("futureEventsList");

  list.innerHTML = "";
  todayEventsList.innerHTML = "";
  futureList.innerHTML = "";

  const today = new Date();
  today.setHours(0,0,0,0);
 const todayStr = today.toLocaleDateString("sv-SE");

  const now = new Date();

  // Semana actual
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const q = query(
    collection(db, "households", currentHouseholdId, "events"),
    orderBy("date", "asc"),
    orderBy("time", "asc")
  );

  const snap = await getDocs(q);

  let todayEvents = [];
  let futureByMonth = {};

  // ======================================================
  // RECORRER EVENTOS
  // ======================================================

snap.forEach(docu => {

  const ev = docu.data();
  const evDate = new Date(ev.date + "T00:00:00");

  // --- OCULTAR PASADOS ---
  if (evDate < today) return;

  // --- EVENTOS DE HOY (PRIMERO) ---
  if (ev.date === todayStr) {
    todayEvents.push({ id: docu.id, ...ev });
    return;
  }

  // --- EVENTOS DE ESTA SEMANA ---
  if (evDate >= weekStart && evDate <= weekEnd) {

    const li = document.createElement("li");
    li.style.borderLeft = `6px solid ${ev.color}`;

    li.innerHTML = `
      <div class="agenda-info">
        <strong>${ev.date} ${ev.time}</strong><br>
        ${ev.shortTitle || ev.description}
      </div>

          <div class="agenda-actions">
          <button class="viewEventBtn" data-id="${docu.id}">
            <i class="material-icons">visibility</i>
          </button>
          <button class="editEventBtn" data-id="${docu.id}">
            <i class="material-icons">edit</i>
          </button>
          <button class="deleteEventBtn" data-id="${docu.id}">
            <i class="material-icons">delete</i>
          </button>
        </div>
    `;

    list.appendChild(li);
    return;
  }

  // --- FUTUROS (DESPUÉS DE LA SEMANA) ---
  if (evDate > weekEnd) {

    const monthKey = evDate.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric"
    });

    if (!futureByMonth[monthKey]) {
      futureByMonth[monthKey] = [];
    }

    futureByMonth[monthKey].push({ id: docu.id, ...ev });
  }

});


  // ======================================================
  // MOSTRAR EVENTOS DE HOY
  // ======================================================

  if (todayEvents.length > 0) {

    todayAlert.classList.remove("hidden");
    todayEventsList.classList.remove("hidden");

    todayAlert.textContent =
      todayEvents.length === 1
        ? "Hoy tienes 1 evento:"
        : `Hoy tienes ${todayEvents.length} eventos:`;

    todayEvents.forEach(ev => {

      const li = document.createElement("li");
      li.classList.add("today-item");
      li.style.borderLeft = `6px solid ${ev.color}`;

      li.innerHTML = `
        <div class="agenda-info">
          <strong>${ev.time}</strong><br>
          ${ev.shortTitle || ev.description}
        </div>

        <div class="agenda-actions">
          <button class="viewEventBtn" data-id="${ev.id}">
            <i class="material-icons">visibility</i>
          </button>
          <button class="editEventBtn" data-id="${ev.id}">
            <i class="material-icons">edit</i>
          </button>
          <button class="deleteEventBtn" data-id="${ev.id}">
            <i class="material-icons">delete</i>
          </button>
        </div>
      `;

      todayEventsList.appendChild(li);
    });

  } else {
    todayAlert.classList.add("hidden");
    todayEventsList.classList.add("hidden");
  }


  // ======================================================
  // FUTUROS POR MES
  // ======================================================

  for (const month in futureByMonth) {

    const header = document.createElement("h3");
    header.textContent = month.charAt(0).toUpperCase() + month.slice(1);
    header.classList.add("month-header");
    futureList.appendChild(header);

    futureByMonth[month].forEach(ev => {

      const li = document.createElement("li");
      li.style.borderLeft = `6px solid ${ev.color}`;

      li.innerHTML = `
        <div class="agenda-info">
          <strong>${ev.date} ${ev.time}</strong><br>
          ${ev.shortTitle || ev.description}
        </div>

        <div class="agenda-actions">
          <button class="viewEventBtn" data-id="${ev.id}">
            <i class="material-icons">visibility</i>
          </button>
          <button class="editEventBtn" data-id="${ev.id}">
            <i class="material-icons">edit</i>
          </button>
          <button class="deleteEventBtn" data-id="${ev.id}">
            <i class="material-icons">delete</i>
          </button>
        </div>
      `;

      futureList.appendChild(li);
    });
  }


  // ======================================================
  // LISTENERS (UNA SOLA VEZ)
  // ======================================================

  document.querySelectorAll(".editEventBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const snap = await getDoc(doc(db, "households", currentHouseholdId, "events", id));
      openEditEvent({ id, ...snap.data() });
    });
  });

  document.querySelectorAll(".deleteEventBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "households", currentHouseholdId, "events", btn.dataset.id));
      loadAgendaEvents();
      loadCalendarEventsForMonth(new Date());
    });
  });

  document.querySelectorAll(".viewEventBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const snap = await getDoc(doc(db, "households", currentHouseholdId, "events", id));
      const ev = snap.data();

      openEventDetails({
        id,
        startStr: `${ev.date}T${ev.time}`,
        extendedProps: {
          description: ev.description,
          category: ev.category
        }
      });
    });
  });

}

function openEditEvent(event) {
  const modal = document.getElementById("editEventModal");
  modal.dataset.eventId = event.id;

  // Si viene del calendario → tiene startStr
  if (event.startStr) {
    const [date, time] = event.startStr.split("T");
    document.getElementById("editDate").value = date;
    document.getElementById("editTime").value = time.slice(0,5);
    document.getElementById("editShortTitle").value = event.title;
    document.getElementById("editCategory").value = event.extendedProps.category;
    document.getElementById("editDescription").value = event.extendedProps.description;
  }

  // Si viene de la agenda → viene con datos directos
  else {
    document.getElementById("editDate").value = event.date;
    document.getElementById("editTime").value = event.time;
    document.getElementById("editShortTitle").value = event.shortTitle;
    document.getElementById("editCategory").value = event.category;
    document.getElementById("editDescription").value = event.description;
  }

  modal.classList.remove("hidden");
}



document.getElementById("saveEditEventBtn").addEventListener("click", async () => {
  const modal = document.getElementById("editEventModal");
  const id = modal.dataset.eventId;

  const shortTitle = document.getElementById("editShortTitle").value;
  const date = document.getElementById("editDate").value;
  const time = document.getElementById("editTime").value;
  const category = document.getElementById("editCategory").value;
  const description = document.getElementById("editDescription").value;

  const checks = document.querySelectorAll(".notify-check:checked");

checks.forEach(chk => {
  emailjs.send("service_id", "template_id", {
    to_email: chk.dataset.email,
    to_name: chk.dataset.name,
    from_name: currentUserNameValue,
    event_title: shortTitle || description,
    event_date: date,
    event_time: time
  });
});


  const colors = {
    padres: "#ff6b6b",
    hijos: "#4dabf7",
    casa: "#51cf66"
  };


await updateDoc(doc(db, "households", currentHouseholdId, "events", id), {
  shortTitle,
  date,
  time,
  category,
  description,
  color: colors [category]
});

  modal.classList.add("hidden");

  loadAgendaEvents();
  loadCalendarEventsForMonth(new Date());
});

document.getElementById("closeEditEventModal").addEventListener("click", () => {
  document.getElementById("editEventModal").classList.add("hidden");
});


  // ======================================================
  //  CALENDARIO
  // ======================================================
let calendar; // referencia global

// ===============================
// CARGAR EVENTOS DEL MES ACTUAL
// ===============================
async function loadCalendarEventsForMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const eventsRef = collection(db, "households", currentHouseholdId, "events");
  const snap = await getDocs(eventsRef);

  const events = [];

  snap.forEach(docu => {
    const ev = docu.data();

    // Convertir a fecha real
    const evDateObj = new Date(`${ev.date}T${ev.time}`);
    const evYear = evDateObj.getFullYear();
    const evMonth = evDateObj.getMonth() + 1;

    if (evYear === year && evMonth === month) {
events.push({
  id: docu.id,
  title: ev.shortTitle || ev.description,
  start: new Date(`${ev.date}T${ev.time}`),
  backgroundColor: ev.color,
  borderColor: ev.color,
  extendedProps: {
    description: ev.description,
    category: ev.category,
    color: ev.color,
    time: ev.time   // ← NECESARIO PARA ARRASTRAR
  }
});



    }
  });

  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(events);
    return;
  }

  const calendarEl = document.getElementById("calendar");

calendar = new FullCalendar.Calendar(calendarEl, {
  initialView: "dayGridMonth",
  locale: "es",
  height: "auto",
  contentHeight: "auto",
  handleWindowResize: true,
  firstDay: 1,
  showNonCurrentDates: false,
  eventDisplay: "block",
  editable: true,               // ← permite arrastrar
  eventDurationEditable: false, // ← evita cambiar duración
  events: events,
  datesSet: function(info) {
    loadCalendarEventsForMonth(info.start);
  },
  eventClick: function(info) {
    openEditEvent(info.event);
  },
  eventDrop: handleEventDrop     // ← manejador al soltar
});



  calendar.render();
}


// ===============================
// ABRIR DETALLES DE EVENTO
// ===============================
function openEventDetails(event) {
  const modal = document.getElementById("eventDetailsModal");

  const [date, time] = event.startStr.split("T");

  document.getElementById("detailDate").textContent = date;
  document.getElementById("detailTime").textContent = time;
 document.getElementById("detailDescription").textContent =
  event.extendedProps.description || "";
  document.getElementById("detailCategory").textContent =
    event.extendedProps.category || "";

  modal.dataset.eventId = event.id;
  modal.classList.remove("hidden");
}

// ===============================
// CERRAR MODAL DETALLES
// ===============================
document.getElementById("closeEventDetails").addEventListener("click", () => {
  document.getElementById("eventDetailsModal").classList.add("hidden");
});

// ===============================
// BORRAR EVENTO
// ===============================
document.getElementById("deleteEventBtn").addEventListener("click", async () => {
  const modal = document.getElementById("eventDetailsModal");
  const id = modal.dataset.eventId;

  await deleteDoc(doc(db, "households", currentHouseholdId, "events", id));

  modal.classList.add("hidden");
  loadAgendaEvents();
  loadCalendarEventsForMonth(new Date());
});

async function handleEventDrop(info) {
  const event = info.event;

  // Nueva fecha tras arrastrar
  const newDate = event.start.toISOString().split("T")[0];

  // Hora original (no cambia al arrastrar)
  const originalTime = event.extendedProps.time || event.startStr.split("T")[1].slice(0,5);

  // Actualizar en Firestore
  await updateDoc(
    doc(db, "households", currentHouseholdId, "events", event.id),
    {
      date: newDate,
      time: originalTime
    }
  );

  // Recargar agenda y calendario
  loadAgendaEvents();
  loadCalendarEventsForMonth(event.start);
}


async function openProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data();

  const modal = document.getElementById("profileModal");
  modal.dataset.uid = uid;

  // Rellenar datos
  document.getElementById("profileName").value = data.name || "";
  document.getElementById("profileRole").value = data.role || "invitado";
  const avatar = data.avatar || "padre1";
document.getElementById("profileAvatar").value = avatar;
document.getElementById("profileAvatarPreview").innerHTML = AVATARS[avatar];


// Vista previa del avatar al cambiar el selector
document.getElementById("profileAvatar").addEventListener("change", (e) => {
  document.getElementById("profileAvatarPreview").innerHTML =
    AVATARS[e.target.value];
});

const deleteBtn = document.getElementById("deleteMemberBtn");

const householdSnap = await getDoc(doc(db, "households", currentHouseholdId));
const isOwner = householdSnap.data().owner === auth.currentUser.uid;

if (isOwner && uid !== auth.currentUser.uid) {
  deleteBtn.classList.remove("hidden");
} else {
  deleteBtn.classList.add("hidden");
}



  const saveBtn = document.getElementById("saveProfileBtn");

  // 🔒 Solo puede editar su propio perfil
  if (uid !== auth.currentUser.uid) {
    document.getElementById("profileName").disabled = true;
    document.getElementById("profileRole").disabled = true;
    document.getElementById("profileAvatar").disabled = true;
    saveBtn.classList.add("hidden");
  } else {
    document.getElementById("profileName").disabled = false;
    document.getElementById("profileRole").disabled = false;
    document.getElementById("profileAvatar").disabled = false;
    saveBtn.classList.remove("hidden");
  }

  modal.classList.remove("hidden");
}



document.getElementById("closeProfileModal").addEventListener("click", () => {
  document.getElementById("profileModal").classList.add("hidden");
});

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const modal = document.getElementById("profileModal");
  const uid = modal.dataset.uid;

  if (uid !== auth.currentUser.uid) return;

  const name = document.getElementById("profileName").value;
  const role = document.getElementById("profileRole").value;
  const avatar = document.getElementById("profileAvatar").value;

  await updateDoc(doc(db, "users", uid), {
    name,
    role,
    avatar
  });

  modal.classList.add("hidden");
  loadMembers();
});

document.getElementById("deleteMemberBtn").addEventListener("click", async () => {
  const modal = document.getElementById("profileModal");
  const uid = modal.dataset.uid;

  if (!confirm("¿Seguro que quieres eliminar a este miembro del hogar?")) return;

  await updateDoc(doc(db, "households", currentHouseholdId), {
    [`members.${uid}`]: deleteField()
  });

  modal.classList.add("hidden");
  loadMembers();
});

  // ======================================================
// ======================================================
//  COMPRAS (MULTILISTAS)
// ======================================================

const addProductBtn = document.getElementById("addProductBtn");
const createListBtn = document.getElementById("createListBtn");
const toggleListsBtn = document.getElementById("toggleListsBtn");
const listsContainer = document.getElementById("listsContainer");

const deleteListModal = document.getElementById("deleteListModal");
const confirmDeleteListBtn = document.getElementById("confirmDeleteListBtn");
const cancelDeleteListBtn = document.getElementById("cancelDeleteListBtn");

let currentListId = null;
let listIdToDelete = null;

/* =====================================================
   CREAR LISTA (MODAL)
===================================================== */

createListBtn?.addEventListener("click", () => {

  const modal = document.getElementById("createListModal");
  modal?.classList.remove("hidden");

});

const saveNewListBtn = document.getElementById("saveNewListBtn");
const newListNameInput = document.getElementById("newListName");
const createListModal = document.getElementById("createListModal");
const closeListModalBtn = document.getElementById("closeListModalBtn");

saveNewListBtn?.addEventListener("click", async () => {

  const name = newListNameInput.value.trim();
  if (!name || !currentHouseholdId) return;

  await addDoc(collection(db, "shoppingLists"), {
    name,
    householdId: currentHouseholdId,
    createdAt: serverTimestamp()
  });

  newListNameInput.value = "";
  createListModal?.classList.add("hidden");

  loadShoppingLists();
});

closeListModalBtn?.addEventListener("click", () => {
  createListModal?.classList.add("hidden");
});


/* =====================================================
   CARGAR LISTAS
===================================================== */

async function loadShoppingLists() {

  if (!listsContainer) return;

  listsContainer.innerHTML = "";

  const q = query(
    collection(db, "shoppingLists"),
    where("householdId", "==", currentHouseholdId)
  );

  const snap = await getDocs(q);

 snap.forEach(docu => {

  const div = document.createElement("div");
  div.classList.add("shopping-list-card");
  div.dataset.id = docu.id;   // 👈 guardamos el id aquí

  div.innerHTML = `
    <div class="list-row">

      <h3 class="list-name">
        ${docu.data().name}
      </h3>

      <div class="list-actions">

        <button class="deleteListBtn" data-id="${docu.id}">
          🗑
        </button>

      </div>

    </div>
  `;

  listsContainer.appendChild(div);
});

}


/* =====================================================
   ABRIR LISTA
===================================================== */

function openList(listId) {

  currentListId = listId;

  getDoc(doc(db, "shoppingLists", listId)).then(snapshot => {

    const listName = snapshot.data().name;

    const title = document.getElementById("currentListTitle");
    title.textContent = "🛒 " + listName;
    title.classList.remove("hidden");

  });

  document.getElementById("listsView")?.classList.add("hidden");
  document.getElementById("productsView")?.classList.remove("hidden");

  loadProducts();
}


/* =====================================================
   CLICK EN LISTAS (ABRIR / BORRAR)
===================================================== */

listsContainer?.addEventListener("click", (e) => {

  // 🔥 Si se pulsa borrar
  const deleteBtn = e.target.closest(".deleteListBtn");
  if (deleteBtn) {
    listIdToDelete = deleteBtn.dataset.id;
    deleteListModal?.classList.remove("hidden");
    return;
  }

  // 🔥 Si se pulsa cualquier parte del bloque
  const card = e.target.closest(".shopping-list-card");
  if (card) {
    openList(card.dataset.id);
    listsContainer.classList.add("hidden");
  }

});


/* =====================================================
   CONFIRMAR BORRAR LISTA
===================================================== */

confirmDeleteListBtn?.addEventListener("click", async () => {

  if (!listIdToDelete) return;

  try {

    const productsSnap = await getDocs(
      collection(db, "shoppingLists", listIdToDelete, "products")
    );

    for (const productDoc of productsSnap.docs) {

      await deleteDoc(
        doc(db, "shoppingLists", listIdToDelete, "products", productDoc.id)
      );

    }

    await deleteDoc(doc(db, "shoppingLists", listIdToDelete));

    deleteListModal?.classList.add("hidden");
    listIdToDelete = null;

    loadShoppingLists();

  } catch (error) {
    console.error("Error eliminando lista:", error);
  }

});


/* =====================================================
   CANCELAR BORRAR LISTA
===================================================== */

cancelDeleteListBtn?.addEventListener("click", () => {

  deleteListModal?.classList.add("hidden");
  listIdToDelete = null;

});


/* =====================================================
   VOLVER A LISTAS
===================================================== */

const backToListsBtn = document.getElementById("backToListsBtn");

  backToListsBtn?.addEventListener("click", () => {

  document.getElementById("productsView")?.classList.add("hidden");
  document.getElementById("listsView")?.classList.remove("hidden");

  document.getElementById("currentListTitle")?.classList.add("hidden");

  // 🔥 IMPORTANTE: mostrar el contenedor de listas
  const listsContainer = document.getElementById("listsContainer");
  listsContainer?.classList.remove("hidden");

  if (unsubscribeProducts) {
  unsubscribeProducts();
  unsubscribeProducts = null;
}

  currentListId = null;

  // 🔥 IMPORTANTE: volver a cargar las listas
  loadShoppingLists();

});


/* =====================================================
/* =====================================================
   CARGAR PRODUCTOS
===================================================== */

let unsubscribeProducts = null;

function loadProducts() {

  if (!currentListId) return;

  const list = document.getElementById("shoppingList");
  if (!list) return;

  // 🔥 Si ya había un listener, lo eliminamos
  if (unsubscribeProducts) {
    unsubscribeProducts();
  }

  const q = query(
    collection(db, "shoppingLists", currentListId, "products"),
    orderBy("createdAt", "desc")
  );

  unsubscribeProducts = onSnapshot(q, (snapshot) => {

    list.innerHTML = "";

    snapshot.forEach(docu => {

      const data = docu.data();

      const li = document.createElement("li");
      li.classList.add("shopping-item");

      const completedClass = data.completed ? "completed" : "";

      li.innerHTML = `
        <span class="${completedClass}">
          ${data.qty}x ${data.name}
        </span>

        <div class="product-actions">
          <button class="toggleCompleteBtn" data-id="${docu.id}">
            ✔
          </button>

          <button class="deleteProductBtn" data-id="${docu.id}">
            🗑
          </button>
        </div>
      `;

      list.appendChild(li);

    });

    calculateTotal();
  });

  // Delegación de eventos
  list.onclick = async (e) => {

    const toggleBtn = e.target.closest(".toggleCompleteBtn");
    if (toggleBtn) {

      const productId = toggleBtn.dataset.id;

      const productRef = doc(
        db,
        "shoppingLists",
        currentListId,
        "products",
        productId
      );

      const snap = await getDoc(productRef);
      const currentStatus = snap.data().completed || false;

      await updateDoc(productRef, {
        completed: !currentStatus
      });
    }

    const deleteBtn = e.target.closest(".deleteProductBtn");
    if (deleteBtn) {

      const productId = deleteBtn.dataset.id;

      await deleteDoc(
        doc(db, "shoppingLists", currentListId, "products", productId)
      );
    }
  };
}
   
/* =====================================================
   CALCULAR TOTAL (CORREGIDO)
===================================================== */

async function calculateTotal() {

  if (!currentListId) return;

  const totalElement = document.getElementById("totalPrice");
  if (!totalElement) return;

  const snap = await getDocs(
    collection(db, "shoppingLists", currentListId, "products")
  );

  let total = 0;

  snap.forEach(docu => {

    const data = docu.data();

    const qty = Number(data.qty) || 0;
    const price = Number(data.price) || 0;

    total += qty * price;

  });

  totalElement.textContent = "Total: " + total.toFixed(2) + " €";
}



/* =====================================================
   AÑADIR PRODUCTO
===================================================== */

const openAddProductModalBtn = document.getElementById("openAddProductModal");
const addProductModal = document.getElementById("addProductModal");
const saveProductBtn = document.getElementById("saveProductBtn");
const closeAddProductModalBtn = document.getElementById("closeAddProductModal");

/* ABRIR MODAL */
openAddProductModalBtn?.addEventListener("click", () => {
  addProductModal?.classList.remove("hidden");
});

/* CERRAR MODAL */
closeAddProductModalBtn?.addEventListener("click", () => {
  addProductModal?.classList.add("hidden");
});

/* GUARDAR PRODUCTO */
saveProductBtn?.addEventListener("click", async () => {

  if (!currentListId) return;

  const nameInput = document.getElementById("productName");
  const qtyInput = document.getElementById("productQty");
  const priceInput = document.getElementById("productPrice");

  if (!nameInput.value || !qtyInput.value) {
    alert("Completa nombre y cantidad");
    return;
  }

  await addDoc(
    collection(db, "shoppingLists", currentListId, "products"),
    {
      name: nameInput.value,
      qty: qtyInput.value,
      price: priceInput.value || 0,
      completed: false,
      createdAt: serverTimestamp()
    }
  );

  nameInput.value = "";
  qtyInput.value = "";
  priceInput.value = "";

  addProductModal.classList.add("hidden");

  loadProducts();
  calculateTotal();
});
  // ======================================================
// ======================================================
//  TAREAS
// ======================================================

const tasksList = document.getElementById("tasksList");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskInput = document.getElementById("taskInput");

// Activar botón si hay texto
taskInput.addEventListener("input", () => {
  addTaskBtn.disabled = taskInput.value.trim() === "";
});

// Cargar tareas
function loadTasks() {

  if (!currentHouseholdId) return;

  const list = document.getElementById("tasksList");
  if (!list) return;

  if (unsubscribeTasks) unsubscribeTasks();

  const q = query(
    collection(db, "households", currentHouseholdId, "tasks"),
    orderBy("createdAt", "desc")
  );

  unsubscribeTasks = onSnapshot(q, (snap) => {

    list.innerHTML = "";

    let pendingCount = 0;
    const tasks = [];

    snap.forEach(docu => {
      tasks.push({ id: docu.id, ...docu.data() });
    });

    tasks.sort((a, b) => a.completed - b.completed);

    tasks.forEach(task => {

      if (!task.completed) pendingCount++;

      const li = document.createElement("li");
      li.classList.add("task-item");

li.innerHTML = `
  <div class="task-label">
    <input type="checkbox" class="task-check" data-id="${task.id}" ${task.completed ? "checked" : ""}>
    <span class="${task.completed ? "task-done" : ""}">
      ${task.title}
    </span>
  </div>

  <button class="deleteTaskBtn" data-id="${task.id}">
    🗑
  </button>
`;

      list.appendChild(li);
    });

    const counter = document.getElementById("tasksCounter");
    if (counter) {
      counter.textContent =
        pendingCount === 0
          ? "Todo al día 🎉"
          : `${pendingCount} pendientes`;
    }

    // 🔥 Delegación de eventos (MUY IMPORTANTE)
    list.onclick = async (e) => {

      const check = e.target.closest(".task-check");
      if (check) {
        await updateDoc(
          doc(db, "households", currentHouseholdId, "tasks", check.dataset.id),
          { completed: check.checked }
        );
      }

      const deleteBtn = e.target.closest(".deleteTaskBtn");
      if (deleteBtn) {
        await deleteDoc(
          doc(db, "households", currentHouseholdId, "tasks", deleteBtn.dataset.id)
        );
      }

    };

  });

}





// Añadir tarea
addTaskBtn.addEventListener("click", async () => {

  const title = taskInput.value.trim();
  if (!title) return;

  await addDoc(
    collection(db, "households", currentHouseholdId, "tasks"),
    {
      title,
      completed: false,
      createdAt: serverTimestamp()
    }
  );

  taskInput.value = "";
  addTaskBtn.disabled = true;

  
});



// ======================================================
// ======================================================
//  DASHBOARD HOME (TIEMPO REAL)
// ======================================================

function loadHomeDashboardRealtime() {

  if (!currentHouseholdId) return;

  const todayList = document.getElementById("homeTodayEvents");
  const weekList = document.getElementById("homeWeekEvents");
  const tasksList = document.getElementById("homeTasks");
  const noTodayMsg = document.getElementById("noTodayEventsMsg");

  todayList.innerHTML = "";
  weekList.innerHTML = "";
  tasksList.innerHTML = "";

  const today = new Date();
  today.setHours(0,0,0,0);

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  let todayEventsFound = false;

  // 🔥 LISTENER EN TIEMPO REAL PARA EVENTOS
  onSnapshot(
    collection(db, "households", currentHouseholdId, "events"),
    (snapshot) => {

      todayList.innerHTML = "";
      weekList.innerHTML = "";

      todayEventsFound = false;

      snapshot.forEach(docu => {

        const ev = docu.data();
        const evDate = new Date(ev.date);

        // 🎯 HOY
        if (evDate.toDateString() === today.toDateString()) {

          todayEventsFound = true;

        const li = document.createElement("li");

li.classList.add("dashboard-event-item");
li.textContent = `${ev.time} - ${ev.shortTitle || ev.description}`;

// 🔥 HACER CLICABLE
li.addEventListener("click", async () => {

  const eventSnap = await getDoc(
    doc(db, "households", currentHouseholdId, "events", docu.id)
  );

  const eventData = eventSnap.data();

  openEventDetails({
    id: docu.id,
    startStr: `${eventData.date}T${eventData.time}`,
    extendedProps: {
      description: eventData.description,
      category: eventData.category
    }
  });

});

todayList.appendChild(li);
}

        // 🎯 ESTA SEMANA
        if (evDate >= today && evDate <= weekEnd) {

          const li = document.createElement("li");
          li.textContent = `${ev.date} - ${ev.shortTitle || ev.description}`;
          weekList.appendChild(li);
        }

      });

      // Mostrar / ocultar mensaje
      if (!todayEventsFound) {
        noTodayMsg.classList.remove("hidden");
      } else {
        noTodayMsg.classList.add("hidden");
      }

    }
  );

// 🔥 LISTENER EN TIEMPO REAL PARA TAREAS
  onSnapshot(
    collection(db, "households", currentHouseholdId, "tasks"),
    (snapshot) => {

      tasksList.innerHTML = "";

      snapshot.forEach(docu => {

        const task = docu.data();

        if (!task.completed) {

          const li = document.createElement("li");
          li.textContent = task.title;

          tasksList.appendChild(li);
        }

      });

    }
  );

}

  // ======================================================
  //  INICIALIZAR
  // ======================================================
  showLogin();

});




