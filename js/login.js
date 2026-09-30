import { loginUser, resetPassword, friendlyAuthError } from "./firebase/auth.js";
import { showToast } from "./toast.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const resetLink = document.getElementById("resetLink");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  message.className = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await loginUser(email, password);
    message.textContent = "Вход выполнен! Переход в личный кабинет...";
    message.className = "success";
    showToast("Успешный вход в аккаунт!", "success");
    setTimeout(() => (window.location.href = "profile.html"), 800);
  } catch (err) {
    const errorText = friendlyAuthError(err);
    message.textContent = errorText;
    message.className = "error";
    showToast(errorText, "error");
  }
});

resetLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) {
    const txt = "Введите email в поле выше, затем нажмите «Восстановить»";
    message.textContent = txt;
    message.className = "error";
    showToast(txt, "warn");
    return;
  }
  try {
    await resetPassword(email);
    const txt = "Письмо для сброса пароля отправлено на " + email;
    message.textContent = txt;
    message.className = "success";
    showToast(txt, "success");
  } catch (err) {
    const errorText = friendlyAuthError(err);
    message.textContent = errorText;
    message.className = "error";
    showToast(errorText, "error");
  }
});
