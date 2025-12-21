// tutorial.js
document.addEventListener('DOMContentLoaded', () => {
  /* =========================================================================
   * Helpers
   * ========================================================================= */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (i, min, max) => Math.max(min, Math.min(max, i));

  /* =========================================================================
   * GLOBAL: Menu step highlight — only ONE step bold across the whole menu
   * ========================================================================= */
  function setOnlyOneActiveStep(processId, stepNum) {
    // clear all step actives everywhere
    qsa('.clay-step-menu-item.active').forEach(el => el.classList.remove('active'));
    qsa('.bisque-step-menu-item.active').forEach(el => el.classList.remove('active'));

    // set active for current process + step
    const nav = qs(`.process-nav-item[data-target="${processId}"]`);
    nav?.querySelector(`.clay-step-menu-item[data-step="${stepNum}"]`)?.classList.add('active');
    nav?.querySelector(`.bisque-step-menu-item[data-step="${stepNum}"]`)?.classList.add('active');
  }

  // On load, kill any "active" you hard-coded in HTML so JS fully controls it
  qsa('.clay-step-menu-item.active').forEach(el => el.classList.remove('active'));
  qsa('.bisque-step-menu-item.active').forEach(el => el.classList.remove('active'));

  /* =========================================================================
   * 1) PROCESS MENU — only one screen visible
   * ========================================================================= */
  const navItems = qsa('.process-nav-item');
  const screens  = qsa('.process-screen');

  function showProcess(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.target === id));
  }

  // expose so submodules (process 2/3/4) can call it
  window.showProcess = showProcess;

  // default screen
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
    scanSuccessPopup?.classList.remove('show');
    scanIssuesPopup?.classList.remove('show');
  }
  function hideIssueSummary() { scanIssueSummary?.classList.remove('show'); }
  function showIssueSummary() { scanIssueSummary?.classList.add('show'); }
  function setShapeGood() { if (shapeImg) shapeImg.src = goodShapeSrc; }
  function setShapeBad()  { if (shapeImg) shapeImg.src = badShapeSrc; }

  function stopClayVideo() {
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
    overlay?.classList.remove('active');
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
    shapeOverlay?.classList.remove('active');
    scanInstruction?.classList.remove('visible');

    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'check my bowl before bisque firing';
      checkBtn.classList.remove('is-scan-mode');
    }
  }

  function cleanupClayOverlaysAndCamera() {
    stopClayVideo();
    resetScanUI();
    if (checkBtn) checkBtn.style.display = 'none';
    scanInstruction?.classList.remove('visible');
  }

  function updateClay() {
    if (!claySteps.length) return;

    const totalSteps = claySteps.length;
    clayIndex = clamp(clayIndex, 0, totalSteps - 1);
    const stepNum = clayIndex + 1;

    claySteps.forEach((el, i) => el.classList.toggle('active', i === clayIndex));

    // ✅ only one active step globally
    setOnlyOneActiveStep('process-clay', stepNum);

    prevBtn && (prevBtn.disabled = clayIndex === 0);
    // Do NOT disable next here because Step 9 should allow jump to process 2
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
          scanInstruction?.classList.add('visible');
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

  // Step 9 -> Process 2 Step 1
  nextBtn?.addEventListener('click', () => {
    const totalSteps = claySteps.length || 0;
    if (totalSteps && clayIndex === totalSteps - 1) {
      cleanupClayOverlaysAndCamera();
      showProcess('process-bisque');
      window.showBisqueStep?.(1);
      setOnlyOneActiveStep('process-bisque', 1);
      return;
    }
    clayIndex += 1;
    updateClay();
  });

  clayMenuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
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
   * PROCESS 2 — BISQUE FIRING (Step 1 schedule / Step 2 vertical timeline)
   * ========================================================================= */
  (() => {
    const bisqueScreen = qs('#process-bisque');
    if (!bisqueScreen) return;

    const bisqueStep1 = qs('#bisque-step-1', bisqueScreen);
    const bisqueStep2 = qs('#bisque-step-2', bisqueScreen);
    const bisqueForm  = qs('#bisque-form', bisqueScreen);
    const timelineEl  = qs('#bisque-timeline', bisqueScreen);
    const bisqueNav   = qs('.process-nav-item[data-target="process-bisque"]');

    const popup     = qs('#success-popup');
    const popupText = qs('#success-popup-text');

    if (!bisqueStep1 || !bisqueStep2) return;

    function showSuccessPopup(message) {
      if (!popup) return;
      if (popupText) popupText.textContent = message || '';
      popup.classList.add('show');
      setTimeout(() => popup.classList.remove('show'), 1200);
    }

    function showBisqueStep(stepNum) {
      const is1 = Number(stepNum) === 1;
      bisqueStep1.style.display = is1 ? 'block' : 'none';
      bisqueStep2.style.display = is1 ? 'none' : 'block';
    }
    window.showBisqueStep = showBisqueStep;

    const STORAGE_KEY = 'bisqueTimelineState_v1';
    const pad2 = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

    const stages = [
      { key: 'appointment', etaDays: 0 },
      { key: 'pickup',      etaDays: 1 },
      { key: 'picked',      etaDays: 2 },
      { key: 'deliver',     etaDays: 3 },
      { key: 'firing',      etaDays: 5 },
      { key: 'done',        etaDays: 7 },
    ];

    function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
    function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
    function initStateIfNeeded() {
      const s = loadState();
      if (!s.baseDate) {
        s.baseDate = new Date().toISOString();
        s.activeIndex = 0;
        saveState(s);
      }
      return loadState();
    }

    function renderTimeline() {
      if (!timelineEl) return;
      const state = initStateIfNeeded();
      const base = new Date(state.baseDate);
      const activeIndex = Number(state.activeIndex || 0);

      const items = qsa('.v-tl-item', timelineEl);
      items.forEach((li, idx) => {
        const meta = stages.find(s => s.key === li.dataset.stage);
        const dateEl = qs('[data-date]', li);
        if (dateEl && meta) dateEl.textContent = formatDate(addDays(base, meta.etaDays));

        const confirmEl = qs('[data-confirm]', li);
        if (confirmEl) {
          if (idx < activeIndex) confirmEl.textContent = 'Confirmed';
          else if (idx === activeIndex) confirmEl.textContent = 'In progress';
          else confirmEl.textContent = 'Expected';
        }

        li.classList.toggle('is-done', idx < activeIndex);
        li.classList.toggle('is-active', idx === activeIndex);
      });
    }

    bisqueForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveState({ baseDate: new Date().toISOString(), activeIndex: 0 });

      showSuccessPopup('Appointment Made!');
      showBisqueStep(2);
      setOnlyOneActiveStep('process-bisque', 2);
      renderTimeline();
    });

    if (bisqueNav) {
      const stepItems = qsa('.bisque-step-menu-item, .clay-step-menu-item', bisqueNav);
      stepItems.forEach(li => {
        li.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const stepNum = Number(li.dataset.step || 1);
          showProcess('process-bisque');
          showBisqueStep(stepNum);
          setOnlyOneActiveStep('process-bisque', stepNum);
          if (stepNum === 2) renderTimeline();
        });
      });

      const mainRow = qs('.process-main', bisqueNav);
      mainRow?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showProcess('process-bisque');
        showBisqueStep(1);
        setOnlyOneActiveStep('process-bisque', 1);
      });
    }

    showBisqueStep(1);
    // highlight only current step (none others)
    setOnlyOneActiveStep('process-bisque', 1);
  })();

  /* =========================================================================
   * PROCESS 3 — GLAZING (scan → model)
   * + step arrows + menu step clicks
   * + Step 4 next jumps to Process 4 Step 1
   * ========================================================================= */
  (() => {
    const glazingScreen = qs('#process-glazing');
    if (!glazingScreen) return;

    const glazeSteps = qsa('.clay-step', glazingScreen);
    let glazeStepIndex = 0;

    const glazePrev = qs('#glaze-prev', glazingScreen);
    const glazeNextArrow = qs('#glaze-next', glazingScreen);
    const glazeLockBtn = qs('#glaze-lock-btn', glazingScreen);

    const glazeStage = qs('#glaze-scan-stage', glazingScreen);
    const glazeVideo = qs('#glaze-video', glazingScreen);
    const glazeOverlay = qs('#glaze-scan-overlay', glazingScreen);
    const glazeModel = qs('#glaze-model', glazingScreen);

    const sidebarGlazing = qs('#sidebar-glazing');
    const firedBtn = sidebarGlazing
      ? (qs('#glaze-fired-btn', sidebarGlazing) || qs('.glaze-fired-btn', sidebarGlazing))
      : null;

    const glazeInputs = sidebarGlazing ? qsa('input[name="glaze"]', sidebarGlazing) : [];
    const glazeButtons = sidebarGlazing ? qsa('button.swatch, .glaze-swatch', sidebarGlazing) : [];

    const glazingNav = qs('.process-nav-item[data-target="process-glazing"]');
    const glazeMenuItems = glazingNav ? qsa('.clay-step-menu-item', glazingNav) : [];
    const glazingMainRow = glazingNav ? qs('.process-main', glazingNav) : null;

    let glazeStream = null;
    let glazeScanTimer = null;

    const glazeState = {
      scanning: false,
      locked: false,
      fired: false,
    };

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

    function showGlazeScanOverlay(on) {
      glazeOverlay?.classList.toggle('active', !!on);
    }

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

    async function startGlazeCamera() {
      if (!glazeVideo || glazeStream) return;
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
    window.stopGlazeCamera = stopGlazeCamera;

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

    function setGlazeStep(n) {
      if (!glazeSteps.length) return;

      glazeStepIndex = clamp(n, 0, glazeSteps.length - 1);
      const stepNum = glazeStepIndex + 1;

      glazeSteps.forEach((el, i) => el.classList.toggle('active', i === glazeStepIndex));

      // arrows behavior
      if (glazePrev) glazePrev.disabled = glazeStepIndex === 0;

      // ✅ don't disable next on last step, because we use it to jump to process 4
      if (glazeNextArrow) glazeNextArrow.disabled = false;

      // leaving step 1 stops scanning/camera
      if (stepNum !== 1) {
        showGlazeScanOverlay(false);
        stopGlazeCamera();
      }

      // ✅ only one active step globally
      setOnlyOneActiveStep('process-glazing', stepNum);

      syncSwatchToModel();
    }
    window.setGlazeStep = setGlazeStep;

    glazePrev?.addEventListener('click', () => {
      setGlazeStep(glazeStepIndex - 1);
    });

    glazeNextArrow?.addEventListener('click', () => {
      // Step 4 -> Process 4 Step 1
      if (glazeSteps.length && glazeStepIndex === glazeSteps.length - 1) {
        const p4 = qs('.process-nav-item[data-target="process-glaze-firing"]');
        p4?.click();
        // force step 1 of process 4
        qs('.process-nav-item[data-target="process-glaze-firing"] .clay-step-menu-item[data-step="1"]')?.click();
        return;
      }
      setGlazeStep(glazeStepIndex + 1);
    });

    glazeMenuItems.forEach(li => {
      li.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const stepNum = Number(li.dataset.step || 1);
        showProcess('process-glazing');
        setGlazeStep(stepNum - 1);
      });
    });

    glazingMainRow?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showProcess('process-glazing');
      setGlazeStep(0);
    });

    async function lockScanAndShowModel() {
      glazeState.scanning = false;
      glazeState.locked = true;
      glazeState.fired = false;

      showGlazeScanOverlay(false);
      stopGlazeCamera();
      ensureStageFills();

      if (!glazeModel) return;

      showGlazeModel(true);

      // refresh src to be safe
      glazeModel.removeAttribute('src');
      glazeModel.setAttribute('src', 'assets/bowl-white.glb');

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
      // only step 1
      if ((glazeStepIndex + 1) !== 1) return;
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

    // when leaving process 3, hide swatches + stop camera
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.target;
        if (target !== 'process-glazing') {
          if (sidebarGlazing) sidebarGlazing.style.display = 'none';
          stopGlazeCamera();
        } else {
          syncSwatchToModel();
        }
      });
    });

    // init
    setGlazeStep(0);
    showGlazeVideo(false);
    showGlazeModel(false);
    showGlazeScanOverlay(false);

    if (glazeLockBtn) {
      glazeLockBtn.disabled = false;
      glazeLockBtn.textContent = 'lock in my bowl scan';
    }
    syncSwatchToModel();
  })();

  /* =========================================================================
   * PROCESS 4 — GLAZE FIRING (Step 1 schedule / Step 2 vertical timeline)
   * ========================================================================= */
  (() => {
    const screen = qs('#process-glaze-firing');
    if (!screen) return;

    const step1 = qs('#glaze-firing-step-1', screen);
    const step2 = qs('#glaze-firing-step-2', screen);
    const form  = qs('#glaze-firing-form', screen);
    const timelineEl = qs('#glaze-firing-timeline', screen);

    const nav = qs('.process-nav-item[data-target="process-glaze-firing"]');
    const menuItems = nav ? qsa('.clay-step-menu-item', nav) : [];
    const mainRow = nav ? qs('.process-main', nav) : null;

    if (!step1 || !step2) return;

    function showGlazeFiringStep(stepNum) {
      const is1 = Number(stepNum) === 1;
      step1.style.display = is1 ? 'block' : 'none';
      step2.style.display = is1 ? 'none' : 'block';
    }
    window.showGlazeFiringStep = showGlazeFiringStep;

    const STORAGE_KEY = 'glazeFiringTimelineState_v1';
    const pad2 = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

    const stages = [
      { key: 'appointment', etaDays: 0 },
      { key: 'dropoff',     etaDays: 1 },
      { key: 'firing',      etaDays: 3 },
      { key: 'cooldown',    etaDays: 4 },
      { key: 'done',        etaDays: 6 },
    ];

    function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
    function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
    function initStateIfNeeded() {
      const s = loadState();
      if (!s.baseDate) { s.baseDate = new Date().toISOString(); s.activeIndex = 0; saveState(s); }
      return loadState();
    }

    function renderTimeline() {
      if (!timelineEl) return;
      const state = initStateIfNeeded();
      const base = new Date(state.baseDate);
      const activeIndex = Number(state.activeIndex || 0);

      const items = qsa('.v-tl-item', timelineEl);
      items.forEach((li, idx) => {
        const meta = stages.find(s => s.key === li.dataset.stage);

        const dateEl = qs('[data-date]', li);
        if (dateEl && meta) dateEl.textContent = formatDate(addDays(base, meta.etaDays));

        const confirmEl = qs('[data-confirm]', li);
        if (confirmEl) {
          if (idx < activeIndex) confirmEl.textContent = 'Confirmed';
          else if (idx === activeIndex) confirmEl.textContent = 'In progress';
          else confirmEl.textContent = 'Expected';
        }

        li.classList.toggle('is-done', idx < activeIndex);
        li.classList.toggle('is-active', idx === activeIndex);
      });
    }

    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const dateInput = qs('input[type="date"]', form);
      const base = dateInput?.value ? new Date(dateInput.value + 'T12:00:00') : new Date();

      saveState({ baseDate: base.toISOString(), activeIndex: 0 });

      showProcess('process-glaze-firing');
      showGlazeFiringStep(2);
      setOnlyOneActiveStep('process-glaze-firing', 2);
      renderTimeline();
    });

    menuItems.forEach(li => {
      li.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const stepNum = Number(li.dataset.step || 1);
        showProcess('process-glaze-firing');
        showGlazeFiringStep(stepNum);
        setOnlyOneActiveStep('process-glaze-firing', stepNum);
        if (stepNum === 2) renderTimeline();
      });
    });

    mainRow?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showProcess('process-glaze-firing');
      showGlazeFiringStep(1);
      setOnlyOneActiveStep('process-glaze-firing', 1);
    });

    showGlazeFiringStep(1);
    setOnlyOneActiveStep('process-glaze-firing', 1);
  })();

  /* =========================================================================
 * ONE SINGLE nav handler (no duplicates)
 * ========================================================================= */
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const target = item.dataset.target;
    if (!target) return;

    // leaving clay: stop camera + reset
    if (target !== 'process-clay') cleanupClayOverlaysAndCamera();

    // leaving glazing: stop glaze camera
    if (target !== 'process-glazing') window.stopGlazeCamera?.();

    showProcess(target);

    // default step highlight when switching process by clicking the main process row
    setOnlyOneActiveStep(target, 1);

    if (target === 'process-clay') updateClay();
    if (target === 'process-bisque') window.showBisqueStep?.(1);
    if (target === 'process-glazing') window.setGlazeStep?.(0);
    if (target === 'process-glaze-firing') window.showGlazeFiringStep?.(1);
  });
}); // ✅ IMPORTANT: closes forEach

// =========================
// PROCESS 5 — FINAL PIECE
// upload + camera + preview
// =========================
(() => {
  const finalFile = document.getElementById("final-file");
  const finalCamera = document.getElementById("final-camera");
  const takeBtn = document.getElementById("final-take-btn");

  const preview = document.getElementById("final-preview");
  const previewFrame = document.getElementById("final-preview-frame");
  const emptyState = document.getElementById("final-empty-state");
  const fileNameEl = document.getElementById("final-file-name");

  if (!finalFile || !finalCamera || !takeBtn || !preview || !previewFrame) return;

  let currentObjectUrl = null;

  function showFileName(name) {
    if (!fileNameEl) return;
    fileNameEl.textContent = name || "";
    fileNameEl.style.display = name ? "block" : "none";
  }

  function showPreview(file) {
    if (!file) return;

    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);

    preview.src = currentObjectUrl;
    previewFrame.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    showFileName(file.name);
  }

  finalFile.addEventListener("change", (e) => showPreview(e.target.files?.[0]));
  finalCamera.addEventListener("change", (e) => showPreview(e.target.files?.[0]));

  takeBtn.addEventListener("click", () => finalCamera.click());
})();

// =========================
// Process 5 — Share popup
// =========================
const shareBtn = document.getElementById("final-share-btn");
const noteBox = document.getElementById("final-note");
const previewImgEl = document.getElementById("final-preview");

function openCongratsPopup({ imgSrc, noteText }) {
  const existing = document.getElementById("final-congrats-overlay");
  if (existing) existing.remove();

  // (Optional) remove any leftover ribbons from previous popups
  document.querySelectorAll(".final-ribbon-layer").forEach((n) => n.remove());

  // Popup CSS (kept as you had it)
  if (!document.getElementById("final-congrats-style")) {
    const style = document.createElement("style");
    style.id = "final-congrats-style";
    style.textContent = `
      #final-congrats-overlay{
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.35);
        display: grid; place-items: center;
        z-index: 9999;
        padding: 24px;
      }
      #final-congrats-modal{
        width: min(520px, 92vw);
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        overflow: hidden;
      }
      #final-congrats-body{
        padding: 18px 18px 18px;
        display: grid;
        gap: 12px;
      }
      #final-congrats-title{
        font-size: 18px;
        margin: 0;
      }
      #final-congrats-img{
        width: 100%;
        aspect-ratio: 5 / 3;
        object-fit: contain;
        border-radius: 12px;
        background: #f6f6f6;
        border: 1px solid #eee;
      }
      #final-congrats-note{
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        opacity: 0.85;
        white-space: pre-wrap;
      }
      #final-congrats-actions{
        display: flex;
        justify-content: flex-end;
        padding: 0 18px 18px;
      }
    `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.id = "final-congrats-overlay";

  // ✅ RIBBONS: must be created INSIDE this function so overlay exists
  const ribbonLayer = document.createElement("div");
  ribbonLayer.className = "final-ribbon-layer";
  overlay.appendChild(ribbonLayer);

  function launchRibbons() {
    const colors = ["#E8CFC3", "#F2B8A2", "#E6D9C6", "#C9B8A6"];
    const count = 24;

    for (let i = 0; i < count; i++) {
      const ribbon = document.createElement("div");
      ribbon.className = "ribbon";

      const left = Math.random() * 100;
      const delay = Math.random() * 0.6;
      const duration = 2 + Math.random() * 1;

      ribbon.style.left = `${left}vw`;
      ribbon.style.background = colors[Math.floor(Math.random() * colors.length)];
      ribbon.style.animationDelay = `${delay}s`;
      ribbon.style.animationDuration = `${duration}s`;

      ribbonLayer.appendChild(ribbon);

      setTimeout(() => ribbon.remove(), (duration + delay) * 1000);
    }

    setTimeout(() => ribbonLayer.remove(), 4000);
  }

  const modal = document.createElement("div");
  modal.id = "final-congrats-modal";

  const safeNote = (noteText || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  modal.innerHTML = `
    <div id="final-congrats-body">
      <h3 id="final-congrats-title">Congratulations! Thanks for sharing your final piece with the community.</h3>
      <img id="final-congrats-img" src="${imgSrc}" alt="Uploaded piece">
      <p id="final-congrats-note">${safeNote || "It is my first piece. So Excited!"}</p>
    </div>
    <div id="final-congrats-actions">
      <button type="button" class="primary-btn" id="final-congrats-close-btn">Exit Tutorial</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Start ribbons AFTER overlay is in the DOM (safe either way, but this is clean)
  launchRibbons();

  const exitTutorial = () => {
    overlay.remove();
    window.location.href = "index.html"; // your homepage file
  };

  modal.querySelector("#final-congrats-close-btn")?.addEventListener("click", exitTutorial);

  // close on clicking backdrop
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) exitTutorial();
  });

  // ESC to exit
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      exitTutorial();
      window.removeEventListener("keydown", onKeyDown);
    }
  };
  window.addEventListener("keydown", onKeyDown);
}

if (shareBtn) {
  shareBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const hasUserImg =
      previewImgEl &&
      previewImgEl.getAttribute("src") &&
      previewImgEl.style.display !== "none";

    const imgSrc = hasUserImg ? previewImgEl.getAttribute("src") : "assets/upload.png";
    const noteText = noteBox ? noteBox.value.trim() : "";

    openCongratsPopup({ imgSrc, noteText });
  });

}

});
