'use strict';

/* ---------- замер, на котором построены главы 1, 7 и 9 (N = 10^7, мкс) ---------- */
const R = {
	gpu: 'RTX 4070 Ti SUPER',
	ts: 24555.3,
	tto: 26834.1,
	tfrom: 4917.0,
	tcu: [688726.3, 21909.3, 22286.3, 1044.9, 1078.1, 963.5]
};
R.ttr = R.tto + R.tfrom;
R.best = R.tcu.indexOf(Math.min(...R.tcu));

function num(v, d = 0) {
	const [a, b] = Number(v).toFixed(d).split('.');
	return a.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (b ? ',' + b : '');
}
const fmt = n => num(n);

const W = 420;
const C = {
	bg: '#1c2924', ink: '#eef0e8', muted: '#9aa79f', faint: '#5f6e67', line: '#2d3c35', line2: '#43524b',
	tid: '#F7D96F', bid: '#58C4DD', bdim: '#83C167', gdim: '#FC6255', idx: '#FF9F43', str: '#C59DE5', i: '#5CD0B3',
	host: '#d3d9d4', dev: '#5CD0B3', ok: '#83C167', bad: '#FC6255', pink: '#E8789A', panel: '#22312b'
};
const F = {
	sans: '"Golos Text",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',
	mono: '"JetBrains Mono",ui-monospace,SFMono-Regular,Consolas,Menlo,monospace',
	math: '"Cambria Math","Latin Modern Math","STIX Two Math",Georgia,"Times New Roman",serif'
};
const BKS = ['#58C4DD', '#F0AC5F', '#B48EE0', '#83C167', '#E8789A', '#D8CC63', '#6FA8EA', '#E3905C'];
const bkS = b => BKS[b % BKS.length];
const bkF = b => hexA(BKS[b % BKS.length], 0.26);
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
const $ = id => document.getElementById(id);

const cv = $('cv'), ctx = cv.getContext('2d'), board = $('board');

/* ---------- рисование ---------- */
function rrect(x, y, w, h, r) {
	r = Math.max(0, Math.min(r, w / 2, h / 2));
	ctx.beginPath(); ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function box(x, y, w, h, o = {}) {
	const a = o.a ?? 1; if (a <= 0.001 || w <= 0 || h <= 0) return;
	ctx.save(); ctx.globalAlpha *= clamp(a); rrect(x, y, w, h, o.r ?? 6);
	if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
	if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw ?? 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
	ctx.restore();
}
/* JetBrains Mono склеивает <<<, >>>, != в лигатуры: разбиваем невидимым ZWNJ */
const noLig = s => String(s).replace(/([<>=!*\/+\-|&.:])(?=[<>=!*\/+\-|&.:])/g, '$1\u200c');
function fontStr(o) { return `${o.italic ? 'italic ' : ''}${o.weight ? o.weight + ' ' : ''}${o.size || 14}px ${F[o.font || 'sans']}`; }
function text(s, x, y, o = {}) {
	const a = o.a ?? 1; if (a <= 0.001) return;
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = o.color || C.ink;
	ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.font = fontStr(o);
	ctx.fillText(o.font === 'mono' ? noLig(s) : s, x, y); ctx.restore();
}
function rich(parts, x, y, o = {}) {
	const a = o.a ?? 1; if (a <= 0.001) return;
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.font = fontStr(o); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
	const T = p => o.font === 'mono' ? noLig(p[0]) : String(p[0]);
	let w = 0; for (const p of parts) w += ctx.measureText(T(p)).width;
	let cx = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
	if (o.bg) { ctx.fillStyle = o.bg; rrect(cx - 6, y - (o.size || 14) * 0.8, w + 12, (o.size || 14) * 1.6, 6); ctx.fill(); }
	for (const p of parts) { ctx.fillStyle = p[1] || C.ink; ctx.fillText(T(p), cx, y); cx += ctx.measureText(T(p)).width; }
	ctx.restore();
}
function line(x1, y1, x2, y2, o = {}) {
	const a = o.a ?? 1; if (a <= 0.001) return;
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.lw ?? 1.5;
	if (o.dash) ctx.setLineDash(o.dash);
	ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function arrow(x1, y1, x2, y2, o = {}) {
	const a = o.a ?? 1, t = o.t ?? 1; if (a <= 0.001 || t <= 0.001) return;
	const bend = o.bend || 0, head = o.head ?? 7;
	const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
	const P = u => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = ctx.fillStyle = o.color || C.ink; ctx.lineWidth = o.lw ?? 1.6;
	if (o.dash) ctx.setLineDash(o.dash);
	ctx.beginPath();
	for (let k = 0; k <= 24; k++) { const [px, py] = P(t * k / 24); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
	ctx.stroke(); ctx.setLineDash([]);
	const [ex, ey] = P(t), [qx, qy] = P(Math.max(0, t - 0.05)); const an = Math.atan2(ey - qy, ex - qx);
	if (head > 0) {
		ctx.beginPath(); ctx.moveTo(ex, ey);
		ctx.lineTo(ex - head * Math.cos(an - 0.42), ey - head * Math.sin(an - 0.42));
		ctx.lineTo(ex - head * Math.cos(an + 0.42), ey - head * Math.sin(an + 0.42)); ctx.closePath(); ctx.fill();
	}
	ctx.restore();
}
function brace(x1, x2, y, o = {}) {
	const a = o.a ?? 1; if (a <= 0.001) return;
	const d = o.dir ?? 1, h = o.h ?? 10, q = h / 2, xm = (x1 + x2) / 2;
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.lw ?? 1.6; ctx.lineCap = 'round';
	ctx.beginPath(); ctx.moveTo(x1, y);
	ctx.quadraticCurveTo(x1, y + q * d, x1 + q, y + q * d); ctx.lineTo(xm - q, y + q * d);
	ctx.quadraticCurveTo(xm, y + q * d, xm, y + h * d); ctx.quadraticCurveTo(xm, y + q * d, xm + q, y + q * d);
	ctx.lineTo(x2 - q, y + q * d); ctx.quadraticCurveTo(x2, y + q * d, x2, y); ctx.stroke(); ctx.restore();
}
function dot(x, y, r, fill, a = 1) {
	if (a <= 0.001) return;
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function squiggle(cx, cy, w, amp, color, lw, a) {
	if (a <= 0.001) return;
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
	for (let k = 0; k <= 40; k++) { const u = k / 40, x = cx - w / 2 + u * w, y = cy + Math.sin(u * Math.PI * 3) * amp; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
	ctx.stroke(); ctx.restore();
}
function along(pts, u) {
	const L = []; let tot = 0;
	for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); L.push(d); tot += d; }
	let s = u * tot;
	for (let k = 0; k < L.length; k++) {
		if (s <= L[k] || k === L.length - 1) { const t = L[k] ? Math.min(1, s / L[k]) : 1; return [lerp(pts[k][0], pts[k + 1][0], t), lerp(pts[k][1], pts[k + 1][1], t)]; }
		s -= L[k];
	}
	return pts[pts.length - 1];
}
function flag(x, y1, y2, label, color, a) {
	if (a <= 0.001) return;
	line(x, y1, x, y2, { color, lw: 1.8, a });
	ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = color; ctx.beginPath();
	ctx.moveTo(x, y1); ctx.lineTo(x + 12, y1 + 5); ctx.lineTo(x, y1 + 10); ctx.closePath(); ctx.fill(); ctx.restore();
	text(label, x, y2 + 12, { size: 11, font: 'mono', color, a });
}

/* цвета переменных: одно правило для подписей, кода и доски */
const TOKRE = /\b(?:threadIdx|blockIdx|blockDim|gridDim)(?:\.[xyz])?(?![A-Za-z])|\b(?:stride|idx)\b/g;
function tokClass(t) {
	return t.startsWith('threadIdx') ? 'tid' : t.startsWith('blockIdx') ? 'bid' : t.startsWith('blockDim') ? 'bdim'
		: t.startsWith('gridDim') ? 'gdim' : t === 'stride' ? 'str' : 'idx';
}
function codeParts(s) {
	const out = []; let last = 0, m; TOKRE.lastIndex = 0;
	while ((m = TOKRE.exec(s))) {
		if (m.index > last) out.push([s.slice(last, m.index), C.ink]);
		out.push([m[0], C[tokClass(m[0])]]); last = m.index + m[0].length;
	}
	if (last < s.length) out.push([s.slice(last), C.ink]);
	return out;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paint = s => s.replace(TOKRE, m => `<span class="${tokClass(m)}">${m}</span>`);
function md(s) {
	return esc(s).split('`').map((p, k) => k % 2 ? `<code>${paint(p)}</code>` : paint(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')).join('');
}
function codeHTML(l) {
	const e = esc(l), k = e.indexOf('//');
	return k < 0 ? paint(e) : paint(e.slice(0, k)) + `<span class="cm">${e.slice(k)}</span>`;
}

const LET = ['a', 'b', 'c', 'd', 'e', 'f'];
const KCALL = 'kernel<<< gridDims[j], blockDims[j] >>>(sumdev, adev, bdev, cdev, ddev, edev, fdev, n);';

/* ---------- сцены ---------- */
const SCENES = [];

/* 1. Хост и устройство */
{
	const hA = (k, q) => [140 + q * 16, 64 + k * 11];
	const hC = q => [226 + q * 16, 64];
	const dA = (k, q) => [208 + q * 16, 300 + k * 11];
	const dC = q => [300 + q * 16, 300];
	const up3 = (c3, j) => ease(seg(c3, j * 0.018, j * 0.018 + 0.55));
	const up5 = (b5, q) => ease(seg(b5, q * 0.1, q * 0.1 + 0.6));
	const bus = Math.round(480e3 / R.tto);
	SCENES.push({
		title: 'Хост и устройство', short: 'Хост и GPU', h: 430,
		code: [
			'long long *a = (long long*)calloc(n, sizeof(long long));   // так же b, c, d, e, f, sum',
			'cudaMalloc((void**)&adev, n2b);   // так же bdev ... fdev, sumdev',
			'cudaMemcpy(adev, a, n2b, cudaMemcpyHostToDevice);   // так же b ... f',
			KCALL,
			'cudaMemcpy(sum, sumdev, n2b, cudaMemcpyDeviceToHost);',
			'cudaFree(adev); ... cudaFree(sumdev); free(a); ... free(sum);'
		],
		beats: [
			{ hl: [0], cap: 'Программа на CUDA работает сразу на **двух** устройствах. **Хост** — процессор и оперативная память: здесь выполняется `main`, здесь лежат шесть исходных массивов `a` … `f` и массив результата `sum`.' },
			{ hl: [], cap: '**Устройство** — видеокарта со своей памятью: 66 мультипроцессоров (SM) по 128 ядер. Процессор не может читать видеопамять напрямую, а ядро — оперативную память: это разные микросхемы.' },
			{ hl: [1], dur: 1300, cap: '`cudaMalloc((void**)&adev, n2b)` выделяет место в видеопамяти и записывает его адрес в `adev`. Так для каждого массива: семь вызовов, `adev` … `fdev` и `sumdev`. Сами переменные живут на хосте, но адрес в них «чужой» — разыменовать его в `main` нельзя. `&adev` — потому что функция должна изменить нашу переменную; `(void**)` — потому что она принимает указатель на указатель любого типа.' },
			{ hl: [2], dur: 1900, cap: `Шесть вызовов \`cudaMemcpy(..., cudaMemcpyHostToDevice)\`, по одному на массив, везут данные по шине PCIe. Шина — узкое место: в замере 480 МБ шли ${num(R.tto / 1000, 1)} мс (≈ ${bus} ГБ/с), а своя память отдаёт данные ядру со скоростью до 672 ГБ/с.` },
			{ hl: [3], dur: 1900, cap: '`kernel<<<G, B>>>(sumdev, adev, ..., fdev, n)` — запуск ядра: тысячи нитей одновременно складывают свои элементы. Ядру передаём семь адресов в видеопамяти, а не массивы хоста.' },
			{ hl: [4], dur: 1400, cap: 'Результат едет обратно: `cudaMemcpy(sum, sumdev, n2b, cudaMemcpyDeviceToHost)`. Время копирования туда и обратно — это **ttr**.' },
			{ hl: [5], cap: '`cudaFree` освобождает видеопамять, `free` — обычную. Весь путь: выделить → скопировать туда → посчитать → скопировать обратно → освободить.' }
		],
		draw(A) {
			const h0 = A.at(0), d1 = A.at(1), m2 = A.at(2), c3 = A.lin(3), k4 = A.lin(4), b5 = A.lin(5), f6 = A.at(6);
			const live = 1 - f6;
			// хост
			box(12, 12, 396, 140, { r: 12, stroke: C.host, lw: 1.4, a: h0, fill: 'rgba(211,217,212,0.035)' });
			text('Хост: процессор и оперативная память', 24, 30, { size: 12.5, color: C.host, align: 'left', a: h0, weight: '600' });
			box(26, 46, 84, 84, { r: 8, stroke: C.host, lw: 1.2, a: h0 });
			for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) box(31 + q * 20, 58 + r * 22, 14, 14, { r: 3, fill: 'rgba(211,217,212,0.22)', a: h0 });
			text('CPU, 8 ядер', 68, 116, { size: 11, color: C.muted, a: h0 });
			box(118, 42, 278, 100, { r: 8, stroke: C.line2, lw: 1.2, a: h0 });
			text('ОЗУ', 386, 55, { size: 11, color: C.muted, align: 'right', a: h0 });
			for (let k = 0; k < 6; k++) text(LET[k], 131, 64 + k * 11 + 5, { size: 9.5, font: 'mono', color: C.muted, a: h0 });
			text('sum', 257, 54, { size: 11, font: 'mono', a: h0 });
			for (let k = 0; k < 6; k++) for (let q = 0; q < 4; q++) { const [x, y] = hA(k, q); box(x, y, 14, 9, { r: 2, fill: hexA(C.i, 0.55), a: h0 }); }
			for (let q = 0; q < 4; q++) {
				const [x, y] = hC(q); box(x, y, 14, 9, { r: 2, stroke: C.line2, lw: 1, a: h0 });
				if (up5(b5, q) >= 1) box(x, y, 14, 9, { r: 2, fill: hexA(C.idx, 0.85) });
			}
			// указатели на хосте
			const pa = m2 * lerp(1, 0.35, f6);
			box(200, 92, 78, 20, { r: 5, stroke: C.dev, lw: 1.2, a: pa }); text('adev…fdev', 239, 102, { size: 10, font: 'mono', a: pa });
			box(298, 92, 66, 20, { r: 5, stroke: C.dev, lw: 1.2, a: pa }); text('sumdev', 331, 102, { size: 10.5, font: 'mono', a: pa });
			const pt = seg(A.lin(2), 0.3, 1);
			arrow(239, 113, 239, 296, { color: C.dev, lw: 1.3, dash: [4, 4], t: pt, a: m2 * live, head: 6 });
			arrow(331, 113, 331, 296, { color: C.dev, lw: 1.3, dash: [4, 4], t: pt, a: m2 * live, head: 6 });
			// шина
			box(200, 152, 20, 86, { r: 3, fill: 'rgba(255,255,255,0.05)', stroke: C.line2, lw: 1, a: d1 });
			text('PCIe', 192, 186, { size: 12, align: 'right', a: d1 });
			text('≈ ' + bus + ' ГБ/с (замер)', 192, 204, { size: 11, color: C.muted, align: 'right', a: A.at(3) });
			// устройство
			box(12, 238, 396, 180, { r: 12, stroke: C.dev, lw: 1.4, a: d1, fill: hexA(C.dev, 0.03) });
			text('Устройство: видеокарта', 24, 256, { size: 12.5, color: C.dev, align: 'left', a: d1, weight: '600' });
			box(26, 272, 152, 94, { r: 8, stroke: C.dev, lw: 1.2, a: d1 });
			for (let s = 0; s < 66; s++) {
				const q = s % 11, r = Math.floor(s / 11);
				let g = 0; if (A.b === 4) { const st = (q + r) / 16 * 0.55; g = bump(k4, st, st + 0.4); }
				box(31 + q * 13, 278 + r * 13, 11, 11, { r: 2, fill: hexA(C.dev, 0.18 + 0.72 * g), a: d1 });
			}
			text('66 SM × 128 ядер = 8448', 102, 383, { size: 11, color: C.muted, a: d1 });
			if (A.b === 4) {
				const ka = seg(k4, 0, 0.1);
				box(38, 307, 128, 24, { r: 6, fill: 'rgba(20,31,27,0.9)', stroke: C.idx, lw: 1, a: ka });
				text('kernel<<<G, B>>>', 102, 319.5, { size: 11, font: 'mono', color: C.idx, a: ka });
			}
			line(178, 318, 192, 318, { color: C.dev, lw: 3, a: d1 });
			box(192, 272, 204, 132, { r: 8, stroke: C.line2, lw: 1.2, a: d1 });
			text('видеопамять 16 ГБ', 388, 372, { size: 11, color: C.muted, align: 'right', a: d1 });
			text('внутри карты до 672 ГБ/с', 388, 391, { size: 11, color: C.muted, align: 'right', a: A.at(3) });
			for (let k = 0; k < 6; k++) text(LET[k], 201, 300 + k * 11 + 5, { size: 9.5, font: 'mono', color: C.muted, a: m2 * live });
			for (let k = 0; k < 6; k++) for (let q = 0; q < 4; q++) {
				const [x, y] = dA(k, q);
				box(x, y, 14, 9, { r: 2, stroke: hexA(C.i, 0.7), lw: 1, dash: [2, 2], a: m2 * live });
				if (up3(c3, k * 4 + q) >= 1) box(x, y, 14, 9, { r: 2, fill: hexA(C.i, 0.55), a: live });
				if (A.b === 4) { const g = bump(k4, 0.3 + q * 0.12, 0.52 + q * 0.12); if (g > 0) box(x - 1.5, y - 1.5, 17, 12, { r: 3, stroke: C.idx, lw: 1.4, a: g }); }
			}
			text('adev … fdev', 239, 378, { size: 11, font: 'mono', a: m2 * live });
			for (let q = 0; q < 4; q++) {
				const [x, y] = dC(q);
				box(x, y, 14, 9, { r: 2, stroke: hexA(C.i, 0.7), lw: 1, dash: [2, 2], a: m2 * live });
				box(x, y, 14, 9, { r: 2, fill: hexA(C.idx, 0.85), a: seg(k4, 0.4 + q * 0.12, 0.55 + q * 0.12) * live });
			}
			text('sumdev', 331, 320, { size: 11, font: 'mono', a: m2 * live });
			text('память освобождена', 331, 345, { size: 12, color: C.muted, a: f6 });
			// полёт данных
			if (A.b === 3) for (let k = 0; k < 6; k++) for (let q = 0; q < 4; q++) {
				const u = up3(c3, k * 4 + q); if (u <= 0 || u >= 1) continue;
				const [sx, sy] = hA(k, q), [tx, ty] = dA(k, q);
				const [x, y] = along([[sx + 7, sy + 4.5], [210, 146], [210, 244], [tx + 7, ty + 4.5]], u);
				box(x - 7, y - 4.5, 14, 9, { r: 2, fill: C.i });
			}
			if (A.b === 5) for (let q = 0; q < 4; q++) {
				const u = up5(b5, q); if (u <= 0 || u >= 1) continue;
				const [sx, sy] = dC(q), [tx, ty] = hC(q);
				const [x, y] = along([[sx + 7, sy + 4.5], [210, 244], [210, 146], [tx + 7, ty + 4.5]], u);
				box(x - 7, y - 4.5, 14, 9, { r: 2, fill: C.idx });
			}
		}
	});
}

/* 2. Нити, блоки, сетка */
SCENES.push({
	title: 'Нити, блоки, сетка', short: 'Нити и блоки', h: 350,
	code: [
		'__global__ void addKernel(long long *sum, long long *a, long long *b, long long *c, long long *d, long long *e, long long *f, unsigned int size)',
		'kernel<<< 3, 4 >>>(sumdev, adev, bdev, cdev, ddev, edev, fdev, n);',
		'dim3 grid(3, 1, 1), block(4, 1, 1);',
		'kernel<<< grid, block >>>(sumdev, adev, bdev, cdev, ddev, edev, fdev, n);'
	],
	beats: [
		{ hl: [0], cap: 'Код ядра выполняет не один исполнитель, а много одинаковых — **нитей**. Каждая нить выполняет функцию `addKernel` целиком. Отличаются нити только своими номерами.' },
		{ hl: [], dur: 1300, cap: 'Нити собраны в **блоки**. Номер нити внутри блока — threadIdx.x: от 0 до blockDim.x − 1.' },
		{ hl: [], dur: 1300, cap: 'Блоки образуют **сетку** (grid). Номер блока — blockIdx.x. В каждом блоке нумерация нитей начинается с нуля заново — поэтому одного threadIdx.x мало, чтобы различить нити.' },
		{ hl: [1], cap: 'Размеры задаются при запуске: `kernel<<<gridDim, blockDim>>>`. blockDim.x — нитей в блоке, gridDim.x — блоков в сетке. Здесь `<<<3, 4>>>`: 3 блока по 4 нити, всего 12.' },
		{ hl: [0], cap: 'Внутри ядра каждой нити доступны четыре встроенные переменные — объявлять их не нужно. threadIdx.x и blockIdx.x у каждой нити свои, blockDim.x и gridDim.x — общие для всей сетки.' },
		{ hl: [2, 3], cap: 'Тип у них `dim3` — три поля `.x .y .z`, для двумерных и трёхмерных задач (например, матриц). Если в `<<< >>>` передать числа, получится `dim3(G, 1, 1)` и `dim3(B, 1, 1)`. Массивы в ЛР4 одномерные — нужен только `.x`.' }
	],
	draw(A) {
		const a0 = A.at(0), a1 = A.at(1), a2 = A.at(2), a3 = A.at(3), a4 = A.at(4), a5 = A.at(5);
		const by = 146, bw = 120, bh = 52;
		const bx = j => lerp(150, 15 + j * 135, a2);
		const dim = 1 - 0.62 * a4 * (1 - a5);
		text('нить', 210, 176, { size: 15, color: C.muted, a: a0 * (1 - a1) });
		for (let j = 0; j < 3; j++) {
			const ba = j === 0 ? a1 : a2, x = bx(j);
			box(x, by, bw, bh, { r: 10, stroke: bkS(j), lw: 1.5, a: ba * dim, fill: hexA(bkS(j), 0.06) });
			text('blockIdx.x = ' + j, x + bw / 2, by - 11, { size: 12, font: 'mono', color: C.bid, a: a2 * dim });
			for (let t = 0; t < 4; t++) {
				let tx = x + 10 + t * 26.5, ty = by + 14, s = 24, ta = ba;
				const first = j === 0 && t === 0;
				if (first) { tx = lerp(178, tx, a1); ty = lerp(64, ty, a1); s = lerp(64, 24, a1); ta = a0; }
				else if (j === 0) tx = lerp(x + 10, tx, a1);
				const sel = j === 2 && t === 1, al = ta * (sel ? 1 : dim);
				box(tx, ty, s, s, { r: first ? lerp(14, 5, a1) : 5, fill: bkF(j), stroke: bkS(j), lw: 1.5, a: al });
				if (first) squiggle(tx + s / 2, ty + s / 2, s * 0.6, s * 0.12, C.ink, 2.2, al * (1 - a1));
				text(String(t), tx + s / 2, ty + s / 2 + 1, { size: 13, font: 'mono', weight: '700', color: C.tid, a: al * (first ? a1 : 1) });
				if (sel) box(tx - 3, ty - 3, s + 6, s + 6, { r: 7, stroke: C.idx, lw: 2.2, a: a4 * (1 - a5) });
			}
		}
		const bA = a3 * (1 - a5);
		brace(15, 135, by + bh + 8, { dir: 1, color: C.bdim, a: bA });
		text('blockDim.x = 4', 75, by + bh + 32, { size: 13, font: 'mono', color: C.bdim, a: bA });
		brace(15, 405, by - 28, { dir: -1, color: C.gdim, a: bA });
		text('gridDim.x = 3', 210, by - 50, { size: 13, font: 'mono', color: C.gdim, a: bA });
		rich([['kernel<<< ', C.ink], ['3', C.gdim], [', ', C.ink], ['4', C.bdim], [' >>>(sumdev, adev, …, n);', C.ink]], 210, 300, { size: 13.5, font: 'mono', a: a3 * (1 - a4) });
		const cA = a4 * (1 - a5);
		if (cA > 0) {
			const sx = 15 + 270 + 10 + 26.5 + 12;
			line(sx, by + 41, sx, 252, { color: C.idx, lw: 1.5, a: cA, dash: [3, 3] });
			box(30, 252, 360, 88, { r: 12, fill: C.panel, stroke: hexA(C.idx, 0.7), lw: 1.3, a: cA });
			text('своё у каждой нити', 120, 270, { size: 11, color: C.muted, a: cA });
			text('общее для всех', 300, 270, { size: 11, color: C.muted, a: cA });
			text('threadIdx.x = 1', 120, 296, { size: 13.5, font: 'mono', color: C.tid, a: cA });
			text('blockIdx.x = 2', 120, 321, { size: 13.5, font: 'mono', color: C.bid, a: cA });
			text('blockDim.x = 4', 300, 296, { size: 13.5, font: 'mono', color: C.bdim, a: cA });
			text('gridDim.x = 3', 300, 321, { size: 13.5, font: 'mono', color: C.gdim, a: cA });
		}
		if (a5 > 0) {
			const ox = 40, oy = 256;
			text('dim3 block(4, 2):', ox, 238, { size: 11.5, font: 'mono', align: 'left', a: a5 });
			box(ox - 5, oy - 5, 4 * 36 + 6, 2 * 30 + 6, { r: 8, stroke: bkS(0), lw: 1.2, a: a5 });
			for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) {
				box(ox + x * 36, oy + y * 30, 32, 26, { r: 5, fill: bkF(0), stroke: bkS(0), lw: 1, a: a5 });
				text(x + ',' + y, ox + x * 36 + 16, oy + y * 30 + 13.5, { size: 10.5, font: 'mono', color: C.tid, a: a5 });
			}
			text('x →', ox + 72, oy + 72, { size: 11, color: C.muted, a: a5 });
			text('y', ox - 16, oy + 18, { size: 11, color: C.muted, a: a5 }); text('↓', ox - 16, oy + 34, { size: 11, color: C.muted, a: a5 });
			rich([['dim3 grid(', C.ink], ['3', C.gdim], [', 1, 1);', C.ink]], 222, 262, { size: 11.5, font: 'mono', align: 'left', a: a5 });
			rich([['dim3 block(', C.ink], ['4', C.bdim], [', 1, 1);', C.ink]], 222, 284, { size: 11.5, font: 'mono', align: 'left', a: a5 });
			text('kernel<<< grid, block >>>', 222, 306, { size: 11.5, font: 'mono', align: 'left', a: a5 });
			text('в ЛР4 нужна только .x', 222, 330, { size: 11.5, color: C.muted, align: 'left', a: a5 });
		}
	}
});

/* 3. Глобальный номер */
SCENES.push({
	title: 'Глобальный номер нити', short: 'Номер idx', h: 300,
	code: [
		'unsigned int idx = blockIdx.x * blockDim.x + threadIdx.x;',
		'unsigned int stride = blockDim.x * gridDim.x;'
	],
	beats: [
		{ hl: [], cap: 'У нитей разных блоков одинаковые threadIdx.x, а брать им надо **разные** элементы массива. Какой номер у выделенной нити среди всех 12?' },
		{ hl: [0], cap: 'Перед её блоком целиком стоят blockIdx.x = 2 блока по blockDim.x = 4 нити: `2 · 4 = 8` нитей.' },
		{ hl: [0], cap: 'И в своём блоке перед ней ещё threadIdx.x = 1 нить. Номер: `8 + 1 = 9`. Как номер квартиры: номер подъезда × квартир в подъезде + номер внутри подъезда.' },
		{ hl: [0], dur: 1400, cap: 'Так каждая нить считает свой idx. Локальные номера превращаются в глобальные 0…11 — **без повторов и без пропусков**. Это первая строка ядра.' },
		{ hl: [1], cap: 'Всего в сетке blockDim.x · gridDim.x = 12 нитей. Это число — stride, шаг цикла из следующей главы.' }
	],
	draw(A) {
		const a0 = A.at(0), a1 = A.at(1), a2 = A.at(2), a3 = A.at(3), a4 = A.at(4);
		const by = 118, bw = 120, bh = 50, bx = j => 15 + j * 135, tx = (j, t) => bx(j) + 10 + t * 26.5;
		for (let j = 0; j < 3; j++) {
			box(bx(j), by, bw, bh, { r: 10, stroke: bkS(j), lw: 1.5, a: a0, fill: hexA(bkS(j), 0.06) });
			if (j < 2) box(bx(j), by, bw, bh, { r: 10, fill: hexA(C.bid, 0.2), a: a1 * (1 - a3) });
			text('blockIdx.x = ' + j, bx(j) + bw / 2, by - 11, { size: 12, font: 'mono', color: C.bid, a: a0 });
			for (let t = 0; t < 4; t++) {
				const x = tx(j, t), y = by + 13, g = j * 4 + t;
				box(x, y, 24, 24, { r: 5, fill: bkF(j), stroke: bkS(j), lw: 1.5, a: a0 });
				if (j === 2 && t === 0) box(x, y, 24, 24, { r: 5, fill: hexA(C.tid, 0.3), a: a2 * (1 - a3) });
				text(String(t), x + 12, y + 13 - 6 * a3, { size: 13, font: 'mono', weight: '700', color: C.tid, a: a0 * (1 - a3) });
				text(String(g), x + 12, y + 13 + 6 * (1 - a3), { size: 13, font: 'mono', weight: '700', color: C.idx, a: a3 });
				if (j === 2 && t === 1) box(x - 3, y - 3, 30, 30, { r: 7, stroke: C.idx, lw: 2.2, a: a0 * (1 - a3) });
			}
		}
		text('?', tx(2, 1) + 12, by + bh + 18, { size: 20, color: C.idx, weight: '700', a: a0 * (1 - a1) });
		const f1 = a1 * (1 - a3);
		brace(15, 270, by + bh + 8, { dir: 1, color: C.bid, a: f1 });
		rich([['blockIdx.x', C.bid], [' · ', C.ink], ['blockDim.x', C.bdim], [' = ', C.ink], ['2', C.bid], [' · ', C.ink], ['4', C.bdim], [' = 8', C.ink]], 142, by + bh + 34, { size: 12, font: 'mono', a: f1 });
		const f2 = a2 * (1 - seg(A.lin(3), 0, 0.45));
		brace(tx(2, 0), tx(2, 0) + 24, by + bh + 8, { dir: 1, color: C.tid, a: f2, h: 8 });
		rich([['threadIdx.x', C.tid], [' = 1', C.ink]], tx(2, 0) + 12, by + bh + 56, { size: 12, font: 'mono', a: f2 });
		rich([['idx', C.idx], [' = ', C.ink], ['2', C.bid], [' · ', C.ink], ['4', C.bdim], [' + ', C.ink], ['1', C.tid], [' = ', C.ink], ['9', C.idx]], 210, 268, { size: 23, font: 'math', a: f2 });
		rich([['idx', C.idx], [' = ', C.ink], ['blockIdx.x', C.bid], [' · ', C.ink], ['blockDim.x', C.bdim], [' + ', C.ink], ['threadIdx.x', C.tid]], 210, 268, { size: 17, font: 'math', a: seg(A.lin(3), 0.5, 1) });
		brace(15, 405, by - 30, { dir: -1, color: C.str, a: a4 });
		rich([['stride', C.str], [' = ', C.ink], ['blockDim.x', C.bdim], [' · ', C.ink], ['gridDim.x', C.gdim], [' = 4 · 3 = 12', C.ink]], 210, by - 52, { size: 12.5, font: 'mono', a: a4 });
	}
});

/* 4. Цикл с шагом stride */
const S4 = { G: 3, B: 4, N: 30 };
function gsDraw(G, B, N, a) {
	const T = G * B, step = Math.min(31, 388 / T), cw = step > 10 ? step - 4 : Math.max(1, step - 1);
	const x0 = (W - (T * step - (step - cw))) / 2;
	const rows = Math.ceil(N / T), rstep = Math.min(44, 196 / rows);
	const ch = Math.max(2, Math.min(26, rstep - (rstep > 14 ? 8 : 1)));
	for (let g = 0; g < T; g++) {
		const b = Math.floor(g / B), x = x0 + g * step;
		box(x, 30, cw, 26, { r: Math.min(6, cw / 3), fill: bkF(b), stroke: bkS(b), lw: cw > 8 ? 1.4 : 0.8, a });
		if (cw >= 16) text(String(g), x + cw / 2, 43.5, { size: cw >= 22 ? 12 : 10, font: 'mono', weight: '700', color: C.idx, a });
	}
	rich([['строка = ', C.muted], ['stride', C.str], [' = ', C.muted], [String(B), C.bdim], [' · ', C.muted], [String(G), C.gdim], [' = ' + T, C.ink]], 210, 76, { size: 12.5, font: 'mono', a });
	for (let j = 0; j < rows * T; j++) {
		const r = Math.floor(j / T), g = j % T, b = Math.floor(g / B), x = x0 + g * step, y = 94 + r * rstep;
		if (j < N) {
			box(x, y, cw, ch, { r: Math.min(5, cw / 3, ch / 3), fill: bkF(b), stroke: bkS(b), lw: cw > 8 ? 1.3 : 0.7, a });
			if (cw >= 18 && ch >= 16) text(String(j), x + cw / 2, y + ch / 2 + 0.5, { size: 10.5, font: 'mono', a });
		} else box(x, y, cw, ch, { r: Math.min(5, cw / 3, ch / 3), stroke: C.bad, lw: 1, dash: [3, 3], a: a * 0.5 });
	}
	const last = N - (rows - 1) * T;
	rich([['нитей T = G·B = ', C.muted], [String(T), C.ink], [', каждый элемент считает ровно одна нить', C.ok]], 210, 304, { size: 12, a });
	rich(rows === 1
		? [['итерация одна: работают ', C.muted], [String(N), C.ink], [' из ' + T + (N < T ? ', остальные сразу выходят' : ''), C.muted]]
		: [['итераций: ⌈' + N + ' / ' + T + '⌉ = ', C.muted], [String(rows), C.ink], ['; в последней работают ', C.muted], [String(last), C.ink], [' из ' + T, C.muted]], 210, 324, { size: 12, a });
}
SCENES.push({
	title: 'Цикл с шагом stride', short: 'Цикл stride', h: 340,
	code: [
		'for (i = idx; i < size; i += stride)',
		'	sum[i] = a[i] + b[i] + c[i] + d[i] + e[i] + f[i];'
	],
	beats: [
		{ hl: [], cap: 'Массив из N = 30 элементов, а нитей всего 12. Элементов больше, чем нитей, — значит, каждой нити придётся взять несколько.' },
		{ hl: [0], dur: 1700, cap: 'Разрежем массив на куски длиной stride = 12 и положим их друг под друга. Тогда столбец под нитью — это все её элементы.' },
		{ hl: [0, 1], dur: 1500, cap: 'Первая итерация: `i = idx`. Нить 0 считает `sum[0]`, нить 9 — `sum[9]`. Все 12 нитей работают одновременно.' },
		{ hl: [0], dur: 1500, cap: '`i += stride`: каждая нить прыгает ровно на длину строки — в ту же колонку следующей строки. Наложений нет: следующая строка начинается там, где кончилась предыдущая.' },
		{ hl: [0], dur: 1600, cap: 'Третья итерация. У нитей 6–11 получилось i = 30…35, условие `i < size` ложно — они выходят из цикла. Это защита от выхода за границу массива.' },
		{ hl: [], ui: 'gs', cap: 'Каждый элемент посчитан **ровно одной** нитью — при любых G, B и N. Двигайте ползунки: строки длиной G·B всегда укладываются без дыр и наложений.' }
	],
	draw(A) {
		if (A.b === 5) { gsDraw(S4.G, S4.B, S4.N, 1); return; }
		const N = 30, a0 = A.at(0), l1 = A.lin(1);
		const tx = g => 26 + g * 31;
		for (let g = 0; g < 12; g++) {
			const b = Math.floor(g / 4), grey = g >= 6 ? 1 - 0.65 * seg(A.lin(4), 0.75, 1) : 1;
			box(tx(g), 30, 26, 26, { r: 6, fill: bkF(b), stroke: bkS(b), lw: 1.4, a: a0 * grey });
			text(String(g), tx(g) + 13, 43.5, { size: 12, font: 'mono', weight: '700', color: C.idx, a: a0 * grey });
		}
		const L = [null,
			[['stride', C.str], [' = ', C.ink], ['blockDim.x', C.bdim], [' · ', C.ink], ['gridDim.x', C.gdim], [' = 12', C.ink]],
			[['i', C.i], [' = ', C.ink], ['idx', C.idx]],
			[['i', C.i], [' = ', C.ink], ['idx', C.idx], [' + ', C.ink], ['stride', C.str]],
			[['i', C.i], [' = ', C.ink], ['idx', C.idx], [' + 2·', C.ink], ['stride', C.str]]][A.b];
		for (let j = 0; j < N; j++) {
			const r = Math.floor(j / 12), g = j % 12, b = Math.floor(g / 4);
			const fr = ease(seg(l1, r * 0.18, 0.64 + r * 0.18));
			const x = lerp(15 + j * 13, 26 + g * 31, fr), y = lerp(118, 96 + r * 44, fr), w = lerp(12, 26, fr), h = lerp(18, 26, fr);
			const wave = 2 + r, fill = A.b > wave ? 1 : A.b === wave ? seg(A.raw, 0.45 + g * 0.03, 0.7 + g * 0.03) : 0;
			box(x, y, w, h, { r: lerp(2, 5, fr), stroke: C.line2, lw: 1.1, a: a0, fill: 'rgba(255,255,255,0.03)' });
			if (fill > 0) box(x, y, w, h, { r: lerp(2, 5, fr), fill: bkF(b), stroke: bkS(b), lw: 1.4, a: fill });
			text(String(j), x + w / 2, y + h / 2 + 0.5, { size: 10.5, font: 'mono', color: fill > 0.5 ? C.ink : C.muted, a: fr * a0 });
		}
		const sl = a0 * (1 - ease(seg(l1, 0, 0.3)));
		text('0', 21, 148, { size: 10, color: C.muted, a: sl });
		text('29', 15 + 29 * 13 + 6, 148, { size: 10, color: C.muted, a: sl });
		text('N = 30 элементов', 210, 172, { size: 12.5, color: C.muted, a: sl });
		if (A.b >= 4) {
			const ga = A.b === 4 ? seg(A.raw, 0.4, 0.7) : 0.55;
			for (let g = 6; g < 12; g++) {
				const x = 26 + g * 31, y = 96 + 88;
				box(x, y, 26, 26, { r: 5, stroke: C.bad, lw: 1.2, dash: [3, 3], a: ga });
				text('✕', x + 13, y + 13.5, { size: 13, color: C.bad, a: ga });
			}
			rich([['i', C.i], [' ≥ size, выход из цикла', C.bad]], 302, 228, { size: 12, a: ga });
		}
		if (A.b >= 2 && A.b <= 4) {
			const r = A.b - 2;
			for (let g = 0; g < 12; g++) {
				const j = r * 12 + g, t = ease(seg(A.raw, g * 0.03, 0.45 + g * 0.03)), x = 26 + g * 31 + 13, y2 = 96 + r * 44 - 3;
				arrow(x, 58, x, y2, j < N ? { color: C.i, lw: 1.6, t, head: 6, a: 0.9 } : { color: C.bad, lw: 1.3, t, head: 6, dash: [3, 3] });
			}
		}
		if (L) rich(L, 210, 76, { size: 13, font: 'mono', a: seg(A.raw, 0, 0.25), bg: C.bg });
	}
});

/* 5. Шесть массивов */
{
	const mods = [10, 7, 5, 3, 11, 13], v = (k, i) => i % mods[k];
	const cX = i => 112 + i * 36, cY = k => 40 + k * 27, cRow = 208;
	const lX = (k, i) => 17 + k * 66 + i * 7, lY = 262;
	const sumc = i => mods.reduce((s, m) => s + i % m, 0);
	SCENES.push({
		title: 'Шесть массивов, шесть указателей', short: 'Шесть массивов', h: 340,
		code: [
			'a[i] = i % 10;',
			'b[i] = i % 7;',
			'c[i] = i % 5;',
			'd[i] = i % 3;',
			'e[i] = i % 11;',
			'f[i] = i % 13;',
			'cudaMalloc((void**)&adev, n2b);   // так же bdev ... fdev, sumdev',
			'cudaMemcpy(adev, a, n2b, cudaMemcpyHostToDevice);   // так же b ... f',
			'sum[i] = a[i] + b[i] + c[i] + d[i] + e[i] + f[i];'
		],
		beats: [
			{ hl: [0, 1, 2, 3, 4, 5], cap: 'Вариант: K = 6 массивов длины n, `sum[i] = a[i] + b[i] + c[i] + d[i] + e[i] + f[i]`. Сколько массивов, столько и слагаемых в правой части. Значения задаются остатками: `a[i] = i % 10`, `b[i] = i % 7` и так далее.' },
			{ hl: [6, 7], dur: 1800, cap: 'Каждый массив — своё `cudaMalloc` и своё `cudaMemcpy`. В видеопамяти массивы лежат в разных местах, у каждого свой адрес, поэтому ядро получает шесть указателей: `addKernel(sum, a, b, c, d, e, f, size)`.' },
			{ hl: [8], dur: 2400, cap: 'Нить с i = 3 берёт по одному элементу из каждого массива: `a[3] + b[3] + c[3] + d[3] + e[3] + f[3] = 3 + 3 + 3 + 0 + 3 + 3 = 15` и записывает результат в `sum[3]`.' },
			{ hl: [8], dur: 1400, cap: 'Остальные нити делают то же для своих i. Заметьте: в каждом массиве соседние нити читают **соседние** ячейки памяти — это важно в следующей главе.' }
		],
		draw(A) {
			const a0 = A.at(0), l1 = A.lin(1), a2 = A.at(2), l2 = A.lin(2), a3 = A.at(3), l3 = A.lin(3);
			text('i →', 100, 24, { size: 11, color: C.muted, align: 'right', a: a0 });
			for (let i = 0; i < 8; i++) text(String(i), cX(i) + 16, 24, { size: 10.5, font: 'mono', color: C.muted, a: a0 });
			for (let k = 0; k < 6; k++) {
				text(LET[k], 100, cY(k) + 11, { size: 13, font: 'mono', weight: '700', color: bkS(k), align: 'right', a: a0 });
				for (let i = 0; i < 8; i++) {
					box(cX(i), cY(k), 32, 21, { r: 4, fill: hexA(bkS(k), 0.16), stroke: hexA(bkS(k), 0.6), lw: 1, a: a0 });
					text(String(v(k, i)), cX(i) + 16, cY(k) + 11, { size: 11.5, font: 'mono', a: a0 });
				}
			}
			box(cX(3) - 3, cY(0) - 3, 38, 6 * 27 - 6 + 6, { r: 6, stroke: C.idx, lw: 2, a: a2 * (1 - a3) });
			text('sum', 100, cRow + 11, { size: 12, font: 'mono', weight: '700', align: 'right', a: a0 });
			const arrived = [];
			if (A.b >= 2) for (let k = 0; k < 6; k++) { const st = 0.12 + k * 0.13; if (A.b > 2 || ease(seg(l2, st, st + 0.2)) >= 1) arrived.push(v(k, 3)); }
			for (let i = 0; i < 8; i++) {
				box(cX(i), cRow, 32, 21, { r: 4, stroke: C.line2, lw: 1, a: a0 });
				const fa = i === 3 ? (arrived.length ? 1 : 0) : A.b > 3 ? 1 : A.b === 3 ? seg(l3, i * 0.07, i * 0.07 + 0.3) : 0;
				if (fa > 0) {
					box(cX(i), cRow, 32, 21, { r: 4, fill: hexA(C.idx, 0.3), stroke: C.idx, lw: 1.2, a: fa });
					const val = i === 3 ? arrived.reduce((s, x) => s + x, 0) : sumc(i);
					text(String(val), cX(i) + 16, cRow + 11, { size: 11.5, font: 'mono', weight: '700', a: fa });
				}
			}
			// видеопамять: шесть отдельных выделений
			const ma = seg(l1, 0.05, 0.35);
			text('в видеопамяти шесть отдельных выделений, у каждого свой адрес', 18, 246, { size: 11.5, color: C.muted, align: 'left', a: ma });
			for (let k = 0; k < 6; k++) {
				box(lX(k, 0) - 3, lY - 4, 8 * 7 + 5, 24, { r: 3, stroke: C.line2, lw: 1, dash: [3, 3], a: ma });
				text(LET[k] + 'dev', lX(k, 0) - 1, 291, { size: 10.5, font: 'mono', color: C.muted, align: 'left', a: ma });
				for (let i = 0; i < 8; i++) {
					const u = ease(seg(l1, k * 0.1, 0.5 + k * 0.1)); if (u <= 0) continue;
					const x = lerp(cX(i), lX(k, i), u), y = lerp(cY(k), lY, u), w = lerp(32, 6, u), h = lerp(21, 16, u);
					box(x, y, w, h, { r: lerp(4, 1.5, u), fill: hexA(bkS(k), lerp(0.16, 0.45, u)), stroke: hexA(bkS(k), 0.7), lw: 1 });
					if (w > 20) text(String(v(k, i)), x + w / 2, y + h / 2, { size: 11.5, font: 'mono', a: 1 - u });
				}
			}
			for (let k = 0; k < 6; k++) box(lX(k, 3) - 2, lY - 2.5, 10, 21, { r: 2, stroke: C.idx, lw: 1.6, a: a2 * (1 - a3) });
			text('a[3], b[3], c[3], d[3], e[3], f[3]', 210, 307, { size: 11.5, font: 'mono', color: C.idx, a: a2 * (1 - a3) });
			if (A.b === 2) for (let k = 0; k < 6; k++) {
				const st = 0.12 + k * 0.13, u = ease(seg(l2, st, st + 0.2)); if (u <= 0 || u >= 1) continue;
				const x = cX(3) + 16, y = lerp(cY(k) + 11, cRow + 11, u);
				dot(x, y, 8, C.idx); text(String(v(k, 3)), x, y + 0.5, { size: 10.5, font: 'mono', weight: '700', color: C.bg });
			}
			if (A.b >= 2) {
				const done = arrived.length === 6;
				const s = 'sum[3] = ' + (arrived.length ? arrived.join(' + ') : '0') + (done ? ' = ' + sumc(3) : '');
				text(s, 210, 327, { size: 12.5, font: 'mono', color: C.ink, a: A.b === 2 ? 1 : 1 - a3 });
			}
		}
	});
}

/* 6. Варпы и объединение обращений */
SCENES.push({
	title: 'Варпы и чтение памяти', short: 'Варпы', h: 334,
	code: [
		'for (i = idx; i < size; i += stride)',
		'	sum[i] = a[i] + b[i] + c[i] + d[i] + e[i] + f[i];'
	],
	beats: [
		{ hl: [], cap: 'SM исполняет нити не по одной, а группами по 32 — **варпами**. Все нити варпа выполняют одну и ту же команду одновременно (SIMT). Блок из 1024 нитей — 32 варпа; блок из 40 нитей — 2 варпа, и во втором 24 места простаивают. Поэтому blockDim берут кратным 32.' },
		{ hl: [1], dur: 1700, cap: 'Наше ядро: в один момент нити варпа читают, например, `a[i]` при соседних i — соседние ячейки. 32 × 8 байт = 256 байт — контроллер памяти обслуживает это **двумя** транзакциями по 128 байт. Так же с `b` … `f` и с записью в `sum`. Это и есть объединение обращений (coalescing).' },
		{ hl: [], dur: 1700, cap: 'А если раздать каждой нити свой непрерывный кусок (как `schedule(static)` в OpenMP), в один момент нити варпа читают ячейки далеко друг от друга: **32 транзакции**, из каждых 128 байт нужны 8. На процессоре куски хороши, на видеокарте лучше шаг через stride.' }
	],
	draw(A) {
		const a0 = A.at(0), a1 = A.at(1), a2 = A.at(2), l1 = A.lin(1), l2 = A.lin(2);
		for (let t = 0; t < 32; t++) box(18 + t * 12, 34, 10, 16, { r: 2.5, fill: bkF(0), stroke: bkS(0), lw: 1, a: a0 });
		const ba = a0 * (1 - a1);
		brace(18, 400, 57, { dir: 1, color: C.ink, a: ba, h: 9 });
		text('варп: 32 нити, одна команда на всех', 209, 78, { size: 12.5, a: ba });
		const e = a0 * (1 - a1);
		text('1024 нити = 32 варпа        32 нити = 1 варп', 209, 104, { size: 12, color: C.muted, a: e });
		text('40 нитей = 2 варпа:', 18, 128, { size: 12, align: 'left', a: e });
		for (let t = 0; t < 32; t++) box(18 + t * 12, 140, 10, 12, { r: 2, fill: bkF(0), stroke: bkS(0), lw: 1, a: e });
		for (let t = 0; t < 32; t++) {
			if (t < 8) box(18 + t * 12, 158, 10, 12, { r: 2, fill: bkF(0), stroke: bkS(0), lw: 1, a: e });
			else box(18 + t * 12, 158, 10, 12, { r: 2, stroke: C.faint, lw: 1, dash: [2, 2], a: e });
		}
		text('во втором варпе 24 места простаивают, поэтому blockDim берут кратным 32', 18, 188, { size: 11, color: C.muted, align: 'left', a: e });
		// объединённое чтение
		const m1 = a1 * (1 - a2);
		text('память: ячейки по 8 байт, рамка — сегмент 128 байт', 18, 276, { size: 11, color: C.muted, align: 'left', a: m1 });
		for (let m = 0; m < 64; m++) box(18 + m * 6, 238, 5, 22, { r: 1, fill: 'rgba(255,255,255,0.09)', a: m1 });
		for (let s = 0; s < 4; s++) {
			box(16 + s * 96, 235, 96, 28, { r: 3, stroke: C.line2, lw: 1, a: m1 });
			if (s < 2) box(16 + s * 96, 235, 96, 28, { r: 3, fill: hexA(C.ok, 0.28), stroke: C.ok, lw: 1.3, a: m1 * (A.b > 1 ? 1 : seg(l1, 0.6, 0.9)) });
		}
		if (A.b >= 1) for (let t = 0; t < 32; t++) {
			const tt = ease(seg(l1, 0.05 + t * 0.008, 0.55 + t * 0.008));
			arrow(23 + t * 12, 52, 20.5 + t * 6, 234, { color: C.i, lw: 1, head: 4, t: A.b > 1 ? 1 : tt, a: 0.85 * (1 - a2) });
		}
		rich([['2 транзакции', C.ok], [' по 128 байт', C.ink]], 210, 298, { size: 15, a: m1 * (A.b > 1 ? 1 : seg(l1, 0.6, 0.9)) });
		text('32 нити × 8 байт = 256 байт подряд', 210, 318, { size: 11.5, color: C.muted, a: m1 * (A.b > 1 ? 1 : seg(l1, 0.6, 0.9)) });
		// куски
		text('кусками: нить t читает элемент t·m, каждая в своём сегменте', 18, 276, { size: 11, color: C.muted, align: 'left', a: a2 });
		for (let s = 0; s < 32; s++) {
			box(18 + s * 12, 235, 10, 28, { r: 2, stroke: C.line2, lw: 1, a: a2 });
			box(19.5 + s * 12, 238, 7, 6, { r: 1, fill: C.i, a: a2 * 0.8 });
			box(18 + s * 12, 235, 10, 28, { r: 2, fill: hexA(C.bad, 0.3), stroke: C.bad, lw: 1, a: a2 * seg(l2, 0.55, 0.85) });
		}
		if (A.b === 2) for (let t = 0; t < 32; t++) arrow(23 + t * 12, 52, 23 + t * 12, 233, { color: C.i, lw: 1, head: 4, t: ease(seg(l2, 0.1 + t * 0.006, 0.55 + t * 0.006)), a: 0.85 });
		rich([['32 транзакции', C.bad], [', из каждых 128 байт нужны 8', C.ink]], 210, 298, { size: 14, a: a2 * seg(l2, 0.6, 0.9) });
		text('та же работа, но трафика в 16 раз больше', 210, 318, { size: 11.5, color: C.muted, a: a2 * seg(l2, 0.6, 0.9) });
	}
});

/* 7. Сетка и мультипроцессоры */
{
	const CONF = [[1, 32], [1, 1024], [32, 32], [32, 1024], [1024, 32], [1024, 1024]];
	const TCU = R.tcu;
	function occ(ci) {
		const w = new Array(66).fill(0); if (ci < 0) return { w, act: 0, queued: 0, wmax: 0 };
		const [G, B] = CONF[ci], wpb = Math.ceil(B / 32), maxB = Math.min(24, Math.floor(48 / wpb), Math.floor(1536 / B));
		const per = new Array(66).fill(0); let queued = 0;
		for (let b = 0; b < G; b++) { const s = b % 66; if (per[s] < maxB) per[s]++; else queued++; }
		for (let s = 0; s < 66; s++) w[s] = per[s] * wpb;
		return { w, act: per.filter(x => x > 0).length, queued, wmax: Math.max(...w), wmin: Math.min(...w.filter(x => x > 0)) };
	}
	const OCC = [-1, 0, 1, 2, 3, 4, 5].map(occ);
	const bw = v => 250 * (Math.log10(v) - 2.7) / 3.6;
	const x = (a, b) => Math.round(TCU[a] / TCU[b]);
	SCENES.push({
		title: 'Сетка и мультипроцессоры', short: 'SM и сетки', h: 432,
		code: [
			'unsigned int gridDims[NCONF] = { 1, 1, 32, 32, 1024, 1024 };',
			'unsigned int blockDims[NCONF] = { 32, 1024, 32, 1024, 32, 1024 };',
			KCALL
		],
		beats: [
			{ hl: [0, 1], cap: 'Видеокарта — 66 мультипроцессоров (SM). Блок целиком попадает на один SM и не делится. На SM помещается до 48 варпов (1536 нитей) и до 24 блоков. Число в клетке — сколько варпов сейчас на SM.' },
			{ hl: [2], dur: 1300, cap: `\`<<<1, 32>>>\`: один блок — работает 1 SM из 66, и в нём один варп. Каждая нить обрабатывает 10⁷ / 32 ≈ 312 500 элементов: ${num(TCU[0] / 1e6, 2)} с.` },
			{ hl: [2], dur: 1300, cap: `\`<<<1, 1024>>>\`: всё ещё один SM, но 32 варпа. Пока один варп ждёт данные из памяти (сотни тактов), планировщик исполняет другой — задержки прячутся. В ${x(0, 1)} раз быстрее.` },
			{ hl: [2], dur: 1300, cap: '`<<<32, 32>>>`: те же 1024 нити, но на 32 SM по одному варпу — и почти то же время. Важно, сколько варпов одновременно ждут память, а их в обоих случаях 32.' },
			{ hl: [2], dur: 1300, cap: `\`<<<32, 1024>>>\`: 32 SM по 32 варпа — уже 1024 варпа. Время падает в ${x(2, 3)} раз.` },
			{ hl: [2], dur: 1300, cap: '`<<<1024, 32>>>`: блоков больше, чем SM, — по 15–16 блоков на каждый SM, заняты все 66. Тоже 1024 варпа — и время почти как у `<<<32, 1024>>>`.' },
			{ hl: [2], dur: 1300, cap: `\`<<<1024, 1024>>>\`: на SM помещается только один блок из 1024 нитей, остальные 958 ждут в очереди и запускаются по мере освобождения. Дальше упираемся в память: ядро читает шесть массивов и пишет один, 560 МБ за ${num(TCU[5] / 1000, 2)} мс ≈ ${Math.round(560e3 / TCU[5])} ГБ/с — близко к пределу 672 ГБ/с.` }
		],
		draw(A) {
			const a0 = A.at(0), cur = OCC[A.b], prv = OCC[Math.max(0, A.b - 1)], p = A.b === 0 ? 1 : A.p;
			text(R.gpu + ': 66 SM, на SM до 48 варпов и 24 блоков', 210, 18, { size: 11.5, color: C.muted, a: a0 });
			for (let s = 0; s < 66; s++) {
				const q = s % 11, r = Math.floor(s / 11), xx = 19 + q * 35, y = 34 + r * 34;
				const w = lerp(prv.w[s], cur.w[s], p), on = cur.w[s] > 0;
				box(xx, y, 32, 30, { r: 5, stroke: w > 0.01 ? hexA(C.i, 0.9) : C.line2, lw: 1.2, a: a0, fill: 'rgba(255,255,255,0.02)' });
				if (w > 0.01) { const hh = Math.max(2, 26 * w / 48); box(xx + 3, y + 28 - hh, 26, hh, { r: 2, fill: hexA(C.i, 0.55) }); }
				if (on) text(String(cur.w[s]), xx + 16, y + 15, { size: 10.5, font: 'mono', weight: '700', a: seg(A.raw, 0.4, 0.8) });
			}
			const ta = A.b === 0 ? a0 : seg(A.raw, 0, 0.3);
			if (A.b === 0) text('блок целиком выполняется на одном SM', 210, 262, { size: 13, a: ta });
			else {
				const [G, B] = CONF[A.b - 1];
				rich([['<<< ', C.ink], [String(G), C.gdim], [', ', C.ink], [String(B), C.bdim], [' >>>', C.ink]], 210, 260, { size: 17, font: 'mono', a: ta });
				const wtxt = cur.wmin === cur.wmax ? String(cur.wmax) : cur.wmin + '–' + cur.wmax;
				text('работают SM: ' + cur.act + ' из 66, варпов на SM: ' + wtxt + (cur.queued ? ', в очереди блоков: ' + cur.queued : ''), 210, 283, { size: 11.5, color: C.muted, a: ta });
			}
			text('tcu, мкс (N = 10⁷), логарифмическая шкала', 18, 303, { size: 11, color: C.muted, align: 'left', a: a0 });
			for (let j = 0; j < 6; j++) {
				if (j >= A.b) continue;
				const y = 314 + j * 19, g = j === A.b - 1 ? A.p : 1, now = j === A.b - 1;
				text('[' + CONF[j][0] + ', ' + CONF[j][1] + ']', 18, y + 7, { size: 10.5, font: 'mono', align: 'left', color: now ? C.ink : C.muted });
				box(98, y, bw(TCU[j]) * g, 14, { r: 3, fill: now ? C.idx : '#5d6c65' });
				text(fmt(TCU[j]), 98 + bw(TCU[j]) * g + 6, y + 7, { size: 10.5, font: 'mono', align: 'left', color: now ? C.ink : C.muted, a: seg(g, 0.6, 1) });
			}
		}
	});
}

/* 8. Как меряется время */
SCENES.push({
	title: 'Как меряется время', short: 'События', h: 325,
	code: [
		'cudaEventRecord(start, 0);',
		KCALL,
		'cudaEventRecord(stop, 0);',
		'cudaEventSynchronize(stop);',
		'cudaEventElapsedTime(&gpuTime, start, stop);',
		'tcu[j] += gpuTime * 1000;'
	],
	beats: [
		{ hl: [], cap: 'Хост и видеокарта работают параллельно. Хост не ждёт видеокарту, а ставит команды в **очередь** (поток, stream); видеокарта выполняет их по порядку.' },
		{ hl: [0], cap: '① `cudaEventRecord(start, 0)` не засекает время на хосте. Он ставит в очередь **метку**: когда видеокарта до неё дойдёт, запишет туда время по своим часам.' },
		{ hl: [1], dur: 1500, cap: '② Запуск ядра асинхронный: хост ставит ядро в очередь и сразу идёт дальше, а видеокарта считает.' },
		{ hl: [2], dur: 1200, cap: '③ `cudaEventRecord(stop, 0)` — вторая метка, в очереди она после ядра. Видеокарта запишет её, когда ядро закончится.' },
		{ hl: [3], dur: 1600, cap: '④ `cudaEventSynchronize(stop)` — хост ждёт, пока метка stop будет записана. Здесь же всплывут ошибки исполнения ядра.' },
		{ hl: [4, 5], cap: '⑤ `cudaEventElapsedTime(&gpuTime, start, stop)` — разность двух меток по часам видеокарты, в миллисекундах (float). Поэтому в коде `* 1000` — переводим в микросекунды.' },
		{ hl: [1], cap: 'Ловушка: если обернуть один запуск ядра в chrono на хосте без синхронизации, получится несколько микросекунд — время постановки в очередь, а не счёта.' },
		{ hl: [2, 3], cap: 'В шаблоне методички `cudaDeviceSynchronize()` стоит **до** `cudaEventRecord(stop)`: метка ставится только после того, как хост проснулся, и в tcu попадает эта задержка (красная полоса). Поэтому у нас Record(stop) → EventSynchronize.' }
	],
	draw(A) {
		const a0 = A.at(0), hy = 96, gy = 206, l1 = A.lin(1), l2 = A.lin(2), l3 = A.lin(3), l4 = A.lin(4);
		text('хост', 16, hy - 6, { size: 13, color: C.host, align: 'left', weight: '600', a: a0 });
		text('CPU', 16, hy + 10, { size: 10.5, color: C.muted, align: 'left', a: a0 });
		text('GPU', 16, gy - 6, { size: 13, color: C.dev, align: 'left', weight: '600', a: a0 });
		text('поток 0', 16, gy + 10, { size: 10.5, color: C.muted, align: 'left', a: a0 });
		line(64, hy, 406, hy, { color: C.line2, lw: 2, a: a0 });
		line(64, gy, 406, gy, { color: C.line2, lw: 2, a: a0 });
		arrow(64, 300, 406, 300, { color: C.faint, lw: 1.2, head: 6, a: a0 });
		text('время', 406, 314, { size: 11, color: C.muted, align: 'right', a: a0 });
		const HX = [64, 92, 112, 132, 342, 358, 358, 358];
		const hx = A.b === 0 ? 64 : lerp(HX[A.b - 1], HX[A.b], A.p);
		line(64, hy, Math.min(hx, 146), hy, { color: C.host, lw: 3 });
		if (hx > 146) line(146, hy, Math.min(hx, 336), hy, { color: C.idx, lw: 3, dash: [2, 5] });
		if (hx > 336) line(336, hy, hx, hy, { color: C.host, lw: 3 });
		const TK = [88, 108, 128, 146, 350];
		TK.forEach((x, k) => { if (hx >= x - 0.5) { dot(x, hy, 8.5, C.host); text(String(k + 1), x, hy + 0.5, { size: 10.5, weight: '700', color: C.bg }); } });
		// очередь
		const sfx = lerp(334, 356, A.at(7));
		arrow(88, hy + 10, 98, gy - 22, { color: C.muted, lw: 1.2, dash: [3, 3], head: 5, t: A.b > 1 ? 1 : A.b === 1 ? seg(l1, 0.3, 0.8) : 0 });
		arrow(108, hy + 10, 113, gy - 16, { color: C.muted, lw: 1.2, dash: [3, 3], head: 5, t: A.b > 2 ? 1 : A.b === 2 ? seg(l2, 0.15, 0.45) : 0 });
		arrow(128, hy + 10, 332, gy - 24, { color: C.muted, lw: 1.2, dash: [3, 3], head: 5, bend: -0.12, t: A.b > 3 ? 1 : A.b === 3 ? seg(l3, 0.2, 0.8) : 0 });
		flag(98, gy - 22, gy + 20, 'start', C.ink, A.b > 1 ? 1 : A.b === 1 ? seg(l1, 0.75, 1) : 0);
		const kw = 218 * (A.b > 2 ? 1 : A.b === 2 ? ease(seg(l2, 0.4, 1)) : 0);
		box(112, gy - 14, kw, 28, { r: 5, fill: hexA(C.dev, 0.3), stroke: C.dev, lw: 1.3 });
		if (kw > 60) text('ядро', 112 + kw / 2, gy + 0.5, { size: 12, color: C.ink });
		if (A.b >= 7) box(330, gy - 10, sfx - 330, 20, { r: 2, fill: hexA(C.bad, 0.45), a: A.at(7) });
		flag(sfx, gy - 22, gy + 20, 'stop', C.ink, A.b > 3 ? 1 : A.b === 3 ? seg(l3, 0.75, 1) : 0);
		text('ждёт stop', 240, hy - 16, { size: 11.5, color: C.idx, a: A.b > 4 ? 1 : A.b === 4 ? seg(l4, 0.15, 0.4) : 0 });
		arrow(338, gy - 26, 338, hy + 12, { color: C.ok, lw: 1.5, head: 6, t: A.b > 4 ? 1 : A.b === 4 ? seg(l4, 0.8, 1) : 0 });
		const t5 = A.at(5);
		brace(98, sfx, gy + 40, { dir: 1, color: C.idx, a: t5 });
		rich([['tcu', C.idx], [' = stop − start  (по часам GPU)', C.ink]], (98 + sfx) / 2, gy + 64, { size: 12.5, a: t5 });
		const t6 = A.at(6) * (1 - A.at(7));
		brace(105, 131, hy - 12, { dir: -1, color: C.bad, a: t6, h: 8 });
		line(118, hy - 22, 118, hy - 36, { color: C.bad, lw: 1.2, a: t6 });
		text('chrono вокруг запуска без синхронизации: ≈ 5 мкс', 118, hy - 46, { size: 11.5, color: C.bad, align: 'left', a: t6 });
		text('красное — задержка пробуждения хоста', 64, 286, { size: 10.5, color: C.bad, align: 'left', a: A.at(7) });
	}
});

/* 9. Ускорение */
{
	const tc = R.tcu[R.best], tot = tc + R.ttr, acu = R.ts / tc, acutr = R.ts / tot;
	const mx = Math.max(R.ts, tot), X0 = 84, px = v => v * 270 / mx;
	const last = acutr < 1
		? `С учётом пересылки acutr = ts / (tcu + ttr) ≈ ${num(acutr, 2)} — **меньше единицы**: вместе с пересылкой видеокарта медленнее процессора. На каждое привезённое число ядро делает одно сложение, и шина съедает весь выигрыш. Видеокарта выгодна, когда данные уже на ней или вычислений на байт много (ЛР5: умножение матриц).`
		: `С учётом пересылки acutr = ts / (tcu + ttr) ≈ ${num(acutr, 2)}. На каждое привезённое число ядро делает одно сложение — шина съедает почти весь выигрыш. Видеокарта выгодна, когда данные уже на ней или вычислений на байт много (ЛР5: умножение матриц).`;
	SCENES.push({
		title: 'Ускорение и пересылка', short: 'Ускорение', h: 270,
		code: [
			'ttr = tto + tfrom;',
			'printf("%7u %8u %8u %12.3f %12.3f %12.3f\\n", gridDims[j], blockDims[j], gridDims[j] * blockDims[j],',
			'	tcu[j], ts / tcu[j], ts / (tcu[j] + ttr));'
		],
		beats: [
			{ hl: [], cap: `Последовательный алгоритм на процессоре, N = 10⁷: ts ≈ ${num(R.ts / 1000, 1)} мс (числа из пробного прогона, у вас будут близкие).` },
			{ hl: [2], cap: `Ядро на лучшей сетке: tcu ≈ ${num(tc / 1000, 2)} мс. Ускорение без учёта пересылки acu = ts / tcu ≈ ${Math.round(acu)}.` },
			{ hl: [0], dur: 1600, cap: `Но данные сначала надо отвезти на видеокарту и вернуть: ttr = ${num(R.tto / 1000, 1)} + ${num(R.tfrom / 1000, 1)} ≈ ${num(R.ttr / 1000, 1)} мс — в ${Math.round(R.ttr / tc)} раз дольше самого счёта.` },
			{ hl: [2], cap: last }
		],
		draw(A) {
			const a0 = A.at(0), a1 = A.at(1), l2 = A.lin(2), a2 = A.at(2), a3 = A.at(3);
			text('N = 10⁷, сетка [1024, 1024], микросекунды', 210, 14, { size: 11, color: C.muted, a: a0 });
			text('ts', 74, 50, { size: 13, font: 'mono', align: 'right', a: a0 });
			box(X0, 36, px(R.ts) * a0, 28, { r: 4, fill: '#b9c3bc' });
			text(fmt(R.ts), X0 + px(R.ts) - 8, 50.5, { size: 12, font: 'mono', weight: '700', color: C.bg, align: 'right', a: seg(a0, 0.7, 1) });
			text('tcu', 74, 100, { size: 13, font: 'mono', align: 'right', a: a1 });
			box(X0, 86, Math.max(3, px(tc)) * a1, 28, { r: 2, fill: C.idx, a: a1 });
			text(fmt(tc), X0 + px(tc) + 10, 100.5, { size: 12, font: 'mono', color: C.idx, align: 'left', a: a1 });
			text('tcu + ttr', 74, 150, { size: 12, font: 'mono', align: 'right', a: a2 });
			const w1 = px(tc), w2 = px(R.tto) * (A.b > 2 ? 1 : ease(seg(l2, 0.1, 0.6))), w3 = px(R.tfrom) * (A.b > 2 ? 1 : ease(seg(l2, 0.6, 0.95)));
			if (A.b >= 2) {
				box(X0, 136, w1, 28, { r: 2, fill: C.idx });
				box(X0 + w1, 136, w2, 28, { r: 2, fill: C.gdim });
				box(X0 + w1 + w2, 136, w3, 28, { r: 2, fill: C.pink });
				text('на GPU ' + fmt(R.tto), X0 + w1 + w2 / 2, 150.5, { size: 11, weight: '700', color: C.bg, a: seg(l2, 0.5, 0.7) + (A.b > 2 ? 1 : 0) });
				text(fmt(tot), X0 + w1 + w2 + w3 + 8, 150.5, { size: 12, font: 'mono', align: 'left', a: A.b > 2 ? 1 : seg(l2, 0.9, 1) });
				rich([['туда ' + fmt(R.tto), C.gdim], [',  обратно ' + fmt(R.tfrom), C.pink], [',  счёт ' + fmt(tc), C.idx]], 210, 180, { size: 11, a: A.b > 2 ? 1 : seg(l2, 0.9, 1) });
			}
			line(X0 + px(tot), 30, X0 + px(tot), 168, { color: C.muted, dash: [3, 4], lw: 1, a: a3 });
			line(X0 + px(R.ts), 30, X0 + px(R.ts), 168, { color: C.muted, dash: [3, 4], lw: 1, a: a3 });
			rich([['acu', C.idx], [' = ts / tcu = ' + fmt(R.ts) + ' / ' + fmt(tc) + ' ≈ ', C.ink], [String(Math.round(acu)), C.idx]], 210, 214, { size: 14, a: a1 });
			rich([['acutr', C.gdim], [' = ts / (tcu + ttr) = ' + fmt(R.ts) + ' / ' + fmt(tot) + ' ≈ ', C.ink], [num(acutr, 2), C.gdim]], 210, 244, { size: 14, a: a3 });
		}
	});
}

/* 10. Задачи */
const T10 = [
	{ name: 'Правильное ядро', ss: 'blockIdx.x * blockDim.x + threadIdx.x', sd: 'blockDim.x * gridDim.x', s: (b, t, G, B) => b * B + t, d: (G, B) => B * G },
	{ name: 'Шаг blockDim.x (забыли gridDim)', ss: 'blockIdx.x * blockDim.x + threadIdx.x', sd: 'blockDim.x', s: (b, t, G, B) => b * B + t, d: (G, B) => B },
	{ name: 'Шаг blockDim.x · gridDim.x + A', ss: 'blockIdx.x * blockDim.x + threadIdx.x', sd: 'blockDim.x * gridDim.x + A', s: (b, t, G, B) => b * B + t, d: (G, B, A) => B * G + A, u: 'A' },
	{ name: 'Старт threadIdx.x (забыли blockIdx)', ss: 'threadIdx.x', sd: 'blockDim.x * gridDim.x', s: (b, t) => t, d: (G, B) => B * G },
	{ name: 'Старт blockDim.x + threadIdx.x', ss: 'blockDim.x + threadIdx.x', sd: 'blockDim.x * gridDim.x', s: (b, t, G, B) => B + t, d: (G, B) => B * G },
	{ name: 'Старт с A · threadIdx.x', ss: 'blockIdx.x * blockDim.x + A * threadIdx.x', sd: 'blockDim.x * gridDim.x', s: (b, t, G, B, A) => b * B + A * t, d: (G, B) => B * G, u: 'A' },
	{ name: 'C · threadIdx.x, шаг gridDim.x · A', ss: 'C * threadIdx.x', sd: 'gridDim.x * A', s: (b, t, G, B, A, C) => C * t, d: (G, B, A) => G * A, u: 'AC' },
	{ name: 'C · blockIdx.x + threadIdx.x, шаг A · blockDim.x', ss: 'C * blockIdx.x + threadIdx.x', sd: 'A * blockDim.x', s: (b, t, G, B, A, C) => C * b + t, d: (G, B, A) => A * B, u: 'AC' },
	{ name: 'Перепутали: blockIdx.x · gridDim.x + threadIdx.x', ss: 'blockIdx.x * gridDim.x + threadIdx.x', sd: 'blockDim.x * gridDim.x', s: (b, t, G) => b * G + t, d: (G, B) => B * G }
];
const S10 = { f: 6, G: 3, B: 4, A: 3, C: 2 };
const ST10 = [{ f: 0, G: 3, B: 4 }, { f: 0, G: 3, B: 4 }, { f: 3, G: 3, B: 4 }, { f: 3, G: 1, B: 4 },
	{ f: 6, G: 3, B: 4, A: 3, C: 2 }, { f: 6, G: 1, B: 4, A: 3, C: 2 }, { f: 6, G: 1, B: 1, A: 3, C: 2 }];
const LOG10 = [[], ['старты должны быть ровно {0, 1, …, stride − 1}, каждый по разу', 'число: T > stride → повторы, T < stride → пропуски'], [],
	['нет blockIdx → GridDim = 1 → ✓'], [], ['1) нет blockIdx → GridDim = 1'],
	['1) нет blockIdx → GridDim = 1', '2) C разрежает старты → BlockDim = 1', '3) у одной нити шаг A = 3 → дыры; параметров нет → нельзя'], []];
const st10 = b => b === 7 ? S10 : Object.assign({ A: 2, C: 2 }, ST10[b]);
function sim10(st, N = 36) {
	const tk = T10[st.f], cnt = new Array(N).fill(0), starts = [], d = tk.d(st.G, st.B, st.A, st.C); let inf = false;
	for (let b = 0; b < st.G; b++) for (let t = 0; t < st.B; t++) {
		const s = tk.s(b, t, st.G, st.B, st.A, st.C); starts.push([s, b]);
		if (d <= 0) { inf = true; if (s < N) cnt[s]++; continue; }
		for (let i = s; i < N; i += d) cnt[i]++;
	}
	return { cnt, starts, inf, d };
}
function fixes10(f, A, Cc) {
	const tk = T10[f], out = [];
	for (let G = 1; G <= 16; G++) for (let B = 1; B <= 16; B++) {
		const d = tk.d(G, B, A, Cc); if (d <= 0 || G * B !== d) continue;
		const seen = new Uint8Array(d); let ok = true;
		for (let b = 0; b < G && ok; b++) for (let t = 0; t < B; t++) { const s = tk.s(b, t, G, B, A, Cc); if (s < 0 || s >= d || seen[s]++) { ok = false; break; } }
		if (ok) out.push([G, B]);
	}
	return out;
}
function ranges(a) {
	const r = []; let s = a[0], p = a[0];
	for (let k = 1; k <= a.length; k++) { if (a[k] === p + 1) { p = a[k]; continue; } r.push(s === p ? String(s) : s + '…' + p); s = p = a[k]; }
	return r.join(', ');
}
function fixText(f, A, Cc) {
	const fx = fixes10(f, A, Cc);
	if (!fx.length) return 'Сеткой не исправить: перебраны GridDim и BlockDim от 1 до 16.';
	if (fx.length === 256) return 'Подходит любая сетка.';
	const byG = {}, byB = {};
	fx.forEach(([G, B]) => { (byG[G] = byG[G] || []).push(B); (byB[B] = byB[B] || []).push(G); });
	const gs = Object.keys(byG).map(Number), bs = Object.keys(byB).map(Number), useB = bs.length < gs.length;
	const keys = useB ? bs : gs;
	const parts = keys.slice(0, 5).map(k => useB ? `BlockDim = ${k}, GridDim = ${ranges(byB[k])}` : `GridDim = ${k}, BlockDim = ${ranges(byG[k])}`);
	return 'Подходит: ' + parts.join('; ') + (keys.length > 5 ? `; и ещё ${keys.length - 5} похожих` : '') + '.';
}
SCENES.push({
	title: 'Задачи: сломали старт или шаг', short: 'Задачи', h: 312,
	code: b => { const tk = T10[st10(b).f]; return ['unsigned int idx = ' + tk.ss + ';', 'unsigned int stride = ' + tk.sd + ';']; },
	beats: [
		{ hl: [], cap: 'Правильное ядро, G = 3, B = 4, N = 36 (строки по 12). Цифра в клетке — сколько раз элемент посчитан, точки над клетками — старты нитей (цвет — блок). Всё зелёное: каждый элемент ровно один раз.' },
		{ hl: [0, 1], cap: 'Правило: множество стартов должно быть ровно {0, 1, …, stride − 1}, каждый по одному разу. Быстрая проверка числом: если нитей T = G·B больше шага — есть повторы, меньше — пропуски.' },
		{ hl: [0], dur: 1300, cap: 'Задача: в старте забыли blockIdx.x — `idx = threadIdx.x`. Все три блока считают одно и то же: элементы 0–3 по 3 раза, 4–11 никем. И так в каждой строке.' },
		{ hl: [1], dur: 1300, cap: 'Исправляем: blockIdx нет — значит, блок должен быть один: **GridDim = 1**. Шаг стал 4 · 1 = 4, старты 0…3 — всё покрыто по разу.' },
		{ hl: [0, 1], dur: 1300, cap: 'Задача посложнее: `start = C * threadIdx.x`, `stride = gridDim.x * A`, C = 2, A = 3. Решаем по одной проблеме за раз.' },
		{ hl: [0], dur: 1300, cap: 'Проблема 1: в старте нет blockIdx — блоки дублируют друг друга. **GridDim = 1**. Шаг стал A = 3, старты 0, 2, 4, 6: элемент 1 пропущен, начиная с 6 каждый третий — дважды.' },
		{ hl: [1], dur: 1300, cap: 'Проблема 2: C разрежает старты нитей — закрываем вторым параметром: **BlockDim = 1**. Осталась одна нить с шагом A = 3 — она перепрыгивает элементы. Параметров больше нет → **исправить нельзя**.' },
		{ hl: [0, 1], ui: 'tasks', cap: 'Теперь сами: выберите формулу, двигайте G, B и константы. Кнопка «Подобрать сетку» переберёт все GridDim и BlockDim от 1 до 16.' }
	],
	draw(A) {
		const cs = st10(A.b), ps = A.b > 0 && A.b < 7 ? st10(A.b - 1) : cs, p = A.b === 7 ? 1 : A.b === 0 ? 1 : A.p;
		ctx.save(); if (A.b === 0) ctx.globalAlpha = A.p;
		const rc = sim10(cs), rp = sim10(ps), tc = T10[cs.f], tp = T10[ps.f];
		const po = A.b === 7 ? 0 : 1 - seg(A.raw, 0, 0.45), pn = A.b === 7 ? 1 : seg(A.raw, 0.5, 1);
		const formula = (tk, a) => {
			rich(codeParts('idx = ' + tk.ss), 210, 18, { size: 12, font: 'mono', a });
			rich(codeParts('stride = ' + tk.sd), 210, 39, { size: 12, font: 'mono', a });
		};
		if (cs.f !== ps.f) { formula(tp, po); formula(tc, pn); } else formula(tc, 1);
		const info = st => {
			const r = sim10(st), tk = T10[st.f], u = tk.u || '';
			const parts = [['G = ', C.muted], [String(st.G), C.gdim], ['   B = ', C.muted], [String(st.B), C.bdim], ['   T = ', C.muted], [String(st.G * st.B), C.ink], ['   stride = ', C.muted], [String(r.d), C.str]];
			if (u.includes('A')) parts.push(['   A = ', C.muted], [String(st.A), C.ink]);
			if (u.includes('C')) parts.push(['   C = ', C.muted], [String(st.C), C.ink]);
			return parts;
		};
		const same = JSON.stringify(cs) === JSON.stringify(ps);
		if (!same) { rich(info(ps), 210, 62, { size: 11.5, font: 'mono', a: po }); rich(info(cs), 210, 62, { size: 11.5, font: 'mono', a: pn }); }
		else rich(info(cs), 210, 62, { size: 11.5, font: 'mono' });
		const cell = (j, k, a) => {
			const x = 26 + (j % 12) * 31, y = 92 + Math.floor(j / 12) * 40;
			if (k === 0) { box(x, y, 26, 28, { r: 5, stroke: C.faint, lw: 1, dash: [3, 3], a }); text('·', x + 13, y + 14, { size: 14, color: C.faint, a }); }
			else if (k === 1) { box(x, y, 26, 28, { r: 5, fill: hexA(C.ok, 0.25), stroke: C.ok, lw: 1.3, a }); text('1', x + 13, y + 14.5, { size: 12, font: 'mono', a }); }
			else { box(x, y, 26, 28, { r: 5, fill: hexA(C.bad, 0.2 + 0.08 * Math.min(k, 4)), stroke: C.bad, lw: 1.3, a }); text(String(k), x + 13, y + 14.5, { size: 12, font: 'mono', weight: '700', a }); }
		};
		for (let j = 0; j < 36; j++) {
			if (same || rc.cnt[j] === rp.cnt[j]) cell(j, rc.cnt[j], 1);
			else { cell(j, rp.cnt[j], 1 - p); cell(j, rc.cnt[j], p); }
		}
		const dots = (r, a) => {
			const by = {}; r.starts.forEach(([s, b]) => { if (s >= 0 && s < 36) (by[s] = by[s] || []).push(b); });
			for (const s in by) {
				const L = by[s], n = L.length, sp = Math.min(5.5, 22 / n), j = +s, x = 26 + (j % 12) * 31 + 13, y = 92 + Math.floor(j / 12) * 40 - 6;
				L.forEach((b, k) => dot(x + (k - (n - 1) / 2) * sp, y, 2.3, bkS(b), a));
			}
		};
		if (same) dots(rc, 1); else { dots(rp, 1 - p); dots(rc, p); }
		const verdict = (r, a) => {
			const z = r.cnt.filter(x => x === 0).length, rep = r.cnt.filter(x => x > 1).length;
			if (r.inf) text('✗ шаг 0: бесконечный цикл', 210, 226, { size: 13.5, color: C.bad, weight: '600', a });
			else if (!z && !rep) text('✓ каждый элемент ровно один раз', 210, 226, { size: 13.5, color: C.ok, weight: '600', a });
			else text('✗ ' + [rep ? 'повторы: ' + rep + ' эл.' : '', z ? 'пропущено: ' + z + ' эл.' : ''].filter(Boolean).join(', '), 210, 226, { size: 13.5, color: C.bad, weight: '600', a });
		};
		if (same) verdict(rc, 1); else { verdict(rp, po); verdict(rc, pn); }
		const log = LOG10[A.b] || [], plog = A.b > 0 ? LOG10[A.b - 1] || [] : [];
		log.forEach((s, k) => text(s, 210, 254 + k * 20, { size: 12, color: k === 2 && A.b === 6 ? C.bad : C.ink, a: plog[k] === s ? 1 : seg(A.raw, 0.4, 0.8) }));
		ctx.restore();
	}
});

/* ---------- движок ---------- */
const cur = { s: 0, b: 0, p: 1, t0: 0, dur: 1100, raf: 0, auto: false, timer: 0 };
const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const flowMQ = matchMedia('(max-width: 759px), (max-height: 559px)');
let scale = 1, dpr = 1, H = 400;

function mkA() {
	const b = cur.b, raw = cur.p, p = ease(raw);
	return { b, p, raw, at: k => k < b ? 1 : k > b ? 0 : p, lin: k => k < b ? 1 : k > b ? 0 : raw };
}
function resize() {
	H = SCENES[cur.s].h;
	const bw = board.clientWidth || W;
	if (flowMQ.matches) scale = bw / W;
	else scale = Math.min((bw - 24) / W, (board.clientHeight - 24) / H, 2.4);
	scale = Math.max(scale, 0.4);
	dpr = Math.min(window.devicePixelRatio || 1, 3);
	cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
	cv.style.width = (W * scale) + 'px'; cv.style.height = (H * scale) + 'px';
	document.documentElement.style.setProperty('--trayh', $('tray').offsetHeight + 'px');
}
function render() {
	ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height);
	ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
	ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
	SCENES[cur.s].draw(mkA());
}
function tick(ts) {
	if (!cur.t0) cur.t0 = ts;
	cur.p = clamp((ts - cur.t0) / cur.dur); render();
	if (cur.p < 1) cur.raf = requestAnimationFrame(tick); else { cur.raf = 0; scheduleAuto(); }
}
function play() {
	cancelAnimationFrame(cur.raf); clearTimeout(cur.timer);
	cur.dur = SCENES[cur.s].beats[cur.b].dur || 1100;
	if (reduce) { cur.p = 1; render(); scheduleAuto(); return; }
	cur.p = 0; cur.t0 = 0; cur.raf = requestAnimationFrame(tick);
}
function go(s, b, anim = true) {
	const changed = s !== cur.s; cur.s = s; cur.b = b;
	updateUI();
	if (changed) { resize(); $('panel').scrollTop = 0; }
	if (anim) play(); else { cancelAnimationFrame(cur.raf); cur.raf = 0; clearTimeout(cur.timer); cur.p = 1; render(); }
	try { history.replaceState(null, '', '#' + (s + 1) + '-' + (b + 1)); } catch (e) { }
}
function next() {
	const sc = SCENES[cur.s];
	if (cur.b < sc.beats.length - 1) go(cur.s, cur.b + 1);
	else if (cur.s < SCENES.length - 1) {
		go(cur.s + 1, 0);
		if (flowMQ.matches) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
	}
	else setAuto(false);
}
function prev() {
	if (cur.b > 0) go(cur.s, cur.b - 1, false);
	else if (cur.s > 0) go(cur.s - 1, SCENES[cur.s - 1].beats.length - 1, false);
}
const plain = s => s.replace(/[`*]/g, '');
function scheduleAuto() {
	clearTimeout(cur.timer); if (!cur.auto) return;
	const bt = SCENES[cur.s].beats[cur.b];
	if (bt.ui) { setAuto(false); return; }
	cur.timer = setTimeout(next, 1800 + plain(bt.cap).length * 42);
}
function setAuto(on) {
	cur.auto = on; $('auto').setAttribute('aria-pressed', on ? 'true' : 'false');
	if (on) { if (cur.p >= 1) scheduleAuto(); } else clearTimeout(cur.timer);
}
function updateCode() {
	const sc = SCENES[cur.s], bt = sc.beats[cur.b];
	const lines = typeof sc.code === 'function' ? sc.code(cur.b) : sc.code || [];
	const hl = bt.hl || [];
	$('code').innerHTML = lines.length ? '<div>' + lines.map((l, k) => `<span class="ln${hl.includes(k) ? ' hl' : ''}">${codeHTML(l)}</span>`).join('') + '</div>' : '';
}
function keepVisible() {
	const nav = $('chap'), on = nav.children[cur.s]; if (!on) return;
	if (nav.scrollWidth > nav.clientWidth + 1) nav.scrollLeft = on.offsetLeft - nav.clientWidth / 2 + on.clientWidth / 2;
	else if (nav.scrollHeight > nav.clientHeight + 1 && (on.offsetTop < nav.scrollTop || on.offsetTop + on.offsetHeight > nav.scrollTop + nav.clientHeight))
		nav.scrollTop = on.offsetTop - 16;
}
function updateUI() {
	const sc = SCENES[cur.s], bt = sc.beats[cur.b], n = sc.beats.length;
	[...$('chap').children].forEach((el, k) => {
		el.classList.toggle('on', k === cur.s);
		if (k === cur.s) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
	});
	keepVisible();
	$('ttl').textContent = (cur.s + 1) + '. ' + sc.title;
	$('stp').textContent = 'Шаг ' + (cur.b + 1) + ' из ' + n;
	$('cap').innerHTML = md(bt.cap);
	$('dots').innerHTML = sc.beats.map((_, k) => `<button type="button" class="${k === cur.b ? 'on' : k < cur.b ? 'done' : ''}" aria-label="Шаг ${k + 1}" data-b="${k}"></button>`).join('');
	updateCode();
	buildUI(bt.ui);
	$('prev').disabled = cur.s === 0 && cur.b === 0;
	const last = cur.b === n - 1, end = last && cur.s === SCENES.length - 1;
	$('next').disabled = end;
	$('nextT').textContent = last ? (end ? 'Конец' : 'Глава ' + (cur.s + 2)) : 'Далее';
	cv.setAttribute('aria-label', sc.title + ', шаг ' + (cur.b + 1) + ': ' + plain(bt.cap));
}
function slider(id, label, cls, min, max, val) {
	return `<label><span class="${cls}">${label}</span><input type="range" id="${id}" min="${min}" max="${max}" value="${val}"><output id="${id}o">${val}</output></label>`;
}
function bindSlider(id, obj, key, after) {
	const el = $(id), out = $(id + 'o');
	el.addEventListener('input', () => { obj[key] = +el.value; out.textContent = el.value; if (after) after(); render(); });
}
function buildUI(kind) {
	const el = $('ui');
	if (el.dataset.kind === (kind || '')) return;
	el.dataset.kind = kind || '';
	if (!kind) { el.classList.remove('on'); el.innerHTML = ''; return; }
	el.classList.add('on');
	if (kind === 'gs') {
		el.innerHTML = slider('sG', 'GridDim', 'gdim', 1, 6, S4.G) + slider('sB', 'BlockDim', 'bdim', 1, 8, S4.B) + slider('sN', 'N', 'iv', 1, 60, S4.N);
		bindSlider('sG', S4, 'G'); bindSlider('sB', S4, 'B'); bindSlider('sN', S4, 'N');
	}
	if (kind === 'tasks') {
		el.innerHTML = `<select id="tsel" aria-label="Формула">${T10.map((t, k) => `<option value="${k}"${k === S10.f ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>` +
			slider('tG', 'GridDim', 'gdim', 1, 8, S10.G) + slider('tB', 'BlockDim', 'bdim', 1, 8, S10.B) +
			slider('tA', 'A', '', 0, 4, S10.A) + slider('tC', 'C', '', 1, 4, S10.C) +
			'<div class="row"><button type="button" id="fixbtn">Подобрать сетку</button><span class="out" id="fixout" aria-live="polite"></span></div>';
		const clr = () => { $('fixout').textContent = ''; };
		bindSlider('tG', S10, 'G', clr); bindSlider('tB', S10, 'B', clr); bindSlider('tA', S10, 'A', clr); bindSlider('tC', S10, 'C', clr);
		$('tsel').addEventListener('change', e => { S10.f = +e.target.value; clr(); updateCode(); render(); });
		$('fixbtn').addEventListener('click', () => { $('fixout').textContent = fixText(S10.f, S10.A, S10.C); });
	}
}

/* ---------- ввод ---------- */
$('chap').innerHTML = SCENES.map((sc, k) => `<button type="button" data-s="${k}"><span class="n">${k + 1}</span><span class="t">${esc(sc.short)}</span></button>`).join('');
$('chap').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { setAuto(false); go(+b.dataset.s, 0); } });
$('dots').addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(cur.s, +b.dataset.b, +b.dataset.b > cur.b); });
$('next').addEventListener('click', next);
$('prev').addEventListener('click', prev);
$('again').addEventListener('click', play);
$('auto').addEventListener('click', () => setAuto(!cur.auto));
document.addEventListener('keydown', e => {
	const tg = e.target.tagName; if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA' || e.altKey || e.ctrlKey || e.metaKey) return;
	if (tg === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
	if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
	else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
	else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') play();
});
let pd = null;
cv.addEventListener('pointerdown', e => { pd = { x: e.clientX, y: e.clientY }; });
cv.addEventListener('pointerup', e => {
	if (!pd) return; const dx = e.clientX - pd.x, dy = e.clientY - pd.y; pd = null;
	if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { dx < 0 ? next() : prev(); return; }
	if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && !SCENES[cur.s].beats[cur.b].ui) next();
});
cv.addEventListener('pointercancel', () => { pd = null; });

let rk = '';
function onResize() {
	const k = flowMQ.matches ? 'f' + board.clientWidth : board.clientWidth + 'x' + board.clientHeight;
	if (k === rk) return; rk = k; resize(); render(); keepVisible();
}
if (window.ResizeObserver) new ResizeObserver(onResize).observe(board);
window.addEventListener('resize', onResize);

/* шрифты доски грузятся отдельно: перерисовать, когда придут */
if (document.fonts && document.fonts.load) {
	Promise.all(['12px "Golos Text"', '600 12px "Golos Text"', '700 12px "Golos Text"', '12px "JetBrains Mono"', '700 12px "JetBrains Mono"']
		.map(f => document.fonts.load(f).catch(() => null))).then(() => render());
}

/* старт: #глава-шаг, для проверки можно @доля */
(function init() {
	const m = /^#(\d+)(?:-(\d+))?(?:@([\d.]+))?/.exec(location.hash || '');
	let s = 0, b = 0;
	if (m) { s = clamp(+m[1] - 1, 0, SCENES.length - 1); b = clamp((+m[2] || 1) - 1, 0, SCENES[s].beats.length - 1); }
	cur.s = s; resize();
	if (m && m[3] !== undefined) { cur.b = b; updateUI(); cur.p = clamp(+m[3]); render(); }
	else if (m) go(s, b, false);
	else go(0, 0, true);
})();
