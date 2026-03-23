console.log("Menu semanal iniciado");

import { doc, setDoc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// ======================================================
// VARIABLES MODAL
// ======================================================

let currentMealDay = null;
let currentMealType = null;

const mealModal = document.getElementById("mealModal");
const mealInput = document.getElementById("mealInput");

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];


// ======================================================
// EDITAR COMIDA / CENA
// ======================================================

document.querySelectorAll(".editable-meal").forEach(meal => {

  meal.addEventListener("click", () => {

    currentMealDay = meal.dataset.day;
    currentMealType = meal.dataset.type;

    mealInput.value = meal.querySelector("span").textContent;

    mealModal.classList.remove("hidden");

  });

});

document.getElementById("closeMealModal").onclick = () => {

  mealModal.classList.add("hidden");

};

document.getElementById("saveMealBtn").onclick = () => {

  const mealText = mealInput.value;

  const mealDiv = document.querySelector(
    `.editable-meal[data-day="${currentMealDay}"][data-type="${currentMealType}"] span`
  );

  if(mealDiv){
    mealDiv.textContent = mealText;
  }

  mealModal.classList.add("hidden");

  saveMenuToFirebase();

};


// ======================================================
// CALENDARIO SEMANAL
// ======================================================

let currentWeekStart = getStartOfWeek(new Date());

function getStartOfWeek(date){

  const d = new Date(date);
  const day = d.getDay() || 7;

  if(day !== 1){
    d.setHours(-24 * (day - 1));
  }

  return d;

}

function getWeekId(){

  const d = new Date(currentWeekStart);
  return d.toISOString().split("T")[0];

}

function formatDate(date){

  return date.toLocaleDateString("es-ES",{
    day:"numeric",
    month:"short"
  });

}

function updateWeekHeader(){

  const start = new Date(currentWeekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  document.getElementById("weekRange").textContent =
  `${formatDate(start)} - ${formatDate(end)}`;

  updateDayNumbers(start);

}

function updateDayNumbers(start){

  const daysDiv = document.querySelectorAll(".menu-day");

  daysDiv.forEach((dayDiv,index)=>{

    const d = new Date(start);
    d.setDate(start.getDate() + index);

    const dayName = d.toLocaleDateString("es-ES",{weekday:"long"});
    const dayNumber = d.getDate();

    dayDiv.querySelector("h3").textContent =
    `${dayName.charAt(0).toUpperCase()+dayName.slice(1)} ${dayNumber}`;

  });

}

document.getElementById("prevWeekBtn").onclick = () => {

  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  updateWeekHeader();
  loadMenuFromFirebase();

};

document.getElementById("nextWeekBtn").onclick = () => {

  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  updateWeekHeader();
  loadMenuFromFirebase();

};

updateWeekHeader();
loadMenuFromFirebase();



// ======================================================
// GUARDAR MENU EN FIREBASE
// ======================================================



async function saveMenuToFirebase(){

  const weekId = getWeekId();

  const data = {};

  days.forEach(day => {

    const lunch = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="lunch"] span`
    )?.textContent || "";

    const dinner = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="dinner"] span`
    )?.textContent || "";

    data[day] = {
      lunch,
      dinner
    };

  });

  await setDoc(
    doc(db,"menus",weekId),
    data
  );

}


// ======================================================
// CARGAR MENU DESDE FIREBASE
// ======================================================

async function loadMenuFromFirebase(){

  const weekId = getWeekId();

  clearMenu();

  const ref = doc(db,"menus",weekId);
  const snap = await getDoc(ref);

  if(!snap.exists()) return;

  const data = snap.data();

  // 👇 Recorremos SIEMPRE los 7 días
  days.forEach(day => {

    const lunch = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="lunch"] span`
    );

    const dinner = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="dinner"] span`
    );

    if(lunch) lunch.textContent = data[day]?.lunch || "";
    if(dinner) dinner.textContent = data[day]?.dinner || "";

  });

}

// ======================================================
// GENERADOR DE MENUS
// ======================================================

const weeklyMenus = {

  rapido: [
    {comida:"Pasta con tomate", cena:"Tortilla francesa"},
    {comida:"Arroz con pollo", cena:"Ensalada mixta"},
    {comida:"Lentejas", cena:"Sandwich vegetal"},
    {comida:"Pollo al horno", cena:"Crema de calabacín"},
    {comida:"Hamburguesa casera", cena:"Ensalada de atún"},
    {comida:"Pizza casera", cena:"Revuelto de champiñones"},
    {comida:"Paella", cena:"Cena ligera"}
  ]

};


// ======================================================
// MENÚ SEMANAL SALUDABLE
// ======================================================

weeklyMenus.saludable = [
  { comida:"Pollo al horno con verduras", cena:"Salmón al horno con ensalada" },
  { comida:"Arroz con marisco", cena:"Filete de ternera a la plancha con verduras" },
  { comida:"Pechuga de pollo a la plancha con patata cocida", cena:"Merluza al vapor con ensalada" },
  { comida:"Lentejas con verduras y chorizo", cena:"Pollo a la plancha con ensalada mixta" },
  { comida:"Espaguetis integrales con boloñesa de carne", cena:"Sopa de pescado con pan integral" },
  { comida:"Paella de pollo y verduras", cena:"Gambas al ajillo con ensalada" },
  { comida:"Albóndigas en salsa de tomate con arroz", cena:"Lubina al horno con verduras" }
];

document.getElementById("menuSaludable").addEventListener("click", () => {
  generateMenu("saludable");
});


// ======================================================
// APLICAR MENU AUTOMATICO
// ======================================================

window.generateMenu = function(type){

  const menu = weeklyMenus[type];
  if(!menu) return;

  menu.forEach((dayMenu,index)=>{

    const day = days[index];

    const comida = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="lunch"] span`
    );

    const cena = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="dinner"] span`
    );

    if(comida) comida.textContent = dayMenu.comida;
    if(cena) cena.textContent = dayMenu.cena;

  });

  saveMenuToFirebase();

};


// ======================================================
// BOTONES IDEAS MENU
// ======================================================

document.getElementById("menuRapido").addEventListener("click", () => {
  generateMenu("rapido");
});


// ======================================================
// MENU ALEATORIO
// ======================================================

const recipePool = [

{comida:"Lentejas", cena:"Tortilla francesa"},
{comida:"Arroz con pollo", cena:"Ensalada mixta"},
{comida:"Macarrones boloñesa", cena:"Sandwich vegetal"},
{comida:"Pollo al horno", cena:"Crema de calabacín"},
{comida:"Hamburguesa casera", cena:"Ensalada de atún"},
{comida:"Pizza casera", cena:"Revuelto de champiñones"},
{comida:"Paella", cena:"Cena ligera"},
{comida:"Garbanzos con espinacas", cena:"Tosta de aguacate"},
{comida:"Albóndigas con arroz", cena:"Ensalada de pollo"},
{comida:"Pasta pesto", cena:"Tortilla de calabacín"}

];

function generateRandomMenu(){

recipePool.sort(() => Math.random() - 0.5);

recipePool.slice(0,7).forEach((dayMenu,index)=>{

const day = days[index];

const comida = document.querySelector(
`.editable-meal[data-day="${day}"][data-type="lunch"] span`
);

const cena = document.querySelector(
`.editable-meal[data-day="${day}"][data-type="dinner"] span`
);

if(comida) comida.textContent = dayMenu.comida;
if(cena) cena.textContent = dayMenu.cena;

});

saveMenuToFirebase();

}

document.getElementById("randomMenuBtn")
.addEventListener("click",generateRandomMenu);

// ======================================================
// QUE PUEDO COCINAR CON LO QUE TENGO
// ======================================================

const recipes = [
{name:"Tortilla de patatas", type:"cena", ingredients:["huevo","patata","cebolla"]},
{name:"Huevos rotos con jamón", type:"cena", ingredients:["huevo","patata","jamón"]},
{name:"Revuelto de champiñones", type:"cena", ingredients:["huevo","champiñón","aceite"]},
{name:"Tortilla francesa", type:"cena", ingredients:["huevo","aceite"]},
{name:"Ensalada mixta", type:"cena", ingredients:["lechuga","tomate","cebolla","atún"]},
{name:"Ensalada César", type:"cena", ingredients:["lechuga","pollo","queso"]},
{name:"Ensalada de pasta", type:"cena", ingredients:["pasta","atún","maíz"]},
{name:"Ensalada de arroz", type:"cena", ingredients:["arroz","atún","tomate"]},
{name:"Arroz blanco", type:"comida", ingredients:["arroz","agua","sal"]},
{name:"Arroz con pollo", type:"comida", ingredients:["arroz","pollo","pimiento","cebolla"]},
{name:"Paella valenciana", type:"comida", ingredients:["arroz","pollo","conejo","judías"]},
{name:"Paella de marisco", type:"comida", ingredients:["arroz","marisco","pimiento","azafrán"]},
{name:"Fideuá de marisco", type:"comida", ingredients:["fideos","marisco","caldo"]},
{name:"Lentejas estofadas", type:"comida", ingredients:["lentejas","chorizo","zanahoria","patata"]},
{name:"Garbanzos con espinacas", type:"comida", ingredients:["garbanzos","espinaca","ajo"]},
{name:"Cocido madrileño", type:"comida", ingredients:["garbanzos","carne","chorizo","verduras"]},
{name:"Potaje de vigilia", type:"comida", ingredients:["garbanzos","bacalao","espinaca"]},
{name:"Sopa de verduras", type:"cena", ingredients:["zanahoria","puerro","patata","apio"]},
{name:"Sopa de pollo", type:"cena", ingredients:["pollo","fideos","zanahoria"]},
{name:"Crema de calabacín", type:"cena", ingredients:["calabacín","cebolla","nata"]},
{name:"Crema de calabaza", type:"cena", ingredients:["calabaza","zanahoria","patata"]},
{name:"Crema de champiñones", type:"cena", ingredients:["champiñón","cebolla","nata"]},
{name:"Crema de zanahoria", type:"cena", ingredients:["zanahoria","patata","nata"]},
{name:"Gazpacho andaluz", type:"cena", ingredients:["tomate","pepino","pimiento","aceite"]},
{name:"Salmorejo cordobés", type:"cena", ingredients:["tomate","pan","ajo","aceite"]},
{name:"Salpicón de marisco", type:"cena", ingredients:["marisco","cebolla","pimiento"]},
{name:"Merluza a la plancha", type:"cena", ingredients:["merluza","aceite","sal"]},
{name:"Filetes de merluza rebozados", type:"cena", ingredients:["merluza","huevo","pan rallado"]},
{name:"Salmón al horno", type:"comida", ingredients:["salmón","limón","aceite"]},
{name:"Bacalao al pil‑pil", type:"cena", ingredients:["bacalao","aceite","ajo"]},
{name:"Bacalao a la vizcaína", type:"comida", ingredients:["bacalao","tomate","pimiento"]},
{name:"Pulpo a la gallega", type:"cena", ingredients:["pulpo","patata","pimentón"]},
{name:"Calamares a la romana", type:"cena", ingredients:["calamar","huevo","harina"]},
{name:"Mejillones al vapor", type:"cena", ingredients:["mejillones","vino blanco","ajo"]},
{name:"Chorizo a la sidra", type:"cena", ingredients:["chorizo","sidra"]},
{name:"Croquetas de jamón", type:"cena", ingredients:["jamón","harina","huevo"]},
{name:"Croquetas de pollo", type:"cena", ingredients:["pollo","harina","huevo"]},
{name:"Croquetas de espinacas", type:"cena", ingredients:["espinaca","harina","huevo"]},
{name:"Empanada gallega", type:"comida", ingredients:["masa","atún","huevo"]},
{name:"Bocadillo mixto", type:"cena", ingredients:["pan","jamón","queso"]},
{name:"Tosta de aguacate", type:"cena", ingredients:["pan","aguacate"]},
{name:"Tosta de jamón", type:"cena", ingredients:["pan","jamón"]},
{name:"Tosta de queso", type:"cena", ingredients:["pan","queso"]},
{name:"Sandwich vegetal", type:"cena", ingredients:["pan","lechuga","tomate"]},
{name:"Sandwich de pollo", type:"cena", ingredients:["pan","pollo","lechuga"]},
{name:"Sándwich mixto", type:"cena", ingredients:["pan","jamón","queso"]},
{name:"Pizza margarita", type:"comida", ingredients:["masa","tomate","queso"]},
{name:"Pizza pepperoni", type:"comida", ingredients:["masa","tomate","queso","pepperoni"]},
{name:"Pizza hawaiana", type:"comida", ingredients:["masa","tomate","queso","piña"]},
{name:"Pizza cuatro quesos", type:"comida", ingredients:["masa","queso","oregano"]},
{name:"Espaguetis boloñesa", type:"comida", ingredients:["pasta","carne","tomate"]},
{name:"Espaguetis carbonara", type:"comida", ingredients:["pasta","huevo","queso"]},
{name:"Pasta con tomate", type:"comida", ingredients:["pasta","tomate"]},
{name:"Pasta pesto", type:"comida", ingredients:["pasta","pesto","queso"]},
{name:"Macarrones con queso", type:"comida", ingredients:["pasta","queso"]},
{name:"Macarrones boloñesa", type:"comida", ingredients:["pasta","carne","tomate"]},
{name:"Lasaña de carne", type:"comida", ingredients:["pasta","carne","queso"]},
{name:"Lasaña de verduras", type:"comida", ingredients:["pasta","verduras","queso"]},
{name:"Canelones de carne", type:"comida", ingredients:["pasta","carne","queso"]},
{name:"Canelones de espinacas", type:"comida", ingredients:["pasta","espinaca","queso"]},
{name:"Gnocchi con salsa", type:"comida", ingredients:["gnocchi","tomate","queso"]},
{name:"Raviolis de ricotta", type:"comida", ingredients:["pasta","ricotta","tomate"]},
{name:"Tortellini con crema", type:"comida", ingredients:["pasta","nata","queso"]},
{name:"Arroz tres delicias", type:"comida", ingredients:["arroz","huevo","guisantes"]},
{name:"Arroz a la cubana", type:"comida", ingredients:["arroz","huevo","plátano"]},
{name:"Arroz con verduras", type:"comida", ingredients:["arroz","verduras"]},
{name:"Arroz negro", type:"comida", ingredients:["arroz","sepia","tinta"]},
{name:"Arroz con leche", type:"cena", ingredients:["arroz","leche","azúcar"]},
{name:"Paella de verduras", type:"comida", ingredients:["arroz","verduras"]},
{name:"Paella mixta", type:"comida", ingredients:["arroz","carne","marisco"]},
{name:"Fideuá de verduras", type:"comida", ingredients:["fideos","verduras"]},
{name:"Fabada asturiana", type:"comida", ingredients:["fabes","chorizo","morcilla"]},
{name:"Cazuela de mariscos", type:"comida", ingredients:["marisco","tomate"]},
{name:"Estofado de ternera", type:"comida", ingredients:["ternera","patata","cebolla"]},
{name:"Estofado de cordero", type:"comida", ingredients:["cordero","patata"]},
{name:"Carrilleras al vino tinto", type:"comida", ingredients:["carrilleras","vino tinto"]},
{name:"Solomillo al horno", type:"comida", ingredients:["solomillo","aceite"]},
{name:"Lomo de cerdo a la plancha", type:"comida", ingredients:["lomo","sal"]},
{name:"Costillas barbacoa", type:"comida", ingredients:["costillas","barbacoa"]},
{name:"Albóndigas en salsa", type:"comida", ingredients:["carne","tomate","huevo"]},
{name:"Filetes rusos", type:"comida", ingredients:["carne","huevo"]},
{name:"Hamburguesa casera", type:"comida", ingredients:["carne","pan"]},
{name:"Salmón a la plancha", type:"comida", ingredients:["salmón","aceite","limón"]},
{name:"Salmón al horno con verduras", type:"comida", ingredients:["salmón","zanahoria","calabacín"]},
{name:"Bacalao al horno", type:"comida", ingredients:["bacalao","patata","pimiento"]},
{name:"Bacalao con tomate", type:"comida", ingredients:["bacalao","tomate","cebolla"]},
{name:"Merluza en salsa verde", type:"comida", ingredients:["merluza","ajo","perejil"]},
{name:"Merluza rellena", type:"comida", ingredients:["merluza","gambas","huevo"]},
{name:"Calamares rellenos", type:"comida", ingredients:["calamar","carne","huevo"]},
{name:"Chipirones a la plancha", type:"cena", ingredients:["chipirón","aceite","sal"]},
{name:"Pulpo a la gallega", type:"cena", ingredients:["pulpo","patata","pimentón"]},
{name:"Gambas al ajillo", type:"cena", ingredients:["gambas","ajo","aceite"]},
{name:"Langostinos a la plancha", type:"cena", ingredients:["langostinos","aceite","sal"]},
{name:"Camarones al horno", type:"cena", ingredients:["camarón","aceite","limón"]},
{name:"Paella de marisco", type:"comida", ingredients:["arroz","marisco","pimiento","azafrán"]},
{name:"Fideuá de marisco", type:"comida", ingredients:["fideos","marisco","caldo"]},
{name:"Arroz con bogavante", type:"comida", ingredients:["arroz","bogavante","pimiento"]},
{name:"Arroz con calamares", type:"comida", ingredients:["arroz","calamares","tomate"]},
{name:"Estofado de ternera", type:"comida", ingredients:["ternera","patata","cebolla"]},
{name:"Estofado de cordero", type:"comida", ingredients:["cordero","patata","zanahoria"]},
{name:"Carrilleras al vino tinto", type:"comida", ingredients:["carrilleras","vino tinto","cebolla"]},
{name:"Solomillo al horno", type:"comida", ingredients:["solomillo","aceite","ajo"]},
{name:"Lomo de cerdo a la plancha", type:"comida", ingredients:["lomo","sal","pimienta"]},
{name:"Costillas al horno", type:"comida", ingredients:["costillas","barbacoa","ajo"]},
{name:"Albóndigas en salsa", type:"comida", ingredients:["carne","tomate","huevo"]},
{name:"Filetes rusos", type:"comida", ingredients:["carne","huevo"]},
{name:"Hamburguesa casera", type:"comida", ingredients:["carne","pan","queso"]},
{name:"Pollo al horno", type:"comida", ingredients:["pollo","ajo","aceite"]},
{name:"Pollo al curry", type:"comida", ingredients:["pollo","curry","nata"]},
{name:"Pollo con champiñones", type:"comida", ingredients:["pollo","champiñón","cebolla"]},
{name:"Pollo a la cerveza", type:"comida", ingredients:["pollo","cerveza","cebolla"]},
{name:"Pollo en salsa de almendras", type:"comida", ingredients:["pollo","almendras","nata"]},
{name:"Pollo en salsa de mostaza", type:"comida", ingredients:["pollo","mostaza","nata"]},
{name:"Conejo al ajillo", type:"comida", ingredients:["conejo","ajo","aceite"]},
{name:"Ternera guisada", type:"comida", ingredients:["ternera","patata","zanahoria"]},
{name:"Ternera al horno", type:"comida", ingredients:["ternera","aceite","romero"]},
{name:"Chuletas de cordero a la plancha", type:"comida", ingredients:["chuleta","sal","pimienta"]},
{name:"Codillo al horno", type:"comida", ingredients:["codillo","ajo","vino blanco"]},
{name:"Costillas barbacoa", type:"comida", ingredients:["costillas","salsa barbacoa"]},
{name:"Carne guisada con verduras", type:"comida", ingredients:["carne","patata","zanahoria"]},
{name:"Filete de ternera a la plancha", type:"cena", ingredients:["ternera","aceite","sal"]},
{name:"Lomo de cerdo al horno", type:"comida", ingredients:["lomo","ajo","pimienta"]},
{name:"Jamón asado", type:"comida", ingredients:["jamón","miel","vino blanco"]},
{name:"Codornices al horno", type:"comida", ingredients:["codorniz","ajo","vino blanco"]},
{name:"Pollo relleno", type:"comida", ingredients:["pollo","jamón","queso"]},
{name:"Pollo frito", type:"comida", ingredients:["pollo","harina","aceite"]},
{name:"Alitas de pollo al horno", type:"cena", ingredients:["alitas","sal","pimienta"]},
{name:"Carne asada con verduras", type:"comida", ingredients:["carne","patata","zanahoria"]},
{name:"Chuletas de cerdo a la plancha", type:"comida", ingredients:["chuleta","sal","aceite"]},
{name:"Pechuga de pollo rellena", type:"comida", ingredients:["pollo","jamón","queso"]},
{name:"Pollo a la naranja", type:"comida", ingredients:["pollo","naranja","salsa soja"]},
{name:"Sopa de pescado", type:"cena", ingredients:["pescado","marisco","verduras"]},
{name:"Caldo gallego", type:"cena", ingredients:["grelos","patata","chorizo","costilla"]},
{name:"Crema de marisco", type:"cena", ingredients:["marisco","nata","verduras"]},
{name:"Clam chowder española", type:"cena", ingredients:["almejas","patata","nata"]},
{name:"Guiso de rape", type:"comida", ingredients:["rape","patata","tomate"]},
{name:"Merluza en salsa de limón", type:"cena", ingredients:["merluza","limón","aceite"]},
{name:"Salmón en papillote", type:"cena", ingredients:["salmón","verduras","limón"]},
{name:"Trucha a la navarra", type:"cena", ingredients:["trucha","jamón","aceite"]},
{name:"Lenguado a la meunière", type:"cena", ingredients:["lenguado","mantequilla","limón"]},
{name:"Lubina al horno", type:"cena", ingredients:["lubina","aceite","limón"]},
{name:"Dorada a la sal", type:"cena", ingredients:["dorada","sal","limón"]},
{name:"Atún a la plancha", type:"cena", ingredients:["atún","aceite","sal"]},
{name:"Tartar de atún", type:"cena", ingredients:["atún","aguacate","soja"]},
{name:"Pulpo a la gallega", type:"cena", ingredients:["pulpo","patata","pimentón"]},
{name:"Sepia a la plancha", type:"cena", ingredients:["sepia","aceite","sal"]},
{name:"Arroz con marisco", type:"comida", ingredients:["arroz","marisco","pimiento"]},
{name:"Fideuá de pescado", type:"comida", ingredients:["fideos","pescado","caldo"]},
{name:"Arroz a banda", type:"comida", ingredients:["arroz","pescado","caldo"]},
{name:"Arroz con bogavante", type:"comida", ingredients:["arroz","bogavante","azafrán"]},
{name:"Arroz negro con calamares", type:"comida", ingredients:["arroz","calamares","tinta"]},
{name:"Arroz con sepia", type:"comida", ingredients:["arroz","sepia","pimiento"]},
{name:"Paella de pollo y marisco", type:"comida", ingredients:["arroz","pollo","marisco"]},
{name:"Paella mixta con conejo", type:"comida", ingredients:["arroz","pollo","conejo","marisco"]},
{name:"Lomo de cerdo con salsa de manzana", type:"comida", ingredients:["lomo","manzana","miel"]},
{name:"Pollo al horno con patatas", type:"comida", ingredients:["pollo","patata","ajo"]},
{name:"Estofado de ternera con champiñones", type:"comida", ingredients:["ternera","champiñón","cebolla"]},
{name:"Carrilleras de cerdo al vino", type:"comida", ingredients:["carrillera","vino tinto","cebolla"]},
{name:"Solomillo de ternera con salsa de setas", type:"comida", ingredients:["solomillo","setas","nata"]},
{name:"Costillas de cordero al horno", type:"comida", ingredients:["costillas","romero","ajo"]},
{name:"Albóndigas en salsa de tomate", type:"comida", ingredients:["carne","tomate","huevo"]},
{name:"Filetes de ternera a la plancha", type:"cena", ingredients:["ternera","aceite","sal"]},
{name:"Chuletas de cerdo al ajillo", type:"comida", ingredients:["chuleta","ajo","aceite"]},
{name:"Pollo al limón", type:"comida", ingredients:["pollo","limón","aceite"]},
{name:"Pollo a la mostaza", type:"comida", ingredients:["pollo","mostaza","nata"]},
{name:"Pollo al ajo y perejil", type:"comida", ingredients:["pollo","ajo","perejil"]},
{name:"Pollo con verduras al wok", type:"comida", ingredients:["pollo","verduras","soja"]},
{name:"Salmón en salsa de eneldo", type:"cena", ingredients:["salmón","eneldo","nata"]},
{name:"Merluza con almejas", type:"cena", ingredients:["merluza","almejas","vino blanco"]},
{name:"Pulpo con patatas", type:"cena", ingredients:["pulpo","patata","aceite"]},
{name:"Calamares en su tinta", type:"cena", ingredients:["calamares","tinta","cebolla"]},
{name:"Guiso de rape y gambas", type:"comida", ingredients:["rape","gambas","tomate"]},
{name:"Pollo al horno con verduras", type:"comida", ingredients:["pollo","zanahoria","calabacín"]},
{name:"Pollo en salsa de almendras", type:"comida", ingredients:["pollo","almendras","nata"]},
{name:"Pollo al ajillo con patatas", type:"comida", ingredients:["pollo","ajo","patata"]},
{name:"Pechuga de pollo a la plancha", type:"cena", ingredients:["pollo","aceite","sal"]},
{name:"Alitas de pollo al horno", type:"cena", ingredients:["alitas","aceite","pimienta"]},
{name:"Muslos de pollo al horno", type:"comida", ingredients:["muslos","ajo","aceite"]},
{name:"Lomo de cerdo al horno", type:"comida", ingredients:["lomo","sal","ajo"]},
{name:"Chuletas de cerdo a la plancha", type:"comida", ingredients:["chuleta","sal","aceite"]},
{name:"Costillas de cerdo al horno", type:"comida", ingredients:["costillas","barbacoa","ajo"]},
{name:"Estofado de ternera con patatas", type:"comida", ingredients:["ternera","patata","zanahoria"]},
{name:"Ternera guisada con verduras", type:"comida", ingredients:["ternera","patata","zanahoria"]},
{name:"Solomillo de ternera al horno", type:"comida", ingredients:["solomillo","aceite","romero"]},
{name:"Carrilleras de cerdo al vino tinto", type:"comida", ingredients:["carrillera","vino tinto","cebolla"]},
{name:"Filete de ternera a la plancha", type:"cena", ingredients:["ternera","aceite","sal"]},
{name:"Pollo al curry con arroz", type:"comida", ingredients:["pollo","curry","arroz"]},
{name:"Pollo con champiñones", type:"comida", ingredients:["pollo","champiñón","cebolla"]},
{name:"Arroz con bogavante", type:"comida", ingredients:["arroz","bogavante","azafrán"]},
{name:"Arroz con marisco", type:"comida", ingredients:["arroz","marisco","pimiento"]},
{name:"Arroz negro con calamares", type:"comida", ingredients:["arroz","calamares","tinta"]},
{name:"Arroz a banda", type:"comida", ingredients:["arroz","pescado","caldo"]},
{name:"Fideuá de marisco", type:"comida", ingredients:["fideos","marisco","caldo"]},
{name:"Espaguetis boloñesa", type:"comida", ingredients:["pasta","carne","tomate"]},
{name:"Espaguetis carbonara", type:"comida", ingredients:["pasta","huevo","queso"]},
{name:"Pasta con salsa de carne", type:"comida", ingredients:["pasta","carne","tomate"]},
{name:"Macarrones con carne y queso", type:"comida", ingredients:["pasta","carne","queso"]},
{name:"Lasaña de carne", type:"comida", ingredients:["pasta","carne","queso"]},
{name:"Canelones de carne", type:"comida", ingredients:["pasta","carne","queso"]},
{name:"Raviolis de carne", type:"comida", ingredients:["pasta","carne","tomate"]},
{name:"Gnocchi con carne y tomate", type:"comida", ingredients:["gnocchi","carne","tomate"]},
{name:"Pizza de jamón y queso", type:"comida", ingredients:["masa","jamón","queso"]},
{name:"Pizza pepperoni", type:"comida", ingredients:["masa","pepperoni","queso"]},
{name:"Pizza cuatro quesos", type:"comida", ingredients:["masa","queso","nata"]},
{name:"Pizza barbacoa", type:"comida", ingredients:["masa","carne","salsa barbacoa"]},
{name:"Bacalao al horno con patatas", type:"comida", ingredients:["bacalao","patata","pimiento"]},
{name:"Merluza en salsa verde", type:"comida", ingredients:["merluza","ajo","perejil"]},
{name:"Salmón al horno con limón", type:"comida", ingredients:["salmón","limón","aceite"]},
{name:"Trucha a la plancha", type:"cena", ingredients:["trucha","aceite","limón"]},
{name:"Lubina al horno", type:"cena", ingredients:["lubina","aceite","sal"]},
{name:"Dorada a la sal", type:"cena", ingredients:["dorada","sal","limón"]},
{name:"Atún a la plancha", type:"cena", ingredients:["atún","aceite","sal"]},
{name:"Pulpo a la gallega", type:"cena", ingredients:["pulpo","patata","pimentón"]},
{name:"Calamares a la romana", type:"cena", ingredients:["calamar","harina","huevo"]},
{name:"Sepia a la plancha", type:"cena", ingredients:["sepia","aceite","sal"]},
{name:"Gambas al ajillo", type:"cena", ingredients:["gambas","ajo","aceite"]},
{name:"Langostinos a la plancha", type:"cena", ingredients:["langostinos","aceite","sal"]},
{name:"Mejillones al vapor", type:"cena", ingredients:["mejillones","vino blanco","ajo"]},
{name:"Sopa de pescado", type:"cena", ingredients:["pescado","marisco","verduras"]},
{name:"Caldo gallego con carne", type:"cena", ingredients:["grelos","patata","chorizo","costilla"]},
{name:"Crema de marisco", type:"cena", ingredients:["marisco","nata","verduras"]},
{name:"Estofado de cordero con patatas", type:"comida", ingredients:["cordero","patata","zanahoria"]},
{name:"Costillas de cordero al horno", type:"comida", ingredients:["costillas","romero","ajo"]},
{name:"Carrilleras de cerdo al horno", type:"comida", ingredients:["carrillera","vino tinto","cebolla"]},
{name:"Solomillo de cerdo a la plancha", type:"comida", ingredients:["solomillo","aceite","sal"]},
{name:"Codillo al horno", type:"comida", ingredients:["codillo","vino blanco","ajo"]},
{name:"Jamón asado con miel", type:"comida", ingredients:["jamón","miel","vino blanco"]},
{name:"Pollo relleno de jamón y queso", type:"comida", ingredients:["pollo","jamón","queso"]},
{name:"Pollo frito crujiente", type:"comida", ingredients:["pollo","harina","aceite"]},
{name:"Albóndigas en salsa de champiñones", type:"comida", ingredients:["carne","champiñón","tomate"]},
{name:"Filetes rusos con huevo", type:"comida", ingredients:["carne","huevo"]},
{name:"Hamburguesa con queso y bacon", type:"comida", ingredients:["carne","queso","bacon","pan"]},
{name:"Postre flan casero", type:"cena", ingredients:["huevo","leche","azúcar"]},
{name:"Natillas", type:"cena", ingredients:["huevo","leche","azúcar"]},
{name:"Arroz con leche", type:"cena", ingredients:["arroz","leche","azúcar"]},
{name:"Tarta de manzana", type:"cena", ingredients:["manzana","harina","huevo","azúcar"]},
{name:"Tarta de queso al horno", type:"cena", ingredients:["queso","huevo","azúcar","masa"]},
{name:"Brownie de chocolate", type:"cena", ingredients:["chocolate","huevo","azúcar","harina"]},
{name:"Bizcocho casero", type:"cena", ingredients:["huevo","harina","azúcar","mantequilla"]},
{name:"Magdalenas caseras", type:"cena", ingredients:["huevo","harina","azúcar","aceite"]},
{name:"Mousse de chocolate", type:"cena", ingredients:["chocolate","nata","huevo","azúcar"]},
{name:"Crema catalana", type:"cena", ingredients:["leche","huevo","azúcar"]},
{name:"Helado casero", type:"cena", ingredients:["nata","huevo","azúcar","fruta"]},
{name:"Fruta fresca con yogur", type:"cena", ingredients:["fruta","yogur"]},
{name:"Compota de manzana", type:"cena", ingredients:["manzana","azúcar","canela"]},
{name:"Tarta de Santiago", type:"cena", ingredients:["almendra","huevo","azúcar"]},
{name:"Galletas caseras", type:"cena", ingredients:["harina","huevo","azúcar","mantequilla"]},
{name:"Brownie con nueces", type:"cena", ingredients:["chocolate","huevo","azúcar","nueces"]},
{name:"Flan de huevo y caramelo", type:"cena", ingredients:["huevo","leche","azúcar","caramelo"]},
{name:"Tarta de chocolate", type:"cena", ingredients:["chocolate","harina","huevo","azúcar"]},
{name:"Bizcocho de yogur", type:"cena", ingredients:["harina","huevo","azúcar","yogur"]},
{name:"Trufas de chocolate", type:"cena", ingredients:["chocolate","nata","azúcar"]},
{name:"Crepes rellenos de chocolate", type:"cena", ingredients:["harina","huevo","leche","chocolate"]},
{name:"Churros con chocolate", type:"cena", ingredients:["harina","agua","azúcar","chocolate"]},
{name:"Tarta de frutas", type:"cena", ingredients:["masa","frutas","crema"]},
{name:"Pudin de pan", type:"cena", ingredients:["pan","leche","huevo","azúcar"]},
{name:"Arroz con leche y canela", type:"cena", ingredients:["arroz","leche","azúcar","canela"]},
{name:"Natillas con galleta", type:"cena", ingredients:["huevo","leche","azúcar","galletas"]},
{name:"Mousse de limón", type:"cena", ingredients:["limón","nata","huevo","azúcar"]},
{name:"Tarta de coco", type:"cena", ingredients:["coco","huevo","azúcar","masa"]},
{name:"Helado de vainilla", type:"cena", ingredients:["nata","leche","azúcar","vainilla"]},
{name:"Bizcocho de chocolate", type:"cena", ingredients:["harina","huevo","azúcar","chocolate"]},
{name:"Flan de chocolate", type:"cena", ingredients:["huevo","leche","azúcar","chocolate"]},
{name:"Tarta de naranja", type:"cena", ingredients:["naranja","huevo","azúcar","masa"]},
{name:"Mousse de café", type:"cena", ingredients:["café","nata","huevo","azúcar"]},
{name:"Brownie con chocolate blanco", type:"cena", ingredients:["chocolate","huevo","azúcar","mantequilla"]},
{name:"Galletas de avena y chocolate", type:"cena", ingredients:["harina","avena","chocolate","huevo"]},
{name:"Tarta de fresa", type:"cena", ingredients:["fresas","masa","azúcar","huevo"]},
{name:"Flan de vainilla", type:"cena", ingredients:["huevo","leche","azúcar","vainilla"]},
{name:"Bizcocho marmolado", type:"cena", ingredients:["huevo","harina","azúcar","chocolate"]},
{name:"Crepes de nata y chocolate", type:"cena", ingredients:["harina","huevo","leche","nata","chocolate"]},
{name:"Tarta de chocolate y nueces", type:"cena", ingredients:["chocolate","huevo","azúcar","nueces"]},
{name:"Pudin de chocolate", type:"cena", ingredients:["chocolate","huevo","leche","azúcar"]},
{name:"Tarta de limón y merengue", type:"cena", ingredients:["limón","huevo","azúcar","masa"]},
{name:"Brownie con caramelo", type:"cena", ingredients:["chocolate","huevo","azúcar","caramelo"]},
{name:"Tarta tres chocolates", type:"cena", ingredients:["chocolate negro","chocolate blanco","chocolate con leche","nata","huevo"]},
{name:"Galletas de mantequilla", type:"cena", ingredients:["harina","mantequilla","azúcar","huevo"]},
{name:"Bizcocho de zanahoria", type:"cena", ingredients:["zanahoria","harina","huevo","azúcar"]},
{name:"Tarta de queso y frutos rojos", type:"cena", ingredients:["queso","huevo","azúcar","frutos rojos"]},
{name:"Mousse de frutos del bosque", type:"cena", ingredients:["frutos rojos","nata","azúcar","huevo"]},
{name:"Flan de café", type:"cena", ingredients:["café","huevo","leche","azúcar"]},
{name:"Natillas con caramelo", type:"cena", ingredients:["huevo","leche","azúcar","caramelo"]}
];


// ======================================================
// BUSCAR RECETAS
// ======================================================

window.findRecipes = function() {

  const input = document.getElementById("ingredientInput").value;

  const userIngredients = input
    .toLowerCase()
    .split(",")
    .map(i => i.trim());

  const results = recipes
    .map(recipe => {

      const matches = recipe.ingredients.filter(ing =>
        userIngredients.includes(ing)
      ).length;

      return {...recipe, matches};

    })

    .filter(r => r.matches > 0)
    .sort((a,b) => b.matches - a.matches);

  showRecipes(results);

};


// ======================================================
// MOSTRAR RECETAS
// ======================================================

function showRecipes(recipesList){

  const container = document.getElementById("recipeResults");
  container.innerHTML = "";

  if(recipesList.length === 0){
    container.innerHTML = "No hay recetas con esos ingredientes";
    return;
  }

  recipesList.slice(0,20).forEach(recipe => {

    const div = document.createElement("div");
    div.className = "recipe-result";

    const name = document.createElement("div");
    name.textContent = recipe.name;
    name.style.fontWeight = "600";

    const matches = document.createElement("span");
    matches.className = "matches";
    matches.textContent = `${recipe.matches} coincidencia${recipe.matches>1?'s':''}`;

    const ingredients = document.createElement("span");
    ingredients.className = "ingredients";
    ingredients.textContent = recipe.ingredients.join(", ");

    div.appendChild(name);
    div.appendChild(matches);
    div.appendChild(ingredients);

    div.addEventListener("click", () => {

      selectedRecipe = recipe;
      showRecipePicker(recipe);

    });

    container.appendChild(div);

  });

}


// ======================================================
// MODAL SELECCIONAR DIA
// ======================================================

let selectedRecipe = null;

function showRecipePicker(recipe){

  selectedRecipe = recipe;

  document.getElementById("selectedRecipeName").textContent = recipe.name;

  document
  .getElementById("recipePickerModal")
  .classList
  .remove("hidden");

}


document.getElementById("closePickerBtn").onclick = () => {

  document
  .getElementById("recipePickerModal")
  .classList
  .add("hidden");

};


// ======================================================
// ASIGNAR RECETA AL MENU SEMANAL
// ======================================================

document.getElementById("assignRecipeBtn").onclick = () => {

  const day = document.getElementById("pickerDay").value;
  const type = document.getElementById("pickerType").value;

  const mealDiv = document.querySelector(
  `.editable-meal[data-day="${day}"][data-type="${type}"] span`
  );

  if(mealDiv && selectedRecipe){
    mealDiv.textContent = selectedRecipe.name;
  }

  document
  .getElementById("recipePickerModal")
  .classList
  .add("hidden");

  selectedRecipe = null;

  // 🔥 GUARDAR MENU ACTUALIZADO EN FIREBASE
  saveMenuToFirebase();

};


// ======================================================
// BOTON BUSCAR
// ======================================================

document
.getElementById("searchRecipesBtn")
.addEventListener("click", findRecipes);



//BORRAR MENU AL CAMBIAR DE SEMANA

function clearMenu(){

  days.forEach(day => {

    const lunch = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="lunch"] span`
    );

    const dinner = document.querySelector(
      `.editable-meal[data-day="${day}"][data-type="dinner"] span`
    );

    if(lunch) lunch.textContent = "";
    if(dinner) dinner.textContent = "";

  });

}

//BUSCAR RECETAS ONLINE TRADUCTOR

// Diccionario de traducción rápida (ingles -> español)
const translateES = {
  chicken:"pollo",
  beef:"ternera",
  pork:"cerdo",
  rice:"arroz",
  pasta:"pasta",
  fish:"pescado",
  egg:"huevo",
  cheese:"queso",
  salad:"ensalada",
  soup:"sopa",
  bread:"pan",
  tomato:"tomate",
  potato:"patata",
  onion:"cebolla",
  mushroom:"champiñón",
  bacon:"bacon",
  tuna:"atún",
  avocado:"aguacate",
  carrot:"zanahoria",
  zucchini:"calabacín",
  cream:"crema",
  curry:"curry"
};

// Función para traducir al español
function translateToES(text){
  return text.split(" ").map(word => {
    const clean = word.toLowerCase().replace(/[.,]/g,"");
    return translateES[clean] || word;
  }).join(" ");
}

async function translateText(text){

  // 1️⃣ Intentamos traducción local rápida
  const localTranslation = translateToES(text);
  if(localTranslation !== text){
    return localTranslation; // ya traduce algunas palabras
  }

  // 2️⃣ Intentamos traducir online solo si la local no cambia nada
  try {
    const res = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        q: text,        
        source: "en",
        target: "es",
        format: "text"
      })
    });

    if(!res.ok) throw new Error("Respuesta no OK");

    const data = await res.json();
    return data.translatedText;

  } catch(err) {
    console.error("Error traduciendo:", err);
    // 3️⃣ fallback: devolvemos la traducción local (si existe) o el original
    return localTranslation || text;
  }

}
// ======================================================
// BUSCAR RECETAS ONLINE (TheMealDB)
// ======================================================

async function searchOnlineRecipes(){

  const query = document.getElementById("ingredientInput").value.trim();

  if(!query){
    alert("Escribe un ingrediente o plato");
    return;
  }

  try{

    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`;

    const res = await fetch(url);
    const data = await res.json();

    if(!data.meals){
      showOnlineRecipes([]);
      return;
    }

    showOnlineRecipes(data.meals);

  }catch(err){

    console.error("Error buscando recetas",err);

  }

}

//MOSTRAR RESULTADOS ONLINE 
async function showOnlineRecipes(meals){
  const container = document.getElementById("recipeResults");
  container.innerHTML = "";

  if(meals.length === 0){
    container.innerHTML = "No se encontraron recetas";
    return;
  }

  for(const meal of meals){
    const div = document.createElement("div");
    div.className = "recipe-result";

    div.innerHTML = `
      <div style="font-weight:600">${await translateText(meal.strMeal)}</div>
      <div>${meal.strCategory} - ${meal.strArea}</div>
    `;

    div.addEventListener("click", ()=>{
      selectedRecipe = { name: meal.strMeal };
      showRecipePicker(selectedRecipe);
    });

    container.appendChild(div);
  }
}

document
.getElementById("searchOnlineRecipesBtn")
.addEventListener("click", searchOnlineRecipes);


//RECETAS AVANZADAS

// ======================================================
// BUSCAR RECETAS SPOONACULAR
// ======================================================

const SPOONACULAR_KEY = "80e33c256a29444683a0d97c9a92b5f9";

async function searchSpoonacularRecipes(){

  const query = document
  .getElementById("ingredientInput")
  .value
  .trim();

  if(!query){
    alert("Escribe un ingrediente o plato");
    return;
  }

  try{

    const url = `https://api.spoonacular.com/recipes/complexSearch?query=${query}&number=12&apiKey=${SPOONACULAR_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    showSpoonacularRecipes(data.results);

  }catch(err){

    console.error("Error Spoonacular",err);

  }

}

//MOSTRAR RESULTADOS RECETAS AVANZADAS

async function showSpoonacularRecipes(recipes){
  const container = document.getElementById("recipeResults");
  container.innerHTML = "";

  if(!recipes || recipes.length === 0){
    container.innerHTML = "No se encontraron recetas";
    return;
  }

  for(const recipe of recipes){
    const div = document.createElement("div");
    div.className = "recipe-result";

    div.innerHTML = `
      <img src="${recipe.image}" style="width:80px;border-radius:8px">
      <div style="font-weight:600">${await translateText(recipe.title)}</div>
    `;

    div.addEventListener("click", ()=>{
      selectedRecipe = { name: recipe.title };
      showRecipePicker(selectedRecipe);
    });

    container.appendChild(div);
  }
}

document
.getElementById("searchSpoonacularBtn")
.addEventListener("click", searchSpoonacularRecipes);


//CONSEJOS

// ======================================================
// ======================================================
// CONSEJOS SALUDABLES DIARIOS
// ======================================================

const dailyTips = [
"💧 Recuerda beber al menos 1,5 litros de agua al día.",
"🥦 Incluye verduras en al menos dos comidas principales.",
"🍳 Evita saltarte el desayuno, es la comida más importante del día.",
"🐟 Se recomienda comer pescado al menos 2 veces por semana.",
"🍝 Alterna el arroz y la pasta durante la semana para equilibrar hidratos.",
"🍎 Incluye fruta fresca como postre o tentempié diario.",
"🚫 Limita el consumo de alimentos ultraprocesados y azúcares añadidos.",
"🔥 Cocina al horno, plancha o vapor en lugar de fritos.",
"🥗 Intenta que la mitad de tu plato sean verduras u hortalizas.",
"🍗 Consume carne magra y alterna con pescado o legumbres.",
"😌 Mastica despacio y disfruta de tus comidas, ayuda a la digestión.",
"🍽 Haz 5 comidas al día para mantener el metabolismo activo.",
"🥤 Evita refrescos azucarados, elige agua o infusiones.",
"🥜 Incluye frutos secos como snack saludable en cantidad moderada.",
"🧂 Reduce la sal y utiliza especias para dar sabor."
];

// ======================================================
// MOSTRAR CONSEJO SEGÚN EL DIA
// ======================================================

function showDailyTip() {
  const tipElement = document.getElementById("dailyTip");
  if (!tipElement) return;

  const randomIndex = Math.floor(Math.random() * dailyTips.length);
  tipElement.textContent = dailyTips[randomIndex];
}


document.addEventListener("DOMContentLoaded", () => {
  const menuScreen = document.getElementById("menuScreen");
  const overlay = document.getElementById("dailyTipOverlay");
  const enterBtn = document.getElementById("enterMenuBtn");
  const menuContent = document.getElementById("menuContent");

  // Detecta cuando se abre el menú
  const observer = new MutationObserver(() => {
    if (!menuScreen.classList.contains("hidden")) {
      showDailyTip();
      overlay.classList.remove("hidden");
      menuContent.classList.add("hidden");
    }
  });

  observer.observe(menuScreen, { attributes: true });

  // Botón para acceder al menú
  enterBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    menuContent.classList.remove("hidden");
  });
});




// ======================================================
// GENERAR MENU INICIAL
// ======================================================



// ======================================================
console.log("JS cargado");

document.addEventListener("click", function(e){

if(e.target.id === "openRecipeFinder"){
document.getElementById("recipeModal").classList.remove("hidden");
}

if(e.target.id === "closeRecipeModal"){
document.getElementById("recipeModal").classList.add("hidden");
}

});


// ======================================================
// CARGAR MENU AL ABRIR
// ======================================================
updateWeekHeader();
loadMenuFromFirebase();
