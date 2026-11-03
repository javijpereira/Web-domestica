import { db, auth } from "../firebase.js";
import {
  collection, doc, getDoc, getDocs, addDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/*
 * Asistente contextual Mi Casa
 * - Entiende consultas cruzadas sin depender de la pantalla activa.
 * - Mantiene contexto de persona, fecha, lista y últimos temas.
 * - Permite preguntas de seguimiento ("¿y mañana?", "¿y Javi?").
 * - Resuelve compras, agenda, turnos y menú directamente desde Firestore.
 * Nota: el motor es local/reglado; no requiere API key ni envía datos familiares
 * a servicios externos de IA.
 */
const $ = id => document.getElementById(id);
const panel = $("voiceAssistantPanel"), status = $("voiceAssistantStatus");
const transcript = $("voiceAssistantTranscript"), actions = $("voiceAssistantActions");
const recognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, busy = false;
const context = {
  lastIntent: null, personId: null, personName: null, date: null,
  listId: null, listName: null, lastAnswer: null, history: []
};
const CONTEXT_STORAGE_KEY = "micasa_voice_context_v2";
try {
  const saved = JSON.parse(sessionStorage.getItem(CONTEXT_STORAGE_KEY) || "null");
  if (saved && typeof saved === "object") Object.assign(context, saved);
} catch (_) {}
function persistContext() {
  try { sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context)); } catch (_) {}
}
const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAY_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MONTHS = {enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11};
const NUMBERS = {un:"1",una:"1",uno:"1",dos:"2",tres:"3",cuatro:"4",cinco:"5",seis:"6",siete:"7",ocho:"8",nueve:"9",diez:"10"};

function say(message) {
  context.lastAnswer = message;
  if (status) status.textContent = message;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message);
    u.lang = "es-ES"; u.rate = 1; window.speechSynthesis.speak(u);
  }
}
function showTranscript(value) {
  if (transcript) { transcript.textContent = value; transcript.classList.remove("hidden"); }
}
function clearActions() { if (actions) { actions.innerHTML = ""; actions.classList.add("hidden"); } }
function norm(v) {
  return String(v || "").toLocaleLowerCase("es-ES").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ").trim();
}
function householdId() { return window.currentHouseholdId || null; }
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function dateAtMidnight(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function weekBounds(date = new Date()) {
  const start = dateAtMidnight(date);
  start.setDate(start.getDate() - ((start.getDay()+6)%7));
  const end = new Date(start); end.setDate(end.getDate()+6);
  return {start,end};
}
function dateLabel(d) {
  return d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
}
function parseDate(text, base = new Date()) {
  const t = norm(text), today = dateAtMidnight(base);
  if (/\bpasado manana\b/.test(t)) { const d=new Date(today); d.setDate(d.getDate()+2); return d; }
  if (/\bmanana\b/.test(t)) { const d=new Date(today); d.setDate(d.getDate()+1); return d; }
  if (/\bayer\b/.test(t)) { const d=new Date(today); d.setDate(d.getDate()-1); return d; }
  if (/\bhoy\b/.test(t)) return today;
  const named = t.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/);
  if (named) {
    let y = +(named[3] || today.getFullYear());
    let d = new Date(y, MONTHS[named[2]], +named[1]);
    if (!named[3] && d < today) d.setFullYear(y+1);
    return d;
  }
  const numeric = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (numeric) return new Date(+(numeric[3] || today.getFullYear()), +numeric[2]-1, +numeric[1]);
  for (const [name, idx] of Object.entries({domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6})) {
    if (new RegExp(`\\b${name}\\b`).test(t)) {
      const d = new Date(today), delta = (idx-d.getDay()+7)%7;
      d.setDate(d.getDate() + (delta || (/\bproximo\b/.test(t) ? 7 : 0)));
      return d;
    }
  }
  return null;
}
function isThisWeek(t) { return /\b(esta semana|esta semana|durante la semana|la semana)\b/.test(t); }
function dateRangeFromText(t) {
  const now = new Date();
  if (/\b(esta semana|esta semana)\b/.test(t)) return weekBounds(now);
  if (/\b(la semana que viene|proxima semana)\b/.test(t)) {
    const d = new Date(now); d.setDate(d.getDate()+7); return weekBounds(d);
  }
  const d = parseDate(t);
  return d ? {start:dateAtMidnight(d),end:dateAtMidnight(d)} : null;
}
async function getMembers() {
  const hid=householdId(); if(!hid) return [];
  const hs=await getDoc(doc(db,"households",hid));
  const map=hs.exists()?(hs.data().members||{}):{};
  const result=[];
  for (const uid of Object.keys(map)) {
    const us=await getDoc(doc(db,"users",uid));
    if(us.exists()) result.push({uid,...us.data()});
  }
  return result;
}
function matchPerson(members,text) {
  const t=norm(text);
  return members.find(m=>{
    const full=norm(m.name||m.displayName||"");
    if(!full) return false;
    return t.includes(full) || full.split(" ").some(w=>w.length>2 && new RegExp(`\\b${w}\\b`).test(t));
  });
}
function resolveDate(t) {
  const parsed=parseDate(t);
  if(parsed) { context.date=dateKey(parsed); return parsed; }
  if (/\b(ese dia|ese mismo dia|entonces|y ese dia)\b/.test(t) && context.date) {
    const d=new Date(`${context.date}T00:00:00`); return d;
  }
  if (/\b(y|para) (manana|pasado manana)\b/.test(t)) {
    const d=context.date?new Date(`${context.date}T00:00:00`):dateAtMidnight(new Date());
    d.setDate(d.getDate()+(t.includes("pasado")?2:1)); context.date=dateKey(d); return d;
  }
  return null;
}
function intentOf(t) {
  if (/\b(que hay en|que tenemos en|que falta en|que queda en|lista de la compra|lista de mercadona|ver la compra|productos de la lista)\b/.test(t)) return "shopping_read";
  if (/\b(anade|agrega|mete|apunta|incluye|pon|comprame|comprar)\b/.test(t) && /\b(lista|compra|mercadona|supermercado|kilo|litro|filetes|tomates|leche|pan)\b/.test(t)) return "shopping_add";
  if (/\b(cena|cenar|comida|comer|almuerzo|desayuno|menu|menus|que comemos|que cenamos)\b/.test(t)) return "menu";
  if (/\b(agenda|evento|eventos|cita|tenemos algo|que tenemos|que hay)\b/.test(t)) return "agenda";
  if (/\b(libra|libr(e|a)|descansa|descanso|dias libres|turno|trabaja|trabajar|horario laboral)\b/.test(t)) return "work";
  if (/\b(resumen|que tenemos hoy|que tenemos esta semana|plan de hoy|planificacion)\b/.test(t)) return "overview";
  if (/\b(anade|agrega|mete|apunta|crea|crear|nuevo evento)\b/.test(t)) return "create_event";
  return null;
}
function isFollowUp(t) {
  return /^(y |y si |y el |y la |y los |y las |entonces |¿y |tambien |¿tambien|ese dia|esa semana|mañana|manana|pasado mañana|pasado manana)/.test(t) ||
    /^(¿?y (mañana|manana|hoy|el lunes|el martes|el miercoles|el jueves|el viernes|el sabado|el domingo))/.test(t);
}
function splitRequests(raw) {
  // Separar órdenes explícitamente encadenadas, sin romper "añade pan y leche".
  return raw.replace(/\?\s*¿/g, "?|||¿")
    .split(/\|\|\||\s+(?:y ademas|ademas|tambien quiero|por otra parte|despues dime|y tenemos algo|y que hay|y dime)\s+/i)
    .map(x=>x.trim()).filter(Boolean);
}
async function runCommand(rawText) {
  if (busy) return;
  const raw=String(rawText||"").trim(); if(!raw) return;
  busy=true; clearActions(); showTranscript(`«${raw}»`);
  context.history.push({role:"user",text:raw,at:Date.now()});
  context.history=context.history.slice(-12);
  persistContext();
  try {
    const requests=splitRequests(raw), answers=[];
    for(const request of requests) {
      const t=norm(request);
      let intent=intentOf(t);
      if(!intent && isFollowUp(t) && context.lastIntent) intent=context.lastIntent;
      if(!intent && context.lastIntent==="work" && (resolveDate(t)||/\b(esta semana|y javi|y ella|y el)\b/.test(t))) intent="work";
      if(!intent && context.lastIntent==="agenda" && (resolveDate(t)||/\b(esta semana|y manana|y mañana)\b/.test(t))) intent="agenda";
      if(!intent && context.lastIntent==="menu" && (resolveDate(t)||/\b(esta semana|y manana|y mañana)\b/.test(t))) intent="menu";
      if(!intent && context.lastIntent==="shopping_read" && /\b(esa|la|misma) lista\b/.test(t)) intent="shopping_read";
      let result;
      switch(intent) {
        case "shopping_add": result=await addShoppingItem(request); break;
        case "shopping_read": result=await readShoppingList(request); break;
        case "work": result=await answerWork(request,t); break;
        case "agenda": result=await answerAgenda(request,t); break;
        case "menu": result=await answerMenu(request,t); break;
        case "overview": result=await answerOverview(); break;
        case "create_event": result=prepareEvent(request,t); break;
        default:
          if (isFollowUp(t) && context.lastIntent==="work") result=await answerWork(request,t);
          else result="Puedo consultar y cruzar compras, agenda, turnos y menús. Prueba: «¿Qué tiene Javi esta semana?» o «añade filetes a Mercadona».";
      }
      if(result) answers.push(result);
      if(intent) context.lastIntent=intent;
    }
    const response=answers.join(" ");
    if(response) say(response);
    persistContext();
  } catch(e) {
    console.error("Error en el asistente contextual:",e);
    say("He tenido un problema al consultar los datos de casa. Comprueba la conexión e inténtalo de nuevo.");
  } finally { busy=false; }
}

async function answerWork(raw,t) {
  const hid=householdId(); if(!hid) return "Inicia sesión para consultar los turnos.";
  const members=await getMembers();
  const person=matchPerson(members,t) || (context.personId?members.find(m=>m.uid===context.personId):null) || (members.length===1?members[0]:null);
  if(!person) return "¿De qué persona quieres consultar los turnos? Dime su nombre y lo tendré en cuenta para las siguientes preguntas.";
  context.personId=person.uid; context.personName=person.name||person.displayName;
  const range=dateRangeFromText(t);
  if(range && range.start.getTime()!==range.end.getTime()) {
    const days=[];
    for(let d=new Date(range.start);d<=range.end;d.setDate(d.getDate()+1)) {
      const snap=await getDoc(doc(db,"households",hid,"workSchedules",person.uid,"days",dateKey(d)));
      if(!snap.exists() || !(snap.data().shifts||[]).length) days.push(new Date(d));
    }
    return days.length?`${context.personName} tiene como días libres registrados: ${days.map(dateLabel).join(", ")}.`:`No encuentro días libres registrados para ${context.personName} en ese periodo.`;
  }
  const date=range?.start || resolveDate(t);
  if(!date) return `¿Quieres consultar los turnos de ${context.personName} hoy, en una fecha concreta o esta semana?`;
  const snap=await getDoc(doc(db,"households",hid,"workSchedules",person.uid,"days",dateKey(date)));
  if(!snap.exists() || !(snap.data().shifts||[]).length) return `Según el calendario, ${context.personName} no tiene ningún turno guardado el ${dateLabel(date)}. Parece que libra, aunque no hay un estado de día libre explícito.`;
  const shifts=snap.data().shifts;
  return `${context.personName} trabaja el ${dateLabel(date)}: ${shifts.map(s=>`${s.name||"turno"}${s.start&&s.end?` de ${s.start} a ${s.end}`:""}`).join(" y ")}.`;
}
async function answerAgenda(raw,t) {
  const hid=householdId(); if(!hid) return "Inicia sesión para consultar la agenda.";
  const snap=await getDocs(collection(db,"households",hid,"events"));
  let range=dateRangeFromText(t);
  if(!range) range={start:dateAtMidnight(new Date()),end:dateAtMidnight(new Date())};
  const events=snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>{
    if(!e.date) return false;
    const d=new Date(`${e.date}T00:00:00`); return d>=range.start&&d<=range.end;
  }).sort((a,b)=>`${a.date} ${a.time||""}`.localeCompare(`${b.date} ${b.time||""}`));
  const period=range.start.getTime()===range.end.getTime()?dateLabel(range.start):`del ${dateLabel(range.start)} al ${dateLabel(range.end)}`;
  if(!events.length) return `No tenéis eventos apuntados en la agenda ${period}.`;
  return `Tenéis ${events.length} ${events.length===1?"evento":"eventos"} ${period}: ${events.slice(0,8).map(e=>`${e.shortTitle||e.description||"Evento"}, ${dateLabel(new Date(`${e.date}T00:00:00`))}${e.time?` a las ${e.time}`:""}`).join("; ")}${events.length>8?". Hay más eventos":""}.`;
}
async function answerMenu(raw,t) {
  const hid=householdId(); if(!hid) return "Inicia sesión para consultar el menú.";
  const date=resolveDate(t)||dateAtMidnight(new Date()), day=DAY_KEYS[date.getDay()];
  const {start}=weekBounds(date), weekId=dateKey(start);
  const snap=await getDoc(doc(db,"households",hid,"menus",weekId));
  if(!snap.exists()) return `No hay un menú semanal guardado para la semana del ${dateLabel(start)}.`;
  const data=snap.data(), meals=data[day]||{};
  const asksLunch=/comida|comer|almuerzo/.test(norm(t)) && !/cena|cenar/.test(norm(t));
  if(asksLunch) return meals.lunch?`${dateLabel(date)} tenéis ${meals.lunch} para comer.`:`No hay comida apuntada para ${dateLabel(date)}.`;
  if(/menu|menus|semana/.test(norm(t)) && !/cena|cenar|comida|comer/.test(norm(t))) {
    const labels=[];
    for(let i=0;i<7;i++){const d=new Date(start);d.setDate(d.getDate()+i);const m=data[DAY_KEYS[d.getDay()]]||{};if(m.lunch||m.dinner)labels.push(`${DAY_ES[d.getDay()]}: comida ${m.lunch||"sin apuntar"} y cena ${m.dinner||"sin apuntar"}`);}
    return labels.length?`Este es el menú de la semana: ${labels.join("; ")}.`:"El menú de esta semana está vacío.";
  }
  const meal= /desayuno/.test(norm(t))?"breakfast":"dinner";
  return meals[meal]?`${meal==="dinner"?"Para cenar":"Para desayunar"} ${dateLabel(date)} tenéis ${meals[meal]}.`:`No hay ${meal==="dinner"?"cena":"desayuno"} apuntada para ${dateLabel(date)}.`;
}
async function getShoppingLists() {
  const hid=householdId(); if(!hid) return [];
  const snap=await getDocs(query(collection(db,"shoppingLists"),where("householdId","==",hid)));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}
function pickList(lists,t) {
  const named=lists.find(l=>norm(t).includes(norm(l.name||"")));
  if(named) return named;
  if(context.listId) return lists.find(l=>l.id===context.listId)||null;
  const current=window.micasaGetCurrentListId?.();
  return lists.find(l=>l.id===current)|| (lists.length===1?lists[0]:null);
}
async function addShoppingItem(raw) {
  const lists=await getShoppingLists();
  const list=pickList(lists,norm(raw).includes("mercadona")?"mercadona":raw);
  if(!list) return lists.length?"¿A qué lista lo añado? Dime, por ejemplo, «a Mercadona».":"Todavía no hay listas de la compra creadas.";
  let item=raw.replace(/^.*?\b(?:añade(?:me)?|anade(?:me)?|agrega(?:me)?|mete|apunta|incluye|pon|comprame|comprar|necesito)\b\s*/i,"");
  item=item.replace(/\s+(?:en|a)\s+(?:la\s+)?lista(?:\s+de\s+[\wáéíóúñ ]+)?\s*$/i,"").replace(/\s+de\s+mercadona\s*$/i,"").replace(/\s+por favor\s*$/i,"").trim();
  item=item.replace(/^(?:a|en)\s+la\s+lista\s+(?:de\s+)?[\wáéíóúñ ]+\s+/i,"").trim();
  let qty="1";
  const q=norm(item).match(/^(\d+(?:[.,]\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)(?:\s+(kilos?|kg|gramos?|g|litros?|l|unidades?|paquetes?|botes?))?(?:\s+de)?\s+(.+)$/);
  if(q){qty=`${NUMBERS[q[1]]||q[1].replace(",",".")}${q[2]?` ${q[2]}`:""}`;item=q[3];}
  if(!item) return "¿Qué producto quieres que añada?";
  await addDoc(collection(db,"shoppingLists",list.id,"products"),{
    name:item,qty,price:0,completed:false,createdAt:serverTimestamp(),source:"voice"
  });
  context.listId=list.id;context.listName=list.name;
  window.dispatchEvent(new CustomEvent("micasa:shopping-updated"));
  return `He añadido ${qty} ${item} a ${list.name}.`;
}
async function readShoppingList(raw) {
  const lists=await getShoppingLists();
  const list=pickList(lists,raw);
  if(!list) return lists.length?`¿Qué lista quieres consultar? Tienes: ${lists.map(l=>l.name).join(", ")}.`:"No hay listas de la compra creadas.";
  context.listId=list.id;context.listName=list.name;
  const snap=await getDocs(collection(db,"shoppingLists",list.id,"products"));
  const products=snap.docs.map(d=>d.data()).filter(p=>!p.completed);
  return products.length?`En ${list.name} quedan ${products.length} productos: ${products.slice(0,15).map(p=>`${p.qty||"1"} ${p.name}`).join(", ")}${products.length>15?". Y algunos más":""}.`:`La lista ${list.name} está vacía o todos sus productos están marcados como comprados.`;
}
async function answerOverview() {
  const parts=await Promise.all([answerAgenda("hoy","hoy"),answerMenu("cena de hoy","hoy")]);
  return parts.join(" Además, ");
}
function prepareEvent(raw,t) {
  const date=resolveDate(t);
  if(!date) return "Para preparar el evento necesito una fecha. Por ejemplo: «añade dentista mañana a las cinco».";
  const tm=t.match(/\b(?:a las|a la)\s+(\d{1,2})(?::(\d{2}))?\b/);
  const time=tm?`${String(+tm[1]).padStart(2,"0")}:${tm[2]||"00"}`:"09:00";
  const title=raw.replace(/^.*?\b(?:añade(?:me)?|anade(?:me)?|crea|crear|apunta|nuevo evento|evento)\b\s*/i,"")
    .replace(/\s+el\s+.+$/i,"").replace(/\s+(?:mañana|manana|hoy)\b.*$/i,"").replace(/\s+(?:a las|a la)\s+\d{1,2}(?::\d{2})?.*$/i,"").trim()||"Nuevo evento";
  if($("eventDate"))$("eventDate").value=dateKey(date);
  if($("eventTime"))$("eventTime").value=time;
  if($("eventShortTitle"))$("eventShortTitle").value=title;
  document.querySelector('[data-screen="agendaScreen"]')?.click();
  $("eventModal")?.classList.remove("hidden");
  return `He preparado «${title}» para el ${dateLabel(date)} a las ${time}. Revísalo y pulsa Guardar para confirmarlo.`;
}

$("voiceAssistantToggle")?.addEventListener("click",()=>panel?.classList.toggle("hidden"));
$("voiceShoppingBtn")?.addEventListener("click",()=>{if($("voiceCommandMode"))$("voiceCommandMode").value="auto";panel?.classList.remove("hidden");$("voiceCommandText")?.focus();});
$("voiceAssistantClose")?.addEventListener("click",()=>panel?.classList.add("hidden"));
$("voiceTextSubmit")?.addEventListener("click",()=>{const input=$("voiceCommandText");if(input?.value.trim()){runCommand(input.value);input.value="";}});
$("voiceCommandText")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("voiceTextSubmit")?.click();});
$("voiceStartBtn")?.addEventListener("click",()=>{
  if(!recognitionApi){say("El reconocimiento de voz no está disponible en este navegador. Puedes escribir tu petición.");return;}
  if(!recognition){
    recognition=new recognitionApi();recognition.lang="es-ES";recognition.interimResults=false;recognition.maxAlternatives=3;
    recognition.onresult=e=>{
      const alternatives=Array.from(e.results[0]||[]).map(x=>x.transcript);
      const best=alternatives.sort((a,b)=>intentOf(norm(b))?1:0)[0]||alternatives[0];
      runCommand(best);
    };
    recognition.onerror=e=>say(e.error==="not-allowed"?"No tengo permiso para usar el micrófono. Actívalo en el navegador.":"No he podido entenderte. Prueba otra vez o escribe tu petición.");
    recognition.onend=()=>{$("voiceStartBtn").disabled=false;$("voiceStartBtn").textContent="🎙️ Hablar";};
  }
  try{$("voiceStartBtn").disabled=true;$("voiceStartBtn").textContent="Escuchando…";if(status)status.textContent="Te escucho. Puedes preguntarme por cualquier cosa de casa.";recognition.start();}
  catch(e){$("voiceStartBtn").disabled=false;$("voiceStartBtn").textContent="🎙️ Hablar";say("El micrófono ya está activo. Espera un momento e inténtalo de nuevo.");}
});
window.addEventListener("micasa:household-ready",()=>{
  $("voiceAssistant")?.classList.remove("hidden");
  if(status)status.textContent="Asistente listo. Puedo cruzar compras, agenda, turnos y menús. Recuerdo el contexto de la conversación.";
});
onAuthStateChanged(auth,user=>{if(!user)$("voiceAssistant")?.classList.add("hidden");});
