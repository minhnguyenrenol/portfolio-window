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
  document.addEventListener('DOMContentLoaded', bind);
  setInterval(bind, 1500); // recordings inside a case that is unlocked later
})();
