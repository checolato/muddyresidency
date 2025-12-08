// tutorial.js — rewritten clean version

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------------------
   * 1) PROCESS MENU — Only one major section shown at a time
   * ----------------------------------------------------------------------*/
  const navItems = [...document.querySelectorAll('.process-nav-item')];
  const screens  = [...document.querySelectorAll('.process-screen')];

  function showProcess(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.target === id));
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => showProcess(item.dataset.target));
  });

  // Default to clay screen
  if (!screens.some(s => s.classList.contains('active'))) {
    showProcess('process-clay');
  }

  /* ------------------------------------------------------------------------
   * 2) CLAY STEPPER — Updates steps + illustrations
   * ----------------------------------------------------------------------*/
  const steps        = [...document.querySelectorAll('.clay-step')];
  const prevBtn      = document.getElementById('step-prev');
  const nextBtn      = document.getElementById('step-next');
  const illustration = document.getElementById('step-illustration');

  const stepImages = [
    'assets/step 1.png',
    'assets/step 2.png',
    'assets/step 3.png',
    'assets/step 4.png',
    'assets/step 5.png',
    'assets/step 6.png',
    'assets/step 7.png',
    'assets/step 8.png'
  ];

  const stepAlts = [
    'Step 1 – split the clay into two portions',
    'Step 2 – make a smooth ball from the larger portion',
    'Step 3 – pinch a hole in the middle and rotate outwards',
    'Step 4 – expand the form to create a bowl shape',
    'Step 5 – refine the rim with your fingers and tools',
    'Step 6 – roll a strip from the smaller portion for the base ring',
    'Step 7 – join the ring and blend the seam where bowl and base meet',
    'Step 8 – smooth all surfaces with a damp sponge'
  ];

  const checkBtn     = document.getElementById('check-bowl-btn');
  const resultText   = document.getElementById('check-result');
  const scanStatus   = document.getElementById('scan-status');
  const scanStartBtn = document.getElementById('scan-start-btn');
  const shapeOverlay = document.getElementById('shape-overlay');

  const nextStepBtn  = document.getElementById('next-step-btn');

  function resetScanUI() {
    if (scanStartBtn) {
      scanStartBtn.style.display = 'none';
      scanStartBtn.classList.add('is-disabled');
      scanStartBtn.disabled = true;
    }
    if (scanStatus) {
      scanStatus.textContent = 'Follow the clay steps. The checker will appear at the last step.';
    }
    if (resultText) {
      resultText.textContent = 'Follow the clay steps. The checker will appear at the last step.';
    }
    if (nextStepBtn) nextStepBtn.classList.remove('visible');
    if (shapeOverlay) shapeOverlay.classList.remove('active');
  }

  if (steps.length && prevBtn && nextBtn) {
    let currentIndex = 0;

    function updateSteps() {
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === currentIndex);
      });

      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === steps.length - 1;

      // Update illustration
      if (illustration) {
        illustration.src = stepImages[currentIndex];
        illustration.alt = stepAlts[currentIndex];
      }

      // Show check button only at Step 8
      if (currentIndex === steps.length - 1) {
        checkBtn.style.display = 'inline-flex';
        resultText.textContent =
          'You’ve reached the last step. Tap the button to set up the checker.';
      } else {
        checkBtn.style.display = 'none';
        resetScanUI();
      }
    }

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSteps();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < steps.length - 1) {
        currentIndex++;
        updateSteps();
      }
    });

    updateSteps();
  }

  /* ------------------------------------------------------------------------
   * 3) FAKE AR SCAN — Webcam + scanning animation + success flow
   * ----------------------------------------------------------------------*/
  const overlay  = document.getElementById('scan-overlay');
  const video    = document.getElementById('scan-video');

  let videoStream = null;
  let isScanning  = false;

  function stopVideo() {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    if (video) {
      video.classList.remove('active');
      video.srcObject = null;
    }
    illustration?.classList.remove('hidden');
    shapeOverlay?.classList.remove('active');
  }

  // Initial UI state
  checkBtn.style.display = 'none';
  scanStartBtn.style.display = 'none';
  scanStartBtn.classList.add('is-disabled');
  scanStartBtn.disabled = true;
  nextStepBtn?.classList.remove('visible');

  /* -----------------------------
   * 3a. User taps "check my bowl"
   * ----------------------------*/
  checkBtn.addEventListener('click', () => {
    shapeOverlay.classList.add('active');
    scanStartBtn.style.display = 'inline-flex';
    scanStartBtn.classList.add('is-disabled');
    scanStartBtn.disabled = true;

    scanStatus.textContent =
      'We’re opening your camera. Allow access, then you can start scanning.';
    resultText.textContent =
      'When the camera appears, place your bowl inside the shape.';

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          videoStream = stream;
          video.srcObject = stream;
          video.classList.add('active');
          illustration.classList.add('hidden');

          scanStatus.textContent =
            'Align your bowl inside the shape, then tap “Scan and check”.';

          scanStartBtn.classList.remove('is-disabled');
          scanStartBtn.disabled = false;
        })
        .catch(() => {
          scanStatus.textContent =
            'Camera not available. You can still tap “Scan and check” to continue.';
          scanStartBtn.classList.remove('is-disabled');
          scanStartBtn.disabled = false;
        });
    } else {
      scanStatus.textContent =
        'Camera not available. You can still tap “Scan and check” to continue.';
      scanStartBtn.classList.remove('is-disabled');
      scanStartBtn.disabled = false;
    }
  });

  /* -----------------------------
   * 3b. User taps "Scan and check"
   * ----------------------------*/
  scanStartBtn.addEventListener('click', () => {
    if (isScanning) return;
    isScanning = true;

    overlay.classList.add('active');
    scanStatus.textContent = 'Scanning your bowl… hold still.';
    resultText.textContent = 'Checking proportions and surface…';

    setTimeout(() => {
      overlay.classList.remove('active');

      scanStatus.textContent =
        '✅ Your bowl looks ready for bisque fire. You can book a firing session.';
      resultText.textContent =
        'Looks good! You can refine the rim one last time if you want.';

      stopVideo();
      isScanning = false;

      // Reveal NEXT STEP button
      nextStepBtn.classList.add('visible');

    }, 2500);
  });

  /* -----------------------------
   * 3c. "Next step →"
   * ----------------------------*/
  nextStepBtn?.addEventListener('click', () => {
    showProcess('process-bisque');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    nextStepBtn.classList.remove('visible');
  });

});
