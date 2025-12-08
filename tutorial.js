// tutorial.js

document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------------------
  // 1) Process menu: one process screen at a time
  // ---------------------------------------
  const navItems = Array.from(document.querySelectorAll('.process-nav-item'));
  const screens = Array.from(document.querySelectorAll('.process-screen'));

  function showProcess(targetId) {
    screens.forEach((screen) => {
      screen.classList.toggle('active', screen.id === targetId);
    });

    navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.target === targetId);
    });
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target) showProcess(target);
    });
  });

  // ensure a default (clay) is active
  if (screens.length && !screens.some((s) => s.classList.contains('active'))) {
    showProcess('process-clay');
  }

  // ---------------------------------------
  // 2) Clay stepper navigation (inside clay process)
  // ---------------------------------------
  const steps = Array.from(document.querySelectorAll('.clay-step'));
  const prevBtn = document.getElementById('step-prev');
  const nextBtn = document.getElementById('step-next');

  if (steps.length && prevBtn && nextBtn) {
    let currentIndex = 0;

    function updateSteps() {
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === currentIndex);
      });

      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === steps.length - 1;
    }

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        updateSteps();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < steps.length - 1) {
        currentIndex += 1;
        updateSteps();
      }
    });

    updateSteps();
  }

  // ---------------------------------------
  // 3) Fake AR "check my bowl" scan
  // ---------------------------------------
  const checkBtn = document.getElementById('check-bowl-btn');
  const overlay = document.getElementById('scan-overlay');
  const statusText = document.getElementById('scan-status');
  const resultText = document.getElementById('check-result');

  if (checkBtn && overlay && statusText && resultText) {
    let isScanning = false;

    checkBtn.addEventListener('click', () => {
      if (isScanning) return;
      isScanning = true;

      overlay.classList.add('active');
      statusText.textContent = 'Scanning your bowl… hold still.';
      resultText.textContent = 'Checking proportions and surface…';

      setTimeout(() => {
        overlay.classList.remove('active');
        statusText.textContent =
          '✅ Your bowl looks ready for bisque fire. You can book a firing session.';
        resultText.textContent =
          'Looks good! If you want, you can smooth the rim one more time before drying.';
        isScanning = false;
      }, 1800);
    });
  }

  // (4) Bisque / glaze schedule pages have their own small inline scripts,
  // so we don’t touch them here.
});
