document.addEventListener('DOMContentLoaded', () => {
  const tabLinks = document.querySelectorAll('.admin-tabs a');
  const panels = document.querySelectorAll('.admin-panel');

  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Remove active class from all tabs
      tabLinks.forEach(tab => tab.parentElement.classList.remove('active'));

      // Hide all panels
      panels.forEach(panel => panel.style.display = 'none');

      // Add active class to clicked tab
      link.parentElement.classList.add('active');

      // Get panel ID
      const target = link.getAttribute('href').substring(1); // removes #
      const panelToShow = document.getElementById(`${target}-panel`);

      if (panelToShow) panelToShow.style.display = 'block';
    });
  });
});

function switchAdminTab(tabId) {
  const allPanels = document.querySelectorAll('.content-panel');
  allPanels.forEach(panel => panel.style.display = 'none');

  document.querySelectorAll('.wallet-nav li').forEach(li => li.classList.remove('active'));

  const panel = document.getElementById(tabId);
  if (panel) panel.style.display = 'block';

  document.querySelector(`a[href="#${tabId}"]`).parentElement.classList.add('active');
}

