// catalog.js

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PAGE_SIZE = 8;

let lastDoc = null;
let state = {
  categoryId: "",
  sortBy: "createdAt_desc", // field_direction
  searchTerm: "",
};

const grid = document.getElementById("productGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const categorySelect = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const searchInput = document.getElementById("searchInput");
const emptyMsg = document.getElementById("emptyMsg");

// ---------- ЗАГРУЗКА КАТЕГОРИЙ В ФИЛЬТР ----------
async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  snap.forEach((doc) => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = doc.data().name;
    categorySelect.appendChild(opt);
  });
}

// ---------- КАРТИНКИ ТОВАРОВ ----------
// Если в Firestore стоит плейсхолдер или пусто — подставляем реальное фото
const PRODUCT_IMAGES = {
  "iphone 15":          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop&q=85",
  "samsung galaxy s24": "https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&h=400&fit=crop&q=85",
  "xiaomi 14":          "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&h=400&fit=crop&q=85",
  "google pixel 8":     "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop&q=85",
  "macbook air":        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop&q=85",
  "asus rog":           "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop&q=85",
  "lenovo thinkpad":    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&q=85",
  "hp pavilion":        "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop&q=85",
  "airpods pro":        "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop&q=85",
  "sony wh":            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=85",
  "jbl":                "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop&q=85",
  "ipad air":           "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop&q=85",
  "samsung galaxy tab": "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop&q=85",
};

function getProductImage(name, storedUrl) {
  // Если в Firestore уже есть нормальная картинка — берём её
  if (storedUrl && !storedUrl.includes("placehold.co") && !storedUrl.includes("placeholder")) {
    return storedUrl;
  }
  // Иначе ищем в таблице по имени товара
  const nameLow = (name || "").toLowerCase();
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (nameLow.includes(key)) return url;
  }
  // Крайний фолбэк
  return `https://placehold.co/400x400?text=${encodeURIComponent(name || "Товар")}`;
}

// ---------- ПОСТРОЕНИЕ ЗАПРОСА (без поиска) ----------

function buildQuery(afterDoc) {
  const constraints = [];
  if (state.categoryId) {
    constraints.push(where("categoryId", "==", state.categoryId));
  }
  const [field, dir] = state.sortBy.split("_");
  constraints.push(orderBy(field, dir));
  constraints.push(limit(PAGE_SIZE));
  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }
  return query(collection(db, "products"), ...constraints);
}

// ---------- УМНЫЙ ПОИСК ----------
const TRANSLIT_RU_EN = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
  'з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
  'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
};

// Рус фонетика → английский оригинал (для брендов/моделей)
const PHONETIC_RU_EN = {
  'айфон':   'iphone',
  'айпад':   'ipad',
  'эпл':     'apple',
  'макбук':  'macbook',
  'самсунг': 'samsung',
  'сяоми':   'xiaomi',
  'леново':  'lenovo',
  'асус':    'asus',
  'хуавей':  'huawei',
  'сони':    'sony',
  'андроид': 'android',
  'виндовс': 'windows',
  'наушники':'headphones',
  'ноутбук': 'laptop notebook',
  'телефон': 'phone smartphone',
  'планшет': 'tablet',
};

// Английский → рус (для поиска "iphone" среди русских описаний)
const PHONETIC_EN_RU = {
  'iphone':  'айфон',
  'ipad':    'айпад',
  'apple':   'эпл',
  'macbook': 'макбук',
  'samsung': 'самсунг',
  'xiaomi':  'сяоми',
  'lenovo':  'леново',
  'asus':    'асус',
  'huawei':  'хуавей',
  'laptop':  'ноутбук',
  'phone':   'телефон',
  'tablet':  'планшет',
};

function translitRuToEn(str) {
  return str.split('').map(c => TRANSLIT_RU_EN[c] ?? c).join('');
}

function normalize(str) {
  return str.toLowerCase().trim();
}

function smartMatch(product, rawQuery) {
  if (!rawQuery) return true;

  const terms = normalize(rawQuery).split(/\s+/).filter(Boolean);

  // Haystack: название + описание + категория
  const haystack = normalize([
    product.name || '',
    product.description || '',
    product.categoryName || '',
    (product.keywords || []).join(' '),
  ].join(' '));

  const haystackLat = translitRuToEn(haystack); // транслит haystack рус→лат

  return terms.every(term => {
    const termLat    = translitRuToEn(term);          // транслит запроса рус→лат
    const termEnOrig = PHONETIC_RU_EN[term] || '';    // рус фонетика → англ оригинал
    const termRuOrig = PHONETIC_EN_RU[term] || '';    // англ слово → рус фонетика

    // Несколько вариантов найти совпадение:
    return (
      haystack.includes(term) ||              // точное совпадение
      haystackLat.includes(termLat) ||        // транслит (самсунг→samsung)
      // рус фонетика → ищем англ оригинал (айфон→iphone)
      termEnOrig.split(' ').some(w => w && haystack.includes(w)) ||
      // англ слово → ищем рус фонетику (iphone→айфон)
      (termRuOrig && haystack.includes(termRuOrig))
    );
  });
}


let allProductsCache = null; // кешируем все товары чтобы не грузить каждый раз

async function getAllProducts() {
  if (allProductsCache) return allProductsCache;
  const snap = await getDocs(collection(db, "products"));
  allProductsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return allProductsCache;
}

async function searchAndRender(rawQuery) {
  grid.innerHTML = "";
  emptyMsg.classList.add("hidden");
  loadMoreBtn.classList.add("hidden");

  const all = await getAllProducts();

  // Фильтр по категории тоже учитываем
  let filtered = all;
  if (state.categoryId) {
    filtered = filtered.filter(p => p.categoryId === state.categoryId);
  }
  filtered = filtered.filter(p => smartMatch(p, rawQuery));

  if (filtered.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }
  filtered.forEach(p => renderProduct(p.id, p));
}


// ---------- TOAST УВЕДОМЛЕНИЕ (вместо alert) ----------
function showToast(msg, type = "warn") {
  document.getElementById("hackToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "hackToast";
  const color = type === "error" ? "#ff3030" : "#00ff41";
  const bg    = type === "error" ? "rgba(40,0,0,0.95)" : "rgba(0,25,0,0.95)";
  toast.style.cssText = [
    "position:fixed", "top:80px", "right:20px", "z-index:9999",
    `background:${bg}`, `border:1px solid ${color}`, `color:${color}`,
    "padding:12px 20px", "border-radius:6px",
    "font-family:'Share Tech Mono',monospace",
    "font-size:0.88rem", "max-width:300px",
    `box-shadow:0 0 18px ${color}55`,
    "opacity:0", "transform:translateX(20px)",
    "transition:opacity 0.25s,transform 0.25s",
    "pointer-events:none"
  ].join(";");
  toast.textContent = "> " + msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}

// ---------- СРАВНЕНИЕ: localStorage ----------
function getCompare() {
  return JSON.parse(localStorage.getItem("compareIds") || "[]");
}
function saveCompare(ids) {
  localStorage.setItem("compareIds", JSON.stringify(ids));
  renderCompareBar();
  // Синхронизируем внешний вид всех кнопок на карточках
  document.querySelectorAll(".compare-btn").forEach((btn) => {
    const inList = ids.includes(btn.dataset.id);
    btn.textContent = inList ? "✓ В сравнении" : "+ Сравнить";
    btn.classList.toggle("compare-btn-active", inList);
  });
}
function toggleCompare(id) {
  let ids = getCompare();
  if (ids.includes(id)) {
    ids = ids.filter((x) => x !== id);
  } else {
    if (ids.length >= 4) {
      showToast("Максимум 4 товара для сравнения.", "warn");
      return;
    }
    ids.push(id);
  }
  saveCompare(ids);
}

// ---------- ПЛАВАЮЩАЯ ПАНЕЛЬ СРАВНЕНИЯ ----------
function renderCompareBar() {
  let bar = document.getElementById("compareBar");
  const ids = getCompare();
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "compareBar";
    bar.style.cssText = `position:fixed;bottom:20px;right:20px;background:rgba(3,15,3,0.95);
      border:1px solid #00ff41;color:#00ff41;
      padding:12px 20px;border-radius:8px;font-weight:600;font-size:0.9rem;
      box-shadow:0 0 24px rgba(0,255,65,0.35);z-index:999;display:flex;gap:12px;align-items:center;
      font-family:'Share Tech Mono',monospace;backdrop-filter:blur(8px);`;
    document.body.appendChild(bar);
  }
  if (ids.length === 0) {
    bar.style.display = "none";
    return;
  }
  bar.style.display = "flex";
  bar.innerHTML = `
    <span>Сравнить (${ids.length})</span>
    <a href="compare.html" id="compareOpenLink" style="background:#00ff41;color:#000;padding:5px 14px;border-radius:5px;font-size:0.82rem;text-decoration:none;font-weight:700;">Открыть →</a>
    <span id="compareClearBtn" style="cursor:pointer;opacity:0.6;font-size:0.82rem;">✕ Очистить</span>
  `;
  // addEventListener вместо onclick= (модуль недоступен из inline-обработчиков)
  document.getElementById("compareClearBtn").addEventListener("click", () => {
    saveCompare([]);
  });
}

// ---------- РЕНДЕР ТОВАРА ----------
function renderProduct(id, data) {
  const inCompare = getCompare().includes(id);
  const wrapper = document.createElement("div");
  wrapper.className = "product-card-wrapper";

  const card = document.createElement("a");
  card.href = `product.html?id=${id}`;
  card.className = "product-card";
  const img = getProductImage(data.name, data.images?.[0]);
  card.innerHTML = `
    <img src="${img}" alt="${data.name}" onerror="this.src='https://placehold.co/300x300?text=${encodeURIComponent(data.name)}'" />
    <h3>${data.name}</h3>
    <p class="price">${data.price.toLocaleString("ru-RU")} ₸</p>
    <p class="rating">★ ${data.rating?.toFixed(1) || "—"}</p>
    ${data.inStock
      ? '<p class="in-stock-badge">✔ В наличии</p>'
      : '<p class="out-of-stock">✗ Нет в наличии</p>'
    }
  `;

  const compareBtn = document.createElement("button");
  compareBtn.className = "compare-btn" + (inCompare ? " compare-btn-active" : "");
  compareBtn.dataset.id = id;
  compareBtn.textContent = inCompare ? "✓ В сравнении" : "+ Сравнить";
  compareBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(id);
  });

  wrapper.appendChild(card);
  wrapper.appendChild(compareBtn);
  grid.appendChild(wrapper);
}

// Инициализация панели при загрузке
renderCompareBar();


// ---------- ЗАГРУЗКА СТРАНИЦЫ ТОВАРОВ ----------
async function loadPage(reset = false) {
  if (reset) {
    grid.innerHTML = "";
    lastDoc = null;
    emptyMsg.classList.add("hidden");
  }

  // Когда выбрана категория + сортировка по цене/рейтингу — клиентская сортировка
  // (Firestore требует составного индекса categoryId+price/rating, которых нет)
  if (state.categoryId && state.sortBy !== "createdAt_desc") {
    loadMoreBtn.classList.add("hidden");
    const all = await getAllProducts();
    let filtered = all.filter(p => p.categoryId === state.categoryId);

    const [field, dir] = state.sortBy.split("_");
    filtered.sort((a, b) => {
      const va = a[field] ?? 0;
      const vb = b[field] ?? 0;
      return dir === "asc" ? va - vb : vb - va;
    });

    if (filtered.length === 0) emptyMsg.classList.remove("hidden");
    else filtered.forEach(p => renderProduct(p.id, p));
    return;
  }

  // Обычный Firestore запрос (индексы есть)
  const q = buildQuery(lastDoc);
  const snap = await getDocs(q);

  if (snap.empty && reset) {
    emptyMsg.classList.remove("hidden");
  }

  snap.forEach((doc) => renderProduct(doc.id, doc.data()));
  lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
  loadMoreBtn.classList.toggle("hidden", snap.docs.length < PAGE_SIZE);
}


// ---------- СОБЫТИЯ ----------
categorySelect.addEventListener("change", () => {
  state.categoryId = categorySelect.value;
  // Если поиск активен — фильтруем среди результатов поиска
  if (state.searchTerm) {
    searchAndRender(state.searchTerm);
  } else {
    loadPage(true);
  }
});

sortSelect.addEventListener("change", () => {
  state.sortBy = sortSelect.value;
  // Сортировка работает только без поиска (при поиске — клиентская фильтрация)
  if (!state.searchTerm) {
    loadPage(true);
  }
});

let searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const raw = searchInput.value.trim();
    state.searchTerm = raw;

    if (raw) {
      // Умный клиентский поиск
      searchAndRender(raw);
    } else {
      // Поиск очищен — возвращаемся к обычной пагинации
      allProductsCache = null; // сбрасываем кеш чтобы подхватить новые товары
      loadPage(true);
    }
  }, 300);
});

loadMoreBtn.addEventListener("click", () => loadPage(false));

// ---------- СТАРТ ----------
loadCategories();
loadPage(true);

