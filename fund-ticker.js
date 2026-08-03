(() => {
  "use strict";
  const aboutDropdown = [...document.querySelectorAll(".nav-dropdown")].find(dropdown => dropdown.querySelector("summary")?.textContent.trim().startsWith("About"));
  const aboutMenu = aboutDropdown?.querySelector(".nav-dropdown__menu");
  if (aboutMenu && !aboutMenu.querySelector('a[href="service-providers.html"]')) {
    const serviceProvidersLink = document.createElement("a");
    serviceProvidersLink.href = "service-providers.html";
    serviceProvidersLink.textContent = "Service providers";
    const strategyLink = aboutMenu.querySelector('a[href="strategy-2025-2030.html"]');
    aboutMenu.insertBefore(serviceProvidersLink, strategyLink || null);
  }

  const header = document.querySelector("#siteHeader");
  if (!header || document.querySelector(".fund-ticker")) return;

  const items = [
    "17.24% return rate in 2025",
    "1,132 Active members as at 30 July 2026",
    "KES 3B+ Fund value",
    "36 Years of service"
  ];
  const group = hidden => `<div class="fund-ticker__set"${hidden ? ' aria-hidden="true"' : ''}><span class="fund-ticker__label">Fund snapshot</span>${items.map(item => `<span class="fund-ticker__item"><i aria-hidden="true"></i>${item}</span>`).join("")}</div>`;
  header.insertAdjacentHTML("afterend", `<section class="fund-ticker" aria-label="Fund performance highlights"><div class="fund-ticker__track">${group(false)}${group(true)}</div></section>`);
})();
