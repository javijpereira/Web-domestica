console.log("Calendario laboral iniciado");

import { doc, setDoc, getDoc, getDocs, deleteDoc, collection } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ======================================================
// VARIABLES GLOBALES
// ======================================================

window.workCalendar = null;
window.selectedWorkMember = null;
window.selectedRange = [];
window.workDaysCache = {};

// ======================================================
// UTILIDADES
// ======================================================

function formatLocalDate(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

// ======================================================
// PINTAR DÍA (SEGURO)
// ======================================================

function repaintDay(date) {

  const calendarEl = document.getElementById("workCalendar");
  if(!calendarEl) return;

  const cellEls = calendarEl.querySelectorAll('.fc-daygrid-day[data-date="'+date+'"]');
  const data = window.workDaysCache[date];

  cellEls.forEach(cell => {

    cell.querySelectorAll('.work-bg, .work-text').forEach(el => el.remove());

    if(!data) return;

    cell.style.position = "relative";

    const bg = document.createElement("div");
    bg.className = "work-bg";
    bg.style.position = "absolute";
    bg.style.inset = "0";
    bg.style.borderRadius = "6px";
    bg.style.zIndex = "0";

    const text = document.createElement("div");
    text.className = "work-text";
    text.style.position = "absolute";
    text.style.top = "50%";
    text.style.left = "50%";
    text.style.transform = "translate(-50%, -50%)";
    text.style.width = "100%";
    text.style.fontSize = "7px";
    text.style.fontWeight = "600";
    text.style.textAlign = "center";
    text.style.color = "#fff";
    text.style.zIndex = "2";

    if(data.shifts && data.shifts.length === 1){

      bg.style.background = data.shifts[0].color;

      text.innerHTML =
        data.shifts[0].name+"<br>"+
        "<span style='font-size:10px'>"+
        data.shifts[0].start+"-"+data.shifts[0].end+
        "</span>";

    } 
else if(data.shifts && data.shifts.length === 2){

  bg.style.background =
    "linear-gradient(to bottom,"+
    data.shifts[0].color+" 50%,"+
    data.shifts[1].color+" 50%)";

  const textTop = document.createElement("div");
  textTop.className = "work-text";
  textTop.style.position = "absolute";
  textTop.style.top = "25%";
  textTop.style.left = "50%";
  textTop.style.transform = "translate(-50%, -50%)";
  textTop.style.right = "2px";
  textTop.style.fontSize = "7px";
  textTop.style.fontWeight = "600";
  textTop.style.textAlign = "center";
  textTop.style.color = "#fff";
  textTop.style.zIndex = "2";

  textTop.textContent = data.shifts[0].name;

  const textBottom = document.createElement("div");
  textBottom.className = "work-text";
  textBottom.style.position = "absolute";
  textBottom.style.bottom = "2px";
  textBottom.style.top = "75%";
  textBottom.style.left = "50%";
  textBottom.style.transform = "translate(-50%, -50%)";
  textBottom.style.fontSize = "7px";
  textBottom.style.fontWeight = "600";
  textBottom.style.textAlign = "center";
  textBottom.style.color = "#fff";
  textBottom.style.zIndex = "2";

  textBottom.textContent = data.shifts[1].name;

  cell.appendChild(bg);
  cell.appendChild(textTop);
  cell.appendChild(textBottom);

  return;
}
    else if(data.type){

      bg.style.background = getColorForType(data.type);
      text.textContent = data.type.toUpperCase();

    }

    cell.appendChild(bg);
    cell.appendChild(text);

  });

}

// ======================================================
// INICIAR CALENDARIO
// ======================================================

function initWorkCalendar(){
  const calendarEl = document.getElementById("workCalendar");
  if(!calendarEl) return;

  window.workCalendar = new FullCalendar.Calendar(calendarEl,{
    initialView:"dayGridMonth",
    locale:"es",
    firstDay:1,
    height:"auto",
    headerToolbar: {
  left: "today",
  center: "title",
  right: "prev,next"
},
    selectable:true,
    selectMirror:true,
    editable:true,

    select:function(info){
      if(!window.selectedWorkMember){
        alert("Selecciona un miembro");
        return;
      }

      const start = new Date(info.startStr);
      const end = new Date(info.endStr);
      const days = [];

      while(start < end){
        days.push(formatLocalDate(start));
        start.setDate(start.getDate()+1);
      }

      window.selectedRange = days;
      document.getElementById("workSelectedDate").textContent =
        days.length+" días seleccionados";

      openDayModal(days[0]);
    },

    dateClick:function(info){
      if(!window.selectedWorkMember){
        alert("Selecciona un miembro");
        return;
      }

      const dateStr = formatLocalDate(info.date);
      window.selectedRange = [dateStr];
      document.getElementById("workSelectedDate").textContent = dateStr;
      openDayModal(dateStr);
    },

  dayCellDidMount:function(info){

  const calendarEl = document.getElementById("workCalendar");
  if(!calendarEl.contains(info.el)) return;

  const date = formatLocalDate(info.date);

  if(window.workDaysCache[date]){
    repaintDay(date);
  }

},

datesSet: function(){

  if(!window.selectedWorkMember) return;

  const cells = document.querySelectorAll('#workCalendar .fc-daygrid-day');

  cells.forEach(cell=>{
    const date = cell.getAttribute("data-date");
    repaintDay(date);
  });

}
  });

  window.workCalendar.render();

  // 🔥 FIX 1: evitar congelación al entrar
  setTimeout(() => window.workCalendar.updateSize(), 80);
}

// ======================================================
// CARGAR TURNOS DE UN MIEMBRO
// ======================================================

window.loadWorkDaysForMember = async function(memberId){

  window.workDaysCache = {};

  const daysRef = collection(
    window.db,
    "households",
    window.currentHouseholdId,
    "workSchedules",
    memberId,
    "days"
  );

  const snap = await getDocs(daysRef);

  snap.forEach(docSnap => {
    window.workDaysCache[docSnap.id] = docSnap.data();
  });

  Object.keys(window.workDaysCache).forEach(date => repaintDay(date));

  // 🔥 FIX 2: evitar mezcla de turnos
  setTimeout(() => window.workCalendar.updateSize(), 80);
}

// ======================================================
// MODAL
// ======================================================

async function openDayModal(dateStr){
  const dayRef = doc(
    window.db,
    "households",
    window.currentHouseholdId,
    "workSchedules",
    window.selectedWorkMember,
    "days",
    dateStr
  );

  const snap = await getDoc(dayRef);

  document.getElementById("workDayType").value="trabajo";
  document.getElementById("workShiftName1").value="";
  document.getElementById("shift1Start").value="";
  document.getElementById("shift1End").value="";
  document.getElementById("workShiftName2").value="";
  document.getElementById("shift2Start").value="";
  document.getElementById("shift2End").value="";

  if(snap.exists()){
    const data = snap.data();
    if(data.type) document.getElementById("workDayType").value = data.type;
    if(data.shifts && data.shifts[0]){
      const s = data.shifts[0];
      document.getElementById("workShiftName1").value = s.name||"";
      document.getElementById("shift1Start").value = s.start||"";
      document.getElementById("shift1End").value = s.end||"";
    }
    if(data.shifts && data.shifts[1]){
      const s = data.shifts[1];
      document.getElementById("workShiftName2").value = s.name||"";
      document.getElementById("shift2Start").value = s.start||"";
      document.getElementById("shift2End").value = s.end||"";
    }
  }

  document.getElementById("workDayModal").classList.remove("hidden");
}

// ======================================================
// GUARDAR
// ======================================================

document.getElementById("saveWorkDayBtn")?.addEventListener("click", async ()=>{
  if(!window.selectedWorkMember) return;

  const type = document.getElementById("workDayType").value;

  const shift1 = {
    name: document.getElementById("workShiftName1").value.trim(),
    start: document.getElementById("shift1Start").value,
    end: document.getElementById("shift1End").value,
    color: document.getElementById("workShiftColor1").value
  };

  const shift2 = {
    name: document.getElementById("workShiftName2").value.trim(),
    start: document.getElementById("shift2Start").value,
    end: document.getElementById("shift2End").value,
    color: document.getElementById("workShiftColor2").value
  };

  const shifts = [];
  if(shift1.name && shift1.start && shift1.end) shifts.push(shift1);
  if(shift2.name && shift2.start && shift2.end) shifts.push(shift2);

  for(const date of window.selectedRange){
    const dayRef = doc(
      window.db,
      "households",
      window.currentHouseholdId,
      "workSchedules",
      window.selectedWorkMember,
      "days",
      date
    );

    const dataToSave = shifts.length>0 ? {shifts} : {type};
    await setDoc(dayRef, dataToSave);
    window.workDaysCache[date] = dataToSave;

    repaintDay(date);
  }

  document.getElementById("workDayModal").classList.add("hidden");

  // 🔥 FIX 3: asegurar repintado correcto
  setTimeout(() => window.workCalendar.updateSize(), 80);
});

// ======================================================
// CANCELAR
// ======================================================

document.getElementById("cancelWorkDayBtn")?.addEventListener("click", ()=>{
  window.selectedRange = [];
  document.getElementById("workDayModal").classList.add("hidden");
});

// ======================================================
// ELIMINAR DIA
// ======================================================

document.getElementById("deleteWorkShiftBtn")?.addEventListener("click", async ()=>{
  for(const date of window.selectedRange){
    await deleteDoc(doc(
      window.db,
      "households",
      window.currentHouseholdId,
      "workSchedules",
      window.selectedWorkMember,
      "days",
      date
    ));
    delete window.workDaysCache[date];
    repaintDay(date);
  }

  document.getElementById("workDayModal").classList.add("hidden");

  setTimeout(() => window.workCalendar.updateSize(), 80);
});

// ======================================================
// BORRAR TURNOS INDIVIDUALES
// ======================================================

document.getElementById("deleteShift1Btn")?.addEventListener("click", ()=>{
  document.getElementById("workShiftName1").value="";
  document.getElementById("shift1Start").value="";
  document.getElementById("shift1End").value="";
});

document.getElementById("deleteShift2Btn")?.addEventListener("click", ()=>{
  document.getElementById("workShiftName2").value="";
  document.getElementById("shift2Start").value="";
  document.getElementById("shift2End").value="";
});

// ======================================================
// COLORES SEGUN TIPO
// ======================================================

function getColorForType(type){
  switch(type){
    case "trabajo": return "#1425e3";
    case "libre": return "#15f349";
    case "festivo": return "#E91E63";
    case "asuntos": return "#9C27B0";
    case "vacaciones": return "#f3780c";
    default: return "#607D8B";
  }
}

// ======================================================
// CAMBIO DE MIEMBRO
// ======================================================
document.getElementById("workMemberSelect")?.addEventListener("change", async (e)=>{

  const memberId = e.target.value;

  const calendar = document.getElementById("workCalendar");
  const placeholder = document.getElementById("workCalendarPlaceholder");

  window.selectedWorkMember = memberId;
  window.selectedRange = [];
  window.workDaysCache = {};

  if(!memberId){

    calendar.classList.add("hidden");
    placeholder.classList.remove("hidden");

    return;
  }

  placeholder.classList.add("hidden");
  calendar.classList.remove("hidden");

  // 🔹 CARGAR DATOS DEL MIEMBRO
  await loadWorkDaysForMember(memberId);

  // 🔹 REPINTAR TODAS LAS CELDAS VISIBLES
  const allCells = document.querySelectorAll('#workCalendar .fc-daygrid-day');

  allCells.forEach(cell => {

    const date = cell.getAttribute('data-date');
    repaintDay(date);

  });

  // 🔹 REFRESCAR CALENDARIO
  setTimeout(() => window.workCalendar.updateSize(), 80);

});



const placeholder = document.getElementById("workCalendarPlaceholder");
const mainPrompt = document.getElementById("mainPrompt");
const memberPrompt = document.getElementById("memberPrompt");
const motivacionText = document.getElementById("motivacionText");

const frasesMotivacion = [
  "¡Hoy será un gran día! 💪",
  "¡Tú puedes con todo! 🌟",
  "Sonríe y sigue adelante 😊",
  "Cada paso cuenta 🚀",
  "Haz de hoy un día increíble ✨",
  "La constancia vence lo difícil 🏆",
  "Actitud positiva = resultados positivos 🌈",
  "¡Vamos a por todas! 🔥",
  "Pequeños logros, grandes victorias 🏅",
  "Cree en ti y en tus turnos 💼"
];

// Función para mostrar placeholder si no hay miembro
function mostrarPlaceholder() {
  if(!window.selectedWorkMember){
    placeholder.classList.remove("hidden");

    // Frase aleatoria
    const randomIndex = Math.floor(Math.random() * frasesMotivacion.length);
    motivacionText.textContent = frasesMotivacion[randomIndex];

    // Asegurar que los textos fijos se muestren
    mainPrompt.style.display = "inline-block";
    motivacionText.style.display = "inline-block";
    memberPrompt.style.display = "block";

    // Ocultar calendario
    document.getElementById("workCalendar").classList.add("hidden");
  } else {
    placeholder.classList.add("hidden");
    document.getElementById("workCalendar").classList.remove("hidden");
  }
}

// Llamar cuando cambie el miembro
document.getElementById("workMemberSelect")?.addEventListener("change", async (e)=>{
  window.selectedWorkMember = e.target.value;
  window.selectedRange = [];
  window.workDaysCache = {};

  mostrarPlaceholder();

  if(window.selectedWorkMember){
    await loadWorkDaysForMember(window.selectedWorkMember);

    // Repintar celdas
    document.querySelectorAll('.fc-daygrid-day').forEach(cell => {
      const date = cell.getAttribute('data-date');
      repaintDay(date);
    });

    setTimeout(() => window.workCalendar.updateSize(), 80);
  }
});

// Llamar al iniciar calendario
document.addEventListener("DOMContentLoaded", mostrarPlaceholder);
// ======================================================
// INICIAR CALENDARIO
// ======================================================

document.addEventListener("DOMContentLoaded", ()=>initWorkCalendar());
