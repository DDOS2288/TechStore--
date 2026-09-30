import { db } from "./firebase/firebase-config.js";
import { watchAuthState, logoutUser } from "./firebase/auth.js";
import { addToCart } from "./firebase/cart.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const nav = document.getElementById("nav");
let currentUid = null;
let currentUserName = "Аноним";

watchAuthState(async (user, profile) => {
  if (!user) {
    currentUid = null;
    nav.innerHTML = `<a href="index.html">Каталог</a><a href="login.html">Вход</a><a href="register.html">Регистрация</a>`;
    document.getElementById("reviewFormBlock").classList.add("hidden");
    document.getElementById("reviewLoginMsg").classList.remove("hidden");
    return;
  }
  currentUid = user.uid;
  currentUserName = profile?.name || user.email;
  const adminLink = profile?.role === "admin" ? `<a href="admin.html">Админ-панель</a>` : "";
  nav.innerHTML = `<a href="index.html">Каталог</a><a href="cart.html">Корзина</a><a href="profile.html">Личный кабинет</a>${adminLink}<a href="#" id="logoutLink">Выйти</a>`;
  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUser();
    window.location.reload();
  });

  if (productId) {
    const hasBought = await checkPurchased(user.uid, productId);
    if (hasBought) {
      document.getElementById("reviewFormBlock").classList.remove("hidden");
      document.getElementById("reviewLoginMsg").classList.add("hidden");
    } else {
      document.getElementById("reviewFormBlock").classList.add("hidden");
      document.getElementById("reviewLoginMsg").classList.add("hidden");
    }
  }
});

async function checkPurchased(uid, pid) {
  const q = query(collection(db, "orders"), where("userId", "==", uid));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    const items = docSnap.data().items || [];
    if (items.some((i) => i.productId === pid)) return true;
  }
  return false;
}

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

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

const loading = document.getElementById("loading");
const notFound = document.getElementById("notFound");
const productBlock = document.getElementById("productBlock");

async function loadProduct() {
  if (!productId) {
    loading.classList.add("hidden");
    notFound.classList.remove("hidden");
    return;
  }

  const snap = await getDoc(doc(db, "products", productId));
  loading.classList.add("hidden");

  if (!snap.exists()) {
    notFound.classList.remove("hidden");
    return;
  }

  const data = snap.data();
  productBlock.classList.remove("hidden");

  document.getElementById("productImage").src =
    getProductImage(data.name, data.images?.[0]);
  document.getElementById("productName").textContent = data.name;
  document.getElementById("productPrice").textContent =
    data.price.toLocaleString("ru-RU") + " ₸";
  document.getElementById("productRating").textContent =
    "★ " + (data.rating?.toFixed(1) || "—") + " (" + (data.reviewsCount || 0) + " отзывов)";
  document.getElementById("productDescription").textContent = data.description;

  const addBtn = document.getElementById("addToCartBtn");
  if (!data.inStock) {
    addBtn.disabled = true;
    addBtn.textContent = "Нет в наличии";
  }

  const table = document.getElementById("specsTable");
  Object.entries(data.specs || {}).forEach(([key, value]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="spec-label">${key}</td><td>${value}</td>`;
    table.appendChild(row);
  });

  loadRelated(data.categoryId);
  loadReviews();

  addBtn.addEventListener("click", async () => {
    const cartMessage = document.getElementById("cartMessage");
    cartMessage.className = "";
    if (!currentUid) {
      cartMessage.textContent = "Чтобы добавить в корзину, сначала войдите в аккаунт.";
      cartMessage.className = "error";
      return;
    }
    try {
      await addToCart(currentUid, productId, data, 1);
      cartMessage.textContent = "Добавлено в корзину!";
      cartMessage.className = "success";
    } catch (err) {
      cartMessage.textContent = "Ошибка: " + err.message;
      cartMessage.className = "error";
    }
  });
}

async function loadRelated(categoryId) {
  const q = query(collection(db, "products"), where("categoryId", "==", categoryId), limit(5));
  const snap = await getDocs(q);
  const grid = document.getElementById("relatedGrid");
  snap.forEach((docSnap) => {
    if (docSnap.id === productId) return;
    const p = docSnap.data();
    const card = document.createElement("a");
    card.href = `product.html?id=${docSnap.id}`;
    card.className = "product-card";
    const imgUrl = getProductImage(p.name, p.images?.[0]);
    card.innerHTML = `
      <img src="${imgUrl}" alt="${p.name}" onerror="this.src='https://placehold.co/300x300?text=${encodeURIComponent(p.name)}'" />
      <h3>${p.name}</h3>
      <p class="price">${p.price.toLocaleString("ru-RU")} ₸</p>
    `;
    grid.appendChild(card);
  });
}

async function loadReviews() {
  const list = document.getElementById("reviewsList");
  const empty = document.getElementById("reviewsEmpty");
  list.innerHTML = "";

  const q = query(
    collection(db, "reviews"),
    where("productId", "==", productId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  snap.forEach((docSnap) => {
    const r = docSnap.data();
    const date = r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleDateString("ru-RU")
      : "";
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    const isOwner = currentUid && currentUid === r.userId;

    const el = document.createElement("div");
    el.className = "review-item";
    el.innerHTML = `
      <div class="review-header">
        <span class="review-stars">${stars}</span>
        <strong>${r.userName || "Аноним"}</strong>
        <span class="review-date">${date}</span>
        ${isOwner ? `<button class="secondary review-delete" data-id="${docSnap.id}">Удалить</button>` : ""}
      </div>
      <p style="margin:4px 0 0;">${r.text}</p>
    `;
    list.appendChild(el);
  });

  list.querySelectorAll(".review-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Удалить свой отзыв?")) return;
      await deleteReview(btn.dataset.id);
    });
  });
}

async function deleteReview(reviewId) {
  try {
    const reviewSnap = await getDoc(doc(db, "reviews", reviewId));
    const reviewData = reviewSnap.data();

    await runTransaction(db, async (tx) => {
      const productRef = doc(db, "products", productId);
      const productSnap = await tx.get(productRef);
      const pData = productSnap.data();
      const newCount = Math.max((pData.reviewsCount || 1) - 1, 0);
      const newRating = newCount === 0
        ? 0
        : ((pData.rating || 0) * (pData.reviewsCount || 1) - reviewData.rating) / newCount;

      tx.delete(doc(db, "reviews", reviewId));
      tx.update(productRef, {
        reviewsCount: newCount,
        rating: Math.round(newRating * 10) / 10,
      });
    });

    refreshRating();
    loadReviews();
  } catch (err) {
    alert("Ошибка удаления: " + err.message);
  }
}

async function refreshRating() {
  const snap = await getDoc(doc(db, "products", productId));
  const d = snap.data();
  document.getElementById("productRating").textContent =
    "★ " + (d.rating?.toFixed(1) || "—") + " (" + (d.reviewsCount || 0) + " отзывов)";
}

const starSpans = document.querySelectorAll("#starPicker span");
let selectedRating = 0;

starSpans.forEach((star) => {
  star.addEventListener("mouseover", () => highlightStars(parseInt(star.dataset.val)));
  star.addEventListener("mouseout", () => highlightStars(selectedRating));
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.val);
    document.getElementById("reviewRating").value = selectedRating;
    highlightStars(selectedRating);
  });
});

function highlightStars(count) {
  starSpans.forEach((s) => {
    s.textContent = parseInt(s.dataset.val) <= count ? "★" : "☆";
    s.style.color = parseInt(s.dataset.val) <= count ? "#f59e0b" : "#9ca3af";
  });
}

document.getElementById("reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("reviewMsg");
  msg.textContent = "";

  if (!currentUid) {
    msg.textContent = "Необходимо войти в аккаунт.";
    msg.className = "error";
    return;
  }
  if (selectedRating === 0) {
    msg.textContent = "Выберите оценку (звёздочки).";
    msg.className = "error";
    return;
  }
  const text = document.getElementById("reviewText").value.trim();
  if (!text) {
    msg.textContent = "Напишите комментарий.";
    msg.className = "error";
    return;
  }

  try {
    await runTransaction(db, async (tx) => {
      const productRef = doc(db, "products", productId);
      const productSnap = await tx.get(productRef);
      const pData = productSnap.data();
      const newCount = (pData.reviewsCount || 0) + 1;
      const newRating = ((pData.rating || 0) * (pData.reviewsCount || 0) + selectedRating) / newCount;

      const reviewRef = doc(collection(db, "reviews"));
      tx.set(reviewRef, {
        productId,
        userId: currentUid,
        userName: currentUserName,
        rating: selectedRating,
        text,
        createdAt: serverTimestamp(),
      });
      tx.update(productRef, {
        reviewsCount: newCount,
        rating: Math.round(newRating * 10) / 10,
      });
    });

    document.getElementById("reviewText").value = "";
    selectedRating = 0;
    highlightStars(0);
    document.getElementById("reviewRating").value = 0;
    msg.textContent = "Отзыв добавлен!";
    msg.className = "success";

    refreshRating();
    loadReviews();
  } catch (err) {
    msg.textContent = "Ошибка: " + err.message;
    msg.className = "error";
  }
});

loadProduct();
