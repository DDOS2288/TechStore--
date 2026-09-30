export function showToast(msg, type = "warn") {
  document.getElementById("hackToast")?.remove();
  const toast = document.createElement("div");
  toast.id = "hackToast";

  let color = "#00ff41";
  let bg = "rgba(0, 25, 0, 0.95)";

  if (type === "error") {
    color = "#ff3030";
    bg = "rgba(40, 0, 0, 0.95)";
  } else if (type === "success") {
    color = "#00ff41";
    bg = "rgba(0, 35, 10, 0.95)";
  } else if (type === "warn" || type === "warning") {
    color = "#ffaa00";
    bg = "rgba(35, 25, 0, 0.95)";
  }

  toast.style.cssText = [
    "position:fixed",
    "top:80px",
    "right:20px",
    "z-index:99999",
    `background:${bg}`,
    `border:1px solid ${color}`,
    `color:${color}`,
    "padding:12px 20px",
    "border-radius:6px",
    "font-family:'Share Tech Mono',monospace",
    "font-size:0.88rem",
    "max-width:320px",
    `box-shadow:0 0 18px ${color}66`,
    "opacity:0",
    "transform:translateX(20px)",
    "transition:opacity 0.25s,transform 0.25s",
    "pointer-events:none",
  ].join(";");

  toast.textContent = "> " + msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}
