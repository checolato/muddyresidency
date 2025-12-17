// tutorial.js
document.addEventListener('DOMContentLoaded', () => {
  /* =========================================================================
   * Helpers
   * ========================================================================= */
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* =========================================================================
   * 1) PROCESS MENU — only one screen visible
   * ========================================================================= */
  const navItems = qsa('.process-nav-item');
  const screens  = qsa('.process-screen');

  function showProcess(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.target === id));
  }

  // Ensure there is an active screen
  if (!screens.some(s => s.classList.contains('active')) && screens.length) {
    showProcess('process-clay');
  }

  /* =========================================================================
   * 2) PROCESS 1 — CLAY STEPPER + LEFT MENU STEP TABS
   * ========================================================================= */
  const clayScreen    = qs('#process-clay');
  const claySteps     = qsa('.clay-step', clayScreen || document);
  const prevBtn       = qs('#step-prev');
  const nextBtn       = qs('#step-next');
  const illustration  = qs('#step-illustration');

  const clayNav       = qs('.process-nav-item[data-target="process-clay"]');
  const clayMenuItems = clayNav ? qsa('.clay-step-menu-item', clayNav) : [];

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

  let clayIndex = 0;

  // Clay scan/check UI (Process 1 step 8)
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

  function clamp(i, min, max) {
    return Math.max(min, Math.min(max, i));
  }

  function updateClay() {
    if (!claySteps.length) return;

    const totalSteps = claySteps.length;
    clayIndex = clamp(clayIndex, 0, totalSteps - 1);
    const stepNum = clayIndex + 1;

    claySteps.forEach((el, i) => el.classList.toggle('active', i === clayIndex));

    // left menu highlight (only inside process 1 nav)
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

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      clayIndex -= 1;
      updateClay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
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
  }

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

  // Clay scan/check click
  if (checkBtn) {
    checkBtn.addEventListener('click', () => {
      // PASS 0: open camera + enter scan mode
      if (!canScan) {
        hideScanPopups();
        hideIssueSummary();
        hasShownIssues = false;

        setShapeGood();
        if (shapeOverlay) shapeOverlay.classList.add('active');

        if (scanStatus) scanStatus.textContent =
          'We are opening your camera. Allow access, then you can start scanning.';
        if (resultText) resultText.textContent =
          'When the camera appears, place your bowl roughly inside the shape.';

        const enterScanMode = () => {
          canScan = true;
          checkBtn.disabled = false;
          checkBtn.textContent = 'Scan and check';
          checkBtn.classList.add('is-scan-mode');
          if (scanInstruction) scanInstruction.classList.add('visible');
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
                if (illustration) illustration.classList.add('hidden');
                if (shapeOverlay) shapeOverlay.classList.add('active');
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

          if (scanStatus) scanStatus.textContent =
            'We found a few areas to improve. Smooth the highlighted spots, then scan again.';
          if (resultText) resultText.textContent =
            'Focus on smoothing the rim and evening the wall thickness, then scan again.';

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

        if (scanStatus) scanStatus.textContent =
          'Your bowl looks ready for bisque firing. You can book a firing session.';
        if (resultText) resultText.textContent =
          'Looks good. You can refine the rim one last time if you want.';

        stopClayVideo();
        isScanning = false;

        if (scanSuccessPopup) {
          scanSuccessPopup.classList.add('show');
          setTimeout(() => scanSuccessPopup.classList.remove('show'), 3500);
        }

        // Stay on step 8 after success
        clayIndex = claySteps.length - 2;
        updateClay();

        checkBtn.disabled = true;
        if (scanInstruction) scanInstruction.classList.remove('visible');
      }, 2500);
    });
  }

  // initialize clay UI
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
      ...qsa('.clay-step-menu-item', bisqueNav) // fallback (your HTML uses clay-step-menu-item)
    ];
    items.forEach(el => el.classList.toggle('active', Number(el.dataset.step) === Number(stepNum)));
  }

  // Bind clicks for bisque step items
  const bisqueNav = qs('.process-nav-item[data-target="process-bisque"]');
  if (bisqueNav) {
    const bisqueStepItems = [
      ...qsa('.bisque-step-menu-item', bisqueNav),
      ...qsa('.clay-step-menu-item', bisqueNav)
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
    if (mainRow) {
      mainRow.addEventListener('click', (e) => {
        e.stopPropagation();
        showProcess('process-bisque');
        showBisqueStep(1);
        setBisqueMenuActive(1);
      });
    }
  }

  // default bisque view state (safe)
  showBisqueStep(1);
  setBisqueMenuActive(1);

  /* =========================================================================
   * 4) APPOINTMENT POPUP HANDLER
   *    Bisque: submit -> popup -> auto jump to Step 2
   *    Glaze fire: submit -> popup -> show next button (existing)
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
  const bisqueNext  = qs('#bisque-next-btn'); // may exist; we hide it

  if (bisqueForm) {
    bisqueForm.addEventListener('submit', (e) => {
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
  }

  const glazeFireForm = qs('#process-glaze-fire .schedule-form');
  const glazeNext     = qs('#glaze-next-btn');

  function wireAppointmentForm(formEl, nextBtnEl) {
    if (!formEl) return;
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      showSuccessPopup('Appointment requested');

      const submitBtn = qs('button[type="submit"]', formEl);
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

// ===== Process 3: Scan -> Lock -> Model -> Glaze -> Fired Toggle =====

const glazeVideo = document.getElementById('glaze-video');
const glazeModel = document.getElementById('glaze-model');
const lockBtn = document.getElementById('glaze-lock-btn');
const firedBtn = document.querySelector('.glaze-fired-btn');

const glazeInstruction = document.getElementById('glaze-instruction');

// NEW: overlays (match Process 1 behavior)
const glazeScanOverlay = document.getElementById('glaze-scan-overlay');     // contains .scan-line
const glazeShapeOverlay = document.getElementById('glaze-shape-overlay');   // optional

const sidebar = document.getElementById('sidebar-glazing');
const glazeTitleEl = sidebar?.querySelector('.glaze-panel-title');
const glazeDescEl  = sidebar?.querySelector('.glaze-panel-desc');
const glazeInputs  = sidebar ? [...sidebar.querySelectorAll('input[name="glaze"]')] : [];

let glazeStream = null;

const state = {
  cameraOn: false,
  locked: false,
  fired: false, // toggle
  selected: glazeInputs.find(i => i.checked)?.value || glazeInputs[0]?.value || null
};

// ---------------- helpers ----------------

function setHeaderFromSelected() {
  const input = glazeInputs.find(i => i.value === state.selected);
  if (!input) return;
  if (glazeTitleEl) glazeTitleEl.textContent = input.dataset.title || input.value;
  if (glazeDescEl)  glazeDescEl.textContent  = input.dataset.desc  || '';
}

function showModel(show) {
  if (!glazeModel) return;
  glazeModel.style.display = show ? 'block' : 'none';
}

function showScanUI(show) {
  // show/hide scanning animation + guides
  if (glazeScanOverlay) glazeScanOverlay.classList.toggle('active', show);
  if (glazeShapeOverlay) glazeShapeOverlay.classList.toggle('active', show);

  if (glazeInstruction) {
    glazeInstruction.textContent = show
      ? 'Align your bowl inside the guide. Tap “Lock in scan” to capture.'
      : 'Choose a glaze on the right to preview color.';
  }
}

function hexToRgba01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255, 1];
}

function applyGlazeToModel() {
  if (!glazeModel) return;

  const input = glazeInputs.find(i => i.value === state.selected);
  if (!input) return;

  const color = state.fired ? input.dataset.fired : input.dataset.unfired;
  if (!color) return;

  const mv = glazeModel;

  // wait for glTF to load
  if (!mv.model) {
    mv.addEventListener('load', () => applyGlazeToModel(), { once: true });
    return;
  }

  const rgba = hexToRgba01(color);
  if (!rgba) return;

  // tint all materials (MVP)
  mv.model.materials.forEach(mat => {
    mat.pbrMetallicRoughness.setBaseColorFactor(rgba);
  });
}

// ---------------- camera ----------------

async function startGlazeCamera() {
  if (!glazeVideo) return;
  if (glazeStream) return;

  glazeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  glazeVideo.srcObject = glazeStream;
  glazeVideo.style.display = 'block';
  state.cameraOn = true;

  // While scanning: hide model, show overlays
  showModel(false);
  showScanUI(true);
}

function stopGlazeCamera() {
  if (glazeStream) glazeStream.getTracks().forEach(t => t.stop());
  glazeStream = null;

  if (glazeVideo) {
    glazeVideo.srcObject = null;
    glazeVideo.style.display = 'none';
  }
  state.cameraOn = false;

  // Stop scanning visuals
  showScanUI(false);
}

// ---------------- events ----------------

// swatch changes (apply only after lock)
glazeInputs.forEach(input => {
  input.addEventListener('change', () => {
    state.selected = input.value;
    setHeaderFromSelected();
    if (state.locked) applyGlazeToModel();
  });
});

// lock button:
// 1st click opens webcam (starts scan animation)
// 2nd click locks scan (stops webcam, shows model)
lockBtn?.addEventListener('click', async () => {
  // If already locked, allow re-open camera by toggling (optional)
  // If you want lock to be one-way, replace this block with `if (state.locked) return;`
  if (state.locked) {
    // "Rescan" behavior: go back to camera
    state.locked = false;
    state.fired = false;
    showModel(false);
    lockBtn.disabled = false;
    lockBtn.textContent = 'open webcam';
    await startGlazeCamera();
    return;
  }

  // First click: start camera
  if (!state.cameraOn) {
    try {
      await startGlazeCamera();
      lockBtn.textContent = 'lock in scan';
      return;
    } catch (e) {
      console.error(e);
      lockBtn.textContent = 'camera blocked';
      return;
    }
  }

  // Second click: lock
  state.locked = true;
  state.fired = false;

  stopGlazeCamera();

  // show model in scan window
  showModel(true);

  // ensure model uses the white bowl glb
  // (in case it was changed elsewhere)
  if (glazeModel && glazeModel.getAttribute('src') !== 'assets/bowl-white.glb') {
    glazeModel.setAttribute('src', 'assets/bowl-white.glb');
  }

  setHeaderFromSelected();
  applyGlazeToModel();

  // lock button becomes a toggle: "rescan" capability
  lockBtn.textContent = 'rescan';
});

// fired toggle (works after lock)
firedBtn?.addEventListener('click', () => {
  if (!state.locked) return;
  state.fired = !state.fired; // toggle
  applyGlazeToModel();
});

// init
setHeaderFromSelected();
showModel(false);
showScanUI(false);

  /* =========================================================================
   * 6) ONE SINGLE nav handler (no duplicates)
   * ========================================================================= */
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (!target) return;

      // leaving clay: stop camera + reset clay scan UI
      if (target !== 'process-clay') cleanupClayOverlaysAndCamera();

      // leaving glazing: stop glaze camera
      if (target !== 'process-glazing') stopGlazeVideo();

      showProcess(target);

      // defaults
      if (target === 'process-clay') updateClay();

      if (target === 'process-bisque') {
        showBisqueStep(1);
        setBisqueMenuActive(1);
      }

      if (target === 'process-glazing') {
        setGlazeStepActive(1);
      }
    });
  });
});
