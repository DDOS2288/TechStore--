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

export async function getCart(uid) {
  const snap = await getDoc(doc(db, "carts", uid));
  return snap.exists() ? snap.data().items || [] : [];
}

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

export async function removeFromCart(uid, productId) {
  const items = await getCart(uid);
  const filtered = items.filter((i) => i.productId !== productId);
  await setDoc(doc(db, "carts", uid), { items: filtered });
  return filtered;
}

export async function checkout(uid, items) {
  if (!items.length) throw new Error("Корзина пуста");

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  for (const item of items) {
    const productRef = doc(db, "products", item.productId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(productRef);
      if (!snap.exists()) return;
      const currentStock = snap.data().stock ?? null;
      if (currentStock === null) return;
      const newStock = Math.max(0, currentStock - item.qty);
      transaction.update(productRef, {
        stock: newStock,
        inStock: newStock > 0,
      });
    });
  }

  const orderRef = await addDoc(collection(db, "orders"), {
    userId: uid,
    items,
    total,
    status: "new",
    createdAt: serverTimestamp(),
  });

  await deleteDoc(doc(db, "carts", uid));

  return orderRef.id;
}
