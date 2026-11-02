/*
 * First-visit intro: a tiny pixel-art fight on a small stage in the middle of the screen,
 * with the homepage's constellation network still showing behind it.
 * The researcher gathers a dark aura, summons an energy blade and slashes the germs away:
 * some are blasted off into the distance and twinkle out as stars, others vanish in a puff.
 * Plays once per visit (sessionStorage "bootSeen"), never with reduced motion, and can be skipped
 * (button, click/tap, or Esc). The <head> script adds "boot-pending" to <html> when it should play.
 */
(function () {
	'use strict';
	const root = document.documentElement;
	const sheet = window.__bootSheet;                 // dev hook only: draw sprites instead of playing
	if (!sheet && !root.classList.contains('boot-pending')) return;
	if (!sheet) { window.__bootStarted = true; try { sessionStorage.setItem('bootSeen', '1'); } catch (e) { } }

	/* ================= pixel toolkit ================= */
	const W = 200, H = 112, GY = 98;                   // stage size in pixels, ground line
	const OUT = '#0b0912';
	const rgbC = {};
	const rgb = h => rgbC[h] || (rgbC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
	function Grid(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); }
	Grid.prototype.set = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; };
	Grid.prototype.get = function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.px[y * this.w + x] : null; };
	function paste(g, map, ox, oy, pal) {
		for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) { const ch = map[y][x]; if (ch !== '.') g.set(ox + x, oy + y, pal[ch]); }
	}
	function brush(g, x, y, r, c) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) g.set(x + dx, y + dy, c); }
	function line(g, x0, y0, x1, y1, c, r) {
		x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
		const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
		let e = dx + dy;
		for (; ;) {
			brush(g, x0, y0, r || 0, c);
			if (x0 === x1 && y0 === y1) break;
			const e2 = 2 * e;
			if (e2 >= dy) { e += dy; x0 += sx; }
			if (e2 <= dx) { e += dx; y0 += sy; }
		}
	}
	function ellipse(g, cx, cy, rx, ry, c, half) {
		for (let y = -Math.ceil(ry); y <= (half ? 0 : Math.ceil(ry)); y++)
			for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++)
				if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) g.set(cx + x, cy + y, c);
	}
	function outline(g, c) {
		const s = g.px.slice(), w = g.w, h = g.h;
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			if (s[y * w + x]) continue;
			if ((x > 0 && s[y * w + x - 1]) || (x < w - 1 && s[y * w + x + 1]) || (y > 0 && s[(y - 1) * w + x]) || (y < h - 1 && s[(y + 1) * w + x])) g.px[y * w + x] = c;
		}
	}
	// automatic rim shading: dark on the lower-right edge, light on the upper-left edge
	function rim(g, base, shade, light) {
		const s = g.px.slice(), w = g.w;
		for (let y = 0; y < g.h; y++) for (let x = 0; x < w; x++) {
			if (s[y * w + x] !== base) continue;
			const below = y + 1 < g.h ? s[(y + 1) * w + x] : null, right = x + 1 < w ? s[y * w + x + 1] : null;
			const above = y > 0 ? s[(y - 1) * w + x] : null, left = x > 0 ? s[y * w + x - 1] : null;
			if (!below || !right) g.px[y * w + x] = shade;
			else if (!above || !left) g.px[y * w + x] = light;
		}
	}
	function toCanvas(g, cv) {
		cv = cv || document.createElement('canvas');
		if (cv.width !== g.w || cv.height !== g.h) { cv.width = g.w; cv.height = g.h; }
		const ctx = cv.getContext('2d'), id = ctx.createImageData(g.w, g.h), d = id.data;
		for (let i = 0; i < g.px.length; i++) { const c = g.px[i]; if (!c) continue; const v = rgb(c); d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255; }
		ctx.putImageData(id, 0, 0);
		return cv;
	}
	const lerp = (a, b, k) => a + (b - a) * k;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	let seed = 7;
	const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

	/* ================= the researcher ================= */
	const HP = {
		H: '#16131e', h: '#3b3452', S: '#f1b893', s: '#c8866a', e: OUT, m: '#7a2e27', n: '#d9957a',
		W: '#eef2f7', w: '#b7c3d3', g: '#7c89a1', T: '#1c2232', t: '#34405e', P: '#273046', p: '#3c4a68',
		D: '#14141c', d: '#3a3b4b', C: '#5fe1ff', c: '#1f7aa8'
	};
	const HEAD = [
		'....H.HH.H...',
		'..HHHHHHHHH..',
		'.HHHhhhHHHHH.',
		'HHHhhHHHHHHHH',
		'HHHHHHHHHHHH.',
		'HHHHHHSSHHHS.',
		'HHHHSSSSSSSS.',
		'HHHsSSeeSSee.',
		'HHssSSSeSSSeS',
		'.HsSSSSSSSSSS',
		'.HHSSSSSSSSn.',
		'.HHHSSHHHHHH.',
		'..HHHHHmmmH..',
		'...HHHHHHH...'];
	const TORSO = [
		'....wWWWTTTWWW....',
		'...wWWWWTTTTWWW...',
		'..gwWWWWTttTWWWw..',
		'..gwWWWWTttTWWWw..',
		'..gwWCcWTttTTWWw..',
		'..gwWWWWTTtTTWWw..',
		'..gwWWWWWTTTTWWw..',
		'..gwWWWWWTTTTWWw..',
		'..gwWWWWWDDCDWWw..',
		'.gwWWWWWWPPPPWWw..',
		'.gwWWWWWwPPPPPWWw.',
		'.gwWWWWWwPP.PPWWw.',
		'gwWWWWWWwPP.PPWWw.',
		'gwWWWWWwwPP..PPWw.',
		'ggwwwwwgwPP..PPgw.'];
	const LEGS = [
		'.......PPPPPPPP.....',
		'.......PPPP.PPPP....',
		'.......PPPP..PPPp...',
		'......pPPP....PPPp..',
		'......PPPP....PPPPp.',
		'.....pPPP......PPPp.',
		'.....PPPP......PPPP.',
		'.....PPP........PPPp',
		'....pPPP........PPPP',
		'....PPPP.........PPP',
		'....PPP..........PPP',
		'...pPPP..........PPP',
		'...PPPP..........PPP',
		'...CCCC.........cCCC',
		'..DDDDDd........DDDDd',
		'..dDDDDDD.......dDDDDDD'];
	// arm poses: elbow / hand offsets from the shoulders (front f, back b) and blade angle (degrees)
	const POSE = {
		hip: { fe: [4, 5], fh: [3, 10], be: [6, 7], bh: [12, 9], bl: 30 },
		face: { fe: [5, 5], fh: [3, -4], be: [6, 7], bh: [12, 9], bl: 30 },
		cast: { fe: [5, 1], fh: [11, 0], be: [6, 7], bh: [12, 9], bl: 30 },
		ready: { fe: [4, 5], fh: [9, 7], be: [6, 7], bh: [12, 9], bl: 28 },
		windup: { fe: [5, -6], fh: [5, -13], be: [6, 7], bh: [12, 9], bl: -105 },
		slash: { fe: [6, 2], fh: [12, 4], be: [6, 7], bh: [12, 9], bl: 12 }
	};
	const BX = 14, BY = 14;                         // body origin inside the hero grid
	const SHF = [19, 16], SHB = [9, 17];            // shoulders (body coordinates)
	const hero = new Grid(52, 64), heroCv = document.createElement('canvas');
	function arm(g, sx, sy, e, h, main, shade, cuff) {
		const ex = sx + e[0], ey = sy + e[1], hx = sx + h[0], hy = sy + h[1];
		line(g, sx, sy + 1, ex, ey + 1, shade, 1); line(g, ex, ey + 1, hx, hy + 1, shade, 1);
		line(g, sx, sy, ex, ey, main, 1); line(g, ex, ey, hx, hy, main, 1);
		const fx = hx - Math.sign(hx - ex), fy = hy - Math.sign(hy - ey);
		brush(g, fx, fy, 1, cuff);
		g.set(hx, hy, HP.S); g.set(hx + 1, hy, HP.S); g.set(hx, hy + 1, HP.S); g.set(hx + 1, hy + 1, HP.s);
	}
	// compose one frame of the researcher; returns the hand position (grid coordinates)
	function drawHero(p, o) {
		const g = hero; g.px.fill(null);
		const up = o.bob || 0;
		paste(g, LEGS, BX + 1, BY + 28, HP);
		arm(g, BX + SHB[0], BY + SHB[1] - up, p.be, p.bh, HP.w, HP.g, HP.g);
		paste(g, TORSO, BX + 6, BY + 15 - up, HP);
		paste(g, HEAD, BX + 10, BY - up, HP);
		g.set(BX + 15, BY + 14 - up, HP.s); g.set(BX + 16, BY + 14 - up, HP.s); g.set(BX + 17, BY + 14 - up, HP.S);
		const ey = BY + 8 - up, ex1 = BX + 17, ex2 = BX + 21;
		if (o.blink) { g.set(ex1, ey, HP.S); g.set(ex2, ey, HP.S); g.set(ex1, ey - 1, HP.e); g.set(ex2, ey - 1, HP.e); }
		else if (o.glow) { g.set(ex1, ey, '#9ff6ff'); g.set(ex2, ey, '#9ff6ff'); }
		if (o.grin) { g.set(BX + 17, BY + 12 - up, '#ffffff'); g.set(BX + 18, BY + 12 - up, '#ffffff'); g.set(BX + 19, BY + 12 - up, HP.m); g.set(BX + 20, BY + 11 - up, HP.m); }
		// AI tablet: a live neural net on screen, held in front of the chest
		const tx = BX + SHB[0] + p.bh[0] + 1, tyy = BY + SHB[1] + p.bh[1] - up - 4;
		for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) g.set(tx + x, tyy + y, (y === 0 || y === 5 || x === 0 || x === 8) ? '#9fb4cc' : '#0b2a44');
		const ph = o.tick || 0;
		const loss = [[1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 4], [7, 4]];          // training loss going down
		loss.forEach(([x, y], k) => g.set(tx + x, tyy + y, k === ph % 7 ? '#ffffff' : '#5fe1ff'));
		g.set(tx + 1, tyy + 4, '#1f7aa8'); g.set(tx + 2, tyy + 4, '#1f7aa8');
		g.set(tx - 1, tyy + 3, HP.S); g.set(tx - 1, tyy + 4, HP.s); g.set(tx, tyy + 4, HP.S);
		const fsx = BX + SHF[0], fsy = BY + SHF[1] - up;
		arm(g, fsx, fsy, p.fe, p.fh, HP.W, HP.w, HP.g);
		outline(g, OUT);
		if (o.aura > 0.45) outline(g, o.aura > 0.8 ? '#5a2bc4' : '#2c1462');
		toCanvas(g, heroCv);
		return [fsx + p.fh[0], fsy + p.fh[1], tx + 4, tyy];
	}

	/* ================= the germs ================= */
	const EC = {
		virus: ['#3fbf3a', '#22802a', '#9dff7a'], phage: ['#9b5cff', '#5a2cb6', '#d2b4ff'], bacillus: ['#ff8a2a', '#b5530e', '#ffc58a'],
		blob: ['#ff4f9a', '#b52268', '#ffa6cc'], jelly: ['#1fb8a8', '#0e7a70', '#8ffff0'], imp: ['#ff3b5c', '#a8173a', '#ffc4cf'], cocci: ['#ffd23f', '#c4950f', '#fff3b0']
	};
	// each builder draws the body for animation frame f and returns [grid, eyes, mouth]
	const BUILD = {
		virus(f) {
			const g = new Grid(17, 17), [b] = EC.virus; ellipse(g, 8, 8, 4.6, 4.6, b);
			for (let k = 0; k < 8; k++) {
				const a = (k / 8 + f / 16) * Math.PI * 2;
				line(g, 8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, 8 + Math.cos(a) * 6.4, 8 + Math.sin(a) * 6.4, b);
				g.set(8 + Math.cos(a) * 7.4, 8 + Math.sin(a) * 7.4, EC.virus[2]);
			}
			return [g, [[6, 7], [9, 7]], [7, 10, 3]];
		},
		phage(f) {
			const g = new Grid(15, 22), [b, s, l] = EC.phage;
			[3, 5, 7, 9, 9, 9, 7, 5, 3].forEach((w, y) => { for (let x = 0; x < w; x++) g.set(7 - (w >> 1) + x, y, y < 4 ? l : b); });
			for (let y = 9; y < 15; y++) for (let x = 6; x <= 8; x++) g.set(x, y, y % 2 ? s : b);
			for (let x = 4; x <= 10; x++) g.set(x, 15, b);
			const k = f ? 1 : 0;
			line(g, 5, 16, 3 - k, 18, l); line(g, 3 - k, 18, 2 - k, 21, l); line(g, 6, 16, 5 + k, 19, l); line(g, 5 + k, 19, 5 + k, 21, l);
			line(g, 9, 16, 11 - k, 18, l); line(g, 11 - k, 18, 12 + k, 21, l); line(g, 8, 16, 9 - k, 19, l); line(g, 9 - k, 19, 9, 21, l);
			return [g, [[4, 4], [9, 4]], [6, 6, 3]];
		},
		bacillus(f) {
			const g = new Grid(24, 11), [b, s] = EC.bacillus;
			for (let y = 2; y <= 8; y++) for (let x = 7; x <= 21; x++) {
				const cut = (y === 2 || y === 8) ? 2 : (y === 3 || y === 7) ? 1 : 0;
				if (x >= 7 + cut && x <= 21 - cut) g.set(x, y, b);
			}
			for (let k = 0; k < 3; k++) for (let x = 0; x < 7; x++) g.set(x, 3 + k * 2 + Math.round(Math.sin((x + f * 3 + k) * 1.1)), '#ffb35c');
			return [g, [[15, 4], [18, 4]], [16, 6, 3]];
		},
		blob(f) {
			const g = new Grid(22, 17), [b] = EC.blob;
			ellipse(g, 11, 15, f ? 9.6 : 8.8, f ? 12 : 13.2, b, true);
			for (let x = 2; x <= 20; x++) if ((x + f) % 3) g.set(x, 16, b);
			return [g, [[10, 6, 1]], [9, 11, 5]];
		},
		jelly(f) {
			const g = new Grid(16, 20), [b] = EC.jelly;
			ellipse(g, 8, 8, 6.4, 7, b, true);
			for (let k = 0; k < 4; k++) for (let y = 9; y < 18; y++) g.set(3 + k * 3 + Math.round(Math.sin((y + f * 2 + k * 2) * 0.9)), y, k % 2 ? '#3ee6d2' : '#26c7b6');
			return [g, [[4, 5, 0, 1], [7, 4, 0, 1], [10, 5, 0, 1]], [7, 7, 2]];
		},
		imp(f) {
			const g = new Grid(24, 18), [b, s, l] = EC.imp;
			for (let k = 0; k < 6; k++) {
				const tipY = f ? 14 - k : 1 + k, rootY = 8;
				line(g, 7, rootY, 1 + k * 0.2, tipY, s); line(g, 16, rootY, 22 - k * 0.2, tipY, s);
			}
			ellipse(g, 12, 9, 4.6, 5.2, b);
			g.set(9, 3, l); g.set(8, 2, l); g.set(15, 3, l); g.set(16, 2, l);
			return [g, [[11, 8, 1]], [11, 12, 3]];
		},
		cocci(f) {
			const g = new Grid(14, 12), [b] = EC.cocci;
			[[4, 7], [9, 7], [6, 4 - f], [10, 3], [3, 3]].forEach(([x, y]) => ellipse(g, x, y, 2.5, 2.5, b));
			return [g, [[5, 5, 0, 1], [8, 5, 0, 1]], [6, 8, 2]];
		}
	};
	// faces: angry (snarling, mouth opens and shuts), blink, scared (wide eyes, O mouth, sweat)
	function face(g, eyes, mouth, mood) {
		eyes.forEach(([x, y, big, small], i) => {
			const left = i === 0 && eyes.length > 1;
			if (mood === 'blink') { line(g, x, y, x + (big ? 2 : small ? 0 : 1), y, OUT); return; }
			if (big) {
				for (let dy = -1; dy <= 1; dy++) for (let dx = 0; dx <= 2; dx++) g.set(x + dx, y + dy, '#ffffff');
				g.set(x, y, OUT); g.set(x + (mood === 'scared' ? 1 : 0), y + (mood === 'scared' ? 0 : 1), OUT);
				if (mood === 'scared') { g.set(x - 1, y - 3, OUT); g.set(x + 1, y - 3, OUT); g.set(x + 3, y - 2, OUT); }
				else { line(g, x - 1, y - 3, x + 1, y - 2, OUT); line(g, x + 1, y - 2, x + 3, y - 3, OUT); }
				return;
			}
			if (small) { g.set(x, y, mood === 'scared' ? '#ffffff' : OUT); if (mood !== 'scared') g.set(x, y - 1, OUT); return; }
			g.set(x, y, '#ffffff'); g.set(x + 1, y, '#ffffff'); g.set(x, y, OUT);           // looking left, at the researcher
			if (mood === 'scared') { g.set(x, y + 1, '#ffffff'); g.set(x + 1, y + 1, '#ffffff'); g.set(x, y + 1, OUT); g.set(left ? x + 1 : x, y - 2, OUT); g.set(left ? x : x + 1, y - 1, OUT); }
			else { g.set(left ? x : x + 1, y - 2, OUT); g.set(left ? x + 1 : x, y - 1, OUT); }
		});
		const [mx, my, mw] = mouth;
		if (mood === 'scared') { g.set(mx + (mw >> 1), my, OUT); g.set(mx + (mw >> 1), my + 1, OUT); if (mw > 2) g.set(mx + (mw >> 1) - 1, my + 1, OUT); }
		else {
			line(g, mx, my, mx + mw - 1, my, OUT);
			if (mood === 'open') { line(g, mx, my + 1, mx + mw - 1, my + 1, OUT); g.set(mx, my, '#ffffff'); g.set(mx + mw - 1, my, '#ffffff'); }
		}
	}
	const eCache = {};
	function enemySprite(type, f, mood, flash) {
		const key = type + f + mood + (flash ? 'x' : '');
		if (eCache[key]) return eCache[key];
		const [g, eyes, mouth] = BUILD[type](f), [b, s, l] = EC[type];
		rim(g, b, s, l);
		face(g, eyes, mouth, mood);
		if (mood === 'scared') g.set(g.w - 3, 1, '#9fe0ff');
		outline(g, OUT);
		if (flash) g.px = g.px.map(c => c ? '#ffffff' : null);
		return (eCache[key] = toCanvas(g));
	}

	/* dev hook: sprite sheet for previews */
	if (sheet) { sheet({ drawHero: (p, o) => (drawHero(POSE[p], o || {}), heroCv), enemySprite, POSE }); return; }

	/* ================= stage + DOM ================= */
	const wrap = document.createElement('div');
	wrap.id = 'boot';
	wrap.innerHTML = '<div class="bt-box"><canvas class="bt-stage" width="' + W + '" height="' + H + '"></canvas>' +
		'<div class="bt-term"><div id="bt-line1">&nbsp;</div><div id="bt-line2">&nbsp;</div></div></div>' +
		'<button type="button" class="bt-skip">Skip intro <span aria-hidden="true">&rsaquo;</span></button>';
	document.body.prepend(wrap);
	const cv = wrap.querySelector('.bt-stage'), ctx = cv.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	function size() {      // crisp pixels: a whole number of device pixels per stage pixel
		const dpr = window.devicePixelRatio || 1;
		const avail = Math.min(window.innerWidth * 0.94, 760, window.innerHeight * 0.62 * W / H);
		let k = Math.max(1, Math.floor(avail * dpr / W)) / dpr;
		if (k * W < avail * 0.85) k = avail / W;         // small screens: fill the width rather than round down a lot
		cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
		wrap.querySelector('.bt-term').style.width = W * k + 'px';
	}
	size();
	window.addEventListener('resize', size);

	// ground: a strip of alien soil that dithers away at both ends
	const ground = document.createElement('canvas'); ground.width = W; ground.height = H - GY + 1;
	(function () {
		const g = new Grid(W, H - GY + 1);
		const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
		for (let y = 0; y < g.h; y++) for (let x = 0; x < W; x++) {
			const edge = Math.min(x, W - 1 - x) / 46, fade = clamp(edge, 0, 1) * clamp(1.15 - y / g.h * 0.55, 0, 1);
			if (fade * 16 <= bayer[(y % 4) * 4 + (x % 4)]) continue;
			g.set(x, y, y === 0 ? '#5d74b0' : y === 1 ? '#2b3760' : ((x + y) % 2 && y < 5) ? '#1c2443' : y < 7 ? '#161d36' : '#10152a');
		}
		for (let k = 0; k < 16; k++) {
			const x = 20 + Math.floor(rnd() * 160);
			if (rnd() < .5) { g.set(x, 3, '#26304f'); g.set(x + 1, 3, '#26304f'); g.set(x + 2, 4, '#26304f'); g.set(x + 1, 2, '#3a4a78'); }
			else g.set(x, 5 + Math.floor(rnd() * 6), '#232c4c');
		}
		toCanvas(g, ground);
	})();
	const tufts = [];
	for (let k = 0; k < 14; k++) tufts.push([18 + Math.floor(rnd() * 164), rnd() < .5 ? '#3ee6d2' : '#7b4dff', 1 + Math.floor(rnd() * 3)]);

	/* ================= cast & timeline ================= */
	const HXS = 48;                                   // researcher: body centre x on stage
	const heroTop = [HXS - 16 - BX, GY + 1 - 44 - BY];
	const T_SLASH = [1.95, 2.35, 2.75];
	const POSE_T = [[0, 'hip'], [0.85, 'hip'], [1.0, 'face'], [1.22, 'face'], [1.38, 'cast'], [1.62, 'cast'], [1.75, 'ready']];
	T_SLASH.forEach(s => POSE_T.push([s - 0.14, 'ready'], [s - 0.06, 'windup'], [s, 'slash'], [s + 0.09, 'slash'], [s + 0.2, 'ready']));
	POSE_T.push([3.08, 'ready'], [3.32, 'hip'], [9, 'hip']);
	function poseAt(t) {
		let i = 0; while (i < POSE_T.length - 2 && POSE_T[i + 1][0] <= t) i++;
		const [t0, a] = POSE_T[i], [t1, b] = POSE_T[i + 1], k = clamp((t - t0) / Math.max(1e-3, t1 - t0), 0, 1), e = k * k * (3 - 2 * k);
		const A = POSE[a], B = POSE[b], m = (u, v) => [Math.round(lerp(u[0], v[0], e)), Math.round(lerp(u[1], v[1], e))];
		return { fe: m(A.fe, B.fe), fh: m(A.fh, B.fh), be: m(A.be, B.be), bh: m(A.bh, B.bh), bl: lerp(A.bl, B.bl, e), name: k < .5 ? a : b };
	}
	const auraAt = t => t < 0.35 ? 0 : t < 1.0 ? 0.2 : t < 1.38 ? lerp(0.2, 0.65, (t - 1) / 0.38) : t < 1.7 ? lerp(0.65, 1, (t - 1.38) / 0.32) : t < 3.05 ? 1 : Math.max(0.12, 1 - (t - 3.05) / 0.35);
	const bladeAt = t => t < 1.7 ? 0 : t < 1.86 ? (t - 1.7) / 0.16 : t < 3.05 ? 1 : Math.max(0, 1 - (t - 3.05) / 0.18);

	// enemies: type, x (centre), bottom y, slash that hits it, what happens (fly off to the horizon / poof)
	const FOES = [
		['cocci', 88, GY, 0, 'poof'], ['phage', 112, GY, 0, 'fly'], ['blob', 160, GY, 0, 'fly'],
		['virus', 122, 60, 1, 'poof'], ['bacillus', 150, 76, 1, 'fly'],
		['imp', 146, 38, 2, 'fly'], ['jelly', 180, 56, 2, 'poof']
	].map(([type, x, by, wave, fate], i) => ({
		type, x, by, wave, fate, i, enter: 0.3 + i * 0.1, scaredAt: 1.72 + rnd() * 0.18,
		ground: by === GY, tx: 150 + rnd() * 44, ty: 6 + rnd() * 22, blinkAt: 0.8 + rnd() * 0.8, hit: 0, state: 'live'
	}));
	const waves = [], parts = [], stars = [], smears = [];
	let shakeUntil = 0;

	function spawn(x, y, n, opts) {
		for (let k = 0; k < n; k++) {
			const a = rnd() * Math.PI * 2, sp = (opts.speed || 20) * (0.4 + rnd());
			parts.push({ x, y, vx: Math.cos(a) * sp + (opts.vx || 0), vy: Math.sin(a) * sp + (opts.vy || 0), life: 0, max: (opts.life || .6) * (0.6 + rnd() * .8),
				c: opts.colors[Math.floor(rnd() * opts.colors.length)], s: rnd() < (opts.big || .25) ? 2 : 1, front: rnd() < (opts.front || .5), drag: opts.drag || 0, g: opts.g || 0 });
		}
	}
	const AURA = ['#140a2b', '#22103f', '#341a66', '#4b23a0', '#6b3fe0', '#a98aff'];
	const typer = (el, text, at0, speed) => [...text].forEach((ch, i) => timers.push(setTimeout(() => { el.textContent = text.slice(0, i + 1); }, at0 + i * speed)));
	const timers = [];
	typer(wrap.querySelector('#bt-line1'), '> running pathogen_classifier.py ...', 500, 22);
	typer(wrap.querySelector('#bt-line2'), '> 7/7 threats neutralized ✓', 3150, 20);

	/* ================= frame ================= */
	let t0 = 0, last = 0, raf = 0, ended = false;
	function frame(now) {
		if (!t0) { t0 = now; last = now; }
		const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, W, H);
		if (now < shakeUntil) ctx.setTransform(1, 0, 0, 1, rnd() < .5 ? -1 : 1, 0);
		ctx.globalAlpha = clamp(t / 0.3, 0, 1);
		ctx.drawImage(ground, 0, GY);
		tufts.forEach(([x, c, h], k) => { const sway = Math.round(Math.sin(t * 3 + k) * .6); ctx.fillStyle = c; ctx.fillRect(x + sway, GY - h, 1, h); });
		ctx.globalAlpha = 1;

		// ---- researcher state
		const p = poseAt(t), aura = auraAt(t), blade = bladeAt(t);
		const bob = (p.name === 'hip' || p.name === 'face') && Math.floor(t / 0.45) % 2 ? 1 : 0;
		const blink = (t > 0.7 && t < 0.78) || (t > 3.5 && t < 3.58);
		const hand = drawHero(p, { bob, blink, glow: aura > 0.7, grin: t > 3.25, aura, tick: Math.floor(t / 0.12) });
		const tabX = heroTop[0] + hand[2], tabY = heroTop[1] + hand[3];
		const hx = heroTop[0] + hand[0] + 1, hy = heroTop[1] + hand[1];

		// aura smoke: wisps rising from the body, wrapped round the arm while casting
		const rate = aura * aura * 90 * dt;
		for (let k = 0; k < rate + (rnd() < rate % 1 ? 1 : 0); k++) {
			const onArm = aura > .5 && rnd() < .45;
			const x = onArm ? lerp(heroTop[0] + BX + SHF[0], hx, rnd()) : HXS - 8 + rnd() * 18;
			const y = onArm ? lerp(heroTop[1] + BY + SHF[1], hy, rnd()) : GY - 4 - rnd() * 40;
			parts.push({ x, y, vx: (rnd() - .5) * 6, vy: -8 - rnd() * 16, life: 0, max: .45 + rnd() * .5, c: AURA[Math.floor(rnd() * (aura > .8 ? 6 : 4))], s: rnd() < .4 ? 2 : 1, front: rnd() < .45, drag: 0, g: 0 });
		}
		if (t > 0.12 && !frame.burst) { frame.burst = 1; spawn(HXS, GY - 22, 70, { colors: AURA, speed: 30, life: .7, big: .5 }); }

		// shadows
		ctx.fillStyle = 'rgba(0,0,0,.55)';
		ctx.fillRect(HXS - 13, GY, 26, 2); ctx.fillRect(HXS - 9, GY + 2, 18, 1);

		drawParts(false, dt);

		// ---- germs
		FOES.forEach(f => {
			if (f.state === 'gone') return;
			const local = t - f.enter;
			if (local < 0) return;
			const ent = clamp(local / 0.9, 0, 1), ease = 1 - Math.pow(1 - ent, 3);
			const scared = t >= f.scaredAt;
			const fr = Math.floor(t / (f.type === 'jelly' ? 0.2 : 0.13) + f.i) % 2;
			let mood = scared ? 'scared' : (t > f.blinkAt && t < f.blinkAt + 0.1) ? 'blink' : fr ? 'open' : 'angry';
			const flash = f.state === 'hit';
			const img = enemySprite(f.type, fr, mood, flash);
			let x = f.x, y = f.by - img.height;
			// entrance: walkers march in, the cluster drops in, flyers swoop in
			if (f.ground && f.type !== 'cocci') x = lerp(f.x + 120, f.x, ease);
			else if (f.type === 'cocci') { x = f.x; y = lerp(-20, y, ease); }
			else { x = lerp(f.x + 110, f.x, ease); y = lerp(y - 40, y, ease); }
			// alive: creep closer, bob, hop, shake when scared
			if (ent >= 1 && f.state === 'live') x -= Math.min(6, (local - 0.9) * 5) * (scared ? 0.2 : 1);
			if (!f.ground) y += Math.round(Math.sin(t * 5 + f.i) * 2);
			else if (f.type === 'cocci' || f.type === 'phage') y -= fr && ent >= 1 ? 1 : 0;
			if (scared && f.state === 'live') x += Math.floor(t * 30) % 2 ? 1 : -1;
			f.cx = x; f.cy = y + img.height / 2;
			if (f.state === 'fly') {
				const k = clamp((t - f.hit) / 0.62, 0, 1), e = 1 - Math.pow(1 - k, 2), sc = Math.max(0.06, 1 - e * 0.95);
				const cx = lerp(f.hx, f.tx, e), cy = lerp(f.hy, f.ty, e) - Math.sin(k * Math.PI) * 10;
				if (k >= 1) { f.state = 'gone'; stars.push({ x: Math.round(f.tx), y: Math.round(f.ty), t: t }); return; }
				ctx.drawImage(img, Math.round(cx - img.width * sc / 2), Math.round(cy - img.height * sc / 2), Math.max(1, Math.round(img.width * sc)), Math.max(1, Math.round(img.height * sc)));
				if (rnd() < .6) parts.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0, max: .3, c: '#ffffff', s: 1, front: true, drag: 0, g: 0 });
				return;
			}
			if (f.ground) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(Math.round(x - img.width / 2 + 2), GY, img.width - 4, 1); }
			ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y));
			if (f.state === 'hit' && t - f.hit > 0.07) {
				if (f.fate === 'poof') {
					f.state = 'gone';
					spawn(f.cx, f.cy, 26, { colors: [EC[f.type][0], EC[f.type][2], '#ffffff', '#cfd6e6'], speed: 42, life: .55, big: .35, drag: 2.5 });
					spawn(f.cx, f.cy, 10, { colors: ['#8a92a8', '#5c6378'], speed: 10, life: .7, big: 1, vy: -6 });
				} else { f.state = 'fly'; f.hx = f.cx; f.hy = f.cy; f.hit = t; }
			}
		});

		// ---- the researcher
		ctx.globalAlpha = clamp((t - 0.18) / 0.28, 0, 1);
		ctx.drawImage(heroCv, heroTop[0], heroTop[1]);
		ctx.globalAlpha = 1;

		// ---- hologram: a little neural network projected above the tablet while powered up
		const holo = clamp((aura - 0.3) / 0.4, 0, 1) * (t < 3.3 ? 1 : Math.max(0, 1 - (t - 3.3) / 0.3));
		if (holo > 0) {
			const cx = tabX + 12, cy = tabY - 17, L = [[-6, [-2, 2]], [0, [-4, 0, 4]], [6, [-2, 2]]];
			ctx.globalAlpha = holo * (0.75 + 0.25 * Math.sin(t * 40));
			ctx.fillStyle = 'rgba(95,225,255,.18)';
			ctx.beginPath(); ctx.moveTo(tabX + 2, tabY); ctx.lineTo(cx - 9, cy + 6); ctx.lineTo(cx + 9, cy - 6); ctx.lineTo(tabX + 5, tabY); ctx.fill();
			for (let a = 0; a < 2; a++) L[a][1].forEach(y0 => L[a + 1][1].forEach(y1 => pline(cx + L[a][0], cy + y0, cx + L[a + 1][0], cy + y1, '#2a8ac4')));
			const pulse = (t * 3) % 1, lay = Math.floor(pulse * 3);
			L.forEach(([x, ys], li) => ys.forEach(y => { ctx.fillStyle = li === lay ? '#ffffff' : '#7ff0ff'; ctx.fillRect(cx + x, cy + y, 1, 1); }));
			ctx.globalAlpha = 1;
		}
		// ---- energy blade
		if (blade > 0) {
			const L = Math.round(19 * blade), a = p.bl * Math.PI / 180;
			ctx.fillStyle = '#3a3b4b'; ctx.fillRect(hx - 1, hy, 2, 2);
			for (let i = 2; i < L + 2; i++) {
				const bend = Math.sin(i / 22 * Math.PI) * 1.6;
				const x = Math.round(hx + Math.cos(a) * i - Math.sin(a) * bend), y = Math.round(hy + Math.sin(a) * i + Math.cos(a) * bend);
				ctx.fillStyle = 'rgba(123,77,255,.55)'; ctx.fillRect(x - 1, y - 1, 3, 3);
				ctx.fillStyle = i > L - 2 ? '#bff6ff' : '#5fe1ff'; ctx.fillRect(x, y, 2, 1);
				ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
				if (rnd() < .08) parts.push({ x, y, vx: (rnd() - .5) * 8, vy: -6 - rnd() * 8, life: 0, max: .3, c: rnd() < .5 ? '#a98aff' : '#7ff0ff', s: 1, front: true, drag: 0, g: 0 });
			}
			if (t > 3.05 && rnd() < .7) spawn(hx + Math.cos(a) * L * rnd(), hy + Math.sin(a) * L * rnd(), 2, { colors: ['#7ff0ff', '#a98aff', '#ffffff'], speed: 8, life: .5, vy: -10 });
		}
		// slash: a white-cyan arc swept by the blade, then a crescent wave rolls out at the germs
		T_SLASH.forEach((s, n) => {
			if (t >= s - 0.05 && !smears[n]) { smears[n] = { t: t, x: hx, y: hy }; waves.push({ n, x: hx + 8, t0: t, lo: n === 0 ? GY - 26 : n === 1 ? 48 : 18, hi: n === 0 ? GY + 1 : n === 1 ? 88 : 66 }); shakeUntil = now + 70; }
		});
		smears.forEach(sm => {
			const k = (t - sm.t) / 0.12; if (k > 1) return;
			for (let d = -120; d <= 15; d += 5) {
				const r = 18, a = d * Math.PI / 180;
				ctx.fillStyle = k < .5 ? '#ffffff' : '#7ff0ff';
				ctx.fillRect(Math.round(sm.x + Math.cos(a) * r), Math.round(sm.y + Math.sin(a) * r), 2, 2);
				ctx.fillStyle = 'rgba(169,138,255,.7)';
				ctx.fillRect(Math.round(sm.x + Math.cos(a) * (r - 2)), Math.round(sm.y + Math.sin(a) * (r - 2)), 1, 1);
			}
		});
		waves.forEach(wv => {
			const age = t - wv.t0; wv.x += 240 * dt;
			if (wv.x > W + 10) return;
			const mid = (wv.lo + wv.hi) / 2, hh = (wv.hi - wv.lo) / 2;
			for (let y = Math.round(wv.lo); y <= wv.hi; y++) {
				const u = (y - mid) / hh, back = Math.round(u * u * 7);
				const x = Math.round(wv.x - back);
				ctx.fillStyle = 'rgba(123,77,255,.6)'; ctx.fillRect(x - 4, y, 3, 1);
				ctx.fillStyle = '#5fe1ff'; ctx.fillRect(x - 1, y, 1, 1);
				ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
			}
			if (age < 0.6 && rnd() < .5) parts.push({ x: wv.x - 3, y: wv.lo + rnd() * (wv.hi - wv.lo), vx: -20, vy: (rnd() - .5) * 10, life: 0, max: .25, c: '#a98aff', s: 1, front: true, drag: 0, g: 0 });
			FOES.forEach(f => {
				if (f.wave === wv.n && f.state === 'live' && f.cx !== undefined && wv.x >= f.cx - 4) {
					f.state = 'hit'; f.hit = t; shakeUntil = now + 60;
					spawn(f.cx, f.cy, 8, { colors: ['#ffffff', '#7ff0ff'], speed: 30, life: .25 });
				}
			});
		});
		// stars where the blasted germs disappeared into the distance
		stars.forEach(s => {
			const k = t - s.t; if (k > 1.1) return;
			const on = Math.floor(k / 0.09) % 2, arm = k < 0.2 ? 2 : on ? 2 : 1;
			ctx.globalAlpha = k > 0.8 ? 1 - (k - 0.8) / 0.3 : 1;
			ctx.fillStyle = '#ffffff'; ctx.fillRect(s.x, s.y, 1, 1);
			ctx.fillStyle = '#cfeaff';
			for (let r = 1; r <= arm; r++) { ctx.fillRect(s.x + r, s.y, 1, 1); ctx.fillRect(s.x - r, s.y, 1, 1); ctx.fillRect(s.x, s.y + r, 1, 1); ctx.fillRect(s.x, s.y - r, 1, 1); }
			ctx.globalAlpha = 1;
		});
		drawParts(true, dt);
		raf = requestAnimationFrame(frame);
	}
	function pline(x0, y0, x1, y1, c) {
		const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
		ctx.fillStyle = c;
		for (let i = 1; i < n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
	}
	function drawParts(front, dt) {
		for (let i = parts.length - 1; i >= 0; i--) {
			const q = parts[i];
			if (q.front !== front) continue;
			q.life += dt;
			if (q.life > q.max) { parts.splice(i, 1); continue; }
			q.vx *= 1 - q.drag * dt; q.vy = q.vy * (1 - q.drag * dt) + q.g * dt;
			q.x += q.vx * dt; q.y += q.vy * dt;
			ctx.globalAlpha = q.life > q.max * .6 ? 1 - (q.life - q.max * .6) / (q.max * .4) : 1;
			ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
		}
		ctx.globalAlpha = 1;
	}
	raf = requestAnimationFrame(frame);

	/* ================= hand over to the site ================= */
	function end(fast) {
		if (ended) return;
		ended = true;
		timers.forEach(clearTimeout);
		root.classList.remove('boot-pending');
		root.classList.add('boot-played');
		document.dispatchEvent(new Event('boot:done'));
		const d = fast ? 350 : 700;
		wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: 'ease-in-out', fill: 'forwards' });
		wrap.querySelector('.bt-box').animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }], { duration: d, easing: 'ease-in', fill: 'forwards' });
		setTimeout(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); wrap.remove(); }, d + 50);
	}
	timers.push(setTimeout(() => end(false), 4000));
	wrap.addEventListener('click', () => end(true));
	document.addEventListener('keydown', function esc(e) {
		if (e.key === 'Escape') { end(true); document.removeEventListener('keydown', esc); }
	});
	wrap.querySelector('.bt-skip').focus({ preventScroll: true });
})();
