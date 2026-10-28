(function () {
  var d = document.documentElement;
  d.classList.add('js');
  // Calm mode (no moving scenery) is the visitor's choice, made with the header's "Pause motion" button
  // and remembered in this browser (src/lib/calm.ts). Motion plays by default, Minh's call: a device set to
  // reduce motion gets a note offering the pause instead (src/components/MotionNote.tsx).
  function wantCalm() {
    var s = null; try { s = localStorage.getItem('mn-motion'); } catch (e) {}
    return s === 'off';
  }
  if (wantCalm()) d.classList.add('calm');
  // A saved case password opens the case straight away, so the lock screen says so instead of asking.
  try { if (sessionStorage.getItem('mn-pass')) d.classList.add('has-pass'); } catch (e) {}
  // Never leave content hidden if an island fails to start.
  setTimeout(function () { d.classList.add('settled'); }, 5000);
  // If a saved password hasn't opened the case within 8 seconds, show the password box again.
  setTimeout(function () { if (!document.querySelector('#locked-content.unlocked')) d.classList.remove('has-pass'); }, 8000);
  // The password form only works once its script is running; until then, a submit does nothing instead of reloading.
  document.addEventListener('submit', function (e) { var t = e.target; if (t && t.closest && t.closest('#lock-screen')) e.preventDefault(); }, true);
  // Prototype recordings: muted loops that play only while on screen. Each has a Pause button next to it
  // (it moves for more than five seconds). In calm mode they stay on the poster until someone presses Play.
  function bind() {
    // A table too wide for the screen scrolls sideways; keyboard users need to be able to focus it to scroll it.
    var tw = document.querySelectorAll('.table-wrap');
    for (var t = 0; t < tw.length; t++) {
      var el = tw[t], wide = el.scrollWidth > el.clientWidth + 1;
      if (wide && !el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Table, scrolls sideways'); }
      else if (!wide && el.hasAttribute('tabindex')) { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
    }
    var vids = document.querySelectorAll('video[data-loop]:not([data-bound])');
    for (var i = 0; i < vids.length; i++) (function (v) {
      v.setAttribute('data-bound', ''); v.muted = true;
      var b = v.parentNode && v.parentNode.querySelector('[data-vid-toggle]');
      var held = d.classList.contains('calm'), onScreen = false;
      function label() { if (!b) return; var p = v.paused; b.textContent = p ? 'Play' : 'Pause'; b.setAttribute('aria-label', (p ? 'Play' : 'Pause') + ' the recording'); }
      v.addEventListener('play', label); v.addEventListener('pause', label); label();
      if (b) b.addEventListener('click', function () { if (v.paused) { held = false; v.play().catch(function () {}); } else { held = true; v.pause(); } });
      // Pausing motion holds every recording; resuming lets the on-screen ones play again.
      addEventListener('mn-calm', function () { held = d.classList.contains('calm'); if (held) v.pause(); else if (onScreen) v.play().catch(function () {}); });
      if (!('IntersectionObserver' in window)) return;
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          onScreen = e.isIntersecting && e.intersectionRatio >= 0.35;
          if (onScreen) { if (!held && v.paused) v.play().catch(function () {}); }
          else if (!v.paused) v.pause();
        });
      }, { threshold: [0, 0.35, 0.7] }).observe(v);
    })(vids[i]);
  }
  // A case told as one story has a chapter rail beside it on wide screens. It marks the chapter being read,
  // fills a line as the reader goes, and steps aside before the first chapter and while the 3D set piece plays.
  function rail() {
    var r = document.querySelector('[data-rail]:not([data-bound])');
    if (!r) return;
    r.setAttribute('data-bound', '');
    var links = r.querySelectorAll('a[data-ch]'), chs = [], fill = r.querySelector('[data-fill]'), queued = false;
    // On a locked case the chapters arrive with the password, so look them up again until they exist.
    function find() { chs = []; for (var i = 0; i < links.length; i++) chs.push(document.getElementById(links[i].getAttribute('data-ch'))); }
    find();
    function update() {
      queued = false;
      if (!chs[0]) find();
      var vh = innerHeight, mark = vh * 0.4, cur = -1, stage = false;
      for (var i = 0; i < chs.length; i++) if (chs[i] && chs[i].getBoundingClientRect().top <= mark) cur = i;
      for (var j = 0; j < links.length; j++) { if (j === cur) links[j].setAttribute('aria-current', 'location'); else links[j].removeAttribute('aria-current'); }
      var first = chs[0], last = chs[chs.length - 1];
      if (first && last && fill) {
        var a = first.getBoundingClientRect().top, b = last.getBoundingClientRect().bottom;
        fill.style.transform = 'scaleY(' + Math.min(1, Math.max(0, (mark - a) / Math.max(1, b - a))).toFixed(4) + ')';
      }
      var st = document.querySelectorAll('.story [data-stage]');
      for (var k = 0; k < st.length; k++) { var q = st[k].getBoundingClientRect(); if (q.top < vh * 0.5 && q.bottom > vh * 0.5) stage = true; }
      var done = last && last.getBoundingClientRect().bottom < mark;
      r.classList.toggle('quiet', cur < 0 || stage || done);
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    addEventListener('mn-unlocked', queue);
    update();
  }
  // Before the password, the chapter links have nowhere to go: take the reader to the password field instead.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1), pass = document.getElementById('pass');
    if (!id || document.getElementById(id) || !pass) return;
    e.preventDefault();
    var panel = document.getElementById('lock-screen') || pass;
    panel.scrollIntoView({ block: 'center', behavior: d.classList.contains('calm') ? 'auto' : 'smooth' });
    pass.focus({ preventScroll: true });
  });
  // A real screen inside a locked case has no file to link to (it is inlined in the encrypted page), so its
  // "Open full size" link shows the picture at its own size in a dialog, scrollable, closed with Esc or the button.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-full]') : null;
    if (!a) return;
    var f = a.closest('figure'), img = f && f.querySelector('img');
    if (!img) return;
    e.preventDefault();
    var dlg = document.getElementById('full-view');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'full-view'; dlg.className = 'full-view'; dlg.setAttribute('aria-label', 'Picture at full size');
      dlg.innerHTML = '<button type="button" class="full-close">Close</button><img alt="" />';
      dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    var big = dlg.querySelector('img');
    big.src = img.currentSrc || img.src; big.alt = img.alt;
    dlg.showModal();
  });
  // Open each page at the top. Some hosts carry the last page's scroll position into the next page,
  // which dropped visitors at the end of a case. Back and forward, and links to a section, keep the browser's behaviour.
  (function () {
    var nav = null;
    try { nav = performance.getEntriesByType('navigation')[0]; } catch (e) {}
    if (nav && nav.type === 'back_forward') return;
    var moved = false;
    ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(function (t) { addEventListener(t, function () { moved = true; }, { passive: true, once: true }); });
    function top() {
      var id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
      if (moved || (id && document.getElementById(id)) || window.scrollY <= 0) return;
      window.scrollTo(0, 0);
    }
    document.addEventListener('DOMContentLoaded', top);
    addEventListener('load', top);
    setTimeout(top, 250); setTimeout(top, 900);
  })();
  function bindAll() { bind(); rail(); }
  document.addEventListener('DOMContentLoaded', bindAll);
  setInterval(bindAll, 1500); // recordings and the chapter rail inside a case that is unlocked later
})();
