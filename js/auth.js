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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  let currentHouseholdId = null;
  let currentUserNameValue = "";


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
  const membersDropdown = document.getElementById("membersDropdown");

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
  const inviteBtn = document.getElementById("inviteBtn");
  const inviteModal = document.getElementById("inviteModal");
  const inviteCodeBox = document.getElementById("inviteCodeBox");
  const closeInviteModal = document.getElementById("closeInviteModal");

  // BOTONES DE FORMULARIOS (FALTABAN)
  const showRegisterBtn = document.getElementById("showRegisterBtn");
  const showJoinBtn = document.getElementById("showJoinBtn");
  const backFromRegister = document.getElementById("backFromRegister");
  const backFromJoin = document.getElementById("backFromJoin");

  // PANTALLAS
  const screens = {
    home: document.getElementById("homeScreen"),
    agenda: document.getElementById("agendaScreen"),
    calendar: document.getElementById("calendarScreen"),
    compra: document.getElementById("compraScreen"),
    notes: document.getElementById("notesScreen")

    // ===============================
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

    });
  });

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
    if (!user) return showLogin();

    showApp();
    const userDoc = await getDoc(doc(db, "users", user.uid));
    currentUserNameValue = userDoc.data().name;



    const q = query(collection(db, "households"), where(`members.${user.uid}`, "==", true));
    const snap = await getDocs(q);

    if (snap.empty) {
      await setDoc(doc(db, "households", user.uid), {
        name: "Mi Casa",
        owner: user.uid,
        members: { [user.uid]: true },
        createdAt: serverTimestamp()
      });
      currentHouseholdId = user.uid;
    } else {
      currentHouseholdId = snap.docs[0].id;
    }

    homeName.textContent = snap.empty ? "Mi Casa  " : snap.docs[0].data().name ;

    loadMembers();
    loadAgendaEvents();
    loadCalendarEvents();
    loadShopping();
    loadNotes();
  });

  // ======================================================
  //  MIEMBROS
  // ======================================================
  async function loadMembers() {
    const snap = await getDoc(doc(db, "households", currentHouseholdId));
    membersDropdown.innerHTML = "";

    for (const uid in snap.data().members) {
      const u = await getDoc(doc(db, "users", uid));
      const div = document.createElement("div");
      div.textContent = `${u.data().name} (${u.data().email})`;
      membersDropdown.appendChild(div);
    }
  }

  // ======================================================
//  INVITAR MIEMBROS (CORREGIDO)
// ======================================================

inviteBtn.addEventListener("click", async () => {
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
const closeEventModal = document.getElementById("closeEventModal");

addEventBtn.addEventListener("click", () => {
  addEventModal.classList.remove("hidden");
});

closeEventModal.addEventListener("click", () => {
  addEventModal.classList.add("hidden");
});

// Guardar evento
saveEventBtn.addEventListener("click", async () => {
  const date = document.getElementById("eventDate").value;
  const time = document.getElementById("eventTime").value;
  const description = document.getElementById("eventDescription").value;
  const category = document.getElementById("eventCategory").value;
  



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
    category,
    color: colors[category],
    createdAt: serverTimestamp()
  });

  addEventModal.classList.add("hidden");
  loadAgendaEvents();
  loadCalendarEvents();
});


async function loadAgendaEvents() {
  const list = document.getElementById("agendaList");
  list.innerHTML = "";

  const today = new Date();
  const start = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const end = new Date(today.setDate(start.getDate() + 6));

  const q = query(
    collection(db, "households", currentHouseholdId, "events"),
    orderBy("date", "asc"),
    orderBy("time", "asc")
  );

  const snap = await getDocs(q);

  snap.forEach(docu => {
    const ev = docu.data();
    const evDate = new Date(ev.date);

    if (evDate >= start && evDate <= end) {
      const li = document.createElement("li");
      li.style.borderLeft = `6px solid ${ev.color}`;
      li.innerHTML = `
        <div>
          <strong>${ev.date} ${ev.time}</strong><br>
          ${ev.description}
        </div>
        <button class="deleteEventBtn" data-id="${docu.id}">🗑️</button>
      `;
      list.appendChild(li);
    }
  });

  document.querySelectorAll(".deleteEventBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "households", currentHouseholdId, "events", btn.dataset.id));
      loadAgendaEvents();
      loadCalendarEvents();
    });
  });
}



  // ======================================================
  //  CALENDARIO
  // ======================================================
let calendar; // referencia global

async function loadCalendarEvents() {
  const eventsRef = collection(db, "households", currentHouseholdId, "events");
  const snap = await getDocs(eventsRef);

  const events = [];

  snap.forEach(docu => {
    const ev = docu.data();

    events.push({
      id: docu.id,
      title: ev.description,
      start: `${ev.date}T${ev.time}`,
      backgroundColor: ev.color,
      borderColor: ev.color
    });
  });

  // Si el calendario ya existe, solo actualizamos eventos
  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(events);
    return;
  }

  // Crear calendario por primera vez
  const calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "es",
    height: "auto",
    events: events,

    // Pulsar un evento → abrir modal de edición
    eventClick: function(info) {
      openEventDetails(info.event);
    }
  });

  calendar.render();
}


function openEventDetails(event) {
  const modal = document.getElementById("eventDetailsModal");

  const [date, time] = event.startStr.split("T");

  document.getElementById("detailDate").textContent = date;
  document.getElementById("detailTime").textContent = time;
  document.getElementById("detailDescription").textContent = event.title;
  document.getElementById("detailCategory").textContent =
    event.extendedProps.category || "";

  modal.dataset.eventId = event.id;
  modal.classList.remove("hidden");
}


document.getElementById("closeEventDetails").addEventListener("click", () => {
  document.getElementById("eventDetailsModal").classList.add("hidden");
});

document.getElementById("deleteEventBtn").addEventListener("click", async () => {
  const modal = document.getElementById("eventDetailsModal");
  const id = modal.dataset.eventId;

  await deleteDoc(doc(db, "households", currentHouseholdId, "events", id));

  modal.classList.add("hidden");
  loadAgendaEvents();
  loadCalendarEvents();
});



  // ======================================================
  //  COMPRAS
  // ======================================================
  const shoppingList = document.getElementById("shoppingList");
  const addProductBtn = document.getElementById("addProductBtn");

  async function loadShopping() {
    shoppingList.innerHTML = "";

    const q = query(collection(db, "shopping"), where("householdId", "==", currentHouseholdId));
    const snap = await getDocs(q);

    snap.forEach(docu => {
      const li = document.createElement("li");
      li.textContent = `${docu.data().qty}x ${docu.data().name}`;
      shoppingList.appendChild(li);
    });
  }

  addProductBtn.addEventListener("click", async () => {
    await addDoc(collection(db, "shopping"), {
      householdId: currentHouseholdId,
      name: document.getElementById("productName").value,
      qty: document.getElementById("productQty").value,
      price: document.getElementById("productPrice").value
    });

    loadShopping();
  });

  // ======================================================
  //  NOTAS
  // ======================================================
  const notesList = document.getElementById("notesList");
  const addNoteBtn = document.getElementById("addNoteBtn");

  // Habilitar botón cuando se escribe algo
  document.getElementById("noteContent").addEventListener("input", () => {
    addNoteBtn.disabled = false;
  });

  async function loadNotes() {
    notesList.innerHTML = "";

    const q = query(collection(db, "notes"), where("householdId", "==", currentHouseholdId));
    const snap = await getDocs(q);

    snap.forEach(docu => {
      const li = document.createElement("li");
      li.textContent = docu.data().title;
      notesList.appendChild(li);
    });
  }

  addNoteBtn.addEventListener("click", async () => {
    await addDoc(collection(db, "notes"), {
      householdId: currentHouseholdId,
      title: document.getElementById("noteTitle").value,
      content: document.getElementById("noteContent").value
    });

    loadNotes();
  });

  // ======================================================
  //  INICIALIZAR
  // ======================================================
  showLogin();

});
