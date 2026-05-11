/* Corporate script v2 */
(function(){
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mmClose = document.getElementById('mmClose');

  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    if (mmClose) mmClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
  }

  // Reveal
  const revealItems = document.querySelectorAll('.reveal-item');
  if (revealItems.length > 0) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const siblings = Array.from(e.target.parentElement?.querySelectorAll('.reveal-item') || []);
          const idx = siblings.indexOf(e.target);
          setTimeout(() => e.target.classList.add('visible'), Math.min(idx * 80, 320));
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(el => io.observe(el));
  }

  // Carousel
  function initCarousel(trackId, prevId, nextId, dotsId) {
    const track = document.getElementById(trackId);
    if (!track) return;
    const slides = Array.from(track.children);
    if (!slides.length) return;
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const dotsWrap = document.getElementById(dotsId);
    let current = 0, timer = null;

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'c-dot' + (i === 0 ? ' active' : '');
        d.setAttribute('aria-label', 'Slide ' + (i + 1));
        d.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(d);
      });
    }

    function goTo(idx) {
      current = (idx + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dotsWrap?.querySelectorAll('.c-dot').forEach((d, i) => d.classList.toggle('active', i === current));
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 5000);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    let tx = null;
    track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      if (tx === null) return;
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goTo(dx < 0 ? current + 1 : current - 1);
      tx = null;
    });

    timer = setInterval(() => goTo(current + 1), 5000);
  }

  initCarousel('galleryCarousel', 'gallPrev', 'gallNext', 'gallDots');
  initCarousel('testiCarousel', 'testiPrev', 'testiNext', 'testiDots');

  // Editor mode
  window.addEventListener('message', e => {
    if (e.data?.type === 'ENABLE_EDITOR') enableEditor();
    if (e.data?.type === 'UPDATE_FIELD') {
      const el = document.querySelector(`[data-editable="${e.data.key}"]`);
      if (el) el.innerText = e.data.value;
    }
    if (e.data?.type === 'UPDATE_HREF') {
      const els = document.querySelectorAll(`[data-editable-href="${e.data.key}"]`);
      els.forEach(el => {
        if (e.data.value) {
          el.href = e.data.value;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }
    if (e.data?.type === 'UPDATE_CSS_VAR') document.documentElement.style.setProperty(e.data.variable, e.data.value);
  });

  function enableEditor() {
    document.body.classList.add('editor-mode');
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.contentEditable = 'true';
      el.addEventListener('input', () => notifyChange(el.dataset.editable, el.innerText));
    });
    document.querySelectorAll('.editable-image').forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', ev => {
        ev.preventDefault(); ev.stopPropagation();
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = e => {
          const file = e.target.files[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => { img.src = ev.target.result; notifyChange('image_' + img.className, ev.target.result); };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    });
  }

  function notifyChange(key, value) {
    window.parent?.postMessage({ type: 'WHYLO_CHANGE', key, value }, '*');
  }
})();
