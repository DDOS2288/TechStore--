import { loginUser, resetPassword, friendlyAuthError } from "./firebase/auth.js";

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
    setTimeout(() => (window.location.href = "profile.html"), 800);
  } catch (err) {
    message.textContent = friendlyAuthError(err);
    message.className = "error";
  }
});

resetLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) {
    message.textContent = "Введите email в поле выше, затем нажмите «Восстановить»";
    message.className = "error";
    return;
  }
  try {
    await resetPassword(email);
    message.textContent = "Письмо для сброса пароля отправлено на " + email;
    message.className = "success";
  } catch (err) {
    message.textContent = friendlyAuthError(err);
    message.className = "error";
  }
});
