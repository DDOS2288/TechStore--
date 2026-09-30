import { registerUser, friendlyAuthError } from "./firebase/auth.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  message.className = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await registerUser(name, email, password);
    message.textContent = "Регистрация успешна! Переход в личный кабинет...";
    message.className = "success";
    setTimeout(() => (window.location.href = "profile.html"), 1000);
  } catch (err) {
    message.textContent = friendlyAuthError(err);
    message.className = "error";
  }
});
