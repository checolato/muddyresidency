// tutorial.js

document.addEventListener('DOMContentLoaded', () => {
  const checkBtn   = document.getElementById('check-bowl-btn');
  const overlay    = document.getElementById('scan-overlay');
  const statusText = document.getElementById('scan-status');
  const resultText = document.getElementById('check-result');

  let isScanning = false;

  checkBtn.addEventListener('click', () => {
    if (isScanning) return;
    isScanning = true;

    // Show overlay + update text
    overlay.classList.add('active');
    statusText.textContent = 'Scanning your bowl… hold still.';
    resultText.textContent = 'Checking proportions and surface…';

    // Fake scan duration
    setTimeout(() => {
      overlay.classList.remove('active');
      statusText.textContent =
        '✅ Your bowl looks ready for bisque fire. You can book a firing session.';
      resultText.textContent =
        'Looks good! If you want, you can smooth the rim one more time before drying.';
      isScanning = false;
    }, 1800);
  });
});
