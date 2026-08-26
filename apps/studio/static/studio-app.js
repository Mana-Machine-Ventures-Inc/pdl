//#region src/state.js
var e = {
	mode: "design",
	navTab: "system",
	previewMode: "primary",
	rightPaneMode: "preview",
	previewPinned: !1,
	root: null,
	rootDisplay: null,
	rootLabel: null,
	entry: null,
	files: {},
	baselines: {},
	dirty: /* @__PURE__ */ new Set(),
	editFile: null,
	previewRoot: null,
	selectedSymbol: null,
	selectedKind: null,
	worldMode: "fixtures",
	catalogue: null,
	theme: "",
	activeWorld: {},
	paramOverrides: {},
	hostFacts: {},
	navQuery: ""
}, t = /* @__PURE__ */ new Set();
function n(e) {
	return t.add(e), () => t.delete(e);
}
function r() {
	for (let e of t) e();
}
function i(t) {
	e.dirty.add(t), r();
}
function a(t) {
	t ? e.dirty.delete(t) : e.dirty.clear(), r();
}
function o() {
	return e.dirty.size > 0;
}
//#endregion
//#region src/api.js
async function s(e, t) {
	let n = await (await fetch(e, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(t ?? {})
	})).json();
	if (!n.ok && n.error) {
		let e = Error(n.error);
		throw Object.assign(e, n), e;
	}
	return n;
}
async function c() {
	return (await fetch("/api/starters")).json();
}
function l(e, t) {
	return s("/api/open-project", {
		root: e,
		entry: t
	});
}
async function u(e, t) {
	return (await fetch("/api/open-project", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			root: e,
			entry: t
		})
	})).json();
}
function d(e) {
	return s("/api/new-project", e);
}
function f(e, t, n) {
	return s("/api/load", {
		root: e,
		entry: t,
		files: n
	});
}
function p(e, t) {
	return s("/api/disk-sources", {
		root: e,
		entry: t
	});
}
function m(e, t, n, r) {
	return s("/api/write", {
		root: e,
		path: t,
		content: n,
		expectedBaseline: r
	});
}
function h(e) {
	return s("/api/render-from-bake", e);
}
function g(e) {
	return s("/api/export", e);
}
//#endregion
//#region node_modules/@marijn/find-cluster-break/src/index.js
var _ = [], v = [];
(() => {
	let e = "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,1n,9,16,o,,x,1i,3,,i,,7,a,2,t,3,1k,,,7,2,2,2,3,9,,a,2,q,,2,3,1k,,,5,4,2,2,3,3,,u,2,3,,b,3,1k,,,8,,3,,3,k,2,m,6,,3,1k,,,7,2,2,2,3,7,3,a,2,u,,1n,5,3,3,,4,9,,14,5,1j,,,7,,3,,4,7,2,b,2,t,3,1k,,,7,,3,,4,7,2,b,2,f,,c,4,1j,2,,7,,3,,4,9,,a,2,t,3,1y,,4,6,,,,8,i,2,1p,,,8,c,8,2q,,,a,b,7,21,2,r,,,,,,4,2,1d,k,,2,5,b,,10,9,,2u,b,,6,n,4,4,3,g,4,d,,,3,6,,f,,jj,3,qa,4,s,3,t,2,u,2,1s,w,9,,19,3,,,39,2,y,,3a,c,4,c,63,5,1l,a,,,,,2,o,2,,1c,1a,2,c,k,5,1b,h,12,9,c,3,u,d,1k,e,1c,k,48,3,,l,4,,6,,2,3,5i,1s,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,n,5,4,,2b,2,1e,i,q,i,d,,12,8,p,d,18,4,1b,e,10,,1v,e,c,,8,2,1a,,1f,,,3,2,2,5,2,,,15,5,5,2,6k,8,,2,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,1t,5,8t,2,25,6,1y,b,1d,4,3e,3,1h,f,15,,2,2,a,4,19,b,7,,1p,3,10,e,g,2,18,,c,3,1c,e,8,4,,2,2k,c,6,,2,,4d,c,l,4,1j,2,,7,2,2,2,3,9,,a,2,2,7,3,5,1v,9,,,2,,,4,,5,,,e,2,2a,i,n,,29,k,6j,7,2,9,r,2,2a,h,2y,d,2t,3,2,a,74,f,6t,6,,2,2,4,,,,2,3x,7,2,7,3,,s,a,14,7,,4,8,,9,b,1a,g,5i,8,5j,8,,8,2a,m,,e,3e,6,3,,,2,,7,,,1u,5,,2,,5,9n,4,9,2,,,1c,7,3,5,n,,44l,,6,f,8ug,i,1xc,5,1n,7,t4,,,1j,7,4,29,,b,2,f57,2,3mp,1a,2,n,f2,5,3,6,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,2s,,4g,7,af,,1p,4,e4,4,72,2,6r,,2,,7,2,5,,d6,7,31,7,240,5".split(",").map((e) => e ? parseInt(e, 36) : 1);
	for (let t = 0, n = 0; t < e.length; t++) (t % 2 ? v : _).push(n += e[t]);
})();
function y(e) {
	if (e < 768) return !1;
	for (let t = 0, n = _.length;;) {
		let r = t + n >> 1;
		if (e < _[r]) n = r;
		else if (e >= v[r]) t = r + 1;
		else return !0;
		if (t == n) return !1;
	}
}
function b(e) {
	return e >= 127462 && e <= 127487;
}
var x = 8205;
function ee(e, t, n = !0, r = !0) {
	return (n ? te : ne)(e, t, r);
}
function te(e, t, n) {
	if (t == e.length) return t;
	t && re(e.charCodeAt(t)) && ie(e.charCodeAt(t - 1)) && t--;
	let r = S(e, t);
	for (t += ae(r); t < e.length;) {
		let i = S(e, t);
		if (r == x || i == x || n && y(i)) t += ae(i), r = i;
		else if (b(i)) {
			let n = 0, r = t - 2;
			for (; r >= 0 && b(S(e, r));) n++, r -= 2;
			if (n % 2 == 0) break;
			t += 2;
		} else break;
	}
	return t;
}
function ne(e, t, n) {
	for (; t > 1;) {
		let r = te(e, t - 2, n);
		if (r < t) return r;
		t--;
	}
	return 0;
}
function S(e, t) {
	let n = e.charCodeAt(t);
	if (!ie(n) || t + 1 == e.length) return n;
	let r = e.charCodeAt(t + 1);
	return re(r) ? (n - 55296 << 10) + (r - 56320) + 65536 : n;
}
function re(e) {
	return e >= 56320 && e < 57344;
}
function ie(e) {
	return e >= 55296 && e < 56320;
}
function ae(e) {
	return e < 65536 ? 1 : 2;
}
//#endregion
//#region node_modules/@codemirror/state/dist/index.js
var C = class e {
	lineAt(e) {
		if (e < 0 || e > this.length) throw RangeError(`Invalid position ${e} in document of length ${this.length}`);
		return this.lineInner(e, !1, 1, 0);
	}
	line(e) {
		if (e < 1 || e > this.lines) throw RangeError(`Invalid line number ${e} in ${this.lines}-line document`);
		return this.lineInner(e, !0, 1, 0);
	}
	replace(e, t, n) {
		[e, t] = he(this, e, t);
		let r = [];
		return this.decompose(0, e, r, 2), n.length && n.decompose(0, n.length, r, 3), this.decompose(t, this.length, r, 1), se.from(r, this.length - (t - e) + n.length);
	}
	append(e) {
		return this.replace(this.length, this.length, e);
	}
	slice(e, t = this.length) {
		[e, t] = he(this, e, t);
		let n = [];
		return this.decompose(e, t, n, 0), se.from(n, t - e);
	}
	eq(e) {
		if (e == this) return !0;
		if (e.length != this.length || e.lines != this.lines) return !1;
		let t = this.scanIdentical(e, 1), n = this.length - this.scanIdentical(e, -1), r = new de(this), i = new de(e);
		for (let e = t, a = t;;) {
			if (r.next(e), i.next(e), e = 0, r.lineBreak != i.lineBreak || r.done != i.done || r.value != i.value) return !1;
			if (a += r.value.length, r.done || a >= n) return !0;
		}
	}
	iter(e = 1) {
		return new de(this, e);
	}
	iterRange(e, t = this.length) {
		return new fe(this, e, t);
	}
	iterLines(e, t) {
		let n;
		if (e == null) n = this.iter();
		else {
			t ??= this.lines + 1;
			let r = this.line(e).from;
			n = this.iterRange(r, Math.max(r, t == this.lines + 1 ? this.length : t <= 1 ? 0 : this.line(t - 1).to));
		}
		return new pe(n);
	}
	toString() {
		return this.sliceString(0);
	}
	toJSON() {
		let e = [];
		return this.flatten(e), e;
	}
	constructor() {}
	static of(t) {
		if (t.length == 0) throw RangeError("A document must have at least one line");
		return t.length == 1 && !t[0] ? e.empty : t.length <= 32 ? new oe(t) : se.from(oe.split(t, []));
	}
}, oe = class e extends C {
	constructor(e, t = ce(e)) {
		super(), this.text = e, this.length = t;
	}
	get lines() {
		return this.text.length;
	}
	get children() {
		return null;
	}
	lineInner(e, t, n, r) {
		for (let i = 0;; i++) {
			let a = this.text[i], o = r + a.length;
			if ((t ? n : o) >= e) return new me(r, o, n, a);
			r = o + 1, n++;
		}
	}
	decompose(t, n, r, i) {
		let a = t <= 0 && n >= this.length ? this : new e(ue(this.text, t, n), Math.min(n, this.length) - Math.max(0, t));
		if (i & 1) {
			let t = r.pop(), n = le(a.text, t.text.slice(), 0, a.length);
			if (n.length <= 32) r.push(new e(n, t.length + a.length));
			else {
				let t = n.length >> 1;
				r.push(new e(n.slice(0, t)), new e(n.slice(t)));
			}
		} else r.push(a);
	}
	replace(t, n, r) {
		if (!(r instanceof e)) return super.replace(t, n, r);
		[t, n] = he(this, t, n);
		let i = le(this.text, le(r.text, ue(this.text, 0, t)), n), a = this.length + r.length - (n - t);
		return i.length <= 32 ? new e(i, a) : se.from(e.split(i, []), a);
	}
	sliceString(e, t = this.length, n = "\n") {
		[e, t] = he(this, e, t);
		let r = "";
		for (let i = 0, a = 0; i <= t && a < this.text.length; a++) {
			let o = this.text[a], s = i + o.length;
			i > e && a && (r += n), e < s && t > i && (r += o.slice(Math.max(0, e - i), t - i)), i = s + 1;
		}
		return r;
	}
	flatten(e) {
		for (let t of this.text) e.push(t);
	}
	scanIdentical() {
		return 0;
	}
	static split(t, n) {
		let r = [], i = -1;
		for (let a of t) r.push(a), i += a.length + 1, r.length == 32 && (n.push(new e(r, i)), r = [], i = -1);
		return i > -1 && n.push(new e(r, i)), n;
	}
}, se = class e extends C {
	constructor(e, t) {
		super(), this.children = e, this.length = t, this.lines = 0;
		for (let t of e) this.lines += t.lines;
	}
	lineInner(e, t, n, r) {
		for (let i = 0;; i++) {
			let a = this.children[i], o = r + a.length, s = n + a.lines - 1;
			if ((t ? s : o) >= e) return a.lineInner(e, t, n, r);
			r = o + 1, n = s + 1;
		}
	}
	decompose(e, t, n, r) {
		for (let i = 0, a = 0; a <= t && i < this.children.length; i++) {
			let o = this.children[i], s = a + o.length;
			if (e <= s && t >= a) {
				let i = r & (a <= e | (s >= t ? 2 : 0));
				a >= e && s <= t && !i ? n.push(o) : o.decompose(e - a, t - a, n, i);
			}
			a = s + 1;
		}
	}
	replace(t, n, r) {
		if ([t, n] = he(this, t, n), r.lines < this.lines) for (let i = 0, a = 0; i < this.children.length; i++) {
			let o = this.children[i], s = a + o.length;
			if (t >= a && n <= s) {
				let c = o.replace(t - a, n - a, r), l = this.lines - o.lines + c.lines;
				if (c.lines < l >> 4 && c.lines > l >> 6) {
					let a = this.children.slice();
					return a[i] = c, new e(a, this.length - (n - t) + r.length);
				}
				return super.replace(a, s, c);
			}
			a = s + 1;
		}
		return super.replace(t, n, r);
	}
	sliceString(e, t = this.length, n = "\n") {
		[e, t] = he(this, e, t);
		let r = "";
		for (let i = 0, a = 0; i < this.children.length && a <= t; i++) {
			let o = this.children[i], s = a + o.length;
			a > e && i && (r += n), e < s && t > a && (r += o.sliceString(e - a, t - a, n)), a = s + 1;
		}
		return r;
	}
	flatten(e) {
		for (let t of this.children) t.flatten(e);
	}
	scanIdentical(t, n) {
		if (!(t instanceof e)) return 0;
		let r = 0, [i, a, o, s] = n > 0 ? [
			0,
			0,
			this.children.length,
			t.children.length
		] : [
			this.children.length - 1,
			t.children.length - 1,
			-1,
			-1
		];
		for (;; i += n, a += n) {
			if (i == o || a == s) return r;
			let e = this.children[i], c = t.children[a];
			if (e != c) return r + e.scanIdentical(c, n);
			r += e.length + 1;
		}
	}
	static from(t, n = t.reduce((e, t) => e + t.length + 1, -1)) {
		let r = 0;
		for (let e of t) r += e.lines;
		if (r < 32) {
			let e = [];
			for (let n of t) n.flatten(e);
			return new oe(e, n);
		}
		let i = Math.max(32, r >> 5), a = i << 1, o = i >> 1, s = [], c = 0, l = -1, u = [];
		function d(t) {
			let n;
			if (t.lines > a && t instanceof e) for (let e of t.children) d(e);
			else t.lines > o && (c > o || !c) ? (f(), s.push(t)) : t instanceof oe && c && (n = u[u.length - 1]) instanceof oe && t.lines + n.lines <= 32 ? (c += t.lines, l += t.length + 1, u[u.length - 1] = new oe(n.text.concat(t.text), n.length + 1 + t.length)) : (c + t.lines > i && f(), c += t.lines, l += t.length + 1, u.push(t));
		}
		function f() {
			c != 0 && (s.push(u.length == 1 ? u[0] : e.from(u, l)), l = -1, c = u.length = 0);
		}
		for (let e of t) d(e);
		return f(), s.length == 1 ? s[0] : new e(s, n);
	}
};
C.empty = /*@__PURE__*/ new oe([""], 0);
function ce(e) {
	let t = -1;
	for (let n of e) t += n.length + 1;
	return t;
}
function le(e, t, n = 0, r = 1e9) {
	for (let i = 0, a = 0, o = !0; a < e.length && i <= r; a++) {
		let s = e[a], c = i + s.length;
		c >= n && (c > r && (s = s.slice(0, r - i)), i < n && (s = s.slice(n - i)), o ? (t[t.length - 1] += s, o = !1) : t.push(s)), i = c + 1;
	}
	return t;
}
function ue(e, t, n) {
	return le(e, [""], t, n);
}
var de = class {
	constructor(e, t = 1) {
		this.dir = t, this.done = !1, this.lineBreak = !1, this.value = "", this.nodes = [e], this.offsets = [t > 0 ? 1 : (e instanceof oe ? e.text.length : e.children.length) << 1];
	}
	nextInner(e, t) {
		for (this.done = this.lineBreak = !1;;) {
			let n = this.nodes.length - 1, r = this.nodes[n], i = this.offsets[n], a = i >> 1, o = r instanceof oe ? r.text.length : r.children.length;
			if (a == (t > 0 ? o : 0)) {
				if (n == 0) return this.done = !0, this.value = "", this;
				t > 0 && this.offsets[n - 1]++, this.nodes.pop(), this.offsets.pop();
			} else if ((i & 1) == (t > 0 ? 0 : 1)) {
				if (this.offsets[n] += t, e == 0) return this.lineBreak = !0, this.value = "\n", this;
				e--;
			} else if (r instanceof oe) {
				let i = r.text[a + (t < 0 ? -1 : 0)];
				if (this.offsets[n] += t, i.length > Math.max(0, e)) return this.value = e == 0 ? i : t > 0 ? i.slice(e) : i.slice(0, i.length - e), this;
				e -= i.length;
			} else {
				let i = r.children[a + (t < 0 ? -1 : 0)];
				e > i.length ? (e -= i.length, this.offsets[n] += t) : (t < 0 && this.offsets[n]--, this.nodes.push(i), this.offsets.push(t > 0 ? 1 : (i instanceof oe ? i.text.length : i.children.length) << 1));
			}
		}
	}
	next(e = 0) {
		return e < 0 && (this.nextInner(-e, -this.dir), e = this.value.length), this.nextInner(e, this.dir);
	}
}, fe = class {
	constructor(e, t, n) {
		this.value = "", this.done = !1, this.cursor = new de(e, t > n ? -1 : 1), this.pos = t > n ? e.length : 0, this.from = Math.min(t, n), this.to = Math.max(t, n);
	}
	nextInner(e, t) {
		if (t < 0 ? this.pos <= this.from : this.pos >= this.to) return this.value = "", this.done = !0, this;
		e += Math.max(0, t < 0 ? this.pos - this.to : this.from - this.pos);
		let n = t < 0 ? this.pos - this.from : this.to - this.pos;
		e > n && (e = n), n -= e;
		let { value: r } = this.cursor.next(e);
		return this.pos += (r.length + e) * t, this.value = r.length <= n ? r : t < 0 ? r.slice(r.length - n) : r.slice(0, n), this.done = !this.value, this;
	}
	next(e = 0) {
		return e < 0 ? e = Math.max(e, this.from - this.pos) : e > 0 && (e = Math.min(e, this.to - this.pos)), this.nextInner(e, this.cursor.dir);
	}
	get lineBreak() {
		return this.cursor.lineBreak && this.value != "";
	}
}, pe = class {
	constructor(e) {
		this.inner = e, this.afterBreak = !0, this.value = "", this.done = !1;
	}
	next(e = 0) {
		let { done: t, lineBreak: n, value: r } = this.inner.next(e);
		return t && this.afterBreak ? (this.value = "", this.afterBreak = !1) : t ? (this.done = !0, this.value = "") : n ? this.afterBreak ? this.value = "" : (this.afterBreak = !0, this.next()) : (this.value = r, this.afterBreak = !1), this;
	}
	get lineBreak() {
		return !1;
	}
};
typeof Symbol < "u" && (C.prototype[Symbol.iterator] = function() {
	return this.iter();
}, de.prototype[Symbol.iterator] = fe.prototype[Symbol.iterator] = pe.prototype[Symbol.iterator] = function() {
	return this;
});
var me = class {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.number = n, this.text = r;
	}
	get length() {
		return this.to - this.from;
	}
};
function he(e, t, n) {
	return t = Math.max(0, Math.min(e.length, t)), [t, Math.max(t, Math.min(e.length, n))];
}
function w(e, t, n = !0, r = !0) {
	return ee(e, t, n, r);
}
function ge(e) {
	return e >= 56320 && e < 57344;
}
function _e(e) {
	return e >= 55296 && e < 56320;
}
function ve(e, t) {
	let n = e.charCodeAt(t);
	if (!_e(n) || t + 1 == e.length) return n;
	let r = e.charCodeAt(t + 1);
	return ge(r) ? (n - 55296 << 10) + (r - 56320) + 65536 : n;
}
function ye(e) {
	return e <= 65535 ? String.fromCharCode(e) : (e -= 65536, String.fromCharCode((e >> 10) + 55296, (e & 1023) + 56320));
}
function be(e) {
	return e < 65536 ? 1 : 2;
}
var xe = /\r\n?|\n/, Se = /*@__PURE__*/ (function(e) {
	return e[e.Simple = 0] = "Simple", e[e.TrackDel = 1] = "TrackDel", e[e.TrackBefore = 2] = "TrackBefore", e[e.TrackAfter = 3] = "TrackAfter", e;
})(Se ||= {}), Ce = class e {
	constructor(e) {
		this.sections = e;
	}
	get length() {
		let e = 0;
		for (let t = 0; t < this.sections.length; t += 2) e += this.sections[t];
		return e;
	}
	get newLength() {
		let e = 0;
		for (let t = 0; t < this.sections.length; t += 2) {
			let n = this.sections[t + 1];
			e += n < 0 ? this.sections[t] : n;
		}
		return e;
	}
	get empty() {
		return this.sections.length == 0 || this.sections.length == 2 && this.sections[1] < 0;
	}
	iterGaps(e) {
		for (let t = 0, n = 0, r = 0; t < this.sections.length;) {
			let i = this.sections[t++], a = this.sections[t++];
			a < 0 ? (e(n, r, i), r += i) : r += a, n += i;
		}
	}
	iterChangedRanges(e, t = !1) {
		De(this, e, t);
	}
	get invertedDesc() {
		let t = [];
		for (let e = 0; e < this.sections.length;) {
			let n = this.sections[e++], r = this.sections[e++];
			r < 0 ? t.push(n, r) : t.push(r, n);
		}
		return new e(t);
	}
	composeDesc(e) {
		return this.empty ? e : e.empty ? this : ke(this, e);
	}
	mapDesc(e, t = !1) {
		return e.empty ? this : Oe(this, e, t);
	}
	mapPos(e, t = -1, n = Se.Simple) {
		let r = 0, i = 0;
		for (let a = 0; a < this.sections.length;) {
			let o = this.sections[a++], s = this.sections[a++], c = r + o;
			if (s < 0) {
				if (c > e) return i + (e - r);
				i += o;
			} else {
				if (n != Se.Simple && c >= e && (n == Se.TrackDel && r < e && c > e || n == Se.TrackBefore && r < e || n == Se.TrackAfter && c > e)) return null;
				if (c > e || c == e && t < 0 && !o) return e == r || t < 0 ? i : i + s;
				i += s;
			}
			r = c;
		}
		if (e > r) throw RangeError(`Position ${e} is out of range for changeset of length ${r}`);
		return i;
	}
	touchesRange(e, t = e) {
		for (let n = 0, r = 0; n < this.sections.length && r <= t;) {
			let i = this.sections[n++], a = this.sections[n++], o = r + i;
			if (a >= 0 && r <= t && o >= e) return r < e && o > t ? "cover" : !0;
			r = o;
		}
		return !1;
	}
	toString() {
		let e = "";
		for (let t = 0; t < this.sections.length;) {
			let n = this.sections[t++], r = this.sections[t++];
			e += (e ? " " : "") + n + (r >= 0 ? ":" + r : "");
		}
		return e;
	}
	toJSON() {
		return this.sections;
	}
	static fromJSON(t) {
		if (!Array.isArray(t) || t.length % 2 || t.some((e) => typeof e != "number")) throw RangeError("Invalid JSON representation of ChangeDesc");
		return new e(t);
	}
	static create(t) {
		return new e(t);
	}
}, we = class e extends Ce {
	constructor(e, t) {
		super(e), this.inserted = t;
	}
	apply(e) {
		if (this.length != e.length) throw RangeError("Applying change set to a document with the wrong length");
		return De(this, (t, n, r, i, a) => e = e.replace(r, r + (n - t), a), !1), e;
	}
	mapDesc(e, t = !1) {
		return Oe(this, e, t, !0);
	}
	invert(t) {
		let n = this.sections.slice(), r = [];
		for (let e = 0, i = 0; e < n.length; e += 2) {
			let a = n[e], o = n[e + 1];
			if (o >= 0) {
				n[e] = o, n[e + 1] = a;
				let s = e >> 1;
				for (; r.length < s;) r.push(C.empty);
				r.push(a ? t.slice(i, i + a) : C.empty);
			}
			i += a;
		}
		return new e(n, r);
	}
	compose(e) {
		return this.empty ? e : e.empty ? this : ke(this, e, !0);
	}
	map(e, t = !1) {
		return e.empty ? this : Oe(this, e, t, !0);
	}
	iterChanges(e, t = !1) {
		De(this, e, t);
	}
	get desc() {
		return Ce.create(this.sections);
	}
	filter(t) {
		let n = [], r = [], i = [], a = new Ae(this);
		done: for (let e = 0, o = 0;;) {
			let s = e == t.length ? 1e9 : t[e++];
			for (; o < s || o == s && a.len == 0;) {
				if (a.done) break done;
				let e = Math.min(a.len, s - o);
				Te(i, e, -1);
				let t = a.ins == -1 ? -1 : a.off == 0 ? a.ins : 0;
				Te(n, e, t), t > 0 && Ee(r, n, a.text), a.forward(e), o += e;
			}
			let c = t[e++];
			for (; o < c;) {
				if (a.done) break done;
				let e = Math.min(a.len, c - o);
				Te(n, e, -1), Te(i, e, a.ins == -1 ? -1 : a.off == 0 ? a.ins : 0), a.forward(e), o += e;
			}
		}
		return {
			changes: new e(n, r),
			filtered: Ce.create(i)
		};
	}
	toJSON() {
		let e = [];
		for (let t = 0; t < this.sections.length; t += 2) {
			let n = this.sections[t], r = this.sections[t + 1];
			r < 0 ? e.push(n) : r == 0 ? e.push([n]) : e.push([n].concat(this.inserted[t >> 1].toJSON()));
		}
		return e;
	}
	static of(t, n, r) {
		let i = [], a = [], o = 0, s = null;
		function c(t = !1) {
			if (!t && !i.length) return;
			o < n && Te(i, n - o, -1);
			let r = new e(i, a);
			s = s ? s.compose(r.map(s)) : r, i = [], a = [], o = 0;
		}
		function l(t) {
			if (Array.isArray(t)) for (let e of t) l(e);
			else if (t instanceof e) {
				if (t.length != n) throw RangeError(`Mismatched change set length (got ${t.length}, expected ${n})`);
				c(), s = s ? s.compose(t.map(s)) : t;
			} else {
				let { from: e, to: s = e, insert: l } = t;
				if (e > s || e < 0 || s > n) throw RangeError(`Invalid change range ${e} to ${s} (in doc of length ${n})`);
				let u = l ? typeof l == "string" ? C.of(l.split(r || xe)) : l : C.empty, d = u.length;
				if (e == s && d == 0) return;
				e < o && c(), e > o && Te(i, e - o, -1), Te(i, s - e, d), Ee(a, i, u), o = s;
			}
		}
		return l(t), c(!s), s;
	}
	static empty(t) {
		return new e(t ? [t, -1] : [], []);
	}
	static fromJSON(t) {
		if (!Array.isArray(t)) throw RangeError("Invalid JSON representation of ChangeSet");
		let n = [], r = [];
		for (let e = 0; e < t.length; e++) {
			let i = t[e];
			if (typeof i == "number") n.push(i, -1);
			else if (!Array.isArray(i) || typeof i[0] != "number" || i.some((e, t) => t && typeof e != "string")) throw RangeError("Invalid JSON representation of ChangeSet");
			else if (i.length == 1) n.push(i[0], 0);
			else {
				for (; r.length < e;) r.push(C.empty);
				r[e] = C.of(i.slice(1)), n.push(i[0], r[e].length);
			}
		}
		return new e(n, r);
	}
	static createSet(t, n) {
		return new e(t, n);
	}
};
function Te(e, t, n, r = !1) {
	if (t == 0 && n <= 0) return;
	let i = e.length - 2;
	i >= 0 && n <= 0 && n == e[i + 1] ? e[i] += t : i >= 0 && t == 0 && e[i] == 0 ? e[i + 1] += n : r ? (e[i] += t, e[i + 1] += n) : e.push(t, n);
}
function Ee(e, t, n) {
	if (n.length == 0) return;
	let r = t.length - 2 >> 1;
	if (r < e.length) e[e.length - 1] = e[e.length - 1].append(n);
	else {
		for (; e.length < r;) e.push(C.empty);
		e.push(n);
	}
}
function De(e, t, n) {
	let r = e.inserted;
	for (let i = 0, a = 0, o = 0; o < e.sections.length;) {
		let s = e.sections[o++], c = e.sections[o++];
		if (c < 0) i += s, a += s;
		else {
			let l = i, u = a, d = C.empty;
			for (; l += s, u += c, c && r && (d = d.append(r[o - 2 >> 1])), !(n || o == e.sections.length || e.sections[o + 1] < 0);) s = e.sections[o++], c = e.sections[o++];
			t(i, l, a, u, d), i = l, a = u;
		}
	}
}
function Oe(e, t, n, r = !1) {
	let i = [], a = r ? [] : null, o = new Ae(e), s = new Ae(t);
	for (let e = -1;;) if (o.done && s.len || s.done && o.len) throw Error("Mismatched change set lengths");
	else if (o.ins == -1 && s.ins == -1) {
		let e = Math.min(o.len, s.len);
		Te(i, e, -1), o.forward(e), s.forward(e);
	} else if (s.ins >= 0 && (o.ins < 0 || e == o.i || o.off == 0 && (s.len < o.len || s.len == o.len && !n))) {
		let t = s.len;
		for (Te(i, s.ins, -1); t;) {
			let n = Math.min(o.len, t);
			o.ins >= 0 && e < o.i && o.len <= n && (Te(i, 0, o.ins), a && Ee(a, i, o.text), e = o.i), o.forward(n), t -= n;
		}
		s.next();
	} else if (o.ins >= 0) {
		let t = 0, n = o.len;
		for (; n;) if (s.ins == -1) {
			let e = Math.min(n, s.len);
			t += e, n -= e, s.forward(e);
		} else if (s.ins == 0 && s.len < n) n -= s.len, s.next();
		else break;
		Te(i, t, e < o.i ? o.ins : 0), a && e < o.i && Ee(a, i, o.text), e = o.i, o.forward(o.len - n);
	} else if (o.done && s.done) return a ? we.createSet(i, a) : Ce.create(i);
	else throw Error("Mismatched change set lengths");
}
function ke(e, t, n = !1) {
	let r = [], i = n ? [] : null, a = new Ae(e), o = new Ae(t);
	for (let e = !1;;) if (a.done && o.done) return i ? we.createSet(r, i) : Ce.create(r);
	else if (a.ins == 0) Te(r, a.len, 0, e), a.next();
	else if (o.len == 0 && !o.done) Te(r, 0, o.ins, e), i && Ee(i, r, o.text), o.next();
	else if (a.done || o.done) throw Error("Mismatched change set lengths");
	else {
		let t = Math.min(a.len2, o.len), n = r.length;
		if (a.ins == -1) {
			let n = o.ins == -1 ? -1 : o.off ? 0 : o.ins;
			Te(r, t, n, e), i && n && Ee(i, r, o.text);
		} else o.ins == -1 ? (Te(r, a.off ? 0 : a.len, t, e), i && Ee(i, r, a.textBit(t))) : (Te(r, a.off ? 0 : a.len, o.off ? 0 : o.ins, e), i && !o.off && Ee(i, r, o.text));
		e = (a.ins > t || o.ins >= 0 && o.len > t) && (e || r.length > n), a.forward2(t), o.forward(t);
	}
}
var Ae = class {
	constructor(e) {
		this.set = e, this.i = 0, this.next();
	}
	next() {
		let { sections: e } = this.set;
		this.i < e.length ? (this.len = e[this.i++], this.ins = e[this.i++]) : (this.len = 0, this.ins = -2), this.off = 0;
	}
	get done() {
		return this.ins == -2;
	}
	get len2() {
		return this.ins < 0 ? this.len : this.ins;
	}
	get text() {
		let { inserted: e } = this.set, t = this.i - 2 >> 1;
		return t >= e.length ? C.empty : e[t];
	}
	textBit(e) {
		let { inserted: t } = this.set, n = this.i - 2 >> 1;
		return n >= t.length && !e ? C.empty : t[n].slice(this.off, e == null ? void 0 : this.off + e);
	}
	forward(e) {
		e == this.len ? this.next() : (this.len -= e, this.off += e);
	}
	forward2(e) {
		this.ins == -1 ? this.forward(e) : e == this.ins ? this.next() : (this.ins -= e, this.off += e);
	}
}, je = class e {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.flags = n, this.goalColumn = r;
	}
	get anchor() {
		return this.flags & 32 ? this.to : this.from;
	}
	get head() {
		return this.flags & 32 ? this.from : this.to;
	}
	get empty() {
		return this.from == this.to;
	}
	get assoc() {
		return this.flags & 8 ? -1 : this.flags & 16 ? 1 : 0;
	}
	get undirectional() {
		return (this.flags & 64) > 0;
	}
	get bidiLevel() {
		let e = this.flags & 7;
		return e == 7 ? null : e;
	}
	map(t, n = -1) {
		let r, i;
		return this.empty ? r = i = t.mapPos(this.from, n) : (r = t.mapPos(this.from, 1), i = t.mapPos(this.to, -1)), r == this.from && i == this.to ? this : new e(r, i, this.flags, this.goalColumn);
	}
	extend(e, t = e, n = 0) {
		if (e <= this.anchor && t >= this.anchor) return T.range(e, t, void 0, void 0, n);
		let r = Math.abs(e - this.anchor) > Math.abs(t - this.anchor) ? e : t;
		return T.range(this.anchor, r, void 0, void 0, n);
	}
	eq(e, t = !1) {
		return this.anchor == e.anchor && this.head == e.head && this.goalColumn == e.goalColumn && (!t || !this.empty || this.assoc == e.assoc);
	}
	toJSON() {
		return {
			anchor: this.anchor,
			head: this.head
		};
	}
	static fromJSON(e) {
		if (!e || typeof e.anchor != "number" || typeof e.head != "number") throw RangeError("Invalid JSON representation for SelectionRange");
		return T.range(e.anchor, e.head);
	}
	static create(t, n, r, i) {
		return new e(t, n, r, i);
	}
}, T = class e {
	constructor(e, t) {
		this.ranges = e, this.mainIndex = t;
	}
	map(t, n = -1) {
		return t.empty ? this : e.create(this.ranges.map((e) => e.map(t, n)), this.mainIndex);
	}
	eq(e, t = !1) {
		if (this.ranges.length != e.ranges.length || this.mainIndex != e.mainIndex) return !1;
		for (let n = 0; n < this.ranges.length; n++) if (!this.ranges[n].eq(e.ranges[n], t)) return !1;
		return !0;
	}
	get main() {
		return this.ranges[this.mainIndex];
	}
	asSingle() {
		return this.ranges.length == 1 ? this : new e([this.main], 0);
	}
	addRange(t, n = !0) {
		return e.create([t].concat(this.ranges), n ? 0 : this.mainIndex + 1);
	}
	replaceRange(t, n = this.mainIndex) {
		let r = this.ranges.slice();
		return r[n] = t, e.create(r, this.mainIndex);
	}
	toJSON() {
		return {
			ranges: this.ranges.map((e) => e.toJSON()),
			main: this.mainIndex
		};
	}
	static fromJSON(t) {
		if (!t || !Array.isArray(t.ranges) || typeof t.main != "number" || t.main >= t.ranges.length) throw RangeError("Invalid JSON representation for EditorSelection");
		return new e(t.ranges.map((e) => je.fromJSON(e)), t.main);
	}
	static single(t, n = t) {
		return new e([e.range(t, n)], 0);
	}
	static create(t, n = 0) {
		if (t.length == 0) throw RangeError("A selection needs at least one range");
		for (let r = 0, i = 0; i < t.length; i++) {
			let a = t[i];
			if (a.empty ? a.from <= r : a.from < r) return e.normalized(t.slice(), n);
			r = a.to;
		}
		return new e(t, n);
	}
	static cursor(e, t = 0, n, r) {
		return je.create(e, e, (t == 0 ? 0 : t < 0 ? 8 : 16) | (n == null ? 7 : Math.min(6, n)), r);
	}
	static range(e, t, n, r, i) {
		let a = r == null ? 7 : Math.min(6, r);
		return !i && e != t && (i = t < e ? 1 : -1), i && (a |= i < 0 ? 8 : 16), t < e ? je.create(t, e, a | 32, n) : je.create(e, t, a, n);
	}
	static undirectionalRange(e, t) {
		return je.create(e, t, 64, void 0);
	}
	static normalized(t, n = 0) {
		let r = t[n];
		t.sort((e, t) => e.from - t.from), n = t.indexOf(r);
		for (let r = 1; r < t.length; r++) {
			let i = t[r], a = t[r - 1];
			if (i.empty ? i.from <= a.to : i.from < a.to) {
				let o = a.from, s = Math.max(i.to, a.to);
				r <= n && n--, t.splice(--r, 2, i.anchor > i.head ? e.range(s, o) : e.range(o, s));
			}
		}
		return new e(t, n);
	}
};
function Me(e, t) {
	for (let n of e.ranges) if (n.to > t) throw RangeError("Selection points outside of document");
}
var Ne = 0, E = class e {
	constructor(e, t, n, r, i) {
		this.combine = e, this.compareInput = t, this.compare = n, this.isStatic = r, this.id = Ne++, this.default = e([]), this.extensions = typeof i == "function" ? i(this) : i;
	}
	get reader() {
		return this;
	}
	static define(t = {}) {
		return new e(t.combine || ((e) => e), t.compareInput || ((e, t) => e === t), t.compare || (t.combine ? (e, t) => e === t : Pe), !!t.static, t.enables);
	}
	of(e) {
		return new Fe([], this, 0, e);
	}
	compute(e, t) {
		if (this.isStatic) throw Error("Can't compute a static facet");
		return new Fe(e, this, 1, t);
	}
	computeN(e, t) {
		if (this.isStatic) throw Error("Can't compute a static facet");
		return new Fe(e, this, 2, t);
	}
	from(e, t) {
		return t ||= (e) => e, this.compute([e], (n) => t(n.field(e)));
	}
};
function Pe(e, t) {
	return e == t || e.length == t.length && e.every((e, n) => e === t[n]);
}
var Fe = class {
	constructor(e, t, n, r) {
		this.dependencies = e, this.facet = t, this.type = n, this.value = r, this.id = Ne++;
	}
	dynamicSlot(e) {
		let t = this.value, n = this.facet.compareInput, r = this.id, i = e[r] >> 1, a = this.type == 2, o = !1, s = !1, c = [];
		for (let t of this.dependencies) t == "doc" ? o = !0 : t == "selection" ? s = !0 : (e[t.id] ?? 1) & 1 || c.push(e[t.id]);
		return {
			create(e) {
				return e.values[i] = t(e), 1;
			},
			update(e, r) {
				if (o && r.docChanged || s && (r.docChanged || r.selection) || Le(e, c)) {
					let r = t(e);
					if (a ? !Ie(r, e.values[i], n) : !n(r, e.values[i])) return e.values[i] = r, 1;
				}
				return 0;
			},
			reconfigure: (e, o) => {
				let s, c = o.config.address[r];
				if (c != null) {
					let r = Xe(o, c);
					if (this.dependencies.every((t) => t instanceof E ? o.facet(t) === e.facet(t) : t instanceof Be ? o.field(t, !1) == e.field(t, !1) : !0) || (a ? Ie(s = t(e), r, n) : n(s = t(e), r))) return e.values[i] = r, 0;
				} else s = t(e);
				return e.values[i] = s, 1;
			}
		};
	}
	get extension() {
		return this;
	}
};
function Ie(e, t, n) {
	if (e.length != t.length) return !1;
	for (let r = 0; r < e.length; r++) if (!n(e[r], t[r])) return !1;
	return !0;
}
function Le(e, t) {
	let n = !1;
	for (let r of t) Ye(e, r) & 1 && (n = !0);
	return n;
}
function Re(e, t, n) {
	let r = n.map((t) => e[t.id]), i = n.map((e) => e.type), a = r.filter((e) => !(e & 1)), o = e[t.id] >> 1;
	function s(e) {
		let n = [];
		for (let t = 0; t < r.length; t++) {
			let a = Xe(e, r[t]);
			if (i[t] == 2) for (let e of a) n.push(e);
			else n.push(a);
		}
		return t.combine(n);
	}
	return {
		create(e) {
			for (let t of r) Ye(e, t);
			return e.values[o] = s(e), 1;
		},
		update(e, n) {
			if (!Le(e, a)) return 0;
			let r = s(e);
			return t.compare(r, e.values[o]) ? 0 : (e.values[o] = r, 1);
		},
		reconfigure(e, i) {
			let a = Le(e, r), c = i.config.facets[t.id], l = i.facet(t);
			if (c && !a && Pe(n, c)) return e.values[o] = l, 0;
			let u = s(e);
			return t.compare(u, l) ? (e.values[o] = l, 0) : (e.values[o] = u, 1);
		}
	};
}
var ze = /*@__PURE__*/ E.define({ static: !0 }), Be = class e {
	constructor(e, t, n, r, i) {
		this.id = e, this.createF = t, this.updateF = n, this.compareF = r, this.spec = i, this.provides = void 0;
	}
	static define(t) {
		let n = new e(Ne++, t.create, t.update, t.compare || ((e, t) => e === t), t);
		return t.provide && (n.provides = t.provide(n)), n;
	}
	create(e) {
		return (e.facet(ze).find((e) => e.field == this)?.create || this.createF)(e);
	}
	slot(e) {
		let t = e[this.id] >> 1;
		return {
			create: (e) => (e.values[t] = this.create(e), 1),
			update: (e, n) => {
				let r = e.values[t], i = this.updateF(r, n);
				return this.compareF(r, i) ? 0 : (e.values[t] = i, 1);
			},
			reconfigure: (e, n) => {
				let r = e.facet(ze), i = n.facet(ze), a;
				return (a = r.find((e) => e.field == this)) && a != i.find((e) => e.field == this) ? (e.values[t] = a.create(e), 1) : n.config.address[this.id] == null ? (e.values[t] = this.create(e), 1) : (e.values[t] = n.field(this), 0);
			}
		};
	}
	init(e) {
		return [this, ze.of({
			field: this,
			create: e
		})];
	}
	get extension() {
		return this;
	}
}, Ve = {
	lowest: 4,
	low: 3,
	default: 2,
	high: 1,
	highest: 0
};
function He(e) {
	return (t) => new We(t, e);
}
var Ue = {
	highest: /*@__PURE__*/ He(Ve.highest),
	high: /*@__PURE__*/ He(Ve.high),
	default: /*@__PURE__*/ He(Ve.default),
	low: /*@__PURE__*/ He(Ve.low),
	lowest: /*@__PURE__*/ He(Ve.lowest)
}, We = class {
	constructor(e, t) {
		this.inner = e, this.prec = t;
	}
	get extension() {
		return this;
	}
}, Ge = class e {
	of(e) {
		return new Ke(this, e);
	}
	reconfigure(t) {
		return e.reconfigure.of({
			compartment: this,
			extension: t
		});
	}
	get(e) {
		return e.config.compartments.get(this);
	}
}, Ke = class {
	constructor(e, t) {
		this.compartment = e, this.inner = t;
	}
	get extension() {
		return this;
	}
}, qe = class e {
	constructor(e, t, n, r, i, a) {
		for (this.base = e, this.compartments = t, this.dynamicSlots = n, this.address = r, this.staticValues = i, this.facets = a, this.statusTemplate = []; this.statusTemplate.length < n.length;) this.statusTemplate.push(0);
	}
	staticFacet(e) {
		let t = this.address[e.id];
		return t == null ? e.default : this.staticValues[t >> 1];
	}
	static resolve(t, n, r) {
		let i = [], a = Object.create(null), o = /* @__PURE__ */ new Map();
		for (let e of Je(t, n, o)) e instanceof Be ? i.push(e) : (a[e.facet.id] || (a[e.facet.id] = [])).push(e);
		let s = Object.create(null), c = [], l = [];
		for (let e of i) s[e.id] = l.length << 1, l.push((t) => e.slot(t));
		let u = r?.config.facets;
		for (let e in a) {
			let t = a[e], n = t[0].facet, i = u && u[e] || [];
			if (t.every((e) => e.type == 0)) {
				if (s[n.id] = c.length << 1 | 1, Pe(i, t)) c.push(r.facet(n));
				else {
					let e = n.combine(t.map((e) => e.value));
					c.push(r && n.compare(e, r.facet(n)) ? r.facet(n) : e);
				}
			} else {
				for (let e of t) e.type == 0 ? (s[e.id] = c.length << 1 | 1, c.push(e.value)) : (s[e.id] = l.length << 1, l.push((t) => e.dynamicSlot(t)));
				s[n.id] = l.length << 1, l.push((e) => Re(e, n, t));
			}
		}
		let d = l.map((e) => e(s));
		return new e(t, o, d, s, c, a);
	}
};
function Je(e, t, n) {
	let r = [
		[],
		[],
		[],
		[],
		[]
	], i = /* @__PURE__ */ new Map();
	function a(e, o) {
		let s = i.get(e);
		if (s != null) {
			if (s <= o) return;
			let t = r[s].indexOf(e);
			t > -1 && r[s].splice(t, 1), e instanceof Ke && n.delete(e.compartment);
		}
		if (i.set(e, o), Array.isArray(e)) for (let t of e) a(t, o);
		else if (e instanceof Ke) {
			if (n.has(e.compartment)) throw RangeError("Duplicate use of compartment in extensions");
			let r = t.get(e.compartment) || e.inner;
			n.set(e.compartment, r), a(r, o);
		} else if (e instanceof We) a(e.inner, e.prec);
		else if (e instanceof Be) r[o].push(e), e.provides && a(e.provides, o);
		else if (e instanceof Fe) r[o].push(e), e.facet.extensions && a(e.facet.extensions, Ve.default);
		else {
			let t = e.extension;
			if (!t) throw Error(`Unrecognized extension value in extension set (${e}).`);
			if (t == e) throw Error(`Unrecognized extension value in extension set (${e}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`);
			a(t, o);
		}
	}
	return a(e, Ve.default), r.reduce((e, t) => e.concat(t));
}
function Ye(e, t) {
	if (t & 1) return 2;
	let n = t >> 1, r = e.status[n];
	if (r == 4) throw Error("Cyclic dependency between fields and/or facets");
	if (r & 2) return r;
	e.status[n] = 4;
	let i = e.computeSlot(e, e.config.dynamicSlots[n]);
	return e.status[n] = 2 | i;
}
function Xe(e, t) {
	return t & 1 ? e.config.staticValues[t >> 1] : e.values[t >> 1];
}
var Ze = /*@__PURE__*/ E.define(), Qe = /*@__PURE__*/ E.define({
	combine: (e) => e.some((e) => e),
	static: !0
}), $e = /*@__PURE__*/ E.define({
	combine: (e) => e.length ? e[0] : void 0,
	static: !0
}), et = /*@__PURE__*/ E.define(), tt = /*@__PURE__*/ E.define(), nt = /*@__PURE__*/ E.define(), rt = /*@__PURE__*/ E.define({ combine: (e) => e.length ? e[0] : !1 }), it = class {
	constructor(e, t) {
		this.type = e, this.value = t;
	}
	static define() {
		return new at();
	}
}, at = class {
	of(e) {
		return new it(this, e);
	}
}, ot = class {
	constructor(e) {
		this.map = e;
	}
	of(e) {
		return new D(this, e);
	}
}, D = class e {
	constructor(e, t) {
		this.type = e, this.value = t;
	}
	map(t) {
		let n = this.type.map(this.value, t);
		return n === void 0 ? void 0 : n == this.value ? this : new e(this.type, n);
	}
	is(e) {
		return this.type == e;
	}
	static define(e = {}) {
		return new ot(e.map || ((e) => e));
	}
	static mapEffects(e, t) {
		if (!e.length) return e;
		let n = [];
		for (let r of e) {
			let e = r.map(t);
			e && n.push(e);
		}
		return n;
	}
};
D.reconfigure = /*@__PURE__*/ D.define(), D.appendConfig = /*@__PURE__*/ D.define();
var st = class e {
	constructor(t, n, r, i, a, o) {
		this.startState = t, this.changes = n, this.selection = r, this.effects = i, this.annotations = a, this.scrollIntoView = o, this._doc = null, this._state = null, r && Me(r, n.newLength), a.some((t) => t.type == e.time) || (this.annotations = a.concat(e.time.of(Date.now())));
	}
	static create(t, n, r, i, a, o) {
		return new e(t, n, r, i, a, o);
	}
	get newDoc() {
		return this._doc ||= this.changes.apply(this.startState.doc);
	}
	get newSelection() {
		return this.selection || this.startState.selection.map(this.changes);
	}
	get state() {
		return this._state || this.startState.applyTransaction(this), this._state;
	}
	annotation(e) {
		for (let t of this.annotations) if (t.type == e) return t.value;
	}
	get docChanged() {
		return !this.changes.empty;
	}
	get reconfigured() {
		return this.startState.config != this.state.config;
	}
	isUserEvent(t) {
		let n = this.annotation(e.userEvent);
		return !!(n && (n == t || n.length > t.length && n.slice(0, t.length) == t && n[t.length] == "."));
	}
};
st.time = /*@__PURE__*/ it.define(), st.userEvent = /*@__PURE__*/ it.define(), st.addToHistory = /*@__PURE__*/ it.define(), st.remote = /*@__PURE__*/ it.define();
function ct(e, t) {
	let n = [];
	for (let r = 0, i = 0;;) {
		let a, o;
		if (r < e.length && (i == t.length || t[i] >= e[r])) a = e[r++], o = e[r++];
		else if (i < t.length) a = t[i++], o = t[i++];
		else return n;
		!n.length || n[n.length - 1] < a ? n.push(a, o) : n[n.length - 1] < o && (n[n.length - 1] = o);
	}
}
function lt(e, t, n) {
	let r, i, a;
	return n ? (r = t.changes, i = we.empty(t.changes.length), a = e.changes.compose(t.changes)) : (r = t.changes.map(e.changes), i = e.changes.mapDesc(t.changes, !0), a = e.changes.compose(r)), {
		changes: a,
		selection: t.selection ? t.selection.map(i) : e.selection?.map(r),
		effects: D.mapEffects(e.effects, r).concat(D.mapEffects(t.effects, i)),
		annotations: e.annotations.length ? e.annotations.concat(t.annotations) : t.annotations,
		scrollIntoView: e.scrollIntoView || t.scrollIntoView
	};
}
function ut(e, t, n) {
	let r = t.selection, i = ht(t.annotations);
	return t.userEvent && (i = i.concat(st.userEvent.of(t.userEvent))), {
		changes: t.changes instanceof we ? t.changes : we.of(t.changes || [], n, e.facet($e)),
		selection: r && (r instanceof T ? r : T.single(r.anchor, r.head)),
		effects: ht(t.effects),
		annotations: i,
		scrollIntoView: !!t.scrollIntoView
	};
}
function dt(e, t, n) {
	let r = ut(e, t.length ? t[0] : {}, e.doc.length);
	t.length && t[0].filter === !1 && (n = !1);
	for (let i = 1; i < t.length; i++) {
		t[i].filter === !1 && (n = !1);
		let a = !!t[i].sequential;
		r = lt(r, ut(e, t[i], a ? r.changes.newLength : e.doc.length), a);
	}
	let i = st.create(e, r.changes, r.selection, r.effects, r.annotations, r.scrollIntoView);
	return pt(n ? ft(i) : i);
}
function ft(e) {
	let t = e.startState, n = !0;
	for (let r of t.facet(et)) {
		let t = r(e);
		if (t === !1) {
			n = !1;
			break;
		}
		Array.isArray(t) && (n = n === !0 ? t : ct(n, t));
	}
	if (n !== !0) {
		let r, i;
		if (n === !1) i = e.changes.invertedDesc, r = we.empty(t.doc.length);
		else {
			let t = e.changes.filter(n);
			r = t.changes, i = t.filtered.mapDesc(t.changes).invertedDesc;
		}
		e = st.create(t, r, e.selection && e.selection.map(i), D.mapEffects(e.effects, i), e.annotations, e.scrollIntoView);
	}
	let r = t.facet(tt);
	for (let n = r.length - 1; n >= 0; n--) {
		let i = r[n](e);
		e = i instanceof st ? i : Array.isArray(i) && i.length == 1 && i[0] instanceof st ? i[0] : dt(t, ht(i), !1);
	}
	return e;
}
function pt(e) {
	let t = e.startState, n = t.facet(nt), r = e;
	for (let i = n.length - 1; i >= 0; i--) {
		let a = n[i](e);
		a && Object.keys(a).length && (r = lt(r, ut(t, a, e.changes.newLength), !0));
	}
	return r == e ? e : st.create(t, e.changes, e.selection, r.effects, r.annotations, r.scrollIntoView);
}
var mt = [];
function ht(e) {
	return e == null ? mt : Array.isArray(e) ? e : [e];
}
var O = /*@__PURE__*/ (function(e) {
	return e[e.Word = 0] = "Word", e[e.Space = 1] = "Space", e[e.Other = 2] = "Other", e;
})(O ||= {}), gt = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/, _t;
try {
	_t = /*@__PURE__*/ RegExp("[\\p{Alphabetic}\\p{Number}_]", "u");
} catch {}
function vt(e) {
	if (_t) return _t.test(e);
	for (let t = 0; t < e.length; t++) {
		let n = e[t];
		if (/\w/.test(n) || n > "" && (n.toUpperCase() != n.toLowerCase() || gt.test(n))) return !0;
	}
	return !1;
}
function yt(e) {
	return (t) => {
		if (!/\S/.test(t)) return O.Space;
		if (vt(t)) return O.Word;
		for (let n = 0; n < e.length; n++) if (t.indexOf(e[n]) > -1) return O.Word;
		return O.Other;
	};
}
var k = class e {
	constructor(e, t, n, r, i, a) {
		this.config = e, this.doc = t, this.selection = n, this.values = r, this.status = e.statusTemplate.slice(), this.computeSlot = i, a && (a._state = this);
		for (let e = 0; e < this.config.dynamicSlots.length; e++) Ye(this, e << 1);
		this.computeSlot = null;
	}
	field(e, t = !0) {
		let n = this.config.address[e.id];
		if (n == null) {
			if (t) throw RangeError("Field is not present in this state");
			return;
		}
		return Ye(this, n), Xe(this, n);
	}
	update(...e) {
		return dt(this, e, !0);
	}
	applyTransaction(t) {
		let n = this.config, { base: r, compartments: i } = n;
		for (let e of t.effects) e.is(Ge.reconfigure) ? (n &&= (i = /* @__PURE__ */ new Map(), n.compartments.forEach((e, t) => i.set(t, e)), null), i.set(e.value.compartment, e.value.extension)) : e.is(D.reconfigure) ? (n = null, r = e.value) : e.is(D.appendConfig) && (n = null, r = ht(r).concat(e.value));
		let a;
		n ? a = t.startState.values.slice() : (n = qe.resolve(r, i, this), a = new e(n, this.doc, this.selection, n.dynamicSlots.map(() => null), (e, t) => t.reconfigure(e, this), null).values);
		let o = t.startState.facet(Qe) ? t.newSelection : t.newSelection.asSingle();
		new e(n, t.newDoc, o, a, (e, n) => n.update(e, t), t);
	}
	replaceSelection(e) {
		return typeof e == "string" && (e = this.toText(e)), this.changeByRange((t) => ({
			changes: {
				from: t.from,
				to: t.to,
				insert: e
			},
			range: T.cursor(t.from + e.length)
		}));
	}
	changeByRange(e) {
		let t = this.selection, n = e(t.ranges[0]), r = this.changes(n.changes), i = [n.range], a = ht(n.effects);
		for (let n = 1; n < t.ranges.length; n++) {
			let o = e(t.ranges[n]), s = this.changes(o.changes), c = s.map(r);
			for (let e = 0; e < n; e++) i[e] = i[e].map(c);
			let l = r.mapDesc(s, !0);
			i.push(o.range.map(l)), r = r.compose(c), a = D.mapEffects(a, c).concat(D.mapEffects(ht(o.effects), l));
		}
		return {
			changes: r,
			selection: T.create(i, t.mainIndex),
			effects: a
		};
	}
	changes(t = []) {
		return t instanceof we ? t : we.of(t, this.doc.length, this.facet(e.lineSeparator));
	}
	toText(t) {
		return C.of(t.split(this.facet(e.lineSeparator) || xe));
	}
	sliceDoc(e = 0, t = this.doc.length) {
		return this.doc.sliceString(e, t, this.lineBreak);
	}
	facet(e) {
		let t = this.config.address[e.id];
		return t == null ? e.default : (Ye(this, t), Xe(this, t));
	}
	toJSON(e) {
		let t = {
			doc: this.sliceDoc(),
			selection: this.selection.toJSON()
		};
		if (e) for (let n in e) {
			let r = e[n];
			r instanceof Be && this.config.address[r.id] != null && (t[n] = r.spec.toJSON(this.field(e[n]), this));
		}
		return t;
	}
	static fromJSON(t, n = {}, r) {
		if (!t || typeof t.doc != "string") throw RangeError("Invalid JSON representation for EditorState");
		let i = [];
		if (r) {
			for (let e in r) if (Object.prototype.hasOwnProperty.call(t, e)) {
				let n = r[e], a = t[e];
				i.push(n.init((e) => n.spec.fromJSON(a, e)));
			}
		}
		return e.create({
			doc: t.doc,
			selection: T.fromJSON(t.selection),
			extensions: n.extensions ? i.concat([n.extensions]) : i
		});
	}
	static create(t = {}) {
		let n = qe.resolve(t.extensions || [], /* @__PURE__ */ new Map()), r = t.doc instanceof C ? t.doc : C.of((t.doc || "").split(n.staticFacet(e.lineSeparator) || xe)), i = t.selection ? t.selection instanceof T ? t.selection : T.single(t.selection.anchor, t.selection.head) : T.single(0);
		return Me(i, r.length), n.staticFacet(Qe) || (i = i.asSingle()), new e(n, r, i, n.dynamicSlots.map(() => null), (e, t) => t.create(e), null);
	}
	get tabSize() {
		return this.facet(e.tabSize);
	}
	get lineBreak() {
		return this.facet(e.lineSeparator) || "\n";
	}
	get readOnly() {
		return this.facet(rt);
	}
	phrase(t, ...n) {
		for (let n of this.facet(e.phrases)) if (Object.prototype.hasOwnProperty.call(n, t)) {
			t = n[t];
			break;
		}
		return n.length && (t = t.replace(/\$(\$|\d*)/g, (e, t) => {
			if (t == "$") return "$";
			let r = +(t || 1);
			return !r || r > n.length ? e : n[r - 1];
		})), t;
	}
	languageDataAt(e, t, n = -1) {
		let r = [];
		for (let i of this.facet(Ze)) for (let a of i(this, t, n)) Object.prototype.hasOwnProperty.call(a, e) && r.push(a[e]);
		return r;
	}
	charCategorizer(e) {
		let t = this.languageDataAt("wordChars", e);
		return yt(t.length ? t[0] : "");
	}
	wordAt(e) {
		let { text: t, from: n, length: r } = this.doc.lineAt(e), i = this.charCategorizer(e), a = e - n, o = e - n;
		for (; a > 0;) {
			let e = w(t, a, !1);
			if (i(t.slice(e, a)) != O.Word) break;
			a = e;
		}
		for (; o < r;) {
			let e = w(t, o);
			if (i(t.slice(o, e)) != O.Word) break;
			o = e;
		}
		return a == o ? null : T.range(a + n, o + n);
	}
};
k.allowMultipleSelections = Qe, k.tabSize = /*@__PURE__*/ E.define({ combine: (e) => e.length ? e[0] : 4 }), k.lineSeparator = $e, k.readOnly = rt, k.phrases = /*@__PURE__*/ E.define({ compare(e, t) {
	let n = Object.keys(e), r = Object.keys(t);
	return n.length == r.length && n.every((n) => e[n] == t[n]);
} }), k.languageData = Ze, k.changeFilter = et, k.transactionFilter = tt, k.transactionExtender = nt, Ge.reconfigure = /*@__PURE__*/ D.define();
function bt(e, t, n = {}) {
	let r = {};
	for (let t of e) for (let e of Object.keys(t)) {
		let i = t[e], a = r[e];
		if (a === void 0) r[e] = i;
		else if (a !== i && i !== void 0) {
			if (Object.hasOwnProperty.call(n, e)) r[e] = n[e](a, i);
			else throw Error("Config merge conflict for field " + e);
		}
	}
	for (let e in t) r[e] === void 0 && (r[e] = t[e]);
	return r;
}
var xt = class {
	eq(e) {
		return this == e;
	}
	range(e, t = e) {
		return Ct.create(e, t, this);
	}
};
xt.prototype.startSide = xt.prototype.endSide = 0, xt.prototype.point = !1, xt.prototype.mapMode = Se.TrackDel;
function St(e, t) {
	return e == t || e.constructor == t.constructor && e.eq(t);
}
var Ct = class e {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.value = n;
	}
	static create(t, n, r) {
		return new e(t, n, r);
	}
};
function wt(e, t) {
	return e.from - t.from || e.value.startSide - t.value.startSide;
}
var Tt = class e {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.value = n, this.maxPoint = r;
	}
	get length() {
		return this.to[this.to.length - 1];
	}
	findIndex(e, t, n, r = 0) {
		let i = n ? this.to : this.from;
		for (let a = r, o = i.length;;) {
			if (a == o) return a;
			let r = a + o >> 1, s = i[r] - e || (n ? this.value[r].endSide : this.value[r].startSide) - t;
			if (r == a) return s >= 0 ? a : o;
			s >= 0 ? o = r : a = r + 1;
		}
	}
	between(e, t, n, r) {
		for (let i = this.findIndex(t, -1e9, !0), a = this.findIndex(n, 1e9, !1, i); i < a; i++) if (r(this.from[i] + e, this.to[i] + e, this.value[i]) === !1) return !1;
	}
	map(t, n) {
		let r = [], i = [], a = [], o = -1, s = -1;
		for (let e = 0; e < this.value.length; e++) {
			let c = this.value[e], l = this.from[e] + t, u = this.to[e] + t, d, f;
			if (l == u) {
				let e = n.mapPos(l, c.startSide, c.mapMode);
				if (e == null || (d = f = e, c.startSide != c.endSide && (f = n.mapPos(l, c.endSide), f < d))) continue;
			} else if (d = n.mapPos(l, c.startSide), f = n.mapPos(u, c.endSide), d > f || d == f && c.startSide > 0 && c.endSide <= 0) continue;
			(f - d || c.endSide - c.startSide) < 0 || (o < 0 && (o = d), c.point && (s = Math.max(s, f - d)), r.push(c), i.push(d - o), a.push(f - o));
		}
		return {
			mapped: r.length ? new e(i, a, r, s) : null,
			pos: o
		};
	}
}, A = class e {
	constructor(e, t, n, r) {
		this.chunkPos = e, this.chunk = t, this.nextLayer = n, this.maxPoint = r;
	}
	static create(t, n, r, i) {
		return new e(t, n, r, i);
	}
	get length() {
		let e = this.chunk.length - 1;
		return e < 0 ? 0 : Math.max(this.chunkEnd(e), this.nextLayer.length);
	}
	get size() {
		if (this.isEmpty) return 0;
		let e = this.nextLayer.size;
		for (let t of this.chunk) e += t.value.length;
		return e;
	}
	chunkEnd(e) {
		return this.chunkPos[e] + this.chunk[e].length;
	}
	update(t) {
		let { add: n = [], sort: r = !1, filterFrom: i = 0, filterTo: a = this.length } = t, o = t.filter;
		if (n.length == 0 && !o) return this;
		if (r && (n = n.slice().sort(wt)), this.isEmpty) return n.length ? e.of(n) : this;
		let s = new kt(this, null, -1).goto(0), c = 0, l = [], u = new Dt();
		for (; s.value || c < n.length;) if (c < n.length && (s.from - n[c].from || s.startSide - n[c].value.startSide) >= 0) {
			let e = n[c++];
			u.addInner(e.from, e.to, e.value) || l.push(e);
		} else s.rangeIndex == 1 && s.chunkIndex < this.chunk.length && (c == n.length || this.chunkEnd(s.chunkIndex) < n[c].from) && (!o || i > this.chunkEnd(s.chunkIndex) || a < this.chunkPos[s.chunkIndex]) && u.addChunk(this.chunkPos[s.chunkIndex], this.chunk[s.chunkIndex]) ? s.nextChunk() : ((!o || i > s.to || a < s.from || o(s.from, s.to, s.value)) && (u.addInner(s.from, s.to, s.value) || l.push(Ct.create(s.from, s.to, s.value))), s.next());
		return u.finishInner(this.nextLayer.isEmpty && !l.length ? e.empty : this.nextLayer.update({
			add: l,
			filter: o,
			filterFrom: i,
			filterTo: a
		}));
	}
	map(t) {
		if (t.empty || this.isEmpty) return this;
		let n = [], r = [], i = -1;
		for (let e = 0; e < this.chunk.length; e++) {
			let a = this.chunkPos[e], o = this.chunk[e], s = t.touchesRange(a, a + o.length);
			if (s === !1) i = Math.max(i, o.maxPoint), n.push(o), r.push(t.mapPos(a));
			else if (s === !0) {
				let { mapped: e, pos: s } = o.map(a, t);
				e && (i = Math.max(i, e.maxPoint), n.push(e), r.push(s));
			}
		}
		let a = this.nextLayer.map(t);
		return n.length == 0 ? a : new e(r, n, a || e.empty, i);
	}
	between(e, t, n) {
		if (!this.isEmpty) {
			for (let r = 0; r < this.chunk.length; r++) {
				let i = this.chunkPos[r], a = this.chunk[r];
				if (t >= i && e <= i + a.length && a.between(i, e - i, t - i, n) === !1) return;
			}
			this.nextLayer.between(e, t, n);
		}
	}
	iter(e = 0) {
		return At.from([this]).goto(e);
	}
	get isEmpty() {
		return this.nextLayer == this;
	}
	static iter(e, t = 0) {
		return At.from(e).goto(t);
	}
	static compare(e, t, n, r, i = -1) {
		let a = e.filter((e) => e.maxPoint > 0 || !e.isEmpty && e.maxPoint >= i), o = t.filter((e) => e.maxPoint > 0 || !e.isEmpty && e.maxPoint >= i), s = Ot(a, o, n), c = new Mt(a, s, i), l = new Mt(o, s, i);
		n.iterGaps((e, t, n) => Nt(c, e, l, t, n, r)), n.empty && n.length == 0 && Nt(c, 0, l, 0, 0, r);
	}
	static eq(e, t, n = 0, r) {
		r ??= 1e9 - 1;
		let i = e.filter((e) => !e.isEmpty && t.indexOf(e) < 0), a = t.filter((t) => !t.isEmpty && e.indexOf(t) < 0);
		if (i.length != a.length) return !1;
		if (!i.length) return !0;
		let o = Ot(i, a), s = new Mt(i, o, 0).goto(n), c = new Mt(a, o, 0).goto(n);
		for (;;) {
			if (s.to != c.to || !Pt(s.active, c.active) || s.point && (!c.point || !St(s.point, c.point))) return !1;
			if (s.to > r) return !0;
			s.next(), c.next();
		}
	}
	static spans(e, t, n, r, i = -1) {
		let a = new Mt(e, null, i).goto(t), o = t, s = a.openStart;
		for (;;) {
			let e = Math.min(a.to, n);
			if (a.point) {
				let n = a.activeForPoint(a.to), i = a.pointFrom < t ? n.length + 1 : a.point.startSide < 0 ? n.length : Math.min(n.length, s);
				r.point(o, e, a.point, n, i, a.pointRank), s = Math.min(a.openEnd(e), n.length);
			} else e > o && (r.span(o, e, a.active, s), s = a.openEnd(e));
			if (a.to > n) return s + (a.point && a.to > n ? 1 : 0);
			o = a.to, a.next();
		}
	}
	static of(e, t = !1) {
		let n = new Dt();
		for (let r of e instanceof Ct ? [e] : t ? Et(e) : e) n.add(r.from, r.to, r.value);
		return n.finish();
	}
	static join(t) {
		if (!t.length) return e.empty;
		let n = t[t.length - 1];
		for (let r = t.length - 2; r >= 0; r--) for (let i = t[r]; i != e.empty; i = i.nextLayer) n = new e(i.chunkPos, i.chunk, n, Math.max(i.maxPoint, n.maxPoint));
		return n;
	}
};
A.empty = /*@__PURE__*/ new A([], [], null, -1);
function Et(e) {
	if (e.length > 1) for (let t = e[0], n = 1; n < e.length; n++) {
		let r = e[n];
		if (wt(t, r) > 0) return e.slice().sort(wt);
		t = r;
	}
	return e;
}
A.empty.nextLayer = A.empty;
var Dt = class e {
	finishChunk(e) {
		this.chunks.push(new Tt(this.from, this.to, this.value, this.maxPoint)), this.chunkPos.push(this.chunkStart), this.chunkStart = -1, this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint), this.maxPoint = -1, e && (this.from = [], this.to = [], this.value = []);
	}
	constructor() {
		this.chunks = [], this.chunkPos = [], this.chunkStart = -1, this.last = null, this.lastFrom = -1e9, this.lastTo = -1e9, this.from = [], this.to = [], this.value = [], this.maxPoint = -1, this.setMaxPoint = -1, this.nextLayer = null;
	}
	add(t, n, r) {
		this.addInner(t, n, r) || (this.nextLayer ||= new e()).add(t, n, r);
	}
	addInner(e, t, n) {
		let r = e - this.lastTo || n.startSide - this.last.endSide;
		if (r <= 0 && (e - this.lastFrom || n.startSide - this.last.startSide) < 0) throw Error("Ranges must be added sorted by `from` position and `startSide`");
		return r < 0 ? !1 : (this.from.length == 250 && this.finishChunk(!0), this.chunkStart < 0 && (this.chunkStart = e), this.from.push(e - this.chunkStart), this.to.push(t - this.chunkStart), this.last = n, this.lastFrom = e, this.lastTo = t, this.value.push(n), n.point && (this.maxPoint = Math.max(this.maxPoint, t - e)), !0);
	}
	addChunk(e, t) {
		if ((e - this.lastTo || t.value[0].startSide - this.last.endSide) < 0) return !1;
		this.from.length && this.finishChunk(!0), this.setMaxPoint = Math.max(this.setMaxPoint, t.maxPoint), this.chunks.push(t), this.chunkPos.push(e);
		let n = t.value.length - 1;
		return this.last = t.value[n], this.lastFrom = t.from[n] + e, this.lastTo = t.to[n] + e, !0;
	}
	finish() {
		return this.finishInner(A.empty);
	}
	finishInner(e) {
		if (this.from.length && this.finishChunk(!1), this.chunks.length == 0) return e;
		let t = A.create(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(e) : e, this.setMaxPoint);
		return this.from = null, t;
	}
};
function Ot(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let t of e) for (let e = 0; e < t.chunk.length; e++) t.chunk[e].maxPoint <= 0 && r.set(t.chunk[e], t.chunkPos[e]);
	let i = /* @__PURE__ */ new Set();
	for (let e of t) for (let t = 0; t < e.chunk.length; t++) {
		let a = r.get(e.chunk[t]);
		a != null && (n ? n.mapPos(a) : a) == e.chunkPos[t] && !n?.touchesRange(a, a + e.chunk[t].length) && i.add(e.chunk[t]);
	}
	return i;
}
var kt = class {
	constructor(e, t, n, r = 0) {
		this.layer = e, this.skip = t, this.minPoint = n, this.rank = r;
	}
	get startSide() {
		return this.value ? this.value.startSide : 0;
	}
	get endSide() {
		return this.value ? this.value.endSide : 0;
	}
	goto(e, t = -1e9) {
		return this.chunkIndex = this.rangeIndex = 0, this.gotoInner(e, t, !1), this;
	}
	gotoInner(e, t, n) {
		for (; this.chunkIndex < this.layer.chunk.length;) {
			let t = this.layer.chunk[this.chunkIndex];
			if (!(this.skip && this.skip.has(t) || this.layer.chunkEnd(this.chunkIndex) < e || t.maxPoint < this.minPoint)) break;
			this.chunkIndex++, n = !1;
		}
		if (this.chunkIndex < this.layer.chunk.length) {
			let r = this.layer.chunk[this.chunkIndex].findIndex(e - this.layer.chunkPos[this.chunkIndex], t, !0);
			(!n || this.rangeIndex < r) && this.setRangeIndex(r);
		}
		this.next();
	}
	forward(e, t) {
		(this.to - e || this.endSide - t) < 0 && this.gotoInner(e, t, !0);
	}
	next() {
		for (;;) if (this.chunkIndex == this.layer.chunk.length) {
			this.from = this.to = 1e9, this.value = null;
			break;
		} else {
			let e = this.layer.chunkPos[this.chunkIndex], t = this.layer.chunk[this.chunkIndex], n = e + t.from[this.rangeIndex];
			if (this.from = n, this.to = e + t.to[this.rangeIndex], this.value = t.value[this.rangeIndex], this.setRangeIndex(this.rangeIndex + 1), this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint) break;
		}
	}
	setRangeIndex(e) {
		if (e == this.layer.chunk[this.chunkIndex].value.length) {
			if (this.chunkIndex++, this.skip) for (; this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex]);) this.chunkIndex++;
			this.rangeIndex = 0;
		} else this.rangeIndex = e;
	}
	nextChunk() {
		this.chunkIndex++, this.rangeIndex = 0, this.next();
	}
	compare(e) {
		return this.from - e.from || this.startSide - e.startSide || this.rank - e.rank || this.to - e.to || this.endSide - e.endSide;
	}
}, At = class e {
	constructor(e) {
		this.heap = e;
	}
	static from(t, n = null, r = -1) {
		let i = [];
		for (let e = 0; e < t.length; e++) for (let a = t[e]; !a.isEmpty; a = a.nextLayer) a.maxPoint >= r && i.push(new kt(a, n, r, e));
		return i.length == 1 ? i[0] : new e(i);
	}
	get startSide() {
		return this.value ? this.value.startSide : 0;
	}
	goto(e, t = -1e9) {
		for (let n of this.heap) n.goto(e, t);
		for (let e = this.heap.length >> 1; e >= 0; e--) jt(this.heap, e);
		return this.next(), this;
	}
	forward(e, t) {
		for (let n of this.heap) n.forward(e, t);
		for (let e = this.heap.length >> 1; e >= 0; e--) jt(this.heap, e);
		(this.to - e || this.value.endSide - t) < 0 && this.next();
	}
	next() {
		if (this.heap.length == 0) this.from = this.to = 1e9, this.value = null, this.rank = -1;
		else {
			let e = this.heap[0];
			this.from = e.from, this.to = e.to, this.value = e.value, this.rank = e.rank, e.value && e.next(), jt(this.heap, 0);
		}
	}
};
function jt(e, t) {
	for (let n = e[t];;) {
		let r = (t << 1) + 1;
		if (r >= e.length) break;
		let i = e[r];
		if (r + 1 < e.length && i.compare(e[r + 1]) >= 0 && (i = e[r + 1], r++), n.compare(i) < 0) break;
		e[r] = n, e[t] = i, t = r;
	}
}
var Mt = class {
	constructor(e, t, n) {
		this.minPoint = n, this.active = [], this.activeTo = [], this.activeRank = [], this.minActive = -1, this.point = null, this.pointFrom = 0, this.pointRank = 0, this.to = -1e9, this.endSide = 0, this.openStart = -1, this.cursor = At.from(e, t, n);
	}
	goto(e, t = -1e9) {
		return this.cursor.goto(e, t), this.active.length = this.activeTo.length = this.activeRank.length = 0, this.minActive = -1, this.to = e, this.endSide = t, this.openStart = -1, this.next(), this;
	}
	forward(e, t) {
		for (; this.minActive > -1 && (this.activeTo[this.minActive] - e || this.active[this.minActive].endSide - t) < 0;) this.removeActive(this.minActive);
		this.cursor.forward(e, t);
	}
	removeActive(e) {
		Ft(this.active, e), Ft(this.activeTo, e), Ft(this.activeRank, e), this.minActive = Lt(this.active, this.activeTo);
	}
	addActive(e) {
		let t = 0, { value: n, to: r, rank: i } = this.cursor;
		for (; t < this.activeRank.length && (i - this.activeRank[t] || r - this.activeTo[t]) > 0;) t++;
		It(this.active, t, n), It(this.activeTo, t, r), It(this.activeRank, t, i), e && It(e, t, this.cursor.from), this.minActive = Lt(this.active, this.activeTo);
	}
	next() {
		let e = this.to, t = this.point;
		this.point = null;
		let n = this.openStart < 0 ? [] : null;
		for (;;) {
			let r = this.minActive;
			if (r > -1 && (this.activeTo[r] - this.cursor.from || this.active[r].endSide - this.cursor.startSide) < 0) {
				if (this.activeTo[r] > e) {
					this.to = this.activeTo[r], this.endSide = this.active[r].endSide;
					break;
				}
				this.removeActive(r), n && Ft(n, r);
			} else if (!this.cursor.value) {
				this.to = this.endSide = 1e9;
				break;
			} else if (this.cursor.from > e) {
				this.to = this.cursor.from, this.endSide = this.cursor.startSide;
				break;
			} else {
				let e = this.cursor.value;
				if (!e.point) this.addActive(n), this.cursor.next();
				else if (t && this.cursor.to == this.to && this.cursor.from < this.cursor.to) this.cursor.next();
				else {
					this.point = e, this.pointFrom = this.cursor.from, this.pointRank = this.cursor.rank, this.to = this.cursor.to, this.endSide = e.endSide, this.cursor.next(), this.forward(this.to, this.endSide);
					break;
				}
			}
		}
		if (n) {
			this.openStart = 0;
			for (let t = n.length - 1; t >= 0 && n[t] < e; t--) this.openStart++;
		}
	}
	activeForPoint(e) {
		if (!this.active.length) return this.active;
		let t = [];
		for (let n = this.active.length - 1; n >= 0 && !(this.activeRank[n] < this.pointRank); n--) (this.activeTo[n] > e || this.activeTo[n] == e && this.active[n].endSide >= this.point.endSide) && t.push(this.active[n]);
		return t.reverse();
	}
	openEnd(e) {
		let t = 0;
		for (let n = this.activeTo.length - 1; n >= 0 && this.activeTo[n] > e; n--) t++;
		return t;
	}
};
function Nt(e, t, n, r, i, a) {
	e.goto(t), n.goto(r);
	let o = r + i, s = r, c = r - t, l = !!a.boundChange;
	for (let t = !1;;) {
		let r = e.to + c - n.to, i = r || e.endSide - n.endSide, u = i < 0 ? e.to + c : n.to, d = Math.min(u, o);
		if (e.point || n.point ? (e.point && n.point && St(e.point, n.point) && Pt(e.activeForPoint(e.to), n.activeForPoint(n.to)) || a.comparePoint(s, d, e.point, n.point), t = !1) : (t && a.boundChange(s), d > s && !Pt(e.active, n.active) && a.compareRange(s, d, e.active, n.active), l && d < o && (r || e.openEnd(u) != n.openEnd(u)) && (t = !0)), u > o) break;
		s = u, i <= 0 && e.next(), i >= 0 && n.next();
	}
}
function Pt(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (e[n] != t[n] && !St(e[n], t[n])) return !1;
	return !0;
}
function Ft(e, t) {
	for (let n = t, r = e.length - 1; n < r; n++) e[n] = e[n + 1];
	e.pop();
}
function It(e, t, n) {
	for (let n = e.length - 1; n >= t; n--) e[n + 1] = e[n];
	e[t] = n;
}
function Lt(e, t) {
	let n = -1, r = 1e9;
	for (let i = 0; i < t.length; i++) (t[i] - r || e[i].endSide - e[n].endSide) < 0 && (n = i, r = t[i]);
	return n;
}
function Rt(e, t, n = e.length) {
	let r = 0;
	for (let i = 0; i < n && i < e.length;) e.charCodeAt(i) == 9 ? (r += t - r % t, i++) : (r++, i = w(e, i));
	return r;
}
function zt(e, t, n, r) {
	for (let r = 0, i = 0;;) {
		if (i >= t) return r;
		if (r == e.length) break;
		i += e.charCodeAt(r) == 9 ? n - i % n : 1, r = w(e, r);
	}
	return r === !0 ? -1 : e.length;
}
for (var Bt = "ͼ", Vt = typeof Symbol > "u" ? "__ͼ" : Symbol.for(Bt), Ht = typeof Symbol > "u" ? "__styleSet" + Math.floor(Math.random() * 1e8) : Symbol("styleSet"), Ut = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : {}, Wt = class {
	constructor(e, t) {
		this.rules = [];
		let { finish: n } = t || {};
		function r(e) {
			return /^@/.test(e) ? [e] : e.split(/,\s*/);
		}
		function i(e, t, a, o) {
			let s = [], c = /^@(\w+)\b/.exec(e[0]), l = c && c[1] == "keyframes";
			if (c && t == null) return a.push(e[0] + ";");
			for (let n in t) {
				let o = t[n];
				if (/&/.test(n)) i(n.split(/,\s*/).map((t) => e.map((e) => t.replace(/&/, e))).reduce((e, t) => e.concat(t)), o, a);
				else if (o && typeof o == "object") {
					if (!c) throw RangeError("The value of a property (" + n + ") should be a primitive value.");
					i(r(n), o, s, l);
				} else o != null && s.push(n.replace(/_.*/, "").replace(/[A-Z]/g, (e) => "-" + e.toLowerCase()) + ": " + o + ";");
			}
			(s.length || l) && a.push((n && !c && !o ? e.map(n) : e).join(", ") + " {" + s.join(" ") + "}");
		}
		for (let t in e) i(r(t), e[t], this.rules);
	}
	getRules() {
		return this.rules.join("\n");
	}
	static newName() {
		let e = Ut[Vt] || 1;
		return Ut[Vt] = e + 1, Bt + e.toString(36);
	}
	static mount(e, t, n) {
		let r = e[Ht], i = n && n.nonce;
		r ? i && r.setNonce(i) : r = new Kt(e, i), r.mount(Array.isArray(t) ? t : [t], e);
	}
}, Gt = /* @__PURE__ */ new Map(), Kt = class {
	constructor(e, t) {
		let n = e.ownerDocument || e, r = n.defaultView;
		if (!e.head && e.adoptedStyleSheets && r.CSSStyleSheet) {
			let t = Gt.get(n);
			if (t) return e[Ht] = t;
			this.sheet = new r.CSSStyleSheet(), Gt.set(n, this);
		} else this.styleTag = n.createElement("style"), t && this.styleTag.setAttribute("nonce", t);
		this.modules = [], e[Ht] = this;
	}
	mount(e, t) {
		let n = this.sheet, r = 0, i = 0;
		for (let t = 0; t < e.length; t++) {
			let a = e[t], o = this.modules.indexOf(a);
			if (o < i && o > -1 && (this.modules.splice(o, 1), i--, o = -1), o == -1) {
				if (this.modules.splice(i++, 0, a), n) for (let e = 0; e < a.rules.length; e++) n.insertRule(a.rules[e], r++);
			} else {
				for (; i < o;) r += this.modules[i++].rules.length;
				r += a.rules.length, i++;
			}
		}
		if (n) t.adoptedStyleSheets.indexOf(this.sheet) < 0 && (t.adoptedStyleSheets = [this.sheet, ...t.adoptedStyleSheets]);
		else {
			let e = "";
			for (let t = 0; t < this.modules.length; t++) e += this.modules[t].getRules() + "\n";
			this.styleTag.textContent = e;
			let n = t.head || t;
			this.styleTag.parentNode != n && n.insertBefore(this.styleTag, n.firstChild);
		}
	}
	setNonce(e) {
		this.styleTag && this.styleTag.getAttribute("nonce") != e && this.styleTag.setAttribute("nonce", e);
	}
}, qt = {
	8: "Backspace",
	9: "Tab",
	10: "Enter",
	12: "NumLock",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	20: "CapsLock",
	27: "Escape",
	32: " ",
	33: "PageUp",
	34: "PageDown",
	35: "End",
	36: "Home",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown",
	44: "PrintScreen",
	45: "Insert",
	46: "Delete",
	59: ";",
	61: "=",
	91: "Meta",
	92: "Meta",
	106: "*",
	107: "+",
	108: ",",
	109: "-",
	110: ".",
	111: "/",
	144: "NumLock",
	145: "ScrollLock",
	160: "Shift",
	161: "Shift",
	162: "Control",
	163: "Control",
	164: "Alt",
	165: "Alt",
	173: "-",
	186: ";",
	187: "=",
	188: ",",
	189: "-",
	190: ".",
	191: "/",
	192: "`",
	219: "[",
	220: "\\",
	221: "]",
	222: "'"
}, Jt = {
	48: ")",
	49: "!",
	50: "@",
	51: "#",
	52: "$",
	53: "%",
	54: "^",
	55: "&",
	56: "*",
	57: "(",
	59: ":",
	61: "+",
	173: "_",
	186: ":",
	187: "+",
	188: "<",
	189: "_",
	190: ">",
	191: "?",
	192: "~",
	219: "{",
	220: "|",
	221: "}",
	222: "\""
}, Yt = typeof navigator < "u" && /Mac/.test(navigator.platform), Xt = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent), Zt = 0; Zt < 10; Zt++) qt[48 + Zt] = qt[96 + Zt] = String(Zt);
for (var Zt = 1; Zt <= 24; Zt++) qt[Zt + 111] = "F" + Zt;
for (var Zt = 65; Zt <= 90; Zt++) qt[Zt] = String.fromCharCode(Zt + 32), Jt[Zt] = String.fromCharCode(Zt);
for (var Qt in qt) Jt.hasOwnProperty(Qt) || (Jt[Qt] = qt[Qt]);
function $t(e) {
	var t = !(Yt && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey || Xt && e.shiftKey && e.key && e.key.length == 1 || e.key == "Unidentified") && e.key || (e.shiftKey ? Jt : qt)[e.keyCode] || e.key || "Unidentified";
	return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
//#endregion
//#region node_modules/crelt/index.js
function j() {
	var e = arguments[0];
	typeof e == "string" && (e = document.createElement(e));
	var t = 1, n = arguments[1];
	if (n && typeof n == "object" && n.nodeType == null && !Array.isArray(n)) {
		for (var r in n) if (Object.prototype.hasOwnProperty.call(n, r)) {
			var i = n[r];
			typeof i == "string" ? e.setAttribute(r, i) : i != null && (e[r] = i);
		}
		t++;
	}
	for (; t < arguments.length; t++) en(e, arguments[t]);
	return e;
}
function en(e, t) {
	if (typeof t == "string") e.appendChild(document.createTextNode(t));
	else if (t != null) {
		if (t.nodeType != null) e.appendChild(t);
		else if (Array.isArray(t)) for (var n = 0; n < t.length; n++) en(e, t[n]);
		else throw RangeError("Unsupported child node: " + t);
	}
}
//#endregion
//#region node_modules/@codemirror/view/dist/index.js
var tn = typeof navigator < "u" ? navigator : {
	userAgent: "",
	vendor: "",
	platform: ""
}, nn = typeof document < "u" ? document : { documentElement: { style: {} } }, rn = /*@__PURE__*/ /Edge\/(\d+)/.exec(tn.userAgent), an = /*@__PURE__*/ /MSIE \d/.test(tn.userAgent), on = /*@__PURE__*/ /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(tn.userAgent), sn = !!(an || on || rn), cn = !sn && /*@__PURE__*/ /gecko\/(\d+)/i.test(tn.userAgent), ln = !sn && /*@__PURE__*/ /Chrome\/(\d+)/.exec(tn.userAgent), un = "webkitFontSmoothing" in nn.documentElement.style, dn = !sn && /*@__PURE__*/ /Apple Computer/.test(tn.vendor), fn = dn && (/*@__PURE__*/ /Mobile\/\w+/.test(tn.userAgent) || tn.maxTouchPoints > 2), M = {
	mac: fn || /*@__PURE__*/ /Mac/.test(tn.platform),
	windows: /*@__PURE__*/ /Win/.test(tn.platform),
	linux: /*@__PURE__*/ /Linux|X11/.test(tn.platform),
	ie: sn,
	ie_version: an ? nn.documentMode || 6 : on ? +on[1] : rn ? +rn[1] : 0,
	gecko: cn,
	gecko_version: cn ? +(/*@__PURE__*/ /Firefox\/(\d+)/.exec(tn.userAgent) || [0, 0])[1] : 0,
	chrome: !!ln,
	chrome_version: ln ? +ln[1] : 0,
	ios: fn,
	android: /*@__PURE__*/ /Android\b/.test(tn.userAgent),
	webkit: un,
	webkit_version: un ? +(/*@__PURE__*/ /\bAppleWebKit\/(\d+)/.exec(tn.userAgent) || [0, 0])[1] : 0,
	safari: dn,
	safari_version: dn ? +(/*@__PURE__*/ /\bVersion\/(\d+(\.\d+)?)/.exec(tn.userAgent) || [0, 0])[1] : 0,
	tabSize: nn.documentElement.style.tabSize == null ? "-moz-tab-size" : "tab-size"
};
function pn(e, t) {
	for (let n in e) n == "class" && t.class ? t.class += " " + e.class : n == "style" && t.style ? t.style += ";" + e.style : t[n] = e[n];
	return t;
}
var mn = /*@__PURE__*/ Object.create(null);
function hn(e, t, n) {
	if (e == t) return !0;
	e ||= mn, t ||= mn;
	let r = Object.keys(e), i = Object.keys(t);
	if (r.length - (n && r.indexOf(n) > -1 ? 1 : 0) != i.length - (n && i.indexOf(n) > -1 ? 1 : 0)) return !1;
	for (let a of r) if (a != n && (i.indexOf(a) == -1 || e[a] !== t[a])) return !1;
	return !0;
}
function gn(e, t) {
	for (let n = e.attributes.length - 1; n >= 0; n--) {
		let r = e.attributes[n].name;
		t[r] ?? e.removeAttribute(r);
	}
	for (let n in t) {
		let r = t[n];
		n == "style" ? e.style.cssText = r : e.getAttribute(n) != r && e.setAttribute(n, r);
	}
}
function _n(e, t, n) {
	let r = !1;
	if (t) for (let i in t) n && i in n || (r = !0, i == "style" ? e.style.cssText = "" : e.removeAttribute(i));
	if (n) for (let i in n) t && t[i] == n[i] || (r = !0, i == "style" ? e.style.cssText = n[i] : e.setAttribute(i, n[i]));
	return r;
}
function vn(e) {
	let t = Object.create(null);
	for (let n = 0; n < e.attributes.length; n++) {
		let r = e.attributes[n];
		t[r.name] = r.value;
	}
	return t;
}
var yn = class {
	eq(e) {
		return !1;
	}
	updateDOM(e, t, n) {
		return !1;
	}
	compare(e) {
		return this == e || this.constructor == e.constructor && this.eq(e);
	}
	get estimatedHeight() {
		return -1;
	}
	get lineBreaks() {
		return 0;
	}
	ignoreEvent(e) {
		return !0;
	}
	coordsAt(e, t, n) {
		return null;
	}
	get isHidden() {
		return !1;
	}
	get editable() {
		return !1;
	}
	destroy(e) {}
}, bn = /*@__PURE__*/ (function(e) {
	return e[e.Text = 0] = "Text", e[e.WidgetBefore = 1] = "WidgetBefore", e[e.WidgetAfter = 2] = "WidgetAfter", e[e.WidgetRange = 3] = "WidgetRange", e;
})(bn ||= {}), N = class extends xt {
	constructor(e, t, n, r) {
		super(), this.startSide = e, this.endSide = t, this.widget = n, this.spec = r;
	}
	get heightRelevant() {
		return !1;
	}
	static mark(e) {
		return new xn(e);
	}
	static widget(e) {
		let t = Math.max(-1e4, Math.min(1e4, e.side || 0)), n = !!e.block;
		return t += n && !e.inlineOrder ? t > 0 ? 3e8 : -4e8 : t > 0 ? 1e8 : -1e8, new Cn(e, t, t, n, e.widget || null, !1);
	}
	static replace(e) {
		let t = !!e.block, n, r;
		if (e.isBlockGap) n = -5e8, r = 4e8;
		else {
			let { start: i, end: a } = wn(e, t);
			n = (i ? t ? -3e8 : -1 : 5e8) - 1, r = (a ? t ? 2e8 : 1 : -6e8) + 1;
		}
		return new Cn(e, n, r, t, e.widget || null, !0);
	}
	static line(e) {
		return new Sn(e);
	}
	static set(e, t = !1) {
		return A.of(e, t);
	}
	hasHeight() {
		return this.widget ? this.widget.estimatedHeight > -1 : !1;
	}
};
N.none = A.empty;
var xn = class e extends N {
	constructor(e) {
		let { start: t, end: n } = wn(e);
		super(t ? -1 : 5e8, n ? 1 : -6e8, null, e), this.tagName = e.tagName || "span", this.attrs = e.class && e.attributes ? pn(e.attributes, { class: e.class }) : e.class ? { class: e.class } : e.attributes || mn;
	}
	eq(t) {
		return this == t || t instanceof e && this.tagName == t.tagName && hn(this.attrs, t.attrs);
	}
	range(e, t = e) {
		if (e >= t) throw RangeError("Mark decorations may not be empty");
		return super.range(e, t);
	}
};
xn.prototype.point = !1;
var Sn = class e extends N {
	constructor(e) {
		super(-2e8, -2e8, null, e);
	}
	eq(t) {
		return t instanceof e && this.spec.class == t.spec.class && hn(this.spec.attributes, t.spec.attributes);
	}
	range(e, t = e) {
		if (t != e) throw RangeError("Line decoration ranges must be zero-length");
		return super.range(e, t);
	}
};
Sn.prototype.mapMode = Se.TrackBefore, Sn.prototype.point = !0;
var Cn = class e extends N {
	constructor(e, t, n, r, i, a) {
		super(t, n, i, e), this.block = r, this.isReplace = a, this.mapMode = r ? t <= 0 ? Se.TrackBefore : Se.TrackAfter : Se.TrackDel;
	}
	get type() {
		return this.startSide == this.endSide ? this.startSide <= 0 ? bn.WidgetBefore : bn.WidgetAfter : bn.WidgetRange;
	}
	get heightRelevant() {
		return this.block || !!this.widget && (this.widget.estimatedHeight >= 5 || this.widget.lineBreaks > 0);
	}
	eq(t) {
		return t instanceof e && Tn(this.widget, t.widget) && this.block == t.block && this.startSide == t.startSide && this.endSide == t.endSide;
	}
	range(e, t = e) {
		if (this.isReplace && (e > t || e == t && this.startSide > 0 && this.endSide <= 0)) throw RangeError("Invalid range for replacement decoration");
		if (!this.isReplace && t != e) throw RangeError("Widget decorations can only have zero-length ranges");
		return super.range(e, t);
	}
};
Cn.prototype.point = !0;
function wn(e, t = !1) {
	let { inclusiveStart: n, inclusiveEnd: r } = e;
	return n ??= e.inclusive, r ??= e.inclusive, {
		start: n ?? t,
		end: r ?? t
	};
}
function Tn(e, t) {
	return e == t || !!(e && t && e.compare(t));
}
function En(e, t, n, r = 0) {
	let i = n.length - 1;
	i >= 0 && n[i] + r >= e ? n[i] = Math.max(n[i], t) : n.push(e, t);
}
var Dn = class e extends xt {
	constructor(e, t, n) {
		super(), this.tagName = e, this.attributes = t, this.rank = n;
	}
	eq(t) {
		return t == this || t instanceof e && this.tagName == t.tagName && hn(this.attributes, t.attributes);
	}
	static create(t) {
		return new e(t.tagName, t.attributes || mn, t.rank == null ? 50 : Math.max(0, Math.min(t.rank, 100)));
	}
	static set(e, t = !1) {
		return A.of(e, t);
	}
};
Dn.prototype.startSide = Dn.prototype.endSide = -1;
function On(e) {
	let t;
	return t = e.nodeType == 11 ? e.getSelection ? e : e.ownerDocument : e, t.getSelection();
}
function kn(e, t) {
	return t ? e == t || e.contains(t.nodeType == 1 ? t : t.parentNode) : !1;
}
function An(e, t) {
	if (!t.anchorNode) return !1;
	try {
		return kn(e, t.anchorNode);
	} catch {
		return !1;
	}
}
function jn(e) {
	return e.nodeType == 3 ? Jn(e, 0, e.nodeValue.length).getClientRects() : e.nodeType == 1 ? e.getClientRects() : [];
}
function Mn(e, t, n, r) {
	return n ? Fn(e, t, n, r, -1) || Fn(e, t, n, r, 1) : !1;
}
function Nn(e) {
	for (var t = 0;; t++) if (e = e.previousSibling, !e) return t;
}
function Pn(e) {
	return e.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(e.nodeName);
}
function Fn(e, t, n, r, i) {
	for (;;) {
		if (e == n && t == r) return !0;
		if (t == (i < 0 ? 0 : In(e))) {
			if (e.nodeName == "DIV") return !1;
			let n = e.parentNode;
			if (!n || n.nodeType != 1) return !1;
			t = Nn(e) + (i < 0 ? 0 : 1), e = n;
		} else if (e.nodeType == 1) {
			if (e = e.childNodes[t + (i < 0 ? -1 : 0)], e.nodeType == 1 && e.contentEditable == "false") return !1;
			t = i < 0 ? In(e) : 0;
		} else return !1;
	}
}
function In(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function Ln(e, t) {
	let { left: n, right: r } = e;
	if (n == r) return e;
	let i = t ? n : r;
	return {
		left: i,
		right: i,
		top: e.top,
		bottom: e.bottom
	};
}
function Rn(e) {
	let t = e.visualViewport;
	return t ? {
		left: 0,
		right: t.width,
		top: 0,
		bottom: t.height
	} : {
		left: 0,
		right: e.innerWidth,
		top: 0,
		bottom: e.innerHeight
	};
}
function zn(e, t) {
	let n = t.width / e.offsetWidth, r = t.height / e.offsetHeight;
	return (n > .995 && n < 1.005 || !isFinite(n) || Math.abs(t.width - e.offsetWidth) < 1) && (n = 1), (r > .995 && r < 1.005 || !isFinite(r) || Math.abs(t.height - e.offsetHeight) < 1) && (r = 1), {
		scaleX: n,
		scaleY: r
	};
}
function Bn(e, t, n, r, i, a, o, s) {
	let c = e.ownerDocument, l = c.defaultView || window;
	for (let u = e, d = !1; u && !d;) if (u.nodeType == 1) {
		let e, f = u == c.body, p = 1, m = 1;
		if (f) e = Rn(l);
		else {
			if (/^(fixed|sticky)$/.test(getComputedStyle(u).position) && (d = !0), u.scrollHeight <= u.clientHeight && u.scrollWidth <= u.clientWidth) {
				u = u.assignedSlot || u.parentNode;
				continue;
			}
			let t = u.getBoundingClientRect();
			({scaleX: p, scaleY: m} = zn(u, t)), e = {
				left: t.left,
				right: t.left + u.clientWidth * p,
				top: t.top,
				bottom: t.top + u.clientHeight * m
			};
		}
		let h = 0, g = 0;
		if (i == "nearest") t.top < e.top + o ? (g = t.top - (e.top + o), n > 0 && t.bottom > e.bottom + g && (g = t.bottom - e.bottom + o)) : t.bottom > e.bottom - o && (g = t.bottom - e.bottom + o, n < 0 && t.top - g < e.top && (g = t.top - (e.top + o)));
		else {
			let r = t.bottom - t.top, a = e.bottom - e.top;
			g = (i == "center" && r <= a ? t.top + r / 2 - a / 2 : i == "start" || i == "center" && n < 0 ? t.top - o : t.bottom - a + o) - e.top;
		}
		if (r == "nearest" ? t.left < e.left + a ? (h = t.left - (e.left + a), n > 0 && t.right > e.right + h && (h = t.right - e.right + a)) : t.right > e.right - a && (h = t.right - e.right + a, n < 0 && t.left < e.left + h && (h = t.left - (e.left + a))) : h = (r == "center" ? t.left + (t.right - t.left) / 2 - (e.right - e.left) / 2 : r == "start" == s ? t.left - a : t.right - (e.right - e.left) + a) - e.left, h || g) {
			if (f) l.scrollBy(h, g);
			else {
				let e = 0, n = 0;
				if (g) {
					let e = u.scrollTop;
					u.scrollTop += g / m, n = (u.scrollTop - e) * m;
				}
				if (h) {
					let t = u.scrollLeft;
					u.scrollLeft += h / p, e = (u.scrollLeft - t) * p;
				}
				t = {
					left: t.left - e,
					top: t.top - n,
					right: t.right - e,
					bottom: t.bottom - n
				}, e && Math.abs(e - h) < 1 && (r = "nearest"), n && Math.abs(n - g) < 1 && (i = "nearest");
			}
		}
		if (f) break;
		(t.top < e.top || t.bottom > e.bottom || t.left < e.left || t.right > e.right) && (t = {
			left: Math.max(t.left, e.left),
			right: Math.min(t.right, e.right),
			top: Math.max(t.top, e.top),
			bottom: Math.min(t.bottom, e.bottom)
		}), u = u.assignedSlot || u.parentNode;
	} else if (u.nodeType == 11) u = u.host;
	else break;
}
function Vn(e, t = !0) {
	let n = e.ownerDocument, r = null, i = null;
	for (let a = e.parentNode; a && !(a == n.body || (!t || r) && i);) if (a.nodeType == 1) !i && a.scrollHeight > a.clientHeight && (i = a), t && !r && a.scrollWidth > a.clientWidth && (r = a), a = a.assignedSlot || a.parentNode;
	else if (a.nodeType == 11) a = a.host;
	else break;
	return {
		x: r,
		y: i
	};
}
var Hn = class {
	constructor() {
		this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
	}
	eq(e) {
		return this.anchorNode == e.anchorNode && this.anchorOffset == e.anchorOffset && this.focusNode == e.focusNode && this.focusOffset == e.focusOffset;
	}
	setRange(e) {
		let { anchorNode: t, focusNode: n } = e;
		this.set(t, Math.min(e.anchorOffset, t ? In(t) : 0), n, Math.min(e.focusOffset, n ? In(n) : 0));
	}
	set(e, t, n, r) {
		this.anchorNode = e, this.anchorOffset = t, this.focusNode = n, this.focusOffset = r;
	}
};
function Un(e) {
	let t = [];
	for (let n = e; n; n = n.nodeType == 11 ? n.host : n.parentNode) n.nodeType == 1 && t.push({
		node: n,
		left: n.scrollLeft,
		top: n.scrollTop
	});
	return t;
}
function Wn(e, t = !0) {
	for (let { node: n, left: r, top: i } of e) t && n.scrollTop != i && (n.scrollTop = i), n.scrollLeft != r && (n.scrollLeft = r);
}
var Gn = null;
M.safari && M.safari_version >= 26 && (Gn = !1);
function Kn(e) {
	if (e.setActive) return e.setActive();
	if (Gn) return e.focus(Gn);
	let t = Un(e);
	e.focus(Gn == null ? { get preventScroll() {
		return Gn = { preventScroll: !0 }, !0;
	} } : void 0), Gn || (Gn = !1, Wn(t));
}
var qn;
function Jn(e, t, n = t) {
	let r = qn ||= document.createRange();
	return r.setEnd(e, n), r.setStart(e, t), r;
}
function Yn(e, t, n, r) {
	let i = {
		key: t,
		code: t,
		keyCode: n,
		which: n,
		cancelable: !0
	};
	r && ({altKey: i.altKey, ctrlKey: i.ctrlKey, shiftKey: i.shiftKey, metaKey: i.metaKey} = r);
	let a = new KeyboardEvent("keydown", i);
	a.synthetic = !0, e.dispatchEvent(a);
	let o = new KeyboardEvent("keyup", i);
	return o.synthetic = !0, e.dispatchEvent(o), a.defaultPrevented || o.defaultPrevented;
}
function Xn(e) {
	for (; e;) {
		if (e && (e.nodeType == 9 || e.nodeType == 11 && e.host)) return e;
		e = e.assignedSlot || e.parentNode;
	}
	return null;
}
function Zn(e, t) {
	let n = t.focusNode, r = t.focusOffset;
	if (!n || t.anchorNode != n || t.anchorOffset != r) return !1;
	for (r = Math.min(r, In(n));;) if (r) {
		if (n.nodeType != 1) return !1;
		let e = n.childNodes[r - 1];
		e.contentEditable == "false" ? r-- : (n = e, r = In(n));
	} else if (n == e) return !0;
	else r = Nn(n), n = n.parentNode;
}
function Qn(e) {
	return e instanceof Window ? e.pageYOffset > Math.max(0, e.document.documentElement.scrollHeight - e.innerHeight - 4) : e.scrollTop > Math.max(1, e.scrollHeight - e.clientHeight - 4);
}
function $n(e, t) {
	for (let n = e, r = t;;) if (n.nodeType == 3 && r > 0) return {
		node: n,
		offset: r
	};
	else if (n.nodeType == 1 && r > 0) {
		if (n.contentEditable == "false") return null;
		n = n.childNodes[r - 1], r = In(n);
	} else if (n.parentNode && !Pn(n)) r = Nn(n), n = n.parentNode;
	else return null;
}
function er(e, t) {
	for (let n = e, r = t;;) if (n.nodeType == 3 && r < n.nodeValue.length) return {
		node: n,
		offset: r
	};
	else if (n.nodeType == 1 && r < n.childNodes.length) {
		if (n.contentEditable == "false") return null;
		n = n.childNodes[r], r = 0;
	} else if (n.parentNode && !Pn(n)) r = Nn(n) + 1, n = n.parentNode;
	else return null;
}
var tr = class e {
	constructor(e, t, n = !0) {
		this.node = e, this.offset = t, this.precise = n;
	}
	static before(t, n) {
		return new e(t.parentNode, Nn(t), n);
	}
	static after(t, n) {
		return new e(t.parentNode, Nn(t) + 1, n);
	}
}, P = /*@__PURE__*/ (function(e) {
	return e[e.LTR = 0] = "LTR", e[e.RTL = 1] = "RTL", e;
})(P ||= {}), nr = P.LTR, rr = P.RTL;
function ir(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) t.push(1 << e[n]);
	return t;
}
var ar = /*@__PURE__*/ ir("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008"), or = /*@__PURE__*/ ir("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333"), sr = /*@__PURE__*/ Object.create(null), cr = [];
for (let e of [
	"()",
	"[]",
	"{}"
]) {
	let t = /*@__PURE__*/ e.charCodeAt(0), n = /*@__PURE__*/ e.charCodeAt(1);
	sr[t] = n, sr[n] = -t;
}
function lr(e) {
	return e <= 247 ? ar[e] : 1424 <= e && e <= 1524 ? 2 : 1536 <= e && e <= 1785 ? or[e - 1536] : 1774 <= e && e <= 2220 ? 4 : 8192 <= e && e <= 8204 ? 256 : 64336 <= e && e <= 65023 ? 4 : 1;
}
var ur = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/, dr = class {
	get dir() {
		return this.level % 2 ? rr : nr;
	}
	constructor(e, t, n) {
		this.from = e, this.to = t, this.level = n;
	}
	side(e, t) {
		return this.dir == t == e ? this.to : this.from;
	}
	forward(e, t) {
		return e == (this.dir == t);
	}
	static find(e, t, n, r) {
		let i = -1;
		for (let a = 0; a < e.length; a++) {
			let o = e[a];
			if (o.from <= t && o.to >= t) {
				if (o.level == n) return a;
				(i < 0 || (r == 0 ? e[i].level > o.level : r < 0 ? o.from < t : o.to > t)) && (i = a);
			}
		}
		if (i < 0) throw RangeError("Index out of range");
		return i;
	}
};
function fr(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) {
		let r = e[n], i = t[n];
		if (r.from != i.from || r.to != i.to || r.direction != i.direction || !fr(r.inner, i.inner)) return !1;
	}
	return !0;
}
var F = [];
function pr(e, t, n, r, i) {
	for (let a = 0; a <= r.length; a++) {
		let o = a ? r[a - 1].to : t, s = a < r.length ? r[a].from : n, c = a ? 256 : i;
		for (let t = o, n = c, r = c; t < s; t++) {
			let i = lr(e.charCodeAt(t));
			i == 512 ? i = n : i == 8 && r == 4 && (i = 16), F[t] = i == 4 ? 2 : i, i & 7 && (r = i), n = i;
		}
		for (let e = o, t = c, r = c; e < s; e++) {
			let i = F[e];
			if (i == 128) e < s - 1 && t == F[e + 1] && t & 24 ? i = F[e] = t : F[e] = 256;
			else if (i == 64) {
				let i = e + 1;
				for (; i < s && F[i] == 64;) i++;
				let a = e && t == 8 || i < n && F[i] == 8 ? r == 1 ? 1 : 8 : 256;
				for (let t = e; t < i; t++) F[t] = a;
				e = i - 1;
			} else i == 8 && r == 1 && (F[e] = 1);
			t = i, i & 7 && (r = i);
		}
	}
}
function mr(e, t, n, r, i) {
	let a = i == 1 ? 2 : 1;
	for (let o = 0, s = 0, c = 0; o <= r.length; o++) {
		let l = o ? r[o - 1].to : t, u = o < r.length ? r[o].from : n;
		for (let t = l, n, r, o; t < u; t++) if (r = sr[n = e.charCodeAt(t)]) {
			if (r < 0) {
				for (let e = s - 3; e >= 0; e -= 3) if (cr[e + 1] == -r) {
					let n = cr[e + 2], r = n & 2 ? i : n & 4 ? n & 1 ? a : i : 0;
					r && (F[t] = F[cr[e]] = r), s = e;
					break;
				}
			} else if (cr.length == 189) break;
			else cr[s++] = t, cr[s++] = n, cr[s++] = c;
		} else if ((o = F[t]) == 2 || o == 1) {
			let e = o == i;
			c = +!e;
			for (let t = s - 3; t >= 0; t -= 3) {
				let n = cr[t + 2];
				if (n & 2) break;
				if (e) cr[t + 2] |= 2;
				else {
					if (n & 4) break;
					cr[t + 2] |= 4;
				}
			}
		}
	}
}
function hr(e, t, n, r) {
	for (let i = 0, a = r; i <= n.length; i++) {
		let o = i ? n[i - 1].to : e, s = i < n.length ? n[i].from : t;
		for (let c = o; c < s;) {
			let o = F[c];
			if (o == 256) {
				let o = c + 1;
				for (;;) if (o == s) {
					if (i == n.length) break;
					o = n[i++].to, s = i < n.length ? n[i].from : t;
				} else if (F[o] == 256) o++;
				else break;
				let l = a == 1, u = l == ((o < t ? F[o] : r) == 1) ? l ? 1 : 2 : r;
				for (let t = o, r = i, a = r ? n[r - 1].to : e; t > c;) t == a && (t = n[--r].from, a = r ? n[r - 1].to : e), F[--t] = u;
				c = o;
			} else a = o, c++;
		}
	}
}
function gr(e, t, n, r, i, a, o) {
	let s = r % 2 ? 2 : 1;
	if (r % 2 == i % 2) for (let c = t, l = 0; c < n;) {
		let t = !0, u = !1;
		if (l == a.length || c < a[l].from) {
			let e = F[c];
			e != s && (t = !1, u = e == 16);
		}
		let d = !t && s == 1 ? [] : null, f = t ? r : r + 1, p = c;
		run: for (;;) if (l < a.length && p == a[l].from) {
			if (u) break run;
			let m = a[l];
			if (!t) for (let e = m.to, t = l + 1;;) {
				if (e == n) break run;
				if (t < a.length && a[t].from == e) e = a[t++].to;
				else if (F[e] == s) break run;
				else break;
			}
			l++, d ? d.push(m) : (m.from > c && o.push(new dr(c, m.from, f)), _r(e, m.direction == nr == !(f % 2) ? r : r + 1, i, m.inner, m.from, m.to, o), c = m.to), p = m.to;
		} else if (p == n || (t ? F[p] != s : F[p] == s)) break;
		else p++;
		d ? gr(e, c, p, r + 1, i, d, o) : c < p && o.push(new dr(c, p, f)), c = p;
	}
	else for (let c = n, l = a.length; c > t;) {
		let n = !0, u = !1;
		if (!l || c > a[l - 1].to) {
			let e = F[c - 1];
			e != s && (n = !1, u = e == 16);
		}
		let d = !n && s == 1 ? [] : null, f = n ? r : r + 1, p = c;
		run: for (;;) if (l && p == a[l - 1].to) {
			if (u) break run;
			let m = a[--l];
			if (!n) for (let e = m.from, n = l;;) {
				if (e == t) break run;
				if (n && a[n - 1].to == e) e = a[--n].from;
				else if (F[e - 1] == s) break run;
				else break;
			}
			d ? d.push(m) : (m.to < c && o.push(new dr(m.to, c, f)), _r(e, m.direction == nr == !(f % 2) ? r : r + 1, i, m.inner, m.from, m.to, o), c = m.from), p = m.from;
		} else if (p == t || (n ? F[p - 1] != s : F[p - 1] == s)) break;
		else p--;
		d ? gr(e, p, c, r + 1, i, d, o) : p < c && o.push(new dr(p, c, f)), c = p;
	}
}
function _r(e, t, n, r, i, a, o) {
	let s = t % 2 ? 2 : 1;
	pr(e, i, a, r, s), mr(e, i, a, r, s), hr(i, a, r, s), gr(e, i, a, t, n, r, o);
}
function vr(e, t, n) {
	if (!e) return [new dr(0, 0, +(t == rr))];
	if (t == nr && !n.length && !ur.test(e)) return yr(e.length);
	if (n.length) for (; e.length > F.length;) F[F.length] = 256;
	let r = [], i = t == nr ? 0 : 1;
	return _r(e, i, i, n, 0, e.length, r), r;
}
function yr(e) {
	return [new dr(0, e, 0)];
}
var br = "";
function xr(e, t, n, r, i) {
	let a = r.head - e.from, o = dr.find(t, a, r.bidiLevel ?? -1, r.assoc), s = t[o], c = s.side(i, n);
	if (a == c) {
		let e = o += i ? 1 : -1;
		if (e < 0 || e >= t.length) return null;
		s = t[o = e], a = s.side(!i, n), c = s.side(i, n);
	}
	let l = w(e.text, a, s.forward(i, n));
	(l < s.from || l > s.to) && (l = c), br = e.text.slice(Math.min(a, l), Math.max(a, l));
	let u = o == (i ? t.length - 1 : 0) ? null : t[o + (i ? 1 : -1)];
	return u && l == c && u.level + +!i < s.level ? T.cursor(u.side(!i, n) + e.from, u.forward(i, n) ? 1 : -1, u.level) : T.cursor(l + e.from, s.forward(i, n) ? -1 : 1, s.level);
}
function Sr(e, t, n) {
	for (let r = t; r < n; r++) {
		let t = lr(e.charCodeAt(r));
		if (t == 1) return nr;
		if (t == 2 || t == 4) return rr;
	}
	return nr;
}
var Cr = /*@__PURE__*/ E.define(), wr = /*@__PURE__*/ E.define(), Tr = /*@__PURE__*/ E.define(), Er = /*@__PURE__*/ E.define(), Dr = /*@__PURE__*/ E.define(), Or = /*@__PURE__*/ E.define(), kr = /*@__PURE__*/ E.define(), Ar = /*@__PURE__*/ E.define(), jr = /*@__PURE__*/ E.define(), Mr = /*@__PURE__*/ E.define({ combine: (e) => e.some((e) => e) }), Nr = /*@__PURE__*/ E.define({ combine: (e) => e.some((e) => e) }), Pr = /*@__PURE__*/ E.define(), Fr = class e {
	constructor(e, t, n, r, i, a = !1) {
		this.range = e, this.y = t, this.x = n, this.yMargin = r, this.xMargin = i, this.isSnapshot = a;
	}
	map(t) {
		return t.empty ? this : new e(this.range.map(t), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
	}
	clip(t) {
		return this.range.to <= t.doc.length ? this : new e(T.cursor(t.doc.length), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
	}
}, Ir = /*@__PURE__*/ D.define({ map: (e, t) => e.map(t) }), Lr = /*@__PURE__*/ D.define();
function Rr(e, t, n) {
	let r = e.facet(Er);
	r.length ? r[0](t) : window.onerror && window.onerror(String(t), n, void 0, void 0, t) || (n ? console.error(n + ":", t) : console.error(t));
}
var zr = /*@__PURE__*/ E.define({ combine: (e) => !e.length || e[0] }), Br = 0, Vr = /*@__PURE__*/ E.define({ combine(e) {
	return e.filter((t, n) => {
		for (let r = 0; r < n; r++) if (e[r].plugin == t.plugin) return !1;
		return !0;
	});
} }), I = class e {
	constructor(e, t, n, r, i) {
		this.id = e, this.create = t, this.domEventHandlers = n, this.domEventObservers = r, this.baseExtensions = i(this), this.extension = this.baseExtensions.concat(Vr.of({
			plugin: this,
			arg: void 0
		}));
	}
	of(e) {
		return this.baseExtensions.concat(Vr.of({
			plugin: this,
			arg: e
		}));
	}
	static define(t, n) {
		let { eventHandlers: r, eventObservers: i, provide: a, decorations: o } = n || {};
		return new e(Br++, t, r, i, (e) => {
			let t = [];
			return o && t.push(Gr.of((t) => {
				let n = t.plugin(e);
				return n ? o(n) : N.none;
			})), a && t.push(a(e)), t;
		});
	}
	static fromClass(t, n) {
		return e.define((e, n) => new t(e, n), n);
	}
}, Hr = class {
	constructor(e) {
		this.spec = e, this.mustUpdate = null, this.value = null;
	}
	get plugin() {
		return this.spec && this.spec.plugin;
	}
	update(e) {
		if (!this.value) {
			if (this.spec) try {
				this.value = this.spec.plugin.create(e, this.spec.arg);
			} catch (t) {
				Rr(e.state, t, "CodeMirror plugin crashed"), this.deactivate();
			}
		} else if (this.mustUpdate) {
			let e = this.mustUpdate;
			if (this.mustUpdate = null, this.value.update) try {
				this.value.update(e);
			} catch (t) {
				if (Rr(e.state, t, "CodeMirror plugin crashed"), this.value.destroy) try {
					this.value.destroy();
				} catch {}
				this.deactivate();
			}
		}
		return this;
	}
	destroy(e) {
		if (this.value?.destroy) try {
			this.value.destroy();
		} catch (t) {
			Rr(e.state, t, "CodeMirror plugin crashed");
		}
	}
	deactivate() {
		this.spec = this.value = null;
	}
}, Ur = /*@__PURE__*/ E.define(), Wr = /*@__PURE__*/ E.define(), Gr = /*@__PURE__*/ E.define(), Kr = /*@__PURE__*/ E.define(), qr = /*@__PURE__*/ E.define(), Jr = /*@__PURE__*/ E.define(), Yr = /*@__PURE__*/ E.define();
function Xr(e, t) {
	let n = e.state.facet(Yr);
	if (!n.length) return n;
	let r = n.map((t) => t instanceof Function ? t(e) : t), i = [];
	return A.spans(r, t.from, t.to, {
		point() {},
		span(e, n, r, a) {
			let o = e - t.from, s = n - t.from, c = i;
			for (let e = r.length - 1; e >= 0; e--, a--) {
				let n = r[e].spec.bidiIsolate, i;
				if (n ??= Sr(t.text, o, s), a > 0 && c.length && (i = c[c.length - 1]).to == o && i.direction == n) i.to = s, c = i.inner;
				else {
					let e = {
						from: o,
						to: s,
						direction: n,
						inner: []
					};
					c.push(e), c = e.inner;
				}
			}
		}
	}), i;
}
var Zr = /*@__PURE__*/ E.define();
function Qr(e) {
	let t = 0, n = 0, r = 0, i = 0;
	for (let a of e.state.facet(Zr)) {
		let o = a(e);
		o && (o.left != null && (t = Math.max(t, o.left)), o.right != null && (n = Math.max(n, o.right)), o.top != null && (r = Math.max(r, o.top)), o.bottom != null && (i = Math.max(i, o.bottom)));
	}
	return {
		left: t,
		right: n,
		top: r,
		bottom: i
	};
}
var $r = /*@__PURE__*/ E.define(), ei = class e {
	constructor(e, t, n, r) {
		this.fromA = e, this.toA = t, this.fromB = n, this.toB = r;
	}
	join(t) {
		return new e(Math.min(this.fromA, t.fromA), Math.max(this.toA, t.toA), Math.min(this.fromB, t.fromB), Math.max(this.toB, t.toB));
	}
	addToSet(e) {
		let t = e.length, n = this;
		for (; t > 0; t--) {
			let r = e[t - 1];
			if (!(r.fromA > n.toA)) {
				if (r.toA < n.fromA) break;
				n = n.join(r), e.splice(t - 1, 1);
			}
		}
		return e.splice(t, 0, n), e;
	}
	static extendWithRanges(t, n) {
		if (n.length == 0) return t;
		let r = [];
		for (let i = 0, a = 0, o = 0;;) {
			let s = i < t.length ? t[i].fromB : 1e9, c = a < n.length ? n[a] : 1e9, l = Math.min(s, c);
			if (l == 1e9) break;
			let u = l + o, d = l, f = u;
			for (;;) if (a < n.length && n[a] <= d) {
				let e = n[a + 1];
				a += 2, d = Math.max(d, e);
				for (let e = i; e < t.length && t[e].fromB <= d; e++) o = t[e].toA - t[e].toB;
				f = Math.max(f, e + o);
			} else if (i < t.length && t[i].fromB <= d) {
				let e = t[i++];
				d = Math.max(d, e.toB), f = Math.max(f, e.toA), o = e.toA - e.toB;
			} else break;
			r.push(new e(u, f, l, d));
		}
		return r;
	}
}, ti = class e {
	constructor(e, t, n) {
		this.view = e, this.state = t, this.transactions = n, this.flags = 0, this.startState = e.state, this.changes = we.empty(this.startState.doc.length);
		for (let e of n) this.changes = this.changes.compose(e.changes);
		let r = [];
		this.changes.iterChangedRanges((e, t, n, i) => r.push(new ei(e, t, n, i))), this.changedRanges = r;
	}
	static create(t, n, r) {
		return new e(t, n, r);
	}
	get viewportChanged() {
		return (this.flags & 4) > 0;
	}
	get viewportMoved() {
		return (this.flags & 8) > 0;
	}
	get heightChanged() {
		return (this.flags & 2) > 0;
	}
	get geometryChanged() {
		return this.docChanged || (this.flags & 18) > 0;
	}
	get focusChanged() {
		return (this.flags & 1) > 0;
	}
	get docChanged() {
		return !this.changes.empty;
	}
	get selectionSet() {
		return this.transactions.some((e) => e.selection);
	}
	get empty() {
		return this.flags == 0 && this.transactions.length == 0;
	}
}, ni = [], L = class {
	constructor(e, t, n = 0) {
		this.dom = e, this.length = t, this.flags = n, this.parent = null, e.cmTile = this;
	}
	get breakAfter() {
		return this.flags & 1;
	}
	get children() {
		return ni;
	}
	isWidget() {
		return !1;
	}
	get isHidden() {
		return !1;
	}
	isComposite() {
		return !1;
	}
	isLine() {
		return !1;
	}
	isText() {
		return !1;
	}
	isBlock() {
		return !1;
	}
	get domAttrs() {
		return null;
	}
	sync(e) {
		if (this.flags |= 2, this.flags & 4) {
			this.flags &= -5;
			let e = this.domAttrs;
			e && gn(this.dom, e);
		}
	}
	toString() {
		return this.constructor.name + (this.children.length ? `(${this.children})` : "") + (this.breakAfter ? "#" : "");
	}
	destroy() {
		this.parent = null;
	}
	setDOM(e) {
		this.dom = e, e.cmTile = this;
	}
	get posAtStart() {
		return this.parent ? this.parent.posBefore(this) : 0;
	}
	get posAtEnd() {
		return this.posAtStart + this.length;
	}
	posBefore(e, t = this.posAtStart) {
		let n = t;
		for (let t of this.children) {
			if (t == e) return n;
			n += t.length + t.breakAfter;
		}
		throw RangeError("Invalid child in posBefore");
	}
	posAfter(e) {
		return this.posBefore(e) + e.length;
	}
	covers(e) {
		return !0;
	}
	coordsIn(e, t, n) {
		return null;
	}
	domPosFor(e, t) {
		let n = Nn(this.dom), r = this.length ? e > 0 : t > 0;
		return new tr(this.parent.dom, n + +!!r, e == 0 || e == this.length);
	}
	markDirty(e) {
		this.flags &= -3, e && (this.flags |= 4), this.parent && this.parent.flags & 2 && this.parent.markDirty(!1);
	}
	get overrideDOMText() {
		return null;
	}
	get root() {
		for (let e = this; e; e = e.parent) if (e instanceof ai) return e;
		return null;
	}
	static get(e) {
		return e.cmTile;
	}
}, ri = class extends L {
	constructor(e) {
		super(e, 0), this._children = [];
	}
	isComposite() {
		return !0;
	}
	get children() {
		return this._children;
	}
	get lastChild() {
		return this.children.length ? this.children[this.children.length - 1] : null;
	}
	append(e) {
		this.children.push(e), e.parent = this;
	}
	sync(e) {
		if (this.flags & 2) return;
		super.sync(e);
		let t = this.dom, n = null, r, i = e?.node == t ? e : null, a = 0;
		for (let o of this.children) {
			if (o.sync(e), a += o.length + o.breakAfter, r = n ? n.nextSibling : t.firstChild, i && r != o.dom && (i.written = !0), o.dom.parentNode == t) for (; r && r != o.dom;) r = ii(r);
			else t.insertBefore(o.dom, r);
			n = o.dom;
		}
		for (r = n ? n.nextSibling : t.firstChild, i && r && (i.written = !0); r;) r = ii(r);
		this.length = a;
	}
};
function ii(e) {
	let t = e.nextSibling;
	return e.parentNode.removeChild(e), t;
}
var ai = class extends ri {
	constructor(e, t) {
		super(t), this.view = e;
	}
	owns(e) {
		for (; e; e = e.parent) if (e == this) return !0;
		return !1;
	}
	isBlock() {
		return !0;
	}
	nearest(e) {
		for (;;) {
			if (!e) return null;
			let t = L.get(e);
			if (t && this.owns(t)) return t;
			e = e.parentNode;
		}
	}
	blockTiles(e) {
		for (let t = [], n = this, r = 0, i = 0;;) if (r == n.children.length) {
			if (!t.length) return;
			n = n.parent, n.breakAfter && i++, r = t.pop();
		} else {
			let a = n.children[r++];
			if (a instanceof oi) t.push(r), n = a, r = 0;
			else {
				let t = i + a.length, n = e(a, i);
				if (n !== void 0) return n;
				i = t + a.breakAfter;
			}
		}
	}
	resolveBlock(e, t) {
		let n, r = -1, i, a = -1;
		if (this.blockTiles((o, s) => {
			let c = s + o.length;
			if (e >= s && e <= c) {
				if (o.isWidget() && t >= -1 && t <= 1) {
					if (o.flags & 32) return !0;
					o.flags & 16 && (n = void 0);
				}
				(s < e || e == c && (t < -1 ? o.length : o.covers(1))) && (!n || !o.isWidget() && n.isWidget()) && (n = o, r = e - s), (c > e || e == s && (t > 1 ? o.length : o.covers(-1))) && (!i || !o.isWidget() && i.isWidget()) && (i = o, a = e - s);
			}
		}), !n && !i) throw Error("No tile at position " + e);
		return n && t < 0 || !i ? {
			tile: n,
			offset: r
		} : {
			tile: i,
			offset: a
		};
	}
}, oi = class e extends ri {
	constructor(e, t) {
		super(e), this.wrapper = t;
	}
	isBlock() {
		return !0;
	}
	covers(e) {
		return this.children.length ? e < 0 ? this.children[0].covers(-1) : this.lastChild.covers(1) : !1;
	}
	get domAttrs() {
		return this.wrapper.attributes;
	}
	static of(t, n) {
		let r = new e(n || document.createElement(t.tagName), t);
		return n || (r.flags |= 4), r;
	}
}, si = class e extends ri {
	constructor(e, t) {
		super(e), this.attrs = t;
	}
	isLine() {
		return !0;
	}
	static start(t, n, r) {
		let i = new e(n || document.createElement("div"), t);
		return (!n || !r) && (i.flags |= 4), i;
	}
	get domAttrs() {
		return this.attrs;
	}
	resolveInline(e, t, n) {
		let r = null, i = -1, a = null, o = -1;
		function s(e, c) {
			for (let l = 0, u = 0; l < e.children.length && u <= c; l++) {
				let d = e.children[l], f = u + d.length;
				f >= c && (d.isComposite() ? s(d, c - u) : (!a || a.isHidden && (t > 0 && !(a.flags & 32) || n && li(a, d))) && (f > c || d.flags & 32 && t <= 1) ? (a = d, o = c - u) : (u < c || d.flags & 16 && !d.isHidden && t >= -1) && (r = d, i = c - u)), u = f;
			}
		}
		s(this, e);
		let c = (t < 0 ? r : a) || r || a;
		return c ? {
			tile: c,
			offset: c == r ? i : o
		} : null;
	}
	coordsIn(e, t, n) {
		let r = this.resolveInline(e, t, !0);
		return r ? r.tile.coordsIn(Math.max(0, r.offset), t, n) : ci(this);
	}
	domIn(e, t) {
		let n = this.resolveInline(e, t);
		if (n) {
			let { tile: e, offset: r } = n;
			if (this.dom.contains(e.dom)) return e.isText() ? new tr(e.dom, Math.min(e.dom.nodeValue.length, r)) : e.domPosFor(r, e.flags & 16 ? 1 : e.flags & 32 ? -1 : t);
			let i = n.tile.parent, a = !1;
			for (let e of i.children) {
				if (a) return new tr(e.dom, 0);
				e == n.tile && (a = !0);
			}
		}
		return new tr(this.dom, 0);
	}
};
function ci(e) {
	let t = e.dom.lastChild;
	if (!t) return e.dom.getBoundingClientRect();
	let n = jn(t);
	return n[n.length - 1] || null;
}
function li(e, t) {
	let n = e.coordsIn(0, 1), r = t.coordsIn(0, 1);
	return n && r && r.top < n.bottom;
}
var ui = class e extends ri {
	constructor(e, t) {
		super(e), this.mark = t;
	}
	get domAttrs() {
		return this.mark.attrs;
	}
	static of(t, n) {
		let r = new e(n || document.createElement(t.tagName), t);
		return n || (r.flags |= 4), r;
	}
}, di = class e extends L {
	constructor(e, t) {
		super(e, t.length), this.text = t;
	}
	sync(e) {
		this.flags & 2 || (super.sync(e), this.dom.nodeValue != this.text && (e && e.node == this.dom && (e.written = !0), this.dom.nodeValue = this.text));
	}
	isText() {
		return !0;
	}
	toString() {
		return JSON.stringify(this.text);
	}
	coordsIn(e, t, n) {
		let r = this.dom.nodeValue.length;
		e > r && (e = r);
		let i = e, a = e, o = 0;
		e == 0 && t < 0 || e == r && t >= 0 ? M.chrome || M.gecko || (e ? (i--, o = 1) : a < r && (a++, o = -1)) : t < 0 ? i-- : a < r && a++;
		let s = Jn(this.dom, i, a).getClientRects();
		if (!s.length) return null;
		let c = s[(o ? o < 0 : t >= 0) ? 0 : s.length - 1];
		return M.safari && !o && c.width == 0 && (c = Array.prototype.find.call(s, (e) => e.width) || c), n == null ? c : Ln(c, (o ? o > 0 : t < 0) == n);
	}
	static of(t, n) {
		let r = new e(n || document.createTextNode(t), t);
		return n || (r.flags |= 2), r;
	}
}, fi = class e extends L {
	constructor(e, t, n, r) {
		super(e, t, r), this.widget = n;
	}
	isWidget() {
		return !0;
	}
	get isHidden() {
		return this.widget.isHidden;
	}
	covers(e) {
		return this.flags & 48 ? !1 : (this.flags & (e < 0 ? 64 : 128)) > 0;
	}
	coordsIn(e, t) {
		return this.coordsInWidget(e, t, !1);
	}
	coordsInWidget(e, t, n) {
		let r = this.widget.coordsAt(this.dom, e, t);
		if (r) return r;
		if (n) return Ln(this.dom.getBoundingClientRect(), this.length ? e == 0 : t <= 0);
		{
			let t = this.dom.getClientRects(), n = null;
			if (!t.length) return null;
			let r = this.flags & 16 ? !0 : this.flags & 32 ? !1 : e > 0;
			for (let i = r ? t.length - 1 : 0; n = t[i], !(e > 0 ? i == 0 : i == t.length - 1 || n.top < n.bottom); i += r ? -1 : 1);
			return Ln(n, !r);
		}
	}
	get overrideDOMText() {
		if (!this.length) return C.empty;
		let { root: e } = this;
		if (!e) return C.empty;
		let t = this.posAtStart;
		return e.view.state.doc.slice(t, t + this.length);
	}
	destroy() {
		super.destroy(), this.widget.destroy(this.dom);
	}
	static of(t, n, r, i, a) {
		return a || (a = t.toDOM(n), t.editable || (a.contentEditable = "false")), new e(a, r, t, i);
	}
}, pi = class extends L {
	constructor(e) {
		let t = document.createElement("img");
		t.className = "cm-widgetBuffer", t.setAttribute("aria-hidden", "true"), super(t, 0, e);
	}
	get isHidden() {
		return !0;
	}
	get overrideDOMText() {
		return C.empty;
	}
	coordsIn(e, t, n) {
		let r = this.dom.getBoundingClientRect();
		return n == null ? r : Ln(r, t > 0 == n);
	}
}, mi = class {
	constructor(e) {
		this.index = 0, this.beforeBreak = !1, this.parents = [], this.tile = e;
	}
	advance(e, t, n) {
		let { tile: r, index: i, beforeBreak: a, parents: o } = this;
		for (; e || t > 0;) if (!r.isComposite()) {
			let t = r.length;
			if (i < t && e) {
				let a = Math.min(e, t - i);
				n && n.skip(r, i, i + a), e -= a, i += a;
			}
			if (i == t) a = !!r.breakAfter, {tile: r, index: i} = o.pop(), i++;
			else if (!e) break;
		} else if (a) {
			if (!e) break;
			n && n.break(), e--, a = !1;
		} else if (i == r.children.length) {
			if (!e && !o.length) break;
			n && n.leave(r), a = !!r.breakAfter, {tile: r, index: i} = o.pop(), i++;
		} else {
			let s = r.children[i], c = s.breakAfter;
			(t > 0 ? s.length <= e : s.length < e) && (!n || n.skip(s, 0, s.length) !== !1 || !s.isComposite) ? (a = !!c, i++, e -= s.length) : (o.push({
				tile: r,
				index: i
			}), r = s, i = 0, n && s.isComposite() && n.enter(s));
		}
		return this.tile = r, this.index = i, this.beforeBreak = a, this;
	}
	get root() {
		return this.parents.length ? this.parents[0].tile : this.tile;
	}
}, hi = class {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.wrapper = n, this.rank = r;
	}
}, gi = class {
	constructor(e, t, n) {
		this.cache = e, this.root = t, this.blockWrappers = n, this.curLine = null, this.lastBlock = null, this.afterWidget = null, this.pos = 0, this.wrappers = [], this.wrapperPos = 0;
	}
	addText(e, t, n, r) {
		this.flushBuffer();
		let i = this.ensureMarks(t, n), a = i.lastChild;
		if (a && a.isText() && !(a.flags & 8) && a.length + e.length < 512) {
			this.cache.reused.set(a, 2);
			let t = i.children[i.children.length - 1] = new di(a.dom, a.text + e);
			t.parent = i;
		} else i.append(r || di.of(e, this.cache.find(di)?.dom));
		this.pos += e.length, this.afterWidget = null;
	}
	addComposition(e, t) {
		let n = this.curLine;
		n.dom != t.line.dom && (n.setDOM(this.cache.reused.has(t.line) ? Ei(t.line.dom) : t.line.dom), this.cache.reused.set(t.line, 2));
		let r = n;
		for (let e = t.marks.length - 1; e >= 0; e--) {
			let n = t.marks[e], i = r.lastChild;
			if (i instanceof ui && i.mark.eq(n.mark)) i.dom != n.dom && i.setDOM(Ei(n.dom)), r = i;
			else {
				if (this.cache.reused.get(n)) {
					let e = L.get(n.dom);
					e && e.setDOM(Ei(n.dom));
				}
				let e = ui.of(n.mark, n.dom);
				r.append(e), r = e;
			}
			this.cache.reused.set(n, 2);
		}
		let i = L.get(e.text);
		i && this.cache.reused.set(i, 2);
		let a = new di(e.text, e.text.nodeValue);
		a.flags |= 8, this.pos = e.range.toB, r.append(a);
	}
	addInlineWidget(e, t, n) {
		let r = this.afterWidget && e.flags & 48 && (this.afterWidget.flags & 48) == (e.flags & 48);
		r || this.flushBuffer();
		let i = this.ensureMarks(t, n);
		!r && !(e.flags & 16) && i.append(this.getBuffer(1)), i.append(e), this.pos += e.length, this.afterWidget = e;
	}
	addMark(e, t, n) {
		this.flushBuffer(), this.ensureMarks(t, n).append(e), this.pos += e.length, this.afterWidget = null;
	}
	addBlockWidget(e) {
		this.getBlockPos().append(e), this.pos += e.length, this.lastBlock = e, this.endLine();
	}
	continueWidget(e) {
		let t = this.afterWidget || this.lastBlock;
		t.length += e, this.pos += e;
	}
	addLineStart(e, t) {
		e ||= Ci;
		let n = si.start(e, t || this.cache.find(si)?.dom, !!t);
		this.getBlockPos().append(this.lastBlock = this.curLine = n);
	}
	addLine(e) {
		this.getBlockPos().append(e), this.pos += e.length, this.lastBlock = e, this.endLine();
	}
	addBreak() {
		this.lastBlock.flags |= 1, this.endLine(), this.pos++;
	}
	addLineStartIfNotCovered(e) {
		this.blockPosCovered() || this.addLineStart(e);
	}
	ensureLine(e) {
		this.curLine || this.addLineStart(e);
	}
	ensureMarks(e, t) {
		let n = this.curLine;
		for (let r = e.length - 1; r >= 0; r--) {
			let i = e[r], a;
			if (t > 0 && (a = n.lastChild) && a instanceof ui && a.mark.eq(i)) n = a, t--;
			else {
				let e = ui.of(i, this.cache.find(ui, (e) => e.mark.eq(i))?.dom);
				n.append(e), n = e, t = 0;
			}
		}
		return n;
	}
	endLine() {
		if (this.curLine) {
			this.flushBuffer();
			let e = this.curLine.lastChild;
			(!e || !xi(this.curLine, !1) || e.dom.nodeName != "BR" && e.isWidget() && !(M.ios && xi(this.curLine, !0))) && this.curLine.append(this.cache.findWidget(Oi, 0, 32) || new fi(Oi.toDOM(), 0, Oi, 32)), this.curLine = this.afterWidget = null;
		}
	}
	updateBlockWrappers() {
		this.wrapperPos > this.pos + 1e4 && (this.blockWrappers.goto(this.pos), this.wrappers.length = 0);
		for (let e = this.wrappers.length - 1; e >= 0; e--) this.wrappers[e].to < this.pos && this.wrappers.splice(e, 1);
		for (let e = this.blockWrappers; e.value && e.from <= this.pos; e.next()) if (e.to >= this.pos) {
			let t = e.rank * 102 + e.value.rank, n = new hi(e.from, e.to, e.value, t), r = this.wrappers.length;
			for (; r > 0 && (this.wrappers[r - 1].rank - n.rank || this.wrappers[r - 1].to - n.to) < 0;) r--;
			this.wrappers.splice(r, 0, n);
		}
		this.wrapperPos = this.pos;
	}
	getBlockPos() {
		this.updateBlockWrappers();
		let e = this.root;
		for (let t of this.wrappers) {
			let n = e.lastChild;
			if (t.from < this.pos && n instanceof oi && n.wrapper.eq(t.wrapper)) e = n;
			else {
				let n = oi.of(t.wrapper, this.cache.find(oi, (e) => e.wrapper.eq(t.wrapper))?.dom);
				e.append(n), e = n;
			}
		}
		return e;
	}
	blockPosCovered() {
		let e = this.lastBlock;
		return e != null && !e.breakAfter && (!e.isWidget() || (e.flags & 160) > 0);
	}
	getBuffer(e) {
		let t = 2 | (e < 0 ? 16 : 32), n = this.cache.find(pi, void 0, 1);
		return n && (n.flags = t), n || new pi(t);
	}
	flushBuffer() {
		this.afterWidget && !(this.afterWidget.flags & 32) && (this.afterWidget.parent.append(this.getBuffer(-1)), this.afterWidget = null);
	}
}, _i = class {
	constructor(e) {
		this.skipCount = 0, this.text = "", this.textOff = 0, this.cursor = e.iter();
	}
	skip(e) {
		this.textOff + e <= this.text.length ? this.textOff += e : (this.skipCount += e - (this.text.length - this.textOff), this.text = "", this.textOff = 0);
	}
	next(e) {
		if (this.textOff == this.text.length) {
			let { value: t, lineBreak: n, done: r } = this.cursor.next(this.skipCount);
			if (this.skipCount = 0, r) throw Error("Ran out of text content when drawing inline views");
			this.text = t;
			let i = this.textOff = Math.min(e, t.length);
			return n ? null : t.slice(0, i);
		}
		let t = Math.min(this.text.length, this.textOff + e), n = this.text.slice(this.textOff, t);
		return this.textOff = t, n;
	}
}, vi = [
	fi,
	si,
	di,
	ui,
	pi,
	oi,
	ai
];
for (let e = 0; e < vi.length; e++) vi[e].bucket = e;
var yi = class {
	constructor(e) {
		this.view = e, this.buckets = vi.map(() => []), this.index = vi.map(() => 0), this.reused = /* @__PURE__ */ new Map();
	}
	add(e) {
		let t = e.constructor.bucket, n = this.buckets[t];
		n.length < 6 ? n.push(e) : n[this.index[t] = (this.index[t] + 1) % 6] = e;
	}
	find(e, t, n = 2) {
		let r = e.bucket, i = this.buckets[r], a = this.index[r];
		for (let e = 0; e < i.length; e++) {
			let o = (e + a) % i.length, s = i[o];
			if ((!t || t(s)) && !this.reused.has(s)) return i.splice(o, 1), o < a && this.index[r]--, this.reused.set(s, n), s;
		}
		return null;
	}
	findWidget(e, t, n) {
		let r = this.buckets[0];
		if (r.length) for (let i = 0, a = 0;; i++) {
			if (i == r.length) {
				if (a) return null;
				a = 1, i = 0;
			}
			let o = r[i];
			if (!this.reused.has(o) && (a == 0 ? o.widget.compare(e) : o.widget.constructor == e.constructor && e.updateDOM(o.dom, this.view, o.widget))) return r.splice(i, 1), i < this.index[0] && this.index[0]--, o.widget == e && o.length == t && (o.flags & 497) == n ? (this.reused.set(o, 1), o) : (this.reused.set(o, 2), new fi(o.dom, t, e, o.flags & -498 | n));
		}
	}
	reuse(e) {
		return this.reused.set(e, 1), e;
	}
	maybeReuse(e, t = 2) {
		if (!this.reused.has(e)) return this.reused.set(e, t), e.dom;
	}
	clear() {
		for (let e = 0; e < this.buckets.length; e++) this.buckets[e].length = this.index[e] = 0;
	}
}, bi = class {
	constructor(e, t, n, r, i) {
		this.view = e, this.decorations = r, this.disallowBlockEffectsFor = i, this.openWidget = !1, this.openMarks = 0, this.cache = new yi(e), this.text = new _i(e.state.doc), this.builder = new gi(this.cache, new ai(e, e.contentDOM), A.iter(n)), this.cache.reused.set(t, 2), this.old = new mi(t), this.reuseWalker = {
			skip: (e, t, n) => {
				if (this.cache.add(e), e.isComposite()) return !1;
			},
			enter: (e) => this.cache.add(e),
			leave: () => {},
			break: () => {}
		};
	}
	run(e, t) {
		let n = t && this.getCompositionContext(t.text);
		for (let r = 0, i = 0, a = 0;;) {
			let o = a < e.length ? e[a++] : null, s = o ? o.fromA : this.old.root.length;
			if (s > r) {
				let e = s - r;
				this.preserve(e, !a, !o), r = s, i += e;
			}
			if (!o) break;
			t && o.fromA <= t.range.fromA && o.toA >= t.range.toA ? (this.forward(o.fromA, t.range.fromA, t.range.fromA < t.range.toA ? 1 : -1), this.emit(i, t.range.fromB), this.builder.flushBuffer(), this.cache.clear(), this.builder.addComposition(t, n), this.text.skip(t.range.toB - t.range.fromB), this.forward(t.range.fromA, o.toA), this.emit(t.range.toB, o.toB)) : (this.forward(o.fromA, o.toA), this.emit(i, o.toB)), i = o.toB, r = o.toA;
		}
		return this.builder.curLine && this.builder.endLine(), this.builder.root;
	}
	preserve(e, t, n) {
		let r = Ti(this.old), i = this.openMarks;
		this.old.advance(e, n ? 1 : -1, {
			skip: (e, t, n) => {
				if (e.isWidget()) {
					if (this.openWidget) this.builder.continueWidget(n - t);
					else {
						let a = n > 0 || t < e.length ? fi.of(e.widget, this.view, n - t, e.flags & 496, this.cache.maybeReuse(e)) : this.cache.reuse(e);
						a.flags & 256 ? (a.flags &= -2, this.builder.addBlockWidget(a)) : (this.builder.ensureLine(null), this.builder.addInlineWidget(a, r, i), i = r.length);
					}
				} else if (e.isText()) this.builder.ensureLine(null), !t && n == e.length && !this.cache.reused.has(e) ? this.builder.addText(e.text, r, i, this.cache.reuse(e)) : (this.cache.add(e), this.builder.addText(e.text.slice(t, n), r, i)), i = r.length;
				else if (e.isLine()) e.flags &= -2, this.cache.reused.set(e, 1), this.builder.addLine(e);
				else if (e instanceof pi) this.cache.add(e);
				else if (e instanceof ui) this.builder.ensureLine(null), this.builder.addMark(e, r, i), this.cache.reused.set(e, 1), i = r.length;
				else return !1;
				this.openWidget = !1;
			},
			enter: (e) => {
				e.isLine() ? this.builder.addLineStart(e.attrs, this.cache.maybeReuse(e)) : (this.cache.add(e), e instanceof ui && r.unshift(e.mark)), this.openWidget = !1;
			},
			leave: (e) => {
				e.isLine() ? r.length &&= i = 0 : e instanceof ui && (r.shift(), i = Math.min(i, r.length));
			},
			break: () => {
				this.builder.addBreak(), this.openWidget = !1;
			}
		}), this.text.skip(e);
	}
	emit(e, t) {
		let n = null, r = this.builder, i = -1, a = A.spans(this.decorations, e, t, {
			point: (e, t, a, o, s, c) => {
				if (a instanceof Cn) {
					if (this.disallowBlockEffectsFor[c]) {
						if (a.block) throw RangeError("Block decorations may not be specified via plugins");
						if (t > this.view.state.doc.lineAt(e).to) throw RangeError("Decorations that replace line breaks may not be specified via plugins");
					}
					if (i = o.length, s > o.length) r.continueWidget(t - e);
					else {
						let i = a.widget || (a.block ? Di.block : Di.inline), c = Si(a), l = this.cache.findWidget(i, t - e, c) || fi.of(i, this.view, t - e, c);
						a.block ? (a.startSide > 0 && r.addLineStartIfNotCovered(n), r.addBlockWidget(l)) : (r.ensureLine(n), r.addInlineWidget(l, o, s));
					}
					n = null;
				} else n = wi(n, a);
				t > e && this.text.skip(t - e);
			},
			span: (e, t, a, o) => {
				for (let i = e; i < t;) {
					let s = this.text.next(Math.min(512, t - i));
					s == null ? (r.addLineStartIfNotCovered(n), r.addBreak(), i++) : (r.ensureLine(n), r.addText(s, a, i == e ? o : a.length), i += s.length), n = null;
				}
				i = a.length;
			}
		});
		i > -1 && (this.openWidget = a > i), this.openWidget || r.addLineStartIfNotCovered(n), this.openMarks = a;
	}
	forward(e, t, n = 1) {
		t - e <= 10 ? this.old.advance(t - e, n, this.reuseWalker) : (this.old.advance(5, -1, this.reuseWalker), this.old.advance(t - e - 10, -1), this.old.advance(5, n, this.reuseWalker));
	}
	getCompositionContext(e) {
		let t = [], n = null;
		for (let r = e.parentNode;; r = r.parentNode) {
			let e = L.get(r);
			if (r == this.view.contentDOM) break;
			e instanceof ui ? t.push(e) : e?.isLine() ? n = e : e instanceof oi || (r.nodeName == "DIV" && !n && r != this.view.contentDOM ? n = new si(r, Ci) : n || t.push(ui.of(new xn({
				tagName: r.nodeName.toLowerCase(),
				attributes: vn(r)
			}), r)));
		}
		return {
			line: n,
			marks: t
		};
	}
};
function xi(e, t) {
	let n = (e) => {
		for (let r of e.children) if ((t ? r.isText() : r.length) || n(r)) return !0;
		return !1;
	};
	return n(e);
}
function Si(e) {
	let t = e.isReplace ? (e.startSide < 0 ? 64 : 0) | (e.endSide > 0 ? 128 : 0) : e.startSide > 0 ? 32 : 16;
	return e.block && (t |= 256), t;
}
var Ci = { class: "cm-line" };
function wi(e, t) {
	let n = t.spec.attributes, r = t.spec.class;
	return !n && !r ? e : (e ||= { class: "cm-line" }, n && pn(n, e), r && (e.class += " " + r), e);
}
function Ti(e) {
	let t = [];
	for (let n = e.parents.length; n > 1; n--) {
		let r = n == e.parents.length ? e.tile : e.parents[n].tile;
		r instanceof ui && t.push(r.mark);
	}
	return t;
}
function Ei(e) {
	let t = L.get(e);
	return t && t.setDOM(e.cloneNode()), e;
}
var Di = class extends yn {
	constructor(e) {
		super(), this.tag = e;
	}
	eq(e) {
		return e.tag == this.tag;
	}
	toDOM() {
		return document.createElement(this.tag);
	}
	updateDOM(e) {
		return e.nodeName.toLowerCase() == this.tag;
	}
	get isHidden() {
		return !0;
	}
};
Di.inline = /*@__PURE__*/ new Di("span"), Di.block = /*@__PURE__*/ new Di("div");
var Oi = /*@__PURE__*/ new class extends yn {
	toDOM() {
		return document.createElement("br");
	}
	get isHidden() {
		return !0;
	}
	get editable() {
		return !0;
	}
}(), ki = class {
	constructor(e) {
		this.view = e, this.decorations = [], this.blockWrappers = [], this.dynamicDecorationMap = [!1], this.domChanged = null, this.hasComposition = null, this.editContextFormatting = N.none, this.lastCompositionAfterCursor = !1, this.minWidth = 0, this.minWidthFrom = 0, this.minWidthTo = 0, this.impreciseAnchor = null, this.impreciseHead = null, this.forceSelection = !1, this.lastUpdate = Date.now(), this.updateDeco(), this.tile = new ai(e, e.contentDOM), this.updateInner([new ei(0, 0, 0, e.state.doc.length)], null);
	}
	update(e) {
		let t = e.changedRanges;
		this.minWidth > 0 && t.length && (t.every(({ fromA: e, toA: t }) => t < this.minWidthFrom || e > this.minWidthTo) ? (this.minWidthFrom = e.changes.mapPos(this.minWidthFrom, 1), this.minWidthTo = e.changes.mapPos(this.minWidthTo, 1)) : this.minWidth = this.minWidthFrom = this.minWidthTo = 0), this.updateEditContextFormatting(e);
		let n = -1;
		this.view.inputState.composing >= 0 && !this.view.observer.editContext && (this.domChanged?.newSel ? n = this.domChanged.newSel.head : !Bi(e.changes, this.hasComposition) && !e.selectionSet && (n = e.state.selection.main.head));
		let r = n > -1 ? Ni(this.view, e.changes, n) : null;
		if (this.domChanged = null, this.hasComposition) {
			let { from: n, to: r } = this.hasComposition;
			t = new ei(n, r, e.changes.mapPos(n, -1), e.changes.mapPos(r, 1)).addToSet(t.slice());
		}
		this.hasComposition = r ? {
			from: r.range.fromB,
			to: r.range.toB
		} : null, (M.ie || M.chrome) && !r && e && e.state.doc.lines != e.startState.doc.lines && (this.forceSelection = !0);
		let i = this.decorations, a = this.blockWrappers;
		this.updateDeco();
		let o = Ii(i, this.decorations, e.changes);
		o.length && (t = ei.extendWithRanges(t, o));
		let s = Ri(a, this.blockWrappers, e.changes);
		return s.length && (t = ei.extendWithRanges(t, s)), r && !t.some((e) => e.fromA <= r.range.fromA && e.toA >= r.range.toA) && (t = r.range.addToSet(t.slice())), this.tile.flags & 2 && t.length == 0 ? !1 : (this.updateInner(t, r), e.transactions.length && (this.lastUpdate = Date.now()), !0);
	}
	updateInner(e, t) {
		this.view.viewState.mustMeasureContent = !0;
		let { observer: n } = this.view;
		n.ignore(() => {
			if (t || e.length) {
				let n = this.tile, r = new bi(this.view, n, this.blockWrappers, this.decorations, this.dynamicDecorationMap);
				t && L.get(t.text) && r.cache.reused.set(L.get(t.text), 2), this.tile = r.run(e, t), Ai(n, r.cache.reused);
			}
			this.tile.dom.style.height = this.view.viewState.contentHeight / this.view.scaleY + "px", this.tile.dom.style.flexBasis = this.minWidth ? this.minWidth + "px" : "";
			let r = M.chrome || M.ios ? {
				node: n.selectionRange.focusNode,
				written: !1
			} : void 0;
			this.tile.sync(r), r && (r.written || n.selectionRange.focusNode != r.node || !this.tile.dom.contains(r.node)) && (this.forceSelection = !0), this.tile.dom.style.height = "";
		});
		let r = [];
		if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length) for (let e of this.tile.children) e.isWidget() && e.widget instanceof Vi && r.push(e.dom);
		n.updateGaps(r);
	}
	updateEditContextFormatting(e) {
		this.editContextFormatting = this.editContextFormatting.map(e.changes);
		for (let t of e.transactions) for (let e of t.effects) e.is(Lr) && (this.editContextFormatting = e.value);
	}
	updateSelection(e = !1, t = !1) {
		(e || !this.view.observer.selectionRange.focusNode) && this.view.observer.readSelectionRange();
		let { dom: n } = this.tile, r = this.view.root.activeElement, i = r == n, a = !i && !(this.view.state.facet(zr) || n.tabIndex > -1) && An(n, this.view.observer.selectionRange) && !(r && n.contains(r));
		if (!(i || t || a)) return;
		let o = this.forceSelection;
		this.forceSelection = !1;
		let s = this.view.state.selection.main, c, l;
		if (s.empty ? l = c = this.inlineDOMNearPos(s.anchor, s.assoc || 1) : (l = this.inlineDOMNearPos(s.head, s.head == s.from ? 1 : -1), c = this.inlineDOMNearPos(s.anchor, s.anchor == s.from ? 1 : -1)), M.gecko && s.empty && !this.hasComposition && ji(c)) {
			let e = document.createTextNode("");
			this.view.observer.ignore(() => c.node.insertBefore(e, c.node.childNodes[c.offset] || null)), c = l = new tr(e, 0), o = !0;
		}
		let u = this.view.observer.selectionRange;
		(o || !u.focusNode || (!Mn(c.node, c.offset, u.anchorNode, u.anchorOffset) || !Mn(l.node, l.offset, u.focusNode, u.focusOffset)) && !this.suppressWidgetCursorChange(u, s)) && (this.view.observer.ignore(() => {
			M.android && M.chrome && n.contains(u.focusNode) && zi(u.focusNode, n) && (n.blur(), n.focus({ preventScroll: !0 }));
			let e = On(this.view.root);
			if (e) {
				if (s.empty) {
					if (M.gecko) {
						let e = Pi(c.node, c.offset);
						if (e && e != 3) {
							let t = (e == 1 ? $n : er)(c.node, c.offset);
							t && (c = new tr(t.node, t.offset));
						}
					}
					e.collapse(c.node, c.offset), s.bidiLevel != null && e.caretBidiLevel !== void 0 && (e.caretBidiLevel = s.bidiLevel);
				} else if (e.extend) {
					e.collapse(c.node, c.offset);
					try {
						e.extend(l.node, l.offset);
					} catch {}
				} else {
					let t = document.createRange();
					s.anchor > s.head && ([c, l] = [l, c]), t.setEnd(l.node, l.offset), t.setStart(c.node, c.offset), e.removeAllRanges(), e.addRange(t);
				}
			}
			a && this.view.root.activeElement == n && (n.blur(), r && r.focus());
		}), this.view.observer.setSelectionRange(c, l)), this.impreciseAnchor = c.precise ? null : new tr(u.anchorNode, u.anchorOffset), this.impreciseHead = l.precise ? null : new tr(u.focusNode, u.focusOffset);
	}
	suppressWidgetCursorChange(e, t) {
		return this.hasComposition && t.empty && Mn(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset) && this.posFromDOM(e.focusNode, e.focusOffset) == t.head;
	}
	enforceCursorAssoc() {
		if (this.hasComposition) return;
		let { view: e } = this, t = e.state.selection.main, n = On(e.root), { anchorNode: r, anchorOffset: i } = e.observer.selectionRange;
		if (!n || !t.empty || !t.assoc || !n.modify) return;
		let a = this.lineAt(t.head, t.assoc);
		if (!a) return;
		let o = a.posAtStart;
		if (t.head == o || t.head == o + a.length) return;
		let s = this.coordsAt(t.head, -1), c = this.coordsAt(t.head, 1);
		if (!s || !c || s.bottom > c.top) return;
		let l = this.domAtPos(t.head + t.assoc, t.assoc);
		n.collapse(l.node, l.offset), n.modify("move", t.assoc < 0 ? "forward" : "backward", "lineboundary"), e.observer.readSelectionRange();
		let u = e.observer.selectionRange;
		e.docView.posFromDOM(u.anchorNode, u.anchorOffset) != t.from && n.collapse(r, i);
	}
	posFromDOM(e, t) {
		let n = this.tile.nearest(e);
		if (!n) return this.tile.dom.compareDocumentPosition(e) & 2 ? 0 : this.view.state.doc.length;
		let r = n.posAtStart;
		if (n.isComposite()) {
			let i;
			if (e == n.dom) i = n.dom.childNodes[t];
			else {
				let r = In(e) == 0 ? 0 : t == 0 ? -1 : 1;
				for (;;) {
					let t = e.parentNode;
					if (t == n.dom) break;
					r == 0 && t.firstChild != t.lastChild && (r = e == t.firstChild ? -1 : 1), e = t;
				}
				i = r < 0 ? e : e.nextSibling;
			}
			if (i == n.dom.firstChild) return r;
			for (; i && !L.get(i);) i = i.nextSibling;
			if (!i) return r + n.length;
			for (let e = 0, t = r;; e++) {
				let r = n.children[e];
				if (r.dom == i) return t;
				t += r.length + r.breakAfter;
			}
		} else if (n.isText()) return e == n.dom ? r + t : r + (t ? n.length : 0);
		else return r;
	}
	domAtPos(e, t) {
		let { tile: n, offset: r } = this.tile.resolveBlock(e, t);
		return n.isWidget() ? n.domPosFor(r, t) : n.domIn(r, t);
	}
	inlineDOMNearPos(e, t) {
		let n, r = -1, i = !1, a, o = -1, s = !1;
		return this.tile.blockTiles((t, c) => {
			if (t.isWidget()) {
				if (t.flags & 32 && c >= e) return !0;
				t.flags & 16 && (i = !0);
			} else {
				let l = c + t.length;
				if (c <= e && (n = t, r = e - c, i = l < e), l >= e && !a && (a = t, o = e - c, s = c > e), c > e && a) return !0;
			}
		}), !n && !a ? this.domAtPos(e, t) : (i && a ? n = null : s && n && (a = null), n && t < 0 || !a ? n.domIn(r, t) : a.domIn(o, t));
	}
	coordsAt(e, t, n) {
		let { tile: r, offset: i } = this.tile.resolveBlock(e, t);
		return r.isWidget() ? r.widget instanceof Vi ? null : r.coordsInWidget(i, t, !0) : r.coordsIn(i, t, n);
	}
	lineAt(e, t) {
		let { tile: n } = this.tile.resolveBlock(e, t);
		return n.isLine() ? n : null;
	}
	coordsForChar(e) {
		let { tile: t, offset: n } = this.tile.resolveBlock(e, 1);
		if (!t.isLine()) return null;
		function r(e, t) {
			if (e.isComposite()) for (let n of e.children) {
				if (n.length >= t) {
					let e = r(n, t);
					if (e) return e;
				}
				if (t -= n.length, t < 0) break;
			}
			else if (e.isText() && t < e.length) {
				let n = w(e.text, t);
				if (n == t) return null;
				let r = Jn(e.dom, t, n).getClientRects();
				for (let e = 0; e < r.length; e++) {
					let t = r[e];
					if (e == r.length - 1 || t.top < t.bottom && t.left < t.right) return t;
				}
			}
			return null;
		}
		return r(t, n);
	}
	measureVisibleLineHeights(e) {
		let t = [], { from: n, to: r } = e, i = this.view.contentDOM.clientWidth, a = i > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1, o = -1, s = this.view.textDirection == P.LTR, c = 0, l = (e, u, d) => {
			for (let f = 0; f < e.children.length && !(u > r); f++) {
				let r = e.children[f], p = u + r.length, m = r.dom.getBoundingClientRect(), { height: h } = m;
				if (d && !f && (c += m.top - d.top), r instanceof oi) p > n && l(r, u, m);
				else if (u >= n && (c > 0 && t.push(-c), t.push(h + c), c = 0, a)) {
					let e = r.dom.lastChild, t = e ? jn(e) : [];
					if (t.length) {
						let e = t[t.length - 1], n = s ? e.right - m.left : m.right - e.left;
						n > o && (o = n, this.minWidth = i, this.minWidthFrom = u, this.minWidthTo = p);
					}
				}
				d && f == e.children.length - 1 && (c += d.bottom - m.bottom), u = p + r.breakAfter;
			}
		};
		return l(this.tile, 0, null), t;
	}
	textDirectionAt(e) {
		let { tile: t } = this.tile.resolveBlock(e, 1);
		return getComputedStyle(t.dom).direction == "rtl" ? P.RTL : P.LTR;
	}
	measureTextSize() {
		let e = this.tile.blockTiles((e) => {
			if (e.isLine() && e.children.length && e.length <= 20) {
				let t = 0, n;
				for (let r of e.children) {
					if (!r.isText() || /[^ -~]/.test(r.text)) return;
					let e = jn(r.dom);
					if (e.length != 1) return;
					t += e[0].width, n = e[0].height;
				}
				if (t) return {
					lineHeight: e.dom.getBoundingClientRect().height,
					charWidth: t / e.length,
					textHeight: n
				};
			}
		});
		if (e) return e;
		let t = document.createElement("div"), n, r, i;
		return t.className = "cm-line", t.style.width = "99999px", t.style.position = "absolute", t.textContent = "abc def ghi jkl mno pqr stu", this.view.observer.ignore(() => {
			this.tile.dom.appendChild(t);
			let e = jn(t.firstChild)[0];
			n = t.getBoundingClientRect().height, r = e && e.width ? e.width / 27 : 7, i = e && e.height ? e.height : n, t.remove();
		}), {
			lineHeight: n,
			charWidth: r,
			textHeight: i
		};
	}
	computeBlockGapDeco() {
		let e = [], t = this.view.viewState;
		for (let n = 0, r = 0;; r++) {
			let i = r == t.viewports.length ? null : t.viewports[r], a = i ? i.from - 1 : this.view.state.doc.length;
			if (a > n) {
				let r = (t.lineBlockAt(a).bottom - t.lineBlockAt(n).top) / this.view.scaleY;
				e.push(N.replace({
					widget: new Vi(r),
					block: !0,
					inclusive: !0,
					isBlockGap: !0
				}).range(n, a));
			}
			if (!i) break;
			n = i.to + 1;
		}
		return N.set(e);
	}
	updateDeco() {
		let e = 1, t = this.view.state.facet(Gr).map((t) => (this.dynamicDecorationMap[e++] = typeof t == "function") ? t(this.view) : t), n = !1, r = this.view.state.facet(qr).map((e, t) => {
			let r = typeof e == "function";
			return r && (n = !0), r ? e(this.view) : e;
		});
		for (r.length && (this.dynamicDecorationMap[e++] = n, t.push(A.join(r))), this.decorations = [
			this.editContextFormatting,
			...t,
			this.computeBlockGapDeco(),
			this.view.viewState.lineGapDeco
		]; e < this.decorations.length;) this.dynamicDecorationMap[e++] = !1;
		this.blockWrappers = this.view.state.facet(Kr).map((e) => typeof e == "function" ? e(this.view) : e);
	}
	scrollIntoView(e) {
		if (e.isSnapshot) {
			let t = this.view.viewState.lineBlockAt(e.range.head);
			this.view.scrollDOM.scrollTop = t.top - e.yMargin, this.view.scrollDOM.scrollLeft = e.xMargin;
			return;
		}
		for (let t of this.view.state.facet(Pr)) try {
			if (t(this.view, e.range, e)) return !0;
		} catch (e) {
			Rr(this.view.state, e, "scroll handler");
		}
		let { range: t } = e, n = this.coordsAt(t.head, t.assoc || (t.head > t.anchor ? -1 : 1)), r;
		if (!n) return;
		!t.empty && (r = this.coordsAt(t.anchor, t.anchor > t.head ? -1 : 1)) && (n = {
			left: Math.min(n.left, r.left),
			top: Math.min(n.top, r.top),
			right: Math.max(n.right, r.right),
			bottom: Math.max(n.bottom, r.bottom)
		});
		let i = Qr(this.view), a = {
			left: n.left - i.left,
			top: n.top - i.top,
			right: n.right + i.right,
			bottom: n.bottom + i.bottom
		}, { offsetWidth: o, offsetHeight: s } = this.view.scrollDOM;
		if (Bn(this.view.scrollDOM, a, t.head < t.anchor ? -1 : 1, e.x, e.y, Math.max(Math.min(e.xMargin, o), -o), Math.max(Math.min(e.yMargin, s), -s), this.view.textDirection == P.LTR), window.visualViewport && window.innerHeight - window.visualViewport.height > 1 && (n.top > window.visualViewport.offsetTop + window.visualViewport.height || n.bottom < window.visualViewport.offsetTop)) {
			let e = this.view.docView.lineAt(t.head, 1);
			if (e) {
				let t = Un(e.dom);
				e.dom.scrollIntoView({ block: "nearest" }), Wn(t, !1);
			}
		}
	}
	lineHasWidget(e) {
		let t = (e) => e.isWidget() || e.children.some(t);
		return t(this.tile.resolveBlock(e, 1).tile);
	}
	destroy() {
		Ai(this.tile);
	}
};
function Ai(e, t) {
	let n = t?.get(e);
	if (n != 1) {
		n ?? e.destroy();
		for (let n of e.children) Ai(n, t);
	}
}
function ji(e) {
	return e.node.nodeType == 1 && e.node.firstChild && (e.offset == 0 || e.node.childNodes[e.offset - 1].contentEditable == "false") && (e.offset == e.node.childNodes.length || e.node.childNodes[e.offset].contentEditable == "false");
}
function Mi(e, t) {
	let n = e.observer.selectionRange;
	if (!n.focusNode) return null;
	let r = $n(n.focusNode, n.focusOffset), i = er(n.focusNode, n.focusOffset), a = r || i;
	if (i && r && i.node != r.node) {
		let t = L.get(i.node);
		if (!t || t.isText() && t.text != i.node.nodeValue) a = i;
		else if (e.docView.lastCompositionAfterCursor) {
			let e = L.get(r.node);
			!e || e.isText() && e.text != r.node.nodeValue || (a = i);
		}
	}
	if (e.docView.lastCompositionAfterCursor = a != r, !a) return null;
	let o = t - a.offset;
	return {
		from: o,
		to: o + a.node.nodeValue.length,
		node: a.node
	};
}
function Ni(e, t, n) {
	let r = Mi(e, n);
	if (!r) return null;
	let { node: i, from: a, to: o } = r, s = i.nodeValue;
	if (/[\n\r]/.test(s) || e.state.doc.sliceString(r.from, r.to) != s) return null;
	let c = t.invertedDesc;
	return {
		range: new ei(c.mapPos(a), c.mapPos(o), a, o),
		text: i
	};
}
function Pi(e, t) {
	return e.nodeType == 1 ? (t && e.childNodes[t - 1].contentEditable == "false" ? 1 : 0) | (t < e.childNodes.length && e.childNodes[t].contentEditable == "false" ? 2 : 0) : 0;
}
var Fi = class {
	constructor() {
		this.changes = [];
	}
	compareRange(e, t) {
		En(e, t, this.changes);
	}
	comparePoint(e, t) {
		En(e, t, this.changes);
	}
	boundChange(e) {
		En(e, e, this.changes);
	}
};
function Ii(e, t, n) {
	let r = new Fi();
	return A.compare(e, t, n, r), r.changes;
}
var Li = class {
	constructor() {
		this.changes = [];
	}
	compareRange(e, t) {
		En(e, t, this.changes);
	}
	comparePoint() {}
	boundChange(e) {
		En(e, e, this.changes);
	}
};
function Ri(e, t, n) {
	let r = new Li();
	return A.compare(e, t, n, r), r.changes;
}
function zi(e, t) {
	for (let n = e; n && n != t; n = n.assignedSlot || n.parentNode) if (n.nodeType == 1 && n.contentEditable == "false") return !0;
	return !1;
}
function Bi(e, t) {
	let n = !1;
	return t && e.iterChangedRanges((e, r) => {
		e < t.to && r > t.from && (n = !0);
	}), n;
}
var Vi = class extends yn {
	constructor(e) {
		super(), this.height = e;
	}
	toDOM() {
		let e = document.createElement("div");
		return e.className = "cm-gap", this.updateDOM(e), e;
	}
	eq(e) {
		return e.height == this.height;
	}
	updateDOM(e) {
		return e.style.height = this.height + "px", !0;
	}
	get editable() {
		return !0;
	}
	get estimatedHeight() {
		return this.height;
	}
	ignoreEvent() {
		return !1;
	}
};
function Hi(e, t, n = 1) {
	let r = e.charCategorizer(t), i = e.doc.lineAt(t), a = t - i.from;
	if (i.length == 0) return T.cursor(t);
	a == 0 ? n = 1 : a == i.length && (n = -1);
	let o = a, s = a;
	n < 0 ? o = w(i.text, a, !1) : s = w(i.text, a);
	let c = r(i.text.slice(o, s));
	for (; o > 0;) {
		let e = w(i.text, o, !1);
		if (r(i.text.slice(e, o)) != c) break;
		o = e;
	}
	for (; s < i.length;) {
		let e = w(i.text, s);
		if (r(i.text.slice(s, e)) != c) break;
		s = e;
	}
	return T.undirectionalRange(o + i.from, s + i.from);
}
function Ui(e, t, n, r, i) {
	let a = Math.round((r - t.left) * e.defaultCharacterWidth);
	if (e.lineWrapping && n.height > e.defaultLineHeight * 1.5) {
		let t = e.viewState.heightOracle.textHeight, r = Math.floor((i - n.top - (e.defaultLineHeight - t) * .5) / t);
		a += r * e.viewState.heightOracle.lineLength;
	}
	let o = e.state.sliceDoc(n.from, n.to);
	return n.from + zt(o, a, e.state.tabSize);
}
function Wi(e, t, n) {
	let r = e.lineBlockAt(t);
	if (Array.isArray(r.type)) {
		let e;
		for (let i of r.type) {
			if (i.from > t) break;
			if (!(i.to < t)) {
				if (i.from < t && i.to > t) return i;
				(!e || i.type == bn.Text && (e.type != i.type || (n < 0 ? i.from < t : i.to > t))) && (e = i);
			}
		}
		return e || r;
	}
	return r;
}
function Gi(e, t, n, r) {
	let i = Wi(e, t.head, t.assoc || -1), a = !r || i.type != bn.Text || !(e.lineWrapping || i.widgetLineBreaks) ? null : e.coordsAtPos(t.assoc < 0 && t.head > i.from ? t.head - 1 : t.head);
	if (a) {
		let t = e.dom.getBoundingClientRect(), r = e.textDirectionAt(i.from), o = e.posAtCoords({
			x: n == (r == P.LTR) ? t.right - 1 : t.left + 1,
			y: (a.top + a.bottom) / 2
		});
		if (o != null) return T.cursor(o, n ? -1 : 1);
	}
	return T.cursor(n ? i.to : i.from, n ? -1 : 1);
}
function Ki(e, t, n, r) {
	let i = e.state.doc.lineAt(t.head), a = e.bidiSpans(i), o = e.textDirectionAt(i.from);
	for (let s = t, c = null;;) {
		let t = xr(i, a, o, s, n), l = br;
		if (!t) {
			if (i.number == (n ? e.state.doc.lines : 1)) return s;
			l = "\n", i = e.state.doc.line(i.number + (n ? 1 : -1)), a = e.bidiSpans(i), t = e.visualLineSide(i, !n);
		}
		if (!c) {
			if (!r) return t;
			c = r(l);
		} else if (!c(l)) return s;
		s = t;
	}
}
function qi(e, t, n) {
	let r = e.state.charCategorizer(t), i = r(n);
	return (e) => {
		let t = r(e);
		return i == O.Space && (i = t), i == t;
	};
}
function Ji(e, t, n, r) {
	let i = t.head, a = n ? 1 : -1;
	if (i == (n ? e.state.doc.length : 0)) return T.cursor(i, t.assoc);
	let o = t.goalColumn, s, c = e.contentDOM.getBoundingClientRect(), l = e.coordsAtPos(i, t.assoc || ((t.empty ? n : t.head == t.from) ? 1 : -1)), u = e.documentTop;
	if (l) o ??= l.left - c.left, s = a < 0 ? l.top : l.bottom;
	else {
		let t = e.viewState.lineBlockAt(i);
		o ??= Math.min(c.right - c.left, e.defaultCharacterWidth * (i - t.from)), s = (a < 0 ? t.top : t.bottom) + u;
	}
	let d = c.left + o, f = e.viewState.heightOracle.textHeight >> 1, p = r ?? f;
	for (let t = 0;; t += f) {
		let r = s + (p + t) * a, i = $i(e, {
			x: d,
			y: r
		}, !1, a);
		if (n ? r > c.bottom : r < c.top) return T.cursor(i.pos, i.assoc);
		let l = e.coordsAtPos(i.pos, i.assoc), u = l ? (l.top + l.bottom) / 2 : 0;
		if (!l || (n ? u > s : u < s)) return T.cursor(i.pos, i.assoc, void 0, o);
	}
}
function Yi(e, t, n) {
	for (;;) {
		let r = 0;
		for (let i of e) i.between(t - 1, t + 1, (e, i, a) => {
			if (t > e && t < i) {
				let a = r || n || (t - e < i - t ? -1 : 1);
				t = a < 0 ? e : i, r = a;
			}
		});
		if (!r) return t;
	}
}
function Xi(e, t) {
	let n = null;
	for (let r = 0; r < t.ranges.length; r++) {
		let i = t.ranges[r], a = null;
		if (i.empty) {
			let t = Yi(e, i.from, 0);
			t != i.from && (a = T.cursor(t, -1));
		} else {
			let t = Yi(e, i.from, -1), n = Yi(e, i.to, 1);
			(t != i.from || n != i.to) && (a = i.undirectional ? T.undirectionalRange(i.from, i.to) : T.range(i.from == i.anchor ? t : n, i.from == i.head ? t : n));
		}
		a && (n ||= t.ranges.slice(), n[r] = a);
	}
	return n ? T.create(n, t.mainIndex) : t;
}
function Zi(e, t, n) {
	let r = Yi(e.state.facet(Jr).map((t) => t(e)), n.from, t.head > n.from ? -1 : 1);
	return r == n.from ? n : T.cursor(r, r < n.from ? 1 : -1);
}
var Qi = class {
	constructor(e, t) {
		this.pos = e, this.assoc = t;
	}
};
function $i(e, t, n, r) {
	let i = e.contentDOM.getBoundingClientRect(), a = i.top + e.viewState.paddingTop, { x: o, y: s } = t, c = s - a, l;
	for (;;) {
		if (c < 0) return new Qi(0, 1);
		if (c > e.viewState.docHeight) return new Qi(e.state.doc.length, -1);
		if (l = e.elementAtHeight(c), r == null) break;
		if (l.type == bn.Text) {
			if (r < 0 ? l.to < e.viewport.from : l.from > e.viewport.to) break;
			let t = e.docView.coordsAt(r < 0 ? l.from : l.to, r > 0 ? -1 : 1);
			if (t && (r < 0 ? t.top <= c + a : t.bottom >= c + a)) break;
		}
		let t = e.viewState.heightOracle.textHeight / 2;
		c = r > 0 ? l.bottom + t : l.top - t;
	}
	if (e.viewport.from >= l.to || e.viewport.to <= l.from) {
		if (n) return null;
		if (l.type == bn.Text) {
			let t = Ui(e, i, l, o, s);
			return new Qi(t, t == l.from ? 1 : -1);
		}
	}
	if (l.type != bn.Text) return c < (l.top + l.bottom) / 2 ? new Qi(l.from, 1) : new Qi(l.to, -1);
	let u = e.docView.lineAt(l.from, 2);
	return (!u || u.length != l.length) && (u = e.docView.lineAt(l.from, -2)), new ea(e, o, s, e.textDirectionAt(l.from)).scanTile(u, l.from);
}
var ea = class {
	constructor(e, t, n, r) {
		this.view = e, this.x = t, this.y = n, this.baseDir = r, this.line = null, this.spans = null;
	}
	bidiSpansAt(e) {
		return (!this.line || this.line.from > e || this.line.to < e) && (this.line = this.view.state.doc.lineAt(e), this.spans = this.view.bidiSpans(this.line)), this;
	}
	baseDirAt(e, t) {
		let { line: n, spans: r } = this.bidiSpansAt(e);
		return r[dr.find(r, e - n.from, -1, t)].level == this.baseDir;
	}
	dirAt(e, t) {
		let { line: n, spans: r } = this.bidiSpansAt(e);
		return r[dr.find(r, e - n.from, -1, t)].dir;
	}
	bidiIn(e, t) {
		let { spans: n, line: r } = this.bidiSpansAt(e);
		return n.length > 1 || n.length && (n[0].level != this.baseDir || n[0].to + r.from < t);
	}
	scan(e, t, n = !1) {
		let r = 0, i = e.length - 1, a = /* @__PURE__ */ new Set(), o = this.bidiIn(e[0], e[i]), s, c, l = -1, u = 1e9, d;
		search: for (; r < i;) {
			let n = i - r, f = r + i >> 1;
			adjust: if (a.has(f)) {
				for (let e = 1; e < n; e++) {
					let t = f + e;
					if (t >= i && (t -= n), !a.has(t)) {
						f = t;
						break adjust;
					}
				}
				break search;
			}
			a.add(f);
			let p = t(f), m = 0;
			if (p) for (let e = 0; e < p.length; e++) {
				let t = p[e];
				if (!(t.width == 0 && p.length > 1)) {
					if (t.bottom < this.y) (!s || s.bottom < t.bottom) && (s = t), m = 1;
					else if (t.top > this.y) (!c || c.top > t.top) && (c = t), m = -1;
					else {
						let e = t.left > this.x ? this.x - t.left : t.right < this.x ? this.x - t.right : 0, n = Math.abs(e);
						n < u && (l = f, u = n, d = t), e && (m = e < 0 == (this.baseDir == P.LTR) ? -1 : 1);
					}
				}
			}
			m == -1 && (!o || this.baseDirAt(e[f], 1)) ? i = f : m == 1 && (!o || this.baseDirAt(e[f + 1], -1)) && (r = f + 1);
		}
		if (!d) {
			if (!c && !s) return {
				i: e[0],
				after: !1
			};
			let n = s && (!c || this.y - s.bottom < c.top - this.y) ? s : c;
			return this.y = (n.top + n.bottom) / 2, this.scan(e, t, !0);
		}
		if (u && !n) {
			let { top: n, bottom: r } = d;
			if (s && s.bottom > (n + n + r) / 3) return this.y = s.bottom - 1, this.scan(e, t, !0);
			if (c && c.top < (n + r + r) / 3) return this.y = c.top + 1, this.scan(e, t, !0);
		}
		let f = (o ? this.dirAt(e[l], 1) : this.baseDir) == P.LTR;
		return {
			i: l,
			after: this.x > (d.left + d.right) / 2 == f
		};
	}
	scanText(e, t) {
		let n = [];
		for (let r = 0; r < e.length; r = w(e.text, r)) n.push(t + r);
		n.push(t + e.length);
		let r = this.scan(n, (r) => {
			let i = n[r] - t, a = n[r + 1] - t;
			return Jn(e.dom, i, a).getClientRects();
		});
		return r.after ? new Qi(n[r.i + 1], -1) : new Qi(n[r.i], 1);
	}
	scanTile(e, t) {
		if (!e.length) return new Qi(t, 1);
		if (e.children.length == 1) {
			let n = e.children[0];
			if (n.isText()) return this.scanText(n, t);
			if (n.isComposite()) return this.scanTile(n, t);
		}
		let n = [t];
		for (let r = 0, i = t; r < e.children.length; r++) n.push(i += e.children[r].length);
		let r = this.scan(n, (t) => {
			let n = e.children[t];
			return n.flags & 48 ? null : (n.dom.nodeType == 1 ? n.dom : Jn(n.dom, 0, n.length)).getClientRects();
		}), i = e.children[r.i], a = n[r.i];
		return i.isText() ? this.scanText(i, a) : i.isComposite() ? this.scanTile(i, a) : r.after ? new Qi(n[r.i + 1], -1) : new Qi(a, 1);
	}
}, ta = "￿", na = class {
	constructor(e, t) {
		this.points = e, this.view = t, this.text = "", this.lineSeparator = t.state.facet(k.lineSeparator);
	}
	append(e) {
		this.text += e;
	}
	lineBreak() {
		this.text += ta;
	}
	readRange(e, t) {
		if (!e) return this;
		let n = e.parentNode;
		for (let r = e;;) {
			this.findPointBefore(n, r);
			let e = this.text.length;
			this.readNode(r);
			let i = L.get(r), a = r.nextSibling;
			if (a == t) {
				i?.breakAfter && !a && n != this.view.contentDOM && this.lineBreak();
				break;
			}
			let o = L.get(a);
			(i && o ? i.breakAfter : (i ? i.breakAfter : Pn(r)) || Pn(a) && (r.nodeName != "BR" || i?.isWidget()) && this.text.length > e) && !ia(a, t) && this.lineBreak(), r = a;
		}
		return this.findPointBefore(n, t), this;
	}
	readTextNode(e) {
		let t = e.nodeValue;
		for (let n of this.points) n.node == e && (n.pos = this.text.length + Math.min(n.offset, t.length));
		for (let n = 0, r = this.lineSeparator ? null : /\r\n?|\n/g;;) {
			let i = -1, a = 1, o;
			if (this.lineSeparator ? (i = t.indexOf(this.lineSeparator, n), a = this.lineSeparator.length) : (o = r.exec(t)) && (i = o.index, a = o[0].length), this.append(t.slice(n, i < 0 ? t.length : i)), i < 0) break;
			if (this.lineBreak(), a > 1) for (let t of this.points) t.node == e && t.pos > this.text.length && (t.pos -= a - 1);
			n = i + a;
		}
	}
	readNode(e) {
		let t = L.get(e), n = t && t.overrideDOMText;
		if (n != null) {
			this.findPointInside(e, n.length);
			for (let e = n.iter(); !e.next().done;) e.lineBreak ? this.lineBreak() : this.append(e.value);
		} else e.nodeType == 3 ? this.readTextNode(e) : e.nodeName == "BR" ? e.nextSibling && this.lineBreak() : e.nodeType == 1 && this.readRange(e.firstChild, null);
	}
	findPointBefore(e, t) {
		for (let n of this.points) n.node == e && e.childNodes[n.offset] == t && (n.pos = this.text.length);
	}
	findPointInside(e, t) {
		for (let n of this.points) (e.nodeType == 3 ? n.node == e : e.contains(n.node)) && (n.pos = this.text.length + (ra(e, n.node, n.offset) ? t : 0));
	}
};
function ra(e, t, n) {
	for (;;) {
		if (!t || n < In(t)) return !1;
		if (t == e) return !0;
		n = Nn(t) + 1, t = t.parentNode;
	}
}
function ia(e, t) {
	let n;
	for (; !(e == t || !e); e = e.nextSibling) {
		let t = L.get(e);
		if (!t?.isWidget()) return !1;
		t && (n ||= []).push(t);
	}
	if (n) {
		for (let e of n) if (e.overrideDOMText?.length) return !1;
	}
	return !0;
}
var aa = class {
	constructor(e, t) {
		this.node = e, this.offset = t, this.pos = -1;
	}
}, oa = class {
	constructor(e, t, n, r) {
		this.typeOver = r, this.bounds = null, this.text = "", this.domChanged = t > -1;
		let { impreciseHead: i, impreciseAnchor: a } = e.docView, o = e.state.selection;
		if (e.state.readOnly && t > -1) this.newSel = null;
		else if (t > -1 && (this.bounds = sa(e.docView.tile, t, n, 0))) {
			let t = i || a ? [] : fa(e), n = new na(t, e);
			n.readRange(this.bounds.startDOM, this.bounds.endDOM), this.text = n.text, this.newSel = pa(t, this.bounds.from);
		} else {
			let t = e.observer.selectionRange, n = i && i.node == t.focusNode && i.offset == t.focusOffset || !kn(e.contentDOM, t.focusNode) ? o.main.head : e.docView.posFromDOM(t.focusNode, t.focusOffset), r = a && a.node == t.anchorNode && a.offset == t.anchorOffset || !kn(e.contentDOM, t.anchorNode) ? o.main.anchor : e.docView.posFromDOM(t.anchorNode, t.anchorOffset), s = e.viewport;
			if ((M.ios || M.chrome) && n != r && Math.min(n, r) <= o.main.from && Math.max(n, r) >= o.main.to && (s.from > 0 || s.to < e.state.doc.length)) {
				let t = Math.min(n, r), i = Math.max(n, r), a = s.from - t, o = s.to - i;
				(a == 0 || a == 1 || t == 0) && (o == 0 || o == -1 || i == e.state.doc.length) && (n = 0, r = e.state.doc.length);
			}
			if (e.inputState.composing > -1 && o.ranges.length > 1) this.newSel = o.replaceRange(T.range(r, n));
			else if (e.lineWrapping && r == n && !(o.main.empty && o.main.head == n) && e.inputState.lastTouchTime > Date.now() - 100) {
				let t = e.coordsAtPos(n, -1), r = 0;
				t && (r = e.inputState.lastTouchY <= t.bottom ? -1 : 1), this.newSel = T.create([T.cursor(n, r)]);
			} else this.newSel = T.single(r, n);
		}
	}
};
function sa(e, t, n, r) {
	if (e.isComposite()) {
		let i = -1, a = -1, o = -1, s = -1;
		for (let c = 0, l = r, u = r; c < e.children.length; c++) {
			let r = e.children[c], d = l + r.length;
			if (l < t && d > n) return sa(r, t, n, l);
			if (d >= t && i == -1 && (i = c, a = l), l > n && r.dom.parentNode == e.dom) {
				o = c, s = u;
				break;
			}
			u = d, l = d + r.breakAfter;
		}
		return {
			from: a,
			to: s < 0 ? r + e.length : s,
			startDOM: (i ? e.children[i - 1].dom.nextSibling : null) || e.dom.firstChild,
			endDOM: o < e.children.length && o >= 0 ? e.children[o].dom : null
		};
	}
	return e.isText() ? {
		from: r,
		to: r + e.length,
		startDOM: e.dom,
		endDOM: e.dom.nextSibling
	} : null;
}
function ca(e, t) {
	let n, { newSel: r } = t, { state: i } = e, a = i.selection.main, o = e.inputState.lastKeyTime > Date.now() - 100 ? e.inputState.lastKeyCode : -1;
	if (t.bounds) {
		let { from: e, to: r } = t.bounds, s = a.from, c = null;
		(o === 8 || M.android && t.text.length < r - e) && (s = a.to, c = "end");
		let l = i.doc.sliceString(e, r, ta), u, d;
		!a.empty && a.from >= e && a.to <= r && (t.typeOver || l != t.text) && l.slice(0, a.from - e) == t.text.slice(0, a.from - e) && l.slice(a.to - e) == t.text.slice(u = t.text.length - (l.length - (a.to - e))) ? n = {
			from: a.from,
			to: a.to,
			insert: C.of(t.text.slice(a.from - e, u).split(ta))
		} : (d = da(l, t.text, s - e, c)) && (M.chrome && o == 13 && d.toB == d.from + 2 && t.text.slice(d.from, d.toB) == "￿￿" && d.toB--, n = {
			from: e + d.from,
			to: e + d.toA,
			insert: C.of(t.text.slice(d.from, d.toB).split(ta))
		});
	} else r && (!e.hasFocus && i.facet(zr) || ma(r, a)) && (r = null);
	if (!n && !r) return !1;
	if ((M.mac || M.android) && n && n.from == n.to && n.from == a.head - 1 && /^\. ?$/.test(n.insert.toString()) && e.contentDOM.getAttribute("autocorrect") == "off" ? (r && n.insert.length == 2 && (r = T.single(r.main.anchor - 1, r.main.head - 1)), n = {
		from: n.from,
		to: n.to,
		insert: C.of([n.insert.toString().replace(".", " ")])
	}) : i.doc.lineAt(a.from).to < a.to && e.docView.lineHasWidget(a.to) && e.inputState.insertingTextAt > Date.now() - 50 ? n = {
		from: a.from,
		to: a.to,
		insert: i.toText(e.inputState.insertingText)
	} : M.chrome && n && n.from == n.to && n.from == a.head && n.insert.toString() == "\n " && e.lineWrapping && (r &&= T.single(r.main.anchor - 1, r.main.head - 1), n = {
		from: a.from,
		to: a.to,
		insert: C.of([" "])
	}), n) return la(e, n, r, o);
	if (r && !ma(r, a)) {
		let t = !1, n = "select";
		return e.inputState.lastSelectionTime > Date.now() - 50 && (e.inputState.lastSelectionOrigin == "select" && (t = !0), n = e.inputState.lastSelectionOrigin, n == "select.pointer" && (r = Xi(i.facet(Jr).map((t) => t(e)), r))), e.dispatch({
			selection: r,
			scrollIntoView: t,
			userEvent: n
		}), !0;
	}
	return !1;
}
function la(e, t, n, r = -1) {
	if (M.ios && e.inputState.flushIOSKey(t)) return !0;
	let i = e.state.selection.main;
	if (M.android && (t.to == i.to && (t.from == i.from || t.from == i.from - 1 && e.state.sliceDoc(t.from, i.from) == " ") && t.insert.length == 1 && t.insert.lines == 2 && Yn(e.contentDOM, "Enter", 13) || (t.from == i.from - 1 && t.to == i.to && t.insert.length == 0 || r == 8 && t.insert.length < t.to - t.from && t.to > i.head) && Yn(e.contentDOM, "Backspace", 8) || t.from == i.from && t.to == i.to + 1 && t.insert.length == 0 && Yn(e.contentDOM, "Delete", 46))) return !0;
	let a = t.insert.toString();
	e.inputState.composing >= 0 && e.inputState.composing++;
	let o, s = () => o ||= ua(e, t, n);
	return e.state.facet(Or).some((n) => n(e, t.from, t.to, a, s)) || e.dispatch(s()), !0;
}
function ua(e, t, n) {
	let r, i = e.state, a = i.selection.main, o = -1;
	if (t.from == t.to && t.from < a.from || t.from > a.to) {
		let n = t.from < a.from ? -1 : 1, r = n < 0 ? a.from : a.to, s = Yi(i.facet(Jr).map((t) => t(e)), r, n);
		t.from == s && (o = s);
	}
	if (o > -1) r = {
		changes: t,
		selection: T.cursor(t.from + t.insert.length, -1)
	};
	else if (t.from >= a.from && t.to <= a.to && t.to - t.from >= (a.to - a.from) / 3 && (!n || n.main.empty && n.main.from == t.from + t.insert.length) && e.inputState.composing < 0) {
		let n = a.from < t.from ? i.sliceDoc(a.from, t.from) : "", o = a.to > t.to ? i.sliceDoc(t.to, a.to) : "";
		r = i.replaceSelection(e.state.toText(n + t.insert.sliceString(0, void 0, e.state.lineBreak) + o));
	} else {
		let o = i.changes(t), s = n && n.main.to <= o.newLength ? n.main : void 0;
		if (i.selection.ranges.length > 1 && (e.inputState.composing >= 0 || e.inputState.compositionPendingChange) && t.to <= a.to + 10 && t.to >= a.to - 10) {
			let c = e.state.sliceDoc(t.from, t.to), l, u = n && Mi(e, n.main.head);
			if (u) {
				let e = t.insert.length - (t.to - t.from);
				l = {
					from: u.from,
					to: u.to - e
				};
			} else l = e.state.doc.lineAt(a.head);
			let d = a.to - t.to;
			r = i.changeByRange((n) => {
				if (n.from == a.from && n.to == a.to) return {
					changes: o,
					range: s || n.map(o)
				};
				let r = n.to - d, u = r - c.length;
				if (e.state.sliceDoc(u, r) != c || r >= l.from && u <= l.to) return { range: n };
				let f = i.changes({
					from: u,
					to: r,
					insert: t.insert
				}), p = n.to - a.to;
				return {
					changes: f,
					range: s ? T.range(Math.max(0, s.anchor + p), Math.max(0, s.head + p)) : n.map(f)
				};
			});
		} else r = {
			changes: o,
			selection: s && i.selection.replaceRange(s)
		};
	}
	let s = "input.type";
	return (e.composing || e.inputState.compositionPendingChange && e.inputState.compositionEndedAt > Date.now() - 50) && (e.inputState.compositionPendingChange = !1, s += ".compose", e.inputState.compositionFirstChange && (s += ".start", e.inputState.compositionFirstChange = !1)), i.update(r, {
		userEvent: s,
		scrollIntoView: !0
	});
}
function da(e, t, n, r) {
	let i = Math.min(e.length, t.length), a = 0;
	for (; a < i && e.charCodeAt(a) == t.charCodeAt(a);) a++;
	if (a == i && e.length == t.length) return null;
	let o = e.length, s = t.length;
	for (; o > 0 && s > 0 && e.charCodeAt(o - 1) == t.charCodeAt(s - 1);) o--, s--;
	if (r == "end") {
		let e = Math.max(0, a - Math.min(o, s));
		n -= o + e - a;
	}
	if (o < a && e.length < t.length) {
		let e = n <= a && n >= o ? a - n : 0;
		a -= e, s = a + (s - o), o = a;
	} else if (s < a) {
		let e = n <= a && n >= s ? a - n : 0;
		a -= e, o = a + (o - s), s = a;
	}
	return {
		from: a,
		toA: o,
		toB: s
	};
}
function fa(e) {
	let t = [];
	if (e.root.activeElement != e.contentDOM) return t;
	let { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: a } = e.observer.selectionRange;
	return n && (t.push(new aa(n, r)), (i != n || a != r) && t.push(new aa(i, a))), t;
}
function pa(e, t) {
	if (e.length == 0) return null;
	let n = e[0].pos, r = e.length == 2 ? e[1].pos : n;
	return n > -1 && r > -1 ? T.single(n + t, r + t) : null;
}
function ma(e, t) {
	return t.head == e.main.head && t.anchor == e.main.anchor;
}
var ha = class {
	setSelectionOrigin(e) {
		this.lastSelectionOrigin = e, this.lastSelectionTime = Date.now();
	}
	constructor(e) {
		this.view = e, this.lastKeyCode = 0, this.lastKeyTime = 0, this.touchActive = !1, this.lastTouchTime = 0, this.lastTouchX = 0, this.lastTouchY = 0, this.lastFocusTime = 0, this.lastScrollTop = 0, this.lastScrollLeft = 0, this.lastWheelEvent = 0, this.pendingIOSKey = void 0, this.lastIOSMomentumScroll = 0, this.tabFocusMode = -1, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastContextMenu = 0, this.scrollHandlers = [], this.handlers = Object.create(null), this.composing = -1, this.compositionFirstChange = null, this.compositionEndedAt = 0, this.compositionPendingKey = !1, this.compositionPendingChange = !1, this.insertingText = "", this.insertingTextAt = 0, this.mouseSelection = null, this.draggedContent = null, this.handleEvent = this.handleEvent.bind(this), this.notifiedFocused = e.hasFocus, M.safari && e.contentDOM.addEventListener("input", () => null), M.gecko && Qa(e.contentDOM.ownerDocument);
	}
	handleEvent(e) {
		!ka(this.view, e) || this.ignoreDuringComposition(e) || e.type == "keydown" && this.keydown(e) || (this.view.updateState == 0 ? this.runHandlers(e.type, e) : Promise.resolve().then(() => this.runHandlers(e.type, e)));
	}
	runHandlers(e, t) {
		let n = this.handlers[e];
		if (n) {
			for (let e of n.observers) e(this.view, t);
			for (let e of n.handlers) {
				if (t.defaultPrevented) break;
				if (e(this.view, t)) {
					t.preventDefault();
					break;
				}
			}
		}
	}
	ensureHandlers(e) {
		let t = va(e), n = this.handlers, r = this.view.contentDOM;
		for (let e in t) if (e != "scroll") {
			let i = !t[e].handlers.length, a = n[e];
			a && i != !a.handlers.length && (r.removeEventListener(e, this.handleEvent), a = null), a || r.addEventListener(e, this.handleEvent, { passive: i });
		}
		for (let e in n) e != "scroll" && !t[e] && r.removeEventListener(e, this.handleEvent);
		this.handlers = t;
	}
	keydown(e) {
		if (this.lastKeyCode = e.keyCode, this.lastKeyTime = Date.now(), e.keyCode == 9 && this.tabFocusMode > -1 && (!this.tabFocusMode || Date.now() <= this.tabFocusMode)) return !0;
		if (this.tabFocusMode > 0 && e.keyCode != 27 && xa.indexOf(e.keyCode) < 0 && (this.tabFocusMode = -1), M.android && M.chrome && !e.synthetic && (e.keyCode == 13 || e.keyCode == 8)) return this.view.observer.delayAndroidKey(e.key, e.keyCode), !0;
		if (M.ios && !e.synthetic && !e.altKey && !e.metaKey && (ya.some((t) => t.keyCode == e.keyCode) && !e.ctrlKey || ba.indexOf(e.key) > -1 && e.ctrlKey)) {
			let t = {
				ctrlKey: e.ctrlKey,
				altKey: e.altKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey
			};
			return t.shiftKey && M.ios && !/^(off|none)$/.test(this.view.contentDOM.autocapitalize) && ga(this.view.win) && (t.shiftKey = !1), this.pendingIOSKey = {
				key: e.key,
				keyCode: e.keyCode,
				mods: t
			}, setTimeout(() => this.flushIOSKey(), 250), !0;
		}
		return e.keyCode != 229 && this.view.observer.forceFlush(), !1;
	}
	flushIOSKey(e) {
		let t = this.pendingIOSKey;
		return !t || t.key == "Enter" && e && e.from < e.to && /^\S+$/.test(e.insert.toString()) ? !1 : (this.pendingIOSKey = void 0, Yn(this.view.contentDOM, t.key, t.keyCode, t.mods));
	}
	ignoreDuringComposition(e) {
		return !/^key/.test(e.type) || e.synthetic ? !1 : this.composing > 0 ? !0 : M.safari && !M.ios && this.compositionPendingKey && Date.now() - this.compositionEndedAt < 100 ? (this.compositionPendingKey = !1, !0) : !1;
	}
	startMouseSelection(e) {
		this.mouseSelection && this.mouseSelection.destroy(), this.mouseSelection = e;
	}
	update(e) {
		this.view.observer.update(e), this.mouseSelection && this.mouseSelection.update(e), this.draggedContent && e.docChanged && (this.draggedContent = this.draggedContent.map(e.changes)), e.transactions.length && (this.lastKeyCode = this.lastSelectionTime = 0);
	}
	destroy() {
		this.mouseSelection && this.mouseSelection.destroy();
	}
};
function ga(e) {
	return e.visualViewport ? e.visualViewport.height * e.visualViewport.scale / e.document.documentElement.clientHeight < .85 : !1;
}
function _a(e, t) {
	return (n, r) => {
		try {
			return t.call(e, r, n);
		} catch (e) {
			Rr(n.state, e);
		}
	};
}
function va(e) {
	let t = Object.create(null);
	function n(e) {
		return t[e] || (t[e] = {
			observers: [],
			handlers: []
		});
	}
	for (let t of e) {
		let e = t.spec, r = e && e.plugin.domEventHandlers, i = e && e.plugin.domEventObservers;
		if (r) for (let e in r) {
			let i = r[e];
			i && n(e).handlers.push(_a(t.value, i));
		}
		if (i) for (let e in i) {
			let r = i[e];
			r && n(e).observers.push(_a(t.value, r));
		}
	}
	for (let e in Aa) n(e).handlers.push(Aa[e]);
	for (let e in ja) n(e).observers.push(ja[e]);
	return t;
}
var ya = [
	{
		key: "Backspace",
		keyCode: 8,
		inputType: "deleteContentBackward"
	},
	{
		key: "Enter",
		keyCode: 13,
		inputType: "insertParagraph"
	},
	{
		key: "Enter",
		keyCode: 13,
		inputType: "insertLineBreak"
	},
	{
		key: "Delete",
		keyCode: 46,
		inputType: "deleteContentForward"
	}
], ba = "dthko", xa = [
	16,
	17,
	18,
	20,
	91,
	92,
	224,
	225
], Sa = 6;
function Ca(e) {
	return Math.max(0, e) * .7 + 8;
}
function wa(e, t) {
	return Math.max(Math.abs(e.clientX - t.clientX), Math.abs(e.clientY - t.clientY));
}
var Ta = class {
	constructor(e, t, n, r) {
		this.view = e, this.startEvent = t, this.style = n, this.mustSelect = r, this.scrollSpeed = {
			x: 0,
			y: 0
		}, this.scrolling = -1, this.lastEvent = t, this.scrollParents = Vn(e.contentDOM), this.atoms = e.state.facet(Jr).map((t) => t(e));
		let i = e.contentDOM.ownerDocument;
		i.addEventListener("mousemove", this.move = this.move.bind(this)), i.addEventListener("mouseup", this.up = this.up.bind(this)), this.extend = t.shiftKey, this.multiple = e.state.facet(k.allowMultipleSelections) && Ea(e, t), this.dragging = Oa(e, t) && Va(t) == 1 ? null : !1;
	}
	start(e) {
		this.dragging === !1 && this.select(e);
	}
	move(e) {
		if (e.buttons == 0) return this.destroy();
		if (this.dragging || this.dragging == null && wa(this.startEvent, e) < 10) return;
		this.select(this.lastEvent = e);
		let t = 0, n = 0, r = 0, i = 0, a = this.view.win.innerWidth, o = this.view.win.innerHeight;
		this.scrollParents.x && ({left: r, right: a} = this.scrollParents.x.getBoundingClientRect()), this.scrollParents.y && ({top: i, bottom: o} = this.scrollParents.y.getBoundingClientRect());
		let s = Qr(this.view);
		e.clientX - s.left <= r + Sa ? t = -Ca(r - e.clientX) : e.clientX + s.right >= a - Sa && (t = Ca(e.clientX - a)), e.clientY - s.top <= i + Sa ? n = -Ca(i - e.clientY) : e.clientY + s.bottom >= o - Sa && (n = Ca(e.clientY - o)), this.setScrollSpeed(t, n);
	}
	up(e) {
		this.dragging ?? this.select(this.lastEvent), this.dragging || e.preventDefault(), this.destroy();
	}
	destroy() {
		this.setScrollSpeed(0, 0);
		let e = this.view.contentDOM.ownerDocument;
		e.removeEventListener("mousemove", this.move), e.removeEventListener("mouseup", this.up), this.view.inputState.mouseSelection = this.view.inputState.draggedContent = null;
	}
	setScrollSpeed(e, t) {
		this.scrollSpeed = {
			x: e,
			y: t
		}, e || t ? this.scrolling < 0 && (this.scrolling = setInterval(() => this.scroll(), 50)) : this.scrolling > -1 && (clearInterval(this.scrolling), this.scrolling = -1);
	}
	scroll() {
		let { x: e, y: t } = this.scrollSpeed;
		e && this.scrollParents.x && (this.scrollParents.x.scrollLeft += e, e = 0), t && this.scrollParents.y && (this.scrollParents.y.scrollTop += t, t = 0), (e || t) && this.view.win.scrollBy(e, t), this.dragging === !1 && this.select(this.lastEvent);
	}
	select(e) {
		let { view: t } = this, n = Xi(this.atoms, this.style.get(e, this.extend, this.multiple));
		(this.mustSelect || !n.eq(t.state.selection, this.dragging === !1)) && this.view.dispatch({
			selection: n,
			userEvent: "select.pointer"
		}), this.mustSelect = !1;
	}
	update(e) {
		e.transactions.some((e) => e.isUserEvent("input.type")) ? this.destroy() : this.style.update(e) && setTimeout(() => this.select(this.lastEvent), 20);
	}
};
function Ea(e, t) {
	let n = e.state.facet(Cr);
	return n.length ? n[0](t) : M.mac ? t.metaKey : t.ctrlKey;
}
function Da(e, t) {
	let n = e.state.facet(wr);
	return n.length ? n[0](t) : M.mac ? !t.altKey : !t.ctrlKey;
}
function Oa(e, t) {
	let { main: n } = e.state.selection;
	if (n.empty) return !1;
	let r = On(e.root);
	if (!r || r.rangeCount == 0) return !0;
	let i = r.getRangeAt(0).getClientRects();
	for (let e = 0; e < i.length; e++) {
		let n = i[e];
		if (n.left <= t.clientX && n.right >= t.clientX && n.top <= t.clientY && n.bottom >= t.clientY) return !0;
	}
	return !1;
}
function ka(e, t) {
	if (!t.bubbles) return !0;
	if (t.defaultPrevented) return !1;
	for (let n = t.target, r; n != e.contentDOM; n = n.parentNode) if (!n || n.nodeType == 11 || (r = L.get(n)) && r.isWidget() && !r.isHidden && r.widget.ignoreEvent(t)) return !1;
	return !0;
}
var Aa = /*@__PURE__*/ Object.create(null), ja = /*@__PURE__*/ Object.create(null), Ma = M.ie && M.ie_version < 15 || M.ios && M.webkit_version < 604;
function Na(e) {
	let t = e.dom.parentNode;
	if (!t) return;
	let n = t.appendChild(document.createElement("textarea"));
	n.style.cssText = "position: fixed; left: -10000px; top: 10px", n.focus(), setTimeout(() => {
		e.focus(), n.remove(), Fa(e, n.value);
	}, 50);
}
function Pa(e, t, n) {
	for (let r of e.facet(t)) n = r(n, e);
	return n;
}
function Fa(e, t) {
	t = Pa(e.state, Ar, t);
	let { state: n } = e, r, i = 1, a = n.toText(t), o = a.lines == n.selection.ranges.length;
	if (qa != null && n.selection.ranges.every((e) => e.empty) && qa == a.toString()) {
		let e = -1;
		r = n.changeByRange((r) => {
			let s = n.doc.lineAt(r.from);
			if (s.from == e) return { range: r };
			e = s.from;
			let c = n.toText((o ? a.line(i++).text : t) + n.lineBreak);
			return {
				changes: {
					from: s.from,
					insert: c
				},
				range: T.cursor(r.from + c.length)
			};
		});
	} else r = o ? n.changeByRange((e) => {
		let t = a.line(i++);
		return {
			changes: {
				from: e.from,
				to: e.to,
				insert: t.text
			},
			range: T.cursor(e.from + t.length)
		};
	}) : n.replaceSelection(a);
	e.dispatch(r, {
		userEvent: "input.paste",
		scrollIntoView: !0
	});
}
ja.scroll = (e) => {
	let t = e.inputState;
	t.lastScrollTop = e.scrollDOM.scrollTop, t.lastScrollLeft = e.scrollDOM.scrollLeft, M.ios && !t.touchActive && (t.lastIOSMomentumScroll = Date.now());
}, ja.wheel = ja.mousewheel = (e) => {
	e.inputState.lastWheelEvent = Date.now();
}, Aa.keydown = (e, t) => (e.inputState.setSelectionOrigin("select"), t.keyCode == 27 && e.inputState.tabFocusMode != 0 && (e.inputState.tabFocusMode = Date.now() + 2e3), !1), ja.touchstart = (e, t) => {
	let n = e.inputState, r = t.targetTouches[0];
	n.touchActive = !0, n.lastTouchTime = Date.now(), r && (n.lastTouchX = r.clientX, n.lastTouchY = r.clientY), n.setSelectionOrigin("select.pointer");
}, ja.touchmove = (e) => {
	e.inputState.setSelectionOrigin("select.pointer");
}, ja.touchend = (e, t) => {
	e.inputState.touchActive = !1;
}, Aa.mousedown = (e, t) => {
	if (e.observer.flush(), e.inputState.lastTouchTime > Date.now() - 2e3) return !1;
	let n = null;
	for (let r of e.state.facet(Tr)) if (n = r(e, t), n) break;
	if (!n && t.button == 0 && (n = Ha(e, t)), n) {
		let r = !e.hasFocus;
		e.inputState.startMouseSelection(new Ta(e, t, n, r)), r && e.observer.ignore(() => {
			Kn(e.contentDOM);
			let t = e.root.activeElement;
			t && !t.contains(e.contentDOM) && t.blur();
		});
		let i = e.inputState.mouseSelection;
		if (i) return i.start(t), i.dragging === !1;
	} else e.inputState.setSelectionOrigin("select.pointer");
	return !1;
};
function Ia(e, t, n, r) {
	if (r == 1) return T.cursor(t, n);
	if (r == 2) return Hi(e.state, t, n);
	{
		let r = e.docView.lineAt(t, n), i = e.state.doc.lineAt(r ? r.posAtEnd : t), a = r ? r.posAtStart : i.from, o = r ? r.posAtEnd : i.to;
		return o < e.state.doc.length && o == i.to && o++, T.undirectionalRange(a, o);
	}
}
var La = M.ie && M.ie_version <= 11, Ra = null, za = 0, Ba = 0;
function Va(e) {
	if (!La) return e.detail;
	let t = Ra, n = Ba;
	return Ra = e, Ba = Date.now(), za = !t || n > Date.now() - 400 && Math.abs(t.clientX - e.clientX) < 2 && Math.abs(t.clientY - e.clientY) < 2 ? (za + 1) % 3 : 1;
}
function Ha(e, t) {
	let n = e.posAndSideAtCoords({
		x: t.clientX,
		y: t.clientY
	}, !1), r = Va(t), i = e.state.selection;
	return {
		update(e) {
			e.docChanged && (n.pos = e.changes.mapPos(n.pos), i = i.map(e.changes));
		},
		get(t, a, o) {
			let s = e.posAndSideAtCoords({
				x: t.clientX,
				y: t.clientY
			}, !1), c, l = Ia(e, s.pos, s.assoc, r);
			if (n.pos != s.pos && !a) {
				let t = Ia(e, n.pos, n.assoc, r), i = Math.min(t.from, l.from), a = Math.max(t.to, l.to);
				l = i < l.from ? T.range(i, a, l.assoc) : T.range(a, i, l.assoc);
			}
			return a ? i.replaceRange(i.main.extend(l.from, l.to, l.assoc)) : o && r == 1 && i.ranges.length > 1 && (c = Ua(i, s.pos)) ? c : o ? i.addRange(l) : T.create([l]);
		}
	};
}
function Ua(e, t) {
	for (let n = 0; n < e.ranges.length; n++) {
		let { from: r, to: i } = e.ranges[n];
		if (r <= t && i >= t) return T.create(e.ranges.slice(0, n).concat(e.ranges.slice(n + 1)), e.mainIndex == n ? 0 : e.mainIndex - +(e.mainIndex > n));
	}
	return null;
}
Aa.dragstart = (e, t) => {
	let { selection: { main: n } } = e.state;
	if (t.target.draggable) {
		let r = e.docView.tile.nearest(t.target);
		if (r && r.isWidget()) {
			let e = r.posAtStart, t = e + r.length;
			(e >= n.to || t <= n.from) && (n = T.undirectionalRange(e, t));
		}
	}
	let { inputState: r } = e;
	return r.mouseSelection && (r.mouseSelection.dragging = !0), r.draggedContent = n, t.dataTransfer && (t.dataTransfer.setData("Text", Pa(e.state, jr, e.state.sliceDoc(n.from, n.to))), t.dataTransfer.effectAllowed = "copyMove"), !1;
}, Aa.dragend = (e) => (e.inputState.draggedContent = null, !1);
function Wa(e, t, n, r) {
	if (n = Pa(e.state, Ar, n), !n) return;
	let i = e.posAtCoords({
		x: t.clientX,
		y: t.clientY
	}, !1), { draggedContent: a } = e.inputState, o = r && a && Da(e, t) ? {
		from: a.from,
		to: a.to
	} : null, s = {
		from: i,
		insert: n
	}, c = e.state.changes(o ? [o, s] : s);
	e.focus(), e.dispatch({
		changes: c,
		selection: {
			anchor: c.mapPos(i, -1),
			head: c.mapPos(i, 1)
		},
		userEvent: o ? "move.drop" : "input.drop"
	}), e.inputState.draggedContent = null;
}
Aa.drop = (e, t) => {
	if (!t.dataTransfer) return !1;
	if (e.state.readOnly) return !0;
	let n = t.dataTransfer.files;
	if (n && n.length) {
		let r = Array(n.length), i = 0, a = () => {
			++i == n.length && Wa(e, t, r.filter((e) => e != null).join(e.state.lineBreak), !1);
		};
		for (let e = 0; e < n.length; e++) {
			let t = new FileReader();
			t.onerror = a, t.onload = () => {
				/[\x00-\x08\x0e-\x1f]{2}/.test(t.result) || (r[e] = t.result), a();
			}, t.readAsText(n[e]);
		}
		return !0;
	}
	{
		let n = t.dataTransfer.getData("Text");
		if (n) return Wa(e, t, n, !0), !0;
	}
	return !1;
}, Aa.paste = (e, t) => {
	if (e.state.readOnly) return !0;
	e.observer.flush();
	let n = Ma ? null : t.clipboardData;
	return n ? (Fa(e, n.getData("text/plain") || n.getData("text/uri-list")), !0) : (Na(e), !1);
};
function Ga(e, t) {
	let n = e.dom.parentNode;
	if (!n) return;
	let r = n.appendChild(document.createElement("textarea"));
	r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.value = t, r.focus(), r.selectionEnd = t.length, r.selectionStart = 0, setTimeout(() => {
		r.remove(), e.focus();
	}, 50);
}
function Ka(e) {
	let t = [], n = [], r = !1;
	for (let r of e.selection.ranges) r.empty || (t.push(e.sliceDoc(r.from, r.to)), n.push(r));
	if (!t.length) {
		let i = -1;
		for (let { from: r } of e.selection.ranges) {
			let a = e.doc.lineAt(r);
			a.number > i && (t.push(a.text), n.push({
				from: a.from,
				to: Math.min(e.doc.length, a.to + 1)
			})), i = a.number;
		}
		r = !0;
	}
	return {
		text: Pa(e, jr, t.join(e.lineBreak)),
		ranges: n,
		linewise: r
	};
}
var qa = null;
Aa.copy = Aa.cut = (e, t) => {
	if (!An(e.contentDOM, e.observer.selectionRange)) return !1;
	let { text: n, ranges: r, linewise: i } = Ka(e.state);
	if (!n && !i) return !1;
	qa = i ? n : null, t.type == "cut" && !e.state.readOnly && e.dispatch({
		changes: r,
		scrollIntoView: !0,
		userEvent: "delete.cut"
	});
	let a = Ma ? null : t.clipboardData;
	return a ? (a.clearData(), a.setData("text/plain", n), !0) : (Ga(e, n), !1);
};
var Ja = /*@__PURE__*/ it.define();
function Ya(e, t) {
	let n = [];
	for (let r of e.facet(kr)) {
		let i = r(e, t);
		i && n.push(i);
	}
	return n.length ? e.update({
		effects: n,
		annotations: Ja.of(!0)
	}) : null;
}
function Xa(e) {
	setTimeout(() => {
		let t = e.hasFocus;
		if (t != e.inputState.notifiedFocused) {
			let n = Ya(e.state, t);
			n ? e.dispatch(n) : e.update([]);
		}
	}, 10);
}
ja.focus = (e) => {
	e.inputState.lastFocusTime = Date.now(), !e.scrollDOM.scrollTop && (e.inputState.lastScrollTop || e.inputState.lastScrollLeft) && (e.scrollDOM.scrollTop = e.inputState.lastScrollTop, e.scrollDOM.scrollLeft = e.inputState.lastScrollLeft), Xa(e);
}, ja.blur = (e) => {
	e.observer.clearSelectionRange(), Xa(e);
}, ja.compositionstart = ja.compositionupdate = (e) => {
	e.observer.editContext || (e.inputState.compositionFirstChange ?? (e.inputState.compositionFirstChange = !0), e.inputState.composing < 0 && (e.inputState.composing = 0));
}, ja.compositionend = (e) => {
	e.observer.editContext || (e.inputState.composing = -1, e.inputState.compositionEndedAt = Date.now(), e.inputState.compositionPendingKey = !0, e.inputState.compositionPendingChange = e.observer.pendingRecords().length > 0, e.inputState.compositionFirstChange = null, M.chrome && M.android ? e.observer.flushSoon() : e.inputState.compositionPendingChange ? Promise.resolve().then(() => e.observer.flush()) : setTimeout(() => {
		e.inputState.composing < 0 && e.docView.hasComposition && e.update([]);
	}, 50));
}, ja.contextmenu = (e) => {
	e.inputState.lastContextMenu = Date.now();
}, Aa.beforeinput = (e, t) => {
	if ((t.inputType == "insertText" || t.inputType == "insertCompositionText") && (e.inputState.insertingText = t.data, e.inputState.insertingTextAt = Date.now()), t.inputType == "insertReplacementText" && e.observer.editContext) {
		let n = t.dataTransfer?.getData("text/plain"), r = t.getTargetRanges();
		if (n && r.length) {
			let t = r[0];
			return la(e, {
				from: e.posAtDOM(t.startContainer, t.startOffset),
				to: e.posAtDOM(t.endContainer, t.endOffset),
				insert: e.state.toText(n)
			}, null), !0;
		}
	}
	let n;
	if (M.chrome && M.android && (n = ya.find((e) => e.inputType == t.inputType)) && (e.observer.delayAndroidKey(n.key, n.keyCode), n.key == "Backspace" || n.key == "Delete")) {
		let t = window.visualViewport?.height || 0;
		setTimeout(() => {
			(window.visualViewport?.height || 0) > t + 10 && e.hasFocus && (e.contentDOM.blur(), e.focus());
		}, 100);
	}
	return M.ios && t.inputType == "deleteContentForward" && e.observer.flushSoon(), M.safari && t.inputType == "insertText" && e.inputState.composing >= 0 && setTimeout(() => ja.compositionend(e, t), 20), !1;
};
var Za = /*@__PURE__*/ new Set();
function Qa(e) {
	Za.has(e) || (Za.add(e), e.addEventListener("copy", () => {}), e.addEventListener("cut", () => {}));
}
var $a = [
	"pre-wrap",
	"normal",
	"pre-line",
	"break-spaces"
], eo = !1;
function to() {
	eo = !1;
}
var no = class {
	constructor(e) {
		this.lineWrapping = e, this.doc = C.empty, this.heightSamples = {}, this.lineHeight = 14, this.charWidth = 7, this.textHeight = 14, this.lineLength = 30;
	}
	heightForGap(e, t) {
		let n = this.doc.lineAt(t).number - this.doc.lineAt(e).number + 1;
		return this.lineWrapping && (n += Math.max(0, Math.ceil((t - e - n * this.lineLength * .5) / this.lineLength))), this.lineHeight * n;
	}
	heightForLine(e) {
		return this.lineWrapping ? (1 + Math.max(0, Math.ceil((e - this.lineLength) / Math.max(1, this.lineLength - 5)))) * this.lineHeight : this.lineHeight;
	}
	setDoc(e) {
		return this.doc = e, this;
	}
	mustRefreshForWrapping(e) {
		return $a.indexOf(e) > -1 != this.lineWrapping;
	}
	mustRefreshForHeights(e) {
		let t = !1;
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			r < 0 ? n++ : this.heightSamples[Math.floor(r * 10)] || (t = !0, this.heightSamples[Math.floor(r * 10)] = !0);
		}
		return t;
	}
	refresh(e, t, n, r, i, a) {
		let o = $a.indexOf(e) > -1, s = Math.abs(t - this.lineHeight) > .3 || this.lineWrapping != o;
		if (this.lineWrapping = o, this.lineHeight = t, this.charWidth = n, this.textHeight = r, this.lineLength = i, s) {
			this.heightSamples = {};
			for (let e = 0; e < a.length; e++) {
				let t = a[e];
				t < 0 ? e++ : this.heightSamples[Math.floor(t * 10)] = !0;
			}
		}
		return s;
	}
}, ro = class {
	constructor(e, t) {
		this.from = e, this.heights = t, this.index = 0;
	}
	get more() {
		return this.index < this.heights.length;
	}
}, io = class e {
	constructor(e, t, n, r, i) {
		this.from = e, this.length = t, this.top = n, this.height = r, this._content = i;
	}
	get type() {
		return typeof this._content == "number" ? bn.Text : Array.isArray(this._content) ? this._content : this._content.type;
	}
	get to() {
		return this.from + this.length;
	}
	get bottom() {
		return this.top + this.height;
	}
	get widget() {
		return this._content instanceof Cn ? this._content.widget : null;
	}
	get widgetLineBreaks() {
		return typeof this._content == "number" ? this._content : 0;
	}
	join(t) {
		let n = (Array.isArray(this._content) ? this._content : [this]).concat(Array.isArray(t._content) ? t._content : [t]);
		return new e(this.from, this.length + t.length, this.top, this.height + t.height, n);
	}
}, R = /*@__PURE__*/ (function(e) {
	return e[e.ByPos = 0] = "ByPos", e[e.ByHeight = 1] = "ByHeight", e[e.ByPosNoHeight = 2] = "ByPosNoHeight", e;
})(R ||= {}), ao = .001, oo = class e {
	constructor(e, t, n = 2) {
		this.length = e, this.height = t, this.flags = n;
	}
	get outdated() {
		return (this.flags & 2) > 0;
	}
	set outdated(e) {
		this.flags = (e ? 2 : 0) | this.flags & -3;
	}
	setHeight(e) {
		this.height != e && (Math.abs(this.height - e) > ao && (eo = !0), this.height = e);
	}
	replace(t, n, r) {
		return e.of(r);
	}
	decomposeLeft(e, t) {
		t.push(this);
	}
	decomposeRight(e, t) {
		t.push(this);
	}
	applyChanges(e, t, n, r) {
		let i = this, a = n.doc;
		for (let o = r.length - 1; o >= 0; o--) {
			let { fromA: s, toA: c, fromB: l, toB: u } = r[o], d = i.lineAt(s, R.ByPosNoHeight, n.setDoc(t), 0, 0), f = d.to >= c ? d : i.lineAt(c, R.ByPosNoHeight, n, 0, 0);
			for (u += f.to - c, c = f.to; o > 0 && d.from <= r[o - 1].toA;) s = r[o - 1].fromA, l = r[o - 1].fromB, o--, s < d.from && (d = i.lineAt(s, R.ByPosNoHeight, n, 0, 0));
			l += d.from - s, s = d.from;
			let p = go.build(n.setDoc(a), e, l, u);
			i = so(i, i.replace(s, c, p));
		}
		return i.updateHeight(n, 0);
	}
	static empty() {
		return new uo(0, 0, 0);
	}
	static of(t) {
		if (t.length == 1) return t[0];
		let n = 0, r = t.length, i = 0, a = 0;
		for (;;) if (n == r) {
			if (i > a * 2) {
				let e = t[n - 1];
				e.break ? t.splice(--n, 1, e.left, null, e.right) : t.splice(--n, 1, e.left, e.right), r += 1 + e.break, i -= e.size;
			} else if (a > i * 2) {
				let e = t[r];
				e.break ? t.splice(r, 1, e.left, null, e.right) : t.splice(r, 1, e.left, e.right), r += 2 + e.break, a -= e.size;
			} else break;
		} else if (i < a) {
			let e = t[n++];
			e && (i += e.size);
		} else {
			let e = t[--r];
			e && (a += e.size);
		}
		let o = 0;
		return t[n - 1] == null ? (o = 1, n--) : t[n] ?? (o = 1, r++), new po(e.of(t.slice(0, n)), o, e.of(t.slice(r)));
	}
};
function so(e, t) {
	return e == t ? e : (e.constructor != t.constructor && (eo = !0), t);
}
oo.prototype.size = 1;
var co = /*@__PURE__*/ N.replace({}), lo = class extends oo {
	constructor(e, t, n) {
		super(e, t), this.deco = n, this.spaceAbove = 0;
	}
	mainBlock(e, t) {
		return new io(t, this.length, e + this.spaceAbove, this.height - this.spaceAbove, this.deco || 0);
	}
	blockAt(e, t, n, r) {
		return this.spaceAbove && e < n + this.spaceAbove ? new io(r, 0, n, this.spaceAbove, co) : this.mainBlock(n, r);
	}
	lineAt(e, t, n, r, i) {
		let a = this.mainBlock(r, i);
		return this.spaceAbove ? this.blockAt(0, n, r, i).join(a) : a;
	}
	forEachLine(e, t, n, r, i, a) {
		e <= i + this.length && t >= i && a(this.lineAt(0, R.ByPos, n, r, i));
	}
	setMeasuredHeight(e) {
		let t = e.heights[e.index++];
		t < 0 ? (this.spaceAbove = -t, t = e.heights[e.index++]) : this.spaceAbove = 0, this.setHeight(t);
	}
	updateHeight(e, t = 0, n = !1, r) {
		return r && r.from <= t && r.more && this.setMeasuredHeight(r), this.outdated = !1, this;
	}
	toString() {
		return `block(${this.length})`;
	}
}, uo = class e extends lo {
	constructor(e, t, n) {
		super(e, t, null), this.collapsed = 0, this.widgetHeight = 0, this.breaks = 0, this.spaceAbove = n;
	}
	mainBlock(e, t) {
		return new io(t, this.length, e + this.spaceAbove, this.height - this.spaceAbove, this.breaks);
	}
	replace(t, n, r) {
		let i = r[0];
		return r.length == 1 && (i instanceof e || i instanceof fo && i.flags & 4) && Math.abs(this.length - i.length) < 10 ? (i instanceof fo ? i = new e(i.length, this.height, this.spaceAbove) : i.height = this.height, this.outdated || (i.outdated = !1), i) : oo.of(r);
	}
	updateHeight(e, t = 0, n = !1, r) {
		return r && r.from <= t && r.more ? this.setMeasuredHeight(r) : (n || this.outdated) && (this.spaceAbove = 0, this.setHeight(Math.max(this.widgetHeight, e.heightForLine(this.length - this.collapsed)) + this.breaks * e.lineHeight)), this.outdated = !1, this;
	}
	toString() {
		return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
	}
}, fo = class e extends oo {
	constructor(e) {
		super(e, 0);
	}
	heightMetrics(e, t) {
		let n = e.doc.lineAt(t).number, r = e.doc.lineAt(t + this.length).number, i = r - n + 1, a, o = 0;
		if (e.lineWrapping) {
			let t = Math.min(this.height, e.lineHeight * i);
			a = t / i, this.length > i + 1 && (o = (this.height - t) / (this.length - i - 1));
		} else a = this.height / i;
		return {
			firstLine: n,
			lastLine: r,
			perLine: a,
			perChar: o
		};
	}
	blockAt(e, t, n, r) {
		let { firstLine: i, lastLine: a, perLine: o, perChar: s } = this.heightMetrics(t, r);
		if (t.lineWrapping) {
			let i = r + (e < t.lineHeight ? 0 : Math.round(Math.max(0, Math.min(1, (e - n) / this.height)) * this.length)), a = t.doc.lineAt(i), c = o + a.length * s, l = Math.max(n, e - c / 2);
			return new io(a.from, a.length, l, c, 0);
		}
		{
			let r = Math.max(0, Math.min(a - i, Math.floor((e - n) / o))), { from: s, length: c } = t.doc.line(i + r);
			return new io(s, c, n + o * r, o, 0);
		}
	}
	lineAt(e, t, n, r, i) {
		if (t == R.ByHeight) return this.blockAt(e, n, r, i);
		if (t == R.ByPosNoHeight) {
			let { from: t, to: r } = n.doc.lineAt(e);
			return new io(t, r - t, 0, 0, 0);
		}
		let { firstLine: a, perLine: o, perChar: s } = this.heightMetrics(n, i), c = n.doc.lineAt(e), l = o + c.length * s, u = c.number - a, d = r + o * u + s * (c.from - i - u);
		return new io(c.from, c.length, Math.max(r, Math.min(d, r + this.height - l)), l, 0);
	}
	forEachLine(e, t, n, r, i, a) {
		e = Math.max(e, i), t = Math.min(t, i + this.length);
		let { firstLine: o, perLine: s, perChar: c } = this.heightMetrics(n, i);
		for (let l = e, u = r; l <= t;) {
			let t = n.doc.lineAt(l);
			if (l == e) {
				let n = t.number - o;
				u += s * n + c * (e - i - n);
			}
			let r = s + c * t.length;
			a(new io(t.from, t.length, u, r, 0)), u += r, l = t.to + 1;
		}
	}
	replace(t, n, r) {
		let i = this.length - n;
		if (i > 0) {
			let t = r[r.length - 1];
			t instanceof e ? r[r.length - 1] = new e(t.length + i) : r.push(null, new e(i - 1));
		}
		if (t > 0) {
			let n = r[0];
			n instanceof e ? r[0] = new e(t + n.length) : r.unshift(new e(t - 1), null);
		}
		return oo.of(r);
	}
	decomposeLeft(t, n) {
		n.push(new e(t - 1), null);
	}
	decomposeRight(t, n) {
		n.push(null, new e(this.length - t - 1));
	}
	updateHeight(t, n = 0, r = !1, i) {
		let a = n + this.length;
		if (i && i.from <= n + this.length && i.more) {
			let r = [], o = Math.max(n, i.from), s = -1;
			for (i.from > n && r.push(new e(i.from - n - 1).updateHeight(t, n)); o <= a && i.more;) {
				let e = t.doc.lineAt(o).length;
				r.length && r.push(null);
				let n = i.heights[i.index++], a = 0;
				n < 0 && (a = -n, n = i.heights[i.index++]), s == -1 ? s = n : Math.abs(n - s) >= ao && (s = -2);
				let c = new uo(e, n, a);
				c.outdated = !1, r.push(c), o += e + 1;
			}
			o <= a && r.push(null, new e(a - o).updateHeight(t, o));
			let c = oo.of(r);
			return (s < 0 || Math.abs(c.height - this.height) >= ao || Math.abs(s - this.heightMetrics(t, n).perLine) >= ao) && (eo = !0), so(this, c);
		}
		return (r || this.outdated) && (this.setHeight(t.heightForGap(n, n + this.length)), this.outdated = !1), this;
	}
	toString() {
		return `gap(${this.length})`;
	}
}, po = class extends oo {
	constructor(e, t, n) {
		super(e.length + t + n.length, e.height + n.height, t | (e.outdated || n.outdated ? 2 : 0)), this.left = e, this.right = n, this.size = e.size + n.size;
	}
	get break() {
		return this.flags & 1;
	}
	blockAt(e, t, n, r) {
		let i = n + this.left.height;
		return e < i ? this.left.blockAt(e, t, n, r) : this.right.blockAt(e, t, i, r + this.left.length + this.break);
	}
	lineAt(e, t, n, r, i) {
		let a = r + this.left.height, o = i + this.left.length + this.break, s = t == R.ByHeight ? e < a : e < o, c = s ? this.left.lineAt(e, t, n, r, i) : this.right.lineAt(e, t, n, a, o);
		if (this.break || (s ? c.to < o : c.from > o)) return c;
		let l = t == R.ByPosNoHeight ? R.ByPosNoHeight : R.ByPos;
		return s ? c.join(this.right.lineAt(o, l, n, a, o)) : this.left.lineAt(o, l, n, r, i).join(c);
	}
	forEachLine(e, t, n, r, i, a) {
		let o = r + this.left.height, s = i + this.left.length + this.break;
		if (this.break) e < s && this.left.forEachLine(e, t, n, r, i, a), t >= s && this.right.forEachLine(e, t, n, o, s, a);
		else {
			let c = this.lineAt(s, R.ByPos, n, r, i);
			e < c.from && this.left.forEachLine(e, c.from - 1, n, r, i, a), c.to >= e && c.from <= t && a(c), t > c.to && this.right.forEachLine(c.to + 1, t, n, o, s, a);
		}
	}
	replace(e, t, n) {
		let r = this.left.length + this.break;
		if (t < r) return this.balanced(this.left.replace(e, t, n), this.right);
		if (e > this.left.length) return this.balanced(this.left, this.right.replace(e - r, t - r, n));
		let i = [];
		e > 0 && this.decomposeLeft(e, i);
		let a = i.length;
		for (let e of n) i.push(e);
		if (e > 0 && mo(i, a - 1), t < this.length) {
			let e = i.length;
			this.decomposeRight(t, i), mo(i, e);
		}
		return oo.of(i);
	}
	decomposeLeft(e, t) {
		let n = this.left.length;
		if (e <= n) return this.left.decomposeLeft(e, t);
		t.push(this.left), this.break && (n++, e >= n && t.push(null)), e > n && this.right.decomposeLeft(e - n, t);
	}
	decomposeRight(e, t) {
		let n = this.left.length, r = n + this.break;
		if (e >= r) return this.right.decomposeRight(e - r, t);
		e < n && this.left.decomposeRight(e, t), this.break && e < r && t.push(null), t.push(this.right);
	}
	balanced(e, t) {
		return e.size > 2 * t.size || t.size > 2 * e.size ? oo.of(this.break ? [
			e,
			null,
			t
		] : [e, t]) : (this.left = so(this.left, e), this.right = so(this.right, t), this.setHeight(e.height + t.height), this.outdated = e.outdated || t.outdated, this.size = e.size + t.size, this.length = e.length + this.break + t.length, this);
	}
	updateHeight(e, t = 0, n = !1, r) {
		let { left: i, right: a } = this, o = t + i.length + this.break, s = null;
		return r && r.from <= t + i.length && r.more ? s = i = i.updateHeight(e, t, n, r) : i.updateHeight(e, t, n), r && r.from <= o + a.length && r.more ? s = a = a.updateHeight(e, o, n, r) : a.updateHeight(e, o, n), s ? this.balanced(i, a) : (this.height = this.left.height + this.right.height, this.outdated = !1, this);
	}
	toString() {
		return this.left + (this.break ? " " : "-") + this.right;
	}
};
function mo(e, t) {
	let n, r;
	e[t] == null && (n = e[t - 1]) instanceof fo && (r = e[t + 1]) instanceof fo && e.splice(t - 1, 3, new fo(n.length + 1 + r.length));
}
var ho = 5, go = class e {
	constructor(e, t) {
		this.pos = e, this.oracle = t, this.nodes = [], this.lineStart = -1, this.lineEnd = -1, this.covering = null, this.writtenTo = e;
	}
	get isCovered() {
		return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
	}
	span(e, t) {
		if (this.lineStart > -1) {
			let e = Math.min(t, this.lineEnd), n = this.nodes[this.nodes.length - 1];
			n instanceof uo ? n.length += e - this.pos : (e > this.pos || !this.isCovered) && this.nodes.push(new uo(e - this.pos, -1, 0)), this.writtenTo = e, t > e && (this.nodes.push(null), this.writtenTo++, this.lineStart = -1);
		}
		this.pos = t;
	}
	point(e, t, n) {
		if (e < t || n.heightRelevant) {
			let r = n.widget ? n.widget.estimatedHeight : 0, i = n.widget ? n.widget.lineBreaks : 0;
			r < 0 && (r = this.oracle.lineHeight);
			let a = t - e;
			n.block ? this.addBlock(new lo(a, r, n)) : (a || i || r >= ho) && this.addLineDeco(r, i, a);
		} else t > e && this.span(e, t);
		this.lineEnd > -1 && this.lineEnd < this.pos && (this.lineEnd = this.oracle.doc.lineAt(this.pos).to);
	}
	enterLine() {
		if (this.lineStart > -1) return;
		let { from: e, to: t } = this.oracle.doc.lineAt(this.pos);
		this.lineStart = e, this.lineEnd = t, this.writtenTo < e && ((this.writtenTo < e - 1 || this.nodes[this.nodes.length - 1] == null) && this.nodes.push(this.blankContent(this.writtenTo, e - 1)), this.nodes.push(null)), this.pos > e && this.nodes.push(new uo(this.pos - e, -1, 0)), this.writtenTo = this.pos;
	}
	blankContent(e, t) {
		let n = new fo(t - e);
		return this.oracle.doc.lineAt(e).to == t && (n.flags |= 4), n;
	}
	ensureLine() {
		this.enterLine();
		let e = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
		if (e instanceof uo) return e;
		let t = new uo(0, -1, 0);
		return this.nodes.push(t), t;
	}
	addBlock(e) {
		this.enterLine();
		let t = e.deco;
		t && t.startSide > 0 && !this.isCovered && this.ensureLine(), this.nodes.push(e), this.writtenTo = this.pos += e.length, t && t.endSide > 0 && (this.covering = e);
	}
	addLineDeco(e, t, n) {
		let r = this.ensureLine();
		r.length += n, r.collapsed += n, r.widgetHeight = Math.max(r.widgetHeight, e), r.breaks += t, this.writtenTo = this.pos += n;
	}
	finish(e) {
		let t = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
		this.lineStart > -1 && !(t instanceof uo) && !this.isCovered ? this.nodes.push(new uo(0, -1, 0)) : (this.writtenTo < this.pos || t == null) && this.nodes.push(this.blankContent(this.writtenTo, this.pos));
		let n = e;
		for (let e of this.nodes) e instanceof uo && e.updateHeight(this.oracle, n), n += e ? e.length : 1;
		return this.nodes;
	}
	static build(t, n, r, i) {
		let a = new e(r, t);
		return A.spans(n, r, i, a, 0), a.finish(r);
	}
};
function _o(e, t, n) {
	let r = new vo();
	return A.compare(e, t, n, r, 0), r.changes;
}
var vo = class {
	constructor() {
		this.changes = [];
	}
	compareRange() {}
	comparePoint(e, t, n, r) {
		(e < t || n && n.heightRelevant || r && r.heightRelevant) && En(e, t, this.changes, 5);
	}
};
function yo(e, t) {
	let n = e.getBoundingClientRect(), r = e.ownerDocument, i = r.defaultView || window, a = Math.max(0, n.left), o = Math.min(i.innerWidth, n.right), s = Math.max(0, n.top), c = Math.min(i.innerHeight, n.bottom);
	for (let t = e.parentNode; t && t != r.body;) if (t.nodeType == 1) {
		let n = t, r = window.getComputedStyle(n);
		if ((n.scrollHeight > n.clientHeight || n.scrollWidth > n.clientWidth) && r.overflow != "visible") {
			let r = n.getBoundingClientRect();
			a = Math.max(a, r.left), o = Math.min(o, r.right), s = Math.max(s, r.top), c = Math.min(t == e.parentNode ? i.innerHeight : c, r.bottom);
		}
		t = r.position == "absolute" || r.position == "fixed" ? n.offsetParent : n.parentNode;
	} else if (t.nodeType == 11) t = t.host;
	else break;
	return {
		left: a - n.left,
		right: Math.max(a, o) - n.left,
		top: s - (n.top + t),
		bottom: Math.max(s, c) - (n.top + t)
	};
}
function bo(e) {
	let t = e.getBoundingClientRect(), n = e.ownerDocument.defaultView || window;
	return t.left < n.innerWidth && t.right > 0 && t.top < n.innerHeight && t.bottom > 0;
}
function xo(e, t) {
	let n = e.getBoundingClientRect();
	return {
		left: 0,
		right: n.right - n.left,
		top: t,
		bottom: n.bottom - (n.top + t)
	};
}
var So = class {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.size = n, this.displaySize = r;
	}
	static same(e, t) {
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = t[n];
			if (r.from != i.from || r.to != i.to || r.size != i.size) return !1;
		}
		return !0;
	}
	draw(e, t) {
		return N.replace({ widget: new Co(this.displaySize * (t ? e.scaleY : e.scaleX), t) }).range(this.from, this.to);
	}
}, Co = class extends yn {
	constructor(e, t) {
		super(), this.size = e, this.vertical = t;
	}
	eq(e) {
		return e.size == this.size && e.vertical == this.vertical;
	}
	toDOM() {
		let e = document.createElement("div");
		return this.vertical ? e.style.height = this.size + "px" : (e.style.width = this.size + "px", e.style.height = "2px", e.style.display = "inline-block"), e;
	}
	get estimatedHeight() {
		return this.vertical ? this.size : -1;
	}
}, wo = class {
	constructor(e, t) {
		this.view = e, this.state = t, this.pixelViewport = {
			left: 0,
			right: window.innerWidth,
			top: 0,
			bottom: 0
		}, this.inView = !0, this.paddingTop = 0, this.paddingBottom = 0, this.contentDOMWidth = 0, this.contentDOMHeight = 0, this.editorHeight = 0, this.editorWidth = 0, this.scaleX = 1, this.scaleY = 1, this.scrollOffset = 0, this.scrolledToBottom = !1, this.scrollAnchorPos = 0, this.scrollAnchorHeight = -1, this.scaler = Ao, this.scrollTarget = null, this.printing = !1, this.mustMeasureContent = !0, this.defaultTextDirection = P.LTR, this.visibleRanges = [], this.mustEnforceCursorAssoc = !1;
		let n = t.facet(Wr).some((e) => typeof e != "function" && e.class == "cm-lineWrapping");
		this.heightOracle = new no(n), this.stateDeco = jo(t), this.heightMap = oo.empty().applyChanges(this.stateDeco, C.empty, this.heightOracle.setDoc(t.doc), [new ei(0, 0, 0, t.doc.length)]);
		for (let e = 0; e < 2 && (this.viewport = this.getViewport(0, null), this.updateForViewport()); e++);
		this.updateViewportLines(), this.lineGaps = this.ensureLineGaps([]), this.lineGapDeco = N.set(this.lineGaps.map((e) => e.draw(this, !1))), this.scrollParent = e.scrollDOM, this.computeVisibleRanges();
	}
	updateForViewport() {
		let e = [this.viewport], { main: t } = this.state.selection;
		for (let n = 0; n <= 1; n++) {
			let r = n ? t.head : t.anchor;
			if (!e.some(({ from: e, to: t }) => r >= e && r <= t)) {
				let { from: t, to: n } = this.lineBlockAt(r);
				e.push(new To(t, n));
			}
		}
		return this.viewports = e.sort((e, t) => e.from - t.from), this.updateScaler();
	}
	updateScaler() {
		let e = this.scaler;
		return this.scaler = this.heightMap.height <= 7e6 ? Ao : new Mo(this.heightOracle, this.heightMap, this.viewports), e.eq(this.scaler) ? 0 : 2;
	}
	updateViewportLines() {
		this.viewportLines = [], this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.heightOracle.setDoc(this.state.doc), 0, 0, (e) => {
			this.viewportLines.push(No(e, this.scaler));
		});
	}
	update(e, t = null) {
		this.state = e.state;
		let n = this.stateDeco;
		this.stateDeco = jo(this.state);
		let r = e.changedRanges, i = ei.extendWithRanges(r, _o(n, this.stateDeco, e ? e.changes : we.empty(this.state.doc.length))), a = this.heightMap.height, o = this.scrolledToBottom ? null : this.scrollAnchorAt(this.scrollOffset);
		to(), this.heightMap = this.heightMap.applyChanges(this.stateDeco, e.startState.doc, this.heightOracle.setDoc(this.state.doc), i), (this.heightMap.height != a || eo) && (e.flags |= 2), o ? (this.scrollAnchorPos = e.changes.mapPos(o.from, -1), this.scrollAnchorHeight = o.top) : (this.scrollAnchorPos = -1, this.scrollAnchorHeight = a);
		let s = i.length ? this.mapViewport(this.viewport, e.changes) : this.viewport;
		(t && (t.range.head < s.from || t.range.head > s.to) || !this.viewportIsAppropriate(s)) && (s = this.getViewport(0, t));
		let c = s.from != this.viewport.from || s.to != this.viewport.to;
		this.viewport = s, e.flags |= this.updateForViewport(), (c || !e.changes.empty || e.flags & 2) && this.updateViewportLines(), (this.lineGaps.length || this.viewport.to - this.viewport.from > 4e3) && this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, e.changes))), e.flags |= this.computeVisibleRanges(e.changes), t && (this.scrollTarget = t), !this.mustEnforceCursorAssoc && (e.selectionSet || e.focusChanged) && e.view.lineWrapping && e.state.selection.main.empty && e.state.selection.main.assoc && !e.state.facet(Nr) && (this.mustEnforceCursorAssoc = !0);
	}
	measure() {
		let { view: e } = this, t = e.contentDOM, n = window.getComputedStyle(t), r = this.heightOracle, i = n.whiteSpace;
		this.defaultTextDirection = n.direction == "rtl" ? P.RTL : P.LTR;
		let a = this.heightOracle.mustRefreshForWrapping(i) || this.mustMeasureContent === "refresh", o = t.getBoundingClientRect(), s = a || this.mustMeasureContent || this.contentDOMHeight != o.height;
		this.contentDOMHeight = o.height, this.mustMeasureContent = !1;
		let c = 0, l = 0;
		if (o.width && o.height) {
			let { scaleX: e, scaleY: n } = zn(t, o);
			(e > .005 && Math.abs(this.scaleX - e) > .005 || n > .005 && Math.abs(this.scaleY - n) > .005) && (this.scaleX = e, this.scaleY = n, c |= 16, a = s = !0);
		}
		let u = (parseInt(n.paddingTop) || 0) * this.scaleY, d = (parseInt(n.paddingBottom) || 0) * this.scaleY;
		(this.paddingTop != u || this.paddingBottom != d) && (this.paddingTop = u, this.paddingBottom = d, c |= 18), this.editorWidth != e.scrollDOM.clientWidth && (r.lineWrapping && (s = !0), this.editorWidth = e.scrollDOM.clientWidth, c |= 16);
		let f = Vn(this.view.contentDOM, !1).y;
		f != this.scrollParent && (this.scrollParent = f, this.scrollAnchorHeight = -1, this.scrollOffset = 0);
		let p = this.getScrollOffset();
		this.scrollOffset != p && (this.scrollAnchorHeight = -1, this.scrollOffset = p), this.scrolledToBottom = Qn(this.scrollParent || e.win);
		let m = (this.printing ? xo : yo)(t, this.paddingTop), h = m.top - this.pixelViewport.top, g = m.bottom - this.pixelViewport.bottom;
		this.pixelViewport = m;
		let _ = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
		if (_ != this.inView && (this.inView = _, _ && (s = !0)), !this.inView && !this.scrollTarget && !bo(e.dom)) return 0;
		let v = o.width;
		if ((this.contentDOMWidth != v || this.editorHeight != e.scrollDOM.clientHeight) && (this.contentDOMWidth = o.width, this.editorHeight = e.scrollDOM.clientHeight, c |= 16), s) {
			let t = e.docView.measureVisibleLineHeights(this.viewport);
			if (r.mustRefreshForHeights(t) && (a = !0), a || r.lineWrapping && Math.abs(v - this.contentDOMWidth) > r.charWidth) {
				let { lineHeight: n, charWidth: o, textHeight: s } = e.docView.measureTextSize();
				a = n > 0 && r.refresh(i, n, o, s, Math.max(5, v / o), t), a && (e.docView.minWidth = 0, c |= 16);
			}
			h > 0 && g > 0 ? l = Math.max(h, g) : h < 0 && g < 0 && (l = Math.min(h, g)), to();
			for (let n of this.viewports) {
				let i = n.from == this.viewport.from ? t : e.docView.measureVisibleLineHeights(n);
				this.heightMap = (a ? oo.empty().applyChanges(this.stateDeco, C.empty, this.heightOracle, [new ei(0, 0, 0, e.state.doc.length)]) : this.heightMap).updateHeight(r, 0, a, new ro(n.from, i));
			}
			eo && (c |= 2);
		}
		let y = !this.viewportIsAppropriate(this.viewport, l) || this.scrollTarget && (this.scrollTarget.range.head < this.viewport.from || this.scrollTarget.range.head > this.viewport.to);
		return y && (c & 2 && (c |= this.updateScaler()), this.viewport = this.getViewport(l, this.scrollTarget), c |= this.updateForViewport()), (c & 2 || y) && this.updateViewportLines(), (this.lineGaps.length || this.viewport.to - this.viewport.from > 4e3) && this.updateLineGaps(this.ensureLineGaps(a ? [] : this.lineGaps, e)), c |= this.computeVisibleRanges(), this.mustEnforceCursorAssoc && (this.mustEnforceCursorAssoc = !1, e.docView.enforceCursorAssoc()), c;
	}
	get visibleTop() {
		return this.scaler.fromDOM(this.pixelViewport.top);
	}
	get visibleBottom() {
		return this.scaler.fromDOM(this.pixelViewport.bottom);
	}
	getViewport(e, t) {
		let n = .5 - Math.max(-.5, Math.min(.5, e / 1e3 / 2)), r = this.heightMap, i = this.heightOracle, { visibleTop: a, visibleBottom: o } = this, s = new To(r.lineAt(a - n * 1e3, R.ByHeight, i, 0, 0).from, r.lineAt(o + (1 - n) * 1e3, R.ByHeight, i, 0, 0).to);
		if (t) {
			let { head: e } = t.range;
			if (e < s.from || e > s.to) {
				let n = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top), a = r.lineAt(e, R.ByPos, i, 0, 0), o;
				o = t.y == "center" ? (a.top + a.bottom) / 2 - n / 2 : t.y == "start" || t.y == "nearest" && e < s.from ? a.top : a.bottom - n, s = new To(r.lineAt(o - 500, R.ByHeight, i, 0, 0).from, r.lineAt(o + n + 500, R.ByHeight, i, 0, 0).to);
			}
		}
		return s;
	}
	mapViewport(e, t) {
		let n = t.mapPos(e.from, -1), r = t.mapPos(e.to, 1);
		return new To(this.heightMap.lineAt(n, R.ByPos, this.heightOracle, 0, 0).from, this.heightMap.lineAt(r, R.ByPos, this.heightOracle, 0, 0).to);
	}
	viewportIsAppropriate({ from: e, to: t }, n = 0) {
		if (!this.inView) return !0;
		let { top: r } = this.heightMap.lineAt(e, R.ByPos, this.heightOracle, 0, 0), { bottom: i } = this.heightMap.lineAt(t, R.ByPos, this.heightOracle, 0, 0), { visibleTop: a, visibleBottom: o } = this;
		return (e == 0 || r <= a - Math.max(10, Math.min(-n, 250))) && (t == this.state.doc.length || i >= o + Math.max(10, Math.min(n, 250))) && r > a - 2e3 && i < o + 2e3;
	}
	mapLineGaps(e, t) {
		if (!e.length || t.empty) return e;
		let n = [];
		for (let r of e) t.touchesRange(r.from, r.to) || n.push(new So(t.mapPos(r.from), t.mapPos(r.to), r.size, r.displaySize));
		return n;
	}
	ensureLineGaps(e, t) {
		let n = this.heightOracle.lineWrapping, r = n ? 1e4 : 2e3, i = r >> 1, a = r << 1;
		if (this.defaultTextDirection != P.LTR && !n) return [];
		let o = [], s = (r, a, c, l) => {
			if (a - r < i) return;
			let u = this.state.selection.main, d = [u.from];
			u.empty || d.push(u.to);
			for (let e of d) if (e > r && e < a) {
				s(r, e - 10, c, l), s(e + 10, a, c, l);
				return;
			}
			let f = ko(e, (e) => e.from >= c.from && e.to <= c.to && Math.abs(e.from - r) < i && Math.abs(e.to - a) < i && !d.some((t) => e.from < t && e.to > t));
			if (!f) {
				if (a < c.to && t && n && t.visibleRanges.some((e) => e.from <= a && e.to >= a)) {
					let e = t.moveToLineBoundary(T.cursor(a), !1, !0).head;
					e > r && (a = e);
				}
				let e = this.gapSize(c, r, a, l);
				f = new So(r, a, e, n || e < 2e6 ? e : 2e6);
			}
			o.push(f);
		}, c = (t) => {
			if (t.length < a || t.type != bn.Text) return;
			let i = Eo(t.from, t.to, this.stateDeco);
			if (i.total < a) return;
			let o = this.scrollTarget ? this.scrollTarget.range.head : null, c, l;
			if (n) {
				let e = r / this.heightOracle.lineLength * this.heightOracle.lineHeight, n, a;
				if (o != null) {
					let r = Oo(i, o), s = ((this.visibleBottom - this.visibleTop) / 2 + e) / t.height;
					n = r - s, a = r + s;
				} else n = (this.visibleTop - t.top - e) / t.height, a = (this.visibleBottom - t.top + e) / t.height;
				c = Do(i, n), l = Do(i, a);
			} else {
				let n = i.total * this.heightOracle.charWidth, a = r * this.heightOracle.charWidth, s = 0;
				if (n > 2e6) for (let n of e) n.from >= t.from && n.from < t.to && n.size != n.displaySize && n.from * this.heightOracle.charWidth + s < this.pixelViewport.left && (s = n.size - n.displaySize);
				let u = this.pixelViewport.left + s, d = this.pixelViewport.right + s, f, p;
				if (o != null) {
					let e = Oo(i, o), t = ((d - u) / 2 + a) / n;
					f = e - t, p = e + t;
				} else f = (u - a) / n, p = (d + a) / n;
				c = Do(i, f), l = Do(i, p);
			}
			c > t.from && s(t.from, c, t, i), l < t.to && s(l, t.to, t, i);
		};
		for (let e of this.viewportLines) Array.isArray(e.type) ? e.type.forEach(c) : c(e);
		return o;
	}
	gapSize(e, t, n, r) {
		let i = Oo(r, n) - Oo(r, t);
		return this.heightOracle.lineWrapping ? e.height * i : r.total * this.heightOracle.charWidth * i;
	}
	updateLineGaps(e) {
		So.same(e, this.lineGaps) || (this.lineGaps = e, this.lineGapDeco = N.set(e.map((e) => e.draw(this, this.heightOracle.lineWrapping))));
	}
	computeVisibleRanges(e) {
		let t = this.stateDeco;
		this.lineGaps.length && (t = t.concat(this.lineGapDeco));
		let n = [];
		A.spans(t, this.viewport.from, this.viewport.to, {
			span(e, t) {
				n.push({
					from: e,
					to: t
				});
			},
			point() {}
		}, 20);
		let r = 0;
		if (n.length != this.visibleRanges.length) r = 12;
		else for (let t = 0; t < n.length && !(r & 8); t++) {
			let i = this.visibleRanges[t], a = n[t];
			(i.from != a.from || i.to != a.to) && (r |= 4, e && e.mapPos(i.from, -1) == a.from && e.mapPos(i.to, 1) == a.to || (r |= 8));
		}
		return this.visibleRanges = n, r;
	}
	lineBlockAt(e) {
		return e >= this.viewport.from && e <= this.viewport.to && this.viewportLines.find((t) => t.from <= e && t.to >= e) || No(this.heightMap.lineAt(e, R.ByPos, this.heightOracle, 0, 0), this.scaler);
	}
	lineBlockAtHeight(e) {
		return e >= this.viewportLines[0].top && e <= this.viewportLines[this.viewportLines.length - 1].bottom && this.viewportLines.find((t) => t.top <= e && t.bottom >= e) || No(this.heightMap.lineAt(this.scaler.fromDOM(e), R.ByHeight, this.heightOracle, 0, 0), this.scaler);
	}
	getScrollOffset() {
		return (this.scrollParent == this.view.scrollDOM ? this.scrollParent.scrollTop : (this.scrollParent ? this.scrollParent.getBoundingClientRect().top : 0) - this.view.contentDOM.getBoundingClientRect().top) * this.scaleY;
	}
	scrollAnchorAt(e) {
		let t = this.lineBlockAtHeight(e + 8);
		return t.from >= this.viewport.from || this.viewportLines[0].top - e > 200 ? t : this.viewportLines[0];
	}
	elementAtHeight(e) {
		return No(this.heightMap.blockAt(this.scaler.fromDOM(e), this.heightOracle, 0, 0), this.scaler);
	}
	get docHeight() {
		return this.scaler.toDOM(this.heightMap.height);
	}
	get contentHeight() {
		return this.docHeight + this.paddingTop + this.paddingBottom;
	}
}, To = class {
	constructor(e, t) {
		this.from = e, this.to = t;
	}
};
function Eo(e, t, n) {
	let r = [], i = e, a = 0;
	return A.spans(n, e, t, {
		span() {},
		point(e, t) {
			e > i && (r.push({
				from: i,
				to: e
			}), a += e - i), i = t;
		}
	}, 20), i < t && (r.push({
		from: i,
		to: t
	}), a += t - i), {
		total: a,
		ranges: r
	};
}
function Do({ total: e, ranges: t }, n) {
	if (n <= 0) return t[0].from;
	if (n >= 1) return t[t.length - 1].to;
	let r = Math.floor(e * n);
	for (let e = 0;; e++) {
		let { from: n, to: i } = t[e], a = i - n;
		if (r <= a) return n + r;
		r -= a;
	}
}
function Oo(e, t) {
	let n = 0;
	for (let { from: r, to: i } of e.ranges) {
		if (t <= i) {
			n += t - r;
			break;
		}
		n += i - r;
	}
	return n / e.total;
}
function ko(e, t) {
	for (let n of e) if (t(n)) return n;
}
var Ao = {
	toDOM(e) {
		return e;
	},
	fromDOM(e) {
		return e;
	},
	scale: 1,
	eq(e) {
		return e == this;
	}
};
function jo(e) {
	let t = e.facet(Gr).filter((e) => typeof e != "function"), n = e.facet(qr).filter((e) => typeof e != "function");
	return n.length && t.push(A.join(n)), t;
}
var Mo = class e {
	constructor(e, t, n) {
		let r = 0, i = 0, a = 0;
		this.viewports = n.map(({ from: n, to: i }) => {
			let a = t.lineAt(n, R.ByPos, e, 0, 0).top, o = t.lineAt(i, R.ByPos, e, 0, 0).bottom;
			return r += o - a, {
				from: n,
				to: i,
				top: a,
				bottom: o,
				domTop: 0,
				domBottom: 0
			};
		}), this.scale = (7e6 - r) / (t.height - r);
		for (let e of this.viewports) e.domTop = a + (e.top - i) * this.scale, a = e.domBottom = e.domTop + (e.bottom - e.top), i = e.bottom;
	}
	toDOM(e) {
		for (let t = 0, n = 0, r = 0;; t++) {
			let i = t < this.viewports.length ? this.viewports[t] : null;
			if (!i || e < i.top) return r + (e - n) * this.scale;
			if (e <= i.bottom) return i.domTop + (e - i.top);
			n = i.bottom, r = i.domBottom;
		}
	}
	fromDOM(e) {
		for (let t = 0, n = 0, r = 0;; t++) {
			let i = t < this.viewports.length ? this.viewports[t] : null;
			if (!i || e < i.domTop) return n + (e - r) / this.scale;
			if (e <= i.domBottom) return i.top + (e - i.domTop);
			n = i.bottom, r = i.domBottom;
		}
	}
	eq(t) {
		return t instanceof e && this.scale == t.scale && this.viewports.length == t.viewports.length && this.viewports.every((e, n) => e.from == t.viewports[n].from && e.to == t.viewports[n].to);
	}
};
function No(e, t) {
	if (t.scale == 1) return e;
	let n = t.toDOM(e.top), r = t.toDOM(e.bottom);
	return new io(e.from, e.length, n, r - n, Array.isArray(e._content) ? e._content.map((e) => No(e, t)) : e._content);
}
var Po = /*@__PURE__*/ E.define({ combine: (e) => e.join(" ") }), Fo = /*@__PURE__*/ E.define({ combine: (e) => e.indexOf(!0) > -1 }), Io = /*@__PURE__*/ Wt.newName(), Lo = /*@__PURE__*/ Wt.newName(), Ro = /*@__PURE__*/ Wt.newName(), zo = {
	"&light": "." + Lo,
	"&dark": "." + Ro
};
function Bo(e, t, n) {
	return new Wt(t, { finish(t) {
		return /&/.test(t) ? t.replace(/&\w*/, (t) => {
			if (t == "&") return e;
			if (!n || !n[t]) throw RangeError(`Unsupported selector: ${t}`);
			return n[t];
		}) : e + " " + t;
	} });
}
var Vo = /*@__PURE__*/ Bo("." + Io, {
	"&": {
		position: "relative !important",
		boxSizing: "border-box",
		"&.cm-focused": { outline: "1px dotted #212121" },
		display: "flex !important",
		flexDirection: "column"
	},
	".cm-scroller": {
		display: "flex !important",
		alignItems: "flex-start !important",
		fontFamily: "monospace",
		lineHeight: 1.4,
		height: "100%",
		overflowX: "auto",
		position: "relative",
		zIndex: 0,
		overflowAnchor: "none"
	},
	".cm-content": {
		margin: 0,
		flexGrow: 2,
		flexShrink: 0,
		display: "block",
		whiteSpace: "pre",
		wordWrap: "normal",
		boxSizing: "border-box",
		minHeight: "100%",
		padding: "4px 0",
		outline: "none",
		"&[contenteditable=true]": { WebkitUserModify: "read-write-plaintext-only" }
	},
	".cm-lineWrapping": {
		whiteSpace_fallback: "pre-wrap",
		whiteSpace: "break-spaces",
		wordBreak: "break-word",
		overflowWrap: "anywhere",
		flexShrink: 1
	},
	"&light .cm-content": { caretColor: "black" },
	"&dark .cm-content": { caretColor: "white" },
	".cm-line": {
		display: "block",
		padding: "0 2px 0 6px"
	},
	".cm-layer": {
		userSelect: "none",
		position: "absolute",
		left: 0,
		top: 0,
		contain: "size style",
		"& > *": { position: "absolute" }
	},
	"&light .cm-selectionBackground": { background: "#d9d9d9" },
	"&dark .cm-selectionBackground": { background: "#222" },
	"&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { background: "#d7d4f0" },
	"&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { background: "#233" },
	".cm-cursorLayer": { pointerEvents: "none" },
	"&.cm-focused > .cm-scroller > .cm-cursorLayer": { animation: "steps(1) cm-blink 1.2s infinite" },
	"@keyframes cm-blink": {
		"0%": {},
		"50%": { opacity: 0 },
		"100%": {}
	},
	"@keyframes cm-blink2": {
		"0%": {},
		"50%": { opacity: 0 },
		"100%": {}
	},
	".cm-cursor, .cm-dropCursor": {
		borderLeft: "1.2px solid black",
		marginLeft: "-0.6px",
		pointerEvents: "none"
	},
	".cm-cursor": { display: "none" },
	"&dark .cm-cursor": { borderLeftColor: "#ddd" },
	".cm-selectionHandle": {
		backgroundColor: "currentColor",
		width: "1.5px"
	},
	".cm-selectionHandle-start::before, .cm-selectionHandle-end::before": {
		content: "\"\"",
		backgroundColor: "inherit",
		borderRadius: "50%",
		width: "8px",
		height: "8px",
		position: "absolute",
		left: "-3.25px"
	},
	".cm-selectionHandle-start::before": { top: "-8px" },
	".cm-selectionHandle-end::before": { bottom: "-8px" },
	".cm-dropCursor": { position: "absolute" },
	"&.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor": { display: "block" },
	".cm-iso": { unicodeBidi: "isolate" },
	".cm-announced": {
		position: "fixed",
		top: "-10000px"
	},
	"@media print": { ".cm-announced": { display: "none" } },
	"&light .cm-activeLine": { backgroundColor: "#cceeff44" },
	"&dark .cm-activeLine": { backgroundColor: "#99eeff33" },
	"&light .cm-specialChar": { color: "red" },
	"&dark .cm-specialChar": { color: "#f78" },
	".cm-gutters": {
		flexShrink: 0,
		display: "flex",
		height: "100%",
		boxSizing: "border-box",
		zIndex: 200
	},
	".cm-gutters-before": { insetInlineStart: 0 },
	".cm-gutters-after": { insetInlineEnd: 0 },
	"&light .cm-gutters": {
		backgroundColor: "#f5f5f5",
		color: "#6c6c6c",
		border: "0px solid #ddd",
		"&.cm-gutters-before": { borderRightWidth: "1px" },
		"&.cm-gutters-after": { borderLeftWidth: "1px" }
	},
	"&dark .cm-gutters": {
		backgroundColor: "#333338",
		color: "#ccc"
	},
	".cm-gutter": {
		display: "flex !important",
		flexDirection: "column",
		flexShrink: 0,
		boxSizing: "border-box",
		minHeight: "100%",
		overflow: "hidden"
	},
	".cm-gutterElement": { boxSizing: "border-box" },
	".cm-lineNumbers .cm-gutterElement": {
		padding: "0 3px 0 5px",
		minWidth: "20px",
		textAlign: "right",
		whiteSpace: "nowrap"
	},
	"&light .cm-activeLineGutter": { backgroundColor: "#e2f2ff" },
	"&dark .cm-activeLineGutter": { backgroundColor: "#222227" },
	".cm-panels": {
		boxSizing: "border-box",
		position: "sticky",
		left: 0,
		right: 0,
		zIndex: 300
	},
	"&light .cm-panels": {
		backgroundColor: "#f5f5f5",
		color: "black"
	},
	".cm-panels-top": { top: "0" },
	".cm-panels-bottom": { bottom: "0" },
	"&light .cm-panels-top": { borderBottom: "1px solid #ddd" },
	"&light .cm-panels-bottom": { borderTop: "1px solid #ddd" },
	"&dark .cm-panels": {
		backgroundColor: "#333338",
		color: "white"
	},
	".cm-dialog": {
		padding: "2px 19px 4px 6px",
		position: "relative",
		"& label": { fontSize: "80%" }
	},
	".cm-dialog-close": {
		position: "absolute",
		top: "3px",
		right: "4px",
		backgroundColor: "inherit",
		border: "none",
		font: "inherit",
		fontSize: "14px",
		padding: "0"
	},
	".cm-tab": {
		display: "inline-block",
		overflow: "hidden",
		verticalAlign: "bottom"
	},
	".cm-widgetBuffer": {
		verticalAlign: "text-top",
		height: "1em",
		width: 0,
		display: "inline"
	},
	".cm-placeholder": {
		color: "#888",
		display: "inline-block",
		verticalAlign: "top",
		userSelect: "none"
	},
	".cm-highlightSpace": {
		backgroundImage: "radial-gradient(circle at 50% 55%, #aaa 20%, transparent 5%)",
		backgroundPosition: "center"
	},
	".cm-highlightTab": {
		backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"20\"><path stroke=\"%23888\" stroke-width=\"1\" fill=\"none\" d=\"M1 10H196L190 5M190 15L196 10M197 4L197 16\"/></svg>')",
		backgroundSize: "auto 100%",
		backgroundPosition: "right 90%",
		backgroundRepeat: "no-repeat"
	},
	".cm-trailingSpace": { backgroundColor: "#ff332255" },
	".cm-button": {
		verticalAlign: "middle",
		color: "inherit",
		fontSize: "70%",
		padding: ".2em 1em",
		borderRadius: "1px"
	},
	"&light .cm-button": {
		backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
		border: "1px solid #888",
		"&:active": { backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)" }
	},
	"&dark .cm-button": {
		backgroundImage: "linear-gradient(#393939, #111)",
		border: "1px solid #888",
		"&:active": { backgroundImage: "linear-gradient(#111, #333)" }
	},
	".cm-textfield": {
		verticalAlign: "middle",
		color: "inherit",
		fontSize: "70%",
		border: "1px solid silver",
		padding: ".2em .5em"
	},
	"&light .cm-textfield": { backgroundColor: "white" },
	"&dark .cm-textfield": {
		border: "1px solid #555",
		backgroundColor: "inherit"
	}
}, zo), Ho = {
	childList: !0,
	characterData: !0,
	subtree: !0,
	attributes: !0,
	characterDataOldValue: !0
}, Uo = M.ie && M.ie_version <= 11, Wo = class {
	constructor(e) {
		this.view = e, this.active = !1, this.editContext = null, this.selectionRange = new Hn(), this.selectionChanged = !1, this.delayedFlush = -1, this.resizeTimeout = -1, this.queue = [], this.delayedAndroidKey = null, this.flushingAndroidKey = -1, this.lastChange = 0, this.scrollTargets = [], this.intersection = null, this.resizeScroll = null, this.intersecting = !1, this.gapIntersection = null, this.gaps = [], this.printQuery = null, this.parentCheck = -1, this.dom = e.contentDOM, this.observer = new MutationObserver((t) => {
			for (let e of t) this.queue.push(e);
			(M.ie && M.ie_version <= 11 || M.ios && e.composing) && t.some((e) => e.type == "childList" && e.removedNodes.length || e.type == "characterData" && e.oldValue.length > e.target.nodeValue.length) ? this.flushSoon() : this.flush();
		}), window.EditContext && M.android && e.constructor.EDIT_CONTEXT !== !1 && !(M.chrome && M.chrome_version < 126) && (this.editContext = new Jo(e), e.state.facet(zr) && (e.contentDOM.editContext = this.editContext.editContext)), Uo && (this.onCharData = (e) => {
			this.queue.push({
				target: e.target,
				type: "characterData",
				oldValue: e.prevValue
			}), this.flushSoon();
		}), this.onSelectionChange = this.onSelectionChange.bind(this), this.onResize = this.onResize.bind(this), this.onPrint = this.onPrint.bind(this), this.onScroll = this.onScroll.bind(this), window.matchMedia && (this.printQuery = window.matchMedia("print")), typeof ResizeObserver == "function" && (this.resizeScroll = new ResizeObserver(() => {
			this.view.docView?.lastUpdate < Date.now() - 75 && this.onResize();
		}), this.resizeScroll.observe(e.scrollDOM)), this.addWindowListeners(this.win = e.win), this.start(), typeof IntersectionObserver == "function" && (this.intersection = new IntersectionObserver((e) => {
			this.parentCheck < 0 && (this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1e3)), e.length > 0 && e[e.length - 1].intersectionRatio > 0 != this.intersecting && (this.intersecting = !this.intersecting, this.intersecting != this.view.inView && this.onScrollChanged(document.createEvent("Event")));
		}, { threshold: [0, .001] }), this.intersection.observe(this.dom), this.gapIntersection = new IntersectionObserver((e) => {
			e.length > 0 && e[e.length - 1].intersectionRatio > 0 && this.onScrollChanged(document.createEvent("Event"));
		}, {})), this.listenForScroll(), this.readSelectionRange();
	}
	onScrollChanged(e) {
		this.view.inputState.runHandlers("scroll", e), this.intersecting && this.view.measure();
	}
	onScroll(e) {
		this.intersecting && this.flush(!1), this.editContext && this.view.requestMeasure(this.editContext.measureReq), this.onScrollChanged(e);
	}
	onResize() {
		this.resizeTimeout < 0 && (this.resizeTimeout = setTimeout(() => {
			this.resizeTimeout = -1, this.view.requestMeasure();
		}, 50));
	}
	onPrint(e) {
		(e.type == "change" || !e.type) && !e.matches || (this.view.viewState.printing = !0, this.view.measure(), setTimeout(() => {
			this.view.viewState.printing = !1, this.view.requestMeasure();
		}, 500));
	}
	updateGaps(e) {
		if (this.gapIntersection && (e.length != this.gaps.length || this.gaps.some((t, n) => t != e[n]))) {
			this.gapIntersection.disconnect();
			for (let t of e) this.gapIntersection.observe(t);
			this.gaps = e;
		}
	}
	onSelectionChange(e) {
		let t = this.selectionChanged;
		if (!this.readSelectionRange() || this.delayedAndroidKey) return;
		let { view: n } = this, r = this.selectionRange;
		if (n.state.facet(zr) ? n.root.activeElement != this.dom : !An(this.dom, r)) return;
		let i = r.anchorNode && n.docView.tile.nearest(r.anchorNode);
		if (i && i.isWidget() && i.widget.ignoreEvent(e)) {
			t || (this.selectionChanged = !1);
			return;
		}
		(M.ie && M.ie_version <= 11 || M.android && M.chrome) && !n.state.selection.main.empty && r.focusNode && Mn(r.focusNode, r.focusOffset, r.anchorNode, r.anchorOffset) ? this.flushSoon() : this.flush(!1);
	}
	readSelectionRange() {
		let { view: e } = this, t = On(e.root);
		if (!t) return !1;
		let n = M.safari && e.root.nodeType == 11 && e.root.activeElement == this.dom && qo(this.view, t) || t;
		if (!n || this.selectionRange.eq(n)) return !1;
		let r = An(this.dom, n);
		return r && !this.selectionChanged && e.inputState.lastFocusTime > Date.now() - 200 && e.inputState.lastTouchTime < Date.now() - 300 && Zn(this.dom, n) ? (this.view.inputState.lastFocusTime = 0, e.docView.updateSelection(), !1) : (this.selectionRange.setRange(n), r && (this.selectionChanged = !0), !0);
	}
	setSelectionRange(e, t) {
		this.selectionRange.set(e.node, e.offset, t.node, t.offset), this.selectionChanged = !1;
	}
	clearSelectionRange() {
		this.selectionRange.set(null, 0, null, 0);
	}
	listenForScroll() {
		this.parentCheck = -1;
		let e = 0, t = null;
		for (let n = this.dom; n;) if (n.nodeType == 1) !t && e < this.scrollTargets.length && this.scrollTargets[e] == n ? e++ : t ||= this.scrollTargets.slice(0, e), t && t.push(n), n = n.assignedSlot || n.parentNode;
		else if (n.nodeType == 11) n = n.host;
		else break;
		if (e < this.scrollTargets.length && !t && (t = this.scrollTargets.slice(0, e)), t) {
			for (let e of this.scrollTargets) e.removeEventListener("scroll", this.onScroll);
			for (let e of this.scrollTargets = t) e.addEventListener("scroll", this.onScroll);
		}
	}
	ignore(e) {
		if (!this.active) return e();
		try {
			return this.stop(), e();
		} finally {
			this.start(), this.clear();
		}
	}
	start() {
		this.active ||= (this.observer.observe(this.dom, Ho), Uo && this.dom.addEventListener("DOMCharacterDataModified", this.onCharData), !0);
	}
	stop() {
		this.active && (this.active = !1, this.observer.disconnect(), Uo && this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData));
	}
	clear() {
		this.processRecords(), this.queue.length = 0, this.selectionChanged = !1;
	}
	delayAndroidKey(e, t) {
		if (!this.delayedAndroidKey) {
			let e = () => {
				let e = this.delayedAndroidKey;
				e && (this.clearDelayedAndroidKey(), this.view.inputState.lastKeyCode = e.keyCode, this.view.inputState.lastKeyTime = Date.now(), !this.flush() && e.force && Yn(this.dom, e.key, e.keyCode));
			};
			this.flushingAndroidKey = this.view.win.requestAnimationFrame(e);
		}
		(!this.delayedAndroidKey || e == "Enter") && (this.delayedAndroidKey = {
			key: e,
			keyCode: t,
			force: this.lastChange < Date.now() - 50 || !!this.delayedAndroidKey?.force
		});
	}
	clearDelayedAndroidKey() {
		this.win.cancelAnimationFrame(this.flushingAndroidKey), this.delayedAndroidKey = null, this.flushingAndroidKey = -1;
	}
	flushSoon() {
		this.delayedFlush < 0 && (this.delayedFlush = this.view.win.requestAnimationFrame(() => {
			this.delayedFlush = -1, this.flush();
		}));
	}
	forceFlush() {
		this.delayedFlush >= 0 && (this.view.win.cancelAnimationFrame(this.delayedFlush), this.delayedFlush = -1), this.flush();
	}
	pendingRecords() {
		for (let e of this.observer.takeRecords()) this.queue.push(e);
		return this.queue;
	}
	processRecords() {
		let e = this.pendingRecords();
		e.length && (this.queue = []);
		let t = -1, n = -1, r = !1;
		for (let i of e) {
			let e = this.readMutation(i);
			e && (e.typeOver && (r = !0), t == -1 ? {from: t, to: n} = e : (t = Math.min(e.from, t), n = Math.max(e.to, n)));
		}
		return {
			from: t,
			to: n,
			typeOver: r
		};
	}
	readChange() {
		let { from: e, to: t, typeOver: n } = this.processRecords(), r = this.selectionChanged && An(this.dom, this.selectionRange);
		if (e < 0 && !r) return null;
		e > -1 && (this.lastChange = Date.now()), this.view.inputState.lastFocusTime = 0, this.selectionChanged = !1;
		let i = new oa(this.view, e, t, n);
		return this.view.docView.domChanged = { newSel: i.newSel ? i.newSel.main : null }, i;
	}
	flush(e = !0) {
		if (this.delayedFlush >= 0 || this.delayedAndroidKey) return !1;
		e && this.readSelectionRange();
		let t = this.readChange();
		if (!t) return this.view.requestMeasure(), !1;
		let n = this.view.state, r = ca(this.view, t);
		return this.view.state == n && (t.domChanged || t.newSel && !ma(this.view.state.selection, t.newSel.main)) && this.view.update([]), r;
	}
	readMutation(e) {
		let t = this.view.docView.tile.nearest(e.target);
		if (!t || t.isWidget()) return null;
		if (t.markDirty(e.type == "attributes"), e.type == "childList") {
			let n = Go(t, e.previousSibling || e.target.previousSibling, -1), r = Go(t, e.nextSibling || e.target.nextSibling, 1);
			return {
				from: n ? t.posAfter(n) : t.posAtStart,
				to: r ? t.posBefore(r) : t.posAtEnd,
				typeOver: !1
			};
		}
		return e.type == "characterData" ? {
			from: t.posAtStart,
			to: t.posAtEnd,
			typeOver: e.target.nodeValue == e.oldValue
		} : null;
	}
	setWindow(e) {
		e != this.win && (this.removeWindowListeners(this.win), this.win = e, this.addWindowListeners(this.win));
	}
	addWindowListeners(e) {
		e.addEventListener("resize", this.onResize), this.printQuery ? this.printQuery.addEventListener ? this.printQuery.addEventListener("change", this.onPrint) : this.printQuery.addListener(this.onPrint) : e.addEventListener("beforeprint", this.onPrint), e.addEventListener("scroll", this.onScroll), e.document.addEventListener("selectionchange", this.onSelectionChange);
	}
	removeWindowListeners(e) {
		e.removeEventListener("scroll", this.onScroll), e.removeEventListener("resize", this.onResize), this.printQuery ? this.printQuery.removeEventListener ? this.printQuery.removeEventListener("change", this.onPrint) : this.printQuery.removeListener(this.onPrint) : e.removeEventListener("beforeprint", this.onPrint), e.document.removeEventListener("selectionchange", this.onSelectionChange);
	}
	update(e) {
		this.editContext && (this.editContext.update(e), e.startState.facet(zr) != e.state.facet(zr) && (e.view.contentDOM.editContext = e.state.facet(zr) ? this.editContext.editContext : null));
	}
	destroy() {
		var e, t, n;
		this.stop(), (e = this.intersection) == null || e.disconnect(), (t = this.gapIntersection) == null || t.disconnect(), (n = this.resizeScroll) == null || n.disconnect();
		for (let e of this.scrollTargets) e.removeEventListener("scroll", this.onScroll);
		this.removeWindowListeners(this.win), clearTimeout(this.parentCheck), clearTimeout(this.resizeTimeout), this.win.cancelAnimationFrame(this.delayedFlush), this.win.cancelAnimationFrame(this.flushingAndroidKey), this.editContext && (this.view.contentDOM.editContext = null, this.editContext.destroy());
	}
};
function Go(e, t, n) {
	for (; t;) {
		let r = L.get(t);
		if (r && r.parent == e) return r;
		let i = t.parentNode;
		t = i == e.dom ? n > 0 ? t.nextSibling : t.previousSibling : i;
	}
	return null;
}
function Ko(e, t) {
	let n = t.startContainer, r = t.startOffset, i = t.endContainer, a = t.endOffset, o = e.docView.domAtPos(e.state.selection.main.anchor, 1);
	return Mn(o.node, o.offset, i, a) && ([n, r, i, a] = [
		i,
		a,
		n,
		r
	]), {
		anchorNode: n,
		anchorOffset: r,
		focusNode: i,
		focusOffset: a
	};
}
function qo(e, t) {
	if (t.getComposedRanges) {
		let n = t.getComposedRanges(e.root)[0];
		if (n) return Ko(e, n);
	}
	let n = null;
	function r(e) {
		e.preventDefault(), e.stopImmediatePropagation(), n = e.getTargetRanges()[0];
	}
	return e.contentDOM.addEventListener("beforeinput", r, !0), e.dom.ownerDocument.execCommand("indent"), e.contentDOM.removeEventListener("beforeinput", r, !0), n ? Ko(e, n) : null;
}
var Jo = class {
	constructor(e) {
		this.from = 0, this.to = 0, this.pendingContextChange = null, this.handlers = Object.create(null), this.composing = null, this.resetRange(e.state);
		let t = this.editContext = new window.EditContext({
			text: e.state.doc.sliceString(this.from, this.to),
			selectionStart: this.toContextPos(Math.max(this.from, Math.min(this.to, e.state.selection.main.anchor))),
			selectionEnd: this.toContextPos(e.state.selection.main.head)
		});
		this.handlers.textupdate = (n) => {
			let r = e.state.selection.main, { anchor: i, head: a } = r, o = this.toEditorPos(n.updateRangeStart), s = this.toEditorPos(n.updateRangeEnd);
			e.inputState.composing >= 0 && !this.composing && (this.composing = {
				contextBase: n.updateRangeStart,
				editorBase: o,
				drifted: !1
			});
			let c = s - o > n.text.length;
			o == this.from && i < this.from ? o = i : s == this.to && i > this.to && (s = i);
			let l = da(e.state.sliceDoc(o, s), n.text, (c ? r.from : r.to) - o, c ? "end" : null);
			if (!l) {
				let t = T.single(this.toEditorPos(n.selectionStart), this.toEditorPos(n.selectionEnd));
				ma(t, r) || e.dispatch({
					selection: t,
					userEvent: "select"
				});
				return;
			}
			let u = {
				from: l.from + o,
				to: l.toA + o,
				insert: C.of(n.text.slice(l.from, l.toB).split("\n"))
			};
			if ((M.mac || M.android) && u.from == a - 1 && /^\. ?$/.test(n.text) && e.contentDOM.getAttribute("autocorrect") == "off" && (u = {
				from: o,
				to: s,
				insert: C.of([n.text.replace(".", " ")])
			}), this.pendingContextChange = u, !e.state.readOnly) {
				let t = this.to - this.from + (u.to - u.from + u.insert.length);
				la(e, u, T.single(this.toEditorPos(n.selectionStart, t), this.toEditorPos(n.selectionEnd, t)));
			}
			this.pendingContextChange && (this.revertPending(e.state), this.setSelection(e.state)), u.from < u.to && !u.insert.length && e.inputState.composing >= 0 && !/[\\p{Alphabetic}\\p{Number}_]/.test(t.text.slice(Math.max(0, n.updateRangeStart - 1), Math.min(t.text.length, n.updateRangeStart + 1))) && this.handlers.compositionend(n);
		}, this.handlers.characterboundsupdate = (n) => {
			let r = [], i = null;
			for (let t = this.toEditorPos(n.rangeStart), a = this.toEditorPos(n.rangeEnd); t < a; t++) {
				let n = e.coordsForChar(t);
				i = n && new DOMRect(n.left, n.top, n.right - n.left, n.bottom - n.top) || i || new DOMRect(), r.push(i);
			}
			t.updateCharacterBounds(n.rangeStart, r);
		}, this.handlers.textformatupdate = (t) => {
			let n = [];
			for (let e of t.getTextFormats()) {
				let t = e.underlineStyle, r = e.underlineThickness;
				if (!/none/i.test(t) && !/none/i.test(r)) {
					let i = this.toEditorPos(e.rangeStart), a = this.toEditorPos(e.rangeEnd);
					if (i < a) {
						let e = `text-decoration: underline ${/^[a-z]/.test(t) ? t + " " : t == "Dashed" ? "dashed " : t == "Squiggle" ? "wavy " : ""}${/thin/i.test(r) ? 1 : 2}px`;
						n.push(N.mark({ attributes: { style: e } }).range(i, a));
					}
				}
			}
			e.dispatch({ effects: Lr.of(N.set(n)) });
		}, this.handlers.compositionstart = () => {
			e.inputState.composing < 0 && (e.inputState.composing = 0, e.inputState.compositionFirstChange = !0);
		}, this.handlers.compositionend = () => {
			if (e.inputState.composing = -1, e.inputState.compositionFirstChange = null, this.composing) {
				let { drifted: t } = this.composing;
				this.composing = null, t && this.reset(e.state);
			}
		};
		for (let e in this.handlers) t.addEventListener(e, this.handlers[e]);
		this.measureReq = { read: (e) => {
			let t = On(e.root);
			t && t.rangeCount && this.editContext.updateSelectionBounds(t.getRangeAt(0).getBoundingClientRect());
		} };
	}
	applyEdits(e) {
		let t = 0, n = !1, r = this.pendingContextChange;
		return e.changes.iterChanges((i, a, o, s, c) => {
			if (n) return;
			let l = c.length - (a - i);
			if (r && a >= r.to) {
				if (r.from == i && r.to == a && r.insert.eq(c)) {
					r = this.pendingContextChange = null, t += l, this.to += l;
					return;
				}
				r = null, this.revertPending(e.state);
			}
			if (i += t, a += t, a <= this.from) this.from += l, this.to += l;
			else if (i < this.to) {
				if (i < this.from || a > this.to || this.to - this.from + c.length > 3e4) {
					n = !0;
					return;
				}
				this.editContext.updateText(this.toContextPos(i), this.toContextPos(a), c.toString()), this.to += l;
			}
			t += l;
		}), r && !n && this.revertPending(e.state), !n;
	}
	update(e) {
		let t = this.pendingContextChange, n = e.startState.selection.main;
		this.composing && (this.composing.drifted || !e.changes.touchesRange(n.from, n.to) && e.transactions.some((e) => !e.isUserEvent("input.type") && e.changes.touchesRange(this.from, this.to))) ? (this.composing.drifted = !0, this.composing.editorBase = e.changes.mapPos(this.composing.editorBase)) : !this.applyEdits(e) || !this.rangeIsValid(e.state) ? (this.pendingContextChange = null, this.reset(e.state)) : (e.docChanged || e.selectionSet || t) && this.setSelection(e.state), (e.geometryChanged || e.docChanged || e.selectionSet) && e.view.requestMeasure(this.measureReq);
	}
	resetRange(e) {
		let { head: t } = e.selection.main;
		this.from = Math.max(0, t - 1e4), this.to = Math.min(e.doc.length, t + 1e4);
	}
	reset(e) {
		this.resetRange(e), this.editContext.updateText(0, this.editContext.text.length, e.doc.sliceString(this.from, this.to)), this.setSelection(e);
	}
	revertPending(e) {
		let t = this.pendingContextChange;
		this.pendingContextChange = null, this.editContext.updateText(this.toContextPos(t.from), this.toContextPos(t.from + t.insert.length), e.doc.sliceString(t.from, t.to));
	}
	setSelection(e) {
		let { main: t } = e.selection, n = this.toContextPos(Math.max(this.from, Math.min(this.to, t.anchor))), r = this.toContextPos(t.head);
		(this.editContext.selectionStart != n || this.editContext.selectionEnd != r) && this.editContext.updateSelection(n, r);
	}
	rangeIsValid(e) {
		let { head: t } = e.selection.main;
		return !(this.from > 0 && t - this.from < 500 || this.to < e.doc.length && this.to - t < 500 || this.to - this.from > 3e4);
	}
	toEditorPos(e, t = this.to - this.from) {
		e = Math.min(e, t);
		let n = this.composing;
		return n && n.drifted ? n.editorBase + (e - n.contextBase) : e + this.from;
	}
	toContextPos(e) {
		let t = this.composing;
		return t && t.drifted ? t.contextBase + (e - t.editorBase) : e - this.from;
	}
	destroy() {
		for (let e in this.handlers) this.editContext.removeEventListener(e, this.handlers[e]);
	}
}, z = class e {
	get state() {
		return this.viewState.state;
	}
	get viewport() {
		return this.viewState.viewport;
	}
	get visibleRanges() {
		return this.viewState.visibleRanges;
	}
	get inView() {
		return this.viewState.inView;
	}
	get composing() {
		return !!this.inputState && this.inputState.composing > 0;
	}
	get compositionStarted() {
		return !!this.inputState && this.inputState.composing >= 0;
	}
	get root() {
		return this._root;
	}
	get win() {
		return this.dom.ownerDocument.defaultView || window;
	}
	constructor(e = {}) {
		this.plugins = [], this.pluginMap = /* @__PURE__ */ new Map(), this.editorAttrs = {}, this.contentAttrs = {}, this.bidiCache = [], this.destroyed = !1, this.updateState = 2, this.measureScheduled = -1, this.measureRequests = [], this.contentDOM = document.createElement("div"), this.scrollDOM = document.createElement("div"), this.scrollDOM.tabIndex = -1, this.scrollDOM.className = "cm-scroller", this.scrollDOM.appendChild(this.contentDOM), this.announceDOM = document.createElement("div"), this.announceDOM.className = "cm-announced", this.announceDOM.setAttribute("aria-live", "polite"), this.dom = document.createElement("div"), this.dom.appendChild(this.announceDOM), this.dom.appendChild(this.scrollDOM), e.parent && e.parent.appendChild(this.dom);
		let { dispatch: t } = e;
		this.dispatchTransactions = e.dispatchTransactions || t && ((e) => e.forEach((e) => t(e, this))) || ((e) => this.update(e)), this.dispatch = this.dispatch.bind(this), this._root = e.root || Xn(e.parent) || document, this.viewState = new wo(this, e.state || k.create(e)), e.scrollTo && e.scrollTo.is(Ir) && (this.viewState.scrollTarget = e.scrollTo.value.clip(this.viewState.state)), this.plugins = this.state.facet(Vr).map((e) => new Hr(e));
		for (let e of this.plugins) e.update(this);
		this.observer = new Wo(this), this.inputState = new ha(this), this.inputState.ensureHandlers(this.plugins), this.docView = new ki(this), this.mountStyles(), this.updateAttrs(), this.updateState = 0, this.requestMeasure(), document.fonts?.ready && document.fonts.ready.then(() => {
			this.viewState.mustMeasureContent = "refresh", this.requestMeasure();
		});
	}
	dispatch(...e) {
		let t = e.length == 1 && e[0] instanceof st ? e : e.length == 1 && Array.isArray(e[0]) ? e[0] : [this.state.update(...e)];
		this.dispatchTransactions(t, this);
	}
	update(t) {
		if (this.updateState != 0) throw Error("Calls to EditorView.update are not allowed while an update is in progress");
		let n = !1, r = !1, i, a = this.state;
		for (let e of t) {
			if (e.startState != a) throw RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
			a = e.state;
		}
		if (this.destroyed) {
			this.viewState.state = a;
			return;
		}
		let o = this.hasFocus, s = 0, c = null;
		t.some((e) => e.annotation(Ja)) ? (this.inputState.notifiedFocused = o, s = 1) : o != this.inputState.notifiedFocused && (this.inputState.notifiedFocused = o, c = Ya(a, o), c || (s = 1));
		let l = this.observer.delayedAndroidKey, u = null;
		if (l ? (this.observer.clearDelayedAndroidKey(), u = this.observer.readChange(), (u && !this.state.doc.eq(a.doc) || !this.state.selection.eq(a.selection)) && (u = null)) : this.observer.clear(), a.facet(k.phrases) != this.state.facet(k.phrases)) return this.setState(a);
		i = ti.create(this, a, t), i.flags |= s;
		let d = this.viewState.scrollTarget;
		try {
			this.updateState = 2;
			for (let n of t) {
				if (d &&= d.map(n.changes), n.scrollIntoView) {
					let { main: t } = n.state.selection, { x: r, y: i } = this.state.facet(e.cursorScrollMargin);
					d = new Fr(t.empty ? t : T.cursor(t.head, t.head > t.anchor ? -1 : 1), "nearest", "nearest", i, r);
				}
				for (let e of n.effects) e.is(Ir) && (d = e.value.clip(this.state));
			}
			this.viewState.update(i, d), this.bidiCache = Zo.update(this.bidiCache, i.changes), i.empty || (this.updatePlugins(i), this.inputState.update(i)), n = this.docView.update(i), this.state.facet($r) != this.styleModules && this.mountStyles(), r = this.updateAttrs(), this.showAnnouncements(t), this.docView.updateSelection(n, t.some((e) => e.isUserEvent("select.pointer")));
		} finally {
			this.updateState = 0;
		}
		if (i.startState.facet(Po) != i.state.facet(Po) && (this.viewState.mustMeasureContent = !0), (n || r || d || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent) && this.requestMeasure(), n && this.docViewUpdate(), !i.empty) for (let e of this.state.facet(Dr)) try {
			e(i);
		} catch (e) {
			Rr(this.state, e, "update listener");
		}
		(c || u) && Promise.resolve().then(() => {
			c && this.state == c.startState && this.dispatch(c), u && !ca(this, u) && l.force && Yn(this.contentDOM, l.key, l.keyCode);
		});
	}
	setState(e) {
		if (this.updateState != 0) throw Error("Calls to EditorView.setState are not allowed while an update is in progress");
		if (this.destroyed) {
			this.viewState.state = e;
			return;
		}
		this.updateState = 2;
		let t = this.hasFocus;
		try {
			for (let e of this.plugins) e.destroy(this);
			this.viewState = new wo(this, e), this.plugins = e.facet(Vr).map((e) => new Hr(e)), this.pluginMap.clear();
			for (let e of this.plugins) e.update(this);
			this.docView.destroy(), this.docView = new ki(this), this.inputState.ensureHandlers(this.plugins), this.mountStyles(), this.updateAttrs(), this.bidiCache = [];
		} finally {
			this.updateState = 0;
		}
		t && this.focus(), this.requestMeasure();
	}
	updatePlugins(e) {
		let t = e.startState.facet(Vr), n = e.state.facet(Vr);
		if (t != n) {
			let r = [];
			for (let i of n) {
				let n = t.indexOf(i);
				if (n < 0) r.push(new Hr(i));
				else {
					let t = this.plugins[n];
					t.mustUpdate = e, r.push(t);
				}
			}
			for (let t of this.plugins) t.mustUpdate != e && t.destroy(this);
			this.plugins = r, this.pluginMap.clear();
		} else for (let t of this.plugins) t.mustUpdate = e;
		for (let e = 0; e < this.plugins.length; e++) this.plugins[e].update(this);
		t != n && this.inputState.ensureHandlers(this.plugins);
	}
	docViewUpdate() {
		for (let e of this.plugins) {
			let t = e.value;
			if (t && t.docViewUpdate) try {
				t.docViewUpdate(this);
			} catch (e) {
				Rr(this.state, e, "doc view update listener");
			}
		}
	}
	measure(e = !0) {
		if (this.destroyed) return;
		if (this.measureScheduled > -1 && this.win.cancelAnimationFrame(this.measureScheduled), this.observer.delayedAndroidKey) {
			this.measureScheduled = -1, this.requestMeasure();
			return;
		}
		this.measureScheduled = 0, e && this.observer.forceFlush();
		let t = null, n = this.viewState.scrollParent, r = this.viewState.getScrollOffset(), { scrollAnchorPos: i, scrollAnchorHeight: a } = this.viewState;
		Math.abs(r - this.viewState.scrollOffset) > 1 && (a = -1), this.viewState.scrollAnchorHeight = -1;
		try {
			for (let e = 0;; e++) {
				if (a < 0) {
					if (Qn(n || this.win)) i = -1, a = this.viewState.heightMap.height;
					else {
						let e = this.viewState.scrollAnchorAt(r);
						i = e.from, a = e.top;
					}
				}
				this.updateState = 1;
				let o = this.viewState.measure();
				if (!o && !this.measureRequests.length && this.viewState.scrollTarget == null) break;
				if (e > 5) {
					console.warn(this.measureRequests.length ? "Measure loop restarted more than 5 times" : "Viewport failed to stabilize");
					break;
				}
				let s = [];
				o & 4 || ([this.measureRequests, s] = [s, this.measureRequests]);
				let c = s.map((e) => {
					try {
						return e.read(this);
					} catch (e) {
						return Rr(this.state, e), Xo;
					}
				}), l = ti.create(this, this.state, []), u = !1;
				l.flags |= o, t ? t.flags |= o : t = l, this.updateState = 2, l.empty || (this.updatePlugins(l), this.inputState.update(l), this.updateAttrs(), u = this.docView.update(l), u && this.docViewUpdate());
				for (let e = 0; e < s.length; e++) if (c[e] != Xo) try {
					let t = s[e];
					t.write && t.write(c[e], this);
				} catch (e) {
					Rr(this.state, e);
				}
				if (u && this.docView.updateSelection(!0), !l.viewportChanged && this.measureRequests.length == 0) {
					if (this.viewState.editorHeight) {
						if (this.viewState.scrollTarget) {
							this.docView.scrollIntoView(this.viewState.scrollTarget), this.viewState.scrollTarget = null, a = -1;
							continue;
						}
						{
							let e = ((i < 0 ? this.viewState.heightMap.height : this.viewState.lineBlockAt(i).top) - a) / this.scaleY;
							if ((e > 1 || e < -1) && !(M.ios && this.inputState.lastIOSMomentumScroll > Date.now() - 100) && (n == this.scrollDOM || this.hasFocus || Math.max(this.inputState.lastWheelEvent, this.inputState.lastTouchTime) > Date.now() - 100)) {
								r += e, n ? i < 0 ? n.scrollTop = n.scrollHeight : n.scrollTop += e : this.win.scrollBy(0, e), a = -1;
								continue;
							}
						}
					}
					break;
				}
			}
		} finally {
			this.updateState = 0, this.measureScheduled = -1;
		}
		if (t && !t.empty) for (let e of this.state.facet(Dr)) e(t);
	}
	get themeClasses() {
		return Io + " " + (this.state.facet(Fo) ? Ro : Lo) + " " + this.state.facet(Po);
	}
	updateAttrs() {
		let e = Qo(this, Ur, { class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses }), t = {
			spellcheck: "false",
			autocorrect: "off",
			autocapitalize: "off",
			writingsuggestions: "false",
			translate: "no",
			contenteditable: this.state.facet(zr) ? "true" : "false",
			class: "cm-content",
			style: `${M.tabSize}: ${this.state.tabSize}`,
			role: "textbox",
			"aria-multiline": "true"
		};
		this.state.readOnly && (t["aria-readonly"] = "true"), Qo(this, Wr, t);
		let n = this.observer.ignore(() => {
			let n = _n(this.contentDOM, this.contentAttrs, t), r = _n(this.dom, this.editorAttrs, e);
			return n || r;
		});
		return this.editorAttrs = e, this.contentAttrs = t, n;
	}
	showAnnouncements(t) {
		let n = !0;
		for (let r of t) for (let t of r.effects) if (t.is(e.announce)) {
			n && (this.announceDOM.textContent = ""), n = !1;
			let e = this.announceDOM.appendChild(document.createElement("div"));
			e.textContent = t.value;
		}
	}
	mountStyles() {
		this.styleModules = this.state.facet($r);
		let t = this.state.facet(e.cspNonce);
		Wt.mount(this.root, this.styleModules.concat(Vo).reverse(), t ? { nonce: t } : void 0);
	}
	readMeasured() {
		if (this.updateState == 2) throw Error("Reading the editor layout isn't allowed during an update");
		this.updateState == 0 && this.measureScheduled > -1 && this.measure(!1);
	}
	requestMeasure(e) {
		if (this.measureScheduled < 0 && (this.measureScheduled = this.win.requestAnimationFrame(() => this.measure())), e) {
			if (this.measureRequests.indexOf(e) > -1) return;
			if (e.key != null) {
				for (let t = 0; t < this.measureRequests.length; t++) if (this.measureRequests[t].key === e.key) {
					this.measureRequests[t] = e;
					return;
				}
			}
			this.measureRequests.push(e);
		}
	}
	plugin(e) {
		let t = this.pluginMap.get(e);
		return (t === void 0 || t && t.plugin != e) && this.pluginMap.set(e, t = this.plugins.find((t) => t.plugin == e) || null), t && t.update(this).value;
	}
	get documentTop() {
		return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
	}
	get documentPadding() {
		return {
			top: this.viewState.paddingTop,
			bottom: this.viewState.paddingBottom
		};
	}
	get scaleX() {
		return this.viewState.scaleX;
	}
	get scaleY() {
		return this.viewState.scaleY;
	}
	elementAtHeight(e) {
		return this.readMeasured(), this.viewState.elementAtHeight(e);
	}
	lineBlockAtHeight(e) {
		return this.readMeasured(), this.viewState.lineBlockAtHeight(e);
	}
	get viewportLineBlocks() {
		return this.viewState.viewportLines;
	}
	lineBlockAt(e) {
		return this.viewState.lineBlockAt(e);
	}
	get contentHeight() {
		return this.viewState.contentHeight;
	}
	moveByChar(e, t, n) {
		return Zi(this, e, Ki(this, e, t, n));
	}
	moveByGroup(e, t) {
		return Zi(this, e, Ki(this, e, t, (t) => qi(this, e.head, t)));
	}
	visualLineSide(e, t) {
		let n = this.bidiSpans(e), r = this.textDirectionAt(e.from), i = n[t ? n.length - 1 : 0];
		return T.cursor(i.side(t, r) + e.from, i.forward(!t, r) ? 1 : -1);
	}
	moveToLineBoundary(e, t, n = !0) {
		return Gi(this, e, t, n);
	}
	moveVertically(e, t, n) {
		return Zi(this, e, Ji(this, e, t, n));
	}
	domAtPos(e, t = 1) {
		return this.docView.domAtPos(e, t);
	}
	posAtDOM(e, t = 0) {
		return this.docView.posFromDOM(e, t);
	}
	posAtCoords(e, t = !0) {
		this.readMeasured();
		let n = $i(this, e, t);
		return n && n.pos;
	}
	posAndSideAtCoords(e, t = !0) {
		return this.readMeasured(), $i(this, e, t);
	}
	coordsAtPos(e, t = 1) {
		this.readMeasured();
		let n = this.state.doc.lineAt(e), r = this.bidiSpans(n), i = r[dr.find(r, e - n.from, -1, t)];
		return this.docView.coordsAt(e, t, i.dir == P.RTL);
	}
	coordsForChar(e) {
		return this.readMeasured(), this.docView.coordsForChar(e);
	}
	get defaultCharacterWidth() {
		return this.viewState.heightOracle.charWidth;
	}
	get defaultLineHeight() {
		return this.viewState.heightOracle.lineHeight;
	}
	get textDirection() {
		return this.viewState.defaultTextDirection;
	}
	textDirectionAt(e) {
		return !this.state.facet(Mr) || e < this.viewport.from || e > this.viewport.to ? this.textDirection : (this.readMeasured(), this.docView.textDirectionAt(e));
	}
	get lineWrapping() {
		return this.viewState.heightOracle.lineWrapping;
	}
	bidiSpans(e) {
		if (e.length > Yo) return yr(e.length);
		let t = this.textDirectionAt(e.from), n;
		for (let r of this.bidiCache) if (r.from == e.from && r.dir == t && (r.fresh || fr(r.isolates, n = Xr(this, e)))) return r.order;
		n ||= Xr(this, e);
		let r = vr(e.text, t, n);
		return this.bidiCache.push(new Zo(e.from, e.to, t, n, !0, r)), r;
	}
	get hasFocus() {
		return (this.dom.ownerDocument.hasFocus() || M.safari && this.inputState?.lastContextMenu > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
	}
	focus() {
		this.observer.ignore(() => {
			Kn(this.contentDOM), this.docView.updateSelection();
		});
	}
	setRoot(e) {
		this._root != e && (this._root = e, this.observer.setWindow((e.nodeType == 9 ? e : e.ownerDocument).defaultView || window), this.mountStyles());
	}
	destroy() {
		this.root.activeElement == this.contentDOM && this.contentDOM.blur();
		for (let e of this.plugins) e.destroy(this);
		this.plugins = [], this.inputState.destroy(), this.docView.destroy(), this.dom.remove(), this.observer.destroy(), this.measureScheduled > -1 && this.win.cancelAnimationFrame(this.measureScheduled), this.destroyed = !0;
	}
	static scrollIntoView(e, t = {}) {
		return Ir.of(new Fr(typeof e == "number" ? T.cursor(e) : e, t.y ?? "nearest", t.x ?? "nearest", t.yMargin ?? 5, t.xMargin ?? 5));
	}
	scrollSnapshot() {
		let { scrollTop: e, scrollLeft: t } = this.scrollDOM, n = this.viewState.scrollAnchorAt(e);
		return Ir.of(new Fr(T.cursor(n.from), "start", "start", n.top - e, t, !0));
	}
	setTabFocusMode(e) {
		e == null ? this.inputState.tabFocusMode = this.inputState.tabFocusMode < 0 ? 0 : -1 : typeof e == "boolean" ? this.inputState.tabFocusMode = e ? 0 : -1 : this.inputState.tabFocusMode != 0 && (this.inputState.tabFocusMode = Date.now() + e);
	}
	static domEventHandlers(e) {
		return I.define(() => ({}), { eventHandlers: e });
	}
	static domEventObservers(e) {
		return I.define(() => ({}), { eventObservers: e });
	}
	static theme(e, t) {
		let n = Wt.newName(), r = [Po.of(n), $r.of(Bo(`.${n}`, e))];
		return t && t.dark && r.push(Fo.of(!0)), r;
	}
	static baseTheme(e) {
		return Ue.lowest($r.of(Bo("." + Io, e, zo)));
	}
	static findFromDOM(e) {
		let t = e.querySelector(".cm-content");
		return (t && L.get(t) || L.get(e))?.root?.view || null;
	}
};
z.styleModule = $r, z.inputHandler = Or, z.clipboardInputFilter = Ar, z.clipboardOutputFilter = jr, z.scrollHandler = Pr, z.focusChangeEffect = kr, z.perLineTextDirection = Mr, z.exceptionSink = Er, z.updateListener = Dr, z.editable = zr, z.mouseSelectionStyle = Tr, z.dragMovesSelection = wr, z.clickAddsSelectionRange = Cr, z.decorations = Gr, z.blockWrappers = Kr, z.outerDecorations = qr, z.atomicRanges = Jr, z.bidiIsolatedRanges = Yr, z.cursorScrollMargin = /*@__PURE__*/ E.define({ combine: (e) => {
	let t = 5, n = 5;
	for (let r of e) typeof r == "number" ? t = n = r : {x: t, y: n} = r;
	return {
		x: t,
		y: n
	};
} }), z.scrollMargins = Zr, z.darkTheme = Fo, z.cspNonce = /*@__PURE__*/ E.define({ combine: (e) => e.length ? e[0] : "" }), z.contentAttributes = Wr, z.editorAttributes = Ur, z.lineWrapping = /*@__PURE__*/ z.contentAttributes.of({ class: "cm-lineWrapping" }), z.announce = /*@__PURE__*/ D.define();
var Yo = 4096, Xo = {}, Zo = class e {
	constructor(e, t, n, r, i, a) {
		this.from = e, this.to = t, this.dir = n, this.isolates = r, this.fresh = i, this.order = a;
	}
	static update(t, n) {
		if (n.empty && !t.some((e) => e.fresh)) return t;
		let r = [], i = t.length ? t[t.length - 1].dir : P.LTR;
		for (let a = Math.max(0, t.length - 10); a < t.length; a++) {
			let o = t[a];
			o.dir == i && !n.touchesRange(o.from, o.to) && r.push(new e(n.mapPos(o.from, 1), n.mapPos(o.to, -1), o.dir, o.isolates, !1, o.order));
		}
		return r;
	}
};
function Qo(e, t, n) {
	for (let r = e.state.facet(t), i = r.length - 1; i >= 0; i--) {
		let t = r[i], a = typeof t == "function" ? t(e) : t;
		a && pn(a, n);
	}
	return n;
}
var $o = M.mac ? "mac" : M.windows ? "win" : M.linux ? "linux" : "key";
function es(e, t) {
	let n = e.split(/-(?!$)/), r = n[n.length - 1];
	r == "Space" && (r = " ");
	let i, a, o, s;
	for (let e = 0; e < n.length - 1; ++e) {
		let r = n[e];
		if (/^(cmd|meta|m)$/i.test(r)) s = !0;
		else if (/^a(lt)?$/i.test(r)) i = !0;
		else if (/^(c|ctrl|control)$/i.test(r)) a = !0;
		else if (/^s(hift)?$/i.test(r)) o = !0;
		else if (/^mod$/i.test(r)) t == "mac" ? s = !0 : a = !0;
		else throw Error("Unrecognized modifier name: " + r);
	}
	return i && (r = "Alt-" + r), a && (r = "Ctrl-" + r), s && (r = "Meta-" + r), o && (r = "Shift-" + r), r;
}
function ts(e, t, n) {
	return t.altKey && (e = "Alt-" + e), t.ctrlKey && (e = "Ctrl-" + e), t.metaKey && (e = "Meta-" + e), n !== !1 && t.shiftKey && (e = "Shift-" + e), e;
}
var ns = /*@__PURE__*/ Ue.default(/*@__PURE__*/ z.domEventHandlers({ keydown(e, t) {
	return ds(as(t.state), e, t, "editor");
} })), rs = /*@__PURE__*/ E.define({ enables: ns }), is = /*@__PURE__*/ new WeakMap();
function as(e) {
	let t = e.facet(rs), n = is.get(t);
	return n || is.set(t, n = ls(t.reduce((e, t) => e.concat(t), []))), n;
}
function os(e, t, n) {
	return ds(as(e.state), t, e, n);
}
var ss = null, cs = 4e3;
function ls(e, t = $o) {
	let n = Object.create(null), r = Object.create(null), i = (e, t) => {
		let n = r[e];
		if (n == null) r[e] = t;
		else if (n != t) throw Error("Key binding " + e + " is used both as a regular binding and as a multi-stroke prefix");
	}, a = (e, r, a, o, s) => {
		let c = n[e] || (n[e] = Object.create(null)), l = r.split(/ (?!$)/).map((e) => es(e, t));
		for (let t = 1; t < l.length; t++) {
			let n = l.slice(0, t).join(" ");
			i(n, !0), c[n] || (c[n] = {
				preventDefault: !0,
				stopPropagation: !1,
				run: [(t) => {
					let r = ss = {
						view: t,
						prefix: n,
						scope: e
					};
					return setTimeout(() => {
						ss == r && (ss = null);
					}, cs), !0;
				}]
			});
		}
		let u = l.join(" ");
		i(u, !1);
		let d = c[u] || (c[u] = {
			preventDefault: !1,
			stopPropagation: !1,
			run: (c._any?.run)?.slice() || []
		});
		a && d.run.push(a), o && (d.preventDefault = !0), s && (d.stopPropagation = !0);
	};
	for (let r of e) {
		let e = r.scope ? r.scope.split(" ") : ["editor"];
		if (r.any) for (let t of e) {
			let e = n[t] || (n[t] = Object.create(null));
			e._any ||= {
				preventDefault: !1,
				stopPropagation: !1,
				run: []
			};
			let { any: i } = r;
			for (let t in e) e[t].run.push((e) => i(e, us));
		}
		let i = r[t] || r.key;
		if (i) for (let t of e) a(t, i, r.run, r.preventDefault, r.stopPropagation), r.shift && a(t, "Shift-" + i, r.shift, r.preventDefault, r.stopPropagation);
	}
	return n;
}
var us = null;
function ds(e, t, n, r) {
	us = t;
	let i = $t(t), a = be(ve(i, 0)) == i.length && i != " ", o = "", s = !1, c = !1, l = !1;
	ss && ss.view == n && ss.scope == r && (o = ss.prefix + " ", xa.indexOf(t.keyCode) < 0 && (c = !0, ss = null));
	let u = /* @__PURE__ */ new Set(), d = (e) => {
		if (e) {
			for (let t of e.run) if (!u.has(t) && (u.add(t), t(n))) return e.stopPropagation && (l = !0), !0;
			e.preventDefault && (e.stopPropagation && (l = !0), c = !0);
		}
		return !1;
	}, f = e[r], p, m;
	return f && (d(f[o + ts(i, t, !a)]) ? s = !0 : a && (t.altKey || t.metaKey || t.ctrlKey) && !(M.windows && t.ctrlKey && t.altKey) && !(M.mac && t.altKey && !(t.ctrlKey || t.metaKey)) && (p = qt[t.keyCode]) && p != i ? (d(f[o + ts(p, t, !0)]) || t.shiftKey && (m = Jt[t.keyCode]) != i && m != p && d(f[o + ts(m, t, !1)])) && (s = !0) : a && t.shiftKey && d(f[o + ts(i, t, !0)]) && (s = !0), !s && d(f._any) && (s = !0)), c && (s = !0), s && l && t.stopPropagation(), us = null, s;
}
var fs = class e {
	constructor(e, t, n, r, i) {
		this.className = e, this.left = t, this.top = n, this.width = r, this.height = i;
	}
	draw() {
		let e = document.createElement("div");
		return e.className = this.className, this.adjust(e), e;
	}
	update(e, t) {
		return t.className == this.className && (this.adjust(e), !0);
	}
	adjust(e) {
		e.style.left = this.left + "px", e.style.top = this.top + "px", this.width != null && (e.style.width = this.width + "px"), e.style.height = this.height + "px";
	}
	eq(e) {
		return this.left == e.left && this.top == e.top && this.width == e.width && this.height == e.height && this.className == e.className;
	}
	static forRange(t, n, r) {
		if (r.empty) {
			let i = t.coordsAtPos(r.head, r.assoc || 1);
			if (!i) return [];
			let a = ps(t);
			return [new e(n, i.left - a.left, i.top - a.top, null, i.bottom - i.top)];
		}
		return hs(t, n, r);
	}
};
function ps(e) {
	let t = e.scrollDOM.getBoundingClientRect();
	return {
		left: (e.textDirection == P.LTR ? t.left : t.right - e.scrollDOM.clientWidth * e.scaleX) - e.scrollDOM.scrollLeft * e.scaleX,
		top: t.top - e.scrollDOM.scrollTop * e.scaleY
	};
}
function ms(e, t, n, r) {
	let i = e.coordsAtPos(t, n * 2);
	if (!i) return r;
	let a = e.dom.getBoundingClientRect(), o = (i.top + i.bottom) / 2, s = e.posAtCoords({
		x: a.left + 1,
		y: o
	}), c = e.posAtCoords({
		x: a.right - 1,
		y: o
	});
	return s == null || c == null ? r : {
		from: Math.max(r.from, Math.min(s, c)),
		to: Math.min(r.to, Math.max(s, c))
	};
}
function hs(e, t, n) {
	if (n.to <= e.viewport.from || n.from >= e.viewport.to) return [];
	let r = Math.max(n.from, e.viewport.from), i = Math.min(n.to, e.viewport.to), a = e.textDirection == P.LTR, o = e.contentDOM, s = o.getBoundingClientRect(), c = ps(e), l = o.querySelector(".cm-line"), u = l && window.getComputedStyle(l), d = s.left + (u ? parseInt(u.paddingLeft) + Math.min(0, parseInt(u.textIndent)) : 0), f = s.right - (u ? parseInt(u.paddingRight) : 0), p = Wi(e, r, 1), m = Wi(e, i, -1), h = p.type == bn.Text ? p : null, g = m.type == bn.Text ? m : null;
	if (h && (e.lineWrapping || p.widgetLineBreaks) && (h = ms(e, r, 1, h)), g && (e.lineWrapping || m.widgetLineBreaks) && (g = ms(e, i, -1, g)), h && g && h.from == g.from && h.to == g.to) return v(y(n.from, n.to, h));
	{
		let t = h ? y(n.from, null, h) : b(p, !1), r = g ? y(null, n.to, g) : b(m, !0), i = [];
		return (h || p).to < (g || m).from - (h && g ? 1 : 0) || p.widgetLineBreaks > 1 && t.bottom + e.defaultLineHeight / 2 < r.top ? i.push(_(d, t.bottom, f, r.top)) : t.bottom < r.top && e.elementAtHeight((t.bottom + r.top) / 2).type == bn.Text && (t.bottom = r.top = (t.bottom + r.top) / 2), v(t).concat(i).concat(v(r));
	}
	function _(e, n, r, i) {
		return new fs(t, e - c.left, n - c.top, Math.max(0, r - e), i - n);
	}
	function v({ top: e, bottom: t, horizontal: n }) {
		let r = [];
		for (let i = 0; i < n.length; i += 2) r.push(_(n[i], e, n[i + 1], t));
		return r;
	}
	function y(t, n, r) {
		let i = 1e9, o = -1e9, s = [];
		function c(t, n, c, l, u) {
			let p = e.coordsAtPos(t, t == r.to ? -2 : 2), m = e.coordsAtPos(c, c == r.from ? 2 : -2);
			!p || !m || (i = Math.min(p.top, m.top, i), o = Math.max(p.bottom, m.bottom, o), u == P.LTR ? s.push(a && n ? d : p.left, a && l ? f : m.right) : s.push(!a && l ? d : m.left, !a && n ? f : p.right));
		}
		let l = t ?? r.from, u = n ?? r.to;
		for (let r of e.visibleRanges) if (r.to > l && r.from < u) for (let i = Math.max(r.from, l), a = Math.min(r.to, u);;) {
			let r = e.state.doc.lineAt(i);
			for (let o of e.bidiSpans(r)) {
				let e = o.from + r.from, s = o.to + r.from;
				if (e >= a) break;
				s > i && c(Math.max(e, i), t == null && e <= l, Math.min(s, a), n == null && s >= u, o.dir);
			}
			if (i = r.to + 1, i >= a) break;
		}
		return s.length == 0 && c(l, t == null, u, n == null, e.textDirection), {
			top: i,
			bottom: o,
			horizontal: s
		};
	}
	function b(e, t) {
		let n = s.top + (t ? e.top : e.bottom);
		return {
			top: n,
			bottom: n,
			horizontal: []
		};
	}
}
function gs(e, t) {
	return e.constructor == t.constructor && e.eq(t);
}
var _s = class {
	constructor(e, t) {
		this.view = e, this.layer = t, this.drawn = [], this.scaleX = 1, this.scaleY = 1, this.measureReq = {
			read: this.measure.bind(this),
			write: this.draw.bind(this)
		}, this.dom = e.scrollDOM.appendChild(document.createElement("div")), this.dom.classList.add("cm-layer"), t.above && this.dom.classList.add("cm-layer-above"), t.class && this.dom.classList.add(t.class), this.scale(), this.dom.setAttribute("aria-hidden", "true"), this.setOrder(e.state), e.requestMeasure(this.measureReq), t.mount && t.mount(this.dom, e);
	}
	update(e) {
		e.startState.facet(vs) != e.state.facet(vs) && this.setOrder(e.state), (this.layer.update(e, this.dom) || e.geometryChanged) && (this.scale(), e.view.requestMeasure(this.measureReq));
	}
	docViewUpdate(e) {
		this.layer.updateOnDocViewUpdate !== !1 && e.requestMeasure(this.measureReq);
	}
	setOrder(e) {
		let t = 0, n = e.facet(vs);
		for (; t < n.length && n[t] != this.layer;) t++;
		this.dom.style.zIndex = String((this.layer.above ? 150 : -1) - t);
	}
	measure() {
		return this.layer.markers(this.view);
	}
	scale() {
		let { scaleX: e, scaleY: t } = this.view;
		(e != this.scaleX || t != this.scaleY) && (this.scaleX = e, this.scaleY = t, this.dom.style.transform = `scale(${1 / e}, ${1 / t})`);
	}
	draw(e) {
		if (e.length != this.drawn.length || e.some((e, t) => !gs(e, this.drawn[t]))) {
			let t = this.dom.firstChild, n = 0;
			for (let r of e) r.update && t && r.constructor && this.drawn[n].constructor && r.update(t, this.drawn[n]) ? (t = t.nextSibling, n++) : this.dom.insertBefore(r.draw(), t);
			for (; t;) {
				let e = t.nextSibling;
				t.remove(), t = e;
			}
			this.drawn = e, M.webkit && (this.dom.style.display = this.dom.firstChild ? "" : "none");
		}
	}
	destroy() {
		this.layer.destroy && this.layer.destroy(this.dom, this.view), this.dom.remove();
	}
}, vs = /*@__PURE__*/ E.define();
function ys(e) {
	return [I.define((t) => new _s(t, e)), vs.of(e)];
}
var bs = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, {
		cursorBlinkRate: 1200,
		drawRangeCursor: !0,
		iosSelectionHandles: !0
	}, {
		cursorBlinkRate: (e, t) => Math.min(e, t),
		drawRangeCursor: (e, t) => e || t
	});
} });
function xs(e = {}) {
	return [
		bs.of(e),
		Cs,
		Ts,
		Ds,
		Nr.of(!0)
	];
}
function Ss(e) {
	return e.startState.facet(bs) != e.state.facet(bs);
}
var Cs = /*@__PURE__*/ ys({
	above: !0,
	markers(e) {
		let { state: t } = e, n = t.facet(bs), r = [];
		for (let i of t.selection.ranges) {
			let a = i == t.selection.main;
			if (i.empty || n.drawRangeCursor && !(a && M.ios && n.iosSelectionHandles)) {
				let t = a ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary", n = i.empty ? i : T.cursor(i.head, i.assoc);
				for (let i of fs.forRange(e, t, n)) r.push(i);
			}
		}
		return r;
	},
	update(e, t) {
		e.transactions.some((e) => e.selection) && (t.style.animationName = t.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink");
		let n = Ss(e);
		return n && ws(e.state, t), e.docChanged || e.selectionSet || n;
	},
	mount(e, t) {
		ws(t.state, e);
	},
	class: "cm-cursorLayer"
});
function ws(e, t) {
	t.style.animationDuration = e.facet(bs).cursorBlinkRate + "ms";
}
var Ts = /*@__PURE__*/ ys({
	above: !1,
	markers(e) {
		let t = [], { main: n, ranges: r } = e.state.selection;
		for (let n of r) if (!n.empty) for (let r of fs.forRange(e, "cm-selectionBackground", n)) t.push(r);
		if (M.ios && !n.empty && e.state.facet(bs).iosSelectionHandles) {
			for (let r of fs.forRange(e, "cm-selectionHandle cm-selectionHandle-start", T.cursor(n.from, 1))) t.push(r);
			for (let r of fs.forRange(e, "cm-selectionHandle cm-selectionHandle-end", T.cursor(n.to, 1))) t.push(r);
		}
		return t;
	},
	update(e, t) {
		return e.docChanged || e.selectionSet || e.viewportChanged || Ss(e);
	},
	class: "cm-selectionLayer"
}), Es = M.gecko && M.gecko_version == 153 ? "#ffffff01" : "transparent", Ds = /*@__PURE__*/ Ue.highest(/*@__PURE__*/ z.theme({
	".cm-line": {
		"& ::selection, &::selection": { backgroundColor: `${Es} !important` },
		caretColor: "transparent !important"
	},
	".cm-content": {
		caretColor: "transparent !important",
		"& :focus": {
			caretColor: "initial !important",
			"&::selection, & ::selection": { backgroundColor: "Highlight !important" }
		}
	}
})), Os = /*@__PURE__*/ D.define({ map(e, t) {
	return e == null ? null : t.mapPos(e);
} }), ks = /*@__PURE__*/ Be.define({
	create() {
		return null;
	},
	update(e, t) {
		return e != null && (e = t.changes.mapPos(e)), t.effects.reduce((e, t) => t.is(Os) ? t.value : e, e);
	}
}), As = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.view = e, this.cursor = null, this.measureReq = {
			read: this.readPos.bind(this),
			write: this.drawCursor.bind(this)
		};
	}
	update(e) {
		var t;
		let n = e.state.field(ks);
		n == null ? this.cursor != null && ((t = this.cursor) == null || t.remove(), this.cursor = null) : (this.cursor || (this.cursor = this.view.scrollDOM.appendChild(document.createElement("div")), this.cursor.className = "cm-dropCursor"), (e.startState.field(ks) != n || e.docChanged || e.geometryChanged) && this.view.requestMeasure(this.measureReq));
	}
	readPos() {
		let { view: e } = this, t = e.state.field(ks), n = t != null && e.coordsAtPos(t);
		if (!n) return null;
		let r = e.scrollDOM.getBoundingClientRect();
		return {
			left: n.left - r.left + e.scrollDOM.scrollLeft * e.scaleX,
			top: n.top - r.top + e.scrollDOM.scrollTop * e.scaleY,
			height: n.bottom - n.top
		};
	}
	drawCursor(e) {
		if (this.cursor) {
			let { scaleX: t, scaleY: n } = this.view;
			e ? (this.cursor.style.left = e.left / t + "px", this.cursor.style.top = e.top / n + "px", this.cursor.style.height = e.height / n + "px") : this.cursor.style.left = "-100000px";
		}
	}
	destroy() {
		this.cursor && this.cursor.remove();
	}
	setDropPos(e) {
		this.view.state.field(ks) != e && this.view.dispatch({ effects: Os.of(e) });
	}
}, { eventObservers: {
	dragover(e) {
		this.setDropPos(this.view.posAtCoords({
			x: e.clientX,
			y: e.clientY
		}));
	},
	dragleave(e) {
		(e.target == this.view.contentDOM || !this.view.contentDOM.contains(e.relatedTarget)) && this.setDropPos(null);
	},
	dragend() {
		this.setDropPos(null);
	},
	drop() {
		this.setDropPos(null);
	}
} });
function js() {
	return [ks, As];
}
function Ms(e, t, n, r, i) {
	t.lastIndex = 0;
	for (let a = e.iterRange(n, r), o = n, s; !a.next().done; o += a.value.length) if (!a.lineBreak) for (; s = t.exec(a.value);) i(o + s.index, s);
}
function Ns(e, t) {
	let n = e.visibleRanges;
	if (n.length == 1 && n[0].from == e.viewport.from && n[0].to == e.viewport.to) return n;
	let r = [];
	for (let { from: i, to: a } of n) i = Math.max(e.state.doc.lineAt(i).from, i - t), a = Math.min(e.state.doc.lineAt(a).to, a + t), r.length && r[r.length - 1].to >= i ? r[r.length - 1].to = a : r.push({
		from: i,
		to: a
	});
	return r;
}
var Ps = class {
	constructor(e) {
		let { regexp: t, decoration: n, decorate: r, boundary: i, maxLength: a = 1e3 } = e;
		if (!t.global) throw RangeError("The regular expression given to MatchDecorator should have its 'g' flag set");
		if (this.regexp = t, r) this.addMatch = (e, t, n, i) => r(i, n, n + e[0].length, e, t);
		else if (typeof n == "function") this.addMatch = (e, t, r, i) => {
			let a = n(e, t, r);
			a && i(r, r + e[0].length, a);
		};
		else if (n) this.addMatch = (e, t, r, i) => i(r, r + e[0].length, n);
		else throw RangeError("Either 'decorate' or 'decoration' should be provided to MatchDecorator");
		this.boundary = i, this.maxLength = a;
	}
	createDeco(e) {
		let t = new Dt(), n = t.add.bind(t);
		for (let { from: t, to: r } of Ns(e, this.maxLength)) Ms(e.state.doc, this.regexp, t, r, (t, r) => this.addMatch(r, e, t, n));
		return t.finish();
	}
	updateDeco(e, t) {
		let n = 1e9, r = -1;
		return e.docChanged && e.changes.iterChanges((t, i, a, o) => {
			o >= e.view.viewport.from && a <= e.view.viewport.to && (n = Math.min(a, n), r = Math.max(o, r));
		}), e.viewportMoved || r - n > 1e3 ? this.createDeco(e.view) : r > -1 ? this.updateRange(e.view, t.map(e.changes), n, r) : t;
	}
	updateRange(e, t, n, r) {
		for (let i of e.visibleRanges) {
			let a = Math.max(i.from, n), o = Math.min(i.to, r);
			if (o >= a) {
				let n = e.state.doc.lineAt(a), r = n.to < o ? e.state.doc.lineAt(o) : n, s = Math.max(i.from, n.from), c = Math.min(i.to, r.to);
				if (this.boundary) {
					for (; a > n.from; a--) if (this.boundary.test(n.text[a - 1 - n.from])) {
						s = a;
						break;
					}
					for (; o < r.to; o++) if (this.boundary.test(r.text[o - r.from])) {
						c = o;
						break;
					}
				}
				let l = [], u, d = (e, t, n) => l.push(n.range(e, t));
				if (n == r) for (this.regexp.lastIndex = s - n.from; (u = this.regexp.exec(n.text)) && u.index < c - n.from;) this.addMatch(u, e, u.index + n.from, d);
				else Ms(e.state.doc, this.regexp, s, c, (t, n) => this.addMatch(n, e, t, d));
				t = t.update({
					filterFrom: s,
					filterTo: c,
					filter: (e, t) => e < s || t > c,
					add: l
				});
			}
		}
		return t;
	}
}, Fs = /x/.unicode == null ? "g" : "gu", Is = /*@__PURE__*/ RegExp("[\0-\b\n--­؜​‎‏\u2028\u2029‭‮⁦⁧⁩﻿￹-￼]", Fs), Ls = {
	0: "null",
	7: "bell",
	8: "backspace",
	10: "newline",
	11: "vertical tab",
	13: "carriage return",
	27: "escape",
	8203: "zero width space",
	8204: "zero width non-joiner",
	8205: "zero width joiner",
	8206: "left-to-right mark",
	8207: "right-to-left mark",
	8232: "line separator",
	8237: "left-to-right override",
	8238: "right-to-left override",
	8294: "left-to-right isolate",
	8295: "right-to-left isolate",
	8297: "pop directional isolate",
	8233: "paragraph separator",
	65279: "zero width no-break space",
	65532: "object replacement"
}, Rs = null;
function zs() {
	if (Rs == null && typeof document < "u" && document.body) {
		let e = document.body.style;
		Rs = (e.tabSize ?? e.MozTabSize) != null;
	}
	return Rs || !1;
}
var Bs = /*@__PURE__*/ E.define({ combine(e) {
	let t = bt(e, {
		render: null,
		specialChars: Is,
		addSpecialChars: null
	});
	return (t.replaceTabs = !zs()) && (t.specialChars = RegExp("	|" + t.specialChars.source, Fs)), t.addSpecialChars && (t.specialChars = RegExp(t.specialChars.source + "|" + t.addSpecialChars.source, Fs)), t;
} });
function Vs(e = {}) {
	return [Bs.of(e), Us()];
}
var Hs = null;
function Us() {
	return Hs ||= I.fromClass(class {
		constructor(e) {
			this.view = e, this.decorations = N.none, this.decorationCache = Object.create(null), this.decorator = this.makeDecorator(e.state.facet(Bs)), this.decorations = this.decorator.createDeco(e);
		}
		makeDecorator(e) {
			return new Ps({
				regexp: e.specialChars,
				decoration: (t, n, r) => {
					let { doc: i } = n.state, a = ve(t[0], 0);
					if (a == 9) {
						let e = i.lineAt(r), t = n.state.tabSize, a = Rt(e.text, t, r - e.from);
						return N.replace({ widget: new qs((t - a % t) * this.view.defaultCharacterWidth / this.view.scaleX) });
					}
					return this.decorationCache[a] || (this.decorationCache[a] = N.replace({ widget: new Ks(e, a) }));
				},
				boundary: e.replaceTabs ? void 0 : /[^]/
			});
		}
		update(e) {
			let t = e.state.facet(Bs);
			e.startState.facet(Bs) == t ? this.decorations = this.decorator.updateDeco(e, this.decorations) : (this.decorator = this.makeDecorator(t), this.decorations = this.decorator.createDeco(e.view));
		}
	}, { decorations: (e) => e.decorations });
}
var Ws = "•";
function Gs(e) {
	return e >= 32 ? Ws : e == 10 ? "␤" : String.fromCharCode(9216 + e);
}
var Ks = class extends yn {
	constructor(e, t) {
		super(), this.options = e, this.code = t;
	}
	eq(e) {
		return e.code == this.code;
	}
	toDOM(e) {
		let t = Gs(this.code), n = e.state.phrase("Control character") + " " + (Ls[this.code] || "0x" + this.code.toString(16)), r = this.options.render && this.options.render(this.code, n, t);
		if (r) return r;
		let i = document.createElement("span");
		return i.textContent = t, i.title = n, i.setAttribute("aria-label", n), i.className = "cm-specialChar", i;
	}
	ignoreEvent() {
		return !1;
	}
}, qs = class extends yn {
	constructor(e) {
		super(), this.width = e;
	}
	eq(e) {
		return e.width == this.width;
	}
	toDOM() {
		let e = document.createElement("span");
		return e.textContent = "	", e.className = "cm-tab", e.style.width = this.width + "px", e;
	}
	ignoreEvent() {
		return !1;
	}
};
function Js() {
	return Xs;
}
var Ys = /*@__PURE__*/ N.line({ class: "cm-activeLine" }), Xs = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.decorations = this.getDeco(e);
	}
	update(e) {
		(e.docChanged || e.selectionSet) && (this.decorations = this.getDeco(e.view));
	}
	getDeco(e) {
		let t = -1, n = [];
		for (let r of e.state.selection.ranges) {
			let i = e.lineBlockAt(r.head);
			i.from > t && (n.push(Ys.range(i.from)), t = i.from);
		}
		return N.set(n);
	}
}, { decorations: (e) => e.decorations }), Zs = 2e3;
function Qs(e, t, n) {
	let r = Math.min(t.line, n.line), i = Math.max(t.line, n.line), a = [];
	if (t.off > Zs || n.off > Zs || t.col < 0 || n.col < 0) {
		let o = Math.min(t.off, n.off), s = Math.max(t.off, n.off);
		for (let t = r; t <= i; t++) {
			let n = e.doc.line(t);
			n.length <= s && a.push(T.range(n.from + o, n.to + s));
		}
	} else {
		let o = Math.min(t.col, n.col), s = Math.max(t.col, n.col);
		for (let t = r; t <= i; t++) {
			let n = e.doc.line(t), r = zt(n.text, o, e.tabSize, !0);
			if (r < 0) a.push(T.cursor(n.to));
			else {
				let t = zt(n.text, s, e.tabSize);
				a.push(T.range(n.from + r, n.from + t));
			}
		}
	}
	return a;
}
function $s(e, t) {
	let n = e.coordsAtPos(e.viewport.from);
	return n ? Math.round(Math.abs((n.left - t) / e.defaultCharacterWidth)) : -1;
}
function ec(e, t) {
	let n = e.posAtCoords({
		x: t.clientX,
		y: t.clientY
	}, !1), r = e.state.doc.lineAt(n), i = n - r.from, a = i > Zs ? -1 : i == r.length ? $s(e, t.clientX) : Rt(r.text, e.state.tabSize, n - r.from);
	return {
		line: r.number,
		col: a,
		off: i
	};
}
function tc(e, t) {
	let n = ec(e, t), r = e.state.selection;
	return n ? {
		update(e) {
			if (e.docChanged) {
				let t = e.changes.mapPos(e.startState.doc.line(n.line).from), i = e.state.doc.lineAt(t);
				n = {
					line: i.number,
					col: n.col,
					off: Math.min(n.off, i.length)
				}, r = r.map(e.changes);
			}
		},
		get(t, i, a) {
			let o = ec(e, t);
			if (!o) return r;
			let s = Qs(e.state, n, o);
			return s.length ? a ? T.create(s.concat(r.ranges)) : T.create(s) : r;
		}
	} : null;
}
function nc(e) {
	let t = e?.eventFilter || ((e) => e.altKey && e.button == 0);
	return z.mouseSelectionStyle.of((e, n) => t(n) ? tc(e, n) : null);
}
var rc = {
	Alt: [18, (e) => !!e.altKey],
	Control: [17, (e) => !!e.ctrlKey],
	Shift: [16, (e) => !!e.shiftKey],
	Meta: [91, (e) => !!e.metaKey]
}, ic = { style: "cursor: crosshair" };
function ac(e = {}) {
	let [t, n] = rc[e.key || "Alt"], r = I.fromClass(class {
		constructor(e) {
			this.view = e, this.isDown = !1;
		}
		set(e) {
			this.isDown != e && (this.isDown = e, this.view.update([]));
		}
	}, { eventObservers: {
		keydown(e) {
			this.set(e.keyCode == t || n(e));
		},
		keyup(e) {
			(e.keyCode == t || !n(e)) && this.set(!1);
		},
		mousemove(e) {
			this.set(n(e));
		}
	} });
	return [r, z.contentAttributes.of((e) => e.plugin(r)?.isDown ? ic : null)];
}
var oc = "-10000px", sc = class {
	constructor(e, t, n, r) {
		this.facet = t, this.createTooltipView = n, this.removeTooltipView = r, this.input = e.state.facet(t), this.tooltips = this.input.filter((e) => e);
		let i = null;
		this.tooltipViews = this.tooltips.map((e) => i = n(e, i));
	}
	update(e, t) {
		var n;
		let r = e.state.facet(this.facet), i = r.filter((e) => e);
		if (r === this.input) {
			for (let t of this.tooltipViews) t.update && t.update(e);
			return !1;
		}
		let a = [], o = t ? [] : null;
		for (let n = 0; n < i.length; n++) {
			let r = i[n], s = -1;
			if (r) {
				for (let e = 0; e < this.tooltips.length; e++) {
					let t = this.tooltips[e];
					t && t.create == r.create && (s = e);
				}
				if (s < 0) a[n] = this.createTooltipView(r, n ? a[n - 1] : null), o && (o[n] = !!r.above);
				else {
					let r = a[n] = this.tooltipViews[s];
					o && (o[n] = t[s]), r.update && r.update(e);
				}
			}
		}
		for (let e of this.tooltipViews) a.indexOf(e) < 0 && (this.removeTooltipView(e), (n = e.destroy) == null || n.call(e));
		return t && (o.forEach((e, n) => t[n] = e), t.length = o.length), this.input = r, this.tooltips = i, this.tooltipViews = a, !0;
	}
};
function cc(e) {
	let t = e.dom.ownerDocument.documentElement;
	return {
		top: 0,
		left: 0,
		bottom: t.clientHeight,
		right: t.clientWidth
	};
}
var lc = /*@__PURE__*/ E.define({ combine: (e) => ({
	position: M.ios ? "absolute" : e.find((e) => e.position)?.position || "fixed",
	parent: e.find((e) => e.parent)?.parent || null,
	tooltipSpace: e.find((e) => e.tooltipSpace)?.tooltipSpace || cc
}) }), uc = /*@__PURE__*/ new WeakMap(), dc = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.view = e, this.above = [], this.inView = !0, this.madeAbsolute = !1, this.lastTransaction = 0, this.measureTimeout = -1;
		let t = e.state.facet(lc);
		this.position = t.position, this.parent = t.parent, this.classes = e.themeClasses, this.createContainer(), this.measureReq = {
			read: this.readMeasure.bind(this),
			write: this.writeMeasure.bind(this),
			key: this
		}, this.resizeObserver = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.measureSoon()) : null, this.manager = new sc(e, hc, (e, t) => this.createTooltip(e, t), (e) => {
			this.resizeObserver && this.resizeObserver.unobserve(e.dom), e.dom.remove();
		}), this.above = this.manager.tooltips.map((e) => !!e.above), this.intersectionObserver = typeof IntersectionObserver == "function" ? new IntersectionObserver((e) => {
			Date.now() > this.lastTransaction - 50 && e.length > 0 && e[e.length - 1].intersectionRatio < 1 && this.measureSoon();
		}, { threshold: [1] }) : null, this.observeIntersection(), e.win.addEventListener("resize", this.measureSoon = this.measureSoon.bind(this)), this.maybeMeasure();
	}
	createContainer() {
		this.parent ? (this.container = document.createElement("div"), this.container.style.position = "relative", this.container.className = this.view.themeClasses, this.parent.appendChild(this.container)) : this.container = this.view.dom;
	}
	observeIntersection() {
		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			for (let e of this.manager.tooltipViews) this.intersectionObserver.observe(e.dom);
		}
	}
	measureSoon() {
		this.measureTimeout < 0 && (this.measureTimeout = setTimeout(() => {
			this.measureTimeout = -1, this.maybeMeasure();
		}, 50));
	}
	update(e) {
		e.transactions.length && (this.lastTransaction = Date.now());
		let t = this.manager.update(e, this.above);
		t && this.observeIntersection();
		let n = t || e.geometryChanged, r = e.state.facet(lc);
		if (r.position != this.position && !this.madeAbsolute) {
			this.position = r.position;
			for (let e of this.manager.tooltipViews) e.dom.style.position = this.position;
			n = !0;
		}
		if (r.parent != this.parent) {
			this.parent && this.container.remove(), this.parent = r.parent, this.createContainer();
			for (let e of this.manager.tooltipViews) this.container.appendChild(e.dom);
			n = !0;
		} else this.parent && this.view.themeClasses != this.classes && (this.classes = this.container.className = this.view.themeClasses);
		n && this.maybeMeasure();
	}
	createTooltip(e, t) {
		let n = e.create(this.view), r = t ? t.dom : null;
		if (n.dom.classList.add("cm-tooltip"), e.arrow && !n.dom.querySelector(".cm-tooltip > .cm-tooltip-arrow")) {
			let e = document.createElement("div");
			e.className = "cm-tooltip-arrow", n.dom.appendChild(e);
		}
		return n.dom.style.position = this.position, n.dom.style.top = oc, n.dom.style.left = "0px", this.container.insertBefore(n.dom, r), n.mount && n.mount(this.view), this.resizeObserver && this.resizeObserver.observe(n.dom), n;
	}
	destroy() {
		var e, t, n;
		this.view.win.removeEventListener("resize", this.measureSoon);
		for (let t of this.manager.tooltipViews) t.dom.remove(), (e = t.destroy) == null || e.call(t);
		this.parent && this.container.remove(), (t = this.resizeObserver) == null || t.disconnect(), (n = this.intersectionObserver) == null || n.disconnect(), clearTimeout(this.measureTimeout);
	}
	readMeasure() {
		let e = 1, t = 1, n = !1;
		if (this.position == "fixed" && this.manager.tooltipViews.length) {
			let { dom: e } = this.manager.tooltipViews[0];
			if (M.safari) {
				let t = e.getBoundingClientRect();
				n = Math.abs(t.top + 1e4) > 1 || Math.abs(t.left) > 1;
			} else n = !!e.offsetParent && e.offsetParent != this.container.ownerDocument.body;
		}
		if (n || this.position == "absolute") {
			if (this.parent) {
				let n = this.parent.getBoundingClientRect();
				n.width && n.height && (e = n.width / this.parent.offsetWidth, t = n.height / this.parent.offsetHeight);
			} else ({scaleX: e, scaleY: t} = this.view.viewState);
		}
		let r = this.view.scrollDOM.getBoundingClientRect(), i = Qr(this.view);
		return {
			visible: {
				left: r.left + i.left,
				top: r.top + i.top,
				right: r.right - i.right,
				bottom: r.bottom - i.bottom
			},
			parent: this.parent ? this.container.getBoundingClientRect() : this.view.dom.getBoundingClientRect(),
			pos: this.manager.tooltips.map((e, t) => {
				let n = this.manager.tooltipViews[t];
				return n.getCoords ? n.getCoords(e.pos) : this.view.coordsAtPos(e.pos);
			}),
			size: this.manager.tooltipViews.map(({ dom: e }) => e.getBoundingClientRect()),
			space: this.view.state.facet(lc).tooltipSpace(this.view),
			scaleX: e,
			scaleY: t,
			makeAbsolute: n
		};
	}
	writeMeasure(e) {
		if (e.makeAbsolute) {
			this.madeAbsolute = !0, this.position = "absolute";
			for (let e of this.manager.tooltipViews) e.dom.style.position = "absolute";
		}
		let { visible: t, space: n, scaleX: r, scaleY: i } = e, a = [];
		for (let o = 0; o < this.manager.tooltips.length; o++) {
			let s = this.manager.tooltips[o], c = this.manager.tooltipViews[o], { dom: l } = c, u = e.pos[o], d = e.size[o];
			if (!u || s.clip !== !1 && (u.bottom <= Math.max(t.top, n.top) || u.top >= Math.min(t.bottom, n.bottom) || u.right < Math.max(t.left, n.left) - .1 || u.left > Math.min(t.right, n.right) + .1)) {
				l.style.top = oc;
				continue;
			}
			let f = s.arrow ? c.dom.querySelector(".cm-tooltip-arrow") : null, p = f ? 7 : 0, m = d.right - d.left, h = uc.get(c) ?? d.bottom - d.top, g = c.offset || mc, _ = this.view.textDirection == P.LTR, v = d.width > n.right - n.left ? _ ? n.left : n.right - d.width : _ ? Math.max(n.left, Math.min(u.left - (f ? 14 : 0) + g.x, n.right - m)) : Math.min(Math.max(n.left, u.left - m + (f ? 14 : 0) - g.x), n.right - m), y = this.above[o];
			!s.strictSide && (y ? u.top - h - p - g.y < n.top : u.bottom + h + p + g.y > n.bottom) && y == n.bottom - u.bottom > u.top - n.top && (y = this.above[o] = !y);
			let b = (y ? u.top - n.top : n.bottom - u.bottom) - p;
			if (b < h && c.resize !== !1) {
				if (b < this.view.defaultLineHeight) {
					l.style.top = oc;
					continue;
				}
				uc.set(c, h), l.style.height = (h = b) / i + "px";
			} else l.style.height && (l.style.height = "");
			let x = y ? u.top - h - p - g.y : u.bottom + p + g.y, ee = v + m;
			if (c.overlap !== !0) for (let e of a) e.left < ee && e.right > v && e.top < x + h && e.bottom > x && (x = y ? e.top - h - 2 - p : e.bottom + p + 2);
			if (this.position == "absolute" ? (l.style.top = (x - e.parent.top) / i + "px", fc(l, (v - e.parent.left) / r)) : (l.style.top = x / i + "px", fc(l, v / r)), f) {
				let e = u.left + (_ ? g.x : -g.x) - (v + 14 - 7);
				f.style.left = e / r + "px";
			}
			c.overlap !== !0 && a.push({
				left: v,
				top: x,
				right: ee,
				bottom: x + h
			}), l.classList.toggle("cm-tooltip-above", y), l.classList.toggle("cm-tooltip-below", !y), c.positioned && c.positioned(e.space);
		}
	}
	maybeMeasure() {
		if (this.manager.tooltips.length && (this.view.inView && this.view.requestMeasure(this.measureReq), this.inView != this.view.inView && (this.inView = this.view.inView, !this.inView))) for (let e of this.manager.tooltipViews) e.dom.style.top = oc;
	}
}, { eventObservers: { scroll() {
	this.maybeMeasure();
} } });
function fc(e, t) {
	let n = parseInt(e.style.left, 10);
	(isNaN(n) || Math.abs(t - n) > 1) && (e.style.left = t + "px");
}
var pc = /*@__PURE__*/ z.baseTheme({
	".cm-tooltip": {
		zIndex: 500,
		boxSizing: "border-box"
	},
	"&light .cm-tooltip": {
		border: "1px solid #bbb",
		backgroundColor: "#f5f5f5"
	},
	"&light .cm-tooltip-section:not(:first-child)": { borderTop: "1px solid #bbb" },
	"&dark .cm-tooltip": {
		backgroundColor: "#333338",
		color: "white"
	},
	".cm-tooltip-arrow": {
		height: "7px",
		width: "14px",
		position: "absolute",
		zIndex: -1,
		overflow: "hidden",
		"&:before, &:after": {
			content: "''",
			position: "absolute",
			width: 0,
			height: 0,
			borderLeft: "7px solid transparent",
			borderRight: "7px solid transparent"
		},
		".cm-tooltip-above &": {
			bottom: "-7px",
			"&:before": { borderTop: "7px solid #bbb" },
			"&:after": {
				borderTop: "7px solid #f5f5f5",
				bottom: "1px"
			}
		},
		".cm-tooltip-below &": {
			top: "-7px",
			"&:before": { borderBottom: "7px solid #bbb" },
			"&:after": {
				borderBottom: "7px solid #f5f5f5",
				top: "1px"
			}
		}
	},
	"&dark .cm-tooltip .cm-tooltip-arrow": {
		"&:before": {
			borderTopColor: "#333338",
			borderBottomColor: "#333338"
		},
		"&:after": {
			borderTopColor: "transparent",
			borderBottomColor: "transparent"
		}
	}
}), mc = {
	x: 0,
	y: 0
}, hc = /*@__PURE__*/ E.define({ enables: [dc, pc] }), gc = /*@__PURE__*/ E.define({ combine: (e) => e.reduce((e, t) => e.concat(t), []) }), _c = class e {
	static create(t) {
		return new e(t);
	}
	constructor(e) {
		this.view = e, this.mounted = !1, this.dom = document.createElement("div"), this.dom.classList.add("cm-tooltip-hover"), this.manager = new sc(e, gc, (e, t) => this.createHostedView(e, t), (e) => e.dom.remove());
	}
	createHostedView(e, t) {
		let n = e.create(this.view);
		return n.dom.classList.add("cm-tooltip-section"), this.dom.insertBefore(n.dom, t ? t.dom.nextSibling : this.dom.firstChild), this.mounted && n.mount && n.mount(this.view), n;
	}
	mount(e) {
		for (let t of this.manager.tooltipViews) t.mount && t.mount(e);
		this.mounted = !0;
	}
	positioned(e) {
		for (let t of this.manager.tooltipViews) t.positioned && t.positioned(e);
	}
	update(e) {
		this.manager.update(e);
	}
	destroy() {
		var e;
		for (let t of this.manager.tooltipViews) (e = t.destroy) == null || e.call(t);
	}
	passProp(e) {
		let t;
		for (let n of this.manager.tooltipViews) {
			let r = n[e];
			if (r !== void 0) {
				if (t === void 0) t = r;
				else if (t !== r) return;
			}
		}
		return t;
	}
	get offset() {
		return this.passProp("offset");
	}
	get getCoords() {
		return this.passProp("getCoords");
	}
	get overlap() {
		return this.passProp("overlap");
	}
	get resize() {
		return this.passProp("resize");
	}
}, vc = /*@__PURE__*/ hc.compute([gc], (e) => {
	let t = e.facet(gc);
	return t.length === 0 ? null : {
		pos: Math.min(...t.map((e) => e.pos)),
		end: Math.max(...t.map((e) => e.end ?? e.pos)),
		create: _c.create,
		above: t[0].above,
		arrow: t.some((e) => e.arrow)
	};
}), yc = /*@__PURE__*/ E.define(), bc = class {
	constructor(e, t, n, r, i, a) {
		this.view = e, this.source = t, this.field = n, this.locked = r, this.setHover = i, this.hoverTime = a, this.hoverTimeout = -1, this.restartTimeout = -1, this.pending = null, this.lastMove = {
			x: 0,
			y: 0,
			target: e.dom,
			time: 0
		}, this.checkHover = this.checkHover.bind(this), e.dom.addEventListener("mouseleave", this.mouseleave = this.mouseleave.bind(this)), e.dom.addEventListener("mousemove", this.mousemove = this.mousemove.bind(this));
	}
	update(e) {
		this.pending && (this.pending = null, clearTimeout(this.restartTimeout), this.restartTimeout = setTimeout(() => this.startHover(), 20));
	}
	get active() {
		return this.view.state.field(this.field);
	}
	checkHover() {
		if (this.hoverTimeout = -1, this.active.length) return;
		let e = Date.now() - this.lastMove.time;
		e < this.hoverTime ? this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime - e) : this.startHover();
	}
	startHover() {
		clearTimeout(this.restartTimeout);
		let { view: e, lastMove: t } = this, n = e.docView.tile.nearest(t.target);
		if (!n) return;
		let r, i = 1;
		if (n.isWidget()) r = n.posAtStart;
		else {
			if (r = e.posAtCoords(t), r == null) return;
			let n = e.coordsAtPos(r);
			if (!n || t.y < n.top || t.y > n.bottom || t.x < n.left - e.defaultCharacterWidth || t.x > n.right + e.defaultCharacterWidth) return;
			let a = e.bidiSpans(e.state.doc.lineAt(r)).find((e) => e.from <= r && e.to >= r), o = a && a.dir == P.RTL ? -1 : 1;
			i = t.x < n.left ? -o : o;
		}
		this.activateHover(e, r, i);
	}
	activateHover(e, t, n, r) {
		let i = this.source(e, t, n), a = (t) => {
			if (t && !(Array.isArray(t) && !t.length)) {
				let n = Array.isArray(t) ? t : [t];
				r && this.locked.set(n, r), e.dispatch({ effects: this.setHover.of(n) });
			}
		};
		if (i && "then" in i) {
			let n = this.pending = { pos: t };
			i.then((e) => {
				this.pending == n && (this.pending = null, a(e));
			}, (t) => Rr(e.state, t, "hover tooltip"));
		} else a(i);
	}
	get tooltip() {
		let e = this.view.plugin(dc), t = e ? e.manager.tooltips.findIndex((e) => e.create == _c.create) : -1;
		return t > -1 ? e.manager.tooltipViews[t] : null;
	}
	mousemove(e) {
		this.lastMove = {
			x: e.clientX,
			y: e.clientY,
			target: e.target,
			time: Date.now()
		}, this.hoverTimeout < 0 && (this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime));
		let { active: t, tooltip: n } = this;
		if (t.length && !this.locked.has(t) && n && !Sc(n.dom, e) || this.pending) {
			let { pos: n } = t[0] || this.pending, r = t[0]?.end ?? n;
			(n == r ? this.view.posAtCoords(this.lastMove) != n : !Cc(this.view, n, r, e.clientX, e.clientY)) && (this.view.dispatch({ effects: this.setHover.of([]) }), this.pending = null);
		}
	}
	mouseleave(e) {
		clearTimeout(this.hoverTimeout), this.hoverTimeout = -1;
		let { active: t } = this;
		if (t.length && !this.locked.has(t)) {
			let { tooltip: t } = this;
			t && t.dom.contains(e.relatedTarget) ? this.watchTooltipLeave(t.dom) : this.view.dispatch({ effects: this.setHover.of([]) });
		}
	}
	watchTooltipLeave(e) {
		let t = (n) => {
			e.removeEventListener("mouseleave", t);
			let { active: r } = this;
			r.length && !this.locked.has(r) && !this.view.dom.contains(n.relatedTarget) && this.view.dispatch({ effects: this.setHover.of([]) });
		};
		e.addEventListener("mouseleave", t);
	}
	destroy() {
		clearTimeout(this.hoverTimeout), clearTimeout(this.restartTimeout), this.view.dom.removeEventListener("mouseleave", this.mouseleave), this.view.dom.removeEventListener("mousemove", this.mousemove);
	}
}, xc = 4;
function Sc(e, t) {
	let { left: n, right: r, top: i, bottom: a } = e.getBoundingClientRect(), o;
	if (o = e.querySelector(".cm-tooltip-arrow")) {
		let e = o.getBoundingClientRect();
		i = Math.min(e.top, i), a = Math.max(e.bottom, a);
	}
	return t.clientX >= n - xc && t.clientX <= r + xc && t.clientY >= i - xc && t.clientY <= a + xc;
}
function Cc(e, t, n, r, i, a) {
	let o = e.scrollDOM.getBoundingClientRect(), s = e.documentTop + e.documentPadding.top + e.contentHeight;
	if (o.left > r || o.right < r || o.top > i || Math.min(o.bottom, s) < i) return !1;
	let c = e.posAtCoords({
		x: r,
		y: i
	}, !1);
	return c >= t && c <= n;
}
function wc(e, t = {}) {
	let n = D.define(), r = /* @__PURE__ */ new WeakMap(), i = Be.define({
		create() {
			return [];
		},
		update(e, a) {
			let o = r.get(e);
			if (e.length && (t.hideOnChange && (a.docChanged || a.selection) || o && o(a) ? e = [] : t.hideOn && (e = e.filter((e) => !t.hideOn(a, e)))), a.docChanged && e.length) {
				let t = [];
				for (let n of e) {
					let e = a.changes.mapPos(n.pos, -1, Se.TrackDel);
					if (e != null) {
						let r = Object.assign(Object.create(null), n);
						r.pos = e, r.end != null && (r.end = a.changes.mapPos(r.end)), t.push(r);
					}
				}
				e = t;
			}
			for (let t of a.effects) t.is(n) && (e = t.value, o = void 0), (t.is(Dc) && !t.value || t.value == i) && (e = []);
			return e.length && o && r.set(e, o), e;
		},
		provide: (e) => gc.from(e)
	}), a = I.define((a) => new bc(a, e, i, r, n, t.hoverTime || 300));
	return {
		active: i,
		extension: [
			i,
			a,
			yc.of(a),
			vc
		]
	};
}
function Tc(e, t, n, r = {}) {
	let i = e.state.facet(yc).map((t) => e.plugin(t)).filter((e) => !!e);
	if (r.tooltip && r.tooltip.active) {
		let e = i.find((e) => e.field == r.tooltip.active);
		e && (i = [e]);
	}
	for (let a of i) a.activateHover(e, t, n, r.until ?? (() => !1));
}
function Ec(e, t) {
	let n = e.plugin(dc);
	if (!n) return null;
	let r = n.manager.tooltips.indexOf(t);
	return r < 0 ? null : n.manager.tooltipViews[r];
}
var Dc = /*@__PURE__*/ D.define(), Oc = /*@__PURE__*/ E.define({ combine(e) {
	let t, n;
	for (let r of e) t ||= r.topContainer, n ||= r.bottomContainer;
	return {
		topContainer: t,
		bottomContainer: n
	};
} });
function kc(e, t) {
	let n = e.plugin(Ac), r = n ? n.specs.indexOf(t) : -1;
	return r > -1 ? n.panels[r] : null;
}
var Ac = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.input = e.state.facet(Nc), this.specs = this.input.filter((e) => e), this.panels = this.specs.map((t) => t(e));
		let t = e.state.facet(Oc);
		this.top = new jc(e, !0, t.topContainer), this.bottom = new jc(e, !1, t.bottomContainer), this.top.sync(this.panels.filter((e) => e.top)), this.bottom.sync(this.panels.filter((e) => !e.top));
		for (let e of this.panels) e.dom.classList.add("cm-panel"), e.mount && e.mount();
	}
	update(e) {
		let t = e.state.facet(Oc);
		this.top.container != t.topContainer && (this.top.sync([]), this.top = new jc(e.view, !0, t.topContainer)), this.bottom.container != t.bottomContainer && (this.bottom.sync([]), this.bottom = new jc(e.view, !1, t.bottomContainer)), this.top.syncClasses(), this.bottom.syncClasses();
		let n = e.state.facet(Nc);
		if (n != this.input) {
			let t = n.filter((e) => e), r = [], i = [], a = [], o = [];
			for (let n of t) {
				let t = this.specs.indexOf(n), s;
				t < 0 ? (s = n(e.view), o.push(s)) : (s = this.panels[t], s.update && s.update(e)), r.push(s), (s.top ? i : a).push(s);
			}
			this.specs = t, this.panels = r, this.top.sync(i), this.bottom.sync(a);
			for (let e of o) e.dom.classList.add("cm-panel"), e.mount && e.mount();
		} else for (let t of this.panels) t.update && t.update(e);
	}
	destroy() {
		this.top.sync([]), this.bottom.sync([]);
	}
}, { provide: (e) => z.scrollMargins.of((t) => {
	let n = t.plugin(e);
	return n && {
		top: n.top.scrollMargin(),
		bottom: n.bottom.scrollMargin()
	};
}) }), jc = class {
	constructor(e, t, n) {
		this.view = e, this.top = t, this.container = n, this.dom = void 0, this.classes = "", this.panels = [], this.syncClasses();
	}
	sync(e) {
		for (let t of this.panels) t.destroy && e.indexOf(t) < 0 && t.destroy();
		this.panels = e, this.syncDOM();
	}
	syncDOM() {
		if (this.panels.length == 0) {
			this.dom &&= (this.dom.remove(), void 0);
			return;
		}
		if (!this.dom) {
			this.dom = document.createElement("div"), this.dom.className = this.top ? "cm-panels cm-panels-top" : "cm-panels cm-panels-bottom";
			let e = this.container || this.view.dom;
			e.insertBefore(this.dom, this.top ? e.firstChild : null);
		}
		let e = this.dom.firstChild;
		for (let t of this.panels) if (t.dom.parentNode == this.dom) {
			for (; e != t.dom;) e = Mc(e);
			e = e.nextSibling;
		} else this.dom.insertBefore(t.dom, e);
		for (; e;) e = Mc(e);
	}
	scrollMargin() {
		return !this.dom || this.container ? 0 : Math.max(0, this.top ? this.dom.getBoundingClientRect().bottom - Math.max(0, this.view.scrollDOM.getBoundingClientRect().top) : Math.min(innerHeight, this.view.scrollDOM.getBoundingClientRect().bottom) - this.dom.getBoundingClientRect().top);
	}
	syncClasses() {
		if (!(!this.container || this.classes == this.view.themeClasses)) {
			for (let e of this.classes.split(" ")) e && this.container.classList.remove(e);
			for (let e of (this.classes = this.view.themeClasses).split(" ")) e && this.container.classList.add(e);
		}
	}
};
function Mc(e) {
	let t = e.nextSibling;
	return e.remove(), t;
}
var Nc = /*@__PURE__*/ E.define({ enables: Ac });
function Pc(e, t) {
	let n, r = new Promise((e) => n = e), i = (e) => Rc(e, t, n);
	e.state.field(Fc, !1) ? e.dispatch({ effects: Ic.of(i) }) : e.dispatch({ effects: D.appendConfig.of(Fc.init(() => [i])) });
	let a = Lc.of(i);
	return {
		close: a,
		result: r.then((t) => ((e.win.queueMicrotask || ((t) => e.win.setTimeout(t, 10)))(() => {
			e.state.field(Fc).indexOf(i) > -1 && e.dispatch({ effects: a });
		}), t))
	};
}
var Fc = /*@__PURE__*/ Be.define({
	create() {
		return [];
	},
	update(e, t) {
		for (let n of t.effects) n.is(Ic) ? e = [n.value].concat(e) : n.is(Lc) && (e = e.filter((e) => e != n.value));
		return e;
	},
	provide: (e) => Nc.computeN([e], (t) => t.field(e))
}), Ic = /*@__PURE__*/ D.define(), Lc = /*@__PURE__*/ D.define();
function Rc(e, t, n) {
	let r = t.content ? t.content(e, () => o(null)) : null;
	if (!r) {
		if (r = j("form"), t.input) {
			let e = j("input", t.input);
			/^(text|password|number|email|tel|url)$/.test(e.type) && e.classList.add("cm-textfield"), e.name ||= "input", r.appendChild(j("label", (t.label || "") + ": ", e));
		} else r.appendChild(document.createTextNode(t.label || ""));
		r.appendChild(document.createTextNode(" ")), r.appendChild(j("button", {
			class: "cm-button",
			type: "submit"
		}, t.submitLabel || "OK"));
	}
	let i = r.nodeName == "FORM" ? [r] : r.querySelectorAll("form");
	for (let e = 0; e < i.length; e++) {
		let t = i[e];
		t.addEventListener("keydown", (e) => {
			e.keyCode == 27 ? (e.preventDefault(), o(null)) : e.keyCode == 13 && (e.preventDefault(), o(t));
		}), t.addEventListener("submit", (e) => {
			e.preventDefault(), o(t);
		});
	}
	let a = j("div", r, j("button", {
		onclick: () => o(null),
		"aria-label": e.state.phrase("close"),
		class: "cm-dialog-close",
		type: "button"
	}, ["×"]));
	t.class && (a.className = t.class), a.classList.add("cm-dialog");
	function o(t) {
		a.contains(a.ownerDocument.activeElement) && e.focus(), n(t);
	}
	return {
		dom: a,
		top: t.top,
		mount: () => {
			if (t.focus) {
				let e;
				e = typeof t.focus == "string" ? r.querySelector(t.focus) : r.querySelector("input") || r.querySelector("button"), e && "select" in e ? e.select() : e && "focus" in e && e.focus();
			}
		}
	};
}
var zc = class extends xt {
	compare(e) {
		return this == e || this.constructor == e.constructor && this.eq(e);
	}
	eq(e) {
		return !1;
	}
	destroy(e) {}
};
zc.prototype.elementClass = "", zc.prototype.toDOM = void 0, zc.prototype.mapMode = Se.TrackBefore, zc.prototype.startSide = zc.prototype.endSide = -1, zc.prototype.point = !0;
var Bc = /*@__PURE__*/ E.define(), Vc = /*@__PURE__*/ E.define(), Hc = {
	class: "",
	renderEmptyElements: !1,
	elementStyle: "",
	markers: () => A.empty,
	lineMarker: () => null,
	widgetMarker: () => null,
	lineMarkerChange: null,
	initialSpacer: null,
	updateSpacer: null,
	domEventHandlers: {},
	side: "before"
}, Uc = /*@__PURE__*/ E.define();
function Wc(e) {
	return [Kc(), Uc.of({
		...Hc,
		...e
	})];
}
var Gc = /*@__PURE__*/ E.define({ combine: (e) => e.some((e) => e) });
function Kc(e) {
	let t = [qc];
	return e && e.fixed === !1 && t.push(Gc.of(!0)), t;
}
var qc = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.view = e, this.domAfter = null, this.prevViewport = e.viewport, this.dom = document.createElement("div"), this.dom.className = "cm-gutters cm-gutters-before", this.dom.setAttribute("aria-hidden", "true"), this.dom.style.minHeight = this.view.contentHeight / this.view.scaleY + "px", this.gutters = e.state.facet(Uc).map((t) => new Zc(e, t)), this.fixed = !e.state.facet(Gc);
		for (let e of this.gutters) e.config.side == "after" ? this.getDOMAfter().appendChild(e.dom) : this.dom.appendChild(e.dom);
		this.fixed && (this.dom.style.position = "sticky"), this.syncGutters(!1), e.scrollDOM.insertBefore(this.dom, e.contentDOM);
	}
	getDOMAfter() {
		return this.domAfter || (this.domAfter = document.createElement("div"), this.domAfter.className = "cm-gutters cm-gutters-after", this.domAfter.setAttribute("aria-hidden", "true"), this.domAfter.style.minHeight = this.view.contentHeight / this.view.scaleY + "px", this.domAfter.style.position = this.fixed ? "sticky" : "", this.view.scrollDOM.appendChild(this.domAfter)), this.domAfter;
	}
	update(e) {
		if (this.updateGutters(e)) {
			let t = this.prevViewport, n = e.view.viewport, r = Math.min(t.to, n.to) - Math.max(t.from, n.from);
			this.syncGutters(r < (n.to - n.from) * .8);
		}
		if (e.geometryChanged) {
			let e = this.view.contentHeight / this.view.scaleY + "px";
			this.dom.style.minHeight = e, this.domAfter && (this.domAfter.style.minHeight = e);
		}
		this.view.state.facet(Gc) != !this.fixed && (this.fixed = !this.fixed, this.dom.style.position = this.fixed ? "sticky" : "", this.domAfter && (this.domAfter.style.position = this.fixed ? "sticky" : "")), this.prevViewport = e.view.viewport;
	}
	syncGutters(e) {
		let t = this.dom.nextSibling;
		e && (this.dom.remove(), this.domAfter && this.domAfter.remove());
		let n = A.iter(this.view.state.facet(Bc), this.view.viewport.from), r = [], i = this.gutters.map((e) => new Xc(e, this.view.viewport, -this.view.documentPadding.top));
		for (let e of this.view.viewportLineBlocks) if (r.length && (r = []), Array.isArray(e.type)) {
			let t = !0;
			for (let a of e.type) if (a.type == bn.Text && t) {
				Yc(n, r, a.from);
				for (let e of i) e.line(this.view, a, r);
				t = !1;
			} else if (a.widget) for (let e of i) e.widget(this.view, a);
		} else if (e.type == bn.Text) {
			Yc(n, r, e.from);
			for (let t of i) t.line(this.view, e, r);
		} else if (e.widget) for (let t of i) t.widget(this.view, e);
		for (let e of i) e.finish();
		e && (this.view.scrollDOM.insertBefore(this.dom, t), this.domAfter && this.view.scrollDOM.appendChild(this.domAfter));
	}
	updateGutters(e) {
		let t = e.startState.facet(Uc), n = e.state.facet(Uc), r = e.docChanged || e.heightChanged || e.viewportChanged || !A.eq(e.startState.facet(Bc), e.state.facet(Bc), e.view.viewport.from, e.view.viewport.to);
		if (t == n) for (let t of this.gutters) t.update(e) && (r = !0);
		else {
			r = !0;
			let i = [];
			for (let r of n) {
				let n = t.indexOf(r);
				n < 0 ? i.push(new Zc(this.view, r)) : (this.gutters[n].update(e), i.push(this.gutters[n]));
			}
			for (let e of this.gutters) e.dom.remove(), i.indexOf(e) < 0 && e.destroy();
			for (let e of i) e.config.side == "after" ? this.getDOMAfter().appendChild(e.dom) : this.dom.appendChild(e.dom);
			this.gutters = i;
		}
		return r;
	}
	destroy() {
		for (let e of this.gutters) e.destroy();
		this.dom.remove(), this.domAfter && this.domAfter.remove();
	}
}, { provide: (e) => z.scrollMargins.of((t) => {
	let n = t.plugin(e);
	if (!n || n.gutters.length == 0 || !n.fixed) return null;
	let r = n.dom.offsetWidth * t.scaleX, i = n.domAfter ? n.domAfter.offsetWidth * t.scaleX : 0;
	return t.textDirection == P.LTR ? {
		left: r,
		right: i
	} : {
		right: r,
		left: i
	};
}) });
function Jc(e) {
	return Array.isArray(e) ? e : [e];
}
function Yc(e, t, n) {
	for (; e.value && e.from <= n;) e.from == n && t.push(e.value), e.next();
}
var Xc = class {
	constructor(e, t, n) {
		this.gutter = e, this.height = n, this.i = 0, this.cursor = A.iter(e.markers, t.from);
	}
	addElement(e, t, n) {
		let { gutter: r } = this, i = (t.top - this.height) / e.scaleY, a = t.height / e.scaleY;
		if (this.i == r.elements.length) {
			let t = new Qc(e, a, i, n);
			r.elements.push(t), r.dom.appendChild(t.dom);
		} else r.elements[this.i].update(e, a, i, n);
		this.height = t.bottom, this.i++;
	}
	line(e, t, n) {
		let r = [];
		Yc(this.cursor, r, t.from), n.length && (r = r.concat(n));
		let i = this.gutter.config.lineMarker(e, t, r);
		i && r.unshift(i);
		let a = this.gutter;
		r.length == 0 && !a.config.renderEmptyElements || this.addElement(e, t, r);
	}
	widget(e, t) {
		let n = this.gutter.config.widgetMarker(e, t.widget, t), r = n ? [n] : null;
		for (let n of e.state.facet(Vc)) {
			let i = n(e, t.widget, t);
			i && (r ||= []).push(i);
		}
		r && this.addElement(e, t, r);
	}
	finish() {
		let e = this.gutter;
		for (; e.elements.length > this.i;) {
			let t = e.elements.pop();
			e.dom.removeChild(t.dom), t.destroy();
		}
	}
}, Zc = class {
	constructor(e, t) {
		this.view = e, this.config = t, this.elements = [], this.spacer = null, this.dom = document.createElement("div"), this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
		for (let n in t.domEventHandlers) this.dom.addEventListener(n, (r) => {
			let i = r.target, a;
			if (i != this.dom && this.dom.contains(i)) {
				for (; i.parentNode != this.dom;) i = i.parentNode;
				let e = i.getBoundingClientRect();
				a = (e.top + e.bottom) / 2;
			} else a = r.clientY;
			let o = e.lineBlockAtHeight(a - e.documentTop);
			t.domEventHandlers[n](e, o, r) && r.preventDefault();
		});
		this.markers = Jc(t.markers(e)), t.initialSpacer && (this.spacer = new Qc(e, 0, 0, [t.initialSpacer(e)]), this.dom.appendChild(this.spacer.dom), this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none");
	}
	update(e) {
		let t = this.markers;
		if (this.markers = Jc(this.config.markers(e.view)), this.spacer && this.config.updateSpacer) {
			let t = this.config.updateSpacer(this.spacer.markers[0], e);
			t != this.spacer.markers[0] && this.spacer.update(e.view, 0, 0, [t]);
		}
		let n = e.view.viewport;
		return !A.eq(this.markers, t, n.from, n.to) || (this.config.lineMarkerChange ? this.config.lineMarkerChange(e) : !1);
	}
	destroy() {
		for (let e of this.elements) e.destroy();
	}
}, Qc = class {
	constructor(e, t, n, r) {
		this.height = -1, this.above = 0, this.markers = [], this.dom = document.createElement("div"), this.dom.className = "cm-gutterElement", this.update(e, t, n, r);
	}
	update(e, t, n, r) {
		this.height != t && (this.height = t, this.dom.style.height = t + "px"), this.above != n && (this.dom.style.marginTop = (this.above = n) ? n + "px" : ""), $c(this.markers, r) || this.setMarkers(e, r);
	}
	setMarkers(e, t) {
		let n = "cm-gutterElement", r = this.dom.firstChild;
		for (let i = 0, a = 0;;) {
			let o = a, s = i < t.length ? t[i++] : null, c = !1;
			if (s) {
				let e = s.elementClass;
				e && (n += " " + e);
				for (let e = a; e < this.markers.length; e++) if (this.markers[e].compare(s)) {
					o = e, c = !0;
					break;
				}
			} else o = this.markers.length;
			for (; a < o;) {
				let e = this.markers[a++];
				if (e.toDOM) {
					e.destroy(r);
					let t = r.nextSibling;
					r.remove(), r = t;
				}
			}
			if (!s) break;
			s.toDOM && (c ? r = r.nextSibling : this.dom.insertBefore(s.toDOM(e), r)), c && a++;
		}
		this.dom.className = n, this.markers = t;
	}
	destroy() {
		this.setMarkers(null, []);
	}
};
function $c(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (!e[n].compare(t[n])) return !1;
	return !0;
}
var el = /*@__PURE__*/ E.define(), tl = /*@__PURE__*/ E.define(), nl = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, {
		formatNumber: String,
		domEventHandlers: {}
	}, { domEventHandlers(e, t) {
		let n = Object.assign({}, e);
		for (let e in t) {
			let r = n[e], i = t[e];
			n[e] = r ? (e, t, n) => r(e, t, n) || i(e, t, n) : i;
		}
		return n;
	} });
} }), rl = class extends zc {
	constructor(e) {
		super(), this.number = e;
	}
	eq(e) {
		return this.number == e.number;
	}
	toDOM() {
		return document.createTextNode(this.number);
	}
};
function il(e, t) {
	return e.state.facet(nl).formatNumber(t, e.state);
}
var al = /*@__PURE__*/ Uc.compute([nl], (e) => ({
	class: "cm-lineNumbers",
	renderEmptyElements: !1,
	markers(e) {
		return e.state.facet(el);
	},
	lineMarker(e, t, n) {
		return n.some((e) => e.toDOM) ? null : new rl(il(e, e.state.doc.lineAt(t.from).number));
	},
	widgetMarker: (e, t, n) => {
		for (let r of e.state.facet(tl)) {
			let i = r(e, t, n);
			if (i) return i;
		}
		return null;
	},
	lineMarkerChange: (e) => e.startState.facet(nl) != e.state.facet(nl),
	initialSpacer(e) {
		return new rl(il(e, sl(e.state.doc.lines)));
	},
	updateSpacer(e, t) {
		let n = il(t.view, sl(t.view.state.doc.lines));
		return n == e.number ? e : new rl(n);
	},
	domEventHandlers: e.facet(nl).domEventHandlers,
	side: "before"
}));
function ol(e = {}) {
	return [
		nl.of(e),
		Kc(),
		al
	];
}
function sl(e) {
	let t = 9;
	for (; t < e;) t = t * 10 + 9;
	return t;
}
var cl = /*@__PURE__*/ new class extends zc {
	constructor() {
		super(...arguments), this.elementClass = "cm-activeLineGutter";
	}
}(), ll = /*@__PURE__*/ Bc.compute(["selection"], (e) => {
	let t = [], n = -1;
	for (let r of e.selection.ranges) {
		let i = e.doc.lineAt(r.head).from;
		i > n && (n = i, t.push(cl.range(i)));
	}
	return A.of(t);
});
function ul() {
	return ll;
}
//#endregion
//#region node_modules/@lezer/common/dist/index.js
var dl = 1024, fl = 0, pl = class {
	constructor(e, t) {
		this.from = e, this.to = t;
	}
}, B = class {
	constructor(e = {}) {
		this.id = fl++, this.perNode = !!e.perNode, this.deserialize = e.deserialize || (() => {
			throw Error("This node type doesn't define a deserialize function");
		}), this.combine = e.combine || null;
	}
	add(e) {
		if (this.perNode) throw RangeError("Can't add per-node props to node types");
		return typeof e != "function" && (e = gl.match(e)), (t) => {
			let n = e(t);
			return n === void 0 ? null : [this, n];
		};
	}
};
B.closedBy = new B({ deserialize: (e) => e.split(" ") }), B.openedBy = new B({ deserialize: (e) => e.split(" ") }), B.group = new B({ deserialize: (e) => e.split(" ") }), B.isolate = new B({ deserialize: (e) => {
	if (e && e != "rtl" && e != "ltr" && e != "auto") throw RangeError("Invalid value for isolate: " + e);
	return e || "auto";
} }), B.contextHash = new B({ perNode: !0 }), B.lookAhead = new B({ perNode: !0 }), B.mounted = new B({ perNode: !0 });
var ml = class {
	constructor(e, t, n, r = !1) {
		this.tree = e, this.overlay = t, this.parser = n, this.bracketed = r;
	}
	static get(e) {
		return e && e.props && e.props[B.mounted.id];
	}
}, hl = Object.create(null), gl = class e {
	constructor(e, t, n, r = 0) {
		this.name = e, this.props = t, this.id = n, this.flags = r;
	}
	static define(t) {
		let n = t.props && t.props.length ? Object.create(null) : hl, r = !!t.top | (t.skipped ? 2 : 0) | (t.error ? 4 : 0) | (t.name == null ? 8 : 0), i = new e(t.name || "", n, t.id, r);
		if (t.props) {
			for (let e of t.props) if (Array.isArray(e) || (e = e(i)), e) {
				if (e[0].perNode) throw RangeError("Can't store a per-node prop on a node type");
				n[e[0].id] = e[1];
			}
		}
		return i;
	}
	prop(e) {
		return this.props[e.id];
	}
	get isTop() {
		return (this.flags & 1) > 0;
	}
	get isSkipped() {
		return (this.flags & 2) > 0;
	}
	get isError() {
		return (this.flags & 4) > 0;
	}
	get isAnonymous() {
		return (this.flags & 8) > 0;
	}
	is(e) {
		if (typeof e == "string") {
			if (this.name == e) return !0;
			let t = this.prop(B.group);
			return t ? t.indexOf(e) > -1 : !1;
		}
		return this.id == e;
	}
	static match(e) {
		let t = Object.create(null);
		for (let n in e) for (let r of n.split(" ")) t[r] = e[n];
		return (e) => {
			for (let n = e.prop(B.group), r = -1; r < (n ? n.length : 0); r++) {
				let i = t[r < 0 ? e.name : n[r]];
				if (i) return i;
			}
		};
	}
};
gl.none = new gl("", Object.create(null), 0, 8);
var _l = /* @__PURE__ */ new WeakMap(), vl = /* @__PURE__ */ new WeakMap(), V;
(function(e) {
	e[e.ExcludeBuffers = 1] = "ExcludeBuffers", e[e.IncludeAnonymous = 2] = "IncludeAnonymous", e[e.IgnoreMounts = 4] = "IgnoreMounts", e[e.IgnoreOverlays = 8] = "IgnoreOverlays", e[e.EnterBracketed = 16] = "EnterBracketed";
})(V ||= {});
var yl = class e {
	constructor(e, t, n, r, i) {
		if (this.type = e, this.children = t, this.positions = n, this.length = r, this.props = null, i && i.length) {
			this.props = Object.create(null);
			for (let [e, t] of i) this.props[typeof e == "number" ? e : e.id] = t;
		}
	}
	toString() {
		let e = ml.get(this);
		if (e && !e.overlay) return e.tree.toString();
		let t = "";
		for (let e of this.children) {
			let n = e.toString();
			n && (t && (t += ","), t += n);
		}
		return this.type.name ? (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (t.length ? "(" + t + ")" : "") : t;
	}
	cursor(e = 0) {
		return new Nl(this.topNode, e);
	}
	cursorAt(e, t = 0, n = 0) {
		let r = new Nl(_l.get(this) || this.topNode);
		return r.moveTo(e, t), _l.set(this, r._tree), r;
	}
	get topNode() {
		return new Tl(this, 0, 0, null);
	}
	resolve(e, t = 0) {
		let n = Cl(_l.get(this) || this.topNode, e, t, !1);
		return _l.set(this, n), n;
	}
	resolveInner(e, t = 0) {
		let n = Cl(vl.get(this) || this.topNode, e, t, !0);
		return vl.set(this, n), n;
	}
	resolveStack(e, t = 0) {
		return Ml(this, e, t);
	}
	iterate(e) {
		let { enter: t, leave: n, from: r = 0, to: i = this.length } = e, a = e.mode || 0, o = (a & V.IncludeAnonymous) > 0;
		for (let e = this.cursor(a | V.IncludeAnonymous);;) {
			let a = !1;
			if (e.from <= i && e.to >= r && (!o && e.type.isAnonymous || t(e) !== !1)) {
				if (e.firstChild()) continue;
				a = !0;
			}
			for (; a && n && (o || !e.type.isAnonymous) && n(e), !e.nextSibling();) {
				if (!e.parent()) return;
				a = !0;
			}
		}
	}
	prop(e) {
		return e.perNode ? this.props ? this.props[e.id] : void 0 : this.type.prop(e);
	}
	get propValues() {
		let e = [];
		if (this.props) for (let t in this.props) e.push([+t, this.props[t]]);
		return e;
	}
	balance(t = {}) {
		return this.children.length <= 8 ? this : Rl(gl.none, this.children, this.positions, 0, this.children.length, 0, this.length, (t, n, r) => new e(this.type, t, n, r, this.propValues), t.makeTree || ((t, n, r) => new e(gl.none, t, n, r)));
	}
	static build(e) {
		return Fl(e);
	}
};
yl.empty = new yl(gl.none, [], [], 0);
var bl = class e {
	constructor(e, t) {
		this.buffer = e, this.index = t;
	}
	get id() {
		return this.buffer[this.index - 4];
	}
	get start() {
		return this.buffer[this.index - 3];
	}
	get end() {
		return this.buffer[this.index - 2];
	}
	get size() {
		return this.buffer[this.index - 1];
	}
	get pos() {
		return this.index;
	}
	next() {
		this.index -= 4;
	}
	fork() {
		return new e(this.buffer, this.index);
	}
}, xl = class e {
	constructor(e, t, n) {
		this.buffer = e, this.length = t, this.set = n;
	}
	get type() {
		return gl.none;
	}
	toString() {
		let e = [];
		for (let t = 0; t < this.buffer.length;) e.push(this.childString(t)), t = this.buffer[t + 3];
		return e.join(",");
	}
	childString(e) {
		let t = this.buffer[e], n = this.buffer[e + 3], r = this.set.types[t], i = r.name;
		if (/\W/.test(i) && !r.isError && (i = JSON.stringify(i)), e += 4, n == e) return i;
		let a = [];
		for (; e < n;) a.push(this.childString(e)), e = this.buffer[e + 3];
		return i + "(" + a.join(",") + ")";
	}
	findChild(e, t, n, r, i) {
		let { buffer: a } = this, o = -1;
		for (let s = e; s != t && !(Sl(i, r, a[s + 1], a[s + 2]) && (o = s, n > 0)); s = a[s + 3]);
		return o;
	}
	slice(t, n, r) {
		let i = this.buffer, a = new Uint16Array(n - t), o = 0;
		for (let e = t, s = 0; e < n;) {
			a[s++] = i[e++], a[s++] = i[e++] - r;
			let n = a[s++] = i[e++] - r;
			a[s++] = i[e++] - t, o = Math.max(o, n);
		}
		return new e(a, o, this.set);
	}
};
function Sl(e, t, n, r) {
	switch (e) {
		case -2: return n < t;
		case -1: return r >= t && n < t;
		case 0: return n < t && r > t;
		case 1: return n <= t && r > t;
		case 2: return r > t;
		case 4: return !0;
	}
}
function Cl(e, t, n, r) {
	for (; e.from == e.to || (n < 1 ? e.from >= t : e.from > t) || (n > -1 ? e.to <= t : e.to < t);) {
		let t = !r && e instanceof Tl && e.index < 0 ? null : e.parent;
		if (!t) return e;
		e = t;
	}
	let i = r ? 0 : V.IgnoreOverlays;
	if (r) for (let r = e, a = r.parent; a; r = a, a = r.parent) r instanceof Tl && r.index < 0 && a.enter(t, n, i)?.from != r.from && (e = a);
	for (;;) {
		let r = e.enter(t, n, i);
		if (!r) return e;
		e = r;
	}
}
var wl = class {
	cursor(e = 0) {
		return new Nl(this, e);
	}
	getChild(e, t = null, n = null) {
		let r = El(this, e, t, n);
		return r.length ? r[0] : null;
	}
	getChildren(e, t = null, n = null) {
		return El(this, e, t, n);
	}
	resolve(e, t = 0) {
		return Cl(this, e, t, !1);
	}
	resolveInner(e, t = 0) {
		return Cl(this, e, t, !0);
	}
	matchContext(e) {
		return Dl(this.parent, e);
	}
	enterUnfinishedNodesBefore(e) {
		let t = this.childBefore(e), n = this;
		for (; t;) {
			let e = t.lastChild;
			if (!e || e.to != t.to) break;
			e.type.isError && e.from == e.to ? (n = t, t = e.prevSibling) : t = e;
		}
		return n;
	}
	get node() {
		return this;
	}
	get next() {
		return this.parent;
	}
}, Tl = class e extends wl {
	constructor(e, t, n, r) {
		super(), this._tree = e, this.from = t, this.index = n, this._parent = r;
	}
	get type() {
		return this._tree.type;
	}
	get name() {
		return this._tree.type.name;
	}
	get to() {
		return this.from + this._tree.length;
	}
	nextChild(t, n, r, i, a = 0) {
		for (let o = this;;) {
			for (let { children: s, positions: c } = o._tree, l = n > 0 ? s.length : -1; t != l; t += n) {
				let l = s[t], u = c[t] + o.from, d;
				if (!(!(a & V.EnterBracketed && l instanceof yl && (d = ml.get(l)) && !d.overlay && d.bracketed && r >= u && r <= u + l.length) && !Sl(i, r, u, u + l.length))) {
					if (l instanceof xl) {
						if (a & V.ExcludeBuffers) continue;
						let e = l.findChild(0, l.buffer.length, n, r - u, i);
						if (e > -1) return new kl(new Ol(o, l, t, u), null, e);
					} else if (a & V.IncludeAnonymous || !l.type.isAnonymous || Pl(l)) {
						let s;
						if (!(a & V.IgnoreMounts) && (s = ml.get(l)) && !s.overlay) return new e(s.tree, u, t, o);
						let c = new e(l, u, t, o);
						return a & V.IncludeAnonymous || !c.type.isAnonymous ? c : c.nextChild(n < 0 ? l.children.length - 1 : 0, n, r, i, a);
					}
				}
			}
			if (a & V.IncludeAnonymous || !o.type.isAnonymous || (t = o.index >= 0 ? o.index + n : n < 0 ? -1 : o._parent._tree.children.length, o = o._parent, !o)) return null;
		}
	}
	get firstChild() {
		return this.nextChild(0, 1, 0, 4);
	}
	get lastChild() {
		return this.nextChild(this._tree.children.length - 1, -1, 0, 4);
	}
	childAfter(e) {
		return this.nextChild(0, 1, e, 2);
	}
	childBefore(e) {
		return this.nextChild(this._tree.children.length - 1, -1, e, -2);
	}
	prop(e) {
		return this._tree.prop(e);
	}
	enter(t, n, r = 0) {
		let i;
		if (!(r & V.IgnoreOverlays) && (i = ml.get(this._tree)) && i.overlay) {
			let a = t - this.from, o = r & V.EnterBracketed && i.bracketed;
			for (let { from: t, to: r } of i.overlay) if ((n > 0 || o ? t <= a : t < a) && (n < 0 || o ? r >= a : r > a)) return new e(i.tree, i.overlay[0].from + this.from, -1, this);
		}
		return this.nextChild(0, 1, t, n, r);
	}
	nextSignificantParent() {
		let e = this;
		for (; e.type.isAnonymous && e._parent;) e = e._parent;
		return e;
	}
	get parent() {
		return this._parent ? this._parent.nextSignificantParent() : null;
	}
	get nextSibling() {
		return this._parent && this.index >= 0 ? this._parent.nextChild(this.index + 1, 1, 0, 4) : null;
	}
	get prevSibling() {
		return this._parent && this.index >= 0 ? this._parent.nextChild(this.index - 1, -1, 0, 4) : null;
	}
	get tree() {
		return this._tree;
	}
	toTree() {
		return this._tree;
	}
	toString() {
		return this._tree.toString();
	}
};
function El(e, t, n, r) {
	let i = e.cursor(), a = [];
	if (!i.firstChild()) return a;
	if (n != null) {
		for (let e = !1; !e;) if (e = i.type.is(n), !i.nextSibling()) return a;
	}
	for (;;) {
		if (r != null && i.type.is(r)) return a;
		if (i.type.is(t) && a.push(i.node), !i.nextSibling()) return r == null ? a : [];
	}
}
function Dl(e, t, n = t.length - 1) {
	for (let r = e; n >= 0; r = r.parent) {
		if (!r) return !1;
		if (!r.type.isAnonymous) {
			if (t[n] && t[n] != r.name) return !1;
			n--;
		}
	}
	return !0;
}
var Ol = class {
	constructor(e, t, n, r) {
		this.parent = e, this.buffer = t, this.index = n, this.start = r;
	}
}, kl = class e extends wl {
	get name() {
		return this.type.name;
	}
	get from() {
		return this.context.start + this.context.buffer.buffer[this.index + 1];
	}
	get to() {
		return this.context.start + this.context.buffer.buffer[this.index + 2];
	}
	constructor(e, t, n) {
		super(), this.context = e, this._parent = t, this.index = n, this.type = e.buffer.set.types[e.buffer.buffer[n]];
	}
	child(t, n, r) {
		let { buffer: i } = this.context, a = i.findChild(this.index + 4, i.buffer[this.index + 3], t, n - this.context.start, r);
		return a < 0 ? null : new e(this.context, this, a);
	}
	get firstChild() {
		return this.child(1, 0, 4);
	}
	get lastChild() {
		return this.child(-1, 0, 4);
	}
	childAfter(e) {
		return this.child(1, e, 2);
	}
	childBefore(e) {
		return this.child(-1, e, -2);
	}
	prop(e) {
		return this.type.prop(e);
	}
	enter(t, n, r = 0) {
		if (r & V.ExcludeBuffers) return null;
		let { buffer: i } = this.context, a = i.findChild(this.index + 4, i.buffer[this.index + 3], n > 0 ? 1 : -1, t - this.context.start, n);
		return a < 0 ? null : new e(this.context, this, a);
	}
	get parent() {
		return this._parent || this.context.parent.nextSignificantParent();
	}
	externalSibling(e) {
		return this._parent ? null : this.context.parent.nextChild(this.context.index + e, e, 0, 4);
	}
	get nextSibling() {
		let { buffer: t } = this.context, n = t.buffer[this.index + 3];
		return n < (this._parent ? t.buffer[this._parent.index + 3] : t.buffer.length) ? new e(this.context, this._parent, n) : this.externalSibling(1);
	}
	get prevSibling() {
		let { buffer: t } = this.context, n = this._parent ? this._parent.index + 4 : 0;
		return this.index == n ? this.externalSibling(-1) : new e(this.context, this._parent, t.findChild(n, this.index, -1, 0, 4));
	}
	get tree() {
		return null;
	}
	toTree() {
		let e = [], t = [], { buffer: n } = this.context, r = this.index + 4, i = n.buffer[this.index + 3];
		if (i > r) {
			let a = n.buffer[this.index + 1];
			e.push(n.slice(r, i, a)), t.push(0);
		}
		return new yl(this.type, e, t, this.to - this.from);
	}
	toString() {
		return this.context.buffer.childString(this.index);
	}
};
function Al(e) {
	if (!e.length) return null;
	let t = 0, n = e[0];
	for (let r = 1; r < e.length; r++) {
		let i = e[r];
		(i.from > n.from || i.to < n.to) && (n = i, t = r);
	}
	let r = n instanceof Tl && n.index < 0 ? null : n.parent, i = e.slice();
	return r ? i[t] = r : i.splice(t, 1), new jl(i, n);
}
var jl = class {
	constructor(e, t) {
		this.heads = e, this.node = t;
	}
	get next() {
		return Al(this.heads);
	}
};
function Ml(e, t, n) {
	let r = e.resolveInner(t, n), i = null;
	for (let e = r instanceof Tl ? r : r.context.parent; e; e = e.parent) if (e.index < 0) {
		let a = e.parent;
		(i ||= [r]).push(a.resolve(t, n)), e = a;
	} else {
		let a = ml.get(e.tree);
		if (a && a.overlay && a.overlay[0].from <= t && a.overlay[a.overlay.length - 1].to >= t) {
			let o = new Tl(a.tree, a.overlay[0].from + e.from, -1, e);
			(i ||= [r]).push(Cl(o, t, n, !1));
		}
	}
	return i ? Al(i) : r;
}
var Nl = class {
	get name() {
		return this.type.name;
	}
	constructor(e, t = 0) {
		if (this.buffer = null, this.stack = [], this.index = 0, this.bufferNode = null, this.mode = t & ~V.EnterBracketed, e instanceof Tl) this.yieldNode(e);
		else {
			this._tree = e.context.parent, this.buffer = e.context;
			for (let t = e._parent; t; t = t._parent) this.stack.unshift(t.index);
			this.bufferNode = e, this.yieldBuf(e.index);
		}
	}
	yieldNode(e) {
		return e ? (this._tree = e, this.type = e.type, this.from = e.from, this.to = e.to, !0) : !1;
	}
	yieldBuf(e, t) {
		this.index = e;
		let { start: n, buffer: r } = this.buffer;
		return this.type = t || r.set.types[r.buffer[e]], this.from = n + r.buffer[e + 1], this.to = n + r.buffer[e + 2], !0;
	}
	yield(e) {
		return e ? e instanceof Tl ? (this.buffer = null, this.yieldNode(e)) : (this.buffer = e.context, this.yieldBuf(e.index, e.type)) : !1;
	}
	toString() {
		return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
	}
	enterChild(e, t, n) {
		if (!this.buffer) return this.yield(this._tree.nextChild(e < 0 ? this._tree._tree.children.length - 1 : 0, e, t, n, this.mode));
		let { buffer: r } = this.buffer, i = r.findChild(this.index + 4, r.buffer[this.index + 3], e, t - this.buffer.start, n);
		return i < 0 ? !1 : (this.stack.push(this.index), this.yieldBuf(i));
	}
	firstChild() {
		return this.enterChild(1, 0, 4);
	}
	lastChild() {
		return this.enterChild(-1, 0, 4);
	}
	childAfter(e) {
		return this.enterChild(1, e, 2);
	}
	childBefore(e) {
		return this.enterChild(-1, e, -2);
	}
	enter(e, t, n = this.mode) {
		return this.buffer ? n & V.ExcludeBuffers ? !1 : this.enterChild(1, e, t) : this.yield(this._tree.enter(e, t, n));
	}
	parent() {
		if (!this.buffer) return this.yieldNode(this.mode & V.IncludeAnonymous ? this._tree._parent : this._tree.parent);
		if (this.stack.length) return this.yieldBuf(this.stack.pop());
		let e = this.mode & V.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
		return this.buffer = null, this.yieldNode(e);
	}
	sibling(e) {
		if (!this.buffer) return this._tree._parent ? this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + e, e, 0, 4, this.mode)) : !1;
		let { buffer: t } = this.buffer, n = this.stack.length - 1;
		if (e < 0) {
			let e = n < 0 ? 0 : this.stack[n] + 4;
			if (this.index != e) return this.yieldBuf(t.findChild(e, this.index, -1, 0, 4));
		} else {
			let e = t.buffer[this.index + 3];
			if (e < (n < 0 ? t.buffer.length : t.buffer[this.stack[n] + 3])) return this.yieldBuf(e);
		}
		return n < 0 && this.yield(this.buffer.parent.nextChild(this.buffer.index + e, e, 0, 4, this.mode));
	}
	nextSibling() {
		return this.sibling(1);
	}
	prevSibling() {
		return this.sibling(-1);
	}
	atLastNode(e) {
		let t, n, { buffer: r } = this;
		if (r) {
			if (e > 0) {
				if (this.index < r.buffer.buffer.length) return !1;
			} else for (let e = 0; e < this.index; e++) if (r.buffer.buffer[e + 3] < this.index) return !1;
			({index: t, parent: n} = r);
		} else ({index: t, _parent: n} = this._tree);
		for (; n; {index: t, _parent: n} = n) if (t > -1) for (let r = t + e, i = e < 0 ? -1 : n._tree.children.length; r != i; r += e) {
			let e = n._tree.children[r];
			if (this.mode & V.IncludeAnonymous || e instanceof xl || !e.type.isAnonymous || Pl(e)) return !1;
		}
		return !0;
	}
	move(e, t) {
		if (t && this.enterChild(e, 0, 4)) return !0;
		for (;;) {
			if (this.sibling(e)) return !0;
			if (this.atLastNode(e) || !this.parent()) return !1;
		}
	}
	next(e = !0) {
		return this.move(1, e);
	}
	prev(e = !0) {
		return this.move(-1, e);
	}
	moveTo(e, t = 0) {
		for (; (this.from == this.to || (t < 1 ? this.from >= e : this.from > e) || (t > -1 ? this.to <= e : this.to < e)) && this.parent(););
		for (; this.enterChild(1, e, t););
		return this;
	}
	get node() {
		if (!this.buffer) return this._tree;
		let e = this.bufferNode, t = null, n = 0;
		if (e && e.context == this.buffer) scan: for (let r = this.index, i = this.stack.length; i >= 0;) {
			for (let a = e; a; a = a._parent) if (a.index == r) {
				if (r == this.index) return a;
				t = a, n = i + 1;
				break scan;
			}
			r = this.stack[--i];
		}
		for (let e = n; e < this.stack.length; e++) t = new kl(this.buffer, t, this.stack[e]);
		return this.bufferNode = new kl(this.buffer, t, this.index);
	}
	get tree() {
		return this.buffer ? null : this._tree._tree;
	}
	iterate(e, t) {
		for (let n = 0;;) {
			let r = !1;
			if (this.type.isAnonymous || e(this) !== !1) {
				if (this.firstChild()) {
					n++;
					continue;
				}
				this.type.isAnonymous || (r = !0);
			}
			for (;;) {
				if (r && t && t(this), r = this.type.isAnonymous, !n) return;
				if (this.nextSibling()) break;
				this.parent(), n--, r = !0;
			}
		}
	}
	matchContext(e) {
		if (!this.buffer) return Dl(this.node.parent, e);
		let { buffer: t } = this.buffer, { types: n } = t.set;
		for (let r = e.length - 1, i = this.stack.length - 1; r >= 0; i--) {
			if (i < 0) return Dl(this._tree, e, r);
			let a = n[t.buffer[this.stack[i]]];
			if (!a.isAnonymous) {
				if (e[r] && e[r] != a.name) return !1;
				r--;
			}
		}
		return !0;
	}
};
function Pl(e) {
	return e.children.some((e) => e instanceof xl || !e.type.isAnonymous || Pl(e));
}
function Fl(e) {
	let { buffer: t, nodeSet: n, maxBufferLength: r = dl, reused: i = [], minRepeatType: a = n.types.length } = e, o = Array.isArray(t) ? new bl(t, t.length) : t, s = n.types, c = 0, l = 0;
	function u(e, t, _, v, y, b) {
		let { id: x, start: ee, end: te, size: ne } = o, S = l, re = c;
		if (ne < 0) {
			if (o.next(), ne == -1) {
				let t = i[x];
				_.push(t), v.push(ee - e);
				return;
			}
			if (ne == -3) {
				c = x;
				return;
			}
			if (ne == -4) {
				l = x;
				return;
			}
			throw RangeError(`Unrecognized record size: ${ne}`);
		}
		let ie = s[x], ae, C, oe = ee - e;
		if (te - ee <= r && (C = h(o.pos - t, y))) {
			let t = new Uint16Array(C.size - C.skip), r = o.pos - C.size, i = t.length;
			for (; o.pos > r;) i = g(C.start, t, i);
			ae = new xl(t, te - C.start, n), oe = C.start - e;
		} else {
			let e = o.pos - ne;
			o.next();
			let t = [], n = [], i = x >= a ? x : -1, s = 0, c = te;
			for (; o.pos > e;) i >= 0 && o.id == i && o.size >= 0 ? (o.end <= c - r && (p(t, n, ee, s, o.end, c, i, S, re), s = t.length, c = o.end), o.next()) : b > 2500 ? d(ee, e, t, n) : u(ee, e, t, n, i, b + 1);
			if (i >= 0 && s > 0 && s < t.length && p(t, n, ee, s, ee, c, i, S, re), t.reverse(), n.reverse(), i > -1 && s > 0) {
				let e = f(ie, re);
				ae = Rl(ie, t, n, 0, t.length, 0, te - ee, e, e);
			} else ae = m(ie, t, n, te - ee, S - te, re);
		}
		_.push(ae), v.push(oe);
	}
	function d(e, t, i, a) {
		let s = [], c = 0, l = -1;
		for (; o.pos > t;) {
			let { id: e, start: t, end: n, size: i } = o;
			if (i > 4) o.next();
			else if (l > -1 && t < l) break;
			else l < 0 && (l = n - r), s.push(e, t, n), c++, o.next();
		}
		if (c) {
			let t = new Uint16Array(c * 4), r = s[s.length - 2];
			for (let e = s.length - 3, n = 0; e >= 0; e -= 3) t[n++] = s[e], t[n++] = s[e + 1] - r, t[n++] = s[e + 2] - r, t[n++] = n;
			i.push(new xl(t, s[2] - r, n)), a.push(r - e);
		}
	}
	function f(e, t) {
		return (n, r, i) => {
			let a = 0, o = n.length - 1, s, c;
			if (o >= 0 && (s = n[o]) instanceof yl) {
				if (!o && s.type == e && s.length == i) return s;
				(c = s.prop(B.lookAhead)) && (a = r[o] + s.length + c);
			}
			return m(e, n, r, i, a, t);
		};
	}
	function p(e, t, r, i, a, o, s, c, l) {
		let u = [], d = [];
		for (; e.length > i;) u.push(e.pop()), d.push(t.pop() + r - a);
		e.push(m(n.types[s], u, d, o - a, c - o, l)), t.push(a - r);
	}
	function m(e, t, n, r, i, a, o) {
		if (a) {
			let e = [B.contextHash, a];
			o = o ? [e].concat(o) : [e];
		}
		if (i > 25) {
			let e = [B.lookAhead, i];
			o = o ? [e].concat(o) : [e];
		}
		return new yl(e, t, n, r, o);
	}
	function h(e, t) {
		let n = o.fork(), i = 0, s = 0, c = 0, l = n.end - r, u = {
			size: 0,
			start: 0,
			skip: 0
		};
		scan: for (let r = n.pos - e; n.pos > r;) {
			let e = n.size;
			if (n.id == t && e >= 0) {
				u.size = i, u.start = s, u.skip = c, c += 4, i += 4, n.next();
				continue;
			}
			let o = n.pos - e;
			if (e < 0 || o < r || n.start < l) break;
			let d = n.id >= a ? 4 : 0, f = n.start;
			for (n.next(); n.pos > o;) {
				if (n.size < 0) {
					if (n.size == -3 || n.size == -4) d += 4;
					else break scan;
				} else n.id >= a && (d += 4);
				n.next();
			}
			s = f, i += e, c += d;
		}
		return (t < 0 || i == e) && (u.size = i, u.start = s, u.skip = c), u.size > 4 ? u : void 0;
	}
	function g(e, t, n) {
		let { id: r, start: i, end: s, size: u } = o;
		if (o.next(), u >= 0 && r < a) {
			let a = n;
			if (u > 4) {
				let r = o.pos - (u - 4);
				for (; o.pos > r;) n = g(e, t, n);
			}
			t[--n] = a, t[--n] = s - e, t[--n] = i - e, t[--n] = r;
		} else u == -3 ? c = r : u == -4 && (l = r);
		return n;
	}
	let _ = [], v = [];
	for (; o.pos > 0;) u(e.start || 0, e.bufferStart || 0, _, v, -1, 0);
	let y = e.length ?? (_.length ? v[0] + _[0].length : 0);
	return new yl(s[e.topID], _.reverse(), v.reverse(), y);
}
var Il = /* @__PURE__ */ new WeakMap();
function Ll(e, t) {
	if (!e.isAnonymous || t instanceof xl || t.type != e) return 1;
	let n = Il.get(t);
	if (n == null) {
		n = 1;
		for (let r of t.children) {
			if (r.type != e || !(r instanceof yl)) {
				n = 1;
				break;
			}
			n += Ll(e, r);
		}
		Il.set(t, n);
	}
	return n;
}
function Rl(e, t, n, r, i, a, o, s, c) {
	let l = 0;
	for (let n = r; n < i; n++) l += Ll(e, t[n]);
	let u = Math.ceil(l * 1.5 / 8), d = [], f = [];
	function p(t, n, r, i, o) {
		for (let s = r; s < i;) {
			let r = s, l = n[s], m = Ll(e, t[s]);
			for (s++; s < i; s++) {
				let n = Ll(e, t[s]);
				if (m + n >= u) break;
				m += n;
			}
			if (s == r + 1) {
				if (m > u) {
					let e = t[r];
					p(e.children, e.positions, 0, e.children.length, n[r] + o);
					continue;
				}
				d.push(t[r]);
			} else {
				let i = n[s - 1] + t[s - 1].length - l;
				d.push(Rl(e, t, n, r, s, l, i, null, c));
			}
			f.push(l + o - a);
		}
	}
	return p(t, n, r, i, 0), (s || c)(d, f, o);
}
var zl = class e {
	constructor(e, t, n, r, i = !1, a = !1) {
		this.from = e, this.to = t, this.tree = n, this.offset = r, this.open = !!i | (a ? 2 : 0);
	}
	get openStart() {
		return (this.open & 1) > 0;
	}
	get openEnd() {
		return (this.open & 2) > 0;
	}
	static addTree(t, n = [], r = !1) {
		let i = [new e(0, t.length, t, 0, !1, r)];
		for (let e of n) e.to > t.length && i.push(e);
		return i;
	}
	static applyChanges(t, n, r = 128) {
		if (!n.length) return t;
		let i = [], a = 1, o = t.length ? t[0] : null;
		for (let s = 0, c = 0, l = 0;; s++) {
			let u = s < n.length ? n[s] : null, d = u ? u.fromA : 1e9;
			if (d - c >= r) for (; o && o.from < d;) {
				let n = o;
				if (c >= n.from || d <= n.to || l) {
					let t = Math.max(n.from, c) - l, r = Math.min(n.to, d) - l;
					n = t >= r ? null : new e(t, r, n.tree, n.offset + l, s > 0, !!u);
				}
				if (n && i.push(n), o.to > d) break;
				o = a < t.length ? t[a++] : null;
			}
			if (!u) break;
			c = u.toA, l = u.toA - u.toB;
		}
		return i;
	}
}, Bl = class {
	startParse(e, t, n) {
		return typeof e == "string" && (e = new Vl(e)), n = n ? n.length ? n.map((e) => new pl(e.from, e.to)) : [new pl(0, 0)] : [new pl(0, e.length)], this.createParse(e, t || [], n);
	}
	parse(e, t, n) {
		let r = this.startParse(e, t, n);
		for (;;) {
			let e = r.advance();
			if (e) return e;
		}
	}
}, Vl = class {
	constructor(e) {
		this.string = e;
	}
	get length() {
		return this.string.length;
	}
	chunk(e) {
		return this.string.slice(e);
	}
	get lineChunks() {
		return !1;
	}
	read(e, t) {
		return this.string.slice(e, t);
	}
};
new B({ perNode: !0 });
//#endregion
//#region node_modules/@lezer/highlight/dist/index.js
var Hl = 0, Ul = class e {
	constructor(e, t, n, r) {
		this.name = e, this.set = t, this.base = n, this.modified = r, this.id = Hl++;
	}
	toString() {
		let { name: e } = this;
		for (let t of this.modified) t.name && (e = `${t.name}(${e})`);
		return e;
	}
	static define(t, n) {
		let r = typeof t == "string" ? t : "?";
		if (t instanceof e && (n = t), n?.base) throw Error("Can not derive from a modified tag");
		let i = new e(r, [], null, []);
		if (i.set.push(i), n) for (let e of n.set) i.set.push(e);
		return i;
	}
	static defineModifier(e) {
		let t = new Gl(e);
		return (e) => e.modified.indexOf(t) > -1 ? e : Gl.get(e.base || e, e.modified.concat(t).sort((e, t) => e.id - t.id));
	}
}, Wl = 0, Gl = class e {
	constructor(e) {
		this.name = e, this.instances = [], this.id = Wl++;
	}
	static get(t, n) {
		if (!n.length) return t;
		let r = n[0].instances.find((e) => e.base == t && Kl(n, e.modified));
		if (r) return r;
		let i = [], a = new Ul(t.name, i, t, n);
		for (let e of n) e.instances.push(a);
		let o = ql(n);
		for (let n of t.set) if (!n.modified.length) for (let t of o) i.push(e.get(n, t));
		return a;
	}
};
function Kl(e, t) {
	return e.length == t.length && e.every((e, n) => e == t[n]);
}
function ql(e) {
	let t = [[]];
	for (let n = 0; n < e.length; n++) for (let r = 0, i = t.length; r < i; r++) t.push(t[r].concat(e[n]));
	return t.sort((e, t) => t.length - e.length);
}
function Jl(e) {
	let t = Object.create(null);
	for (let n in e) {
		let r = e[n];
		Array.isArray(r) || (r = [r]);
		for (let e of n.split(" ")) if (e) {
			let n = [], i = 2, a = e;
			for (let t = 0;;) {
				if (a == "..." && t > 0 && t + 3 == e.length) {
					i = 1;
					break;
				}
				let r = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(a);
				if (!r) throw RangeError("Invalid path: " + e);
				if (n.push(r[0] == "*" ? "" : r[0][0] == "\"" ? JSON.parse(r[0]) : r[0]), t += r[0].length, t == e.length) break;
				let o = e[t++];
				if (t == e.length && o == "!") {
					i = 0;
					break;
				}
				if (o != "/") throw RangeError("Invalid path: " + e);
				a = e.slice(t);
			}
			let o = n.length - 1, s = n[o];
			if (!s) throw RangeError("Invalid path: " + e);
			t[s] = new Xl(r, i, o > 0 ? n.slice(0, o) : null).sort(t[s]);
		}
	}
	return Yl.add(t);
}
var Yl = new B({ combine(e, t) {
	let n, r, i;
	for (; e || t;) {
		if (!e || t && e.depth >= t.depth ? (i = t, t = t.next) : (i = e, e = e.next), n && n.mode == i.mode && !i.context && !n.context) continue;
		let a = new Xl(i.tags, i.mode, i.context);
		n ? n.next = a : r = a, n = a;
	}
	return r;
} }), Xl = class {
	constructor(e, t, n, r) {
		this.tags = e, this.mode = t, this.context = n, this.next = r;
	}
	get opaque() {
		return this.mode == 0;
	}
	get inherit() {
		return this.mode == 1;
	}
	sort(e) {
		return !e || e.depth < this.depth ? (this.next = e, this) : (e.next = this.sort(e.next), e);
	}
	get depth() {
		return this.context ? this.context.length : 0;
	}
};
Xl.empty = new Xl([], 2, null);
function Zl(e, t) {
	let n = Object.create(null);
	for (let t of e) if (!Array.isArray(t.tag)) n[t.tag.id] = t.class;
	else for (let e of t.tag) n[e.id] = t.class;
	let { scope: r, all: i = null } = t || {};
	return {
		style: (e) => {
			let t = i;
			for (let r of e) for (let e of r.set) {
				let r = n[e.id];
				if (r) {
					t = t ? t + " " + r : r;
					break;
				}
			}
			return t;
		},
		scope: r
	};
}
function Ql(e, t) {
	let n = null;
	for (let r of e) {
		let e = r.style(t);
		e && (n = n ? n + " " + e : e);
	}
	return n;
}
function $l(e, t, n, r = 0, i = e.length) {
	let a = new eu(r, Array.isArray(t) ? t : [t], n);
	a.highlightRange(e.cursor(), r, i, "", a.highlighters), a.flush(i);
}
var eu = class {
	constructor(e, t, n) {
		this.at = e, this.highlighters = t, this.span = n, this.class = "";
	}
	startSpan(e, t) {
		t != this.class && (this.flush(e), e > this.at && (this.at = e), this.class = t);
	}
	flush(e) {
		e > this.at && this.class && this.span(this.at, e, this.class);
	}
	highlightRange(e, t, n, r, i) {
		let { type: a, from: o, to: s } = e;
		if (o >= n || s <= t) return;
		a.isTop && (i = this.highlighters.filter((e) => !e.scope || e.scope(a)));
		let c = r, l = tu(e) || Xl.empty, u = Ql(i, l.tags);
		if (u && (c && (c += " "), c += u, l.mode == 1 && (r += (r ? " " : "") + u)), this.startSpan(Math.max(t, o), c), l.opaque) return;
		let d = e.tree && e.tree.prop(B.mounted);
		if (d && d.overlay) {
			let a = e.node.enter(d.overlay[0].from + o, 1), l = this.highlighters.filter((e) => !e.scope || e.scope(d.tree.type)), u = e.firstChild();
			for (let f = 0, p = o;; f++) {
				let m = f < d.overlay.length ? d.overlay[f] : null, h = m ? m.from + o : s, g = Math.max(t, p), _ = Math.min(n, h);
				if (g < _ && u) for (; e.from < _ && (this.highlightRange(e, g, _, r, i), this.startSpan(Math.min(_, e.to), c), !(e.to >= h || !e.nextSibling())););
				if (!m || h > n) break;
				p = m.to + o, p > t && (this.highlightRange(a.cursor(), Math.max(t, m.from + o), Math.min(n, p), "", l), this.startSpan(Math.min(n, p), c));
			}
			u && e.parent();
		} else if (e.firstChild()) {
			d && (r = "");
			do
				if (!(e.to <= t)) {
					if (e.from >= n) break;
					this.highlightRange(e, t, n, r, i), this.startSpan(Math.min(n, e.to), c);
				}
			while (e.nextSibling());
			e.parent();
		}
	}
};
function tu(e) {
	let t = e.type.prop(Yl);
	for (; t && t.context && !e.matchContext(t.context);) t = t.next;
	return t || null;
}
var H = Ul.define, nu = H(), ru = H(), iu = H(ru), au = H(ru), ou = H(), su = H(ou), cu = H(ou), lu = H(), uu = H(lu), du = H(), fu = H(), pu = H(), mu = H(pu), hu = H(), U = {
	comment: nu,
	lineComment: H(nu),
	blockComment: H(nu),
	docComment: H(nu),
	name: ru,
	variableName: H(ru),
	typeName: iu,
	tagName: H(iu),
	propertyName: au,
	attributeName: H(au),
	className: H(ru),
	labelName: H(ru),
	namespace: H(ru),
	macroName: H(ru),
	literal: ou,
	string: su,
	docString: H(su),
	character: H(su),
	attributeValue: H(su),
	number: cu,
	integer: H(cu),
	float: H(cu),
	bool: H(ou),
	regexp: H(ou),
	escape: H(ou),
	color: H(ou),
	url: H(ou),
	keyword: du,
	self: H(du),
	null: H(du),
	atom: H(du),
	unit: H(du),
	modifier: H(du),
	operatorKeyword: H(du),
	controlKeyword: H(du),
	definitionKeyword: H(du),
	moduleKeyword: H(du),
	operator: fu,
	derefOperator: H(fu),
	arithmeticOperator: H(fu),
	logicOperator: H(fu),
	bitwiseOperator: H(fu),
	compareOperator: H(fu),
	updateOperator: H(fu),
	definitionOperator: H(fu),
	typeOperator: H(fu),
	controlOperator: H(fu),
	punctuation: pu,
	separator: H(pu),
	bracket: mu,
	angleBracket: H(mu),
	squareBracket: H(mu),
	paren: H(mu),
	brace: H(mu),
	content: lu,
	heading: uu,
	heading1: H(uu),
	heading2: H(uu),
	heading3: H(uu),
	heading4: H(uu),
	heading5: H(uu),
	heading6: H(uu),
	contentSeparator: H(lu),
	list: H(lu),
	quote: H(lu),
	emphasis: H(lu),
	strong: H(lu),
	link: H(lu),
	monospace: H(lu),
	strikethrough: H(lu),
	inserted: H(),
	deleted: H(),
	changed: H(),
	invalid: H(),
	meta: hu,
	documentMeta: H(hu),
	annotation: H(hu),
	processingInstruction: H(hu),
	definition: Ul.defineModifier("definition"),
	constant: Ul.defineModifier("constant"),
	function: Ul.defineModifier("function"),
	standard: Ul.defineModifier("standard"),
	local: Ul.defineModifier("local"),
	special: Ul.defineModifier("special")
};
for (let e in U) {
	let t = U[e];
	t instanceof Ul && (t.name = e);
}
Zl([
	{
		tag: U.link,
		class: "tok-link"
	},
	{
		tag: U.heading,
		class: "tok-heading"
	},
	{
		tag: U.emphasis,
		class: "tok-emphasis"
	},
	{
		tag: U.strong,
		class: "tok-strong"
	},
	{
		tag: U.keyword,
		class: "tok-keyword"
	},
	{
		tag: U.atom,
		class: "tok-atom"
	},
	{
		tag: U.bool,
		class: "tok-bool"
	},
	{
		tag: U.url,
		class: "tok-url"
	},
	{
		tag: U.labelName,
		class: "tok-labelName"
	},
	{
		tag: U.inserted,
		class: "tok-inserted"
	},
	{
		tag: U.deleted,
		class: "tok-deleted"
	},
	{
		tag: U.literal,
		class: "tok-literal"
	},
	{
		tag: U.string,
		class: "tok-string"
	},
	{
		tag: U.number,
		class: "tok-number"
	},
	{
		tag: [
			U.regexp,
			U.escape,
			U.special(U.string)
		],
		class: "tok-string2"
	},
	{
		tag: U.variableName,
		class: "tok-variableName"
	},
	{
		tag: U.local(U.variableName),
		class: "tok-variableName tok-local"
	},
	{
		tag: U.definition(U.variableName),
		class: "tok-variableName tok-definition"
	},
	{
		tag: U.special(U.variableName),
		class: "tok-variableName2"
	},
	{
		tag: U.definition(U.propertyName),
		class: "tok-propertyName tok-definition"
	},
	{
		tag: U.typeName,
		class: "tok-typeName"
	},
	{
		tag: U.namespace,
		class: "tok-namespace"
	},
	{
		tag: U.className,
		class: "tok-className"
	},
	{
		tag: U.macroName,
		class: "tok-macroName"
	},
	{
		tag: U.propertyName,
		class: "tok-propertyName"
	},
	{
		tag: U.operator,
		class: "tok-operator"
	},
	{
		tag: U.comment,
		class: "tok-comment"
	},
	{
		tag: U.meta,
		class: "tok-meta"
	},
	{
		tag: U.invalid,
		class: "tok-invalid"
	},
	{
		tag: U.punctuation,
		class: "tok-punctuation"
	}
]);
//#endregion
//#region node_modules/@codemirror/language/dist/index.js
var gu = /*@__PURE__*/ new B(), _u = /*@__PURE__*/ new B(), vu = class {
	constructor(e, t, n = [], r = "") {
		this.data = e, this.name = r, k.prototype.hasOwnProperty("tree") || Object.defineProperty(k.prototype, "tree", { get() {
			return bu(this);
		} }), this.parser = t, this.extension = [ku.of(this), k.languageData.of((e, t, n) => {
			let r = yu(e, t, n), i = r.type.prop(gu);
			if (!i) return [];
			let a = e.facet(i), o = r.type.prop(_u);
			if (o) {
				let i = r.resolve(t - r.from, n);
				for (let t of o) if (t.test(i, e)) {
					let n = e.facet(t.facet);
					return t.type == "replace" ? n : n.concat(a);
				}
			}
			return a;
		})].concat(n);
	}
	isActiveAt(e, t, n = -1) {
		return yu(e, t, n).type.prop(gu) == this.data;
	}
	findRegions(e) {
		let t = e.facet(ku);
		if (t?.data == this.data) return [{
			from: 0,
			to: e.doc.length
		}];
		if (!t || !t.allowsNesting) return [];
		let n = [], r = (e, t) => {
			if (e.prop(gu) == this.data) {
				n.push({
					from: t,
					to: t + e.length
				});
				return;
			}
			let i = e.prop(B.mounted);
			if (i) {
				if (i.tree.prop(gu) == this.data) {
					if (i.overlay) for (let e of i.overlay) n.push({
						from: e.from + t,
						to: e.to + t
					});
					else n.push({
						from: t,
						to: t + e.length
					});
					return;
				}
				if (i.overlay) {
					let e = n.length;
					if (r(i.tree, i.overlay[0].from + t), n.length > e) return;
				}
			}
			for (let n = 0; n < e.children.length; n++) {
				let i = e.children[n];
				i instanceof yl && r(i, e.positions[n] + t);
			}
		};
		return r(bu(e), 0), n;
	}
	get allowsNesting() {
		return !0;
	}
};
vu.setState = /*@__PURE__*/ D.define();
function yu(e, t, n) {
	let r = e.facet(ku), i = bu(e).topNode;
	if (!r || r.allowsNesting) for (let e = i; e; e = e.enter(t, n, V.ExcludeBuffers | V.EnterBracketed)) e.type.isTop && (i = e);
	return i;
}
function bu(e) {
	let t = e.field(vu.state, !1);
	return t ? t.tree : yl.empty;
}
var xu = class {
	constructor(e) {
		this.doc = e, this.cursorPos = 0, this.string = "", this.cursor = e.iter();
	}
	get length() {
		return this.doc.length;
	}
	syncTo(e) {
		return this.string = this.cursor.next(e - this.cursorPos).value, this.cursorPos = e + this.string.length, this.cursorPos - this.string.length;
	}
	chunk(e) {
		return this.syncTo(e), this.string;
	}
	get lineChunks() {
		return !0;
	}
	read(e, t) {
		let n = this.cursorPos - this.string.length;
		return e < n || t >= this.cursorPos ? this.doc.sliceString(e, t) : this.string.slice(e - n, t - n);
	}
}, Su = null, Cu = class e {
	constructor(e, t, n = [], r, i, a, o, s) {
		this.parser = e, this.state = t, this.fragments = n, this.tree = r, this.treeLen = i, this.viewport = a, this.skipped = o, this.scheduleOn = s, this.parse = null, this.tempSkipped = [];
	}
	static create(t, n, r) {
		return new e(t, n, [], yl.empty, 0, r, [], null);
	}
	startParse() {
		return this.parser.startParse(new xu(this.state.doc), this.fragments);
	}
	work(e, t) {
		return t != null && t >= this.state.doc.length && (t = void 0), this.tree != yl.empty && this.isDone(t ?? this.state.doc.length) ? (this.takeTree(), !0) : this.withContext(() => {
			if (typeof e == "number") {
				let t = Date.now() + e;
				e = () => Date.now() > t;
			}
			for (this.parse ||= this.startParse(), t != null && (this.parse.stoppedAt == null || this.parse.stoppedAt > t) && t < this.state.doc.length && this.parse.stopAt(t);;) {
				let n = this.parse.advance();
				if (n) {
					if (this.fragments = this.withoutTempSkipped(zl.addTree(n, this.fragments, this.parse.stoppedAt != null)), this.treeLen = this.parse.stoppedAt ?? this.state.doc.length, this.tree = n, this.parse = null, this.treeLen < (t ?? this.state.doc.length)) this.parse = this.startParse();
					else return !0;
				}
				if (e()) return !1;
			}
		});
	}
	takeTree() {
		let e, t;
		this.parse && (e = this.parse.parsedPos) >= this.treeLen && ((this.parse.stoppedAt == null || this.parse.stoppedAt > e) && this.parse.stopAt(e), this.withContext(() => {
			for (; !(t = this.parse.advance()););
		}), this.treeLen = e, this.tree = t, this.fragments = this.withoutTempSkipped(zl.addTree(this.tree, this.fragments, !0)), this.parse = null);
	}
	withContext(e) {
		let t = Su;
		Su = this;
		try {
			return e();
		} finally {
			Su = t;
		}
	}
	withoutTempSkipped(e) {
		for (let t; t = this.tempSkipped.pop();) e = wu(e, t.from, t.to);
		return e;
	}
	changes(t, n) {
		let { fragments: r, tree: i, treeLen: a, viewport: o, skipped: s } = this;
		if (this.takeTree(), !t.empty) {
			let e = [];
			if (t.iterChangedRanges((t, n, r, i) => e.push({
				fromA: t,
				toA: n,
				fromB: r,
				toB: i
			})), r = zl.applyChanges(r, e), i = yl.empty, a = 0, o = {
				from: t.mapPos(o.from, -1),
				to: t.mapPos(o.to, 1)
			}, this.skipped.length) {
				s = [];
				for (let e of this.skipped) {
					let n = t.mapPos(e.from, 1), r = t.mapPos(e.to, -1);
					n < r && s.push({
						from: n,
						to: r
					});
				}
			}
		}
		return new e(this.parser, n, r, i, a, o, s, this.scheduleOn);
	}
	updateViewport(e) {
		if (this.viewport.from == e.from && this.viewport.to == e.to) return !1;
		this.viewport = e;
		let t = this.skipped.length;
		for (let t = 0; t < this.skipped.length; t++) {
			let { from: n, to: r } = this.skipped[t];
			n < e.to && r > e.from && (this.fragments = wu(this.fragments, n, r), this.skipped.splice(t--, 1));
		}
		return this.skipped.length >= t ? !1 : (this.reset(), !0);
	}
	reset() {
		this.parse &&= (this.takeTree(), null);
	}
	skipUntilInView(e, t) {
		this.skipped.push({
			from: e,
			to: t
		});
	}
	static getSkippingParser(e) {
		return new class extends Bl {
			createParse(t, n, r) {
				let i = r[0].from, a = r[r.length - 1].to;
				return {
					parsedPos: i,
					advance() {
						let t = Su;
						if (t) {
							for (let e of r) t.tempSkipped.push(e);
							e && (t.scheduleOn = t.scheduleOn ? Promise.all([t.scheduleOn, e]) : e);
						}
						return this.parsedPos = a, new yl(gl.none, [], [], a - i);
					},
					stoppedAt: null,
					stopAt() {}
				};
			}
		}();
	}
	isDone(e) {
		e = Math.min(e, this.state.doc.length);
		let t = this.fragments;
		return this.treeLen >= e && t.length && t[0].from == 0 && t[0].to >= e;
	}
	static get() {
		return Su;
	}
};
function wu(e, t, n) {
	return zl.applyChanges(e, [{
		fromA: t,
		toA: n,
		fromB: t,
		toB: n
	}]);
}
var Tu = class e {
	constructor(e) {
		this.context = e, this.tree = e.tree;
	}
	apply(t) {
		if (!t.docChanged && this.tree == this.context.tree) return this;
		let n = this.context.changes(t.changes, t.state), r = this.context.treeLen == t.startState.doc.length ? void 0 : Math.max(t.changes.mapPos(this.context.treeLen), n.viewport.to);
		return n.work(20, r) || n.takeTree(), new e(n);
	}
	static init(t) {
		let n = Math.min(3e3, t.doc.length), r = Cu.create(t.facet(ku).parser, t, {
			from: 0,
			to: n
		});
		return r.work(20, n) || r.takeTree(), new e(r);
	}
};
vu.state = /*@__PURE__*/ Be.define({
	create: Tu.init,
	update(e, t) {
		for (let e of t.effects) if (e.is(vu.setState)) return e.value;
		return t.startState.facet(ku) == t.state.facet(ku) ? e.apply(t) : Tu.init(t.state);
	}
});
var Eu = (e) => {
	let t = setTimeout(() => e(), 500);
	return () => clearTimeout(t);
};
typeof requestIdleCallback < "u" && (Eu = (e) => {
	let t = -1, n = setTimeout(() => {
		t = requestIdleCallback(e, { timeout: 400 });
	}, 100);
	return () => t < 0 ? clearTimeout(n) : cancelIdleCallback(t);
});
var Du = typeof navigator < "u" && navigator.scheduling?.isInputPending ? () => navigator.scheduling.isInputPending() : null, Ou = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.view = e, this.working = null, this.workScheduled = 0, this.chunkEnd = -1, this.chunkBudget = -1, this.work = this.work.bind(this), this.scheduleWork();
	}
	update(e) {
		let t = this.view.state.field(vu.state).context;
		(t.updateViewport(e.view.viewport) || this.view.viewport.to > t.treeLen) && this.scheduleWork(), (e.docChanged || e.selectionSet) && (this.view.hasFocus && (this.chunkBudget += 50), this.scheduleWork()), this.checkAsyncSchedule(t);
	}
	scheduleWork() {
		if (this.working) return;
		let { state: e } = this.view, t = e.field(vu.state);
		(t.tree != t.context.tree || !t.context.isDone(e.doc.length)) && (this.working = Eu(this.work));
	}
	work(e) {
		this.working = null;
		let t = Date.now();
		if (this.chunkEnd < t && (this.chunkEnd < 0 || this.view.hasFocus) && (this.chunkEnd = t + 3e4, this.chunkBudget = 3e3), this.chunkBudget <= 0) return;
		let { state: n, viewport: { to: r } } = this.view, i = n.field(vu.state);
		if (i.tree == i.context.tree && i.context.isDone(r + 1e5)) return;
		let a = Date.now() + Math.min(this.chunkBudget, 100, e && !Du ? Math.max(25, e.timeRemaining() - 5) : 1e9), o = i.context.treeLen < r && n.doc.length > r + 1e3, s = i.context.work(() => Du && Du() || Date.now() > a, r + (o ? 0 : 1e5));
		this.chunkBudget -= Date.now() - t, (s || this.chunkBudget <= 0) && (i.context.takeTree(), this.view.dispatch({ effects: vu.setState.of(new Tu(i.context)) })), this.chunkBudget > 0 && !(s && !o) && this.scheduleWork(), this.checkAsyncSchedule(i.context);
	}
	checkAsyncSchedule(e) {
		e.scheduleOn &&= (this.workScheduled++, e.scheduleOn.then(() => this.scheduleWork()).catch((e) => Rr(this.view.state, e)).then(() => this.workScheduled--), null);
	}
	destroy() {
		this.working && this.working();
	}
	isWorking() {
		return !!(this.working || this.workScheduled > 0);
	}
}, { eventHandlers: { focus() {
	this.scheduleWork();
} } }), ku = /*@__PURE__*/ E.define({
	combine(e) {
		return e.length ? e[0] : null;
	},
	enables: (e) => [
		vu.state,
		Ou,
		z.contentAttributes.compute([e], (t) => {
			let n = t.facet(e);
			return n && n.name ? { "data-language": n.name } : {};
		})
	]
}), Au = /*@__PURE__*/ E.define(), ju = /*@__PURE__*/ E.define({ combine: (e) => {
	if (!e.length) return "  ";
	let t = e[0];
	if (!t || /\S/.test(t) || Array.from(t).some((e) => e != t[0])) throw Error("Invalid indent unit: " + JSON.stringify(e[0]));
	return t;
} });
function Mu(e) {
	let t = e.facet(ju);
	return t.charCodeAt(0) == 9 ? e.tabSize * t.length : t.length;
}
function Nu(e, t) {
	let n = "", r = e.tabSize, i = e.facet(ju)[0];
	if (i == "	") {
		for (; t >= r;) n += "	", t -= r;
		i = " ";
	}
	for (let e = 0; e < t; e++) n += i;
	return n;
}
function Pu(e, t) {
	e instanceof k && (e = new Fu(e));
	for (let n of e.state.facet(Au)) {
		let r = n(e, t);
		if (r !== void 0) return r;
	}
	let n = bu(e.state);
	return n.length >= t ? Lu(e, n, t) : null;
}
var Fu = class {
	constructor(e, t = {}) {
		this.state = e, this.options = t, this.unit = Mu(e);
	}
	lineAt(e, t = 1) {
		let n = this.state.doc.lineAt(e), { simulateBreak: r, simulateDoubleBreak: i } = this.options;
		return r != null && r >= n.from && r <= n.to ? i && r == e ? {
			text: "",
			from: e
		} : (t < 0 ? r < e : r <= e) ? {
			text: n.text.slice(r - n.from),
			from: r
		} : {
			text: n.text.slice(0, r - n.from),
			from: n.from
		} : n;
	}
	textAfterPos(e, t = 1) {
		if (this.options.simulateDoubleBreak && e == this.options.simulateBreak) return "";
		let { text: n, from: r } = this.lineAt(e, t);
		return n.slice(e - r, Math.min(n.length, e + 100 - r));
	}
	column(e, t = 1) {
		let { text: n, from: r } = this.lineAt(e, t), i = this.countColumn(n, e - r), a = this.options.overrideIndentation ? this.options.overrideIndentation(r) : -1;
		return a > -1 && (i += a - this.countColumn(n, n.search(/\S|$/))), i;
	}
	countColumn(e, t = e.length) {
		return Rt(e, this.state.tabSize, t);
	}
	lineIndent(e, t = 1) {
		let { text: n, from: r } = this.lineAt(e, t), i = this.options.overrideIndentation;
		if (i) {
			let e = i(r);
			if (e > -1) return e;
		}
		return this.countColumn(n, n.search(/\S|$/));
	}
	get simulatedBreak() {
		return this.options.simulateBreak || null;
	}
}, Iu = /*@__PURE__*/ new B();
function Lu(e, t, n) {
	let r = t.resolveStack(n), i = t.resolveInner(n, -1).resolve(n, 0).enterUnfinishedNodesBefore(n);
	if (i != r.node) {
		let e = [];
		for (let t = i; t && !(t.from < r.node.from || t.to > r.node.to || t.from == r.node.from && t.type == r.node.type); t = t.parent) e.push(t);
		for (let t = e.length - 1; t >= 0; t--) r = {
			node: e[t],
			next: r
		};
	}
	return Ru(r, e, n);
}
function Ru(e, t, n) {
	for (let r = e; r; r = r.next) {
		let e = Bu(r.node);
		if (e) return e(Hu.create(t, n, r));
	}
	return 0;
}
function zu(e) {
	return e.pos == e.options.simulateBreak && e.options.simulateDoubleBreak;
}
function Bu(e) {
	let t = e.type.prop(Iu);
	if (t) return t;
	let n = e.firstChild, r;
	if (n && (r = n.type.prop(B.closedBy))) {
		let t = e.lastChild, n = t && r.indexOf(t.name) > -1;
		return (e) => Gu(e, !0, 1, void 0, n && !zu(e) ? t.from : void 0);
	}
	return e.parent == null ? Vu : null;
}
function Vu() {
	return 0;
}
var Hu = class e extends Fu {
	constructor(e, t, n) {
		super(e.state, e.options), this.base = e, this.pos = t, this.context = n;
	}
	get node() {
		return this.context.node;
	}
	static create(t, n, r) {
		return new e(t, n, r);
	}
	get textAfter() {
		return this.textAfterPos(this.pos);
	}
	get baseIndent() {
		return this.baseIndentFor(this.node);
	}
	baseIndentFor(e) {
		let t = this.state.doc.lineAt(e.from);
		for (;;) {
			let n = e.resolve(t.from);
			for (; n.parent && n.parent.from == n.from;) n = n.parent;
			if (Uu(n, e)) break;
			t = this.state.doc.lineAt(n.from);
		}
		return this.lineIndent(t.from);
	}
	continue() {
		return Ru(this.context.next, this.base, this.pos);
	}
};
function Uu(e, t) {
	for (let n = t; n; n = n.parent) if (e == n) return !0;
	return !1;
}
function Wu(e) {
	let t = e.node, n = t.childAfter(t.from), r = t.lastChild;
	if (!n) return null;
	let i = e.options.simulateBreak, a = e.state.doc.lineAt(n.from), o = i == null || i <= a.from ? a.to : Math.min(a.to, i);
	for (let e = n.to;;) {
		let i = t.childAfter(e);
		if (!i || i == r) return null;
		if (!i.type.isSkipped) {
			if (i.from >= o) return null;
			let e = /^ */.exec(a.text.slice(n.to - a.from))[0].length;
			return {
				from: n.from,
				to: n.to + e
			};
		}
		e = i.to;
	}
}
function Gu(e, t, n, r, i) {
	let a = e.textAfter, o = a.match(/^\s*/)[0].length, s = r && a.slice(o, o + r.length) == r || i == e.pos + o, c = t ? Wu(e) : null;
	return c ? s ? e.column(c.from) : e.column(c.to) : e.baseIndent + (s ? 0 : e.unit * n);
}
var Ku = 200;
function qu() {
	return k.transactionFilter.of((e) => {
		if (!e.docChanged || !e.isUserEvent("input.type") && !e.isUserEvent("input.complete")) return e;
		let t = e.startState.languageDataAt("indentOnInput", e.startState.selection.main.head);
		if (!t.length) return e;
		let n = e.newDoc, { head: r } = e.newSelection.main, i = n.lineAt(r);
		if (r > i.from + Ku) return e;
		let a = n.sliceString(i.from, r);
		if (!t.some((e) => e.test(a))) return e;
		let { state: o } = e, s = -1, c = [];
		for (let { head: e } of o.selection.ranges) {
			let t = o.doc.lineAt(e);
			if (t.from == s) continue;
			s = t.from;
			let n = Pu(o, t.from);
			if (n == null) continue;
			let r = /^\s*/.exec(t.text)[0], i = Nu(o, n);
			r != i && c.push({
				from: t.from,
				to: t.from + r.length,
				insert: i
			});
		}
		return c.length ? [e, {
			changes: c,
			sequential: !0
		}] : e;
	});
}
var Ju = /*@__PURE__*/ E.define(), Yu = /*@__PURE__*/ new B();
function Xu(e, t, n) {
	let r = bu(e);
	if (r.length < n) return null;
	let i = r.resolveStack(n, 1), a = null;
	for (let o = i; o; o = o.next) {
		let i = o.node;
		if (i.to <= n || i.from > n) continue;
		if (a && i.from < t) break;
		let s = i.type.prop(Yu);
		if (s && (i.to < r.length - 50 || r.length == e.doc.length || !Zu(i))) {
			let r = s(i, e);
			r && r.from <= n && r.from >= t && r.to > n && (a = r);
		}
	}
	return a;
}
function Zu(e) {
	let t = e.lastChild;
	return t && t.to == e.to && t.type.isError;
}
function Qu(e, t, n) {
	for (let r of e.facet(Ju)) {
		let i = r(e, t, n);
		if (i) return i;
	}
	return Xu(e, t, n);
}
function $u(e, t) {
	let n = t.mapPos(e.from, 1), r = t.mapPos(e.to, -1);
	return n >= r ? void 0 : {
		from: n,
		to: r
	};
}
var ed = /*@__PURE__*/ D.define({ map: $u }), td = /*@__PURE__*/ D.define({ map: $u });
function nd(e) {
	let t = [];
	for (let { head: n } of e.state.selection.ranges) t.some((e) => e.from <= n && e.to >= n) || t.push(e.lineBlockAt(n));
	return t;
}
var rd = /*@__PURE__*/ Be.define({
	create() {
		return N.none;
	},
	update(e, t) {
		t.isUserEvent("delete") && t.changes.iterChangedRanges((t, n) => e = id(e, t, n)), e = e.map(t.changes);
		let n = [];
		for (let r of t.effects) r.is(ed) && !od(e, r.value.from, r.value.to) ? n.push(r.value) : r.is(td) && (e = e.update({
			filter: (e, t) => r.value.from != e || r.value.to != t,
			filterFrom: r.value.from,
			filterTo: r.value.to
		}));
		if (n.length) {
			let { preparePlaceholder: r } = t.state.facet(pd), i = n.map((e) => (r ? N.replace({ widget: new _d(r(t.state, e)) }) : gd).range(e.from, e.to));
			e = e.update({ add: i });
		}
		return t.selection && (e = id(e, t.selection.main.head)), e;
	},
	provide: (e) => z.decorations.from(e),
	toJSON(e, t) {
		let n = [];
		return e.between(0, t.doc.length, (e, t) => {
			n.push(e, t);
		}), n;
	},
	fromJSON(e) {
		if (!Array.isArray(e) || e.length % 2) throw RangeError("Invalid JSON for fold state");
		let t = [];
		for (let n = 0; n < e.length;) {
			let r = e[n++], i = e[n++];
			if (typeof r != "number" || typeof i != "number") throw RangeError("Invalid JSON for fold state");
			t.push(gd.range(r, i));
		}
		return N.set(t, !0);
	}
});
function id(e, t, n = t) {
	let r = !1;
	return e.between(t, n, (e, i) => {
		e < n && i > t && (r = !0);
	}), r ? e.update({
		filterFrom: t,
		filterTo: n,
		filter: (e, r) => e >= n || r <= t
	}) : e;
}
function ad(e, t, n) {
	var r;
	let i = null;
	return (r = e.field(rd, !1)) == null || r.between(t, n, (e, t) => {
		(!i || i.from > e) && (i = {
			from: e,
			to: t
		});
	}), i;
}
function od(e, t, n) {
	let r = !1;
	return e.between(t, t, (e, i) => {
		e == t && i == n && (r = !0);
	}), r;
}
function sd(e, t) {
	return e.field(rd, !1) ? t : t.concat(D.appendConfig.of(md()));
}
var cd = (e) => {
	for (let t of nd(e)) {
		let n = Qu(e.state, t.from, t.to);
		if (n) return e.dispatch({ effects: sd(e.state, [ed.of(n), ud(e, n)]) }), !0;
	}
	return !1;
}, ld = (e) => {
	if (!e.state.field(rd, !1)) return !1;
	let t = [];
	for (let n of nd(e)) {
		let r = ad(e.state, n.from, n.to);
		r && t.push(td.of(r), ud(e, r, !1));
	}
	return t.length && e.dispatch({ effects: t }), t.length > 0;
};
function ud(e, t, n = !0) {
	let r = e.state.doc.lineAt(t.from).number, i = e.state.doc.lineAt(t.to).number;
	return z.announce.of(`${e.state.phrase(n ? "Folded lines" : "Unfolded lines")} ${r} ${e.state.phrase("to")} ${i}.`);
}
var dd = [
	{
		key: "Ctrl-Shift-[",
		mac: "Cmd-Alt-[",
		run: cd
	},
	{
		key: "Ctrl-Shift-]",
		mac: "Cmd-Alt-]",
		run: ld
	},
	{
		key: "Ctrl-Alt-[",
		run: (e) => {
			let { state: t } = e, n = [];
			for (let r = 0; r < t.doc.length;) {
				let i = e.lineBlockAt(r), a = Qu(t, i.from, i.to);
				a && n.push(ed.of(a)), r = (a ? e.lineBlockAt(a.to) : i).to + 1;
			}
			return n.length && e.dispatch({ effects: sd(e.state, n) }), !!n.length;
		}
	},
	{
		key: "Ctrl-Alt-]",
		run: (e) => {
			let t = e.state.field(rd, !1);
			if (!t || !t.size) return !1;
			let n = [];
			return t.between(0, e.state.doc.length, (e, t) => {
				n.push(td.of({
					from: e,
					to: t
				}));
			}), e.dispatch({ effects: n }), !0;
		}
	}
], fd = {
	placeholderDOM: null,
	preparePlaceholder: null,
	placeholderText: "…"
}, pd = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, fd);
} });
function md(e) {
	let t = [rd, xd];
	return e && t.push(pd.of(e)), t;
}
function hd(e, t) {
	let { state: n } = e, r = n.facet(pd), i = (t) => {
		let n = e.lineBlockAt(e.posAtDOM(t.target)), r = ad(e.state, n.from, n.to);
		r && e.dispatch({ effects: td.of(r) }), t.preventDefault();
	};
	if (r.placeholderDOM) return r.placeholderDOM(e, i, t);
	let a = document.createElement("span");
	return a.textContent = r.placeholderText, a.setAttribute("aria-label", n.phrase("folded code")), a.title = n.phrase("unfold"), a.className = "cm-foldPlaceholder", a.onclick = i, a;
}
var gd = /*@__PURE__*/ N.replace({ widget: /*@__PURE__*/ new class extends yn {
	toDOM(e) {
		return hd(e, null);
	}
}() }), _d = class extends yn {
	constructor(e) {
		super(), this.value = e;
	}
	eq(e) {
		return this.value == e.value;
	}
	toDOM(e) {
		return hd(e, this.value);
	}
}, vd = {
	openText: "⌄",
	closedText: "›",
	markerDOM: null,
	domEventHandlers: {},
	foldingChanged: () => !1
}, yd = class extends zc {
	constructor(e, t) {
		super(), this.config = e, this.open = t;
	}
	eq(e) {
		return this.config == e.config && this.open == e.open;
	}
	toDOM(e) {
		if (this.config.markerDOM) return this.config.markerDOM(this.open);
		let t = document.createElement("span");
		return t.textContent = this.open ? this.config.openText : this.config.closedText, t.title = e.state.phrase(this.open ? "Fold line" : "Unfold line"), t;
	}
};
function bd(e = {}) {
	let t = {
		...vd,
		...e
	}, n = new yd(t, !0), r = new yd(t, !1), i = I.fromClass(class {
		constructor(e) {
			this.from = e.viewport.from, this.markers = this.buildMarkers(e);
		}
		update(e) {
			(e.docChanged || e.viewportChanged || e.startState.facet(ku) != e.state.facet(ku) || e.startState.field(rd, !1) != e.state.field(rd, !1) || bu(e.startState) != bu(e.state) || t.foldingChanged(e)) && (this.markers = this.buildMarkers(e.view));
		}
		buildMarkers(e) {
			let t = new Dt();
			for (let i of e.viewportLineBlocks) {
				let a = ad(e.state, i.from, i.to) ? r : Qu(e.state, i.from, i.to) ? n : null;
				a && t.add(i.from, i.from, a);
			}
			return t.finish();
		}
	}), { domEventHandlers: a } = t;
	return [
		i,
		Wc({
			class: "cm-foldGutter",
			markers(e) {
				return e.plugin(i)?.markers || A.empty;
			},
			initialSpacer() {
				return new yd(t, !1);
			},
			domEventHandlers: {
				...a,
				click: (e, t, n) => {
					if (a.click && a.click(e, t, n)) return !0;
					let r = ad(e.state, t.from, t.to);
					if (r) return e.dispatch({ effects: td.of(r) }), !0;
					let i = Qu(e.state, t.from, t.to);
					return i ? (e.dispatch({ effects: ed.of(i) }), !0) : !1;
				}
			}
		}),
		md()
	];
}
var xd = /*@__PURE__*/ z.baseTheme({
	".cm-foldPlaceholder": {
		backgroundColor: "#eee",
		border: "1px solid #ddd",
		color: "#888",
		borderRadius: ".2em",
		margin: "0 1px",
		padding: "0 1px",
		cursor: "pointer"
	},
	".cm-foldGutter span": {
		padding: "0 1px",
		cursor: "pointer"
	}
}), Sd = class e {
	constructor(e, t) {
		this.specs = e;
		let n;
		function r(e) {
			let t = Wt.newName();
			return (n ||= Object.create(null))["." + t] = e, t;
		}
		let i = typeof t.all == "string" ? t.all : t.all ? r(t.all) : void 0, a = t.scope;
		this.scope = a instanceof vu ? (e) => e.prop(gu) == a.data : a ? (e) => e == a : void 0, this.style = Zl(e.map((e) => ({
			tag: e.tag,
			class: e.class || r(Object.assign({}, e, { tag: null }))
		})), { all: i }).style, this.module = n ? new Wt(n) : null, this.themeType = t.themeType;
	}
	static define(t, n) {
		return new e(t, n || {});
	}
}, Cd = /*@__PURE__*/ E.define(), wd = /*@__PURE__*/ E.define({ combine(e) {
	return e.length ? [e[0]] : null;
} });
function Td(e) {
	let t = e.facet(Cd);
	return t.length ? t : e.facet(wd);
}
function Ed(e, t) {
	let n = [Od], r;
	return e instanceof Sd && (e.module && n.push(z.styleModule.of(e.module)), r = e.themeType), t?.fallback ? n.push(wd.of(e)) : r ? n.push(Cd.computeN([z.darkTheme], (t) => t.facet(z.darkTheme) == (r == "dark") ? [e] : [])) : n.push(Cd.of(e)), n;
}
var Dd = class {
	constructor(e) {
		this.markCache = Object.create(null), this.tree = bu(e.state), this.decorations = this.buildDeco(e, Td(e.state)), this.decoratedTo = e.viewport.to;
	}
	update(e) {
		let t = bu(e.state), n = Td(e.state), r = n != Td(e.startState), { viewport: i } = e.view, a = e.changes.mapPos(this.decoratedTo, 1);
		t.length < i.to && !r && t.type == this.tree.type && a >= i.to ? (this.decorations = this.decorations.map(e.changes), this.decoratedTo = a) : (t != this.tree || e.viewportChanged || r) && (this.tree = t, this.decorations = this.buildDeco(e.view, n), this.decoratedTo = i.to);
	}
	buildDeco(e, t) {
		if (!t || !this.tree.length) return N.none;
		let n = new Dt();
		for (let { from: r, to: i } of e.visibleRanges) $l(this.tree, t, (e, t, r) => {
			n.add(e, t, this.markCache[r] || (this.markCache[r] = N.mark({ class: r })));
		}, r, i);
		return n.finish();
	}
}, Od = /*@__PURE__*/ Ue.high(/*@__PURE__*/ I.fromClass(Dd, { decorations: (e) => e.decorations })), kd = /*@__PURE__*/ Sd.define([
	{
		tag: U.meta,
		color: "#404740"
	},
	{
		tag: U.link,
		textDecoration: "underline"
	},
	{
		tag: U.heading,
		textDecoration: "underline",
		fontWeight: "bold"
	},
	{
		tag: U.emphasis,
		fontStyle: "italic"
	},
	{
		tag: U.strong,
		fontWeight: "bold"
	},
	{
		tag: U.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: U.keyword,
		color: "#708"
	},
	{
		tag: [
			U.atom,
			U.bool,
			U.url,
			U.contentSeparator,
			U.labelName
		],
		color: "#219"
	},
	{
		tag: [U.literal, U.inserted],
		color: "#164"
	},
	{
		tag: [U.string, U.deleted],
		color: "#a11"
	},
	{
		tag: [
			U.regexp,
			U.escape,
			/*@__PURE__*/ U.special(U.string)
		],
		color: "#e40"
	},
	{
		tag: /*@__PURE__*/ U.definition(U.variableName),
		color: "#00f"
	},
	{
		tag: /*@__PURE__*/ U.local(U.variableName),
		color: "#30a"
	},
	{
		tag: [U.typeName, U.namespace],
		color: "#085"
	},
	{
		tag: U.className,
		color: "#167"
	},
	{
		tag: [/*@__PURE__*/ U.special(U.variableName), U.macroName],
		color: "#256"
	},
	{
		tag: /*@__PURE__*/ U.definition(U.propertyName),
		color: "#00c"
	},
	{
		tag: U.comment,
		color: "#940"
	},
	{
		tag: U.invalid,
		color: "#f00"
	}
]), Ad = /*@__PURE__*/ z.baseTheme({
	"&.cm-focused .cm-matchingBracket": { backgroundColor: "#328c8252" },
	"&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "#bb555544" }
}), jd = 1e4, Md = "()[]{}", Nd = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, {
		afterCursor: !0,
		brackets: Md,
		maxScanDistance: jd,
		renderMatch: Id
	});
} }), Pd = /*@__PURE__*/ N.mark({ class: "cm-matchingBracket" }), Fd = /*@__PURE__*/ N.mark({ class: "cm-nonmatchingBracket" });
function Id(e) {
	let t = [], n = e.matched ? Pd : Fd;
	return t.push(n.range(e.start.from, e.start.to)), e.end && t.push(n.range(e.end.from, e.end.to)), t;
}
function Ld(e) {
	let t = [], n = e.facet(Nd);
	for (let r of e.selection.ranges) {
		if (!r.empty) continue;
		let i = Ud(e, r.head, -1, n) || r.head > 0 && Ud(e, r.head - 1, 1, n) || n.afterCursor && (Ud(e, r.head, 1, n) || r.head < e.doc.length && Ud(e, r.head + 1, -1, n));
		i && (t = t.concat(n.renderMatch(i, e)));
	}
	return N.set(t, !0);
}
var Rd = [/* @__PURE__ */ I.fromClass(class {
	constructor(e) {
		this.paused = !1, this.decorations = Ld(e.state);
	}
	update(e) {
		(e.docChanged || e.selectionSet || this.paused) && (e.view.composing ? (this.decorations = this.decorations.map(e.changes), this.paused = !0) : (this.decorations = Ld(e.state), this.paused = !1));
	}
}, { decorations: (e) => e.decorations }), Ad];
function zd(e = {}) {
	return [Nd.of(e), Rd];
}
var Bd = /*@__PURE__*/ new B();
function Vd(e, t, n) {
	let r = e.prop(t < 0 ? B.openedBy : B.closedBy);
	if (r) return r;
	if (e.name.length == 1) {
		let r = n.indexOf(e.name);
		if (r > -1 && r % 2 == +(t < 0)) return [n[r + t]];
	}
	return null;
}
function Hd(e) {
	let t = e.type.prop(Bd);
	return t ? t(e.node) : e;
}
function Ud(e, t, n, r = {}) {
	let i = r.maxScanDistance || jd, a = r.brackets || Md, o = bu(e), s = o.resolveInner(t, n);
	for (let r = s; r; r = r.parent) {
		let i = Vd(r.type, n, a);
		if (i && r.from < r.to) {
			let o = Hd(r);
			if (o && (n > 0 ? t >= o.from && t < o.to : t > o.from && t <= o.to)) return Wd(e, t, n, r, o, i, a);
		}
	}
	return Gd(e, t, n, o, s.type, i, a);
}
function Wd(e, t, n, r, i, a, o) {
	let s = r.parent, c = {
		from: i.from,
		to: i.to
	}, l = 0, u = s?.cursor();
	if (u && (n < 0 ? u.childBefore(r.from) : u.childAfter(r.to))) do
		if (n < 0 ? u.to <= r.from : u.from >= r.to) {
			if (l == 0 && a.indexOf(u.type.name) > -1 && u.from < u.to) {
				let e = Hd(u);
				return {
					start: c,
					end: e ? {
						from: e.from,
						to: e.to
					} : void 0,
					matched: !0
				};
			}
			if (Vd(u.type, n, o)) l++;
			else if (Vd(u.type, -n, o)) {
				if (l == 0) {
					let e = Hd(u);
					return {
						start: c,
						end: e && e.from < e.to ? {
							from: e.from,
							to: e.to
						} : void 0,
						matched: !1
					};
				}
				l--;
			}
		}
	while (n < 0 ? u.prevSibling() : u.nextSibling());
	return {
		start: c,
		matched: !1
	};
}
function Gd(e, t, n, r, i, a, o) {
	if (n < 0 ? !t : t == e.doc.length) return null;
	let s = n < 0 ? e.sliceDoc(t - 1, t) : e.sliceDoc(t, t + 1), c = o.indexOf(s);
	if (c < 0 || c % 2 == 0 != n > 0) return null;
	let l = {
		from: n < 0 ? t - 1 : t,
		to: n > 0 ? t + 1 : t
	}, u = e.doc.iterRange(t, n > 0 ? e.doc.length : 0), d = 0;
	for (let e = 0; !u.next().done && e <= a;) {
		let a = u.value;
		n < 0 && (e += a.length);
		let s = t + e * n;
		for (let e = n > 0 ? 0 : a.length - 1, t = n > 0 ? a.length : -1; e != t; e += n) {
			let t = o.indexOf(a[e]);
			if (!(t < 0 || r.resolveInner(s + e, 1).type != i)) {
				if (t % 2 == 0 == n > 0) d++;
				else if (d == 1) return {
					start: l,
					end: {
						from: s + e,
						to: s + e + 1
					},
					matched: t >> 1 == c >> 1
				};
				else d--;
			}
		}
		n > 0 && (e += a.length);
	}
	return u.done ? {
		start: l,
		matched: !1
	} : null;
}
var Kd = /*@__PURE__*/ Object.create(null), qd = [gl.none], Jd = [], Yd = /*@__PURE__*/ Object.create(null), Xd = /*@__PURE__*/ Object.create(null);
for (let [e, t] of [
	["variable", "variableName"],
	["variable-2", "variableName.special"],
	["string-2", "string.special"],
	["def", "variableName.definition"],
	["tag", "tagName"],
	["attribute", "attributeName"],
	["type", "typeName"],
	["builtin", "variableName.standard"],
	["qualifier", "modifier"],
	["error", "invalid"],
	["header", "heading"],
	["property", "propertyName"]
]) Xd[e] = /*@__PURE__*/ Qd(Kd, t);
function Zd(e, t) {
	Jd.indexOf(e) > -1 || (Jd.push(e), console.warn(t));
}
function Qd(e, t) {
	let n = [];
	for (let r of t.split(" ")) {
		let t = [];
		for (let n of r.split(".")) {
			let r = e[n] || U[n];
			r ? typeof r == "function" ? t.length ? t = t.map(r) : Zd(n, `Modifier ${n} used at start of tag`) : t.length ? Zd(n, `Tag ${n} used as modifier`) : t = Array.isArray(r) ? r : [r] : Zd(n, `Unknown highlighting tag ${n}`);
		}
		for (let e of t) n.push(e);
	}
	if (!n.length) return 0;
	let r = t.replace(/ /g, "_"), i = r + " " + n.map((e) => e.id), a = Yd[i];
	if (a) return a.id;
	let o = Yd[i] = gl.define({
		id: qd.length,
		name: r,
		props: [Jl({ [r]: n })]
	});
	return qd.push(o), o.id;
}
P.RTL, P.LTR;
//#endregion
//#region node_modules/@codemirror/commands/dist/index.js
var $d = (e) => {
	let { state: t } = e, n = t.doc.lineAt(t.selection.main.from), r = af(e.state, n.from);
	return r.line ? tf(e) : r.block ? rf(e) : !1;
};
function ef(e, t) {
	return ({ state: n, dispatch: r }) => {
		if (n.readOnly) return !1;
		let i = e(t, n);
		return i ? (r(n.update(i)), !0) : !1;
	};
}
var tf = /*@__PURE__*/ ef(uf, 0), nf = /*@__PURE__*/ ef(lf, 0), rf = /*@__PURE__*/ ef((e, t) => lf(e, t, cf(t)), 0);
function af(e, t) {
	let n = e.languageDataAt("commentTokens", t, 1);
	return n.length ? n[0] : {};
}
var of = 50;
function sf(e, { open: t, close: n }, r, i) {
	let a = e.sliceDoc(r - of, r), o = e.sliceDoc(i, i + of), s = /\s*$/.exec(a)[0].length, c = /^\s*/.exec(o)[0].length, l = a.length - s;
	if (a.slice(l - t.length, l) == t && o.slice(c, c + n.length) == n) return {
		open: {
			pos: r - s,
			margin: s && 1
		},
		close: {
			pos: i + c,
			margin: c && 1
		}
	};
	let u, d;
	i - r <= 100 ? u = d = e.sliceDoc(r, i) : (u = e.sliceDoc(r, r + of), d = e.sliceDoc(i - of, i));
	let f = /^\s*/.exec(u)[0].length, p = /\s*$/.exec(d)[0].length, m = d.length - p - n.length;
	return u.slice(f, f + t.length) == t && d.slice(m, m + n.length) == n ? {
		open: {
			pos: r + f + t.length,
			margin: +!!/\s/.test(u.charAt(f + t.length))
		},
		close: {
			pos: i - p - n.length,
			margin: +!!/\s/.test(d.charAt(m - 1))
		}
	} : null;
}
function cf(e) {
	let t = [];
	for (let n of e.selection.ranges) {
		let r = e.doc.lineAt(n.from), i = n.to <= r.to ? r : e.doc.lineAt(n.to);
		i.from > r.from && i.from == n.to && (i = n.to == r.to + 1 ? r : e.doc.lineAt(n.to - 1));
		let a = t.length - 1;
		a >= 0 && t[a].to > r.from ? t[a].to = i.to : t.push({
			from: r.from + /^\s*/.exec(r.text)[0].length,
			to: i.to
		});
	}
	return t;
}
function lf(e, t, n = t.selection.ranges) {
	let r = n.map((e) => af(t, e.from).block);
	if (!r.every((e) => e)) return null;
	let i = n.map((e, n) => sf(t, r[n], e.from, e.to));
	if (e != 2 && !i.every((e) => e)) return { changes: t.changes(n.map((e, t) => i[t] ? [] : [{
		from: e.from,
		insert: r[t].open + " "
	}, {
		from: e.to,
		insert: " " + r[t].close
	}])) };
	if (e != 1 && i.some((e) => e)) {
		let e = [];
		for (let t = 0, n; t < i.length; t++) if (n = i[t]) {
			let i = r[t], { open: a, close: o } = n;
			e.push({
				from: a.pos - i.open.length,
				to: a.pos + a.margin
			}, {
				from: o.pos - o.margin,
				to: o.pos + i.close.length
			});
		}
		return { changes: e };
	}
	return null;
}
function uf(e, t, n = t.selection.ranges) {
	let r = [], i = -1;
	ranges: for (let { from: e, to: a } of n) {
		let n = r.length, o = 1e9, s;
		for (let n = e; n <= a;) {
			let c = t.doc.lineAt(n);
			if (s == null && (s = af(t, c.from).line, !s)) continue ranges;
			if (c.from > i && (e == a || a > c.from)) {
				i = c.from;
				let e = /^\s*/.exec(c.text)[0].length, t = e == c.length, n = c.text.slice(e, e + s.length) == s ? e : -1;
				e < c.text.length && e < o && (o = e), r.push({
					line: c,
					comment: n,
					token: s,
					indent: e,
					empty: t,
					single: !1
				});
			}
			n = c.to + 1;
		}
		if (o < 1e9) for (let e = n; e < r.length; e++) r[e].indent < r[e].line.text.length && (r[e].indent = o);
		r.length == n + 1 && (r[n].single = !0);
	}
	if (e != 2 && r.some((e) => e.comment < 0 && (!e.empty || e.single))) {
		let e = [];
		for (let { line: t, token: n, indent: i, empty: a, single: o } of r) (o || !a) && e.push({
			from: t.from + i,
			insert: n + " "
		});
		let n = t.changes(e);
		return {
			changes: n,
			selection: t.selection.map(n, 1)
		};
	}
	if (e != 1 && r.some((e) => e.comment >= 0)) {
		let e = [];
		for (let { line: t, comment: n, token: i } of r) if (n >= 0) {
			let r = t.from + n, a = r + i.length;
			t.text[a - t.from] == " " && a++, e.push({
				from: r,
				to: a
			});
		}
		return { changes: e };
	}
	return null;
}
var df = /*@__PURE__*/ it.define(), ff = /*@__PURE__*/ it.define(), pf = /*@__PURE__*/ E.define(), mf = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, {
		minDepth: 100,
		newGroupDelay: 500,
		joinToEvent: (e, t) => t
	}, {
		minDepth: Math.max,
		newGroupDelay: Math.min,
		joinToEvent: (e, t) => (n, r) => e(n, r) || t(n, r)
	});
} }), hf = /*@__PURE__*/ Be.define({
	create() {
		return Pf.empty;
	},
	update(e, t) {
		let n = t.state.facet(mf), r = t.annotation(df);
		if (r) {
			let i = Sf.fromTransaction(t, r.selection), a = r.side, o = a == 0 ? e.undone : e.done;
			return o = i ? Cf(o, o.length, n.minDepth, i) : kf(o, t.startState.selection), new Pf(a == 0 ? r.rest : o, a == 0 ? o : r.rest);
		}
		let i = t.annotation(ff);
		if ((i == "full" || i == "before") && (e = e.isolate()), t.annotation(st.addToHistory) === !1) return t.changes.empty ? e : e.addMapping(t.changes.desc);
		let a = Sf.fromTransaction(t), o = t.annotation(st.time), s = t.annotation(st.userEvent);
		return a ? e = e.addChanges(a, o, s, n, t) : t.selection && (e = e.addSelection(t.startState.selection, o, s, n.newGroupDelay)), (i == "full" || i == "after") && (e = e.isolate()), e;
	},
	toJSON(e) {
		return {
			done: e.done.map((e) => e.toJSON()),
			undone: e.undone.map((e) => e.toJSON())
		};
	},
	fromJSON(e) {
		return new Pf(e.done.map(Sf.fromJSON), e.undone.map(Sf.fromJSON));
	}
});
function gf(e = {}) {
	return [
		hf,
		mf.of(e),
		z.domEventHandlers({ beforeinput(e, t) {
			let n = e.inputType == "historyUndo" ? vf : e.inputType == "historyRedo" ? yf : null;
			return n ? (e.preventDefault(), n(t)) : !1;
		} })
	];
}
function _f(e, t) {
	return function({ state: n, dispatch: r }) {
		if (!t && n.readOnly) return !1;
		let i = n.field(hf, !1);
		if (!i) return !1;
		let a = i.pop(e, n, t);
		return a ? (r(a), !0) : !1;
	};
}
var vf = /*@__PURE__*/ _f(0, !1), yf = /*@__PURE__*/ _f(1, !1), bf = /*@__PURE__*/ _f(0, !0), xf = /*@__PURE__*/ _f(1, !0), Sf = class e {
	constructor(e, t, n, r, i) {
		this.changes = e, this.effects = t, this.mapped = n, this.startSelection = r, this.selectionsAfter = i;
	}
	setSelAfter(t) {
		return new e(this.changes, this.effects, this.mapped, this.startSelection, t);
	}
	toJSON() {
		return {
			changes: this.changes?.toJSON(),
			mapped: this.mapped?.toJSON(),
			startSelection: this.startSelection?.toJSON(),
			selectionsAfter: this.selectionsAfter.map((e) => e.toJSON())
		};
	}
	static fromJSON(t) {
		return new e(t.changes && we.fromJSON(t.changes), [], t.mapped && Ce.fromJSON(t.mapped), t.startSelection && T.fromJSON(t.startSelection), t.selectionsAfter.map(T.fromJSON));
	}
	static fromTransaction(t, n) {
		let r = Df;
		for (let e of t.startState.facet(pf)) {
			let n = e(t);
			n.length && (r = r.concat(n));
		}
		return !r.length && t.changes.empty ? null : new e(t.changes.invert(t.startState.doc), r, void 0, n || t.startState.selection, Df);
	}
	static selection(t) {
		return new e(void 0, Df, void 0, void 0, t);
	}
};
function Cf(e, t, n, r) {
	let i = t + 1 > n + 20 ? t - n - 1 : 0, a = e.slice(i, t);
	return a.push(r), a;
}
function wf(e, t) {
	let n = [], r = !1;
	return e.iterChangedRanges((e, t) => n.push(e, t)), t.iterChangedRanges((e, t, i, a) => {
		for (let e = 0; e < n.length;) {
			let t = n[e++], o = n[e++];
			a >= t && i <= o && (r = !0);
		}
	}), r;
}
function Tf(e, t) {
	return e.ranges.length == t.ranges.length && e.ranges.filter((e, n) => e.empty != t.ranges[n].empty).length === 0;
}
function Ef(e, t) {
	return e.length ? t.length ? e.concat(t) : e : t;
}
var Df = [], Of = 200;
function kf(e, t) {
	if (e.length) {
		let n = e[e.length - 1], r = n.selectionsAfter.slice(Math.max(0, n.selectionsAfter.length - Of));
		return r.length && r[r.length - 1].eq(t) ? e : (r.push(t), Cf(e, e.length - 1, 1e9, n.setSelAfter(r)));
	}
	return [Sf.selection([t])];
}
function Af(e) {
	let t = e[e.length - 1], n = e.slice();
	return n[e.length - 1] = t.setSelAfter(t.selectionsAfter.slice(0, t.selectionsAfter.length - 1)), n;
}
function jf(e, t) {
	if (!e.length) return e;
	let n = e.length, r = Df;
	for (; n;) {
		let i = Mf(e[n - 1], t, r);
		if (i.changes && !i.changes.empty || i.effects.length) {
			let t = e.slice(0, n);
			return t[n - 1] = i, t;
		}
		t = i.mapped, n--, r = i.selectionsAfter;
	}
	return r.length ? [Sf.selection(r)] : Df;
}
function Mf(e, t, n) {
	let r = Ef(e.selectionsAfter.length ? e.selectionsAfter.map((e) => e.map(t)) : Df, n);
	if (!e.changes) return Sf.selection(r);
	let i = e.changes.map(t), a = t.mapDesc(e.changes, !0), o = e.mapped ? e.mapped.composeDesc(a) : a;
	return new Sf(i, D.mapEffects(e.effects, t), o, e.startSelection.map(a), r);
}
var Nf = /^(input\.type|delete)($|\.)/, Pf = class e {
	constructor(e, t, n = 0, r = void 0) {
		this.done = e, this.undone = t, this.prevTime = n, this.prevUserEvent = r;
	}
	isolate() {
		return this.prevTime ? new e(this.done, this.undone) : this;
	}
	addChanges(t, n, r, i, a) {
		let o = this.done, s = o[o.length - 1];
		return o = s && s.changes && !s.changes.empty && t.changes && (!r || Nf.test(r)) && (!s.selectionsAfter.length && n - this.prevTime < i.newGroupDelay && i.joinToEvent(a, wf(s.changes, t.changes)) || r == "input.type.compose") ? Cf(o, o.length - 1, i.minDepth, new Sf(t.changes.compose(s.changes), Ef(D.mapEffects(t.effects, s.changes), s.effects), s.mapped, s.startSelection, Df)) : Cf(o, o.length, i.minDepth, t), new e(o, Df, n, r);
	}
	addSelection(t, n, r, i) {
		let a = this.done.length ? this.done[this.done.length - 1].selectionsAfter : Df;
		return a.length > 0 && n - this.prevTime < i && r == this.prevUserEvent && r && /^select($|\.)/.test(r) && Tf(a[a.length - 1], t) ? this : new e(kf(this.done, t), this.undone, n, r);
	}
	addMapping(t) {
		return new e(jf(this.done, t), jf(this.undone, t), this.prevTime, this.prevUserEvent);
	}
	pop(e, t, n) {
		let r = e == 0 ? this.done : this.undone;
		if (r.length == 0) return null;
		let i = r[r.length - 1], a = i.selectionsAfter[0] || (i.startSelection ? i.startSelection.map(i.changes.invertedDesc, 1) : t.selection);
		if (n && i.selectionsAfter.length) return t.update({
			selection: i.selectionsAfter[i.selectionsAfter.length - 1],
			annotations: df.of({
				side: e,
				rest: Af(r),
				selection: a
			}),
			userEvent: e == 0 ? "select.undo" : "select.redo",
			scrollIntoView: !0
		});
		if (i.changes) {
			let n = r.length == 1 ? Df : r.slice(0, r.length - 1);
			return i.mapped && (n = jf(n, i.mapped)), t.update({
				changes: i.changes,
				selection: i.startSelection,
				effects: i.effects,
				annotations: df.of({
					side: e,
					rest: n,
					selection: a
				}),
				filter: !1,
				userEvent: e == 0 ? "undo" : "redo",
				scrollIntoView: !0
			});
		}
		return null;
	}
};
Pf.empty = /*@__PURE__*/ new Pf(Df, Df);
var Ff = [
	{
		key: "Mod-z",
		run: vf,
		preventDefault: !0
	},
	{
		key: "Mod-y",
		mac: "Mod-Shift-z",
		run: yf,
		preventDefault: !0
	},
	{
		linux: "Ctrl-Shift-z",
		run: yf,
		preventDefault: !0
	},
	{
		key: "Mod-u",
		run: bf,
		preventDefault: !0
	},
	{
		key: "Alt-u",
		mac: "Mod-Shift-u",
		run: xf,
		preventDefault: !0
	}
];
function If(e, t) {
	return T.create(e.ranges.map(t), e.mainIndex);
}
function Lf(e, t) {
	return e.update({
		selection: t,
		scrollIntoView: !0,
		userEvent: "select"
	});
}
function Rf({ state: e, dispatch: t }, n) {
	let r = If(e.selection, n);
	return !r.eq(e.selection, !0) && (t(Lf(e, r)), !0);
}
function zf(e, t) {
	return T.cursor(t ? e.to : e.from);
}
function Bf(e, t) {
	return Rf(e, (n) => n.empty ? e.moveByChar(n, t) : zf(n, t));
}
function Vf(e) {
	return e.textDirectionAt(e.state.selection.main.head) == P.LTR;
}
var Hf = (e) => Bf(e, !Vf(e)), Uf = (e) => Bf(e, Vf(e));
function Wf(e, t) {
	return Rf(e, (n) => n.empty ? e.moveByGroup(n, t) : zf(n, t));
}
var Gf = (e) => Wf(e, !Vf(e)), Kf = (e) => Wf(e, Vf(e));
typeof Intl < "u" && Intl.Segmenter;
function qf(e, t, n) {
	if (t.type.prop(n)) return !0;
	let r = t.to - t.from;
	return r && (r > 2 || /[^\s,.;:]/.test(e.sliceDoc(t.from, t.to))) || t.firstChild;
}
function Jf(e, t, n) {
	let r = bu(e).resolveInner(t.head), i = n ? B.closedBy : B.openedBy;
	for (let a = t.head;;) {
		let t = n ? r.childAfter(a) : r.childBefore(a);
		if (!t) break;
		qf(e, t, i) ? r = t : a = n ? t.to : t.from;
	}
	let a = r.type.prop(i), o, s;
	return s = a && (o = n ? Ud(e, r.from, 1) : Ud(e, r.to, -1)) && o.matched ? n ? o.end.to : o.end.from : n ? r.to : r.from, T.cursor(s, n ? -1 : 1);
}
var Yf = (e) => Rf(e, (t) => Jf(e.state, t, !Vf(e))), Xf = (e) => Rf(e, (t) => Jf(e.state, t, Vf(e)));
function Zf(e, t) {
	return Rf(e, (n) => {
		if (!n.empty) return zf(n, t);
		let r = e.moveVertically(n, t);
		return r.head == n.head ? e.moveToLineBoundary(n, t) : r;
	});
}
var Qf = (e) => Zf(e, !1), $f = (e) => Zf(e, !0);
function ep(e) {
	let t = e.scrollDOM.clientHeight < e.scrollDOM.scrollHeight - 2, n = 0, r = 0, i;
	if (t) {
		for (let t of e.state.facet(z.scrollMargins)) {
			let i = t(e);
			i?.top && (n = Math.max(i?.top, n)), i?.bottom && (r = Math.max(i?.bottom, r));
		}
		i = e.scrollDOM.clientHeight - n - r;
	} else i = (e.dom.ownerDocument.defaultView || window).innerHeight;
	return {
		marginTop: n,
		marginBottom: r,
		selfScroll: t,
		height: Math.max(e.defaultLineHeight, i - 5)
	};
}
function tp(e, t) {
	let n = ep(e), { state: r } = e, i = If(r.selection, (r) => r.empty ? e.moveVertically(r, t, n.height) : zf(r, t));
	if (i.eq(r.selection)) return !1;
	let a;
	if (n.selfScroll) {
		let t = e.coordsAtPos(r.selection.main.head), o = e.scrollDOM.getBoundingClientRect(), s = o.top + n.marginTop, c = o.bottom - n.marginBottom;
		t && t.top > s && t.bottom < c && (a = z.scrollIntoView(i.main.head, {
			y: "start",
			yMargin: t.top - s
		}));
	}
	return e.dispatch(Lf(r, i), { effects: a }), !0;
}
var np = (e) => tp(e, !1), rp = (e) => tp(e, !0);
function ip(e, t, n) {
	let r = e.lineBlockAt(t.head), i = e.moveToLineBoundary(t, n);
	if (i.head == t.head && i.head != (n ? r.to : r.from) && (i = e.moveToLineBoundary(t, n, !1)), !n && i.head == r.from && r.length) {
		let n = /^\s*/.exec(e.state.sliceDoc(r.from, Math.min(r.from + 100, r.to)))[0].length;
		n && t.head != r.from + n && (i = T.cursor(r.from + n));
	}
	return i;
}
var ap = (e) => Rf(e, (t) => ip(e, t, !0)), op = (e) => Rf(e, (t) => ip(e, t, !1)), sp = (e) => Rf(e, (t) => ip(e, t, !Vf(e))), cp = (e) => Rf(e, (t) => ip(e, t, Vf(e))), lp = (e) => Rf(e, (t) => T.cursor(e.lineBlockAt(t.head).from, 1)), up = (e) => Rf(e, (t) => T.cursor(e.lineBlockAt(t.head).to, -1));
function dp(e, t, n) {
	let r = !1, i = If(e.selection, (t) => {
		let i = Ud(e, t.head, -1) || Ud(e, t.head, 1) || t.head > 0 && Ud(e, t.head - 1, 1) || t.head < e.doc.length && Ud(e, t.head + 1, -1);
		if (!i || !i.end) return t;
		r = !0;
		let a = i.start.from == t.head ? i.end.to : i.end.from;
		return n ? T.range(t.anchor, a) : T.cursor(a);
	});
	return r ? (t(Lf(e, i)), !0) : !1;
}
var fp = ({ state: e, dispatch: t }) => dp(e, t, !1);
function pp(e, t, n) {
	let r = If(e.state.selection, (e) => {
		e.undirectional && e.head >= e.anchor != t && (e = T.range(e.head, e.anchor));
		let r = n(e);
		return T.range(e.anchor, r.head, r.goalColumn, r.bidiLevel || void 0, r.assoc);
	});
	return !r.eq(e.state.selection) && (e.dispatch(Lf(e.state, r)), !0);
}
function mp(e, t) {
	return pp(e, t, (n) => e.moveByChar(n, t));
}
var hp = (e) => mp(e, !Vf(e)), gp = (e) => mp(e, Vf(e));
function _p(e, t) {
	return pp(e, t, (n) => e.moveByGroup(n, t));
}
var vp = (e) => _p(e, !Vf(e)), yp = (e) => _p(e, Vf(e)), bp = (e) => {
	let t = !Vf(e);
	return pp(e, t, (n) => Jf(e.state, n, t));
}, xp = (e) => {
	let t = Vf(e);
	return pp(e, t, (n) => Jf(e.state, n, t));
};
function Sp(e, t) {
	return pp(e, t, (n) => e.moveVertically(n, t));
}
var Cp = (e) => Sp(e, !1), wp = (e) => Sp(e, !0);
function Tp(e, t) {
	return pp(e, t, (n) => e.moveVertically(n, t, ep(e).height));
}
var Ep = (e) => Tp(e, !1), Dp = (e) => Tp(e, !0), Op = (e) => pp(e, !0, (t) => ip(e, t, !0)), kp = (e) => pp(e, !1, (t) => ip(e, t, !1)), Ap = (e) => {
	let t = !Vf(e);
	return pp(e, t, (n) => ip(e, n, t));
}, jp = (e) => {
	let t = Vf(e);
	return pp(e, t, (n) => ip(e, n, t));
}, Mp = (e) => pp(e, !1, (t) => T.cursor(e.lineBlockAt(t.head).from)), Np = (e) => pp(e, !0, (t) => T.cursor(e.lineBlockAt(t.head).to)), Pp = ({ state: e, dispatch: t }) => (t(Lf(e, { anchor: 0 })), !0), Fp = ({ state: e, dispatch: t }) => (t(Lf(e, { anchor: e.doc.length })), !0), Ip = ({ state: e, dispatch: t }) => (t(Lf(e, {
	anchor: e.selection.main.anchor,
	head: 0
})), !0), Lp = ({ state: e, dispatch: t }) => (t(Lf(e, {
	anchor: e.selection.main.anchor,
	head: e.doc.length
})), !0), Rp = ({ state: e, dispatch: t }) => (t(e.update({
	selection: {
		anchor: 0,
		head: e.doc.length
	},
	userEvent: "select"
})), !0), zp = ({ state: e, dispatch: t }) => {
	let n = im(e).map(({ from: t, to: n }) => T.undirectionalRange(t, Math.min(n + 1, e.doc.length)));
	return t(e.update({
		selection: T.create(n),
		userEvent: "select"
	})), !0;
}, Bp = ({ state: e, dispatch: t }) => {
	let n = If(e.selection, (t) => {
		let n = bu(e), r = n.resolveStack(t.from, 1);
		if (t.empty) {
			let e = n.resolveStack(t.from, -1);
			e.node.from >= r.node.from && e.node.to <= r.node.to && (r = e);
		}
		for (let e = r; e; e = e.next) {
			let { node: n } = e;
			if ((n.from < t.from && n.to >= t.to || n.to > t.to && n.from <= t.from) && e.next) return T.undirectionalRange(n.from, n.to);
		}
		return t;
	});
	return !n.eq(e.selection) && (t(Lf(e, n)), !0);
};
function Vp(e, t) {
	let { state: n } = e, r = n.selection, i = n.selection.ranges.slice();
	for (let r of n.selection.ranges) {
		let a = n.doc.lineAt(r.head);
		if (t ? a.to < e.state.doc.length : a.from > 0) for (let n = r;;) {
			let r = e.moveVertically(n, t);
			if (r.head < a.from || r.head > a.to) {
				i.some((e) => e.head == r.head) || i.push(r);
				break;
			}
			if (r.head == n.head) break;
			n = r;
		}
	}
	return i.length != r.ranges.length && (e.dispatch(Lf(n, T.create(i, i.length - 1))), !0);
}
var Hp = (e) => Vp(e, !1), Up = (e) => Vp(e, !0), Wp = ({ state: e, dispatch: t }) => {
	let n = e.selection, r = null;
	return n.ranges.length > 1 ? r = T.create([n.main]) : n.main.empty || (r = T.create([T.cursor(n.main.head)])), r ? (t(Lf(e, r)), !0) : !1;
};
function Gp(e, t) {
	if (e.state.readOnly) return !1;
	let n = "delete.selection", { state: r } = e, i = r.changeByRange((r) => {
		let { from: i, to: a } = r;
		if (i == a) {
			let o = t(r);
			o < i ? (n = "delete.backward", o = Kp(e, o, !1)) : o > i && (n = "delete.forward", o = Kp(e, o, !0)), i = Math.min(i, o), a = Math.max(a, o);
		} else i = Kp(e, i, !1), a = Kp(e, a, !0);
		return i == a ? { range: r } : {
			changes: {
				from: i,
				to: a
			},
			range: T.cursor(i, i < r.head ? -1 : 1)
		};
	});
	return !i.changes.empty && (e.dispatch(r.update(i, {
		scrollIntoView: !0,
		userEvent: n,
		effects: n == "delete.selection" ? z.announce.of(r.phrase("Selection deleted")) : void 0
	})), !0);
}
function Kp(e, t, n) {
	if (e instanceof z) for (let r of e.state.facet(z.atomicRanges).map((t) => t(e))) r.between(t, t, (e, r) => {
		e < t && r > t && (t = n ? r : e);
	});
	return t;
}
var qp = (e, t, n) => Gp(e, (r) => {
	let i = r.from, { state: a } = e, o = a.doc.lineAt(i), s, c;
	if (n && !t && i > o.from && i < o.from + 200 && !/[^ \t]/.test(s = o.text.slice(0, i - o.from))) {
		if (s[s.length - 1] == "	") return i - 1;
		let e = Rt(s, a.tabSize) % Mu(a) || Mu(a);
		for (let t = 0; t < e && s[s.length - 1 - t] == " "; t++) i--;
		c = i;
	} else c = w(o.text, i - o.from, t, t) + o.from, c == i && o.number != (t ? a.doc.lines : 1) ? c += t ? 1 : -1 : !t && /[\ufe00-\ufe0f]/.test(o.text.slice(c - o.from, i - o.from)) && (c = w(o.text, c - o.from, !1, !1) + o.from);
	return c;
}), Jp = (e) => qp(e, !1, !0), Yp = (e) => qp(e, !0, !1), Xp = (e, t) => Gp(e, (n) => {
	let r = n.head, { state: i } = e, a = i.doc.lineAt(r), o = i.charCategorizer(r);
	for (let e = null;;) {
		if (r == (t ? a.to : a.from)) {
			r == n.head && a.number != (t ? i.doc.lines : 1) && (r += t ? 1 : -1);
			break;
		}
		let s = w(a.text, r - a.from, t) + a.from, c = a.text.slice(Math.min(r, s) - a.from, Math.max(r, s) - a.from), l = o(c);
		if (e != null && l != e) break;
		(c != " " || r != n.head) && (e = l), r = s;
	}
	return r;
}), Zp = (e) => Xp(e, !1), Qp = (e) => Xp(e, !0), $p = (e) => Gp(e, (t) => {
	let n = e.lineBlockAt(t.head).to;
	return t.head < n ? n : Math.min(e.state.doc.length, t.head + 1);
}), em = (e) => Gp(e, (t) => {
	let n = e.moveToLineBoundary(t, !1).head;
	return t.head > n ? n : Math.max(0, t.head - 1);
}), tm = (e) => Gp(e, (t) => {
	let n = e.moveToLineBoundary(t, !0).head;
	return t.head < n ? n : Math.min(e.state.doc.length, t.head + 1);
}), nm = ({ state: e, dispatch: t }) => {
	if (e.readOnly) return !1;
	let n = e.changeByRange((e) => ({
		changes: {
			from: e.from,
			to: e.to,
			insert: C.of(["", ""])
		},
		range: T.cursor(e.from)
	}));
	return t(e.update(n, {
		scrollIntoView: !0,
		userEvent: "input"
	})), !0;
}, rm = ({ state: e, dispatch: t }) => {
	if (e.readOnly) return !1;
	let n = e.changeByRange((t) => {
		if (!t.empty || t.from == 0 || t.from == e.doc.length) return { range: t };
		let n = t.from, r = e.doc.lineAt(n), i = n == r.from ? n - 1 : w(r.text, n - r.from, !1) + r.from, a = n == r.to ? n + 1 : w(r.text, n - r.from, !0) + r.from;
		return {
			changes: {
				from: i,
				to: a,
				insert: e.doc.slice(n, a).append(e.doc.slice(i, n))
			},
			range: T.cursor(a)
		};
	});
	return !n.changes.empty && (t(e.update(n, {
		scrollIntoView: !0,
		userEvent: "move.character"
	})), !0);
};
function im(e) {
	let t = [], n = -1;
	for (let r of e.selection.ranges) {
		let i = e.doc.lineAt(r.from), a = e.doc.lineAt(r.to);
		if (!r.empty && r.to == a.from && (a = e.doc.lineAt(r.to - 1)), n >= i.number) {
			let e = t[t.length - 1];
			e.to = a.to, e.ranges.push(r);
		} else t.push({
			from: i.from,
			to: a.to,
			ranges: [r]
		});
		n = a.number + 1;
	}
	return t;
}
function am(e, t, n) {
	if (e.readOnly) return !1;
	let r = [], i = [];
	for (let t of im(e)) {
		if (n ? t.to == e.doc.length : t.from == 0) continue;
		let a = e.doc.lineAt(n ? t.to + 1 : t.from - 1), o = a.length + 1;
		if (n) {
			r.push({
				from: t.to,
				to: a.to
			}, {
				from: t.from,
				insert: a.text + e.lineBreak
			});
			for (let n of t.ranges) i.push(T.range(Math.min(e.doc.length, n.anchor + o), Math.min(e.doc.length, n.head + o)));
		} else {
			r.push({
				from: a.from,
				to: t.from
			}, {
				from: t.to,
				insert: e.lineBreak + a.text
			});
			for (let e of t.ranges) i.push(T.range(e.anchor - o, e.head - o));
		}
	}
	return r.length ? (t(e.update({
		changes: r,
		scrollIntoView: !0,
		selection: T.create(i, e.selection.mainIndex),
		userEvent: "move.line"
	})), !0) : !1;
}
var om = ({ state: e, dispatch: t }) => am(e, t, !1), sm = ({ state: e, dispatch: t }) => am(e, t, !0);
function cm(e, t, n) {
	if (e.readOnly) return !1;
	let r = [];
	for (let t of im(e)) n ? r.push({
		from: t.from,
		insert: e.doc.slice(t.from, t.to) + e.lineBreak
	}) : r.push({
		from: t.to,
		insert: e.lineBreak + e.doc.slice(t.from, t.to)
	});
	let i = e.changes(r);
	return t(e.update({
		changes: i,
		selection: e.selection.map(i, n ? 1 : -1),
		scrollIntoView: !0,
		userEvent: "input.copyline"
	})), !0;
}
var lm = ({ state: e, dispatch: t }) => cm(e, t, !1), um = ({ state: e, dispatch: t }) => cm(e, t, !0), dm = (e) => {
	if (e.state.readOnly) return !1;
	let { state: t } = e, n = t.changes(im(t).map(({ from: e, to: n }) => (e > 0 ? e-- : n < t.doc.length && n++, {
		from: e,
		to: n
	}))), r = If(t.selection, (t) => {
		let n;
		if (e.lineWrapping) {
			let r = e.lineBlockAt(t.head), i = e.coordsAtPos(t.head, t.assoc || 1);
			i && (n = r.bottom + e.documentTop - i.bottom + e.defaultLineHeight / 2);
		}
		return e.moveVertically(t, !0, n);
	}).map(n);
	return e.dispatch({
		changes: n,
		selection: r,
		scrollIntoView: !0,
		userEvent: "delete.line"
	}), !0;
};
function fm(e, t) {
	if (/\(\)|\[\]|\{\}/.test(e.sliceDoc(t - 1, t + 1))) return {
		from: t,
		to: t
	};
	let n = bu(e).resolveInner(t), r = n.childBefore(t), i = n.childAfter(t), a;
	return r && i && r.to <= t && i.from >= t && (a = r.type.prop(B.closedBy)) && a.indexOf(i.name) > -1 && e.doc.lineAt(r.to).from == e.doc.lineAt(i.from).from && !/\S/.test(e.sliceDoc(r.to, i.from)) ? {
		from: r.to,
		to: i.from
	} : null;
}
var pm = /*@__PURE__*/ hm(!1), mm = /*@__PURE__*/ hm(!0);
function hm(e) {
	return ({ state: t, dispatch: n }) => {
		if (t.readOnly) return !1;
		let r = t.changeByRange((n) => {
			let { from: r, to: i } = n, a = t.doc.lineAt(r), o = !e && r == i && fm(t, r);
			e && (r = i = (i <= a.to ? a : t.doc.lineAt(i)).to);
			let s = new Fu(t, {
				simulateBreak: r,
				simulateDoubleBreak: !!o
			}), c = Pu(s, r);
			for (c ??= Rt(/^\s*/.exec(t.doc.lineAt(r).text)[0], t.tabSize); i < a.to && /\s/.test(a.text[i - a.from]);) i++;
			o ? {from: r, to: i} = o : r > a.from && r < a.from + 100 && !/\S/.test(a.text.slice(0, r)) && (r = a.from);
			let l = ["", Nu(t, c)];
			return o && l.push(Nu(t, s.lineIndent(a.from, -1))), {
				changes: {
					from: r,
					to: i,
					insert: C.of(l)
				},
				range: T.cursor(r + 1 + l[1].length)
			};
		});
		return n(t.update(r, {
			scrollIntoView: !0,
			userEvent: "input"
		})), !0;
	};
}
function gm(e, t) {
	let n = -1;
	return e.changeByRange((r) => {
		let i = [];
		for (let a = r.from; a <= r.to;) {
			let o = e.doc.lineAt(a);
			o.number > n && (r.empty || r.to > o.from) && (t(o, i, r), n = o.number), a = o.to + 1;
		}
		let a = e.changes(i);
		return {
			changes: i,
			range: T.range(a.mapPos(r.anchor, 1), a.mapPos(r.head, 1))
		};
	});
}
var _m = ({ state: e, dispatch: t }) => {
	if (e.readOnly) return !1;
	let n = Object.create(null), r = new Fu(e, { overrideIndentation: (e) => n[e] ?? -1 }), i = gm(e, (t, i, a) => {
		let o = Pu(r, t.from);
		if (o == null) return;
		/\S/.test(t.text) || (o = 0);
		let s = /^\s*/.exec(t.text)[0], c = Nu(e, o);
		(s != c || a.from < t.from + s.length) && (n[t.from] = o, i.push({
			from: t.from,
			to: t.from + s.length,
			insert: c
		}));
	});
	return i.changes.empty || t(e.update(i, { userEvent: "indent" })), !0;
}, vm = ({ state: e, dispatch: t }) => !e.readOnly && (t(e.update(gm(e, (t, n) => {
	n.push({
		from: t.from,
		insert: e.facet(ju)
	});
}), { userEvent: "input.indent" })), !0), ym = ({ state: e, dispatch: t }) => !e.readOnly && (t(e.update(gm(e, (t, n) => {
	let r = /^\s*/.exec(t.text)[0];
	if (!r) return;
	let i = Rt(r, e.tabSize), a = 0, o = Nu(e, Math.max(0, i - Mu(e)));
	for (; a < r.length && a < o.length && r.charCodeAt(a) == o.charCodeAt(a);) a++;
	n.push({
		from: t.from + a,
		to: t.from + r.length,
		insert: o.slice(a)
	});
}), { userEvent: "delete.dedent" })), !0), bm = (e) => (e.setTabFocusMode(), !0), xm = [
	{
		key: "Ctrl-b",
		run: Hf,
		shift: hp,
		preventDefault: !0
	},
	{
		key: "Ctrl-f",
		run: Uf,
		shift: gp
	},
	{
		key: "Ctrl-p",
		run: Qf,
		shift: Cp
	},
	{
		key: "Ctrl-n",
		run: $f,
		shift: wp
	},
	{
		key: "Ctrl-a",
		run: lp,
		shift: Mp
	},
	{
		key: "Ctrl-e",
		run: up,
		shift: Np
	},
	{
		key: "Ctrl-d",
		run: Yp
	},
	{
		key: "Ctrl-h",
		run: Jp
	},
	{
		key: "Ctrl-k",
		run: $p
	},
	{
		key: "Ctrl-Alt-h",
		run: Zp
	},
	{
		key: "Ctrl-o",
		run: nm
	},
	{
		key: "Ctrl-t",
		run: rm
	},
	{
		key: "Ctrl-v",
		run: rp
	}
], Sm = /*@__PURE__*/ [
	{
		key: "ArrowLeft",
		run: Hf,
		shift: hp,
		preventDefault: !0
	},
	{
		key: "Mod-ArrowLeft",
		mac: "Alt-ArrowLeft",
		run: Gf,
		shift: vp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowLeft",
		run: sp,
		shift: Ap,
		preventDefault: !0
	},
	{
		key: "ArrowRight",
		run: Uf,
		shift: gp,
		preventDefault: !0
	},
	{
		key: "Mod-ArrowRight",
		mac: "Alt-ArrowRight",
		run: Kf,
		shift: yp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowRight",
		run: cp,
		shift: jp,
		preventDefault: !0
	},
	{
		key: "ArrowUp",
		run: Qf,
		shift: Cp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowUp",
		run: Pp,
		shift: Ip
	},
	{
		mac: "Ctrl-ArrowUp",
		run: np,
		shift: Ep
	},
	{
		key: "ArrowDown",
		run: $f,
		shift: wp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowDown",
		run: Fp,
		shift: Lp
	},
	{
		mac: "Ctrl-ArrowDown",
		run: rp,
		shift: Dp
	},
	{
		key: "PageUp",
		run: np,
		shift: Ep
	},
	{
		key: "PageDown",
		run: rp,
		shift: Dp
	},
	{
		key: "Home",
		run: op,
		shift: kp,
		preventDefault: !0
	},
	{
		key: "Mod-Home",
		run: Pp,
		shift: Ip
	},
	{
		key: "End",
		run: ap,
		shift: Op,
		preventDefault: !0
	},
	{
		key: "Mod-End",
		run: Fp,
		shift: Lp
	},
	{
		key: "Enter",
		run: pm,
		shift: pm
	},
	{
		key: "Mod-a",
		run: Rp
	},
	{
		key: "Backspace",
		run: Jp,
		shift: Jp,
		preventDefault: !0
	},
	{
		key: "Delete",
		run: Yp,
		preventDefault: !0
	},
	{
		key: "Mod-Backspace",
		mac: "Alt-Backspace",
		run: Zp,
		preventDefault: !0
	},
	{
		key: "Mod-Delete",
		mac: "Alt-Delete",
		run: Qp,
		preventDefault: !0
	},
	{
		mac: "Mod-Backspace",
		run: em,
		preventDefault: !0
	},
	{
		mac: "Mod-Delete",
		run: tm,
		preventDefault: !0
	}
].concat(/*@__PURE__*/ xm.map((e) => ({
	mac: e.key,
	run: e.run,
	shift: e.shift
}))), Cm = /*@__PURE__*/ [
	{
		key: "Alt-ArrowLeft",
		mac: "Ctrl-ArrowLeft",
		run: Yf,
		shift: bp
	},
	{
		key: "Alt-ArrowRight",
		mac: "Ctrl-ArrowRight",
		run: Xf,
		shift: xp
	},
	{
		key: "Alt-ArrowUp",
		run: om
	},
	{
		key: "Shift-Alt-ArrowUp",
		run: lm
	},
	{
		key: "Alt-ArrowDown",
		run: sm
	},
	{
		key: "Shift-Alt-ArrowDown",
		run: um
	},
	{
		key: "Mod-Alt-ArrowUp",
		run: Hp
	},
	{
		key: "Mod-Alt-ArrowDown",
		run: Up
	},
	{
		key: "Escape",
		run: Wp
	},
	{
		key: "Mod-Enter",
		run: mm
	},
	{
		key: "Alt-l",
		mac: "Ctrl-l",
		run: zp
	},
	{
		key: "Mod-i",
		run: Bp,
		preventDefault: !0
	},
	{
		key: "Mod-[",
		run: ym
	},
	{
		key: "Mod-]",
		run: vm
	},
	{
		key: "Mod-Alt-\\",
		run: _m
	},
	{
		key: "Shift-Mod-k",
		run: dm
	},
	{
		key: "Shift-Mod-\\",
		run: fp
	},
	{
		key: "Mod-/",
		run: $d
	},
	{
		key: "Alt-A",
		mac: "Ctrl-A",
		run: nf
	},
	{
		key: "Ctrl-m",
		mac: "Shift-Alt-m",
		run: bm
	}
].concat(Sm), wm = {
	key: "Tab",
	run: vm,
	shift: ym
}, Tm = typeof String.prototype.normalize == "function" ? (e) => e.normalize("NFKD") : (e) => e, Em = class {
	constructor(e, t, n = 0, r = e.length, i, a) {
		this.test = a, this.value = {
			from: 0,
			to: 0,
			precise: !1
		}, this.done = !1, this.matches = [], this.buffer = "", this.bufferPos = 0, this.iter = e.iterRange(n, r), this.bufferStart = n, this.normalize = i ? (e) => i(Tm(e)) : Tm, this.query = this.normalize(t);
	}
	peek() {
		if (this.bufferPos == this.buffer.length) {
			if (this.bufferStart += this.buffer.length, this.iter.next(), this.iter.done) return -1;
			this.bufferPos = 0, this.buffer = this.iter.value;
		}
		return ve(this.buffer, this.bufferPos);
	}
	next() {
		for (; this.matches.length;) this.matches.pop();
		return this.nextOverlapping();
	}
	nextOverlapping() {
		for (;;) {
			let e = this.peek();
			if (e < 0) return this.done = !0, this;
			let t = ye(e), n = this.bufferStart + this.bufferPos;
			this.bufferPos += be(e);
			let r = this.normalize(t);
			if (r.length) for (let e = 0, i = n, a = !0;; e++) {
				let n = r.charCodeAt(e), o = this.match(n, i, a, this.bufferPos + this.bufferStart, e == r.length - 1);
				if (o) return this.value = o, this;
				if (e == r.length - 1) break;
				a && e < t.length && t.charCodeAt(e) == n ? i++ : a = !1;
			}
		}
	}
	match(e, t, n, r, i) {
		let a = null;
		for (let t = 0; t < this.matches.length;) {
			let n = this.matches[t], o = !1;
			this.query.charCodeAt(n.index) == e && (n.index == this.query.length - 1 ? a = {
				from: n.from,
				to: r,
				precise: i && n.precise
			} : (n.index++, o = !0)), o ? t++ : this.matches.splice(t, 1);
		}
		return this.query.charCodeAt(0) == e && (this.query.length == 1 ? a = {
			from: t,
			to: r,
			precise: n && i
		} : this.matches.push({
			from: t,
			index: 1,
			precise: n
		})), a && this.test && !this.test(a.from, a.to, this.buffer, this.bufferStart) && (a = null), a;
	}
};
typeof Symbol < "u" && (Em.prototype[Symbol.iterator] = function() {
	return this;
});
var Dm = {
	from: -1,
	to: -1,
	match: /*@__PURE__*/ /.*/.exec(""),
	precise: !0
}, Om = "gm" + (/x/.unicode == null ? "" : "u"), km = class {
	constructor(e, t, n, r = 0, i = e.length) {
		if (this.text = e, this.to = i, this.curLine = "", this.done = !1, this.value = Dm, /\\[sWDnr]|\n|\r|\[\^/.test(t)) return new Mm(e, t, n, r, i);
		this.re = new RegExp(t, Om + (n?.ignoreCase ? "i" : "")), this.test = n?.test, this.iter = e.iter();
		let a = e.lineAt(r);
		this.curLineStart = a.from, this.matchPos = Pm(e, r), this.getLine(this.curLineStart);
	}
	getLine(e) {
		this.iter.next(e), this.iter.lineBreak ? this.curLine = "" : (this.curLine = this.iter.value, this.curLineStart + this.curLine.length > this.to && (this.curLine = this.curLine.slice(0, this.to - this.curLineStart)), this.iter.next());
	}
	nextLine() {
		this.curLineStart = this.curLineStart + this.curLine.length + 1, this.curLineStart > this.to ? this.curLine = "" : this.getLine(0);
	}
	next() {
		for (let e = this.matchPos - this.curLineStart;;) {
			this.re.lastIndex = e;
			let t = this.matchPos <= this.to && this.re.exec(this.curLine);
			if (t) {
				let n = this.curLineStart + t.index, r = n + t[0].length;
				if (this.matchPos = Pm(this.text, r + +(n == r)), n == this.curLineStart + this.curLine.length && this.nextLine(), (n < r || n > this.value.to) && (!this.test || this.test(n, r, t))) return this.value = {
					from: n,
					to: r,
					precise: !0,
					match: t
				}, this;
				e = this.matchPos - this.curLineStart;
			} else if (this.curLineStart + this.curLine.length < this.to) this.nextLine(), e = 0;
			else return this.done = !0, this;
		}
	}
}, Am = /*@__PURE__*/ new WeakMap(), jm = class e {
	constructor(e, t) {
		this.from = e, this.text = t;
	}
	get to() {
		return this.from + this.text.length;
	}
	static get(t, n, r) {
		let i = Am.get(t);
		if (!i || i.from >= r || i.to <= n) {
			let i = new e(n, t.sliceString(n, r));
			return Am.set(t, i), i;
		}
		if (i.from == n && i.to == r) return i;
		let { text: a, from: o } = i;
		return o > n && (a = t.sliceString(n, o) + a, o = n), i.to < r && (a += t.sliceString(i.to, r)), Am.set(t, new e(o, a)), new e(n, a.slice(n - o, r - o));
	}
}, Mm = class {
	constructor(e, t, n, r, i) {
		this.text = e, this.to = i, this.done = !1, this.value = Dm, this.matchPos = Pm(e, r), this.re = new RegExp(t, Om + (n?.ignoreCase ? "i" : "")), this.test = n?.test, this.flat = jm.get(e, r, this.chunkEnd(r + 5e3));
	}
	chunkEnd(e) {
		return e >= this.to ? this.to : this.text.lineAt(e).to;
	}
	next() {
		for (;;) {
			let e = this.re.lastIndex = this.matchPos - this.flat.from, t = this.re.exec(this.flat.text);
			if (t && !t[0] && t.index == e && (this.re.lastIndex = e + 1, t = this.re.exec(this.flat.text)), t) {
				let e = this.flat.from + t.index, n = e + t[0].length;
				if ((this.flat.to >= this.to || t.index + t[0].length <= this.flat.text.length - 10) && (!this.test || this.test(e, n, t))) return this.value = {
					from: e,
					to: n,
					precise: !0,
					match: t
				}, this.matchPos = Pm(this.text, n + +(e == n)), this;
			}
			if (this.flat.to == this.to) return this.done = !0, this;
			this.flat = jm.get(this.text, this.flat.from, this.chunkEnd(this.flat.from + this.flat.text.length * 2));
		}
	}
};
typeof Symbol < "u" && (km.prototype[Symbol.iterator] = Mm.prototype[Symbol.iterator] = function() {
	return this;
});
function Nm(e) {
	try {
		return new RegExp(e, Om), !0;
	} catch {
		return !1;
	}
}
function Pm(e, t) {
	if (t >= e.length) return t;
	let n = e.lineAt(t), r;
	for (; t < n.to && (r = n.text.charCodeAt(t - n.from)) >= 56320 && r < 57344;) t++;
	return t;
}
var Fm = (e) => {
	let { state: t } = e, n = String(t.doc.lineAt(e.state.selection.main.head).number), { close: r, result: i } = Pc(e, {
		label: t.phrase("Go to line"),
		input: {
			type: "text",
			name: "line",
			value: n
		},
		focus: !0,
		submitLabel: t.phrase("go")
	});
	return i.then((n) => {
		let i = n && /^([+-])?(\d+)?(:\d+)?(%)?$/.exec(n.elements.line.value);
		if (!i) {
			e.dispatch({ effects: r });
			return;
		}
		let a = t.doc.lineAt(t.selection.main.head), [, o, s, c, l] = i, u = c ? +c.slice(1) : 0, d = s ? +s : a.number;
		if (s && l) {
			let e = d / 100;
			o && (e = e * (o == "-" ? -1 : 1) + a.number / t.doc.lines), d = Math.round(t.doc.lines * e);
		} else s && o && (d = d * (o == "-" ? -1 : 1) + a.number);
		let f = t.doc.line(Math.max(1, Math.min(t.doc.lines, d))), p = T.cursor(f.from + Math.max(0, Math.min(u, f.length)));
		e.dispatch({
			effects: [r, z.scrollIntoView(p.from, { y: "center" })],
			selection: p
		});
	}), !0;
}, Im = {
	highlightWordAroundCursor: !1,
	minSelectionLength: 1,
	maxMatches: 100,
	wholeWords: !1
}, Lm = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, Im, {
		highlightWordAroundCursor: (e, t) => e || t,
		minSelectionLength: Math.min,
		maxMatches: Math.min
	});
} });
function Rm(e) {
	let t = [Wm, Um];
	return e && t.push(Lm.of(e)), t;
}
var zm = /*@__PURE__*/ N.mark({ class: "cm-selectionMatch" }), Bm = /*@__PURE__*/ N.mark({ class: "cm-selectionMatch cm-selectionMatch-main" });
function Vm(e, t, n, r) {
	return (n == 0 || e(t.sliceDoc(n - 1, n)) != O.Word) && (r == t.doc.length || e(t.sliceDoc(r, r + 1)) != O.Word);
}
function Hm(e, t, n, r) {
	return e(t.sliceDoc(n, n + 1)) == O.Word && e(t.sliceDoc(r - 1, r)) == O.Word;
}
var Um = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.decorations = this.getDeco(e);
	}
	update(e) {
		(e.selectionSet || e.docChanged || e.viewportChanged) && (this.decorations = this.getDeco(e.view));
	}
	getDeco(e) {
		let t = e.state.facet(Lm), { state: n } = e, r = n.selection;
		if (r.ranges.length > 1) return N.none;
		let i = r.main, a, o = null;
		if (i.empty) {
			if (!t.highlightWordAroundCursor) return N.none;
			let e = n.wordAt(i.head);
			if (!e) return N.none;
			o = n.charCategorizer(i.head), a = n.sliceDoc(e.from, e.to);
		} else {
			let e = i.to - i.from;
			if (e < t.minSelectionLength || e > 200) return N.none;
			if (t.wholeWords) {
				if (a = n.sliceDoc(i.from, i.to), o = n.charCategorizer(i.head), !(Vm(o, n, i.from, i.to) && Hm(o, n, i.from, i.to))) return N.none;
			} else if (a = n.sliceDoc(i.from, i.to), !a) return N.none;
		}
		let s = [];
		for (let r of e.visibleRanges) {
			let e = new Em(n.doc, a, r.from, r.to);
			for (; !e.next().done;) {
				let { from: r, to: a } = e.value;
				if ((!o || Vm(o, n, r, a)) && (i.empty && r <= i.from && a >= i.to ? s.push(Bm.range(r, a)) : (r >= i.to || a <= i.from) && s.push(zm.range(r, a)), s.length > t.maxMatches)) return N.none;
			}
		}
		return N.set(s);
	}
}, { decorations: (e) => e.decorations }), Wm = /*@__PURE__*/ z.baseTheme({
	".cm-selectionMatch": { backgroundColor: "#99ff7780" },
	".cm-searchMatch .cm-selectionMatch": { backgroundColor: "transparent" }
}), Gm = ({ state: e, dispatch: t }) => {
	let { selection: n } = e, r = T.create(n.ranges.map((t) => e.wordAt(t.head) || T.cursor(t.head)), n.mainIndex);
	return !r.eq(n) && (t(e.update({ selection: r })), !0);
};
function Km(e, t) {
	let { main: n, ranges: r } = e.selection, i = e.wordAt(n.head), a = i && i.from == n.from && i.to == n.to;
	for (let n = !1, i = new Em(e.doc, t, r[r.length - 1].to);;) if (i.next(), i.done) {
		if (n) return null;
		i = new Em(e.doc, t, 0, Math.max(0, r[r.length - 1].from - 1)), n = !0;
	} else {
		if (n && r.some((e) => e.from == i.value.from)) continue;
		if (a) {
			let t = e.wordAt(i.value.from);
			if (!t || t.from != i.value.from || t.to != i.value.to) continue;
		}
		return i.value;
	}
}
var qm = ({ state: e, dispatch: t }) => {
	let { ranges: n } = e.selection;
	if (n.some((e) => e.from === e.to)) return Gm({
		state: e,
		dispatch: t
	});
	let r = e.sliceDoc(n[0].from, n[0].to);
	if (e.selection.ranges.some((t) => e.sliceDoc(t.from, t.to) != r)) return !1;
	let i = Km(e, r);
	return i ? (t(e.update({
		selection: e.selection.addRange(T.range(i.from, i.to), !1),
		effects: z.scrollIntoView(i.to)
	})), !0) : !1;
}, Jm = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, {
		top: !1,
		caseSensitive: !1,
		literal: !1,
		regexp: !1,
		wholeWord: !1,
		createPanel: (e) => new Oh(e),
		scrollToMatch: (e) => z.scrollIntoView(e)
	});
} }), Ym = class {
	constructor(e) {
		this.search = e.search, this.caseSensitive = !!e.caseSensitive, this.literal = !!e.literal, this.regexp = !!e.regexp, this.replace = e.replace || "", this.valid = !!this.search && (!this.regexp || Nm(this.search)), this.unquoted = this.unquote(this.search), this.wholeWord = !!e.wholeWord, this.test = e.test;
	}
	unquote(e) {
		return this.literal ? e : e.replace(/\\([nrt\\])/g, (e, t) => t == "n" ? "\n" : t == "r" ? "\r" : t == "t" ? "	" : "\\");
	}
	eq(e) {
		return this.search == e.search && this.replace == e.replace && this.caseSensitive == e.caseSensitive && this.regexp == e.regexp && this.wholeWord == e.wholeWord && this.test == e.test;
	}
	create() {
		return this.regexp ? new oh(this) : new eh(this);
	}
	getCursor(e, t = 0, n) {
		let r = e.doc ? e : k.create({ doc: e });
		return n ??= r.doc.length, this.regexp ? nh(this, r, t, n) : Qm(this, r, t, n);
	}
}, Xm = class {
	constructor(e) {
		this.spec = e;
	}
};
function Zm(e, t, n) {
	return (r, i, a, o) => n && !n(r, i, a, o) ? !1 : e(r >= o && i <= o + a.length ? a.slice(r - o, i - o) : t.doc.sliceString(r, i), t, r, i);
}
function Qm(e, t, n, r) {
	let i;
	return e.wholeWord && (i = $m(t.doc, t.charCategorizer(t.selection.main.head))), e.test && (i = Zm(e.test, t, i)), new Em(t.doc, e.unquoted, n, r, e.caseSensitive ? void 0 : (e) => e.toLowerCase(), i);
}
function $m(e, t) {
	return (n, r, i, a) => ((a > n || a + i.length < r) && (a = Math.max(0, n - 2), i = e.sliceString(a, Math.min(e.length, r + 2))), (t(rh(i, n - a)) != O.Word || t(ih(i, n - a)) != O.Word) && (t(ih(i, r - a)) != O.Word || t(rh(i, r - a)) != O.Word));
}
var eh = class extends Xm {
	constructor(e) {
		super(e);
	}
	nextMatch(e, t, n) {
		let r = Qm(this.spec, e, n, e.doc.length).nextOverlapping();
		if (r.done) {
			let n = Math.min(e.doc.length, t + this.spec.unquoted.length);
			r = Qm(this.spec, e, 0, n).nextOverlapping();
		}
		return r.done || r.value.from == t && r.value.to == n ? null : r.value;
	}
	prevMatchInRange(e, t, n) {
		for (let r = n;;) {
			let n = Math.max(t, r - 1e4 - this.spec.unquoted.length), i = Qm(this.spec, e, n, r), a = null;
			for (; !i.nextOverlapping().done;) a = i.value;
			if (a) return a;
			if (n == t) return null;
			r -= 1e4;
		}
	}
	prevMatch(e, t, n) {
		let r = this.prevMatchInRange(e, 0, t);
		return r ||= this.prevMatchInRange(e, Math.max(0, n - this.spec.unquoted.length), e.doc.length), r && (r.from != t || r.to != n) ? r : null;
	}
	getReplacement(e) {
		return this.spec.unquote(this.spec.replace);
	}
	matchAll(e, t) {
		let n = Qm(this.spec, e, 0, e.doc.length), r = [];
		for (; !n.next().done;) {
			if (r.length >= t) return null;
			r.push(n.value);
		}
		return r;
	}
	highlight(e, t, n, r) {
		let i = Qm(this.spec, e, Math.max(0, t - this.spec.unquoted.length), Math.min(n + this.spec.unquoted.length, e.doc.length));
		for (; !i.next().done;) r(i.value.from, i.value.to);
	}
};
function th(e, t, n) {
	return (r, i, a) => (!n || n(r, i, a)) && e(a[0], t, r, i);
}
function nh(e, t, n, r) {
	let i;
	return e.wholeWord && (i = ah(t.charCategorizer(t.selection.main.head))), e.test && (i = th(e.test, t, i)), new km(t.doc, e.search, {
		ignoreCase: !e.caseSensitive,
		test: i
	}, n, r);
}
function rh(e, t) {
	return e.slice(w(e, t, !1), t);
}
function ih(e, t) {
	return e.slice(t, w(e, t));
}
function ah(e) {
	return (t, n, r) => !r[0].length || (e(rh(r.input, r.index)) != O.Word || e(ih(r.input, r.index)) != O.Word) && (e(ih(r.input, r.index + r[0].length)) != O.Word || e(rh(r.input, r.index + r[0].length)) != O.Word);
}
var oh = class extends Xm {
	nextMatch(e, t, n) {
		let r = nh(this.spec, e, n, e.doc.length).next();
		return r.done && (r = nh(this.spec, e, 0, t).next()), r.done ? null : r.value;
	}
	prevMatchInRange(e, t, n) {
		for (let r = 1;; r++) {
			let i = Math.max(t, n - r * 1e4), a = nh(this.spec, e, i, n), o = null;
			for (; !a.next().done;) o = a.value;
			if (o && (i == t || o.from > i + 10)) return o;
			if (i == t) return null;
		}
	}
	prevMatch(e, t, n) {
		return this.prevMatchInRange(e, 0, t) || this.prevMatchInRange(e, n, e.doc.length);
	}
	getReplacement(e) {
		return this.spec.unquote(this.spec.replace).replace(/\$([$&]|\d+)/g, (t, n) => {
			if (n == "&") return e.match[0];
			if (n == "$") return "$";
			for (let t = n.length; t > 0; t--) {
				let r = +n.slice(0, t);
				if (r > 0 && r < e.match.length) return e.match[r] + n.slice(t);
			}
			return t;
		});
	}
	matchAll(e, t) {
		let n = nh(this.spec, e, 0, e.doc.length), r = [];
		for (; !n.next().done;) {
			if (r.length >= t) return null;
			r.push(n.value);
		}
		return r;
	}
	highlight(e, t, n, r) {
		let i = nh(this.spec, e, Math.max(0, t - 250), Math.min(n + 250, e.doc.length));
		for (; !i.next().done;) r(i.value.from, i.value.to);
	}
}, sh = /*@__PURE__*/ D.define(), ch = /*@__PURE__*/ D.define(), lh = /*@__PURE__*/ Be.define({
	create(e) {
		return new uh(Sh(e).create(), null);
	},
	update(e, t) {
		for (let n of t.effects) n.is(sh) ? e = new uh(n.value.create(), e.panel) : n.is(ch) && (e = new uh(e.query, n.value ? xh : null));
		return e;
	},
	provide: (e) => Nc.from(e, (e) => e.panel)
}), uh = class {
	constructor(e, t) {
		this.query = e, this.panel = t;
	}
}, dh = /*@__PURE__*/ N.mark({ class: "cm-searchMatch" }), fh = /*@__PURE__*/ N.mark({ class: "cm-searchMatch cm-searchMatch-selected" }), ph = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.view = e, this.decorations = this.highlight(e.state.field(lh));
	}
	update(e) {
		let t = e.state.field(lh);
		(t != e.startState.field(lh) || e.docChanged || e.selectionSet || e.viewportChanged) && (this.decorations = this.highlight(t));
	}
	highlight({ query: e, panel: t }) {
		if (!t || !e.spec.valid) return N.none;
		let { view: n } = this, r = new Dt();
		for (let t = 0, i = n.visibleRanges, a = i.length; t < a; t++) {
			let { from: o, to: s } = i[t];
			for (; t < a - 1 && s > i[t + 1].from - 500;) s = i[++t].to;
			e.highlight(n.state, o, s, (e, t) => {
				let i = n.state.selection.ranges.some((n) => n.from == e && n.to == t);
				r.add(e, t, i ? fh : dh);
			});
		}
		return r.finish();
	}
}, { decorations: (e) => e.decorations });
function mh(e) {
	return (t) => {
		let n = t.state.field(lh, !1);
		return n && n.query.spec.valid ? e(t, n) : Th(t);
	};
}
var hh = /*@__PURE__*/ mh((e, { query: t }) => {
	let { to: n } = e.state.selection.main, r = t.nextMatch(e.state, n, n);
	if (!r) return !1;
	let i = T.single(r.from, r.to), a = e.state.facet(Jm);
	return e.dispatch({
		selection: i,
		effects: [Mh(e, r), a.scrollToMatch(i.main, e)],
		userEvent: "select.search"
	}), wh(e), !0;
}), gh = /*@__PURE__*/ mh((e, { query: t }) => {
	let { state: n } = e, { from: r } = n.selection.main, i = t.prevMatch(n, r, r);
	if (!i) return !1;
	let a = T.single(i.from, i.to), o = e.state.facet(Jm);
	return e.dispatch({
		selection: a,
		effects: [Mh(e, i), o.scrollToMatch(a.main, e)],
		userEvent: "select.search"
	}), wh(e), !0;
}), _h = /*@__PURE__*/ mh((e, { query: t }) => {
	let n = t.matchAll(e.state, 1e3);
	return !n || !n.length ? !1 : (e.dispatch({
		selection: T.create(n.map((e) => T.range(e.from, e.to))),
		userEvent: "select.search.matches"
	}), !0);
}), vh = ({ state: e, dispatch: t }) => {
	let n = e.selection;
	if (n.ranges.length > 1 || n.main.empty) return !1;
	let { from: r, to: i } = n.main, a = [], o = 0;
	for (let t = new Em(e.doc, e.sliceDoc(r, i)); !t.next().done;) {
		if (a.length > 1e3) return !1;
		t.value.from == r && (o = a.length), a.push(T.range(t.value.from, t.value.to));
	}
	return t(e.update({
		selection: T.create(a, o),
		userEvent: "select.search.matches"
	})), !0;
}, yh = /*@__PURE__*/ mh((e, { query: t }) => {
	let { state: n } = e, { from: r, to: i } = n.selection.main;
	if (n.readOnly) return !1;
	let a = t.nextMatch(n, r, r);
	if (!a) return !1;
	let o = a, s = [], c, l, u = [];
	o.precise ? o.from == r && o.to == i && (l = n.toText(t.getReplacement(o)), s.push({
		from: o.from,
		to: o.to,
		insert: l
	}), o = t.nextMatch(n, o.from, o.to), u.push(z.announce.of(n.phrase("replaced match on line $", n.doc.lineAt(r).number) + "."))) : o = t.nextMatch(n, o.from, o.to);
	let d = e.state.changes(s);
	return o && (c = T.single(o.from, o.to).map(d), u.push(Mh(e, o)), u.push(n.facet(Jm).scrollToMatch(c.main, e))), e.dispatch({
		changes: d,
		selection: c,
		effects: u,
		userEvent: "input.replace"
	}), !0;
}), bh = /*@__PURE__*/ mh((e, { query: t }) => {
	if (e.state.readOnly) return !1;
	let n = [];
	for (let r of t.matchAll(e.state, 1e9)) {
		let { from: e, to: i, precise: a } = r;
		a && n.push({
			from: e,
			to: i,
			insert: t.getReplacement(r)
		});
	}
	if (!n.length) return !1;
	let r = e.state.phrase("replaced $ matches", n.length) + ".";
	return e.dispatch({
		changes: n,
		effects: z.announce.of(r),
		userEvent: "input.replace.all"
	}), !0;
});
function xh(e) {
	return e.state.facet(Jm).createPanel(e);
}
function Sh(e, t) {
	let n = e.selection.main, r = n.empty || n.to > n.from + 100 ? "" : e.sliceDoc(n.from, n.to);
	if (t && !r) return t;
	let i = e.facet(Jm);
	return new Ym({
		search: t?.literal ?? i.literal ? r : r.replace(/\n/g, "\\n"),
		caseSensitive: t?.caseSensitive ?? i.caseSensitive,
		literal: t?.literal ?? i.literal,
		regexp: t?.regexp ?? i.regexp,
		wholeWord: t?.wholeWord ?? i.wholeWord
	});
}
function Ch(e) {
	let t = kc(e, xh);
	return t && t.dom.querySelector("[main-field]");
}
function wh(e) {
	let t = Ch(e);
	t && t == e.root.activeElement && t.select();
}
var Th = (e) => {
	let t = e.state.field(lh, !1);
	if (t && t.panel) {
		let n = Ch(e);
		if (n && n != e.root.activeElement) {
			let r = Sh(e.state, t.query.spec);
			r.valid && e.dispatch({ effects: sh.of(r) }), n.focus(), n.select();
		}
	} else e.dispatch({ effects: [ch.of(!0), t ? sh.of(Sh(e.state, t.query.spec)) : D.appendConfig.of(Ph)] });
	return !0;
}, Eh = (e) => {
	let t = e.state.field(lh, !1);
	if (!t || !t.panel) return !1;
	let n = kc(e, xh);
	return n && n.dom.contains(e.root.activeElement) && e.focus(), e.dispatch({ effects: ch.of(!1) }), !0;
}, Dh = [
	{
		key: "Mod-f",
		run: Th,
		scope: "editor search-panel"
	},
	{
		key: "F3",
		run: hh,
		shift: gh,
		scope: "editor search-panel",
		preventDefault: !0
	},
	{
		key: "Mod-g",
		run: hh,
		shift: gh,
		scope: "editor search-panel",
		preventDefault: !0
	},
	{
		key: "Escape",
		run: Eh,
		scope: "editor search-panel"
	},
	{
		key: "Mod-Shift-l",
		run: vh
	},
	{
		key: "Mod-Alt-g",
		run: Fm
	},
	{
		key: "Mod-d",
		run: qm,
		preventDefault: !0
	}
], Oh = class {
	constructor(e) {
		this.view = e;
		let t = this.query = e.state.field(lh).query.spec;
		this.commit = this.commit.bind(this), this.searchField = j("input", {
			value: t.search,
			placeholder: kh(e, "Find"),
			"aria-label": kh(e, "Find"),
			class: "cm-textfield",
			name: "search",
			form: "",
			"main-field": "true",
			onchange: this.commit,
			onkeyup: this.commit
		}), this.replaceField = j("input", {
			value: t.replace,
			placeholder: kh(e, "Replace"),
			"aria-label": kh(e, "Replace"),
			class: "cm-textfield",
			name: "replace",
			form: "",
			onchange: this.commit,
			onkeyup: this.commit
		}), this.caseField = j("input", {
			type: "checkbox",
			name: "case",
			form: "",
			checked: t.caseSensitive,
			onchange: this.commit
		}), this.reField = j("input", {
			type: "checkbox",
			name: "re",
			form: "",
			checked: t.regexp,
			onchange: this.commit
		}), this.wordField = j("input", {
			type: "checkbox",
			name: "word",
			form: "",
			checked: t.wholeWord,
			onchange: this.commit
		});
		function n(e, t, n) {
			return j("button", {
				class: "cm-button",
				name: e,
				onclick: t,
				type: "button"
			}, n);
		}
		this.dom = j("div", {
			onkeydown: (e) => this.keydown(e),
			class: "cm-search"
		}, [
			this.searchField,
			n("next", () => hh(e), [kh(e, "next")]),
			n("prev", () => gh(e), [kh(e, "previous")]),
			n("select", () => _h(e), [kh(e, "all")]),
			j("label", null, [this.caseField, kh(e, "match case")]),
			j("label", null, [this.reField, kh(e, "regexp")]),
			j("label", null, [this.wordField, kh(e, "by word")]),
			...e.state.readOnly ? [] : [
				j("br"),
				this.replaceField,
				n("replace", () => yh(e), [kh(e, "replace")]),
				n("replaceAll", () => bh(e), [kh(e, "replace all")])
			],
			j("button", {
				name: "close",
				onclick: () => Eh(e),
				"aria-label": kh(e, "close"),
				type: "button"
			}, ["×"])
		]);
	}
	commit() {
		let e = new Ym({
			search: this.searchField.value,
			caseSensitive: this.caseField.checked,
			regexp: this.reField.checked,
			wholeWord: this.wordField.checked,
			replace: this.replaceField.value
		});
		e.eq(this.query) || (this.query = e, this.view.dispatch({ effects: sh.of(e) }));
	}
	keydown(e) {
		os(this.view, e, "search-panel") ? e.preventDefault() : e.keyCode == 13 && e.target == this.searchField ? (e.preventDefault(), (e.shiftKey ? gh : hh)(this.view)) : e.keyCode == 13 && e.target == this.replaceField && (e.preventDefault(), yh(this.view));
	}
	update(e) {
		for (let t of e.transactions) for (let e of t.effects) e.is(sh) && !e.value.eq(this.query) && this.setQuery(e.value);
	}
	setQuery(e) {
		this.query = e, this.searchField.value = e.search, this.replaceField.value = e.replace, this.caseField.checked = e.caseSensitive, this.reField.checked = e.regexp, this.wordField.checked = e.wholeWord;
	}
	mount() {
		this.searchField.select();
	}
	get pos() {
		return 80;
	}
	get top() {
		return this.view.state.facet(Jm).top;
	}
};
function kh(e, t) {
	return e.state.phrase(t);
}
var Ah = 30, jh = /[\s\.,:;?!]/;
function Mh(e, { from: t, to: n }) {
	let r = e.state.doc.lineAt(t), i = e.state.doc.lineAt(n).to, a = Math.max(r.from, t - Ah), o = Math.min(i, n + Ah), s = e.state.sliceDoc(a, o);
	if (a != r.from) {
		for (let e = 0; e < Ah; e++) if (!jh.test(s[e + 1]) && jh.test(s[e])) {
			s = s.slice(e);
			break;
		}
	}
	if (o != i) {
		for (let e = s.length - 1; e > s.length - Ah; e--) if (!jh.test(s[e - 1]) && jh.test(s[e])) {
			s = s.slice(0, e);
			break;
		}
	}
	return z.announce.of(`${e.state.phrase("current match")}. ${s} ${e.state.phrase("on line")} ${r.number}.`);
}
var Nh = /*@__PURE__*/ z.baseTheme({
	".cm-panel.cm-search": {
		padding: "2px 6px 4px",
		position: "relative",
		"& [name=close]": {
			position: "absolute",
			top: "0",
			right: "4px",
			backgroundColor: "inherit",
			border: "none",
			font: "inherit",
			padding: 0,
			margin: 0
		},
		"& input, & button, & label": { margin: ".2em .6em .2em 0" },
		"& input[type=checkbox]": { marginRight: ".2em" },
		"& label": {
			fontSize: "80%",
			whiteSpace: "pre"
		}
	},
	"&light .cm-searchMatch": { backgroundColor: "#ffff0054" },
	"&dark .cm-searchMatch": { backgroundColor: "#00ffff8a" },
	"&light .cm-searchMatch-selected": { backgroundColor: "#ff6a0054" },
	"&dark .cm-searchMatch-selected": { backgroundColor: "#ff00ff8a" }
}), Ph = [
	lh,
	/*@__PURE__*/ Ue.low(ph),
	Nh
], Fh = class {
	constructor(e, t, n, r) {
		this.state = e, this.pos = t, this.explicit = n, this.view = r, this.abortListeners = [], this.abortOnDocChange = !1;
	}
	tokenBefore(e) {
		let t = bu(this.state).resolveInner(this.pos, -1);
		for (; t && e.indexOf(t.name) < 0;) t = t.parent;
		return t ? {
			from: t.from,
			to: this.pos,
			text: this.state.sliceDoc(t.from, this.pos),
			type: t.type
		} : null;
	}
	matchBefore(e) {
		let t = this.state.doc.lineAt(this.pos), n = Math.max(t.from, this.pos - 250), r = t.text.slice(n - t.from, this.pos - t.from), i = r.search(Vh(e, !1));
		return i < 0 ? null : {
			from: n + i,
			to: this.pos,
			text: r.slice(i)
		};
	}
	get aborted() {
		return this.abortListeners == null;
	}
	addEventListener(e, t, n) {
		e == "abort" && this.abortListeners && (this.abortListeners.push(t), n && n.onDocChange && (this.abortOnDocChange = !0));
	}
};
function Ih(e) {
	let t = Object.keys(e).join(""), n = /\w/.test(t);
	return n && (t = t.replace(/\w/g, "")), `[${n ? "\\w" : ""}${t.replace(/[^\w\s]/g, "\\$&")}]`;
}
function Lh(e) {
	let t = Object.create(null), n = Object.create(null);
	for (let { label: r } of e) {
		t[r[0]] = !0;
		for (let e = 1; e < r.length; e++) n[r[e]] = !0;
	}
	let r = Ih(t) + Ih(n) + "*$";
	return [RegExp("^" + r), new RegExp(r)];
}
function Rh(e) {
	let t = e.map((e) => typeof e == "string" ? { label: e } : e), [n, r] = t.every((e) => /^\w+$/.test(e.label)) ? [/\w*$/, /\w+$/] : Lh(t);
	return (e) => {
		let i = e.matchBefore(r);
		return i || e.explicit ? {
			from: i ? i.from : e.pos,
			options: t,
			validFor: n
		} : null;
	};
}
var zh = class {
	constructor(e, t, n, r) {
		this.completion = e, this.source = t, this.match = n, this.score = r;
	}
};
function Bh(e) {
	return e.selection.main.from;
}
function Vh(e, t) {
	let { source: n } = e, r = t && n[0] != "^", i = n[n.length - 1] != "$";
	return !r && !i ? e : RegExp(`${r ? "^" : ""}(?:${n})${i ? "$" : ""}`, e.flags ?? (e.ignoreCase ? "i" : ""));
}
var Hh = /*@__PURE__*/ it.define();
function Uh(e, t, n, r) {
	let { main: i } = e.selection, a = n - i.from, o = r - i.from;
	return {
		...e.changeByRange((s) => {
			if (s != i && n != r && e.sliceDoc(s.from + a, s.from + o) != e.sliceDoc(n, r)) return { range: s };
			let c = e.toText(t);
			return {
				changes: {
					from: s.from + a,
					to: r == i.from ? s.to : s.from + o,
					insert: c
				},
				range: T.cursor(s.from + a + c.length)
			};
		}),
		scrollIntoView: !0,
		userEvent: "input.complete"
	};
}
var Wh = /*@__PURE__*/ new WeakMap();
function Gh(e) {
	if (!Array.isArray(e)) return e;
	let t = Wh.get(e);
	return t || Wh.set(e, t = Rh(e)), t;
}
var Kh = /*@__PURE__*/ D.define(), qh = /*@__PURE__*/ D.define(), Jh = class {
	constructor(e) {
		this.pattern = e, this.chars = [], this.folded = [], this.any = [], this.precise = [], this.byWord = [], this.score = 0, this.matched = [];
		for (let t = 0; t < e.length;) {
			let n = ve(e, t), r = be(n);
			this.chars.push(n);
			let i = e.slice(t, t + r), a = i.toUpperCase();
			this.folded.push(ve(a == i ? i.toLowerCase() : a, 0)), t += r;
		}
		this.astral = e.length != this.chars.length;
	}
	ret(e, t) {
		return this.score = e, this.matched = t, this;
	}
	match(e) {
		if (this.pattern.length == 0) return this.ret(-100, []);
		if (e.length < this.pattern.length) return null;
		let { chars: t, folded: n, any: r, precise: i, byWord: a } = this;
		if (t.length == 1) {
			let r = ve(e, 0), i = be(r), a = i == e.length ? 0 : -100;
			if (r != t[0]) {
				if (r == n[0]) a += -200;
				else return null;
			}
			return this.ret(a, [0, i]);
		}
		let o = e.indexOf(this.pattern);
		if (o == 0) return this.ret(e.length == this.pattern.length ? 0 : -100, [0, this.pattern.length]);
		let s = t.length, c = 0;
		if (o < 0) {
			for (let i = 0, a = Math.min(e.length, 200); i < a && c < s;) {
				let a = ve(e, i);
				(a == t[c] || a == n[c]) && (r[c++] = i), i += be(a);
			}
			if (c < s) return null;
		}
		let l = 0, u = 0, d = !1, f = 0, p = -1, m = -1, h = /[a-z]/.test(e), g = !0;
		for (let r = 0, c = Math.min(e.length, 200), _ = 0; r < c && u < s;) {
			let c = ve(e, r);
			o < 0 && (l < s && c == t[l] && (i[l++] = r), f < s && (c == t[f] || c == n[f] ? (f == 0 && (p = r), m = r + 1, f++) : f = 0));
			let v, y = c < 255 ? c >= 48 && c <= 57 || c >= 97 && c <= 122 ? 2 : +(c >= 65 && c <= 90) : (v = ye(c)) == v.toLowerCase() ? v == v.toUpperCase() ? 0 : 2 : 1;
			(!r || y == 1 && h || _ == 0 && y != 0) && (t[u] == c || n[u] == c && (d = !0) ? a[u++] = r : a.length && (g = !1)), _ = y, r += be(c);
		}
		return u == s && a[0] == 0 && g ? this.result(-100 + (d ? -200 : 0), a, e) : f == s && p == 0 ? this.ret(-200 - e.length + (m == e.length ? 0 : -100), [0, m]) : o > -1 ? this.ret(-700 - e.length, [o, o + this.pattern.length]) : f == s ? this.ret(-900 - e.length, [p, m]) : u == s ? this.result(-100 + (d ? -200 : 0) + -700 + (g ? 0 : -1100), a, e) : t.length == 2 ? null : this.result((r[0] ? -700 : 0) + -200 + -1100, r, e);
	}
	result(e, t, n) {
		let r = [], i = 0;
		for (let e of t) {
			let t = e + (this.astral ? be(ve(n, e)) : 1);
			i && r[i - 1] == e ? r[i - 1] = t : (r[i++] = e, r[i++] = t);
		}
		return this.ret(e - n.length, r);
	}
}, Yh = class {
	constructor(e) {
		this.pattern = e, this.matched = [], this.score = 0, this.folded = e.toLowerCase();
	}
	match(e) {
		if (e.length < this.pattern.length) return null;
		let t = e.slice(0, this.pattern.length), n = t == this.pattern ? 0 : t.toLowerCase() == this.folded ? -200 : null;
		return n == null ? null : (this.matched = [0, t.length], this.score = n + (e.length == this.pattern.length ? 0 : -100), this);
	}
}, W = /*@__PURE__*/ E.define({ combine(e) {
	return bt(e, {
		activateOnTyping: !0,
		activateOnCompletion: () => !1,
		activateOnTypingDelay: 100,
		selectOnOpen: !0,
		override: null,
		closeOnBlur: !0,
		maxRenderedOptions: 100,
		defaultKeymap: !0,
		tooltipClass: () => "",
		optionClass: () => "",
		aboveCursor: !1,
		icons: !0,
		addToOptions: [],
		positionInfo: Zh,
		filterStrict: !1,
		compareCompletions: (e, t) => (e.sortText || e.label).localeCompare(t.sortText || t.label),
		interactionDelay: 75,
		updateSyncTime: 100
	}, {
		defaultKeymap: (e, t) => e && t,
		closeOnBlur: (e, t) => e && t,
		icons: (e, t) => e && t,
		tooltipClass: (e, t) => (n) => Xh(e(n), t(n)),
		optionClass: (e, t) => (n) => Xh(e(n), t(n)),
		addToOptions: (e, t) => e.concat(t),
		filterStrict: (e, t) => e || t
	});
} });
function Xh(e, t) {
	return e ? t ? e + " " + t : e : t;
}
function Zh(e, t, n, r, i, a) {
	let o = e.textDirection == P.RTL, s = o, c = !1, l = "top", u, d, f = t.left - i.left, p = i.right - t.right, m = r.right - r.left, h = r.bottom - r.top;
	if (s && f < Math.min(m, p) ? s = !1 : !s && p < Math.min(m, f) && (s = !0), m <= (s ? f : p)) u = Math.max(i.top, Math.min(n.top, i.bottom - h)) - t.top, d = Math.min(400, s ? f : p);
	else {
		c = !0, d = Math.min(400, (o ? t.right : i.right - t.left) - 30);
		let e = i.bottom - t.bottom;
		e >= h || e > t.top ? u = n.bottom - t.top : (l = "bottom", u = t.bottom - n.top);
	}
	let g = (t.bottom - t.top) / a.offsetHeight, _ = (t.right - t.left) / a.offsetWidth;
	return {
		style: `${l}: ${u / g}px; max-width: ${d / _}px`,
		class: "cm-completionInfo-" + (c ? o ? "left-narrow" : "right-narrow" : s ? "left" : "right")
	};
}
var Qh = /*@__PURE__*/ D.define();
function $h(e) {
	let t = e.addToOptions.slice();
	return e.icons && t.push({
		render(e) {
			let t = document.createElement("div");
			return t.classList.add("cm-completionIcon"), e.type && t.classList.add(...e.type.split(/\s+/g).map((e) => "cm-completionIcon-" + e)), t.setAttribute("aria-hidden", "true"), t;
		},
		position: 20
	}), t.push({
		render(e, t, n, r) {
			let i = document.createElement("span");
			i.className = "cm-completionLabel";
			let a = e.displayLabel || e.label, o = 0;
			for (let e = 0; e < r.length;) {
				let t = r[e++], n = r[e++];
				t > o && i.appendChild(document.createTextNode(a.slice(o, t)));
				let s = i.appendChild(document.createElement("span"));
				s.appendChild(document.createTextNode(a.slice(t, n))), s.className = "cm-completionMatchedText", o = n;
			}
			return o < a.length && i.appendChild(document.createTextNode(a.slice(o))), i;
		},
		position: 50
	}, {
		render(e) {
			if (!e.detail) return null;
			let t = document.createElement("span");
			return t.className = "cm-completionDetail", t.textContent = e.detail, t;
		},
		position: 80
	}), t.sort((e, t) => e.position - t.position).map((e) => e.render);
}
function eg(e, t, n) {
	if (e <= n) return {
		from: 0,
		to: e
	};
	if (t < 0 && (t = 0), t <= e >> 1) {
		let e = Math.floor(t / n);
		return {
			from: e * n,
			to: (e + 1) * n
		};
	}
	let r = Math.ceil((e - t) / n);
	return {
		from: e - r * n,
		to: e - (r - 1) * n
	};
}
var tg = class {
	constructor(e, t, n) {
		this.view = e, this.stateField = t, this.applyCompletion = n, this.info = null, this.infoDestroy = null, this.placeInfoReq = {
			read: () => this.measureInfo(),
			write: (e) => this.placeInfo(e),
			key: this
		}, this.space = null, this.currentClass = "";
		let r = e.state.field(t), { options: i, selected: a } = r.open, o = e.state.facet(W);
		this.optionContent = $h(o), this.optionClass = o.optionClass, this.tooltipClass = o.tooltipClass, this.range = eg(i.length, a, o.maxRenderedOptions), this.dom = document.createElement("div"), this.dom.className = "cm-tooltip-autocomplete", this.updateTooltipClass(e.state), this.dom.addEventListener("mousedown", (n) => {
			let { options: r } = e.state.field(t).open;
			for (let t = n.target, i; t && t != this.dom; t = t.parentNode) if (t.nodeName == "LI" && (i = /-(\d+)$/.exec(t.id)) && +i[1] < r.length) {
				this.applyCompletion(e, r[+i[1]]), n.preventDefault();
				return;
			}
			if (n.target == this.list) {
				let t = this.list.classList.contains("cm-completionListIncompleteTop") && n.clientY < this.list.firstChild.getBoundingClientRect().top ? this.range.from - 1 : this.list.classList.contains("cm-completionListIncompleteBottom") && n.clientY > this.list.lastChild.getBoundingClientRect().bottom ? this.range.to : null;
				t != null && (e.dispatch({ effects: Qh.of(t) }), n.preventDefault());
			}
		}), this.dom.addEventListener("focusout", (t) => {
			let n = e.state.field(this.stateField, !1);
			n && n.tooltip && e.state.facet(W).closeOnBlur && t.relatedTarget != e.contentDOM && e.dispatch({ effects: qh.of(null) });
		}), this.showOptions(i, r.id);
	}
	mount() {
		this.updateSel();
	}
	showOptions(e, t) {
		this.list && this.list.remove(), this.list = this.dom.appendChild(this.createListBox(e, t, this.range)), this.list.addEventListener("scroll", () => {
			this.info && this.view.requestMeasure(this.placeInfoReq);
		});
	}
	update(e) {
		let t = e.state.field(this.stateField), n = e.startState.field(this.stateField);
		if (this.updateTooltipClass(e.state), t != n) {
			let { options: r, selected: i, disabled: a } = t.open;
			(!n.open || n.open.options != r) && (this.range = eg(r.length, i, e.state.facet(W).maxRenderedOptions), this.showOptions(r, t.id)), this.updateSel(), a != n.open?.disabled && this.dom.classList.toggle("cm-tooltip-autocomplete-disabled", !!a);
		}
	}
	updateTooltipClass(e) {
		let t = this.tooltipClass(e);
		if (t != this.currentClass) {
			for (let e of this.currentClass.split(" ")) e && this.dom.classList.remove(e);
			for (let e of t.split(" ")) e && this.dom.classList.add(e);
			this.currentClass = t;
		}
	}
	positioned(e) {
		this.space = e, this.info && this.view.requestMeasure(this.placeInfoReq);
	}
	updateSel() {
		let e = this.view.state.field(this.stateField), t = e.open;
		(t.selected > -1 && t.selected < this.range.from || t.selected >= this.range.to) && (this.range = eg(t.options.length, t.selected, this.view.state.facet(W).maxRenderedOptions), this.showOptions(t.options, e.id));
		let n = this.updateSelectedOption(t.selected);
		if (n) {
			this.destroyInfo();
			let { completion: r } = t.options[t.selected], { info: i } = r;
			if (!i) return;
			let a = typeof i == "string" ? document.createTextNode(i) : i(r);
			if (!a) return;
			"then" in a ? a.then((t) => {
				t && this.view.state.field(this.stateField, !1) == e && this.addInfoPane(t, r);
			}).catch((e) => Rr(this.view.state, e, "completion info")) : (this.addInfoPane(a, r), n.setAttribute("aria-describedby", this.info.id));
		}
	}
	addInfoPane(e, t) {
		this.destroyInfo();
		let n = this.info = document.createElement("div");
		if (n.className = "cm-tooltip cm-completionInfo", n.id = "cm-completionInfo-" + Math.floor(Math.random() * 65535).toString(16), e.nodeType != null) n.appendChild(e), this.infoDestroy = null;
		else {
			let { dom: t, destroy: r } = e;
			n.appendChild(t), this.infoDestroy = r || null;
		}
		this.dom.appendChild(n), this.view.requestMeasure(this.placeInfoReq);
	}
	updateSelectedOption(e) {
		let t = null;
		for (let n = this.list.firstChild, r = this.range.from; n; n = n.nextSibling, r++) n.nodeName != "LI" || !n.id ? r-- : r == e ? n.hasAttribute("aria-selected") || (n.setAttribute("aria-selected", "true"), t = n) : n.hasAttribute("aria-selected") && (n.removeAttribute("aria-selected"), n.removeAttribute("aria-describedby"));
		return t && rg(this.list, t), t;
	}
	measureInfo() {
		let e = this.dom.querySelector("[aria-selected]");
		if (!e || !this.info) return null;
		let t = this.dom.getBoundingClientRect(), n = this.info.getBoundingClientRect(), r = e.getBoundingClientRect(), i = this.space;
		if (!i) {
			let e = this.dom.ownerDocument.documentElement;
			i = {
				left: 0,
				top: 0,
				right: e.clientWidth,
				bottom: e.clientHeight
			};
		}
		return r.top > Math.min(i.bottom, t.bottom) - 10 || r.bottom < Math.max(i.top, t.top) + 10 ? null : this.view.state.facet(W).positionInfo(this.view, t, r, n, i, this.dom);
	}
	placeInfo(e) {
		this.info && (e ? (e.style && (this.info.style.cssText = e.style), this.info.className = "cm-tooltip cm-completionInfo " + (e.class || "")) : this.info.style.cssText = "top: -1e6px");
	}
	createListBox(e, t, n) {
		let r = document.createElement("ul");
		r.id = t, r.setAttribute("role", "listbox"), r.setAttribute("aria-expanded", "true"), r.setAttribute("aria-label", this.view.state.phrase("Completions")), r.addEventListener("mousedown", (e) => {
			e.target == r && e.preventDefault();
		});
		let i = null;
		for (let a = n.from; a < n.to; a++) {
			let { completion: o, match: s } = e[a], { section: c } = o;
			if (c) {
				let e = typeof c == "string" ? c : c.name;
				if (e != i && (a > n.from || n.from == 0)) {
					if (i = e, typeof c != "string" && c.header) r.appendChild(c.header(c));
					else {
						let t = r.appendChild(document.createElement("completion-section"));
						t.textContent = e;
					}
				}
			}
			let l = r.appendChild(document.createElement("li"));
			l.id = t + "-" + a, l.setAttribute("role", "option");
			let u = this.optionClass(o);
			u && (l.className = u);
			for (let e of this.optionContent) {
				let t = e(o, this.view.state, this.view, s);
				t && l.appendChild(t);
			}
		}
		return n.from && r.classList.add("cm-completionListIncompleteTop"), n.to < e.length && r.classList.add("cm-completionListIncompleteBottom"), r;
	}
	destroyInfo() {
		this.info &&= (this.infoDestroy && this.infoDestroy(), this.info.remove(), null);
	}
	destroy() {
		this.destroyInfo();
	}
};
function ng(e, t) {
	return (n) => new tg(n, e, t);
}
function rg(e, t) {
	let n = e.getBoundingClientRect(), r = t.getBoundingClientRect(), i = n.height / e.offsetHeight;
	r.top < n.top ? e.scrollTop -= (n.top - r.top) / i : r.bottom > n.bottom && (e.scrollTop += (r.bottom - n.bottom) / i);
}
function ig(e) {
	return (e.boost || 0) * 100 + (e.apply ? 10 : 0) + (e.info ? 5 : 0) + +!!e.type;
}
function ag(e, t) {
	let n = [], r = null, i = null, a = (e) => {
		n.push(e);
		let { section: t } = e.completion;
		if (t) {
			r ||= [];
			let e = typeof t == "string" ? t : t.name;
			r.some((t) => t.name == e) || r.push(typeof t == "string" ? { name: e } : t);
		}
	}, o = t.facet(W);
	for (let r of e) if (r.hasResult()) {
		let e = r.result.getMatch;
		if (r.result.filter === !1) for (let t of r.result.options) a(new zh(t, r.source, e ? e(t) : [], 1e9 - n.length));
		else {
			let n = t.sliceDoc(r.from, r.to), s, c = o.filterStrict ? new Yh(n) : new Jh(n);
			for (let t of r.result.options) if (s = c.match(t.label)) {
				let n = t.displayLabel ? e ? e(t, s.matched) : [] : s.matched, o = s.score + (t.boost || 0);
				if (a(new zh(t, r.source, n, o)), typeof t.section == "object" && t.section.rank === "dynamic") {
					let { name: e } = t.section;
					i ||= Object.create(null), i[e] = Math.max(o, i[e] || -1e9);
				}
			}
		}
	}
	if (r) {
		let e = Object.create(null), t = 0, a = (e, t) => (e.rank === "dynamic" && t.rank === "dynamic" ? i[t.name] - i[e.name] : 0) || (typeof e.rank == "number" ? e.rank : 1e9) - (typeof t.rank == "number" ? t.rank : 1e9) || (e.name < t.name ? -1 : 1);
		for (let n of r.sort(a)) t -= 1e5, e[n.name] = t;
		for (let t of n) {
			let { section: n } = t.completion;
			n && (t.score += e[typeof n == "string" ? n : n.name]);
		}
	}
	let s = [], c = null, l = o.compareCompletions;
	for (let e of n.sort((e, t) => t.score - e.score || l(e.completion, t.completion))) {
		let t = e.completion;
		!c || c.label != t.label || c.detail != t.detail || c.type != null && t.type != null && c.type != t.type || c.apply != t.apply || c.boost != t.boost ? s.push(e) : ig(e.completion) > ig(c) && (s[s.length - 1] = e), c = e.completion;
	}
	return s;
}
var og = class e {
	constructor(e, t, n, r, i, a) {
		this.options = e, this.attrs = t, this.tooltip = n, this.timestamp = r, this.selected = i, this.disabled = a;
	}
	setSelected(t, n) {
		return t == this.selected || t >= this.options.length ? this : new e(this.options, dg(n, t), this.tooltip, this.timestamp, t, this.disabled);
	}
	static build(t, n, r, i, a, o) {
		if (i && !o && t.some((e) => e.isPending)) return i.setDisabled();
		let s = ag(t, n);
		if (!s.length) return i && t.some((e) => e.isPending) ? i.setDisabled() : null;
		let c = n.facet(W).selectOnOpen ? 0 : -1;
		if (i && i.selected != c && i.selected != -1) {
			let e = i.options[i.selected].completion;
			for (let t = 0; t < s.length; t++) if (s[t].completion == e) {
				c = t;
				break;
			}
		}
		return new e(s, dg(r, c), {
			pos: t.reduce((e, t) => t.hasResult() ? Math.min(e, t.from) : e, 1e8),
			create: bg,
			above: a.aboveCursor
		}, i ? i.timestamp : Date.now(), c, !1);
	}
	map(t) {
		return new e(this.options, this.attrs, {
			...this.tooltip,
			pos: t.mapPos(this.tooltip.pos)
		}, this.timestamp, this.selected, this.disabled);
	}
	setDisabled() {
		return new e(this.options, this.attrs, this.tooltip, this.timestamp, this.selected, !0);
	}
}, sg = class e {
	constructor(e, t, n) {
		this.active = e, this.id = t, this.open = n;
	}
	static start() {
		return new e(fg, "cm-ac-" + Math.floor(Math.random() * 2e6).toString(36), null);
	}
	update(t) {
		let { state: n } = t, r = n.facet(W), i = (r.override || n.languageDataAt("autocomplete", Bh(n)).map(Gh)).map((e) => (this.active.find((t) => t.source == e) || new mg(e, +!!this.active.some((e) => e.state != 0))).update(t, r));
		i.length == this.active.length && i.every((e, t) => e == this.active[t]) && (i = this.active);
		let a = this.open, o = t.effects.some((e) => e.is(_g));
		a && t.docChanged && (a = a.map(t.changes)), t.selection || i.some((e) => e.hasResult() && t.changes.touchesRange(e.from, e.to)) || !cg(i, this.active) || o ? a = og.build(i, n, this.id, a, r, o) : a && a.disabled && !i.some((e) => e.isPending) && (a = null), !a && i.every((e) => !e.isPending) && i.some((e) => e.hasResult()) && (i = i.map((e) => e.hasResult() ? new mg(e.source, 0) : e));
		for (let e of t.effects) e.is(Qh) && (a &&= a.setSelected(e.value, this.id));
		return i == this.active && a == this.open ? this : new e(i, this.id, a);
	}
	get tooltip() {
		return this.open ? this.open.tooltip : null;
	}
	get attrs() {
		return this.open ? this.open.attrs : this.active.length ? lg : ug;
	}
};
function cg(e, t) {
	if (e == t) return !0;
	for (let n = 0, r = 0;;) {
		for (; n < e.length && !e[n].hasResult();) n++;
		for (; r < t.length && !t[r].hasResult();) r++;
		let i = n == e.length, a = r == t.length;
		if (i || a) return i == a;
		if (e[n++].result != t[r++].result) return !1;
	}
}
var lg = { "aria-autocomplete": "list" }, ug = {};
function dg(e, t) {
	let n = {
		"aria-autocomplete": "list",
		"aria-haspopup": "listbox",
		"aria-controls": e
	};
	return t > -1 && (n["aria-activedescendant"] = e + "-" + t), n;
}
var fg = [];
function pg(e, t) {
	if (e.isUserEvent("input.complete")) {
		let n = e.annotation(Hh);
		if (n && t.activateOnCompletion(n)) return 12;
	}
	let n = e.isUserEvent("input.type");
	return n && t.activateOnTyping ? 5 : n ? 1 : e.isUserEvent("delete.backward") ? 2 : e.selection ? 8 : e.docChanged ? 16 : 0;
}
var mg = class e {
	constructor(e, t, n = !1) {
		this.source = e, this.state = t, this.explicit = n;
	}
	hasResult() {
		return !1;
	}
	get isPending() {
		return this.state == 1;
	}
	update(t, n) {
		let r = pg(t, n), i = this;
		(r & 8 || r & 16 && this.touches(t)) && (i = new e(i.source, 0)), r & 4 && i.state == 0 && (i = new e(this.source, 1)), i = i.updateFor(t, r);
		for (let n of t.effects) if (n.is(Kh)) i = new e(i.source, 1, n.value);
		else if (n.is(qh)) i = new e(i.source, 0);
		else if (n.is(_g)) for (let e of n.value) e.source == i.source && (i = e);
		return i;
	}
	updateFor(e, t) {
		return this.map(e.changes);
	}
	map(e) {
		return this;
	}
	touches(e) {
		return e.changes.touchesRange(Bh(e.state));
	}
}, hg = class e extends mg {
	constructor(e, t, n, r, i, a) {
		super(e, 3, t), this.limit = n, this.result = r, this.from = i, this.to = a;
	}
	hasResult() {
		return !0;
	}
	updateFor(t, n) {
		if (!(n & 3)) return this.map(t.changes);
		let r = this.result;
		r.map && !t.changes.empty && (r = r.map(r, t.changes));
		let i = t.changes.mapPos(this.from), a = t.changes.mapPos(this.to, 1), o = Bh(t.state);
		if (o > a || !r || n & 2 && (Bh(t.startState) == this.from || o < this.limit)) return new mg(this.source, n & 4 ? 1 : 0);
		let s = t.changes.mapPos(this.limit);
		return gg(r.validFor, t.state, i, a) ? new e(this.source, this.explicit, s, r, i, a) : r.update && (r = r.update(r, i, a, new Fh(t.state, o, !1))) ? new e(this.source, this.explicit, s, r, r.from, r.to ?? Bh(t.state)) : new mg(this.source, 1, this.explicit);
	}
	map(t) {
		if (t.empty) return this;
		let n = this.result.map ? this.result.map(this.result, t) : this.result;
		return n ? new e(this.source, this.explicit, t.mapPos(this.limit), n, t.mapPos(this.from), t.mapPos(this.to, 1)) : new mg(this.source, 0);
	}
	touches(e) {
		return e.changes.touchesRange(this.from, this.to);
	}
};
function gg(e, t, n, r) {
	if (!e) return !1;
	let i = t.sliceDoc(n, r);
	return typeof e == "function" ? e(i, n, r, t) : Vh(e, !0).test(i);
}
var _g = /*@__PURE__*/ D.define({ map(e, t) {
	return e.map((e) => e.map(t));
} }), vg = /*@__PURE__*/ Be.define({
	create() {
		return sg.start();
	},
	update(e, t) {
		return e.update(t);
	},
	provide: (e) => [hc.from(e, (e) => e.tooltip), z.contentAttributes.from(e, (e) => e.attrs)]
});
function yg(e, t) {
	let n = t.completion.apply || t.completion.label, r = e.state.field(vg).active.find((e) => e.source == t.source);
	return r instanceof hg && (typeof n == "string" ? e.dispatch({
		...Uh(e.state, n, r.from, r.to),
		annotations: Hh.of(t.completion)
	}) : n(e, t.completion, r.from, r.to), !0);
}
var bg = /*@__PURE__*/ ng(vg, yg);
function xg(e, t = "option") {
	return (n) => {
		let r = n.state.field(vg, !1);
		if (!r || !r.open || r.open.disabled || Date.now() - r.open.timestamp < n.state.facet(W).interactionDelay) return !1;
		let i = 1, a;
		t == "page" && (a = Ec(n, r.open.tooltip)) && (i = Math.max(2, Math.floor(a.dom.offsetHeight / a.dom.querySelector("li").offsetHeight) - 1));
		let { length: o } = r.open.options, s = r.open.selected > -1 ? r.open.selected + i * (e ? 1 : -1) : e ? 0 : o - 1;
		return s < 0 ? s = t == "page" ? 0 : o - 1 : s >= o && (s = t == "page" ? o - 1 : 0), n.dispatch({ effects: Qh.of(s) }), !0;
	};
}
var Sg = (e) => {
	let t = e.state.field(vg, !1);
	return e.state.readOnly || !t || !t.open || t.open.selected < 0 || t.open.disabled || Date.now() - t.open.timestamp < e.state.facet(W).interactionDelay ? !1 : yg(e, t.open.options[t.open.selected]);
}, Cg = (e) => e.state.field(vg, !1) ? (e.dispatch({ effects: Kh.of(!0) }), !0) : !1, wg = (e) => {
	let t = e.state.field(vg, !1);
	return !t || !t.active.some((e) => e.state != 0) ? !1 : (e.dispatch({ effects: qh.of(null) }), !0);
}, Tg = class {
	constructor(e, t) {
		this.active = e, this.context = t, this.time = Date.now(), this.updates = [], this.done = void 0;
	}
}, Eg = 50, Dg = 1e3, Og = /*@__PURE__*/ I.fromClass(class {
	constructor(e) {
		this.view = e, this.debounceUpdate = -1, this.running = [], this.debounceAccept = -1, this.pendingStart = !1, this.composing = 0;
		for (let t of e.state.field(vg).active) t.isPending && this.startQuery(t);
	}
	update(e) {
		let t = e.state.field(vg), n = e.state.facet(W);
		if (!e.selectionSet && !e.docChanged && e.startState.field(vg) == t) return;
		let r = e.transactions.some((e) => {
			let t = pg(e, n);
			return t & 8 || (e.selection || e.docChanged) && !(t & 3);
		});
		for (let t = 0; t < this.running.length; t++) {
			let n = this.running[t];
			if (r || n.context.abortOnDocChange && e.docChanged || n.updates.length + e.transactions.length > Eg && Date.now() - n.time > Dg) {
				for (let e of n.context.abortListeners) try {
					e();
				} catch (e) {
					Rr(this.view.state, e);
				}
				n.context.abortListeners = null, this.running.splice(t--, 1);
			} else n.updates.push(...e.transactions);
		}
		this.debounceUpdate > -1 && clearTimeout(this.debounceUpdate), e.transactions.some((e) => e.effects.some((e) => e.is(Kh))) && (this.pendingStart = !0);
		let i = this.pendingStart ? 50 : n.activateOnTypingDelay;
		if (this.debounceUpdate = t.active.some((e) => e.isPending && !this.running.some((t) => t.active.source == e.source)) ? setTimeout(() => this.startUpdate(), i) : -1, this.composing != 0) for (let t of e.transactions) t.isUserEvent("input.type") ? this.composing = 2 : this.composing == 2 && t.selection && (this.composing = 3);
	}
	startUpdate() {
		this.debounceUpdate = -1, this.pendingStart = !1;
		let { state: e } = this.view, t = e.field(vg);
		for (let e of t.active) e.isPending && !this.running.some((t) => t.active.source == e.source) && this.startQuery(e);
		this.running.length && t.open && t.open.disabled && (this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(W).updateSyncTime));
	}
	startQuery(e) {
		let { state: t } = this.view, n = new Fh(t, Bh(t), e.explicit, this.view), r = new Tg(e, n);
		this.running.push(r), Promise.resolve(e.source(n)).then((e) => {
			r.context.aborted || (r.done = e || null, this.scheduleAccept());
		}, (e) => {
			this.view.dispatch({ effects: qh.of(null) }), Rr(this.view.state, e);
		});
	}
	scheduleAccept() {
		this.running.every((e) => e.done !== void 0) ? this.accept() : this.debounceAccept < 0 && (this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(W).updateSyncTime));
	}
	accept() {
		this.debounceAccept > -1 && clearTimeout(this.debounceAccept), this.debounceAccept = -1;
		let e = [], t = this.view.state.facet(W), n = this.view.state.field(vg);
		for (let r = 0; r < this.running.length; r++) {
			let i = this.running[r];
			if (i.done === void 0) continue;
			if (this.running.splice(r--, 1), i.done) {
				let n = Bh(i.updates.length ? i.updates[0].startState : this.view.state), r = Math.min(n, i.done.from + +!i.active.explicit), a = new hg(i.active.source, i.active.explicit, r, i.done, i.done.from, i.done.to ?? n);
				for (let e of i.updates) a = a.update(e, t);
				if (a.hasResult()) {
					e.push(a);
					continue;
				}
			}
			let a = n.active.find((e) => e.source == i.active.source);
			if (a && a.isPending) {
				if (i.done == null) {
					let n = new mg(i.active.source, 0);
					for (let e of i.updates) n = n.update(e, t);
					n.isPending || e.push(n);
				} else this.startQuery(a);
			}
		}
		(e.length || n.open && n.open.disabled) && this.view.dispatch({ effects: _g.of(e) });
	}
}, { eventHandlers: {
	blur(e) {
		let t = this.view.state.field(vg, !1);
		if (t && t.tooltip && this.view.state.facet(W).closeOnBlur) {
			let n = t.open && Ec(this.view, t.open.tooltip);
			(!n || !n.dom.contains(e.relatedTarget)) && setTimeout(() => this.view.dispatch({ effects: qh.of(null) }), 10);
		}
	},
	compositionstart() {
		this.composing = 1;
	},
	compositionend() {
		this.composing == 3 && setTimeout(() => this.view.dispatch({ effects: Kh.of(!1) }), 20), this.composing = 0;
	}
} }), kg = typeof navigator == "object" && /*@__PURE__*/ /Win/.test(navigator.platform), Ag = /*@__PURE__*/ Ue.highest(/*@__PURE__*/ z.domEventHandlers({ keydown(e, t) {
	let n = t.state.field(vg, !1);
	if (!n || !n.open || n.open.disabled || n.open.selected < 0 || e.key.length > 1 || e.ctrlKey && !(kg && e.altKey) || e.metaKey) return !1;
	let r = n.open.options[n.open.selected], i = n.active.find((e) => e.source == r.source), a = r.completion.commitCharacters || i.result.commitCharacters;
	return a && a.indexOf(e.key) > -1 && yg(t, r), !1;
} })), jg = /*@__PURE__*/ z.baseTheme({
	".cm-tooltip.cm-tooltip-autocomplete": { "& > ul": {
		fontFamily: "monospace",
		whiteSpace: "nowrap",
		overflow: "hidden auto",
		maxWidth_fallback: "700px",
		maxWidth: "min(700px, 95vw)",
		minWidth: "250px",
		maxHeight: "10em",
		height: "100%",
		listStyle: "none",
		margin: 0,
		padding: 0,
		"& > li, & > completion-section": {
			padding: "1px 3px",
			lineHeight: 1.2
		},
		"& > li": {
			overflowX: "hidden",
			textOverflow: "ellipsis",
			cursor: "pointer"
		},
		"& > completion-section": {
			display: "list-item",
			borderBottom: "1px solid silver",
			paddingLeft: "0.5em",
			opacity: .7
		}
	} },
	"&light .cm-tooltip-autocomplete ul li[aria-selected]": {
		background: "#17c",
		color: "white"
	},
	"&light .cm-tooltip-autocomplete-disabled ul li[aria-selected]": { background: "#777" },
	"&dark .cm-tooltip-autocomplete ul li[aria-selected]": {
		background: "#347",
		color: "white"
	},
	"&dark .cm-tooltip-autocomplete-disabled ul li[aria-selected]": { background: "#444" },
	".cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after": {
		content: "\"···\"",
		opacity: .5,
		display: "block",
		textAlign: "center",
		cursor: "pointer"
	},
	".cm-tooltip.cm-completionInfo": {
		position: "absolute",
		padding: "3px 9px",
		width: "max-content",
		maxWidth: "400px",
		boxSizing: "border-box",
		whiteSpace: "pre-line"
	},
	".cm-completionInfo.cm-completionInfo-left": { right: "100%" },
	".cm-completionInfo.cm-completionInfo-right": { left: "100%" },
	".cm-completionInfo.cm-completionInfo-left-narrow": { right: "30px" },
	".cm-completionInfo.cm-completionInfo-right-narrow": { left: "30px" },
	"&light .cm-snippetField": { backgroundColor: "#00000022" },
	"&dark .cm-snippetField": { backgroundColor: "#ffffff22" },
	".cm-snippetFieldPosition": {
		verticalAlign: "text-top",
		width: 0,
		height: "1.15em",
		display: "inline-block",
		margin: "0 -0.7px -.7em",
		borderLeft: "1.4px dotted #888"
	},
	".cm-completionMatchedText": { textDecoration: "underline" },
	".cm-completionDetail": {
		marginLeft: "0.5em",
		fontStyle: "italic"
	},
	".cm-completionIcon": {
		fontSize: "90%",
		width: ".8em",
		display: "inline-block",
		textAlign: "center",
		paddingRight: ".6em",
		opacity: "0.6",
		boxSizing: "content-box"
	},
	".cm-completionIcon-function, .cm-completionIcon-method": { "&:after": { content: "'ƒ'" } },
	".cm-completionIcon-class": { "&:after": { content: "'○'" } },
	".cm-completionIcon-interface": { "&:after": { content: "'◌'" } },
	".cm-completionIcon-variable": { "&:after": { content: "'𝑥'" } },
	".cm-completionIcon-constant": { "&:after": { content: "'𝐶'" } },
	".cm-completionIcon-type": { "&:after": { content: "'𝑡'" } },
	".cm-completionIcon-enum": { "&:after": { content: "'∪'" } },
	".cm-completionIcon-property": { "&:after": { content: "'□'" } },
	".cm-completionIcon-keyword": { "&:after": { content: "'🔑︎'" } },
	".cm-completionIcon-namespace": { "&:after": { content: "'▢'" } },
	".cm-completionIcon-text": { "&:after": {
		content: "'abc'",
		fontSize: "50%",
		verticalAlign: "middle"
	} }
}), Mg = {
	brackets: [
		"(",
		"[",
		"{",
		"'",
		"\""
	],
	before: ")]}:;>",
	stringPrefixes: []
}, Ng = /*@__PURE__*/ D.define({ map(e, t) {
	return t.mapPos(e, -1, Se.TrackAfter) ?? void 0;
} }), Pg = /*@__PURE__*/ new class extends xt {}();
Pg.startSide = 1, Pg.endSide = -1;
var Fg = /*@__PURE__*/ Be.define({
	create() {
		return A.empty;
	},
	update(e, t) {
		if (e = e.map(t.changes), t.selection) {
			let n = t.state.doc.lineAt(t.selection.main.head);
			e = e.update({ filter: (e) => e >= n.from && e <= n.to });
		}
		for (let n of t.effects) n.is(Ng) && (e = e.update({ add: [Pg.range(n.value, n.value + 1)] }));
		return e;
	}
});
function Ig() {
	return [Vg, Fg];
}
var Lg = "()[]{}<>«»»«［］｛｝";
function Rg(e) {
	for (let t = 0; t < 16; t += 2) if (Lg.charCodeAt(t) == e) return Lg.charAt(t + 1);
	return ye(e < 128 ? e : e + 1);
}
function zg(e, t) {
	return e.languageDataAt("closeBrackets", t)[0] || Mg;
}
var Bg = typeof navigator == "object" && /*@__PURE__*/ /Android\b/.test(navigator.userAgent), Vg = /*@__PURE__*/ z.inputHandler.of((e, t, n, r) => {
	if ((Bg ? e.composing : e.compositionStarted) || e.state.readOnly) return !1;
	let i = e.state.selection.main;
	if (r.length > 2 || r.length == 2 && be(ve(r, 0)) == 1 || t != i.from || n != i.to) return !1;
	let a = Ug(e.state, r);
	return a ? (e.dispatch(a), !0) : !1;
}), Hg = [{
	key: "Backspace",
	run: ({ state: e, dispatch: t }) => {
		if (e.readOnly) return !1;
		let n = zg(e, e.selection.main.head).brackets || Mg.brackets, r = null, i = e.changeByRange((t) => {
			if (t.empty) {
				let r = Kg(e.doc, t.head);
				for (let i of n) if (i == r && Gg(e.doc, t.head) == Rg(ve(i, 0))) return {
					changes: {
						from: t.head - i.length,
						to: t.head + i.length
					},
					range: T.cursor(t.head - i.length)
				};
			}
			return { range: r = t };
		});
		return r || t(e.update(i, {
			scrollIntoView: !0,
			userEvent: "delete.backward"
		})), !r;
	}
}];
function Ug(e, t) {
	let n = zg(e, e.selection.main.head), r = n.brackets || Mg.brackets;
	for (let i of r) {
		let a = Rg(ve(i, 0));
		if (t == i) return a == i ? Yg(e, i, r.indexOf(i + i + i) > -1, n) : qg(e, i, a, n.before || Mg.before);
		if (t == a && Wg(e, e.selection.main.from)) return Jg(e, i, a);
	}
	return null;
}
function Wg(e, t) {
	let n = !1;
	return e.field(Fg).between(0, e.doc.length, (e) => {
		e == t && (n = !0);
	}), n;
}
function Gg(e, t) {
	let n = e.sliceString(t, t + 2);
	return n.slice(0, be(ve(n, 0)));
}
function Kg(e, t) {
	let n = e.sliceString(t - 2, t);
	return be(ve(n, 0)) == n.length ? n : n.slice(1);
}
function qg(e, t, n, r) {
	let i = null, a = e.changeByRange((a) => {
		if (!a.empty) return {
			changes: [{
				insert: t,
				from: a.from
			}, {
				insert: n,
				from: a.to
			}],
			effects: Ng.of(a.to + t.length),
			range: T.range(a.anchor + t.length, a.head + t.length)
		};
		let o = Gg(e.doc, a.head);
		return !o || /\s/.test(o) || r.indexOf(o) > -1 ? {
			changes: {
				insert: t + n,
				from: a.head
			},
			effects: Ng.of(a.head + t.length),
			range: T.cursor(a.head + t.length)
		} : { range: i = a };
	});
	return i ? null : e.update(a, {
		scrollIntoView: !0,
		userEvent: "input.type"
	});
}
function Jg(e, t, n) {
	let r = null, i = e.changeByRange((t) => t.empty && Gg(e.doc, t.head) == n ? {
		changes: {
			from: t.head,
			to: t.head + n.length,
			insert: n
		},
		range: T.cursor(t.head + n.length)
	} : r = { range: t });
	return r ? null : e.update(i, {
		scrollIntoView: !0,
		userEvent: "input.type"
	});
}
function Yg(e, t, n, r) {
	let i = r.stringPrefixes || Mg.stringPrefixes, a = null, o = e.changeByRange((r) => {
		if (!r.empty) return {
			changes: [{
				insert: t,
				from: r.from
			}, {
				insert: t,
				from: r.to
			}],
			effects: Ng.of(r.to + t.length),
			range: T.range(r.anchor + t.length, r.head + t.length)
		};
		let o = r.head, s = Gg(e.doc, o), c;
		if (s == t) {
			if (Xg(e, o)) return {
				changes: {
					insert: t + t,
					from: o
				},
				effects: Ng.of(o + t.length),
				range: T.cursor(o + t.length)
			};
			if (Wg(e, o)) {
				let r = n && e.sliceDoc(o, o + t.length * 3) == t + t + t ? t + t + t : t;
				return {
					changes: {
						from: o,
						to: o + r.length,
						insert: r
					},
					range: T.cursor(o + r.length)
				};
			}
		} else if (n && e.sliceDoc(o - 2 * t.length, o) == t + t && (c = Qg(e, o - 2 * t.length, i)) > -1 && Xg(e, c)) return {
			changes: {
				insert: t + t + t + t,
				from: o
			},
			effects: Ng.of(o + t.length),
			range: T.cursor(o + t.length)
		};
		else if (e.charCategorizer(o)(s) != O.Word && Qg(e, o, i) > -1 && !Zg(e, o, t, i)) return {
			changes: {
				insert: t + t,
				from: o
			},
			effects: Ng.of(o + t.length),
			range: T.cursor(o + t.length)
		};
		return { range: a = r };
	});
	return a ? null : e.update(o, {
		scrollIntoView: !0,
		userEvent: "input.type"
	});
}
function Xg(e, t) {
	let n = bu(e).resolveInner(t + 1);
	return n.parent && n.from == t;
}
function Zg(e, t, n, r) {
	let i = bu(e).resolveInner(t, -1), a = r.reduce((e, t) => Math.max(e, t.length), 0);
	for (let o = 0; o < 5; o++) {
		let o = e.sliceDoc(i.from, Math.min(i.to, i.from + n.length + a)), s = o.indexOf(n);
		if (!s || s > -1 && r.indexOf(o.slice(0, s)) > -1) {
			let t = i.firstChild;
			for (; t && t.from == i.from && t.to - t.from > n.length + s;) {
				if (e.sliceDoc(t.to - n.length, t.to) == n) return !1;
				t = t.firstChild;
			}
			return !0;
		}
		let c = i.to == t && i.parent;
		if (!c) break;
		i = c;
	}
	return !1;
}
function Qg(e, t, n) {
	let r = e.charCategorizer(t);
	if (r(e.sliceDoc(t - 1, t)) != O.Word) return t;
	for (let i of n) {
		let n = t - i.length;
		if (e.sliceDoc(n, t) == i && r(e.sliceDoc(n - 1, n)) != O.Word) return n;
	}
	return -1;
}
function $g(e = {}) {
	return [
		Ag,
		vg,
		W.of(e),
		Og,
		t_,
		jg
	];
}
var e_ = [
	{
		key: "Ctrl-Space",
		run: Cg
	},
	{
		mac: "Alt-`",
		run: Cg
	},
	{
		mac: "Alt-i",
		run: Cg
	},
	{
		key: "Escape",
		run: wg
	},
	{
		key: "ArrowDown",
		run: /*@__PURE__*/ xg(!0)
	},
	{
		key: "ArrowUp",
		run: /*@__PURE__*/ xg(!1)
	},
	{
		key: "PageDown",
		run: /*@__PURE__*/ xg(!0, "page")
	},
	{
		key: "PageUp",
		run: /*@__PURE__*/ xg(!1, "page")
	},
	{
		key: "Enter",
		run: Sg
	}
], t_ = /*@__PURE__*/ Ue.highest(/*@__PURE__*/ rs.computeN([W], (e) => e.facet(W).defaultKeymap ? [e_] : [])), n_ = class {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.diagnostic = n;
	}
}, r_ = class e {
	constructor(e, t, n) {
		this.diagnostics = e, this.panel = t, this.selected = n;
	}
	static init(t, n, r) {
		let i = r.facet(__).markerFilter;
		i && (t = i(t, r));
		let a = t.slice().sort((e, t) => e.from - t.from || e.to - t.to), o = new Dt(), s = [], c = 0, l = r.doc.iter(), u = 0, d = r.doc.length;
		for (let e = 0;;) {
			let t = e == a.length ? null : a[e];
			if (!t && !s.length) break;
			let n, r;
			if (s.length) n = c, r = s.reduce((e, t) => Math.min(e, t.to), t && t.from > n ? t.from : 1e8);
			else {
				if (n = t.from, n > d) break;
				r = t.to, s.push(t), e++;
			}
			for (; e < a.length;) {
				let t = a[e];
				if (t.from == n && (t.to > t.from || t.to == n)) s.push(t), e++, r = Math.min(t.to, r);
				else {
					r = Math.min(t.from, r);
					break;
				}
			}
			r = Math.min(r, d);
			let i = !1;
			if (s.some((e) => e.from == n && (e.to == r || r == d)) && (i = n == r, !i && r - n < 10)) {
				let e = n - (u + l.value.length);
				e > 0 && (l.next(e), u = n);
				for (let e = n;;) {
					if (e >= r) {
						i = !0;
						break;
					}
					if (!l.lineBreak && u + l.value.length > e) break;
					e = u + l.value.length, u += l.value.length, l.next();
				}
			}
			let f = O_(s);
			if (i) o.add(n, n, N.widget({
				widget: new x_(f),
				diagnostics: s.slice()
			}));
			else {
				let e = s.reduce((e, t) => t.markClass ? e + " " + t.markClass : e, "");
				o.add(n, r, N.mark({
					class: "cm-lintRange cm-lintRange-" + f + e,
					diagnostics: s.slice(),
					inclusiveEnd: s.some((e) => e.to > r)
				}));
			}
			if (c = r, c == d) break;
			for (let e = 0; e < s.length; e++) s[e].to <= c && s.splice(e--, 1);
		}
		let f = o.finish();
		return new e(f, n, i_(f));
	}
};
function i_(e, t = null, n = 0) {
	let r = null;
	return e.between(n, 1e9, (e, n, { spec: i }) => {
		if (!(t && i.diagnostics.indexOf(t) < 0)) {
			if (!r) r = new n_(e, n, t || i.diagnostics[0]);
			else if (i.diagnostics.indexOf(r.diagnostic) < 0) return !1;
			else r = new n_(r.from, n, r.diagnostic);
		}
	}), r;
}
function a_(e, t) {
	let n = t.pos, r = t.end || n, i = e.state.facet(__).hideOn(e, n, r);
	if (i != null) return i;
	let a = e.startState.doc.lineAt(t.pos);
	return !!(e.effects.some((e) => e.is(s_)) || e.changes.touchesRange(a.from, Math.max(a.to, r)));
}
function o_(e, t) {
	return e.field(u_, !1) ? t : t.concat(D.appendConfig.of(A_));
}
var s_ = /*@__PURE__*/ D.define(), c_ = /*@__PURE__*/ D.define(), l_ = /*@__PURE__*/ D.define(), u_ = /*@__PURE__*/ Be.define({
	create() {
		return new r_(N.none, null, null);
	},
	update(e, t) {
		if (t.docChanged && e.diagnostics.size) {
			let n = e.diagnostics.map(t.changes), r = null, i = e.panel;
			if (e.selected) {
				let i = t.changes.mapPos(e.selected.from, 1);
				r = i_(n, e.selected.diagnostic, i) || i_(n, null, i);
			}
			!n.size && i && t.state.facet(__).autoPanel && (i = null), e = new r_(n, i, r);
		}
		for (let n of t.effects) if (n.is(s_)) {
			let r = t.state.facet(__).autoPanel ? n.value.length ? C_.open : null : e.panel;
			e = r_.init(n.value, r, t.state);
		} else n.is(c_) ? e = new r_(e.diagnostics, n.value ? C_.open : null, e.selected) : n.is(l_) && (e = new r_(e.diagnostics, e.panel, n.value));
		return e;
	},
	provide: (e) => [Nc.from(e, (e) => e.panel), z.decorations.from(e, (e) => e.diagnostics)]
}), d_ = /*@__PURE__*/ N.mark({ class: "cm-lintRange cm-lintRange-active" });
function f_(e, t, n) {
	let { diagnostics: r } = e.state.field(u_), i, a = -1, o = -1;
	r.between(t - +(n < 0), t + +(n > 0), (e, r, { spec: s }) => {
		if (t >= e && t <= r && (e == r || (t > e || n > 0) && (t < r || n < 0))) return i = s.diagnostics, a = e, o = r, !1;
	});
	let s = e.state.facet(__).tooltipFilter;
	return i && s && (i = s(i, e.state)), i ? {
		pos: a,
		end: o,
		above: !0,
		create() {
			return { dom: p_(e, i) };
		}
	} : null;
}
function p_(e, t) {
	return j("ul", { class: "cm-tooltip-lint" }, t.map((t) => b_(e, t, !1)));
}
var m_ = (e) => {
	let t = e.state.field(u_, !1);
	(!t || !t.panel) && e.dispatch({ effects: o_(e.state, [c_.of(!0)]) });
	let n = kc(e, C_.open);
	return n && n.dom.querySelector(".cm-panel-lint ul").focus(), !0;
}, h_ = (e) => {
	let t = e.state.field(u_, !1);
	return !t || !t.panel ? !1 : (e.dispatch({ effects: c_.of(!1) }), !0);
}, g_ = [{
	key: "Mod-Shift-m",
	run: m_,
	preventDefault: !0
}, {
	key: "F8",
	run: (e) => {
		let t = e.state.field(u_, !1);
		if (!t) return !1;
		let n = e.state.selection.main, r = i_(t.diagnostics, null, n.to + 1);
		return !r && (r = i_(t.diagnostics, null, 0), !r || r.from == n.from && r.to == n.to) ? !1 : (e.dispatch({
			selection: {
				anchor: r.from,
				head: r.to
			},
			scrollIntoView: !0
		}), Tc(e, r.from, 1, {
			tooltip: k_,
			until: (e) => e.docChanged || e.newSelection.main.head < r.from || e.newSelection.main.head > r.to
		}), !0);
	}
}], __ = /*@__PURE__*/ E.define({ combine(e) {
	return {
		sources: e.map((e) => e.source).filter((e) => e != null),
		...bt(e.map((e) => e.config), {
			delay: 750,
			markerFilter: null,
			tooltipFilter: null,
			needsRefresh: null,
			hideOn: () => null
		}, {
			delay: Math.max,
			markerFilter: v_,
			tooltipFilter: v_,
			needsRefresh: (e, t) => e ? t ? (n) => e(n) || t(n) : e : t,
			hideOn: (e, t) => e ? t ? (n, r, i) => e(n, r, i) || t(n, r, i) : e : t,
			autoPanel: (e, t) => e || t
		})
	};
} });
function v_(e, t) {
	return e ? t ? (n, r) => t(e(n, r), r) : e : t;
}
function y_(e) {
	let t = [];
	if (e) actions: for (let { name: n } of e) {
		for (let e = 0; e < n.length; e++) {
			let r = n[e];
			if (/[a-zA-Z]/.test(r) && !t.some((e) => e.toLowerCase() == r.toLowerCase())) {
				t.push(r);
				continue actions;
			}
		}
		t.push("");
	}
	return t;
}
function b_(e, t, n) {
	let r = n ? y_(t.actions) : [];
	return j("li", { class: "cm-diagnostic cm-diagnostic-" + t.severity }, j("span", { class: "cm-diagnosticText" }, t.renderMessage ? t.renderMessage(e) : t.message), t.actions?.map((n, i) => {
		let a = !1, o = (r) => {
			if (r.preventDefault(), a) return;
			a = !0;
			let i = i_(e.state.field(u_).diagnostics, t);
			i && n.apply(e, i.from, i.to);
		}, { name: s } = n, c = r[i] ? s.indexOf(r[i]) : -1, l = c < 0 ? s : [
			s.slice(0, c),
			j("u", s.slice(c, c + 1)),
			s.slice(c + 1)
		];
		return j("button", {
			type: "button",
			class: "cm-diagnosticAction" + (n.markClass ? " " + n.markClass : ""),
			onclick: o,
			onmousedown: o,
			"aria-label": ` Action: ${s}${c < 0 ? "" : ` (access key "${r[i]})"`}.`
		}, l);
	}), t.source && j("div", { class: "cm-diagnosticSource" }, t.source));
}
var x_ = class extends yn {
	constructor(e) {
		super(), this.sev = e;
	}
	eq(e) {
		return e.sev == this.sev;
	}
	toDOM() {
		return j("span", { class: "cm-lintPoint cm-lintPoint-" + this.sev });
	}
}, S_ = class {
	constructor(e, t) {
		this.diagnostic = t, this.id = "item_" + Math.floor(Math.random() * 4294967295).toString(16), this.dom = b_(e, t, !0), this.dom.id = this.id, this.dom.setAttribute("role", "option");
	}
}, C_ = class e {
	constructor(e) {
		this.view = e, this.items = [];
		let t = (t) => {
			if (!(t.ctrlKey || t.altKey || t.metaKey)) {
				if (t.keyCode == 27) h_(this.view), this.view.focus();
				else if (t.keyCode == 38 || t.keyCode == 33) this.moveSelection((this.selectedIndex - 1 + this.items.length) % this.items.length);
				else if (t.keyCode == 40 || t.keyCode == 34) this.moveSelection((this.selectedIndex + 1) % this.items.length);
				else if (t.keyCode == 36) this.moveSelection(0);
				else if (t.keyCode == 35) this.moveSelection(this.items.length - 1);
				else if (t.keyCode == 13) this.view.focus();
				else if (t.keyCode >= 65 && t.keyCode <= 90 && this.selectedIndex >= 0) {
					let { diagnostic: n } = this.items[this.selectedIndex], r = y_(n.actions);
					for (let i = 0; i < r.length; i++) if (r[i].toUpperCase().charCodeAt(0) == t.keyCode) {
						let t = i_(this.view.state.field(u_).diagnostics, n);
						t && n.actions[i].apply(e, t.from, t.to);
					}
				} else return;
				t.preventDefault();
			}
		}, n = (e) => {
			for (let t = 0; t < this.items.length; t++) this.items[t].dom.contains(e.target) && this.moveSelection(t);
		};
		this.list = j("ul", {
			tabIndex: 0,
			role: "listbox",
			"aria-label": this.view.state.phrase("Diagnostics"),
			onkeydown: t,
			onclick: n
		}), this.dom = j("div", { class: "cm-panel-lint" }, this.list, j("button", {
			type: "button",
			name: "close",
			"aria-label": this.view.state.phrase("close"),
			onclick: () => h_(this.view)
		}, "×")), this.update();
	}
	get selectedIndex() {
		let e = this.view.state.field(u_).selected;
		if (!e) return -1;
		for (let t = 0; t < this.items.length; t++) if (this.items[t].diagnostic == e.diagnostic) return t;
		return -1;
	}
	update() {
		let { diagnostics: e, selected: t } = this.view.state.field(u_), n = 0, r = !1, i = null, a = /* @__PURE__ */ new Set();
		for (e.between(0, this.view.state.doc.length, (e, o, { spec: s }) => {
			for (let e of s.diagnostics) {
				if (a.has(e)) continue;
				a.add(e);
				let o = -1, s;
				for (let t = n; t < this.items.length; t++) if (this.items[t].diagnostic == e) {
					o = t;
					break;
				}
				o < 0 ? (s = new S_(this.view, e), this.items.splice(n, 0, s), r = !0) : (s = this.items[o], o > n && (this.items.splice(n, o - n), r = !0)), t && s.diagnostic == t.diagnostic ? s.dom.hasAttribute("aria-selected") || (s.dom.setAttribute("aria-selected", "true"), i = s) : s.dom.hasAttribute("aria-selected") && s.dom.removeAttribute("aria-selected"), n++;
			}
		}); n < this.items.length && !(this.items.length == 1 && this.items[0].diagnostic.from < 0);) r = !0, this.items.pop();
		this.items.length == 0 && (this.items.push(new S_(this.view, {
			from: -1,
			to: -1,
			severity: "info",
			message: this.view.state.phrase("No diagnostics")
		})), r = !0), i ? (this.list.setAttribute("aria-activedescendant", i.id), this.view.requestMeasure({
			key: this,
			read: () => ({
				sel: i.dom.getBoundingClientRect(),
				panel: this.list.getBoundingClientRect()
			}),
			write: ({ sel: e, panel: t }) => {
				let n = t.height / this.list.offsetHeight;
				e.top < t.top ? this.list.scrollTop -= (t.top - e.top) / n : e.bottom > t.bottom && (this.list.scrollTop += (e.bottom - t.bottom) / n);
			}
		})) : this.selectedIndex < 0 && this.list.removeAttribute("aria-activedescendant"), r && this.sync();
	}
	sync() {
		let e = this.list.firstChild;
		function t() {
			let t = e;
			e = t.nextSibling, t.remove();
		}
		for (let n of this.items) if (n.dom.parentNode == this.list) {
			for (; e != n.dom;) t();
			e = n.dom.nextSibling;
		} else this.list.insertBefore(n.dom, e);
		for (; e;) t();
	}
	moveSelection(e) {
		if (this.selectedIndex < 0) return;
		let t = i_(this.view.state.field(u_).diagnostics, this.items[e].diagnostic);
		t && this.view.dispatch({
			selection: {
				anchor: t.from,
				head: t.to
			},
			scrollIntoView: !0,
			effects: l_.of(t)
		});
	}
	static open(t) {
		return new e(t);
	}
};
function w_(e, t = "viewBox=\"0 0 40 40\"") {
	return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ${t}>${encodeURIComponent(e)}</svg>')`;
}
function T_(e) {
	return w_(`<path d="m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0" stroke="${e}" fill="none" stroke-width=".7"/>`, "width=\"6\" height=\"3\"");
}
var E_ = /*@__PURE__*/ z.baseTheme({
	".cm-diagnostic": {
		padding: "3px 6px 3px 8px",
		marginLeft: "-1px",
		display: "block",
		whiteSpace: "pre-wrap"
	},
	".cm-diagnostic-error": { borderLeft: "5px solid #d11" },
	".cm-diagnostic-warning": { borderLeft: "5px solid orange" },
	".cm-diagnostic-info": { borderLeft: "5px solid #999" },
	".cm-diagnostic-hint": { borderLeft: "5px solid #66d" },
	".cm-diagnosticAction": {
		font: "inherit",
		border: "none",
		padding: "2px 4px",
		backgroundColor: "#444",
		color: "white",
		borderRadius: "3px",
		marginLeft: "8px",
		cursor: "pointer"
	},
	".cm-diagnosticSource": {
		fontSize: "70%",
		opacity: .7
	},
	".cm-lintRange": {
		backgroundPosition: "left bottom",
		backgroundRepeat: "repeat-x",
		paddingBottom: "0.7px"
	},
	".cm-lintRange-error": { backgroundImage: /*@__PURE__*/ T_("#f11") },
	".cm-lintRange-warning": { backgroundImage: /*@__PURE__*/ T_("orange") },
	".cm-lintRange-info": { backgroundImage: /*@__PURE__*/ T_("#999") },
	".cm-lintRange-hint": { backgroundImage: /*@__PURE__*/ T_("#66d") },
	".cm-lintRange-active": { backgroundColor: "#ffdd9980" },
	".cm-tooltip-lint": {
		padding: 0,
		margin: 0
	},
	".cm-lintPoint": {
		position: "relative",
		"&:after": {
			content: "\"\"",
			position: "absolute",
			bottom: 0,
			left: "-2px",
			borderLeft: "3px solid transparent",
			borderRight: "3px solid transparent",
			borderBottom: "4px solid #d11"
		}
	},
	".cm-lintPoint-warning": { "&:after": { borderBottomColor: "orange" } },
	".cm-lintPoint-info": { "&:after": { borderBottomColor: "#999" } },
	".cm-lintPoint-hint": { "&:after": { borderBottomColor: "#66d" } },
	".cm-panel.cm-panel-lint": {
		position: "relative",
		"& ul": {
			maxHeight: "100px",
			overflowY: "auto",
			"& [aria-selected]": {
				backgroundColor: "#ddd",
				"& u": { textDecoration: "underline" }
			},
			"&:focus [aria-selected]": {
				background_fallback: "#bdf",
				backgroundColor: "Highlight",
				color_fallback: "white",
				color: "HighlightText"
			},
			"& u": { textDecoration: "none" },
			padding: 0,
			margin: 0
		},
		"& [name=close]": {
			position: "absolute",
			top: "0",
			right: "2px",
			background: "inherit",
			border: "none",
			font: "inherit",
			padding: 0,
			margin: 0
		}
	},
	"&dark .cm-lintRange-active": { backgroundColor: "#86714a80" },
	"&dark .cm-panel.cm-panel-lint ul": { "& [aria-selected]": { backgroundColor: "#2e343e" } }
});
function D_(e) {
	return e == "error" ? 4 : e == "warning" ? 3 : e == "info" ? 2 : 1;
}
function O_(e) {
	let t = "hint", n = 1;
	for (let r of e) {
		let e = D_(r.severity);
		e > n && (n = e, t = r.severity);
	}
	return t;
}
var k_ = /*@__PURE__*/ wc(f_, { hideOn: a_ }), A_ = [
	u_,
	/*@__PURE__*/ z.decorations.compute([u_], (e) => {
		let { selected: t, panel: n } = e.field(u_);
		return !t || !n || t.from == t.to ? N.none : N.set([d_.range(t.from, t.to)]);
	}),
	k_,
	E_
], j_ = [
	ol(),
	ul(),
	Vs(),
	gf(),
	bd(),
	xs(),
	js(),
	k.allowMultipleSelections.of(!0),
	qu(),
	Ed(kd, { fallback: !0 }),
	zd(),
	Ig(),
	$g(),
	nc(),
	ac(),
	Js(),
	Rm(),
	rs.of([
		...Hg,
		...Cm,
		...Dh,
		...Ff,
		...dd,
		...e_,
		...g_
	])
], M_ = /* @__PURE__ */ "import,primitive,semantic,theme,variant,enum,typeStyle,protocol,requires,host,catalog,mount,as,use,emits,emit,component,page,screen,usage,fixtures,extend,rules,previewBackground,layout,text,icon,media,spacer,Spacer,children,let,if,else,ForEach,in,case,self,null,true,false,hidden,editable,beginEditing,cancelEditing,commitEditing,PointerInput,EditableText,hoverStart,hoverEnd,pressStart,pressEnd,pressCancel,focusStart,focusEnd,activate,appear,dismiss,keyboardDismissed,keyboardCancelled,direction,align,justify,wrap,gap,padding,margin,width,height,background,content,fontSize,fontWeight,fontFamily,lineHeight,letterSpacing,LineHeight,LetterSpacing,Size,Weight,FontFamily,color,cornerRadius,Corner,EdgeInsets,Shadow,Icon,MediaSource,sfSymbols,materialSymbols,file,system,name,url,tl,tr,br,bl,x,y,blurRadius,spread,top,right,bottom,left,opacity,embed,fill,hug,.fill,.hug,.row,.column,.rowReverse,.columnReverse,.stack,.reverseStack,.stretch,.center,.start,.end,Sizing,aspect,.aspect,Direction,Wrap,Align,Justify,Overflow,BorderPosition,TruncateStyle,truncateStyle,ContentMode,AlignSelf,Position,overflow,.visible,.scroll,.clip,visible,scroll,clip,row,column,stretch,center,start,end,spaceBetween,spaceAround,spaceEvenly,nowrap".split(",");
//#endregion
//#region ../../playground/src/pdl-completions.js
function N_(e, t) {
	let n = e.doc.lineAt(t);
	return n.text.slice(0, t - n.from);
}
function P_(e, t) {
	let n = N_(e.state, e.pos), r = e.matchBefore(/[\w.]+$/), i = r ? r.from : e.pos, a = e.pos, o = (r?.text ?? "").toLowerCase(), s = /^\s*cornerRadius\s*=\s*[\w.]*$/i.test(n), c = /^\s*padding\s*=\s*[\w.]*$/i.test(n) || /^\s*margin\s*=\s*[\w.]*$/i.test(n) || /^\s*inset\s*=\s*[\w.]*$/i.test(n), l = /^\s*width\s*=\s*[\w.]*$/i.test(n) || /^\s*height\s*=\s*[\w.]*$/i.test(n), u = s || c || l;
	if (!r && !e.explicit && !u) return null;
	let d = [], f = /* @__PURE__ */ new Set();
	function p(e, t = "keyword") {
		let n = typeof e == "string" ? e : e.label;
		f.has(n) || (f.add(n), typeof e == "string" ? d.push({
			label: e,
			type: t
		}) : d.push(e));
	}
	if (s) {
		p({
			label: "Corner",
			displayLabel: "Corner(tl:, tr:, br:, bl:)",
			apply: "Corner(tl: 12, tr: 12, br: 12, bl: 12)",
			type: "function",
			boost: 90,
			detail: "per-corner radius literal",
			info: "Requires all four corners: tl, tr, br, bl (numbers or Radius tokens)."
		});
		for (let e of t()) /radius/i.test(e) && p({
			label: e,
			type: "variable",
			boost: 40
		});
	}
	if (c) {
		p({
			label: "EdgeInsetsXY",
			displayLabel: "EdgeInsets(x:, y:)",
			apply: "EdgeInsets(x: 12, y: 12)",
			type: "function",
			boost: 88,
			detail: "symmetric horizontal / vertical",
			info: "x → left & right; y → top & bottom."
		}), p({
			label: "EdgeInsetsTRBL",
			displayLabel: "EdgeInsets(top:, right:, bottom:, left:)",
			apply: "EdgeInsets(top: 12, right: 12, bottom: 12, left: 12)",
			type: "function",
			boost: 85,
			detail: "all four sides"
		});
		for (let e of t()) /spacing|inset|padding|margin|distance/i.test(e) && p({
			label: e,
			type: "variable",
			boost: 35
		});
	}
	l && (p({
		label: ".hug",
		apply: ".hug",
		type: "keyword",
		boost: 82,
		detail: "sizing"
	}), p({
		label: ".fill",
		apply: ".fill",
		type: "keyword",
		boost: 82,
		detail: "sizing"
	}), p({
		label: ".fixed",
		displayLabel: ".fixed(n)",
		apply: ".fixed(200)",
		type: "keyword",
		boost: 80,
		detail: "fixed px size"
	}), p({
		label: ".flex",
		displayLabel: ".flex(min:, max:)",
		apply: ".flex(min: 0, max: 400)",
		type: "keyword",
		boost: 75,
		detail: "flexible bounds"
	}));
	for (let e of M_) (!o || e.toLowerCase().startsWith(o)) && p(e, "keyword");
	for (let e of t()) if (!o || e.toLowerCase().includes(o)) {
		if (s && /radius/i.test(e) || c && /spacing|inset|padding|margin|distance/i.test(e)) continue;
		p(e, "variable");
	}
	return d.length === 0 ? null : (d.sort((e, t) => {
		let n = e.boost ?? 0, r = t.boost ?? 0;
		return r === n ? e.label.localeCompare(t.label) : r - n;
	}), {
		from: i,
		to: a,
		options: d.slice(0, 200)
	});
}
//#endregion
//#region ../../playground/src/pdl-templates.js
var F_ = [
	{
		id: "button",
		label: "Component · Button",
		select: "Button",
		snippet: "enum InteractionState {\n  case rest\n  case hovered\n  case pressed\n}\n\ncomponent Button <PointerInput>(\n  label: String = \"Button\",\n  interactionState: InteractionState = .rest\n) layout {\n  direction = .row\n  align = .center\n  justify = .center\n  gap = 8\n  padding = EdgeInsets(x: 16, y: 10)\n  background = #FF5A5F\n  cornerRadius = 8\n  width = .hug\n  height = .hug\n\n  if interactionState == .hovered {\n    opacity = 0.88\n  } else if interactionState == .pressed {\n    opacity = 0.75\n  } else {\n    opacity = 1\n  }\n\n  let text = Text(\n    content: label,\n    color: #FFFFFF,\n    fontSize: 15,\n    fontWeight: 600\n  )\n\n  children = [text]\n\n  // Host inbound — self. optional / clarifying\n  self.hoverStart = { interactionState = .hovered }\n  hoverEnd = { interactionState = .rest }\n  self.pressStart = { interactionState = .pressed }\n  pressEnd = { interactionState = .hovered }\n  self.pressCancel = { interactionState = .rest }\n}\n"
	},
	{
		id: "host-handlers",
		label: "Host inbound · [self.]channel handlers",
		select: "pressEnd",
		snippet: "  // Paste inside a PointerInput component kind body.\n  // Bare and self.-qualified forms are equivalent.\n  self.hoverStart = { interactionState = .hovered }\n  hoverEnd = { interactionState = .rest }\n  self.pressStart = { interactionState = .pressed }\n  pressEnd = { interactionState = .hovered }\n  self.pressCancel = { interactionState = .rest }\n"
	},
	{
		id: "search-field",
		label: "Component · SearchField (EditableText)",
		select: "SearchField",
		snippet: "protocol FormField: component {\n  requires EditableText\n  requires PointerInput\n  value: String = \"\"\n  placeholder: String = \"\"\n  emits { change(value: String) }\n}\n\ncomponent SearchField emits <FormField>(\n  value: String = \"\",\n  placeholder: String = \"Search\",\n  editing: Bool = false\n) text {\n  editable = value\n  content = placeholder\n  fontSize = 15\n  color = #111111\n  if editing {\n    content = value\n    borderColor = #0066FF\n    borderWidth = 1\n  }\n\n  self.pressEnd = {\n    if editing {\n    } else {\n      editing = true\n      beginEditing(value)\n    }\n  }\n  self.keyboardDismissed = {\n    editing = false\n    emit change(value)\n  }\n  self.keyboardCancelled = {\n    editing = false\n    cancelEditing()\n  }\n}\n"
	},
	{
		id: "host-pointer",
		label: "Component · PointerInput opt-in",
		select: "PointerTarget",
		snippet: "// PointerInput is a language prelude — no import / no protocol decl needed.\nenum PointerPhase {\n  case rest\n  case hovered\n}\n\ncomponent PointerTarget <PointerInput>(\n  interactionState: PointerPhase = .rest\n) layout {\n  width = 120\n  height = 40\n  background = #EEEEEE\n  children = []\n\n  if interactionState == .hovered {\n    background = #DDDDDD\n  }\n\n  self.hoverStart = { interactionState = .hovered }\n  hoverEnd = { interactionState = .rest }\n}\n"
	},
	{
		id: "filter-bar",
		label: "Component · Filter bar (emits + ForEach)",
		select: "FilterBar",
		snippet: "enum FilterId {\n  case all\n  case podcasts\n}\n\nprotocol SubnavItem: component {\n  requires PointerInput\n  title = \"\"\n  filter: FilterId = .all\n  emits {\n    select(filter: FilterId)\n  }\n}\n\ncomponent FilterChip emits <SubnavItem>(\n  selected: Bool = false\n) layout {\n  direction = .row\n  padding = EdgeInsets(x: 12, y: 8)\n  cornerRadius = 999\n  background = #F2F2F4\n\n  if selected {\n    background = #222222\n  }\n\n  let label = Text(\n    content: title,\n    fontSize: 13,\n    fontWeight: 600,\n    color: #111111\n  )\n  if selected {\n    label.color = #FFFFFF\n  }\n  children = [label]\n\n  self.pressEnd = { emit select(filter) }\n}\n\ncomponent FilterBar(\n  currentFilter: FilterId = .all,\n  chips: [SubnavItem] = [\n    FilterChip(title: \"All\", filter: .all),\n    FilterChip(title: \"Podcasts\", filter: .podcasts)\n  ]\n) layout {\n  direction = .row\n  gap = 8\n  padding = 12\n\n  ForEach(chips) { chip in\n    if self.currentFilter == filter {\n      chip.selected = true\n    } else {\n      chip.selected = false\n    }\n    chip.select(filter_id: FilterId) = {\n      currentFilter = filter_id\n    }\n  }\n  children = chips\n}\n"
	},
	{
		id: "text-label",
		label: "Component · Text label",
		select: "Label",
		snippet: "component Label(\n  content: String = \"Label\"\n) text {\n  content = content\n  color = #222222\n  fontSize = 14\n  fontWeight = 500\n}\n"
	},
	{
		id: "card",
		label: "Component · Card stack",
		select: "Card",
		snippet: "component Card(\n  title: String = \"Title\",\n  body: String = \"Supporting copy.\"\n) layout {\n  direction = .column\n  align = .stretch\n  gap = 8\n  padding = 16\n  background = #F7F7F8\n  cornerRadius = 12\n  width = .fill\n\n  let heading = Text(\n    content: title,\n    color: #111111,\n    fontSize: 17,\n    fontWeight: 650\n  )\n\n  let copy = Text(content: body, color: #555555, fontSize: 14)\n\n  children = [heading, copy]\n}\n"
	},
	{
		id: "row",
		label: "Component · Horizontal row",
		select: "ActionRow",
		snippet: "component ActionRow() layout {\n  direction = .row\n  align = .center\n  justify = .start\n  gap = 12\n  width = .fill\n\n  let primary = Text(\n    content: \"Primary\",\n    color: #FFFFFF,\n    fontSize: 14,\n    fontWeight: 600\n  )\n\n  let secondary = Text(content: \"Secondary\", color: #333333, fontSize: 14)\n\n  children = [primary, secondary]\n}\n"
	},
	{
		id: "variant",
		label: "Variant · Tone",
		select: "Tone",
		snippet: "variant Tone {\n  case neutral\n  case accent\n  case danger\n}\n"
	},
	{
		id: "enum",
		label: "Enum · InteractionState",
		select: "InteractionState",
		snippet: "enum InteractionState {\n  case rest\n  case hovered\n  case pressed\n}\n"
	},
	{
		id: "tokens",
		label: "Tokens · color primitive + semantic",
		select: "brandPrimary",
		snippet: "primitive atoms.color.brandPrimary: Color = #FF5A5F\nprimitive atoms.color.surface: Color = #F2F2F4\nprimitive atoms.color.onBrand: Color = #FFFFFF\n\nsemantic atoms.color.buttonFill: Color = atoms.color.brandPrimary\nsemantic atoms.color.pageBg: Color = atoms.color.surface\n"
	},
	{
		id: "if-variant",
		label: "Layout · if / else on variant",
		select: "tone",
		snippet: "  if tone == .accent {\n    background = #FF5A5F\n  } else if tone == .danger {\n    background = #D93025\n  } else {\n    background = #EEEEEE\n  }\n"
	},
	{
		id: "fixtures",
		label: "Fixtures · examples",
		select: "Button",
		snippet: "fixtures Button {\n  example \"Default\" {\n    label = \"Save\"\n  }\n  example \"Hovered\" {\n    label = \"Save\"\n    interactionState = .hovered\n  }\n}\n"
	},
	{
		id: "usage",
		label: "Usage · description on a card",
		select: "NoteCard",
		snippet: "component NoteCard() layout {\n  direction = .column\n  gap = 8\n  padding = 16\n  background = #F3F4F6\n  cornerRadius = 12\n  width = 260\n\n  let title = Text(content: \"Usage note\", color: #111827, fontSize: 16, fontWeight: 650)\n  let body = Text(content: \"The grey line under the title is usage.description.\", color: #4B5563, fontSize: 13)\n  children = [title, body]\n}\n\nusage NoteCard {\n  description = \"A written note for authors. It does not change layout.\"\n}\n"
	},
	{
		id: "rules-primary",
		label: "Rules · one primary action (red)",
		select: "TwoPrimaries",
		snippet: "variant Emphasis {\n  case primary\n  case secondary\n}\n\ncomponent Action(\n  label: String = \"OK\",\n  emphasis: Emphasis = .primary\n) layout {\n  direction = .row\n  padding = EdgeInsets(x: 16, y: 10)\n  cornerRadius = 8\n  background = #2563EB\n  if emphasis == .secondary {\n    background = #6B7280\n  }\n  let text = Text(content: label, color: #FFFFFF, fontSize: 14, fontWeight: 600)\n  children = [text]\n}\n\nrules Action {\n  tags = [\"button\"]\n  if emphasis == .primary {\n    tags.add(\"primary-action\")\n    Rule(.mustNot, siblings.where(tag: \"primary-action\").count > 0,\n      description: \"Only one primary button in this layout.\")\n  }\n}\n\ncomponent TwoPrimaries() layout {\n  direction = .row\n  gap = 12\n  let save = Action(label: \"Save\", emphasis: .primary)\n  let ok = Action(label: \"OK\", emphasis: .primary)\n  children = [save, ok]\n}\n\nusage TwoPrimaries {\n  description = \"Both actions are primary — expect two red must-not warnings.\"\n}\n"
	},
	{
		id: "rules-card",
		label: "Rules · empty card (orange)",
		select: "EmptyCard",
		snippet: "component EmptyCard() layout {\n  direction = .column\n  padding = 16\n  background = #F3F4F6\n  cornerRadius = 12\n  width = 240\n  height = 80\n  children = []\n}\n\nusage EmptyCard {\n  description = \"A card should not be left empty. Expect an orange should warning.\"\n}\n\nrules EmptyCard {\n  tags = [\"card\"]\n  Rule(.should, descendants.exists,\n    description: \"A card should contain at least one nested instance.\")\n}\n"
	},
	{
		id: "rules-field",
		label: "Rules · field needs a label (red)",
		select: "MissingLabel",
		snippet: "component FieldLabel(content: String = \"Name\") text {\n  content = content\n  color = #374151\n  fontSize = 13\n  fontWeight = 600\n}\n\nrules FieldLabel {\n  tags = [\"field-label\"]\n}\n\ncomponent Field(value: String = \"\") layout {\n  padding = EdgeInsets(x: 12, y: 8)\n  borderWidth = 1\n  borderColor = #D1D5DB\n  cornerRadius = 6\n  let text = Text(content: value, color: #111827, fontSize: 14)\n  children = [text]\n}\n\nrules Field {\n  tags = [\"field\"]\n  Rule(.must, siblings.where(tag: \"field-label\").precedes(self),\n    description: \"A field must have a label sibling before it.\")\n}\n\ncomponent MissingLabel() layout {\n  direction = .column\n  width = 260\n  let field = Field(value: \"Ada Lovelace\")\n  children = [field]\n}\n\nusage MissingLabel {\n  description = \"No FieldLabel before the field — expect a red must warning.\"\n}\n"
	},
	{
		id: "extend",
		label: "Extend · companion metadata",
		select: "Button",
		snippet: "extend Button {\n  usage {\n    description += \" Extended via extend.\"\n  }\n  fixtures {\n    example \"Alt\" {\n      label = \"Continue\"\n    }\n  }\n}\n"
	},
	{
		id: "import",
		label: "Import · relative module",
		select: "./module.pdl",
		snippet: "import \"./module.pdl\"\n"
	},
	{
		id: "typestyle",
		label: "TypeStyle · Body",
		select: "Body",
		snippet: "typeStyle Body {\n  fontSize = 15\n  fontWeight = 400\n  color = #222222\n}\n"
	},
	{
		id: "motion-modal",
		label: "Motion · Appear / dismiss card",
		select: "MotionCard",
		snippet: "component MotionCard <PointerInput>() layout {\n  direction = .column\n  gap = 8\n  padding = 20\n  width = 280\n  background = #FFFFFF\n  cornerRadius = 12\n\n  let title = Text(content: \"Hello\", color: #111827, fontSize: 16, fontWeight: 600)\n  children = [title]\n\n  self.appear = {\n    animate = Motion(\n      duration: 250, ease: Ease.bezier(0.2, 0, 0, 1),\n      pose: Pose(opacity: 0, scale: 0.95, translateY: 8)\n    )\n  }\n  self.dismiss = {\n    animate = Motion(\n      duration: 180, ease: .in,\n      pose: Pose(opacity: 0, scale: 0.95)\n    )\n  }\n}\n"
	},
	{
		id: "icon-row",
		label: "Component · Icon + label row",
		select: "IconLabel",
		snippet: "component IconLabel(\n  label: String = \"Item\"\n) layout {\n  direction = .row\n  align = .center\n  gap = 8\n  padding = EdgeInsets(x: 10, y: 6)\n\n  let glyph = Icon(\n    icon: IconRef(system: .sfSymbols, name: \"checkmark\"),\n    size: 18,\n    color: #444444\n  )\n\n  let caption = Text(\n    content: label,\n    color: #222222,\n    fontSize: 14\n  )\n\n  children = [glyph, caption]\n}\n"
	}
];
function I_(e, t, n) {
	let r = n.replace(/\s+$/, "") + "\n";
	if (t <= 0) return {
		from: 0,
		to: 0,
		insert: r
	};
	let i = e.slice(Math.max(0, t - 2), t), a = "";
	return i.endsWith("\n") ? !i.endsWith("\n\n") && t > 1 && e[t - 2] !== "\n" && (a = "\n") : a = "\n\n", {
		from: t,
		to: t,
		insert: a + r
	};
}
//#endregion
//#region ../../playground/src/add-property.js
var L_ = {
	layout: [
		{
			id: "direction",
			label: "direction",
			snippet: "direction = .row"
		},
		{
			id: "align",
			label: "align",
			snippet: "align = .center"
		},
		{
			id: "justify",
			label: "justify",
			snippet: "justify = .start"
		},
		{
			id: "gap",
			label: "gap",
			snippet: "gap = 8"
		},
		{
			id: "padding",
			label: "padding",
			snippet: "padding = EdgeInsets(x: 12, y: 8)"
		},
		{
			id: "cornerRadius",
			label: "cornerRadius",
			snippet: "cornerRadius = 8"
		},
		{
			id: "background",
			label: "background",
			snippet: "background = #EEEEEE"
		},
		{
			id: "borderWidth",
			label: "borderWidth",
			snippet: "borderWidth = 1"
		},
		{
			id: "borderColor",
			label: "borderColor",
			snippet: "borderColor = #CCCCCC"
		},
		{
			id: "width",
			label: "width",
			snippet: "width = .hug"
		},
		{
			id: "height",
			label: "height",
			snippet: "height = .hug"
		},
		{
			id: "wrap",
			label: "wrap",
			snippet: "wrap = .nowrap"
		},
		{
			id: "opacity",
			label: "opacity",
			snippet: "opacity = 1"
		}
	],
	text: [
		{
			id: "content",
			label: "content",
			snippet: "content = \"Label\""
		},
		{
			id: "color",
			label: "color",
			snippet: "color = #111111"
		},
		{
			id: "fontSize",
			label: "fontSize",
			snippet: "fontSize = 15"
		},
		{
			id: "fontWeight",
			label: "fontWeight",
			snippet: "fontWeight = 600"
		},
		{
			id: "style",
			label: "style (typeStyle)",
			snippet: "style = Body"
		},
		{
			id: "opacity",
			label: "opacity",
			snippet: "opacity = 1"
		}
	],
	icon: [{
		id: "size",
		label: "size",
		snippet: "size = 24"
	}, {
		id: "color",
		label: "color",
		snippet: "color = #111111"
	}],
	media: [
		{
			id: "source",
			label: "source",
			snippet: "source = \"\""
		},
		{
			id: "width",
			label: "width",
			snippet: "width = .fill"
		},
		{
			id: "height",
			label: "height",
			snippet: "height = 120"
		}
	],
	presenter: [
		{
			id: "width",
			label: "width",
			snippet: "width = .fill"
		},
		{
			id: "height",
			label: "height",
			snippet: "height = .fill"
		},
		{
			id: "padding",
			label: "padding",
			snippet: "padding = EdgeInsets(x: 12, y: 8)"
		},
		{
			id: "align",
			label: "align",
			snippet: "align = .center"
		},
		{
			id: "justify",
			label: "justify",
			snippet: "justify = .start"
		},
		{
			id: "overflow",
			label: "overflow",
			snippet: "overflow = .hidden"
		},
		{
			id: "background",
			label: "background",
			snippet: "background = #EEEEEE"
		},
		{
			id: "cornerRadius",
			label: "cornerRadius",
			snippet: "cornerRadius = 8"
		}
	],
	unknown: [
		{
			id: "direction",
			label: "direction (layout)",
			snippet: "direction = .column"
		},
		{
			id: "content",
			label: "content (text)",
			snippet: "content = \"\""
		},
		{
			id: "gap",
			label: "gap",
			snippet: "gap = 8"
		},
		{
			id: "padding",
			label: "padding",
			snippet: "padding = EdgeInsets(x: 12, y: 8)"
		}
	]
};
function R_(e, t) {
	let n = e.slice(0, t), r = Math.max(n.lastIndexOf(") layout {"), n.lastIndexOf(" layout {"), n.lastIndexOf(": layout = {"), n.lastIndexOf(": layout={"));
	Math.max(n.lastIndexOf(") text {"), n.lastIndexOf(": text = {"), n.lastIndexOf(": text={"), n.lastIndexOf(" let "));
	let i = Math.max(n.lastIndexOf(": icon = {"), n.lastIndexOf(") icon {")), a = Math.max(n.lastIndexOf(": media = {"), n.lastIndexOf(") media {")), o = n.lastIndexOf("Presenter("), s = [
		{
			kind: "layout",
			i: r
		},
		{
			kind: "icon",
			i
		},
		{
			kind: "media",
			i: a
		},
		{
			kind: "presenter",
			i: o
		}
	];
	return /let\s+\w+\s*:\s*text\s*=\s*\{[^}]*$/s.test(n.slice(-200)) ? "text" : /let\s+\w+\s*:\s*layout\s*=\s*\{[^}]*$/s.test(n.slice(-200)) ? "layout" : (s.sort((e, t) => t.i - e.i), s[0].i >= 0 ? s[0].kind : /component\s+\w+[^{]*\blayout\s*\{[^}]*$/s.test(n) ? "layout" : /component\s+\w+[^{]*\btext\s*\{[^}]*$/s.test(n) ? "text" : "unknown");
}
function z_(e, t, n) {
	let r = e.lastIndexOf("\n", t - 1) + 1, i = e.slice(r, t), a = i.match(/^\s*/), o = a ? a[0] : "  ";
	return i.trim().length === 0 ? {
		from: r,
		to: t,
		insert: `${o}${n}\n`
	} : {
		from: t,
		to: t,
		insert: `\n${o}${n}`
	};
}
//#endregion
//#region ../../playground/src/pdl-goto.js
function B_(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function V_(e, t) {
	if (t < 0 || t > e.length) return null;
	let n = e.lineAt(t), r = n.text, i = Math.min(Math.max(0, t - n.from), r.length), a = /\bimport\s+"([^"]+\.pdl)"/g, o;
	for (; o = a.exec(r);) {
		let e = n.from + o.index + o[0].indexOf("\"") + 1, r = e + o[1].length;
		if (t >= e - 1 && t <= r + 1) return {
			kind: "import",
			text: o[1],
			from: e,
			to: r
		};
	}
	let s = i, c = i, l = (e) => /[A-Za-z0-9_.]/.test(e);
	for (; s > 0 && l(r[s - 1]);) --s;
	for (; c < r.length && l(r[c]);) c += 1;
	let u = r.slice(s, c);
	for (; u.startsWith(".");) s += 1, u = u.slice(1);
	for (; u.endsWith(".");) --c, u = u.slice(0, -1);
	return !u || !/^[A-Za-z_]/.test(u) ? null : {
		kind: "ident",
		text: u,
		from: n.from + s,
		to: n.from + c
	};
}
function H_(e, t, n) {
	let r = String(e).replace(/\\/g, "/"), i = r.includes("/") ? r.slice(0, r.lastIndexOf("/")) : "", a = (i ? `${i}/` : "") + String(t).replace(/^\.\//, ""), o = [];
	for (let e of a.split("/")) !e || e === "." || (e === ".." ? o.pop() : o.push(e));
	let s = o.join("/");
	if (n[s] !== void 0) return s;
	let c = String(t).replace(/^.*\//, "");
	return Object.keys(n).find((e) => e === t || e.endsWith(`/${c}`) || e === c) ?? null;
}
function U_(e, t, n) {
	if (!e) return null;
	let r = [
		{
			kind: "component",
			re: RegExp(`^\\s*(?:component|page|screen)\\s+${B_(e)}\\b`)
		},
		{
			kind: "primitive",
			re: RegExp(`^\\s*primitive\\s+${B_(e)}\\b`)
		},
		{
			kind: "semantic",
			re: RegExp(`^\\s*semantic\\s+${B_(e)}\\b`)
		},
		{
			kind: "typeStyle",
			re: RegExp(`^\\s*typeStyle\\s+${B_(e)}\\b`)
		},
		{
			kind: "variant",
			re: RegExp(`^\\s*(?:variant|enum)\\s+${B_(e)}\\b`)
		},
		{
			kind: "protocol",
			re: RegExp(`^\\s*protocol\\s+${B_(e)}\\b`)
		},
		{
			kind: "theme",
			re: RegExp(`^\\s*theme\\s+${B_(e)}\\b`)
		},
		{
			kind: "usage",
			re: RegExp(`^\\s*usage\\s+${B_(e)}\\b`)
		},
		{
			kind: "fixtures",
			re: RegExp(`^\\s*fixtures\\s+${B_(e)}\\b`)
		},
		{
			kind: "case",
			re: RegExp(`^\\s*case\\s+${B_(e)}\\b`)
		}
	], i = Object.keys(t).filter((e) => e.endsWith(".pdl")).sort((e, t) => e === n ? -1 : t === n ? 1 : e.localeCompare(t));
	for (let { kind: n, re: a } of r) for (let r of i) {
		let i = (t[r] ?? "").split(/\r?\n/);
		for (let t = 0; t < i.length; t++) if (a.test(i[t] ?? "")) return {
			path: r,
			line: t + 1,
			kind: n,
			name: e
		};
	}
	return null;
}
function W_(e, t, n) {
	if (e.kind === "import") {
		let r = H_(n, e.text, t);
		return r ? {
			path: r,
			line: 1,
			kind: "import",
			name: e.text
		} : null;
	}
	return U_(e.text, t, n);
}
//#endregion
//#region src/symbols.js
function G_(e, t) {
	if (!e || !t) return null;
	let n = [
		RegExp(`^[ \\t]*(component|page|screen)\\s+${Z_(t)}\\b`, "m"),
		RegExp(`^[ \\t]*fixtures\\s+${Z_(t)}\\b`, "m"),
		RegExp(`^[ \\t]*samples\\s+${Z_(t)}\\b`, "m"),
		RegExp(`^[ \\t]*(primitive|semantic)\\s+[\\w.]*${Z_(t)}\\b`, "m")
	];
	for (let t of n) {
		let n = t.exec(e);
		if (n) return {
			line: e.slice(0, n.index).split("\n").length - 1,
			ch: 0,
			kind: n[1] || "decl"
		};
	}
	return null;
}
function K_(e) {
	let t = [], n = String(e || "").split("\n"), r = /^[ \t]*(component|page|screen|samples|fixtures|theme|catalog|host|typeStyle|protocol|variant|enum)\s+([A-Za-z_][\w]*)/, i = /^[ \t]*(primitive|semantic)\s+([A-Za-z_][\w.]*)/;
	return n.forEach((e, n) => {
		let a = r.exec(e);
		if (a) {
			t.push({
				kind: a[1],
				name: a[2],
				line: n
			});
			return;
		}
		a = i.exec(e), a && t.push({
			kind: a[1],
			name: a[2],
			line: n
		});
	}), t;
}
function q_(e, t, n) {
	let r = K_(t[e] || "").filter((e) => [
		"component",
		"page",
		"screen"
	].includes(e.kind)).map((e) => e.name);
	if (r.length) return Y_(r);
	let i = [];
	if (n?.componentFiles) for (let [t, r] of Object.entries(n.componentFiles)) (X_(r) === X_(e) || String(r).endsWith(e)) && i.push(t);
	return Y_(i);
}
function J_(e, t) {
	let n = K_(e);
	if (!n.length) return null;
	let r = Math.max(0, Math.min(Number(t) || 0, String(e || "").length)), i = String(e || "").slice(0, r).split("\n").length - 1, a = null;
	for (let e of n) if (e.line <= i) a = e;
	else break;
	return a;
}
function Y_(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e) !r || t.has(r) || (t.add(r), n.push(r));
	return n;
}
function X_(e) {
	return String(e || "").replace(/\\/g, "/").replace(/^\.\//, "");
}
function Z_(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Q_(e) {
	let t = JSON.stringify(e ?? {}), n = /* @__PURE__ */ new Set(), r = /\b([A-Z][A-Za-z0-9_]*)\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+\b/g, i;
	for (; i = r.exec(t);) n.add(i[0]);
	return [...n];
}
//#endregion
//#region src/editor.js
var G = null, $_ = null, ev = null, tv = null, nv = null, rv = !1;
function iv() {
	let t = e.catalogue, n = [];
	t?.components && n.push(...t.components), t?.themes && n.push(...t.themes);
	for (let e of t?.designSummary?.typeStyles ?? []) typeof e == "string" ? n.push(e) : e?.name && n.push(e.name);
	for (let e of t?.designSummary?.primitives ?? []) typeof e == "string" ? n.push(e) : e?.name && n.push(e.name);
	for (let e of t?.designSummary?.semantics ?? []) typeof e == "string" ? n.push(e) : e?.name && n.push(e.name);
	for (let e of Object.keys(t?.samples ?? {})) n.push(e);
	return n;
}
function av() {
	if (!G || !$_) return !1;
	let t = G.state.selection.main.head, n = V_(G.state.doc, t);
	if (!n) return !1;
	let r = W_(n, e.files, $_);
	return r ? (tv?.(r.path, r.line, r.name), !0) : !1;
}
function ov(t, n = {}) {
	return ev = n.onChange ?? null, tv = n.onGoto ?? null, nv = n.onCursorScope ?? null, G = new z({
		parent: t,
		state: k.create({
			doc: "",
			extensions: [
				j_,
				z.lineWrapping,
				rs.of([
					wm,
					...e_,
					{
						key: "F12",
						run: () => av()
					},
					{
						key: "Mod-b",
						run: () => av()
					}
				]),
				$g({ override: [(e) => P_(e, iv)] }),
				z.domEventHandlers({ click(t, n) {
					if (!(t.metaKey || t.ctrlKey)) return !1;
					let r = n.posAtCoords({
						x: t.clientX,
						y: t.clientY
					});
					if (r == null) return !1;
					let i = V_(n.state.doc, r);
					if (!i) return !1;
					let a = W_(i, e.files, $_ || e.editFile || "");
					return a ? (tv?.(a.path, a.line, a.name), !0) : !1;
				} }),
				z.updateListener.of((t) => {
					if (!rv) {
						if (t.docChanged && $_) {
							let n = t.state.doc.toString();
							e.files[$_] = n, i($_), ev?.($_, n);
						}
						(t.selectionSet || t.docChanged) && (cv(), nv?.());
					}
				}),
				z.theme({
					"&": { height: "100%" },
					".cm-scroller": {
						overflow: "auto",
						fontFamily: "var(--mono)"
					},
					".cm-tooltip-autocomplete": {
						fontFamily: "var(--mono)",
						fontSize: "12px"
					}
				})
			]
		})
	}), sv(), cv(), lv(), G;
}
function sv() {
	let e = document.getElementById("insertTemplate");
	e && (e.innerHTML = "<option value=\"\">Template…</option>" + F_.map((e) => `<option value="${e.id}">${hv(e.label)}</option>`).join(""));
}
function cv() {
	let e = document.getElementById("addProperty"), t = document.getElementById("addPropertyKind");
	if (!e || !G) return;
	let n = G.state.selection.main.head, r = R_(G.state.doc.toString(), n);
	t && (t.textContent = `Kind: ${r}`);
	let i = L_[r] || L_.unknown, a = e.value;
	e.innerHTML = "<option value=\"\">Property…</option>" + i.map((e) => `<option value="${e.id}">${hv(e.label)}</option>`).join(""), i.some((e) => e.id === a) && (e.value = a);
}
function lv() {
	document.getElementById("insertTemplate")?.addEventListener("change", (e) => {
		let t = e.target.value;
		if (!t || !G) return;
		let n = F_.find((e) => e.id === t);
		if (e.target.value = "", !n) return;
		let r = G.state.selection.main.head, i = I_(G.state.doc.toString(), r, n.snippet);
		G.dispatch({
			changes: {
				from: r,
				insert: i
			},
			selection: { anchor: r + i.length }
		}), G.focus();
	}), document.getElementById("addProperty")?.addEventListener("change", (e) => {
		let t = e.target.value;
		if (!t || !G) return;
		let n = G.state.selection.main.head, r = (L_[R_(G.state.doc.toString(), n)] || L_.unknown).find((e) => e.id === t);
		if (e.target.value = "", !r) return;
		let i = z_(G.state.doc.toString(), n, r.snippet);
		G.dispatch({
			changes: {
				from: n,
				insert: i
			},
			selection: { anchor: n + i.length }
		}), G.focus(), cv();
	});
}
function uv() {
	if (!G) return;
	let t = e.editFile;
	rv = !0;
	try {
		if (!t) {
			$_ = null, G.dispatch({ changes: {
				from: 0,
				to: G.state.doc.length,
				insert: ""
			} });
			return;
		}
		let n = e.files[t] ?? "";
		if ($_ === t && G.state.doc.toString() === n) return;
		$_ = t, G.dispatch({ changes: {
			from: 0,
			to: G.state.doc.length,
			insert: n
		} });
	} finally {
		rv = !1, cv();
	}
}
function dv(t) {
	if (!G || !e.editFile) return;
	let n = G_(e.files[e.editFile] || "", t);
	n && fv(n.line + 1);
}
function fv(e) {
	if (!G) return;
	let t = G.state.doc.line(Math.min(Math.max(1, e), G.state.doc.lines));
	G.dispatch({
		selection: { anchor: t.from },
		effects: z.scrollIntoView(t.from, { y: "start" })
	}), G.focus();
}
function pv() {
	!G || !$_ || (e.files[$_] = G.state.doc.toString());
}
function mv() {
	return G ? G.state.selection.main.head : null;
}
function hv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
//#endregion
//#region src/navigator.js
function gv(t) {
	let n = document.getElementById("navSystem"), i = document.getElementById("navFiles"), a = document.getElementById("navSearch");
	document.querySelectorAll(".nav-tab").forEach((t) => {
		t.addEventListener("click", () => {
			e.navTab = t.getAttribute("data-nav") === "files" ? "files" : "system", document.querySelectorAll(".nav-tab").forEach((e) => {
				e.classList.toggle("is-active", e === t);
			}), n.hidden = e.navTab !== "system", i.hidden = e.navTab !== "files", r();
		});
	}), a?.addEventListener("input", () => {
		e.navQuery = a.value.trim().toLowerCase(), f();
	});
	function o(e, t) {
		return t.length ? `<div class="nav-section"><div class="nav-section-title">${_v(e)}</div>${t.join("")}</div>` : "";
	}
	function s({ id: e, label: t, role: n, selected: r, inFile: i, kind: a, file: o }) {
		let s = n ? `<span class="role">${_v(n)}</span>` : "";
		return `<button type="button" class="${[
			"nav-item",
			r ? "is-selected" : "",
			!r && i ? "is-in-file" : ""
		].filter(Boolean).join(" ")}" data-kind="${a}" data-name="${vv(e)}" data-file="${vv(o || "")}">${_v(t)}${s}</button>`;
	}
	function c() {
		let r = e.catalogue, i = e.navQuery;
		if (!r) {
			n.innerHTML = "<p class=\"hint\">Open a project to load the system catalogue.</p>";
			return;
		}
		let a = /* @__PURE__ */ new Set();
		if (e.editFile && e.selectedKind === "component") {
			for (let t of r.components ?? []) {
				let n = d(t);
				n && n === e.editFile && a.add(t);
			}
			let t = e.files[e.editFile] || "", n = /^\s*(?:component|page|screen)\s+([A-Za-z_][\w]*)/gm, i;
			for (; i = n.exec(t);) a.add(i[1]);
		}
		let c = [], l = r.designSummary ?? {}, f = r.tokenTables ?? {};
		(l.primitives?.length || l.semantics?.length || Object.keys(f.primitives ?? {}).length || Object.keys(f.semantics ?? {}).length) && (!i || "tokens".includes(i) || "foundation".includes(i)) && c.push(s({
			id: "__tokens__",
			label: "Tokens",
			kind: "foundation",
			file: u(),
			selected: e.selectedKind === "tokens"
		})), (l.typeStyles ?? Object.keys(f.typeStyles ?? {})).length && (!i || "type".includes(i) || "styles".includes(i)) && c.push(s({
			id: "__typeStyles__",
			label: "Type styles",
			kind: "typeStyles",
			file: u(),
			selected: e.selectedKind === "typeStyles"
		}));
		for (let t of r.themes ?? []) i && !t.toLowerCase().includes(i) || c.push(s({
			id: t,
			label: t,
			role: "theme",
			kind: "theme",
			selected: e.selectedKind === "theme" && e.selectedSymbol === t
		}));
		let p = [], m = [], h = [];
		for (let t of r.components ?? []) {
			if (i && !t.toLowerCase().includes(i)) continue;
			let n = r.componentRoles?.[t], o = d(t), c = e.selectedKind === "component" && e.selectedSymbol === t, l = s({
				id: t,
				label: t,
				role: n,
				kind: "symbol",
				file: o,
				selected: c,
				inFile: !c && a.has(t)
			});
			n === "screen" ? h.push(l) : n === "page" ? m.push(l) : p.push(l);
		}
		let g = [];
		for (let t of Object.keys(r.samples ?? {})) i && !t.toLowerCase().includes(i) || g.push(s({
			id: t,
			label: t,
			role: "samples",
			kind: "samples",
			selected: e.selectedKind === "samples" && e.selectedSymbol === t
		}));
		e.mode === "prototype" ? n.innerHTML = o("Screens", h) + o("Pages", m) + o("Components", p) + o("Samples", g) + o("Foundations", c) : n.innerHTML = o("Foundations", c) + o("Components", p) + o("Pages", m) + o("Screens", h) + o("Samples", g), n.querySelectorAll(".nav-item").forEach((e) => {
			e.addEventListener("click", () => {
				t.onSelect({
					kind: e.getAttribute("data-kind"),
					name: e.getAttribute("data-name"),
					file: e.getAttribute("data-file") || void 0
				});
			});
		});
	}
	function l() {
		let n = e.navQuery, r = Object.keys(e.files).sort(), a = r.filter((e) => !n || e.toLowerCase().includes(n)).map((t) => s({
			id: t,
			label: t,
			kind: "file",
			file: t,
			selected: e.editFile === t
		}));
		i.innerHTML = a.length ? `<div class="nav-section">${a.map((e) => e.replace("nav-item", "nav-item nav-file")).join("")}</div>` : "<p class=\"hint\">No files</p>", i.innerHTML = a.length ? `<div class="nav-section">${r.filter((e) => !n || e.toLowerCase().includes(n)).map((t) => `<button type="button" class="nav-item nav-file${e.selectedKind === "file" && e.editFile === t || e.editFile === t && e.selectedKind === "component" || e.editFile === t && (e.selectedKind === "tokens" || e.selectedKind === "theme" || e.selectedKind === "typeStyles") ? " is-selected" : ""}" data-kind="file" data-name="${vv(t)}" data-file="${vv(t)}">${_v(t)}</button>`).join("")}</div>` : "<p class=\"hint\">No files</p>", i.querySelectorAll(".nav-item").forEach((e) => {
			e.addEventListener("click", () => {
				t.onSelect({
					kind: "file",
					name: e.getAttribute("data-name"),
					file: e.getAttribute("data-file")
				});
			});
		});
	}
	function u() {
		return Object.keys(e.files).find((e) => /foundation\.pdl$/i.test(e)) || Object.keys(e.files).find((e) => /token/i.test(e)) || null;
	}
	function d(t) {
		let n = e.catalogue?.componentFiles?.[t];
		if (n) {
			let t = String(n).replace(/\\/g, "/"), r = Object.keys(e.files).find((e) => t.endsWith(e) || e.endsWith(t) || t.includes(e));
			if (r) return r;
		}
		for (let [n, r] of Object.entries(e.files)) if (RegExp(`\\b(component|page|screen)\\s+${t}\\b`).test(r)) return n;
		return null;
	}
	function f() {
		c(), l();
	}
	return {
		renderNavigator: f,
		resolveComponentFile: d,
		guessFoundationFile: u
	};
}
function _v(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function vv(e) {
	return _v(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/world.js
function yv(t) {
	let n = document.getElementById("worldChips"), i = document.getElementById("samplesUsed"), a = document.getElementById("paramKnobs"), o = document.getElementById("worldMode");
	o?.querySelectorAll("[data-world-mode]").forEach((t) => {
		t.addEventListener("click", () => {
			e.worldMode = t.getAttribute("data-world-mode") === "params" ? "params" : "fixtures", r(), l();
		});
	});
	function s() {
		return e.previewRoot;
	}
	function c(t, n) {
		if (!o) return;
		let r = t && n;
		o.hidden = !r, r || (n && !t ? e.worldMode = "params" : t && !n && (e.worldMode = "fixtures")), o.querySelectorAll("[data-world-mode]").forEach((t) => {
			t.classList.toggle("is-active", t.getAttribute("data-world-mode") === e.worldMode);
		});
	}
	function l() {
		let u = s(), d = e.catalogue;
		if (!u || !d || e.selectedKind !== "component") {
			o && (o.hidden = !0), n.innerHTML = "<span class=\"hint\">Select a component to choose a world.</span>", i.hidden = !0, a.innerHTML = "";
			return;
		}
		let f = d.fixturesByComponent?.[u] ?? {}, p = Object.keys(f), m = e.activeWorld[u] ?? null, h = (d.componentParams?.[u] ?? []).filter((e) => e.typeName !== "object").slice(0, 12), g = p.length > 0, _ = h.length > 0;
		c(g, _);
		let v = e.worldMode === "fixtures" || !_, y = e.worldMode === "params" || !g;
		if (!v) n.innerHTML = "", i.hidden = !0, i.innerHTML = "";
		else if (!g) n.innerHTML = `<span class="hint">No fixtures for ${xv(u)}. Switch to Params to edit knobs.</span>`, i.hidden = !0;
		else {
			n.innerHTML = [`<button type="button" class="chip${m ? "" : " is-active"}" data-world="">Default</button>`, ...p.map((e) => `<button type="button" class="chip${m === e ? " is-active" : ""}" data-world="${Sv(e)}">${xv(e)}</button>`)].join(""), n.querySelectorAll(".chip").forEach((n) => {
				n.addEventListener("click", () => {
					let i = n.getAttribute("data-world") || null;
					e.activeWorld[u] = i, e.worldMode = "fixtures", i && f[i] ? e.paramOverrides[u] = {
						...e.paramOverrides[u] ?? {},
						...bv(f[i])
					} : e.paramOverrides[u] = {}, r(), t.onChange(), l();
				});
			});
			let a = Q_(m && f[m] ? f[m] : {});
			a.length ? (i.hidden = !1, i.innerHTML = "Samples used " + a.map((e) => `<button type="button" data-sample="${Sv(e)}">${xv(e)}</button>`).join(" "), i.querySelectorAll("button").forEach((e) => {
				e.addEventListener("click", () => t.onSampleClick?.(e.getAttribute("data-sample")));
			})) : (i.hidden = !0, i.innerHTML = "");
		}
		if (!y) {
			a.innerHTML = "";
			return;
		}
		let b = e.paramOverrides[u] ?? {};
		if (!h.length) {
			a.innerHTML = "<span class=\"hint\">No editable params on this component.</span>";
			return;
		}
		a.innerHTML = "<div class=\"hint\" style=\"margin-bottom:6px\">Param knobs · preview only (clears active fixture)</div>" + h.map((e) => {
			let t = d.variantCases?.[e.typeName], n = b[e.name] ?? e.default ?? "";
			return Array.isArray(t) && t.length ? `<label><span>${xv(e.name)}</span><select data-param="${Sv(e.name)}">${t.map((e) => `<option value="${Sv(e)}"${String(n) === e || String(n) === `.${e}` ? " selected" : ""}>${xv(e)}</option>`).join("")}</select></label>` : `<label><span>${xv(e.name)}</span><input data-param="${Sv(e.name)}" value="${Sv(String(n ?? ""))}" /></label>`;
		}).join(""), a.querySelectorAll("[data-param]").forEach((n) => {
			let r = () => {
				let r = n.getAttribute("data-param");
				if (!r) return;
				e.activeWorld[u] = null, e.worldMode = "params", e.paramOverrides[u] || (e.paramOverrides[u] = {});
				let i = n.value, a = d.variantCases?.[h.find((e) => e.name === r)?.typeName];
				Array.isArray(a) && a.includes(i) && (i = `.${i.replace(/^\./, "")}`), i === "true" ? i = !0 : i === "false" ? i = !1 : i !== "" && !Number.isNaN(Number(i)) && /^-?\d+(\.\d+)?$/.test(i) && (i = Number(i)), e.paramOverrides[u][r] = i, t.onChange(), l();
			};
			n.addEventListener("change", r), n.addEventListener("keydown", (e) => {
				e.key === "Enter" && r();
			});
		});
	}
	return { renderWorld: l };
}
function bv(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = r);
	return t;
}
function xv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Sv(e) {
	return xv(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/companions.js
function Cv(t) {
	let n = document.getElementById("companionDock");
	function r(t) {
		if (!t) return null;
		for (let [n, r] of Object.entries(e.files)) if (RegExp(`\\b(fixtures|usage|rules|extend)\\s+${Ev(t)}\\b`).test(r)) return n;
		return Object.keys(e.files).find((e) => /companions\.pdl$/i.test(e)) || null;
	}
	function i() {
		if (!n) return;
		if (e.selectedKind === "tokens" || e.selectedKind === "theme" || e.selectedKind === "typeStyles" || e.selectedKind === "samples" || e.selectedKind === "file") {
			n.innerHTML = `<p class="hint">${{
				tokens: "Tokens",
				theme: "Theme",
				typeStyles: "Type styles",
				samples: "Samples",
				file: "File"
			}[e.selectedKind] || "Selection"} scope — usage and rules appear for components.</p>`;
			return;
		}
		let i = e.previewRoot || e.selectedSymbol, a = e.catalogue;
		if (!i || i === "__tokens__" || i === "__typeStyles__" || !a) {
			n.innerHTML = "<p class=\"hint\">Select a component to see usage and rules.</p>";
			return;
		}
		let o = a.usageByComponent?.[i], s = a.rulesByComponent?.[i], c = r(i), l = Object.keys(e.files).find((t) => RegExp(`\\b(component|page|screen)\\s+${Ev(i)}\\b`).test(e.files[t])) || null, u = [];
		if (u.push(`<div class="notes-title">${wv(i)}</div>`), c || l) {
			if (u.push("<div class=\"notes-actions\">"), l && u.push(`<button type="button" class="btn ghost btn-tiny" data-reveal="${Tv(l)}" data-sym="${Tv(i)}">Open layout</button>`), c && u.push(`<button type="button" class="btn ghost btn-tiny" data-reveal="${Tv(c)}" data-sym="${Tv(i)}">Open companions</button>`), c && e.files[c]) {
				let t = G_(e.files[c], i);
				t && u.push(`<span class="hint">${wv(c)}${t.line == null ? "" : `:${t.line + 1}`}</span>`);
			}
			u.push("</div>");
		}
		if (o ? u.push(`<div class="notes-section"><div class="notes-label">Usage</div><pre class="notes-body">${wv(o)}</pre></div>`) : u.push("<div class=\"notes-section\"><div class=\"notes-label\">Usage</div><p class=\"hint\">No usage note for this symbol.</p></div>"), s && (s.rules?.length || s.tagOps?.length)) {
			let e = (s.rules ?? []).map((e) => {
				let t = e.severity || e.level || "should", n = e.message || e.text || JSON.stringify(e);
				return `<li class="rule rule-${Tv(String(t))}"><span class="sev">${wv(String(t))}</span> ${wv(String(n))}</li>`;
			}).join("");
			u.push(`<div class="notes-section"><div class="notes-label">Rules</div><ul class="rule-list">${e || "<li class=\"hint\">Tags only</li>"}</ul></div>`);
		} else u.push("<div class=\"notes-section\"><div class=\"notes-label\">Rules</div><p class=\"hint\">No rules companion.</p></div>");
		let d = a.interactionsByComponent?.[i];
		if (Array.isArray(d) && d.length) {
			let e = [];
			for (let t of d) for (let n of t.handlers ?? []) n?.event && e.push(String(n.event));
			e.length && u.push(`<div class="notes-section"><div class="notes-label">Host events</div><p class="hint">${wv(e.join(" · "))} — runtime → this component (not parent emits)</p></div>`);
		}
		n.innerHTML = u.join(""), n.querySelectorAll("[data-reveal]").forEach((e) => {
			e.addEventListener("click", () => {
				t.onReveal(e.getAttribute("data-reveal"), e.getAttribute("data-sym") || void 0);
			});
		});
	}
	return {
		renderCompanion: i,
		findCompanionFile: r
	};
}
function wv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Tv(e) {
	return wv(e).replace(/"/g, "&quot;");
}
function Ev(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//#endregion
//#region src/problems.js
var Dv = [], Ov = null;
function kv(e = {}) {
	Ov = e.onGoto ?? null, document.getElementById("btnClearProblems")?.addEventListener("click", () => {
		jv();
	});
}
function Av(e, t = {}) {
	if (!e) {
		jv();
		return;
	}
	Dv = Mv(e, t.file), Nv();
}
function jv() {
	Dv = [], Nv();
}
function Mv(e, t) {
	let n = String(e).split(/\n/).map((e) => e.trim()).filter(Boolean);
	return n.length ? n.map((e) => {
		let n = /^(.+?\.pdl):(\d+)(?::\d+)?:\s*(.*)$/.exec(e) || /(?:at\s+|in\s+)(.+?\.pdl):(\d+)/i.exec(e);
		return n ? {
			message: n[3] || e,
			file: (n[1].replace(/^.*\//, "").includes("/"), n[1]),
			line: Number(n[2]),
			raw: e
		} : (n = /PDL-E\d+[^:]*:\s*(.*)/.exec(e), {
			message: e,
			file: t,
			raw: e
		});
	}) : [{
		message: String(e),
		file: t
	}];
}
function Nv() {
	let e = document.getElementById("problems"), t = document.getElementById("btnClearProblems");
	if (e) {
		if (!Dv.length) {
			e.hidden = !0, e.innerHTML = "", t && (t.hidden = !0);
			return;
		}
		e.hidden = !1, t && (t.hidden = !1), e.innerHTML = Dv.map((e, t) => `<div class="prob-row">${e.file && e.line ? `<button type="button" class="prob-loc" data-i="${t}">${Fv(Pv(e.file))}:${e.line}</button>` : e.file ? `<span class="prob-loc">${Fv(Pv(e.file))}</span>` : ""}<span class="prob-msg">${Fv(e.message || e.raw || "")}</span></div>`).join(""), e.querySelectorAll(".prob-loc[data-i]").forEach((e) => {
			e.addEventListener("click", () => {
				let t = Number(e.getAttribute("data-i")), n = Dv[t];
				n && Ov?.(n);
			});
		});
	}
}
function Pv(e) {
	return String(e).replace(/\\/g, "/").split("/").slice(-2).join("/");
}
function Fv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
//#endregion
//#region ../../playground/src/wasm-bake.js
var Iv = null;
function Lv(e, t) {
	let n = {};
	for (let [t, r] of Object.entries(e ?? {})) {
		let e = `/v/${String(t).replace(/^\/+/, "").replace(/\\/g, "/")}`;
		n[e] = r;
	}
	let r = `/v/${String(t).replace(/^\/+/, "").replace(/\\/g, "/")}`;
	return {
		filesJson: JSON.stringify(n),
		entry: r
	};
}
function Rv() {
	return Iv ||= (async () => {
		try {
			let e = await import(
				/* @vite-ignore */
				`/wasm/pdl_wasm.js?v=${Date.now()}`
);
			return await e.default(), {
				analyze_sources: e.analyze_sources,
				bake_component_sources: e.bake_component_sources,
				bake_variant_matrix_sources: e.bake_variant_matrix_sources,
				bake_system_sources: e.bake_system_sources,
				apply_presenter_pins: e.apply_presenter_pins
			};
		} catch (e) {
			return console.warn("WASM bake unavailable:", e), null;
		}
	})(), Iv;
}
//#endregion
//#region ../../playground/src/preview-apply.js
function zv(e) {
	return !e || e.nodeType !== 1 || typeof e.getAttribute != "function" ? null : e.getAttribute("data-pdl-instance-let") || e.getAttribute("data-pdl-id") || e.getAttribute("data-pdl-state") || e.getAttribute("data-pdl-instance-key") || null;
}
var Bv = [
	"class",
	"style",
	"hidden",
	"value",
	"placeholder",
	"readonly",
	"tabindex",
	"aria-disabled",
	"data-pdl-session-params",
	"data-pdl-instance-kwargs",
	"data-pdl-editable",
	"data-pdl-state",
	"data-pdl-pointer-input"
];
function Vv(e, t) {
	for (let n of Bv) {
		if (n === "value" && e.tagName === "INPUT") {
			if (e === e.ownerDocument.activeElement) continue;
			let n = t.getAttribute("value");
			n != null && e.value !== n && (e.value = n);
			continue;
		}
		if (n === "hidden") {
			t.hasAttribute("hidden") ? e.setAttribute("hidden", "") : e.removeAttribute("hidden");
			continue;
		}
		if (t.hasAttribute(n)) {
			let r = t.getAttribute(n);
			e.getAttribute(n) !== r && e.setAttribute(n, r ?? "");
		} else e.hasAttribute(n) && n.startsWith("data-") ? e.removeAttribute(n) : e.hasAttribute(n) && (n === "style" || n === "class") && e.setAttribute(n, t.getAttribute(n) ?? "");
	}
	for (let n of Array.from(t.attributes)) !n.name.startsWith("data-") && n.name !== "style" && n.name !== "class" || Bv.includes(n.name) || e.getAttribute(n.name) !== n.value && e.setAttribute(n.name, n.value);
}
function Hv(e, t) {
	let n = Array.from(t.children), r = Array.from(e.children), i = /* @__PURE__ */ new Map();
	for (let e of r) {
		let t = zv(e);
		t && !i.has(t) && i.set(t, e);
	}
	let a = [], o = /* @__PURE__ */ new Set();
	function s(e) {
		let t = e.className || "";
		return r.find((n) => !o.has(n) && !zv(n) && n.tagName === e.tagName && (n.className || "") === t);
	}
	for (let t of n) {
		let n = zv(t), r = n ? i.get(n) : null;
		r && o.has(r) && (r = null), !r && !n && (r = s(t) || null), r && r.tagName === t.tagName ? (o.add(r), Uv(r, t), a.push(r)) : a.push(e.ownerDocument.importNode(t, !0));
	}
	for (; e.firstChild;) e.removeChild(e.firstChild);
	for (let t of a) e.appendChild(t);
}
function Uv(e, t) {
	if (e.tagName !== t.tagName) {
		e.replaceWith(e.ownerDocument.importNode(t, !0));
		return;
	}
	if (Vv(e, t), e.tagName === "INPUT") return;
	if (e.tagName === "SELECT") {
		let n = e.children.length > 0, r = t.children.length > 0;
		(n || r) && Hv(e, t);
		let i = t, a = e;
		a.value !== i.value && (a.value = i.value);
		return;
	}
	let n = e.children.length > 0, r = t.children.length > 0;
	if (!n && !r) {
		e.textContent !== t.textContent && (e.textContent = t.textContent);
		return;
	}
	Hv(e, t);
}
function Wv(e, t) {
	let n = new e.defaultView.DOMParser().parseFromString(t, "text/html"), r = e.querySelector(".pdl-gallery"), i = n.querySelector(".pdl-gallery");
	if (!r || !i) return !1;
	let a = Array.from(e.querySelectorAll("section.pdl-preview[data-pdl-component]")), o = Array.from(n.querySelectorAll("section.pdl-preview[data-pdl-component]"));
	if (a.length === 0 || a.length !== o.length) return !1;
	let s = /* @__PURE__ */ new Map();
	for (let e of o) {
		let t = e.getAttribute("data-pdl-component");
		t && s.set(t, e);
	}
	for (let e of a) {
		let t = e.getAttribute("data-pdl-component"), n = t ? s.get(t) : null;
		if (!n) return !1;
		let r = e.getAttribute("data-world-mode"), i = e.querySelector(".pdl-preview-params"), a = n.querySelector(".pdl-preview-params");
		if (i && a) {
			let e = a.getAttribute("data-json") || a.querySelector(".pdl-preview-params-line")?.textContent || a.textContent || "{}";
			i.setAttribute("data-json", e);
			let t = i.querySelector(".pdl-preview-params-line"), n = i.querySelector(".pdl-preview-params-full"), r = a.querySelector(".pdl-preview-params-full");
			t && (t.textContent = e), n && (n.textContent = r?.textContent || (() => {
				try {
					return JSON.stringify(JSON.parse(e), null, 2);
				} catch {
					return e;
				}
			})()), !t && !n && (i.textContent = e);
		}
		let o = e.querySelector(".pdl-world-mode"), c = n.querySelector(".pdl-world-mode");
		if (o && c) Uv(o, c);
		else if (!o && c) {
			let t = e.querySelector(".pdl-preview-head"), n = e.ownerDocument.importNode(c, !0);
			t ? t.insertAdjacentElement("afterend", n) : e.insertBefore(n, e.firstChild);
		} else o && !c && o.remove();
		let l = e.querySelector(".pdl-fixture-bar"), u = n.querySelector(".pdl-fixture-bar");
		if (l && u) l.replaceWith(e.ownerDocument.importNode(u, !0));
		else if (!l && u) {
			let t = e.querySelector(".pdl-preview-head"), n = e.querySelector(".pdl-world-mode") || t, r = e.ownerDocument.importNode(u, !0);
			n ? n.insertAdjacentElement("afterend", r) : e.insertBefore(r, e.firstChild);
		} else l && !u && l.remove();
		let d = e.querySelector(".pdl-param-bar"), f = n.querySelector(".pdl-param-bar");
		if (d && f) d.replaceWith(e.ownerDocument.importNode(f, !0));
		else if (!d && f) {
			let t = e.querySelector(".pdl-preview-head"), n = e.querySelector(".pdl-fixture-bar") || e.querySelector(".pdl-world-mode") || t, r = e.ownerDocument.importNode(f, !0);
			n ? n.insertAdjacentElement("afterend", r) : e.insertBefore(r, e.firstChild);
		} else d && !f && d.remove();
		r && (e.setAttribute("data-world-mode", r), e.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((e) => {
			e.classList.toggle("is-active", e.getAttribute("data-world-mode") === r);
		}));
		let p = Gv(e), m = Gv(n);
		if (p.length === m.length && p.length > 0) for (let e = 0; e < p.length; e++) Uv(p[e], m[e]);
		else Kv(e, n);
	}
	return !0;
}
function Gv(e) {
	let t = [];
	for (let n of Array.from(e.children)) n.classList.contains("pdl-preview-head") || n.classList.contains("pdl-preview-params") || n.classList.contains("pdl-param-bar") || n.classList.contains("pdl-fixture-bar") || n.classList.contains("pdl-world-mode") || n.classList.contains("pdl-source-link") || t.push(n);
	return t;
}
function Kv(e, t) {
	let n = Gv(e), r = Gv(t);
	for (let e of n) e.remove();
	let i = e.querySelector(".pdl-param-bar") || e.querySelector(".pdl-fixture-bar") || e.querySelector(".pdl-preview-params");
	for (let t of r) {
		let n = e.ownerDocument.importNode(t, !0);
		i && i.parentElement === e ? i.insertAdjacentElement("afterend", n) : e.appendChild(n);
	}
}
function qv(e) {
	try {
		e.contentWindow?.postMessage({ type: "pdl-rebind-interactive" }, "*");
	} catch {}
}
//#endregion
//#region ../../playground/src/presenter-pins.js
function Jv(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return e;
	let t = e;
	if (t.kind != null && t.kind !== "presentationMotion") return e;
	let n = String(t.front ?? "").replace(/^\./, "");
	return n === "incoming" || n === "outgoing" ? e : {
		...t,
		front: ".outgoing"
	};
}
function Yv(e) {
	if (!e || typeof e != "object") return null;
	let t = e, n = t.component == null ? "" : String(t.component);
	if (!n) return null;
	let r = {
		component: n,
		params: t.params && typeof t.params == "object" && !Array.isArray(t.params) ? { ...t.params } : {}
	};
	return t.move != null && (r.move = t.move), t.dismissMove != null && (r.dismissMove = t.dismissMove), r;
}
function Xv(e, t) {
	let n = {};
	if (e && typeof e == "object" && !Array.isArray(e)) for (let [t, r] of Object.entries(e)) {
		if (!r || typeof r != "object" || Array.isArray(r)) continue;
		let e = r, i = { stack: Array.isArray(e.stack) ? e.stack.map((e) => Yv(e)).filter((e) => e != null) : [] }, a = Yv(e.cover);
		a && (i.cover = a), e.lastMove != null && (i.lastMove = e.lastMove), e.lastDismissMove != null && (i.lastDismissMove = e.lastDismissMove), n[t] = i;
	}
	for (let e of t ?? []) {
		if (!e || typeof e != "object") continue;
		let t = typeof e.qualifier == "string" && e.qualifier.trim() ? e.qualifier : "presenter", r = n[t] ?? { stack: [] }, i = [...r.stack], a = Yv(e.page);
		switch (e.name) {
			case "push":
				a && (e.move != null && (a.move = e.move), e.dismissMove == null ? e.move != null && (a.dismissMove = e.move) : a.dismissMove = e.dismissMove, i.push(a)), e.move == null ? delete r.lastMove : r.lastMove = e.move, e.dismissMove != null || e.move != null ? r.lastDismissMove = e.dismissMove ?? e.move : delete r.lastDismissMove;
				break;
			case "pop":
				i.length > 1 && i.pop();
				break;
			case "replace":
				a && (i.length ? i[i.length - 1] = a : i.push(a));
				break;
			case "present":
				a && (r.cover = a);
				break;
			case "dismiss":
				delete r.cover;
				break;
			default: continue;
		}
		r.stack = i, n[t] = r;
	}
	return n;
}
function Zv(e, t) {
	for (let n of e ?? []) {
		if (!n || typeof n != "object") continue;
		let e = typeof n.qualifier == "string" && n.qualifier.trim() ? n.qualifier : "presenter";
		if ((n.name === "push" || n.name === "present" && !n.style) && n.move && typeof n.move == "object") return n.move;
		if (n.name === "pop" || n.name === "dismiss") {
			if (n.move && typeof n.move == "object") return Jv(n.move);
			let r = t && typeof t == "object" && !Array.isArray(t) ? t[e] : null;
			if (r && typeof r == "object" && !Array.isArray(r)) {
				let e = r, t = Array.isArray(e.stack) ? e.stack : [], n = t.length > 1 && t[t.length - 1] && typeof t[t.length - 1] == "object" ? t[t.length - 1] : null;
				if (n?.dismissMove && typeof n.dismissMove == "object") return Jv(n.dismissMove);
				if (n?.move && typeof n.move == "object") return Jv(n.move);
				if (e.lastDismissMove && typeof e.lastDismissMove == "object") return Jv(e.lastDismissMove);
				if (e.lastMove && typeof e.lastMove == "object") return Jv(e.lastMove);
			}
		}
	}
	return null;
}
var Qv = /* @__PURE__ */ new Set([
	"opacity",
	"scale",
	"scaleX",
	"scaleY",
	"translateX",
	"translateY",
	"blur",
	"rotate",
	"originX",
	"originY"
]);
function $v(e) {
	return Qv.has(e);
}
var ey = {
	opacity: 1,
	scale: 1,
	translateX: 0,
	translateY: 0,
	blur: 0,
	rotate: 0
};
function ty(e) {
	if (e && typeof e == "object" && !Array.isArray(e)) {
		let t = e;
		if (t.kind === "easeBezier") {
			let e = Number(t.x1), n = Number(t.y1), r = Number(t.x2), i = Number(t.y2);
			if ([
				e,
				n,
				r,
				i
			].every(Number.isFinite)) return `cubic-bezier(${e}, ${n}, ${r}, ${i})`;
		}
	}
	if (typeof e != "string") return "linear";
	let t = e.trim().replace(/^\./, "");
	return t === "in" || t === "ease-in" ? "ease-in" : t === "out" || t === "ease-out" ? "ease-out" : t === "linear" ? "linear" : t.startsWith("cubic-bezier") ? t : "linear";
}
function ny(e) {
	if (typeof e != "object" || !e) return;
	let t = e, n = Number(t.duration);
	if (!Number.isFinite(n) || n < 0) return;
	let r = ty(t.ease ?? t.easing), i = Number(t.delay);
	return {
		duration: n,
		easing: r,
		delay: Number.isFinite(i) && i > 0 ? i : 0
	};
}
function ry(e) {
	if (typeof e != "object" || !e) return;
	let t = e, n = Number(t.duration);
	if (!Number.isFinite(n) || n < 0) return;
	let r = Number(t.delay);
	return {
		duration: n,
		ease: t.ease ?? t.easing ?? "linear",
		delay: Number.isFinite(r) && r > 0 ? r : 0
	};
}
function iy(e, t = 1) {
	let n = `translate(${e.translateX ?? 0}px, ${e.translateY ?? 0}px) rotate(${e.rotate ?? 0}deg) scale(${e.scaleX ?? e.scale ?? 1}, ${e.scaleY ?? e.scale ?? 1})`, r = String(e.opacity ?? t), i = e.blur ?? 0, a = i > 0 ? `blur(${i}px)` : "none", o = e.originX, s = e.originY;
	return {
		transform: n,
		opacity: r,
		filter: a,
		transformOrigin: o != null || s != null ? `${(o ?? .5) * 100}% ${(s ?? .5) * 100}%` : "center"
	};
}
//#endregion
//#region ../../src/applyMotion.ts
function ay(e) {
	return e === "rest" || e === ".rest" || typeof e == "string" && e.replace(/^\./, "") === "rest" ? "rest" : cy(e);
}
function oy(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return;
	let t = e, n = ry(t.timing ?? t);
	if (!n) return;
	let r = ay(t.pose);
	if (r != null) return {
		timing: n,
		pose: r
	};
}
function sy(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return;
	let t = e;
	if (t.kind === "motion") {
		let t = oy(e);
		return t ? {
			kind: "animation",
			keys: [t],
			land: !0
		} : void 0;
	}
	if (t.kind !== "animation" && t.keys == null && t.start == null || !Array.isArray(t.keys)) return;
	let n = t.keys.map((e) => oy(e)).filter((e) => e != null);
	if (!n.length) return;
	let r = {
		kind: "animation",
		keys: n
	};
	if (t.start != null) {
		let e = ay(t.start);
		e != null && (r.start = e);
	}
	let i = t.stagger;
	if (i && typeof i == "object" && !Array.isArray(i)) {
		let e = i, t = Number(e.step);
		Number.isFinite(t) && t >= 0 && (r.stagger = t);
		let n = typeof e.from == "string" ? e.from.replace(/^\./, "") : void 0;
		(n === "first" || n === "last") && (r.staggerFrom = n);
	} else typeof i == "number" && Number.isFinite(i) && (r.stagger = i);
	if (typeof t.staggerFrom == "string") {
		let e = t.staggerFrom.replace(/^\./, "");
		(e === "first" || e === "last") && (r.staggerFrom = e);
	}
	if (typeof t.repeat == "string" && t.repeat.replace(/^\./, "") === "forever") r.repeat = "forever";
	else {
		let e = Number(t.repeat);
		Number.isFinite(e) && e >= 1 && (r.repeat = e);
	}
	if (t.land === !0) r.land = !0;
	else {
		let e = n[n.length - 1];
		e && e.pose === "rest" && (r.land = !0);
	}
	return r;
}
function cy(e) {
	if (typeof e != "object" || !e) return;
	let t = e, n = t.props && typeof t.props == "object" && !Array.isArray(t.props) ? t.props : t, r = {};
	for (let e of Object.keys(n)) {
		if (!$v(e)) continue;
		let t = Number(n[e]);
		Number.isFinite(t) && (r[e] = t);
	}
	return Object.keys(r).length ? r : void 0;
}
function ly(e) {
	if (typeof e == "number" && Number.isFinite(e)) return e;
	if (e && typeof e == "object" && !Array.isArray(e) && "value" in e) {
		let t = Number(e.value);
		if (Number.isFinite(t)) return t;
	}
	if (typeof e == "string" && e.trim()) {
		let t = Number(e);
		if (Number.isFinite(t)) return t;
	}
}
function uy(e) {
	if (e != null) {
		if (typeof e == "string" || e && typeof e == "object" && e.kind === "easeBezier") return e;
		if (e && typeof e == "object" && !Array.isArray(e)) {
			let t = e;
			if (typeof t.value == "string") return t.value;
		}
		return e;
	}
}
function dy(e) {
	return {
		duration: ly(e.duration) ?? 300,
		ease: uy(e.ease) ?? "out",
		delay: ly(e.delay) ?? 0
	};
}
function fy(e = 1) {
	return {
		...ey,
		opacity: e
	};
}
function py(e, t, n = 1) {
	let r = iy(e, n), i = iy(t, n);
	return [{
		transform: r.transform,
		opacity: r.opacity,
		filter: r.filter,
		transformOrigin: r.transformOrigin
	}, {
		transform: i.transform,
		opacity: i.opacity,
		filter: i.filter,
		transformOrigin: i.transformOrigin
	}];
}
function my(e, t, n, r = 0) {
	let i = e.stagger ?? 0;
	return i <= 0 || n <= 0 ? r : r + (e.staggerFrom === "last" ? n - 1 - t : t) * i;
}
function hy(e, t, n = 1) {
	return e === "rest" ? fy(n) : {
		...t,
		...e
	};
}
function gy(e, t, n) {
	if (!("style" in e)) return;
	let r = iy(t, n), i = e.style;
	i.transform = r.transform, i.opacity = r.opacity, i.filter = r.filter, i.transformOrigin = r.transformOrigin;
}
function _y(e) {
	if (!("style" in e)) return;
	let t = e.style;
	t.transform = "", t.opacity = "", t.filter = "", t.transformOrigin = "";
}
function vy(e, t) {
	let n = fy(t);
	if (!("style" in e)) return n;
	let r = e.style, i = { ...n }, a = r.opacity;
	if (a != null && String(a).trim() !== "") {
		let e = Number(a);
		Number.isFinite(e) && (i.opacity = e);
	}
	let o = r.transform || "", s = /translate\(\s*([-0-9.]+)px\s*,\s*([-0-9.]+)px\s*\)/.exec(o);
	s && (i.translateX = Number(s[1]), i.translateY = Number(s[2]));
	let c = /rotate\(\s*([-0-9.]+)deg\s*\)/.exec(o);
	c && (i.rotate = Number(c[1]));
	let l = /scale\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)/.exec(o);
	l && (i.scaleX = Number(l[1]), i.scaleY = Number(l[2]), i.scaleX === i.scaleY && (i.scale = i.scaleX));
	let u = /blur\(\s*([-0-9.]+)px\s*\)/.exec(r.filter || "");
	return u && (i.blur = Number(u[1])), i;
}
function yy(e, t, n) {
	if (typeof e.animate != "function" || !t.keys?.length) return;
	let r = n?.restOpacity ?? 1, i = !!n?.reduced, a = !!n?.applyStart;
	try {
		e.getAnimations?.().forEach((e) => e.cancel());
	} catch {}
	let o = a && t.start != null ? hy(t.start, fy(r), r) : vy(e, r);
	a && t.start != null && gy(e, o, r);
	let s = n?.staggerIndex != null && n.staggerCount != null ? my(t, n.staggerIndex, n.staggerCount, 0) : 0, c = !1, l, u, d = new Promise((e) => {
		u = e;
	}), f = () => {
		c = !0;
		try {
			l?.cancel();
		} catch {}
		u();
	}, p = (t, n, a, o) => {
		let s = ny(a) ?? {
			duration: 0,
			easing: "linear",
			delay: 0
		}, c = i || !(s.duration > 0) ? 0 : s.duration, u = i ? 0 : s.delay + o, d = e.animate(py(t, n, r), {
			duration: c,
			easing: s.easing,
			delay: u,
			fill: "both",
			iterations: 1
		});
		return l = d, d;
	};
	return (async () => {
		let i = t.repeat === "forever" ? Infinity : typeof t.repeat == "number" && t.repeat > 1 ? t.repeat : 1, l = fy(r), d = 0;
		for (; !c && d < i;) {
			d > 0 && (o = a && t.start != null ? hy(t.start, l, r) : { ...l }, gy(e, o, r)), d += 1;
			for (let n = 0; n < t.keys.length && !c; n++) {
				let i = t.keys[n], a = hy(i.pose, o, r), l = n === 0 && d === 1 ? s : 0, u = p(o, a, i.timing, l);
				try {
					await u.finished;
				} catch {}
				if (c) break;
				o = a, gy(e, o, r);
			}
		}
		c || n?.onDone?.(), u();
	})(), {
		cancel: f,
		finished: d
	};
}
function by(e, t) {
	let n = dy(t), r = sy(e);
	if (r) return r;
	let i = cy(e);
	if (i) return {
		kind: "animation",
		start: i,
		keys: [{
			timing: {
				duration: n.duration,
				ease: n.ease,
				delay: n.delay
			},
			pose: "rest"
		}]
	};
}
function xy(e, t = "incoming") {
	let n = uy(e.front);
	return String(n ?? e.front ?? t).replace(/^\./, "") !== "outgoing";
}
function Sy(e, t) {
	e.classList.toggle("pdl-presenter__lane--front", t), e.classList.toggle("pdl-presenter__lane--back", !t), "style" in e && (e.style.zIndex = t ? "4" : "1");
}
function Cy(e) {
	e.classList.remove("pdl-presenter__lane", "pdl-presenter__lane--front", "pdl-presenter__lane--back"), _y(e), "style" in e && (e.style.zIndex = "");
}
function wy(e, t, n, r) {
	let i = !!r?.reduced, a = by(n.incoming, n), o = by(n.outgoing, n), s = xy(n, r?.defaultFront ?? "incoming");
	e.classList.add("pdl-presenter__lane"), t.classList.add("pdl-presenter__lane"), Sy(e, s), Sy(t, !s);
	let c = [];
	if (a) {
		let t = yy(e, a, {
			reduced: i,
			applyStart: !0
		});
		t && c.push(t);
	}
	if (o) {
		let e = yy(t, o, {
			reduced: i,
			applyStart: !!o.start
		});
		e && c.push(e);
	}
	let l = Number(n.switchAt), u;
	Number.isFinite(l) && l >= 0 && (u = setTimeout(() => {
		Sy(e, !s), Sy(t, s);
	}, l));
	let d = !1, f = () => {
		d || (d = !0, u != null && clearTimeout(u), Cy(e), r?.onDone?.());
	};
	return c.length ? (Promise.all(c.map((e) => e.finished)).then(f), { cancel: () => {
		u != null && clearTimeout(u);
		for (let e of c) e.cancel();
		f();
	} }) : (f(), { cancel: f });
}
//#endregion
//#region ../../playground/src/presenter-clip.js
function Ty(e, t) {
	return e ? ((t && typeof CSS < "u" && CSS.escape ? e.querySelector(`section.pdl-preview[data-pdl-component="${CSS.escape(t)}"]`) : null) || e).querySelector(".pdl-presenter") : null;
}
function Ey(e) {
	return e ? [...e.children].find((e) => !e.classList.contains("pdl-presenter__cover")) ?? null : null;
}
function Dy(e, t) {
	let n = Ey(Ty(e, t));
	return n ? n.cloneNode(!0) : null;
}
var Oy = "pdl-presenter-clip-host", ky = "\n.pdl-presenter.pdl-presenter--clip { overflow: hidden; }\n.pdl-presenter.pdl-presenter--clip > .pdl-presenter__lane {\n  grid-area: 1 / 1 / 2 / 2;\n  min-width: 0; min-height: 0; width: 100%; height: 100%;\n  max-width: 100%; max-height: 100%;\n  align-self: stretch; justify-self: stretch;\n}\n.pdl-presenter.pdl-presenter--clip > .pdl-presenter__lane.pdl-presenter__lane--front { z-index: 4 !important; }\n.pdl-presenter.pdl-presenter--clip > .pdl-presenter__lane.pdl-presenter__lane--back { z-index: 1 !important; }\n";
function Ay(e) {
	if (e.getElementById(Oy)) return;
	let t = e.createElement("style");
	t.id = Oy, t.textContent = ky, e.head?.appendChild(t);
}
function jy(e, t, n, r) {
	let i = Ty(e, r);
	if (!i || !e || !n || typeof n != "object") return null;
	let a = Ey(i);
	if (!a) return null;
	let o = e.importNode(t, !0);
	return Ay(e), i.classList.add("pdl-presenter--clip"), a.classList.add("pdl-presenter__lane"), o.classList.add("pdl-presenter__lane"), o.setAttribute("data-pdl-presenter-clip", "outgoing"), a.setAttribute("data-pdl-appear-hold", "1"), o.setAttribute("data-pdl-appear-hold", "1"), a.after(o), wy(a, o, n, { onDone: () => {
		o.remove(), i.classList.remove("pdl-presenter--clip"), a.classList.remove("pdl-presenter__lane", "pdl-presenter__lane--front", "pdl-presenter__lane--back"), a.removeAttribute("data-pdl-appear-hold");
	} });
}
//#endregion
//#region ../../src/assetRefs.ts
var My = /\.(svg|png|pdf|webp|jpg|jpeg|gif|mp4|webm)$/i;
function Ny(e) {
	return typeof e != "string" || e.length === 0 || e.startsWith("/") || e.includes("://") || e.includes("\\") || e.includes("..") ? !1 : e.includes("/") || My.test(e);
}
function Py(e) {
	return !!e && typeof e == "object" && !Array.isArray(e) && e.kind === "iconRef";
}
function Fy(e) {
	return !!e && typeof e == "object" && !Array.isArray(e) && e.kind === "mediaSourceRef";
}
function Iy(e) {
	return e.source === "file" ? e.path : `${e.system}:${e.name}`;
}
//#endregion
//#region ../../src/renderHtml.ts
function Ly(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function K(e) {
	return Ly(e);
}
function Ry(e) {
	return typeof e == "string" ? e : Fy(e) ? e.source === "url" ? e.url : e.path : "";
}
function q(e) {
	return e.replace(/\\/g, "\\\\").replace(/"/g, "'");
}
function zy(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function By(e, t) {
	let n = e[t];
	if (!zy(n)) return;
	let { top: r = 0, right: i = 0, bottom: a = 0, left: o = 0 } = n;
	if (r !== 0 || i !== 0 || a !== 0 || o !== 0) return `${r}px ${i}px ${a}px ${o}px`;
}
function Vy(e) {
	if (typeof e == "string") return {
		stretch: "stretch",
		center: "center",
		start: "flex-start",
		end: "flex-end",
		baseline: "baseline"
	}[e];
}
function Hy(e) {
	if (typeof e == "string") return {
		center: "center",
		start: "flex-start",
		end: "flex-end",
		spaceBetween: "space-between",
		spaceAround: "space-around",
		spaceEvenly: "space-evenly",
		stretch: "stretch"
	}[e];
}
function Uy(e) {
	if (e === "row") return "row";
	if (e === "column") return "column";
	if (e === "rowReverse") return "row-reverse";
	if (e === "columnReverse") return "column-reverse";
}
function Wy(e) {
	if (e === "wrap") return "wrap";
	if (e === "nowrap") return "nowrap";
}
function J(e) {
	if (typeof e == "number" && Number.isFinite(e)) return e;
}
function Gy(e) {
	if (typeof e == "string" && (e.startsWith("#") || e.startsWith("rgb"))) return e;
	if (Array.isArray(e)) {
		for (let t of e) {
			let e = Gy(t);
			if (e) return e;
		}
		return;
	}
	if (typeof e == "object" && e && !Array.isArray(e)) {
		let t = e.kind;
		if (t === "blur" || t === "ramp" || t === "media" || t === "gradientStop") return;
	}
}
function Ky(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return;
	let t = e, n = t.kind === "vibrancy" && t.vibrancy !== null && typeof t.vibrancy == "object" ? t.vibrancy : t, r = J(n.saturation), i = J(n.brightness);
	if (r !== void 0 || i !== void 0) return {
		saturate: r ?? 1,
		brightness: i ?? 1
	};
}
function qy(e) {
	return `saturate(${String(e.saturate)}) brightness(${String(e.brightness)})`;
}
function Jy(e) {
	let t = e.effect;
	if (typeof t != "object" || !t || Array.isArray(t)) return;
	let n = t;
	if (n.kind !== "effect") return;
	let r = typeof n.case == "string" ? n.case.replace(/^\./, "") : void 0;
	if (!r) return;
	let i = J(n.radius), a = Ky(n.vibrancy);
	return {
		case: r,
		...i === void 0 ? {} : { radius: i },
		...a ? { vibrancy: a } : {}
	};
}
function Yy(e) {
	let t = Jy(e);
	return t?.case === "blurSelf" && t.radius !== void 0 && t.radius > 0 ? t.radius : 0;
}
function Xy(e) {
	let t = Jy(e);
	if (!t) return [];
	if (t.case === "blurSelf" && t.radius !== void 0 && t.radius > 0) return [`filter:blur(${String(t.radius)}px)`];
	if (t.case === "blurBehind" && t.radius !== void 0 && t.radius > 0) {
		let e = [`blur(${String(t.radius)}px)`];
		t.vibrancy && e.push(qy(t.vibrancy));
		let n = e.join(" ");
		return [`backdrop-filter:${n}`, `-webkit-backdrop-filter:${n}`];
	}
	return [];
}
function Zy(e) {
	if (typeof e == "string") return e;
	if (typeof e == "object" && e && !Array.isArray(e)) {
		let t = e;
		if (t.kind === "dotEnum" && typeof t.value == "string") return t.value;
	}
}
function Qy(e) {
	if (typeof e != "string" || !e.startsWith("#")) return;
	let t = e.slice(1), n = (e) => e + e;
	if (t.length === 3) {
		let e = parseInt(n(t[0]), 16), r = parseInt(n(t[1]), 16), i = parseInt(n(t[2]), 16);
		return [
			e,
			r,
			i
		].some((e) => Number.isNaN(e)) ? void 0 : {
			r: e,
			g: r,
			b: i,
			a: 1
		};
	}
	if (t.length === 6) {
		let e = parseInt(t.slice(0, 2), 16), n = parseInt(t.slice(2, 4), 16), r = parseInt(t.slice(4, 6), 16);
		return [
			e,
			n,
			r
		].some((e) => Number.isNaN(e)) ? void 0 : {
			r: e,
			g: n,
			b: r,
			a: 1
		};
	}
	if (t.length === 8) {
		let e = parseInt(t.slice(0, 2), 16), n = parseInt(t.slice(2, 4), 16), r = parseInt(t.slice(4, 6), 16), i = parseInt(t.slice(6, 8), 16);
		return [
			e,
			n,
			r,
			i
		].some((e) => Number.isNaN(e)) ? void 0 : {
			r: e,
			g: n,
			b: r,
			a: i / 255
		};
	}
}
function $y(e, t) {
	let n = Qy(e);
	if (!n) return;
	let r = Math.max(0, Math.min(1, n.a * t));
	return `rgba(${String(n.r)},${String(n.g)},${String(n.b)},${r.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")})`;
}
function eb(e) {
	let t = e.direction, n = Zy(t) ?? (typeof t == "string" ? t : void 0), r = e.stops, i = Array.isArray(r) ? r : [], a = {
		topToBottom: "to bottom",
		bottomToTop: "to top",
		leftToRight: "to right",
		rightToLeft: "to left"
	};
	if (n === "radial") {
		let e = [];
		for (let t of i) {
			let n = tb(t, !0);
			n && e.push(n);
		}
		return e.length === 0 ? void 0 : `radial-gradient(circle, ${e.join(", ")})`;
	}
	let o = n && a[n] ? a[n] : "to bottom", s = [];
	for (let e of i) {
		let t = tb(e, !1);
		t && s.push(t);
	}
	if (s.length !== 0) return `linear-gradient(${o}, ${s.join(", ")})`;
}
function tb(e, t) {
	if (typeof e != "object" || !e || Array.isArray(e)) return;
	let n = e, r = J(n.position), i = J(n.opacity) ?? 1, a = typeof n.color == "string" ? n.color : void 0, o = r === void 0 ? t ? "50%" : void 0 : `${String(Math.max(0, Math.min(1, r)) * 100)}%`;
	if (!a || !a.startsWith("#")) return o !== void 0 && (i !== 1 || n.opacity !== void 0) ? `rgba(0,0,0,${String(i)}) ${o}` : void 0;
	let s = $y(a, i);
	if (s) return o === void 0 ? s : `${s} ${o}`;
}
function nb(e) {
	return /^https?:\/\//i.test(e) || e.startsWith("/") || e.startsWith("./");
}
function rb(e) {
	if (typeof e == "string") return {
		cover: "cover",
		contain: "contain",
		fill: "100% 100%",
		scaleDown: "contain"
	}[e];
}
function ib(e, t) {
	let n = (e, t, n) => {
		let r = typeof e == "string" ? e : Zy(e);
		if (r) {
			if (r === "start") return t;
			if (r === "center") return "center";
			if (r === "end") return n;
		}
	}, r = n(e, "left", "right"), i = n(t, "top", "bottom");
	if (!r && !i) return;
	let a = r ?? "center", o = i ?? "center";
	return a === "center" && o === "center" ? "center" : `${a} ${o}`;
}
function ab(e) {
	let t = [], n = (e) => {
		if (e == null) return;
		if (typeof e == "string") {
			(e.startsWith("#") || e.startsWith("rgb")) && t.push({
				kind: "solid",
				color: e
			});
			return;
		}
		if (Array.isArray(e)) {
			for (let t of e) n(t);
			return;
		}
		if (typeof e != "object") return;
		let r = e, i = r.kind;
		if (i === "blur") {
			let e = J(r.radius) ?? J(r.blur);
			if (e !== void 0 && e > 0) {
				let n = Ky(r.vibrancy);
				t.push({
					kind: "blur",
					px: e,
					...n ? { vibrancy: n } : {}
				});
			}
			return;
		}
		if (i === "vibrancy") {
			let e = Ky(r);
			e && t.push({
				kind: "vibrancy",
				vibrancy: e
			});
			return;
		}
		if (i === "ramp") {
			let e = eb(r);
			e && t.push({
				kind: "gradient",
				css: e
			});
			return;
		}
		if (i === "media") {
			let e = typeof r.source == "string" ? r.source : "";
			if (e.length > 0 && nb(e)) {
				let n = rb(r.contentMode) ?? "cover", i = ib(r.justify, r.align), a = J(r.opacity);
				t.push({
					kind: "image",
					url: e,
					objectFit: n,
					...i ? { objectPosition: i } : {},
					...a === void 0 ? {} : { opacity: a }
				});
			}
			return;
		}
	};
	return n(e), t;
}
function ob(e) {
	return [
		"position:absolute",
		"inset:0",
		"border-radius:inherit",
		"overflow:hidden",
		"pointer-events:none",
		`z-index:${String(e)}`
	].join(";");
}
function sb(e, t) {
	let n = t + 1, r = [
		"position:absolute",
		"inset:0",
		`z-index:${String(n)}`
	];
	if (e.kind === "solid") return `<div style="${q([...r, `background:${e.color}`].join(";"))}"></div>`;
	if (e.kind === "gradient") return `<div style="${q([...r, `background:${e.css}`].join(";"))}"></div>`;
	if (e.kind === "image") {
		let t = e.objectFit ?? "cover", n = e.objectPosition ?? "center", i = [
			...r,
			"background-color:transparent",
			`background-image:url(${JSON.stringify(e.url)})`,
			`background-position:${n}`,
			"background-repeat:no-repeat",
			`background-size:${t}`
		];
		return e.opacity !== void 0 && Number.isFinite(e.opacity) && i.push(`opacity:${String(e.opacity)}`), `<div style="${q(i.join(";"))}"></div>`;
	}
	if (e.kind === "blur") {
		let t = [`blur(${String(e.px)}px)`];
		e.vibrancy && t.push(qy(e.vibrancy));
		let n = t.join(" ");
		return `<div style="${q([
			...r,
			"background:transparent",
			`backdrop-filter:${n}`,
			`-webkit-backdrop-filter:${n}`
		].join(";"))}"></div>`;
	}
	if (e.kind === "vibrancy") {
		let t = qy(e.vibrancy);
		return `<div style="${q([
			...r,
			"background:transparent",
			`backdrop-filter:${t}`,
			`-webkit-backdrop-filter:${t}`
		].join(";"))}"></div>`;
	}
	return "";
}
function cb(e, t) {
	if (e.length === 0) return "";
	let n = e.map((e, t) => sb(e, t)).join("");
	return `<div class="pdl-layer-band" style="${q(Y(ob(t), "isolation:isolate"))}">${n}</div>`;
}
function lb(e) {
	return ab(e.background).length > 0 || ab(e.foreground).length > 0;
}
function ub(e) {
	return ab(e.background).length > 0 || ab(e.foreground).length > 0;
}
function db(e) {
	let t = e.background;
	if (typeof t == "string" && t.length > 0) return `background:${t}`;
	let n = Gy(t);
	if (n) return `background:${n}`;
}
function fb(e) {
	if (typeof e == "string") {
		let t = e.trim();
		return t.length > 0 ? t : void 0;
	}
	if (!e || typeof e != "object") return;
	let t = e;
	if (t.kind !== "shadow") return;
	let n = J(t.x), r = J(t.y), i = J(t.blurRadius), a = J(t.spread) ?? 0, o = typeof t.color == "string" ? t.color.trim() : "";
	if (!(n === void 0 || r === void 0 || i === void 0 || !o)) return `${n}px ${r}px ${i}px ${a}px ${o}`;
}
function pb(e) {
	return gb(e);
}
function mb(e) {
	if (typeof e != "string") return;
	if (e === "clip") return "overflow:hidden";
	let t = {
		visible: "visible",
		scroll: "scroll"
	}[e];
	return t ? `overflow:${t}` : void 0;
}
function hb(e) {
	let t = e.borderPosition;
	return (typeof t == "string" ? t : Zy(t) ?? "outside") === "inside" ? "inside" : "outside";
}
function gb(e) {
	let t = [], n = J(e.borderWidth), r = e.borderColor;
	hb(e) === "outside" && n !== void 0 && n > 0 && typeof r == "string" && r.length > 0 && t.push(`0 0 0 ${String(n)}px ${r}`);
	let i = fb(e.shadow);
	if (i && t.push(i), t.length !== 0) return `box-shadow:${t.join(", ")}`;
}
function _b(e) {
	let t = J(e.borderWidth), n = e.borderColor;
	return hb(e) !== "inside" || t === void 0 || !(t > 0) || typeof n != "string" || n.length === 0 ? "" : `<div class="pdl-border-inside" style="${q([
		"position:absolute",
		"inset:0",
		"border-radius:inherit",
		"pointer-events:none",
		"z-index:3",
		`box-shadow:inset 0 0 0 ${String(t)}px ${n}`
	].join(";"))}" aria-hidden="true"></div>`;
}
function vb(e, t, n) {
	let r = _b(t);
	return r ? {
		style: /(?:^|;)position\s*:/.test(e) ? e : Y(e, "position:relative"),
		html: `${n}${r}`
	} : {
		style: e,
		html: n
	};
}
function yb(e, t) {
	let n = {
		stretch: "stretch",
		center: "center",
		start: "start",
		end: "end",
		baseline: "baseline"
	}, r = {
		center: "center",
		start: "start",
		end: "end",
		stretch: "stretch",
		spaceBetween: "start",
		spaceAround: "start",
		spaceEvenly: "start"
	};
	return `place-items:${typeof e == "string" && n[e] ? n[e] : "start"} ${typeof t == "string" && r[t] ? r[t] : "start"}`;
}
function bb(e) {
	for (let t of ["width", "height"]) {
		let n = e[t];
		if (typeof n == "object" && n && !Array.isArray(n)) {
			let e = J(n.aspect);
			if (e !== void 0 && e > 0) return e;
		}
	}
}
function xb(e, t) {
	let n = e[t], r = t === "width" ? "width" : "height", i = t === "width" ? "min-width" : "min-height", a = t === "width" ? "max-width" : "max-height";
	if (n === "fill") return [`${r}:100%`];
	if (n === "hug") return [`${r}:auto`];
	if (typeof n == "number" && Number.isFinite(n)) return [`${r}:${n}px`];
	if (typeof n == "object" && n && !Array.isArray(n)) {
		let e = n;
		if ("aspect" in e) return [`${r}:auto`];
		if ("fixed" in e) {
			let t = J(e.fixed);
			if (t !== void 0) return [`${r}:${t}px`];
		}
		if ("flex" in e) {
			let t = e.flex;
			if (typeof t == "object" && t && !Array.isArray(t)) {
				let e = t, n = [], o = J(e.min), s = J(e.max), c = J(e.preferred);
				return o !== void 0 && n.push(`${i}:${o}px`), s !== void 0 && n.push(`${a}:${s}px`), c === void 0 ? n.push(`${r}:auto`) : n.push(`${r}:${c}px`), n.push("flex:1 1 auto"), n;
			}
		}
	}
	return [];
}
function Sb(e) {
	let t = [], n = e.alignSelf;
	if (typeof n == "string") {
		let e = {
			start: "flex-start",
			center: "center",
			end: "flex-end",
			stretch: "stretch",
			auto: "auto"
		}[n];
		e && t.push(`align-self:${e}`);
	}
	let r = J(e.grow);
	r !== void 0 && t.push(`flex-grow:${String(r)}`);
	let i = J(e.shrink);
	if (i !== void 0 && t.push(`flex-shrink:${String(i)}`), e.position === "absolute") {
		t.push("position:absolute");
		let n = e.inset;
		if (typeof n == "object" && n && !Array.isArray(n)) {
			let e = n, r = J(e.top) ?? 0, i = J(e.right) ?? 0, a = J(e.bottom) ?? 0, o = J(e.left) ?? 0;
			t.push(`top:${r}px`, `right:${i}px`, `bottom:${a}px`, `left:${o}px`);
		}
	}
	return t;
}
function Cb(e) {
	return e === "stack" || e === "reverseStack";
}
function wb(e, t, n) {
	return t <= 0 ? 1 : n ? t - e : e + 1;
}
function Tb(e) {
	return [
		"grid-area:1 / 1 / 2 / 2",
		`z-index:${String(e)}`,
		"min-width:0",
		"min-height:0"
	];
}
function Eb(e) {
	if (typeof e != "string") return;
	let t = {
		start: "start",
		center: "center",
		end: "end"
	}[e];
	return t ? `text-align:${t}` : void 0;
}
function Db(e) {
	if (typeof e != "string") return;
	let t = {
		cover: "cover",
		contain: "contain",
		fill: "fill",
		scaleDown: "scale-down"
	}[e];
	return t ? `object-fit:${t}` : void 0;
}
function Ob(e) {
	if (typeof e == "number" && Number.isFinite(e)) return e === 0 ? void 0 : `border-radius:${e}px`;
	if (typeof e == "object" && e && !Array.isArray(e)) {
		let t = e, n = (e) => {
			let n = t[e];
			return typeof n == "number" && Number.isFinite(n) ? n : 0;
		}, r = n("tl"), i = n("tr"), a = n("br"), o = n("bl");
		return r === 0 && i === 0 && a === 0 && o === 0 ? void 0 : `border-radius:${r}px ${i}px ${a}px ${o}px`;
	}
}
function Y(...e) {
	let t = [];
	for (let n of e) if (n) for (let e of n.split(";")) {
		let n = e.trim();
		n && t.push(n);
	}
	return t.join(";");
}
function kb(e, t) {
	let n = [], r = By(e, "padding");
	r && n.push(`padding:${r}`);
	let i = By(e, "margin");
	i && n.push(`margin:${i}`), n.push(...xb(e, "width")), n.push(...xb(e, "height"));
	let a = J(e.aspectRatio) ?? bb(e);
	a !== void 0 && a > 0 && n.push(`aspect-ratio:${String(a)}`);
	let o = Ob(e.cornerRadius);
	if (o && n.push(o), typeof e.opacity == "number" && Number.isFinite(e.opacity) && n.push(`opacity:${e.opacity}`), !t?.omitBackground) {
		let t = db(e);
		t && n.push(t);
	}
	let s = pb(e);
	if (s && n.push(s), !t?.omitOverflow) {
		let t = mb(e.overflow);
		t && n.push(t);
	}
	return n.push(...Xy(e)), n.join(";");
}
function Ab(e) {
	let t = Cb(e.direction), n = [];
	if (t) n.push("display:grid"), n.push("grid-template-columns:minmax(0,1fr)"), n.push("grid-template-rows:minmax(0,1fr)"), n.push("min-width:0"), n.push("min-height:0"), n.push(yb(e.align, e.justify));
	else {
		n.push("display:flex", "min-width:0", "min-height:0");
		let t = Uy(e.direction);
		t && n.push(`flex-direction:${t}`);
		let r = Vy(e.align);
		r && n.push(`align-items:${r}`);
		let i = Hy(e.justify);
		i && n.push(`justify-content:${i}`);
		let a = Wy(e.wrap);
		a && n.push(`flex-wrap:${a}`), typeof e.gap == "number" && Number.isFinite(e.gap) && n.push(`gap:${e.gap}px`), typeof e.columnGap == "number" && Number.isFinite(e.columnGap) && n.push(`column-gap:${e.columnGap}px`), typeof e.rowGap == "number" && Number.isFinite(e.rowGap) && n.push(`row-gap:${e.rowGap}px`);
	}
	return n.join(";");
}
function jb(e) {
	return Y(Ab(e), kb(e), "position:relative");
}
function Mb(e) {
	let t = [
		"min-width:0",
		"min-height:0",
		"display:grid",
		"grid-template-columns:minmax(0,1fr)",
		"grid-template-rows:minmax(0,1fr)",
		"position:relative"
	];
	return !zb(e, "width") && e.width === "fill" && t.push("width:100%"), (e.height === "fill" || e.height === void 0 || e.height === null) && t.push("flex:1 1 0%", "height:auto"), t.join(";");
}
function Nb(e, t) {
	return typeof e.cover == "string" && e.cover.length > 0 && t.length >= 2;
}
function Pb(e, t, n, r) {
	if (Nb(t, e)) {
		let t = e.slice(0, -1), i = e[e.length - 1];
		return `${t.map((e, i) => gx(e, Ib(void 0, i, t.length, n), r)).join("")}<div class="pdl-presenter__cover">${gx(i, {
			stackChild: !1,
			stackZ: 0,
			sessionParams: n.sessionParams,
			instancePath: n.instancePath,
			isTreeRoot: !1
		}, r)}</div>`;
	}
	return e.map((i, a) => gx(i, Ib(t.direction, a, e.length, n), r)).join("");
}
function Fb(e, t, n) {
	let r = Y(...Sb(e)), i = n.stackChild ? Y(...Tb(n.stackZ)) : "";
	return t === "text" ? Y(Yb(e), r, i) : t === "icon" || t === "media" ? Y(kb(e), r, i) : t === "layout" && lb(e) ? Y(kb(e, {
		omitBackground: !0,
		omitOverflow: !0
	}), "display:flex", "flex-direction:column", "position:relative", "min-width:0", "min-height:0", r, i) : Y(jb(e), r, i);
}
function Ib(e, t, n, r) {
	let i = Cb(e), a = {
		sessionParams: r?.sessionParams,
		instancePath: r?.instancePath,
		isTreeRoot: !1
	};
	return i ? {
		stackChild: !0,
		stackZ: wb(t, n, e === "reverseStack"),
		...a
	} : {
		stackChild: !1,
		stackZ: 0,
		...a
	};
}
function Lb(e) {
	if (e.truncateStyle === "ellipsis") return "ellipsis";
	if (e.truncateStyle === "clip") return "clip";
}
function Rb(e) {
	let t = J(e.lineClamp);
	return t !== void 0 && t > 0 ? t : void 0;
}
function zb(e, t) {
	let n = e[t];
	return n == null || n === "hug";
}
function Bb(e) {
	return Rb(e) !== void 0 || Lb(e) !== void 0 || !zb(e, "width");
}
function Vb(e) {
	return Bb(e) ? ["min-width:0"] : ["min-width:min-content"];
}
function Hb(e) {
	let t = Sb(e);
	return !Bb(e) && J(e.shrink) === void 0 && t.push("flex-shrink:0"), t;
}
function Ub(e) {
	let t = [...Vb(e), "box-sizing:border-box"];
	typeof e.color == "string" && t.push(`color:${e.color}`), typeof e.fontSize == "number" && t.push(`font-size:${e.fontSize}px`), typeof e.fontWeight == "number" && t.push(`font-weight:${String(e.fontWeight)}`), typeof e.fontFamily == "string" && t.push(`font-family:${e.fontFamily}`);
	let n = J(e.lineHeight);
	n !== void 0 && t.push(`line-height:${String(n)}`);
	let r = J(e.letterSpacing), i = J(e.fontSize);
	r !== void 0 && (i === void 0 ? t.push(`letter-spacing:${String(r)}em`) : t.push(`letter-spacing:${String(r * i)}px`));
	let a = Eb(e.justify);
	return a && t.push(a), t.join(";");
}
function Wb(e) {
	let t = [Ub(e), "overflow:hidden"], n = Rb(e);
	if (Lb(e) === "clip") {
		let r = J(e.lineHeight), i = J(e.fontSize), a = r !== void 0 && r > 0 ? r : 1.2;
		i === void 0 ? t.push(`max-height:${a * n}em`) : t.push(`max-height:${i * a * n}px`), t.push("text-overflow:clip");
	} else t.push("display:-webkit-box", "-webkit-box-orient:vertical", `-webkit-line-clamp:${String(n)}`, "text-overflow:ellipsis");
	return t.join(";");
}
function Gb(e) {
	let t = [Ub(e)], n = mb(e.overflow);
	n && t.push(n);
	let r = Lb(e);
	return r === "ellipsis" ? (t.push("text-overflow:ellipsis", "white-space:nowrap"), n || t.push("overflow:hidden")) : r === "clip" && t.push("text-overflow:clip"), t.join(";");
}
function Kb(e) {
	let t = ["display:flex", "flex-direction:column"], n = typeof e.align == "string" ? e.align : void 0, r = {
		start: "flex-start",
		center: "center",
		end: "flex-end"
	};
	return n && r[n] && t.push(`justify-content:${r[n]}`), t.join(";");
}
function qb(e) {
	let t = [], n = By(e, "padding");
	n && t.push(`padding:${n}`);
	let r = By(e, "margin");
	r && t.push(`margin:${r}`), t.push(...xb(e, "width")), t.push(...xb(e, "height"));
	let i = Ob(e.cornerRadius);
	return i && t.push(i), typeof e.opacity == "number" && Number.isFinite(e.opacity) && t.push(`opacity:${e.opacity}`), t.push(...Xy(e)), t.join(";");
}
function Jb(e) {
	return Y(Kb(e), qb(e), db(e), pb(e), mb(e.overflow));
}
function Yb(e) {
	return Y(Gb(e), qb(e), db(e), pb(e));
}
function Xb(e) {
	return Y(Kb(e), Yb(e));
}
function Zb(e) {
	let t = e?.activatesOn, n = t == null ? "focus" : String(t).replace(/^\./, "");
	return n === "press" || n === "none" || n === "focus" ? n : "focus";
}
function Qb(e) {
	return e?.isEditing === !0 || e?.isEditing === "true";
}
function $b(e) {
	if (typeof e.color != "string" || e.color.trim() === "") return "color:inherit";
}
function ex(e) {
	let t = [
		"border:none",
		"outline:none",
		"width:100%",
		"box-sizing:border-box"
	], n = $b(e);
	return n && t.push(n), db(e) || t.push("background:transparent"), t;
}
function tx(e) {
	return e ? e.matches?.("input.pdl-text--editable") ? e : e.querySelector(".pdl-inst-state:not([hidden]) input.pdl-text--editable, :scope > input.pdl-text--editable, input.pdl-text--editable") : null;
}
function nx(e, t) {
	let n = J(e.size) ?? 24, r = typeof e.color == "string" && e.color.length > 0 ? e.color : "#94a3b8", i = Fb(e, "icon", t), a = [];
	return (e.width === void 0 || e.width === null) && a.push(`width:${n}px`), (e.height === void 0 || e.height === null) && a.push(`height:${n}px`), Y(i, [
		...a,
		`background-color:${r}`,
		"flex-shrink:0",
		"display:flex",
		"align-items:center",
		"justify-content:center",
		"overflow:hidden"
	].join(";"));
}
function rx(e, t) {
	let n = Fb(e, "media", t), r = Db(e.contentMode), i = ib(e.justify, e.align), a = [
		n,
		"max-width:100%",
		"display:block"
	];
	return r && a.push(r), i && a.push(`object-position:${i}`), Y(...a);
}
function ix(e, t = {
	stackChild: !1,
	stackZ: 0
}, n) {
	return gx(e, t, n);
}
function ax(e, t) {
	if (e === t) return !0;
	try {
		return JSON.stringify(e) === JSON.stringify(t);
	} catch {
		return !1;
	}
}
function ox(e) {
	if (typeof e.editable == "string") return e.editable;
	if (e.editable === !0) return "value";
}
function sx(e, t, n) {
	let r = e.props ?? {}, i = e.kind;
	if (i === "layout") return `layout:${lb(r) ? "layers" : "flat"}:${Cb(r.direction) ? "stack" : "flex"}`;
	if (i === "text") {
		let i = ox(r), a = t.sessionParams;
		e.instanceOf && n?.editableSessionDefaults?.[e.instanceOf] && !t.omitInstanceAttrs && (a = {
			...n.editableSessionDefaults[e.instanceOf],
			...e.instanceKwargs ?? {}
		});
		let o = Zb(a), s = Qb(a);
		return `text:${i && !(i && (o === "none" && !s || o === "press" && !s)) ? "input" : o === "press" && !s ? "press-hit" : ub(r) ? "layers" : Rb(r) === void 0 ? "plain" : "clamp"}`;
	}
	if (i === "media") {
		let e = Ry(r.source), t = Fy(r.source) && r.source.mediaKind ? r.source.mediaKind : "image", n = e.length > 0 && (/^https?:\/\//i.test(e) || e.startsWith("/") || e.startsWith("./") || Ny(e)), i = lb(r), a = n ? t === "video" ? "video" : "img" : "placeholder", o = !i && n && _b(r) ? "wrap" : "bare";
		return `media:${i ? "layers" : "flat"}:${a}:${o}`;
	}
	if (i === "icon") {
		let e = r.icon, t = Py(e) && e.source === "file" ? e.path : typeof e == "string" && Ny(e) ? e : "", n = !!(t && /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(t));
		return `icon:${n && _b(r) ? "wrap" : n ? "img" : "swatch"}`;
	}
	return `${i}:default`;
}
function cx(e, t) {
	let n = e.props ?? {}, r = e.kind;
	if (r === "layout" || r === "presenter") return Y(Fb(n, r === "layout" ? "layout" : r, t), Cb(n.direction) ? "position:relative" : "", r === "presenter" ? Mb(n) : "");
	if (r === "text") {
		let e = ox(n), r = !!e && Zb(t.sessionParams) === "none" && !Qb(t.sessionParams);
		return e && !r ? Y(Xb(n), ...Hb(n), ...t.stackChild ? Tb(t.stackZ) : [], ...ex(n)) : ub(n) ? Y(qb(n), pb(n), Kb(n), "position:relative", "vertical-align:top", ...Vb(n), ...Hb(n), ...t.stackChild ? Tb(t.stackZ) : []) : Rb(n) === void 0 ? Y(Xb(n), ...Hb(n), ...t.stackChild ? Tb(t.stackZ) : []) : Y(Jb(n), ...Hb(n), ...t.stackChild ? Tb(t.stackZ) : []);
	}
	return r === "spacer" ? Y(kb(n), ...Sb(n), ...t.stackChild ? Tb(t.stackZ) : [], "flex:1 1 auto", "min-height:0", "min-width:0") : r === "icon" ? nx(n, t) : r === "media" ? lb(n) ? Y(kb(n, { omitBackground: !0 }), ...Sb(n), ...t.stackChild ? Tb(t.stackZ) : [], "position:relative", "overflow:hidden", "max-width:100%") : rx(n, t) : Fb(n, r, t);
}
function lx(e, t) {
	let n = _b(t), r = e.querySelector(":scope > .pdl-border-inside");
	if (!n) {
		r?.remove();
		return;
	}
	if (!/(?:^|;)position\s*:/.test(e.getAttribute("style") || "")) {
		let t = e.getAttribute("style") || "";
		e.setAttribute("style", t ? `${t};position:relative` : "position:relative");
	}
	if (r) {
		let e = J(t.borderWidth), n = t.borderColor;
		e !== void 0 && typeof n == "string" && (r.style.boxShadow = `inset 0 0 0 ${String(e)}px ${n}`);
		return;
	}
	let i = e.ownerDocument.createElement("div");
	i.innerHTML = n;
	let a = i.firstElementChild;
	a && e.appendChild(a);
}
function ux(e, t) {
	let n = e.querySelector(":scope > .pdl-text__inner") || e.querySelector(":scope > .pdl-text__clamp") || null;
	if (n) {
		n.textContent = t;
		return;
	}
	if (e.children.length === 0) {
		e.textContent = t;
		return;
	}
	for (let t of Array.from(e.childNodes)) t.nodeType === 3 && t.parentNode?.removeChild(t);
	let r = e.querySelector(":scope > .pdl-border-inside"), i = e.ownerDocument.createTextNode(t);
	r ? e.insertBefore(i, r) : e.appendChild(i);
}
function dx(e, t, n) {
	if (!t) return { ...e };
	let r = {
		...t,
		...e
	};
	return e.isEditing === !0 || e.isEditing === "true" ? (r.isEditing = !0, n == null ? t.value !== void 0 && (r.value = t.value) : r.value = n) : (e.isEditing === !1 || e.isEditing === "false") && (r.isEditing = !1, e.value !== void 0 && (r.value = e.value)), r;
}
function fx(e, t, n) {
	if (n ? e.setAttribute("data-pdl-instance-kwargs", JSON.stringify(n)) : e.hasAttribute("data-pdl-instance-kwargs") && e.removeAttribute("data-pdl-instance-kwargs"), !t) return;
	let r = e.getAttribute("data-pdl-session-params"), i = { ...t };
	if (r) try {
		let n = JSON.parse(r), a = tx(e), o = e.ownerDocument;
		i = dx(t, n, a && o?.activeElement === a ? a.value : null);
	} catch {
		i = { ...t };
	}
	e.setAttribute("data-pdl-session-params", JSON.stringify(i));
	let a = tx(e);
	a && typeof i.value == "string" && e.ownerDocument?.activeElement !== a && (a.value = i.value);
}
function px(e, t, n, r = {
	stackChild: !1,
	stackZ: 0
}, i, a, o) {
	if (t.kind !== n.kind || t.instanceOf !== n.instanceOf) return "needsRemount";
	let s = sx(t, o ?? r, a ?? i), c = sx(n, r, i);
	if (s !== c && (e.tagName !== "INPUT" || s !== "text:press-hit" || c !== "text:input")) return "needsRemount";
	let l = r, u = null;
	n.instanceOf && i?.editableSessionDefaults?.[n.instanceOf] && !r.omitInstanceAttrs ? (u = {
		...i.editableSessionDefaults[n.instanceOf],
		...n.instanceKwargs ?? {}
	}, l = {
		...r,
		sessionParams: u
	}) : r.sessionParams && (u = {
		...r.sessionParams,
		...n.instanceKwargs ?? {}
	}, l = {
		...r,
		sessionParams: u
	});
	let d = cx(n, l);
	if (d != null) {
		let t = hb(n.props ?? {}) === "inside" && !/(?:^|;)position\s*:/.test(d) ? Y(d, "position:relative") : d, r = e.getAttribute("data-pdl-transition"), i = r && r !== "none" ? Y(t, `transition:${r}`, "transform-origin:center") : t;
		if (r && r !== "none") {
			let t = e.getAttribute("style") ?? "";
			/(?:^|;)\s*transition\s*:/.test(t) || e.setAttribute("style", Y(t, `transition:${r}`, "transform-origin:center"));
			let n = e;
			requestAnimationFrame(() => {
				n.isConnected && n.setAttribute("style", i);
			});
		} else e.setAttribute("style", i);
	}
	let f = n.props ?? {}, p = (t.props ?? {}).animate, m = f.animate;
	ax(p, m) || (typeof m == "object" && m ? e.setAttribute("data-pdl-animate", JSON.stringify(m)) : e.removeAttribute("data-pdl-animate"));
	let h = Yy(f);
	if (h > 0 ? e.setAttribute("data-pdl-rest-blur", String(h)) : e.removeAttribute("data-pdl-rest-blur"), lx(e, f), n.kind === "text" && e.tagName === "INPUT") {
		let t = e, n = typeof f.content == "string" ? f.content : "", r = l.sessionParams, i = r != null && Object.prototype.hasOwnProperty.call(r, "value"), a = i ? String(r.value ?? "") : n, o = Qb(r);
		e.ownerDocument?.activeElement !== t && t.value !== a && (t.value = a), i && !o && a === "" && n !== "" ? t.placeholder = n : o || t.removeAttribute("placeholder");
		let s = Zb(r) === "press" && !o;
		t.readOnly = s || Zb(r) === "none" && !o, s ? t.setAttribute("readonly", "") : t.removeAttribute("readonly");
	} else if (n.kind === "text") {
		let n = t.props ?? {}, r = typeof n.content == "string" ? n.content : "", i = typeof f.content == "string" ? f.content : "";
		r !== i && ux(e, i);
	}
	if (n.kind === "media" || n.kind === "icon") {
		let t = (e.matches("img,video") ? e : null) || e.querySelector(":scope > .pdl-media__img, :scope > .pdl-icon__img, :scope img, :scope video");
		if (t && n.kind === "media") {
			let e = Ry(f.source);
			e && t.getAttribute("src") !== e && t.setAttribute("src", e);
		}
		if (t && n.kind === "icon") {
			let e = f.icon, n = Py(e) && e.source === "file" ? e.path : typeof e == "string" ? e : "";
			n && t.getAttribute("src") !== n && t.setAttribute("src", n);
		}
	}
	let g = e.classList.contains("pdl-instance") || e.hasAttribute("data-pdl-instance-of") ? e : e.closest("[data-pdl-instance-of]") && e.closest("[data-pdl-instance-of]")?.getAttribute("data-pdl-instance-let") === n.id ? e.closest("[data-pdl-instance-of]") : e;
	if (n.instanceOf && g.hasAttribute("data-pdl-instance-of") ? fx(g, u, n.instanceKwargs) : (n.instanceOf && e.hasAttribute("data-pdl-instance-of") || !ax(t.instanceKwargs, n.instanceKwargs) && e.hasAttribute("data-pdl-instance-kwargs")) && fx(e, u, n.instanceKwargs), (n.kind === "layout" || n.kind === "text" || n.kind === "media") && (lb(f) || lb(t.props ?? {}))) {
		let r = t.props ?? {};
		if ((!ax(r.background, f.background) || !ax(r.foreground, f.foreground)) && (!ax(r.foreground, f.foreground) || !mx(e, f)) && hx(e, f), n.kind === "layout" && lb(f)) {
			let t = e.querySelector(":scope > .pdl-layout__content");
			if (t) {
				let e = Y(Ab(f), mb(f.overflow), "flex:1 1 auto", "width:100%", "height:100%", "min-width:0", "min-height:0", "position:relative", "z-index:1", "border-radius:inherit");
				t.setAttribute("style", e);
			}
		}
	}
	return "patched";
}
function mx(e, t) {
	let n = ab(t.background);
	if (n.length !== 1 || n[0].kind !== "solid") return !1;
	let r = e.querySelector(":scope > .pdl-layer-band"), i = r?.querySelector(":scope > div");
	if (!r || !i) return !1;
	let a = n[0].color, o = e.getAttribute("data-pdl-transition"), s = () => {
		let e = [
			"position:absolute",
			"inset:0",
			"z-index:1",
			`background:${a}`
		];
		o && o !== "none" && e.push(`transition:${o}`, "transform-origin:center"), i.setAttribute("style", e.join(";"));
	};
	if (o && o !== "none") {
		let e = i.getAttribute("style") ?? "";
		/(?:^|;)\s*transition\s*:/.test(e) || i.setAttribute("style", Y(e, `transition:${o}`, "transform-origin:center")), requestAnimationFrame(() => {
			i.isConnected && s();
		});
	} else s();
	return !0;
}
function hx(e, t) {
	let n = e.ownerDocument;
	if (!n) return;
	let r = cb(ab(t.background), 0), i = cb(ab(t.foreground), 2);
	for (let t of Array.from(e.querySelectorAll(":scope > .pdl-layer-band"))) t.remove();
	let a = e.querySelector(":scope > .pdl-layout__content") || e.querySelector(":scope > .pdl-text__inner") || e.querySelector(":scope > .pdl-media__img") || e.querySelector(":scope > .pdl-media__placeholder"), o = e.querySelector(":scope > .pdl-border-inside"), s = (t, r) => {
		if (!t) return;
		let i = n.createElement("div");
		i.innerHTML = t.trim();
		let a = i.firstElementChild;
		a && (r ? e.insertBefore(a, r) : e.appendChild(a));
	};
	a ? (s(r, a), s(i, o)) : (s(r, o), s(i, o));
}
function gx(e, t = {
	stackChild: !1,
	stackZ: 0
}, n) {
	let { id: r, kind: i } = e, a = e.props ?? {}, o = e.children ?? [], s = t.isTreeRoot === !0, c = s ? t.instancePath ?? r : e.instanceOf ? `${t.instancePath ?? ""}/${r}`.replace(/^\//, "") : t.instancePath ?? r, l = (s || e.instanceOf) && n?.ruleMarks ? n.ruleMarks[c] : void 0, u = l ? ` data-pdl-rule="${K(l)}"` : "", d = a.animate, f = typeof d == "object" && d ? ` data-pdl-animate="${K(JSON.stringify(d))}"` : "", p = Yy(a), m = p > 0 ? ` data-pdl-rest-blur="${K(String(p))}"` : "", h = ` data-pdl-id="${K(r)}"${u}${f}${m}`, g = e.instanceOf !== void 0 && !t.omitInstanceAttrs, _ = g ? ` data-pdl-instance-of="${K(e.instanceOf)}"` : "", v = g && e.instanceKwargs ? ` data-pdl-instance-kwargs="${K(JSON.stringify(e.instanceKwargs))}"` : "", y = g && e.instanceOf && n?.pointerInputTypes?.has(e.instanceOf) ? " data-pdl-pointer-input=\"1\"" : "", b = {
		...t,
		isTreeRoot: !1,
		instancePath: s || e.instanceOf ? c : t.instancePath
	}, x = "";
	if (g && e.instanceOf && n?.editableSessionDefaults?.[e.instanceOf]) {
		let t = {
			...n.editableSessionDefaults[e.instanceOf],
			...e.instanceKwargs ?? {}
		};
		b = {
			...b,
			sessionParams: t
		}, x = ` data-pdl-session-params="${K(JSON.stringify(t))}"`;
	}
	let ee = g && r ? ` data-pdl-instance-let="${K(r)}"` : "", te = g && typeof e.foreachList == "string" ? String(e.foreachList) : "", ne = te ? ` data-pdl-foreach-list="${K(te)}"` : "", S = `${_}${v}${y}${x}${ee}${ne}`;
	if (g && n && e.instanceOf && n.stateTrees && Object.keys(n.stateTrees).length > 0) {
		let t = `i${n.nextKey++}`, r = n.stateTrees[t];
		if (r && Object.keys(r).length > 0) {
			let i = `<div class="pdl-inst-state" data-pdl-state="rest">${gx(e, {
				...b,
				omitInstanceAttrs: !0
			}, n)}</div>`;
			for (let [e, t] of Object.entries(r)) {
				if (!t?.root) continue;
				let n = gx(t.root, {
					stackChild: !1,
					stackZ: 0,
					sessionParams: b.sessionParams
				});
				i += `<div class="pdl-inst-state" data-pdl-state="${K(e)}" hidden>${n}</div>`;
			}
			let a = ` data-pdl-chrome-state-param="${K(n.chromeStateParams?.[t] || "interactionState")}"`;
			return `<div class="pdl-instance"${_}${v}${y}${x}${ee}${ne}${a} data-pdl-instance-key="${K(t)}">${i}</div>`;
		}
	}
	if (i === "layout" || i === "presenter") {
		let e = Cb(a.direction), t = lb(a), r = i === "presenter" ? Mb(a) : "";
		if (t) {
			let t = Y(Fb(a, "layout", b), e ? "position:relative" : "", r), s = Y(Ab(a), mb(a.overflow), "flex:1 1 auto", "width:100%", "height:100%", "min-width:0", "min-height:0", "position:relative", "z-index:1", "border-radius:inherit"), c = cb(ab(a.background), 0), l = cb(ab(a.foreground), 2), u = i === "presenter" ? Pb(o, a, b, n) : o.map((e, t) => gx(e, Ib(a.direction, t, o.length, b), n)).join(""), { style: d, html: f } = vb(t, a, `${c}${`<div class="pdl-layout__content" style="${q(s)}">${u}</div>`}${l}`);
			return `<div class="pdl-frame pdl-layout pdl-layout--layers"${h}${S} style="${q(d)}">${f}</div>`;
		}
		let { style: s, html: c } = vb(Y(Fb(a, "layout", b), e ? "position:relative" : "", r), a, i === "presenter" ? Pb(o, a, b, n) : o.map((e, t) => gx(e, Ib(a.direction, t, o.length, b), n)).join(""));
		return `<div class="pdl-frame pdl-layout${i === "presenter" ? " pdl-presenter" : ""}"${h}${S} style="${q(s)}">${c}</div>`;
	}
	if (i === "text") {
		let e = typeof a.content == "string" ? a.content : "", t = typeof a.editable == "string" ? a.editable : a.editable === !0 ? "value" : void 0, n = Y(...Hb(a), ...b.stackChild ? Tb(b.stackZ) : []), r = Zb(b.sessionParams), i = Qb(b.sessionParams), o = !!t && r === "none" && !i, s = !!t && r === "press" && !i, c = b.sessionParams != null && Object.prototype.hasOwnProperty.call(b.sessionParams, "value"), l = c ? String(b.sessionParams.value ?? "") : e;
		if (s) {
			let r = l === "" ? e : l, i = Y(Xb(a), n, "cursor:pointer", "user-select:none", "box-sizing:border-box");
			return `<span class="pdl-frame pdl-text pdl-text--press-hit" role="textbox" tabindex="0"${h}${S} data-pdl-editable="${K(String(t))}" data-pdl-press-activate="1" style="${q(i)}">${Ly(r)}</span>`;
		}
		if (t && !o) {
			let r = c && !i && l === "" && e !== "" ? ` placeholder="${K(e)}"` : "", o = Y(Xb(a), n, ...ex(a));
			return `<input class="pdl-frame pdl-text pdl-text--editable" type="text"${h}${S} data-pdl-editable="${K(t)}" value="${K(l)}"${r} style="${q(o)}" />`;
		}
		let u = Rb(a) !== void 0;
		if (ub(a)) {
			let t = Y(qb(a), pb(a), Kb(a), "position:relative", "vertical-align:top", ...Vb(a), n), r = Y(u ? Wb(a) : Gb(a), mb(a.overflow), "position:relative", "z-index:1", "border-radius:inherit", "display:block", "width:100%", "height:100%", "box-sizing:border-box"), i = cb(ab(a.background), 0), o = cb(ab(a.foreground), 2), { style: s, html: c } = vb(t, a, `${i}<span class="pdl-text__inner" style="${q(r)}">${Ly(e)}</span>${o}`);
			return `<span class="pdl-frame pdl-text pdl-text--layers"${h}${S} style="${q(s)}">${c}</span>`;
		}
		if (u) {
			let { style: t, html: r } = vb(Y(Jb(a), n), a, `<span class="pdl-text__clamp" style="${q(Wb(a))}">${Ly(e)}</span>`);
			return `<span class="pdl-frame pdl-text"${h}${S} style="${q(t)}">${r}</span>`;
		}
		let { style: d, html: f } = vb(Y(Xb(a), n), a, Ly(e));
		return `<span class="pdl-frame pdl-text"${h}${S} style="${q(d)}">${f}</span>`;
	}
	if (i === "spacer") return `<div class="pdl-frame pdl-spacer"${h}${S} style="${q(Y(kb(a), ...Sb(a), ...t.stackChild ? Tb(t.stackZ) : [], "flex:1 1 auto", "min-height:0", "min-width:0"))}" aria-hidden="true"></div>`;
	if (i === "icon") {
		let e = nx(a, t), n = a.icon, i = Py(n) ? Iy(n) : typeof n == "string" ? n : r, o = J(a.size) ?? 24, s = Math.max(8, Math.min(11, Math.round(o * .28))), c = Py(n) && n.source === "file" ? n.path : typeof n == "string" && Ny(n) ? n : "";
		if (c && /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(c)) {
			let t = Y(e, "background-color:transparent", "padding:0", "object-fit:contain");
			if (_b(a)) {
				let { style: e, html: n } = vb(Y(t, "display:inline-block"), a, `<img class="pdl-icon__img" src="${K(c)}" alt="${K(i)}" style="display:block;width:100%;height:100%;object-fit:contain;border:none" />`);
				return `<div class="pdl-frame pdl-icon pdl-icon--file"${h}${S} style="${q(e)}">${n}</div>`;
			}
			return `<img class="pdl-frame pdl-icon pdl-icon--file"${h}${S} src="${K(c)}" alt="${K(i)}" style="${q(t)}" />`;
		}
		let l = Py(n) && n.source === "system" ? ` data-pdl-icon-system="${K(n.system)}" data-pdl-icon-name="${K(n.name)}"` : "", { style: u, html: d } = vb(e, a, `<span class="pdl-icon__name" style="color:#fff;font-size:${s}px;font-weight:600;line-height:1.1;text-align:center;padding:1px;text-shadow:0 0 2px rgba(0,0,0,0.55);word-break:break-all">${Ly(i)}</span>`);
		return `<div class="pdl-frame pdl-icon"${h}${S}${l} style="${q(u)}" role="img" aria-label="${K(i)}">${d}</div>`;
	}
	if (i === "media") {
		let e = Ry(a.source), n = typeof a.label == "string" ? a.label : r, i = rx(a, t), o = Fy(a.source) && a.source.mediaKind ? a.source.mediaKind : void 0, s = (/^https?:\/\//i.test(e) || e.startsWith("/") || e.startsWith("./") || Ny(e)) && e.length > 0;
		if (lb(a)) {
			let r = Y(kb(a, { omitBackground: !0 }), ...Sb(a), ...t.stackChild ? Tb(t.stackZ) : [], "position:relative", "overflow:hidden", "max-width:100%"), i = cb(ab(a.background), 0), c = cb(ab(a.foreground), 2), l = Y("position:relative", "z-index:1", "width:100%", "height:100%", "display:block", Db(a.contentMode), (() => {
				let e = ib(a.justify, a.align);
				return e ? `object-position:${e}` : void 0;
			})()), u;
			u = s ? o === "video" ? `<video class="pdl-media__img" src="${K(e)}" style="${q(l)}" playsinline muted loop aria-label="${K(n)}"></video>` : `<img class="pdl-media__img" src="${K(e)}" alt="${K(n)}" style="${q(l)}" />` : `<div class="pdl-media__placeholder" style="${q(l)};min-height:24px" role="img" aria-label="${K(n)}"></div>`;
			let { style: d, html: f } = vb(r, a, `${i}${u}${c}`);
			return `<div class="pdl-frame pdl-media pdl-media--layers"${h}${S} style="${q(d)}">${f}</div>`;
		}
		if (s && o === "video") {
			if (_b(a)) {
				let { style: t, html: r } = vb(Y(i, "display:inline-block"), a, `<video class="pdl-media__img" src="${K(e)}" style="display:block;width:100%;height:100%;border:none" playsinline muted loop aria-label="${K(n)}"></video>`);
				return `<div class="pdl-frame pdl-media"${h}${S} style="${q(t)}">${r}</div>`;
			}
			return `<video class="pdl-frame pdl-media"${h}${S} src="${K(e)}" style="${q(i)}" playsinline muted loop aria-label="${K(n)}"></video>`;
		}
		if (s) {
			if (_b(a)) {
				let { style: t, html: r } = vb(Y(i, "display:inline-block"), a, `<img class="pdl-media__img" src="${K(e)}" alt="${K(n)}" style="display:block;width:100%;height:100%;border:none" />`);
				return `<div class="pdl-frame pdl-media"${h}${S} style="${q(t)}">${r}</div>`;
			}
			return `<img class="pdl-frame pdl-media"${h}${S} src="${K(e)}" alt="${K(n)}" style="${q(i)}" />`;
		}
		let { style: c, html: l } = vb(i, a, "");
		return `<div class="pdl-frame pdl-media"${h}${S} style="${q(c)}" role="img" aria-label="${K(n)}">${l}</div>`;
	}
	let re = Fb(a, i, b), ie = o.map((e) => gx(e, {
		stackChild: !1,
		stackZ: 0,
		sessionParams: b.sessionParams
	}, n)).join("");
	return `<div class="pdl-frame pdl-unknown" data-pdl-kind="${K(i)}"${h}${S} style="${q(re)}">${ie}</div>`;
}
//#endregion
//#region ../../src/bakeReconcile.ts
function _x(e, t) {
	if (e === t) return !0;
	if (e == null || t == null) return e === t;
	if (typeof e != typeof t || typeof e != "object") return !1;
	if (Array.isArray(e) || Array.isArray(t)) return !Array.isArray(e) || !Array.isArray(t) || e.length !== t.length ? !1 : e.every((e, n) => _x(e, t[n]));
	let n = Object.keys(e).sort(), r = Object.keys(t).sort();
	return n.length === r.length && n.every((n, i) => n === r[i] && _x(e[n], t[n]));
}
function vx(e, t) {
	return e === t ? !0 : !e || !t ? !1 : _x(e.root, t.root) && _x(e.bakedParams ?? {}, t.bakedParams ?? {}) && e.rootKind === t.rootKind;
}
function yx(e) {
	return e.instanceOf && e.id ? `let:${e.id}` : `id:${e.id}`;
}
function bx(e, t) {
	let n = e.createElement("div");
	n.innerHTML = t.trim();
	let r = n.firstElementChild;
	if (!r) throw Error("renderFrame produced no element");
	return r;
}
function xx(e) {
	return e.querySelector(":scope > .pdl-layout__content") || e.querySelector(":scope > .pdl-inst-state:not([hidden])") || e;
}
function Sx(e, t) {
	for (let n of Array.from(e.children)) {
		if (n.classList.contains("pdl-presenter__cover")) {
			let e = Sx(n, t);
			if (e) return e;
			continue;
		}
		let e = n.getAttribute("data-pdl-instance-let");
		if (e && `let:${e}` === t) return n;
		let r = n.getAttribute("data-pdl-id");
		if (r && `id:${r}` === t) return n;
	}
	return null;
}
function Cx(e) {
	for (let t of Array.from(e.children)) if (t.classList.contains("pdl-presenter__cover")) {
		for (; t.firstChild;) e.insertBefore(t.firstChild, t);
		t.remove();
	}
}
function wx(e, t) {
	let n = e.ownerDocument;
	if (!n) return;
	let r = n.createElement("div");
	r.className = "pdl-presenter__cover", e.insertBefore(r, t), r.appendChild(t);
}
function Tx(e, t) {
	let n = e.getAttribute("data-pdl-session-params");
	if (!n) return;
	let r = t.hasAttribute("data-pdl-session-params") ? t : t.querySelector("[data-pdl-session-params]");
	if (r) try {
		let t = JSON.parse(n), i = JSON.parse(r.getAttribute("data-pdl-session-params") || "{}"), a = e.matches?.("input.pdl-text--editable") ? e : e.querySelector(".pdl-inst-state:not([hidden]) input.pdl-text--editable, input.pdl-text--editable"), o = dx(i, t, a && typeof document < "u" && document.activeElement === a ? a.value : null);
		r.setAttribute("data-pdl-session-params", JSON.stringify(o));
		let s = r.matches?.("input.pdl-text--editable") ? r : r.querySelector("input.pdl-text--editable");
		s && typeof o.value == "string" && (s.value = o.value);
	} catch {
		r.setAttribute("data-pdl-session-params", n);
	}
}
var Ex = [
	"data-pdl-instance-let",
	"data-pdl-instance-of",
	"data-pdl-instance-kwargs",
	"data-pdl-foreach-list",
	"data-pdl-session-params",
	"data-pdl-pointer-input",
	"data-pdl-listening",
	"data-pdl-chrome-state-param",
	"data-pdl-instance-key",
	"data-pdl-instance-bake"
];
function Dx(e, t) {
	if (e.classList.contains("pdl-instance")) {
		for (; e.firstChild;) e.removeChild(e.firstChild);
		e.appendChild(t);
		return;
	}
	let n = /* @__PURE__ */ new Map();
	for (let t of Ex) {
		let r = e.getAttribute(t);
		r != null && n.set(t, r);
	}
	if (e.tagName === "INPUT" || e.tagName === "TEXTAREA") {
		let r = e, i = t;
		for (let e of Array.from(i.attributes)) Ex.includes(e.name) || r.setAttribute(e.name, e.value);
		typeof i.value == "string" && (r.value = i.value);
		for (let [e, t] of n) r.setAttribute(e, t);
		return;
	}
	let r = t.getAttribute("class");
	r == null ? e.removeAttribute("class") : e.setAttribute("class", r);
	let i = t.getAttribute("style");
	i == null ? e.removeAttribute("style") : e.setAttribute("style", i);
	for (let n of Array.from(e.attributes)) n.name !== "class" && n.name !== "style" && (Ex.includes(n.name) || n.name.startsWith("data-pdl-") && !t.hasAttribute(n.name) && e.removeAttribute(n.name));
	for (let n of Array.from(t.attributes)) n.name !== "class" && n.name !== "style" && (Ex.includes(n.name) || e.setAttribute(n.name, n.value));
	for (; e.firstChild;) e.removeChild(e.firstChild);
	for (; t.firstChild;) e.appendChild(t.firstChild);
	for (let [t, r] of n) e.setAttribute(t, r);
}
function Ox(e, t) {
	if (!(!e && t == null)) return {
		nextKey: t ?? 0,
		stateTrees: e?.stateTrees ?? {},
		pointerInputTypes: e?.pointerInputTypes,
		editableSessionDefaults: e?.editableSessionDefaults
	};
}
function kx(e, t, n, r = {}) {
	let i = e.ownerDocument;
	if (!i || !n) return !1;
	try {
		let a = Ox(r.instCtx, r.nextKeyStart), o = Ox(r.prevInstCtx, r.nextKeyStart), s = r.sessionParams ?? n.instanceKwargs ?? void 0, c = {
			stackChild: !1,
			stackZ: 0,
			sessionParams: s,
			omitInstanceAttrs: !0
		}, l = {
			stackChild: !1,
			stackZ: 0,
			sessionParams: r.prevSessionParams ?? s,
			omitInstanceAttrs: !0
		}, u = e.classList.contains("pdl-instance") || e.hasAttribute("data-pdl-instance-let") ? e : e.closest("[data-pdl-instance-let], .pdl-instance") || e;
		if (u.classList.contains("pdl-instance")) {
			let e = u.querySelectorAll(":scope > .pdl-inst-state");
			if (e.length > 0) {
				let t = u.querySelector(":scope > .pdl-inst-state:not([hidden]) > *") || e[0]?.firstElementChild || null;
				for (; u.firstChild;) u.removeChild(u.firstChild);
				t && u.appendChild(t);
			}
		}
		let d = (e) => {
			if (s && Object.keys(s).length && (e.setAttribute("data-pdl-instance-kwargs", JSON.stringify(s)), e.hasAttribute("data-pdl-session-params") || e.hasAttribute("data-pdl-instance-of"))) {
				let t = e.getAttribute("data-pdl-session-params"), n = { ...s };
				if (t) try {
					let e = JSON.parse(t);
					n = dx(s, e, null);
				} catch {}
				e.setAttribute("data-pdl-session-params", JSON.stringify(n));
			}
		}, f = (e) => {
			let t = ix(e, c, a), n = bx(i, t);
			Dx(u, n), d(u);
		}, p = u.classList.contains("pdl-instance") && u.firstElementChild ? u.firstElementChild : null;
		if (!t) return f(n), !0;
		if (_x(t, n) && _x(r.prevSessionParams ?? null, r.sessionParams ?? null)) return d(u), !0;
		if (p) return Ix(p, t, n, a, i, c, o, l), u.firstElementChild?.isConnected ? d(u) : f(n), !0;
		let m = _x(t.props ?? {}, n.props ?? {}), h = _x(t.children ?? [], n.children ?? []);
		return !m && px(u, t, n, c, a, o, l) === "needsRemount" ? (f(n), !0) : (d(u), h || jx(xx(u), t.children ?? [], n.children ?? [], a, i, c, o, l), !0);
	} catch {
		return !1;
	}
}
function Ax(e, t, n, r = {}) {
	let i = e.ownerDocument;
	if (!i) return !1;
	try {
		let a = Ox(r.instCtx, r.nextKeyStart), o = Ox(r.prevInstCtx, r.nextKeyStart), s = {
			stackChild: !1,
			stackZ: 0,
			sessionParams: r.sessionParams ?? n.bakedParams
		}, c = {
			stackChild: !1,
			stackZ: 0,
			sessionParams: r.prevSessionParams ?? t?.bakedParams ?? s.sessionParams
		}, l = vx(t, n), u = !_x(r.prevInstCtx?.editableSessionDefaults ?? null, r.instCtx?.editableSessionDefaults ?? null), d = !_x(c.sessionParams ?? null, s.sessionParams ?? null);
		return l && !u && !d || jx(e, t ? [t.root] : [], [n.root], a, i, s, o, c), !0;
	} catch {
		return !1;
	}
}
function jx(e, t, n, r, i, a, o, s) {
	e.classList.contains("pdl-presenter") && Cx(e);
	let c = new Map(t.map((e) => [yx(e), e])), l = [], u = /* @__PURE__ */ new Set();
	for (let t = 0; t < n.length; t++) {
		let d = n[t], f = yx(d), p = c.get(f), m = Sx(e, f);
		m && u.has(m) && (m = null);
		let h = Px(a, e, t, n.length), g = Px(s ?? a, e, t, n.length);
		if (m && p && p.kind === d.kind && p.instanceOf === d.instanceOf) {
			u.add(m), Ix(m, p, d, r, i, h, o, g);
			let t = Sx(e, f);
			if (t) l.push(t);
			else if (m.isConnected) l.push(m);
			else {
				let e = ix(d, h, r);
				l.push(bx(i, e));
			}
		} else {
			let e = bx(i, ix(d, h, r));
			m && Tx(m, e), l.push(e);
		}
	}
	Nx(e, l), e.classList.contains("pdl-presenter") && l.length >= 2 && wx(e, l[l.length - 1]);
}
function Mx(e) {
	return e.getAttribute("data-pdl-presenter-clip") === "outgoing";
}
function Nx(e, t) {
	let n = new Set(t);
	for (let t of Array.from(e.children)) Mx(t) || n.has(t) || e.removeChild(t);
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		e.children[n] !== r && e.insertBefore(r, e.children[n] || null);
	}
}
function Px(e, t, n, r) {
	let i = e.sessionParams, a = t.getAttribute("style") || "";
	return /grid-template-columns:\s*minmax/.test(a) || /display:\s*grid/.test(a) ? {
		stackChild: !0,
		stackZ: /flex-direction:\s*column-reverse/.test(a) ? n + 1 : r - n,
		sessionParams: i
	} : {
		stackChild: !1,
		stackZ: 0,
		sessionParams: i
	};
}
function Fx(e) {
	return e.classList.contains("pdl-instance") && (e.querySelector(":scope > .pdl-inst-state:not([hidden]) > [data-pdl-id]") || e.querySelector(":scope > .pdl-inst-state:not([hidden]) > *")) || e;
}
function Ix(e, t, n, r, i, a, o, s) {
	let c = _x(t.props ?? {}, n.props ?? {}), l = _x(t.instanceKwargs ?? {}, n.instanceKwargs ?? {}), u = _x(t.children ?? [], n.children ?? []), d = Fx(e), f = a;
	n.instanceOf && r?.editableSessionDefaults?.[n.instanceOf] && (f = {
		...a,
		sessionParams: {
			...r.editableSessionDefaults[n.instanceOf],
			...n.instanceKwargs ?? {}
		}
	});
	let p = s ?? a;
	if (t.instanceOf && (o ?? r)?.editableSessionDefaults?.[t.instanceOf]) {
		let e = o ?? r;
		p = {
			...s ?? a,
			sessionParams: {
				...e.editableSessionDefaults[t.instanceOf],
				...t.instanceKwargs ?? {}
			}
		};
	}
	let m = _x(o?.editableSessionDefaults ?? null, r?.editableSessionDefaults ?? null);
	if (!c || !l || !m) {
		let a = px(d, t, n, f, r, o, p);
		if (e.classList.contains("pdl-instance") && e !== d) {
			if (n.instanceKwargs && e.setAttribute("data-pdl-instance-kwargs", JSON.stringify(n.instanceKwargs)), f.sessionParams) {
				let t = e.getAttribute("data-pdl-session-params"), n = { ...f.sessionParams };
				if (t) try {
					let r = JSON.parse(t), i = e.matches?.("input.pdl-text--editable") ? e : e.querySelector("input.pdl-text--editable"), a = i && typeof document < "u" && document.activeElement === i ? i.value : null;
					n = dx(f.sessionParams, r, a);
				} catch {}
				e.setAttribute("data-pdl-session-params", JSON.stringify(n));
			}
		} else if (a === "patched" && f.sessionParams && e.hasAttribute("data-pdl-session-params")) {
			let t = e.getAttribute("data-pdl-session-params"), n = { ...f.sessionParams };
			if (t) try {
				let e = JSON.parse(t);
				n = dx(f.sessionParams, e, null);
			} catch {}
			e.setAttribute("data-pdl-session-params", JSON.stringify(n));
		}
		if (a === "needsRemount") {
			let t = bx(i, ix(n, f, r));
			Tx(e, t), e.replaceWith(t);
			return;
		}
	}
	let h = t.children ?? [], g = n.children ?? [];
	u && m || jx((e.classList.contains("pdl-instance") ? e.querySelector(":scope > .pdl-inst-state:not([hidden])") : null) ?? xx(d), h, g, r, i, f, o, p);
}
//#endregion
//#region src/inspector.js
function Lx() {
	return document.getElementById("inspectPane");
}
function Rx() {
	return document.querySelector(".preview-frame-wrap");
}
function zx() {
	let e = Lx(), t = Rx();
	e && (e.hidden = !0, e.innerHTML = ""), t && (t.hidden = !1);
}
function Bx(e, t, n) {
	let r = Lx(), i = Rx();
	if (i && (i.hidden = !0), r) return r.hidden = !1, r.innerHTML = `<div class="inspect-head"><strong>${X(e)}</strong></div><div class="inspect-body">${t}</div>`, n;
}
function Vx() {
	let t = e.selectedKind;
	if (!t || t === "component") return zx(), { handled: !1 };
	let n = e.catalogue;
	if (!n) return Bx("—", "<p class=\"hint\">No catalogue loaded.</p>"), {
		handled: !0,
		status: "No catalogue"
	};
	if (t === "tokens") {
		let e = Hx(n), t = Object.keys(n.tokenTables?.primitives ?? {}).length + Object.keys(n.tokenTables?.semantics ?? {}).length;
		return Bx("Tokens", e, `${t} token(s)`), {
			handled: !0,
			status: `Tokens · ${t}`
		};
	}
	if (t === "theme") {
		let t = e.selectedSymbol || e.theme, r = Ux(n, t);
		return Bx(t ? `Theme · ${t}` : "Theme", r), {
			handled: !0,
			status: t ? `Theme · ${t}` : "Theme"
		};
	}
	if (t === "typeStyles") {
		let e = Wx(n), t = Object.keys(n.tokenTables?.typeStyles ?? {}).length;
		return Bx("Type styles", e), {
			handled: !0,
			status: `Type styles · ${t}`
		};
	}
	if (t === "samples") {
		let t = e.selectedSymbol, r = Gx(n, t);
		return Bx(t ? `Samples · ${t}` : "Samples", r), {
			handled: !0,
			status: t ? `Samples · ${t}` : "Samples"
		};
	}
	if (t === "file") {
		let t = e.editFile, r = Kx(t, n);
		return Bx(t || "File", r), {
			handled: !0,
			status: t ? `File · ${t}` : "File"
		};
	}
	return zx(), { handled: !1 };
}
function Hx(e) {
	let t = e.tokenTables ?? {}, n = t.primitives ?? {}, r = t.semantics ?? {}, i = [];
	return i.push(qx("Primitives", Object.values(n), n, r)), i.push(qx("Semantics", Object.values(r), n, r)), !Object.keys(n).length && !Object.keys(r).length ? "<p class=\"hint\">No tokens in this catalogue.</p>" : i.join("");
}
function Ux(e, t) {
	if (!t) return "<p class=\"hint\">Select a theme.</p>";
	let n = e.tokenTables?.themes?.[t];
	if (!n) return `<p class="hint">Theme <code>${X(t)}</code> not found.</p>`;
	let r = n.overrides ?? {}, i = e.tokenTables?.primitives ?? {}, a = e.tokenTables?.semantics ?? {}, o = Object.entries(r).map(([e, t]) => ({
		name: e,
		tokenType: Xx(e, i, a),
		definition: t
	}));
	return o.length ? qx("Overrides", o, i, a) : "<p class=\"hint\">No overrides on this theme.</p>";
}
function Wx(e) {
	let t = e.tokenTables?.typeStyles ?? {}, n = Object.values(t);
	return n.length ? `<ul class="token-list type-style-list">${n.map((e) => {
		let t = e.props ?? {}, n = Zx(t.fontFamily) ?? "system-ui", r = Zx(t.fontSize) ?? 16, i = Zx(t.fontWeight) ?? 400, a = Zx(t.lineHeight), o = [
			`font-family:${$x(String(n))}`,
			`font-size:${Math.min(Number(r) || 16, 36)}px`,
			`font-weight:${Number(i) || 400}`,
			a == null ? "" : `line-height:${a}`
		].filter(Boolean).join(";"), s = [
			n,
			`${r}px`,
			i,
			a == null ? null : `lh ${a}`
		].filter(Boolean).join(" · ");
		return `<li><span class="type-sample" style="${eS(o)}" aria-hidden="true">Ag</span><code class="name">${X(e.name)}</code><span class="type">${X(s)}</span></li>`;
	}).join("")}</ul>` : "<p class=\"hint\">No type styles.</p>";
}
function Gx(e, t) {
	let n = t ? e.samples?.[t] : null;
	if (!t || !n) return "<p class=\"hint\">Select a samples bank.</p>";
	let r = Array.isArray(n) ? n.map((e, t) => ({
		key: String(t),
		value: e
	})) : Object.entries(n).map(([e, t]) => ({
		key: e,
		value: t
	}));
	return r.length ? `<ul class="token-list samples-list">${r.map((e) => `<li><code class="name">${X(e.key)}</code><code class="hex">${X(Qx(e.value))}</code></li>`).join("")}</ul>` : "<p class=\"hint\">Empty samples bank.</p>";
}
function Kx(t, n) {
	if (!t) return "<p class=\"hint\">No file selected.</p>";
	let r = e.files[t] ?? "", i = /\b(primitive|semantic)\s+/.test(r), a = /\btheme\s+\w+/.test(r), o = /\btypeStyle\s+/.test(r), s = (n.components ?? []).filter((e) => {
		let i = n.componentFiles?.[e];
		if (i) {
			let e = String(i).replace(/\\/g, "/");
			if (e.endsWith(t) || t.endsWith(e) || e.includes(t)) return !0;
		}
		return RegExp(`\\b(component|page|screen)\\s+${tS(e)}\\b`).test(r);
	});
	if (i && !s.length) return Hx(n);
	if (a && !s.length) return Ux(n, r.match(/\btheme\s+(\w+)/)?.[1] ?? e.theme);
	if (o && !s.length) return Wx(n);
	let c = [];
	return c.push(`<p class="hint">${X(t)}</p>`), s.length ? c.push(`<ul class="token-list">${s.map((e) => `<li><code class="name">${X(e)}</code><span class="type">${X(n.componentRoles?.[e] || "component")}</span></li>`).join("")}</ul>`) : c.push("<p class=\"hint\">No previewable symbols in this file. Open System and pick Tokens or a component.</p>"), c.join("");
}
function qx(e, t, n, r) {
	if (!t.length) return "";
	let i = [...t].sort((e, t) => String(e.name).localeCompare(String(t.name)));
	return `<div class="token-section"><div class="token-section-title">${X(e)}</div><ul class="token-list">${i.map((e) => Jx(e, n, r)).join("")}</ul></div>`;
}
function Jx(e, t, n) {
	let r = Yx(e, t, n), i = e.tokenType || r.tokenType || "", a = "<span class=\"swatch empty\" aria-hidden=\"true\"></span>", o = "";
	if (i === "Color" && r.cssColor) a = `<span class="swatch" title="${eS(r.label || r.cssColor)}"><span class="fill" style="background:${eS(r.cssColor)}"></span></span>`, o = `<code class="hex">${X(r.label || r.cssColor)}</code>`;
	else if (i === "Distance" && r.number != null) {
		let e = Math.max(2, Math.min(Math.round(Math.abs(r.number)), 96));
		a = `<span class="ruler" title="${eS(String(r.number))}px" aria-hidden="true"><span class="tick"></span><span class="beam" style="width:${e}px"></span><span class="tick"></span></span>`, o = `<code class="hex">${X(String(r.number))}px</code>`;
	} else if (i === "Radius" && r.number != null) {
		let e = Math.max(0, r.number), t = Math.max(14, Math.min(Math.round(e) || 14, 48)), n = Math.min(e, t);
		a = `<span class="radius-corner" title="${eS(String(e))}px" aria-hidden="true" style="width:${t}px;height:${t}px;border-top-left-radius:${n}px"></span>`, o = `<code class="hex">${X(String(e))}px</code>`;
	} else i === "Opacity" && r.number != null ? o = `<code class="hex">${X(String(r.number))}</code>` : r.label ? o = `<code class="hex">${X(r.label)}</code>` : r.ref && (o = `<code class="hex">${X(r.ref)}</code>`);
	let s = i ? `<span class="type">${X(i)}</span>` : "";
	return `<li>${a}<code class="name">${X(e.name)}</code>${s}${o}</li>`;
}
function Yx(e, t, n, r = 0) {
	if (r > 8) return { label: "…" };
	let i = e?.definition;
	if (i == null) return {};
	if (typeof i == "object" && i.kind === "hex" && typeof i.value == "string") return {
		cssColor: i.value,
		label: i.value,
		tokenType: "Color"
	};
	if (typeof i == "object" && i.kind === "number" && typeof i.value == "number") return {
		number: i.value,
		label: String(i.value)
	};
	if (typeof i == "object" && i.kind === "string" && typeof i.value == "string") return { label: i.value };
	if (typeof i == "string") {
		if (i.startsWith("primitive:")) {
			let e = t[i.slice(10)];
			return e ? {
				...Yx(e, t, n, r + 1),
				ref: i
			} : {
				ref: i,
				label: i
			};
		}
		if (i.startsWith("semantic:")) {
			let e = n[i.slice(9)];
			return e ? {
				...Yx(e, t, n, r + 1),
				ref: i
			} : {
				ref: i,
				label: i
			};
		}
		return /^#[0-9A-Fa-f]{3,8}$/.test(i) ? {
			cssColor: i,
			label: i,
			tokenType: "Color"
		} : { label: i };
	}
	return { label: Qx(i) };
}
function Xx(e, t, n) {
	return t[e]?.tokenType || n[e]?.tokenType || "Color";
}
function Zx(e) {
	return e == null ? null : typeof e == "object" && "value" in e ? e.value : e;
}
function Qx(e) {
	if (e == null) return "—";
	if (typeof e == "string") return e;
	if (typeof e == "number" || typeof e == "boolean") return String(e);
	try {
		return JSON.stringify(e);
	} catch {
		return String(e);
	}
}
function $x(e) {
	return `"${String(e).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}
function X(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function eS(e) {
	return X(e).replace(/"/g, "&quot;");
}
function tS(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//#endregion
//#region src/preview.js
var nS = null, rS = 0, iS = 0, aS = null, oS = null, sS = null, cS = null, lS = {}, uS = null, dS = /* @__PURE__ */ new Map(), fS = /* @__PURE__ */ new Map(), pS = /* @__PURE__ */ new Map(), mS = null;
function hS(t, n = {}) {
	nS = t, aS = n.onStatus ?? null, oS = n.onError ?? null, sS = n.onOpenSource ?? null, cS = n.onWorldMutated ?? null, window.addEventListener("message", (e) => {
		let t = e.data;
		!t || typeof t != "object" || gS(t);
	}), document.getElementById("previewPin")?.addEventListener("change", (t) => {
		e.previewPinned = t.target.checked, r();
	}), document.querySelectorAll("[data-preview-mode]").forEach((t) => {
		t.addEventListener("click", () => {
			e.previewMode = t.getAttribute("data-preview-mode") === "gallery" ? "gallery" : "primary", LS(), Z();
		});
	}), document.getElementById("themeSelect")?.addEventListener("change", (t) => {
		e.theme = t.target.value, Z();
	}), document.getElementById("btnResetWorld")?.addEventListener("click", () => {
		let t = e.previewRoot;
		t && (e.activeWorld[t] = null, e.paramOverrides[t] = {}, delete lS[t]), e.worldMode = "fixtures", r(), cS?.(), Z();
	});
}
function gS(t) {
	let n = t.type;
	if (n === "pdl-open-source" && typeof t.component == "string" && t.component) {
		sS?.(t.component);
		return;
	}
	if (n === "pdl-world-mode" && (t.mode === "fixtures" || t.mode === "params")) {
		e.worldMode = t.mode, r(), cS?.();
		return;
	}
	if (n === "pdl-fixture" && typeof t.component == "string" && t.component) {
		CS(t.component, typeof t.label == "string" && t.label.trim() ? String(t.label) : null);
		return;
	}
	if (n === "pdl-param" && typeof t.component == "string" && t.kv && typeof t.kv == "object") {
		wS(t.component, t.kv);
		return;
	}
	if (n === "pdl-resolve-instance") {
		FS(t);
		return;
	}
	if (n === "pdl-interaction") {
		_S(t);
		return;
	}
}
async function _S(t) {
	let n = typeof t.event == "string" ? t.event : "", r = typeof t.component == "string" ? t.component : "", i = n === "hoverStart" || n === "hoverEnd" || n === "pressStart" || n === "pressEnd" || n === "pressCancel";
	if (t.unhandledAncestors) aS?.(`Interaction · ${r} · unhandled ancestors (no-op)`);
	else if (n) {
		let e = Array.isArray(t.emits) && t.emits.length ? ` · emit ${t.emits.map((e) => e?.name).filter(Boolean).join(",")}` : "", i = t.childComponent ? ` ← ${t.childComponent}` : "";
		aS?.(`Interaction · ${r}${i} · ${n}${e}`);
	}
	let a = Array.isArray(t.presenterOps) ? t.presenterOps : [], o = r || e.previewRoot || "", s = Zv(a.filter((e) => !e.owner || e.owner === "section" || e.owner === o), lS[o] ?? {}), c = s ? Dy(nS?.contentDocument, o) : null;
	mS &&= (mS.cancel(), null);
	let l = yS(o, a), u = !!t.changed && a.length === 0, d = t.previewHandled !== !0 && (l || u) || !!s && l;
	o && t.params && typeof t.params == "object" && !Array.isArray(t.params) && (!i || d) && (e.paramOverrides[o] = {
		...e.paramOverrides[o] ?? {},
		...TS(o, t.params)
	}, d && (e.activeWorld[o] = null, e.worldMode !== "params" && (e.worldMode = "params")), cS?.()), d && o && (e.activeWorld[o] = null, await vS(o) || await DS(), s && c && (mS = jy(nS?.contentDocument, c, s, o)));
}
async function vS(t) {
	if (!t || !nS || !e.root || !e.entry) return !1;
	let n = nS.contentDocument?.querySelector(`section.pdl-preview[data-pdl-component="${CSS.escape(t)}"]`);
	if (!n) return !1;
	let r = n.querySelector(".pdl-state:not([hidden]) .pdl-canvas") || n.querySelector(".pdl-canvas");
	if (!r) return !1;
	try {
		let i = await Rv();
		if (!i) return !1;
		pv();
		let { filesJson: a, entry: o } = Lv({
			...(await p(e.root, e.entry)).files ?? {},
			...e.files
		}, e.entry), s = e.theme || "", c = (e.catalogue?.hostParams?.length ?? 0) > 0, l = c ? "Default" : "", u = JSON.stringify(c ? e.hostFacts ?? {} : {}), d = kS(e.paramOverrides[t] ?? {}), f = i.bake_component_sources(a, o, t, s, JSON.stringify(d), l, u, bS(t)), m = JSON.parse(f)?.components?.[t];
		if (!m?.root) return !1;
		let h = uS?.components?.[t] ?? null;
		if (!Ax(r, h, m, {
			sessionParams: m.bakedParams && typeof m.bakedParams == "object" ? { ...m.bakedParams } : void 0,
			prevSessionParams: h?.bakedParams && typeof h.bakedParams == "object" ? { ...h.bakedParams } : void 0
		})) return !1;
		uS ||= { components: {} }, uS.components || (uS.components = {}), uS.components[t] = m, SS(t, m);
		let g = n.querySelector(".pdl-preview-params");
		if (g && m.bakedParams) {
			let e = JSON.stringify(m.bakedParams), t = JSON.stringify(m.bakedParams, null, 2);
			g.setAttribute("data-json", e);
			let n = g.querySelector(".pdl-preview-params-line"), r = g.querySelector(".pdl-preview-params-full");
			n && (n.textContent = e), r && (r.textContent = t);
		}
		return !0;
	} catch (e) {
		return console.warn("owner in-place rebake failed:", e), !1;
	}
}
function yS(e, t) {
	if (!e || !Array.isArray(t) || !t.length) return !1;
	let n = t.filter((t) => t && typeof t == "object" && (!t.owner || t.owner === "section" || t.owner === e));
	return n.length ? (lS[e] = Xv(lS[e] ?? {}, n), !0) : !1;
}
function bS(e) {
	let t = e ? lS[e] : null;
	if (!(!t || typeof t != "object" || !Object.keys(t).length)) return JSON.stringify(t);
}
function xS(e) {
	let t = {};
	function n(e) {
		if (!e || typeof e != "object") return;
		let r = e;
		if (r.kind === "presenter" && typeof r.id == "string" && r.id) {
			let e = r.props && typeof r.props == "object" ? r.props : {}, n = { stack: (Array.isArray(e.stack) ? e.stack.map(String) : []).map((e) => ({
				component: e,
				params: {}
			})) };
			typeof e.cover == "string" && e.cover && (n.cover = {
				component: e.cover,
				params: {}
			}), t[r.id] = n;
		}
		let i = Array.isArray(r.children) ? r.children : [];
		for (let e of i) n(e);
	}
	return n(e?.root), Object.keys(t).length ? t : null;
}
function SS(e, t) {
	if (!e || !t) return;
	let n = xS(t);
	if (!n) return;
	let r = lS[e];
	if (!r || !Object.keys(r).length) {
		lS[e] = n;
		return;
	}
	for (let [e, t] of Object.entries(n)) {
		let n = r[e], i = n && typeof n == "object" ? n.stack : null;
		(!Array.isArray(i) || i.length === 0) && (r[e] = t);
	}
}
function CS(t, n) {
	let i = e.catalogue?.fixturesByComponent?.[t] ?? {};
	e.selectedKind = "component", e.previewPinned || (e.previewRoot = t), e.selectedSymbol = t, e.worldMode = "fixtures", n && i[n] ? (e.activeWorld[t] = n, e.paramOverrides[t] = { ...ES(i[n]) }) : (e.activeWorld[t] = null, e.paramOverrides[t] = {}), r(), cS?.(), Z(0);
}
function wS(t, n) {
	e.selectedKind = "component", e.previewPinned || (e.previewRoot = t), e.selectedSymbol = t, e.activeWorld[t] = null, e.worldMode = "params", e.paramOverrides[t] = TS(t, n), r(), cS?.(), Z(0);
}
function TS(t, n) {
	let r = e.catalogue?.componentParams?.[t] ?? [], i = {};
	for (let [t, a] of Object.entries(n ?? {})) {
		if (a == null || typeof a == "object") continue;
		let n = a, o = r.find((e) => e.name === t), s = o ? e.catalogue?.variantCases?.[o.typeName] : void 0;
		typeof n == "string" && (Array.isArray(s) && s.includes(n.replace(/^\./, "")) ? n = `.${n.replace(/^\./, "")}` : n === "true" ? n = !0 : n === "false" ? n = !1 : n !== "" && !Number.isNaN(Number(n)) && /^-?\d+(\.\d+)?$/.test(n) && (n = Number(n))), i[t] = n;
	}
	return i;
}
function ES(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = r);
	return t;
}
function Z(e = 280) {
	window.clearTimeout(iS), iS = window.setTimeout(() => {
		DS();
	}, e);
}
async function DS() {
	let t = ++rS;
	if (!e.root || !e.entry || !nS) return;
	let n = Vx();
	if (n.handled) {
		oS?.(null), aS?.(n.status || "Inspector");
		return;
	}
	let r = e.previewRoot;
	if (!r && e.previewMode === "primary") {
		aS?.("Select a component to preview");
		return;
	}
	pv(), oS?.(null), aS?.("Baking…");
	try {
		let n = await Rv();
		if (!n) throw Error("WASM bake unavailable — run npm run build:wasm");
		let { filesJson: i, entry: a } = Lv({
			...(await p(e.root, e.entry)).files ?? {},
			...e.files
		}, e.entry), o = e.theme || "", s = (e.catalogue?.hostParams?.length ?? 0) > 0, c = s ? "Default" : "", l = JSON.stringify(s ? e.hostFacts ?? {} : {}), u, d;
		e.previewMode === "gallery" && e.editFile ? (u = q_(e.editFile, e.files, e.catalogue), !u.length && r && (u = [r]), r && u.includes(r) && (u = [r, ...u.filter((e) => e !== r)])) : d = r || void 0;
		let f = performance.now(), m;
		if (u && u.length > 1) {
			let t = { components: {} };
			for (let r of u) {
				let s = kS(e.paramOverrides[r] ?? {}), u = n.bake_component_sources(i, a, r, o, JSON.stringify(s), c, l, bS(r)), d = JSON.parse(u);
				Object.assign(t.components, d.components ?? {}), t.tokens || Object.assign(t, {
					...d,
					components: t.components
				});
			}
			m = t;
		} else {
			let t = d || u?.[0];
			if (!t) {
				aS?.("Nothing to preview");
				return;
			}
			let r = kS(e.paramOverrides[t] ?? {}), s = n.bake_component_sources(i, a, t, o, JSON.stringify(r), c, l, bS(t));
			m = JSON.parse(s), u?.length === 1 ? d = void 0 : (d = t, u = void 0);
		}
		let g = Math.round(performance.now() - f);
		if (t !== rS) return;
		if (m?.components && typeof m.components == "object") {
			uS = m;
			for (let [e, t] of Object.entries(m.components)) SS(e, t);
		}
		let _ = {};
		if (d && e.activeWorld[d] && (_[d] = e.activeWorld[d]), u) for (let t of u) e.activeWorld[t] && (_[t] = e.activeWorld[t]);
		let v = Array.isArray(u) ? u.length : 0, y = await h({
			bake: m,
			component: d,
			componentNames: u,
			interactiveHost: !0,
			root: e.root,
			entry: e.entry,
			files: e.files,
			activeFixturesByComponent: _,
			componentOverrides: e.paramOverrides,
			hostChrome: e.mode === "prototype" ? "device" : void 0,
			worldMode: e.worldMode
		});
		if (t !== rS) return;
		if (!y.ok) throw Error(y.error || "render-from-bake failed");
		OS(y.html), RS(e.selectedSymbol || e.previewRoot), aS?.(v > 1 ? `Preview · file gallery · ${v} · bake ${g}ms` : `Preview · wasm · bake ${g}ms`), oS?.(null);
	} catch (e) {
		if (t !== rS) return;
		let n = e instanceof Error ? e.message : String(e);
		oS?.(n), aS?.("Preview failed");
	}
}
function OS(t) {
	if (!nS) return;
	let n = nS.contentDocument;
	if (n && n.documentElement && n.body?.querySelector?.(".pdl-root, .pdl-page, [data-pdl-id]")) try {
		if (Wv(n, t)) {
			n.querySelectorAll("section.pdl-preview").forEach((t) => {
				t.setAttribute("data-world-mode", e.worldMode), t.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((t) => {
					t.classList.toggle("is-active", t.getAttribute("data-world-mode") === e.worldMode);
				});
			}), qv(nS), RS(e.selectedSymbol || e.previewRoot);
			return;
		}
	} catch {}
	nS.srcdoc = t, nS.addEventListener("load", () => {
		let t = nS?.contentDocument;
		t && t.querySelectorAll("section.pdl-preview").forEach((t) => {
			t.setAttribute("data-world-mode", e.worldMode), t.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((t) => {
				t.classList.toggle("is-active", t.getAttribute("data-world-mode") === e.worldMode);
			});
		});
	}, { once: !0 });
}
function kS(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = typeof r == "string" && r.startsWith(".") && r.length > 1 && !r.includes(" ") ? r.slice(1) : r);
	return t;
}
function AS(e) {
	let t = typeof e.component == "string" ? e.component : "", n = typeof e.instanceLet == "string" ? e.instanceLet : "", r = typeof e.childComponent == "string" ? e.childComponent : "";
	return n ? `${t}::${n}` : `${t}::__root__::${r}`;
}
function jS(e) {
	return typeof e != "object" || !e ? JSON.stringify(e) : Array.isArray(e) ? `[${e.map((e) => jS(e)).join(",")}]` : `{${Object.keys(e).sort().map((t) => `${JSON.stringify(t)}:${jS(e[t])}`).join(",")}}`;
}
function MS(e, t) {
	return `${e}\0${jS(t ?? {})}`;
}
async function NS(t, n) {
	let r = MS(t, n), i = dS.get(r);
	if (i?.root) return i;
	let a = await Rv();
	if (!a || !e.root || !e.entry) return null;
	pv();
	let { filesJson: o, entry: s } = Lv({
		...(await p(e.root, e.entry)).files ?? {},
		...e.files
	}, e.entry), c = e.theme || "", l = (e.catalogue?.hostParams?.length ?? 0) > 0, u = l ? "Default" : "", d = JSON.stringify(l ? e.hostFacts ?? {} : {}), f = a.bake_component_sources(o, s, t, c, JSON.stringify(n ?? {}), u, d, bS(t)), m = JSON.parse(f)?.components?.[t] ?? null;
	if (!m?.root) return null;
	let h = {
		root: m.root,
		bakedParams: m.bakedParams
	};
	return dS.set(r, h), h;
}
async function PS(e, t) {
	let n = nS?.contentDocument;
	if (!n) return;
	let r = typeof e.component == "string" ? e.component : "", i = typeof e.instanceLet == "string" ? e.instanceLet : "", a = typeof e.childComponent == "string" ? e.childComponent : "", o = e.childParams && typeof e.childParams == "object" && !Array.isArray(e.childParams) ? e.childParams : {};
	if (!a) return;
	let s = AS(e);
	if (fS.get(s) !== t) return;
	let c = await NS(a, o);
	if (fS.get(s) !== t) return;
	if (!c?.root) {
		aS?.(`Instance resolve failed · ${a}`);
		return;
	}
	let l = r ? n.querySelector(`section.pdl-preview[data-pdl-component="${CSS.escape(r)}"]`) : null;
	if (!i) {
		if (!l) return;
		let t = l.querySelector(".pdl-state:not([hidden]) .pdl-canvas") || l.querySelector(".pdl-canvas");
		if (!t) return;
		let n = uS?.components?.[r] ?? null, i = {
			...n && typeof n == "object" ? n : { name: r },
			name: r,
			root: c.root,
			bakedParams: c.bakedParams ?? o
		};
		if (!Ax(t, n, i, {
			sessionParams: o,
			prevSessionParams: n?.bakedParams && typeof n.bakedParams == "object" ? { ...n.bakedParams } : void 0
		})) return;
		uS?.components && (uS.components[r] = i);
		let s = l.querySelector(".pdl-preview-params");
		if (s && i.bakedParams) {
			let e = JSON.stringify(i.bakedParams), t = JSON.stringify(i.bakedParams, null, 2);
			s.setAttribute("data-json", e);
			let n = s.querySelector(".pdl-preview-params-line"), r = s.querySelector(".pdl-preview-params-full");
			n && (n.textContent = e), r && (r.textContent = t);
		}
		let u = typeof e.reason == "string" ? e.reason : "";
		aS?.(`Instance resolve · ${a}#${r}${u ? ` · ${u}` : ""}`);
		return;
	}
	let u = (l || n).querySelector(`[data-pdl-instance-let="${CSS.escape(i)}"]`);
	if (!u) return;
	let d = null;
	try {
		let e = u.getAttribute("data-pdl-instance-bake");
		e && (d = JSON.parse(e));
	} catch {
		d = null;
	}
	let f;
	try {
		f = JSON.parse(u.getAttribute("data-pdl-instance-kwargs") || "{}");
	} catch {
		f = void 0;
	}
	if (fS.get(s) !== t || !kx(u, d, c.root, {
		sessionParams: o,
		prevSessionParams: f
	}) || fS.get(s) !== t) return;
	try {
		u.setAttribute("data-pdl-instance-bake", JSON.stringify(c.root)), u.setAttribute("data-pdl-instance-kwargs", JSON.stringify(o));
	} catch {}
	let p = typeof e.reason == "string" ? e.reason : "";
	aS?.(`Instance resolve · ${a}${i ? `#${i}` : ""}${p ? ` · ${p}` : ""}`);
}
function FS(e) {
	let t = AS(e), n = (fS.get(t) || 0) + 1;
	fS.set(t, n);
	let r = (pS.get(t) || Promise.resolve()).then(() => PS(e, n)).catch((e) => {
		console.warn("instance resolve failed:", e);
	});
	pS.set(t, r);
}
function IS() {
	let t = document.getElementById("themeSelect");
	t && (t.innerHTML = "<option value=\"\">Default</option>" + (e.catalogue?.themes ?? []).map((e) => `<option value="${e}">${e}</option>`).join(""), t.value = e.theme || "");
}
function LS() {
	document.querySelectorAll("[data-preview-mode]").forEach((t) => {
		let n = t.getAttribute("data-preview-mode");
		t.classList.toggle("is-active", n === e.previewMode);
	});
}
function RS(e) {
	if (!nS) return;
	let t = nS.contentDocument;
	if (!t) return;
	let n = e || "", r = null;
	if (t.querySelectorAll("section.pdl-preview[data-pdl-component]").forEach((e) => {
		let t = n && e.getAttribute("data-pdl-component") === n;
		e.classList.toggle("pdl-preview--focus", !!t), t && (r = e);
	}), r && typeof r.scrollIntoView == "function") try {
		r.scrollIntoView({
			block: "nearest",
			behavior: "smooth"
		});
	} catch {}
}
function zS() {
	let t = document.getElementById("hostChrome");
	if (!t) return;
	let n = e.catalogue?.hostParams ?? [];
	if (!n.length) {
		t.hidden = !0, t.innerHTML = "";
		return;
	}
	t.hidden = !1, t.innerHTML = n.map((e) => {
		let t = Array.isArray(e.cases) ? e.cases : [];
		return `<label>${BS(e.name)} <select data-host="${VS(e.name)}"><option value="">Auto</option>${t.map((e) => `<option value="${VS(e)}">${BS(e)}</option>`).join("")}</select></label>`;
	}).join(""), t.querySelectorAll("select").forEach((t) => {
		t.addEventListener("change", () => {
			let n = t.getAttribute("data-host");
			n && (t.value ? e.hostFacts[n] = t.value.startsWith(".") ? t.value : `.${t.value}` : delete e.hostFacts[n], Z());
		});
	});
}
function BS(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function VS(e) {
	return BS(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/canvas/session.js
var Q = {
	component: null,
	file: null,
	selectedLayer: "root",
	world: {},
	pending: [],
	bake: null,
	bakeError: null,
	warnings: []
}, HS = 0, US = /* @__PURE__ */ new Set();
function WS(e) {
	return US.add(e), () => US.delete(e);
}
function GS() {
	for (let e of US) e();
}
function KS(e, t) {
	Q.component = e, Q.file = t, Q.selectedLayer = "root", Q.world = {}, Q.pending = [], Q.bake = null, Q.bakeError = null, Q.warnings = [], GS();
}
function qS(e) {
	Q.selectedLayer = e || "root", GS();
}
function JS(e, t) {
	t == null || t === "" ? delete Q.world[e] : Q.world[e] = t, GS();
}
function YS(e, t = {}) {
	let n = `pe-${++HS}`;
	e.kind === "setProp" && e.prop && (Q.pending = Q.pending.filter((t) => t.kind !== "setProp" || t.target !== e.target || t.prop !== e.prop)), e.kind === "reorderChildren" && (Q.pending = Q.pending.filter((e) => e.kind !== "reorderChildren")), Q.pending.push({
		...e,
		id: n
	}), t.silent || GS();
}
function XS(e, t, n = {}) {
	let r = Q.pending.length;
	Q.pending = Q.pending.filter((n) => n.kind !== "setProp" || n.target !== e || n.prop !== t), Q.pending.length !== r && !n.silent && GS();
}
function ZS() {
	Q.pending = [], Q.warnings = [], GS();
}
function QS(e) {
	return e == null || typeof e == "string" && e.trim() === "";
}
function $S(e = {}) {
	let t = Q.pending.length;
	Q.pending = Q.pending.filter((e) => !(e.kind === "setProp" && QS(e.value))), Q.pending.length !== t && !e.silent && GS();
}
function eC(e) {
	Q.warnings = e ?? [], GS();
}
function tC(e, t, n) {
	for (let n = Q.pending.length - 1; n >= 0; n--) {
		let r = Q.pending[n];
		if (r.kind === "setProp" && r.target === e && r.prop === t) return r.value;
	}
	return n?.[t];
}
//#endregion
//#region src/canvas/layerStructure.js
function nC(e) {
	let t = String(e).replace(/[^A-Za-z0-9_]/g, "") || "Layer";
	return /^[A-Za-z_]/.test(t) ? t : `L${t}`;
}
function rC(e, t = Q.pending) {
	let n = [], r = e?.root?.children;
	if (Array.isArray(r)) for (let e of r) e && typeof e.id == "string" && e.id && !/^\d+$/.test(e.id) && n.push(e.id);
	for (let e of t) if (e.kind === "addLayer" && e.payload?.name) {
		let t = nC(String(e.payload.name));
		n.includes(t) || n.push(t);
	} else if (e.kind === "deleteLayer" && e.target?.startsWith("let:")) {
		let t = e.target.slice(4);
		n = n.filter((e) => e !== t);
	} else e.kind === "reorderChildren" && Array.isArray(e.payload?.order) && (n = e.payload.order.map((e) => String(e)).filter(Boolean));
	return n;
}
function iC(e, t = Q.pending) {
	if (!e?.root) return e ?? null;
	let n = structuredClone ? structuredClone(e) : JSON.parse(JSON.stringify(e));
	n.root.children || (n.root.children = []);
	let r = /* @__PURE__ */ new Map();
	for (let e of n.root.children) e && typeof e.id == "string" && r.set(e.id, e);
	for (let e of t) if (e.kind === "addLayer" && e.payload?.name) {
		let t = nC(String(e.payload.name)), n = String(e.payload.kind || "text").toLowerCase();
		if (!r.has(t)) {
			let i = aC(n, t, e.payload);
			r.set(t, i);
		}
	} else e.kind === "deleteLayer" && e.target?.startsWith("let:") && r.delete(e.target.slice(4));
	let i = rC(e, t);
	return n.root.children = i.map((e) => r.get(e)).filter(Boolean), n;
}
function aC(e, t, n) {
	let r = {};
	return e === "text" ? (r.content = n.content == null ? t : String(n.content), r.fontSize = 15, r.fontWeight = 600) : e === "media" ? (r.source = "", r.width = ".fill", r.height = 120) : e === "icon" && (r.size = 20, r.color = "#333333"), {
		id: t,
		kind: e,
		props: r,
		children: []
	};
}
function oC(e, t, n, r = Q.pending) {
	let i = rC(e, r), a = i.indexOf(t);
	if (a < 0) return null;
	let o = a + n;
	if (o < 0 || o >= i.length) return null;
	let s = i.slice();
	return [s[a], s[o]] = [s[o], s[a]], s;
}
function sC(e, t = Q.pending) {
	return new Set(rC(e, t));
}
function cC(e, t) {
	let n = sC(e), r = t === "text" ? "Label" : t === "layout" ? "Box" : t === "icon" ? "Icon" : "Media";
	if (!n.has(r)) return r;
	for (let e = 2; e < 100; e++) {
		let t = `${r}${e}`;
		if (!n.has(t)) return t;
	}
	return `${r}${Date.now() % 1e3}`;
}
//#endregion
//#region src/canvas/layers.js
function lC(e) {
	return e?.root ? uC(e.root, "root", e.name || "Root", 0) : null;
}
function uC(e, t, n, r, i = {}) {
	let a = Array.isArray(e.children) ? e.children : [], o = [];
	return a.forEach((e, n) => {
		if (!e || typeof e != "object") return;
		let i = dC(e, n, t), a = fC(e);
		o.push(uC(e, i, a, r + 1));
	}), {
		id: t,
		label: n,
		kind: String(e.kind || "layout"),
		instanceOf: typeof e.instanceOf == "string" ? e.instanceOf : void 0,
		props: e.props && typeof e.props == "object" ? { ...e.props } : {},
		instanceKwargs: e.instanceKwargs && typeof e.instanceKwargs == "object" ? { ...e.instanceKwargs } : void 0,
		children: o,
		depth: r,
		pendingAdd: i.pendingAdd,
		pendingDelete: i.pendingDelete
	};
}
function dC(e, t, n) {
	return typeof e.id == "string" && e.id && !/^\d+$/.test(e.id) ? `let:${e.id}` : typeof e.instanceOf == "string" && e.instanceOf ? `inst:${e.instanceOf}@${n}.${t}` : `path:${n === "root" ? "" : n + "."}${t}`;
}
function fC(e) {
	if (typeof e.id == "string" && e.id && !/^\d+$/.test(e.id)) return e.id;
	if (typeof e.instanceOf == "string" && e.instanceOf) return e.instanceOf;
	let t = e.props?.content;
	if (typeof t == "string" && t.trim()) {
		let e = t.trim();
		return e.length > 24 ? `${e.slice(0, 22)}…` : e;
	}
	return String(e.kind || "frame");
}
function pC(e) {
	let t = [];
	function n(e) {
		if (e) {
			t.push(e);
			for (let t of e.children) n(t);
		}
	}
	return n(e), t;
}
function mC(e, t) {
	if (!e) return null;
	if (e.id === t) return e;
	for (let n of e.children) {
		let e = mC(n, t);
		if (e) return e;
	}
	return null;
}
function hC(e, t, n, r = {}, i = [], a = null) {
	if (!t) {
		e.innerHTML = "<p class=\"hint\">Select a component to edit in Canvas.</p>";
		return;
	}
	let o = pC(t), s = i.length ? i : t.children.map((e) => e.label), c = (e) => s.indexOf(e);
	e.innerHTML = `<div class="canvas-layer-list">${o.map((e) => {
		let t = 8 + e.depth * 12, i = e.instanceOf ? e.instanceOf : e.kind, a = e.depth === 1 && e.id.startsWith("let:"), o = a ? e.id.slice(4) : "", l = a ? c(o) : -1, u = a && l > 0, d = a && l >= 0 && l < s.length - 1, f = e.pendingAdd ? " is-pending-add" : e.pendingDelete ? " is-pending-del" : "", p = a && r.onMove ? `<span class="canvas-layer-reorder">
              <button type="button" class="btn ghost btn-tiny canvas-layer-move" data-move="up" data-let="${_C(o)}"${u ? "" : " disabled"} title="Move up">↑</button>
              <button type="button" class="btn ghost btn-tiny canvas-layer-move" data-move="down" data-let="${_C(o)}"${d ? "" : " disabled"} title="Move down">↓</button>
            </span>` : "";
		return `<div class="canvas-layer-row${e.id === n ? " is-selected" : ""}${f}">
        <button type="button" class="canvas-layer" data-layer="${_C(e.id)}" style="padding-left:${t}px">
          <span class="canvas-layer-name">${gC(e.label)}</span>
          <span class="canvas-layer-kind">${gC(i)}</span>
        </button>
        ${p}
      </div>`;
	}).join("")}</div>
    <div class="canvas-layers-add">
      <label class="canvas-add-field"><span>Name</span>
        <input type="text" id="canvasAddName" value="${_C(cC(a, "text"))}" spellcheck="false" placeholder="Label" />
      </label>
      <label class="canvas-add-field"><span>Kind</span>
        <select id="canvasAddKind">
          <option value="text">Text</option>
          <option value="layout">Layout</option>
          <option value="icon">Icon</option>
          <option value="media">Media</option>
        </select>
      </label>
      <button type="button" class="btn primary btn-tiny" id="canvasAddLayer">Add layer</button>
    </div>`, e.querySelectorAll("[data-layer]").forEach((e) => {
		e.addEventListener("click", () => {
			let t = e.getAttribute("data-layer");
			t && r.onSelect && r.onSelect(t);
		});
	}), e.querySelectorAll("[data-move]").forEach((e) => {
		e.addEventListener("click", (t) => {
			if (t.stopPropagation(), e.hasAttribute("disabled")) return;
			let n = e.getAttribute("data-let"), i = e.getAttribute("data-move");
			n && r.onMove && r.onMove(n, i === "down" ? 1 : -1);
		});
	});
	let l = e.querySelector("#canvasAddKind"), u = e.querySelector("#canvasAddName");
	l?.addEventListener("change", () => {
		if (!(u instanceof HTMLInputElement)) return;
		let e = l.value;
		u.value = cC(a, e);
	}), e.querySelector("#canvasAddLayer")?.addEventListener("click", () => {
		let e = l instanceof HTMLSelectElement ? l.value : "text", t = nC(u instanceof HTMLInputElement ? u.value : "");
		t && r.onAdd && r.onAdd({
			kind: e,
			name: t
		});
	});
}
function gC(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function _C(e) {
	return gC(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/canvas/warnings.js
function vC(e, t, n) {
	let r = {};
	for (let i of t ?? []) {
		let t = n?.[i.typeName];
		if (!Array.isArray(t) || !t.length) continue;
		let a = e?.[i.name];
		if (a == null) continue;
		let o = String(a).replace(/^\./, ""), s = String(i.default ?? i.defaultValue ?? t[0] ?? "").replace(/^\./, "").replace(/^"|"$/g, "");
		o && o !== s && (r[i.name] = o);
	}
	return r;
}
function yC(e, t) {
	let n = Object.keys(e ?? {});
	return n.length < 2 || t && n.includes(t) ? null : `Changing ${n.join(" + ")} at once — pick which axis owns this property.`;
}
function bC(e, t) {
	return (e ?? []).filter((e) => {
		let n = t?.[e.typeName];
		return Array.isArray(n) && n.length > 0;
	});
}
//#endregion
//#region src/canvas/rewrite.js
function xC(e, t, n, r = {}) {
	if (!t) return {
		ok: !1,
		error: "No component"
	};
	if (!n?.length) return {
		ok: !0,
		source: e,
		warnings: []
	};
	let i = SC(e, t);
	if (!i) return {
		ok: !1,
		error: `Could not find component ${t} body`
	};
	let a = e.slice(i.bodyStart, i.bodyEnd), o = [];
	for (let e of n) {
		let t = r.chosenAxisByEdit?.[e.id], n = e.axes && Object.keys(e.axes).length ? e.axes : {}, i = Object.keys(n);
		if (e.kind === "setProp" && e.prop) {
			if (i.length > 1 && !t) return {
				ok: !1,
				error: `Ambiguous axes for ${e.prop}: ${i.join(", ")}. Choose one axis.`
			};
			let r = t || (i.length === 1 ? i[0] : null), s = r ? n[r] : null;
			if (r && s) {
				let t = TC(a, e.target, e.prop, e.value, r, s);
				if (!t.ok) return {
					ok: !1,
					error: t.error
				};
				a = t.body, t.warning && o.push(t.warning);
			} else {
				let t = wC(a, e.target, e.prop, e.value);
				if (!t.ok) return {
					ok: !1,
					error: t.error
				};
				a = t.body, t.warning && o.push(t.warning);
			}
			continue;
		}
		if (e.kind === "addLayer") {
			let t = VC(a, e.payload ?? {});
			if (!t.ok) return {
				ok: !1,
				error: t.error
			};
			a = t.body;
			continue;
		}
		if (e.kind === "deleteLayer") {
			let t = HC(a, e.target);
			if (!t.ok) return {
				ok: !1,
				error: t.error
			};
			a = t.body;
			continue;
		}
		if (e.kind === "reorderChildren") {
			let t = GC(a, e.payload?.order ?? []);
			if (!t.ok) return {
				ok: !1,
				error: t.error
			};
			a = t.body;
			continue;
		}
	}
	return {
		ok: !0,
		source: e.slice(0, i.bodyStart) + a + e.slice(i.bodyEnd),
		warnings: o
	};
}
function SC(e, t) {
	let n = RegExp(`(^|\\n)([ \\t]*)(component|page|screen)\\s+${$(t)}\\b`, "m").exec(e);
	if (!n) return null;
	let r = n.index + (n[1] ? n[1].length : 0), i = e.indexOf("{", r);
	if (i < 0) return null;
	let a = /\)\s*(layout|text|icon|media|spacer)\s*\{/.exec(e.slice(r, i + 1)), o = i, s = "layout";
	if (a ? (o = r + a.index + a[0].lastIndexOf("{"), s = a[1]) : o = e.indexOf("{", r), o < 0) return null;
	let c = o + 1, l = CC(e, o);
	return l < 0 ? null : {
		declStart: r,
		bodyStart: c,
		bodyEnd: l,
		kind: s
	};
}
function CC(e, t) {
	let n = 0, r = !1, i = "";
	for (let a = t; a < e.length; a++) {
		let t = e[a];
		if (r) {
			if (t === "\\" && a + 1 < e.length) {
				a++;
				continue;
			}
			t === i && (r = !1);
			continue;
		}
		if (t === "\"" || t === "'") {
			r = !0, i = t;
			continue;
		}
		if (t === "/" && e[a + 1] === "/") {
			for (; a < e.length && e[a] !== "\n";) a++;
			continue;
		}
		if (t === "{") n++;
		else if (t === "}" && (n--, n === 0)) return a;
	}
	return -1;
}
function wC(e, t, n, r) {
	if (t === "root" && n === "color") {
		let t = /\blet\s+([A-Za-z_][\w]*)\s*=\s*Text\b/.exec(e);
		if (t) {
			let n = wC(e, `let:${t[1]}`, "color", r);
			if (n.ok) return {
				ok: !0,
				body: n.body,
				warning: `color on root applied to text layer ${t[1]}`
			};
		}
		return {
			ok: !1,
			error: "color is a text property — select the Label layer (or use borderColor on the button)."
		};
	}
	let i = KC(n, r);
	if (t === "root") return DC(e, n, null) === "variant-only" ? {
		ok: !1,
		error: `Property ${n} is only set inside variant branches — use Canvas variant bar (P1).`
	} : {
		ok: !0,
		body: kC(e, n, i)
	};
	if (t.startsWith("let:")) {
		let r = t.slice(4), a = AC(e, r, n, i);
		return a ? {
			ok: !0,
			body: a
		} : {
			ok: !1,
			error: `Could not find let ${r}`
		};
	}
	return {
		ok: !1,
		error: `Unsupported layer target ${t} for P0 rewrite`
	};
}
function TC(e, t, n, r, i, a) {
	if (t !== "root" && !t.startsWith("let:")) return {
		ok: !1,
		error: "Axis edits only supported on root / let layers"
	};
	let o = KC(n, r);
	t.startsWith("let:") && `${t.slice(4)}${n}`;
	let s = t.startsWith("let:") && !o.includes(".") ? `${t.slice(4)}.${n} = ${qC(r)}` : o, c = jC(e, t, n), l = MC(c, i);
	if (!l) {
		let e = `\n  if ${i} == .${a} {\n    ${s}\n  }\n`;
		return c = zC(c, e), {
			ok: !0,
			body: c,
			warning: `Created new ${i} branch for .${a}`
		};
	}
	c = NC(c, l, i, a).body;
	let u = PC(c, i, a);
	if (!u) return {
		ok: !1,
		error: `Could not open ${i} == .${a} arm`
	};
	let d = LC(c.slice(u.innerStart, u.innerEnd), EC(t, n), s);
	return c = c.slice(0, u.innerStart) + d + c.slice(u.innerEnd), {
		ok: !0,
		body: c
	};
}
function EC(e, t) {
	return e.startsWith("let:") ? `${e.slice(4)}.${t}` : t;
}
function DC(e, t, n) {
	let r = n ? `${n}.${t}` : t, i = OC(e, r) || !n && OC(e, t), a = RegExp(`if\\s+[\\s\\S]*?\\{[^}]*\\b${$(r)}\\s*=`, "m").test(e);
	return i && a ? "both" : i ? "unconditional" : a ? "variant-only" : "absent";
}
function OC(e, t) {
	let n = e.split("\n"), r = 0;
	for (let e of n) {
		let n = (e.match(/\{/g) || []).length, i = (e.match(/\}/g) || []).length;
		if (r === 0 && RegExp(`^\\s*${$(t)}\\s*=`).test(e) && !/^\s*if\b/.test(e)) return !0;
		r += n - i, r < 0 && (r = 0);
	}
	return !1;
}
function kC(e, t, n) {
	let r = e.split("\n"), i = 0, a = !1, o = r.map((e) => {
		let r = (e.match(/\{/g) || []).length, o = (e.match(/\}/g) || []).length, s = e;
		return i === 0 && RegExp(`^(\\s*)${$(t)}\\s*=`).test(e) && !/^\s*if\b/.test(e) && (s = `${(e.match(/^(\s*)/) || ["", "  "])[1]}${n}`, a = !0), i += r - o, i < 0 && (i = 0), s;
	});
	return a ? o.join("\n") : RC(e, `  ${n}\n`);
}
function AC(e, t, n, r) {
	let i = `${t}.${n} = ${r.includes("=") ? r.split("=").slice(1).join("=").trim() : qC(r)}`, a = RegExp(`^(\\s*)${$(t)}\\.${$(n)}\\s*=.*$`, "m");
	if (a.test(e)) return e.replace(a, (e, t) => `${t}${i}`);
	let o = RegExp(`(^[ \\t]*let\\s+${$(t)}\\s*=.*$(?:\\r?\\n)?)`, "m").exec(e);
	if (!o) return null;
	let s = o.index + o[0].length;
	return e.slice(0, s) + `  ${i}\n` + e.slice(s);
}
function jC(e, t, n) {
	let r = t.startsWith("let:") ? `${t.slice(4)}.${n}` : n, i = e.split("\n"), a = 0, o = [];
	for (let e of i) {
		let t = (e.match(/\{/g) || []).length, n = (e.match(/\}/g) || []).length, i = !1;
		a === 0 && RegExp(`^\\s*${$(r)}\\s*=`).test(e) && !/^\s*if\b/.test(e) && (i = !0), i || o.push(e), a += t - n, a < 0 && (a = 0);
	}
	return o.join("\n");
}
function MC(e, t) {
	let n = RegExp(`\\bif\\s+${$(t)}\\s*==`).exec(e);
	return n ? { index: n.index } : null;
}
function NC(e, t, n, r) {
	if (PC(e, n, r)) return { body: e };
	if (!FC(e, n)) return { body: zC(e, `\n  if ${n} == .${r} {\n  }\n`) };
	let i = ` else if ${n} == .${r} {\n  }`, a = IC(e, t.index);
	if (a < 0) return { body: e };
	let o = e.slice(0, a), s = /else\s*\{[^}]*\}\s*$/.exec(o);
	if (s) {
		let t = a - s[0].length;
		return { body: e.slice(0, t) + i + " " + e.slice(t) };
	}
	return { body: e.slice(0, a) + i + e.slice(a) };
}
function PC(e, t, n) {
	let r = [RegExp(`if\\s+${$(t)}\\s*==\\s*\\.${$(n)}\\s*\\{`), RegExp(`else\\s+if\\s+${$(t)}\\s*==\\s*\\.${$(n)}\\s*\\{`)];
	for (let t of r) {
		let n = t.exec(e);
		if (!n) continue;
		let r = n.index + n[0].length - 1, i = CC(e, r);
		if (!(i < 0)) return {
			innerStart: r + 1,
			innerEnd: i,
			open: r,
			close: i
		};
	}
	return null;
}
function FC(e, t) {
	let n = RegExp(`if\\s+${$(t)}\\s*==\\s*\\.(\\w+)\\s*\\{`).exec(e);
	if (!n) return null;
	let r = n.index + n[0].length - 1, i = CC(e, r);
	return i < 0 ? null : {
		innerStart: r + 1,
		innerEnd: i
	};
}
function IC(e, t) {
	let n = t, r = /^\s*(if|else\s+if|else)\b/;
	for (; n < e.length;) {
		for (; n < e.length && /\s/.test(e[n]);) n++;
		let i = e.slice(n);
		if (!r.test(i) && n !== t || n !== t && !/^(else\s+if|else)\b/.test(i)) break;
		let a = e.indexOf("{", n);
		if (a < 0) break;
		let o = CC(e, a);
		if (o < 0 || (n = o + 1, /^else\b/.test(i) && !/^else\s+if\b/.test(i))) break;
	}
	return n;
}
function LC(e, t, n) {
	let r = RegExp(`^(\\s*)${$(t)}\\s*=.*$`, "m");
	return r.test(e) ? e.replace(r, (e, t) => `${t}${n}`) : `\n    ${n}\n${e.replace(/^\n+/, "")}`;
}
function RC(e, t) {
	let n = e.split("\n"), r = 0, i = 0;
	for (let e = 0; e < n.length; e++) {
		let t = n[e], a = (t.match(/\{/g) || []).length, o = (t.match(/\}/g) || []).length;
		if (r === 0) {
			if (/^\s*if\b/.test(t) || /^\s*let\b/.test(t) || /^\s*children\s*=/.test(t) || /^\s*self\./.test(t)) {
				i = e;
				break;
			}
			t.trim() && (i = e + 1);
		}
		r += a - o, r < 0 && (r = 0), i = e + 1;
	}
	return n.splice(i, 0, t.replace(/\n$/, "")), n.join("\n");
}
function zC(e, t) {
	let n = /\n[ \t]*self\./.exec(e);
	return n ? e.slice(0, n.index) + t + e.slice(n.index) : e + t;
}
function BC(e, t, n = {}) {
	let r = JC(t);
	if (!r) return null;
	switch (e) {
		case "text": {
			let e = n.content == null ? r : String(n.content);
			return `let ${r} = Text(content: ${JSON.stringify(e)}, fontSize: 15, fontWeight: 600)`;
		}
		case "layout": return `let ${r} = Layout(direction: .row, gap: 8)`;
		case "icon": return `let ${r} = Icon(icon: IconRef(system: .sfSymbols, name: "star"), size: 20, color: #333333)`;
		case "media": return `let ${r} = Media(source: "", contentMode: .cover, width: .fill, height: 120)`;
		default: return null;
	}
}
function VC(e, t) {
	let n = String(t.kind || "text").toLowerCase(), r = JC(t.name || "Layer");
	if (!r) return {
		ok: !1,
		error: "Invalid layer name"
	};
	if (RegExp(`\\blet\\s+${$(r)}\\b`).test(e)) return {
		ok: !1,
		error: `let ${r} already exists`
	};
	let i = BC(n, r, { content: t.content });
	if (!i) return {
		ok: !1,
		error: `Unsupported layer kind: ${n}`
	};
	let a = `  ${i}\n`, o = e, s = /children\s*=\s*\[([^\]]*)\]/, c = s.exec(o);
	if (c) {
		let e = c[1].trim(), t = e ? e.split(",").map((e) => e.trim()).filter(Boolean) : [];
		t.push(r), o = o.replace(s, `children = [${t.join(", ")}]`);
		let n = o.search(s);
		o = o.slice(0, n) + a + o.slice(n);
	} else o = zC(o, a + `  children = [${r}]\n`);
	return {
		ok: !0,
		body: o
	};
}
function HC(e, t) {
	if (!t.startsWith("let:")) return {
		ok: !1,
		error: "Can only delete let layers"
	};
	let n = t.slice(4), r = UC(e, n), i = e;
	if (r) {
		let e = r.start, t = r.end;
		i[t] === "\n" && (t += 1), i = i.slice(0, e) + i.slice(t);
	} else i = i.replace(RegExp(`^[ \\t]*let\\s+${$(n)}\\s*=.*\\n`, "m"), "");
	i = i.replace(RegExp(`^[ \\t]*${$(n)}\\.\\w+\\s*=.*\\n`, "gm"), ""), i = WC(i);
	let a = /children\s*=\s*\[([^\]]*)\]/, o = a.exec(i);
	if (o) {
		let e = o[1].split(",").map((e) => e.trim()).filter((e) => e && e !== n);
		i = i.replace(a, `children = [${e.join(", ")}]`);
	}
	return {
		ok: !0,
		body: i
	};
}
function UC(e, t) {
	let n = RegExp(`^[ \\t]*let\\s+${$(t)}\\b`, "m").exec(e);
	if (!n) return null;
	let r = n.index, i = n.index + n[0].length;
	for (; i < e.length && e[i] !== "=";) i++;
	if (i >= e.length) return null;
	for (i++; i < e.length && /\s/.test(e[i]);) i++;
	let a = 0, o = 0, s = !1, c = !1, l = "";
	for (; i < e.length; i++) {
		let t = e[i];
		if (c) {
			if (t === "\\" && i + 1 < e.length) {
				i++;
				continue;
			}
			t === l && (c = !1);
			continue;
		}
		if (t === "\"" || t === "'") {
			c = !0, l = t;
			continue;
		}
		if (t === "(") a++, s = !0;
		else if (t === ")") a = Math.max(0, a - 1);
		else if (t === "{") o++, s = !0;
		else if (t === "}") o = Math.max(0, o - 1);
		else if (t === "\n" && !s && a === 0 && o === 0) return {
			start: r,
			end: i
		};
		if (s && a === 0 && o === 0) return {
			start: r,
			end: i + 1
		};
	}
	return {
		start: r,
		end: e.length
	};
}
function WC(e) {
	let t = e;
	for (let e = 0; e < 4; e++) {
		let e = t;
		if (t = t.replace(/\n[ \t]*else\s*\{\s*\}/g, ""), t = t.replace(/\n[ \t]*else if\b[^{]*\{\s*\}/g, ""), t = t.replace(/\n[ \t]*if\b[^{]*\{\s*\}(?!\s*else\b)/g, ""), t = t.replace(/\n[ \t]*if\b[^{]*\{\s*\}\s*(?=else\b)/g, "\n  "), t === e) break;
	}
	return t;
}
function GC(e, t) {
	let n = /children\s*=\s*\[([^\]]*)\]/;
	if (!n.test(e)) return {
		ok: !1,
		error: "No children = […] list to reorder"
	};
	let r = t.filter(Boolean).join(", ");
	return {
		ok: !0,
		body: e.replace(n, `children = [${r}]`)
	};
}
function KC(e, t) {
	return `${e} = ${qC(t)}`;
}
function qC(e) {
	if (typeof e == "boolean") return e ? "true" : "false";
	if (typeof e == "number" && Number.isFinite(e)) return String(e);
	if (typeof e == "string") {
		let t = e.trim();
		return t.startsWith(".") || t.startsWith("#") ? /^#[0-9A-Fa-f]{3,8}\s*@\s*-?[\d.]+$/.test(t) ? t.replace(/\s+/g, " ") : t.startsWith("#") && /\s/.test(t) ? JSON.stringify(t) : t : /^(true|false)$/.test(t) || /^-?\d+(\.\d+)?$/.test(t) || /^(EdgeInsets|Corner|Shadow|Size|Motion|Timing|Ease)\(/.test(t) ? t : /^[A-Za-z_][\w.]*(\s*@\s*-?[\d.]+)?$/.test(t) ? t.replace(/\s*@\s*/, " @ ") : JSON.stringify(t);
	}
	if (e && typeof e == "object") {
		let t = e;
		if ("x" in t || "y" in t || "top" in t) {
			let e = [];
			for (let n of [
				"x",
				"y",
				"top",
				"right",
				"bottom",
				"left"
			]) t[n] != null && e.push(`${n}: ${qC(t[n])}`);
			return `EdgeInsets(${e.join(", ")})`;
		}
	}
	return JSON.stringify(e);
}
function JC(e) {
	let t = String(e).replace(/[^A-Za-z0-9_]/g, "") || "Layer";
	return /^[A-Za-z_]/.test(t) ? t : `L${t}`;
}
function $(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var YC = {
	$comment: "Machine lock for frame properties and type checks. Loaded by crates/pdl-core/src/frame_props.rs. Enum valueKinds with typeName accept TypeName.case as sugar for .case (Sizing stays a keyword sizing-literal). Case *meanings* live in shared/language-objects.json — docs:gen fails if a case exists here without a meaning there.",
	schemaVersion: 1,
	valueKinds: {
		sizing: {
			accept: [
				"sizing",
				"number",
				"dotEnum"
			],
			numberSugar: "fixed",
			tokenTypes: ["Sizing"],
			nonNegativeNumber: !0
		},
		edgeInsets: {
			accept: [
				"edgeInsets",
				"number",
				"ident"
			],
			numberSugar: "uniformInsets",
			tokenTypes: ["EdgeInsets"],
			nonNegativeNumber: !0
		},
		distance: {
			accept: ["number"],
			tokenTypes: ["Distance"],
			nonNegativeNumber: !0
		},
		number: { accept: ["number"] },
		nonNegNumber: {
			accept: ["number"],
			nonNegativeNumber: !0
		},
		size: {
			accept: ["number"],
			tokenTypes: ["Size"],
			nonNegativeNumber: !0
		},
		weight: {
			accept: ["number"],
			tokenTypes: ["Weight"]
		},
		lineHeight: {
			accept: ["number"],
			tokenTypes: ["LineHeight"],
			positiveNumber: !0
		},
		letterSpacing: {
			accept: ["number"],
			tokenTypes: ["LetterSpacing"]
		},
		ratio: {
			accept: ["number", "ratio"],
			tokenTypes: ["Ratio"]
		},
		opacity: {
			accept: ["number"],
			tokenTypes: ["Opacity"],
			range: [0, 1]
		},
		motion: {
			accept: ["motion"],
			tokenTypes: ["Motion"]
		},
		animation: {
			accept: ["animation", "ident"],
			tokenTypes: ["Animation"]
		},
		presentationMotion: {
			accept: ["presentationMotion", "ident"],
			tokenTypes: ["PresentationMotion"]
		},
		effect: {
			accept: ["effect"],
			tokenTypes: ["Effect"]
		},
		blurRadius: {
			accept: ["number"],
			tokenTypes: ["Radius"],
			nonNegativeNumber: !0
		},
		color: {
			accept: ["hex", "opacityOf"],
			tokenTypes: ["Color"]
		},
		colorOrLayers: {
			accept: [
				"hex",
				"opacityOf",
				"array",
				"call",
				"ident"
			],
			tokenTypes: [
				"Color",
				"Background",
				"Foreground",
				"Ramp",
				"Blur",
				"Media",
				"Vibrancy"
			]
		},
		cornerRadius: {
			accept: [
				"number",
				"corner",
				"ident"
			],
			tokenTypes: ["Radius", "CornerRadii"],
			nonNegativeNumber: !0
		},
		shadow: {
			accept: ["shadow"],
			tokenTypes: ["Shadow"]
		},
		string: {
			accept: ["string"],
			tokenTypes: ["FontFamily", "Ease"]
		},
		icon: {
			accept: ["string", "iconRef"],
			tokenTypes: ["Icon"]
		},
		mediaSource: {
			accept: ["string", "mediaSourceRef"],
			tokenTypes: ["MediaSource"]
		},
		styleRef: { accept: ["ident"] },
		booleanOrCondition: { accept: [
			"boolean",
			"condition",
			"dotEnum",
			"ident"
		] },
		enumDirection: {
			accept: ["dotEnum", "ident"],
			typeName: "Direction",
			tokenTypes: ["Direction"],
			cases: [
				"row",
				"column",
				"rowReverse",
				"columnReverse",
				"stack",
				"reverseStack"
			]
		},
		enumWrap: {
			accept: ["dotEnum", "ident"],
			typeName: "Wrap",
			tokenTypes: ["Wrap"],
			cases: ["nowrap", "wrap"]
		},
		enumAlignLayout: {
			accept: ["dotEnum", "ident"],
			typeName: "Align",
			tokenTypes: ["Align"],
			cases: [
				"start",
				"center",
				"end",
				"stretch"
			]
		},
		enumJustifyLayout: {
			accept: ["dotEnum", "ident"],
			typeName: "Justify",
			tokenTypes: ["Justify"],
			cases: [
				"start",
				"center",
				"end",
				"stretch",
				"spaceBetween",
				"spaceAround"
			]
		},
		enumAlignText: {
			accept: ["dotEnum", "ident"],
			typeName: "Align",
			tokenTypes: ["Align"],
			cases: [
				"start",
				"center",
				"end"
			]
		},
		enumJustifyText: {
			accept: ["dotEnum", "ident"],
			typeName: "Justify",
			tokenTypes: ["Justify"],
			cases: [
				"start",
				"center",
				"end"
			]
		},
		enumOverflow: {
			accept: ["dotEnum", "ident"],
			typeName: "Overflow",
			tokenTypes: ["Overflow"],
			cases: [
				"visible",
				"scroll",
				"clip"
			]
		},
		enumBorderPosition: {
			accept: ["dotEnum", "ident"],
			typeName: "BorderPosition",
			tokenTypes: ["BorderPosition"],
			cases: ["inside", "outside"]
		},
		enumTruncateStyle: {
			accept: ["dotEnum", "ident"],
			typeName: "TruncateStyle",
			tokenTypes: ["TruncateStyle"],
			cases: ["clip", "ellipsis"]
		},
		enumContentMode: {
			accept: ["dotEnum", "ident"],
			typeName: "ContentMode",
			tokenTypes: ["ContentMode"],
			cases: [
				"cover",
				"contain",
				"fill",
				"scaleDown"
			]
		},
		enumAlignSelf: {
			accept: ["dotEnum", "ident"],
			typeName: "AlignSelf",
			tokenTypes: ["AlignSelf"],
			cases: [
				"start",
				"center",
				"end",
				"stretch",
				"auto"
			]
		},
		enumPosition: {
			accept: ["dotEnum", "ident"],
			typeName: "Position",
			tokenTypes: ["Position"],
			cases: ["flow", "absolute"]
		}
	},
	kinds: {
		layout: { props: {
			width: { type: "sizing" },
			height: { type: "sizing" },
			direction: { type: "enumDirection" },
			wrap: { type: "enumWrap" },
			align: { type: "enumAlignLayout" },
			justify: { type: "enumJustifyLayout" },
			gap: { type: "distance" },
			columnGap: { type: "distance" },
			rowGap: { type: "distance" },
			padding: { type: "edgeInsets" },
			margin: { type: "edgeInsets" },
			background: { type: "colorOrLayers" },
			foreground: { type: "colorOrLayers" },
			cornerRadius: { type: "cornerRadius" },
			opacity: { type: "opacity" },
			overflow: { type: "enumOverflow" },
			shadow: { type: "shadow" },
			borderWidth: { type: "nonNegNumber" },
			borderColor: { type: "color" },
			borderPosition: { type: "enumBorderPosition" }
		} },
		text: { props: {
			content: { type: "string" },
			fontFamily: { type: "string" },
			fontSize: { type: "size" },
			fontWeight: { type: "weight" },
			lineHeight: { type: "lineHeight" },
			letterSpacing: { type: "letterSpacing" },
			color: { type: "color" },
			style: { type: "styleRef" },
			width: { type: "sizing" },
			height: { type: "sizing" },
			padding: { type: "edgeInsets" },
			margin: { type: "edgeInsets" },
			justify: { type: "enumJustifyText" },
			align: { type: "enumAlignText" },
			background: { type: "colorOrLayers" },
			foreground: { type: "colorOrLayers" },
			opacity: { type: "opacity" },
			overflow: { type: "enumOverflow" },
			truncateStyle: { type: "enumTruncateStyle" },
			lineClamp: { type: "nonNegNumber" },
			cornerRadius: { type: "cornerRadius" },
			shadow: { type: "shadow" },
			borderWidth: { type: "nonNegNumber" },
			borderColor: { type: "color" },
			borderPosition: { type: "enumBorderPosition" }
		} },
		icon: { props: {
			icon: { type: "icon" },
			size: { type: "size" },
			color: { type: "color" },
			width: { type: "sizing" },
			height: { type: "sizing" },
			opacity: { type: "opacity" }
		} },
		presenter: { props: {
			width: { type: "sizing" },
			height: { type: "sizing" },
			align: { type: "enumAlignLayout" },
			justify: { type: "enumJustifyLayout" },
			padding: { type: "edgeInsets" },
			margin: { type: "edgeInsets" },
			background: { type: "colorOrLayers" },
			foreground: { type: "colorOrLayers" },
			cornerRadius: { type: "cornerRadius" },
			opacity: { type: "opacity" },
			overflow: { type: "enumOverflow" },
			shadow: { type: "shadow" },
			borderWidth: { type: "nonNegNumber" },
			borderColor: { type: "color" },
			borderPosition: { type: "enumBorderPosition" },
			move: { type: "presentationMotion" },
			dismissMove: { type: "presentationMotion" }
		} },
		media: { props: {
			source: { type: "mediaSource" },
			width: { type: "sizing" },
			height: { type: "sizing" },
			aspectRatio: { type: "ratio" },
			contentMode: { type: "enumContentMode" },
			justify: { type: "enumJustifyText" },
			align: { type: "enumAlignText" },
			background: { type: "colorOrLayers" },
			foreground: { type: "colorOrLayers" },
			cornerRadius: { type: "cornerRadius" },
			opacity: { type: "opacity" }
		} }
	},
	childFlexProps: {
		alignSelf: { type: "enumAlignSelf" },
		grow: { type: "number" },
		shrink: { type: "number" },
		position: { type: "enumPosition" },
		inset: { type: "edgeInsets" }
	},
	special: {
		animate: {
			kinds: [
				"layout",
				"text",
				"icon",
				"media"
			],
			type: "animation"
		},
		effect: {
			kinds: [
				"layout",
				"text",
				"icon",
				"media"
			],
			type: "effect"
		},
		blur: {
			kinds: [
				"layout",
				"text",
				"icon",
				"media"
			],
			type: "blurRadius"
		},
		hidden: {
			kinds: ["layout"],
			type: "booleanOrCondition"
		},
		editable: {
			kinds: ["text"],
			structural: !0
		},
		style: {
			kinds: ["text"],
			type: "styleRef",
			typeStyleRef: !0
		},
		children: { structural: !0 },
		root: {
			kinds: ["presenter"],
			structural: !0
		}
	}
};
//#endregion
//#region src/canvas/tokens.js
function XC(e) {
	if (e == null || e === "") return {
		css: null,
		unresolved: null
	};
	if (typeof e != "string") {
		if (e && typeof e == "object") {
			let t = ew(e, 0);
			return t ? {
				css: t,
				unresolved: null
			} : {
				css: null,
				unresolved: "«object»"
			};
		}
		return {
			css: null,
			unresolved: String(e)
		};
	}
	let t = e.trim();
	if (!t) return {
		css: null,
		unresolved: null
	};
	let n = /^(.*?)\s*@\s*(-?[\d.]+)\s*$/.exec(t);
	if (n) {
		let e = XC(n[1].trim());
		if (!e.css) return e;
		let t = Number(n[2]);
		return Number.isFinite(t) ? {
			css: tw(e.css, t),
			unresolved: null
		} : {
			css: e.css,
			unresolved: null
		};
	}
	if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return {
		css: t,
		unresolved: null
	};
	if (/^[A-Za-z_][\w.]*$/.test(t)) {
		let e = ZC(t, 0);
		return e ? {
			css: e,
			unresolved: null
		} : {
			css: null,
			unresolved: t
		};
	}
	return /^(rgb|hsl)a?\(/i.test(t) || /^[a-z]+$/i.test(t) ? {
		css: t,
		unresolved: null
	} : {
		css: null,
		unresolved: t
	};
}
function ZC(e, t) {
	if (t > 10) return null;
	let n = QC(e);
	if (n != null) {
		let e = ew(n, t + 1);
		if (e) return e;
	}
	let r = $C(e);
	return r ? ew(r.definition, t + 1) : null;
}
function QC(t) {
	let n = e.theme;
	if (!n) return null;
	let r = (e.catalogue?.tokenTables?.themes ?? {})[n];
	return !r?.overrides || typeof r.overrides != "object" ? null : r.overrides[t] ?? null;
}
function $C(t) {
	let n = e.catalogue?.tokenTables ?? {};
	return n.primitives?.[t] || n.semantics?.[t] || null;
}
function ew(e, t) {
	if (e == null || t > 10) return null;
	if (typeof e == "string") return e.startsWith("primitive:") ? ZC(e.slice(10), t + 1) : e.startsWith("semantic:") ? ZC(e.slice(9), t + 1) : /^#[0-9A-Fa-f]{3,8}$/.test(e) ? e : /^[A-Za-z_][\w.]*$/.test(e) ? ZC(e, t + 1) : null;
	if (typeof e != "object") return null;
	let n = e;
	if (n.kind === "hex" && typeof n.value == "string" || n.kind === "string" && typeof n.value == "string" && /^#[0-9A-Fa-f]{3,8}$/.test(n.value)) return n.value;
	if (n.kind === "ident" && typeof n.name == "string") return ZC(n.name, t + 1);
	if (n.kind === "opacityOf") {
		let e = ew(n.base, t + 1);
		if (!e) return null;
		let r = n.opacity, i = NaN;
		return typeof r == "number" ? i = r : r && typeof r == "object" && r.kind === "number" ? i = Number(r.value) : typeof r == "string" && (i = Number(r)), Number.isFinite(i) ? tw(e, i) : e;
	}
	return null;
}
function tw(e, t) {
	let n = nw(e);
	if (!n) return e;
	let r = Math.max(0, Math.min(1, t));
	return `rgba(${n.r},${n.g},${n.b},${r})`;
}
function nw(e) {
	let t = e.replace(/^#/, ""), n = t;
	return t.length === 3 && (n = t.split("").map((e) => e + e).join("")), t.length === 4 && (n = t.slice(0, 3).split("").map((e) => e + e).join("")), n.length === 8 && (n = n.slice(0, 6)), n.length !== 6 || !/^[0-9A-Fa-f]+$/.test(n) ? null : {
		r: parseInt(n.slice(0, 2), 16),
		g: parseInt(n.slice(2, 4), 16),
		b: parseInt(n.slice(4, 6), 16)
	};
}
//#endregion
//#region src/canvas/validateProp.js
function rw(e, t, n) {
	let r = String(n ?? "").trim();
	if (r === "") return {
		ok: !0,
		value: void 0
	};
	let i = aw(e, t);
	if (!i) return {
		ok: !0,
		value: r
	};
	let a = YC.valueKinds?.[i];
	if (!a) return {
		ok: !0,
		value: r
	};
	let o = sw(i, a);
	if (/^[A-Za-z_][\w.]*\.$/.test(r)) return {
		ok: !0,
		value: void 0,
		incomplete: !0
	};
	if ((i.startsWith("enum") || i === "sizing" || i === "color" || i === "colorOrLayers") && /^["'].*["']$/.test(r)) return {
		ok: !1,
		message: `Quoted string is not valid for ${t}`,
		expected: o
	};
	if (i.startsWith("enum")) return cw(r, a, o);
	switch (i) {
		case "color":
		case "colorOrLayers": return uw(r, o, i === "colorOrLayers");
		case "distance":
		case "nonNegNumber":
		case "blurRadius": return dw(r, a, o);
		case "opacity": return mw(r, a, o);
		case "number": return pw(r, a, o);
		case "size":
		case "weight":
		case "lineHeight":
		case "letterSpacing":
		case "ratio": return fw(r, a, o);
		case "cornerRadius": return hw(r, a, o);
		case "edgeInsets": return gw(r, o);
		case "sizing": return _w(r, o);
		case "string": return {
			ok: !0,
			value: bw(r)
		};
		case "styleRef": return /^[A-Za-z_][\w.]*$/.test(r) ? {
			ok: !0,
			value: r
		} : {
			ok: !1,
			message: "Type style name looks wrong",
			expected: o
		};
		default: return {
			ok: !0,
			value: r
		};
	}
}
function iw(e) {
	return !!e?.querySelector(".canvas-field.is-invalid");
}
function aw(e, t) {
	let n = (YC.kinds?.[e])?.props?.[t]?.type;
	if (n) return n;
	let r = YC.childFlexProps?.[t]?.type;
	if (r) return r;
	let i = YC.special?.[t];
	return i?.type ? i.type : null;
}
function ow(e) {
	let t = YC.kinds?.[e], n = t?.props ? Object.keys(t.props) : [];
	for (let e of Object.keys(YC.childFlexProps ?? {})) n.includes(e) || n.push(e);
	for (let [t, r] of Object.entries(YC.special ?? {})) r.structural || Array.isArray(r.kinds) && !r.kinds.includes(e) || n.includes(t) || n.push(t);
	return n;
}
function sw(e, t) {
	return e.startsWith("enum") && Array.isArray(t.cases) && t.cases.length ? t.cases.map((e) => `.${e}`).join(" · ") : e === "sizing" ? ".hug · .fill · number · .fixed(n) · .flex(…) · .aspect(…)" : e === "color" ? "#RRGGBB · Color token · token @ 0–1" : e === "colorOrLayers" ? "#RRGGBB · Color token · token @ 0–1 (layers OK on Apply)" : e === "edgeInsets" ? "number · EdgeInsets(x:, y:) · EdgeInsets(top:, right:, bottom:, left:)" : e === "opacity" ? "0…1 · Opacity token" : e === "distance" || e === "nonNegNumber" || e === "blurRadius" ? `≥ 0 number · ${(t.tokenTypes || []).join(" / ") || "number"} token` : e === "cornerRadius" ? "≥ 0 number · Radius token · Corner(…)" : t.range ? `${t.range[0]}…${t.range[1]}` : t.tokenTypes?.length ? `number · ${(t.tokenTypes || []).join(" / ")} token` : e;
}
function cw(e, t, n) {
	let r = t.cases || [], i = lw(e);
	if (i && r.includes(i)) return {
		ok: !0,
		value: `.${i}`
	};
	if (/^[A-Za-z_][\w.]*$/.test(e) && !e.includes("\"")) {
		let n = yw(e), r = t.tokenTypes || [];
		if (n && r.includes(n.tokenType)) return {
			ok: !0,
			value: e
		};
	}
	return {
		ok: !1,
		message: `Invalid ${t.typeName || "enum"} value`,
		expected: n
	};
}
function lw(e) {
	let t = bw(e);
	return t.startsWith(".") && (t = t.slice(1)), /^[A-Z][A-Za-z0-9_]*\.[A-Za-z_][\w]*$/.test(t) ? t.split(".").pop() || null : /^[A-Za-z_][\w]*$/.test(t) && !t.includes(".") ? t : null;
}
function uw(e, t, n) {
	if (e.startsWith("[") && n) return {
		ok: !0,
		value: e
	};
	let { css: r, unresolved: i } = XC(e);
	if (r) return {
		ok: !0,
		value: e
	};
	if (i && /^[A-Za-z_][\w.]*$/.test(i)) {
		let e = yw(i);
		return e && e.tokenType && e.tokenType !== "Color" ? {
			ok: !1,
			message: `Token is ${e.tokenType}, not Color`,
			expected: t
		} : {
			ok: !1,
			message: `Unknown Color token “${i}”`,
			expected: t
		};
	}
	return {
		ok: !1,
		message: "Not a hex color or Color token",
		expected: t
	};
}
function dw(e, t, n) {
	if (/^-?\d+(\.\d+)?$/.test(e)) {
		let r = Number(e);
		return t.nonNegativeNumber && r < 0 ? {
			ok: !1,
			message: "Must be ≥ 0",
			expected: n
		} : {
			ok: !0,
			value: r
		};
	}
	return vw(e, t.tokenTypes || [], n);
}
function fw(e, t, n) {
	if (/^-?\d+(\.\d+)?$/.test(e)) {
		let r = Number(e);
		if (t.nonNegativeNumber && r < 0) return {
			ok: !1,
			message: "Must be ≥ 0",
			expected: n
		};
		if (t.positiveNumber && !(r > 0)) return {
			ok: !1,
			message: "Must be > 0",
			expected: n
		};
		if (t.range) {
			let [e, i] = t.range;
			if (r < e || r > i) return {
				ok: !1,
				message: `Must be ${e}…${i}`,
				expected: n
			};
		}
		return {
			ok: !0,
			value: r
		};
	}
	return vw(e, t.tokenTypes || [], n);
}
function pw(e, t, n) {
	return /^-?\d+(\.\d+)?$/.test(e) ? {
		ok: !0,
		value: Number(e)
	} : {
		ok: !1,
		message: "Expected a number",
		expected: n
	};
}
function mw(e, t, n) {
	if (/^-?\d+(\.\d+)?$/.test(e)) {
		let t = Number(e);
		return t < 0 || t > 1 ? {
			ok: !1,
			message: "Opacity must be 0…1",
			expected: n
		} : {
			ok: !0,
			value: t
		};
	}
	return vw(e, ["Opacity"], n);
}
function hw(e, t, n) {
	if (/^-?\d+(\.\d+)?$/.test(e)) {
		let t = Number(e);
		return t < 0 ? {
			ok: !1,
			message: "Must be ≥ 0",
			expected: n
		} : {
			ok: !0,
			value: t
		};
	}
	return /^Corner\(/i.test(e) ? {
		ok: !0,
		value: e
	} : vw(e, t.tokenTypes || ["Radius", "CornerRadii"], n);
}
function gw(e, t) {
	if (/^-?\d+(\.\d+)?$/.test(e)) {
		let n = Number(e);
		return n < 0 ? {
			ok: !1,
			message: "Must be ≥ 0",
			expected: t
		} : {
			ok: !0,
			value: n
		};
	}
	return /^EdgeInsets\(/i.test(e) ? !/^EdgeInsets\([^)]*\)$/i.test(e) && !/^EdgeInsets\(.+\)$/i.test(e) ? {
		ok: !1,
		message: "Malformed EdgeInsets(…)",
		expected: t
	} : {
		ok: !0,
		value: e
	} : /^[A-Za-z_][\w.]*$/.test(e) ? vw(e, ["EdgeInsets"], t) : {
		ok: !1,
		message: "Invalid padding / insets",
		expected: t
	};
}
function _w(e, t) {
	let n = bw(e), r = n.startsWith(".") ? n.slice(1) : n;
	if (r === "hug" || r === "fill") return {
		ok: !0,
		value: `.${r}`
	};
	if (/^Sizing\.(hug|fill)$/.test(n)) return {
		ok: !0,
		value: `.${n.split(".").pop()}`
	};
	if (/^-?\d+(\.\d+)?$/.test(n)) {
		let e = Number(n);
		return e < 0 ? {
			ok: !1,
			message: "Must be ≥ 0",
			expected: t
		} : {
			ok: !0,
			value: e
		};
	}
	return /^\.(fixed|flex|aspect)\(/i.test(n) || /^Sizing\.(fixed|flex|aspect)\(/i.test(n) ? {
		ok: !0,
		value: n.startsWith("Sizing.") ? n.replace(/^Sizing/, "") : n
	} : /^[A-Za-z_][\w.]*$/.test(n) ? vw(n, ["Sizing"], t) : {
		ok: !1,
		message: "Invalid sizing",
		expected: t
	};
}
function vw(e, t, n) {
	if (!/^[A-Za-z_][\w.]*$/.test(e)) return {
		ok: !1,
		message: "Invalid value",
		expected: n
	};
	let r = yw(e);
	return r ? t.length && r.tokenType && !t.includes(r.tokenType) ? {
		ok: !1,
		message: `Token is ${r.tokenType}; expected ${t.join(" / ")}`,
		expected: n
	} : {
		ok: !0,
		value: e
	} : {
		ok: !1,
		message: `Unknown token “${e}”`,
		expected: n
	};
}
function yw(t) {
	let n = e.catalogue?.tokenTables ?? {};
	return n.primitives?.[t] || n.semantics?.[t] || null;
}
function bw(e) {
	return e.startsWith("\"") && e.endsWith("\"") || e.startsWith("'") && e.endsWith("'") ? e.slice(1, -1) : e;
}
var xw = {
	$comment: "Locked meanings for PDL built-in objects. Authors and hosts treat this file as the vocabulary. Compilers still type-check from shared/frame-props.json (enum case lists must match). Host-protocol channel/verb names must match test-fixtures/pdl/stdlib/host_protocols.pdl. Declaration names must match shared/keywords.json (declarations group). Edit meanings here; run npm run docs:gen.",
	schemaVersion: 1,
	languageVersion: "1.0.0-beta",
	sectionIntros: {
		declarations: "The top-level blocks in a `.pdl` file. Use them to import files, name tokens, and define components. Order inside a file is free.",
		frames: "Every component has one root frame. Nested UI is the same four constructors on `let`. Use `layout` to group, `text` for words, `icon` for a glyph, `media` for an image or video. Unknown properties are PDL-E011; wrong types are PDL-E006.",
		children: "`children` belongs on `Layout` — that is how PDL draws views and nested views. A child `Layout` has its own `children`. `Text()`, `Icon()`, and `Media()` are leaves: they do not take `children` and do not nest views. Every entry is a component — a built-in frame or one you declared (`Button(…)`). Name them with `let`, then mount them with `children = [heading, save]`. A `let` that never appears in `children` is not drawn. A `let` mounts at most once (PDL-E042); two identical-looking children are two lets or a list. `Spacer()` is the leftover-space exception. A `ForEach` block does not mount views by itself.",
		spacer: "A child that eats leftover space on the main axis. Write `Spacer()` inside `children = […]`.",
		forEach: "Use ForEach when a list needs per-row state or click handling — which chip is selected, which row is highlighted. It writes onto items you already put in `children`. It does not create views by itself.",
		repeat: "`Repeat(count:, begin: = 1) { i in … }` mounts N copies at bake. Index domain is `begin` … `begin + count − 1` (default begin 1). Nested Repeat is allowed; each count ≤ 32 and nested product ≤ 64. Equality on binders (`i == currentPage`) is OK — not Number algebra. Distinct from ForEach and Map. Prefer Map when the list needs ForEach emit capture.",
		map: "`Map(lo...hi) { i in … }` builds a typed list at bake. The body’s component expression is the element; no yield ⇒ omit (compactMap). Prefer `let dots: [T] = Map(…)`; wire with `ForEach(dots)`; mount with `children = dots`. Same ceilings as Repeat. Distinct from Repeat (mount-only) and ForEach (wire-only).",
		let: "Name a nested frame, or a typed value you reuse in props. Prefer a lowercase id (`let title`, `let ramp`) so the name is not the same word as the type. Frame lets go in `children`. Typed value lets do not.",
		parameters: "The public inbound API of a component. Every name in the parentheses is public. There is no private parameter.",
		variants: "Closed sets you declare — tone, size, filter id. Write `.case` at use sites. `enum` and `variant` are the same in v1.",
		self: "The enclosing component instance. Use `self.param` when a nested name would shadow. Rules-query `self` is a different thing.",
		conditionals: "Change a handful of properties when a parameter or state changes. First match wins.",
		conditions: "Comparisons and booleans used in `if` and ForEach. Keep `&&` and `||` in separate expressions, or parenthesize.",
		null: "Clear a frame or typeStyle property so the default applies. Not a token value.",
		tokenTypes: "Named values you declare once and reuse. Write `primitive` for the raw palette and `semantic` for the names components should use (`color.surface`). Pick a type when a property needs a color, a gap, a shadow, and so on. Duration, Ease, Timing, Pose, Stagger, Motion, Animation, and PresentationMotion are the motion types — Animation is `animate =`; Motion is a segment inside Animation.keys; PresentationMotion is Presenter pair clips. Effect is paint: `.blurSelf` softens the node, `.blurBehind` samples what is behind.",
		theme: "A named remap of tokens you already declared. Use a theme for light/dark, brand, or reduced motion. Components keep using semantic names; the theme changes what those names resolve to.",
		catalog: "A named remap the environment applies — platform icon sets, not light/dark. Same override lines as a theme. Only `use catalog Name` inside `mount` applies it. The theme picker must not list catalogs.",
		host: "An environment profile: `host Name(params) [mount { … }]`. Components opt in with `<Host>` to read those params. Width-class and surface taxonomies are pack-local variants, not language types. Bake runs `mount` once against an opaque facts bag, then any fact whose key matches a host param pins that param for every `<Host>` component.",
		typeStyle: "A named bundle of text-frame properties. A text frame sets `style = Name`. Body lines are the same properties as a text frame.",
		values: "Structured values you pass to properties — insets, shadows, corners, gradient stops.",
		layers: "Fills stacked in `background` and `foreground`. A hex Color is usually enough; use these constructors for a gradient or a `MediaLayer`. `Blur()` in a fill list is the alias window for a behind pane — prefer `effect = Effect(.blurBehind, …)` on the frame.",
		assets: "How you point at a glyph or a file. `IconRef` is the Icon token RHS; `MediaSource` is the source for a `media` frame and `MediaLayer`.",
		enums: "Closed choices such as `.row` or `.center`. Use them on layout properties and as parameter types.",
		eventDirections: "A component hears its parameters. That is enough for a fixture, and for a parent that already knows the state. It is not enough when the user clicks a chip, or when a field should start editing. PDL does not run like a script in the page. The host — the preview, or the app that embeds the design — delivers pointer and text events onto a component that opted in (`<PointerInput>`, `<EditableText>`). The component can then emit a typed channel to its parent (`select`, `change`). The parent assigns on that channel and its own parameters update, so the row can show which chip is selected. A component can also ask the host to do something, such as begin editing. Those are three different paths. A `pressEnd` is not an emit.",
		emits: "How a child tells its parent something happened — a chip was selected, a field changed. Declare the channel with `emits { … }` or inherit it with `emits <P>`, fire it from a click, and listen on the parent. `emits <P>` is also how a component fills a `[P]` slot.",
		protocols: "A shared contract so several components can sit in the same list and speak the same language. `<>` receives: host inbound (`PointerInput`) and ancestor sinks (`ShowEpisode` on the screen). `emits <P>` sends: fire that protocol’s channels, inherit its params, and satisfy `[P]` slots.",
		hostPrelude: "A host protocol lets the preview (or app) trigger component changes: hover color, a click, focus, typing — or, with `Host`, read the active environment profile. Use `PointerInput` for buttons and chips; use `EditableText` for a field the user types into; use `Host` on a structural parent. Opt in with `component C <PointerInput>`. List more than one when needed: `component C <Host, PointerInput>`. These names are built in — you do not import them.",
		motion: "One or more `animate =` / `let.animate =` assignments on a host handler, or a standing `animate` on any frame. Its type is Animation: optional start Pose (snap), sequential Motion keys, optional Stagger and repeat (`.forever` or a count). Bake stays at rest; the HTML host plays a CSS overlay.",
		samples: "Reusable catalogs of instances you mount in layout so a prototype can stay interactive — a library of tracks, a set of chips, an empty list you can switch to. Write the catalog once and point at `Tracks.library.tracks` from a parameter default or from `children`. Isolated component examples, the kind you would put in design-system documentation, belong in fixtures.",
		fixtures: "A fixture is a named bag of parameter values for one component, plus optional bake knobs (`host`, `theme`, `hostFacts`). The Playground Fixture menu shows the labels. Each `example` is concrete values only — not other parameters, not layout. Flip through them to preview states without editing the component. Use fixtures for the examples you would put in design-system documentation — primary vs secondary, large vs small. Use them also for a whole view: empty search, a night playlist, mid-rename. Samples are the catalogs you mount; a fixture chooses which world the preview is in.",
		usage: "A written note on a component for authors and tools. In v1 the only key is `description`.",
		extend: "Add fixtures, usage, or rules to a component you imported — without copying its layout.",
		rule: "A design check the preview or CI can flag. It does not change how anything looks. Tag instances in a `rules` block, then write a query from this instance — siblings, children, parent — and a strength (`.must` fails the build; `.should` warns)."
	},
	frameKinds: [
		{
			name: "layout",
			ctor: "Layout",
			meaning: "A flex-like container — the usual root of a component, and any nested group. Write `component Card layout { … }` for the root, or `let box = Layout(…)` for a nested group. Set `direction` to `.row` or `.column` (or `.stack` to overlap). Named children go in `children`. Spacing is `gap` / `padding` (Distance and EdgeInsets). Alignment is `align` and `justify`.",
			example: "component Card layout {\n  direction = .column\n  gap = 8\n  padding = 16\n  let title = Text(content: \"Hello\")\n  children = [title]\n}"
		},
		{
			name: "text",
			ctor: "Text",
			meaning: "A typography node. `content` is the string. Prefer `style:` naming a typeStyle for size and weight; override with `color`, `fontSize`, and the other text properties when needed. Root form is `component Title text { … }`; nested form is `let heading = Text(…)`.",
			example: "let heading = Text(content: title, style: Title, color: color.text)"
		},
		{
			name: "icon",
			ctor: "Icon",
			meaning: "A small tintable glyph. The `icon` property is an Icon token or `IconRef` — not this frame. Set `size` or `width` / `height`. Tint with `color`. Nested form is `let star = Icon(…)`.",
			example: "let star = Icon(icon: IconRef(system: .sfSymbols, name: \"star\"), size: 16, color: color.ink)"
		},
		{
			name: "media",
			ctor: "Media",
			meaning: "A box that draws raster, vector, or video from a MediaSource. Distinct from MediaLayer, which is a fill inside `background` / `foreground`. Fit the source with `contentMode` (`.cover`, `.contain`, …). Nested form is `let photo = Media(…)`.",
			example: "let photo = Media(source: media.hero, contentMode: .cover, height: 120)"
		}
	],
	paramScalars: [
		{
			name: "String",
			meaning: "Quoted text. Component parameters, text content, font family, easing strings."
		},
		{
			name: "Number",
			meaning: "A finite number. Unitless unless the property says otherwise (Duration is milliseconds; Opacity is 0…1; LineHeight is a ratio). Params may add coherence bounds: `Number(min: 2, max: 10)`. Named aliases: `type PageCount = Number(min: 2, max: 10)`. Bake / fixtures keep a scalar; out-of-range is PDL-E057."
		},
		{
			name: "Bool",
			meaning: "true or false. Write `Bool`, not `Boolean` (PDL-E039)."
		}
	],
	tokenTypes: [
		{
			name: "Color",
			category: "color",
			usedOn: [
				"background",
				"foreground",
				"color",
				"borderColor",
				"Shadow.color"
			],
			meaning: "A fill, text, or border color. Hex is a color, not a string.",
			accept: [
				{
					form: "#RGB",
					meaning: "Three-digit hex."
				},
				{
					form: "#RRGGBB",
					meaning: "Six-digit hex. The usual literal."
				},
				{
					form: "#RRGGBBAA",
					meaning: "Eight-digit hex; last pair is alpha."
				},
				{
					form: "color.token",
					meaning: "A Color token (semantic on components)."
				},
				{
					form: "color @ 0.4",
					meaning: "Tint: multiply alpha. Prefer an Opacity token on the right."
				},
				{
					form: "color @ opacity.scrim",
					meaning: "Tint with a named Opacity."
				}
			],
			reject: [{
				form: "\"#3B82F6\"",
				meaning: "Quoted hex is PDL-E017."
			}],
			example: "primitive color.primitive.blue.500: Color = #3B82F6\nsemantic color.surface: Color = color.primitive.blue.500\nbackground = color.surface @ opacity.surface.tint"
		},
		{
			name: "Opacity",
			category: "alpha",
			usedOn: [
				"opacity",
				"color @ …",
				"GradientStop.opacity",
				"MediaLayer.opacity"
			],
			meaning: "An alpha multiplier in 0…1. Name it so themes can remap scrims and tints. A bare Opacity token is not a layer — apply it with `color @ opacity` or an `opacity:` argument.",
			accept: [{
				form: "0.4",
				meaning: "Number in 0…1. Fine for a primitive; avoid raw decimals on library surfaces."
			}, {
				form: "opacity.token",
				meaning: "An Opacity token. Preferred on the right of `@` and on `opacity=`."
			}],
			example: "primitive opacity.primitive.scrim: Opacity = 0.4\nsemantic opacity.surface.tint: Opacity = opacity.primitive.scrim\nforeground = color.ink @ opacity.surface.tint"
		},
		{
			name: "Distance",
			category: "spacing",
			usedOn: [
				"gap",
				"columnGap",
				"rowGap",
				"EdgeInsets axes"
			],
			meaning: "A non-negative length in design units (pixels in the HTML preview). Used for gaps and inset axes. Not a string; there is no `px` suffix.",
			accept: [{
				form: "12",
				meaning: "Non-negative number."
			}, {
				form: "space.stack",
				meaning: "A Distance token (semantic alias of a primitive)."
			}],
			reject: [{
				form: "12px",
				meaning: "No unit suffix."
			}, {
				form: "-4",
				meaning: "Negative lengths are rejected."
			}],
			example: "primitive spacing.primitive.md: Distance = 12\nsemantic space.stack: Distance = spacing.primitive.md\ngap = space.stack"
		},
		{
			name: "Radius",
			category: "shape",
			usedOn: ["cornerRadius", "Blur.radius"],
			meaning: "A uniform corner radius (or a blur radius amount). A number. Per-corner values are CornerRadii via `Corner(…)`, which is not a Radius token RHS.",
			accept: [{
				form: "10",
				meaning: "Non-negative number."
			}, {
				form: "radius.md",
				meaning: "A Radius token."
			}],
			reject: [{
				form: "Corner(tl: 8, tr: 8, br: 4, bl: 4)",
				meaning: "That produces CornerRadii, not Radius. PDL-E005 on a Radius token."
			}],
			example: "primitive radius.primitive.md: Radius = 10\nsemantic radius.card: Radius = radius.primitive.md\ncornerRadius = radius.card"
		},
		{
			name: "Shadow",
			category: "effect",
			usedOn: ["shadow"],
			meaning: "A drop shadow. Axes are numbers (or numeric tokens); color is a Color. Optional spread defaults to 0. HTML preview maps the resolved object to CSS box-shadow.",
			accept: [
				{
					form: "Shadow(x:, y:, blurRadius:, color:)",
					meaning: "Required fields. color may be hex, a Color token, or `color @ opacity`."
				},
				{
					form: "Shadow(…, spread: 0)",
					meaning: "Optional spread; omit for 0."
				},
				{
					form: "shadow.card",
					meaning: "A Shadow token."
				}
			],
			reject: [{
				form: "\"0 4px 12px rgba(0,0,0,.15)\"",
				meaning: "A CSS box-shadow string is PDL-E005."
			}],
			example: "primitive shadow.card: Shadow = Shadow(x: 0, y: 4, blurRadius: 12, color: #000000 @ 0.15)\nshadow = shadow.card"
		},
		{
			name: "Icon",
			category: "asset",
			usedOn: ["icon.icon"],
			meaning: "A tintable glyph reference. This is the value of an icon frame’s `icon:` property — not the Icon() frame constructor.",
			accept: [
				{
					form: "IconRef(system: .sfSymbols, name: \"star\")",
					meaning: "SF Symbol. System is IconSystem."
				},
				{
					form: "IconRef(system: .materialSymbols, name: \"star\")",
					meaning: "Material Symbol."
				},
				{
					form: "IconRef(file: \"icons/star.svg\")",
					meaning: "Pack-relative file. No leading /."
				},
				{
					form: "\"icons/star.svg\"",
					meaning: "Path sugar: must contain `/` and/or a known extension."
				},
				{
					form: "icon.action.favorite",
					meaning: "An Icon token."
				}
			],
			reject: [{
				form: "\"star\"",
				meaning: "Bare glyph id is ambiguous — PDL-E005."
			}, {
				form: "Icon(icon: …)",
				meaning: "That builds an icon frame, not an Icon token."
			}],
			example: "primitive icon.primitive.star: Icon = IconRef(system: .sfSymbols, name: \"star\")\nsemantic icon.action.favorite: Icon = icon.primitive.star\nicon = icon.action.favorite"
		},
		{
			name: "MediaSource",
			category: "asset",
			usedOn: ["media.source", "MediaLayer.source"],
			meaning: "Where a raster, vector, or video comes from. Distinct from the Media() frame and from MediaLayer (a fill).",
			accept: [
				{
					form: "MediaSource(file: \"media/hero.jpg\")",
					meaning: "Pack-relative file. No leading /. Kind/format inferred from a known extension when omitted."
				},
				{
					form: "MediaSource(url: \"https://…\")",
					meaning: "Remote http(s) URL."
				},
				{
					form: "MediaSource(url: \"https://…\", kind: .raster, format: .jpeg)",
					meaning: "Opaque CDN address: set kind (and format when known). Kind and format must agree (PDL-E006)."
				},
				{
					form: "\"media/hero.jpg\"",
					meaning: "Path-string sugar."
				},
				{
					form: "\"https://cdn.example/hero.jpg\"",
					meaning: "URL-string sugar."
				},
				{
					form: "media.hero",
					meaning: "A MediaSource token."
				}
			],
			example: "primitive media.hero: MediaSource = MediaSource(url: \"https://cdn.example/abc\", kind: .raster, format: .jpeg)\nsource = media.hero"
		},
		{
			name: "Ratio",
			category: "layout",
			usedOn: ["Sizing.aspect", "aspect"],
			meaning: "A positive width/height ratio.",
			accept: [
				{
					form: "1.777",
					meaning: "Positive number (width ÷ height)."
				},
				{
					form: "16:9",
					meaning: "W:H sugar; same as 16/9."
				},
				{
					form: "ratio.video",
					meaning: "A Ratio token."
				}
			],
			example: "primitive ratio.video: Ratio = 16:9\nwidth = .aspect(ratio.video)"
		},
		{
			name: "FontFamily",
			category: "typography",
			usedOn: ["fontFamily", "typeStyle.fontFamily"],
			meaning: "A font stack. Quoted string.",
			accept: [{
				form: "\"Inter, system-ui, sans-serif\"",
				meaning: "CSS-style stack."
			}, {
				form: "font.body",
				meaning: "A FontFamily token."
			}],
			example: "primitive font.body: FontFamily = \"Inter, system-ui, sans-serif\"\nfontFamily = font.body"
		},
		{
			name: "Size",
			category: "typography",
			usedOn: ["fontSize", "icon.size"],
			meaning: "Font size or icon box size in design units. Unitless — not `16px`.",
			accept: [{
				form: "16",
				meaning: "Number."
			}, {
				form: "type.size.body",
				meaning: "A Size token."
			}],
			example: "primitive type.size.body: Size = 16\nfontSize = type.size.body"
		},
		{
			name: "Weight",
			category: "typography",
			usedOn: ["fontWeight"],
			meaning: "Font weight as a number (400, 500, 600, …).",
			accept: [{
				form: "500",
				meaning: "Numeric weight."
			}, {
				form: "type.weight.medium",
				meaning: "A Weight token."
			}],
			example: "primitive type.weight.medium: Weight = 500\nfontWeight = type.weight.medium"
		},
		{
			name: "LineHeight",
			category: "typography",
			usedOn: ["lineHeight"],
			meaning: "Leading as a unitless ratio of fontSize. 1.35 means 135%. Must be greater than 0.",
			accept: [{
				form: "1.35",
				meaning: "Positive number."
			}, {
				form: "type.lineHeight.body",
				meaning: "A LineHeight token."
			}],
			example: "primitive type.lineHeight.body: LineHeight = 1.35\nlineHeight = type.lineHeight.body"
		},
		{
			name: "LetterSpacing",
			category: "typography",
			usedOn: ["letterSpacing"],
			meaning: "Tracking in em — a fraction of fontSize. May be negative.",
			accept: [{
				form: "-0.01",
				meaning: "Number in em."
			}, {
				form: "type.letterSpacing.tight",
				meaning: "A LetterSpacing token."
			}],
			example: "primitive type.letterSpacing.tight: LetterSpacing = -0.01\nletterSpacing = type.letterSpacing.tight"
		},
		{
			name: "Sizing",
			category: "layout",
			usedOn: ["width", "height"],
			meaning: "How a width or height is computed. Write `.hug` or `Sizing.hug`. A bare number on a sizing property means `.fixed(n)`. Rare as a token; usual on frames.",
			accept: [
				{
					form: ".hug",
					meaning: "Size to content."
				},
				{
					form: ".fill",
					meaning: "Fill the parent on that axis."
				},
				{
					form: ".fixed(n)",
					meaning: "Exactly n design units."
				},
				{
					form: "240",
					meaning: "On width/height, the same as `.fixed(240)`."
				},
				{
					form: ".flex(min:, preferred:, max:)",
					meaning: "Flexible range. Any field may be omitted. All omitted is like .fill. preferred maps to flex-basis (or the host equivalent)."
				},
				{
					form: ".aspect(r)",
					meaning: "Derive this axis from the other so width/height = r. r is a number, W:H, or a Ratio token. Put .aspect on the free axis only."
				},
				{
					form: "sizing.sidebar",
					meaning: "A Sizing token."
				}
			],
			example: "primitive sizing.sidebar: Sizing = .fill\nwidth = .fill\nheight = .hug\nwidth = 240"
		},
		{
			name: "Duration",
			category: "motion",
			usedOn: [
				"Timing.duration",
				"Stagger.step",
				"animate"
			],
			meaning: "Animation length in milliseconds. Unitless — not `150ms`.",
			accept: [{
				form: "150",
				meaning: "Milliseconds."
			}, {
				form: "motion.duration.fast",
				meaning: "A Duration token."
			}],
			example: "primitive motion.duration.fast: Duration = 150\nprimitive motion.duration.standard: Duration = 250"
		},
		{
			name: "Ease",
			category: "motion",
			usedOn: [
				"Timing.ease",
				"Motion.ease",
				"Key.ease"
			],
			meaning: "How time is shaped. Named cases `.linear` / `.in` / `.out`, or `Ease.bezier(x1, y1, x2, y2)`. x1 and x2 must be 0…1 (CSS time axis). y1 and y2 may overshoot. Not a CSS string.",
			accept: [
				{
					form: ".out",
					meaning: "Decelerate into rest."
				},
				{
					form: "Ease.bezier(0.2, 0, 0, 1)",
					meaning: "Cubic bezier. x1/x2 in 0…1; y may overshoot."
				},
				{
					form: "motion.ease.standard",
					meaning: "An Ease token."
				}
			],
			example: "primitive motion.ease.standard: Ease = Ease.bezier(0.2, 0, 0, 1)\nprimitive motion.ease.linear: Ease = .linear"
		},
		{
			name: "Timing",
			category: "motion",
			usedOn: ["Motion.timing", "animate"],
			meaning: "A duration plus ease, and an optional delay (default 0). Written `Timing(duration:, ease: [, delay:])`. Themes replace a Timing wholly — no deep merge. A Timing is valid `animate =` sugar for `Motion(timing: …)`.",
			accept: [
				{
					form: "Timing(duration: …, ease: …)",
					meaning: "Required fields. Values may be literals or Duration / Ease tokens."
				},
				{
					form: "Timing(duration: …, ease: …, delay: …)",
					meaning: "Optional delay in milliseconds."
				},
				{
					form: "motion.appear",
					meaning: "A Timing token."
				}
			],
			example: "semantic motion.appear: Timing = Timing(duration: motion.duration.standard, ease: motion.ease.standard)\nsemantic motion.instant: Timing = Timing(duration: 0, ease: .linear)"
		},
		{
			name: "Pose",
			category: "motion",
			usedOn: ["Motion.pose", "Key.pose"],
			meaning: "An overlay snapshot — not layout. Used on appear / dismiss, hover flourish, keys, and standing frame `animate`. Fields: opacity (0…1), scale (unitless), scaleX, scaleY, translateX, translateY, blur (CSS px), rotate (degrees), originX / originY (0…1, transform origin). At least one field is required. Unknown labels are PDL-E005. Appear plays from the pose to rest; dismiss plays from rest to the pose; other sites follow `play`. Themes replace a Pose wholly — no field merge.",
			accept: [{
				form: "Pose(opacity: 0, scale: 0.95, translateY: 8)",
				meaning: "Constructor. All fields optional except that one must be present."
			}, {
				form: "pose.fadeUp",
				meaning: "A Pose token."
			}],
			example: "semantic pose.fadeUp: Pose = Pose(opacity: 0, scale: 0.95, translateY: 8)"
		},
		{
			name: "Stagger",
			category: "motion",
			usedOn: ["Motion.stagger"],
			meaning: "How a pose track is distributed across the handler’s direct visible children. `step` is a Duration (milliseconds). `from` is `.first` or `.last` (default `.first`). Illegal without `pose:` or `keys:` on the same Motion. Themes replace a Stagger wholly.",
			accept: [
				{
					form: "Stagger(step: 30)",
					meaning: "Step only; direction defaults to `.first`."
				},
				{
					form: "Stagger(step: 30, from: .first)",
					meaning: "Or `from: .last`."
				},
				{
					form: "motion.stagger.list",
					meaning: "A Stagger token."
				}
			],
			example: "semantic motion.stagger.list: Stagger = Stagger(step: 30, from: .first)"
		},
		{
			name: "Motion",
			category: "motion",
			usedOn: ["Animation.keys"],
			meaning: "One segment of an Animation: a clock plus a destination Pose (or `.rest`). Not a valid `animate =` value — wrap segments in `Animation(keys: […])`. Declare `duration:` / `ease:` / optional `delay:`, or `timing:` as a Timing token / `Timing(…)`. Do not mix `timing:` with flattened clock fields. Themes replace a Motion wholly.",
			accept: [
				{
					form: "Motion(duration: 250, ease: .out, pose: Pose(scale: 1.08))",
					meaning: "Ease from current overlay to this pose."
				},
				{
					form: "Motion(duration: 400, ease: .out, pose: .rest)",
					meaning: "Settle to identity overlay."
				},
				{
					form: "Motion(timing: motion.fast, pose: pose.fadeUp)",
					meaning: "Timing token plus destination."
				}
			],
			reject: [{
				form: "animate = Motion(duration: 200, ease: .out, pose: Pose(scale: 1.1))",
				meaning: "`animate =` takes Animation, not Motion."
			}, {
				form: "Motion(duration: 200, ease: .out, play: .toRest)",
				meaning: "`play:` is removed."
			}],
			example: "Motion(duration: 280, ease: .out, pose: Pose(scale: 1.12))"
		},
		{
			name: "Animation",
			category: "motion",
			usedOn: ["animate"],
			meaning: "The value of `animate =` (handler or frame). Optional `start:` snaps immediately (omit = from current overlay). `keys:` is a non-empty sequential list of Motion segments. Optional `stagger:` and `repeat:` (finite count or `.forever`). `Animation(token, field:)` copies an Animation token and overrides labeled fields. Themes replace an Animation wholly. Concurrent independent clocks use different lets (`box.animate` / `label.animate`), or bundle channels in one Pose.",
			accept: [
				{
					form: "Animation(start: Pose(opacity: 0), keys: [Motion(duration: 250, ease: .out, pose: .rest)])",
					meaning: "Appear: snap start, ease to rest."
				},
				{
					form: "Animation(keys: [Motion(duration: 180, ease: .out, pose: Pose(scale: 1.08)), Motion(duration: 280, ease: .out, pose: .rest)])",
					meaning: "Overshoot then settle."
				},
				{
					form: "Animation(keys: [Motion(duration: 800, ease: .linear, pose: Pose(rotate: 360))], repeat: .forever)",
					meaning: "Standing spin."
				},
				{
					form: "Animation(motion.hoverPop, repeat: .forever)",
					meaning: "Copy a token and override fields."
				},
				{
					form: "motion.enterCard",
					meaning: "An Animation token."
				}
			],
			reject: [
				{
					form: "Animation(keys: [])",
					meaning: "Empty keys rejected."
				},
				{
					form: "animate = Timing(duration: 200, ease: .out)",
					meaning: "Timing is not animate sugar."
				},
				{
					form: "Animation(keys: […], play: .toRest)",
					meaning: "`play:` is removed — put `.rest` in a Motion pose."
				}
			],
			example: "semantic motion.hoverPop: Animation = Animation(\n  keys: [\n    Motion(duration: 110, ease: .out, pose: Pose(scale: 1.12)),\n    Motion(duration: 170, ease: .out, pose: Pose(scale: 1.04))\n  ]\n)\nhoverEnd = { animate = Animation(keys: [Motion(duration: 280, ease: .out, pose: .rest)]) }"
		},
		{
			name: "PresentationMotion",
			category: "motion",
			usedOn: [
				"Presenter.move",
				"present.move",
				"push.move",
				"dismissMove"
			],
			meaning: "A Presenter pair clip. Slots are `Animation`, or `Pose` sugar with pair-level `duration` / `ease` / `delay` (incoming expands to start→rest; outgoing expands to ease to that Pose). Animation slots keep their own clocks. `front` is who starts on top (`.incoming` or `.outgoing`). Omit it: `move` keeps incoming on top; `dismissMove` keeps outgoing on top. `switchAt` is milliseconds from play start. `.reversed` swaps sides and time-reverses each Motion `ease` (`.in`↔`.out`; bezier control points invert). `delay` stays. Omit `switchAt`: flip `front`. With `switchAt`: keep `front` and invert to `span − switchAt`.",
			accept: [
				{
					form: "PresentationMotion(incoming: Pose(translateX: 390), outgoing: Pose(translateX: -48, opacity: 0.86), duration: 320, ease: .out)",
					meaning: "Push-style pair via Pose sugar."
				},
				{
					form: "front: .outgoing",
					meaning: "Who starts on top."
				},
				{
					form: "switchAt: 240",
					meaning: "Switch who is on top at that many milliseconds from play start."
				},
				{
					form: "PresentationMotion(incoming: Pose(scale: 0.92, translateX: -36), outgoing: Pose(scale: 0.92, translateX: 36), duration: 480, ease: .in, front: .outgoing, switchAt: 240)",
					meaning: "Card swap."
				},
				{
					form: "motion.navPush.reversed",
					meaning: "Swap incoming/outgoing, time-reverse ease."
				},
				{
					form: "incoming: Animation(start: Pose(translateX: 390), keys: [Motion(duration: 480, ease: .out, pose: .rest)])",
					meaning: "Explicit incoming Animation."
				}
			],
			example: "semantic motion.navPush: PresentationMotion = PresentationMotion(\n  incoming: Pose(translateX: 390),\n  outgoing: Pose(translateX: -48, opacity: 0.86),\n  duration: 320,\n  ease: .out\n)"
		},
		{
			name: "Effect",
			category: "paint",
			usedOn: ["effect"],
			meaning: "A paint-time distortion on a frame — not a fill, not a child. `.blurSelf` softens this node's pixels (`filter`). `.blurBehind` samples what is behind (`backdrop-filter`). `.glass` is reserved. `blur = n` is sugar for `Effect(.blurSelf, radius: n)`. One `effect` per frame. `Blur()` in a fill list is the alias window for `.blurBehind`.",
			accept: [
				{
					form: "Effect(.blurSelf, radius: 8)",
					meaning: "Soften this node's pixels."
				},
				{
					form: "Effect(.blurBehind, radius: 16)",
					meaning: "Pane over what is behind. Optional vibrancy:."
				},
				{
					form: "effect.frost",
					meaning: "An Effect token."
				},
				{
					form: "8",
					meaning: "Only on `blur =` — sugar for Effect(.blurSelf, radius: 8)."
				}
			],
			reject: [
				{
					form: "background = [Effect(.blurBehind, radius: 16)]",
					meaning: "Effect is not a layer. Set effect = on the frame."
				},
				{
					form: "children = [Effect(.blurSelf, radius: 8)]",
					meaning: "Not a frame. Wear the effect on a child layout."
				},
				{
					form: "Effect(.glass)",
					meaning: "Reserved — not implemented yet."
				}
			],
			example: "primitive effect.frost: Effect = Effect(.blurBehind, radius: 20)\nsheet.effect = effect.frost\nphoto.blur = 8"
		},
		{
			name: "Blur",
			category: "layer",
			usedOn: ["background", "foreground"],
			meaning: "A blur layer object (alias window). Prefer `effect = Effect(.blurBehind, radius:)` on the frame. Radius amounts reuse Radius — there is no numeric Blur token. A bare Blur token is still a valid layer entry. Legacy `Blur(blur: …)` is rejected.",
			accept: [
				{
					form: "Blur(radius: 16)",
					meaning: "Radius is a number or Radius token."
				},
				{
					form: "Blur(radius: …, style: .standard)",
					meaning: "Optional BlurStyle. v1 ships only .standard."
				},
				{
					form: "Blur(radius: …, vibrancy: Vibrancy(…))",
					meaning: "Optional Vibrancy."
				},
				{
					form: "blur.sheet",
					meaning: "A Blur token; legal inside a layer list."
				}
			],
			reject: [{
				form: "16",
				meaning: "A bare number is a Radius, not a Blur."
			}, {
				form: "Blur(blur: 16)",
				meaning: "Legacy argument name — rejected."
			}],
			example: "primitive blur.sheet.radius: Radius = 16\nprimitive blur.sheet: Blur = Blur(radius: blur.sheet.radius)\nbackground = [blur.sheet, color.surface]"
		},
		{
			name: "Vibrancy",
			category: "layer",
			usedOn: [
				"Blur.vibrancy",
				"background",
				"foreground"
			],
			meaning: "Saturation and brightness for a blur (or as its own layer token).",
			accept: [{
				form: "Vibrancy(saturation:, brightness:)",
				meaning: "Both fields are numbers."
			}, {
				form: "vibrancy.sheet",
				meaning: "A Vibrancy token; legal as a layer entry."
			}],
			example: "primitive vibrancy.sheet: Vibrancy = Vibrancy(saturation: 1.2, brightness: 1.05)\nprimitive blur.sheet: Blur = Blur(radius: 16, vibrancy: vibrancy.sheet)"
		},
		{
			name: "Ramp",
			category: "layer",
			usedOn: ["background", "foreground"],
			meaning: "An opacity or color ramp along an axis. Direction is RampDirection. Stops are GradientStop values.",
			accept: [
				{
					form: "Ramp(direction:, stops: […])",
					meaning: "Preferred constructor."
				},
				{
					form: "(direction:, stops: […])",
					meaning: "Naked tuple; still accepted."
				},
				{
					form: "ramp.fade.bottom",
					meaning: "A Ramp token."
				}
			],
			example: "primitive ramp.fade.bottom: Ramp = Ramp(\n  direction: .bottomToTop,\n  stops: [\n    GradientStop(opacity: 1, position: 0.5),\n    GradientStop(opacity: 0, position: 1)\n  ]\n)"
		},
		{
			name: "EdgeInsets",
			category: "layout",
			usedOn: [
				"padding",
				"margin",
				"inset"
			],
			meaning: "A box inset. Axes may be numbers or Distance tokens. A bare number on padding, margin, or inset means uniform insets on all four sides. That sugar does not apply to gap.",
			accept: [
				{
					form: "EdgeInsets(x:, y:)",
					meaning: "Horizontal and vertical pairs."
				},
				{
					form: "EdgeInsets(top:, right:, bottom:, left:)",
					meaning: "Per-side."
				},
				{
					form: "16",
					meaning: "On padding / margin / inset only: uniform EdgeInsets."
				},
				{
					form: "spacing.card.pad",
					meaning: "An EdgeInsets token."
				}
			],
			example: "primitive spacing.card.pad: EdgeInsets = EdgeInsets(x: 16, y: 12)\npadding = spacing.card.pad\npadding = 16\nmargin = EdgeInsets(top: 8, right: 12, bottom: 8, left: 12)"
		},
		{
			name: "CornerRadii",
			category: "shape",
			usedOn: ["cornerRadius"],
			meaning: "Per-corner radii. The type name is CornerRadii; the constructor name is Corner. Axes are numbers or Radius tokens. A Radius token stays uniform — do not assign Corner(…) to a Radius token.",
			accept: [{
				form: "Corner(tl:, tr:, br:, bl:)",
				meaning: "Asymmetric radii on a frame’s cornerRadius."
			}, {
				form: "10",
				meaning: "On cornerRadius, a number is a uniform Radius, not CornerRadii."
			}],
			example: "let corners: CornerRadii = Corner(tl: 8, tr: 8, br: 4, bl: 4)\ncornerRadius = corners\ncornerRadius = Corner(tl: radius.md, tr: radius.md, br: radius.sm, bl: radius.sm)"
		},
		{
			name: "Media",
			category: "layer",
			usedOn: ["background", "foreground"],
			meaning: "A media fill inside a background or foreground stack. Construct with MediaLayer. Not the Media() frame, and not a MediaSource (that is the address).",
			accept: [{
				form: "MediaLayer(source:, contentMode: …)",
				meaning: "source is a MediaSource; contentMode is ContentMode. Optional opacity:."
			}, {
				form: "heroFill",
				meaning: "A Media (layer) token or value-let."
			}],
			reject: [{
				form: "Media(source: …)",
				meaning: "That builds a media frame, not a layer fill."
			}, {
				form: "MediaLayer(…) @ 0.5",
				meaning: "Do not postfix @ if opacity: is already set (PDL-E020)."
			}],
			example: "let hero: Media = MediaLayer(source: media.hero, contentMode: .cover)\nbackground = [hero, color.surface]"
		},
		{
			name: "GradientStop",
			category: "layer",
			usedOn: ["Ramp.stops"],
			meaning: "One stop in a Ramp. Position is 0…1. Supply opacity, color, or both.",
			accept: [
				{
					form: "GradientStop(position:, opacity:)",
					meaning: "Fade stop."
				},
				{
					form: "GradientStop(position:, color:)",
					meaning: "Color stop."
				},
				{
					form: "GradientStop(position:, opacity:, color:)",
					meaning: "Both."
				}
			],
			example: "let fadeOut: GradientStop = GradientStop(opacity: 0, position: 1)\nstops = [GradientStop(opacity: 1, position: 0), fadeOut]"
		},
		{
			name: "Background",
			category: "layer",
			usedOn: ["background"],
			meaning: "A named layer stack composited under children. Same right-hand side as Foreground: a color, or an ordered list of layers. Prefer `color @ opacityToken` over raw decimals. A bare Opacity token is not a layer.",
			accept: [
				{
					form: "color.surface",
					meaning: "Scalar color sugar — one solid layer."
				},
				{
					form: "[blur.sheet, color.surface @ opacity.tint]",
					meaning: "Ordered layers, bottom first."
				},
				{
					form: "material.sheet",
					meaning: "A Background token."
				}
			],
			example: "semantic material.sheet: Background = [blur.sheet, color.surface @ opacity.surface.tint]\nbackground = material.sheet"
		},
		{
			name: "Foreground",
			category: "layer",
			usedOn: ["foreground"],
			meaning: "A named layer stack composited over children. Same right-hand side as Background.",
			accept: [
				{
					form: "color.ink @ opacity.state.hover",
					meaning: "Scalar color sugar."
				},
				{
					form: "[color.ink @ opacity.state.hover]",
					meaning: "Layer list."
				},
				{
					form: "fg.hoverTint",
					meaning: "A Foreground token."
				}
			],
			example: "semantic fg.hoverTint: Foreground = [color.ink @ opacity.state.hover]\nforeground = fg.hoverTint"
		}
	],
	enums: [
		{
			name: "Direction",
			usedOn: ["layout.direction"],
			meaning: "Main axis of a layout (or overlap mode for stack).",
			cases: [
				{
					case: "row",
					meaning: "Main axis left to right."
				},
				{
					case: "column",
					meaning: "Main axis top to bottom."
				},
				{
					case: "rowReverse",
					meaning: "Main axis right to left."
				},
				{
					case: "columnReverse",
					meaning: "Main axis bottom to top."
				},
				{
					case: "stack",
					meaning: "Children share one box. Array order is painter’s order: first at the back, last on top."
				},
				{
					case: "reverseStack",
					meaning: "Same overlap as stack; first child is on top."
				}
			],
			example: "component Stack() layout {\n  direction = .column\n  gap = 8\n  let title = Text(content: \"Hello\")\n  let body = Text(content: \"World\")\n  children = [title, body]\n}"
		},
		{
			name: "Wrap",
			usedOn: ["layout.wrap"],
			meaning: "Whether children wrap to another line on the main axis.",
			cases: [{
				case: "nowrap",
				meaning: "Keep children on one line (default)."
			}, {
				case: "wrap",
				meaning: "Wrap onto additional lines. rowGap / columnGap apply."
			}],
			example: "direction = .row\nwrap = .wrap\ncolumnGap = 8\nrowGap = 8"
		},
		{
			name: "Align",
			usedOn: [
				"layout.align",
				"text.align",
				"media.align"
			],
			meaning: "Cross-axis alignment in a layout; vertical placement of text or media content in its box.",
			cases: [
				{
					case: "start",
					meaning: "Toward the start of the cross axis (top in a row; left in a column). On text/media: top of the box."
				},
				{
					case: "center",
					meaning: "Centered on the cross axis (or vertically in a text/media box)."
				},
				{
					case: "end",
					meaning: "Toward the end of the cross axis. On text/media: bottom of the box."
				},
				{
					case: "stretch",
					meaning: "Stretch on the cross axis. Layout only — illegal on text and media (PDL-E006)."
				}
			],
			example: "direction = .row\nalign = .center\nlet caption = Text(content: \"Hi\", align: .start)"
		},
		{
			name: "Justify",
			usedOn: [
				"layout.justify",
				"text.justify",
				"media.justify"
			],
			meaning: "Main-axis distribution in a layout; horizontal placement of text or media content in its box.",
			cases: [
				{
					case: "start",
					meaning: "Pack toward the start of the main axis. On text/media: left of the box."
				},
				{
					case: "center",
					meaning: "Centered on the main axis (or horizontally in a text/media box)."
				},
				{
					case: "end",
					meaning: "Pack toward the end. On text/media: right of the box."
				},
				{
					case: "stretch",
					meaning: "Stretch along the main axis. Layout only — illegal on text and media (PDL-E006)."
				},
				{
					case: "spaceBetween",
					meaning: "First and last flush to the ends; even space between. Layout only."
				},
				{
					case: "spaceAround",
					meaning: "Even space around each child. Layout only."
				}
			],
			example: "direction = .row\nwidth = .fill\njustify = .spaceBetween"
		},
		{
			name: "Overflow",
			usedOn: ["layout.overflow", "text.overflow"],
			meaning: "What happens when content does not fit the frame. There is no .hidden or .auto.",
			cases: [
				{
					case: "visible",
					meaning: "Content may paint outside the box."
				},
				{
					case: "scroll",
					meaning: "Content clips and the host may scroll."
				},
				{
					case: "clip",
					meaning: "Content is clipped; no scroll. Use this instead of CSS overflow:hidden."
				}
			],
			example: "width = 200\nheight = 80\noverflow = .clip"
		},
		{
			name: "BorderPosition",
			usedOn: ["layout.borderPosition", "text.borderPosition"],
			meaning: "Where the stroke is painted. Borders never change the layout box size.",
			cases: [{
				case: "outside",
				meaning: "Stroke outside the border box (default when omitted)."
			}, {
				case: "inside",
				meaning: "Stroke inside the border box."
			}],
			example: "borderWidth = 1\nborderColor = #111111\nborderPosition = .inside"
		},
		{
			name: "TruncateStyle",
			usedOn: ["text.truncateStyle"],
			meaning: "How leftover text is cut when lineClamp is set.",
			cases: [{
				case: "clip",
				meaning: "Hard cut after N lines; no ellipsis."
			}, {
				case: "ellipsis",
				meaning: "Trailing … after the last painted line. Default if lineClamp is set and truncateStyle is omitted."
			}],
			example: "let blurb = Text(content: longCopy, lineClamp: 2, truncateStyle: .ellipsis)"
		},
		{
			name: "ContentMode",
			usedOn: ["media.contentMode", "MediaLayer.contentMode"],
			meaning: "How a media source fits its box.",
			cases: [
				{
					case: "cover",
					meaning: "Fill the box; crop overflow. Preserves aspect ratio."
				},
				{
					case: "contain",
					meaning: "Fit entirely inside the box; may letterbox."
				},
				{
					case: "fill",
					meaning: "Stretch to the box; may distort."
				},
				{
					case: "scaleDown",
					meaning: "Like contain, but never scale up above intrinsic size."
				}
			],
			example: "let hero = Media(source: media.hero, contentMode: .cover, width: .fill, height: 160)"
		},
		{
			name: "AlignSelf",
			usedOn: ["child.alignSelf"],
			meaning: "Override the parent’s align for this child only.",
			cases: [
				{
					case: "start",
					meaning: "Cross-axis start, ignoring parent align."
				},
				{
					case: "center",
					meaning: "Cross-axis center."
				},
				{
					case: "end",
					meaning: "Cross-axis end."
				},
				{
					case: "stretch",
					meaning: "Stretch on the cross axis."
				},
				{
					case: "auto",
					meaning: "Use the parent’s align (default)."
				}
			],
			example: "direction = .row\nalign = .start\nlet sidebar = Layout(width: 200, alignSelf: .stretch, children: [])\nchildren = [sidebar, body]"
		},
		{
			name: "Position",
			usedOn: ["child.position", "child.inset"],
			meaning: "Whether a child of a layout sits in the flex flow. Set `position` and `inset` on the **child** (constructor args or `Child.position = …`), not on the parent. There is no `x` / `y` / `top =` property. Placement is only `position` + `inset`. `inset` is EdgeInsets from the parent’s **padding box**. The child must still appear in `children` — `.absolute` does not mount it.",
			cases: [{
				case: "flow",
				meaning: "In-flow flex child (default). `inset` is ignored."
			}, {
				case: "absolute",
				meaning: "Out of flow. Pin with `inset`. `inset = 8` is 8 on all four sides; `EdgeInsets(top:, right:, bottom:, left:)` parks a corner (use 0 on the sides you do not pin)."
			}],
			example: "let body = Text(content: \"Card\")\nlet badge = Text(\n  content: \"New\",\n  position: .absolute,\n  inset: EdgeInsets(top: 8, right: 8, bottom: 0, left: 0)\n)\nchildren = [body, badge]"
		},
		{
			name: "BlurStyle",
			usedOn: ["Blur.style"],
			meaning: "Which blur the preview uses. v1 only has `.standard`.",
			cases: [{
				case: "standard",
				meaning: "Default host blur. The only v1 case."
			}],
			example: "background = [Blur(radius: 16, style: .standard), color.surface]"
		},
		{
			name: "EffectKind",
			usedOn: ["Effect"],
			meaning: "What an Effect samples. `.blurSelf` is this node's pixels. `.blurBehind` and `.glass` share the behind slot.",
			cases: [
				{
					case: "blurSelf",
					meaning: "Soften this frame's own pixels. CSS `filter: blur()`."
				},
				{
					case: "blurBehind",
					meaning: "Sample what is behind this frame. CSS `backdrop-filter`."
				},
				{
					case: "glass",
					meaning: "Behind plus lighting / refraction. Reserved — not implemented yet."
				}
			],
			example: "photo.effect = Effect(.blurSelf, radius: 8)\nsheet.effect = Effect(.blurBehind, radius: 16)"
		},
		{
			name: "Front",
			usedOn: ["PresentationMotion.front"],
			meaning: "Which side of a Presenter pair clip starts on top. Not a token type — only the `front:` field on PresentationMotion. Pair with `switchAt` to switch who is on top mid-clip (card swap, crossfade). Do not put crossing z on Pose.",
			cases: [{
				case: "incoming",
				meaning: "The entering page starts in front. Default for `move` when `front` is omitted."
			}, {
				case: "outgoing",
				meaning: "The leaving page starts in front. Default for `dismissMove` when `front` is omitted."
			}],
			example: "semantic motion.cardSwap: PresentationMotion = PresentationMotion(\n  incoming: Pose(scale: 0.92, translateX: -36),\n  outgoing: Pose(scale: 0.92, translateX: 36),\n  duration: 480,\n  ease: .in,\n  front: .outgoing,\n  switchAt: 240\n)"
		},
		{
			name: "RampDirection",
			usedOn: ["Ramp.direction"],
			meaning: "Axis of a Ramp (gradient / opacity mask). Not a frame-prop enum — only on Ramp.",
			cases: [
				{
					case: "topToBottom",
					meaning: "Linear; start at the top edge."
				},
				{
					case: "bottomToTop",
					meaning: "Linear; start at the bottom edge."
				},
				{
					case: "leftToRight",
					meaning: "Linear; start at the left edge."
				},
				{
					case: "rightToLeft",
					meaning: "Linear; start at the right edge."
				},
				{
					case: "radial",
					meaning: "From the center. GradientStop.position is a fraction of radius (0 = center, 1 = edge)."
				}
			],
			example: "background = Ramp(\n  direction: .bottomToTop,\n  stops: [\n    GradientStop(opacity: 1, position: 0),\n    GradientStop(opacity: 0, position: 1)\n  ]\n)"
		},
		{
			name: "IconSystem",
			usedOn: ["IconRef.system"],
			meaning: "Which symbol library an IconRef names.",
			cases: [{
				case: "sfSymbols",
				meaning: "SF Symbols (Apple)."
			}, {
				case: "materialSymbols",
				meaning: "Material Symbols."
			}],
			example: "icon = IconRef(system: .sfSymbols, name: \"star\")"
		},
		{
			name: "MediaKind",
			usedOn: ["MediaSource.kind"],
			meaning: "Role of a media address when the extension is missing or ambiguous.",
			cases: [
				{
					case: "raster",
					meaning: "Bitmap (JPEG, PNG, WebP, GIF, …)."
				},
				{
					case: "vector",
					meaning: "SVG / PDF / design vector."
				},
				{
					case: "video",
					meaning: "Video file or stream."
				}
			],
			example: "primitive media.hero: MediaSource = MediaSource(url: \"https://cdn.example/abc\", kind: .raster)"
		},
		{
			name: "MediaFormat",
			usedOn: ["MediaSource.format"],
			meaning: "Closed file format. Must agree with kind when both are set (PDL-E006). .jpg is an alias of .jpeg.",
			cases: [
				{
					case: "webp",
					meaning: "WebP image."
				},
				{
					case: "jpeg",
					meaning: "JPEG image (.jpg is the same case)."
				},
				{
					case: "png",
					meaning: "PNG image."
				},
				{
					case: "gif",
					meaning: "GIF image."
				},
				{
					case: "svg",
					meaning: "SVG vector."
				},
				{
					case: "mp4",
					meaning: "MP4 video."
				},
				{
					case: "webm",
					meaning: "WebM video."
				},
				{
					case: "pdf",
					meaning: "PDF page / vector."
				}
			],
			example: "primitive media.hero: MediaSource = MediaSource(url: \"https://cdn.example/abc\", kind: .raster, format: .jpeg)"
		},
		{
			name: "RuleStrength",
			usedOn: ["Rule"],
			meaning: "How seriously a failed Rule is treated — stop the build, or just warn.",
			cases: [
				{
					case: "must",
					meaning: "Violation is an error (fails validation / CI)."
				},
				{
					case: "mustNot",
					meaning: "If the query matches, error."
				},
				{
					case: "should",
					meaning: "Violation is a warning."
				},
				{
					case: "shouldNot",
					meaning: "If the query matches, warning."
				}
			],
			example: "rules TabBar {\n  tags = [\"tab-bar\"]\n  Rule(.must, children.where(tag: \"tab-item\").count.between(2, 5),\n    description: \"A tab bar has between 2 and 5 tabs.\")\n}"
		}
	],
	constructors: [
		{
			name: "Layout",
			kind: "frame",
			meaning: "Build a layout frame. Arguments are the same properties as a layout body (direction:, gap:, children:, …)."
		},
		{
			name: "Text",
			kind: "frame",
			meaning: "Build a text frame (content:, style:, color:, fontSize:, …)."
		},
		{
			name: "Icon",
			kind: "frame",
			meaning: "Build an icon frame. The glyph is icon: (Icon token or IconRef). This is not IconRef."
		},
		{
			name: "Media",
			kind: "frame",
			meaning: "Build a media frame (source:, contentMode:, …). This is not MediaLayer."
		},
		{
			name: "Presenter",
			kind: "frame",
			meaning: "A navigation hole with a stack and an optional layered cover. `let presenter = Presenter(root: home)` then `children = [presenter, tabBar]`. The hole is a one-child layout box: `width` / `height` default to `.fill` so it occupies remaining space next to chrome; set `.hug` or a fixed size to opt out. `padding`, `align`, and `justify` inset or place a hugging page inside the hole. Bake always paints the stack top; when a cover is up it is centered over that page so the prior screen stays visible around it. `presenter.push` / `pop` / `replace` / `present(…, style: .cover)` / `dismiss` are legal only in an ancestor-capture body. Pin a stack with `presenter = [Home(), Episode()]` and a cover with `presenter.cover = Settings()`. Not a page."
		},
		{
			name: "Spacer",
			kind: "child",
			meaning: "Zero-argument child that absorbs remaining free space on the parent’s main axis. Only legal inside `children = […]`. Write `Spacer()` — bare `Spacer` is a name. `Spacer() @ opacity` is illegal.",
			example: "component Toolbar() layout {\n  direction = .row\n  align = .center\n\n  let title = Text(content: \"Library\")\n  let action = Text(content: \"Edit\")\n\n  children = [title, Spacer(), action]\n}"
		},
		{
			name: "EdgeInsets",
			kind: "value",
			meaning: "Box inset. EdgeInsets(x:, y:) or EdgeInsets(top:, right:, bottom:, left:). A number on padding/margin/inset means uniform EdgeInsets."
		},
		{
			name: "Corner",
			kind: "value",
			meaning: "Asymmetric radii: Corner(tl:, tr:, br:, bl:). Produces CornerRadii. A number on cornerRadius is a uniform Radius."
		},
		{
			name: "Shadow",
			kind: "value",
			meaning: "Shadow(x:, y:, blurRadius:, color: [, spread:]). Axes are numbers or numeric tokens; color is a Color. spread defaults to 0."
		},
		{
			name: "Color",
			kind: "layer",
			meaning: "Layer constructor Color(color: …). The token type Color is the same name — a hex or token is usually enough; use Color(…) inside a layer list when you need the explicit form."
		},
		{
			name: "Ramp",
			kind: "layer",
			meaning: "Ramp(direction: RampDirection, stops: [GradientStop, …]). Also a token type."
		},
		{
			name: "GradientStop",
			kind: "value",
			meaning: "GradientStop(position: 0…1 [, opacity:] [, color:])."
		},
		{
			name: "Blur",
			kind: "layer",
			meaning: "Blur(radius: [, style: BlurStyle] [, vibrancy: Vibrancy]). Not a bare number. Legacy Blur(blur: …) is rejected."
		},
		{
			name: "Vibrancy",
			kind: "value",
			meaning: "Vibrancy(saturation:, brightness:). Used on Blur or as its own layer token."
		},
		{
			name: "Pose",
			kind: "value",
			meaning: "Overlay snapshot: Pose(opacity:, scale:, scaleX:, scaleY:, translateX:, translateY:, blur:, rotate:, originX:, originY:). At least one field. Used on Motion.pose and Animation.start. `.rest` is identity."
		},
		{
			name: "Stagger",
			kind: "value",
			meaning: "Stagger(step: Duration [, from: .first|.last]). Used on Animation.stagger. from defaults to .first."
		},
		{
			name: "Motion",
			kind: "value",
			meaning: "Motion(duration:, ease: [, delay:] | timing:, pose:). One Animation.keys segment — clock plus destination. Not the type of animate =."
		},
		{
			name: "Animation",
			kind: "value",
			meaning: "Animation([token,] start?, keys:, stagger?, repeat?). The type of animate =. keys is a non-empty list of Motion. repeat is a count or .forever."
		},
		{
			name: "Effect",
			kind: "value",
			meaning: "Effect(.blurSelf | .blurBehind | .glass, radius: [, vibrancy:]). Frame property `effect`. `blur = n` is sugar for `.blurSelf`. `.glass` is reserved. Not a layer and not a child."
		},
		{
			name: "MediaLayer",
			kind: "layer",
			meaning: "Media fill in a background/foreground stack: MediaLayer(source:, contentMode: … [, opacity:]). Produces token type Media. Do not postfix @ if opacity: is already set (PDL-E020)."
		},
		{
			name: "IconRef",
			kind: "asset",
			meaning: "Concrete glyph: `IconRef(system: IconSystem, name: \"…\")` or `IconRef(file: \"icons/…\")`. This is the Icon token RHS — not the `Icon()` frame."
		},
		{
			name: "MediaSource",
			kind: "asset",
			meaning: "MediaSource(file: \"…\" [, kind:] [, format:]) or MediaSource(url: \"…\" [, kind:] [, format:]). Pack paths have no leading /."
		}
	],
	constructorsExample: "component Card(title: String = \"Hello\") layout {\n  direction = .column\n  gap = 8\n  let photo = Media(source: media.hero, contentMode: .cover, height: 120)\n  let heading = Text(content: title, fontSize: 16)\n  let mark = Icon(icon: IconRef(system: .sfSymbols, name: \"star\"), size: 16)\n  children = [photo, heading, mark, Spacer()]\n}",
	childrenExample: "component Button(label: String = \"OK\") layout {\n  padding = 12\n  background = #2563EB\n  cornerRadius = 8\n\n  let text = Text(content: label, color: #FFFFFF)\n  children = [text]\n}\n\ncomponent Card(title: String = \"Hello\") layout {\n  direction = .column\n  gap = 8\n\n  let heading = Text(content: title)\n  let save = Button(label: \"Save\")\n\n  children = [heading, save]\n}",
	declarationExample: "import \"tokens.pdl\"\npreviewBackground color.surface\n\ncomponent Greeting(title: String = \"Hello\") layout {\n  let heading = Text(content: title, style: Title)\n  children = [heading]\n}",
	declarations: [
		{
			name: "import",
			form: "import \"relative/path.pdl\"",
			meaning: "Pull another file into this design. Paths are relative to the importing file. There is no export — names are visible after merge. Later files win for themes and components; a second token of the same name is PDL-E003. Cycles are PDL-E002."
		},
		{
			name: "previewBackground",
			form: "previewBackground = color.token",
			meaning: "The preview canvas color. Use a Color token, not a layout property."
		},
		{
			name: "primitive",
			form: "primitive name: Type = …",
			meaning: "A raw palette value (`#3B82F6`, `12`). Components should use semantic names instead."
		},
		{
			name: "semantic",
			form: "semantic name: Type = …",
			meaning: "An intent name components should use (`color.surface`, `space.stack`). Points at a primitive or another semantic."
		},
		{
			name: "theme",
			form: "theme Name { token = value … }",
			meaning: "A named remap of tokens a person flips — light, dark, reduced motion. Body lines assign existing token names. Themes do not inherit from each other. Not for platform icon sets; those are `catalog`. Studio lists themes in the theme picker. Bake `--theme` accepts only themes. See Theme."
		},
		{
			name: "catalog",
			form: "catalog Name { token = value … }",
			meaning: "A named remap the environment applies — SF Symbols vs Material icons. Same override shape as a theme. Apply with `use catalog Name` inside `mount` only. Studio must not list catalogs in the theme picker. Token stack is base, then user theme(s), then catalogs (catalog wins on shared keys). See Catalog."
		},
		{
			name: "host",
			form: "host Name(params = defaults) [mount { … }]",
			meaning: "An environment profile. Params are what `<Host>` components read. Optional `mount` maps a facts bag onto those params. Every host in the design must share the same param names and types. See Host environment."
		},
		{
			name: "typeStyle",
			form: "typeStyle Name { … }",
			meaning: "A named bundle of text-frame properties. A text frame sets `style = Title`. See typeStyle."
		},
		{
			name: "type",
			form: "type Name = Number(min:, max:)",
			meaning: "A named Number bounds alias (`type PageCount = Number(min: 2, max: 10)`). Contextual at top level — `font.type` stays an ident path."
		},
		{
			name: "variant",
			form: "variant Name { case a; case b }",
			meaning: "A closed set of visual choices (tone, size). Write `.primary` at use sites. Same as enum in v1."
		},
		{
			name: "Repeat",
			form: "Repeat(count:, begin: = 1) { i in … }",
			meaning: "Bake-time generative mount from a count. Prefer Map when the list needs ForEach emit capture. See Repeat."
		},
		{
			name: "Map",
			form: "Map(lo...hi) { i in … }",
			meaning: "Bake-time typed list from a range (compactMap omit). Prefer `let dots: [T] = Map(…)`, then ForEach + `children = dots`. See Map."
		},
		{
			name: "enum",
			form: "enum Name { case a; case b }",
			meaning: "Same as variant in v1. Prefer `enum` for ids (`FilterId`); prefer `variant` for visual axes."
		},
		{
			name: "protocol",
			form: "protocol P: component { … }  or  protocol P { host … }",
			meaning: "A shared contract. Use an API protocol so mixed chips share `select`; use a host protocol so the preview can deliver clicks."
		},
		{
			name: "component",
			form: "component Name(params) kind { … }",
			meaning: "A reusable UI piece: a name, public parameters, and one root frame."
		},
		{
			name: "page",
			form: "page Name(params) kind { … }",
			meaning: "A navigable destination. Same body machine as component. Auto-satisfies prelude `Page`, so a screen can take `content: Page = Home()`."
		},
		{
			name: "screen",
			form: "screen Name(params) kind { … }",
			meaning: "A device shell. Same body machine as component. Studio lists screens as prototype roots. Mount `Presenter(root:)` next to chrome."
		},
		{
			name: "emits",
			form: "emits <P>  or  emits Name { channel(field: Type) }  or  emits(propagation: .ancestors) { … }",
			meaning: "`emits <P>` sends a named protocol (channels, params, `[P]` slots). `emits { … }` declares one-off channels. Default `.parent` stays at the declaring parent. `.ancestors` climbs until a sink that both lists `<P>` and writes `channel(…) =` stops it. Not a click from the preview — that is a host event."
		},
		{
			name: "fixtures",
			form: "fixtures Component { example \"Label\" { param = value } }",
			meaning: "Named preview scenarios (“Empty search”, “Focus mood”). A bag of parameters — not data you put on screen. A Presenter let may be pinned as a stack (`presenter = [Home(), Episode()]`) and an optional cover (`presenter.cover = Settings()`)."
		},
		{
			name: "samples",
			form: "samples Bank { entry { field: Type = … } }",
			meaning: "A reusable catalog of instances you mount so a prototype can stay interactive. Point at `Tracks.library.tracks`."
		},
		{
			name: "usage",
			form: "usage Component { description = \"…\" }",
			meaning: "A written note for authors and tools. In v1 the only key is `description`. See Usage."
		},
		{
			name: "rules",
			form: "rules Component { tags = […]; Rule(.must, …) }",
			meaning: "Checks the design can fail in preview or CI. Tags and Rule lines live only here. See Rule."
		},
		{
			name: "extend",
			form: "extend Component { fixtures { … } usage { … } rules { … } }",
			meaning: "Add fixtures, usage, or rules to an imported component without copying its layout. See Extend."
		}
	],
	theme: {
		meaning: "A named override bundle. Each line is `tokenName = value`. The left side is a declared `primitive` or `semantic` (prefer semantics so components stay stable). The right side is a value of that token’s type — another token, or a literal. The assignment replaces the whole token; there is no field-by-field merge inside a Shadow or Transition. Themes do not inherit. Write one theme per concern (Dark, ReducedMotion) and combine them when you bake or in the Playground — not with `theme Child: Parent`.",
		accept: [
			{
				form: "theme Name { … }",
				meaning: "Declare a named bundle. Name is an identifier, not a string."
			},
			{
				form: "color.surface = color.ink",
				meaning: "Remap a semantic to another token. Preferred."
			},
			{
				form: "color.surface = #111827",
				meaning: "Literal of the token’s type. Fine for a skin; prefer a token ref when the value is reused."
			},
			{
				form: "motion.appear = motion.instant",
				meaning: "Replace a structured token wholly (Transition, Shadow, Background, …)."
			}
		],
		reject: [{
			form: "theme Dark: Light { … }",
			meaning: "Do not author parent/child themes. The `:` form is parsed but is not how themes combine."
		}, {
			form: "shadow.card.x = 2",
			meaning: "No dotted field patch. Assign a new Shadow(…) to `shadow.card`."
		}],
		example: "primitive color.white: Color = #FFFFFF\nprimitive color.ink: Color = #111827\nsemantic color.surface: Color = color.white\nsemantic color.text: Color = color.ink\n\ntheme Dark {\n  color.surface = color.ink\n  color.text = color.white\n}"
	},
	catalog: {
		meaning: "A host-applied token remap. Write the same `token = value` lines as a theme. Do not put catalogs in the theme picker or pass them to bake `--theme` (PDL-E049). Apply them only with `use catalog Name` inside `mount`, so a platform tag can choose Apple icons vs Material icons. After user themes, a catalog wins on shared keys.",
		accept: [{
			form: "catalog AppleIcons { icon.action.favorite = IconRef(…) }",
			meaning: "Declare a named host remap. The name must not collide with a theme (PDL-E003)."
		}, {
			form: "use catalog AppleIcons",
			meaning: "Inside `mount` only. Applies immediately so later `if` arms see the new tokens."
		}],
		reject: [{
			form: "use catalog Dark",
			meaning: "`Dark` is a theme. Catalogs and themes are different roles (PDL-E049)."
		}, {
			form: "component C() layout { use catalog AppleIcons }",
			meaning: "`use catalog` outside `mount` is PDL-E047."
		}],
		example: "primitive icon.base.heart: Icon = IconRef(system: .sfSymbols, name: \"heart\")\nsemantic icon.action.favorite: Icon = icon.base.heart\n\ncatalog AppleIcons {\n  icon.action.favorite = IconRef(system: .sfSymbols, name: \"heart.fill\")\n}\n\nhost Default() mount {\n  if host[\"studio.platform\"] as? String ?? \"unknown\" == \"ios\" {\n    use catalog AppleIcons\n  }\n}"
	},
	host: {
		meaning: "A `host` profile is the pack’s environment contract: named params with defaults, plus an optional `mount` that reads an opaque facts bag and writes those params. Components opt in with `<Host>` (prelude `protocol Host { host }` — no inbound channels). Bake picks a profile (requested name, else `Default`, else the sole host), starts at defaults, runs `mount` once, then any fact whose key equals a host param name pins that param. Every `<Host>` component in that bake sees the same bag. Author-declared params of the same name still win. `WindowSize` / `AppSurface` in labs are pack variants, not language types. Recommended fact keys (not required): `view.width`, `view.height`, `studio.platform`. Playground chrome and fixture `hostFacts` may send those keys, or pin `sizeClass` / `surface` directly.",
		accept: [
			{
				form: "host Default(sizeClass: WindowSize = .medium) mount { … }",
				meaning: "Profile + defaults + `mount`. Name one `Default` when several profiles exist."
			},
			{
				form: "host[\"view.width\"] as? Distance ?? 800",
				meaning: "Soft probe. A miss is none; `??` takes the next arm. Only inside `mount`."
			},
			{
				form: "self.sizeClass = .compact",
				meaning: "Write the host param bag. `<Host>` injection reads this after `mount`."
			},
			{
				form: "component Shell <Host>()",
				meaning: "Opt in. `if sizeClass == .compact` is legal. Without `<Host>` that read is PDL-E007."
			},
			{
				form: "hostFacts = \"{\\\"sizeClass\\\":\\\"compact\\\"}\"",
				meaning: "A fact key that matches a host param pins the bag after `mount`. Playground WindowSize / AppSurface chrome uses this."
			}
		],
		reject: [
			{
				form: "host Phone(width: Distance = 390)  +  host Tablet(sizeClass: WindowSize = .medium)",
				meaning: "Every host in the design must share param names and types (PDL-E045). Defaults may differ."
			},
			{
				form: "host[\"view.width\"] as? Distance",
				meaning: "Not in a component body or token RHS (PDL-E047)."
			},
			{
				form: "component Card() layout { if sizeClass == .compact { … } }",
				meaning: "Molecules do not read the environment. Put `<Host>` on a structural parent."
			}
		],
		example: "variant WindowSize {\n  case compact\n  case medium\n  case expanded\n}\n\nvariant AppSurface {\n  case mobile\n  case watch\n  case web\n}\n\nhost Default(\n  sizeClass: WindowSize = .medium,\n  surface: AppSurface = .mobile,\n  previewBackground: Color = #F4F4F5\n) mount {\n  let width: Distance =\n    host[\"view.width\"] as? Distance\n    ?? 800\n  if width < 600 {\n    self.sizeClass = .compact\n  }\n}\n\ncomponent Shell <Host>() layout {\n  if sizeClass == .compact {\n    direction = .column\n  } else {\n    direction = .row\n  }\n  children = []\n}"
	},
	lets: {
		meaning: "A `let` names something inside a component. Prefer a lowercase id so it does not look like the type: `let title = Text(…)` is a nested frame you mount in `children`. `let save = Button(label: \"Save\")` is a component you declared — instantiate it in a layout the same way. `let ramp: Ramp = Ramp(…)` is a typed value you reuse in props or layers — it is not a view and must not appear in `children`. The id must be unique in the component. Write the `let` before any `children = [id]` or `id.prop` that names it (PDL-E019). A frame let mounts at most once (PDL-E042).",
		accept: [
			{
				form: "let title = Text(…)",
				meaning: "Nested text frame. Mount with `children = [title]`."
			},
			{
				form: "let box = Layout(…)",
				meaning: "Nested layout. Frame constructors: Layout, Text, Icon, Media, Presenter."
			},
			{
				form: "let presenter = Presenter(root: home)",
				meaning: "Navigation hole. `root` is required and must be a `page`. The hole accepts layout box props (`width`, `height`, `padding`, `align`, `justify`); `width` / `height` default to `.fill`. Command it from a capture: `presenter.push(Episode(id: id))` / `presenter.pop()` / `presenter.replace(…)` / `presenter.present(Settings(), style: .cover)` / `presenter.dismiss()`. Fixture pin: `presenter = [Home(), Episode()]` and `presenter.cover = Settings()`."
			},
			{
				form: "let save = Button(label: \"Save\")",
				meaning: "A component you declared. Pass its parameters; mount it in `children` like a frame."
			},
			{
				form: "let ramp: Ramp = Ramp(…)",
				meaning: "Typed value. Reuse in `background = [ramp]`. Not mountable."
			},
			{
				form: "title.color = color.ink",
				meaning: "Assign after the let. The let must appear earlier in the body."
			}
		],
		reject: [
			{
				form: "let id: text = { … }",
				meaning: "Classic kind-colon form is removed (PDL-E001). Use `let id = Text(…)`."
			},
			{
				form: "children = [ramp]",
				meaning: "A typed value let is not a frame. Put it on a property, not in children."
			},
			{
				form: "children = [button, button]",
				meaning: "A let mounts once (PDL-E042). Write `let a = Button(); let b = Button()` or a list."
			}
		],
		example: "component Button(label: String = \"OK\") layout {\n  padding = 12\n  background = #2563EB\n  cornerRadius = 8\n\n  let text = Text(content: label, color: #FFFFFF)\n  children = [text]\n}\n\ncomponent Card() layout {\n  direction = .column\n  gap = 8\n\n  let title = Text(content: \"Hello\")\n  let save = Button(label: \"Save\")\n  let ramp: Ramp = Ramp(\n    direction: .bottomToTop,\n    stops: [\n      GradientStop(color: #F00, opacity: 1, position: 0),\n      GradientStop(color: #00F, opacity: 1, position: 1)\n    ]\n  )\n\n  background = [ramp]\n  children = [title, save]\n}"
	},
	parameters: {
		meaning: "Every name in `component Name(…)` is public inbound surface. Write `name: Type = default`. Types are String, Number, Bool, a token type, a variant/enum you declared, a component or protocol name, or `[Type]` for a list of instances. There is no private parameter and no `expose` filter.",
		accept: [
			{
				form: "label: String = \"Chip\"",
				meaning: "Quoted string default."
			},
			{
				form: "selected: Bool = false",
				meaning: "Boolean. Write `Bool`, not `Boolean`."
			},
			{
				form: "isOn = !isOn",
				meaning: "Invert a Bool parameter in a host handler (or any Bool value position)."
			},
			{
				form: "tone: BannerTone = .success",
				meaning: "A variant/enum you declared. Default is a `.case`."
			},
			{
				form: "gap: Distance = 8",
				meaning: "Token or value builtin, with a literal or token default."
			},
			{
				form: "content: ModalContent = UpsellBody()",
				meaning: "Single slot — a component or protocol instance."
			},
			{
				form: "chips: [FilterChip] = [FilterChip()]",
				meaning: "List of instances. Empty `[]` is allowed."
			}
		],
		reject: [{
			form: "on: Boolean = false",
			meaning: "`Boolean` is PDL-E039. Write `Bool`."
		}],
		example: "enum BannerTone {\n  case success\n  case warning\n}\n\ncomponent Chip(\n  label: String = \"Chip\",\n  selected: Bool = false,\n  tone: BannerTone = .success\n) layout {\n  if tone == .success {\n    background = #16A34A\n  } else {\n    background = #DC2626\n  }\n\n  let text = Text(content: label, color: #FFFFFF)\n  children = [text]\n}"
	},
	conditionals: {
		meaning: "An `if` / `else if` / `else` chain overrides properties when a parameter or state matches. The resolver walks top to bottom and applies only the first matching branch — there is no fall-through. A branch is a flat list of assignments, not a script. Bare `prop = value` updates the enclosing frame (usually the root). `id.prop = value` updates a let. Write the let before any `id.prop` or `children = [id]` (PDL-E019).",
		accept: [
			{
				form: "if tone == .warning { background = color.warn }",
				meaning: "First-match branch. Typical condition is `param == .case`."
			},
			{
				form: "else if tone == .danger { … }",
				meaning: "Tried only when earlier branches missed."
			},
			{
				form: "else { … }",
				meaning: "No condition. Runs when nothing above matched. Omit it when the frame defaults already express the base state."
			},
			{
				form: "statusIcon.color = color.accent",
				meaning: "Dotted assign on a let. Prefer this over nesting `if` inside a constructor."
			},
			{
				form: "if selected { … }",
				meaning: "A Bool parameter is truthy as a condition."
			}
		],
		reject: [{
			form: "if a { … } if a { … }",
			meaning: "Two separate `if`s both run when they match. A chain is first-match only; later `else if` arms do not also apply."
		}, {
			form: "children = [title] … let title = Text(…)",
			meaning: "Forward reference. The let must appear first (PDL-E019)."
		}],
		example: "enum InteractionState {\n  case rest\n  case hovered\n  case pressed\n}\n\ncomponent InteractiveChip(\n  label: String = \"Chip\",\n  interactionState: InteractionState = .rest\n) layout {\n  background = color.button.rest\n\n  if interactionState == .hovered {\n    background = color.button.hover\n  } else if interactionState == .pressed {\n    background = color.button.press\n  }\n\n  let text = Text(content: label)\n  children = [text]\n}"
	},
	typeStyle: {
		meaning: "A named bundle of text-frame properties. Each line is `name = value` using the same property names as a text frame (`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, …). A text frame applies the bundle with `style = Name`. Later frame props win over the style. `style = null` clears the binding.",
		accept: [
			{
				form: "typeStyle Body { fontSize = 16 … }",
				meaning: "Declare a named bundle. Body is text-frame props only."
			},
			{
				form: "style = Body",
				meaning: "Apply the bundle on a text frame (constructor arg or assignment)."
			},
			{
				form: "style = null",
				meaning: "Clear the type-style binding without inventing typography literals."
			}
		],
		reject: [{
			form: "typeStyle Card { direction = .row }",
			meaning: "Layout props are not text-frame props."
		}],
		example: "typeStyle Heading {\n  fontFamily = \"Inter\"\n  fontSize = 24\n  fontWeight = 700\n  lineHeight = 1.35\n}\n\ncomponent TypographyShowcase() layout {\n  direction = .column\n  gap = 8\n  let heading = Text(content: \"Heading style sample\", style: Heading)\n  children = [heading]\n}"
	},
	null: {
		meaning: "The word `null` means pretend this property was never set. Use it on a frame or typeStyle property to erase a prior value so the default applies. It is not a Color, Opacity, or other token. `gap = null` clears `gap` only — it does not clear `columnGap` or `rowGap`.",
		accept: [
			{
				form: "borderColor = null",
				meaning: "Unset. Often means absent (no border color)."
			},
			{
				form: "style = null",
				meaning: "Clear the type-style binding on a text frame."
			},
			{
				form: "color = null",
				meaning: "After `style = Title`, clears that property even if the style contributed it."
			},
			{
				form: "gap = null",
				meaning: "Unsets `gap` only. Does not clear `columnGap` / `rowGap`."
			}
		],
		reject: [{
			form: "primitive color.none: Color = null",
			meaning: "Not a token RHS (PDL-E005). Use a domain empty such as `borderWidth = 0` when that is the value."
		}],
		example: "component Cleared() layout {\n  borderColor = #0066FF\n  borderColor = null\n}"
	},
	conditions: {
		meaning: "What you write after `if` (and inside ForEach). Compare a parameter to a `.case`, test a Bool, negate, or combine with `&&` / `||`. Do not mix `&&` and `||` in one expression without parentheses.",
		accept: [
			{
				form: "tone == .warning",
				meaning: "Parameter equals a variant case."
			},
			{
				form: "self.currentFilter == filter",
				meaning: "Same-type compare. `self.` is the enclosing component; bare `filter` is often a ForEach item field."
			},
			{
				form: "selected",
				meaning: "A Bool is truthy on its own."
			},
			{
				form: "!selected",
				meaning: "Negation in a condition (`if !selected { … }`). Same `!` also inverts a Bool value (`isOn = !isOn`, `hidden = !selected`, kwargs)."
			},
			{
				form: "a && b",
				meaning: "Both. Do not mix with `||` unless you parenthesize."
			},
			{
				form: "a || b",
				meaning: "Either. Do not mix with `&&` unless you parenthesize."
			}
		],
		reject: [{
			form: "a && b || c",
			meaning: "Ambiguous. Write `(a && b) || c` or `a && (b || c)`."
		}],
		example: "variant BannerTone {\n  case success\n  case warning\n}\n\ncomponent Flag(on: Bool = false, tone: BannerTone = .success) layout {\n  if on && tone == .warning {\n    background = color.warn\n  }\n}"
	},
	syntax: {
		meaning: "Identifiers are letters, digits, `_`, and `.` where the grammar allows (`MyComponent`, `color.text.primary`). Line comments are `// …`. Block comments are `/* … */`. Hex colors are not strings — write `#RRGGBB`, not `\"#RRGGBB\"`. Numbers are unitless; there is no `px` suffix.",
		accept: [
			{
				form: "// line comment",
				meaning: "To end of line. Treated as whitespace."
			},
			{
				form: "/* block */",
				meaning: "May span lines."
			},
			{
				form: "#1E293B",
				meaning: "A Color literal, not a string."
			},
			{
				form: "12",
				meaning: "Unitless number. Distance and Size are design units (pixels in HTML preview)."
			}
		],
		reject: [{
			form: "\"#1E293B\"",
			meaning: "Quoted hex is PDL-E017."
		}, {
			form: "12px",
			meaning: "No unit suffix."
		}],
		example: "// Shared palette\nprimitive color.ink: Color = #111827  // inline\n\n/*\n  Block comment.\n*/\ncomponent Note() layout {\n  gap = 12\n}"
	},
	files: {
		meaning: "The entry `.pdl` file is the root of the merged design. `import \"relative/path.pdl\"` pulls another module. There is no export — after merge, names are just names. Paths are relative to the importing file. Token names (`primitive` / `semantic`) are unique across the graph (PDL-E003). Themes, components, and most other top-level kinds: later wins. Import cycles are PDL-E002. The entry file’s own declarations merge last.",
		accept: [{
			form: "import \"design/tokens.pdl\"",
			meaning: "Relative to this file. Merges that module into the design."
		}, {
			form: "previewBackground = color.surface",
			meaning: "Canvas color for preview. A Color token, not a layout property."
		}],
		reject: [
			{
				form: "export component Card",
				meaning: "There is no export keyword. Import the file that declares the name."
			},
			{
				form: "import \"a.pdl\" that imports this file",
				meaning: "Cycles are PDL-E002."
			},
			{
				form: "primitive color.ink: Color = #111 in two files",
				meaning: "Token redeclaration is PDL-E003."
			}
		],
		example: "previewBackground = color.surface\n\nimport \"design/tokens.pdl\"\nimport \"design/themes.pdl\"\nimport \"design/buttons.pdl\""
	},
	arrayChildren: {
		meaning: "A list parameter (`chips: [FilterChip]`) mounts when it appears in `children`. `children = chips` and `children = [chips]` both splice the list in place. Mix siblings with brackets: `children = [header, chips, footer]`. A single slot (`content: ModalContent = UpsellBody()`) also expands in `children`. Dotted override `slot.field = value` is legal on a single slot — if `field` is a param it overrides the instance; otherwise it sets a root-frame prop. Array slots cannot use `slots.foo =` (PDL-E034); use ForEach.",
		accept: [{
			form: "children = chips",
			meaning: "Mount the list. Same as `children = [chips]`."
		}, {
			form: "children = [header, chips, footer]",
			meaning: "Compose: lists splice among siblings."
		}],
		reject: [{
			form: "slots.title = \"X\"",
			meaning: "Dotted override on an array slot is PDL-E034. Use ForEach."
		}],
		example: "component Modal(\n  chromeTitle: String = \"Dialog\",\n  slots: [ModalContent] = [UpsellBody()]\n) layout {\n  let header = Text(content: chromeTitle)\n  children = [header, slots]\n}"
	},
	variants: {
		meaning: "A `variant` (and `enum`, the same construct in v1) is a finite set of named cases. Use it as a parameter type and in conditions. Case names are identifiers without dots. At use sites write `.caseName`. Prefer `variant` for visual axes (tone, size); prefer `enum` for ids and state sets. Tooling may treat the keywords differently later.",
		accept: [
			{
				form: "variant BannerTone { case success; case warning }",
				meaning: "Declare cases. Semicolons or newlines are fine."
			},
			{
				form: "enum FilterId { case all; case pop }",
				meaning: "Same as variant in v1."
			},
			{
				form: "tone: BannerTone = .success",
				meaning: "Parameter type and `.case` default."
			},
			{
				form: "if tone == .warning { … }",
				meaning: "Compare to a case in a condition."
			}
		],
		reject: [{
			form: "tone = success",
			meaning: "Cases need the leading dot: `.success`."
		}],
		example: "variant BannerTone {\n  case success\n  case warning\n  case danger\n}\n\nenum FilterId {\n  case all\n  case podcasts\n}\n\ncomponent StatusBanner(\n  label: String = \"Fine\",\n  tone: BannerTone = .success\n) layout {\n  if tone == .warning {\n    background = color.warn\n  }\n  let text = Text(content: label)\n  children = [text]\n}"
	},
	self: {
		meaning: "`self` is the enclosing component instance — not a frame id. `self.param` in a value or condition names that component’s parameter (the escape hatch when a ForEach item field would shadow). `self.prop = value` (not a brace block) sets a root-frame property. `self.channel = { … }` is a host inbound handler (`self.` is optional in the kind body). Inside `rules`, `self` is the instance whose rules block is running — a different namespace.",
		accept: [
			{
				form: "self.currentFilter",
				meaning: "Enclosing component parameter. Prefer this in ForEach when the item might shadow the name."
			},
			{
				form: "self.background = #333",
				meaning: "Root frame property of this component — never an intermediate let."
			},
			{
				form: "self.pressEnd = { … }",
				meaning: "Host inbound handler. Bare `pressEnd = { … }` is the same. Legal at the top of the kind body or inside layout `if` / `else` (conditions are preserved on the handler)."
			},
			{
				form: "Rule(.should, self == parent.children.last, description: \"…\")",
				meaning: "Rules-query `self` — the instance being checked, not layout `self`."
			}
		],
		reject: [{
			form: "children = [self]",
			meaning: "`self` is not a frame id. Mount lets and slots, not `self`."
		}],
		example: "component LibrarySubnav(\n  currentFilter: FilterId = .all,\n  chips: [FilterChip] = [FilterChip(filter: .all)]\n) layout {\n  ForEach(chips) { chip in\n    chip.selected = self.currentFilter == filter\n  }\n  self.background = color.surface\n  children = chips\n}"
	},
	motion: {
		meaning: "Host handler bodies assign motion with `animate =` (event target) and/or `let.animate =` (named let). Several animate statements in one handler — and every `animate =` that fires in the same turn via emit capture — run as **parallel tracks** that start together with independent clocks. Within one Animation / pose list, keys stay sequential. Prefer `Animation` (optional start Pose, sequential Motion keys, optional Stagger and repeat). Handler land sugar: `animate = Motion(duration:, ease:)` (no flourish pose) means tween to the bake after this handler’s param writes / emits — `.rest` is that still (paint + FLIP as needed). Flourish beats use `Animation(keys: […, Motion(…, pose: .rest)])`; that track’s land also starts at t=0 (not after the beats). Emit-capture bodies take bare `animate =` (group land) and `list.animate =` (chorus flourish on every ForEach mount of that array param / Map let; the pressed child is skipped so its own press animate owns the solo). Completion-based sequencing is deferred. Bake stays at rest; the HTML host plays overlays and land. Units: Duration is milliseconds; translate and blur are CSS pixels; scale is unitless; opacity is 0…1; rotate is degrees; originX / originY are 0…1. Appear authors `start:` then a Motion to `.rest`. Dismiss authors keys to an exit pose. Standing loops use `repeat: .forever`.",
		accept: [
			{
				form: "animate = [ Pose(scale: 1.12), Pose(scale: 0.96), .rest ]\nselected = !selected",
				meaning: "Pose-list sugar: default 200ms `.out` beats; land on the post-handler still starts at t=0 in parallel with the beats."
			},
			{
				form: "animate = Motion(duration: 200, ease: .out)",
				meaning: "Handler land sugar: clock-only. Host First→mutate→Last; paint/FLIP under `.rest`."
			},
			{
				form: "animate = Animation(keys: [Motion(duration: 90, ease: .out, pose: Pose(scale: 1.12)), Motion(duration: 200, ease: .out, pose: .rest)])\nselected = !selected",
				meaning: "Flourish keys sequential; land clock starts with the first beat (parallel with flourish)."
			},
			{
				form: "animate = Animation(start: Pose(opacity: 0, translateY: 8), keys: [Motion(duration: 250, ease: .out, pose: .rest)])",
				meaning: "Appear: snap start, ease to rest."
			},
			{
				form: "knob.animate = Animation(keys: [Motion(duration: 200, ease: .out, pose: Pose(scale: 0.96))])",
				meaning: "Targeted shot on a named let."
			},
			{
				form: "frame1.animate = Animation(keys: [Motion(duration: 500, ease: .out, pose: Pose(scale: 1.08))])\nframe2.animate = Animation(keys: [Motion(duration: 1000, ease: .out, pose: Pose(opacity: 0.6))])",
				meaning: "Two independent Animations on two lets from one pressEnd."
			},
			{
				form: "animate = Animation(keys: [Motion(duration: 220, ease: .out, pose: Pose(opacity: 0))], stagger: Stagger(step: 30, from: .first))",
				meaning: "Stagger direct children through this Animation."
			},
			{
				form: "if isLoading { icon.animate = motion.spin }",
				meaning: "Standing overlay while the if is true; omit when false. Token should use repeat: .forever."
			},
			{
				form: "self.animate = motion.spin",
				meaning: "In a handler, same as bare `animate =`. In layout, standing animate on the component root."
			},
			{
				form: "dot.select(page: Number) = {\n  dots.animate = [ Pose(scale: 0.9), .rest ]\n  animate = Motion(duration: 500, ease: .linear)\n  currentPage = page\n}",
				meaning: "List chorus: flourish on every ForEach mount of `dots` (skips the pressed child, which owns its own press animate). Bare `animate =` still lands the whole rebake. All tracks start at t=0."
			},
			{
				form: "dot.select(page: Number) = {\n  animate = Motion(duration: 500, ease: .linear)\n  currentPage = page\n}",
				meaning: "Emit capture land: tween this component's whole rebake — every dot, not just the pressed one. Starts with any child press animate in the same turn."
			}
		],
		reject: [
			{
				form: "animate = Motion(duration: 200, ease: .out, pose: Pose(scale: 1.1))",
				meaning: "Land sugar cannot take a flourish pose — wrap beats in Animation(keys:)."
			},
			{
				form: "dot.select(page: Number) = {\n  animation = Motion(duration: 500, ease: .linear)\n}",
				meaning: "`animation` is not a statement — the keyword is `animate`. Unknown param is PDL-E007."
			},
			{
				form: "dot.select(page: Number) = {\n  knob.animate = Animation(keys: [Motion(duration: 200, ease: .out, pose: .rest)])\n}",
				meaning: "Capture list chorus is `list.animate` (array param or Map let). A single-let target belongs on that frame's own handler."
			},
			{
				form: "animate = Timing(duration: 200, ease: .out)",
				meaning: "Timing is not animate sugar — use Motion(duration:, ease:) land sugar or Animation."
			},
			{
				form: "Animation(keys: […], play: .toRest)",
				meaning: "`play:` is removed — put `.rest` on a Motion pose."
			},
			{
				form: "from { opacity = 0 }",
				meaning: "Removed. Write `start: Pose(opacity: 0)` on Animation."
			}
		],
		example: "component Modal <PointerInput>() layout {\n  let title = Text(content: \"Hello\")\n  children = [title]\n  self.appear = {\n    animate = Animation(\n      start: Pose(opacity: 0, scale: 0.95),\n      keys: [Motion(duration: 250, ease: .out, pose: .rest)],\n      stagger: Stagger(step: 30, from: .first)\n    )\n  }\n  self.dismiss = {\n    animate = Animation(keys: [Motion(duration: 180, ease: .in, pose: Pose(opacity: 0, scale: 0.95))])\n  }\n}"
	},
	eventDirections: [
		{
			name: "emits",
			direction: "Child → parent",
			wire: "`emit select(filter)` in a host handler; parent writes `item.select(…) = { … }`",
			meaning: "The child tells the parent something happened (selected, changed)."
		},
		{
			name: "host inbound",
			direction: "Environment → component",
			wire: "`self.pressEnd = { … }` in the component body (self. is optional)",
			meaning: "The preview tells the component the user hovered, clicked, or typed. Opt in with `<PointerInput>` or `<EditableText>`."
		},
		{
			name: "host verbs",
			direction: "Component → environment",
			wire: "`beginEditing(value)` inside a handler",
			meaning: "The component asks the preview to do something — start or end typing."
		}
	],
	eventDirectionsExample: "component Chip <PointerInput>(title: String = \"All\") layout {\n  let label = Text(content: title)\n  children = [label]\n  self.pressEnd = { emit select(title) }\n} emits {\n  select(title: String)\n}",
	emitExample: "enum FilterId {\n  case all\n  case podcasts\n}\n\ncomponent FilterChip <PointerInput>(\n  title: String = \"All\",\n  filter: FilterId = .all,\n  selected: Bool = false\n) layout {\n  let label = Text(content: title)\n  children = [label]\n  self.pressEnd = { emit select(filter) }\n} emits {\n  select(filter: FilterId)\n}\n\ncomponent FilterBar(currentFilter: FilterId = .all) layout {\n  let all = FilterChip(title: \"All\", filter: .all, selected: currentFilter == .all)\n  let podcasts = FilterChip(title: \"Podcasts\", filter: .podcasts, selected: currentFilter == .podcasts)\n  children = [all, podcasts]\n  all.select(filter_id: FilterId) = { currentFilter = filter_id }\n  podcasts.select(filter_id: FilterId) = { currentFilter = filter_id }\n}",
	emitForms: [
		{
			form: "emits C { select(filter: FilterId) }",
			meaning: "Declare what this component can tell its parent, in a separate block. Each field needs a type."
		},
		{
			form: "} emits { select(filter: FilterId) }",
			meaning: "The same channels, written right after the component body."
		},
		{
			form: "emits <ShowEpisode>  or  } emits <SubnavItem>",
			meaning: "This component sends that protocol — it may `emit` those channels, inherits the protocol’s params, and may fill a `[ShowEpisode]` / `[SubnavItem]` slot. Header form sits before `(params)`; trailing form sits after `}`."
		},
		{
			form: "protocol P: component { emits { select(filter: FilterId) } }",
			meaning: "One shared channel for every component that follows the protocol — a mixed list of chips all `select`."
		},
		{
			form: "emits(propagation: .parent) { select(filter: FilterId) }",
			meaning: "Same as omitting the argument. The immediate parent must capture on the child let."
		},
		{
			form: "emits(propagation: .ancestors) { showEpisode(id: EpisodeId) }",
			meaning: "Unhandled emits climb ancestors until a bare `showEpisode(id:) = { … }` stops them. Catalogue records `propagation` only when it is not `.parent`."
		},
		{
			form: "showEpisode(id: EpisodeId) = { … }",
			meaning: "Ancestor capture on this node — usually the screen. The sink must also list the protocol in receive `<>` (`screen Phone <ShowEpisode>`). Not `ShowEpisode.showEpisode` and not `presenter.showEpisode`."
		},
		{
			form: "emit select(filter)",
			meaning: "Fire the channel from a click (or other host handler). Pass values that match the declared types."
		},
		{
			form: "emit open(self)",
			meaning: "Send this whole instance to the parent — “open this row.”"
		},
		{
			form: "all.select(filter_id: FilterId) = { … }",
			meaning: "The parent hears one named child (`All`) and updates its own state."
		},
		{
			form: "chip.select(filter_id: FilterId) = { … }",
			meaning: "The parent hears each item in a list. Write this on `chip`, not on `chips`."
		}
	],
	protocolForms: [
		{
			form: "protocol P: component { … }",
			meaning: "A contract for components that share parameters and emits. Use for mixed lists and slots."
		},
		{
			form: "protocol P { host … }",
			meaning: "A contract with the preview — clicks, editing. Not something you put in a list."
		},
		{
			form: "component C <P, Q>(…) kind { … }",
			meaning: "Receive list. Host inbound (`PointerInput`, `EditableText`, `Host`) and ancestor-sink APIs (`ShowEpisode`). Multiple sinks are allowed (`<ShowEpisode, AppNav>`)."
		},
		{
			form: "component C <PointerInput> emits <ShowEpisode>(…) kind { … }",
			meaning: "Receive host clicks; send the nav protocol. Same protocol cannot appear in both lists."
		},
		{
			form: "component C emits <SubnavItem>(…) kind { … }",
			meaning: "Send / slot membership. Inherits `SubnavItem` params and `select`; `requires PointerInput` still applies. Param-only APIs (`ModalContent`, `Page`) use this form too."
		},
		{
			form: "screen Phone <ShowEpisode>(…) layout { showEpisode(id:) = { … } }",
			meaning: "The screen is the ancestor sink. It opts in with `<>` and writes the bare handler. Emitters write `emits <ShowEpisode>`."
		},
		{
			form: "component C <Host>()",
			meaning: "Read the active `host` profile’s params. No clicks or typing — that is PointerInput / EditableText. See Host environment."
		},
		{
			form: "page Home() layout { … }",
			meaning: "A destination. Auto-satisfies prelude `Page` without writing `<Page>`."
		},
		{
			form: "screen Phone() layout { let presenter = Presenter(root: home) … }",
			meaning: "A shell. Mount a `Presenter` next to chrome. `Page` is a prelude API protocol; only `page` declarations (or `component C emits <Page>`) fill `root`."
		},
		{
			form: "requires PointerInput",
			meaning: "This API protocol also needs preview events (clicks or typing)."
		},
		{
			form: "title = \"\"",
			meaning: "A parameter every conforming component has."
		}
	],
	protocolExample: "protocol SubnavItem: component {\n  requires PointerInput\n  title = \"\"\n  filter: FilterId = .all\n  emits { select(filter: FilterId) }\n}\n\ncomponent FilterChip emits <SubnavItem>(\n  selected: Bool = false\n) layout {\n  let label = Text(content: title)\n  children = [label]\n  self.pressEnd = { emit select(filter) }\n}\n\ncomponent LibrarySubnav(\n  currentFilter: FilterId = .all,\n  chips: [SubnavItem] = [\n    FilterChip(title: \"All\", filter: .all),\n    FilterChip(title: \"Podcasts\", filter: .podcasts)\n  ]\n) layout {\n  ForEach(chips) { chip in\n    chip.selected = self.currentFilter == filter\n    chip.select(filter_id: FilterId) = { currentFilter = filter_id }\n  }\n  children = chips\n}",
	hostProtocols: [
		{
			name: "PointerInput",
			meaning: "Use this when a component should react to hover, click, focus, or appear/dismiss — a button that changes color on hover, a chip that selects on click. Write `component Chip <PointerInput>` then `self.pressEnd = { … }`.",
			inbound: [
				{
					name: "hoverStart",
					meaning: "Pointer entered the component."
				},
				{
					name: "hoverEnd",
					meaning: "Pointer left the component."
				},
				{
					name: "pressStart",
					meaning: "Pointer or button went down."
				},
				{
					name: "pressEnd",
					meaning: "Pointer or button went up — the usual tap / click complete."
				},
				{
					name: "pressCancel",
					meaning: "The press was aborted (drag-off or system cancel)."
				},
				{
					name: "focusStart",
					meaning: "Keyboard or accessibility focus entered."
				},
				{
					name: "focusEnd",
					meaning: "Focus left."
				},
				{
					name: "activate",
					meaning: "Primary activation (Enter / accessibility activate), distinct from press."
				},
				{
					name: "appear",
					meaning: "The component became visible / entered the tree."
				},
				{
					name: "dismiss",
					meaning: "The host asked this component to dismiss (sheet, modal)."
				}
			],
			verbs: [],
			injected: [],
			example: "component Chip <PointerInput>(title: String = \"All\") layout {\n  let label = Text(content: title)\n  children = [label]\n  self.pressEnd = { emit select(title) }\n} emits {\n  select(title: String)\n}"
		},
		{
			name: "EditableText",
			meaning: "Use this for a field the user can type into. Pair with kind `text`. The preview starts editing on click or focus by default. Show the typed string with `content = self.value`.",
			inbound: [
				{
					name: "editingBegan",
					meaning: "The editing session started."
				},
				{
					name: "editingFinished",
					meaning: "The session committed. Keep `value`."
				},
				{
					name: "editingCancelled",
					meaning: "The session aborted. Restore the checkpoint."
				},
				{
					name: "keyboardDismissed",
					meaning: "Older name for `editingFinished`."
				},
				{
					name: "keyboardCancelled",
					meaning: "Older name for `editingCancelled`."
				}
			],
			verbs: [
				{
					name: "beginEditing",
					form: "beginEditing(startingValue)",
					meaning: "Start a session seeded with this string."
				},
				{
					name: "finishEditing",
					form: "finishEditing()",
					meaning: "Commit the session."
				},
				{
					name: "cancelEditing",
					form: "cancelEditing()",
					meaning: "Abort the session and restore the checkpoint."
				},
				{
					name: "commitEditing",
					form: "commitEditing()",
					meaning: "Older name for `finishEditing()`."
				}
			],
			injected: [
				{
					name: "value",
					type: "String",
					meaning: "What the user has typed. Default \"\"."
				},
				{
					name: "isEditing",
					type: "Bool",
					meaning: "True while the field is being edited."
				},
				{
					name: "isEmpty",
					type: "Bool",
					meaning: "True when `value` is empty."
				},
				{
					name: "isOverLimit",
					type: "Bool",
					meaning: "True when `value` is longer than the host limit."
				},
				{
					name: "activatesOn",
					type: "TextFieldActivation",
					meaning: "When editing starts. Default `.focus`."
				}
			],
			example: "component SearchField <EditableText>(\n  placeholder: String = \"Search\"\n) text {\n  content = placeholder\n  if isEditing {\n    content = self.value\n  } else if !isEmpty {\n    content = self.value\n  }\n  self.editingFinished = {\n    finishEditing()\n    emit change(value)\n  }\n} emits {\n  change(value: String)\n}"
		},
		{
			name: "Host",
			meaning: "Opt in to read the active host profile’s params (`sizeClass`, `previewBackground`, or whatever the pack declared). No inbound channels and no verbs. Use on structural parents only: `component Shell <Host>()` or `component Shell <Host, PointerInput>()`. Bake injects one bag for the whole design: host defaults, then `mount` against `hostFactsJson`, then any fact whose key matches a host param (Playground WindowSize / AppSurface chrome, or a fixture pin). Author params of the same name still win. Reading a host param without `<Host>` is PDL-E007.",
			inbound: [],
			example: "component Shell <Host>() layout {\n  if sizeClass == .compact {\n    direction = .column\n  }\n}"
		}
	],
	preludeEnums: [{
		name: "TextFieldActivation",
		usedOn: ["activatesOn"],
		meaning: "When a text field starts editing. Use `.focus` for the usual click-or-focus field; `.none` if only your code should start editing.",
		cases: [
			{
				case: "focus",
				meaning: "Default. Click, tap, or focus begins editing."
			},
			{
				case: "press",
				meaning: "Begin on press/click only — not bare focus."
			},
			{
				case: "none",
				meaning: "Program-only. Call beginEditing yourself; the leaf hit-test does not begin."
			}
		],
		example: "component Note <EditableText>() text {\n  content = self.value\n  activatesOn = .none\n}"
	}],
	forEachForms: [
		{
			form: "ForEach(chips) { chip in … }",
			meaning: "For each item in the list, write overrides and listen for clicks. The name `chip` is the current item."
		},
		{
			form: "children = chips",
			meaning: "Put the list on screen. ForEach does not do this by itself. Use brackets when mixing siblings: `[Header, chips, Footer]`."
		},
		{
			form: "chip.selected = self.currentFilter == filter",
			meaning: "Set each item from parent state — which chip looks selected. Use `self.` when the parent and item share a name."
		},
		{
			form: "chip.select(filter_id: FilterId) = { … }",
			meaning: "Hear that item’s emit. Write `chip.select`, not `chips.select`."
		},
		{
			form: "if self.currentFilter == filter { chip.selected = true } else { … }",
			meaning: "Same `if` / `else` as layout, evaluated per list item. Prefer `chip.selected = self.currentFilter == filter` when one Bool is enough."
		},
		{
			form: "before { … } / between { … } / after { … }",
			meaning: "Reserved list chrome. Compilers reject these (PDL-E026). Do not invent dividers this way."
		}
	],
	forEachExample: "component LibrarySubnav(\n  currentFilter: FilterId = .all,\n  chips: [FilterChip] = [\n    FilterChip(title: \"All\", filter: .all),\n    FilterChip(title: \"Pop\", filter: .pop)\n  ]\n) layout {\n  ForEach(chips) { chip in\n    chip.selected = self.currentFilter == filter\n    chip.select(filter_id: FilterId) = {\n      currentFilter = filter_id\n    }\n  }\n  children = chips\n}",
	repeatForms: [
		{
			form: "children = Repeat(count: numberOfPages) { i in … }",
			meaning: "Mount `numberOfPages` children. Binder `i` runs 1 … N by default."
		},
		{
			form: "Repeat(count: n, begin: 0) { i in … }",
			meaning: "0-based indices: i ∈ {0, 1, …, n − 1}."
		},
		{
			form: "let dots = Repeat(count: n) { i in … }; children = dots",
			meaning: "Name a Repeat, then mount it like any other child. Same bake expansion as `children = Repeat(…)`."
		},
		{
			form: "LabDot(selected: i == currentPage)",
			meaning: "Equality against another Number param — selection chrome without layout math."
		}
	],
	repeatExample: "type PageCount = Number(min: 2, max: 10)\n\ncomponent PageControl(\n  numberOfPages: PageCount = 5,\n  currentPage: Number(min: 1) = 1\n) layout {\n  children = Repeat(count: numberOfPages) { i in\n    Dot(selected: i == currentPage)\n  }\n}",
	mapForms: [
		{
			form: "let dots: [IosPageDot] = Map(1...numberOfPages) { i in … }",
			meaning: "Bake a typed list from a closed range. Prefer this form when ForEach must wire the list."
		},
		{
			form: "Map(1..<n) { i in … }",
			meaning: "Half-open range: i ∈ {1, …, n − 1}."
		},
		{
			form: "if gate { Dot(page: i) }",
			meaning: "No matching branch / no component expression ⇒ omit that index (compactMap)."
		},
		{
			form: "ForEach(dots) { dot in … }; children = dots",
			meaning: "Wire then mount. Map alone does not draw; ForEach alone does not draw."
		}
	],
	mapExample: "type PageCount = Number(min: 2, max: 10)\n\ncomponent PageDot <PointerInput>(\n  page: Number = 1,\n  selected: Bool = false\n) layout {\n  self.pressEnd = { emit select(page) }\n} emits {\n  select(page: Number)\n}\n\ncomponent PageControl(\n  numberOfPages: PageCount = 5,\n  currentPage: Number(min: 1) = 1\n) layout {\n  let dots: [PageDot] = Map(1...numberOfPages) { i in\n    PageDot(page: i)\n  }\n  ForEach(dots) { dot in\n    dot.selected = self.currentPage == page\n    dot.select(page: Number) = { currentPage = page }\n  }\n  children = dots\n}",
	sampleForms: [
		{
			form: "samples Tracks { focus { tracks: [TrackRow] = [ … ] } }",
			meaning: "Declare a named catalog. A later `samples Tracks` replaces the earlier one. The name must not collide with a component."
		},
		{
			form: "entry { field: Type = value }",
			meaning: "One named slice of the catalog (`focus`, `empty`). Fields are typed. An empty list is real data — no rows."
		},
		{
			form: "Tracks.focus.tracks",
			meaning: "Point at one field: bank, then entry, then field. Use in defaults or layout so the prototype can switch data."
		}
	],
	sampleExample: "samples Tracks {\n  library {\n    tracks: [TrackRow] = [\n      TrackRow(title: \"Neon\", trackId: \"neon\"),\n      TrackRow(title: \"Desk\", trackId: \"desk\")\n    ]\n  }\n  empty {\n    tracks: [TrackRow] = []\n  }\n}\n\ncomponent SampleShelf(\n  mood: MoodId = .all,\n  tracks: [TrackRow] = Tracks.library.tracks\n) layout {\n  let list = Layout(direction: .column, children: [tracks])\n  if mood == .focus {\n    list.children = Tracks.empty.tracks\n  }\n  children = [list]\n}",
	fixtures: {
		meaning: "Write `fixtures Component { … }` next to the component (or inside `extend`). Each `example \"Label\" { … }` is one row in the Fixture menu. The body assigns that component’s parameters to concrete values — a string, a `.case`, a sample path. It may also pin bake knobs: `host`, `theme`, and `hostFacts` (a JSON object string). Those are not component params. It does not write layout, and it does not read other parameters.",
		accept: [
			{
				form: "fixtures Button { example \"Primary\" { … } }",
				meaning: "Named scenarios for one component. The quoted label is what you pick in the Fixture menu."
			},
			{
				form: "example \"Secondary\" { label = \"Cancel\" emphasis = .secondary }",
				meaning: "One scenario. Every assignment is a concrete value."
			},
			{
				form: "example \"Watch\" { host = \"Default\" hostFacts = \"{\\\"view.width\\\":198}\" }",
				meaning: "Pin the host profile and facts bag so review SoT does not depend on Playground resize. A fact key that matches a host param (`sizeClass`, `surface`) pins that param after `mount`."
			},
			{
				form: "tracks = Tracks.empty.tracks",
				meaning: "A field may point at a sample. The fixture still chooses the world; the sample is the catalog."
			}
		],
		reject: [{
			form: "example \"X\" { label = title }",
			meaning: "Not another parameter. Write a literal or a sample path."
		}, {
			form: "fixtures Button { usage { description = \"…\" } }",
			meaning: "`usage`, `rules`, and `extend` are their own blocks. A fixtures block is only examples."
		}],
		example: "variant Emphasis {\n  case primary\n  case secondary\n}\n\ncomponent Button(\n  label: String = \"OK\",\n  emphasis: Emphasis = .primary\n) layout {\n  padding = 12\n  background = #2563EB\n  if emphasis == .secondary {\n    background = #6B7280\n  }\n  let text = Text(content: label, color: #FFFFFF)\n  children = [text]\n}\n\nfixtures Button {\n  example \"Primary\" {\n    label = \"Save\"\n    emphasis = .primary\n  }\n  example \"Secondary\" {\n    label = \"Cancel\"\n    emphasis = .secondary\n  }\n}",
		complexExample: "samples Tracks {\n  library {\n    tracks: [TrackRow] = [\n      TrackRow(title: \"Neon\", trackId: \"neon\"),\n      TrackRow(title: \"Desk\", trackId: \"desk\")\n    ]\n  }\n  focus {\n    tracks: [TrackRow] = [\n      TrackRow(title: \"Desk\", trackId: \"desk\")\n    ]\n  }\n  empty {\n    tracks: [TrackRow] = []\n  }\n}\n\nenum MoodId {\n  case all\n  case focus\n}\n\ncomponent Playlist(\n  mood: MoodId = .all,\n  query: String = \"\",\n  tracks: [TrackRow] = Tracks.library.tracks\n) layout {\n  let list = Layout(direction: .column, children: [tracks])\n  children = [list]\n}\n\nfixtures Playlist {\n  example \"Full library\" {\n    mood = .all\n    tracks = Tracks.library.tracks\n  }\n  example \"Focus\" {\n    mood = .focus\n    tracks = Tracks.focus.tracks\n  }\n  example \"Empty search\" {\n    query = \"zzzz\"\n    tracks = Tracks.empty.tracks\n  }\n}"
	},
	usage: {
		meaning: "A written note attached to a component. Authors and tools read it; it does not change layout. In v1 the only key is `description`. Write `usage Button { … }` next to the component (or inside `extend`).",
		accept: [{
			form: "usage Button { description = \"…\" }",
			meaning: "Replace the note. The name is the component, not a string."
		}, {
			form: "description += \" …\"",
			meaning: "Append with a single space. Use this inside `extend` so a project can add a sentence without wiping the imported note."
		}],
		reject: [{
			form: "usage Button { summary = \"…\" }",
			meaning: "Unknown keys are not defined in v1. Only `description`."
		}, {
			form: "component Button() layout { usage { … } }",
			meaning: "`usage` is a top-level companion, not a frame property."
		}],
		example: "usage Button {\n  description = \"Primary actions for forms. Prefer `emphasis = .primary` for one CTA per surface.\"\n}"
	},
	extend: {
		meaning: "Add fixtures, usage, or rules to a component that already exists — usually one you imported — without copying its layout. Inner sections follow the same rules as standalone blocks. `description =` replaces; `description +=` appends. A later `tags =` replaces the whole tags array; `Rule(…)` lines append.",
		accept: [
			{
				form: "extend Button { fixtures { example \"…\" { … } } }",
				meaning: "Add or replace a fixture by its label."
			},
			{
				form: "extend Button { usage { description += \" …\" } }",
				meaning: "Append to the imported note."
			},
			{
				form: "extend Button { rules { Rule(.should, …) } }",
				meaning: "Append a check. `tags =` in a later file replaces the tags array."
			}
		],
		reject: [{
			form: "extend BannerTone { … }",
			meaning: "Only components. There is no `extend` for a variant or token."
		}, {
			form: "extend Button { direction = .row }",
			meaning: "Extend does not edit layout. Change the source component, or wrap it."
		}],
		example: "extend Button {\n  fixtures {\n    example \"Project-specific\" { label = \"Submit request\" }\n  }\n  usage {\n    description += \" In this project, always pair with a cancel action.\"\n  }\n}"
	},
	rule: {
		meaning: "Write `Rule(strength, query)` inside `rules Component { … }`. The query is true or false from this instance. `.must` / `.mustNot` fail validation; `.should` / `.shouldNot` warn. Optional `description:` is what authors see. `tags =` replaces the tag list; `tags.add` appends. An `if` in this block chooses tags and Rule lines from parameters — it does not restyle the frame. Rules-query `self` is this instance, not layout `self`.",
		accept: [
			{
				form: "rules Button { tags = [\"button\"]; Rule(.must, …) }",
				meaning: "Attach checks to a component. Tags are strings this instance can be found by."
			},
			{
				form: "Rule(.mustNot, siblings.where(tag: \"primary-action\").count > 0, description: \"…\")",
				meaning: "If the query matches, fail. Optional `description` is what authors see."
			},
			{
				form: "Rule(.should, self == parent.children.last, description: \"…\")",
				meaning: "A softer check. Rules-query `self` is this instance — not layout `self`."
			},
			{
				form: "if emphasis == .primary { tags.add(\"primary-action\") }",
				meaning: "Inside `rules`, `if` chooses tags and Rule lines from parameters. It does not restyle the frame."
			},
			{
				form: "Rule(.must, siblings.where(tag: \"field-label\").precedes(self), description: \"…\")",
				meaning: "Order in the parent’s children. Also `.follows` and `.adjacentTo`."
			}
		],
		reject: [{
			form: "component Button() layout { tags = [\"button\"] }",
			meaning: "Tags are not frame properties. Put them in `rules`."
		}, {
			form: "Rule(.must, …) in a layout body",
			meaning: "`Rule` is not a frame constructor. It only belongs in `rules`."
		}],
		example: "rules Button {\n  tags = [\"button\"]\n  if emphasis == .primary {\n    tags.add(\"primary-action\")\n    Rule(.mustNot, siblings.where(tag: \"primary-action\").count > 0,\n      description: \"Only one primary button in this layout.\")\n  }\n}",
		examples: [
			{
				title: "One primary action",
				code: "variant Emphasis {\n  case primary\n  case secondary\n}\n\ncomponent Button(\n  label: String = \"OK\",\n  emphasis: Emphasis = .primary\n) layout {\n  let text = Text(content: label)\n  children = [text]\n}\n\nrules Button {\n  tags = [\"button\"]\n\n  if emphasis == .primary {\n    tags.add(\"primary-action\")\n    Rule(.mustNot, siblings.where(tag: \"primary-action\").count > 0,\n      description: \"Only one primary button in this layout.\")\n  }\n}"
			},
			{
				title: "How many tabs",
				code: "component Tab(label: String = \"Tab\") layout {\n  let text = Text(content: label)\n  children = [text]\n}\n\nrules Tab {\n  tags = [\"tab-item\"]\n}\n\ncomponent TabBar(tabs: [Tab] = [Tab(), Tab()]) layout {\n  direction = .row\n  children = [tabs]\n}\n\nrules TabBar {\n  tags = [\"tab-bar\"]\n  Rule(.must, children.where(tag: \"tab-item\").count.between(2, 5),\n    description: \"A tab bar must have between 2 and 5 tabs.\")\n}"
			},
			{
				title: "Sit last in the parent",
				code: "rules TabBar {\n  tags = [\"tab-bar\"]\n  Rule(.should, self == parent.children.last,\n    description: \"A tab bar should sit last among its siblings — usually the bottom of a column.\")\n}"
			},
			{
				title: "A label before the field",
				code: "component FieldLabel(content: String = \"Name\") text {\n  content = content\n}\n\nrules FieldLabel {\n  tags = [\"field-label\"]\n}\n\ncomponent Field(value: String = \"\") layout {\n  let text = Text(content: value)\n  children = [text]\n}\n\nrules Field {\n  tags = [\"field\"]\n  Rule(.must, siblings.where(tag: \"field-label\").precedes(self),\n    description: \"A field must have a label sibling before it in the same parent.\")\n}"
			},
			{
				title: "Do not leave a card empty",
				code: "rules Card {\n  tags = [\"card\"]\n  Rule(.should, descendants.exists,\n    description: \"A card should contain at least one nested instance.\")\n}"
			}
		]
	},
	ruleQuery: {
		meaning: "Use rules to catch design mistakes the preview or CI can flag — only one primary button, a tab bar must have 2–5 tabs. An `if` in a frame changes how something looks; a Rule does not.",
		example: "rules Button {\n  tags = [\"button\", \"interactive\"]\n\n  if emphasis == .primary {\n    tags.add(\"primary-action\")\n    Rule(.mustNot, siblings.where(tag: \"primary-action\").count > 0,\n      description: \"Only one primary button in this layout.\")\n  }\n}\n\nrules TabBar {\n  tags = [\"tab-bar\"]\n  Rule(.must, children.where(tag: \"tab-item\").count.between(2, 5),\n    description: \"A tab bar has between 2 and 5 tabs.\")\n  Rule(.should, self == parent.children.last,\n    description: \"A tab bar usually sits at the bottom of its parent.\")\n}",
		navigators: [
			{
				name: "self",
				meaning: "This component instance (the one whose `rules` block is running)."
			},
			{
				name: "parent",
				meaning: "The instance that contains this one. Empty at the design root."
			},
			{
				name: "ancestors",
				meaning: "Walk upward toward the root."
			},
			{
				name: "descendants",
				meaning: "Walk downward through nested instances."
			},
			{
				name: "siblings",
				meaning: "Other children of the same parent."
			},
			{
				name: "children",
				meaning: "Direct children only."
			}
		],
		filters: [{
			form: ".where(tag: \"name\")",
			meaning: "Keep instances tagged with that name. Tags come only from `rules` blocks."
		}],
		aggregates: [
			{
				form: ".exists",
				meaning: "True if any node matches."
			},
			{
				form: ".count",
				meaning: "Number of matches."
			},
			{
				form: ".first / .last",
				meaning: "Optional node, for ordering predicates."
			},
			{
				form: ".between(n, m)",
				meaning: "Inclusive range on a count."
			}
		],
		ordering: [
			{
				form: ".precedes(self)",
				meaning: "Some match appears before self in the parent’s children order."
			},
			{
				form: ".follows(self)",
				meaning: "Some match appears after self."
			},
			{
				form: ".adjacentTo(self)",
				meaning: "Some match is immediately next to self."
			}
		]
	}
}, Sw = new Map((xw.enums ?? []).map((e) => [e.name, e])), Cw = new Map([...xw.types ?? [], ...xw.tokenTypes ?? []].map((e) => [e.name, e]));
function ww(e, t) {
	let n = aw(e, t);
	if (!n) return {
		editor: "text",
		prop: t,
		typeId: null
	};
	let r = YC.valueKinds?.[n];
	if (!r) return {
		editor: "text",
		prop: t,
		typeId: n
	};
	if (r.typeName && Array.isArray(r.cases) && r.cases.length) {
		let e = Tw(r.typeName);
		return {
			editor: "enum",
			prop: t,
			typeId: n,
			allowEmpty: !0,
			options: r.cases.map((t) => ({
				value: `.${t}`,
				label: `.${t}`,
				meaning: e.get(t)
			}))
		};
	}
	let i = r.tokenTypes?.[0] || (n === "sizing" ? "Sizing" : null), a = i ? Cw.get(i) : null, o = a ? Ew(a.accept ?? []) : [];
	return o.some((e) => e.kind === "dotCase" || e.kind === "dotCall" || e.kind === "constructor") ? {
		editor: "accept",
		prop: t,
		typeId: n,
		allowEmpty: !0,
		modes: o
	} : {
		editor: "text",
		prop: t,
		typeId: n
	};
}
function Tw(e) {
	let t = Sw.get(e), n = /* @__PURE__ */ new Map();
	for (let e of t?.cases ?? []) e?.case && n.set(e.case, e.meaning || "");
	return n;
}
function Ew(e) {
	let t = [], n = /* @__PURE__ */ new Set();
	for (let r of e || []) {
		let e = String(r?.form ?? "").trim();
		if (!e || e.startsWith("\"") || e.startsWith("'")) continue;
		let i = Dw(e, r.meaning);
		i && (n.has(i.id) || (n.add(i.id), t.push(i)));
	}
	return t;
}
function Dw(e, t) {
	let n = /^\.([A-Za-z_][\w]*)$/.exec(e);
	if (n) return {
		id: n[1],
		label: e,
		meaning: t,
		kind: "dotCase",
		args: [],
		form: e
	};
	if (n = /^\.([A-Za-z_][\w]*)\((.*)\)$/.exec(e), n) return {
		id: n[1],
		label: e,
		meaning: t,
		kind: "dotCall",
		args: Ow(n[2]),
		form: e
	};
	if (n = /^([A-Z][A-Za-z0-9_]*)\((.*)\)$/.exec(e), n) {
		let r = Ow(n[2]);
		return {
			id: r.length > 0 ? `${n[1]}(${r.map((e) => e.labeled ? `${e.name}:` : e.name).join(", ")})` : n[1],
			label: e,
			meaning: t,
			kind: "constructor",
			ctor: n[1],
			args: r,
			form: e
		};
	}
	return /^-?\d+(\.\d+)?$/.test(e) ? {
		id: "number",
		label: "number",
		meaning: t,
		kind: "number",
		args: [{
			name: "value",
			labeled: !1
		}],
		form: e
	} : /^[a-z][\w.]*$/i.test(e) && e.includes(".") ? {
		id: "token",
		label: "token",
		meaning: t || "A token reference",
		kind: "token",
		args: [{
			name: "name",
			labeled: !1
		}],
		form: e
	} : null;
}
function Ow(e) {
	let t = String(e || "").trim();
	if (!t || t === "…" || t === "...") return [];
	let n = [];
	for (let e of t.split(",")) {
		let t = e.trim();
		if (!t || t === "…" || t === "...") continue;
		let r = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(t);
		if (r) {
			n.push({
				name: r[1],
				labeled: !0
			});
			continue;
		}
		let i = /^([A-Za-z_][\w]*)$/.exec(t);
		if (i) {
			n.push({
				name: i[1],
				labeled: !1
			});
			continue;
		}
	}
	return n;
}
function kw(e, t) {
	let n = {
		modeId: "",
		args: {}
	};
	if (t == null || t === "") return n;
	if (t && typeof t == "object") {
		let r = t;
		if (typeof r.mode == "string" && e.some((e) => e.id === r.mode)) {
			let e = {};
			if (r.mode === "fixed" && r.fixed != null && (e.n = String(r.fixed)), r.flexArgs && typeof r.flexArgs == "object") for (let [t, n] of Object.entries(r.flexArgs)) n != null && (e[t] = Lw(n));
			return r.aspect != null && (e.r = Lw(r.aspect)), {
				modeId: r.mode,
				args: e
			};
		}
		if (r.fixed != null && e.some((e) => e.id === "fixed")) return {
			modeId: "fixed",
			args: { n: String(r.fixed) }
		};
		if (r.flexArgs && e.some((e) => e.id === "flex")) {
			let e = {};
			for (let [t, n] of Object.entries(r.flexArgs)) n != null && (e[t] = Lw(n));
			return {
				modeId: "flex",
				args: e
			};
		}
		let i = Aw(e, r);
		if (i) return i;
		let a = jw(e, r);
		if (a) return a;
		try {
			let n = qC(t);
			if (typeof n == "string" && n && !n.startsWith("{")) return kw(e, n);
		} catch {}
		return n;
	}
	if (typeof t == "number" && Number.isFinite(t)) return e.some((e) => e.id === "number") ? {
		modeId: "number",
		args: { value: String(t) }
	} : e.some((e) => e.id === "fixed") ? {
		modeId: "fixed",
		args: { n: String(t) }
	} : n;
	let r = String(t).trim();
	if (!r) return n;
	let i = r.replace(/^\./, "");
	if (/^[A-Za-z_][\w]*$/.test(i) && e.some((e) => e.id === i && e.kind === "dotCase")) return {
		modeId: i,
		args: {}
	};
	let a = /^\.?(?:Sizing\.)?([A-Za-z_][\w]*)\((.*)\)\s*$/s.exec(r);
	if (a && e.some((e) => e.id === a[1])) return {
		modeId: a[1],
		args: Pw(a[2], e.find((e) => e.id === a[1]))
	};
	let o = /^([A-Z][A-Za-z0-9_]*)\((.*)\)\s*$/s.exec(r);
	if (o) {
		let t = e.find((e) => e.kind === "constructor" && (e.ctor === o[1] || e.id === o[1] || e.id.startsWith(`${o[1]}(`))), n = [...r.matchAll(/([A-Za-z_][\w]*)\s*:/g)].map((e) => e[1]), i = e.filter((e) => e.kind === "constructor" && (e.ctor === o[1] || e.id.startsWith(`${o[1]}(`))).sort((e, t) => {
			let r = (e) => e.args.filter((e) => n.includes(e.name)).length;
			return r(t) - r(e);
		})[0] || t;
		if (i) return {
			modeId: i.id,
			args: Pw(o[2], i)
		};
	}
	if (/^-?\d+(\.\d+)?$/.test(r)) {
		if (e.some((e) => e.id === "number")) return {
			modeId: "number",
			args: { value: r }
		};
		if (e.some((e) => e.id === "fixed")) return {
			modeId: "fixed",
			args: { n: r }
		};
	}
	return e.some((e) => e.id === "token") && /^[A-Za-z_][\w.]*$/.test(r) ? {
		modeId: "token",
		args: { name: r }
	} : n;
}
function Aw(e, t) {
	let n = t;
	t.kind === "edgeInsets" && t.fields && typeof t.fields == "object" && (n = t.fields);
	let r = "x" in n || "y" in n, i = "top" in n || "right" in n || "bottom" in n || "left" in n;
	if (!r && !i) return null;
	if (i) {
		let t = Nw(n.top), r = Nw(n.right), i = Nw(n.bottom), a = Nw(n.left);
		if (t != null && r != null && i != null && a != null) {
			if (t === r && r === i && i === a && e.some((e) => e.id === "number")) return {
				modeId: "number",
				args: { value: String(t) }
			};
			if (t === i && a === r) {
				let n = Mw(e, "EdgeInsets", ["x", "y"]);
				if (n) return {
					modeId: n.id,
					args: {
						x: String(a),
						y: String(t)
					}
				};
			}
		}
		let o = Mw(e, "EdgeInsets", [
			"top",
			"right",
			"bottom",
			"left"
		]);
		if (o) {
			let e = {};
			for (let t of [
				"top",
				"right",
				"bottom",
				"left"
			]) n[t] != null && (e[t] = Lw(n[t]));
			return {
				modeId: o.id,
				args: e
			};
		}
	}
	if (r) {
		let t = Mw(e, "EdgeInsets", ["x", "y"]);
		if (t) {
			let e = {};
			return n.x != null && (e.x = Lw(n.x)), n.y != null && (e.y = Lw(n.y)), {
				modeId: t.id,
				args: e
			};
		}
	}
	return null;
}
function jw(e, t) {
	if (t.kind !== "corner" && !("tl" in t || "tr" in t || "br" in t || "bl" in t)) return null;
	let n = Mw(e, "Corner", [
		"tl",
		"tr",
		"br",
		"bl"
	]);
	if (!n) return null;
	let r = {};
	for (let e of [
		"tl",
		"tr",
		"br",
		"bl"
	]) t[e] != null && (r[e] = Lw(t[e]));
	return {
		modeId: n.id,
		args: r
	};
}
function Mw(e, t, n) {
	return e.find((e) => e.kind === "constructor" && e.ctor === t && n.every((t) => e.args.some((e) => e.name === t)));
}
function Nw(e) {
	if (typeof e == "number" && Number.isFinite(e)) return e;
	if (e && typeof e == "object") {
		let t = e;
		if (t.kind === "number" && typeof t.value == "number") return t.value;
	}
	return null;
}
function Pw(e, t) {
	let n = {}, r = String(e || "").trim();
	if (!r) return n;
	if (/[A-Za-z_][\w]*\s*:/.test(r)) {
		for (let e of Fw(r)) {
			let t = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(e.trim());
			t && (n[t[1]] = t[2].trim());
		}
		return n;
	}
	let i = t?.args?.find((e) => !e.labeled) || t?.args?.[0];
	return i && (n[i.name] = r), n;
}
function Fw(e) {
	let t = [], n = 0, r = "";
	for (let i of e) {
		if (i === "(" && n++, i === ")" && (n = Math.max(0, n - 1)), i === "," && n === 0) {
			t.push(r), r = "";
			continue;
		}
		r += i;
	}
	return r.trim() && t.push(r), t;
}
function Iw(e, t, n) {
	if (!t) return;
	let r = e.find((e) => e.id === t);
	if (r) {
		if (r.kind === "dotCase") return `.${r.id}`;
		if (r.kind === "number") {
			let e = String(n.value ?? n.n ?? "").trim();
			return e === "" ? void 0 : /^-?\d+(\.\d+)?$/.test(e) ? Number(e) : e;
		}
		if (r.kind === "token") return String(n.name ?? "").trim() || void 0;
		if (r.kind === "dotCall") {
			let e = [];
			for (let t of r.args) {
				let r = String(n[t.name] ?? "").trim();
				r !== "" && e.push(t.labeled ? `${t.name}: ${r}` : r);
			}
			if (!e.length && r.args.length === 1 && !r.args[0].labeled) {
				let e = String(n[r.args[0].name] ?? "").trim();
				return e ? `.${r.id}(${e})` : void 0;
			}
			return `.${r.id}(${e.join(", ")})`;
		}
		if (r.kind === "constructor") {
			let e = [];
			for (let t of r.args) {
				let r = String(n[t.name] ?? "").trim();
				r !== "" && e.push(t.labeled ? `${t.name}: ${r}` : r);
			}
			return `${r.ctor || r.id.replace(/\(.*$/, "")}(${e.join(", ")})`;
		}
	}
}
function Lw(e) {
	if (e == null) return "";
	if (typeof e == "number" || typeof e == "boolean") return String(e);
	if (typeof e == "string") return e;
	if (typeof e == "object") {
		let t = e;
		if (t.kind === "number" && t.value != null || typeof t.value == "number" || typeof t.value == "string") return String(t.value);
	}
	try {
		return JSON.stringify(e);
	} catch {
		return String(e);
	}
}
function Rw(e, t) {
	if (e == null || e === "") return "";
	let n = String(e).trim(), r = n.startsWith(".") ? n : `.${n.replace(/^[A-Z][A-Za-z0-9_]*\./, "")}`;
	if (t.some((e) => e.value === r)) return r;
	let i = /^[A-Z][A-Za-z0-9_]*\.([A-Za-z_][\w]*)$/.exec(n);
	if (i) {
		let e = `.${i[1]}`;
		if (t.some((t) => t.value === e)) return e;
	}
	return r;
}
//#endregion
//#region src/canvas/inspector.js
function zw(e) {
	if (e.instanceOf) return "layout";
	let t = e.kind;
	return t === "text" || t === "icon" || t === "media" || t === "presenter" ? t : "layout";
}
function Bw(e, t, n, r) {
	if (!e || !t) return;
	let i = zw(t);
	e.querySelectorAll("[data-field]").forEach((e) => {
		Kw(e, t, i, n, r, {
			push: !0,
			notify: !1
		});
	});
}
function Vw(e, t, n, r, i, a) {
	if (!e) return;
	if (!t) {
		e.innerHTML = "<p class=\"hint\">Select a layer.</p>";
		return;
	}
	let o = zw(t), s = ow(o), c = Object.keys(n ?? {}), l = yC(n, r || void 0), u = [];
	if (u.push(`<div class="canvas-insp-head"><strong>${Zw(t.label)}</strong><span class="hint">${Zw(t.kind)}${t.instanceOf ? ` · ${Zw(t.instanceOf)}` : ""}</span></div>`), l) {
		u.push(`<div class="canvas-warn">${Zw(l)}</div>`), u.push("<div class=\"canvas-axis-pick\" role=\"group\" aria-label=\"Own property axis\">");
		for (let e of c) u.push(`<button type="button" class="seg${r === e ? " is-active" : ""}" data-choose-axis="${Qw(e)}">${Zw(e)}=.${Zw(n[e])}</button>`);
		u.push("</div>");
	}
	u.push("<div class=\"canvas-insp-fields\">");
	for (let e of s) {
		let n = tC(t.id, e, t.props), r = ww(o, e);
		u.push(Hw(e, r, n));
	}
	u.push("</div>"), u.push(`<div class="canvas-insp-actions">
    ${t.id.startsWith("let:") ? "<button type=\"button\" class=\"btn ghost btn-tiny\" id=\"canvasDeleteLayer\">Delete layer</button>" : "<p class=\"hint\">Add/reorder layers in the panel on the left.</p>"}
  </div>`), e.innerHTML = u.join(""), e.querySelectorAll("[data-choose-axis]").forEach((e) => {
		e.addEventListener("click", () => {
			let t = e.getAttribute("data-choose-axis");
			t && i(t);
		});
	}), e.querySelectorAll("[data-field]").forEach((e) => {
		Ww(e, t, o, n, r, a);
	}), e.querySelector("#canvasDeleteLayer")?.addEventListener("click", () => {
		YS({
			kind: "deleteLayer",
			target: t.id
		}), a();
	});
}
function Hw(e, t, n) {
	if (t.editor === "enum" && t.options) {
		let r = Rw(n, t.options), i = ["<option value=\"\">—</option>", ...t.options.map((e) => `<option value="${Qw(e.value)}"${e.value === r ? " selected" : ""} title="${Qw(e.meaning || "")}">${Zw(e.label)}</option>`)];
		return `<label class="canvas-field" data-field="${Qw(e)}" data-editor="enum">
      <span>${Zw(e)}</span>
      <select data-prop="${Qw(e)}" data-role="primary">${i.join("")}</select>
      <span class="canvas-field-error" hidden></span>
    </label>`;
	}
	if (t.editor === "accept" && t.modes) {
		let r = kw(t.modes, n), i = ["<option value=\"\">—</option>", ...t.modes.map((e) => `<option value="${Qw(e.id)}"${e.id === r.modeId ? " selected" : ""} title="${Qw(e.meaning || e.form)}">${Zw(e.label)}</option>`)], a = t.modes.find((e) => e.id === r.modeId), o = Uw(e, a, r.args);
		return `<div class="canvas-field canvas-field--accept" data-field="${Qw(e)}" data-editor="accept">
      <span>${Zw(e)}</span>
      <select data-prop="${Qw(e)}" data-role="mode">${i.join("")}</select>
      <div class="canvas-field-args" data-role="args"${a?.args?.length ? "" : " hidden"}>${o}</div>
      <span class="canvas-field-error" hidden></span>
    </div>`;
	}
	let r = Jw(n);
	return `<label class="canvas-field" data-field="${Qw(e)}" data-editor="text">
    <span>${Zw(e)}</span>
    <input type="text" data-prop="${Qw(e)}" data-role="primary" value="${Qw(r)}" spellcheck="false" />
    <span class="canvas-field-error" hidden></span>
  </label>`;
}
function Uw(e, t, n) {
	return t?.args?.length ? t.args.map((r) => {
		let i = r.name, a = t.kind === "token" ? "token.name" : r.labeled ? `${r.name}:` : r.name, o = n[r.name] ?? "";
		return `<label class="canvas-arg"><span>${Zw(i)}</span>
        <input type="text" data-prop="${Qw(e)}" data-arg="${Qw(r.name)}" value="${Qw(o)}" placeholder="${Qw(a)}" spellcheck="false" />
      </label>`;
	}).join("") : "";
}
function Ww(e, t, n, r, i, a) {
	let o = e.getAttribute("data-field");
	if (!o) return;
	let s = e.getAttribute("data-editor") || "text", c = ww(n, o), l = (o, s = o) => {
		Kw(e, t, n, r, i, {
			push: o,
			notify: s,
			onEdited: a
		});
	};
	if (s === "accept") {
		let t = e.querySelector("select[data-role=\"mode\"]");
		t?.addEventListener("change", () => {
			let n = t.value, r = c.modes?.find((e) => e.id === n), i = e.querySelector("[data-role=\"args\"]");
			i && (i.innerHTML = Uw(o, r, {}), i.hidden = !(r && r.args.length > 0), Gw(i, () => l(!0))), l(!0);
		});
		let n = e.querySelector("[data-role=\"args\"]");
		n && Gw(n, () => l(!0)), l(!1, !1);
		return;
	}
	let u = e.querySelector("[data-role='primary']");
	if (u instanceof HTMLSelectElement) {
		u.addEventListener("change", () => l(!0)), l(!1, !1);
		return;
	}
	if (u instanceof HTMLInputElement) {
		u.addEventListener("change", () => l(!0));
		let e = 0;
		u.addEventListener("input", () => {
			l(!1, !1), window.clearTimeout(e), e = window.setTimeout(() => l(!0), 180);
		}), l(!1, !1);
	}
}
function Gw(e, t) {
	e.querySelectorAll("input[data-arg]").forEach((e) => {
		let n = e, r = 0;
		n.addEventListener("change", () => t()), n.addEventListener("input", () => {
			window.clearTimeout(r), r = window.setTimeout(() => t(), 180);
		});
	});
}
function Kw(e, t, n, r, i, a = {}) {
	let o = e.getAttribute("data-field");
	if (!o) return;
	let s = e.getAttribute("data-editor") || "text", c = ww(n, o), l = Object.keys(r ?? {}), u = "";
	if (s === "enum") {
		let t = e.querySelector("select[data-role=\"primary\"]");
		u = t instanceof HTMLSelectElement ? t.value : "";
	} else if (s === "accept" && c.modes) {
		let t = e.querySelector("select[data-role=\"mode\"]"), n = t instanceof HTMLSelectElement ? t.value : "", r = {};
		e.querySelectorAll("input[data-arg]").forEach((e) => {
			let t = e.getAttribute("data-arg");
			t && (r[t] = e.value);
		});
		let i = Iw(c.modes, n, r);
		u = i == null ? "" : typeof i == "string" ? i : String(i);
	} else {
		let t = e.querySelector("input[data-role=\"primary\"]");
		u = t instanceof HTMLInputElement ? t.value : "";
	}
	let d = rw(n, o, u);
	qw(e, d);
	let f = t.props?.[o];
	if (!d.ok) {
		XS(t.id, o, { silent: !0 }), a.notify && a.onEdited?.();
		return;
	}
	let p = d.incomplete ? void 0 : d.value;
	if (Xw(p, f)) {
		XS(t.id, o, { silent: !0 }), a.notify && a.onEdited?.();
		return;
	}
	if (!a.push) return;
	if (Yw(p, tC(t.id, o, t.props))) {
		a.notify && a.onEdited?.();
		return;
	}
	let m = {};
	i && r[i] ? m[i] = r[i] : l.length === 1 ? m[l[0]] = r[l[0]] : l.length > 1 && !i && Object.assign(m, r), YS({
		kind: "setProp",
		target: t.id,
		prop: o,
		value: p,
		axes: m,
		warning: yC(m) || void 0
	}, { silent: !0 }), a.notify && a.onEdited?.();
}
function qw(e, t) {
	let n = e.querySelector(".canvas-field-error"), r = e.querySelector("select, input[data-role='primary'], input[data-role='mode']");
	if (n) {
		if (t.ok) {
			e.classList.remove("is-invalid"), r?.setAttribute("aria-invalid", "false"), n.hidden = !0, n.textContent = "";
			return;
		}
		e.classList.add("is-invalid"), r?.setAttribute("aria-invalid", "true"), n.hidden = !1, n.textContent = `${t.message} — expect ${t.expected}`;
	}
}
function Jw(e) {
	if (e == null) return "";
	if (typeof e == "object") try {
		return qC(e);
	} catch {
		return String(e);
	}
	return String(e);
}
function Yw(e, t) {
	if (e === t || e == null && t == null) return !0;
	if (typeof e == "string" && typeof t == "string") {
		let n = e.replace(/^\./, "");
		if (n === t.replace(/^\./, "") && /^[A-Za-z_][\w]*$/.test(n)) return !0;
	}
	if (typeof e == "object" || typeof t == "object") try {
		return qC(e) === qC(t);
	} catch {
		return !1;
	}
	return String(e) === String(t);
}
function Xw(e, t) {
	return t != null && t !== "" ? !1 : e == null || typeof e == "string" && e.trim() === "";
}
function Zw(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Qw(e) {
	return Zw(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/canvas/index.js
var $w = null, eT = null, tT = null, nT = null, rT = 0;
function iT(t = {}) {
	$w = t.onStatus ?? null, eT = t.onError ?? null, tT = t.onApplied ?? null, aT(), oT(), WS(() => {
		e.rightPaneMode === "canvas" && (lT() ? dT() : fT());
	}), sT();
}
function aT() {
	document.querySelectorAll("[data-right-pane]").forEach((t) => {
		t.addEventListener("click", () => {
			e.rightPaneMode = t.getAttribute("data-right-pane") === "canvas" ? "canvas" : "preview", r(), sT(), e.rightPaneMode === "canvas" && gT();
		});
	});
}
function oT() {
	document.getElementById("btnCanvasApply")?.addEventListener("click", () => {
		_T();
	}), document.getElementById("btnCanvasDiscard")?.addEventListener("click", () => {
		ZS(), nT = null, fT(), $w?.("Canvas · discarded pending");
	});
}
function sT() {
	let t = e.rightPaneMode || "preview";
	document.querySelectorAll("[data-right-pane]").forEach((e) => {
		e.classList.toggle("is-active", e.getAttribute("data-right-pane") === t);
	});
	let n = document.querySelector(".preview-pane");
	n && n.setAttribute("data-right-pane", t);
	let r = document.getElementById("previewToolbar"), i = document.getElementById("hostChrome"), a = document.getElementById("interactionLegend"), o = document.querySelector(".preview-frame-wrap"), s = document.getElementById("inspectPane"), c = document.getElementById("canvasPane");
	t === "canvas" ? (r && (r.hidden = !0), i && (i.hidden = !0), a && (a.hidden = !0), o && (o.hidden = !0), s && (s.hidden = !0), c && (c.hidden = !1), cT(), gT()) : (r && (r.hidden = !1), c && (c.hidden = !0), o && (o.hidden = !1));
}
function cT() {
	if (e.selectedKind !== "component" || !e.previewRoot) {
		KS(null, null), fT();
		return;
	}
	let t = e.previewRoot, n = e.editFile || e.catalogue?.componentFiles?.[t] || null;
	Q.component === t ? Q.file = n : (KS(t, n), nT = null), e.rightPaneMode === "canvas" ? gT() : fT();
}
function lT() {
	let e = document.activeElement;
	return e instanceof HTMLInputElement && e.hasAttribute("data-prop") && !!e.closest("#canvasInspector");
}
function uT() {
	let e = document.getElementById("canvasLayers");
	if (!e) return;
	let t = Q.component, n = Q.bake?.components?.[t || ""], r = lC(iC(n)), i = Q.selectedLayer;
	hC(e, r, i, {
		onSelect: (e) => {
			qS(e), DT(e);
		},
		onMove: (e, t) => {
			let r = oC(n, e, t);
			r && (YS({
				kind: "reorderChildren",
				target: "root",
				payload: { order: r }
			}, { silent: !0 }), uT(), dT());
		},
		onAdd: ({ kind: e, name: t }) => {
			let r = nC(t);
			if (new Set(rC(n)).has(r)) {
				eT?.(`Layer name “${r}” already exists`);
				return;
			}
			YS({
				kind: "addLayer",
				target: "root",
				payload: {
					kind: e,
					name: r,
					content: e === "text" ? r : void 0
				}
			}, { silent: !0 }), uT(), dT();
		}
	}, rC(n), n);
}
function dT() {
	$S({ silent: !0 });
	let t = document.getElementById("canvasPending"), n = document.getElementById("canvasMeta"), r = document.getElementById("canvasWarnings"), i = Q.component, a = Q.bake?.components?.[i || ""], o = Q.selectedLayer, s = Q.pending.length;
	n && i && (n.textContent = s ? `${s} pending · stage live` : "Defaults · edit props, then Apply"), mT(t), hT(), uT();
	let c = e.catalogue?.componentParams?.[i || ""] ?? [], l = e.catalogue?.variantCases ?? {}, u = vC(Q.world, c, l), d = xT(yT(iC(a)));
	if (DT(o), r) {
		let e = [...Q.warnings, ...Q.pending.map((e) => e.warning).filter(Boolean)], t = yC(u, nT || void 0);
		t && e.push(t), d && e.push(d), r.hidden = !e.length, r.innerHTML = e.map((e) => `<div>${AT(String(e))}</div>`).join("");
	}
}
function fT() {
	if (lT()) {
		dT();
		return;
	}
	$S({ silent: !0 });
	let t = document.getElementById("canvasInspector"), n = document.getElementById("canvasVariants"), r = document.getElementById("canvasPending"), i = document.getElementById("canvasTitle"), a = document.getElementById("canvasMeta"), o = Q.component;
	if (i && (i.textContent = o || "Canvas"), a) {
		let e = Q.pending.length;
		a.textContent = o ? e ? `${e} pending` : "Defaults · edit props, then Apply" : "Select a component";
	}
	let s = Q.bake?.components?.[o || ""], c = lC(iC(s)), l = Q.selectedLayer;
	uT();
	let u = e.catalogue?.componentParams?.[o || ""] ?? [], d = e.catalogue?.variantCases ?? {}, f = vC(Q.world, u, d);
	n && pT(n, u, d);
	let p = mC(c, l);
	t && Vw(t, p, f, nT, (e) => {
		nT = e, fT();
	}, () => {
		dT();
	}), mT(r), hT();
	let m = xT(yT(iC(s)));
	DT(l);
	let h = document.getElementById("canvasWarnings");
	if (h) {
		let e = [...Q.warnings, ...Q.pending.map((e) => e.warning).filter(Boolean)], t = yC(f, nT || void 0);
		t && e.push(t), m && e.push(m), h.hidden = !e.length, h.innerHTML = e.map((e) => `<div>${AT(String(e))}</div>`).join("");
	}
}
function pT(e, t, n) {
	let r = bC(t, n);
	if (!r.length) {
		e.hidden = !0, e.innerHTML = "";
		return;
	}
	e.hidden = !1, e.innerHTML = r.map((e) => {
		let t = n[e.typeName] || [], r = Q.world[e.name], i = r == null ? "" : String(r).replace(/^\./, ""), a = [`<option value="">${AT(String(e.default ?? e.defaultValue ?? t[0] ?? "").replace(/^\./, "").replace(/^"|"$/g, "") || "default")} (default)</option>`, ...t.map((e) => `<option value=".${jT(e)}"${i === e ? " selected" : ""}>${AT(e)}</option>`)];
		return `<label class="canvas-variant"><span>${AT(e.name)}</span>
        <select data-canvas-axis="${jT(e.name)}">${a.join("")}</select>
      </label>`;
	}).join(""), e.querySelectorAll("select[data-canvas-axis]").forEach((e) => {
		e.addEventListener("change", () => {
			let t = e.getAttribute("data-canvas-axis");
			t && (JS(t, e.value || void 0), nT = null, gT());
		});
	});
}
function mT(e) {
	if (!e) return;
	let t = Q.pending;
	if (!t.length) {
		e.innerHTML = "<span class=\"hint\">No pending edits</span>";
		return;
	}
	e.innerHTML = t.map((e) => {
		let t = e.axes && Object.keys(e.axes).length ? ` · ${Object.entries(e.axes).map(([e, t]) => `${e}=.${t}`).join(", ")}` : "";
		return `<div class="canvas-pending-item">${AT(e.kind === "setProp" ? `${e.target}.${e.prop} = ${kT(e.value)}` : e.kind === "addLayer" ? `+ ${String(e.payload?.kind || "text")} ${e.payload?.name || ""}` : e.kind === "deleteLayer" ? `− ${e.target}` : e.kind === "reorderChildren" ? `↕ children [${(e.payload?.order || []).join(", ")}]` : e.kind)}${AT(t)}</div>`;
	}).join("");
}
function hT() {
	let e = document.getElementById("btnCanvasApply"), t = document.getElementById("btnCanvasDiscard"), n = Q.pending.length;
	e && (e.disabled = n === 0), t && (t.disabled = n === 0);
}
async function gT() {
	let t = ++rT, n = Q.component;
	if (!n || !e.root || !e.entry) {
		Q.bake = null, fT();
		return;
	}
	try {
		pv();
		let r = await Rv();
		if (!r) throw Error("WASM bake unavailable");
		let { filesJson: i, entry: a } = Lv({
			...(await p(e.root, e.entry)).files ?? {},
			...e.files
		}, e.entry), o = e.theme || "", s = (e.catalogue?.hostParams?.length ?? 0) > 0, c = s ? "Default" : "", l = JSON.stringify(s ? e.hostFacts ?? {} : {}), u = OT(Q.world), d = r.bake_component_sources(i, a, n, o, JSON.stringify(u), c, l, void 0);
		if (t !== rT) return;
		Q.bake = JSON.parse(d), Q.bakeError = null, eT?.(null), $w?.(`Canvas · ${n} · baked`);
	} catch (e) {
		if (t !== rT) return;
		Q.bakeError = e instanceof Error ? e.message : String(e), eT?.(Q.bakeError, { file: Q.file || void 0 }), $w?.("Canvas bake failed");
	}
	fT();
}
async function _T() {
	let t = Q.component, n = vT(t);
	if (!t || !n) {
		eT?.("No component file for Canvas apply");
		return;
	}
	let a = Q.bake?.components?.[t], o = mC(lC(a), Q.selectedLayer), s = e.catalogue?.componentParams?.[t] ?? [], c = e.catalogue?.variantCases ?? {}, l = vC(Q.world, s, c);
	if (Bw(document.getElementById("canvasInspector"), o, l, nT), $S(), iw(document.getElementById("canvasInspector"))) {
		eT?.("Fix invalid inspector fields before Apply"), $w?.("Canvas Apply blocked — invalid fields");
		return;
	}
	if (!Q.pending.length) {
		$w?.("Canvas · nothing to apply"), fT();
		return;
	}
	pv();
	let u = e.files[n] ?? "", d = l, f = {};
	for (let e of Q.pending) {
		if (e.kind !== "setProp") continue;
		let t = Object.keys(e.axes ?? {});
		if (t.length > 1) {
			if (!nT || !t.includes(nT)) {
				eT?.(`Pick an axis for ${e.prop} (active: ${t.join(", ")}) before Apply.`), eC([`Changing ${t.join(" + ")} at once — pick which axis owns this property.`]), fT();
				return;
			}
			f[e.id] = nT;
		}
	}
	let m = Q.pending.map((e) => e.kind === "setProp" && Object.keys(e.axes ?? {}).length === 0 && Object.keys(d).length === 1 ? {
		...e,
		axes: { ...d }
	} : e), h = xC(u, t, m, { chosenAxisByEdit: f });
	if (!h.ok) {
		eT?.(h.error || "Rewrite failed", { file: n }), $w?.("Canvas Apply failed");
		return;
	}
	try {
		let r = await Rv();
		if (!r) throw Error("WASM bake unavailable");
		let { filesJson: i, entry: a } = Lv({
			...(await p(e.root, e.entry)).files ?? {},
			...e.files,
			[n]: h.source
		}, e.entry), o = e.theme || "", s = (e.catalogue?.hostParams?.length ?? 0) > 0, c = r.bake_component_sources(i, a, t, o, JSON.stringify(OT(Q.world)), s ? "Default" : "", JSON.stringify(s ? e.hostFacts ?? {} : {}), void 0);
		JSON.parse(c);
	} catch (e) {
		let t = e instanceof Error ? e.message : String(e);
		eT?.(t, { file: n }), $w?.("Canvas Apply rejected — bake failed");
		return;
	}
	e.files[n] = h.source, i(n), e.editFile !== n && (e.editFile = n), uv(), G_(h.source, t), ZS(), nT = null, eC(h.warnings ?? []), eT?.(null), $w?.(`Canvas · applied ${m.length} edit(s)${(h.warnings || []).length ? " · with warnings" : ""}`), await gT(), tT?.(), r();
}
function vT(t) {
	if (!t) return null;
	if (Q.file && e.files[Q.file]) return Q.file;
	let n = e.catalogue?.componentFiles?.[t];
	if (n && e.files[n]) return n;
	for (let [n, r] of Object.entries(e.files)) if (RegExp(`\\b(component|page|screen)\\s+${NT(t)}\\b`).test(r)) return n;
	return e.editFile;
}
function yT(e) {
	if (!e?.root) return e ?? null;
	let t = structuredClone ? structuredClone(e) : JSON.parse(JSON.stringify(e));
	for (let e of Q.pending) {
		if (e.kind !== "setProp" || !e.prop) continue;
		let n = bT(t.root, e.target);
		n && ((!n.props || typeof n.props != "object") && (n.props = {}), n.props[e.prop] = e.value);
	}
	return t;
}
function bT(e, t) {
	if (t === "root") return e;
	if (t.startsWith("let:")) {
		let n = t.slice(4), r = null;
		function i(e) {
			if (!(!e || r)) {
				if (e.id === n) {
					r = e;
					return;
				}
				for (let t of e.children || []) i(t);
			}
		}
		return i(e), r;
	}
	return null;
}
function xT(e) {
	try {
		let t = ST(e);
		return t?.length ? `Unresolved color token(s): ${t.join(", ")} — stage uses fallback until Apply/bake.` : null;
	} catch (e) {
		let t = e instanceof Error ? e.message : String(e), n = document.getElementById("canvasStageFrame");
		return n && n instanceof HTMLIFrameElement && (n.srcdoc = "<!doctype html><html><body style=\"font:13px system-ui;padding:16px;color:#a33\">Stage sketch failed</body></html>"), `Stage sketch failed: ${t}`;
	}
}
function ST(e) {
	let t = document.getElementById("canvasStageFrame");
	if (!t || !(t instanceof HTMLIFrameElement)) return [];
	if (!e?.root) return t.srcdoc = "<!doctype html><html><body style=\"font:13px system-ui;padding:16px;color:#666\">No bake</body></html>", [];
	let n = Q.selectedLayer, { html: r, unresolved: i } = CT(e, n);
	return t.srcdoc = r, i;
}
function CT(e, t = "root") {
	let n = [];
	return {
		html: `<!doctype html><html><head><style>
    body{margin:0;font:13px/1.4 system-ui;background:#e7efe9;padding:12px}
    .stage{background:#fff;border-radius:12px;padding:16px;border:1px solid #c5d4c9;min-height:80px}
    .node{outline:1px dashed transparent;border-radius:6px;box-sizing:border-box}
    .node.is-hot{outline:2px solid #0b6e4f}
    .row{display:flex;flex-direction:row;align-items:center;gap:8px}
    .col{display:flex;flex-direction:column;gap:8px}
    .txt{white-space:pre-wrap}
  </style></head><body><div class="stage">${wT(e.root, "root", t, n)}</div>
  <script>
    window.addEventListener('message',function(ev){
      if(!ev.data||ev.data.type!=='canvas-highlight')return;
      document.querySelectorAll('.node').forEach(function(n){
        n.classList.toggle('is-hot',n.getAttribute('data-layer')===ev.data.id);
      });
    });
  <\/script></body></html>`,
		unresolved: n
	};
}
function wT(e, t, n, r) {
	let i = e.props || {}, a = i.direction === "column" || i.direction === ".column" ? "col" : "row", o = TT(i.background, r), s = ET(i.padding), c = i.cornerRadius == null ? "" : `${Number(i.cornerRadius) || 0}px`, l = i.borderWidth == null ? null : Number(i.borderWidth), u = TT(i.borderColor, r);
	!u && l != null && l > 0 && (u = "#111111");
	let d = [
		o ? `background:${MT(o)}` : "",
		s ? `padding:${s}` : "",
		c ? `border-radius:${c}` : "",
		i.opacity == null ? "" : `opacity:${i.opacity}`,
		l != null && l > 0 && Number.isFinite(l) ? `border:${l}px solid ${MT(u || "#111")}` : ""
	].filter(Boolean).join(";"), f = t === n ? " is-hot" : "";
	if (e.kind === "text") {
		let e = i.content == null ? "" : String(i.content), n = TT(i.color, r), a = i.fontSize == null ? "" : `${i.fontSize}px`, o = i.fontWeight == null ? "" : String(i.fontWeight), s = [
			n ? `color:${MT(n)}` : "",
			a ? `font-size:${a}` : "",
			o ? `font-weight:${o}` : ""
		].filter(Boolean).join(";");
		return `<div class="node txt${f}" data-layer="${jT(t)}" style="${s}">${AT(e)}</div>`;
	}
	let p = (e.children || []).map((e, i) => {
		let a;
		return a = typeof e.id == "string" && e.id && !/^\d+$/.test(e.id) ? `let:${e.id}` : `path:${t === "root" ? "" : t + "."}${i}`, wT(e, a, n, r);
	}).join("");
	return `<div class="node ${a}${f}" data-layer="${jT(t)}" style="${d}">${p}</div>`;
}
function TT(e, t) {
	if (e == null || e === "") return "";
	if (typeof e == "string" && /^#[0-9A-Fa-f]{3,8}$/.test(e.trim())) return e.trim();
	let { css: n, unresolved: r } = XC(e);
	return r && !t.includes(r) && t.push(r), n || "";
}
function ET(e) {
	if (e == null) return "";
	if (typeof e == "number") return `${e}px`;
	if (typeof e == "string") {
		let t = /EdgeInsets\(([^)]*)\)/.exec(e);
		if (t) {
			let e = {};
			for (let n of t[1].split(",")) {
				let [t, r] = n.split(":").map((e) => e.trim());
				t && r && (e[t] = r);
			}
			return e.x != null || e.y != null ? `${e.y || 0}px ${e.x || 0}px` : `${e.top || 0}px ${e.right || 0}px ${e.bottom || 0}px ${e.left || 0}px`;
		}
		return "";
	}
	if (typeof e == "object") {
		let t = e;
		return t.x != null || t.y != null ? `${t.y || 0}px ${t.x || 0}px` : `${t.top || 0}px ${t.right || 0}px ${t.bottom || 0}px ${t.left || 0}px`;
	}
	return "";
}
function DT(e) {
	let t = document.getElementById("canvasStageFrame");
	if (!(!t || !(t instanceof HTMLIFrameElement))) try {
		t.contentWindow?.postMessage({
			type: "canvas-highlight",
			id: e
		}, "*");
	} catch {}
}
function OT(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = typeof r == "string" && r.startsWith(".") && r.length > 1 && !r.includes(" ") ? r.slice(1) : r);
	return t;
}
function kT(e) {
	if (typeof e == "string") return e.length > 40 ? `${e.slice(0, 38)}…` : e;
	try {
		return JSON.stringify(e);
	} catch {
		return String(e);
	}
}
function AT(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function jT(e) {
	return AT(e).replace(/"/g, "&quot;");
}
function MT(e) {
	return String(e).replace(/[;<>"']/g, "");
}
function NT(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//#endregion
//#region src/main.js
var PT = "pdl-studio-recent-v1", FT = "pdl-studio-last-v1", IT = document.getElementById("welcome"), LT = document.getElementById("workspace"), RT = document.getElementById("openDialog"), zT = document.getElementById("newDialog"), BT = gv({ onSelect: nE }), VT = yv({
	onChange: () => {
		VT.renderWorld(), Z();
	},
	onSampleClick: (e) => {
		let t = String(e).split(".")[0];
		nE({
			kind: "samples",
			name: t
		});
	}
}), HT = Cv({ onReveal: (t, n) => {
	e.editFile = t, uv(), n && dv(n), BT.renderNavigator(), pE();
} });
kv({ onGoto: (t) => {
	if (!t.file) return;
	let n = Object.keys(e.files).find((e) => e === t.file || e.endsWith(`/${t.file}`) || t.file.endsWith(e)) || t.file;
	e.files[n] && (e.editFile = n, uv(), t.line && fv(t.line), BT.renderNavigator(), pE());
} }), ov(document.getElementById("editorMount"), {
	onChange: () => {
		pE(), Z(450);
	},
	onGoto: (t, n, r) => {
		e.files[t] && (e.editFile = t, r && (e.selectedSymbol = r), uv(), fv(n), BT.renderNavigator(), HT.renderCompanion(), pE());
	},
	onCursorScope: () => {
		lE();
	}
}), hS(document.getElementById("previewFrame"), {
	onStatus: (e) => {
		document.getElementById("statusLeft").textContent = e;
	},
	onError: (t) => {
		Av(t, { file: e.editFile || void 0 });
	},
	onOpenSource: (e) => {
		sE(e);
	},
	onWorldMutated: () => {
		VT.renderWorld(), pE();
	}
}), iT({
	onStatus: (e) => {
		document.getElementById("statusLeft").textContent = e;
	},
	onError: (t, n) => {
		t ? Av(t, { file: n?.file || e.editFile || void 0 }) : jv();
	},
	onApplied: () => {
		VT.renderWorld(), pE(), e.rightPaneMode !== "canvas" && Z(80);
	}
}), document.querySelectorAll(".dock-tab").forEach((e) => {
	e.addEventListener("click", () => {
		let t = e.getAttribute("data-dock");
		document.querySelectorAll(".dock-tab").forEach((t) => {
			t.classList.toggle("is-active", t === e);
		}), document.getElementById("dockWorld").hidden = t !== "world", document.getElementById("dockNotes").hidden = t !== "notes", t === "notes" && HT.renderCompanion();
	});
}), document.querySelectorAll(".mode-btn").forEach((t) => {
	t.addEventListener("click", () => {
		let n = t.getAttribute("data-mode");
		e.mode = n === "prototype" || n === "review" ? n : "design", document.querySelectorAll(".mode-btn").forEach((e) => {
			let n = e === t;
			e.classList.toggle("is-active", n), e.setAttribute("aria-selected", n ? "true" : "false");
		}), document.getElementById("app").dataset.mode = e.mode, e.mode === "prototype" && tE(), BT.renderNavigator(), HT.renderCompanion(), Z(), pE();
	});
}), document.getElementById("btnOpen")?.addEventListener("click", () => KT()), document.getElementById("btnWelcomeOpen")?.addEventListener("click", () => KT()), document.getElementById("btnNew")?.addEventListener("click", () => qT()), document.getElementById("btnWelcomeNew")?.addEventListener("click", () => qT()), document.getElementById("openCancel")?.addEventListener("click", () => RT.close()), document.getElementById("newCancel")?.addEventListener("click", () => zT.close()), document.getElementById("btnReload")?.addEventListener("click", () => void $T()), document.getElementById("btnScaffoldHere")?.addEventListener("click", () => {
	let e = document.getElementById("openRoot").value.trim();
	RT.close(), qT({ root: e });
}), document.getElementById("openForm")?.addEventListener("submit", async (e) => {
	e.preventDefault();
	let t = document.getElementById("openRoot").value.trim(), n = document.getElementById("openEntry").value.trim() || void 0, r = document.getElementById("openError"), i = document.getElementById("openEmptyHint");
	try {
		if (r.hidden = !0, i.hidden = !0, o() && !confirm("Discard unsaved changes and open another project?")) return;
		let e = await u(t, n);
		if (e.empty) {
			r.hidden = !1, r.textContent = e.error || "No .pdl files in project", i.hidden = !1;
			return;
		}
		if (!e.ok) throw Error(e.error || "Open failed");
		await ZT(t, n), RT.close();
	} catch (e) {
		r.hidden = !1, r.textContent = e instanceof Error ? e.message : String(e), i.hidden = !0;
	}
}), document.getElementById("newForm")?.addEventListener("submit", async (e) => {
	e.preventDefault();
	let t = document.getElementById("newRoot").value.trim(), n = document.getElementById("newTitle").value.trim(), r = document.getElementById("newPrefix").value.trim(), i = document.getElementById("newError");
	try {
		if (i.hidden = !0, o() && !confirm("Discard unsaved changes and create a new project?")) return;
		let e = await d({
			root: t,
			title: n || void 0,
			prefix: r || void 0
		});
		zT.close(), await QT(e, { preferComponent: e.defaultComponent || "Button" }), hE(`Created ${e.created?.length || 0} starter files`);
	} catch (e) {
		i.hidden = !1, i.textContent = e instanceof Error ? e.message : String(e);
	}
}), document.getElementById("newRoot")?.addEventListener("input", () => {
	let e = document.getElementById("newRoot").value.trim(), t = document.getElementById("newTitle"), n = document.getElementById("newPrefix");
	if (!e || t.value && n.dataset.touched === "1") return;
	let r = e.replace(/\\/g, "/").replace(/\/$/, "").split("/").pop() || "";
	t.value ||= r.replace(/[-_]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase()), (!n.value || n.dataset.autFilled === "1") && (n.value = r.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/^[^a-z]+/, "").slice(0, 8) || "ds", n.dataset.autFilled = "1");
}), document.getElementById("newPrefix")?.addEventListener("input", () => {
	document.getElementById("newPrefix").dataset.touched = "1", document.getElementById("newPrefix").dataset.autFilled = "0";
}), document.getElementById("btnSave")?.addEventListener("click", () => void dE());
var UT = document.getElementById("btnExport"), WT = document.getElementById("exportMenu");
UT?.addEventListener("click", () => {
	WT.hidden = !WT.hidden;
}), document.addEventListener("click", (e) => {
	!WT || WT.hidden || e.target === UT || WT.contains(e.target) || (WT.hidden = !0);
}), WT?.querySelectorAll("[data-export]").forEach((t) => {
	t.addEventListener("click", async () => {
		WT.hidden = !0;
		let n = t.getAttribute("data-export");
		try {
			pv();
			let t = await g({
				root: e.root,
				entry: e.entry,
				files: Object.fromEntries([...e.dirty].map((t) => [t, e.files[t]])),
				kind: n,
				component: e.previewRoot || void 0,
				theme: e.theme || void 0
			});
			gE(t.filename, t.content, t.mime), hE(`Exported ${t.filename}`), jv();
		} catch (t) {
			Av(t instanceof Error ? t.message : String(t), { file: e.editFile || void 0 });
		}
	});
}), window.addEventListener("keydown", (e) => {
	let t = e.metaKey || e.ctrlKey;
	if (t && e.key === "s") e.preventDefault(), dE();
	else if (t && e.key === "o") e.preventDefault(), KT();
	else if (t && e.key === "k") {
		e.preventDefault();
		let t = document.getElementById("navSearch");
		t?.focus(), t?.select();
	} else e.key === "Escape" && (WT.hidden = !0, RT.open && RT.close(), zT.open && zT.close());
}), n(() => {
	pE(), VT.renderWorld(), HT.renderCompanion();
});
async function GT() {
	XT();
	let e = await c(), t = document.getElementById("starterList");
	t.innerHTML = (e.starters ?? []).map((e) => `<li><button type="button" data-root="${e.root}" data-entry="${e.entry}"><strong>${_E(e.label)}</strong><span>${_E(e.description || e.root)}</span></button></li>`).join(""), t.querySelectorAll("button").forEach((e) => {
		e.addEventListener("click", () => {
			ZT(e.getAttribute("data-root"), e.getAttribute("data-entry"));
		});
	});
	try {
		let e = localStorage.getItem(FT);
		if (e) {
			let t = JSON.parse(e);
			t?.root && await ZT(t.root, t.entry);
		}
	} catch {}
}
function KT() {
	document.getElementById("openError").hidden = !0, document.getElementById("openEmptyHint").hidden = !0, e.rootDisplay && (document.getElementById("openRoot").value = e.rootDisplay), RT.showModal(), document.getElementById("openRoot")?.focus();
}
function qT(t = {}) {
	document.getElementById("newError").hidden = !0;
	let n = document.getElementById("newRoot"), r = document.getElementById("newTitle"), i = document.getElementById("newPrefix");
	if (t.root) n.value = t.root;
	else if (!n.value && e.rootDisplay) {
		let t = String(e.rootDisplay).replace(/\\/g, "/").replace(/\/[^/]+\/?$/, "");
		n.value = t ? `${t}/my-design-system` : "";
	}
	t.title && (r.value = t.title), i.dataset.touched = "0", i.dataset.autFilled = "0", n.dispatchEvent(new Event("input")), zT.showModal(), n.focus();
}
function JT() {
	try {
		let e = localStorage.getItem(PT), t = e ? JSON.parse(e) : [];
		return Array.isArray(t) ? t : [];
	} catch {
		return [];
	}
}
function YT(e, t, n) {
	let r = [{
		root: e,
		entry: t,
		label: n,
		at: Date.now()
	}, ...JT().filter((t) => t.root !== e)].slice(0, 6);
	localStorage.setItem(PT, JSON.stringify(r));
}
function XT() {
	let e = document.getElementById("recentList"), t = document.getElementById("recentHeading"), n = JT();
	if (!n.length) {
		e.hidden = !0, t.hidden = !0;
		return;
	}
	e.hidden = !1, t.hidden = !1, e.innerHTML = n.map((e) => `<li><button type="button" data-root="${vE(e.root)}" data-entry="${vE(e.entry || "design.pdl")}"><strong>${_E(e.label || e.root)}</strong><span>${_E(e.root)}</span></button></li>`).join(""), e.querySelectorAll("button").forEach((e) => {
		e.addEventListener("click", () => {
			ZT(e.getAttribute("data-root"), e.getAttribute("data-entry"));
		});
	});
}
async function ZT(e, t, n = {}) {
	document.getElementById("statusLeft").textContent = "Opening…", jv(), await QT(await l(e, t), n);
}
async function QT(t, n = {}) {
	document.getElementById("statusLeft").textContent = "Opening…", jv(), e.root = t.root, e.rootDisplay = t.rootDisplay, e.rootLabel = t.rootLabel, e.entry = t.entry, e.files = { ...t.files }, e.baselines = { ...t.files }, e.dirty.clear(), e.activeWorld = {}, e.paramOverrides = {}, e.hostFacts = {}, e.theme = "", e.previewPinned = !1, document.getElementById("previewPin").checked = !1;
	try {
		e.catalogue = await f(e.root, e.entry, fE());
	} catch (t) {
		e.catalogue = null, Av(t instanceof Error ? t.message : String(t));
	}
	IT.hidden = !0, LT.hidden = !1, document.getElementById("btnSave").disabled = !1, document.getElementById("btnExport").disabled = !1, document.getElementById("btnReload").disabled = !1, eE(n.preferComponent), IS(), zS(), BT.renderNavigator(), uv(), e.selectedSymbol && e.selectedSymbol !== "__tokens__" && e.selectedSymbol !== "__typeStyles__" && e.selectedKind === "component" && dv(e.selectedSymbol), VT.renderWorld(), HT.renderCompanion(), pE(), await DS(), localStorage.setItem(FT, JSON.stringify({
		root: e.rootDisplay || e.root,
		entry: e.entry
	})), YT(e.rootDisplay || e.root, e.entry, e.rootLabel), XT();
}
async function $T() {
	if (!e.root || o() && !confirm("Discard unsaved changes and reload from disk?")) return;
	let t = e.rootDisplay || e.root, n = e.entry;
	await ZT(t, n), hE("Reloaded from disk");
}
function eE(t) {
	let n = e.catalogue;
	if (!n) return;
	if (t && n.components?.includes(t)) {
		sE(t);
		return;
	}
	if (e.mode === "prototype") {
		let e = (n.components ?? []).find((e) => n.componentRoles?.[e] === "screen");
		if (e) {
			sE(e);
			return;
		}
	}
	let r = q_(e.entry, e.files, n);
	if (r.length === 1) {
		sE(r[0]);
		return;
	}
	for (let e of [
		"Button",
		"PlaylistComposer",
		"AbnPointerLab",
		"AbnButton",
		"IosPhone",
		"UsageRulesLab"
	]) if (n.components?.includes(e)) {
		sE(e);
		return;
	}
	let i = (n.components ?? []).find((e) => !n.componentRoles?.[e]) || n.components?.[0];
	i ? sE(i) : n.designSummary?.primitives?.length || n.designSummary?.semantics?.length || Object.keys(n.tokenTables?.primitives ?? {}).length ? rE() : (e.editFile = e.entry, e.previewRoot = null, e.selectedSymbol = null, e.selectedKind = "file");
}
function tE() {
	let t = e.catalogue, n = (t?.components ?? []).find((e) => t.componentRoles?.[e] === "screen");
	n && !e.previewPinned && sE(n);
}
function nE(e) {
	if (e.kind === "file" && e.file) {
		uE(e.file);
		return;
	}
	if (e.kind === "foundation" || e.name === "__tokens__") {
		rE(e.file);
		return;
	}
	if (e.kind === "typeStyles" || e.name === "__typeStyles__") {
		iE(e.file);
		return;
	}
	if (e.kind === "samples" && e.name) {
		oE(e.name);
		return;
	}
	if (e.kind === "theme" && e.name) {
		aE(e.name);
		return;
	}
	e.kind === "symbol" && e.name && sE(e.name, e.file);
}
function rE(t) {
	let n = t || Object.keys(e.files).find((e) => /foundation\.pdl$/i.test(e)) || Object.keys(e.files).find((e) => /token/i.test(e)) || e.entry;
	e.selectedKind = "tokens", e.selectedSymbol = "__tokens__", e.editFile = n, uv(), BT.renderNavigator(), HT.renderCompanion(), pE(), cT(), Z(0);
}
function iE(t) {
	let n = t || Object.keys(e.files).find((e) => /foundation\.pdl$/i.test(e)) || e.entry;
	e.selectedKind = "typeStyles", e.selectedSymbol = "__typeStyles__", e.editFile = n, uv(), BT.renderNavigator(), HT.renderCompanion(), pE(), Z(0);
}
function aE(t) {
	e.selectedKind = "theme", e.selectedSymbol = t, e.theme = t;
	let n = Object.keys(e.files).find((n) => RegExp(`\\btheme\\s+${t}\\b`).test(e.files[n])) || Object.keys(e.files).find((e) => /theme/i.test(e)) || e.editFile;
	n && (e.editFile = n), IS(), uv(), BT.renderNavigator(), HT.renderCompanion(), pE(), Z(0);
}
function oE(t) {
	for (let [n, r] of Object.entries(e.files)) if (RegExp(`\\bsamples\\s+${t}\\b`).test(r)) {
		e.selectedKind = "samples", e.selectedSymbol = t, e.editFile = n, uv(), dv(t), BT.renderNavigator(), HT.renderCompanion(), pE(), Z(0);
		return;
	}
	e.selectedKind = "samples", e.selectedSymbol = t, BT.renderNavigator(), HT.renderCompanion(), pE(), Z(0);
}
function sE(t, n, r = {}) {
	let i = r.focus !== !1;
	e.selectedKind = "component", e.selectedSymbol = t;
	let a = n || BT.resolveComponentFile(t) || Object.keys(e.files).find((n) => RegExp(`\\b(component|page|screen)\\s+${t}\\b`).test(e.files[n])) || e.editFile || e.entry;
	e.editFile = a, e.previewPinned || (e.previewRoot = t), cE(a), uv(), i && dv(t), BT.renderNavigator(), VT.renderWorld(), HT.renderCompanion(), pE(), cT(), Z(50);
}
function cE(t) {
	if (!t) return;
	let n = q_(t, e.files, e.catalogue);
	n.length > 1 ? e.previewMode = "gallery" : n.length === 1 && (e.previewMode = "primary"), LS();
}
function lE() {
	let t = e.editFile;
	if (!t) return;
	let n = mv();
	if (n == null) return;
	let r = J_(e.files[t] ?? "", n);
	if (!r || ![
		"component",
		"page",
		"screen"
	].includes(r.kind)) return;
	let i = q_(t, e.files, e.catalogue), a = e.selectedKind !== "component" || e.selectedSymbol !== r.name || e.editFile !== t;
	e.selectedKind = "component", e.selectedSymbol = r.name, e.previewPinned || (e.previewRoot = r.name), i.length > 1 && e.previewMode !== "gallery" ? (e.previewMode = "gallery", LS(), Z(50)) : a && e.previewMode === "primary" ? Z(80) : RS(r.name), a ? (BT.renderNavigator(), VT.renderWorld(), HT.renderCompanion(), pE(), cT()) : BT.renderNavigator();
}
function uE(t) {
	e.editFile = t, uv();
	let n = e.files[t] ?? "", r = /\b(primitive|semantic)\s+/.test(n), i = /\btheme\s+\w+/.test(n), a = /\btypeStyle\s+/.test(n), o = q_(t, e.files, e.catalogue);
	if (o.length) {
		if (cE(t), e.previewPinned && e.previewRoot && o.includes(e.previewRoot)) e.selectedKind = "component", e.selectedSymbol = e.previewRoot;
		else {
			let r = mv(), i = r == null ? null : J_(n, r);
			sE(i && o.includes(i.name) ? i.name : o.length === 1 ? o[0] : o.includes(e.previewRoot) ? e.previewRoot : o[0], t, { focus: !1 });
			return;
		}
	} else if (r) e.selectedKind = "tokens", e.selectedSymbol = "__tokens__";
	else if (i) {
		let t = n.match(/\btheme\s+(\w+)/);
		e.selectedKind = "theme", e.selectedSymbol = t?.[1] ?? e.theme, t?.[1] && (e.theme = t[1]), IS();
	} else a ? (e.selectedKind = "typeStyles", e.selectedSymbol = "__typeStyles__") : (e.selectedKind = "file", e.selectedSymbol = null);
	BT.renderNavigator(), VT.renderWorld(), HT.renderCompanion(), pE(), Z(50);
}
async function dE() {
	if (pv(), !e.root || !e.dirty.size) {
		hE(e.root ? "Nothing to save" : "");
		return;
	}
	let t = [...e.dirty];
	for (let n of t) {
		let t = e.files[n];
		if ((await m(e.root, n, t, e.baselines[n])).conflict) {
			Av(`Conflict saving ${n}: file changed on disk. Use Reload to discard local edits.`, { file: n });
			return;
		}
		e.baselines[n] = t, a(n);
	}
	try {
		e.catalogue = await f(e.root, e.entry, {}), IS(), zS(), BT.renderNavigator(), VT.renderWorld(), HT.renderCompanion(), jv();
	} catch (e) {
		Av(e instanceof Error ? e.message : String(e));
	}
	pE(), hE(`Saved ${t.length} file(s)`);
}
function fE() {
	let t = {};
	for (let n of e.dirty) t[n] = e.files[n];
	return t;
}
function pE() {
	document.getElementById("projectName").textContent = e.rootLabel ? e.rootDisplay || e.rootLabel : "No project";
	let t = document.getElementById("saveState");
	t.textContent = o() ? "● Unsaved" : e.root ? "Saved" : "", document.getElementById("btnSave").disabled = !e.root || !o(), document.getElementById("btnReload").disabled = !e.root, document.getElementById("btnExport").disabled = !e.root;
	let n = e.selectedSymbol || e.previewRoot, r = "—";
	e.selectedKind === "tokens" ? r = "Tokens" : e.selectedKind === "typeStyles" ? r = "Type styles" : e.selectedKind === "theme" ? r = n ? `Theme · ${n}` : "Theme" : e.selectedKind === "samples" ? r = n ? `Samples · ${n}` : "Samples" : e.selectedKind === "file" ? r = e.editFile || "File" : n && (r = n === "__tokens__" ? "Tokens" : n), document.getElementById("symbolLabel").textContent = r, document.getElementById("fileLabel").textContent = e.editFile || "";
	let i = e.previewPinned ? " · preview pinned" : "";
	document.getElementById("statusRight").textContent = e.root ? `${e.mode}${i} · ${e.dirty.size} dirty` : "", mE();
}
function mE() {
	let t = document.getElementById("interactionLegend");
	if (!t) return;
	if (e.selectedKind && e.selectedKind !== "component") {
		t.hidden = !0, t.innerHTML = "";
		return;
	}
	let n = e.previewRoot, r = n && e.catalogue?.interactionsByComponent?.[n];
	if (!Array.isArray(r) || !r.length) {
		t.hidden = !0, t.innerHTML = "";
		return;
	}
	let i = /* @__PURE__ */ new Set();
	for (let e of r) for (let t of e.handlers ?? []) t?.event && i.add(String(t.event));
	if (!i.size) {
		t.hidden = !0;
		return;
	}
	t.hidden = !1, t.innerHTML = `<strong>Host events</strong> ${[...i].map(_E).join(" · ")} <span class="hint">— inbound from the runtime, not parent emits</span>`;
}
function hE(e) {
	document.getElementById("statusRight").textContent = e;
}
function gE(e, t, n) {
	let r = new Blob([t], { type: n || "text/plain" }), i = URL.createObjectURL(r), a = document.createElement("a");
	a.href = i, a.download = e, a.click(), URL.revokeObjectURL(i);
}
function _E(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function vE(e) {
	return _E(e).replace(/"/g, "&quot;");
}
GT();
//#endregion
