import { db } from "./firebase/firebase-config.js";
import { watchAuthState, logoutUser } from "./firebase/auth.js";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const statusLabels = {
  new: "Новый",
  processing: "В обработке",
  done: "Выполнен",
  cancelled: "Отменён",
};

function subscribeOrders(uid) {
  const ordersList = document.getElementById("ordersList");
  const emptyMsg = document.getElementById("ordersEmptyMsg");

  const q = query(
    collection(db, "orders"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    ordersList.innerHTML = "";

    if (snap.empty) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    snap.forEach((docSnap) => {
      const order = docSnap.data();
      const date = order.createdAt?.toDate
        ? order.createdAt.toDate().toLocaleString("ru-RU")
        : "—";
      const itemsList = order.items
        .map((i) => `
          <div class="order-item-row">
            <div class="order-item-info">
              <span class="order-item-name">${i.name} × ${i.qty}</span>
              <a href="product.html?id=${i.productId}#reviews" class="btn-leave-review">Оставить отзыв</a>
            </div>
          </div>
        `)
        .join("");

      const statusClass =
        order.status === "done" ? "status-done" :
        order.status === "cancelled" ? "status-cancelled" :
        order.status === "processing" ? "status-processing" : "";

      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `
        <p><strong>Заказ #${docSnap.id.slice(0, 8)}</strong> от ${date}</p>
        <p>${itemsList}</p>
        <p>Сумма: <strong>${order.total.toLocaleString("ru-RU")} ₸</strong></p>
        <p>Статус: <strong class="${statusClass}">${statusLabels[order.status] || order.status}</strong></p>
      `;
      ordersList.appendChild(el);
    });
  });
}

const guestBlock = document.getElementById("guestBlock");
const profileBlock = document.getElementById("profileBlock");
const nav = document.getElementById("nav");
const message = document.getElementById("message");

let currentUid = null;
let currentRole = "user";
let unsubscribeOrders = null; 

watchAuthState((user, profile) => {
  if (!user) {
    guestBlock.classList.remove("hidden");
    profileBlock.classList.add("hidden");
    nav.innerHTML = `<a href="index.html">Каталог</a><a href="login.html">Вход</a><a href="register.html">Регистрация</a>`;
    return;
  }

  currentUid = user.uid;
  guestBlock.classList.add("hidden");
  profileBlock.classList.remove("hidden");

  currentRole = profile?.role || "user";
  document.getElementById("name").value = profile?.name || "";
  document.getElementById("phone").value = profile?.phone || "";
  document.getElementById("emailDisplay").textContent = profile?.email || user.email;
  document.getElementById("roleDisplay").textContent = currentRole;

  const adminLink = profile?.role === "admin" ? `<a href="admin.html">Админ-панель</a>` : "";
  nav.innerHTML = `<a href="index.html">Каталог</a><a href="cart.html">Корзина</a>${adminLink}<a href="#" id="logoutLink">Выйти</a>`;
  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    if (unsubscribeOrders) unsubscribeOrders();
    await logoutUser();
    window.location.href = "index.html";
  });

  if (unsubscribeOrders) unsubscribeOrders();
  unsubscribeOrders = subscribeOrders(currentUid);
});

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  message.className = "";

  if (!currentUid) {
    message.textContent = "Ошибка: uid = null (не авторизован?)";
    message.className = "error";
    return;
  }

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();

  try {
    await setDoc(doc(db, "users", currentUid), { name, phone, role: currentRole }, { merge: true });
    message.textContent = "Данные сохранены";
    message.className = "success";
  } catch (err) {
    message.textContent = "Ошибка: " + err.message + " | uid=" + currentUid + " | role=" + currentRole;
    message.className = "error";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await logoutUser();
  window.location.href = "index.html";
});
