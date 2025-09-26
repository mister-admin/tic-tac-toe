const cells = document.querySelectorAll(".cell");
const resetBtn = document.getElementById("reset");
const navBtns = document.querySelectorAll(".nav-btn");
const settingsPanel = document.getElementById("settingsPanel");
const infoPanel = document.getElementById("infoPanel");
const versionEl = document.getElementById("appVersion");

// === VERSION ===
const VERSION = "v1.0.3";
versionEl.textContent = VERSION;

// === GAME ===
let currentPlayer = "X";
cells.forEach(c => c.addEventListener("click", () => {
  if (!c.textContent) {
    c.textContent = currentPlayer;
    c.classList.add(currentPlayer.toLowerCase());
    currentPlayer = currentPlayer === "X" ? "O" : "X";
  }
}));

resetBtn.addEventListener("click", () => {
  cells.forEach(c => {
    c.textContent = "";
    c.classList.remove("x","o");
  });
  currentPlayer = "X";
});

// === NAV ===
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    settingsPanel.classList.remove("visible");
    infoPanel.classList.remove("visible");

    if (btn.id === "btn-settings") {
      settingsPanel.classList.add("visible");
    } else if (btn.id === "btn-info") {
      infoPanel.classList.add("visible");
    }
  });
});

// === THEME AUTO ===
function setTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) document.documentElement.classList.add("dark");
}
setTheme();

// === LANG AUTO ===
async function setLang() {
  const lang = navigator.language.startsWith("ru") ? "ru" : "en";
  const data = await fetch(`lang/${lang}.json`).then(r => r.json());
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (data[key]) el.textContent = data[key];
  });
}
setLang();
