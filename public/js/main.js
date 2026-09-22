// StudyShare Client-Side Behavior
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navbar Toggle & Accessibility Handling
  const mobileMenuBtn = document.querySelector('.mobile-menu');
  const navMenuWrapper = document.querySelector('.nav-menu-wrapper');

  if (mobileMenuBtn && navMenuWrapper) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = navMenuWrapper.classList.toggle('active');
      mobileMenuBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      mobileMenuBtn.textContent = isActive ? '✕' : '☰';
    });

    // Close menu when clicking any nav link
    navMenuWrapper.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navMenuWrapper.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.textContent = '☰';
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenuWrapper.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navMenuWrapper.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.textContent = '☰';
      }
    });
  }

  // Flash Message Dismissal
  const flashDismissButtons = document.querySelectorAll('.flash-dismiss');
  flashDismissButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      const alert = e.target.closest('.flash-alert');
      if (alert) {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 250);
      }
    });
  });
});
