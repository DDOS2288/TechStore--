import { db } from "./firebase/firebase-config.js";
import { watchAuthState, logoutUser } from "./firebase/auth.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const nav = document.getElementById("nav");
const accessDenied = document.getElementById("accessDenied");
const adminPanel = document.getElementById("adminPanel");

const statusLabels = { new:"Новый", processing:"В обработке", done:"Выполнен", cancelled:"Отменён" };
const statusBadge = (s) => `<span class="badge badge-${s}">${statusLabels[s]||s}</span>`;

function switchTab(tabName) {
  document.querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".admin-section").forEach((s) => s.classList.remove("active"));
  const btn = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
  if (btn) btn.classList.add("active");
  const section = document.getElementById("tab-" + tabName);
  if (section) section.classList.add("active");
  localStorage.setItem("adminTab", tabName);
}

document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

const savedTab = localStorage.getItem("adminTab");
if (savedTab) switchTab(savedTab);

watchAuthState(async (user, profile) => {
  if (!user || profile?.role !== "admin") {
    accessDenied.classList.remove("hidden");
    nav.innerHTML = `<a href="index.html">Каталог</a>`;
    return;
  }

  adminPanel.classList.remove("hidden");
  nav.innerHTML = `<a href="index.html">Каталог</a><a href="profile.html">Профиль</a><a href="#" id="logoutLink">Выйти</a>`;
  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault(); await logoutUser(); window.location.href = "index.html";
  });

  loadMetrics();
  loadOrders();
  loadProducts();
  loadUsers();
  loadReviews();
});

async function loadMetrics() {
  const [pSnap, oSnap, uSnap, rSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "users")),
    getDocs(collection(db, "reviews")),
  ]);
  document.getElementById("mProducts").textContent = pSnap.size;
  document.getElementById("mOrders").textContent = oSnap.size;
  document.getElementById("mUsers").textContent = uSnap.size;
  document.getElementById("mReviews").textContent = rSnap.size;
}

async function loadOrders() {
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  document.getElementById("ordersLoading").style.display = "none";
  const table = document.getElementById("ordersTable");
  const tbody = document.getElementById("ordersTbody");
  table.style.display = "";
  tbody.innerHTML = "";

  snap.forEach((docSnap) => {
    const o = docSnap.data();
    const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("ru-RU") : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${docSnap.id.slice(0,8)}</td>
      <td style="font-size:0.8rem;">${o.userId.slice(0,8)}...</td>
      <td>${o.total?.toLocaleString("ru-RU")} ₸</td>
      <td>${statusBadge(o.status)}</td>
      <td>${date}</td>
      <td>
        <select class="order-status-select btn-sm" data-id="${docSnap.id}">
          ${["new","processing","done","cancelled"].map(s=>`<option value="${s}" ${o.status===s?"selected":""}>${statusLabels[s]}</option>`).join("")}
        </select>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".order-status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await updateDoc(doc(db, "orders", sel.dataset.id), { status: sel.value });
    });
  });
}

let editingProductId = null;
let categoriesCache = [];

async function loadProducts() {
  const [pSnap, cSnap] = await Promise.all([
    getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"))),
    getDocs(collection(db, "categories")),
  ]);
  categoriesCache = cSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const catSelect = document.getElementById("pCategory");
  catSelect.innerHTML = categoriesCache.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

  document.getElementById("productsLoading").style.display = "none";
  const table = document.getElementById("productsTable");
  const tbody = document.getElementById("productsTbody");
  table.style.display = "";
  tbody.innerHTML = "";

  pSnap.forEach((docSnap) => {
    const p = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.categoryName || "—"}</td>
      <td>${p.price?.toLocaleString("ru-RU")} ₸</td>
      <td>
        ${(p.stock ?? 0) > 0
          ? `<span style="color:var(--primary);">${p.stock} шт.</span>`
          : `<span style="color:var(--danger);">нет</span>`
        }
      </td>
      <td class="inline-btns">
        <button class="btn-sm secondary edit-product" data-id="${docSnap.id}">Изменить</button>
        <button class="btn-sm secondary delete-product" data-id="${docSnap.id}">Удалить</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".edit-product").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const snap = await getDoc(doc(db, "products", btn.dataset.id));
      const p = snap.data();
      editingProductId = btn.dataset.id;
      document.getElementById("productFormTitle").textContent = "Редактировать товар";
      document.getElementById("pName").value = p.name || "";
      document.getElementById("pDesc").value = p.description || "";
      document.getElementById("pCategory").value = p.categoryId || "";
      document.getElementById("pPrice").value = p.price || "";
      document.getElementById("pImage").value = p.images?.[0] || "";
      const curStock = p.stock ?? 0;
      document.getElementById("pStockDisplay").textContent = `${curStock} шт.`;
      document.getElementById("pStockDisplay").style.color =
        curStock > 0 ? "var(--primary)" : "var(--danger)";
      document.getElementById("pStockAdd").value = 0;
      document.getElementById("productFormBlock").classList.remove("hidden");
      document.getElementById("productFormBlock").scrollIntoView({ behavior:"smooth" });
    });
  });

  tbody.querySelectorAll(".delete-product").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Удалить товар?")) return;
      await deleteDoc(doc(db, "products", btn.dataset.id));
      loadProducts();
      loadMetrics();
    });
  });
}

document.getElementById("addProductBtn").addEventListener("click", () => {
  editingProductId = null;
  document.getElementById("productFormTitle").textContent = "Добавить товар";
  document.getElementById("productForm").reset();
  document.getElementById("pStockDisplay").textContent = "—";
  document.getElementById("productFormCancel").textContent = "Отмена";
  document.getElementById("productFormBlock").classList.remove("hidden");
  document.getElementById("productFormBlock").scrollIntoView({ behavior:"smooth" });
});

document.getElementById("productFormCancel").addEventListener("click", () => {
  document.getElementById("productFormBlock").classList.add("hidden");
  document.getElementById("productFormCancel").textContent = "Отмена";
  editingProductId = null;
});

document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("productFormMsg");
  msg.textContent = "";

  const catId = document.getElementById("pCategory").value;
  const catName = categoriesCache.find((c) => c.id === catId)?.name || "";
  const name = document.getElementById("pName").value.trim();
  const stockAdd = parseInt(document.getElementById("pStockAdd").value, 10) || 0;

  let currentStock = 0;
  if (editingProductId) {
    const snap = await getDoc(doc(db, "products", editingProductId));
    currentStock = snap.data()?.stock ?? 0;
  }
  const newStock = Math.max(0, currentStock + stockAdd);

  const data = {
    name,
    description: document.getElementById("pDesc").value.trim(),
    categoryId: catId,
    categoryName: catName,
    price: parseFloat(document.getElementById("pPrice").value),
    images: [document.getElementById("pImage").value.trim()].filter(Boolean),
    stock: newStock,
    inStock: newStock > 0,
    keywords: name.toLowerCase().split(" "),
  };

  try {
    if (editingProductId) {
      await updateDoc(doc(db, "products", editingProductId), data);
      msg.textContent = "Товар обновлён";
    } else {
      data.rating = 0;
      data.reviewsCount = 0;
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), data);
      msg.textContent = "Товар добавлен";
    }
    msg.className = "success";
    document.getElementById("pStockDisplay").textContent = `${newStock} шт.`;
    document.getElementById("pStockDisplay").style.color = newStock > 0 ? "var(--primary)" : "var(--danger)";
    document.getElementById("pStockAdd").value = 0;
    document.getElementById("productFormCancel").textContent = "Закрыть";
    loadProducts();
    loadMetrics();
  } catch (err) {
    msg.textContent = "Ошибка: " + err.message;
    msg.className = "error";
  }
});

async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  document.getElementById("usersLoading").style.display = "none";
  const table = document.getElementById("usersTable");
  const tbody = document.getElementById("usersTbody");
  table.style.display = "";
  tbody.innerHTML = "";

  snap.forEach((docSnap) => {
    const u = docSnap.data();
    const date = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString("ru-RU") : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.name || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>
        <select class="role-select btn-sm" data-id="${docSnap.id}">
          <option value="user" ${u.role==="user"?"selected":""}>user</option>
          <option value="admin" ${u.role==="admin"?"selected":""}>admin</option>
        </select>
      </td>
      <td>${date}</td>
      <td><span style="font-size:0.75rem;color:#4a664a;">${docSnap.id.slice(0,10)}...</span></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".role-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      if (!confirm(`Сменить роль на "${sel.value}"?`)) {
        loadUsers(); return;
      }
      await updateDoc(doc(db, "users", sel.dataset.id), { role: sel.value });
    });
  });
}

async function loadReviews() {
  const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
  document.getElementById("reviewsLoading").style.display = "none";
  const table = document.getElementById("reviewsTable");
  const tbody = document.getElementById("reviewsTbody");
  table.style.display = "";
  tbody.innerHTML = "";

  snap.forEach((docSnap) => {
    const r = docSnap.data();
    const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("ru-RU") : "—";
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><a href="product.html?id=${r.productId}" target="_blank" style="font-size:0.8rem;">${r.productId.slice(0,8)}...</a></td>
      <td>${r.userName || "—"}</td>
      <td style="color:#00ff41;">${stars}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.text}</td>
      <td>${date}</td>
      <td><button class="btn-sm secondary delete-review" data-id="${docSnap.id}" data-product="${r.productId}" data-rating="${r.rating}">Удалить</button></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".delete-review").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Удалить отзыв?")) return;
      await deleteDoc(doc(db, "reviews", btn.dataset.id));
      loadReviews();
      loadMetrics();
    });
  });
}
