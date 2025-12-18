// tutorial.js
document.addEventListener('DOMContentLoaded', () => {
  /* =========================================================================
   * Helpers
   * ========================================================================= */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (i, min, max) => Math.max(min, Math.min(max, i));

  /* =========================================================================
   * 1) PROCESS MENU — only one screen visible
   * ========================================================================= */
  const navItems = qsa('.process-nav-item');
  const screens  = qsa('.process-screen');

  function showProcess(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.target === id));
  }

  if (!screens.some(s => s.classList.contains('active')) && screens.length) {
    showProcess('process-clay');
  }

  /* =========================================================================
   * 2) PROCESS 1 — CLAY STEPPER + SCAN CHECK (step 8)
   * ========================================================================= */
  const clayScreen    = qs('#process-clay');
  const claySteps     = qsa('.clay-step', clayScreen || document);
  const prevBtn       = qs('#step-prev');
  const nextBtn       = qs('#step-next');
  const illustration  = qs('#step-illustration');

  const clayNav       = qs('.process-nav-item[data-target="process-clay"]');
  const clayMenuItems = clayNav ? qsa('.clay-step-menu-item', clayNav) : [];

  const stepImages = [
    'assets/step 1.png','assets/step 2.png','assets/step 3.png',
    'assets/step 4.png','assets/step 5.png','assets/step 6.png',
    'assets/step 7.png','assets/step 8.png','assets/step 9.png'
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

  let clayIndex = 0;

  const checkBtn        = qs('#check-bowl-btn');
  const resultText      = qs('#check-result');
  const scanStatus      = qs('#scan-status'); // optional
  const shapeOverlay    = qs('#shape-overlay');
  const shapeImg        = qs('#shape-overlay-img');
  const scanInstruction = qs('#scan-instruction');
  const overlay         = qs('#scan-overlay');
  const video           = qs('#scan-video');

  const scanSuccessPopup = qs('#scan-success-popup');
  const scanIssuesPopup  = qs('#scan-issues-popup');
  const scanIssueSummary = qs('#scan-issue-summary');

  const goodShapeSrc  = 'assets/shape.png';
  const badShapeSrc   = 'assets/shapebad.png';

  let canScan        = false;
  let hasShownIssues = false;
  let videoStream    = null;
  let isScanning     = false;

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
    isScanning = false;

    setShapeGood();
    hideIssueSummary();
    hideScanPopups();

    if (scanStatus) scanStatus.textContent = 'Follow the clay steps. The checker will appear at step 8.';
    if (resultText) resultText.textContent = 'Follow the clay steps. The checker will appear at step 8.';
    if (shapeOverlay) shapeOverlay.classList.remove('active');
    if (scanInstruction) scanInstruction.classList.remove('visible');

    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'check my bowl before bisque firing';
      checkBtn.classList.remove('is-scan-mode');
    }
  }

  function cleanupClayOverlaysAndCamera() {
    stopClayVideo();
    resetScanUI();
    clayMenuItems.forEach(i => i.classList.remove('active'));
    if (checkBtn) checkBtn.style.display = 'none';
    if (scanInstruction) scanInstruction.classList.remove('visible');
  }

  function updateClay() {
    if (!claySteps.length) return;

    const totalSteps = claySteps.length;
    clayIndex = clamp(clayIndex, 0, totalSteps - 1);
    const stepNum = clayIndex + 1;

    claySteps.forEach((el, i) => el.classList.toggle('active', i === clayIndex));

    clayMenuItems.forEach(item => {
      const n = Number(item.dataset.step);
      item.classList.toggle('active', n === stepNum);
    });

    if (prevBtn) prevBtn.disabled = clayIndex === 0;
    if (nextBtn) nextBtn.disabled = false;

    if (illustration && stepImages[clayIndex]) {
      illustration.src = stepImages[clayIndex];
      illustration.alt = stepAlts[clayIndex] || '';
    }

    // Scan button only on step 8 (index 7)
    const SCAN_STEP_INDEX = totalSteps - 2;
    if (checkBtn) {
      if (clayIndex === SCAN_STEP_INDEX) {
        checkBtn.style.display = 'inline-flex';
        if (!canScan) {
          if (resultText) resultText.textContent =
            "You've reached 'check your bowl'. Tap the button to set up the checker.";
        } else {
          if (scanInstruction) scanInstruction.classList.add('visible');
        }
      } else {
        checkBtn.style.display = 'none';
        resetScanUI();
      }
    }
  }

  prevBtn?.addEventListener('click', () => {
    clayIndex -= 1;
    updateClay();
  });

  nextBtn?.addEventListener('click', () => {
    const totalSteps = claySteps.length || 0;

    // Step 9 -> Process 2 Step 1
    if (totalSteps && clayIndex === totalSteps - 1) {
      cleanupClayOverlaysAndCamera();
      showProcess('process-bisque');
      showBisqueStep(1);
      setBisqueMenuActive(1);
      return;
    }

    clayIndex += 1;
    updateClay();
  });

  clayMenuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      showProcess('process-clay');
      const n = Number(item.dataset.step);
      if (!Number.isNaN(n)) {
        clayIndex = n - 1;
        updateClay();
      }
    });
  });

  // Clay scan/check click (step 8)
  checkBtn?.addEventListener('click', () => {
    // PASS 0: open camera + enter scan mode
    if (!canScan) {
      hideScanPopups();
      hideIssueSummary();
      hasShownIssues = false;

      setShapeGood();
      shapeOverlay?.classList.add('active');

      if (scanStatus) scanStatus.textContent =
        'We are opening your camera. Allow access, then you can start scanning.';
      if (resultText) resultText.textContent =
        'When the camera appears, place your bowl roughly inside the shape.';

      const enterScanMode = () => {
        canScan = true;
        checkBtn.disabled = false;
        checkBtn.textContent = 'Scan and check';
        checkBtn.classList.add('is-scan-mode');
        scanInstruction?.classList.add('visible');
        if (scanStatus) scanStatus.textContent =
          'Align your bowl inside the shape, then tap Scan and check.';
      };

      if (navigator.mediaDevices?.getUserMedia && video) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            videoStream = stream;
            video.srcObject = stream;
            video.classList.add('active');

            const onReady = () => {
              video.removeEventListener('loadedmetadata', onReady);
              illustration?.classList.add('hidden');
              shapeOverlay?.classList.add('active');
              enterScanMode();
            };
            video.addEventListener('loadedmetadata', onReady);
          })
          .catch(() => {
            if (scanStatus) scanStatus.textContent =
              'Camera not available. You can still tap Scan and check to continue.';
            enterScanMode();
          });
      } else {
        if (scanStatus) scanStatus.textContent =
          'Camera not available. You can still tap Scan and check to continue.';
        enterScanMode();
      }
      return;
    }

    // PASS 1/2: run scan
    if (isScanning || !overlay) return;
    isScanning = true;

    checkBtn.disabled = true;
    scanInstruction?.classList.remove('visible');
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

        if (scanStatus) scanStatus.textContent =
          'We found a few areas to improve. Smooth the highlighted spots, then scan again.';
        if (resultText) resultText.textContent =
          'Focus on smoothing the rim and evening the wall thickness, then scan again.';

        scanIssuesPopup?.classList.add('show');
        if (scanIssuesPopup) setTimeout(() => scanIssuesPopup.classList.remove('show'), 4200);

        checkBtn.disabled = false;
        checkBtn.textContent = 'Scan and check';
        scanInstruction?.classList.add('visible');

        isScanning = false;
        return;
      }

      // PASS 2: success
      setShapeGood();
      hideIssueSummary();

      if (scanStatus) scanStatus.textContent =
        'Your bowl looks ready for bisque firing. You can book a firing session.';
      if (resultText) resultText.textContent =
        'Looks good. You can refine the rim one last time if you want.';

      stopClayVideo();
      isScanning = false;

      scanSuccessPopup?.classList.add('show');
      if (scanSuccessPopup) setTimeout(() => scanSuccessPopup.classList.remove('show'), 3500);

      clayIndex = claySteps.length - 2; // stay on step 8
      updateClay();

      checkBtn.disabled = true;
      scanInstruction?.classList.remove('visible');
    }, 2500);
  });

  updateClay();

  /* =========================================================================
   * 3) PROCESS 2 — BISQUE SUBSTEPS (Step 1 schedule / Step 2 timeline)
   * ========================================================================= */
  const bisqueStep1 = qs('#bisque-step-1');
  const bisqueStep2 = qs('#bisque-step-2');

  function showBisqueStep(stepNum) {
    if (!bisqueStep1 || !bisqueStep2) return;
    const is1 = Number(stepNum) === 1;
    bisqueStep1.style.display = is1 ? 'block' : 'none';
    bisqueStep2.style.display = is1 ? 'none' : 'block';
  }

  function setBisqueMenuActive(stepNum) {
    const bisqueNav = qs('.process-nav-item[data-target="process-bisque"]');
    if (!bisqueNav) return;
    const items = [
      ...qsa('.bisque-step-menu-item', bisqueNav),
      ...qsa('.clay-step-menu-item', bisqueNav),
    ];
    items.forEach(el => el.classList.toggle('active', Number(el.dataset.step) === Number(stepNum)));
  }

  // Bind clicks for bisque step items
  const bisqueNav = qs('.process-nav-item[data-target="process-bisque"]');
  if (bisqueNav) {
    const bisqueStepItems = [
      ...qsa('.bisque-step-menu-item', bisqueNav),
      ...qsa('.clay-step-menu-item', bisqueNav),
    ];

    bisqueStepItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        showProcess('process-bisque');
        showBisqueStep(item.dataset.step);
        setBisqueMenuActive(item.dataset.step);
      });
    });

    const mainRow = qs('.process-main', bisqueNav);
    mainRow?.addEventListener('click', (e) => {
      e.stopPropagation();
      showProcess('process-bisque');
      showBisqueStep(1);
      setBisqueMenuActive(1);
    });
  }

  showBisqueStep(1);
  setBisqueMenuActive(1);

  /* =========================================================================
   * 4) APPOINTMENT POPUP HANDLER
   * ========================================================================= */
  const popup     = qs('#success-popup');
  const popupText = qs('#success-popup-text'); // optional

  function showSuccessPopup(message) {
    if (!popup) return;
    if (popupText && message) popupText.textContent = message;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 1200);
  }

  const bisqueForm  = qs('#process-bisque .schedule-form');
  const bisqueNext  = qs('#bisque-next-btn');

  bisqueForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    showSuccessPopup('Appointment Made!');

    const submitBtn = qs('button[type="submit"]', bisqueForm);
    if (submitBtn) {
      submitBtn.textContent = 'appointment made';
      submitBtn.disabled = true;
    }
    if (bisqueNext) bisqueNext.style.display = 'none';

    setTimeout(() => {
      showProcess('process-bisque');
      showBisqueStep(2);
      setBisqueMenuActive(2);
    }, 900);
  });

  const glazeFireForm = qs('#process-glaze-fire .schedule-form');
  const glazeNext     = qs('#glaze-next-btn');

  glazeFireForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    showSuccessPopup('Appointment requested');

    const submitBtn = qs('button[type="submit"]', glazeFireForm);
    if (submitBtn) {
      submitBtn.textContent = 'appointment requested';
      submitBtn.disabled = true;
    }
    if (glazeNext) glazeNext.style.display = 'inline-flex';
  });

  glazeNext?.addEventListener('click', () => {
    showProcess('process-final');
  });

  /* =========================================================================
 * 5) PROCESS 3 — GLAZING (scan → model → swatches only when model shows)
 *     + step arrows + menu step clicks
 * ========================================================================= */
(() => {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (i, min, max) => Math.max(min, Math.min(max, i));

  // Process 3 screen
  const glazingScreen = qs('#process-glazing');
  if (!glazingScreen) return;

  // Inside process 3
  const glazeSteps = qsa('.clay-step', glazingScreen);
  let glazeStepIndex = 0;

  const glazePrev = qs('#glaze-prev', glazingScreen);
  const glazeNextArrow = qs('#glaze-next', glazingScreen);
  const glazeLockBtn = qs('#glaze-lock-btn', glazingScreen);

  const glazeStage = qs('#glaze-scan-stage', glazingScreen);
  const glazeVideo = qs('#glaze-video', glazingScreen);
  const glazeOverlay = qs('#glaze-scan-overlay', glazingScreen);
  const glazeModel = qs('#glaze-model', glazingScreen);

  // Right sidebar swatches (usually in the right column)
  const sidebarGlazing = qs('#sidebar-glazing');

  // Optional fired button + swatches inside sidebar
  const firedBtn = sidebarGlazing
    ? (qs('#glaze-fired-btn', sidebarGlazing) || qs('.glaze-fired-btn', sidebarGlazing))
    : null;

  const glazeInputs = sidebarGlazing ? qsa('input[name="glaze"]', sidebarGlazing) : [];
  const glazeButtons = sidebarGlazing ? qsa('button.swatch, .glaze-swatch', sidebarGlazing) : [];

  // Left menu (outside process 3 screen)
  const glazingNav = qs('.process-nav-item[data-target="process-glazing"]');
  const glazeMenuItems = glazingNav ? qsa('.clay-step-menu-item', glazingNav) : [];
  const glazingMainRow = glazingNav ? qs('.process-main', glazingNav) : null;

  // State
  let glazeStream = null;
  let glazeScanTimer = null;

  const glazeState = {
    scanning: false,
    locked: false,
    fired: false,
  };

  /* ---------------------------
   * Visibility sync: swatches ONLY when model is showing
   * --------------------------- */
  function isGlazeModelShowing() {
    if (!glazeModel) return false;
    const cs = getComputedStyle(glazeModel);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    return glazeModel.getClientRects().length > 0;
  }

  function syncSwatchToModel() {
    if (!sidebarGlazing) return;
    sidebarGlazing.style.display = isGlazeModelShowing() ? 'block' : 'none';
  }

  /* ---------------------------
   * Left menu highlight
   * --------------------------- */
  function setGlazeMenuActive(stepNum) {
    glazeMenuItems.forEach(li => {
      li.classList.toggle('active', Number(li.dataset.step) === Number(stepNum));
    });
  }

  /* ---------------------------
   * Stage sizing helpers
   * --------------------------- */
  function ensureStageFills() {
    if (glazeStage) {
      glazeStage.style.position = 'absolute';
      glazeStage.style.inset = '0';
      glazeStage.style.width = '100%';
      glazeStage.style.height = '100%';
    }
    if (glazeVideo) {
      glazeVideo.style.width = '100%';
      glazeVideo.style.height = '100%';
      glazeVideo.style.objectFit = 'cover';
    }
    if (glazeModel) {
      glazeModel.style.width = '100%';
      glazeModel.style.height = '100%';
    }
  }

  /* ---------------------------
   * Overlay / video / model toggles
   * --------------------------- */
  function showGlazeScanOverlay(on) {
    if (!glazeOverlay) return;
    glazeOverlay.classList.toggle('active', !!on);
  }

  // IMPORTANT: your CSS shows scan video only when it has .active
  function showGlazeVideo(on) {
    if (!glazeVideo) return;
    glazeVideo.classList.toggle('active', !!on);
    glazeVideo.style.display = on ? 'block' : 'none';
  }

  function showGlazeModel(on) {
    if (!glazeModel) return;
    glazeModel.style.display = on ? 'block' : 'none';
    syncSwatchToModel();
  }

  /* ---------------------------
   * Camera control
   * --------------------------- */
  async function startGlazeCamera() {
    if (!glazeVideo) return;
    if (glazeStream) return;

    glazeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    glazeVideo.srcObject = glazeStream;

    showGlazeVideo(true);
    showGlazeModel(false);
  }

  function stopGlazeCamera() {
    if (glazeScanTimer) {
      clearTimeout(glazeScanTimer);
      glazeScanTimer = null;
    }
    if (glazeStream) {
      glazeStream.getTracks().forEach(t => t.stop());
      glazeStream = null;
    }
    if (glazeVideo) glazeVideo.srcObject = null;

    showGlazeVideo(false);
    glazeState.scanning = false;
  }

  /* ---------------------------
   * Glaze color application
   * --------------------------- */
  function hexToRgba01(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return null;
    return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255, 1];
  }

  function getSelectedGlazeData() {
    const checked = glazeInputs.find(i => i.checked);
    if (checked) return { unfired: checked.dataset.unfired, fired: checked.dataset.fired };

    const activeBtn = glazeButtons.find(b => b.classList.contains('active'));
    if (activeBtn) return { unfired: activeBtn.dataset.unfired, fired: activeBtn.dataset.fired };

    return null;
  }

  function applyGlazeToModel() {
    if (!glazeModel) return;
    const data = getSelectedGlazeData();
    if (!data) return;

    const colorHex = glazeState.fired ? data.fired : data.unfired;
    const rgba = hexToRgba01(colorHex);
    if (!rgba) return;

    if (!glazeModel.model) {
      glazeModel.addEventListener('load', applyGlazeToModel, { once: true });
      return;
    }

    glazeModel.model.materials.forEach(mat => {
      mat.pbrMetallicRoughness.setBaseColorFactor(rgba);
    });
  }

  /* ---------------------------
   * Step handling
   * --------------------------- */
  function setGlazeStep(n) {
    if (!glazeSteps.length) return;

    glazeStepIndex = clamp(n, 0, glazeSteps.length - 1);
    const stepNum = glazeStepIndex + 1;

    glazeSteps.forEach((el, i) => el.classList.toggle('active', i === glazeStepIndex));

    if (glazePrev) glazePrev.disabled = glazeStepIndex === 0;
    if (glazeNextArrow) glazeNextArrow.disabled = glazeStepIndex === glazeSteps.length - 1;

    // If leaving step 1, stop scan overlay + camera
    if (stepNum !== 1) {
      showGlazeScanOverlay(false);
      stopGlazeCamera();
    }

    // Sync menu highlight + swatch (swatch depends ONLY on model visibility)
    setGlazeMenuActive(stepNum);
    syncSwatchToModel();
  }

  /* ---------------------------
   * Arrow navigation (inside process 3)
   * --------------------------- */
  glazePrev?.addEventListener('click', () => {
    setGlazeStep(glazeStepIndex - 1);
  });

  glazeNextArrow?.addEventListener('click', () => {
    setGlazeStep(glazeStepIndex + 1);
  });

  /* ---------------------------
   * Menu step clicks (left menu)
   * --------------------------- */
  glazeMenuItems.forEach(li => {
    li.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // critical: prevents parent nav from resetting to step 1
      const stepNum = Number(li.dataset.step || 1);

      // show the glazing screen using your existing nav system
      // if you have a global showProcess(), use it; otherwise simulate a click on the parent item
      if (typeof window.showProcess === 'function') {
        window.showProcess('process-glazing');
      } else {
        // fallback: click the parent process item to switch screens
        glazingNav?.click?.();
      }

      setGlazeStep(stepNum - 1);
    });
  });

  // Clicking the main “03 glazing” row goes to Step 1
  glazingMainRow?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window.showProcess === 'function') {
      window.showProcess('process-glazing');
    } else {
      glazingNav?.click?.();
    }
    setGlazeStep(0);
  });

  /* ---------------------------
   * Scan → show model
   * --------------------------- */
  async function lockScanAndShowModel() {
    glazeState.scanning = false;
    glazeState.locked = true;
    glazeState.fired = false;

    showGlazeScanOverlay(false);
    stopGlazeCamera();
    ensureStageFills();

    if (!glazeModel) return;

    // show model and force src refresh
    showGlazeModel(true);
    glazeModel.removeAttribute('src');
    glazeModel.setAttribute('src', 'assets/bowl-white.glb');

    // wait for model-viewer load before applying glaze
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      glazeModel.addEventListener('load', finish, { once: true });
      setTimeout(finish, 800);
    });

    applyGlazeToModel();
    requestAnimationFrame(syncSwatchToModel);

    if (glazeLockBtn) {
      glazeLockBtn.textContent = 'scan complete';
      glazeLockBtn.disabled = true;
    }
  }

  glazeLockBtn?.addEventListener('click', async () => {
    // Only scan on Step 1
    if ((glazeStepIndex + 1) !== 1) return;

    // Prevent double tap
    if (glazeState.locked || glazeState.scanning) return;

    glazeState.scanning = true;
    glazeLockBtn.textContent = 'scanning…';

    try {
      ensureStageFills();
      showGlazeModel(false);
      await startGlazeCamera();
    } catch (e) {
      console.error('[Process 3] Camera blocked/unavailable:', e);
      glazeState.scanning = false;
      glazeLockBtn.textContent = 'camera blocked';
      return;
    }

    showGlazeScanOverlay(true);

    glazeScanTimer = setTimeout(async () => {
      await lockScanAndShowModel();
    }, 1200);
  });

  /* ---------------------------
   * Fired toggle + swatches
   * --------------------------- */
  firedBtn?.addEventListener('click', () => {
    if (!glazeState.locked) return;
    glazeState.fired = !glazeState.fired;
    firedBtn.classList.toggle('active', glazeState.fired);
    applyGlazeToModel();
  });

  glazeInputs.forEach(input => {
    input.addEventListener('change', () => {
      if (glazeState.locked && isGlazeModelShowing()) applyGlazeToModel();
    });
  });

  glazeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      glazeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (glazeState.locked && isGlazeModelShowing()) applyGlazeToModel();
    });
  });

  /* ---------------------------
   * Hide swatches when leaving process 3 (click-based safety)
   * --------------------------- */
  qsa('.process-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target !== 'process-glazing') {
        if (sidebarGlazing) sidebarGlazing.style.display = 'none';
        stopGlazeCamera();
      } else {
        // when returning, swatches still depend on model visibility
        syncSwatchToModel();
      }
    });
  });

  /* ---------------------------
   * Init
   * --------------------------- */
  setGlazeStep(0);

  showGlazeVideo(false);
  showGlazeModel(false);
  showGlazeScanOverlay(false);

  if (glazeLockBtn) {
    glazeLockBtn.disabled = false;
    glazeLockBtn.textContent = 'lock in my bowl scan';
  }

  // Ensure sidebar starts hidden
  syncSwatchToModel();
})();

  /* =========================================================================
   * 6) ONE SINGLE nav handler (no duplicates)
   * ========================================================================= */
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (!target) return;

      // leaving clay: stop camera + reset clay scan UI
      if (target !== 'process-clay') cleanupClayOverlaysAndCamera();

      // leaving glazing: stop glaze camera + timers
      if (target !== 'process-glazing') stopGlazeCamera();

      showProcess(target);

      if (target === 'process-clay') updateClay();

      if (target === 'process-bisque') {
        showBisqueStep(1);
        setBisqueMenuActive(1);
      }

      if (target === 'process-glazing') {
        setGlazeStep(0);
      }
    });
  });
});
