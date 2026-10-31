import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const $ = id => document.getElementById(id);
const DEFAULTS = {eventsToday:true,eventsWeek:true,tasks:true,meals:true,work:true,family:true,shopping:true};
const LABELS = {eventsToday:"Eventos de hoy",eventsWeek:"Eventos de esta semana",tasks:"Tareas pendientes",meals:"Comida de hoy",work:"Calendario laboral familiar",family:"Nuestra familia",shopping:"Compra pendiente"};
const DEFAULT_ORDER = Object.keys(DEFAULTS);
let currentUid = null;
let preferences = {theme:"light",sections:{...DEFAULTS},order:[...DEFAULT_ORDER]};
let saveQueue = Promise.resolve();

function normalize(value={}) {
  const sections = {...DEFAULTS, ...(value.sections || {})};
  const incoming = Array.isArray(value.order) ? value.order.filter(k => DEFAULT_ORDER.includes(k)) : [];
  const order = [...incoming, ...DEFAULT_ORDER.filter(k => !incoming.includes(k))];
  return {theme:value.theme === "dark" ? "dark" : "light",sections,order};
}
function localKey(uid){ return `micasa-preferences-v2-${uid || "guest"}`; }
function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.body.dataset.theme = dark ? "dark" : "light";
  const toggle = $("darkModeToggle"); if(toggle) toggle.checked = dark;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = dark ? "#101827" : "#1764E8";
}
function applyDashboard() {
  const layout = $("dashboardLayout");
  if (!layout) return;
  const cards = new Map([...layout.querySelectorAll("[data-dashboard-section]")].map(el => [el.dataset.dashboardSection,el]));
  preferences.order.forEach(key => { const card=cards.get(key); if(card) layout.appendChild(card); });
  cards.forEach((card,key) => card.classList.toggle("dashboard-section-hidden", preferences.sections[key] === false));
  renderSettingsList();
}
function renderSettingsList() {
  const list = $("dashboardSettingsList"); if(!list) return;
  list.innerHTML = "";
  preferences.order.forEach((key,index) => {
    const row = document.createElement("div"); row.className="dashboard-setting-row";
    const label=document.createElement("label"); label.className="dashboard-setting-label";
    const checkbox=document.createElement("input"); checkbox.type="checkbox"; checkbox.checked=preferences.sections[key] !== false; checkbox.dataset.dashboardToggle=key;
    checkbox.addEventListener("change",()=>{preferences.sections[key]=checkbox.checked;applyDashboard();persist();});
    const text=document.createElement("span"); text.textContent=LABELS[key];
    label.append(checkbox,text);
    const actions=document.createElement("span"); actions.className="dashboard-order-actions";
    const up=document.createElement("button"); up.type="button"; up.className="dashboard-order-btn"; up.textContent="↑"; up.setAttribute("aria-label",`Subir ${LABELS[key]}`); up.disabled=index===0;
    up.addEventListener("click",()=>move(key,-1));
    const down=document.createElement("button"); down.type="button"; down.className="dashboard-order-btn"; down.textContent="↓"; down.setAttribute("aria-label",`Bajar ${LABELS[key]}`); down.disabled=index===preferences.order.length-1;
    down.addEventListener("click",()=>move(key,1));
    actions.append(up,down); row.append(label,actions); list.append(row);
  });
}
function move(key,delta){
  const index=preferences.order.indexOf(key), next=index+delta;
  if(index<0 || next<0 || next>=preferences.order.length) return;
  [preferences.order[index],preferences.order[next]]=[preferences.order[next],preferences.order[index]];
  applyDashboard(); persist();
}
function persist(){
  const snapshot=JSON.parse(JSON.stringify(preferences));
  if(currentUid) localStorage.setItem(localKey(currentUid),JSON.stringify(snapshot));
  const uid=currentUid;
  if(!uid) return;
  saveQueue=saveQueue.then(()=>setDoc(doc(db,"users",uid),{preferences:snapshot},{merge:true})).catch(err=>console.warn("No se pudieron sincronizar tus preferencias:",err));
}
async function loadForUser(user){
  currentUid=user?.uid || null;
  if(!user){preferences=normalize({});applyTheme(preferences.theme);applyDashboard();return;}
  let cached={};
  try{cached=JSON.parse(localStorage.getItem(localKey(currentUid))||"{}");}catch{}
  preferences=normalize(cached); applyTheme(preferences.theme); applyDashboard();
  try{
    const snap=await getDoc(doc(db,"users",currentUid));
    if(snap.exists()) preferences=normalize(snap.data().preferences || {});
    applyTheme(preferences.theme); applyDashboard();
    localStorage.setItem(localKey(currentUid),JSON.stringify(preferences));
  }catch(err){console.warn("Se mantienen las preferencias locales hasta poder sincronizarlas:",err);}
}

$("darkModeToggle")?.addEventListener("change",event=>{preferences.theme=event.target.checked?"dark":"light";applyTheme(preferences.theme);persist();});
$("resetDashboardSettings")?.addEventListener("click",()=>{preferences.sections={...DEFAULTS};preferences.order=[...DEFAULT_ORDER];applyDashboard();persist();});
onAuthStateChanged(auth, user=>{loadForUser(user).catch(err=>console.error("Error cargando preferencias personales",err));});
