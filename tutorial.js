// tutorial.js
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

  // Default screen (if none active)
  if (!screens.some(s => s.classList.contains('active')) && screens.length) {
    showProcess('process-clay');
  }

  /* ------------------------------------------------------------------------
   * 2) CLAY STEPPER — steps + step illustrations + LEFT MENU STEP TABS
   *    IMPORTANT FIX: scope clay step menu items to ONLY process-clay
   * ----------------------------------------------------------------------*/
  const steps         = [...document.querySelectorAll('.clay-step')];

  const clayNav       = document.querySelector('.process-nav-item[data-target="process-clay"]');
  const stepMenuItems = clayNav ? [...clayNav.querySelectorAll('.clay-step-menu-item')] : [];

  const prevBtn       = document.getElementById('step-prev');
  const nextBtn       = document.getElementById('step-next');
  const illustration  = document.getElementById('step-illustration');

  const stepImages = [
    'assets/step 1.png',
    'assets/step 2.png',
    'assets/step 3.png',
    'assets/step 4.png',
    'assets/step 5.png',
    'assets/step 6.png',
    'assets/step 7.png',
    'assets/step 8.png',
    'assets/step 9.png'
  ];

  const stepAlts = [
    'Step 1 - split the clay into two portions',
    'Step 2 - make a smooth ball from the larger portion',
    'Step 3 - pinch a hole in the middle and rotate outwards',
    'Step 4 - expand the form to create a bowl shape',
    'Step 5 - refine the rim with your fingers and tools',
    'Step 6 - roll a strip from the smaller portion for the base ring',
    'Step 7 - join the ring and blend the seam where bowl and base meet',
    'Step 8 - check your bowl using the guide and scanner',
    'Step 9 - sponge and smooth the surfaces one last time'
  ];

  const checkBtn        = document.getElementById('check-bowl-btn');
  const resultText      = document.getElementById('check-result');
  const scanStatus      = document.getElementById('scan-status'); // ok if null
  const scanStartBtn    = document.getElementById('scan-start-btn');
  const shapeOverlay    = document.getElementById('shape-overlay');
  const nextStepBtn     = document.getElementById('next-step-btn');
  const scanInstruction = document.getElementById('scan-instruction');

  // Popups
  const scanSuccessPopup = document.getElementById('scan-success-popup');
  const scanIssuesPopup  = document.getElementById('scan-issues-popup');

  // Issue summary list (right side)
  const scanIssueSummary = document.getElementById('scan-issue-summary');

  // Shape image swap
  const shapeImg      = document.getElementById('shape-overlay-img');
  const goodShapeSrc  = 'assets/shape.png';
  const badShapeSrc   = 'assets/shapebad.png';

  // Scan overlay + video
  const overlay = document.getElementById('scan-overlay');
  const video   = document.getElementById('scan-video');

  let canScan        = false;
  let hasShownIssues = false;

  // Stepper state + callable updater (outer scope)
  let currentIndex = 0;
  let updateSteps  = () => {};

  let videoStream = null;
  let isScanning  = false;

  function hideScanPopups() {
    if (scanSuccessPopup) scanSuccessPopup.classList.remove('show');
    if (scanIssuesPopup)  scanIssuesPopup.classList.remove('show');
  }

  function hideIssueSummary() {
    if (scanIssueSummary) scanIssueSummary.classList.remove('show');
  }

  function showIssueSummary() {
    if (scanIssueSummary) scanIssueSummary.classList.add('show');
  }

  function setShapeGood() {
    if (shapeImg) shapeImg.src = goodShapeSrc;
  }

  function setShapeBad() {
    if (shapeImg) shapeImg.src = badShapeSrc;
  }

  function stopClayVideo() {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    if (video) {
      video.classList.remove('active');
      video.srcObject = null;
    }
    if (illustration) illustration.classList.remove('hidden');
    if (shapeOverlay) shapeOverlay.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  function resetScanUI() {
    canScan = false;
    hasShownIssues = false;

    setShapeGood();
    hideIssueSummary();
    hideScanPopups();

    if (scanStartBtn) {
      scanStartBtn.style.display = 'none';
      scanStartBtn.classList.add('is-disabled');
      scanStartBtn.disabled = true;
    }

    if (scanStatus) scanStatus.textContent = 'Follow the clay steps. The checker will appear at step 8.';
    if (resultText) resultText.textContent = 'Follow the clay steps. The checker will appear at step 8.';

    // keep the old button hidden forever
    if (nextStepBtn) nextStepBtn.classList.remove('visible');

    if (shapeOverlay) shapeOverlay.classList.remove('active');
    if (scanInstruction) scanInstruction.classList.remove('visible');

    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'check my bowl before bisque firing';
      checkBtn.classList.remove('is-scan-mode');
    }
  }

  function resetClayStepUI() {
    stepMenuItems.forEach(item => item.classList.remove('active'));
    if (checkBtn) checkBtn.style.display = 'none';
    if (scanInstruction) scanInstruction.classList.remove('visible');
  }

  function cleanupClayOverlaysAndCamera() {
    stopClayVideo();
    resetScanUI();
    resetClayStepUI();
  }

  // Process menu clicks (always work)
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (!target) return;

      if (target !== 'process-clay') cleanupClayOverlaysAndCamera();
      showProcess(target);

      if (target === 'process-clay') updateSteps();

      // If user clicks "02 bisque fire" main row, default to bisque step 1
      if (target === 'process-bisque') {
        showBisqueStep(1);
        setBisqueMenuActive(1);
      }
    });
  });

  /* ------------------------------------------------------------------------
   * 2B) CLAY STEPPER LOGIC
   * ----------------------------------------------------------------------*/
  if (steps.length && prevBtn && nextBtn && resultText) {
    const totalSteps = steps.length;
    const SCAN_STEP_INDEX = totalSteps - 2; // Step 8 (index 7)

    function clampIndex(i) {
      return Math.max(0, Math.min(totalSteps - 1, i));
    }

    updateSteps = function () {
      currentIndex = clampIndex(currentIndex);

      steps.forEach((step, i) => step.classList.toggle('active', i === currentIndex));

      const currentStepNumber = currentIndex + 1;
      stepMenuItems.forEach(item => {
        const stepNum = Number(item.dataset.step);
        item.classList.toggle('active', stepNum === currentStepNumber);
      });

      prevBtn.disabled = currentIndex === 0;

      // keep right arrow usable
      nextBtn.disabled = false;

      if (illustration && stepImages[currentIndex]) {
        illustration.src = stepImages[currentIndex];
        illustration.alt = stepAlts[currentIndex] || '';
      }

      // Show scan button only on Step 8
      if (checkBtn) {
        if (currentIndex === SCAN_STEP_INDEX) {
          checkBtn.style.display = 'inline-flex';

          if (!canScan) {
            resultText.textContent =
              "You've reached 'check your bowl'. Tap the button to set up the checker.";
          } else {
            if (scanInstruction) scanInstruction.classList.add('visible');
          }
        } else {
          checkBtn.style.display = 'none';
          resetScanUI();
        }
      }
    };

    prevBtn.addEventListener('click', () => {
      currentIndex = clampIndex(currentIndex - 1);
      updateSteps();
    });

    nextBtn.addEventListener('click', () => {
      // Step 9 -> Process 2 (bisque) step 1
      if (currentIndex === totalSteps - 1) {
        cleanupClayOverlaysAndCamera();
        showProcess('process-bisque');
        showBisqueStep(1);
        setBisqueMenuActive(1);
        return;
      }

      currentIndex = clampIndex(currentIndex + 1);
      updateSteps();
    });

    // Clay step menu items (ONLY inside process-clay now)
    stepMenuItems.forEach(item => {
      item.addEventListener('click', (event) => {
        event.stopPropagation();

        showProcess('process-clay');

        const stepNum = Number(item.dataset.step);
        if (!Number.isNaN(stepNum)) {
          currentIndex = clampIndex(stepNum - 1);
          updateSteps();
        }
      });
    });

    updateSteps();
  }

  /* ------------------------------------------------------------------------
   * 2C) BISQUE (PROCESS 2) SUBSTEPS — Step 1 schedule / Step 2 timeline
   * ----------------------------------------------------------------------*/
  const bisqueStep1 = document.getElementById('bisque-step-1');
  const bisqueStep2 = document.getElementById('bisque-step-2');

  function showBisqueStep(stepNum) {
    if (!bisqueStep1 || !bisqueStep2) return;
    const is1 = Number(stepNum) === 1;
    bisqueStep1.style.display = is1 ? 'block' : 'none';
    bisqueStep2.style.display = is1 ? 'none' : 'block';
  }

  function setBisqueMenuActive(stepNum) {
    const bisqueNav = document.querySelector('.process-nav-item[data-target="process-bisque"]');
    if (!bisqueNav) return;

    // support either class name (in case your HTML still uses clay-step-menu-item)
    const items = [
      ...bisqueNav.querySelectorAll('.bisque-step-menu-item'),
      ...bisqueNav.querySelectorAll('.clay-step-menu-item')
    ];

    items.forEach(el => el.classList.toggle('active', Number(el.dataset.step) === Number(stepNum)));
  }

  // Bind clicks for bisque step items (scoped INSIDE process-bisque nav item)
  const bisqueNav = document.querySelector('.process-nav-item[data-target="process-bisque"]');
  if (bisqueNav) {
    const bisqueStepItems = [
      ...bisqueNav.querySelectorAll('.bisque-step-menu-item'),
      ...bisqueNav.querySelectorAll('.clay-step-menu-item') // fallback
    ];

    bisqueStepItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        showProcess('process-bisque');
        showBisqueStep(item.dataset.step);
        setBisqueMenuActive(item.dataset.step);
      });
    });

    // Clicking the main row defaults to step 1
    const mainRow = bisqueNav.querySelector('.process-main');
    if (mainRow) {
      mainRow.addEventListener('click', (e) => {
        e.stopPropagation();
        showProcess('process-bisque');
        showBisqueStep(1);
        setBisqueMenuActive(1);
      });
    }
  }

  /* ------------------------------------------------------------------------
   * 3) CLAY FAKE AR SCAN — webcam + overlay + TWO-PASS RESULT
   * ----------------------------------------------------------------------*/
  if (checkBtn) {
    // hide unused old scan-start + next-step buttons
    if (scanStartBtn) {
      scanStartBtn.style.display = 'none';
      scanStartBtn.classList.add('is-disabled');
      scanStartBtn.disabled = true;
    }
    if (nextStepBtn) nextStepBtn.classList.remove('visible');

    checkBtn.addEventListener('click', () => {
      // PASS 0: open camera, switch to scan mode
      if (!canScan) {
        hideScanPopups();
        hideIssueSummary();
        hasShownIssues = false;

        setShapeGood();
        if (shapeOverlay) shapeOverlay.classList.add('active');

        if (scanStatus) {
          scanStatus.textContent =
            'We are opening your camera. Allow access, then you can start scanning.';
        }
        if (resultText) {
          resultText.textContent =
            'When the camera appears, place your bowl roughly inside the shape.';
        }

        const enterScanMode = () => {
          canScan = true;
          checkBtn.disabled = false;
          checkBtn.textContent = 'Scan and check';
          checkBtn.classList.add('is-scan-mode');
          if (scanInstruction) scanInstruction.classList.add('visible');
          if (scanStatus) {
            scanStatus.textContent =
              'Align your bowl inside the shape, then tap Scan and check.';
          }
        };

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              videoStream = stream;

              if (video) {
                video.srcObject = stream;
                video.classList.add('active');

                const onReady = () => {
                  video.removeEventListener('loadedmetadata', onReady);
                  if (illustration) illustration.classList.add('hidden');
                  if (shapeOverlay) shapeOverlay.classList.add('active');
                  enterScanMode();
                };
                video.addEventListener('loadedmetadata', onReady);
              } else {
                enterScanMode();
              }
            })
            .catch(() => {
              if (scanStatus) {
                scanStatus.textContent =
                  'Camera not available. You can still tap Scan and check to continue.';
              }
              enterScanMode();
            });
        } else {
          if (scanStatus) {
            scanStatus.textContent =
              'Camera not available. You can still tap Scan and check to continue.';
          }
          enterScanMode();
        }
        return;
      }

      // PASS 1 / PASS 2: run scan
      if (isScanning || !overlay) return;
      isScanning = true;

      checkBtn.disabled = true;

      if (scanInstruction) scanInstruction.classList.remove('visible');
      hideScanPopups();
      hideIssueSummary();

      overlay.classList.add('active');
      if (scanStatus) scanStatus.textContent = 'Scanning your bowl. Hold still.';
      if (resultText) resultText.textContent = 'Checking proportions and surface.';

      setTimeout(() => {
        overlay.classList.remove('active');

        // PASS 1: issues
        if (!hasShownIssues) {
          hasShownIssues = true;

          setShapeBad();
          showIssueSummary();

          if (scanStatus) {
            scanStatus.textContent =
              'We found a few areas to improve. Smooth the highlighted spots, then scan again.';
          }
          if (resultText) {
            resultText.textContent =
              'Focus on smoothing the rim and evening the wall thickness, then scan again.';
          }

          if (scanIssuesPopup) {
            scanIssuesPopup.classList.add('show');
            setTimeout(() => scanIssuesPopup.classList.remove('show'), 4200);
          }

          checkBtn.disabled = false;
          checkBtn.textContent = 'Scan and check';
          if (scanInstruction) scanInstruction.classList.add('visible');

          isScanning = false;
          return;
        }

        // PASS 2: success
        setShapeGood();
        hideIssueSummary();

        if (scanStatus) {
          scanStatus.textContent =
            'Your bowl looks ready for bisque firing. You can book a firing session.';
        }
        if (resultText) {
          resultText.textContent =
            'Looks good. You can refine the rim one last time if you want.';
        }

        stopClayVideo();
        isScanning = false;

        if (scanSuccessPopup) {
          scanSuccessPopup.classList.add('show');
          setTimeout(() => scanSuccessPopup.classList.remove('show'), 3500);
        }

        // stay on Step 8 after success
        currentIndex = steps.length - 2;
        updateSteps();

        checkBtn.disabled = true;
        if (scanInstruction) scanInstruction.classList.remove('visible');

        if (nextStepBtn) nextStepBtn.classList.remove('visible');
      }, 2500);
    });
  }

    /* ------------------------------------------------------------------------
   * 4) APPOINTMENT HANDLER
   *    Bisque: submit -> popup "Appointment Made!" -> auto jump to Step 2
   *    Glaze fire: keep existing behavior (submit -> popup -> show next button)
   * ----------------------------------------------------------------------*/
  const popup = document.getElementById('success-popup');
  const popupText = document.getElementById('success-popup-text'); // optional

  const bisqueForm  = document.querySelector('#process-bisque .schedule-form');
  const bisqueNext  = document.getElementById('bisque-next-btn');

  const glazeFireForm = document.querySelector('#process-glaze-fire .schedule-form');
  const glazeNext     = document.getElementById('glaze-next-btn');

  function showSuccessPopup(message) {
    if (!popup) return;
    if (popupText && message) popupText.textContent = message;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 1200);
  }

  // --- BISQUE: AUTO FLOW TO STEP 2 ---
  if (bisqueForm) {
    bisqueForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // popup text + show
      showSuccessPopup('Appointment Made!');

      // lock submit button (optional)
      const submitBtn = bisqueForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'appointment made';
        submitBtn.disabled = true;
      }

      // if you don't want a manual next button anymore
      if (bisqueNext) bisqueNext.style.display = 'none';

      // after a short beat, jump to Step 2 timeline
      setTimeout(() => {
        showProcess('process-bisque');
        showBisqueStep(2);
        setBisqueMenuActive(2);
      }, 900);
    });
  }

  // --- GLAZE FIRE: keep your existing behavior ---
  function wireAppointmentForm(formEl, nextBtnEl) {
    if (!formEl || !popup) return;

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();

      showSuccessPopup('Appointment requested');

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'appointment requested';
        submitBtn.disabled = true;
      }

      if (nextBtnEl) nextBtnEl.style.display = 'inline-flex';
    });
  }

  wireAppointmentForm(glazeFireForm, glazeNext);

  if (glazeNext) {
    glazeNext.addEventListener('click', () => {
      showProcess('process-final');
    });
  }


   /* ------------------------------------------------------------------------
   * 5) GLAZING (PROCESS 3) — Step tabs + Step 1 only scan/color UI
   * ----------------------------------------------------------------------*/

  // --- Step tabs for process-glazing (same structure idea as process 1) ---
  const glazingScreen = document.getElementById('process-glazing');
  const glazeTabs   = glazingScreen ? [...glazingScreen.querySelectorAll('.step-tab')] : [];
  const glazePanels = glazingScreen ? [...glazingScreen.querySelectorAll('.step-panel')] : [];

  function setGlazeStepActive(stepIdOrNum) {
    if (!glazingScreen || !glazeTabs.length || !glazePanels.length) return;

    // accept either "glaze-step-1" or 1
    const targetId =
      typeof stepIdOrNum === 'number' ? `glaze-step-${stepIdOrNum}` : String(stepIdOrNum);

    glazeTabs.forEach(t => t.classList.toggle('active', t.dataset.step === targetId));
    glazePanels.forEach(p => p.classList.toggle('active', p.id === targetId));

    // Step 1 only: scan + color tools visible
    const isStep1 = targetId === 'glaze-step-1';
    setGlazeToolsVisible(isStep1);

    // If leaving step 1, stop camera so it doesn’t keep running in background
    if (!isStep1) stopGlazeVideo();
  }

  if (glazeTabs.length) {
    glazeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.step;
        if (!target) return;
        setGlazeStepActive(target);
      });
    });

    // Default to step 1 if none active
    if (!glazePanels.some(p => p.classList.contains('active'))) {
      setGlazeStepActive(1);
    }
  }

  // --- Glaze scan + model + swatches (supports BOTH your old ids and the new step-1 layout) ---

  // Old ids (your current file)
  const glazeVideoOld          = document.getElementById('glaze-video');
  const glazeScanBtnOld        = document.getElementById('glaze-scan-btn');
  const glazeScanStatusOld     = document.getElementById('glaze-scan-status');
  const glazeScanOverlayOld    = document.getElementById('glaze-scan-overlay');

  const glazeModelElOld   = document.getElementById('glaze-model');
  const glazeMetaOld      = document.getElementById('glaze-meta');
  const glazeSwatchRowOld = document.getElementById('glaze-swatches');
  const glazeNameElOld    = document.getElementById('glaze-name');
  const glazeNoteElOld    = document.getElementById('glaze-note');
  const glazeSwatchesOld  = [...document.querySelectorAll('.glaze-swatch')];
  const glazeFireBtnOld   = document.getElementById('glaze-fire-btn');
  const glazeTextureOverlayOld = document.getElementById('glaze-texture-overlay');

  // New ids (from the Step 1 “scan-card” structure I gave you)
  const glazeLockBtnNew   = document.getElementById('glaze-lock-btn');   // "Lock in scan"
  const glazeResetBtnNew  = document.getElementById('glaze-reset-btn');
  const glazeStageNew     = document.getElementById('glaze-scan-stage'); // container (optional)
  const glazeSwatchRowNew = document.getElementById('glaze-swatches');   // (same id is OK)
  const brushSizeNew      = document.getElementById('brush-size');       // optional

  // Choose whichever exists (old or new)
  const glazeVideo       = glazeVideoOld; // keep using your existing <video> if you have it
  const glazeScanOverlay = glazeScanOverlayOld;
  const glazeScanStatus  = glazeScanStatusOld;

  // “Scan” button: prefer new lock button if present; otherwise old scan button
  const glazeScanBtn = glazeLockBtnNew || glazeScanBtnOld;

  const glazeModelEl   = glazeModelElOld;
  const glazeMeta      = glazeMetaOld;
  const glazeSwatchRow = glazeSwatchRowOld || glazeSwatchRowNew;
  const glazeNameEl    = glazeNameElOld;
  const glazeNoteEl    = glazeNoteElOld;
  const glazeSwatches  = glazeSwatchesOld;
  const glazeFireBtn   = glazeFireBtnOld;
  const glazeTextureOverlay = glazeTextureOverlayOld;

  // Show/hide “tools” area (Step 1 only)
  function setGlazeToolsVisible(isVisible) {
    // If you want Step 1 to “own” the tools, hide them elsewhere.
    // These are safe-guards even if your HTML already hides them.
    if (glazeMeta)      glazeMeta.style.display = isVisible ? 'block' : 'none';
    if (glazeSwatchRow) glazeSwatchRow.style.display = isVisible ? 'flex' : 'none';
    if (glazeFireBtn)   glazeFireBtn.style.display = isVisible ? 'inline-flex' : 'none';

    // model viewer can remain visible (your choice). If you want it step-1 only:
    if (glazeModelEl) glazeModelEl.classList.toggle('hidden', !isVisible);

    // status can remain visible if you want instructions in other steps:
    // if (glazeScanStatus) glazeScanStatus.style.display = isVisible ? 'block' : 'none';
  }

  // Camera state
  let glazeStream     = null;
  let glazeScanning   = false;
  let glazeMaterials  = [];
  let currentGlazeStr = null;
  let currentSwatchEl = null;

  const firedColorMap = {
    "Speckled Field":   { color: "0.78,0.72,0.61" },
    "Celadon Green":    { color: "0.60,0.72,0.62" },
    "Milk White":       { color: "0.90,0.89,0.82" },
    "Soft Mauve White": { color: "0.61,0.33,0.40" }
  };

  function stopGlazeVideo() {
    if (glazeStream) {
      glazeStream.getTracks().forEach(t => t.stop());
      glazeStream = null;
    }
    if (glazeVideo) {
      glazeVideo.classList.remove('active');
      glazeVideo.srcObject = null;
    }
    glazeScanning = false;
  }

  // Reset button (new UI)
  if (glazeResetBtnNew) {
    glazeResetBtnNew.addEventListener('click', () => {
      stopGlazeVideo();

      // Reset UI
      if (glazeModelEl) glazeModelEl.classList.add('hidden');
      if (glazeMeta) glazeMeta.style.display = 'none';
      if (glazeSwatchRow) glazeSwatchRow.style.display = 'none';
      if (glazeFireBtn) {
        glazeFireBtn.style.display = 'none';
        glazeFireBtn.disabled = true;
        glazeFireBtn.textContent = 'fire this glaze ->';
      }
      if (glazeNameEl) glazeNameEl.textContent = '';
      if (glazeNoteEl) glazeNoteEl.textContent = '';
      glazeSwatches.forEach(b => b.classList.remove('active'));
      currentGlazeStr = null;
      currentSwatchEl = null;

      if (glazeScanStatus) glazeScanStatus.textContent =
        'Use the scan to “lock in” your bowl, then try glaze colors below.';
    });
  }

  // Scan / Lock-in handler (Step 1)
  if (glazeScanBtn && glazeScanStatus) {
    glazeScanBtn.addEventListener('click', () => {
      // only allow scanning when we are on Step 1 panel
      const step1Panel = document.getElementById('glaze-step-1');
      if (step1Panel && !step1Panel.classList.contains('active')) return;

      if (glazeScanning) return;

      glazeScanStatus.textContent =
        'We are opening your camera. Allow access to start the scan.';

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && glazeVideo) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            glazeStream = stream;
            glazeVideo.srcObject = stream;
            glazeVideo.classList.add('active');

            glazeScanStatus.textContent =
              'Align your bowl in the frame. We will run a quick scan.';
            glazeScanning = true;

            setTimeout(() => {
              if (glazeScanOverlay) glazeScanOverlay.classList.add('active');
              glazeScanStatus.textContent = 'Scanning your bowl.';

              setTimeout(() => {
                if (glazeScanOverlay) glazeScanOverlay.classList.remove('active');
                stopGlazeVideo();

                // Reveal model + controls (Step 1 only)
                setGlazeToolsVisible(true);

                if (glazeScanStatus) glazeScanStatus.textContent =
                  'Locked in. Try different glazes to preview how they look after firing.';
              }, 2000);
            }, 800);
          })
          .catch(() => {
            // No camera: still allow preview
            setGlazeToolsVisible(true);
            glazeScanStatus.textContent =
              'Camera not available. You can still preview glaze colors on a sample bowl.';
          });
      } else {
        // No camera support or no video element: still allow preview
        setGlazeToolsVisible(true);
        glazeScanStatus.textContent =
          'Camera not available. You can still preview glaze colors on a sample bowl.';
      }
    });
  }

  // Swatch click -> apply “unfired” color to model
  if (glazeModelEl && glazeSwatches.length && glazeNameEl && glazeNoteEl) {
    glazeModelEl.addEventListener('load', () => {
      const model = glazeModelEl.model;
      glazeMaterials = (model && model.materials) ? [...model.materials] : [];

      glazeSwatches.forEach(btn => {
        btn.addEventListener('click', () => {
          // only respond when Step 1 is active
          const step1Panel = document.getElementById('glaze-step-1');
          if (step1Panel && !step1Panel.classList.contains('active')) return;

          const colorStr   = btn.getAttribute('data-color');
          const name       = btn.getAttribute('data-name') || '';
          const note       = btn.getAttribute('data-note') || '';
          const isSpeckled = btn.hasAttribute('data-speckled');

          currentGlazeStr = colorStr;
          currentSwatchEl = btn;

          glazeSwatches.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          glazeNameEl.textContent = name;
          glazeNoteEl.textContent = note;

          if (glazeTextureOverlay) {
            if (isSpeckled) {
              glazeTextureOverlay.classList.add('has-speckles');
              glazeTextureOverlay.classList.remove('fired');
            } else {
              glazeTextureOverlay.classList.remove('has-speckles', 'fired');
            }
          }

          if (glazeFireBtn) {
            glazeFireBtn.disabled = !colorStr;
            glazeFireBtn.textContent = 'fire this glaze ->';
          }

          if (!colorStr || !glazeMaterials.length) return;

          const [r, g, b] = colorStr.split(',').map(Number);
          glazeMaterials.forEach(mat => {
            if (mat && mat.pbrMetallicRoughness) {
              mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
            }
          });
        });
      });
    });
  }

  // Fire button -> apply “fired” color transform
  if (glazeFireBtn) {
    glazeFireBtn.addEventListener('click', () => {
      // only respond when Step 1 is active
      const step1Panel = document.getElementById('glaze-step-1');
      if (step1Panel && !step1Panel.classList.contains('active')) return;

      if (!currentSwatchEl || !currentGlazeStr || !glazeMaterials.length) return;

      const glazeName = currentSwatchEl.getAttribute('data-name') || '';
      const firedInfo = firedColorMap[glazeName];

      let finalRGB;
      if (firedInfo && firedInfo.color) {
        finalRGB = firedInfo.color.split(',').map(Number);
      } else {
        const [r, g, b] = currentGlazeStr.split(',').map(Number);
        const factor = 0.75;
        finalRGB = [r * factor, g * factor, b * factor];
      }

      glazeMaterials.forEach(mat => {
        if (mat && mat.pbrMetallicRoughness) {
          mat.pbrMetallicRoughness.setBaseColorFactor([...finalRGB, 1]);
        }
      });

      if (glazeTextureOverlay && currentSwatchEl.hasAttribute('data-speckled')) {
        glazeTextureOverlay.classList.add('fired');
      }

      if (glazeNoteEl) {
        const baseNote = currentSwatchEl.getAttribute('data-note') || '';
        glazeNoteEl.textContent =
          baseNote + ' After firing, the color deepens and the surface looks richer.';
      }

      glazeFireBtn.disabled = true;
      glazeFireBtn.textContent = 'fired';
    });
  }

  // When user switches process using the left menu: stop glaze camera
  // (your nav click handler already exists; this is just extra safety)
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target && target !== 'process-glazing') {
        stopGlazeVideo();
      }
      if (target === 'process-glazing') {
        // Always land on glaze step 1 so scan/tools are in the right place
        setGlazeStepActive(1);
      }
    });
  });

  }
);
