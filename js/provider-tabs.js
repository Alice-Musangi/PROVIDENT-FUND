(() => {
  "use strict";

  const grid = document.querySelector(".provider-grid");
  if (!grid) return;

  const section = grid.closest(".providers-network");
  const label = section?.querySelector(".providers-network__intro .overline");
  const title = section?.querySelector(".providers-network__intro h2");
  if (label) label.hidden = true;
  if (title) title.textContent = "Meet Our Service Providers";

  const cards = [...grid.querySelectorAll(".provider-card")];
  cards.forEach((card, index) => { card.dataset.providerGroup = index < 3 ? "fund" : "insurance"; });

  const tabs = document.createElement("div");
  tabs.className = "provider-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Service provider groups");
  tabs.innerHTML = '<button class="is-active" type="button" role="tab" aria-selected="true" data-provider-filter="fund">Fund Services</button><button type="button" role="tab" aria-selected="false" data-provider-filter="insurance">Insurance Partners</button>';
  grid.before(tabs);

  const showGroup = group => {
    cards.forEach((card, index) => {
      const visible = card.dataset.providerGroup === group;
      card.hidden = !visible;
      card.classList.toggle("provider-card-enter", visible);
      if (visible) card.style.animationDelay = `${Math.min(index, 4) * 55}ms`;
    });
    tabs.querySelectorAll("button").forEach(button => {
      const active = button.dataset.providerFilter === group;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  };

  tabs.addEventListener("click", event => {
    const button = event.target.closest("[data-provider-filter]");
    if (button) showGroup(button.dataset.providerFilter);
  });

  showGroup("fund");
})();
