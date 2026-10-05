document.querySelectorAll('.policy-print').forEach((button) => {
  button.addEventListener('click', () => {
    const section = button.closest('.policy-document');
    if (section && location.hash !== `#${section.id}`) history.replaceState(null, '', `#${section.id}`);
    window.print();
  });
});
