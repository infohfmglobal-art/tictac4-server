// Unlock sound after first touch
document.body.addEventListener("click", () => {
  clickSound.play().catch(() => {});
  clickSound.pause();
  clickSound.currentTime = 0;
}, { once: true });
const clickSound = document.getElementById("clickSound");
const winSound = document.getElementById("winSound");
