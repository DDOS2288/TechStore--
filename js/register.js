import { registerUser, friendlyAuthError } from "./firebase/auth.js";
import { showToast } from "./toast.js";

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
    message.textContent = "Регистрация успешная! Переход в личный кабинет...";
    message.className = "success";
    showToast("Регистрация успешна!", "success");
    setTimeout(() => (window.location.href = "profile.html"), 1000);
  } catch (err) {
    const errorText = friendlyAuthError(err);
    message.textContent = errorText;
    message.className = "error";
    showToast(errorText, "error");
  }
});
