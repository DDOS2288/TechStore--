// cart.js

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- ПОЛУЧИТЬ КОРЗИНУ ----------
export async function getCart(uid) {
  const snap = await getDoc(doc(db, "carts", uid));
  return snap.exists() ? snap.data().items || [] : [];
}

// ---------- ДОБАВИТЬ ТОВАР ----------
export async function addToCart(uid, productId, product, qty = 1) {
  const items = await getCart(uid);
  const idx = items.findIndex((i) => i.productId === productId);

  if (idx >= 0) {
    items[idx].qty += qty;
  } else {
    items.push({
      productId,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "",
      qty,
    });
  }

  await setDoc(doc(db, "carts", uid), { items });
  return items;
}

// ---------- ИЗМЕНИТЬ КОЛИЧЕСТВО ----------
export async function updateQty(uid, productId, qty) {
  const items = await getCart(uid);
  const idx = items.findIndex((i) => i.productId === productId);
  if (idx < 0) return items;

  if (qty <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx].qty = qty;
  }

  await setDoc(doc(db, "carts", uid), { items });
  return items;
}

// ---------- УДАЛИТЬ ТОВАР ----------
export async function removeFromCart(uid, productId) {
  const items = await getCart(uid);
  const filtered = items.filter((i) => i.productId !== productId);
  await setDoc(doc(db, "carts", uid), { items: filtered });
  return filtered;
}

// ---------- ОФОРМИТЬ ЗАКАЗ (уменьшает stock у каждого товара) ----------
export async function checkout(uid, items) {
  if (!items.length) throw new Error("Корзина пуста");

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Уменьшаем stock через транзакции (безопасно при параллельных заказах)
  for (const item of items) {
    const productRef = doc(db, "products", item.productId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(productRef);
      if (!snap.exists()) return;
      const currentStock = snap.data().stock ?? null;
      // У старых товаров может не быть поля stock — не трогаем
      if (currentStock === null) return;
      const newStock = Math.max(0, currentStock - item.qty);
      transaction.update(productRef, {
        stock: newStock,
        inStock: newStock > 0,  // автоматически Да/Нет
      });
    });
  }

  // Создаём заказ
  const orderRef = await addDoc(collection(db, "orders"), {
    userId: uid,
    items,
    total,
    status: "new",
    createdAt: serverTimestamp(),
  });

  // Очищаем корзину
  await deleteDoc(doc(db, "carts", uid));

  return orderRef.id;
}
