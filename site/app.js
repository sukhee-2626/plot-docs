/* Plot Docs landing interactions — no dependencies. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Year
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Sticky nav state
  const nav = $('#nav');
  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  menuBtn?.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!open));
    if (mobileMenu) mobileMenu.hidden = open;
  });
  $$('#mobileMenu a').forEach((a) =>
    a.addEventListener('click', () => {
      menuBtn?.setAttribute('aria-expanded', 'false');
      if (mobileMenu) mobileMenu.hidden = true;
    }),
  );

  // Give sibling cards a short cascade instead of popping in all at once.
  $$('.editor-grid, .news-grid, .how-grid, .model-grid, .pricing-grid, .faq-list').forEach(
    (group) => {
      [...group.children].forEach((el, index) => {
        if (!el.classList.contains('reveal')) el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 70}ms`);
      });
    },
  );

  // Reveal on scroll
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    $$('.reveal').forEach((el) => observer.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  // Hero command typing loop
  const typed = $('#typed');
  const prompts = [
    'Turn this report into a 10-slide investor deck',
    'Summarize this contract and flag the risks',
    'Translate this page to Spanish, keep the layout',
    'Build a Q4 forecast with live formulas',
    'Rewrite the intro for a board audience',
  ];
  if (typed && !reduceMotion) {
    let promptIndex = 0;
    let charIndex = typed.textContent.length;
    let deleting = false;
    const tick = () => {
      const current = prompts[promptIndex];
      if (!deleting) {
        charIndex += 1;
        typed.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          deleting = true;
          setTimeout(tick, 2200);
          return;
        }
        setTimeout(tick, 32 + Math.random() * 36);
      } else {
        charIndex -= 2;
        if (charIndex <= 0) {
          charIndex = 0;
          deleting = false;
          promptIndex = (promptIndex + 1) % prompts.length;
        }
        typed.textContent = current.slice(0, Math.max(0, charIndex));
        setTimeout(tick, 14);
      }
    };
    setTimeout(tick, 2600);
  }

  // Billing toggle
  const amounts = $$('.amount');
  $$('.billing-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.billing-toggle button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.billing === 'yearly' ? 'yearly' : 'monthly';
      amounts.forEach((el) => {
        const value = el.dataset[mode];
        if (value !== undefined) el.textContent = value;
      });
      const period = $('.price-card.featured .period');
      if (period) period.textContent = mode === 'yearly' ? 'per month, billed yearly' : 'per month';
    });
  });

  // Download: Windows installer ships with this site; macOS/Linux are next.
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);

  const showToast = (platform) => {
    toast.innerHTML =
      platform === 'mac'
        ? '<strong>macOS build is next.</strong><span>Plot Docs for Windows is available now. Apple Silicon build is in the works.</span>'
        : '<strong>Linux build is next.</strong><span>Plot Docs for Windows is available now. .deb, .rpm and AppImage builds are in the works.</span>';
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 5200);
  };

  $('#winDownload')?.addEventListener('click', (e) => {
    const href = e.currentTarget.getAttribute('href');
    if (!href || href === '#') {
      e.preventDefault();
      showToast('windows');
    }
  });
  $$('.os-btn').forEach((btn) => {
    if (btn.id === 'winDownload') return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(btn.dataset.os);
    });
  });

  // Close toast on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toast.classList.remove('show');
  });

  // Reading progress: a single transform update per frame.
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  let progressRaf = 0;
  const paintProgress = () => {
    progressRaf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  const queueProgress = () => {
    if (!progressRaf) progressRaf = requestAnimationFrame(paintProgress);
  };
  paintProgress();
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress);

  // Hero light follows the pointer on pointer-capable screens.
  const hero = $('.hero');
  if (hero && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener(
      'pointermove',
      (event) => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        hero.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      },
      { passive: true },
    );
  }

  // Interactive product tour.
  const tour = $('#productTour');
  if (tour) {
    const steps = $$('.tour-step', tour);
    const panels = $$('.tour-panel', tour);
    const meta = [
      {
        title: 'Your workspace, at a glance',
        body: 'Recents, templates, folders and Plot AI in one calm dashboard. Start a blank file or pick up exactly where you left off.',
        window: 'Home - Plot Docs',
      },
      {
        title: 'Native documents, AI edits included',
        body: 'Open a real .docx, ask Plot AI for the change, and review it as tracked changes. Nothing is flattened or converted on the way in.',
        window: '2026 Operating Plan.docx',
      },
      {
        title: 'Models, not just tables',
        body: 'Live formulas, validation and pivot tables stay intact. Plot AI can build a forecast, explain a variance or add a scenario without breaking the model.',
        window: 'Q4 Forecast.xlsx',
      },
      {
        title: 'From outline to polished deck',
        body: 'Turn a brief into a designed, fully editable deck. Every chart stays linked to its source, and every slide keeps your brand.',
        window: 'Board Review.pptx',
      },
      {
        title: 'Every page, understood',
        body: 'Read, annotate, comment and fill real PDFs. Plot AI can summarize a page, find a clause or turn a scanned page into an editable document.',
        window: 'Investor Update.pdf',
      },
      {
        title: 'One command bar across the suite',
        body: 'The same AI works in every editor. It reads context, makes the edit and keeps a reviewable snapshot you can roll back.',
        window: 'Plot AI - Command Bar',
      },
      {
        title: 'A running start, in your brand',
        body: 'Start from designed reports, forecasts, decks, briefs and landing pages. The AI then adapts the copy, numbers and charts to your work.',
        window: 'Templates - Plot Docs',
      },
    ];
    let active = 0;

    const activate = (next, moveFocus = false) => {
      active = (next + steps.length) % steps.length;
      steps.forEach((step, index) => {
        const selected = index === active;
        step.classList.toggle('is-active', selected);
        step.setAttribute('aria-selected', String(selected));
        step.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel, index) => {
        const selected = index === active;
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
      });
      const copy = meta[active];
      $('#tourTitle').textContent = copy.title;
      $('#tourBody').textContent = copy.body;
      $('#tourWindowTitle').textContent = copy.window;
      $('#tourProgress').textContent = `${String(active + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
      if (moveFocus) steps[active].focus({ preventScroll: true });
    };

    steps.forEach((step, index) => {
      step.addEventListener('click', () => activate(index));
      step.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          activate(index + 1, true);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          activate(index - 1, true);
        } else if (event.key === 'Home') {
          event.preventDefault();
          activate(0, true);
        } else if (event.key === 'End') {
          event.preventDefault();
          activate(steps.length - 1, true);
        }
      });
    });
    $('#tourNext')?.addEventListener('click', () => activate(active + 1));
    $('#tourPrev')?.addEventListener('click', () => activate(active - 1));
    activate(0);
  }
})();
