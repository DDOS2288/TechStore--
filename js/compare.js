import { db } from "./firebase/firebase-config.js";
import { watchAuthState, logoutUser } from "./firebase/auth.js";
import {
  doc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
  if (storedUrl && !storedUrl.includes("placehold.co") && !storedUrl.includes("placeholder")) {
    return storedUrl;
  }
  const nameLow = (name || "").toLowerCase();
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (nameLow.includes(key)) return url;
  }
  return `https://placehold.co/400x400?text=${encodeURIComponent(name || "Товар")}`;
}

watchAuthState((user, profile) => {
  const nav = document.getElementById("nav");
  if (!user) {
    nav.innerHTML = `<a href="index.html">Каталог</a><a href="login.html">Вход</a><a href="register.html">Регистрация</a>`;
    return;
  }
  const adminLink = profile?.role === "admin" ? `<a href="admin.html">Админ-панель</a>` : "";
  nav.innerHTML = `<a href="index.html">Каталог</a><a href="cart.html">Корзина</a><a href="profile.html">Профиль</a>${adminLink}<a href="#" id="logoutLink">Выйти</a>`;
  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault(); await logoutUser(); window.location.reload();
  });
});

function getIds() {
  return JSON.parse(localStorage.getItem("compareIds") || "[]");
}
function removeId(id) {
  const ids = getIds().filter(x => x !== id);
  localStorage.setItem("compareIds", JSON.stringify(ids));
  renderCompare();
}

async function renderCompare() {
  const ids = getIds();
  const container = document.getElementById("compareContent");
  const emptyMsg = document.getElementById("emptyMsg");

  if (ids.length === 0) {
    container.innerHTML = `
      <div class="compare-empty">
        <p style="font-size:1.1rem;">Нет товаров для сравнения.</p>
        <a href="index.html">← Добавьте товары из каталога</a>
      </div>`;
    return;
  }

  const docs = await Promise.all(ids.map(id => getDoc(doc(db, "products", id))));
  const products = docs
    .filter(d => d.exists())
    .map(d => ({ id: d.id, ...d.data() }));

  if (products.length === 0) {
    localStorage.removeItem("compareIds");
    container.innerHTML = `<div class="compare-empty"><p>Товары не найдены.</p><a href="index.html">← В каталог</a></div>`;
    return;
  }

  const allSpecKeys = [...new Set(products.flatMap(p => Object.keys(p.specs || {})))];

  let html = `<div class="card compare-table-wrap"><table class="compare-table">`;

  html += `<thead><tr><th class="row-label">Товар</th>`;
  products.forEach(p => {
    const imgUrl = getProductImage(p.name, p.images?.[0]);
    html += `
      <td class="compare-header-cell">
        <img src="${imgUrl}" alt="${p.name}" onerror="this.src='https://placehold.co/120x120?text=${encodeURIComponent(p.name)}'" />
        <div class="product-name">${p.name}</div>
        <div class="product-price">${p.price?.toLocaleString("ru-RU")} ₸</div>
        <button class="remove-compare" data-id="${p.id}">✕ Убрать</button>
      </td>`;
  });
  html += `</tr></thead><tbody>`;

  html += `<tr><th class="row-label">Рейтинг</th>`;
  products.forEach(p => {
    html += `<td class="compare-rating">★ ${p.rating?.toFixed(1) || "—"} <span style="color:#4a664a;font-size:0.85rem;">(${p.reviewsCount || 0})</span></td>`;
  });
  html += `</tr>`;

  html += `<tr><th class="row-label">В наличии</th>`;
  products.forEach(p => {
    html += `<td>${p.inStock ? "✅ Да" : "❌ Нет"}</td>`;
  });
  html += `</tr>`;

  html += `<tr><th class="row-label">Категория</th>`;
  products.forEach(p => {
    html += `<td>${p.categoryName || "—"}</td>`;
  });
  html += `</tr>`;

  allSpecKeys.forEach(key => {
    const values = products.map(p => p.specs?.[key] ?? null);
    const allSame = values.every(v => v === values[0]);

    html += `<tr${!allSame ? ' class="diff-highlight"' : ""}><th class="row-label">${key}</th>`;
    products.forEach(p => {
      const val = p.specs?.[key];
      html += `<td>${val !== undefined ? val : '<span class="spec-missing">—</span>'}</td>`;
    });
    html += `</tr>`;
  });

  html += `<tr><th class="row-label"></th>`;
  products.forEach(p => {
    html += `<td><a href="product.html?id=${p.id}" style="display:inline-block;padding:7px 14px;background:transparent;color:#00ff41;border:1px solid #00ff41;border-radius:6px;text-decoration:none;font-size:0.85rem;font-weight:700;font-family:'Share Tech Mono',monospace;">Подробнее →</a></td>`;
  });
  html += `</tr>`;

  html += `</tbody></table></div>`;

  container.innerHTML = html;

  container.querySelectorAll(".remove-compare").forEach(btn => {
    btn.addEventListener("click", () => removeId(btn.dataset.id));
  });
}

renderCompare();
