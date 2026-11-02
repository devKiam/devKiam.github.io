/*
 * Page features (all pages).
 * The site swaps page content without reloading (see site-router.js), so every feature
 * below lives in SitePage.init(), which runs on first load and again after each page change.
 * Window-level listeners are registered once and work on whatever page is showing.
 */

function fitTextToWidth(el, maxFont = 18, minFont = 8) {
	const parent = el.parentElement;
	let fontSize = maxFont;

	el.style.fontSize = fontSize + "px";

	while (el.scrollWidth > parent.clientWidth && fontSize > minFont) {
		fontSize -= 1;
		el.style.fontSize = fontSize + "px";
	}
}

function fitMyNameToWidth(el, maxFont = 30, minFont = 8) {
	const parent = el.parentElement;
	let fontSize = maxFont;

	el.style.fontSize = fontSize + "px";

	while (el.scrollWidth > parent.clientWidth && fontSize > minFont) {
		fontSize -= 1;
		el.style.fontSize = fontSize + "px";
	}
}

window.SitePage = (function () {
	const currentPage = () => window.location.pathname.split('/').pop() || 'index.html';

	// ---- fitted text (re-measured on resize) ----
	function fitAll() {
		document.querySelectorAll('.fit-text').forEach(el => fitTextToWidth(el));
		document.querySelectorAll('.fit-my-name').forEach(el => fitMyNameToWidth(el));
	}
	window.addEventListener('resize', fitAll);

	// ---- navbar: highlight the current page ----
	function setActiveNav() {
		const page = currentPage();
		document.querySelectorAll('.nav-link').forEach(link => {
			link.classList.remove('active');
			link.removeAttribute('aria-current');
			const href = link.getAttribute('href').split('#')[0];
			if (href === page) {
				link.classList.add('active');
				link.setAttribute('aria-current', 'page');
			}
		});
	}

	// ---- navbar name: on the homepage it appears once the intro has faded ----
	function checkNameVisibility() {
		const navbarName = document.getElementById('navbar-name');
		if (!navbarName) return;
		const hero = document.getElementById('hero');
		const show = !hero || window.scrollY > hero.offsetHeight * 0.35;
		navbarName.classList.toggle('is-shown', show);
	}
	window.addEventListener('scroll', checkNameVisibility, { passive: true });

	// ---- images fade in as they scroll into view ----
	function initFadeImages() {
		const observer = new IntersectionObserver(
			(entries, obs) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
						obs.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.2 }
		);
		document.querySelectorAll('.pub-fade-img:not(.visible)').forEach(img => observer.observe(img));
	}

	// ---- "and N more authors" ----
	function initAuthorLists() {
		document.querySelectorAll('.author-list').forEach(function (list) {
			const andMore = list.querySelector('.and-more');
			const hidden = list.querySelector('.hidden-authors');
			if (!andMore || !hidden) return;

			andMore.addEventListener('click', function () {
				andMore.style.display = 'none';
				hidden.style.display = 'inline';
				// Animate reveal
				const text = hidden.textContent;
				hidden.textContent = '';
				let i = 0;
				function reveal() {
					if (i <= text.length) {
						hidden.textContent = text.slice(0, i);
						i++;
						setTimeout(reveal, 35); // adjust speed here
					}
				}
				reveal();
			});
			// Optional: allow keyboard access
			andMore.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					andMore.click();
				}
			});
		});
	}

	// ---- publications: "show details" toggles ----
	function initDetailToggles() {
		[['toggle-diabsense', 'about-this-work'], ['toggle-swav', 'about-swav-work'], ['toggle-cnn3d', 'about-cnn3d-work']]
			.forEach(([btnId, detailsId]) => {
				const btn = document.getElementById(btnId);
				const details = document.getElementById(detailsId);
				if (!btn || !details) return;
				let expanded = false;
				btn.addEventListener('click', function () {
					expanded = !expanded;
					if (expanded) {
						details.style.maxHeight = details.scrollHeight + "px";
						btn.textContent = "hide details";
						btn.setAttribute('aria-expanded', 'true');
					} else {
						details.style.maxHeight = "0";
						btn.textContent = "show details";
						btn.setAttribute('aria-expanded', 'false');
					}
				});
			});
	}

	function initPubButtonAnimation() {
		const pubSection = document.getElementById('publications');
		const pubBtns = [
			document.getElementById('toggle-diabsense'),
			document.getElementById('toggle-swav'),
			document.getElementById('toggle-cnn3d')
		];
		if (!pubSection || !pubBtns.every(Boolean)) return;
		const animateBtns = () => {
			pubBtns.forEach((btn, i) => {
				btn.classList.remove('pub-btn-appear');
				// Force reflow to restart animation
				void btn.offsetWidth;
				btn.style.opacity = '0';
				btn.style.transform = 'translateX(-40px)';
				setTimeout(() => {
					btn.classList.add('pub-btn-appear');
				}, 100 + i * 120);
			});
		};
		const observer = new IntersectionObserver(
			(entries, obs) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						animateBtns();
						obs.disconnect(); // Only trigger once
					}
				});
			},
			{ threshold: 0.3 }
		);
		observer.observe(pubSection);
	}

	// ---- figure / certificate pop-up ----
	function initThumbnails() {
		const modalPdfWrapper = document.getElementById('pubModalPdfWrapper');
		const modalPdf = document.getElementById('pubModalPdf');
		const fitPdfFrame = () => {
			const width = modalPdfWrapper?.clientWidth;
			if (!width || !modalPdf) return;

			const renderWidth = Math.max(width, 360);
			modalPdf.style.width = `${renderWidth}px`;
			modalPdf.style.height = `${renderWidth / 1.414}px`;
			modalPdf.style.transform = `scale(${width / renderWidth})`;
		};
		if (modalPdfWrapper && modalPdf) {
			new ResizeObserver(fitPdfFrame).observe(modalPdfWrapper);
		}

		if (['research.html', 'projects.html'].includes(currentPage())) {
			document.querySelectorAll('.pub-thumb-box .pub-thumb-img').forEach(img => {
				if (img.closest('.pub-thumb-img-wrap')) return;
				const wrap = document.createElement('div');
				wrap.className = 'pub-thumb-img-wrap';
				img.parentNode.insertBefore(wrap, img);
				wrap.appendChild(img);
				const overlay = document.createElement('span');
				overlay.className = 'pub-thumb-overlay';
				overlay.setAttribute('aria-hidden', 'true');
				overlay.textContent = 'tap to enlarge';
				wrap.appendChild(overlay);
			});
		}

		// Publication thumbnail popup
		document.querySelectorAll('.pub-thumb-box').forEach(box => {
			box.addEventListener('click', function () {
				const pdf = box.getAttribute('data-pdf');
				const img = box.querySelector('img');
				const modalImg = document.getElementById('pubModalImg');
				const modalCaption = document.getElementById('pubModalCaption');
				if (pdf && modalPdf && modalPdfWrapper) {
					modalImg.classList.add('d-none');
					modalPdf.src = `${pdf}#toolbar=0&navpanes=0`;
					modalPdfWrapper.classList.remove('d-none');
					modalCaption.textContent = box.getAttribute('data-caption') || '';
				} else if (img) {
					if (modalPdfWrapper) modalPdfWrapper.classList.add('d-none');
					if (modalPdf) {
						modalPdf.src = 'about:blank';
					}
					modalImg.classList.remove('d-none');
					modalImg.src = img.src;
					modalImg.alt = img.alt;
					modalCaption.textContent = img.getAttribute('data-caption') || img.alt || '';
				} else {
					return;
				}
				// Show Bootstrap modal
				const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('pubImgModal'));
				modal.show();
			});
		});
	}

	function init() {
		fitAll();
		setActiveNav();
		checkNameVisibility();
		initFadeImages();
		initAuthorLists();
		initDetailToggles();
		initPubButtonAnimation();
		initThumbnails();
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();

	return { init };
})();
