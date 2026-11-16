(() => {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const desktop = window.matchMedia('(min-width: 1180px)');

  /* Header sólido al hacer scroll */
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menú del celular */
  const label = toggle.querySelector('.menu-toggle__label');

  const setMenu = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Cerrar menú' : 'Abrir menú';
    document.body.classList.toggle('is-locked', open);
    if (open) menu.querySelector('a')?.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a') && !desktop.matches) setMenu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
    setMenu(false);
    toggle.focus();
  });

  desktop.addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* Sección actual en el menú: la última cuyo inicio pasó el 40% de la pantalla
     (al llegar al final de la página, la última del menú) */
  const navLinks = [...menu.querySelectorAll('a[href^="#"]')]
    .map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) }))
    .filter((l) => l.el);
  let currentLink = null, spyTick = false;
  const spy = () => {
    spyTick = false;
    const line = window.innerHeight * 0.4;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let next = navLinks[0];
    navLinks.forEach((l) => { if (l.el.getBoundingClientRect().top <= line) next = l; });
    if (atEnd) next = navLinks[navLinks.length - 1];
    if (next === currentLink) return;
    currentLink?.a.removeAttribute('aria-current');
    next.a.setAttribute('aria-current', 'location');
    currentLink = next;
  };
  navLinks.forEach((l) => l.a.removeAttribute('aria-current'));
  spy();
  window.addEventListener('scroll', () => {
    if (!spyTick) { spyTick = true; requestAnimationFrame(spy); }
  }, { passive: true });

  /* Video del hero: autoplay solo si el usuario no pidió menos movimiento */
  const video = document.querySelector('[data-hero-video]');
  if (video && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.preload = 'auto';
    video.play().catch(() => {});
  }

  /* Botón pausa / reproducir (cinta de marcas y proyectos): refleja el estado real */
  const setToggle = (btn, paused, labels) => {
    btn.classList.toggle('is-paused', paused);
    btn.setAttribute('aria-label', paused ? labels[1] : labels[0]);
  };

  /* WhatsApp flotante: oculto mientras se ve el hero (ya tiene "Cotizar") o el footer
     (ya tiene el WhatsApp a la vista). La primera vez que aparece, dos pulsos de atención. */
  const waFloat = document.querySelector('.wa-float');
  const waZones = [document.getElementById('inicio'), document.getElementById('contacto')].filter(Boolean);
  if (waFloat && waZones.length && 'IntersectionObserver' in window) {
    const visible = new Set();
    waFloat.classList.add('is-hidden');
    const waObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      const hide = visible.size > 0;
      waFloat.classList.toggle('is-hidden', hide);
      if (!hide && !waFloat.dataset.pulsed) {
        waFloat.dataset.pulsed = '';
        waFloat.classList.add('is-pulsing');
      }
    }, { threshold: 0.15 });
    waZones.forEach((z) => waObserver.observe(z));
  }

  /* Cinta de marcas: pausa la animación CSS */
  const brands = document.querySelector('[data-brands]');
  const brandsToggle = brands?.querySelector('[data-brands-toggle]');
  brandsToggle?.addEventListener('click', () => {
    const paused = brands.classList.toggle('is-paused');
    setToggle(brandsToggle, paused, ['Pausar la cinta de marcas', 'Reanudar la cinta de marcas']);
  });
  /* ───────── Reseñas ───────── */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Carrusel en cinta: una copia de las reseñas a cada lado. Al pasar la última
     aparece la primera; cuando la cinta termina de moverse sobre una copia,
     salta sin animación a la reseña original equivalente. */
  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const viewport = carousel.querySelector('[data-carousel-viewport]');
    const track = carousel.querySelector('[data-carousel-track]');
    const status = carousel.querySelector('[data-carousel-status]');
    const originals = [...track.children];
    const total = originals.length;

    const makeClone = (li, tag) => {
      const copy = li.cloneNode(true);
      copy.dataset.clone = '';
      copy.querySelectorAll('[id]').forEach((el) => { el.id = `${el.id}-${tag}`; });
      copy.querySelectorAll('[aria-controls]').forEach((el) => {
        el.setAttribute('aria-controls', `${el.getAttribute('aria-controls')}-${tag}`);
      });
      return copy;
    };
    track.prepend(...originals.map((li) => makeClone(li, 'a')));
    track.append(...originals.map((li) => makeClone(li, 'b')));
    const slides = [...track.children];

    let index = total; // primera reseña original
    /* Celular: fila nativa que se desliza con el dedo (como Accesorios); las copias se ocultan
       y la reseña más cercana al centro se marca .is-current para la transición */
    const swipeMode = window.matchMedia('(max-width: 699px)');
    let currentSwipe = -1;
    const perView = () => parseInt(getComputedStyle(carousel).getPropertyValue('--per-view'), 10) || 1;

    const render = (animate) => {
      track.classList.toggle('is-animating', animate && !reduceMotion.matches);
      track.style.setProperty('--i', index);
    };

    /* Solo las tarjetas visibles se pueden enfocar y leer con lector de pantalla */
    const nearest = () => {
      const center = viewport.scrollLeft + viewport.clientWidth / 2;
      let best = 0, bestD = Infinity;
      slides.forEach((li, i) => {
        const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - center);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    };
    const markSwipe = (best) => {
      if (best === currentSwipe) return;
      currentSwipe = best;
      slides.forEach((li, i) => li.classList.toggle('is-current', i === best));
      status.textContent = `Reseña ${(best % total) + 1} de ${total}`;
      carousel.dispatchEvent(new Event('carousel:current'));
    };
    const syncSwipe = () => markSwipe(nearest());
    const centerOn = (i) => {
      const li = slides[i];
      viewport.scrollLeft = li.offsetLeft + li.offsetWidth / 2 - viewport.clientWidth / 2;
    };
    /* Cinta sin fin: al quedar quieta sobre una copia, salta sin que se note a la reseña
       original equivalente (misma posición visual, sin transición) */
    const wrapSwipe = () => {
      const i = nearest();
      if (i >= total && i < 2 * total) return;
      const target = ((i % total) + total) % total + total;
      carousel.classList.add('is-jumping');
      viewport.scrollLeft += slides[target].offsetLeft - slides[i].offsetLeft;
      markSwipe(target);
      void viewport.offsetWidth;
      requestAnimationFrame(() => carousel.classList.remove('is-jumping'));
    };

    const syncVisible = () => {
      if (swipeMode.matches) {
        // las copias se ven (la cinta da la vuelta) pero no se leen ni se enfocan
        slides.forEach((li) => {
          const clone = li.hasAttribute('data-clone');
          li.inert = clone;
          li.toggleAttribute('aria-hidden', clone);
        });
        currentSwipe = -1;
        syncSwipe();
        return;
      }
      const n = perView();
      slides.forEach((li, i) => {
        const on = i >= index && i < index + n;
        li.inert = !on;
        li.toggleAttribute('aria-hidden', !on);
      });
      const first = ((index % total) + total) % total + 1;
      const last = ((index + n - 1) % total) + 1;
      status.textContent = n === 1 ? `Reseña ${first} de ${total}` : `Reseñas ${first} a ${last} de ${total}`;
    };

    const normalize = () => {
      if (index >= total && index < 2 * total) return;
      index = ((index % total) + total) % total + total;
      render(false);
      void track.offsetWidth; // aplica el salto antes de la próxima animación
    };

    const move = (step) => {
      normalize();
      index += step;
      render(true);
      syncVisible();
      if (reduceMotion.matches) normalize();
    };

    track.addEventListener('transitionend', (e) => {
      if (e.target !== track) return;
      track.classList.remove('is-animating');
      normalize();
      syncVisible();
    });

    carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => move(-1));
    carousel.querySelector('[data-carousel-next]').addEventListener('click', () => move(1));

    /* Deslizar con el dedo en el celular */
    let startX = null;
    let startY = 0;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || swipeMode.matches) return;
      startX = e.clientX; startY = e.clientY;
    });
    viewport.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });

    let swipeTick = false, settleTimer = 0;
    viewport.addEventListener('scroll', () => {
      if (!swipeMode.matches) return;
      // fin del gesto: scrollend donde existe; si no, 140 ms sin movimiento
      clearTimeout(settleTimer);
      settleTimer = setTimeout(wrapSwipe, 140);
      if (swipeTick) return;
      swipeTick = true;
      requestAnimationFrame(() => { swipeTick = false; syncSwipe(); });
    }, { passive: true });
    viewport.addEventListener('scrollend', () => {
      if (!swipeMode.matches) return;
      clearTimeout(settleTimer);
      wrapSwipe();
    });

    const setMode = () => {
      const on = swipeMode.matches;
      carousel.classList.toggle('is-swipe', on);
      if (on) {
        viewport.tabIndex = 0; // con teclado: foco en la fila y flechas para moverla
        currentSwipe = -1;
        carousel.classList.add('is-jumping');
        centerOn(total); // primera reseña original, con copias a ambos lados
        requestAnimationFrame(() => carousel.classList.remove('is-jumping'));
      } else {
        viewport.removeAttribute('tabindex');
        slides.forEach((li) => li.classList.remove('is-current'));
        carousel.dispatchEvent(new Event('carousel:current'));
      }
      syncVisible();
    };
    swipeMode.addEventListener('change', setMode);

    render(false);
    setMode();
    window.addEventListener('resize', syncVisible, { passive: true });
  }

  /* "Leer más / Leer menos": solo aparece si el texto realmente se corta */
  const quotes = [...document.querySelectorAll('.review__quote')];
  const syncMore = () => {
    quotes.forEach((quote) => {
      const btn = quote.parentElement.querySelector('.review__more');
      if (quote.classList.contains('is-open')) return;
      const p = quote.querySelector('p');
      btn.hidden = p.scrollHeight <= p.clientHeight + 1;
    });
  };
  quotes.forEach((quote) => {
    const btn = quote.parentElement.querySelector('.review__more');
    btn.addEventListener('click', () => {
      const open = quote.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Leer menos' : 'Leer más';
    });
  });
  syncMore();
  document.fonts?.ready.then(syncMore);
  window.addEventListener('resize', syncMore, { passive: true });

  /* Video de reseña: se reproduce solo mientras se ve y si no se pidió menos movimiento.
     En el celular (fila deslizable), solo el de la reseña del centro; las vecinas quedan en pausa. */
  if (!reduceMotion.matches) {
    const swipeCarousel = document.querySelector('[data-carousel]');
    const videos = [...document.querySelectorAll('[data-review-video]')].map((vid) => ({ vid, seen: false }));
    const apply = ({ vid, seen }) => {
      const li = vid.closest('.review');
      const swipe = swipeCarousel?.classList.contains('is-swipe');
      const main = !swipe || li?.classList.contains('is-current');
      if (seen && main) vid.play().catch(() => {});
      else vid.pause();
    };
    videos.forEach((v) => {
      new IntersectionObserver(([entry]) => {
        v.seen = entry.isIntersecting;
        apply(v);
      }, { threshold: .5 }).observe(v.vid);
    });
    swipeCarousel?.addEventListener('carousel:current', () => videos.forEach(apply));
  }

  /* ───────── Cómo trabajamos ─────────
     Pestañas (stock / personalizado) con 4 pasos cada una. Con movimiento permitido y pantalla
     con alto suficiente, la sección queda fija y el scroll recorre los pasos 01 → 04: el elemento
     fijo es .process__pin en escritorio y .process__stage en el celular. Sin eso, los pasos se
     abren tocándolos. */
  const process = document.querySelector('[data-process]');
  if (process) {
    const STEPS = 4;
    const tabs = [...process.querySelectorAll('[role="tab"]')];
    const panels = [...process.querySelectorAll('[role="tabpanel"]')];
    const media = process.querySelector('[data-process-media]');
    const imgs = [...media.querySelectorAll('.process__img')];
    const pin = process.querySelector('.process__pin');
    const stage = process.querySelector('.process__stage');
    const wide = window.matchMedia('(min-width: 960px)');
    let tab = 0;
    let step = 0;
    let scrolly = false;
    let geo = { start: 0, length: 1 };

    process.classList.add('is-enhanced');
    panels.forEach((panel, i) => { panel.hidden = i !== tab; });

    const stepsOf = (t) => [...panels[t].querySelectorAll('.step')];

    /* La foto nueva entra con un barrido sobre la anterior, que queda debajo hasta el próximo cambio */
    const showImage = (dir) => {
      media.dataset.dir = dir;
      void media.offsetWidth; // el punto de partida del barrido usa la dirección nueva
      imgs.forEach((img) => {
        const on = +img.dataset.tab === tab && +img.dataset.step === step;
        if (on) {
          img.classList.remove('is-leaving');
          img.classList.add('is-active');
        } else if (img.classList.contains('is-active')) {
          img.classList.replace('is-active', 'is-leaving');
        } else {
          img.classList.remove('is-leaving');
        }
      });
    };

    const setStep = (next, fill = 1) => {
      if (next !== step) {
        const dir = next > step ? 'fwd' : 'back';
        step = next;
        showImage(dir);
      }
      stepsOf(tab).forEach((li, i) => {
        const on = i === step;
        li.classList.toggle('is-active', on);
        li.querySelector('.step__head').setAttribute('aria-expanded', String(on));
        li.style.setProperty('--fill', on ? fill.toFixed(3) : '0');
      });
    };

    const stickyEl = () => (wide.matches ? pin : stage);

    /* Desde dónde y durante cuánto scroll el elemento queda fijo.
       Ojo: offsetTop de un elemento sticky ya fijado incluye el corrimiento, así que se usa la
       posición natural: 0 para el pin (primer hijo del track) y el final del título para el stage. */
    const head = process.querySelector('.process__head');
    const measure = () => {
      const el = stickyEl();
      const parent = el.parentElement;
      const top = parseFloat(getComputedStyle(el).top) || 0;
      const natural = wide.matches ? 0 : head.offsetTop + head.offsetHeight;
      geo = {
        start: parent.getBoundingClientRect().top + window.scrollY + natural - top,
        length: Math.max(1, parent.offsetHeight - natural - el.offsetHeight),
      };
    };

    const sync = () => {
      if (!scrolly) return;
      const p = Math.min(1, Math.max(0, (window.scrollY - geo.start) / geo.length));
      const pos = p * STEPS;
      const i = Math.min(STEPS - 1, Math.floor(pos));
      setStep(i, .12 + .88 * Math.min(1, pos - i)); // el paso activo siempre muestra un tramo de línea
    };

    /* La sección queda fija siempre (con "reducir movimiento" solo se quitan el barrido y el zoom de la foto).
       Si el contenido no entra en pantalla se compacta (.is-tight); solo si aun así no entra, pasa a lista.
       El chequeo se hace sin transiciones, con el paso más largo abierto, para medir el alto final. */
    const overflows = () => {
      const el = stickyEl();
      return el.scrollHeight > el.clientHeight + 2;
    };
    const fitCheck = () => {
      process.classList.add('is-measuring');
      const items = stepsOf(tab);
      const longest = items.reduce((m, li) => (li.querySelector('.step__text').textContent.length > m.querySelector('.step__text').textContent.length ? li : m), items[0]);
      items.forEach((li) => li.classList.toggle('is-active', li === longest));
      void process.offsetHeight;
      const tooBig = overflows();
      items.forEach((li, i) => li.classList.toggle('is-active', i === step));
      void process.offsetHeight;
      process.classList.remove('is-measuring');
      return tooBig;
    };
    const mode = () => {
      process.classList.remove('is-tight');
      process.classList.add('is-scrolly');
      scrolly = true;
      if (fitCheck()) {
        process.classList.add('is-tight');
        if (fitCheck()) {
          scrolly = false;
          process.classList.remove('is-scrolly', 'is-tight');
        }
      }
      if (scrolly) { measure(); sync(); } else setStep(step);
    };

    panels.forEach((panel) => {
      panel.querySelectorAll('.step__head').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          if (scrolly) window.scrollTo({ top: geo.start + ((i + .12) / STEPS) * geo.length });
          else setStep(i);
        });
      });
    });

    const selectTab = (t) => {
      if (t === tab) return;
      tabs.forEach((btn, i) => {
        btn.setAttribute('aria-selected', String(i === t));
        btn.tabIndex = i === t ? 0 : -1;
      });
      panels.forEach((panel, i) => { panel.hidden = i !== t; });
      tab = t;
      step = -1; // fuerza el cambio de foto aunque se quede en el paso 01
      setStep(0, scrolly ? 0 : 1);
      if (scrolly) {
        mode();
        /* vuelve al paso 01: con la sección fija el salto no se ve */
        if (window.scrollY > geo.start) window.scrollTo({ top: geo.start, behavior: 'instant' });
        sync();
      }
    };

    tabs.forEach((btn, i) => {
      btn.addEventListener('click', () => selectTab(i));
      btn.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        const next = (keys[e.key] + tabs.length) % tabs.length;
        selectTab(next);
        tabs[next].focus();
      });
    });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking || !scrolly) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; sync(); });
    }, { passive: true });

    /* Se recalcula cuando cambia la ventana o el alto real del contenido (p. ej. al cargar las fuentes) */
    let resizing = false;
    const queueMode = () => {
      if (resizing) return;
      resizing = true;
      requestAnimationFrame(() => { resizing = false; mode(); });
    };
    window.addEventListener('resize', queueMode, { passive: true });
    /* Cambios de alto del contenido (fuentes que cargan, otro paso abierto): solo se vuelve a medir */
    if ('ResizeObserver' in window) {
      let pending = false;
      const ro = new ResizeObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; if (scrolly) { measure(); sync(); } });
      });
      [process.querySelector('.process__head'), process.querySelector('.process__panels')].forEach((el) => ro.observe(el));
    }
    reduceMotion.addEventListener?.('change', mode);
    document.fonts?.ready.then(mode);
    window.addEventListener('load', mode);
    mode();
  }

  /* ───────── Preguntas frecuentes ─────────
     Pestañas accesibles (flechas, Inicio, Fin). Sin JS se ven los tres temas seguidos. */
  const faq = document.querySelector('[data-faq]');
  if (faq) {
    const faqTabs = [...faq.querySelectorAll('[role="tab"]')];
    const faqPanels = [...faq.querySelectorAll('[role="tabpanel"]')];
    faq.classList.add('is-enhanced');
    const selectFaq = (t) => {
      faqTabs.forEach((btn, i) => {
        btn.setAttribute('aria-selected', String(i === t));
        btn.tabIndex = i === t ? 0 : -1;
      });
      faqPanels.forEach((panel, i) => { panel.hidden = i !== t; });
    };
    selectFaq(0);
    faqTabs.forEach((btn, i) => {
      btn.addEventListener('click', () => selectFaq(i));
      btn.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: faqTabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        const next = (keys[e.key] + faqTabs.length) % faqTabs.length;
        selectFaq(next);
        faqTabs[next].focus();
      });
    });
  }

  /* ───────── Scroll reveal con escalonado ─────────
     · [data-reveal]: el bloque aparece una vez al entrar en pantalla; los que entran juntos
       se escalonan 90 ms entre sí.
     · Títulos (.section-title y .process__title con [data-reveal]): cada palabra sube desde
       atrás de una línea invisible, 70 ms entre palabras.
     · [data-stagger="selector"]: los hijos que coinciden entran uno tras otro (80 ms, tope de
       6 pasos). Solo cuentan los que están a la vista: en el carrusel, las copias de los
       costados aparecen sin demora.
     Al terminar se limpian las demoras, así el hover no hereda el retraso. */
  const revealItems = [...document.querySelectorAll('[data-reveal], [data-stagger]')];
  if (revealItems.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
    const root = document.documentElement;
    root.classList.add('js-reveal');

    // Partir los títulos en palabras (el texto y su lectura no cambian)
    document.querySelectorAll('.section-title[data-reveal], .process__title[data-reveal]').forEach((title) => {
      if (title.children.length) return;
      const words = title.textContent.trim().split(/\s+/);
      title.setAttribute('aria-label', title.textContent.trim());
      title.textContent = '';
      words.forEach((word, i) => {
        const outer = document.createElement('span');
        outer.className = 'word';
        outer.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.className = 'word__in';
        inner.style.setProperty('--w', i);
        inner.textContent = word;
        outer.append(inner);
        title.append(outer, i < words.length - 1 ? ' ' : '');
      });
      title.classList.add('is-split');
    });

    // Marcar los hijos escalonados antes de observar
    document.querySelectorAll('[data-stagger]').forEach((group) => {
      group.querySelectorAll(group.dataset.stagger).forEach((el) => el.classList.add('stagger-item'));
    });

    const inView = (el) => {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
      const r = el.getBoundingClientRect();
      return r.right > 0 && r.left < window.innerWidth && r.width > 0;
    };

    const revealGroup = (group, base) => {
      const items = [...group.querySelectorAll('.stagger-item')];
      const counters = new Map(); // escalonado por contenedor directo (un panel de FAQ no demora al otro)
      let longest = 0;
      items.forEach((el) => {
        let delay = 0;
        if (inView(el)) {
          const n = counters.get(el.parentElement) || 0;
          counters.set(el.parentElement, n + 1);
          delay = base + Math.min(n, 6) * 80;
        }
        longest = Math.max(longest, delay);
        el.style.setProperty('--reveal-delay', `${delay}ms`);
        el.classList.add('is-revealed');
      });
      setTimeout(() => items.forEach((el) => {
        el.classList.remove('stagger-item', 'is-revealed');
        el.style.removeProperty('--reveal-delay');
      }), longest + 1100);
    };

    const revealer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, i) => {
          const el = entry.target;
          if (el.hasAttribute('data-reveal')) {
            el.style.setProperty('--reveal-delay', `${i * 90}ms`);
            el.classList.add('is-revealed');
          }
          if (el.hasAttribute('data-stagger')) revealGroup(el, el.hasAttribute('data-reveal') ? 160 + i * 90 : i * 90);
          revealer.unobserve(el);
        });
    }, { rootMargin: '0px 0px -12% 0px' });
    revealItems.forEach((el) => revealer.observe(el));
  }

  /* ───────── Reflejo de luz en el vidrio ─────────
     En las tarjetas de vidrio, un brillo suave sigue al cursor (solo con mouse). */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.review, .acc-card, .faq__panels, .about__timeline').forEach((card) => {
      card.classList.add('has-glint');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    });
  }
})();

/* ───────── Proyectos destacados ─────────
   Fila curva de 10 tarjetas, como el interior de un cilindro (marco de 1440×1080 unidades).
   Cada tarjeta se recalcula en cada cuadro a partir de su x respecto del centro:
   ancho, alto de cada borde vertical, centro vertical y un clip-path redondeado.
   Las 10 muestran su recorte de UN mismo video (grilla 5×2): un solo <video> oculto se
   decodifica una vez y cada tarjeta copia su recorte a un <canvas> en cada cuadro, así
   van siempre sincronizadas y el bucle nunca se traba.
   Se desliza sola de derecha a izquierda (50 u/s); se arrastra 1:1 y sigue con inercia. */
(() => {
  const section = document.querySelector('[data-featured]');
  if (!section) return;
  const stage = section.querySelector('[data-featured-stage]');
  const row = section.querySelector('[data-featured-row]');
  const cards = [...row.querySelectorAll('[data-pcard]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 820px)');

  const SPRITE = {
    large: 'uploads/destacados/destacados-sprite-1920.mp4?v=2',
    small: 'uploads/destacados/destacados-sprite-1280.mp4?v=2',
  };
  const N = cards.length;
  const PITCH = 196;          // separación base entre centros
  const LOOP = N * PITCH;     // largo del ciclo completo
  const SPEED = 50;           // u/s, hacia la izquierda
  const DECAY = 0.05;         // la inercia pierde el 95% por segundo
  const TILE_RATIO = 384 / 540;
  const svgNS = 'http://www.w3.org/2000/svg';

  const projectData = (() => {
    try { return JSON.parse(document.getElementById('proyectos-data').textContent); } catch (_) { return {}; }
  })();

  section.classList.add('is-live');
  if (!reduceMotion.matches) section.classList.add('has-entrance');

  /* Elementos de cada tarjeta */
  const items = cards.map((card) => {
    const btn = card.querySelector('button');
    const media = card.querySelector('[data-pcard-media]');
    const ring = document.createElementNS(svgNS, 'svg');
    ring.setAttribute('class', 'pcard__ring');
    ring.setAttribute('aria-hidden', 'true');
    const ringPath = document.createElementNS(svgNS, 'path');
    ring.append(ringPath);
    btn.append(ring);
    const canvas = document.createElement('canvas');
    canvas.className = 'pcard__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    media.after(canvas);
    // Nombre del vehículo: aparece al pasar el mouse (en el táctil, en la tarjeta del centro)
    const label = document.createElement('span');
    label.className = 'pcard__label';
    label.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'pcard__name';
    name.textContent = projectData[btn.dataset.project]?.nombre || '';
    // Año del vehículo: solo se muestra si está el dato ("anio" en #proyectos-data)
    const anio = projectData[btn.dataset.project]?.anio;
    const year = document.createElement('span');
    year.className = 'pcard__year';
    year.textContent = anio || '';
    year.hidden = !anio;
    const cta = document.createElement('span');
    cta.className = 'pcard__cta';
    cta.innerHTML = 'Ver trabajo <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
    label.append(name, year, cta);
    canvas.after(label);
    const tile = Number(card.dataset.tile);
    return { card, btn, media, ringPath, canvas, ctx: null, col: tile % 5, row: Math.floor(tile / 5), visible: true, center: false };
  });

  /* Escala: marco de 1440 unidades centrado (tope por alto de pantalla, para tarjetas grandes);
     en el celular, escala de 480 unidades. La fila ocupa todo el ancho y se desvanece en los
     costados (máscara en CSS). */
  const STAGE_W = 1180;       // ancho visible en escritorio (unidades): unas 6 tarjetas a la vista
  let u = 1, stageH = 0, frameLeft = 0, visMin = -20, visMax = 1460;
  let flatW = 0, flatH = 0, flatP = 0, stageW = 0;
  const measure = () => {
    const full = section.clientWidth;
    let w = full;
    if (phone.matches) {
      // Celular: fila plana, una tarjeta centrada (76% del ancho, tope por alto de pantalla)
      // y las vecinas asomando. u convierte unidades a px: el arrastre sigue al dedo 1:1.
      flatW = Math.min(full * 0.76, 320, window.innerHeight * 0.5 * TILE_RATIO);
      flatH = flatW / TILE_RATIO;
      flatP = flatW + 8;
      u = flatP / PITCH;
      stageH = Math.round(flatH + 56);  // con lugar abajo para la sombra
    } else {
      u = Math.min(full * 1.18 / 1440, window.innerHeight / 700);
      stageH = Math.round(430 * u);
      const gutter = parseFloat(getComputedStyle(section.querySelector('.featured__head')).paddingLeft) || 0;
      w = Math.min(full - 2 * gutter, STAGE_W * u);
    }
    stage.style.setProperty('--stage-h', `${stageH}px`);
    stage.style.setProperty('--stage-w', `${Math.round(w)}px`);
    stageW = w;
    frameLeft = (w - 1440 * u) / 2;
    visMin = -frameLeft / u - 20;
    visMax = (w - frameLeft) / u + 20;
  };

  /* Geometría del cilindro */
  const edgeH = (xe) => 280 + 92 * Math.min(Math.abs(xe - 720) / 706, 1.1) ** 2.6;
  const fmt = (n) => Math.round(n * 10) / 10;
  const roundedQuad = (pts, r) => {
    let d = '';
    for (let k = 0; k < 4; k++) {
      const p = pts[k], a = pts[(k + 3) % 4], b = pts[(k + 1) % 4];
      const toward = (q) => {
        const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
        const t = Math.min(r, len / 2) / len;
        return [p[0] + dx * t, p[1] + dy * t];
      };
      const p1 = toward(a), p2 = toward(b);
      d += `${k ? 'L' : 'M'}${fmt(p1[0])} ${fmt(p1[1])}Q${fmt(p[0])} ${fmt(p[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
    }
    return `${d}Z`;
  };

  let offset = 0;  // desplazamiento acumulado, en unidades
  let snapTarget = null;  // celular: posición a la que se acomoda la fila al soltar

  /* Celular: fila plana. La tarjeta del centro se ve completa; las vecinas se achican,
     se apagan y pierden color según su distancia al centro (la transición es continua) */
  const layoutFlat = () => {
    const W = flatW, H = flatH;
    const top = (stageH - 40 - H) / 2;
    const path = roundedQuad([[0, 0], [W, 0], [W, H], [0, H]], 15);
    items.forEach((it, i) => {
      const t = ((((i * PITCH - offset) % LOOP) + LOOP * 1.5) % LOOP) - LOOP / 2;
      const k = t / PITCH;
      const xl = stageW / 2 + k * flatP - W / 2;
      const visible = xl + W > -W * 0.5 && xl < stageW + W * 0.5;
      if (visible !== it.visible) {
        it.visible = visible;
        it.card.classList.toggle('is-off', !visible);
      }
      const center = Math.abs(k) < 0.5;
      if (center !== it.center) {
        it.center = center;
        it.card.classList.toggle('is-center', center);
      }
      if (!visible) return;
      const d = Math.min(Math.abs(k), 1);
      const s = it.card.style;
      s.transform = `translate3d(${fmt(xl)}px, ${fmt(top)}px, 0) scale(${(1 - 0.08 * d).toFixed(3)})`;
      s.width = `${fmt(W)}px`;
      s.height = `${fmt(H)}px`;
      s.opacity = (1 - 0.55 * d).toFixed(3);
      it.btn.style.filter = `saturate(${(1 - 0.4 * d).toFixed(3)})`;
      it.btn.style.clipPath = `path('${path}')`;
      it.ringPath.setAttribute('d', path);
      s.setProperty('--edge-pad', '0px');
      s.setProperty('--sy', '16px');
      s.setProperty('--sb', '24px');
      s.setProperty('--sa', (0.3 - 0.15 * d).toFixed(3));
      const m = it.media.style;
      m.width = `${fmt(W * 5)}px`;
      m.height = `${fmt(H * 2)}px`;
      m.transform = `translate3d(${fmt(-it.col * W)}px, ${fmt(-it.row * H)}px, 0)`;
      const c = it.canvas.style;
      c.width = `${fmt(W)}px`;
      c.height = `${fmt(H)}px`;
      c.transform = 'none';
    });
    paintVideo();
  };

  const layout = () => {
    if (phone.matches) { layoutFlat(); return; }
    const mid = stageH / 2;
    items.forEach((it, i) => {
      // t: distancia al centro sin empujar, envuelta en el ciclo
      const t = ((((i * PITCH - offset) % LOOP) + LOOP * 1.5) % LOOP) - LOOP / 2;
      const x = 720 + t * (1 + 0.083 * (t / 706) ** 2);
      const d = Math.abs(x - 720) / 706;
      const w = 170 + 48 * d * d;
      const xl = x - w / 2, xr = x + w / 2;
      const visible = xr > visMin && xl < visMax;
      if (visible !== it.visible) {
        it.visible = visible;
        it.card.classList.toggle('is-off', !visible);  // sin visibility:hidden, para que siga accesible con Tab
      }
      const center = Math.abs(t) < PITCH / 2;
      if (center !== it.center) {
        it.center = center;
        it.card.classList.toggle('is-center', center);
      }
      if (!visible) return;
      const hl = edgeH(xl), hr = edgeH(xr), h = Math.max(hl, hr);
      const yc = 6 - 12 * d * d;  // centro vertical (687 − 12·d²), con la banda centrada en 681
      const W = w * u, H = h * u;
      const top = mid + yc * u - H / 2;
      const pts = [
        [0, (h - hl) / 2 * u], [W, (h - hr) / 2 * u],
        [W, (h + hr) / 2 * u], [0, (h + hl) / 2 * u],
      ];
      const path = roundedQuad(pts, 15 * u);
      const s = it.card.style;
      s.opacity = '';
      it.btn.style.filter = '';
      s.transform = `translate3d(${fmt(xl * u + frameLeft)}px, ${fmt(top)}px, 0)`;
      s.width = `${fmt(W)}px`;
      s.height = `${fmt(H)}px`;
      // El recorte va en el botón: así la sombra de la tarjeta sigue la forma curva
      it.btn.style.clipPath = `path('${path}')`;
      it.ringPath.setAttribute('d', path);
      s.setProperty('--edge-pad', `${fmt(Math.abs(hl - hr) / 2 * u)}px`);
      // Sombra del marco: la tarjeta del centro está "más cerca" y proyecta más sombra
      const near = 1 - Math.min(d, 1);
      s.setProperty('--sy', `${fmt((8 + 14 * near) * u)}px`);
      s.setProperty('--sb', `${fmt((12 + 16 * near) * u)}px`);
      s.setProperty('--sa', (0.16 + 0.18 * near).toFixed(3));
      // Recorte de la grilla 5×2, con cover-fit
      const tileH = Math.max(H, W / TILE_RATIO), tileW = tileH * TILE_RATIO;
      const m = it.media.style;
      m.width = `${fmt(tileW * 5)}px`;
      m.height = `${fmt(tileH * 2)}px`;
      m.transform = `translate3d(${fmt((W - tileW) / 2 - it.col * tileW)}px, ${fmt((H - tileH) / 2 - it.row * tileH)}px, 0)`;
      // El lienzo del video ocupa una sola celda, con el mismo cover-fit
      const c = it.canvas.style;
      c.width = `${fmt(tileW)}px`;
      c.height = `${fmt(tileH)}px`;
      c.transform = `translate3d(${fmt((W - tileW) / 2)}px, ${fmt((H - tileH) / 2)}px, 0)`;
    });
    paintVideo();
  };

  /* Estado del movimiento */
  let velocity = 0;           // u/s, por la inercia
  let userPaused = false;
  let focusIndex = -1;        // tarjeta con foco de teclado: se centra y se frena
  let drag = null;
  let onScreen = false;
  let galleryOpen = false;
  const autoOn = () => !phone.matches && !reduceMotion.matches && !userPaused && focusIndex < 0 && !drag;

  /* Reloj de larga duración (Web Animations): el avance depende del tiempo, no de los cuadros */
  const clock = document.documentElement.animate([], { duration: 1e9 });
  let lastTime = null, raf = 0;
  const frame = () => {
    raf = 0;
    const now = Number(clock.currentTime) || 0;
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (!drag) {
      if (focusIndex >= 0) {
        const target = focusIndex * PITCH + Math.round((offset - focusIndex * PITCH) / LOOP) * LOOP;
        offset += (target - offset) * (1 - Math.exp(-dt * 9));
        velocity = 0;
      } else if (phone.matches) {
        // celular: la fila se acomoda en la tarjeta elegida
        if (snapTarget !== null) {
          offset += (snapTarget - offset) * (1 - Math.exp(-dt * (reduceMotion.matches ? 60 : 9)));
          if (Math.abs(snapTarget - offset) < 0.2) { offset = snapTarget; snapTarget = null; }
        }
        velocity = 0;
      } else {
        offset += (autoOn() ? SPEED : 0) * dt + velocity * dt;
        velocity *= DECAY ** dt;
        if (Math.abs(velocity) < 0.5) velocity = 0;
      }
    }
    layout();
    if (running()) raf = requestAnimationFrame(frame);
  };
  const running = () => onScreen && !galleryOpen && !document.hidden;
  const start = () => {
    if (raf || !running()) return;
    lastTime = null;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  /* Arrastre: sigue al puntero 1:1 y al soltar conserva la velocidad */
  let suppressClick = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, off0: offset, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false };
    velocity = 0;
    start();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      // En el táctil, si el gesto es vertical, es scroll de la página
      if (e.pointerType !== 'mouse' && Math.abs(e.clientY - drag.y0) > Math.abs(dx)) { drag = null; return; }
      drag.moved = true;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      stage.classList.add('is-grabbing');
    }
    offset = drag.off0 - dx / u;
    const dt = (e.timeStamp - drag.lastT) / 1000;
    if (dt > 0) {
      const inst = -(e.clientX - drag.lastX) / u / dt;
      drag.v = drag.v * 0.35 + inst * 0.65;
    }
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved && phone.matches) {
      suppressClick = true;
      const dx = e.clientX - drag.x0;
      const base = Math.round(drag.off0 / PITCH);
      let idx = base;
      if (dx < -40 || drag.v > 600) idx = base + 1;
      else if (dx > 40 || drag.v < -600) idx = base - 1;
      snapTarget = idx * PITCH;
      velocity = 0;
      stage.classList.remove('is-grabbing');
    } else if (drag.moved) {
      suppressClick = true;
      const idle = e.timeStamp - drag.lastT > 90;
      velocity = idle || reduceMotion.matches ? 0 : Math.max(-4000, Math.min(4000, drag.v));
      stage.classList.remove('is-grabbing');
    }
    drag = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  stage.addEventListener('pointerdown', () => { suppressClick = false; }, true);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  /* Teclado: la tarjeta a la que se llega con Tab se centra y la fila se frena */
  // Al enfocar una tarjeta fuera de la vista, el navegador intentaría desplazar el contenedor
  [stage, row].forEach((el) => el.addEventListener('scroll', () => { el.scrollLeft = 0; el.scrollTop = 0; }));
  let tabbing = false;
  document.addEventListener('keydown', (e) => { tabbing = e.key === 'Tab'; }, true);
  document.addEventListener('pointerdown', () => { tabbing = false; }, true);
  items.forEach((it, i) => {
    // Solo al llegar con Tab: un click, o el foco que devuelve la galería al cerrarse,
    // no deben frenar ni tirar la fila hacia atrás
    it.btn.addEventListener('focus', () => {
      if (!tabbing) return;
      focusIndex = i;
      start();
    });
    it.btn.addEventListener('blur', () => { if (focusIndex === i) focusIndex = -1; });
  });

  /* Video: UN solo <video> como fuente. Cada tarjeta dibuja su celda en su lienzo
     cuando hay un cuadro nuevo; un solo decodificador, sin saltos ni desfasajes. */
  let source = null, lastPainted = -1;
  const paintVideo = (force = false) => {
    if (!source || source.readyState < 2) return;
    const t = source.currentTime;
    if (!force && t === lastPainted) return;
    lastPainted = t;
    const tw = source.videoWidth / 5, th = source.videoHeight / 2;
    // En el celular solo avanza el video de la tarjeta del centro: las vecinas quedan
    // en su último cuadro (se pintan una vez, para no mostrar el póster vacío)
    const onlyCenter = phone.matches;
    items.forEach((it) => {
      if (!it.visible) return;
      if (onlyCenter && !it.center && it.ctx) return;
      if (!it.ctx) {
        it.canvas.width = Math.round(tw);
        it.canvas.height = Math.round(th);
        it.ctx = it.canvas.getContext('2d', { alpha: false });
        it.canvas.classList.add('is-ready');
      }
      it.ctx.drawImage(source, it.col * tw, it.row * th, tw, th, 0, 0, it.canvas.width, it.canvas.height);
    });
  };
  const playSource = () => {
    if (source && !userPaused && running()) source.play().catch(() => {});
  };
  const startVideos = () => {
    if (source || reduceMotion.matches) return;
    source = document.createElement('video');
    source.className = 'featured__source';
    source.muted = true;
    source.defaultMuted = true;
    source.loop = true;
    source.playsInline = true;
    source.setAttribute('playsinline', '');
    source.setAttribute('aria-hidden', 'true');
    source.preload = 'auto';
    source.src = phone.matches ? SPRITE.small : SPRITE.large;
    source.addEventListener('loadeddata', () => paintVideo(true));
    stage.prepend(source);
    playSource();
  };

  const sync = () => {
    if (running()) {
      start();
      playSource();
    } else {
      stop();
      source?.pause();
    }
  };

  /* Pausa: frena el avance automático y el video de las tarjetas (con "menos movimiento"
     no hay nada que pausar y el botón queda oculto) */
  const featuredToggle = section.querySelector('[data-featured-toggle]');
  if (featuredToggle && !reduceMotion.matches) {
    featuredToggle.hidden = false;
    featuredToggle.addEventListener('click', () => {
      userPaused = !userPaused;
      featuredToggle.classList.toggle('is-paused', userPaused);
      featuredToggle.setAttribute('aria-label', userPaused ? 'Reanudar proyectos' : 'Pausar proyectos');
      if (userPaused) source?.pause(); else playSource();
    });
  }

  /* Arrastre interrumpido: si el navegador pierde el puntero o la ventana pierde el foco,
     el arrastre termina limpio y el próximo toque funciona */
  stage.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('blur', () => {
    if (drag) endDrag({ pointerId: drag.id, clientX: drag.lastX, timeStamp: drag.lastT });
  });

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) {
      section.classList.add('is-in');
      startVideos();
    }
    sync();
  }, { rootMargin: '10% 0px' }).observe(stage);
  document.addEventListener('visibilitychange', sync);

  measure();
  layout();
  new ResizeObserver(() => { measure(); layout(); }).observe(section);
  const setStageLabel = () => {
    stage.setAttribute('aria-label', phone.matches
      ? 'Proyectos destacados. Deslizá para ver más.'
      : 'Proyectos destacados, se desplaza solo. Arrastrá para moverlo.');
    if (phone.matches) snapTarget = Math.round(offset / PITCH) * PITCH;
  };
  setStageLabel();
  phone.addEventListener('change', () => { setStageLabel(); measure(); layout(); start(); });

  /* ───────── Galería de cada trabajo ───────── */
  const dataEl = document.getElementById('proyectos-data');
  const dialog = section.querySelector('[data-gallery]');
  if (!dataEl || !dialog || typeof dialog.showModal !== 'function') return;
  const projects = JSON.parse(dataEl.textContent);
  const gTitle = dialog.querySelector('[data-gallery-title]');
  const gCount = dialog.querySelector('[data-gallery-count]');
  const gTrack = dialog.querySelector('[data-gallery-track]');
  const gPos = dialog.querySelector('[data-gallery-pos]');
  const gPrev = dialog.querySelector('[data-gallery-prev]');
  const gNext = dialog.querySelector('[data-gallery-next]');
  const gClose = dialog.querySelector('[data-gallery-close]');
  const pad = (n) => String(n).padStart(2, '0');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  let slides = [], current = 0;

  const buildSlides = (slug, firstVideo) => {
    const p = projects[slug];
    const base = `uploads/web/${slug}/${slug}`;
    const order = [];
    if (firstVideo > 0) order.push({ type: 'video', n: firstVideo });
    for (let n = 1; n <= p.fotos; n++) order.push({ type: 'foto', n });
    for (let n = 1; n <= p.videos; n++) if (n !== firstVideo) order.push({ type: 'video', n });
    const total = order.length;
    gTrack.replaceChildren(...order.map((item, i) => {
      const li = document.createElement('li');
      li.className = 'gallery__slide';
      li.setAttribute('role', 'group');
      li.setAttribute('aria-roledescription', 'diapositiva');
      li.setAttribute('aria-label', `${i + 1} de ${total}`);
      if (item.type === 'foto') {
        const img = document.createElement('img');
        img.src = `${base}-foto-${pad(item.n)}-800.webp`;
        img.srcset = `${base}-foto-${pad(item.n)}-800.webp 450w, ${base}-foto-${pad(item.n)}-1920.webp 1080w`;
        img.sizes = '(max-width: 820px) 90vw, 50vh';
        img.width = 1080;
        img.height = 1920;
        img.decoding = 'async';
        if (i > 1) img.loading = 'lazy';
        img.alt = `Trabajo terminado en ${p.nombre}, foto ${item.n} de ${p.fotos}`;
        li.append(img);
      } else {
        const v = document.createElement('video');
        v.src = `${base}-video-${pad(item.n)}.mp4`;
        v.poster = `${base}-video-${pad(item.n)}-poster.webp`;
        v.controls = true;
        v.muted = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.loop = true;
        v.preload = 'none';
        v.setAttribute('aria-label', `Video del trabajo en ${p.nombre}`);
        li.append(v);
      }
      return li;
    }));
    gTitle.textContent = p.nombre;
    gCount.textContent = [plural(p.fotos, 'foto', 'fotos'), p.videos ? plural(p.videos, 'video', 'videos') : '']
      .filter(Boolean).join(' · ');
    slides = [...gTrack.children];
  };

  const setCurrent = (i) => {
    current = i;
    slides.forEach((s, k) => {
      s.classList.toggle('is-current', k === i);
      const v = s.querySelector('video');
      if (v && k !== i) v.pause();
    });
    gPos.textContent = `${i + 1} / ${slides.length}`;
    gPrev.disabled = i === 0;
    gNext.disabled = i === slides.length - 1;
    const v = slides[i]?.querySelector('video');
    if (v && !reduceMotion.matches) v.play().catch(() => {});
  };

  const goTo = (i, smooth = true) => {
    const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
    if (!s) return;
    gTrack.scrollTo({
      left: s.offsetLeft - (gTrack.clientWidth - s.clientWidth) / 2,
      behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto',
    });
  };

  const openGallery = (slug, firstVideo) => {
    if (!projects[slug]) return;
    buildSlides(slug, firstVideo);
    galleryOpen = true;
    sync();
    dialog.showModal();
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => {
      goTo(0, false);
      setCurrent(0);
    });
  };

  /* La diapositiva actual es la más cercana al centro de la pista */
  let scrollRaf = 0;
  gTrack.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      const mid = gTrack.scrollLeft + gTrack.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      slides.forEach((s, k) => {
        const dist = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = k; }
      });
      if (best !== current) setCurrent(best);
    });
  }, { passive: true });

  items.forEach((it) => {
    it.btn.addEventListener('click', () => openGallery(it.btn.dataset.project, Number(it.btn.dataset.video) || 0));
  });
  gPrev.addEventListener('click', () => goTo(current - 1));
  gNext.addEventListener('click', () => goTo(current + 1));
  gClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (e) => {
    if (e.target.closest('video')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
  });
  dialog.addEventListener('close', () => {
    gTrack.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
    gTrack.replaceChildren();
    document.body.classList.remove('is-locked');
    galleryOpen = false;
    sync();
  });
})();

/* ───────── Fondo: parallax de las manchas ─────────
   Cada capa se desplaza a su velocidad y da la vuelta al terminar su mosaico
   (alto = --tile), así el movimiento es continuo en toda la página.
   Sin parallax si el sistema pide reducir el movimiento. */
(() => {
  const ambient = document.querySelector('[data-ambient]');
  if (!ambient) return;
  const layers = [...ambient.children].map((el, i) => ({ el, speed: [0.06, 0.16, 0.3][i] ?? 0.1 }));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let tile = 0;
  let width = 0;
  let ticking = false;

  /* El alto del mosaico se fija en px y solo cambia con el ancho:
     en el celular la barra del navegador cambia el alto y haría saltar el fondo */
  const measure = () => {
    if (tile && window.innerWidth === width) return;
    width = window.innerWidth;
    tile = Math.round(Math.max(window.innerHeight, 560) * 1.2);
    ambient.style.setProperty('--tile', `${tile}px`);
  };
  const render = () => {
    ticking = false;
    const y = reduce.matches ? 0 : window.scrollY;
    for (const { el, speed } of layers) {
      el.style.transform = `translate3d(0, ${-((y * speed) % tile)}px, 0)`;
    }
  };
  const request = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  };

  measure();
  render();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { measure(); request(); }, { passive: true });
  reduce.addEventListener('change', request);
})();

/* ───────── Accesorios: carrusel deslizable en el celular ─────────
   Por debajo de 640px la fila se desliza con el dedo (scroll horizontal nativo con snap).
   Se marca la tarjeta más cercana al centro (.is-current) para la transición de tamaño y brillo.
   Al entrar la sección se revelan todas las tarjetas: las de los costados no esperan a verse. */
(() => {
  const section = document.querySelector('#accesorios');
  const grid = section?.querySelector('.acc__grid');
  if (!grid) return;
  const items = [...grid.children];
  const phone = window.matchMedia('(max-width: 639px)');
  let ticking = false, current = -1;

  const update = () => {
    ticking = false;
    if (!phone.matches) return;
    const center = grid.scrollLeft + grid.clientWidth / 2;
    let best = 0, bestD = Infinity;
    items.forEach((li, i) => {
      const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - center);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best === current) return;
    current = best;
    items.forEach((li, i) => li.classList.toggle('is-current', i === best));
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  const setup = () => {
    const on = phone.matches;
    section.classList.toggle('is-swipe', on);
    current = -1;
    if (on) {
      grid.tabIndex = 0; // con teclado: foco en la fila y flechas para moverla
      grid.setAttribute('aria-label', 'Accesorios: deslizá para ver más');
      update();
    } else {
      grid.removeAttribute('tabindex');
      grid.removeAttribute('aria-label');
      items.forEach((li) => li.classList.remove('is-current'));
    }
  };

  // en el celular, las tarjetas fuera de pantalla se revelan junto con la primera
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting || !phone.matches) return;
    items.forEach((li) => li.classList.add('is-revealed'));
    obs.disconnect();
  }, { rootMargin: '0px 0px -12% 0px' }).observe(grid);

  grid.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  phone.addEventListener('change', setup);
  setup();
})();
