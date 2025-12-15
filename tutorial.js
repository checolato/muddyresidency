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

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (!target) return;
      showProcess(target);
    });
  });

  // default to clay if nothing marked active
  if (!screens.some(s => s.classList.contains('active')) && screens.length) {
    showProcess('process-clay');
  }

  /* ------------------------------------------------------------------------
   * 2) CLAY STEPPER — steps + step illustrations + LEFT MENU STEP TABS
   * ----------------------------------------------------------------------*/
  const steps         = [...document.querySelectorAll('.clay-step')];
  const stepMenuItems = [...document.querySelectorAll('.clay-step-menu-item')];
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
    'Step 1 – split the clay into two portions',
    'Step 2 – make a smooth ball from the larger portion',
    'Step 3 – pinch a hole in the middle and rotate outwards',
    'Step 4 – expand the form to create a bowl shape',
    'Step 5 – refine the rim with your fingers and tools',
    'Step 6 – roll a strip from the smaller portion for the base ring',
    'Step 7 – join the ring and blend the seam where bowl and base meet',
    'Step 8 – check your bowl using the guide and scanner',
    'Step 9 – sponge and smooth the surfaces one last time'
  ];

  const checkBtn        = document.getElementById('check-bowl-btn');
  const resultText      = document.getElementById('check-result');
  const scanStatus      = document.getElementById('scan-status');
  const scanStartBtn    = document.getElementById('scan-start-btn'); // will stay hidden
  const shapeOverlay    = document.getElementById('shape-overlay');
  const nextStepBtn     = document.getElementById('next-step-btn');
  const scanInstruction = document.getElementById('scan-instruction');

  let canScan = false; // false = first click opens camera, true = second click scans

  function resetScanUI() {
    canScan = false;

    if (scanStartBtn) {
      scanStartBtn.style.display = 'none';
      scanStartBtn.classList.add('is-disabled');
      scanStartBtn.disabled = true;
    }
    if (scanStatus) {
      scanStatus.textContent = 'Follow the clay steps. The checker will appear at step 8.';
    }
    if (resultText) {
      resultText.textContent = 'Follow the clay steps. The checker will appear at step 8.';
    }
    if (nextStepBtn) nextStepBtn.classList.remove('visible');
    if (shapeOverlay) shapeOverlay.classList.remove('active');
    if (scanInstruction) scanInstruction.classList.remove('visible');
    if (checkBtn) {
      checkBtn.textContent = 'check my bowl before bisque firing';
      checkBtn.classList.remove('is-scan-mode');
    }
  }

  if (steps.length && prevBtn && nextBtn && checkBtn && resultText) {
    let currentIndex = 0;
    const totalSteps = steps.length;        // should be 9
    const SCAN_STEP_INDEX = totalSteps - 2; // second-to-last step (index 7 when 9 steps)

    function clampIndex(i) {
      return Math.max(0, Math.min(totalSteps - 1, i));
    }

    function updateSteps() {
      currentIndex = clampIndex(currentIndex);

      // right column: show only current step
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === currentIndex);
      });

      // left column: highlight current step tab
      const currentStepNumber = currentIndex + 1;
      stepMenuItems.forEach(item => {
        const stepNum = Number(item.dataset.step);
        item.classList.toggle('active', stepNum === currentStepNumber);
      });

      // arrows
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === totalSteps - 1;

      // illustration
      if (illustration && stepImages[currentIndex]) {
        illustration.src = stepImages[currentIndex];
        illustration.alt = stepAlts[currentIndex] || '';
      }

      // show main button only on SCAN_STEP_INDEX (step 8)
      if (currentIndex === SCAN_STEP_INDEX) {
        checkBtn.style.display = 'inline-flex';
        if (!canScan) {
          // first time arriving to step 8 → pre-scan state
          resultText.textContent =
            'You’ve reached “check your bowl”. Tap the button to set up the checker.';
        }
        if (scanInstruction && canScan) {
          // if camera already open and we come back here
          scanInstruction.classList.add('visible');
        }
      } else {
        checkBtn.style.display = 'none';
        resetScanUI();
      }
    }

    // arrow buttons
    prevBtn.addEventListener('click', () => {
      currentIndex = clampIndex(currentIndex - 1);
      updateSteps();
    });

    nextBtn.addEventListener('click', () => {
      currentIndex = clampIndex(currentIndex + 1);
      updateSteps();
    });

    // LEFT MENU STEP TABS
    stepMenuItems.forEach(item => {
      item.addEventListener('click', (event) => {
        event.stopPropagation();

        const stepNum = Number(item.dataset.step); // 1–9
        if (!Number.isNaN(stepNum)) {
          currentIndex = clampIndex(stepNum - 1);
          updateSteps();
        }
      });
    });

    // initial state
    updateSteps();
  }

  /* ------------------------------------------------------------------------
   * 3) CLAY FAKE AR SCAN — webcam + overlay + success + “Next step”
   * ----------------------------------------------------------------------*/
  const overlay  = document.getElementById('scan-overlay');
  const video    = document.getElementById('scan-video');

  let videoStream = null;
  let isScanning  = false;

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
  }

  // initial state
  if (checkBtn && nextStepBtn) {
    // hide secondary scan button completely (we won't use it anymore)
    if (scanStartBtn) {
      scanStartBtn.style.display = 'none';
      scanStartBtn.classList.add('is-disabled');
      scanStartBtn.disabled = true;
    }
    nextStepBtn.classList.remove('visible');

    // ONE BUTTON FLOW
    checkBtn.addEventListener('click', () => {
      // If we are not yet in "ready to scan" mode → open camera
      if (!canScan) {
        if (shapeOverlay) shapeOverlay.classList.add('active');

        if (scanStatus) {
          scanStatus.textContent =
            'We’re opening your camera. Allow access, then you can start scanning.';
        }
        if (resultText) {
          resultText.textContent =
            'When the camera appears, place your bowl roughly inside the shape.';
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              videoStream = stream;
              if (video) {
                video.srcObject = stream;
                video.classList.add('active');
              }
              if (illustration) illustration.classList.add('hidden');
              if (shapeOverlay) shapeOverlay.classList.add('active');

              if (scanStatus) {
                scanStatus.textContent =
                  'Align your bowl inside the shape, then tap “Scan and check”.';
              }

              // switch button into "scan" mode
              canScan = true;
              checkBtn.textContent = 'Scan and check';
              checkBtn.classList.add('is-scan-mode');
              if (scanInstruction) scanInstruction.classList.add('visible');
            })
            .catch(() => {
              // even if camera fails, we still let them run the fake scan
              if (scanStatus) {
                scanStatus.textContent =
                  'Camera not available. You can still tap “Scan and check” to continue.';
              }
              canScan = true;
              checkBtn.textContent = 'Scan and check';
              checkBtn.classList.add('is-scan-mode');
              if (scanInstruction) scanInstruction.classList.add('visible');
            });
        } else {
          // no camera support
          if (scanStatus) {
            scanStatus.textContent =
              'Camera not available. You can still tap “Scan and check” to continue.';
          }
          canScan = true;
          checkBtn.textContent = 'Scan and check';
          checkBtn.classList.add('is-scan-mode');
          if (scanInstruction) scanInstruction.classList.add('visible');
        }
        return;
      }

      // Already in scan mode → this click actually runs the scan
      if (isScanning || !overlay) return;
      isScanning = true;

      if (scanInstruction) scanInstruction.classList.remove('visible');

      overlay.classList.add('active');
      if (scanStatus) scanStatus.textContent = 'Scanning your bowl… hold still.';
      if (resultText) resultText.textContent = 'Checking proportions and surface…';

      setTimeout(() => {
        overlay.classList.remove('active');

        if (scanStatus) {
          scanStatus.textContent =
            '✅ Your bowl looks ready for bisque fire. You can book a firing session.';
        }
        if (resultText) {
          resultText.textContent =
            'Looks good! You can refine the rim one last time if you want.';
        }

        stopClayVideo();
        isScanning = false;

        if (nextStepBtn) nextStepBtn.classList.add('visible');

        // NEW SUCCESS POPUP
        const scanSuccessPopup = document.getElementById('scan-success-popup');
        scanSuccessPopup.classList.add('show');
        setTimeout(() => {
          scanSuccessPopup.classList.remove('show');
        }, 3500);

        checkBtn.disabled = true;
      }, 2500);

    });

    // Next step → jump to bisque section
    nextStepBtn.addEventListener('click', () => {
      showProcess('process-bisque');
    });
  }

  /* ------------------------------------------------------------------------
   * 4) SHARED APPOINTMENT HANDLER (bisque + glaze fire)
   * ----------------------------------------------------------------------*/
  const popup       = document.getElementById('success-popup');

  const bisqueForm  = document.querySelector('#process-bisque .schedule-form');
  const bisqueNext  = document.getElementById('bisque-next-btn');

  const glazeFireForm = document.querySelector('#process-glaze-fire .schedule-form');
  const glazeNext     = document.getElementById('glaze-next-btn');

  function wireAppointmentForm(formEl, nextBtn) {
    if (!formEl || !popup) return;

    formEl.addEventListener('submit', (e) => {
      e.preventDefault(); // stay on this process screen

      // show popup
      popup.classList.add('show');

      // disable submit + change label
      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'appointment requested';
        submitBtn.disabled = true;
      }

      // show “Next step →” button
      if (nextBtn) {
        nextBtn.style.display = 'inline-flex';
      }

      // hide popup after 1.2s
      setTimeout(() => {
        popup.classList.remove('show');
      }, 1200);
    });
  }

  wireAppointmentForm(bisqueForm, bisqueNext);
  wireAppointmentForm(glazeFireForm, glazeNext);

  if (bisqueNext) {
    bisqueNext.addEventListener('click', () => {
      showProcess('process-glazing');
    });
  }

  if (glazeNext) {
    glazeNext.addEventListener('click', () => {
      showProcess('process-final');
    });
  }

  /* ------------------------------------------------------------------------
   * 5) GLAZING — fake scan + 3D bowl + color swatches + texture + fired lookup
   * ----------------------------------------------------------------------*/
  const glazeVideo          = document.getElementById('glaze-video');
  const glazeScanBtn        = document.getElementById('glaze-scan-btn');
  const glazeScanStatus     = document.getElementById('glaze-scan-status');
  const glazeScanOverlay    = document.getElementById('glaze-scan-overlay');
  const glazeTextureOverlay = document.getElementById('glaze-texture-overlay');

  const glazeModelEl   = document.getElementById('glaze-model');
  const glazeMeta      = document.getElementById('glaze-meta');
  const glazeSwatchRow = document.getElementById('glaze-swatches');
  const glazeNameEl    = document.getElementById('glaze-name');
  const glazeNoteEl    = document.getElementById('glaze-note');
  const glazeSwatches  = [...document.querySelectorAll('.glaze-swatch')];
  const glazeFireBtn   = document.getElementById('glaze-fire-btn');

  let glazeStream     = null;
  let glazeScanning   = false;
  let glazeMaterials  = [];
  let currentGlazeStr = null;   // "r,g,b" for unfired color
  let currentSwatchEl = null;   // reference to selected swatch

  // 🔥 Fired color lookup (0–1 RGB)
  const firedColorMap = {
    "Speckled Field": {
      color: "0.78,0.72,0.61"
    },
    "Celadon Green": {
      color: "0.60,0.72,0.62"
    },
    "Milk White": {
      color: "0.90,0.89,0.82"
    },
    // English Rose–like fired mauve
    "Soft Mauve White": {
      color: "0.61,0.33,0.40"
    }
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
  }

  // 5a. Scan flow
  if (glazeScanBtn && glazeVideo && glazeScanStatus) {
    glazeScanBtn.addEventListener('click', () => {
      if (glazeScanning) return;

      glazeScanStatus.textContent =
        'We’re opening your camera. Allow access to start the scan.';

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            glazeStream = stream;
            glazeVideo.srcObject = stream;
            glazeVideo.classList.add('active');

            glazeScanStatus.textContent =
              'Align your bowl in the frame. We’ll run a quick scan…';
            glazeScanning = true;

            // small delay → fake scan animation
            setTimeout(() => {
              if (glazeScanOverlay) glazeScanOverlay.classList.add('active');
              glazeScanStatus.textContent = 'Scanning your bowl…';

              setTimeout(() => {
                if (glazeScanOverlay) glazeScanOverlay.classList.remove('active');
                stopGlazeVideo();
                glazeScanning = false;

                // show 3D model + swatches
                if (glazeModelEl) glazeModelEl.classList.remove('hidden');
                if (glazeMeta) glazeMeta.style.display = 'block';
                if (glazeSwatchRow) glazeSwatchRow.style.display = 'flex';
                if (glazeFireBtn) glazeFireBtn.style.display = 'inline-flex';

                glazeScanStatus.textContent =
                  'Scan complete. Rotate your bowl and try different glazes below.';
              }, 2000);
            }, 800);
          })
          .catch(() => {
            // no camera → just show the model + swatches
            glazeScanStatus.textContent =
              'Camera not available. Here’s a sample bowl you can still try colors on.';
            if (glazeModelEl) glazeModelEl.classList.remove('hidden');
            if (glazeMeta) glazeMeta.style.display = 'block';
            if (glazeSwatchRow) glazeSwatchRow.style.display = 'flex';
            if (glazeFireBtn) glazeFireBtn.style.display = 'inline-flex';
          });
      } else {
        glazeScanStatus.textContent =
          'Camera not available. Here’s a sample bowl you can still try colors on.';
        if (glazeModelEl) glazeModelEl.classList.remove('hidden');
        if (glazeMeta) glazeMeta.style.display = 'block';
        if (glazeSwatchRow) glazeSwatchRow.style.display = 'flex';
        if (glazeFireBtn) glazeFireBtn.style.display = 'inline-flex';
      }
    });
  }

  // 5b. Once the model is ready, wire up swatches + texture + enable fire
  if (glazeModelEl && glazeSwatches.length && glazeNameEl && glazeNoteEl) {
    glazeModelEl.addEventListener('load', () => {
      const model = glazeModelEl.model;
      glazeMaterials = model && model.materials ? [...model.materials] : [];

      glazeSwatches.forEach(btn => {
        btn.addEventListener('click', () => {
          const colorStr   = btn.getAttribute('data-color'); // "0.89,0.86,0.81"
          const name       = btn.getAttribute('data-name') || '';
          const note       = btn.getAttribute('data-note') || '';
          const isSpeckled = btn.hasAttribute('data-speckled');

          currentGlazeStr = colorStr;
          currentSwatchEl = btn;

          // update active state + labels
          glazeSwatches.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          glazeNameEl.textContent = name;
          glazeNoteEl.textContent = note;

          // texture overlay using classes
          if (glazeTextureOverlay) {
            if (isSpeckled) {
              glazeTextureOverlay.classList.add('has-speckles');
              glazeTextureOverlay.classList.remove('fired');
            } else {
              glazeTextureOverlay.classList.remove('has-speckles', 'fired');
            }
          }

          // reset fire button for this glaze
          if (glazeFireBtn) {
            glazeFireBtn.disabled = !colorStr;
            glazeFireBtn.textContent = 'fire this glaze →';
          }

          if (!colorStr || !glazeMaterials.length) return;

          const [r, g, b] = colorStr.split(',').map(Number);

          // apply UNFIRED color to every material on the bowl
          glazeMaterials.forEach(mat => {
            if (mat && mat.pbrMetallicRoughness) {
              mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
            }
          });
        });
      });
    });
  }

  // 5c. Fire button → use lookup table (or darken fallback)
  if (glazeFireBtn) {
    glazeFireBtn.addEventListener('click', () => {
      if (!currentSwatchEl || !currentGlazeStr || !glazeMaterials.length) return;

      const glazeName = currentSwatchEl.getAttribute('data-name') || '';
      const firedInfo = firedColorMap[glazeName];

      let finalRGB;

      if (firedInfo && firedInfo.color) {
        finalRGB = firedInfo.color.split(',').map(Number);
      } else {
        // fallback: generic darken
        const [r, g, b] = currentGlazeStr.split(',').map(Number);
        const factor = 0.75;
        finalRGB = [r * factor, g * factor, b * factor];
      }

      glazeMaterials.forEach(mat => {
        if (mat && mat.pbrMetallicRoughness) {
          mat.pbrMetallicRoughness.setBaseColorFactor([...finalRGB, 1]);
        }
      });

      // stronger speckles after firing for speckled glazes
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
});
