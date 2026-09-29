// auth.js
// Общий модуль авторизации. Импортируется на каждой странице.

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- РЕГИСТРАЦИЯ ----------
export async function registerUser(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Сохраняем имя в самом Auth-профиле
  await updateProfile(cred.user, { displayName: name });

  // Создаём документ пользователя в Firestore
  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    email,
    role: "user", // по умолчанию — обычный пользователь
    phone: "",
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

// ---------- ЛОГИН ----------
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ---------- ЛОГАУТ ----------
export async function logoutUser() {
  await signOut(auth);
}

// ---------- ВОССТАНОВЛЕНИЕ ПАРОЛЯ ----------
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ---------- ПОЛУЧИТЬ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ FIRESTORE (включая роль) ----------
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ---------- СЛЕДИМ ЗА СОСТОЯНИЕМ АВТОРИЗАЦИИ ----------
// callback(user, profile) вызывается при входе/выходе.
// user — объект Firebase Auth (или null), profile — документ из Firestore (или null).
export function watchAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
}

// ---------- ПЕРЕВОД ОШИБОК FIREBASE НА ПОНЯТНЫЙ ЯЗЫК ----------
export function friendlyAuthError(error) {
  const map = {
    "auth/email-already-in-use": "Этот email уже зарегистрирован",
    "auth/invalid-email": "Некорректный email",
    "auth/weak-password": "Пароль должен быть не менее 6 символов",
    "auth/user-not-found": "Пользователь не найден",
    "auth/wrong-password": "Неверный пароль",
    "auth/invalid-credential": "Неверный email или пароль",
    "auth/too-many-requests": "Слишком много попыток, попробуйте позже",
  };
  return map[error.code] || "Ошибка: " + error.message;
}
