(() => {
  "use strict";
  const header = document.querySelector("#siteHeader");
  if (!header || document.querySelector(".fund-ticker")) return;

  const items = [
    "17.24% return rate in 2025",
    "1,130 Active members as at 30 July 2026",
    "KES 3B+ Fund value",
    "36 Years of service"
  ];
  const group = hidden => `<div class="fund-ticker__set"${hidden ? ' aria-hidden="true"' : ''}>${items.map(item => `<span class="fund-ticker__item"><i aria-hidden="true"></i>${item}</span>`).join("")}</div>`;
  header.insertAdjacentHTML("afterend", `<section class="fund-ticker" aria-label="Fund performance highlights"><div class="fund-ticker__track">${group(false)}${group(true)}</div></section>`);
})();
