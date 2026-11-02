/*
 * Seamless page changes.
 * Clicking a link to another page of the site no longer reloads the browser page: the new
 * page is fetched and only its content (homepage intro, <main>, footer) is swapped in. The
 * navbar, the space scene and everything running in them stay in place, like on a typical
 * modern site. The address bar, page title, Back/Forward and refresh all keep working, and
 * every page still works as a normal standalone page (e.g. opened from a search result).
 *
 * Transition: the same "focus pull" as before, using the CSS in style.css (vt-run names):
 * view transitions where supported, otherwise the CSS fallback fade.
 */
(function () {
	if (window.__siteRouter) return;            // load once
	window.__siteRouter = true;
	if (!window.fetch || !window.DOMParser || !history.pushState) return;

	const root = document.documentElement;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const PAGES = ['', 'index.html', 'education.html', 'research.html', 'publications.html',
		'projects.html', 'experience.html', 'honors.html', 'blogs.html'];
	const pageOf = url => url.pathname.split('/').pop();
	const isSitePage = url => url.origin === location.origin && PAGES.includes(pageOf(url));

	let busy = false;
	const cache = new Map();                     // url -> Promise<html>

	if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
	history.replaceState({ spa: true, scroll: window.scrollY }, '');
	let saveTimer = null;
	window.addEventListener('scroll', () => {   // remember where you were, for Back/Forward
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => history.replaceState({ ...(history.state || {}), spa: true, scroll: window.scrollY }, ''), 120);
	}, { passive: true });

	function load(url) {
		const key = url.split('#')[0];
		if (!cache.has(key)) {
			cache.set(key, fetch(key, { credentials: 'same-origin' }).then(r => {
				if (!r.ok) throw new Error(r.status);
				return r.text();
			}).catch(err => { cache.delete(key); throw err; }));
		}
		return cache.get(key);
	}

	// start fetching on hover/touch, so the page is usually ready by the time you click
	function prefetch(e) {
		const a = e.target.closest && e.target.closest('a[href]');
		if (!a) return;
		const url = new URL(a.href, location.href);
		if (isSitePage(url) && pageOf(url) !== pageOf(location)) load(url.href).catch(() => { });
	}
	document.addEventListener('mouseover', prefetch, { passive: true });
	document.addEventListener('touchstart', prefetch, { passive: true });

	document.addEventListener('click', e => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = e.target.closest('a[href]');
		if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
		const raw = a.getAttribute('href');
		if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;
		const url = new URL(a.href, location.href);
		if (!isSitePage(url)) return;            // other sites, files, legacy pages: normal behaviour
		const samePage = pageOf(url) === pageOf(location) || (pageOf(url) === 'index.html' && pageOf(location) === '') || (pageOf(url) === '' && pageOf(location) === 'index.html');
		if (samePage) {
			e.preventDefault();
			if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
			else window.scrollTo({ top: 0, behavior: 'smooth' });
			closeMobileMenu();
			return;
		}
		e.preventDefault();
		navigate(url.href, { push: true });
	});

	window.addEventListener('popstate', e => {
		navigate(location.href, { push: false, scroll: e.state && typeof e.state.scroll === 'number' ? e.state.scroll : 0 });
	});

	function closeMobileMenu() {
		const open = document.querySelector('.navbar-collapse.show');
		if (open && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(open).hide();
	}

	async function navigate(href, { push, scroll = 0 }) {
		if (busy) return;
		busy = true;
		closeMobileMenu();
		let html;
		try { html = await load(href); }
		catch (err) { location.href = href; return; }   // fall back to a normal page load

		const doc = new DOMParser().parseFromString(html, 'text/html');
		const newMain = doc.querySelector('main');
		if (!newMain || !document.querySelector('main')) { location.href = href; return; }
		newMain.querySelectorAll('script').forEach(s => s.remove());   // already loaded once
		const newHero = doc.getElementById('hero');
		const newFoot = doc.querySelector('footer');
		const url = new URL(href);

		// stylesheets this page needs that aren't loaded yet (e.g. a font)
		doc.querySelectorAll('head link[rel="stylesheet"]').forEach(l => {
			const h = l.getAttribute('href');
			if (h && !document.querySelector(`head link[rel="stylesheet"][href="${CSS.escape(h)}"]`)) {
				document.head.appendChild(document.importNode(l, true));
			}
		});

		const update = () => {
			const toHome = !!newHero;
			// same page-state classes the <head> script sets on a full load
			root.classList.remove('intro-play', 'intro-skip');
			root.classList.toggle('page-home', toHome);
			if (toHome) root.classList.add('hero-seen', 'scene-dim', 'scene-undim');
			else { root.classList.remove('scene-undim'); root.classList.add('scene-dim'); }

			const oldHero = document.getElementById('hero');
			const main = document.querySelector('main');
			if (oldHero && !newHero) oldHero.remove();
			if (newHero) {
				const h = document.importNode(newHero, true);
				if (oldHero) oldHero.replaceWith(h); else main.before(h);
			}
			main.replaceWith(document.importNode(newMain, true));
			const foot = document.querySelector('footer');
			if (foot && newFoot) foot.replaceWith(document.importNode(newFoot, true));
			document.title = doc.title;

			if (push) history.pushState({ spa: true, scroll: 0 }, '', url.href);
			const target = url.hash && document.getElementById(url.hash.slice(1));
			if (target) target.scrollIntoView();
			else window.scrollTo(0, push ? 0 : scroll);

			window.SitePage && window.SitePage.init();
			window.SiteScene && window.SiteScene.pageChanged();
		};

		const done = () => { busy = false; };
		if (document.startViewTransition && !reduce) {
			root.classList.add('vt-run');                  // gives the content its transition names
			const t = document.startViewTransition(update);
			t.finished.finally(() => { root.classList.remove('vt-run'); done(); });
		} else if (!reduce) {
			root.classList.add('no-vt', 'page-leaving');   // CSS fallback: fade out, swap, fade in
			setTimeout(() => { update(); root.classList.remove('page-leaving'); done(); }, 300);
		} else {
			update(); done();
		}
	}
})();
