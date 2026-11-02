/*
 * Space scene behind every page: deep-space sky + an interactive constellation network.
 * (markup: #scene in each page; styles: style.css)
 * - Nodes sit at different depths, so the network shifts in parallax with the mouse
 *   (or device tilt). Nodes near the cursor drift away and link up to it.
 * - Node positions come from the visit's clock, so the network carries on exactly
 *   where it was when you move to another page.
 * - Other pages (and the homepage once you scroll to the bio): the network is dimmed and
 *   stops reacting to the cursor, so it stays out of the way of reading. Arriving back on
 *   the homepage it brightens again. On the first visit the links "form" during the intro.
 * The homepage intro itself is pure CSS, so it still plays if this script fails.
 * Pages are swapped without reloading (site-router.js): the canvas keeps running, and
 * SiteScene.pageChanged() re-reads the page-specific parts (homepage intro, About heading).
 */
(function () {
	const scene = document.getElementById('scene');
	const canvas = document.getElementById('net-canvas');
	if (!scene || !canvas) return;
	const ctx = canvas.getContext('2d');
	const root = document.documentElement;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const store = {
		get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
		set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
	};
	const epoch = +store.get('sceneEpoch') || Date.now();

	// --- page-specific parts (re-read after every page change) ---------------------
	let hero = null, isHome = false, aboutHead = null, intro = null, scrollCue = null, layers = [];

	function sizeAbout() {
		const footer = document.querySelector('.site-footer');   // may come after this script
		if (footer) root.style.setProperty('--footer-h', footer.offsetHeight + 'px');
	}
	document.addEventListener('DOMContentLoaded', sizeAbout);
	window.addEventListener('resize', sizeAbout);

	// homepage: "About me" fades in as the photo fades out, and the network dims while reading
	function onPageScroll() {
		if (!isHome) return;
		if (aboutHead && !reduce) aboutHead.classList.toggle('about-in', window.scrollY > hero.offsetHeight * 0.22);
		root.classList.toggle('scene-dim', window.scrollY > hero.offsetHeight * 0.3);
	}
	window.addEventListener('scroll', onPageScroll, { passive: true });
	window.addEventListener('pageshow', () => store.set('lastPage', isHome ? 'home' : 'inner'));

	function setupPage() {
		hero = document.getElementById('hero');
		isHome = !!hero;
		aboutHead = isHome ? document.querySelector('.about-head') : null;
		intro = hero && hero.querySelector('.hero-intro');
		scrollCue = hero && hero.querySelector('.hero-scroll');
		layers = Array.from(document.querySelectorAll('#scene [data-depth], #hero [data-depth]'))
			.map(el => ({ el, depth: parseFloat(el.dataset.depth) || 0 }));
		store.set('lastPage', isHome ? 'home' : 'inner');
		if (isHome) {
			sizeAbout();
			if (aboutHead && !reduce) root.classList.add('js-about');
			if (root.classList.contains('scene-undim')) {
				// arrived from another page: start dimmed, then brighten
				requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.remove('scene-undim'); onPageScroll(); }));
			} else onPageScroll();
		} else {
			root.classList.add('scene-dim');
		}
		applyLayers();
		initTermLines();
	}

	// --- network model -----------------------------------------------------------
	// Fixed seed: every page builds the same network.
	let seed = 20231;
	const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	const POOL = Array.from({ length: 210 }, () => ({
		x0: rnd() * 1.2 - 0.1, y0: rnd() * 1.2 - 0.1,
		vx: (rnd() - 0.5) * 0.012, vy: (rnd() - 0.5) * 0.008,   // screen-widths per second
		z: 0.25 + rnd() * 0.75,                                    // depth: 1 = nearest
		warm: rnd() < 0.12
	}));
	const wrap = v => ((v + 0.1) % 1.2 + 1.2) % 1.2 - 0.1;
	// a few twinkling stars (the sky image itself is static, which keeps repaints cheap)
	const TWINKLE = Array.from({ length: 50 }, () => ({ x: rnd(), y: rnd() * 0.85, r: 0.6 + rnd() * 1.1, s: 0.6 + rnd() * 1.6, p: rnd() * 6.28 }));

	let W = 0, H = 0, dpr = 1, nodes = POOL, linkDist = 130, offX = 0, offY = 0;
	function resize() {
		const r = canvas.getBoundingClientRect();
		dpr = Math.min(2, window.devicePixelRatio || 1);
		W = r.width; H = r.height;
		canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		offX = r.left; offY = r.top;                      // canvas is larger than the screen
		const count = Math.max(45, Math.min(POOL.length, Math.round(W * H / 7500)));
		nodes = POOL.slice(0, count);
		linkDist = W < 700 ? 105 : 150;
		if (reduce) draw(performance.now());
	}

	// --- input ---------------------------------------------------------------------
	let targetX = 0, targetY = 0, curX = 0, curY = 0;
	let px = -9999, py = -9999, pointerOn = false;
	try {
		const saved = JSON.parse(store.get('sceneTilt') || 'null');
		if (saved && !reduce) { curX = targetX = saved[0]; curY = targetY = saved[1]; }
	} catch (e) { }
	window.addEventListener('pagehide', () => store.set('sceneTilt', JSON.stringify([curX, curY])));

	window.addEventListener('pointermove', e => {
		if (e.pointerType === 'mouse') {
			targetX = (e.clientX / window.innerWidth) * 2 - 1;
			targetY = (e.clientY / window.innerHeight) * 2 - 1;
		}
		px = e.clientX - offX; py = e.clientY - offY; pointerOn = true;
	}, { passive: true });
	document.addEventListener('pointerleave', () => { pointerOn = false; });
	window.addEventListener('blur', () => { pointerOn = false; });

	function onTilt(e) {
		if (e.gamma == null) return;
		targetX = Math.max(-1, Math.min(1, e.gamma / 30));
		targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
	}
	if (!reduce && typeof DeviceOrientationEvent !== 'undefined') {
		if (typeof DeviceOrientationEvent.requestPermission === 'function') {
			document.addEventListener('click', function ask() {
				DeviceOrientationEvent.requestPermission()
					.then(s => { if (s === 'granted') window.addEventListener('deviceorientation', onTilt); })
					.catch(() => { });
				document.removeEventListener('click', ask);
			});
		} else window.addEventListener('deviceorientation', onTilt);
	}

	// --- parallax for the sky and the homepage intro ------------------------------
	function applyLayers() {
		for (const l of layers) {
			l.el.style.transform = `translate3d(${(-curX * 60 * l.depth).toFixed(2)}px, ${(-curY * 26 * l.depth).toFixed(2)}px, 0)`;
		}
		if (intro) {
			// the intro stays put and fades out as the bio scrolls up over it
			const p = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
			const o = Math.max(0, 1 - p * 2.7);
			intro.style.opacity = p > 0 ? o.toFixed(3) : '';
			intro.style.visibility = o === 0 ? 'hidden' : '';   // no invisible clickable links
			if (scrollCue) scrollCue.style.opacity = p > 0 ? Math.max(0, 1 - p * 4).toFixed(3) : '';
			// scrolling before the intro has finished: show the bio right away
			if (window.scrollY > 30) root.classList.add('intro-skip');
		}
	}

	// --- drawing -----------------------------------------------------------------
	const introStart = performance.now();
	const formLinks = root.classList.contains('intro-play');   // links appear during the first intro
	const pts = [];
	function draw(now) {
		const T = (Date.now() - epoch) / 1000;
		const linkFade = formLinks ? Math.min(1, Math.max(0, (now - introStart - 1000) / 2200)) : 1;
		const R = 140;
		const interactive = pointerOn && !root.classList.contains('scene-dim');
		ctx.clearRect(0, 0, W, H);

		ctx.fillStyle = '#ffffff';
		for (const st of TWINKLE) {
			ctx.globalAlpha = 0.15 + 0.6 * (0.5 + 0.5 * Math.sin(T * st.s + st.p));
			ctx.fillRect(st.x * W - curX * 6, st.y * H - curY * 4, st.r, st.r);
		}
		ctx.globalAlpha = 1;

		pts.length = 0;
		for (const n of nodes) {
			let x = wrap(n.x0 + n.vx * T) * W - curX * 45 * n.z;
			let y = wrap(n.y0 + n.vy * T) * H - curY * 28 * n.z;
			if (interactive) {                     // gently make room around the cursor
				const dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
				if (d < R && d > 0.1) { const push = (1 - d / R) * 28 * n.z; x += dx / d * push; y += dy / d * push; }
			}
			pts.push([x, y, n]);
		}

		// links between nearby nodes (closer pairs and nearer nodes are brighter)
		ctx.lineWidth = 1;
		for (let i = 0; i < pts.length; i++) {
			const a = pts[i];
			for (let j = i + 1; j < pts.length; j++) {
				const b = pts[j], dx = a[0] - b[0], dy = a[1] - b[1];
				if (dx > linkDist || dx < -linkDist || dy > linkDist || dy < -linkDist) continue;
				const d = Math.hypot(dx, dy);
				if (d < linkDist) {
					const al = (1 - d / linkDist) * 0.6 * Math.min(a[2].z, b[2].z) * linkFade;
					ctx.strokeStyle = `rgba(143,208,255,${al.toFixed(3)})`;
					ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
				}
			}
		}

		// the cursor joins the network (homepage only, not while reading)
		if (interactive && linkFade > 0) {
			for (const p of pts) {
				const d = Math.hypot(p[0] - px, p[1] - py);
				if (d < R * 1.25) {
					ctx.strokeStyle = `rgba(255,215,181,${((1 - d / (R * 1.25)) * 0.5 * linkFade).toFixed(3)})`;
					ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p[0], p[1]); ctx.stroke();
				}
			}
		}

		// nodes
		for (const [x, y, n] of pts) {
			ctx.globalAlpha = 0.35 + 0.6 * n.z;
			ctx.fillStyle = n.warm ? '#ffd7b5' : '#cfeaff';
			ctx.beginPath(); ctx.arc(x, y, 0.8 + 1.9 * n.z, 0, 6.2832); ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	resize();
	window.addEventListener('resize', resize);
	window.SiteScene = { pageChanged: setupPage };
	setupPage();
	window.addEventListener('scroll', applyLayers, { passive: true });   // intro fade (also with reduced motion)
	if (reduce) { draw(performance.now()); return; }

	let frame = 0;
	function loop(now) {
		curX += (targetX - curX) * 0.06;
		curY += (targetY - curY) * 0.06;
		applyLayers();
		// on phones, redraw every 2nd frame while dimmed behind content (saves battery)
		const every = root.classList.contains('scene-dim') && W < 800 ? 2 : 1;
		if (frame++ % every === 0) draw(now);
		requestAnimationFrame(loop);
	}
	requestAnimationFrame(loop);
})();

/*
 * Terminal line: types its text, pauses, erases, and repeats while it is on screen.
 * Markup: <p class="term-line" data-text="...">  (full text stays readable to screen readers)
 */
function initTermLines() {
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	document.querySelectorAll('.term-line[data-text]:not([data-ready])').forEach(line => {
		line.dataset.ready = '1';
		const text = line.dataset.text;
		line.setAttribute('aria-label', '> ' + text);
		line.innerHTML =
			'<span class="term-ghost" aria-hidden="true"><span class="term-prompt">&gt;</span>' + escapeHtml(text) + '<span class="term-cursor"></span></span>' +
			'<span class="term-live" aria-hidden="true"><span class="term-prompt">&gt;</span><span class="term-text"></span><span class="term-cursor"></span></span>';
		const out = line.querySelector('.term-text');
		if (reduce) { out.textContent = text; return; }

		let i = 0, typing = true, timer = null, visible = false;
		function step() {
			if (!visible || !line.isConnected) { timer = null; return; }
			if (typing) {
				out.textContent = text.slice(0, ++i);
				if (i >= text.length) { typing = false; timer = setTimeout(step, 2600); return; }
				timer = setTimeout(step, 38 + Math.random() * 45);
			} else {
				out.textContent = text.slice(0, --i);
				if (i <= 0) { typing = true; timer = setTimeout(step, 700); return; }
				timer = setTimeout(step, 18);
			}
		}
		new IntersectionObserver(entries => {
			visible = entries[0].isIntersecting;
			if (visible && !timer) timer = setTimeout(step, 400);
		}).observe(line);
	});

	function escapeHtml(t) {
		return t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
	}
}
if (!document.getElementById('scene')) initTermLines();   // pages without the scene still get it
