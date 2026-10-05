(() => {
  "use strict";

  const pillarCards = document.querySelectorAll(".strategy-glance-pillar");
  pillarCards.forEach(card => {
    card.addEventListener("mouseenter", () => card.setAttribute("data-active", "true"));
    card.addEventListener("mouseleave", () => card.removeAttribute("data-active"));
  });

  document.querySelectorAll(".strategy-glance-pillar details").forEach(details => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      document.querySelectorAll(".strategy-glance-pillar details[open]").forEach(item => {
        if (item !== details) item.removeAttribute("open");
      });
    });
  });
})();
