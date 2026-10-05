(() => {
  "use strict";

  const grid = document.querySelector(".trustee-grid");
  if (!grid) return;

  const teamSection = grid.closest(".subpage-section");
  const teamLabel = teamSection?.querySelector(".page-intro .overline");
  const teamTitle = teamSection?.querySelector(".page-intro h2");
  if (teamLabel) teamLabel.textContent = "SETSPF Leadership";
  if (teamTitle) teamTitle.textContent = "Meet the Team Behind the Fund";

  const cards = [...grid.querySelectorAll(".trustee-card")];
  cards.forEach((card, index) => { card.dataset.teamGroup = index < 8 ? "board" : "secretariat"; });

  const tabs = document.createElement("div");
  tabs.className = "team-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "SETSPF leadership groups");
  tabs.innerHTML = '<button class="is-active" type="button" role="tab" aria-selected="true" data-team-filter="board">Board of Trustees</button><button type="button" role="tab" aria-selected="false" data-team-filter="secretariat">Secretariat</button>';
  grid.before(tabs);

  const showGroup = group => {
    cards.forEach((card, index) => {
      const visible = card.dataset.teamGroup === group;
      card.hidden = !visible;
      card.classList.toggle("team-card-enter", visible);
      if (visible) card.style.animationDelay = `${Math.min(index, 7) * 45}ms`;
    });
    tabs.querySelectorAll("button").forEach(button => {
      const active = button.dataset.teamFilter === group;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  };

  tabs.addEventListener("click", event => {
    const button = event.target.closest("[data-team-filter]");
    if (button) showGroup(button.dataset.teamFilter);
  });

  showGroup("board");
})();
