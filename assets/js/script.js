/* ============================================
   Loads extra entries from data/content.json,
   renders them into the site, and drives the
   scroll-linked sliders (Experience & Projects).
   Site works fine even if this file is missing
   or empty.
   ============================================ */
(function () {
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderExperience(item) {
    const logo = item.logo || item.image || '';
    return el(`
      <div class="work-slide">
        <article class="work-card">
          <a class="work-thumb" href="${item.link || '#'}" ${item.link ? 'target="_blank" rel="noopener"' : ''} aria-label="${item.org || item.title || ''}">
            ${logo ? `<img src="${logo}" alt="${item.org || item.title || ''} logo" onerror="this.style.display='none'">` : ''}
          </a>
          <h3 class="work-title">${item.title || ''}</h3>
          <p class="work-org">${item.org || ''}</p>
        </article>
      </div>
    `);
  }

  function renderWorkCard(item, defaultImg) {
    const img = item.image || defaultImg;
    return el(`
      <div class="work-slide">
        <article class="work-card">
          <a class="work-thumb" href="${item.link || '#'}" ${item.link ? 'target="_blank" rel="noopener"' : ''} aria-label="${item.title || ''}">
            ${img ? `<img src="${img}" alt="${item.title || ''}" onerror="this.style.display='none'">` : ''}
          </a>
          <h3 class="work-title">${item.title || ''}</h3>
        </article>
      </div>
    `);
  }

  const WIN_IMAGES = [
    'assets/images/walmart-project.png',
    'assets/images/queen-dta-project.png',
    'assets/images/invisible-driver-project.png',
    'assets/images/hero-bg.jpg'
  ];

  function renderProject(item) {
    return renderWorkCard(item, item.image);
  }

  function renderAward(item) {
    return renderWorkCard(item, item.image || WIN_IMAGES[Math.floor(Math.random() * WIN_IMAGES.length)]);
  }

  function getNavHeight() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--nav-h');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /* ---------- Reusable scroll-linked slider ----------
     The wrap is made tall (N * 100vh) and its inner content
     is position:sticky (pinned just below the fixed navbar),
     so scrolling through that height pins the slide track on
     screen while translating it sideways. Once the user scrolls
     past that height, the page continues on to the next section
     as normal. Returns an update fn so callers can trigger a
     recompute (e.g. after resize). */
  function initSlider({ wrapSelector, stickySelector, trackId, dotsId, dotClass, continuous }) {
    const wrap = document.querySelector(wrapSelector);
    const sticky = wrap && wrap.querySelector(stickySelector);
    const inner = wrap && wrap.querySelector('.section-inner');
    const track = document.getElementById(trackId);
    const dotsWrap = document.getElementById(dotsId);
    if (!wrap || !sticky || !inner || !track) return null;

    const slides = Array.from(track.children);
    const n = slides.length;
    if (n === 0) return null;

    // Single slide: nothing to slide between, skip pinning entirely.
    if (n < 2) {
      wrap.classList.remove('has-slider');
      wrap.style.height = '';
      if (dotsWrap) dotsWrap.innerHTML = '';
      return null;
    }

    wrap.classList.add('has-slider');
    // Continuous strips need less scroll runway than one-page-per-slide.
    wrap.style.height = (continuous ? n * 55 : n * 100) + 'vh';

    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = dotClass + (i === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => {
          const navH = getNavHeight();
          const total = wrap.offsetHeight - sticky.offsetHeight;
          const targetY = wrap.offsetTop - navH + (i / (n - 1)) * total;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        });
        dotsWrap.appendChild(dot);
      });
    }
    const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

    function update() {
      const navH = getNavHeight();
      const total = wrap.offsetHeight - sticky.offsetHeight;
      // wrap is itself position:sticky now (for the page-overlap stack
      // effect), so its live getBoundingClientRect().top freezes at 0
      // once pinned and can't be used to track ongoing scroll. offsetTop
      // reflects wrap's original in-flow position and is unaffected by
      // sticky's visual offset, so rebuild the "rect.top" equivalent from
      // that instead — same math as before, just stickiness-proof.
      const wrapTop = wrap.offsetTop - window.scrollY;
      const scrolled = navH - wrapTop;
      const progress = total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 0;

      if (continuous) {
        // Slide the strip so the LAST card ends up centered in the
        // viewport (not just flush against the edge) — that's the
        // point where this section is "done" and scrolling should
        // hand off to the next page.
        const lastSlide = slides[slides.length - 1];
        const lastCenter = lastSlide.offsetLeft + lastSlide.offsetWidth / 2;
        const maxOffset = Math.max(0, lastCenter - inner.clientWidth / 2);
        track.style.transform = `translateX(${-progress * maxOffset}px)`;
      } else {
        const containerWidth = slides[0].getBoundingClientRect().width;
        track.style.transform = `translateX(${-progress * (n - 1) * containerWidth}px)`;
      }

      const active = Math.round(progress * (n - 1));
      dots.forEach((d, i) => d.classList.toggle('active', i === active));
    }
    return update;
  }

  function setupAllSliders() {
    const updaters = [
      initSlider({
        wrapSelector: '#projects',
        stickySelector: '.work-sticky',
        trackId: 'project-track',
        dotsId: 'project-dots',
        dotClass: 'work-dot',
        continuous: true
      })
    ].filter(Boolean);

    let ticking = false;
    function onFrame() {
      ticking = false;
      updaters.forEach(fn => fn());
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onFrame);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onFrame);
    onFrame();
  }

  document.addEventListener('DOMContentLoaded', setupAllSliders);

  /* ============ NAVBAR COLOR MATCHING ============
     Two different things drive the navbar's theme depending on
     input: setupSectionPaging() (below) sets it instantly, in sync
     with its own tracked section index, for every wheel/touch/
     keyboard page-jump. This function is the fallback for
     prefers-reduced-motion users, who get plain native scrolling
     instead (setupSectionPaging no-ops for them) — so their navbar
     theme has to be derived from raw scroll position instead.
     Gated on prefers-reduced-motion so the two mechanisms are never
     both live at once: running concurrently, this scroll-position
     check would re-fire on every animation frame of the OTHER
     system's eased page-jump and revert the theme it had just set
     instantly, back to the old panel's — which is what caused the
     navbar to appear stuck/delayed instead of switching the moment
     a new page arrived. */
  function setupNavbarTheme() {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const navbar = document.querySelector('.navbar');
    const panels = Array.from(document.querySelectorAll('.panel'));
    if (!navbar || !panels.length) return;

    const THEMES = ['theme-red', 'theme-dark'];
    let ticking = false;

    function apply() {
      ticking = false;
      let active = panels[0];
      for (const panel of panels) {
        if (panel.getBoundingClientRect().top <= 1) active = panel;
      }
      // Belt-and-suspenders: once the user has scrolled to (or past) the
      // very bottom of the page, the last panel is unambiguously the one
      // on screen — even if sub-pixel/mobile-viewport rounding kept its
      // rect.top from ever reading as exactly <=1 above.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
      if (atBottom) active = panels[panels.length - 1];
      const theme = THEMES.find(t => active.classList.contains(t));
      if (theme && !navbar.classList.contains(theme)) {
        navbar.classList.remove(...THEMES);
        navbar.classList.add(theme);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
  }

  document.addEventListener('DOMContentLoaded', setupNavbarTheme);

  /* ============ SECTION PAGING (wheel / touch / keyboard) ============
     Fully takes over scrolling rather than only intercepting at
     section boundaries — every wheel tick, touch move, and paging
     key press is calculated and applied by this code, never handed
     to the browser's own scroll. That matters because the previous
     boundary-only approach let a single large wheel/trackpad tick
     overshoot past a section edge before the boundary check could
     catch it, leaving the page resting half-in one section and
     half-in the next. By always computing "current position + this
     delta" ourselves and clamping/redirecting BEFORE it's applied,
     the page can only ever come to rest fully inside one section, or
     mid-animation toward one.
       - Within a section's own scrollable range (slider sections),
         wheel/touch deltas move the scroll 1:1, so slide-scrubbing
         still feels native.
       - Crossing a section's start/end triggers goTo(), an eased
         ~420ms jump straight to the next/previous section's top.
       - Reduced-motion users get plain native scrolling; this
         controller does nothing for them. */
  function setupSectionPaging() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const panels = Array.from(document.querySelectorAll('.panel'));
    const navbar = document.querySelector('.navbar');
    if (!panels.length) return;

    const THEMES = ['theme-red', 'theme-dark'];

    // Document-flow top of an element, summing up the offsetParent
    // chain instead of using getBoundingClientRect — stays correct
    // even when an ancestor (e.g. the panel itself) is
    // position:sticky, since offsetTop always reflects an element's
    // un-stuck, in-flow position (same reasoning as the wrap/sticky
    // math in initSlider above).
    function docTop(elem) {
      let top = 0;
      while (elem) { top += elem.offsetTop; elem = elem.offsetParent; }
      return top;
    }

    // One stop per top-level panel. A panel that contains .exp-item
    // entries (the experience timeline) instead contributes one stop
    // per entry, so wheel/touch/keyboard paging steps through one
    // role at a time — landing exactly on the next entry instead of
    // leaving two partway visible at once — while every other panel
    // keeps behaving exactly as before.
    let stops = [];
    function measure() {
      stops = [];
      panels.forEach(panel => {
        const items = Array.from(panel.querySelectorAll('.exp-item'));
        if (items.length) {
          items.forEach(item => {
            stops.push({ panel, top: docTop(item), height: item.offsetHeight });
          });
        } else {
          stops.push({ panel, top: panel.offsetTop, height: panel.offsetHeight });
        }
      });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    function boundsFor(i) {
      const s = stops[i];
      const start = s.top;
      const end = Math.max(start, start + s.height - window.innerHeight);
      return { start, end };
    }

    function applyTheme(panel) {
      if (!navbar) return;
      const theme = THEMES.find(t => panel.classList.contains(t));
      if (theme) {
        navbar.classList.remove(...THEMES);
        navbar.classList.add(theme);
      }
    }

    // Track the active stop ourselves instead of re-deriving it from
    // scroll position each time — keeps goTo()/handleDelta() in sync
    // even mid-animation, when scrollY is only a snapshot of an
    // in-flight jump.
    let idx = 0;
    (function initIdx() {
      const y = window.scrollY;
      for (let i = 0; i < stops.length; i++) {
        if (y >= stops[i].top - 2) idx = i;
      }
      applyTheme(stops[idx].panel);
    })();

    let isAnimating = false;
    const DURATION = 460;
    // After landing on a stop, ignore further wheel/touch deltas
    // for a short window. Without this, a stop shorter than the
    // viewport (like a single .exp-item) has zero scrollable slack,
    // so leftover momentum from the very same scroll gesture that
    // just landed on it immediately satisfies the "jump to next
    // stop" condition again — cascading straight past it instead of
    // letting it actually be seen.
    const COOLDOWN = 380;
    let cooldownUntil = 0;

    // Ease-in-out instead of ease-out: ease-out is fastest at the very
    // start of the jump and only decelerates, which reads as an abrupt
    // snap on a fast flick. Easing in first, then out, makes the jump
    // ramp up and settle instead of starting at full speed.
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateTo(targetY) {
      const startY = window.scrollY;
      const delta = targetY - startY;
      if (Math.abs(delta) < 1) { isAnimating = false; return; }
      isAnimating = true;
      const startTime = performance.now();
      function step(now) {
        const t = Math.min(1, (now - startTime) / DURATION);
        window.scrollTo(0, startY + delta * easeInOutCubic(t));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          isAnimating = false;
        }
      }
      requestAnimationFrame(step);
    }

    function goTo(newIdx) {
      newIdx = Math.max(0, Math.min(stops.length - 1, newIdx));
      idx = newIdx;
      applyTheme(stops[idx].panel);
      animateTo(stops[idx].top);
      cooldownUntil = performance.now() + COOLDOWN;
    }

    // The single choke point every input path routes through: given
    // "how far the user just tried to scroll", either move within the
    // current stop's bounds, or hand off to goTo() for the next/
    // previous one — the browser's own scroll never gets a turn.
    function handleDelta(delta) {
      if (isAnimating || !delta || performance.now() < cooldownUntil) return;
      const { start, end } = boundsFor(idx);
      const y = window.scrollY;
      const target = y + delta;
      if (delta > 0 && target >= end - 0.5) {
        if (idx < stops.length - 1) { goTo(idx + 1); return; }
        window.scrollTo(0, end);
        return;
      }
      if (delta < 0 && target <= start + 0.5) {
        if (idx > 0) { goTo(idx - 1); return; }
        window.scrollTo(0, start);
        return;
      }
      window.scrollTo(0, Math.max(start, Math.min(end, target)));
    }

    function onWheel(e) {
      e.preventDefault();
      handleDelta(e.deltaY);
    }
    window.addEventListener('wheel', onWheel, { passive: false });

    let touchY = 0;
    function onTouchStart(e) {
      touchY = e.touches[0].clientY;
    }
    function onTouchMove(e) {
      e.preventDefault();
      const y = e.touches[0].clientY;
      handleDelta(touchY - y);
      touchY = y;
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    // Keyboard paging (arrows / page keys / space) for completeness,
    // so every input method is governed by the same controller.
    function onKeyDown(e) {
      const key = e.key;
      const isDown = key === 'ArrowDown' || key === 'PageDown' || key === ' ';
      const isUp = key === 'ArrowUp' || key === 'PageUp';
      if (!isDown && !isUp && key !== 'Home' && key !== 'End') return;
      e.preventDefault();
      if (isAnimating || performance.now() < cooldownUntil) return;
      if (key === 'Home') goTo(0);
      else if (key === 'End') goTo(stops.length - 1);
      else if (isDown) goTo(idx + 1);
      else goTo(idx - 1);
    }
    window.addEventListener('keydown', onKeyDown);

    // Route in-page nav links (e.g. GITHUB) through the same paging
    // controller so they animate and sync the navbar consistently.
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      const targetId = link.getAttribute('href').slice(1);
      const targetPanel = targetId && document.getElementById(targetId);
      if (!targetPanel) return;
      link.addEventListener('click', (e) => {
        const panelEl = targetPanel.closest('.panel');
        const i = stops.findIndex(s => s.panel === panelEl);
        if (i === -1) return;
        e.preventDefault();
        goTo(i);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', setupSectionPaging);

  /* ============ GITHUB CONTRIBUTION GRAPH ============
     Renders a pixel-accurate replica of GitHub's own
     contribution calendar (bordered squares, month/day
     labels) using live public contribution data.
     ==================================================== */
  function renderGithubGraph(username) {
    const mount = document.getElementById('github-graph');
    const totalEl = document.getElementById('github-contrib-total');
    if (!mount) return;

    const CELL = 17, GAP = 6, LEFT_PAD = 46, TOP_PAD = 52, BOTTOM_PAD = 18;
    const levelColor = ['var(--gh-l0)', 'var(--gh-l1)', 'var(--gh-l2)', 'var(--gh-l3)', 'var(--gh-l4)'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const days = data.contributions || [];
        if (!days.length) return Promise.reject();

        // Bucket days into weeks (columns), Sunday-first, like GitHub.
        const weeks = [];
        let week = new Array(7).fill(null);
        const first = new Date(days[0].date + 'T00:00:00');
        const firstDow = first.getDay();
        for (let i = 0; i < firstDow; i++) week[i] = null;

        days.forEach(d => {
          const dow = new Date(d.date + 'T00:00:00').getDay();
          week[dow] = d;
          if (dow === 6) { weeks.push(week); week = new Array(7).fill(null); }
        });
        if (week.some(x => x)) weeks.push(week);

        const width = LEFT_PAD + weeks.length * (CELL + GAP) + 4;
        const height = TOP_PAD + 7 * (CELL + GAP) + BOTTOM_PAD + 4;

        let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

        // Month labels — placed above the first week column that starts a new month.
        let lastMonth = -1;
        weeks.forEach((w, wi) => {
          const sample = w.find(d => d);
          if (!sample) return;
          const m = new Date(sample.date + 'T00:00:00').getMonth();
          const dt = new Date(sample.date + 'T00:00:00').getDate();
          if (m !== lastMonth && dt <= 7) {
            svg += `<text x="${LEFT_PAD + wi * (CELL + GAP)}" y="${TOP_PAD - 16}">${monthNames[m]}</text>`;
            lastMonth = m;
          }
        });

        // Day-of-week labels (Mon / Wed / Fri), matching GitHub's layout.
        ['Mon', 'Wed', 'Fri'].forEach((label, idx) => {
          const row = idx * 2 + 1;
          svg += `<text x="0" y="${TOP_PAD + row * (CELL + GAP) + CELL - 3}">${label}</text>`;
        });

        // Day cells.
        weeks.forEach((w, wi) => {
          w.forEach((d, di) => {
            if (!d) return;
            const x = LEFT_PAD + wi * (CELL + GAP);
            const y = TOP_PAD + di * (CELL + GAP);
            const lvl = Math.max(0, Math.min(4, d.level || 0));
            svg += `<rect class="gh-cell" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" style="fill:${levelColor[lvl]}"><title>${d.count} contribution${d.count === 1 ? '' : 's'} on ${d.date}</title></rect>`;
          });
        });

        svg += '</svg>';
        mount.innerHTML = svg;

        const year = new Date().getFullYear();
        const total = Object.values(data.total || {}).reduce((a, b) => a + b, 0) || data.total?.[year] || 0;
        if (totalEl) totalEl.textContent = `${total} contributions in the last year`;
      })
      .catch(() => {
        if (totalEl) totalEl.textContent = 'Contribution graph unavailable right now.';
      });
  }

  document.addEventListener('DOMContentLoaded', () => renderGithubGraph('CoffeeIsAllYouNeed'));

  /* ============ EXPERIENCE ROAD ============
     Draws the winding "road" behind the experience timeline by
     measuring where each .exp-node circle actually lands on screen
     and threading a smooth S-curve through those points — works for
     any number of entries, any viewport width, any text length. */
  function setupExpRoad() {
    const road = document.getElementById('exp-road');
    const svg = document.getElementById('exp-road-svg');
    const base = document.getElementById('exp-road-base');
    const line = document.getElementById('exp-road-line');
    if (!road || !svg || !base || !line) return;

    function build() {
      const nodes = Array.from(road.querySelectorAll('.exp-node'));
      const roadRect = road.getBoundingClientRect();
      const w = road.offsetWidth;
      const h = road.scrollHeight;
      if (!w || !h) return;

      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      if (nodes.length < 2) {
        base.setAttribute('d', '');
        line.setAttribute('d', '');
        return;
      }

      const pts = nodes.map(n => {
        const r = n.getBoundingClientRect();
        return {
          x: r.left - roadRect.left + r.width / 2,
          y: r.top - roadRect.top + r.height / 2
        };
      });

      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        const midY = (p0.y + p1.y) / 2;
        d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
      }
      base.setAttribute('d', d);
      line.setAttribute('d', d);
    }

    build();
    window.addEventListener('resize', build);
    window.addEventListener('load', build);
    // Fonts/images can still shift layout slightly after first paint.
    setTimeout(build, 300);
  }

  document.addEventListener('DOMContentLoaded', setupExpRoad);

  fetch('assets/data/content.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;

      const expTrack = document.getElementById('experience-track');
      if (expTrack) (data.experience || []).forEach(item => expTrack.appendChild(renderExperience(item)));

      const projTrack = document.getElementById('project-track');
      if (projTrack) (data.projects || []).forEach(item => projTrack.appendChild(renderProject(item)));

      const winsTrack = document.getElementById('wins-track');
      if (winsTrack) (data.awards || []).forEach(item => winsTrack.appendChild(renderAward(item)));

      // New slides may have been added to the tracks — reinitialize.
      setupAllSliders();
    })
    .catch(() => { /* content.json missing/unreachable — site still works with static content */ });
})();
