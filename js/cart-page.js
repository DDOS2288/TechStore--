import { watchAuthState, logoutUser } from "./firebase/auth.js";
import { getCart, updateQty, removeFromCart, checkout } from "./firebase/cart.js";
import { showToast } from "./toast.js";

const nav = document.getElementById("nav");
const guestBlock = document.getElementById("guestBlock");
const emptyCartMsg = document.getElementById("emptyCartMsg");
const cartItemsEl = document.getElementById("cartItems");
const cartFooter = document.getElementById("cartFooter");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutMessage = document.getElementById("checkoutMessage");

let currentUid = null;

watchAuthState((user, profile) => {
  if (!user) {
    guestBlock.classList.remove("hidden");
    nav.innerHTML = `<a href="index.html">Каталог</a><a href="login.html">Вход</a><a href="register.html">Регистрация</a>`;
    return;
  }

  currentUid = user.uid;
  const adminLink = profile?.role === "admin" ? `<a href="admin.html">Админ-панель</a>` : "";
  nav.innerHTML = `<a href="index.html">Каталог</a><a href="profile.html">Личный кабинет</a>${adminLink}<a href="#" id="logoutLink">Выйти</a>`;
  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUser();
    window.location.reload();
  });

  renderCart();
});

async function renderCart() {
  const items = await getCart(currentUid);
  cartItemsEl.innerHTML = "";

  if (!items.length) {
    emptyCartMsg.classList.remove("hidden");
    cartFooter.classList.add("hidden");
    return;
  }

  emptyCartMsg.classList.add("hidden");
  cartFooter.classList.remove("hidden");

  let total = 0;

  items.forEach((item) => {
    total += item.price * item.qty;

    const row = document.createElement("div");
    row.className = "card cart-row";
    row.innerHTML = `
      <img src="${item.image || "https://placehold.co/80x80?text=No+Image"}" alt="${item.name}" />
      <div class="cart-row-info">
        <p><strong>${item.name}</strong></p>
        <p>${item.price.toLocaleString("ru-RU")} ₸ × 
          <input type="number" min="0" value="${item.qty}" class="qtyInput" data-id="${item.productId}" style="width:60px;" />
        </p>
      </div>
      <button class="secondary removeBtn" data-id="${item.productId}">Удалить</button>
    `;
    cartItemsEl.appendChild(row);
  });

  cartTotal.textContent = total.toLocaleString("ru-RU") + " ₸";

  document.querySelectorAll(".qtyInput").forEach((input) => {
    input.addEventListener("change", async () => {
      const qty = parseInt(input.value, 10) || 0;
      await updateQty(currentUid, input.dataset.id, qty);
      renderCart();
    });
  });

  document.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await removeFromCart(currentUid, btn.dataset.id);
      renderCart();
    });
  });
}

checkoutBtn.addEventListener("click", async () => {
  checkoutMessage.textContent = "";
  checkoutMessage.className = "";
  try {
    const items = await getCart(currentUid);
    const orderId = await checkout(currentUid, items);
    const msg = "Заказ оформлен! Номер заказа: #" + orderId.slice(0, 8);
    checkoutMessage.textContent = msg;
    checkoutMessage.className = "success";
    showToast(msg, "success");
    renderCart();
  } catch (err) {
    checkoutMessage.textContent = "Ошибка: " + err.message;
    checkoutMessage.className = "error";
    showToast("Ошибка: " + err.message, "error");
  }
});
