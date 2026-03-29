const shameItems = Array.from(document.querySelectorAll("[data-shame]"));
const total = shameItems.reduce((sum, item) => {
  return sum + Number(item.getAttribute("data-shame") || 0);
}, 0);

const average = shameItems.length ? Math.round(total / shameItems.length) : 0;
const score = document.getElementById("shame-score");

if (score) {
  score.textContent = `Shame score: ${average}/100. nobody involved should feel good about this.`;
}
