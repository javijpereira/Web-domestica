import { db } from "../firebase.js";
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "../firebase.js";

const $ = id => document.getElementById(id);
const panel = $("voiceAssistantPanel");
const status = $("voiceAssistantStatus");
const transcript = $("voiceAssistantTranscript");
const actions = $("voiceAssistantActions");
const recognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let busy = false;

function say(message) {
  if (status) status.textContent = message;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-ES";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }
}
function showTranscript(text) {
  if (!transcript) return;
  transcript.textContent = text;
  transcript.classList.remove("hidden");
}
function clearActions() { if (actions) { actions.innerHTML = ""; actions.classList.add("hidden"); } }
function addAction(label, handler, secondary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (secondary) button.className = "secondary";
  button.addEventListener("click", handler);
  actions.appendChild(button);
  actions.classList.remove("hidden");
}
function normalize(text) {
  return String(text || "").toLocaleLowerCase("es-ES").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,;]/g, " ").replace(/\s+/g, " ").trim();
}
function localKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
const months = {enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11};
function parseDate(text) {
  const t = normalize(text);
  const now = new Date();
  if (/\bpasado manana\b/.test(t)) { const d = new Date(); d.setDate(d.getDate()+2); return d; }
  if (/\bmanana\b/.test(t)) { const d = new Date(); d.setDate(d.getDate()+1); return d; }
  if (/\bhoy\b/.test(t)) return now;
  const match = t.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/);
  if (!match) return null;
  let year = match[3] ? Number(match[3]) : now.getFullYear();
  const date = new Date(year, months[match[2]], Number(match[1]));
  if (!match[3] && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setFullYear(year + 1);
  return date;
}
function getHouseholdId() { return window.currentHouseholdId || null; }
function formatDate(date) { return date.toLocaleDateString("es-ES", {weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
function currentMode() { return $("voiceCommandMode")?.value || "auto"; }

async function runCommand(rawText) {
  if (busy) return;
  const raw = String(rawText || "").trim();
  if (!raw) return;
  busy = true;
  clearActions();
  showTranscript(`«${raw}»`);
  try {
    const text = normalize(raw);
    const mode = currentMode();
    const shoppingIntent = mode === "shopping" || /\b(compra|lista de la compra|anade|agrega|mete|apunta|necesito comprar)\b/.test(text);
    if (shoppingIntent && /\b(anade|agrega|mete|apunta|quiero|necesito)\b/.test(text)) {
      await addShoppingItem(raw, text);
    } else if (/\b(trabaja|trabajar|turno|jornada laboral)\b/.test(text) || (mode === "calendar" && /\b(sara|mama|papa|miembro)\b/.test(text))) {
      await answerWorkQuery(raw, text);
    } else if (/\b(eventos?|agenda|pendiente|esta semana)\b/.test(text) && !/\b(anade|crea|nuevo|crear|apunta)\b/.test(text)) {
      await answerEventsQuery(text);
    } else if (/\b(anade|crea|crear|apunta|nuevo evento|evento)\b/.test(text)) {
      prepareEvent(raw, text);
    } else if (mode === "shopping") {
      await addShoppingItem(raw, text);
    } else {
      say("No he identificado la petición. Prueba a decir: añade leche a la compra, crea un evento o consulta los turnos.");
    }
  } catch (error) {
    console.error("Error en el asistente de voz:", error);
    say("No he podido completar la consulta. Comprueba tu conexión e inténtalo de nuevo.");
  } finally {
    busy = false;
  }
}

async function addShoppingItem(raw, normalized) {
  const listId = window.micasaGetCurrentListId?.();
  if (!listId) {
    say("Primero abre una lista de la compra. Después podré añadir el producto que me digas.");
    document.querySelector('[data-screen="compraScreen"]')?.click();
    return;
  }
  let cleaned = raw.replace(/^.*?\b(?:añade|anade|agrega|mete|apunta|quiero|necesito comprar)\b\s*/i, "").replace(/\s+a la lista.*$/i, "").replace(/\s+en la lista.*$/i, "").trim();
  if (!cleaned || normalize(cleaned) === normalize(raw)) cleaned = raw;
  let qty = "1";
  const numberWords = {un:"1",una:"1",uno:"1",dos:"2",tres:"3",cuatro:"4",cinco:"5",seis:"6",siete:"7",ocho:"8",nueve:"9",diez:"10"};
  const qtyMatch = normalize(cleaned).match(/^(\d+(?:[.,]\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)(?:\s+(kilos?|kg|gramos?|g|litros?|l|unidades?|paquetes?|botes?))?(?:\s+de)?\s+(.+)$/);
  if (qtyMatch && qtyMatch[3]) {
    const amount = numberWords[qtyMatch[1]] || qtyMatch[1].replace(",", ".");
    const unit = qtyMatch[2] ? ` ${qtyMatch[2]}` : "";
    qty = `${amount}${unit}`;
    cleaned = qtyMatch[3].trim();
  }
  cleaned = cleaned.replace(/\bpor favor\b/gi, "").trim();
  if (!cleaned) { say("No he entendido qué producto quieres añadir."); return; }
  await addDoc(collection(db, "shoppingLists", listId, "products"), { name: cleaned, qty, price: 0, completed: false, createdAt: serverTimestamp(), source: "voice" });
  window.dispatchEvent(new CustomEvent("micasa:shopping-updated"));
  say(`He añadido ${qty} de ${cleaned} a la lista de la compra.`);
}

async function answerWorkQuery(raw, text) {
  const householdId = getHouseholdId();
  if (!householdId) { say("No se ha cargado el hogar. Inicia sesión para consultar los turnos."); return; }
  const date = parseDate(text);
  if (!date) { say("Dime también la fecha. Por ejemplo: ¿Sara trabaja el 1 de abril?"); return; }
  const household = await getDoc(doc(db, "households", householdId));
  const memberMap = household.exists() ? household.data().members || {} : {};
  const members = [];
  for (const uid of Object.keys(memberMap)) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) members.push({uid, ...snap.data()});
  }
  const requested = text.match(/\b(?:trabaja|trabajar|turno de)\s+([a-zñáéíóú]+)/i)?.[1] || text.match(/\b([a-zñáéíóú]+)\s+(?:trabaja|tiene turno)\b/i)?.[1];
  let person = requested ? members.find(m => normalize(m.name || "").split(" ")[0] === requested) : null;
  if (!person && requested) person = members.find(m => normalize(m.name || "").includes(requested));
  if (!person && members.length === 1) person = members[0];
  if (!person) {
    say(requested ? `No encuentro a ${requested} entre los perfiles familiares.` : "¿De qué miembro de la familia quieres consultar el turno?");
    return;
  }
  const day = await getDoc(doc(db, "households", householdId, "workSchedules", person.uid, "days", localKey(date)));
  const shifts = day.exists() ? day.data().shifts || [] : [];
  if (!shifts.length) say(`${person.name || "Esta persona"} no tiene ningún turno registrado para el ${formatDate(date)}.`);
  else {
    const details = shifts.map(s => `${s.name || "turno"}${s.start && s.end ? ` de ${s.start} a ${s.end}` : ""}`).join(" y ");
    say(`Sí. ${person.name} tiene ${details} el ${formatDate(date)}.`);
  }
}

async function answerEventsQuery(text) {
  const householdId = getHouseholdId();
  if (!householdId) { say("Inicia sesión para consultar la agenda familiar."); return; }
  const snap = await getDocs(collection(db, "households", householdId, "events"));
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today);
  const weekday = start.getDay() || 7;
  start.setDate(start.getDate() - weekday + 1);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const events = snap.docs.map(d => ({id:d.id,...d.data()})).filter(e => {
    if (!e.date) return false;
    const d = new Date(`${e.date}T00:00:00`);
    return d >= today && d <= end;
  }).sort((a,b) => `${a.date} ${a.time||""}`.localeCompare(`${b.date} ${b.time||""}`));
  if (!events.length) { say("No tenéis eventos pendientes en los próximos siete días."); return; }
  const summary = events.slice(0,5).map(e => `${e.shortTitle || e.description || "Evento"}, ${new Date(`${e.date}T00:00:00`).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}${e.time ? ` a las ${e.time}` : ""}`).join(". ");
  say(`Tenéis ${events.length} ${events.length === 1 ? "evento" : "eventos"} en los próximos siete días. ${summary}${events.length > 5 ? ". Y hay más eventos en la agenda" : ""}.`);
}

function prepareEvent(raw, text) {
  const date = parseDate(text);
  if (!date) { say("Para crear el evento necesito la fecha. Di, por ejemplo: añade dentista el 3 de abril a las 17:00."); return; }
  const timeMatch = text.match(/\b(?:a las|a la)\s+(\d{1,2})(?::(\d{2}))?\b/);
  const time = timeMatch ? `${String(Number(timeMatch[1])).padStart(2,"0")}:${timeMatch[2] || "00"}` : "09:00";
  let title = raw.replace(/^.*?\b(?:añade|anade|crea|crear|apunta|nuevo evento|evento)\b\s*/i, "");
  title = title.replace(/^evento\s+/i, "").replace(/\s+el\s+\d{1,2}\s+de\s+\w+(?:\s+de\s+\d{4})?/i, "").replace(/\s+(?:a las|a la)\s+\d{1,2}(?::\d{2})?.*$/i, "").trim();
  if (!title) title = "Nuevo evento";
  const dateInput = $("eventDate");
  const timeInput = $("eventTime");
  const titleInput = $("eventShortTitle");
  const descriptionInput = $("eventDescription");
  if (dateInput) dateInput.value = localKey(date);
  if (timeInput) timeInput.value = time;
  if (titleInput) titleInput.value = title;
  if (descriptionInput) descriptionInput.value = title;
  $("addEventModal")?.classList.remove("hidden");
  say(`He preparado el evento ${title} para el ${formatDate(date)}${time ? ` a las ${time}` : ""}. Revísalo y pulsa Guardar para confirmarlo.`);
}

$("voiceAssistantToggle")?.addEventListener("click", () => panel?.classList.toggle("hidden"));
$("voiceShoppingBtn")?.addEventListener("click", () => {
  if ($("voiceCommandMode")) $("voiceCommandMode").value = "shopping";
  panel?.classList.remove("hidden");
  say("Dime qué producto quieres añadir a esta lista.");
});
$("voiceAssistantClose")?.addEventListener("click", () => panel?.classList.add("hidden"));
$("voiceTextSubmit")?.addEventListener("click", () => {
  const input = $("voiceCommandText");
  runCommand(input?.value || "");
  if (input) input.value = "";
});
$("voiceCommandText")?.addEventListener("keydown", e => { if (e.key === "Enter") $("voiceTextSubmit")?.click(); });
$("voiceStartBtn")?.addEventListener("click", () => {
  if (!recognitionApi) {
    say("El reconocimiento de voz no está disponible en este navegador. Puedes escribir la petición en el campo de arriba.");
    return;
  }
  if (!recognition) {
    recognition = new recognitionApi();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => runCommand(event.results[0][0].transcript);
    recognition.onerror = event => say(event.error === "not-allowed" ? "No tengo permiso para usar el micrófono. Actívalo en los permisos del navegador." : "No he podido entenderte. Prueba otra vez o escribe tu petición.");
    recognition.onend = () => { $("voiceStartBtn").disabled = false; $("voiceStartBtn").textContent = "🎙️ Hablar"; };
  }
  try {
    $("voiceStartBtn").disabled = true;
    $("voiceStartBtn").textContent = "Escuchando…";
    if (status) status.textContent = "Te escucho. ¿Qué necesitas?";
    recognition.start();
  } catch (err) {
    $("voiceStartBtn").disabled = false;
    $("voiceStartBtn").textContent = "🎙️ Hablar";
    say("El micrófono ya está activo. Espera un momento e inténtalo de nuevo.");
  }
});

window.addEventListener("micasa:household-ready", () => {
  $("voiceAssistant")?.classList.remove("hidden");
  if (status) status.textContent = "Listo. Pregúntame por la agenda, los turnos o añade productos hablando o escribiendo.";
});
onAuthStateChanged(auth, user => {
  if (!user) $("voiceAssistant")?.classList.add("hidden");
});
