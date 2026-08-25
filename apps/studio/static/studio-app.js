//#region src/state.js
var e = {
	mode: "design",
	navTab: "system",
	previewMode: "primary",
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
function ee(e) {
	return e >= 127462 && e <= 127487;
}
var te = 8205;
function ne(e, t, n = !0, r = !0) {
	return (n ? re : ie)(e, t, r);
}
function re(e, t, n) {
	if (t == e.length) return t;
	t && oe(e.charCodeAt(t)) && se(e.charCodeAt(t - 1)) && t--;
	let r = ae(e, t);
	for (t += ce(r); t < e.length;) {
		let i = ae(e, t);
		if (r == te || i == te || n && y(i)) t += ce(i), r = i;
		else if (ee(i)) {
			let n = 0, r = t - 2;
			for (; r >= 0 && ee(ae(e, r));) n++, r -= 2;
			if (n % 2 == 0) break;
			t += 2;
		} else break;
	}
	return t;
}
function ie(e, t, n) {
	for (; t > 1;) {
		let r = re(e, t - 2, n);
		if (r < t) return r;
		t--;
	}
	return 0;
}
function ae(e, t) {
	let n = e.charCodeAt(t);
	if (!se(n) || t + 1 == e.length) return n;
	let r = e.charCodeAt(t + 1);
	return oe(r) ? (n - 55296 << 10) + (r - 56320) + 65536 : n;
}
function oe(e) {
	return e >= 56320 && e < 57344;
}
function se(e) {
	return e >= 55296 && e < 56320;
}
function ce(e) {
	return e < 65536 ? 1 : 2;
}
//#endregion
//#region node_modules/@codemirror/state/dist/index.js
var b = class e {
	lineAt(e) {
		if (e < 0 || e > this.length) throw RangeError(`Invalid position ${e} in document of length ${this.length}`);
		return this.lineInner(e, !1, 1, 0);
	}
	line(e) {
		if (e < 1 || e > this.lines) throw RangeError(`Invalid line number ${e} in ${this.lines}-line document`);
		return this.lineInner(e, !0, 1, 0);
	}
	replace(e, t, n) {
		[e, t] = ve(this, e, t);
		let r = [];
		return this.decompose(0, e, r, 2), n.length && n.decompose(0, n.length, r, 3), this.decompose(t, this.length, r, 1), ue.from(r, this.length - (t - e) + n.length);
	}
	append(e) {
		return this.replace(this.length, this.length, e);
	}
	slice(e, t = this.length) {
		[e, t] = ve(this, e, t);
		let n = [];
		return this.decompose(e, t, n, 0), ue.from(n, t - e);
	}
	eq(e) {
		if (e == this) return !0;
		if (e.length != this.length || e.lines != this.lines) return !1;
		let t = this.scanIdentical(e, 1), n = this.length - this.scanIdentical(e, -1), r = new me(this), i = new me(e);
		for (let e = t, a = t;;) {
			if (r.next(e), i.next(e), e = 0, r.lineBreak != i.lineBreak || r.done != i.done || r.value != i.value) return !1;
			if (a += r.value.length, r.done || a >= n) return !0;
		}
	}
	iter(e = 1) {
		return new me(this, e);
	}
	iterRange(e, t = this.length) {
		return new he(this, e, t);
	}
	iterLines(e, t) {
		let n;
		if (e == null) n = this.iter();
		else {
			t ??= this.lines + 1;
			let r = this.line(e).from;
			n = this.iterRange(r, Math.max(r, t == this.lines + 1 ? this.length : t <= 1 ? 0 : this.line(t - 1).to));
		}
		return new ge(n);
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
		return t.length == 1 && !t[0] ? e.empty : t.length <= 32 ? new le(t) : ue.from(le.split(t, []));
	}
}, le = class e extends b {
	constructor(e, t = de(e)) {
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
			if ((t ? n : o) >= e) return new _e(r, o, n, a);
			r = o + 1, n++;
		}
	}
	decompose(t, n, r, i) {
		let a = t <= 0 && n >= this.length ? this : new e(pe(this.text, t, n), Math.min(n, this.length) - Math.max(0, t));
		if (i & 1) {
			let t = r.pop(), n = fe(a.text, t.text.slice(), 0, a.length);
			if (n.length <= 32) r.push(new e(n, t.length + a.length));
			else {
				let t = n.length >> 1;
				r.push(new e(n.slice(0, t)), new e(n.slice(t)));
			}
		} else r.push(a);
	}
	replace(t, n, r) {
		if (!(r instanceof e)) return super.replace(t, n, r);
		[t, n] = ve(this, t, n);
		let i = fe(this.text, fe(r.text, pe(this.text, 0, t)), n), a = this.length + r.length - (n - t);
		return i.length <= 32 ? new e(i, a) : ue.from(e.split(i, []), a);
	}
	sliceString(e, t = this.length, n = "\n") {
		[e, t] = ve(this, e, t);
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
}, ue = class e extends b {
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
		if ([t, n] = ve(this, t, n), r.lines < this.lines) for (let i = 0, a = 0; i < this.children.length; i++) {
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
		[e, t] = ve(this, e, t);
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
			return new le(e, n);
		}
		let i = Math.max(32, r >> 5), a = i << 1, o = i >> 1, s = [], c = 0, l = -1, u = [];
		function d(t) {
			let n;
			if (t.lines > a && t instanceof e) for (let e of t.children) d(e);
			else t.lines > o && (c > o || !c) ? (f(), s.push(t)) : t instanceof le && c && (n = u[u.length - 1]) instanceof le && t.lines + n.lines <= 32 ? (c += t.lines, l += t.length + 1, u[u.length - 1] = new le(n.text.concat(t.text), n.length + 1 + t.length)) : (c + t.lines > i && f(), c += t.lines, l += t.length + 1, u.push(t));
		}
		function f() {
			c != 0 && (s.push(u.length == 1 ? u[0] : e.from(u, l)), l = -1, c = u.length = 0);
		}
		for (let e of t) d(e);
		return f(), s.length == 1 ? s[0] : new e(s, n);
	}
};
b.empty = /*@__PURE__*/ new le([""], 0);
function de(e) {
	let t = -1;
	for (let n of e) t += n.length + 1;
	return t;
}
function fe(e, t, n = 0, r = 1e9) {
	for (let i = 0, a = 0, o = !0; a < e.length && i <= r; a++) {
		let s = e[a], c = i + s.length;
		c >= n && (c > r && (s = s.slice(0, r - i)), i < n && (s = s.slice(n - i)), o ? (t[t.length - 1] += s, o = !1) : t.push(s)), i = c + 1;
	}
	return t;
}
function pe(e, t, n) {
	return fe(e, [""], t, n);
}
var me = class {
	constructor(e, t = 1) {
		this.dir = t, this.done = !1, this.lineBreak = !1, this.value = "", this.nodes = [e], this.offsets = [t > 0 ? 1 : (e instanceof le ? e.text.length : e.children.length) << 1];
	}
	nextInner(e, t) {
		for (this.done = this.lineBreak = !1;;) {
			let n = this.nodes.length - 1, r = this.nodes[n], i = this.offsets[n], a = i >> 1, o = r instanceof le ? r.text.length : r.children.length;
			if (a == (t > 0 ? o : 0)) {
				if (n == 0) return this.done = !0, this.value = "", this;
				t > 0 && this.offsets[n - 1]++, this.nodes.pop(), this.offsets.pop();
			} else if ((i & 1) == (t > 0 ? 0 : 1)) {
				if (this.offsets[n] += t, e == 0) return this.lineBreak = !0, this.value = "\n", this;
				e--;
			} else if (r instanceof le) {
				let i = r.text[a + (t < 0 ? -1 : 0)];
				if (this.offsets[n] += t, i.length > Math.max(0, e)) return this.value = e == 0 ? i : t > 0 ? i.slice(e) : i.slice(0, i.length - e), this;
				e -= i.length;
			} else {
				let i = r.children[a + (t < 0 ? -1 : 0)];
				e > i.length ? (e -= i.length, this.offsets[n] += t) : (t < 0 && this.offsets[n]--, this.nodes.push(i), this.offsets.push(t > 0 ? 1 : (i instanceof le ? i.text.length : i.children.length) << 1));
			}
		}
	}
	next(e = 0) {
		return e < 0 && (this.nextInner(-e, -this.dir), e = this.value.length), this.nextInner(e, this.dir);
	}
}, he = class {
	constructor(e, t, n) {
		this.value = "", this.done = !1, this.cursor = new me(e, t > n ? -1 : 1), this.pos = t > n ? e.length : 0, this.from = Math.min(t, n), this.to = Math.max(t, n);
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
}, ge = class {
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
typeof Symbol < "u" && (b.prototype[Symbol.iterator] = function() {
	return this.iter();
}, me.prototype[Symbol.iterator] = he.prototype[Symbol.iterator] = ge.prototype[Symbol.iterator] = function() {
	return this;
});
var _e = class {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.number = n, this.text = r;
	}
	get length() {
		return this.to - this.from;
	}
};
function ve(e, t, n) {
	return t = Math.max(0, Math.min(e.length, t)), [t, Math.max(t, Math.min(e.length, n))];
}
function x(e, t, n = !0, r = !0) {
	return ne(e, t, n, r);
}
function ye(e) {
	return e >= 56320 && e < 57344;
}
function be(e) {
	return e >= 55296 && e < 56320;
}
function xe(e, t) {
	let n = e.charCodeAt(t);
	if (!be(n) || t + 1 == e.length) return n;
	let r = e.charCodeAt(t + 1);
	return ye(r) ? (n - 55296 << 10) + (r - 56320) + 65536 : n;
}
function Se(e) {
	return e <= 65535 ? String.fromCharCode(e) : (e -= 65536, String.fromCharCode((e >> 10) + 55296, (e & 1023) + 56320));
}
function Ce(e) {
	return e < 65536 ? 1 : 2;
}
var we = /\r\n?|\n/, Te = /*@__PURE__*/ (function(e) {
	return e[e.Simple = 0] = "Simple", e[e.TrackDel = 1] = "TrackDel", e[e.TrackBefore = 2] = "TrackBefore", e[e.TrackAfter = 3] = "TrackAfter", e;
})(Te ||= {}), Ee = class e {
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
		ke(this, e, t);
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
		return this.empty ? e : e.empty ? this : je(this, e);
	}
	mapDesc(e, t = !1) {
		return e.empty ? this : Ae(this, e, t);
	}
	mapPos(e, t = -1, n = Te.Simple) {
		let r = 0, i = 0;
		for (let a = 0; a < this.sections.length;) {
			let o = this.sections[a++], s = this.sections[a++], c = r + o;
			if (s < 0) {
				if (c > e) return i + (e - r);
				i += o;
			} else {
				if (n != Te.Simple && c >= e && (n == Te.TrackDel && r < e && c > e || n == Te.TrackBefore && r < e || n == Te.TrackAfter && c > e)) return null;
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
}, De = class e extends Ee {
	constructor(e, t) {
		super(e), this.inserted = t;
	}
	apply(e) {
		if (this.length != e.length) throw RangeError("Applying change set to a document with the wrong length");
		return ke(this, (t, n, r, i, a) => e = e.replace(r, r + (n - t), a), !1), e;
	}
	mapDesc(e, t = !1) {
		return Ae(this, e, t, !0);
	}
	invert(t) {
		let n = this.sections.slice(), r = [];
		for (let e = 0, i = 0; e < n.length; e += 2) {
			let a = n[e], o = n[e + 1];
			if (o >= 0) {
				n[e] = o, n[e + 1] = a;
				let s = e >> 1;
				for (; r.length < s;) r.push(b.empty);
				r.push(a ? t.slice(i, i + a) : b.empty);
			}
			i += a;
		}
		return new e(n, r);
	}
	compose(e) {
		return this.empty ? e : e.empty ? this : je(this, e, !0);
	}
	map(e, t = !1) {
		return e.empty ? this : Ae(this, e, t, !0);
	}
	iterChanges(e, t = !1) {
		ke(this, e, t);
	}
	get desc() {
		return Ee.create(this.sections);
	}
	filter(t) {
		let n = [], r = [], i = [], a = new Me(this);
		done: for (let e = 0, o = 0;;) {
			let s = e == t.length ? 1e9 : t[e++];
			for (; o < s || o == s && a.len == 0;) {
				if (a.done) break done;
				let e = Math.min(a.len, s - o);
				S(i, e, -1);
				let t = a.ins == -1 ? -1 : a.off == 0 ? a.ins : 0;
				S(n, e, t), t > 0 && Oe(r, n, a.text), a.forward(e), o += e;
			}
			let c = t[e++];
			for (; o < c;) {
				if (a.done) break done;
				let e = Math.min(a.len, c - o);
				S(n, e, -1), S(i, e, a.ins == -1 ? -1 : a.off == 0 ? a.ins : 0), a.forward(e), o += e;
			}
		}
		return {
			changes: new e(n, r),
			filtered: Ee.create(i)
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
			o < n && S(i, n - o, -1);
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
				let u = l ? typeof l == "string" ? b.of(l.split(r || we)) : l : b.empty, d = u.length;
				if (e == s && d == 0) return;
				e < o && c(), e > o && S(i, e - o, -1), S(i, s - e, d), Oe(a, i, u), o = s;
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
				for (; r.length < e;) r.push(b.empty);
				r[e] = b.of(i.slice(1)), n.push(i[0], r[e].length);
			}
		}
		return new e(n, r);
	}
	static createSet(t, n) {
		return new e(t, n);
	}
};
function S(e, t, n, r = !1) {
	if (t == 0 && n <= 0) return;
	let i = e.length - 2;
	i >= 0 && n <= 0 && n == e[i + 1] ? e[i] += t : i >= 0 && t == 0 && e[i] == 0 ? e[i + 1] += n : r ? (e[i] += t, e[i + 1] += n) : e.push(t, n);
}
function Oe(e, t, n) {
	if (n.length == 0) return;
	let r = t.length - 2 >> 1;
	if (r < e.length) e[e.length - 1] = e[e.length - 1].append(n);
	else {
		for (; e.length < r;) e.push(b.empty);
		e.push(n);
	}
}
function ke(e, t, n) {
	let r = e.inserted;
	for (let i = 0, a = 0, o = 0; o < e.sections.length;) {
		let s = e.sections[o++], c = e.sections[o++];
		if (c < 0) i += s, a += s;
		else {
			let l = i, u = a, d = b.empty;
			for (; l += s, u += c, c && r && (d = d.append(r[o - 2 >> 1])), !(n || o == e.sections.length || e.sections[o + 1] < 0);) s = e.sections[o++], c = e.sections[o++];
			t(i, l, a, u, d), i = l, a = u;
		}
	}
}
function Ae(e, t, n, r = !1) {
	let i = [], a = r ? [] : null, o = new Me(e), s = new Me(t);
	for (let e = -1;;) if (o.done && s.len || s.done && o.len) throw Error("Mismatched change set lengths");
	else if (o.ins == -1 && s.ins == -1) {
		let e = Math.min(o.len, s.len);
		S(i, e, -1), o.forward(e), s.forward(e);
	} else if (s.ins >= 0 && (o.ins < 0 || e == o.i || o.off == 0 && (s.len < o.len || s.len == o.len && !n))) {
		let t = s.len;
		for (S(i, s.ins, -1); t;) {
			let n = Math.min(o.len, t);
			o.ins >= 0 && e < o.i && o.len <= n && (S(i, 0, o.ins), a && Oe(a, i, o.text), e = o.i), o.forward(n), t -= n;
		}
		s.next();
	} else if (o.ins >= 0) {
		let t = 0, n = o.len;
		for (; n;) if (s.ins == -1) {
			let e = Math.min(n, s.len);
			t += e, n -= e, s.forward(e);
		} else if (s.ins == 0 && s.len < n) n -= s.len, s.next();
		else break;
		S(i, t, e < o.i ? o.ins : 0), a && e < o.i && Oe(a, i, o.text), e = o.i, o.forward(o.len - n);
	} else if (o.done && s.done) return a ? De.createSet(i, a) : Ee.create(i);
	else throw Error("Mismatched change set lengths");
}
function je(e, t, n = !1) {
	let r = [], i = n ? [] : null, a = new Me(e), o = new Me(t);
	for (let e = !1;;) if (a.done && o.done) return i ? De.createSet(r, i) : Ee.create(r);
	else if (a.ins == 0) S(r, a.len, 0, e), a.next();
	else if (o.len == 0 && !o.done) S(r, 0, o.ins, e), i && Oe(i, r, o.text), o.next();
	else if (a.done || o.done) throw Error("Mismatched change set lengths");
	else {
		let t = Math.min(a.len2, o.len), n = r.length;
		if (a.ins == -1) {
			let n = o.ins == -1 ? -1 : o.off ? 0 : o.ins;
			S(r, t, n, e), i && n && Oe(i, r, o.text);
		} else o.ins == -1 ? (S(r, a.off ? 0 : a.len, t, e), i && Oe(i, r, a.textBit(t))) : (S(r, a.off ? 0 : a.len, o.off ? 0 : o.ins, e), i && !o.off && Oe(i, r, o.text));
		e = (a.ins > t || o.ins >= 0 && o.len > t) && (e || r.length > n), a.forward2(t), o.forward(t);
	}
}
var Me = class {
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
		return t >= e.length ? b.empty : e[t];
	}
	textBit(e) {
		let { inserted: t } = this.set, n = this.i - 2 >> 1;
		return n >= t.length && !e ? b.empty : t[n].slice(this.off, e == null ? void 0 : this.off + e);
	}
	forward(e) {
		e == this.len ? this.next() : (this.len -= e, this.off += e);
	}
	forward2(e) {
		this.ins == -1 ? this.forward(e) : e == this.ins ? this.next() : (this.ins -= e, this.off += e);
	}
}, Ne = class e {
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
		if (e <= this.anchor && t >= this.anchor) return C.range(e, t, void 0, void 0, n);
		let r = Math.abs(e - this.anchor) > Math.abs(t - this.anchor) ? e : t;
		return C.range(this.anchor, r, void 0, void 0, n);
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
		return C.range(e.anchor, e.head);
	}
	static create(t, n, r, i) {
		return new e(t, n, r, i);
	}
}, C = class e {
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
		return new e(t.ranges.map((e) => Ne.fromJSON(e)), t.main);
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
		return Ne.create(e, e, (t == 0 ? 0 : t < 0 ? 8 : 16) | (n == null ? 7 : Math.min(6, n)), r);
	}
	static range(e, t, n, r, i) {
		let a = r == null ? 7 : Math.min(6, r);
		return !i && e != t && (i = t < e ? 1 : -1), i && (a |= i < 0 ? 8 : 16), t < e ? Ne.create(t, e, a | 32, n) : Ne.create(e, t, a, n);
	}
	static undirectionalRange(e, t) {
		return Ne.create(e, t, 64, void 0);
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
function Pe(e, t) {
	for (let n of e.ranges) if (n.to > t) throw RangeError("Selection points outside of document");
}
var Fe = 0, w = class e {
	constructor(e, t, n, r, i) {
		this.combine = e, this.compareInput = t, this.compare = n, this.isStatic = r, this.id = Fe++, this.default = e([]), this.extensions = typeof i == "function" ? i(this) : i;
	}
	get reader() {
		return this;
	}
	static define(t = {}) {
		return new e(t.combine || ((e) => e), t.compareInput || ((e, t) => e === t), t.compare || (t.combine ? (e, t) => e === t : Ie), !!t.static, t.enables);
	}
	of(e) {
		return new Le([], this, 0, e);
	}
	compute(e, t) {
		if (this.isStatic) throw Error("Can't compute a static facet");
		return new Le(e, this, 1, t);
	}
	computeN(e, t) {
		if (this.isStatic) throw Error("Can't compute a static facet");
		return new Le(e, this, 2, t);
	}
	from(e, t) {
		return t ||= (e) => e, this.compute([e], (n) => t(n.field(e)));
	}
};
function Ie(e, t) {
	return e == t || e.length == t.length && e.every((e, n) => e === t[n]);
}
var Le = class {
	constructor(e, t, n, r) {
		this.dependencies = e, this.facet = t, this.type = n, this.value = r, this.id = Fe++;
	}
	dynamicSlot(e) {
		let t = this.value, n = this.facet.compareInput, r = this.id, i = e[r] >> 1, a = this.type == 2, o = !1, s = !1, c = [];
		for (let t of this.dependencies) t == "doc" ? o = !0 : t == "selection" ? s = !0 : (e[t.id] ?? 1) & 1 || c.push(e[t.id]);
		return {
			create(e) {
				return e.values[i] = t(e), 1;
			},
			update(e, r) {
				if (o && r.docChanged || s && (r.docChanged || r.selection) || ze(e, c)) {
					let r = t(e);
					if (a ? !Re(r, e.values[i], n) : !n(r, e.values[i])) return e.values[i] = r, 1;
				}
				return 0;
			},
			reconfigure: (e, o) => {
				let s, c = o.config.address[r];
				if (c != null) {
					let r = Qe(o, c);
					if (this.dependencies.every((t) => t instanceof w ? o.facet(t) === e.facet(t) : t instanceof He ? o.field(t, !1) == e.field(t, !1) : !0) || (a ? Re(s = t(e), r, n) : n(s = t(e), r))) return e.values[i] = r, 0;
				} else s = t(e);
				return e.values[i] = s, 1;
			}
		};
	}
	get extension() {
		return this;
	}
};
function Re(e, t, n) {
	if (e.length != t.length) return !1;
	for (let r = 0; r < e.length; r++) if (!n(e[r], t[r])) return !1;
	return !0;
}
function ze(e, t) {
	let n = !1;
	for (let r of t) Ze(e, r) & 1 && (n = !0);
	return n;
}
function Be(e, t, n) {
	let r = n.map((t) => e[t.id]), i = n.map((e) => e.type), a = r.filter((e) => !(e & 1)), o = e[t.id] >> 1;
	function s(e) {
		let n = [];
		for (let t = 0; t < r.length; t++) {
			let a = Qe(e, r[t]);
			if (i[t] == 2) for (let e of a) n.push(e);
			else n.push(a);
		}
		return t.combine(n);
	}
	return {
		create(e) {
			for (let t of r) Ze(e, t);
			return e.values[o] = s(e), 1;
		},
		update(e, n) {
			if (!ze(e, a)) return 0;
			let r = s(e);
			return t.compare(r, e.values[o]) ? 0 : (e.values[o] = r, 1);
		},
		reconfigure(e, i) {
			let a = ze(e, r), c = i.config.facets[t.id], l = i.facet(t);
			if (c && !a && Ie(n, c)) return e.values[o] = l, 0;
			let u = s(e);
			return t.compare(u, l) ? (e.values[o] = l, 0) : (e.values[o] = u, 1);
		}
	};
}
var Ve = /*@__PURE__*/ w.define({ static: !0 }), He = class e {
	constructor(e, t, n, r, i) {
		this.id = e, this.createF = t, this.updateF = n, this.compareF = r, this.spec = i, this.provides = void 0;
	}
	static define(t) {
		let n = new e(Fe++, t.create, t.update, t.compare || ((e, t) => e === t), t);
		return t.provide && (n.provides = t.provide(n)), n;
	}
	create(e) {
		return (e.facet(Ve).find((e) => e.field == this)?.create || this.createF)(e);
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
				let r = e.facet(Ve), i = n.facet(Ve), a;
				return (a = r.find((e) => e.field == this)) && a != i.find((e) => e.field == this) ? (e.values[t] = a.create(e), 1) : n.config.address[this.id] == null ? (e.values[t] = this.create(e), 1) : (e.values[t] = n.field(this), 0);
			}
		};
	}
	init(e) {
		return [this, Ve.of({
			field: this,
			create: e
		})];
	}
	get extension() {
		return this;
	}
}, Ue = {
	lowest: 4,
	low: 3,
	default: 2,
	high: 1,
	highest: 0
};
function We(e) {
	return (t) => new Ke(t, e);
}
var Ge = {
	highest: /*@__PURE__*/ We(Ue.highest),
	high: /*@__PURE__*/ We(Ue.high),
	default: /*@__PURE__*/ We(Ue.default),
	low: /*@__PURE__*/ We(Ue.low),
	lowest: /*@__PURE__*/ We(Ue.lowest)
}, Ke = class {
	constructor(e, t) {
		this.inner = e, this.prec = t;
	}
	get extension() {
		return this;
	}
}, qe = class e {
	of(e) {
		return new Je(this, e);
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
}, Je = class {
	constructor(e, t) {
		this.compartment = e, this.inner = t;
	}
	get extension() {
		return this;
	}
}, Ye = class e {
	constructor(e, t, n, r, i, a) {
		for (this.base = e, this.compartments = t, this.dynamicSlots = n, this.address = r, this.staticValues = i, this.facets = a, this.statusTemplate = []; this.statusTemplate.length < n.length;) this.statusTemplate.push(0);
	}
	staticFacet(e) {
		let t = this.address[e.id];
		return t == null ? e.default : this.staticValues[t >> 1];
	}
	static resolve(t, n, r) {
		let i = [], a = Object.create(null), o = /* @__PURE__ */ new Map();
		for (let e of Xe(t, n, o)) e instanceof He ? i.push(e) : (a[e.facet.id] || (a[e.facet.id] = [])).push(e);
		let s = Object.create(null), c = [], l = [];
		for (let e of i) s[e.id] = l.length << 1, l.push((t) => e.slot(t));
		let u = r?.config.facets;
		for (let e in a) {
			let t = a[e], n = t[0].facet, i = u && u[e] || [];
			if (t.every((e) => e.type == 0)) {
				if (s[n.id] = c.length << 1 | 1, Ie(i, t)) c.push(r.facet(n));
				else {
					let e = n.combine(t.map((e) => e.value));
					c.push(r && n.compare(e, r.facet(n)) ? r.facet(n) : e);
				}
			} else {
				for (let e of t) e.type == 0 ? (s[e.id] = c.length << 1 | 1, c.push(e.value)) : (s[e.id] = l.length << 1, l.push((t) => e.dynamicSlot(t)));
				s[n.id] = l.length << 1, l.push((e) => Be(e, n, t));
			}
		}
		let d = l.map((e) => e(s));
		return new e(t, o, d, s, c, a);
	}
};
function Xe(e, t, n) {
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
			t > -1 && r[s].splice(t, 1), e instanceof Je && n.delete(e.compartment);
		}
		if (i.set(e, o), Array.isArray(e)) for (let t of e) a(t, o);
		else if (e instanceof Je) {
			if (n.has(e.compartment)) throw RangeError("Duplicate use of compartment in extensions");
			let r = t.get(e.compartment) || e.inner;
			n.set(e.compartment, r), a(r, o);
		} else if (e instanceof Ke) a(e.inner, e.prec);
		else if (e instanceof He) r[o].push(e), e.provides && a(e.provides, o);
		else if (e instanceof Le) r[o].push(e), e.facet.extensions && a(e.facet.extensions, Ue.default);
		else {
			let t = e.extension;
			if (!t) throw Error(`Unrecognized extension value in extension set (${e}).`);
			if (t == e) throw Error(`Unrecognized extension value in extension set (${e}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`);
			a(t, o);
		}
	}
	return a(e, Ue.default), r.reduce((e, t) => e.concat(t));
}
function Ze(e, t) {
	if (t & 1) return 2;
	let n = t >> 1, r = e.status[n];
	if (r == 4) throw Error("Cyclic dependency between fields and/or facets");
	if (r & 2) return r;
	e.status[n] = 4;
	let i = e.computeSlot(e, e.config.dynamicSlots[n]);
	return e.status[n] = 2 | i;
}
function Qe(e, t) {
	return t & 1 ? e.config.staticValues[t >> 1] : e.values[t >> 1];
}
var $e = /*@__PURE__*/ w.define(), et = /*@__PURE__*/ w.define({
	combine: (e) => e.some((e) => e),
	static: !0
}), tt = /*@__PURE__*/ w.define({
	combine: (e) => e.length ? e[0] : void 0,
	static: !0
}), nt = /*@__PURE__*/ w.define(), rt = /*@__PURE__*/ w.define(), it = /*@__PURE__*/ w.define(), at = /*@__PURE__*/ w.define({ combine: (e) => e.length ? e[0] : !1 }), ot = class {
	constructor(e, t) {
		this.type = e, this.value = t;
	}
	static define() {
		return new st();
	}
}, st = class {
	of(e) {
		return new ot(this, e);
	}
}, ct = class {
	constructor(e) {
		this.map = e;
	}
	of(e) {
		return new T(this, e);
	}
}, T = class e {
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
		return new ct(e.map || ((e) => e));
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
T.reconfigure = /*@__PURE__*/ T.define(), T.appendConfig = /*@__PURE__*/ T.define();
var lt = class e {
	constructor(t, n, r, i, a, o) {
		this.startState = t, this.changes = n, this.selection = r, this.effects = i, this.annotations = a, this.scrollIntoView = o, this._doc = null, this._state = null, r && Pe(r, n.newLength), a.some((t) => t.type == e.time) || (this.annotations = a.concat(e.time.of(Date.now())));
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
lt.time = /*@__PURE__*/ ot.define(), lt.userEvent = /*@__PURE__*/ ot.define(), lt.addToHistory = /*@__PURE__*/ ot.define(), lt.remote = /*@__PURE__*/ ot.define();
function ut(e, t) {
	let n = [];
	for (let r = 0, i = 0;;) {
		let a, o;
		if (r < e.length && (i == t.length || t[i] >= e[r])) a = e[r++], o = e[r++];
		else if (i < t.length) a = t[i++], o = t[i++];
		else return n;
		!n.length || n[n.length - 1] < a ? n.push(a, o) : n[n.length - 1] < o && (n[n.length - 1] = o);
	}
}
function dt(e, t, n) {
	let r, i, a;
	return n ? (r = t.changes, i = De.empty(t.changes.length), a = e.changes.compose(t.changes)) : (r = t.changes.map(e.changes), i = e.changes.mapDesc(t.changes, !0), a = e.changes.compose(r)), {
		changes: a,
		selection: t.selection ? t.selection.map(i) : e.selection?.map(r),
		effects: T.mapEffects(e.effects, r).concat(T.mapEffects(t.effects, i)),
		annotations: e.annotations.length ? e.annotations.concat(t.annotations) : t.annotations,
		scrollIntoView: e.scrollIntoView || t.scrollIntoView
	};
}
function ft(e, t, n) {
	let r = t.selection, i = _t(t.annotations);
	return t.userEvent && (i = i.concat(lt.userEvent.of(t.userEvent))), {
		changes: t.changes instanceof De ? t.changes : De.of(t.changes || [], n, e.facet(tt)),
		selection: r && (r instanceof C ? r : C.single(r.anchor, r.head)),
		effects: _t(t.effects),
		annotations: i,
		scrollIntoView: !!t.scrollIntoView
	};
}
function pt(e, t, n) {
	let r = ft(e, t.length ? t[0] : {}, e.doc.length);
	t.length && t[0].filter === !1 && (n = !1);
	for (let i = 1; i < t.length; i++) {
		t[i].filter === !1 && (n = !1);
		let a = !!t[i].sequential;
		r = dt(r, ft(e, t[i], a ? r.changes.newLength : e.doc.length), a);
	}
	let i = lt.create(e, r.changes, r.selection, r.effects, r.annotations, r.scrollIntoView);
	return ht(n ? mt(i) : i);
}
function mt(e) {
	let t = e.startState, n = !0;
	for (let r of t.facet(nt)) {
		let t = r(e);
		if (t === !1) {
			n = !1;
			break;
		}
		Array.isArray(t) && (n = n === !0 ? t : ut(n, t));
	}
	if (n !== !0) {
		let r, i;
		if (n === !1) i = e.changes.invertedDesc, r = De.empty(t.doc.length);
		else {
			let t = e.changes.filter(n);
			r = t.changes, i = t.filtered.mapDesc(t.changes).invertedDesc;
		}
		e = lt.create(t, r, e.selection && e.selection.map(i), T.mapEffects(e.effects, i), e.annotations, e.scrollIntoView);
	}
	let r = t.facet(rt);
	for (let n = r.length - 1; n >= 0; n--) {
		let i = r[n](e);
		e = i instanceof lt ? i : Array.isArray(i) && i.length == 1 && i[0] instanceof lt ? i[0] : pt(t, _t(i), !1);
	}
	return e;
}
function ht(e) {
	let t = e.startState, n = t.facet(it), r = e;
	for (let i = n.length - 1; i >= 0; i--) {
		let a = n[i](e);
		a && Object.keys(a).length && (r = dt(r, ft(t, a, e.changes.newLength), !0));
	}
	return r == e ? e : lt.create(t, e.changes, e.selection, r.effects, r.annotations, r.scrollIntoView);
}
var gt = [];
function _t(e) {
	return e == null ? gt : Array.isArray(e) ? e : [e];
}
var E = /*@__PURE__*/ (function(e) {
	return e[e.Word = 0] = "Word", e[e.Space = 1] = "Space", e[e.Other = 2] = "Other", e;
})(E ||= {}), vt = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/, yt;
try {
	yt = /*@__PURE__*/ RegExp("[\\p{Alphabetic}\\p{Number}_]", "u");
} catch {}
function bt(e) {
	if (yt) return yt.test(e);
	for (let t = 0; t < e.length; t++) {
		let n = e[t];
		if (/\w/.test(n) || n > "" && (n.toUpperCase() != n.toLowerCase() || vt.test(n))) return !0;
	}
	return !1;
}
function xt(e) {
	return (t) => {
		if (!/\S/.test(t)) return E.Space;
		if (bt(t)) return E.Word;
		for (let n = 0; n < e.length; n++) if (t.indexOf(e[n]) > -1) return E.Word;
		return E.Other;
	};
}
var D = class e {
	constructor(e, t, n, r, i, a) {
		this.config = e, this.doc = t, this.selection = n, this.values = r, this.status = e.statusTemplate.slice(), this.computeSlot = i, a && (a._state = this);
		for (let e = 0; e < this.config.dynamicSlots.length; e++) Ze(this, e << 1);
		this.computeSlot = null;
	}
	field(e, t = !0) {
		let n = this.config.address[e.id];
		if (n == null) {
			if (t) throw RangeError("Field is not present in this state");
			return;
		}
		return Ze(this, n), Qe(this, n);
	}
	update(...e) {
		return pt(this, e, !0);
	}
	applyTransaction(t) {
		let n = this.config, { base: r, compartments: i } = n;
		for (let e of t.effects) e.is(qe.reconfigure) ? (n &&= (i = /* @__PURE__ */ new Map(), n.compartments.forEach((e, t) => i.set(t, e)), null), i.set(e.value.compartment, e.value.extension)) : e.is(T.reconfigure) ? (n = null, r = e.value) : e.is(T.appendConfig) && (n = null, r = _t(r).concat(e.value));
		let a;
		n ? a = t.startState.values.slice() : (n = Ye.resolve(r, i, this), a = new e(n, this.doc, this.selection, n.dynamicSlots.map(() => null), (e, t) => t.reconfigure(e, this), null).values);
		let o = t.startState.facet(et) ? t.newSelection : t.newSelection.asSingle();
		new e(n, t.newDoc, o, a, (e, n) => n.update(e, t), t);
	}
	replaceSelection(e) {
		return typeof e == "string" && (e = this.toText(e)), this.changeByRange((t) => ({
			changes: {
				from: t.from,
				to: t.to,
				insert: e
			},
			range: C.cursor(t.from + e.length)
		}));
	}
	changeByRange(e) {
		let t = this.selection, n = e(t.ranges[0]), r = this.changes(n.changes), i = [n.range], a = _t(n.effects);
		for (let n = 1; n < t.ranges.length; n++) {
			let o = e(t.ranges[n]), s = this.changes(o.changes), c = s.map(r);
			for (let e = 0; e < n; e++) i[e] = i[e].map(c);
			let l = r.mapDesc(s, !0);
			i.push(o.range.map(l)), r = r.compose(c), a = T.mapEffects(a, c).concat(T.mapEffects(_t(o.effects), l));
		}
		return {
			changes: r,
			selection: C.create(i, t.mainIndex),
			effects: a
		};
	}
	changes(t = []) {
		return t instanceof De ? t : De.of(t, this.doc.length, this.facet(e.lineSeparator));
	}
	toText(t) {
		return b.of(t.split(this.facet(e.lineSeparator) || we));
	}
	sliceDoc(e = 0, t = this.doc.length) {
		return this.doc.sliceString(e, t, this.lineBreak);
	}
	facet(e) {
		let t = this.config.address[e.id];
		return t == null ? e.default : (Ze(this, t), Qe(this, t));
	}
	toJSON(e) {
		let t = {
			doc: this.sliceDoc(),
			selection: this.selection.toJSON()
		};
		if (e) for (let n in e) {
			let r = e[n];
			r instanceof He && this.config.address[r.id] != null && (t[n] = r.spec.toJSON(this.field(e[n]), this));
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
			selection: C.fromJSON(t.selection),
			extensions: n.extensions ? i.concat([n.extensions]) : i
		});
	}
	static create(t = {}) {
		let n = Ye.resolve(t.extensions || [], /* @__PURE__ */ new Map()), r = t.doc instanceof b ? t.doc : b.of((t.doc || "").split(n.staticFacet(e.lineSeparator) || we)), i = t.selection ? t.selection instanceof C ? t.selection : C.single(t.selection.anchor, t.selection.head) : C.single(0);
		return Pe(i, r.length), n.staticFacet(et) || (i = i.asSingle()), new e(n, r, i, n.dynamicSlots.map(() => null), (e, t) => t.create(e), null);
	}
	get tabSize() {
		return this.facet(e.tabSize);
	}
	get lineBreak() {
		return this.facet(e.lineSeparator) || "\n";
	}
	get readOnly() {
		return this.facet(at);
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
		for (let i of this.facet($e)) for (let a of i(this, t, n)) Object.prototype.hasOwnProperty.call(a, e) && r.push(a[e]);
		return r;
	}
	charCategorizer(e) {
		let t = this.languageDataAt("wordChars", e);
		return xt(t.length ? t[0] : "");
	}
	wordAt(e) {
		let { text: t, from: n, length: r } = this.doc.lineAt(e), i = this.charCategorizer(e), a = e - n, o = e - n;
		for (; a > 0;) {
			let e = x(t, a, !1);
			if (i(t.slice(e, a)) != E.Word) break;
			a = e;
		}
		for (; o < r;) {
			let e = x(t, o);
			if (i(t.slice(o, e)) != E.Word) break;
			o = e;
		}
		return a == o ? null : C.range(a + n, o + n);
	}
};
D.allowMultipleSelections = et, D.tabSize = /*@__PURE__*/ w.define({ combine: (e) => e.length ? e[0] : 4 }), D.lineSeparator = tt, D.readOnly = at, D.phrases = /*@__PURE__*/ w.define({ compare(e, t) {
	let n = Object.keys(e), r = Object.keys(t);
	return n.length == r.length && n.every((n) => e[n] == t[n]);
} }), D.languageData = $e, D.changeFilter = nt, D.transactionFilter = rt, D.transactionExtender = it, qe.reconfigure = /*@__PURE__*/ T.define();
function St(e, t, n = {}) {
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
var Ct = class {
	eq(e) {
		return this == e;
	}
	range(e, t = e) {
		return Tt.create(e, t, this);
	}
};
Ct.prototype.startSide = Ct.prototype.endSide = 0, Ct.prototype.point = !1, Ct.prototype.mapMode = Te.TrackDel;
function wt(e, t) {
	return e == t || e.constructor == t.constructor && e.eq(t);
}
var Tt = class e {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.value = n;
	}
	static create(t, n, r) {
		return new e(t, n, r);
	}
};
function Et(e, t) {
	return e.from - t.from || e.value.startSide - t.value.startSide;
}
var Dt = class e {
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
}, O = class e {
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
		if (r && (n = n.slice().sort(Et)), this.isEmpty) return n.length ? e.of(n) : this;
		let s = new jt(this, null, -1).goto(0), c = 0, l = [], u = new kt();
		for (; s.value || c < n.length;) if (c < n.length && (s.from - n[c].from || s.startSide - n[c].value.startSide) >= 0) {
			let e = n[c++];
			u.addInner(e.from, e.to, e.value) || l.push(e);
		} else s.rangeIndex == 1 && s.chunkIndex < this.chunk.length && (c == n.length || this.chunkEnd(s.chunkIndex) < n[c].from) && (!o || i > this.chunkEnd(s.chunkIndex) || a < this.chunkPos[s.chunkIndex]) && u.addChunk(this.chunkPos[s.chunkIndex], this.chunk[s.chunkIndex]) ? s.nextChunk() : ((!o || i > s.to || a < s.from || o(s.from, s.to, s.value)) && (u.addInner(s.from, s.to, s.value) || l.push(Tt.create(s.from, s.to, s.value))), s.next());
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
		return Mt.from([this]).goto(e);
	}
	get isEmpty() {
		return this.nextLayer == this;
	}
	static iter(e, t = 0) {
		return Mt.from(e).goto(t);
	}
	static compare(e, t, n, r, i = -1) {
		let a = e.filter((e) => e.maxPoint > 0 || !e.isEmpty && e.maxPoint >= i), o = t.filter((e) => e.maxPoint > 0 || !e.isEmpty && e.maxPoint >= i), s = At(a, o, n), c = new Pt(a, s, i), l = new Pt(o, s, i);
		n.iterGaps((e, t, n) => Ft(c, e, l, t, n, r)), n.empty && n.length == 0 && Ft(c, 0, l, 0, 0, r);
	}
	static eq(e, t, n = 0, r) {
		r ??= 1e9 - 1;
		let i = e.filter((e) => !e.isEmpty && t.indexOf(e) < 0), a = t.filter((t) => !t.isEmpty && e.indexOf(t) < 0);
		if (i.length != a.length) return !1;
		if (!i.length) return !0;
		let o = At(i, a), s = new Pt(i, o, 0).goto(n), c = new Pt(a, o, 0).goto(n);
		for (;;) {
			if (s.to != c.to || !It(s.active, c.active) || s.point && (!c.point || !wt(s.point, c.point))) return !1;
			if (s.to > r) return !0;
			s.next(), c.next();
		}
	}
	static spans(e, t, n, r, i = -1) {
		let a = new Pt(e, null, i).goto(t), o = t, s = a.openStart;
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
		let n = new kt();
		for (let r of e instanceof Tt ? [e] : t ? Ot(e) : e) n.add(r.from, r.to, r.value);
		return n.finish();
	}
	static join(t) {
		if (!t.length) return e.empty;
		let n = t[t.length - 1];
		for (let r = t.length - 2; r >= 0; r--) for (let i = t[r]; i != e.empty; i = i.nextLayer) n = new e(i.chunkPos, i.chunk, n, Math.max(i.maxPoint, n.maxPoint));
		return n;
	}
};
O.empty = /*@__PURE__*/ new O([], [], null, -1);
function Ot(e) {
	if (e.length > 1) for (let t = e[0], n = 1; n < e.length; n++) {
		let r = e[n];
		if (Et(t, r) > 0) return e.slice().sort(Et);
		t = r;
	}
	return e;
}
O.empty.nextLayer = O.empty;
var kt = class e {
	finishChunk(e) {
		this.chunks.push(new Dt(this.from, this.to, this.value, this.maxPoint)), this.chunkPos.push(this.chunkStart), this.chunkStart = -1, this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint), this.maxPoint = -1, e && (this.from = [], this.to = [], this.value = []);
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
		return this.finishInner(O.empty);
	}
	finishInner(e) {
		if (this.from.length && this.finishChunk(!1), this.chunks.length == 0) return e;
		let t = O.create(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(e) : e, this.setMaxPoint);
		return this.from = null, t;
	}
};
function At(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let t of e) for (let e = 0; e < t.chunk.length; e++) t.chunk[e].maxPoint <= 0 && r.set(t.chunk[e], t.chunkPos[e]);
	let i = /* @__PURE__ */ new Set();
	for (let e of t) for (let t = 0; t < e.chunk.length; t++) {
		let a = r.get(e.chunk[t]);
		a != null && (n ? n.mapPos(a) : a) == e.chunkPos[t] && !n?.touchesRange(a, a + e.chunk[t].length) && i.add(e.chunk[t]);
	}
	return i;
}
var jt = class {
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
}, Mt = class e {
	constructor(e) {
		this.heap = e;
	}
	static from(t, n = null, r = -1) {
		let i = [];
		for (let e = 0; e < t.length; e++) for (let a = t[e]; !a.isEmpty; a = a.nextLayer) a.maxPoint >= r && i.push(new jt(a, n, r, e));
		return i.length == 1 ? i[0] : new e(i);
	}
	get startSide() {
		return this.value ? this.value.startSide : 0;
	}
	goto(e, t = -1e9) {
		for (let n of this.heap) n.goto(e, t);
		for (let e = this.heap.length >> 1; e >= 0; e--) Nt(this.heap, e);
		return this.next(), this;
	}
	forward(e, t) {
		for (let n of this.heap) n.forward(e, t);
		for (let e = this.heap.length >> 1; e >= 0; e--) Nt(this.heap, e);
		(this.to - e || this.value.endSide - t) < 0 && this.next();
	}
	next() {
		if (this.heap.length == 0) this.from = this.to = 1e9, this.value = null, this.rank = -1;
		else {
			let e = this.heap[0];
			this.from = e.from, this.to = e.to, this.value = e.value, this.rank = e.rank, e.value && e.next(), Nt(this.heap, 0);
		}
	}
};
function Nt(e, t) {
	for (let n = e[t];;) {
		let r = (t << 1) + 1;
		if (r >= e.length) break;
		let i = e[r];
		if (r + 1 < e.length && i.compare(e[r + 1]) >= 0 && (i = e[r + 1], r++), n.compare(i) < 0) break;
		e[r] = n, e[t] = i, t = r;
	}
}
var Pt = class {
	constructor(e, t, n) {
		this.minPoint = n, this.active = [], this.activeTo = [], this.activeRank = [], this.minActive = -1, this.point = null, this.pointFrom = 0, this.pointRank = 0, this.to = -1e9, this.endSide = 0, this.openStart = -1, this.cursor = Mt.from(e, t, n);
	}
	goto(e, t = -1e9) {
		return this.cursor.goto(e, t), this.active.length = this.activeTo.length = this.activeRank.length = 0, this.minActive = -1, this.to = e, this.endSide = t, this.openStart = -1, this.next(), this;
	}
	forward(e, t) {
		for (; this.minActive > -1 && (this.activeTo[this.minActive] - e || this.active[this.minActive].endSide - t) < 0;) this.removeActive(this.minActive);
		this.cursor.forward(e, t);
	}
	removeActive(e) {
		Lt(this.active, e), Lt(this.activeTo, e), Lt(this.activeRank, e), this.minActive = zt(this.active, this.activeTo);
	}
	addActive(e) {
		let t = 0, { value: n, to: r, rank: i } = this.cursor;
		for (; t < this.activeRank.length && (i - this.activeRank[t] || r - this.activeTo[t]) > 0;) t++;
		Rt(this.active, t, n), Rt(this.activeTo, t, r), Rt(this.activeRank, t, i), e && Rt(e, t, this.cursor.from), this.minActive = zt(this.active, this.activeTo);
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
				this.removeActive(r), n && Lt(n, r);
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
function Ft(e, t, n, r, i, a) {
	e.goto(t), n.goto(r);
	let o = r + i, s = r, c = r - t, l = !!a.boundChange;
	for (let t = !1;;) {
		let r = e.to + c - n.to, i = r || e.endSide - n.endSide, u = i < 0 ? e.to + c : n.to, d = Math.min(u, o);
		if (e.point || n.point ? (e.point && n.point && wt(e.point, n.point) && It(e.activeForPoint(e.to), n.activeForPoint(n.to)) || a.comparePoint(s, d, e.point, n.point), t = !1) : (t && a.boundChange(s), d > s && !It(e.active, n.active) && a.compareRange(s, d, e.active, n.active), l && d < o && (r || e.openEnd(u) != n.openEnd(u)) && (t = !0)), u > o) break;
		s = u, i <= 0 && e.next(), i >= 0 && n.next();
	}
}
function It(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (e[n] != t[n] && !wt(e[n], t[n])) return !1;
	return !0;
}
function Lt(e, t) {
	for (let n = t, r = e.length - 1; n < r; n++) e[n] = e[n + 1];
	e.pop();
}
function Rt(e, t, n) {
	for (let n = e.length - 1; n >= t; n--) e[n + 1] = e[n];
	e[t] = n;
}
function zt(e, t) {
	let n = -1, r = 1e9;
	for (let i = 0; i < t.length; i++) (t[i] - r || e[i].endSide - e[n].endSide) < 0 && (n = i, r = t[i]);
	return n;
}
function Bt(e, t, n = e.length) {
	let r = 0;
	for (let i = 0; i < n && i < e.length;) e.charCodeAt(i) == 9 ? (r += t - r % t, i++) : (r++, i = x(e, i));
	return r;
}
function Vt(e, t, n, r) {
	for (let r = 0, i = 0;;) {
		if (i >= t) return r;
		if (r == e.length) break;
		i += e.charCodeAt(r) == 9 ? n - i % n : 1, r = x(e, r);
	}
	return r === !0 ? -1 : e.length;
}
for (var Ht = "ͼ", Ut = typeof Symbol > "u" ? "__ͼ" : Symbol.for(Ht), Wt = typeof Symbol > "u" ? "__styleSet" + Math.floor(Math.random() * 1e8) : Symbol("styleSet"), Gt = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : {}, Kt = class {
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
		let e = Gt[Ut] || 1;
		return Gt[Ut] = e + 1, Ht + e.toString(36);
	}
	static mount(e, t, n) {
		let r = e[Wt], i = n && n.nonce;
		r ? i && r.setNonce(i) : r = new Jt(e, i), r.mount(Array.isArray(t) ? t : [t], e);
	}
}, qt = /* @__PURE__ */ new Map(), Jt = class {
	constructor(e, t) {
		let n = e.ownerDocument || e, r = n.defaultView;
		if (!e.head && e.adoptedStyleSheets && r.CSSStyleSheet) {
			let t = qt.get(n);
			if (t) return e[Wt] = t;
			this.sheet = new r.CSSStyleSheet(), qt.set(n, this);
		} else this.styleTag = n.createElement("style"), t && this.styleTag.setAttribute("nonce", t);
		this.modules = [], e[Wt] = this;
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
}, Yt = {
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
}, Xt = {
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
}, Zt = typeof navigator < "u" && /Mac/.test(navigator.platform), Qt = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent), k = 0; k < 10; k++) Yt[48 + k] = Yt[96 + k] = String(k);
for (var k = 1; k <= 24; k++) Yt[k + 111] = "F" + k;
for (var k = 65; k <= 90; k++) Yt[k] = String.fromCharCode(k + 32), Xt[k] = String.fromCharCode(k);
for (var $t in Yt) Xt.hasOwnProperty($t) || (Xt[$t] = Yt[$t]);
function en(e) {
	var t = !(Zt && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey || Qt && e.shiftKey && e.key && e.key.length == 1 || e.key == "Unidentified") && e.key || (e.shiftKey ? Xt : Yt)[e.keyCode] || e.key || "Unidentified";
	return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
//#endregion
//#region node_modules/crelt/index.js
function A() {
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
	for (; t < arguments.length; t++) tn(e, arguments[t]);
	return e;
}
function tn(e, t) {
	if (typeof t == "string") e.appendChild(document.createTextNode(t));
	else if (t != null) {
		if (t.nodeType != null) e.appendChild(t);
		else if (Array.isArray(t)) for (var n = 0; n < t.length; n++) tn(e, t[n]);
		else throw RangeError("Unsupported child node: " + t);
	}
}
//#endregion
//#region node_modules/@codemirror/view/dist/index.js
var j = typeof navigator < "u" ? navigator : {
	userAgent: "",
	vendor: "",
	platform: ""
}, nn = typeof document < "u" ? document : { documentElement: { style: {} } }, rn = /*@__PURE__*/ /Edge\/(\d+)/.exec(j.userAgent), an = /*@__PURE__*/ /MSIE \d/.test(j.userAgent), on = /*@__PURE__*/ /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(j.userAgent), sn = !!(an || on || rn), cn = !sn && /*@__PURE__*/ /gecko\/(\d+)/i.test(j.userAgent), ln = !sn && /*@__PURE__*/ /Chrome\/(\d+)/.exec(j.userAgent), un = "webkitFontSmoothing" in nn.documentElement.style, dn = !sn && /*@__PURE__*/ /Apple Computer/.test(j.vendor), fn = dn && (/*@__PURE__*/ /Mobile\/\w+/.test(j.userAgent) || j.maxTouchPoints > 2), M = {
	mac: fn || /*@__PURE__*/ /Mac/.test(j.platform),
	windows: /*@__PURE__*/ /Win/.test(j.platform),
	linux: /*@__PURE__*/ /Linux|X11/.test(j.platform),
	ie: sn,
	ie_version: an ? nn.documentMode || 6 : on ? +on[1] : rn ? +rn[1] : 0,
	gecko: cn,
	gecko_version: cn ? +(/*@__PURE__*/ /Firefox\/(\d+)/.exec(j.userAgent) || [0, 0])[1] : 0,
	chrome: !!ln,
	chrome_version: ln ? +ln[1] : 0,
	ios: fn,
	android: /*@__PURE__*/ /Android\b/.test(j.userAgent),
	webkit: un,
	webkit_version: un ? +(/*@__PURE__*/ /\bAppleWebKit\/(\d+)/.exec(j.userAgent) || [0, 0])[1] : 0,
	safari: dn,
	safari_version: dn ? +(/*@__PURE__*/ /\bVersion\/(\d+(\.\d+)?)/.exec(j.userAgent) || [0, 0])[1] : 0,
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
}, N = /*@__PURE__*/ (function(e) {
	return e[e.Text = 0] = "Text", e[e.WidgetBefore = 1] = "WidgetBefore", e[e.WidgetAfter = 2] = "WidgetAfter", e[e.WidgetRange = 3] = "WidgetRange", e;
})(N ||= {}), P = class extends Ct {
	constructor(e, t, n, r) {
		super(), this.startSide = e, this.endSide = t, this.widget = n, this.spec = r;
	}
	get heightRelevant() {
		return !1;
	}
	static mark(e) {
		return new bn(e);
	}
	static widget(e) {
		let t = Math.max(-1e4, Math.min(1e4, e.side || 0)), n = !!e.block;
		return t += n && !e.inlineOrder ? t > 0 ? 3e8 : -4e8 : t > 0 ? 1e8 : -1e8, new Sn(e, t, t, n, e.widget || null, !1);
	}
	static replace(e) {
		let t = !!e.block, n, r;
		if (e.isBlockGap) n = -5e8, r = 4e8;
		else {
			let { start: i, end: a } = Cn(e, t);
			n = (i ? t ? -3e8 : -1 : 5e8) - 1, r = (a ? t ? 2e8 : 1 : -6e8) + 1;
		}
		return new Sn(e, n, r, t, e.widget || null, !0);
	}
	static line(e) {
		return new xn(e);
	}
	static set(e, t = !1) {
		return O.of(e, t);
	}
	hasHeight() {
		return this.widget ? this.widget.estimatedHeight > -1 : !1;
	}
};
P.none = O.empty;
var bn = class e extends P {
	constructor(e) {
		let { start: t, end: n } = Cn(e);
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
bn.prototype.point = !1;
var xn = class e extends P {
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
xn.prototype.mapMode = Te.TrackBefore, xn.prototype.point = !0;
var Sn = class e extends P {
	constructor(e, t, n, r, i, a) {
		super(t, n, i, e), this.block = r, this.isReplace = a, this.mapMode = r ? t <= 0 ? Te.TrackBefore : Te.TrackAfter : Te.TrackDel;
	}
	get type() {
		return this.startSide == this.endSide ? this.startSide <= 0 ? N.WidgetBefore : N.WidgetAfter : N.WidgetRange;
	}
	get heightRelevant() {
		return this.block || !!this.widget && (this.widget.estimatedHeight >= 5 || this.widget.lineBreaks > 0);
	}
	eq(t) {
		return t instanceof e && wn(this.widget, t.widget) && this.block == t.block && this.startSide == t.startSide && this.endSide == t.endSide;
	}
	range(e, t = e) {
		if (this.isReplace && (e > t || e == t && this.startSide > 0 && this.endSide <= 0)) throw RangeError("Invalid range for replacement decoration");
		if (!this.isReplace && t != e) throw RangeError("Widget decorations can only have zero-length ranges");
		return super.range(e, t);
	}
};
Sn.prototype.point = !0;
function Cn(e, t = !1) {
	let { inclusiveStart: n, inclusiveEnd: r } = e;
	return n ??= e.inclusive, r ??= e.inclusive, {
		start: n ?? t,
		end: r ?? t
	};
}
function wn(e, t) {
	return e == t || !!(e && t && e.compare(t));
}
function Tn(e, t, n, r = 0) {
	let i = n.length - 1;
	i >= 0 && n[i] + r >= e ? n[i] = Math.max(n[i], t) : n.push(e, t);
}
var En = class e extends Ct {
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
		return O.of(e, t);
	}
};
En.prototype.startSide = En.prototype.endSide = -1;
function Dn(e) {
	let t;
	return t = e.nodeType == 11 ? e.getSelection ? e : e.ownerDocument : e, t.getSelection();
}
function On(e, t) {
	return t ? e == t || e.contains(t.nodeType == 1 ? t : t.parentNode) : !1;
}
function kn(e, t) {
	if (!t.anchorNode) return !1;
	try {
		return On(e, t.anchorNode);
	} catch {
		return !1;
	}
}
function An(e) {
	return e.nodeType == 3 ? qn(e, 0, e.nodeValue.length).getClientRects() : e.nodeType == 1 ? e.getClientRects() : [];
}
function jn(e, t, n, r) {
	return n ? Pn(e, t, n, r, -1) || Pn(e, t, n, r, 1) : !1;
}
function Mn(e) {
	for (var t = 0;; t++) if (e = e.previousSibling, !e) return t;
}
function Nn(e) {
	return e.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(e.nodeName);
}
function Pn(e, t, n, r, i) {
	for (;;) {
		if (e == n && t == r) return !0;
		if (t == (i < 0 ? 0 : Fn(e))) {
			if (e.nodeName == "DIV") return !1;
			let n = e.parentNode;
			if (!n || n.nodeType != 1) return !1;
			t = Mn(e) + (i < 0 ? 0 : 1), e = n;
		} else if (e.nodeType == 1) {
			if (e = e.childNodes[t + (i < 0 ? -1 : 0)], e.nodeType == 1 && e.contentEditable == "false") return !1;
			t = i < 0 ? Fn(e) : 0;
		} else return !1;
	}
}
function Fn(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function In(e, t) {
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
function Ln(e) {
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
function Rn(e, t) {
	let n = t.width / e.offsetWidth, r = t.height / e.offsetHeight;
	return (n > .995 && n < 1.005 || !isFinite(n) || Math.abs(t.width - e.offsetWidth) < 1) && (n = 1), (r > .995 && r < 1.005 || !isFinite(r) || Math.abs(t.height - e.offsetHeight) < 1) && (r = 1), {
		scaleX: n,
		scaleY: r
	};
}
function zn(e, t, n, r, i, a, o, s) {
	let c = e.ownerDocument, l = c.defaultView || window;
	for (let u = e, d = !1; u && !d;) if (u.nodeType == 1) {
		let e, f = u == c.body, p = 1, m = 1;
		if (f) e = Ln(l);
		else {
			if (/^(fixed|sticky)$/.test(getComputedStyle(u).position) && (d = !0), u.scrollHeight <= u.clientHeight && u.scrollWidth <= u.clientWidth) {
				u = u.assignedSlot || u.parentNode;
				continue;
			}
			let t = u.getBoundingClientRect();
			({scaleX: p, scaleY: m} = Rn(u, t)), e = {
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
function Bn(e, t = !0) {
	let n = e.ownerDocument, r = null, i = null;
	for (let a = e.parentNode; a && !(a == n.body || (!t || r) && i);) if (a.nodeType == 1) !i && a.scrollHeight > a.clientHeight && (i = a), t && !r && a.scrollWidth > a.clientWidth && (r = a), a = a.assignedSlot || a.parentNode;
	else if (a.nodeType == 11) a = a.host;
	else break;
	return {
		x: r,
		y: i
	};
}
var Vn = class {
	constructor() {
		this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
	}
	eq(e) {
		return this.anchorNode == e.anchorNode && this.anchorOffset == e.anchorOffset && this.focusNode == e.focusNode && this.focusOffset == e.focusOffset;
	}
	setRange(e) {
		let { anchorNode: t, focusNode: n } = e;
		this.set(t, Math.min(e.anchorOffset, t ? Fn(t) : 0), n, Math.min(e.focusOffset, n ? Fn(n) : 0));
	}
	set(e, t, n, r) {
		this.anchorNode = e, this.anchorOffset = t, this.focusNode = n, this.focusOffset = r;
	}
};
function Hn(e) {
	let t = [];
	for (let n = e; n; n = n.nodeType == 11 ? n.host : n.parentNode) n.nodeType == 1 && t.push({
		node: n,
		left: n.scrollLeft,
		top: n.scrollTop
	});
	return t;
}
function Un(e, t = !0) {
	for (let { node: n, left: r, top: i } of e) t && n.scrollTop != i && (n.scrollTop = i), n.scrollLeft != r && (n.scrollLeft = r);
}
var Wn = null;
M.safari && M.safari_version >= 26 && (Wn = !1);
function Gn(e) {
	if (e.setActive) return e.setActive();
	if (Wn) return e.focus(Wn);
	let t = Hn(e);
	e.focus(Wn == null ? { get preventScroll() {
		return Wn = { preventScroll: !0 }, !0;
	} } : void 0), Wn || (Wn = !1, Un(t));
}
var Kn;
function qn(e, t, n = t) {
	let r = Kn ||= document.createRange();
	return r.setEnd(e, n), r.setStart(e, t), r;
}
function Jn(e, t, n, r) {
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
function Yn(e) {
	for (; e;) {
		if (e && (e.nodeType == 9 || e.nodeType == 11 && e.host)) return e;
		e = e.assignedSlot || e.parentNode;
	}
	return null;
}
function Xn(e, t) {
	let n = t.focusNode, r = t.focusOffset;
	if (!n || t.anchorNode != n || t.anchorOffset != r) return !1;
	for (r = Math.min(r, Fn(n));;) if (r) {
		if (n.nodeType != 1) return !1;
		let e = n.childNodes[r - 1];
		e.contentEditable == "false" ? r-- : (n = e, r = Fn(n));
	} else if (n == e) return !0;
	else r = Mn(n), n = n.parentNode;
}
function Zn(e) {
	return e instanceof Window ? e.pageYOffset > Math.max(0, e.document.documentElement.scrollHeight - e.innerHeight - 4) : e.scrollTop > Math.max(1, e.scrollHeight - e.clientHeight - 4);
}
function Qn(e, t) {
	for (let n = e, r = t;;) if (n.nodeType == 3 && r > 0) return {
		node: n,
		offset: r
	};
	else if (n.nodeType == 1 && r > 0) {
		if (n.contentEditable == "false") return null;
		n = n.childNodes[r - 1], r = Fn(n);
	} else if (n.parentNode && !Nn(n)) r = Mn(n), n = n.parentNode;
	else return null;
}
function $n(e, t) {
	for (let n = e, r = t;;) if (n.nodeType == 3 && r < n.nodeValue.length) return {
		node: n,
		offset: r
	};
	else if (n.nodeType == 1 && r < n.childNodes.length) {
		if (n.contentEditable == "false") return null;
		n = n.childNodes[r], r = 0;
	} else if (n.parentNode && !Nn(n)) r = Mn(n) + 1, n = n.parentNode;
	else return null;
}
var er = class e {
	constructor(e, t, n = !0) {
		this.node = e, this.offset = t, this.precise = n;
	}
	static before(t, n) {
		return new e(t.parentNode, Mn(t), n);
	}
	static after(t, n) {
		return new e(t.parentNode, Mn(t) + 1, n);
	}
}, F = /*@__PURE__*/ (function(e) {
	return e[e.LTR = 0] = "LTR", e[e.RTL = 1] = "RTL", e;
})(F ||= {}), tr = F.LTR, nr = F.RTL;
function rr(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) t.push(1 << e[n]);
	return t;
}
var ir = /*@__PURE__*/ rr("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008"), ar = /*@__PURE__*/ rr("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333"), or = /*@__PURE__*/ Object.create(null), sr = [];
for (let e of [
	"()",
	"[]",
	"{}"
]) {
	let t = /*@__PURE__*/ e.charCodeAt(0), n = /*@__PURE__*/ e.charCodeAt(1);
	or[t] = n, or[n] = -t;
}
function cr(e) {
	return e <= 247 ? ir[e] : 1424 <= e && e <= 1524 ? 2 : 1536 <= e && e <= 1785 ? ar[e - 1536] : 1774 <= e && e <= 2220 ? 4 : 8192 <= e && e <= 8204 ? 256 : 64336 <= e && e <= 65023 ? 4 : 1;
}
var lr = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/, ur = class {
	get dir() {
		return this.level % 2 ? nr : tr;
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
function dr(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) {
		let r = e[n], i = t[n];
		if (r.from != i.from || r.to != i.to || r.direction != i.direction || !dr(r.inner, i.inner)) return !1;
	}
	return !0;
}
var I = [];
function fr(e, t, n, r, i) {
	for (let a = 0; a <= r.length; a++) {
		let o = a ? r[a - 1].to : t, s = a < r.length ? r[a].from : n, c = a ? 256 : i;
		for (let t = o, n = c, r = c; t < s; t++) {
			let i = cr(e.charCodeAt(t));
			i == 512 ? i = n : i == 8 && r == 4 && (i = 16), I[t] = i == 4 ? 2 : i, i & 7 && (r = i), n = i;
		}
		for (let e = o, t = c, r = c; e < s; e++) {
			let i = I[e];
			if (i == 128) e < s - 1 && t == I[e + 1] && t & 24 ? i = I[e] = t : I[e] = 256;
			else if (i == 64) {
				let i = e + 1;
				for (; i < s && I[i] == 64;) i++;
				let a = e && t == 8 || i < n && I[i] == 8 ? r == 1 ? 1 : 8 : 256;
				for (let t = e; t < i; t++) I[t] = a;
				e = i - 1;
			} else i == 8 && r == 1 && (I[e] = 1);
			t = i, i & 7 && (r = i);
		}
	}
}
function pr(e, t, n, r, i) {
	let a = i == 1 ? 2 : 1;
	for (let o = 0, s = 0, c = 0; o <= r.length; o++) {
		let l = o ? r[o - 1].to : t, u = o < r.length ? r[o].from : n;
		for (let t = l, n, r, o; t < u; t++) if (r = or[n = e.charCodeAt(t)]) {
			if (r < 0) {
				for (let e = s - 3; e >= 0; e -= 3) if (sr[e + 1] == -r) {
					let n = sr[e + 2], r = n & 2 ? i : n & 4 ? n & 1 ? a : i : 0;
					r && (I[t] = I[sr[e]] = r), s = e;
					break;
				}
			} else if (sr.length == 189) break;
			else sr[s++] = t, sr[s++] = n, sr[s++] = c;
		} else if ((o = I[t]) == 2 || o == 1) {
			let e = o == i;
			c = +!e;
			for (let t = s - 3; t >= 0; t -= 3) {
				let n = sr[t + 2];
				if (n & 2) break;
				if (e) sr[t + 2] |= 2;
				else {
					if (n & 4) break;
					sr[t + 2] |= 4;
				}
			}
		}
	}
}
function mr(e, t, n, r) {
	for (let i = 0, a = r; i <= n.length; i++) {
		let o = i ? n[i - 1].to : e, s = i < n.length ? n[i].from : t;
		for (let c = o; c < s;) {
			let o = I[c];
			if (o == 256) {
				let o = c + 1;
				for (;;) if (o == s) {
					if (i == n.length) break;
					o = n[i++].to, s = i < n.length ? n[i].from : t;
				} else if (I[o] == 256) o++;
				else break;
				let l = a == 1, u = l == ((o < t ? I[o] : r) == 1) ? l ? 1 : 2 : r;
				for (let t = o, r = i, a = r ? n[r - 1].to : e; t > c;) t == a && (t = n[--r].from, a = r ? n[r - 1].to : e), I[--t] = u;
				c = o;
			} else a = o, c++;
		}
	}
}
function hr(e, t, n, r, i, a, o) {
	let s = r % 2 ? 2 : 1;
	if (r % 2 == i % 2) for (let c = t, l = 0; c < n;) {
		let t = !0, u = !1;
		if (l == a.length || c < a[l].from) {
			let e = I[c];
			e != s && (t = !1, u = e == 16);
		}
		let d = !t && s == 1 ? [] : null, f = t ? r : r + 1, p = c;
		run: for (;;) if (l < a.length && p == a[l].from) {
			if (u) break run;
			let m = a[l];
			if (!t) for (let e = m.to, t = l + 1;;) {
				if (e == n) break run;
				if (t < a.length && a[t].from == e) e = a[t++].to;
				else if (I[e] == s) break run;
				else break;
			}
			l++, d ? d.push(m) : (m.from > c && o.push(new ur(c, m.from, f)), gr(e, m.direction == tr == !(f % 2) ? r : r + 1, i, m.inner, m.from, m.to, o), c = m.to), p = m.to;
		} else if (p == n || (t ? I[p] != s : I[p] == s)) break;
		else p++;
		d ? hr(e, c, p, r + 1, i, d, o) : c < p && o.push(new ur(c, p, f)), c = p;
	}
	else for (let c = n, l = a.length; c > t;) {
		let n = !0, u = !1;
		if (!l || c > a[l - 1].to) {
			let e = I[c - 1];
			e != s && (n = !1, u = e == 16);
		}
		let d = !n && s == 1 ? [] : null, f = n ? r : r + 1, p = c;
		run: for (;;) if (l && p == a[l - 1].to) {
			if (u) break run;
			let m = a[--l];
			if (!n) for (let e = m.from, n = l;;) {
				if (e == t) break run;
				if (n && a[n - 1].to == e) e = a[--n].from;
				else if (I[e - 1] == s) break run;
				else break;
			}
			d ? d.push(m) : (m.to < c && o.push(new ur(m.to, c, f)), gr(e, m.direction == tr == !(f % 2) ? r : r + 1, i, m.inner, m.from, m.to, o), c = m.from), p = m.from;
		} else if (p == t || (n ? I[p - 1] != s : I[p - 1] == s)) break;
		else p--;
		d ? hr(e, p, c, r + 1, i, d, o) : p < c && o.push(new ur(p, c, f)), c = p;
	}
}
function gr(e, t, n, r, i, a, o) {
	let s = t % 2 ? 2 : 1;
	fr(e, i, a, r, s), pr(e, i, a, r, s), mr(i, a, r, s), hr(e, i, a, t, n, r, o);
}
function _r(e, t, n) {
	if (!e) return [new ur(0, 0, +(t == nr))];
	if (t == tr && !n.length && !lr.test(e)) return vr(e.length);
	if (n.length) for (; e.length > I.length;) I[I.length] = 256;
	let r = [], i = t == tr ? 0 : 1;
	return gr(e, i, i, n, 0, e.length, r), r;
}
function vr(e) {
	return [new ur(0, e, 0)];
}
var yr = "";
function br(e, t, n, r, i) {
	let a = r.head - e.from, o = ur.find(t, a, r.bidiLevel ?? -1, r.assoc), s = t[o], c = s.side(i, n);
	if (a == c) {
		let e = o += i ? 1 : -1;
		if (e < 0 || e >= t.length) return null;
		s = t[o = e], a = s.side(!i, n), c = s.side(i, n);
	}
	let l = x(e.text, a, s.forward(i, n));
	(l < s.from || l > s.to) && (l = c), yr = e.text.slice(Math.min(a, l), Math.max(a, l));
	let u = o == (i ? t.length - 1 : 0) ? null : t[o + (i ? 1 : -1)];
	return u && l == c && u.level + +!i < s.level ? C.cursor(u.side(!i, n) + e.from, u.forward(i, n) ? 1 : -1, u.level) : C.cursor(l + e.from, s.forward(i, n) ? -1 : 1, s.level);
}
function xr(e, t, n) {
	for (let r = t; r < n; r++) {
		let t = cr(e.charCodeAt(r));
		if (t == 1) return tr;
		if (t == 2 || t == 4) return nr;
	}
	return tr;
}
var Sr = /*@__PURE__*/ w.define(), Cr = /*@__PURE__*/ w.define(), wr = /*@__PURE__*/ w.define(), Tr = /*@__PURE__*/ w.define(), Er = /*@__PURE__*/ w.define(), Dr = /*@__PURE__*/ w.define(), Or = /*@__PURE__*/ w.define(), kr = /*@__PURE__*/ w.define(), Ar = /*@__PURE__*/ w.define(), jr = /*@__PURE__*/ w.define({ combine: (e) => e.some((e) => e) }), Mr = /*@__PURE__*/ w.define({ combine: (e) => e.some((e) => e) }), Nr = /*@__PURE__*/ w.define(), Pr = class e {
	constructor(e, t, n, r, i, a = !1) {
		this.range = e, this.y = t, this.x = n, this.yMargin = r, this.xMargin = i, this.isSnapshot = a;
	}
	map(t) {
		return t.empty ? this : new e(this.range.map(t), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
	}
	clip(t) {
		return this.range.to <= t.doc.length ? this : new e(C.cursor(t.doc.length), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
	}
}, Fr = /*@__PURE__*/ T.define({ map: (e, t) => e.map(t) }), Ir = /*@__PURE__*/ T.define();
function Lr(e, t, n) {
	let r = e.facet(Tr);
	r.length ? r[0](t) : window.onerror && window.onerror(String(t), n, void 0, void 0, t) || (n ? console.error(n + ":", t) : console.error(t));
}
var Rr = /*@__PURE__*/ w.define({ combine: (e) => !e.length || e[0] }), zr = 0, Br = /*@__PURE__*/ w.define({ combine(e) {
	return e.filter((t, n) => {
		for (let r = 0; r < n; r++) if (e[r].plugin == t.plugin) return !1;
		return !0;
	});
} }), L = class e {
	constructor(e, t, n, r, i) {
		this.id = e, this.create = t, this.domEventHandlers = n, this.domEventObservers = r, this.baseExtensions = i(this), this.extension = this.baseExtensions.concat(Br.of({
			plugin: this,
			arg: void 0
		}));
	}
	of(e) {
		return this.baseExtensions.concat(Br.of({
			plugin: this,
			arg: e
		}));
	}
	static define(t, n) {
		let { eventHandlers: r, eventObservers: i, provide: a, decorations: o } = n || {};
		return new e(zr++, t, r, i, (e) => {
			let t = [];
			return o && t.push(Wr.of((t) => {
				let n = t.plugin(e);
				return n ? o(n) : P.none;
			})), a && t.push(a(e)), t;
		});
	}
	static fromClass(t, n) {
		return e.define((e, n) => new t(e, n), n);
	}
}, Vr = class {
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
				Lr(e.state, t, "CodeMirror plugin crashed"), this.deactivate();
			}
		} else if (this.mustUpdate) {
			let e = this.mustUpdate;
			if (this.mustUpdate = null, this.value.update) try {
				this.value.update(e);
			} catch (t) {
				if (Lr(e.state, t, "CodeMirror plugin crashed"), this.value.destroy) try {
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
			Lr(e.state, t, "CodeMirror plugin crashed");
		}
	}
	deactivate() {
		this.spec = this.value = null;
	}
}, Hr = /*@__PURE__*/ w.define(), Ur = /*@__PURE__*/ w.define(), Wr = /*@__PURE__*/ w.define(), Gr = /*@__PURE__*/ w.define(), Kr = /*@__PURE__*/ w.define(), qr = /*@__PURE__*/ w.define(), Jr = /*@__PURE__*/ w.define();
function Yr(e, t) {
	let n = e.state.facet(Jr);
	if (!n.length) return n;
	let r = n.map((t) => t instanceof Function ? t(e) : t), i = [];
	return O.spans(r, t.from, t.to, {
		point() {},
		span(e, n, r, a) {
			let o = e - t.from, s = n - t.from, c = i;
			for (let e = r.length - 1; e >= 0; e--, a--) {
				let n = r[e].spec.bidiIsolate, i;
				if (n ??= xr(t.text, o, s), a > 0 && c.length && (i = c[c.length - 1]).to == o && i.direction == n) i.to = s, c = i.inner;
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
var Xr = /*@__PURE__*/ w.define();
function Zr(e) {
	let t = 0, n = 0, r = 0, i = 0;
	for (let a of e.state.facet(Xr)) {
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
var Qr = /*@__PURE__*/ w.define(), $r = class e {
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
}, ei = class e {
	constructor(e, t, n) {
		this.view = e, this.state = t, this.transactions = n, this.flags = 0, this.startState = e.state, this.changes = De.empty(this.startState.doc.length);
		for (let e of n) this.changes = this.changes.compose(e.changes);
		let r = [];
		this.changes.iterChangedRanges((e, t, n, i) => r.push(new $r(e, t, n, i))), this.changedRanges = r;
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
}, ti = [], R = class {
	constructor(e, t, n = 0) {
		this.dom = e, this.length = t, this.flags = n, this.parent = null, e.cmTile = this;
	}
	get breakAfter() {
		return this.flags & 1;
	}
	get children() {
		return ti;
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
		let n = Mn(this.dom), r = this.length ? e > 0 : t > 0;
		return new er(this.parent.dom, n + +!!r, e == 0 || e == this.length);
	}
	markDirty(e) {
		this.flags &= -3, e && (this.flags |= 4), this.parent && this.parent.flags & 2 && this.parent.markDirty(!1);
	}
	get overrideDOMText() {
		return null;
	}
	get root() {
		for (let e = this; e; e = e.parent) if (e instanceof ii) return e;
		return null;
	}
	static get(e) {
		return e.cmTile;
	}
}, ni = class extends R {
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
			if (o.sync(e), a += o.length + o.breakAfter, r = n ? n.nextSibling : t.firstChild, i && r != o.dom && (i.written = !0), o.dom.parentNode == t) for (; r && r != o.dom;) r = ri(r);
			else t.insertBefore(o.dom, r);
			n = o.dom;
		}
		for (r = n ? n.nextSibling : t.firstChild, i && r && (i.written = !0); r;) r = ri(r);
		this.length = a;
	}
};
function ri(e) {
	let t = e.nextSibling;
	return e.parentNode.removeChild(e), t;
}
var ii = class extends ni {
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
			let t = R.get(e);
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
			if (a instanceof ai) t.push(r), n = a, r = 0;
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
}, ai = class e extends ni {
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
}, oi = class e extends ni {
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
				f >= c && (d.isComposite() ? s(d, c - u) : (!a || a.isHidden && (t > 0 && !(a.flags & 32) || n && ci(a, d))) && (f > c || d.flags & 32 && t <= 1) ? (a = d, o = c - u) : (u < c || d.flags & 16 && !d.isHidden && t >= -1) && (r = d, i = c - u)), u = f;
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
		return r ? r.tile.coordsIn(Math.max(0, r.offset), t, n) : si(this);
	}
	domIn(e, t) {
		let n = this.resolveInline(e, t);
		if (n) {
			let { tile: e, offset: r } = n;
			if (this.dom.contains(e.dom)) return e.isText() ? new er(e.dom, Math.min(e.dom.nodeValue.length, r)) : e.domPosFor(r, e.flags & 16 ? 1 : e.flags & 32 ? -1 : t);
			let i = n.tile.parent, a = !1;
			for (let e of i.children) {
				if (a) return new er(e.dom, 0);
				e == n.tile && (a = !0);
			}
		}
		return new er(this.dom, 0);
	}
};
function si(e) {
	let t = e.dom.lastChild;
	if (!t) return e.dom.getBoundingClientRect();
	let n = An(t);
	return n[n.length - 1] || null;
}
function ci(e, t) {
	let n = e.coordsIn(0, 1), r = t.coordsIn(0, 1);
	return n && r && r.top < n.bottom;
}
var li = class e extends ni {
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
}, ui = class e extends R {
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
		let s = qn(this.dom, i, a).getClientRects();
		if (!s.length) return null;
		let c = s[(o ? o < 0 : t >= 0) ? 0 : s.length - 1];
		return M.safari && !o && c.width == 0 && (c = Array.prototype.find.call(s, (e) => e.width) || c), n == null ? c : In(c, (o ? o > 0 : t < 0) == n);
	}
	static of(t, n) {
		let r = new e(n || document.createTextNode(t), t);
		return n || (r.flags |= 2), r;
	}
}, di = class e extends R {
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
		if (n) return In(this.dom.getBoundingClientRect(), this.length ? e == 0 : t <= 0);
		{
			let t = this.dom.getClientRects(), n = null;
			if (!t.length) return null;
			let r = this.flags & 16 ? !0 : this.flags & 32 ? !1 : e > 0;
			for (let i = r ? t.length - 1 : 0; n = t[i], !(e > 0 ? i == 0 : i == t.length - 1 || n.top < n.bottom); i += r ? -1 : 1);
			return In(n, !r);
		}
	}
	get overrideDOMText() {
		if (!this.length) return b.empty;
		let { root: e } = this;
		if (!e) return b.empty;
		let t = this.posAtStart;
		return e.view.state.doc.slice(t, t + this.length);
	}
	destroy() {
		super.destroy(), this.widget.destroy(this.dom);
	}
	static of(t, n, r, i, a) {
		return a || (a = t.toDOM(n), t.editable || (a.contentEditable = "false")), new e(a, r, t, i);
	}
}, fi = class extends R {
	constructor(e) {
		let t = document.createElement("img");
		t.className = "cm-widgetBuffer", t.setAttribute("aria-hidden", "true"), super(t, 0, e);
	}
	get isHidden() {
		return !0;
	}
	get overrideDOMText() {
		return b.empty;
	}
	coordsIn(e, t, n) {
		let r = this.dom.getBoundingClientRect();
		return n == null ? r : In(r, t > 0 == n);
	}
}, pi = class {
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
}, mi = class {
	constructor(e, t, n, r) {
		this.from = e, this.to = t, this.wrapper = n, this.rank = r;
	}
}, hi = class {
	constructor(e, t, n) {
		this.cache = e, this.root = t, this.blockWrappers = n, this.curLine = null, this.lastBlock = null, this.afterWidget = null, this.pos = 0, this.wrappers = [], this.wrapperPos = 0;
	}
	addText(e, t, n, r) {
		this.flushBuffer();
		let i = this.ensureMarks(t, n), a = i.lastChild;
		if (a && a.isText() && !(a.flags & 8) && a.length + e.length < 512) {
			this.cache.reused.set(a, 2);
			let t = i.children[i.children.length - 1] = new ui(a.dom, a.text + e);
			t.parent = i;
		} else i.append(r || ui.of(e, this.cache.find(ui)?.dom));
		this.pos += e.length, this.afterWidget = null;
	}
	addComposition(e, t) {
		let n = this.curLine;
		n.dom != t.line.dom && (n.setDOM(this.cache.reused.has(t.line) ? Ti(t.line.dom) : t.line.dom), this.cache.reused.set(t.line, 2));
		let r = n;
		for (let e = t.marks.length - 1; e >= 0; e--) {
			let n = t.marks[e], i = r.lastChild;
			if (i instanceof li && i.mark.eq(n.mark)) i.dom != n.dom && i.setDOM(Ti(n.dom)), r = i;
			else {
				if (this.cache.reused.get(n)) {
					let e = R.get(n.dom);
					e && e.setDOM(Ti(n.dom));
				}
				let e = li.of(n.mark, n.dom);
				r.append(e), r = e;
			}
			this.cache.reused.set(n, 2);
		}
		let i = R.get(e.text);
		i && this.cache.reused.set(i, 2);
		let a = new ui(e.text, e.text.nodeValue);
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
		e ||= Si;
		let n = oi.start(e, t || this.cache.find(oi)?.dom, !!t);
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
			if (t > 0 && (a = n.lastChild) && a instanceof li && a.mark.eq(i)) n = a, t--;
			else {
				let e = li.of(i, this.cache.find(li, (e) => e.mark.eq(i))?.dom);
				n.append(e), n = e, t = 0;
			}
		}
		return n;
	}
	endLine() {
		if (this.curLine) {
			this.flushBuffer();
			let e = this.curLine.lastChild;
			(!e || !bi(this.curLine, !1) || e.dom.nodeName != "BR" && e.isWidget() && !(M.ios && bi(this.curLine, !0))) && this.curLine.append(this.cache.findWidget(Di, 0, 32) || new di(Di.toDOM(), 0, Di, 32)), this.curLine = this.afterWidget = null;
		}
	}
	updateBlockWrappers() {
		this.wrapperPos > this.pos + 1e4 && (this.blockWrappers.goto(this.pos), this.wrappers.length = 0);
		for (let e = this.wrappers.length - 1; e >= 0; e--) this.wrappers[e].to < this.pos && this.wrappers.splice(e, 1);
		for (let e = this.blockWrappers; e.value && e.from <= this.pos; e.next()) if (e.to >= this.pos) {
			let t = e.rank * 102 + e.value.rank, n = new mi(e.from, e.to, e.value, t), r = this.wrappers.length;
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
			if (t.from < this.pos && n instanceof ai && n.wrapper.eq(t.wrapper)) e = n;
			else {
				let n = ai.of(t.wrapper, this.cache.find(ai, (e) => e.wrapper.eq(t.wrapper))?.dom);
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
		let t = 2 | (e < 0 ? 16 : 32), n = this.cache.find(fi, void 0, 1);
		return n && (n.flags = t), n || new fi(t);
	}
	flushBuffer() {
		this.afterWidget && !(this.afterWidget.flags & 32) && (this.afterWidget.parent.append(this.getBuffer(-1)), this.afterWidget = null);
	}
}, gi = class {
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
}, _i = [
	di,
	oi,
	ui,
	li,
	fi,
	ai,
	ii
];
for (let e = 0; e < _i.length; e++) _i[e].bucket = e;
var vi = class {
	constructor(e) {
		this.view = e, this.buckets = _i.map(() => []), this.index = _i.map(() => 0), this.reused = /* @__PURE__ */ new Map();
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
			if (!this.reused.has(o) && (a == 0 ? o.widget.compare(e) : o.widget.constructor == e.constructor && e.updateDOM(o.dom, this.view, o.widget))) return r.splice(i, 1), i < this.index[0] && this.index[0]--, o.widget == e && o.length == t && (o.flags & 497) == n ? (this.reused.set(o, 1), o) : (this.reused.set(o, 2), new di(o.dom, t, e, o.flags & -498 | n));
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
}, yi = class {
	constructor(e, t, n, r, i) {
		this.view = e, this.decorations = r, this.disallowBlockEffectsFor = i, this.openWidget = !1, this.openMarks = 0, this.cache = new vi(e), this.text = new gi(e.state.doc), this.builder = new hi(this.cache, new ii(e, e.contentDOM), O.iter(n)), this.cache.reused.set(t, 2), this.old = new pi(t), this.reuseWalker = {
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
		let r = wi(this.old), i = this.openMarks;
		this.old.advance(e, n ? 1 : -1, {
			skip: (e, t, n) => {
				if (e.isWidget()) {
					if (this.openWidget) this.builder.continueWidget(n - t);
					else {
						let a = n > 0 || t < e.length ? di.of(e.widget, this.view, n - t, e.flags & 496, this.cache.maybeReuse(e)) : this.cache.reuse(e);
						a.flags & 256 ? (a.flags &= -2, this.builder.addBlockWidget(a)) : (this.builder.ensureLine(null), this.builder.addInlineWidget(a, r, i), i = r.length);
					}
				} else if (e.isText()) this.builder.ensureLine(null), !t && n == e.length && !this.cache.reused.has(e) ? this.builder.addText(e.text, r, i, this.cache.reuse(e)) : (this.cache.add(e), this.builder.addText(e.text.slice(t, n), r, i)), i = r.length;
				else if (e.isLine()) e.flags &= -2, this.cache.reused.set(e, 1), this.builder.addLine(e);
				else if (e instanceof fi) this.cache.add(e);
				else if (e instanceof li) this.builder.ensureLine(null), this.builder.addMark(e, r, i), this.cache.reused.set(e, 1), i = r.length;
				else return !1;
				this.openWidget = !1;
			},
			enter: (e) => {
				e.isLine() ? this.builder.addLineStart(e.attrs, this.cache.maybeReuse(e)) : (this.cache.add(e), e instanceof li && r.unshift(e.mark)), this.openWidget = !1;
			},
			leave: (e) => {
				e.isLine() ? r.length &&= i = 0 : e instanceof li && (r.shift(), i = Math.min(i, r.length));
			},
			break: () => {
				this.builder.addBreak(), this.openWidget = !1;
			}
		}), this.text.skip(e);
	}
	emit(e, t) {
		let n = null, r = this.builder, i = -1, a = O.spans(this.decorations, e, t, {
			point: (e, t, a, o, s, c) => {
				if (a instanceof Sn) {
					if (this.disallowBlockEffectsFor[c]) {
						if (a.block) throw RangeError("Block decorations may not be specified via plugins");
						if (t > this.view.state.doc.lineAt(e).to) throw RangeError("Decorations that replace line breaks may not be specified via plugins");
					}
					if (i = o.length, s > o.length) r.continueWidget(t - e);
					else {
						let i = a.widget || (a.block ? Ei.block : Ei.inline), c = xi(a), l = this.cache.findWidget(i, t - e, c) || di.of(i, this.view, t - e, c);
						a.block ? (a.startSide > 0 && r.addLineStartIfNotCovered(n), r.addBlockWidget(l)) : (r.ensureLine(n), r.addInlineWidget(l, o, s));
					}
					n = null;
				} else n = Ci(n, a);
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
			let e = R.get(r);
			if (r == this.view.contentDOM) break;
			e instanceof li ? t.push(e) : e?.isLine() ? n = e : e instanceof ai || (r.nodeName == "DIV" && !n && r != this.view.contentDOM ? n = new oi(r, Si) : n || t.push(li.of(new bn({
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
function bi(e, t) {
	let n = (e) => {
		for (let r of e.children) if ((t ? r.isText() : r.length) || n(r)) return !0;
		return !1;
	};
	return n(e);
}
function xi(e) {
	let t = e.isReplace ? (e.startSide < 0 ? 64 : 0) | (e.endSide > 0 ? 128 : 0) : e.startSide > 0 ? 32 : 16;
	return e.block && (t |= 256), t;
}
var Si = { class: "cm-line" };
function Ci(e, t) {
	let n = t.spec.attributes, r = t.spec.class;
	return !n && !r ? e : (e ||= { class: "cm-line" }, n && pn(n, e), r && (e.class += " " + r), e);
}
function wi(e) {
	let t = [];
	for (let n = e.parents.length; n > 1; n--) {
		let r = n == e.parents.length ? e.tile : e.parents[n].tile;
		r instanceof li && t.push(r.mark);
	}
	return t;
}
function Ti(e) {
	let t = R.get(e);
	return t && t.setDOM(e.cloneNode()), e;
}
var Ei = class extends yn {
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
Ei.inline = /*@__PURE__*/ new Ei("span"), Ei.block = /*@__PURE__*/ new Ei("div");
var Di = /*@__PURE__*/ new class extends yn {
	toDOM() {
		return document.createElement("br");
	}
	get isHidden() {
		return !0;
	}
	get editable() {
		return !0;
	}
}(), Oi = class {
	constructor(e) {
		this.view = e, this.decorations = [], this.blockWrappers = [], this.dynamicDecorationMap = [!1], this.domChanged = null, this.hasComposition = null, this.editContextFormatting = P.none, this.lastCompositionAfterCursor = !1, this.minWidth = 0, this.minWidthFrom = 0, this.minWidthTo = 0, this.impreciseAnchor = null, this.impreciseHead = null, this.forceSelection = !1, this.lastUpdate = Date.now(), this.updateDeco(), this.tile = new ii(e, e.contentDOM), this.updateInner([new $r(0, 0, 0, e.state.doc.length)], null);
	}
	update(e) {
		let t = e.changedRanges;
		this.minWidth > 0 && t.length && (t.every(({ fromA: e, toA: t }) => t < this.minWidthFrom || e > this.minWidthTo) ? (this.minWidthFrom = e.changes.mapPos(this.minWidthFrom, 1), this.minWidthTo = e.changes.mapPos(this.minWidthTo, 1)) : this.minWidth = this.minWidthFrom = this.minWidthTo = 0), this.updateEditContextFormatting(e);
		let n = -1;
		this.view.inputState.composing >= 0 && !this.view.observer.editContext && (this.domChanged?.newSel ? n = this.domChanged.newSel.head : !zi(e.changes, this.hasComposition) && !e.selectionSet && (n = e.state.selection.main.head));
		let r = n > -1 ? Mi(this.view, e.changes, n) : null;
		if (this.domChanged = null, this.hasComposition) {
			let { from: n, to: r } = this.hasComposition;
			t = new $r(n, r, e.changes.mapPos(n, -1), e.changes.mapPos(r, 1)).addToSet(t.slice());
		}
		this.hasComposition = r ? {
			from: r.range.fromB,
			to: r.range.toB
		} : null, (M.ie || M.chrome) && !r && e && e.state.doc.lines != e.startState.doc.lines && (this.forceSelection = !0);
		let i = this.decorations, a = this.blockWrappers;
		this.updateDeco();
		let o = Fi(i, this.decorations, e.changes);
		o.length && (t = $r.extendWithRanges(t, o));
		let s = Li(a, this.blockWrappers, e.changes);
		return s.length && (t = $r.extendWithRanges(t, s)), r && !t.some((e) => e.fromA <= r.range.fromA && e.toA >= r.range.toA) && (t = r.range.addToSet(t.slice())), this.tile.flags & 2 && t.length == 0 ? !1 : (this.updateInner(t, r), e.transactions.length && (this.lastUpdate = Date.now()), !0);
	}
	updateInner(e, t) {
		this.view.viewState.mustMeasureContent = !0;
		let { observer: n } = this.view;
		n.ignore(() => {
			if (t || e.length) {
				let n = this.tile, r = new yi(this.view, n, this.blockWrappers, this.decorations, this.dynamicDecorationMap);
				t && R.get(t.text) && r.cache.reused.set(R.get(t.text), 2), this.tile = r.run(e, t), ki(n, r.cache.reused);
			}
			this.tile.dom.style.height = this.view.viewState.contentHeight / this.view.scaleY + "px", this.tile.dom.style.flexBasis = this.minWidth ? this.minWidth + "px" : "";
			let r = M.chrome || M.ios ? {
				node: n.selectionRange.focusNode,
				written: !1
			} : void 0;
			this.tile.sync(r), r && (r.written || n.selectionRange.focusNode != r.node || !this.tile.dom.contains(r.node)) && (this.forceSelection = !0), this.tile.dom.style.height = "";
		});
		let r = [];
		if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length) for (let e of this.tile.children) e.isWidget() && e.widget instanceof Bi && r.push(e.dom);
		n.updateGaps(r);
	}
	updateEditContextFormatting(e) {
		this.editContextFormatting = this.editContextFormatting.map(e.changes);
		for (let t of e.transactions) for (let e of t.effects) e.is(Ir) && (this.editContextFormatting = e.value);
	}
	updateSelection(e = !1, t = !1) {
		(e || !this.view.observer.selectionRange.focusNode) && this.view.observer.readSelectionRange();
		let { dom: n } = this.tile, r = this.view.root.activeElement, i = r == n, a = !i && !(this.view.state.facet(Rr) || n.tabIndex > -1) && kn(n, this.view.observer.selectionRange) && !(r && n.contains(r));
		if (!(i || t || a)) return;
		let o = this.forceSelection;
		this.forceSelection = !1;
		let s = this.view.state.selection.main, c, l;
		if (s.empty ? l = c = this.inlineDOMNearPos(s.anchor, s.assoc || 1) : (l = this.inlineDOMNearPos(s.head, s.head == s.from ? 1 : -1), c = this.inlineDOMNearPos(s.anchor, s.anchor == s.from ? 1 : -1)), M.gecko && s.empty && !this.hasComposition && Ai(c)) {
			let e = document.createTextNode("");
			this.view.observer.ignore(() => c.node.insertBefore(e, c.node.childNodes[c.offset] || null)), c = l = new er(e, 0), o = !0;
		}
		let u = this.view.observer.selectionRange;
		(o || !u.focusNode || (!jn(c.node, c.offset, u.anchorNode, u.anchorOffset) || !jn(l.node, l.offset, u.focusNode, u.focusOffset)) && !this.suppressWidgetCursorChange(u, s)) && (this.view.observer.ignore(() => {
			M.android && M.chrome && n.contains(u.focusNode) && Ri(u.focusNode, n) && (n.blur(), n.focus({ preventScroll: !0 }));
			let e = Dn(this.view.root);
			if (e) {
				if (s.empty) {
					if (M.gecko) {
						let e = Ni(c.node, c.offset);
						if (e && e != 3) {
							let t = (e == 1 ? Qn : $n)(c.node, c.offset);
							t && (c = new er(t.node, t.offset));
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
		}), this.view.observer.setSelectionRange(c, l)), this.impreciseAnchor = c.precise ? null : new er(u.anchorNode, u.anchorOffset), this.impreciseHead = l.precise ? null : new er(u.focusNode, u.focusOffset);
	}
	suppressWidgetCursorChange(e, t) {
		return this.hasComposition && t.empty && jn(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset) && this.posFromDOM(e.focusNode, e.focusOffset) == t.head;
	}
	enforceCursorAssoc() {
		if (this.hasComposition) return;
		let { view: e } = this, t = e.state.selection.main, n = Dn(e.root), { anchorNode: r, anchorOffset: i } = e.observer.selectionRange;
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
				let r = Fn(e) == 0 ? 0 : t == 0 ? -1 : 1;
				for (;;) {
					let t = e.parentNode;
					if (t == n.dom) break;
					r == 0 && t.firstChild != t.lastChild && (r = e == t.firstChild ? -1 : 1), e = t;
				}
				i = r < 0 ? e : e.nextSibling;
			}
			if (i == n.dom.firstChild) return r;
			for (; i && !R.get(i);) i = i.nextSibling;
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
		return r.isWidget() ? r.widget instanceof Bi ? null : r.coordsInWidget(i, t, !0) : r.coordsIn(i, t, n);
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
				let n = x(e.text, t);
				if (n == t) return null;
				let r = qn(e.dom, t, n).getClientRects();
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
		let t = [], { from: n, to: r } = e, i = this.view.contentDOM.clientWidth, a = i > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1, o = -1, s = this.view.textDirection == F.LTR, c = 0, l = (e, u, d) => {
			for (let f = 0; f < e.children.length && !(u > r); f++) {
				let r = e.children[f], p = u + r.length, m = r.dom.getBoundingClientRect(), { height: h } = m;
				if (d && !f && (c += m.top - d.top), r instanceof ai) p > n && l(r, u, m);
				else if (u >= n && (c > 0 && t.push(-c), t.push(h + c), c = 0, a)) {
					let e = r.dom.lastChild, t = e ? An(e) : [];
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
		return getComputedStyle(t.dom).direction == "rtl" ? F.RTL : F.LTR;
	}
	measureTextSize() {
		let e = this.tile.blockTiles((e) => {
			if (e.isLine() && e.children.length && e.length <= 20) {
				let t = 0, n;
				for (let r of e.children) {
					if (!r.isText() || /[^ -~]/.test(r.text)) return;
					let e = An(r.dom);
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
			let e = An(t.firstChild)[0];
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
				e.push(P.replace({
					widget: new Bi(r),
					block: !0,
					inclusive: !0,
					isBlockGap: !0
				}).range(n, a));
			}
			if (!i) break;
			n = i.to + 1;
		}
		return P.set(e);
	}
	updateDeco() {
		let e = 1, t = this.view.state.facet(Wr).map((t) => (this.dynamicDecorationMap[e++] = typeof t == "function") ? t(this.view) : t), n = !1, r = this.view.state.facet(Kr).map((e, t) => {
			let r = typeof e == "function";
			return r && (n = !0), r ? e(this.view) : e;
		});
		for (r.length && (this.dynamicDecorationMap[e++] = n, t.push(O.join(r))), this.decorations = [
			this.editContextFormatting,
			...t,
			this.computeBlockGapDeco(),
			this.view.viewState.lineGapDeco
		]; e < this.decorations.length;) this.dynamicDecorationMap[e++] = !1;
		this.blockWrappers = this.view.state.facet(Gr).map((e) => typeof e == "function" ? e(this.view) : e);
	}
	scrollIntoView(e) {
		if (e.isSnapshot) {
			let t = this.view.viewState.lineBlockAt(e.range.head);
			this.view.scrollDOM.scrollTop = t.top - e.yMargin, this.view.scrollDOM.scrollLeft = e.xMargin;
			return;
		}
		for (let t of this.view.state.facet(Nr)) try {
			if (t(this.view, e.range, e)) return !0;
		} catch (e) {
			Lr(this.view.state, e, "scroll handler");
		}
		let { range: t } = e, n = this.coordsAt(t.head, t.assoc || (t.head > t.anchor ? -1 : 1)), r;
		if (!n) return;
		!t.empty && (r = this.coordsAt(t.anchor, t.anchor > t.head ? -1 : 1)) && (n = {
			left: Math.min(n.left, r.left),
			top: Math.min(n.top, r.top),
			right: Math.max(n.right, r.right),
			bottom: Math.max(n.bottom, r.bottom)
		});
		let i = Zr(this.view), a = {
			left: n.left - i.left,
			top: n.top - i.top,
			right: n.right + i.right,
			bottom: n.bottom + i.bottom
		}, { offsetWidth: o, offsetHeight: s } = this.view.scrollDOM;
		if (zn(this.view.scrollDOM, a, t.head < t.anchor ? -1 : 1, e.x, e.y, Math.max(Math.min(e.xMargin, o), -o), Math.max(Math.min(e.yMargin, s), -s), this.view.textDirection == F.LTR), window.visualViewport && window.innerHeight - window.visualViewport.height > 1 && (n.top > window.visualViewport.offsetTop + window.visualViewport.height || n.bottom < window.visualViewport.offsetTop)) {
			let e = this.view.docView.lineAt(t.head, 1);
			if (e) {
				let t = Hn(e.dom);
				e.dom.scrollIntoView({ block: "nearest" }), Un(t, !1);
			}
		}
	}
	lineHasWidget(e) {
		let t = (e) => e.isWidget() || e.children.some(t);
		return t(this.tile.resolveBlock(e, 1).tile);
	}
	destroy() {
		ki(this.tile);
	}
};
function ki(e, t) {
	let n = t?.get(e);
	if (n != 1) {
		n ?? e.destroy();
		for (let n of e.children) ki(n, t);
	}
}
function Ai(e) {
	return e.node.nodeType == 1 && e.node.firstChild && (e.offset == 0 || e.node.childNodes[e.offset - 1].contentEditable == "false") && (e.offset == e.node.childNodes.length || e.node.childNodes[e.offset].contentEditable == "false");
}
function ji(e, t) {
	let n = e.observer.selectionRange;
	if (!n.focusNode) return null;
	let r = Qn(n.focusNode, n.focusOffset), i = $n(n.focusNode, n.focusOffset), a = r || i;
	if (i && r && i.node != r.node) {
		let t = R.get(i.node);
		if (!t || t.isText() && t.text != i.node.nodeValue) a = i;
		else if (e.docView.lastCompositionAfterCursor) {
			let e = R.get(r.node);
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
function Mi(e, t, n) {
	let r = ji(e, n);
	if (!r) return null;
	let { node: i, from: a, to: o } = r, s = i.nodeValue;
	if (/[\n\r]/.test(s) || e.state.doc.sliceString(r.from, r.to) != s) return null;
	let c = t.invertedDesc;
	return {
		range: new $r(c.mapPos(a), c.mapPos(o), a, o),
		text: i
	};
}
function Ni(e, t) {
	return e.nodeType == 1 ? (t && e.childNodes[t - 1].contentEditable == "false" ? 1 : 0) | (t < e.childNodes.length && e.childNodes[t].contentEditable == "false" ? 2 : 0) : 0;
}
var Pi = class {
	constructor() {
		this.changes = [];
	}
	compareRange(e, t) {
		Tn(e, t, this.changes);
	}
	comparePoint(e, t) {
		Tn(e, t, this.changes);
	}
	boundChange(e) {
		Tn(e, e, this.changes);
	}
};
function Fi(e, t, n) {
	let r = new Pi();
	return O.compare(e, t, n, r), r.changes;
}
var Ii = class {
	constructor() {
		this.changes = [];
	}
	compareRange(e, t) {
		Tn(e, t, this.changes);
	}
	comparePoint() {}
	boundChange(e) {
		Tn(e, e, this.changes);
	}
};
function Li(e, t, n) {
	let r = new Ii();
	return O.compare(e, t, n, r), r.changes;
}
function Ri(e, t) {
	for (let n = e; n && n != t; n = n.assignedSlot || n.parentNode) if (n.nodeType == 1 && n.contentEditable == "false") return !0;
	return !1;
}
function zi(e, t) {
	let n = !1;
	return t && e.iterChangedRanges((e, r) => {
		e < t.to && r > t.from && (n = !0);
	}), n;
}
var Bi = class extends yn {
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
function Vi(e, t, n = 1) {
	let r = e.charCategorizer(t), i = e.doc.lineAt(t), a = t - i.from;
	if (i.length == 0) return C.cursor(t);
	a == 0 ? n = 1 : a == i.length && (n = -1);
	let o = a, s = a;
	n < 0 ? o = x(i.text, a, !1) : s = x(i.text, a);
	let c = r(i.text.slice(o, s));
	for (; o > 0;) {
		let e = x(i.text, o, !1);
		if (r(i.text.slice(e, o)) != c) break;
		o = e;
	}
	for (; s < i.length;) {
		let e = x(i.text, s);
		if (r(i.text.slice(s, e)) != c) break;
		s = e;
	}
	return C.undirectionalRange(o + i.from, s + i.from);
}
function Hi(e, t, n, r, i) {
	let a = Math.round((r - t.left) * e.defaultCharacterWidth);
	if (e.lineWrapping && n.height > e.defaultLineHeight * 1.5) {
		let t = e.viewState.heightOracle.textHeight, r = Math.floor((i - n.top - (e.defaultLineHeight - t) * .5) / t);
		a += r * e.viewState.heightOracle.lineLength;
	}
	let o = e.state.sliceDoc(n.from, n.to);
	return n.from + Vt(o, a, e.state.tabSize);
}
function Ui(e, t, n) {
	let r = e.lineBlockAt(t);
	if (Array.isArray(r.type)) {
		let e;
		for (let i of r.type) {
			if (i.from > t) break;
			if (!(i.to < t)) {
				if (i.from < t && i.to > t) return i;
				(!e || i.type == N.Text && (e.type != i.type || (n < 0 ? i.from < t : i.to > t))) && (e = i);
			}
		}
		return e || r;
	}
	return r;
}
function Wi(e, t, n, r) {
	let i = Ui(e, t.head, t.assoc || -1), a = !r || i.type != N.Text || !(e.lineWrapping || i.widgetLineBreaks) ? null : e.coordsAtPos(t.assoc < 0 && t.head > i.from ? t.head - 1 : t.head);
	if (a) {
		let t = e.dom.getBoundingClientRect(), r = e.textDirectionAt(i.from), o = e.posAtCoords({
			x: n == (r == F.LTR) ? t.right - 1 : t.left + 1,
			y: (a.top + a.bottom) / 2
		});
		if (o != null) return C.cursor(o, n ? -1 : 1);
	}
	return C.cursor(n ? i.to : i.from, n ? -1 : 1);
}
function Gi(e, t, n, r) {
	let i = e.state.doc.lineAt(t.head), a = e.bidiSpans(i), o = e.textDirectionAt(i.from);
	for (let s = t, c = null;;) {
		let t = br(i, a, o, s, n), l = yr;
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
function Ki(e, t, n) {
	let r = e.state.charCategorizer(t), i = r(n);
	return (e) => {
		let t = r(e);
		return i == E.Space && (i = t), i == t;
	};
}
function qi(e, t, n, r) {
	let i = t.head, a = n ? 1 : -1;
	if (i == (n ? e.state.doc.length : 0)) return C.cursor(i, t.assoc);
	let o = t.goalColumn, s, c = e.contentDOM.getBoundingClientRect(), l = e.coordsAtPos(i, t.assoc || ((t.empty ? n : t.head == t.from) ? 1 : -1)), u = e.documentTop;
	if (l) o ??= l.left - c.left, s = a < 0 ? l.top : l.bottom;
	else {
		let t = e.viewState.lineBlockAt(i);
		o ??= Math.min(c.right - c.left, e.defaultCharacterWidth * (i - t.from)), s = (a < 0 ? t.top : t.bottom) + u;
	}
	let d = c.left + o, f = e.viewState.heightOracle.textHeight >> 1, p = r ?? f;
	for (let t = 0;; t += f) {
		let r = s + (p + t) * a, i = Qi(e, {
			x: d,
			y: r
		}, !1, a);
		if (n ? r > c.bottom : r < c.top) return C.cursor(i.pos, i.assoc);
		let l = e.coordsAtPos(i.pos, i.assoc), u = l ? (l.top + l.bottom) / 2 : 0;
		if (!l || (n ? u > s : u < s)) return C.cursor(i.pos, i.assoc, void 0, o);
	}
}
function Ji(e, t, n) {
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
function Yi(e, t) {
	let n = null;
	for (let r = 0; r < t.ranges.length; r++) {
		let i = t.ranges[r], a = null;
		if (i.empty) {
			let t = Ji(e, i.from, 0);
			t != i.from && (a = C.cursor(t, -1));
		} else {
			let t = Ji(e, i.from, -1), n = Ji(e, i.to, 1);
			(t != i.from || n != i.to) && (a = i.undirectional ? C.undirectionalRange(i.from, i.to) : C.range(i.from == i.anchor ? t : n, i.from == i.head ? t : n));
		}
		a && (n ||= t.ranges.slice(), n[r] = a);
	}
	return n ? C.create(n, t.mainIndex) : t;
}
function Xi(e, t, n) {
	let r = Ji(e.state.facet(qr).map((t) => t(e)), n.from, t.head > n.from ? -1 : 1);
	return r == n.from ? n : C.cursor(r, r < n.from ? 1 : -1);
}
var Zi = class {
	constructor(e, t) {
		this.pos = e, this.assoc = t;
	}
};
function Qi(e, t, n, r) {
	let i = e.contentDOM.getBoundingClientRect(), a = i.top + e.viewState.paddingTop, { x: o, y: s } = t, c = s - a, l;
	for (;;) {
		if (c < 0) return new Zi(0, 1);
		if (c > e.viewState.docHeight) return new Zi(e.state.doc.length, -1);
		if (l = e.elementAtHeight(c), r == null) break;
		if (l.type == N.Text) {
			if (r < 0 ? l.to < e.viewport.from : l.from > e.viewport.to) break;
			let t = e.docView.coordsAt(r < 0 ? l.from : l.to, r > 0 ? -1 : 1);
			if (t && (r < 0 ? t.top <= c + a : t.bottom >= c + a)) break;
		}
		let t = e.viewState.heightOracle.textHeight / 2;
		c = r > 0 ? l.bottom + t : l.top - t;
	}
	if (e.viewport.from >= l.to || e.viewport.to <= l.from) {
		if (n) return null;
		if (l.type == N.Text) {
			let t = Hi(e, i, l, o, s);
			return new Zi(t, t == l.from ? 1 : -1);
		}
	}
	if (l.type != N.Text) return c < (l.top + l.bottom) / 2 ? new Zi(l.from, 1) : new Zi(l.to, -1);
	let u = e.docView.lineAt(l.from, 2);
	return (!u || u.length != l.length) && (u = e.docView.lineAt(l.from, -2)), new $i(e, o, s, e.textDirectionAt(l.from)).scanTile(u, l.from);
}
var $i = class {
	constructor(e, t, n, r) {
		this.view = e, this.x = t, this.y = n, this.baseDir = r, this.line = null, this.spans = null;
	}
	bidiSpansAt(e) {
		return (!this.line || this.line.from > e || this.line.to < e) && (this.line = this.view.state.doc.lineAt(e), this.spans = this.view.bidiSpans(this.line)), this;
	}
	baseDirAt(e, t) {
		let { line: n, spans: r } = this.bidiSpansAt(e);
		return r[ur.find(r, e - n.from, -1, t)].level == this.baseDir;
	}
	dirAt(e, t) {
		let { line: n, spans: r } = this.bidiSpansAt(e);
		return r[ur.find(r, e - n.from, -1, t)].dir;
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
						n < u && (l = f, u = n, d = t), e && (m = e < 0 == (this.baseDir == F.LTR) ? -1 : 1);
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
		let f = (o ? this.dirAt(e[l], 1) : this.baseDir) == F.LTR;
		return {
			i: l,
			after: this.x > (d.left + d.right) / 2 == f
		};
	}
	scanText(e, t) {
		let n = [];
		for (let r = 0; r < e.length; r = x(e.text, r)) n.push(t + r);
		n.push(t + e.length);
		let r = this.scan(n, (r) => {
			let i = n[r] - t, a = n[r + 1] - t;
			return qn(e.dom, i, a).getClientRects();
		});
		return r.after ? new Zi(n[r.i + 1], -1) : new Zi(n[r.i], 1);
	}
	scanTile(e, t) {
		if (!e.length) return new Zi(t, 1);
		if (e.children.length == 1) {
			let n = e.children[0];
			if (n.isText()) return this.scanText(n, t);
			if (n.isComposite()) return this.scanTile(n, t);
		}
		let n = [t];
		for (let r = 0, i = t; r < e.children.length; r++) n.push(i += e.children[r].length);
		let r = this.scan(n, (t) => {
			let n = e.children[t];
			return n.flags & 48 ? null : (n.dom.nodeType == 1 ? n.dom : qn(n.dom, 0, n.length)).getClientRects();
		}), i = e.children[r.i], a = n[r.i];
		return i.isText() ? this.scanText(i, a) : i.isComposite() ? this.scanTile(i, a) : r.after ? new Zi(n[r.i + 1], -1) : new Zi(a, 1);
	}
}, ea = "￿", ta = class {
	constructor(e, t) {
		this.points = e, this.view = t, this.text = "", this.lineSeparator = t.state.facet(D.lineSeparator);
	}
	append(e) {
		this.text += e;
	}
	lineBreak() {
		this.text += ea;
	}
	readRange(e, t) {
		if (!e) return this;
		let n = e.parentNode;
		for (let r = e;;) {
			this.findPointBefore(n, r);
			let e = this.text.length;
			this.readNode(r);
			let i = R.get(r), a = r.nextSibling;
			if (a == t) {
				i?.breakAfter && !a && n != this.view.contentDOM && this.lineBreak();
				break;
			}
			let o = R.get(a);
			(i && o ? i.breakAfter : (i ? i.breakAfter : Nn(r)) || Nn(a) && (r.nodeName != "BR" || i?.isWidget()) && this.text.length > e) && !ra(a, t) && this.lineBreak(), r = a;
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
		let t = R.get(e), n = t && t.overrideDOMText;
		if (n != null) {
			this.findPointInside(e, n.length);
			for (let e = n.iter(); !e.next().done;) e.lineBreak ? this.lineBreak() : this.append(e.value);
		} else e.nodeType == 3 ? this.readTextNode(e) : e.nodeName == "BR" ? e.nextSibling && this.lineBreak() : e.nodeType == 1 && this.readRange(e.firstChild, null);
	}
	findPointBefore(e, t) {
		for (let n of this.points) n.node == e && e.childNodes[n.offset] == t && (n.pos = this.text.length);
	}
	findPointInside(e, t) {
		for (let n of this.points) (e.nodeType == 3 ? n.node == e : e.contains(n.node)) && (n.pos = this.text.length + (na(e, n.node, n.offset) ? t : 0));
	}
};
function na(e, t, n) {
	for (;;) {
		if (!t || n < Fn(t)) return !1;
		if (t == e) return !0;
		n = Mn(t) + 1, t = t.parentNode;
	}
}
function ra(e, t) {
	let n;
	for (; !(e == t || !e); e = e.nextSibling) {
		let t = R.get(e);
		if (!t?.isWidget()) return !1;
		t && (n ||= []).push(t);
	}
	if (n) {
		for (let e of n) if (e.overrideDOMText?.length) return !1;
	}
	return !0;
}
var ia = class {
	constructor(e, t) {
		this.node = e, this.offset = t, this.pos = -1;
	}
}, aa = class {
	constructor(e, t, n, r) {
		this.typeOver = r, this.bounds = null, this.text = "", this.domChanged = t > -1;
		let { impreciseHead: i, impreciseAnchor: a } = e.docView, o = e.state.selection;
		if (e.state.readOnly && t > -1) this.newSel = null;
		else if (t > -1 && (this.bounds = oa(e.docView.tile, t, n, 0))) {
			let t = i || a ? [] : da(e), n = new ta(t, e);
			n.readRange(this.bounds.startDOM, this.bounds.endDOM), this.text = n.text, this.newSel = fa(t, this.bounds.from);
		} else {
			let t = e.observer.selectionRange, n = i && i.node == t.focusNode && i.offset == t.focusOffset || !On(e.contentDOM, t.focusNode) ? o.main.head : e.docView.posFromDOM(t.focusNode, t.focusOffset), r = a && a.node == t.anchorNode && a.offset == t.anchorOffset || !On(e.contentDOM, t.anchorNode) ? o.main.anchor : e.docView.posFromDOM(t.anchorNode, t.anchorOffset), s = e.viewport;
			if ((M.ios || M.chrome) && n != r && Math.min(n, r) <= o.main.from && Math.max(n, r) >= o.main.to && (s.from > 0 || s.to < e.state.doc.length)) {
				let t = Math.min(n, r), i = Math.max(n, r), a = s.from - t, o = s.to - i;
				(a == 0 || a == 1 || t == 0) && (o == 0 || o == -1 || i == e.state.doc.length) && (n = 0, r = e.state.doc.length);
			}
			if (e.inputState.composing > -1 && o.ranges.length > 1) this.newSel = o.replaceRange(C.range(r, n));
			else if (e.lineWrapping && r == n && !(o.main.empty && o.main.head == n) && e.inputState.lastTouchTime > Date.now() - 100) {
				let t = e.coordsAtPos(n, -1), r = 0;
				t && (r = e.inputState.lastTouchY <= t.bottom ? -1 : 1), this.newSel = C.create([C.cursor(n, r)]);
			} else this.newSel = C.single(r, n);
		}
	}
};
function oa(e, t, n, r) {
	if (e.isComposite()) {
		let i = -1, a = -1, o = -1, s = -1;
		for (let c = 0, l = r, u = r; c < e.children.length; c++) {
			let r = e.children[c], d = l + r.length;
			if (l < t && d > n) return oa(r, t, n, l);
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
function sa(e, t) {
	let n, { newSel: r } = t, { state: i } = e, a = i.selection.main, o = e.inputState.lastKeyTime > Date.now() - 100 ? e.inputState.lastKeyCode : -1;
	if (t.bounds) {
		let { from: e, to: r } = t.bounds, s = a.from, c = null;
		(o === 8 || M.android && t.text.length < r - e) && (s = a.to, c = "end");
		let l = i.doc.sliceString(e, r, ea), u, d;
		!a.empty && a.from >= e && a.to <= r && (t.typeOver || l != t.text) && l.slice(0, a.from - e) == t.text.slice(0, a.from - e) && l.slice(a.to - e) == t.text.slice(u = t.text.length - (l.length - (a.to - e))) ? n = {
			from: a.from,
			to: a.to,
			insert: b.of(t.text.slice(a.from - e, u).split(ea))
		} : (d = ua(l, t.text, s - e, c)) && (M.chrome && o == 13 && d.toB == d.from + 2 && t.text.slice(d.from, d.toB) == "￿￿" && d.toB--, n = {
			from: e + d.from,
			to: e + d.toA,
			insert: b.of(t.text.slice(d.from, d.toB).split(ea))
		});
	} else r && (!e.hasFocus && i.facet(Rr) || pa(r, a)) && (r = null);
	if (!n && !r) return !1;
	if ((M.mac || M.android) && n && n.from == n.to && n.from == a.head - 1 && /^\. ?$/.test(n.insert.toString()) && e.contentDOM.getAttribute("autocorrect") == "off" ? (r && n.insert.length == 2 && (r = C.single(r.main.anchor - 1, r.main.head - 1)), n = {
		from: n.from,
		to: n.to,
		insert: b.of([n.insert.toString().replace(".", " ")])
	}) : i.doc.lineAt(a.from).to < a.to && e.docView.lineHasWidget(a.to) && e.inputState.insertingTextAt > Date.now() - 50 ? n = {
		from: a.from,
		to: a.to,
		insert: i.toText(e.inputState.insertingText)
	} : M.chrome && n && n.from == n.to && n.from == a.head && n.insert.toString() == "\n " && e.lineWrapping && (r &&= C.single(r.main.anchor - 1, r.main.head - 1), n = {
		from: a.from,
		to: a.to,
		insert: b.of([" "])
	}), n) return ca(e, n, r, o);
	if (r && !pa(r, a)) {
		let t = !1, n = "select";
		return e.inputState.lastSelectionTime > Date.now() - 50 && (e.inputState.lastSelectionOrigin == "select" && (t = !0), n = e.inputState.lastSelectionOrigin, n == "select.pointer" && (r = Yi(i.facet(qr).map((t) => t(e)), r))), e.dispatch({
			selection: r,
			scrollIntoView: t,
			userEvent: n
		}), !0;
	}
	return !1;
}
function ca(e, t, n, r = -1) {
	if (M.ios && e.inputState.flushIOSKey(t)) return !0;
	let i = e.state.selection.main;
	if (M.android && (t.to == i.to && (t.from == i.from || t.from == i.from - 1 && e.state.sliceDoc(t.from, i.from) == " ") && t.insert.length == 1 && t.insert.lines == 2 && Jn(e.contentDOM, "Enter", 13) || (t.from == i.from - 1 && t.to == i.to && t.insert.length == 0 || r == 8 && t.insert.length < t.to - t.from && t.to > i.head) && Jn(e.contentDOM, "Backspace", 8) || t.from == i.from && t.to == i.to + 1 && t.insert.length == 0 && Jn(e.contentDOM, "Delete", 46))) return !0;
	let a = t.insert.toString();
	e.inputState.composing >= 0 && e.inputState.composing++;
	let o, s = () => o ||= la(e, t, n);
	return e.state.facet(Dr).some((n) => n(e, t.from, t.to, a, s)) || e.dispatch(s()), !0;
}
function la(e, t, n) {
	let r, i = e.state, a = i.selection.main, o = -1;
	if (t.from == t.to && t.from < a.from || t.from > a.to) {
		let n = t.from < a.from ? -1 : 1, r = n < 0 ? a.from : a.to, s = Ji(i.facet(qr).map((t) => t(e)), r, n);
		t.from == s && (o = s);
	}
	if (o > -1) r = {
		changes: t,
		selection: C.cursor(t.from + t.insert.length, -1)
	};
	else if (t.from >= a.from && t.to <= a.to && t.to - t.from >= (a.to - a.from) / 3 && (!n || n.main.empty && n.main.from == t.from + t.insert.length) && e.inputState.composing < 0) {
		let n = a.from < t.from ? i.sliceDoc(a.from, t.from) : "", o = a.to > t.to ? i.sliceDoc(t.to, a.to) : "";
		r = i.replaceSelection(e.state.toText(n + t.insert.sliceString(0, void 0, e.state.lineBreak) + o));
	} else {
		let o = i.changes(t), s = n && n.main.to <= o.newLength ? n.main : void 0;
		if (i.selection.ranges.length > 1 && (e.inputState.composing >= 0 || e.inputState.compositionPendingChange) && t.to <= a.to + 10 && t.to >= a.to - 10) {
			let c = e.state.sliceDoc(t.from, t.to), l, u = n && ji(e, n.main.head);
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
					range: s ? C.range(Math.max(0, s.anchor + p), Math.max(0, s.head + p)) : n.map(f)
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
function ua(e, t, n, r) {
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
function da(e) {
	let t = [];
	if (e.root.activeElement != e.contentDOM) return t;
	let { anchorNode: n, anchorOffset: r, focusNode: i, focusOffset: a } = e.observer.selectionRange;
	return n && (t.push(new ia(n, r)), (i != n || a != r) && t.push(new ia(i, a))), t;
}
function fa(e, t) {
	if (e.length == 0) return null;
	let n = e[0].pos, r = e.length == 2 ? e[1].pos : n;
	return n > -1 && r > -1 ? C.single(n + t, r + t) : null;
}
function pa(e, t) {
	return t.head == e.main.head && t.anchor == e.main.anchor;
}
var ma = class {
	setSelectionOrigin(e) {
		this.lastSelectionOrigin = e, this.lastSelectionTime = Date.now();
	}
	constructor(e) {
		this.view = e, this.lastKeyCode = 0, this.lastKeyTime = 0, this.touchActive = !1, this.lastTouchTime = 0, this.lastTouchX = 0, this.lastTouchY = 0, this.lastFocusTime = 0, this.lastScrollTop = 0, this.lastScrollLeft = 0, this.lastWheelEvent = 0, this.pendingIOSKey = void 0, this.lastIOSMomentumScroll = 0, this.tabFocusMode = -1, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastContextMenu = 0, this.scrollHandlers = [], this.handlers = Object.create(null), this.composing = -1, this.compositionFirstChange = null, this.compositionEndedAt = 0, this.compositionPendingKey = !1, this.compositionPendingChange = !1, this.insertingText = "", this.insertingTextAt = 0, this.mouseSelection = null, this.draggedContent = null, this.handleEvent = this.handleEvent.bind(this), this.notifiedFocused = e.hasFocus, M.safari && e.contentDOM.addEventListener("input", () => null), M.gecko && Xa(e.contentDOM.ownerDocument);
	}
	handleEvent(e) {
		!Oa(this.view, e) || this.ignoreDuringComposition(e) || e.type == "keydown" && this.keydown(e) || (this.view.updateState == 0 ? this.runHandlers(e.type, e) : Promise.resolve().then(() => this.runHandlers(e.type, e)));
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
		let t = _a(e), n = this.handlers, r = this.view.contentDOM;
		for (let e in t) if (e != "scroll") {
			let i = !t[e].handlers.length, a = n[e];
			a && i != !a.handlers.length && (r.removeEventListener(e, this.handleEvent), a = null), a || r.addEventListener(e, this.handleEvent, { passive: i });
		}
		for (let e in n) e != "scroll" && !t[e] && r.removeEventListener(e, this.handleEvent);
		this.handlers = t;
	}
	keydown(e) {
		if (this.lastKeyCode = e.keyCode, this.lastKeyTime = Date.now(), e.keyCode == 9 && this.tabFocusMode > -1 && (!this.tabFocusMode || Date.now() <= this.tabFocusMode)) return !0;
		if (this.tabFocusMode > 0 && e.keyCode != 27 && ba.indexOf(e.keyCode) < 0 && (this.tabFocusMode = -1), M.android && M.chrome && !e.synthetic && (e.keyCode == 13 || e.keyCode == 8)) return this.view.observer.delayAndroidKey(e.key, e.keyCode), !0;
		if (M.ios && !e.synthetic && !e.altKey && !e.metaKey && (va.some((t) => t.keyCode == e.keyCode) && !e.ctrlKey || ya.indexOf(e.key) > -1 && e.ctrlKey)) {
			let t = {
				ctrlKey: e.ctrlKey,
				altKey: e.altKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey
			};
			return t.shiftKey && M.ios && !/^(off|none)$/.test(this.view.contentDOM.autocapitalize) && ha(this.view.win) && (t.shiftKey = !1), this.pendingIOSKey = {
				key: e.key,
				keyCode: e.keyCode,
				mods: t
			}, setTimeout(() => this.flushIOSKey(), 250), !0;
		}
		return e.keyCode != 229 && this.view.observer.forceFlush(), !1;
	}
	flushIOSKey(e) {
		let t = this.pendingIOSKey;
		return !t || t.key == "Enter" && e && e.from < e.to && /^\S+$/.test(e.insert.toString()) ? !1 : (this.pendingIOSKey = void 0, Jn(this.view.contentDOM, t.key, t.keyCode, t.mods));
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
function ha(e) {
	return e.visualViewport ? e.visualViewport.height * e.visualViewport.scale / e.document.documentElement.clientHeight < .85 : !1;
}
function ga(e, t) {
	return (n, r) => {
		try {
			return t.call(e, r, n);
		} catch (e) {
			Lr(n.state, e);
		}
	};
}
function _a(e) {
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
			i && n(e).handlers.push(ga(t.value, i));
		}
		if (i) for (let e in i) {
			let r = i[e];
			r && n(e).observers.push(ga(t.value, r));
		}
	}
	for (let e in ka) n(e).handlers.push(ka[e]);
	for (let e in z) n(e).observers.push(z[e]);
	return t;
}
var va = [
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
], ya = "dthko", ba = [
	16,
	17,
	18,
	20,
	91,
	92,
	224,
	225
], xa = 6;
function Sa(e) {
	return Math.max(0, e) * .7 + 8;
}
function Ca(e, t) {
	return Math.max(Math.abs(e.clientX - t.clientX), Math.abs(e.clientY - t.clientY));
}
var wa = class {
	constructor(e, t, n, r) {
		this.view = e, this.startEvent = t, this.style = n, this.mustSelect = r, this.scrollSpeed = {
			x: 0,
			y: 0
		}, this.scrolling = -1, this.lastEvent = t, this.scrollParents = Bn(e.contentDOM), this.atoms = e.state.facet(qr).map((t) => t(e));
		let i = e.contentDOM.ownerDocument;
		i.addEventListener("mousemove", this.move = this.move.bind(this)), i.addEventListener("mouseup", this.up = this.up.bind(this)), this.extend = t.shiftKey, this.multiple = e.state.facet(D.allowMultipleSelections) && Ta(e, t), this.dragging = Da(e, t) && za(t) == 1 ? null : !1;
	}
	start(e) {
		this.dragging === !1 && this.select(e);
	}
	move(e) {
		if (e.buttons == 0) return this.destroy();
		if (this.dragging || this.dragging == null && Ca(this.startEvent, e) < 10) return;
		this.select(this.lastEvent = e);
		let t = 0, n = 0, r = 0, i = 0, a = this.view.win.innerWidth, o = this.view.win.innerHeight;
		this.scrollParents.x && ({left: r, right: a} = this.scrollParents.x.getBoundingClientRect()), this.scrollParents.y && ({top: i, bottom: o} = this.scrollParents.y.getBoundingClientRect());
		let s = Zr(this.view);
		e.clientX - s.left <= r + xa ? t = -Sa(r - e.clientX) : e.clientX + s.right >= a - xa && (t = Sa(e.clientX - a)), e.clientY - s.top <= i + xa ? n = -Sa(i - e.clientY) : e.clientY + s.bottom >= o - xa && (n = Sa(e.clientY - o)), this.setScrollSpeed(t, n);
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
		let { view: t } = this, n = Yi(this.atoms, this.style.get(e, this.extend, this.multiple));
		(this.mustSelect || !n.eq(t.state.selection, this.dragging === !1)) && this.view.dispatch({
			selection: n,
			userEvent: "select.pointer"
		}), this.mustSelect = !1;
	}
	update(e) {
		e.transactions.some((e) => e.isUserEvent("input.type")) ? this.destroy() : this.style.update(e) && setTimeout(() => this.select(this.lastEvent), 20);
	}
};
function Ta(e, t) {
	let n = e.state.facet(Sr);
	return n.length ? n[0](t) : M.mac ? t.metaKey : t.ctrlKey;
}
function Ea(e, t) {
	let n = e.state.facet(Cr);
	return n.length ? n[0](t) : M.mac ? !t.altKey : !t.ctrlKey;
}
function Da(e, t) {
	let { main: n } = e.state.selection;
	if (n.empty) return !1;
	let r = Dn(e.root);
	if (!r || r.rangeCount == 0) return !0;
	let i = r.getRangeAt(0).getClientRects();
	for (let e = 0; e < i.length; e++) {
		let n = i[e];
		if (n.left <= t.clientX && n.right >= t.clientX && n.top <= t.clientY && n.bottom >= t.clientY) return !0;
	}
	return !1;
}
function Oa(e, t) {
	if (!t.bubbles) return !0;
	if (t.defaultPrevented) return !1;
	for (let n = t.target, r; n != e.contentDOM; n = n.parentNode) if (!n || n.nodeType == 11 || (r = R.get(n)) && r.isWidget() && !r.isHidden && r.widget.ignoreEvent(t)) return !1;
	return !0;
}
var ka = /*@__PURE__*/ Object.create(null), z = /*@__PURE__*/ Object.create(null), Aa = M.ie && M.ie_version < 15 || M.ios && M.webkit_version < 604;
function ja(e) {
	let t = e.dom.parentNode;
	if (!t) return;
	let n = t.appendChild(document.createElement("textarea"));
	n.style.cssText = "position: fixed; left: -10000px; top: 10px", n.focus(), setTimeout(() => {
		e.focus(), n.remove(), Na(e, n.value);
	}, 50);
}
function Ma(e, t, n) {
	for (let r of e.facet(t)) n = r(n, e);
	return n;
}
function Na(e, t) {
	t = Ma(e.state, kr, t);
	let { state: n } = e, r, i = 1, a = n.toText(t), o = a.lines == n.selection.ranges.length;
	if (Ga != null && n.selection.ranges.every((e) => e.empty) && Ga == a.toString()) {
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
				range: C.cursor(r.from + c.length)
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
			range: C.cursor(e.from + t.length)
		};
	}) : n.replaceSelection(a);
	e.dispatch(r, {
		userEvent: "input.paste",
		scrollIntoView: !0
	});
}
z.scroll = (e) => {
	let t = e.inputState;
	t.lastScrollTop = e.scrollDOM.scrollTop, t.lastScrollLeft = e.scrollDOM.scrollLeft, M.ios && !t.touchActive && (t.lastIOSMomentumScroll = Date.now());
}, z.wheel = z.mousewheel = (e) => {
	e.inputState.lastWheelEvent = Date.now();
}, ka.keydown = (e, t) => (e.inputState.setSelectionOrigin("select"), t.keyCode == 27 && e.inputState.tabFocusMode != 0 && (e.inputState.tabFocusMode = Date.now() + 2e3), !1), z.touchstart = (e, t) => {
	let n = e.inputState, r = t.targetTouches[0];
	n.touchActive = !0, n.lastTouchTime = Date.now(), r && (n.lastTouchX = r.clientX, n.lastTouchY = r.clientY), n.setSelectionOrigin("select.pointer");
}, z.touchmove = (e) => {
	e.inputState.setSelectionOrigin("select.pointer");
}, z.touchend = (e, t) => {
	e.inputState.touchActive = !1;
}, ka.mousedown = (e, t) => {
	if (e.observer.flush(), e.inputState.lastTouchTime > Date.now() - 2e3) return !1;
	let n = null;
	for (let r of e.state.facet(wr)) if (n = r(e, t), n) break;
	if (!n && t.button == 0 && (n = Ba(e, t)), n) {
		let r = !e.hasFocus;
		e.inputState.startMouseSelection(new wa(e, t, n, r)), r && e.observer.ignore(() => {
			Gn(e.contentDOM);
			let t = e.root.activeElement;
			t && !t.contains(e.contentDOM) && t.blur();
		});
		let i = e.inputState.mouseSelection;
		if (i) return i.start(t), i.dragging === !1;
	} else e.inputState.setSelectionOrigin("select.pointer");
	return !1;
};
function Pa(e, t, n, r) {
	if (r == 1) return C.cursor(t, n);
	if (r == 2) return Vi(e.state, t, n);
	{
		let r = e.docView.lineAt(t, n), i = e.state.doc.lineAt(r ? r.posAtEnd : t), a = r ? r.posAtStart : i.from, o = r ? r.posAtEnd : i.to;
		return o < e.state.doc.length && o == i.to && o++, C.undirectionalRange(a, o);
	}
}
var Fa = M.ie && M.ie_version <= 11, Ia = null, La = 0, Ra = 0;
function za(e) {
	if (!Fa) return e.detail;
	let t = Ia, n = Ra;
	return Ia = e, Ra = Date.now(), La = !t || n > Date.now() - 400 && Math.abs(t.clientX - e.clientX) < 2 && Math.abs(t.clientY - e.clientY) < 2 ? (La + 1) % 3 : 1;
}
function Ba(e, t) {
	let n = e.posAndSideAtCoords({
		x: t.clientX,
		y: t.clientY
	}, !1), r = za(t), i = e.state.selection;
	return {
		update(e) {
			e.docChanged && (n.pos = e.changes.mapPos(n.pos), i = i.map(e.changes));
		},
		get(t, a, o) {
			let s = e.posAndSideAtCoords({
				x: t.clientX,
				y: t.clientY
			}, !1), c, l = Pa(e, s.pos, s.assoc, r);
			if (n.pos != s.pos && !a) {
				let t = Pa(e, n.pos, n.assoc, r), i = Math.min(t.from, l.from), a = Math.max(t.to, l.to);
				l = i < l.from ? C.range(i, a, l.assoc) : C.range(a, i, l.assoc);
			}
			return a ? i.replaceRange(i.main.extend(l.from, l.to, l.assoc)) : o && r == 1 && i.ranges.length > 1 && (c = Va(i, s.pos)) ? c : o ? i.addRange(l) : C.create([l]);
		}
	};
}
function Va(e, t) {
	for (let n = 0; n < e.ranges.length; n++) {
		let { from: r, to: i } = e.ranges[n];
		if (r <= t && i >= t) return C.create(e.ranges.slice(0, n).concat(e.ranges.slice(n + 1)), e.mainIndex == n ? 0 : e.mainIndex - +(e.mainIndex > n));
	}
	return null;
}
ka.dragstart = (e, t) => {
	let { selection: { main: n } } = e.state;
	if (t.target.draggable) {
		let r = e.docView.tile.nearest(t.target);
		if (r && r.isWidget()) {
			let e = r.posAtStart, t = e + r.length;
			(e >= n.to || t <= n.from) && (n = C.undirectionalRange(e, t));
		}
	}
	let { inputState: r } = e;
	return r.mouseSelection && (r.mouseSelection.dragging = !0), r.draggedContent = n, t.dataTransfer && (t.dataTransfer.setData("Text", Ma(e.state, Ar, e.state.sliceDoc(n.from, n.to))), t.dataTransfer.effectAllowed = "copyMove"), !1;
}, ka.dragend = (e) => (e.inputState.draggedContent = null, !1);
function Ha(e, t, n, r) {
	if (n = Ma(e.state, kr, n), !n) return;
	let i = e.posAtCoords({
		x: t.clientX,
		y: t.clientY
	}, !1), { draggedContent: a } = e.inputState, o = r && a && Ea(e, t) ? {
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
ka.drop = (e, t) => {
	if (!t.dataTransfer) return !1;
	if (e.state.readOnly) return !0;
	let n = t.dataTransfer.files;
	if (n && n.length) {
		let r = Array(n.length), i = 0, a = () => {
			++i == n.length && Ha(e, t, r.filter((e) => e != null).join(e.state.lineBreak), !1);
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
		if (n) return Ha(e, t, n, !0), !0;
	}
	return !1;
}, ka.paste = (e, t) => {
	if (e.state.readOnly) return !0;
	e.observer.flush();
	let n = Aa ? null : t.clipboardData;
	return n ? (Na(e, n.getData("text/plain") || n.getData("text/uri-list")), !0) : (ja(e), !1);
};
function Ua(e, t) {
	let n = e.dom.parentNode;
	if (!n) return;
	let r = n.appendChild(document.createElement("textarea"));
	r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.value = t, r.focus(), r.selectionEnd = t.length, r.selectionStart = 0, setTimeout(() => {
		r.remove(), e.focus();
	}, 50);
}
function Wa(e) {
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
		text: Ma(e, Ar, t.join(e.lineBreak)),
		ranges: n,
		linewise: r
	};
}
var Ga = null;
ka.copy = ka.cut = (e, t) => {
	if (!kn(e.contentDOM, e.observer.selectionRange)) return !1;
	let { text: n, ranges: r, linewise: i } = Wa(e.state);
	if (!n && !i) return !1;
	Ga = i ? n : null, t.type == "cut" && !e.state.readOnly && e.dispatch({
		changes: r,
		scrollIntoView: !0,
		userEvent: "delete.cut"
	});
	let a = Aa ? null : t.clipboardData;
	return a ? (a.clearData(), a.setData("text/plain", n), !0) : (Ua(e, n), !1);
};
var Ka = /*@__PURE__*/ ot.define();
function qa(e, t) {
	let n = [];
	for (let r of e.facet(Or)) {
		let i = r(e, t);
		i && n.push(i);
	}
	return n.length ? e.update({
		effects: n,
		annotations: Ka.of(!0)
	}) : null;
}
function Ja(e) {
	setTimeout(() => {
		let t = e.hasFocus;
		if (t != e.inputState.notifiedFocused) {
			let n = qa(e.state, t);
			n ? e.dispatch(n) : e.update([]);
		}
	}, 10);
}
z.focus = (e) => {
	e.inputState.lastFocusTime = Date.now(), !e.scrollDOM.scrollTop && (e.inputState.lastScrollTop || e.inputState.lastScrollLeft) && (e.scrollDOM.scrollTop = e.inputState.lastScrollTop, e.scrollDOM.scrollLeft = e.inputState.lastScrollLeft), Ja(e);
}, z.blur = (e) => {
	e.observer.clearSelectionRange(), Ja(e);
}, z.compositionstart = z.compositionupdate = (e) => {
	e.observer.editContext || (e.inputState.compositionFirstChange ?? (e.inputState.compositionFirstChange = !0), e.inputState.composing < 0 && (e.inputState.composing = 0));
}, z.compositionend = (e) => {
	e.observer.editContext || (e.inputState.composing = -1, e.inputState.compositionEndedAt = Date.now(), e.inputState.compositionPendingKey = !0, e.inputState.compositionPendingChange = e.observer.pendingRecords().length > 0, e.inputState.compositionFirstChange = null, M.chrome && M.android ? e.observer.flushSoon() : e.inputState.compositionPendingChange ? Promise.resolve().then(() => e.observer.flush()) : setTimeout(() => {
		e.inputState.composing < 0 && e.docView.hasComposition && e.update([]);
	}, 50));
}, z.contextmenu = (e) => {
	e.inputState.lastContextMenu = Date.now();
}, ka.beforeinput = (e, t) => {
	if ((t.inputType == "insertText" || t.inputType == "insertCompositionText") && (e.inputState.insertingText = t.data, e.inputState.insertingTextAt = Date.now()), t.inputType == "insertReplacementText" && e.observer.editContext) {
		let n = t.dataTransfer?.getData("text/plain"), r = t.getTargetRanges();
		if (n && r.length) {
			let t = r[0];
			return ca(e, {
				from: e.posAtDOM(t.startContainer, t.startOffset),
				to: e.posAtDOM(t.endContainer, t.endOffset),
				insert: e.state.toText(n)
			}, null), !0;
		}
	}
	let n;
	if (M.chrome && M.android && (n = va.find((e) => e.inputType == t.inputType)) && (e.observer.delayAndroidKey(n.key, n.keyCode), n.key == "Backspace" || n.key == "Delete")) {
		let t = window.visualViewport?.height || 0;
		setTimeout(() => {
			(window.visualViewport?.height || 0) > t + 10 && e.hasFocus && (e.contentDOM.blur(), e.focus());
		}, 100);
	}
	return M.ios && t.inputType == "deleteContentForward" && e.observer.flushSoon(), M.safari && t.inputType == "insertText" && e.inputState.composing >= 0 && setTimeout(() => z.compositionend(e, t), 20), !1;
};
var Ya = /*@__PURE__*/ new Set();
function Xa(e) {
	Ya.has(e) || (Ya.add(e), e.addEventListener("copy", () => {}), e.addEventListener("cut", () => {}));
}
var Za = [
	"pre-wrap",
	"normal",
	"pre-line",
	"break-spaces"
], Qa = !1;
function $a() {
	Qa = !1;
}
var eo = class {
	constructor(e) {
		this.lineWrapping = e, this.doc = b.empty, this.heightSamples = {}, this.lineHeight = 14, this.charWidth = 7, this.textHeight = 14, this.lineLength = 30;
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
		return Za.indexOf(e) > -1 != this.lineWrapping;
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
		let o = Za.indexOf(e) > -1, s = Math.abs(t - this.lineHeight) > .3 || this.lineWrapping != o;
		if (this.lineWrapping = o, this.lineHeight = t, this.charWidth = n, this.textHeight = r, this.lineLength = i, s) {
			this.heightSamples = {};
			for (let e = 0; e < a.length; e++) {
				let t = a[e];
				t < 0 ? e++ : this.heightSamples[Math.floor(t * 10)] = !0;
			}
		}
		return s;
	}
}, to = class {
	constructor(e, t) {
		this.from = e, this.heights = t, this.index = 0;
	}
	get more() {
		return this.index < this.heights.length;
	}
}, no = class e {
	constructor(e, t, n, r, i) {
		this.from = e, this.length = t, this.top = n, this.height = r, this._content = i;
	}
	get type() {
		return typeof this._content == "number" ? N.Text : Array.isArray(this._content) ? this._content : this._content.type;
	}
	get to() {
		return this.from + this.length;
	}
	get bottom() {
		return this.top + this.height;
	}
	get widget() {
		return this._content instanceof Sn ? this._content.widget : null;
	}
	get widgetLineBreaks() {
		return typeof this._content == "number" ? this._content : 0;
	}
	join(t) {
		let n = (Array.isArray(this._content) ? this._content : [this]).concat(Array.isArray(t._content) ? t._content : [t]);
		return new e(this.from, this.length + t.length, this.top, this.height + t.height, n);
	}
}, B = /*@__PURE__*/ (function(e) {
	return e[e.ByPos = 0] = "ByPos", e[e.ByHeight = 1] = "ByHeight", e[e.ByPosNoHeight = 2] = "ByPosNoHeight", e;
})(B ||= {}), ro = .001, io = class e {
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
		this.height != e && (Math.abs(this.height - e) > ro && (Qa = !0), this.height = e);
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
			let { fromA: s, toA: c, fromB: l, toB: u } = r[o], d = i.lineAt(s, B.ByPosNoHeight, n.setDoc(t), 0, 0), f = d.to >= c ? d : i.lineAt(c, B.ByPosNoHeight, n, 0, 0);
			for (u += f.to - c, c = f.to; o > 0 && d.from <= r[o - 1].toA;) s = r[o - 1].fromA, l = r[o - 1].fromB, o--, s < d.from && (d = i.lineAt(s, B.ByPosNoHeight, n, 0, 0));
			l += d.from - s, s = d.from;
			let p = mo.build(n.setDoc(a), e, l, u);
			i = ao(i, i.replace(s, c, p));
		}
		return i.updateHeight(n, 0);
	}
	static empty() {
		return new co(0, 0, 0);
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
		return t[n - 1] == null ? (o = 1, n--) : t[n] ?? (o = 1, r++), new uo(e.of(t.slice(0, n)), o, e.of(t.slice(r)));
	}
};
function ao(e, t) {
	return e == t ? e : (e.constructor != t.constructor && (Qa = !0), t);
}
io.prototype.size = 1;
var oo = /*@__PURE__*/ P.replace({}), so = class extends io {
	constructor(e, t, n) {
		super(e, t), this.deco = n, this.spaceAbove = 0;
	}
	mainBlock(e, t) {
		return new no(t, this.length, e + this.spaceAbove, this.height - this.spaceAbove, this.deco || 0);
	}
	blockAt(e, t, n, r) {
		return this.spaceAbove && e < n + this.spaceAbove ? new no(r, 0, n, this.spaceAbove, oo) : this.mainBlock(n, r);
	}
	lineAt(e, t, n, r, i) {
		let a = this.mainBlock(r, i);
		return this.spaceAbove ? this.blockAt(0, n, r, i).join(a) : a;
	}
	forEachLine(e, t, n, r, i, a) {
		e <= i + this.length && t >= i && a(this.lineAt(0, B.ByPos, n, r, i));
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
}, co = class e extends so {
	constructor(e, t, n) {
		super(e, t, null), this.collapsed = 0, this.widgetHeight = 0, this.breaks = 0, this.spaceAbove = n;
	}
	mainBlock(e, t) {
		return new no(t, this.length, e + this.spaceAbove, this.height - this.spaceAbove, this.breaks);
	}
	replace(t, n, r) {
		let i = r[0];
		return r.length == 1 && (i instanceof e || i instanceof lo && i.flags & 4) && Math.abs(this.length - i.length) < 10 ? (i instanceof lo ? i = new e(i.length, this.height, this.spaceAbove) : i.height = this.height, this.outdated || (i.outdated = !1), i) : io.of(r);
	}
	updateHeight(e, t = 0, n = !1, r) {
		return r && r.from <= t && r.more ? this.setMeasuredHeight(r) : (n || this.outdated) && (this.spaceAbove = 0, this.setHeight(Math.max(this.widgetHeight, e.heightForLine(this.length - this.collapsed)) + this.breaks * e.lineHeight)), this.outdated = !1, this;
	}
	toString() {
		return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
	}
}, lo = class e extends io {
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
			return new no(a.from, a.length, l, c, 0);
		}
		{
			let r = Math.max(0, Math.min(a - i, Math.floor((e - n) / o))), { from: s, length: c } = t.doc.line(i + r);
			return new no(s, c, n + o * r, o, 0);
		}
	}
	lineAt(e, t, n, r, i) {
		if (t == B.ByHeight) return this.blockAt(e, n, r, i);
		if (t == B.ByPosNoHeight) {
			let { from: t, to: r } = n.doc.lineAt(e);
			return new no(t, r - t, 0, 0, 0);
		}
		let { firstLine: a, perLine: o, perChar: s } = this.heightMetrics(n, i), c = n.doc.lineAt(e), l = o + c.length * s, u = c.number - a, d = r + o * u + s * (c.from - i - u);
		return new no(c.from, c.length, Math.max(r, Math.min(d, r + this.height - l)), l, 0);
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
			a(new no(t.from, t.length, u, r, 0)), u += r, l = t.to + 1;
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
		return io.of(r);
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
				n < 0 && (a = -n, n = i.heights[i.index++]), s == -1 ? s = n : Math.abs(n - s) >= ro && (s = -2);
				let c = new co(e, n, a);
				c.outdated = !1, r.push(c), o += e + 1;
			}
			o <= a && r.push(null, new e(a - o).updateHeight(t, o));
			let c = io.of(r);
			return (s < 0 || Math.abs(c.height - this.height) >= ro || Math.abs(s - this.heightMetrics(t, n).perLine) >= ro) && (Qa = !0), ao(this, c);
		}
		return (r || this.outdated) && (this.setHeight(t.heightForGap(n, n + this.length)), this.outdated = !1), this;
	}
	toString() {
		return `gap(${this.length})`;
	}
}, uo = class extends io {
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
		let a = r + this.left.height, o = i + this.left.length + this.break, s = t == B.ByHeight ? e < a : e < o, c = s ? this.left.lineAt(e, t, n, r, i) : this.right.lineAt(e, t, n, a, o);
		if (this.break || (s ? c.to < o : c.from > o)) return c;
		let l = t == B.ByPosNoHeight ? B.ByPosNoHeight : B.ByPos;
		return s ? c.join(this.right.lineAt(o, l, n, a, o)) : this.left.lineAt(o, l, n, r, i).join(c);
	}
	forEachLine(e, t, n, r, i, a) {
		let o = r + this.left.height, s = i + this.left.length + this.break;
		if (this.break) e < s && this.left.forEachLine(e, t, n, r, i, a), t >= s && this.right.forEachLine(e, t, n, o, s, a);
		else {
			let c = this.lineAt(s, B.ByPos, n, r, i);
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
		if (e > 0 && fo(i, a - 1), t < this.length) {
			let e = i.length;
			this.decomposeRight(t, i), fo(i, e);
		}
		return io.of(i);
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
		return e.size > 2 * t.size || t.size > 2 * e.size ? io.of(this.break ? [
			e,
			null,
			t
		] : [e, t]) : (this.left = ao(this.left, e), this.right = ao(this.right, t), this.setHeight(e.height + t.height), this.outdated = e.outdated || t.outdated, this.size = e.size + t.size, this.length = e.length + this.break + t.length, this);
	}
	updateHeight(e, t = 0, n = !1, r) {
		let { left: i, right: a } = this, o = t + i.length + this.break, s = null;
		return r && r.from <= t + i.length && r.more ? s = i = i.updateHeight(e, t, n, r) : i.updateHeight(e, t, n), r && r.from <= o + a.length && r.more ? s = a = a.updateHeight(e, o, n, r) : a.updateHeight(e, o, n), s ? this.balanced(i, a) : (this.height = this.left.height + this.right.height, this.outdated = !1, this);
	}
	toString() {
		return this.left + (this.break ? " " : "-") + this.right;
	}
};
function fo(e, t) {
	let n, r;
	e[t] == null && (n = e[t - 1]) instanceof lo && (r = e[t + 1]) instanceof lo && e.splice(t - 1, 3, new lo(n.length + 1 + r.length));
}
var po = 5, mo = class e {
	constructor(e, t) {
		this.pos = e, this.oracle = t, this.nodes = [], this.lineStart = -1, this.lineEnd = -1, this.covering = null, this.writtenTo = e;
	}
	get isCovered() {
		return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
	}
	span(e, t) {
		if (this.lineStart > -1) {
			let e = Math.min(t, this.lineEnd), n = this.nodes[this.nodes.length - 1];
			n instanceof co ? n.length += e - this.pos : (e > this.pos || !this.isCovered) && this.nodes.push(new co(e - this.pos, -1, 0)), this.writtenTo = e, t > e && (this.nodes.push(null), this.writtenTo++, this.lineStart = -1);
		}
		this.pos = t;
	}
	point(e, t, n) {
		if (e < t || n.heightRelevant) {
			let r = n.widget ? n.widget.estimatedHeight : 0, i = n.widget ? n.widget.lineBreaks : 0;
			r < 0 && (r = this.oracle.lineHeight);
			let a = t - e;
			n.block ? this.addBlock(new so(a, r, n)) : (a || i || r >= po) && this.addLineDeco(r, i, a);
		} else t > e && this.span(e, t);
		this.lineEnd > -1 && this.lineEnd < this.pos && (this.lineEnd = this.oracle.doc.lineAt(this.pos).to);
	}
	enterLine() {
		if (this.lineStart > -1) return;
		let { from: e, to: t } = this.oracle.doc.lineAt(this.pos);
		this.lineStart = e, this.lineEnd = t, this.writtenTo < e && ((this.writtenTo < e - 1 || this.nodes[this.nodes.length - 1] == null) && this.nodes.push(this.blankContent(this.writtenTo, e - 1)), this.nodes.push(null)), this.pos > e && this.nodes.push(new co(this.pos - e, -1, 0)), this.writtenTo = this.pos;
	}
	blankContent(e, t) {
		let n = new lo(t - e);
		return this.oracle.doc.lineAt(e).to == t && (n.flags |= 4), n;
	}
	ensureLine() {
		this.enterLine();
		let e = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
		if (e instanceof co) return e;
		let t = new co(0, -1, 0);
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
		this.lineStart > -1 && !(t instanceof co) && !this.isCovered ? this.nodes.push(new co(0, -1, 0)) : (this.writtenTo < this.pos || t == null) && this.nodes.push(this.blankContent(this.writtenTo, this.pos));
		let n = e;
		for (let e of this.nodes) e instanceof co && e.updateHeight(this.oracle, n), n += e ? e.length : 1;
		return this.nodes;
	}
	static build(t, n, r, i) {
		let a = new e(r, t);
		return O.spans(n, r, i, a, 0), a.finish(r);
	}
};
function ho(e, t, n) {
	let r = new go();
	return O.compare(e, t, n, r, 0), r.changes;
}
var go = class {
	constructor() {
		this.changes = [];
	}
	compareRange() {}
	comparePoint(e, t, n, r) {
		(e < t || n && n.heightRelevant || r && r.heightRelevant) && Tn(e, t, this.changes, 5);
	}
};
function _o(e, t) {
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
function vo(e) {
	let t = e.getBoundingClientRect(), n = e.ownerDocument.defaultView || window;
	return t.left < n.innerWidth && t.right > 0 && t.top < n.innerHeight && t.bottom > 0;
}
function yo(e, t) {
	let n = e.getBoundingClientRect();
	return {
		left: 0,
		right: n.right - n.left,
		top: t,
		bottom: n.bottom - (n.top + t)
	};
}
var bo = class {
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
		return P.replace({ widget: new xo(this.displaySize * (t ? e.scaleY : e.scaleX), t) }).range(this.from, this.to);
	}
}, xo = class extends yn {
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
}, So = class {
	constructor(e, t) {
		this.view = e, this.state = t, this.pixelViewport = {
			left: 0,
			right: window.innerWidth,
			top: 0,
			bottom: 0
		}, this.inView = !0, this.paddingTop = 0, this.paddingBottom = 0, this.contentDOMWidth = 0, this.contentDOMHeight = 0, this.editorHeight = 0, this.editorWidth = 0, this.scaleX = 1, this.scaleY = 1, this.scrollOffset = 0, this.scrolledToBottom = !1, this.scrollAnchorPos = 0, this.scrollAnchorHeight = -1, this.scaler = Oo, this.scrollTarget = null, this.printing = !1, this.mustMeasureContent = !0, this.defaultTextDirection = F.LTR, this.visibleRanges = [], this.mustEnforceCursorAssoc = !1;
		let n = t.facet(Ur).some((e) => typeof e != "function" && e.class == "cm-lineWrapping");
		this.heightOracle = new eo(n), this.stateDeco = ko(t), this.heightMap = io.empty().applyChanges(this.stateDeco, b.empty, this.heightOracle.setDoc(t.doc), [new $r(0, 0, 0, t.doc.length)]);
		for (let e = 0; e < 2 && (this.viewport = this.getViewport(0, null), this.updateForViewport()); e++);
		this.updateViewportLines(), this.lineGaps = this.ensureLineGaps([]), this.lineGapDeco = P.set(this.lineGaps.map((e) => e.draw(this, !1))), this.scrollParent = e.scrollDOM, this.computeVisibleRanges();
	}
	updateForViewport() {
		let e = [this.viewport], { main: t } = this.state.selection;
		for (let n = 0; n <= 1; n++) {
			let r = n ? t.head : t.anchor;
			if (!e.some(({ from: e, to: t }) => r >= e && r <= t)) {
				let { from: t, to: n } = this.lineBlockAt(r);
				e.push(new Co(t, n));
			}
		}
		return this.viewports = e.sort((e, t) => e.from - t.from), this.updateScaler();
	}
	updateScaler() {
		let e = this.scaler;
		return this.scaler = this.heightMap.height <= 7e6 ? Oo : new Ao(this.heightOracle, this.heightMap, this.viewports), e.eq(this.scaler) ? 0 : 2;
	}
	updateViewportLines() {
		this.viewportLines = [], this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.heightOracle.setDoc(this.state.doc), 0, 0, (e) => {
			this.viewportLines.push(jo(e, this.scaler));
		});
	}
	update(e, t = null) {
		this.state = e.state;
		let n = this.stateDeco;
		this.stateDeco = ko(this.state);
		let r = e.changedRanges, i = $r.extendWithRanges(r, ho(n, this.stateDeco, e ? e.changes : De.empty(this.state.doc.length))), a = this.heightMap.height, o = this.scrolledToBottom ? null : this.scrollAnchorAt(this.scrollOffset);
		$a(), this.heightMap = this.heightMap.applyChanges(this.stateDeco, e.startState.doc, this.heightOracle.setDoc(this.state.doc), i), (this.heightMap.height != a || Qa) && (e.flags |= 2), o ? (this.scrollAnchorPos = e.changes.mapPos(o.from, -1), this.scrollAnchorHeight = o.top) : (this.scrollAnchorPos = -1, this.scrollAnchorHeight = a);
		let s = i.length ? this.mapViewport(this.viewport, e.changes) : this.viewport;
		(t && (t.range.head < s.from || t.range.head > s.to) || !this.viewportIsAppropriate(s)) && (s = this.getViewport(0, t));
		let c = s.from != this.viewport.from || s.to != this.viewport.to;
		this.viewport = s, e.flags |= this.updateForViewport(), (c || !e.changes.empty || e.flags & 2) && this.updateViewportLines(), (this.lineGaps.length || this.viewport.to - this.viewport.from > 4e3) && this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, e.changes))), e.flags |= this.computeVisibleRanges(e.changes), t && (this.scrollTarget = t), !this.mustEnforceCursorAssoc && (e.selectionSet || e.focusChanged) && e.view.lineWrapping && e.state.selection.main.empty && e.state.selection.main.assoc && !e.state.facet(Mr) && (this.mustEnforceCursorAssoc = !0);
	}
	measure() {
		let { view: e } = this, t = e.contentDOM, n = window.getComputedStyle(t), r = this.heightOracle, i = n.whiteSpace;
		this.defaultTextDirection = n.direction == "rtl" ? F.RTL : F.LTR;
		let a = this.heightOracle.mustRefreshForWrapping(i) || this.mustMeasureContent === "refresh", o = t.getBoundingClientRect(), s = a || this.mustMeasureContent || this.contentDOMHeight != o.height;
		this.contentDOMHeight = o.height, this.mustMeasureContent = !1;
		let c = 0, l = 0;
		if (o.width && o.height) {
			let { scaleX: e, scaleY: n } = Rn(t, o);
			(e > .005 && Math.abs(this.scaleX - e) > .005 || n > .005 && Math.abs(this.scaleY - n) > .005) && (this.scaleX = e, this.scaleY = n, c |= 16, a = s = !0);
		}
		let u = (parseInt(n.paddingTop) || 0) * this.scaleY, d = (parseInt(n.paddingBottom) || 0) * this.scaleY;
		(this.paddingTop != u || this.paddingBottom != d) && (this.paddingTop = u, this.paddingBottom = d, c |= 18), this.editorWidth != e.scrollDOM.clientWidth && (r.lineWrapping && (s = !0), this.editorWidth = e.scrollDOM.clientWidth, c |= 16);
		let f = Bn(this.view.contentDOM, !1).y;
		f != this.scrollParent && (this.scrollParent = f, this.scrollAnchorHeight = -1, this.scrollOffset = 0);
		let p = this.getScrollOffset();
		this.scrollOffset != p && (this.scrollAnchorHeight = -1, this.scrollOffset = p), this.scrolledToBottom = Zn(this.scrollParent || e.win);
		let m = (this.printing ? yo : _o)(t, this.paddingTop), h = m.top - this.pixelViewport.top, g = m.bottom - this.pixelViewport.bottom;
		this.pixelViewport = m;
		let _ = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
		if (_ != this.inView && (this.inView = _, _ && (s = !0)), !this.inView && !this.scrollTarget && !vo(e.dom)) return 0;
		let v = o.width;
		if ((this.contentDOMWidth != v || this.editorHeight != e.scrollDOM.clientHeight) && (this.contentDOMWidth = o.width, this.editorHeight = e.scrollDOM.clientHeight, c |= 16), s) {
			let t = e.docView.measureVisibleLineHeights(this.viewport);
			if (r.mustRefreshForHeights(t) && (a = !0), a || r.lineWrapping && Math.abs(v - this.contentDOMWidth) > r.charWidth) {
				let { lineHeight: n, charWidth: o, textHeight: s } = e.docView.measureTextSize();
				a = n > 0 && r.refresh(i, n, o, s, Math.max(5, v / o), t), a && (e.docView.minWidth = 0, c |= 16);
			}
			h > 0 && g > 0 ? l = Math.max(h, g) : h < 0 && g < 0 && (l = Math.min(h, g)), $a();
			for (let n of this.viewports) {
				let i = n.from == this.viewport.from ? t : e.docView.measureVisibleLineHeights(n);
				this.heightMap = (a ? io.empty().applyChanges(this.stateDeco, b.empty, this.heightOracle, [new $r(0, 0, 0, e.state.doc.length)]) : this.heightMap).updateHeight(r, 0, a, new to(n.from, i));
			}
			Qa && (c |= 2);
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
		let n = .5 - Math.max(-.5, Math.min(.5, e / 1e3 / 2)), r = this.heightMap, i = this.heightOracle, { visibleTop: a, visibleBottom: o } = this, s = new Co(r.lineAt(a - n * 1e3, B.ByHeight, i, 0, 0).from, r.lineAt(o + (1 - n) * 1e3, B.ByHeight, i, 0, 0).to);
		if (t) {
			let { head: e } = t.range;
			if (e < s.from || e > s.to) {
				let n = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top), a = r.lineAt(e, B.ByPos, i, 0, 0), o;
				o = t.y == "center" ? (a.top + a.bottom) / 2 - n / 2 : t.y == "start" || t.y == "nearest" && e < s.from ? a.top : a.bottom - n, s = new Co(r.lineAt(o - 500, B.ByHeight, i, 0, 0).from, r.lineAt(o + n + 500, B.ByHeight, i, 0, 0).to);
			}
		}
		return s;
	}
	mapViewport(e, t) {
		let n = t.mapPos(e.from, -1), r = t.mapPos(e.to, 1);
		return new Co(this.heightMap.lineAt(n, B.ByPos, this.heightOracle, 0, 0).from, this.heightMap.lineAt(r, B.ByPos, this.heightOracle, 0, 0).to);
	}
	viewportIsAppropriate({ from: e, to: t }, n = 0) {
		if (!this.inView) return !0;
		let { top: r } = this.heightMap.lineAt(e, B.ByPos, this.heightOracle, 0, 0), { bottom: i } = this.heightMap.lineAt(t, B.ByPos, this.heightOracle, 0, 0), { visibleTop: a, visibleBottom: o } = this;
		return (e == 0 || r <= a - Math.max(10, Math.min(-n, 250))) && (t == this.state.doc.length || i >= o + Math.max(10, Math.min(n, 250))) && r > a - 2e3 && i < o + 2e3;
	}
	mapLineGaps(e, t) {
		if (!e.length || t.empty) return e;
		let n = [];
		for (let r of e) t.touchesRange(r.from, r.to) || n.push(new bo(t.mapPos(r.from), t.mapPos(r.to), r.size, r.displaySize));
		return n;
	}
	ensureLineGaps(e, t) {
		let n = this.heightOracle.lineWrapping, r = n ? 1e4 : 2e3, i = r >> 1, a = r << 1;
		if (this.defaultTextDirection != F.LTR && !n) return [];
		let o = [], s = (r, a, c, l) => {
			if (a - r < i) return;
			let u = this.state.selection.main, d = [u.from];
			u.empty || d.push(u.to);
			for (let e of d) if (e > r && e < a) {
				s(r, e - 10, c, l), s(e + 10, a, c, l);
				return;
			}
			let f = Do(e, (e) => e.from >= c.from && e.to <= c.to && Math.abs(e.from - r) < i && Math.abs(e.to - a) < i && !d.some((t) => e.from < t && e.to > t));
			if (!f) {
				if (a < c.to && t && n && t.visibleRanges.some((e) => e.from <= a && e.to >= a)) {
					let e = t.moveToLineBoundary(C.cursor(a), !1, !0).head;
					e > r && (a = e);
				}
				let e = this.gapSize(c, r, a, l);
				f = new bo(r, a, e, n || e < 2e6 ? e : 2e6);
			}
			o.push(f);
		}, c = (t) => {
			if (t.length < a || t.type != N.Text) return;
			let i = wo(t.from, t.to, this.stateDeco);
			if (i.total < a) return;
			let o = this.scrollTarget ? this.scrollTarget.range.head : null, c, l;
			if (n) {
				let e = r / this.heightOracle.lineLength * this.heightOracle.lineHeight, n, a;
				if (o != null) {
					let r = Eo(i, o), s = ((this.visibleBottom - this.visibleTop) / 2 + e) / t.height;
					n = r - s, a = r + s;
				} else n = (this.visibleTop - t.top - e) / t.height, a = (this.visibleBottom - t.top + e) / t.height;
				c = To(i, n), l = To(i, a);
			} else {
				let n = i.total * this.heightOracle.charWidth, a = r * this.heightOracle.charWidth, s = 0;
				if (n > 2e6) for (let n of e) n.from >= t.from && n.from < t.to && n.size != n.displaySize && n.from * this.heightOracle.charWidth + s < this.pixelViewport.left && (s = n.size - n.displaySize);
				let u = this.pixelViewport.left + s, d = this.pixelViewport.right + s, f, p;
				if (o != null) {
					let e = Eo(i, o), t = ((d - u) / 2 + a) / n;
					f = e - t, p = e + t;
				} else f = (u - a) / n, p = (d + a) / n;
				c = To(i, f), l = To(i, p);
			}
			c > t.from && s(t.from, c, t, i), l < t.to && s(l, t.to, t, i);
		};
		for (let e of this.viewportLines) Array.isArray(e.type) ? e.type.forEach(c) : c(e);
		return o;
	}
	gapSize(e, t, n, r) {
		let i = Eo(r, n) - Eo(r, t);
		return this.heightOracle.lineWrapping ? e.height * i : r.total * this.heightOracle.charWidth * i;
	}
	updateLineGaps(e) {
		bo.same(e, this.lineGaps) || (this.lineGaps = e, this.lineGapDeco = P.set(e.map((e) => e.draw(this, this.heightOracle.lineWrapping))));
	}
	computeVisibleRanges(e) {
		let t = this.stateDeco;
		this.lineGaps.length && (t = t.concat(this.lineGapDeco));
		let n = [];
		O.spans(t, this.viewport.from, this.viewport.to, {
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
		return e >= this.viewport.from && e <= this.viewport.to && this.viewportLines.find((t) => t.from <= e && t.to >= e) || jo(this.heightMap.lineAt(e, B.ByPos, this.heightOracle, 0, 0), this.scaler);
	}
	lineBlockAtHeight(e) {
		return e >= this.viewportLines[0].top && e <= this.viewportLines[this.viewportLines.length - 1].bottom && this.viewportLines.find((t) => t.top <= e && t.bottom >= e) || jo(this.heightMap.lineAt(this.scaler.fromDOM(e), B.ByHeight, this.heightOracle, 0, 0), this.scaler);
	}
	getScrollOffset() {
		return (this.scrollParent == this.view.scrollDOM ? this.scrollParent.scrollTop : (this.scrollParent ? this.scrollParent.getBoundingClientRect().top : 0) - this.view.contentDOM.getBoundingClientRect().top) * this.scaleY;
	}
	scrollAnchorAt(e) {
		let t = this.lineBlockAtHeight(e + 8);
		return t.from >= this.viewport.from || this.viewportLines[0].top - e > 200 ? t : this.viewportLines[0];
	}
	elementAtHeight(e) {
		return jo(this.heightMap.blockAt(this.scaler.fromDOM(e), this.heightOracle, 0, 0), this.scaler);
	}
	get docHeight() {
		return this.scaler.toDOM(this.heightMap.height);
	}
	get contentHeight() {
		return this.docHeight + this.paddingTop + this.paddingBottom;
	}
}, Co = class {
	constructor(e, t) {
		this.from = e, this.to = t;
	}
};
function wo(e, t, n) {
	let r = [], i = e, a = 0;
	return O.spans(n, e, t, {
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
function To({ total: e, ranges: t }, n) {
	if (n <= 0) return t[0].from;
	if (n >= 1) return t[t.length - 1].to;
	let r = Math.floor(e * n);
	for (let e = 0;; e++) {
		let { from: n, to: i } = t[e], a = i - n;
		if (r <= a) return n + r;
		r -= a;
	}
}
function Eo(e, t) {
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
function Do(e, t) {
	for (let n of e) if (t(n)) return n;
}
var Oo = {
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
function ko(e) {
	let t = e.facet(Wr).filter((e) => typeof e != "function"), n = e.facet(Kr).filter((e) => typeof e != "function");
	return n.length && t.push(O.join(n)), t;
}
var Ao = class e {
	constructor(e, t, n) {
		let r = 0, i = 0, a = 0;
		this.viewports = n.map(({ from: n, to: i }) => {
			let a = t.lineAt(n, B.ByPos, e, 0, 0).top, o = t.lineAt(i, B.ByPos, e, 0, 0).bottom;
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
function jo(e, t) {
	if (t.scale == 1) return e;
	let n = t.toDOM(e.top), r = t.toDOM(e.bottom);
	return new no(e.from, e.length, n, r - n, Array.isArray(e._content) ? e._content.map((e) => jo(e, t)) : e._content);
}
var Mo = /*@__PURE__*/ w.define({ combine: (e) => e.join(" ") }), No = /*@__PURE__*/ w.define({ combine: (e) => e.indexOf(!0) > -1 }), Po = /*@__PURE__*/ Kt.newName(), Fo = /*@__PURE__*/ Kt.newName(), Io = /*@__PURE__*/ Kt.newName(), Lo = {
	"&light": "." + Fo,
	"&dark": "." + Io
};
function Ro(e, t, n) {
	return new Kt(t, { finish(t) {
		return /&/.test(t) ? t.replace(/&\w*/, (t) => {
			if (t == "&") return e;
			if (!n || !n[t]) throw RangeError(`Unsupported selector: ${t}`);
			return n[t];
		}) : e + " " + t;
	} });
}
var zo = /*@__PURE__*/ Ro("." + Po, {
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
}, Lo), Bo = {
	childList: !0,
	characterData: !0,
	subtree: !0,
	attributes: !0,
	characterDataOldValue: !0
}, Vo = M.ie && M.ie_version <= 11, Ho = class {
	constructor(e) {
		this.view = e, this.active = !1, this.editContext = null, this.selectionRange = new Vn(), this.selectionChanged = !1, this.delayedFlush = -1, this.resizeTimeout = -1, this.queue = [], this.delayedAndroidKey = null, this.flushingAndroidKey = -1, this.lastChange = 0, this.scrollTargets = [], this.intersection = null, this.resizeScroll = null, this.intersecting = !1, this.gapIntersection = null, this.gaps = [], this.printQuery = null, this.parentCheck = -1, this.dom = e.contentDOM, this.observer = new MutationObserver((t) => {
			for (let e of t) this.queue.push(e);
			(M.ie && M.ie_version <= 11 || M.ios && e.composing) && t.some((e) => e.type == "childList" && e.removedNodes.length || e.type == "characterData" && e.oldValue.length > e.target.nodeValue.length) ? this.flushSoon() : this.flush();
		}), window.EditContext && M.android && e.constructor.EDIT_CONTEXT !== !1 && !(M.chrome && M.chrome_version < 126) && (this.editContext = new Ko(e), e.state.facet(Rr) && (e.contentDOM.editContext = this.editContext.editContext)), Vo && (this.onCharData = (e) => {
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
		if (n.state.facet(Rr) ? n.root.activeElement != this.dom : !kn(this.dom, r)) return;
		let i = r.anchorNode && n.docView.tile.nearest(r.anchorNode);
		if (i && i.isWidget() && i.widget.ignoreEvent(e)) {
			t || (this.selectionChanged = !1);
			return;
		}
		(M.ie && M.ie_version <= 11 || M.android && M.chrome) && !n.state.selection.main.empty && r.focusNode && jn(r.focusNode, r.focusOffset, r.anchorNode, r.anchorOffset) ? this.flushSoon() : this.flush(!1);
	}
	readSelectionRange() {
		let { view: e } = this, t = Dn(e.root);
		if (!t) return !1;
		let n = M.safari && e.root.nodeType == 11 && e.root.activeElement == this.dom && Go(this.view, t) || t;
		if (!n || this.selectionRange.eq(n)) return !1;
		let r = kn(this.dom, n);
		return r && !this.selectionChanged && e.inputState.lastFocusTime > Date.now() - 200 && e.inputState.lastTouchTime < Date.now() - 300 && Xn(this.dom, n) ? (this.view.inputState.lastFocusTime = 0, e.docView.updateSelection(), !1) : (this.selectionRange.setRange(n), r && (this.selectionChanged = !0), !0);
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
		this.active ||= (this.observer.observe(this.dom, Bo), Vo && this.dom.addEventListener("DOMCharacterDataModified", this.onCharData), !0);
	}
	stop() {
		this.active && (this.active = !1, this.observer.disconnect(), Vo && this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData));
	}
	clear() {
		this.processRecords(), this.queue.length = 0, this.selectionChanged = !1;
	}
	delayAndroidKey(e, t) {
		if (!this.delayedAndroidKey) {
			let e = () => {
				let e = this.delayedAndroidKey;
				e && (this.clearDelayedAndroidKey(), this.view.inputState.lastKeyCode = e.keyCode, this.view.inputState.lastKeyTime = Date.now(), !this.flush() && e.force && Jn(this.dom, e.key, e.keyCode));
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
		let { from: e, to: t, typeOver: n } = this.processRecords(), r = this.selectionChanged && kn(this.dom, this.selectionRange);
		if (e < 0 && !r) return null;
		e > -1 && (this.lastChange = Date.now()), this.view.inputState.lastFocusTime = 0, this.selectionChanged = !1;
		let i = new aa(this.view, e, t, n);
		return this.view.docView.domChanged = { newSel: i.newSel ? i.newSel.main : null }, i;
	}
	flush(e = !0) {
		if (this.delayedFlush >= 0 || this.delayedAndroidKey) return !1;
		e && this.readSelectionRange();
		let t = this.readChange();
		if (!t) return this.view.requestMeasure(), !1;
		let n = this.view.state, r = sa(this.view, t);
		return this.view.state == n && (t.domChanged || t.newSel && !pa(this.view.state.selection, t.newSel.main)) && this.view.update([]), r;
	}
	readMutation(e) {
		let t = this.view.docView.tile.nearest(e.target);
		if (!t || t.isWidget()) return null;
		if (t.markDirty(e.type == "attributes"), e.type == "childList") {
			let n = Uo(t, e.previousSibling || e.target.previousSibling, -1), r = Uo(t, e.nextSibling || e.target.nextSibling, 1);
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
		this.editContext && (this.editContext.update(e), e.startState.facet(Rr) != e.state.facet(Rr) && (e.view.contentDOM.editContext = e.state.facet(Rr) ? this.editContext.editContext : null));
	}
	destroy() {
		var e, t, n;
		this.stop(), (e = this.intersection) == null || e.disconnect(), (t = this.gapIntersection) == null || t.disconnect(), (n = this.resizeScroll) == null || n.disconnect();
		for (let e of this.scrollTargets) e.removeEventListener("scroll", this.onScroll);
		this.removeWindowListeners(this.win), clearTimeout(this.parentCheck), clearTimeout(this.resizeTimeout), this.win.cancelAnimationFrame(this.delayedFlush), this.win.cancelAnimationFrame(this.flushingAndroidKey), this.editContext && (this.view.contentDOM.editContext = null, this.editContext.destroy());
	}
};
function Uo(e, t, n) {
	for (; t;) {
		let r = R.get(t);
		if (r && r.parent == e) return r;
		let i = t.parentNode;
		t = i == e.dom ? n > 0 ? t.nextSibling : t.previousSibling : i;
	}
	return null;
}
function Wo(e, t) {
	let n = t.startContainer, r = t.startOffset, i = t.endContainer, a = t.endOffset, o = e.docView.domAtPos(e.state.selection.main.anchor, 1);
	return jn(o.node, o.offset, i, a) && ([n, r, i, a] = [
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
function Go(e, t) {
	if (t.getComposedRanges) {
		let n = t.getComposedRanges(e.root)[0];
		if (n) return Wo(e, n);
	}
	let n = null;
	function r(e) {
		e.preventDefault(), e.stopImmediatePropagation(), n = e.getTargetRanges()[0];
	}
	return e.contentDOM.addEventListener("beforeinput", r, !0), e.dom.ownerDocument.execCommand("indent"), e.contentDOM.removeEventListener("beforeinput", r, !0), n ? Wo(e, n) : null;
}
var Ko = class {
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
			let l = ua(e.state.sliceDoc(o, s), n.text, (c ? r.from : r.to) - o, c ? "end" : null);
			if (!l) {
				let t = C.single(this.toEditorPos(n.selectionStart), this.toEditorPos(n.selectionEnd));
				pa(t, r) || e.dispatch({
					selection: t,
					userEvent: "select"
				});
				return;
			}
			let u = {
				from: l.from + o,
				to: l.toA + o,
				insert: b.of(n.text.slice(l.from, l.toB).split("\n"))
			};
			if ((M.mac || M.android) && u.from == a - 1 && /^\. ?$/.test(n.text) && e.contentDOM.getAttribute("autocorrect") == "off" && (u = {
				from: o,
				to: s,
				insert: b.of([n.text.replace(".", " ")])
			}), this.pendingContextChange = u, !e.state.readOnly) {
				let t = this.to - this.from + (u.to - u.from + u.insert.length);
				ca(e, u, C.single(this.toEditorPos(n.selectionStart, t), this.toEditorPos(n.selectionEnd, t)));
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
						n.push(P.mark({ attributes: { style: e } }).range(i, a));
					}
				}
			}
			e.dispatch({ effects: Ir.of(P.set(n)) });
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
			let t = Dn(e.root);
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
}, V = class e {
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
		this.dispatchTransactions = e.dispatchTransactions || t && ((e) => e.forEach((e) => t(e, this))) || ((e) => this.update(e)), this.dispatch = this.dispatch.bind(this), this._root = e.root || Yn(e.parent) || document, this.viewState = new So(this, e.state || D.create(e)), e.scrollTo && e.scrollTo.is(Fr) && (this.viewState.scrollTarget = e.scrollTo.value.clip(this.viewState.state)), this.plugins = this.state.facet(Br).map((e) => new Vr(e));
		for (let e of this.plugins) e.update(this);
		this.observer = new Ho(this), this.inputState = new ma(this), this.inputState.ensureHandlers(this.plugins), this.docView = new Oi(this), this.mountStyles(), this.updateAttrs(), this.updateState = 0, this.requestMeasure(), document.fonts?.ready && document.fonts.ready.then(() => {
			this.viewState.mustMeasureContent = "refresh", this.requestMeasure();
		});
	}
	dispatch(...e) {
		let t = e.length == 1 && e[0] instanceof lt ? e : e.length == 1 && Array.isArray(e[0]) ? e[0] : [this.state.update(...e)];
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
		t.some((e) => e.annotation(Ka)) ? (this.inputState.notifiedFocused = o, s = 1) : o != this.inputState.notifiedFocused && (this.inputState.notifiedFocused = o, c = qa(a, o), c || (s = 1));
		let l = this.observer.delayedAndroidKey, u = null;
		if (l ? (this.observer.clearDelayedAndroidKey(), u = this.observer.readChange(), (u && !this.state.doc.eq(a.doc) || !this.state.selection.eq(a.selection)) && (u = null)) : this.observer.clear(), a.facet(D.phrases) != this.state.facet(D.phrases)) return this.setState(a);
		i = ei.create(this, a, t), i.flags |= s;
		let d = this.viewState.scrollTarget;
		try {
			this.updateState = 2;
			for (let n of t) {
				if (d &&= d.map(n.changes), n.scrollIntoView) {
					let { main: t } = n.state.selection, { x: r, y: i } = this.state.facet(e.cursorScrollMargin);
					d = new Pr(t.empty ? t : C.cursor(t.head, t.head > t.anchor ? -1 : 1), "nearest", "nearest", i, r);
				}
				for (let e of n.effects) e.is(Fr) && (d = e.value.clip(this.state));
			}
			this.viewState.update(i, d), this.bidiCache = Yo.update(this.bidiCache, i.changes), i.empty || (this.updatePlugins(i), this.inputState.update(i)), n = this.docView.update(i), this.state.facet(Qr) != this.styleModules && this.mountStyles(), r = this.updateAttrs(), this.showAnnouncements(t), this.docView.updateSelection(n, t.some((e) => e.isUserEvent("select.pointer")));
		} finally {
			this.updateState = 0;
		}
		if (i.startState.facet(Mo) != i.state.facet(Mo) && (this.viewState.mustMeasureContent = !0), (n || r || d || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent) && this.requestMeasure(), n && this.docViewUpdate(), !i.empty) for (let e of this.state.facet(Er)) try {
			e(i);
		} catch (e) {
			Lr(this.state, e, "update listener");
		}
		(c || u) && Promise.resolve().then(() => {
			c && this.state == c.startState && this.dispatch(c), u && !sa(this, u) && l.force && Jn(this.contentDOM, l.key, l.keyCode);
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
			this.viewState = new So(this, e), this.plugins = e.facet(Br).map((e) => new Vr(e)), this.pluginMap.clear();
			for (let e of this.plugins) e.update(this);
			this.docView.destroy(), this.docView = new Oi(this), this.inputState.ensureHandlers(this.plugins), this.mountStyles(), this.updateAttrs(), this.bidiCache = [];
		} finally {
			this.updateState = 0;
		}
		t && this.focus(), this.requestMeasure();
	}
	updatePlugins(e) {
		let t = e.startState.facet(Br), n = e.state.facet(Br);
		if (t != n) {
			let r = [];
			for (let i of n) {
				let n = t.indexOf(i);
				if (n < 0) r.push(new Vr(i));
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
				Lr(this.state, e, "doc view update listener");
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
					if (Zn(n || this.win)) i = -1, a = this.viewState.heightMap.height;
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
						return Lr(this.state, e), Jo;
					}
				}), l = ei.create(this, this.state, []), u = !1;
				l.flags |= o, t ? t.flags |= o : t = l, this.updateState = 2, l.empty || (this.updatePlugins(l), this.inputState.update(l), this.updateAttrs(), u = this.docView.update(l), u && this.docViewUpdate());
				for (let e = 0; e < s.length; e++) if (c[e] != Jo) try {
					let t = s[e];
					t.write && t.write(c[e], this);
				} catch (e) {
					Lr(this.state, e);
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
		if (t && !t.empty) for (let e of this.state.facet(Er)) e(t);
	}
	get themeClasses() {
		return Po + " " + (this.state.facet(No) ? Io : Fo) + " " + this.state.facet(Mo);
	}
	updateAttrs() {
		let e = Xo(this, Hr, { class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses }), t = {
			spellcheck: "false",
			autocorrect: "off",
			autocapitalize: "off",
			writingsuggestions: "false",
			translate: "no",
			contenteditable: this.state.facet(Rr) ? "true" : "false",
			class: "cm-content",
			style: `${M.tabSize}: ${this.state.tabSize}`,
			role: "textbox",
			"aria-multiline": "true"
		};
		this.state.readOnly && (t["aria-readonly"] = "true"), Xo(this, Ur, t);
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
		this.styleModules = this.state.facet(Qr);
		let t = this.state.facet(e.cspNonce);
		Kt.mount(this.root, this.styleModules.concat(zo).reverse(), t ? { nonce: t } : void 0);
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
		return Xi(this, e, Gi(this, e, t, n));
	}
	moveByGroup(e, t) {
		return Xi(this, e, Gi(this, e, t, (t) => Ki(this, e.head, t)));
	}
	visualLineSide(e, t) {
		let n = this.bidiSpans(e), r = this.textDirectionAt(e.from), i = n[t ? n.length - 1 : 0];
		return C.cursor(i.side(t, r) + e.from, i.forward(!t, r) ? 1 : -1);
	}
	moveToLineBoundary(e, t, n = !0) {
		return Wi(this, e, t, n);
	}
	moveVertically(e, t, n) {
		return Xi(this, e, qi(this, e, t, n));
	}
	domAtPos(e, t = 1) {
		return this.docView.domAtPos(e, t);
	}
	posAtDOM(e, t = 0) {
		return this.docView.posFromDOM(e, t);
	}
	posAtCoords(e, t = !0) {
		this.readMeasured();
		let n = Qi(this, e, t);
		return n && n.pos;
	}
	posAndSideAtCoords(e, t = !0) {
		return this.readMeasured(), Qi(this, e, t);
	}
	coordsAtPos(e, t = 1) {
		this.readMeasured();
		let n = this.state.doc.lineAt(e), r = this.bidiSpans(n), i = r[ur.find(r, e - n.from, -1, t)];
		return this.docView.coordsAt(e, t, i.dir == F.RTL);
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
		return !this.state.facet(jr) || e < this.viewport.from || e > this.viewport.to ? this.textDirection : (this.readMeasured(), this.docView.textDirectionAt(e));
	}
	get lineWrapping() {
		return this.viewState.heightOracle.lineWrapping;
	}
	bidiSpans(e) {
		if (e.length > qo) return vr(e.length);
		let t = this.textDirectionAt(e.from), n;
		for (let r of this.bidiCache) if (r.from == e.from && r.dir == t && (r.fresh || dr(r.isolates, n = Yr(this, e)))) return r.order;
		n ||= Yr(this, e);
		let r = _r(e.text, t, n);
		return this.bidiCache.push(new Yo(e.from, e.to, t, n, !0, r)), r;
	}
	get hasFocus() {
		return (this.dom.ownerDocument.hasFocus() || M.safari && this.inputState?.lastContextMenu > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
	}
	focus() {
		this.observer.ignore(() => {
			Gn(this.contentDOM), this.docView.updateSelection();
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
		return Fr.of(new Pr(typeof e == "number" ? C.cursor(e) : e, t.y ?? "nearest", t.x ?? "nearest", t.yMargin ?? 5, t.xMargin ?? 5));
	}
	scrollSnapshot() {
		let { scrollTop: e, scrollLeft: t } = this.scrollDOM, n = this.viewState.scrollAnchorAt(e);
		return Fr.of(new Pr(C.cursor(n.from), "start", "start", n.top - e, t, !0));
	}
	setTabFocusMode(e) {
		e == null ? this.inputState.tabFocusMode = this.inputState.tabFocusMode < 0 ? 0 : -1 : typeof e == "boolean" ? this.inputState.tabFocusMode = e ? 0 : -1 : this.inputState.tabFocusMode != 0 && (this.inputState.tabFocusMode = Date.now() + e);
	}
	static domEventHandlers(e) {
		return L.define(() => ({}), { eventHandlers: e });
	}
	static domEventObservers(e) {
		return L.define(() => ({}), { eventObservers: e });
	}
	static theme(e, t) {
		let n = Kt.newName(), r = [Mo.of(n), Qr.of(Ro(`.${n}`, e))];
		return t && t.dark && r.push(No.of(!0)), r;
	}
	static baseTheme(e) {
		return Ge.lowest(Qr.of(Ro("." + Po, e, Lo)));
	}
	static findFromDOM(e) {
		let t = e.querySelector(".cm-content");
		return (t && R.get(t) || R.get(e))?.root?.view || null;
	}
};
V.styleModule = Qr, V.inputHandler = Dr, V.clipboardInputFilter = kr, V.clipboardOutputFilter = Ar, V.scrollHandler = Nr, V.focusChangeEffect = Or, V.perLineTextDirection = jr, V.exceptionSink = Tr, V.updateListener = Er, V.editable = Rr, V.mouseSelectionStyle = wr, V.dragMovesSelection = Cr, V.clickAddsSelectionRange = Sr, V.decorations = Wr, V.blockWrappers = Gr, V.outerDecorations = Kr, V.atomicRanges = qr, V.bidiIsolatedRanges = Jr, V.cursorScrollMargin = /*@__PURE__*/ w.define({ combine: (e) => {
	let t = 5, n = 5;
	for (let r of e) typeof r == "number" ? t = n = r : {x: t, y: n} = r;
	return {
		x: t,
		y: n
	};
} }), V.scrollMargins = Xr, V.darkTheme = No, V.cspNonce = /*@__PURE__*/ w.define({ combine: (e) => e.length ? e[0] : "" }), V.contentAttributes = Ur, V.editorAttributes = Hr, V.lineWrapping = /*@__PURE__*/ V.contentAttributes.of({ class: "cm-lineWrapping" }), V.announce = /*@__PURE__*/ T.define();
var qo = 4096, Jo = {}, Yo = class e {
	constructor(e, t, n, r, i, a) {
		this.from = e, this.to = t, this.dir = n, this.isolates = r, this.fresh = i, this.order = a;
	}
	static update(t, n) {
		if (n.empty && !t.some((e) => e.fresh)) return t;
		let r = [], i = t.length ? t[t.length - 1].dir : F.LTR;
		for (let a = Math.max(0, t.length - 10); a < t.length; a++) {
			let o = t[a];
			o.dir == i && !n.touchesRange(o.from, o.to) && r.push(new e(n.mapPos(o.from, 1), n.mapPos(o.to, -1), o.dir, o.isolates, !1, o.order));
		}
		return r;
	}
};
function Xo(e, t, n) {
	for (let r = e.state.facet(t), i = r.length - 1; i >= 0; i--) {
		let t = r[i], a = typeof t == "function" ? t(e) : t;
		a && pn(a, n);
	}
	return n;
}
var Zo = M.mac ? "mac" : M.windows ? "win" : M.linux ? "linux" : "key";
function Qo(e, t) {
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
function $o(e, t, n) {
	return t.altKey && (e = "Alt-" + e), t.ctrlKey && (e = "Ctrl-" + e), t.metaKey && (e = "Meta-" + e), n !== !1 && t.shiftKey && (e = "Shift-" + e), e;
}
var es = /*@__PURE__*/ Ge.default(/*@__PURE__*/ V.domEventHandlers({ keydown(e, t) {
	return ls(rs(t.state), e, t, "editor");
} })), ts = /*@__PURE__*/ w.define({ enables: es }), ns = /*@__PURE__*/ new WeakMap();
function rs(e) {
	let t = e.facet(ts), n = ns.get(t);
	return n || ns.set(t, n = ss(t.reduce((e, t) => e.concat(t), []))), n;
}
function is(e, t, n) {
	return ls(rs(e.state), t, e, n);
}
var as = null, os = 4e3;
function ss(e, t = Zo) {
	let n = Object.create(null), r = Object.create(null), i = (e, t) => {
		let n = r[e];
		if (n == null) r[e] = t;
		else if (n != t) throw Error("Key binding " + e + " is used both as a regular binding and as a multi-stroke prefix");
	}, a = (e, r, a, o, s) => {
		let c = n[e] || (n[e] = Object.create(null)), l = r.split(/ (?!$)/).map((e) => Qo(e, t));
		for (let t = 1; t < l.length; t++) {
			let n = l.slice(0, t).join(" ");
			i(n, !0), c[n] || (c[n] = {
				preventDefault: !0,
				stopPropagation: !1,
				run: [(t) => {
					let r = as = {
						view: t,
						prefix: n,
						scope: e
					};
					return setTimeout(() => {
						as == r && (as = null);
					}, os), !0;
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
			for (let t in e) e[t].run.push((e) => i(e, cs));
		}
		let i = r[t] || r.key;
		if (i) for (let t of e) a(t, i, r.run, r.preventDefault, r.stopPropagation), r.shift && a(t, "Shift-" + i, r.shift, r.preventDefault, r.stopPropagation);
	}
	return n;
}
var cs = null;
function ls(e, t, n, r) {
	cs = t;
	let i = en(t), a = Ce(xe(i, 0)) == i.length && i != " ", o = "", s = !1, c = !1, l = !1;
	as && as.view == n && as.scope == r && (o = as.prefix + " ", ba.indexOf(t.keyCode) < 0 && (c = !0, as = null));
	let u = /* @__PURE__ */ new Set(), d = (e) => {
		if (e) {
			for (let t of e.run) if (!u.has(t) && (u.add(t), t(n))) return e.stopPropagation && (l = !0), !0;
			e.preventDefault && (e.stopPropagation && (l = !0), c = !0);
		}
		return !1;
	}, f = e[r], p, m;
	return f && (d(f[o + $o(i, t, !a)]) ? s = !0 : a && (t.altKey || t.metaKey || t.ctrlKey) && !(M.windows && t.ctrlKey && t.altKey) && !(M.mac && t.altKey && !(t.ctrlKey || t.metaKey)) && (p = Yt[t.keyCode]) && p != i ? (d(f[o + $o(p, t, !0)]) || t.shiftKey && (m = Xt[t.keyCode]) != i && m != p && d(f[o + $o(m, t, !1)])) && (s = !0) : a && t.shiftKey && d(f[o + $o(i, t, !0)]) && (s = !0), !s && d(f._any) && (s = !0)), c && (s = !0), s && l && t.stopPropagation(), cs = null, s;
}
var us = class e {
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
			let a = ds(t);
			return [new e(n, i.left - a.left, i.top - a.top, null, i.bottom - i.top)];
		}
		return ps(t, n, r);
	}
};
function ds(e) {
	let t = e.scrollDOM.getBoundingClientRect();
	return {
		left: (e.textDirection == F.LTR ? t.left : t.right - e.scrollDOM.clientWidth * e.scaleX) - e.scrollDOM.scrollLeft * e.scaleX,
		top: t.top - e.scrollDOM.scrollTop * e.scaleY
	};
}
function fs(e, t, n, r) {
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
function ps(e, t, n) {
	if (n.to <= e.viewport.from || n.from >= e.viewport.to) return [];
	let r = Math.max(n.from, e.viewport.from), i = Math.min(n.to, e.viewport.to), a = e.textDirection == F.LTR, o = e.contentDOM, s = o.getBoundingClientRect(), c = ds(e), l = o.querySelector(".cm-line"), u = l && window.getComputedStyle(l), d = s.left + (u ? parseInt(u.paddingLeft) + Math.min(0, parseInt(u.textIndent)) : 0), f = s.right - (u ? parseInt(u.paddingRight) : 0), p = Ui(e, r, 1), m = Ui(e, i, -1), h = p.type == N.Text ? p : null, g = m.type == N.Text ? m : null;
	if (h && (e.lineWrapping || p.widgetLineBreaks) && (h = fs(e, r, 1, h)), g && (e.lineWrapping || m.widgetLineBreaks) && (g = fs(e, i, -1, g)), h && g && h.from == g.from && h.to == g.to) return v(y(n.from, n.to, h));
	{
		let t = h ? y(n.from, null, h) : ee(p, !1), r = g ? y(null, n.to, g) : ee(m, !0), i = [];
		return (h || p).to < (g || m).from - (h && g ? 1 : 0) || p.widgetLineBreaks > 1 && t.bottom + e.defaultLineHeight / 2 < r.top ? i.push(_(d, t.bottom, f, r.top)) : t.bottom < r.top && e.elementAtHeight((t.bottom + r.top) / 2).type == N.Text && (t.bottom = r.top = (t.bottom + r.top) / 2), v(t).concat(i).concat(v(r));
	}
	function _(e, n, r, i) {
		return new us(t, e - c.left, n - c.top, Math.max(0, r - e), i - n);
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
			!p || !m || (i = Math.min(p.top, m.top, i), o = Math.max(p.bottom, m.bottom, o), u == F.LTR ? s.push(a && n ? d : p.left, a && l ? f : m.right) : s.push(!a && l ? d : m.left, !a && n ? f : p.right));
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
	function ee(e, t) {
		let n = s.top + (t ? e.top : e.bottom);
		return {
			top: n,
			bottom: n,
			horizontal: []
		};
	}
}
function ms(e, t) {
	return e.constructor == t.constructor && e.eq(t);
}
var hs = class {
	constructor(e, t) {
		this.view = e, this.layer = t, this.drawn = [], this.scaleX = 1, this.scaleY = 1, this.measureReq = {
			read: this.measure.bind(this),
			write: this.draw.bind(this)
		}, this.dom = e.scrollDOM.appendChild(document.createElement("div")), this.dom.classList.add("cm-layer"), t.above && this.dom.classList.add("cm-layer-above"), t.class && this.dom.classList.add(t.class), this.scale(), this.dom.setAttribute("aria-hidden", "true"), this.setOrder(e.state), e.requestMeasure(this.measureReq), t.mount && t.mount(this.dom, e);
	}
	update(e) {
		e.startState.facet(gs) != e.state.facet(gs) && this.setOrder(e.state), (this.layer.update(e, this.dom) || e.geometryChanged) && (this.scale(), e.view.requestMeasure(this.measureReq));
	}
	docViewUpdate(e) {
		this.layer.updateOnDocViewUpdate !== !1 && e.requestMeasure(this.measureReq);
	}
	setOrder(e) {
		let t = 0, n = e.facet(gs);
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
		if (e.length != this.drawn.length || e.some((e, t) => !ms(e, this.drawn[t]))) {
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
}, gs = /*@__PURE__*/ w.define();
function _s(e) {
	return [L.define((t) => new hs(t, e)), gs.of(e)];
}
var vs = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, {
		cursorBlinkRate: 1200,
		drawRangeCursor: !0,
		iosSelectionHandles: !0
	}, {
		cursorBlinkRate: (e, t) => Math.min(e, t),
		drawRangeCursor: (e, t) => e || t
	});
} });
function ys(e = {}) {
	return [
		vs.of(e),
		xs,
		Cs,
		Ts,
		Mr.of(!0)
	];
}
function bs(e) {
	return e.startState.facet(vs) != e.state.facet(vs);
}
var xs = /*@__PURE__*/ _s({
	above: !0,
	markers(e) {
		let { state: t } = e, n = t.facet(vs), r = [];
		for (let i of t.selection.ranges) {
			let a = i == t.selection.main;
			if (i.empty || n.drawRangeCursor && !(a && M.ios && n.iosSelectionHandles)) {
				let t = a ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary", n = i.empty ? i : C.cursor(i.head, i.assoc);
				for (let i of us.forRange(e, t, n)) r.push(i);
			}
		}
		return r;
	},
	update(e, t) {
		e.transactions.some((e) => e.selection) && (t.style.animationName = t.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink");
		let n = bs(e);
		return n && Ss(e.state, t), e.docChanged || e.selectionSet || n;
	},
	mount(e, t) {
		Ss(t.state, e);
	},
	class: "cm-cursorLayer"
});
function Ss(e, t) {
	t.style.animationDuration = e.facet(vs).cursorBlinkRate + "ms";
}
var Cs = /*@__PURE__*/ _s({
	above: !1,
	markers(e) {
		let t = [], { main: n, ranges: r } = e.state.selection;
		for (let n of r) if (!n.empty) for (let r of us.forRange(e, "cm-selectionBackground", n)) t.push(r);
		if (M.ios && !n.empty && e.state.facet(vs).iosSelectionHandles) {
			for (let r of us.forRange(e, "cm-selectionHandle cm-selectionHandle-start", C.cursor(n.from, 1))) t.push(r);
			for (let r of us.forRange(e, "cm-selectionHandle cm-selectionHandle-end", C.cursor(n.to, 1))) t.push(r);
		}
		return t;
	},
	update(e, t) {
		return e.docChanged || e.selectionSet || e.viewportChanged || bs(e);
	},
	class: "cm-selectionLayer"
}), ws = M.gecko && M.gecko_version == 153 ? "#ffffff01" : "transparent", Ts = /*@__PURE__*/ Ge.highest(/*@__PURE__*/ V.theme({
	".cm-line": {
		"& ::selection, &::selection": { backgroundColor: `${ws} !important` },
		caretColor: "transparent !important"
	},
	".cm-content": {
		caretColor: "transparent !important",
		"& :focus": {
			caretColor: "initial !important",
			"&::selection, & ::selection": { backgroundColor: "Highlight !important" }
		}
	}
})), Es = /*@__PURE__*/ T.define({ map(e, t) {
	return e == null ? null : t.mapPos(e);
} }), Ds = /*@__PURE__*/ He.define({
	create() {
		return null;
	},
	update(e, t) {
		return e != null && (e = t.changes.mapPos(e)), t.effects.reduce((e, t) => t.is(Es) ? t.value : e, e);
	}
}), Os = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.view = e, this.cursor = null, this.measureReq = {
			read: this.readPos.bind(this),
			write: this.drawCursor.bind(this)
		};
	}
	update(e) {
		var t;
		let n = e.state.field(Ds);
		n == null ? this.cursor != null && ((t = this.cursor) == null || t.remove(), this.cursor = null) : (this.cursor || (this.cursor = this.view.scrollDOM.appendChild(document.createElement("div")), this.cursor.className = "cm-dropCursor"), (e.startState.field(Ds) != n || e.docChanged || e.geometryChanged) && this.view.requestMeasure(this.measureReq));
	}
	readPos() {
		let { view: e } = this, t = e.state.field(Ds), n = t != null && e.coordsAtPos(t);
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
		this.view.state.field(Ds) != e && this.view.dispatch({ effects: Es.of(e) });
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
function ks() {
	return [Ds, Os];
}
function As(e, t, n, r, i) {
	t.lastIndex = 0;
	for (let a = e.iterRange(n, r), o = n, s; !a.next().done; o += a.value.length) if (!a.lineBreak) for (; s = t.exec(a.value);) i(o + s.index, s);
}
function js(e, t) {
	let n = e.visibleRanges;
	if (n.length == 1 && n[0].from == e.viewport.from && n[0].to == e.viewport.to) return n;
	let r = [];
	for (let { from: i, to: a } of n) i = Math.max(e.state.doc.lineAt(i).from, i - t), a = Math.min(e.state.doc.lineAt(a).to, a + t), r.length && r[r.length - 1].to >= i ? r[r.length - 1].to = a : r.push({
		from: i,
		to: a
	});
	return r;
}
var Ms = class {
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
		let t = new kt(), n = t.add.bind(t);
		for (let { from: t, to: r } of js(e, this.maxLength)) As(e.state.doc, this.regexp, t, r, (t, r) => this.addMatch(r, e, t, n));
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
				else As(e.state.doc, this.regexp, s, c, (t, n) => this.addMatch(n, e, t, d));
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
}, Ns = /x/.unicode == null ? "g" : "gu", Ps = /*@__PURE__*/ RegExp("[\0-\b\n--­؜​‎‏\u2028\u2029‭‮⁦⁧⁩﻿￹-￼]", Ns), Fs = {
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
}, Is = null;
function Ls() {
	if (Is == null && typeof document < "u" && document.body) {
		let e = document.body.style;
		Is = (e.tabSize ?? e.MozTabSize) != null;
	}
	return Is || !1;
}
var Rs = /*@__PURE__*/ w.define({ combine(e) {
	let t = St(e, {
		render: null,
		specialChars: Ps,
		addSpecialChars: null
	});
	return (t.replaceTabs = !Ls()) && (t.specialChars = RegExp("	|" + t.specialChars.source, Ns)), t.addSpecialChars && (t.specialChars = RegExp(t.specialChars.source + "|" + t.addSpecialChars.source, Ns)), t;
} });
function zs(e = {}) {
	return [Rs.of(e), Vs()];
}
var Bs = null;
function Vs() {
	return Bs ||= L.fromClass(class {
		constructor(e) {
			this.view = e, this.decorations = P.none, this.decorationCache = Object.create(null), this.decorator = this.makeDecorator(e.state.facet(Rs)), this.decorations = this.decorator.createDeco(e);
		}
		makeDecorator(e) {
			return new Ms({
				regexp: e.specialChars,
				decoration: (t, n, r) => {
					let { doc: i } = n.state, a = xe(t[0], 0);
					if (a == 9) {
						let e = i.lineAt(r), t = n.state.tabSize, a = Bt(e.text, t, r - e.from);
						return P.replace({ widget: new Gs((t - a % t) * this.view.defaultCharacterWidth / this.view.scaleX) });
					}
					return this.decorationCache[a] || (this.decorationCache[a] = P.replace({ widget: new Ws(e, a) }));
				},
				boundary: e.replaceTabs ? void 0 : /[^]/
			});
		}
		update(e) {
			let t = e.state.facet(Rs);
			e.startState.facet(Rs) == t ? this.decorations = this.decorator.updateDeco(e, this.decorations) : (this.decorator = this.makeDecorator(t), this.decorations = this.decorator.createDeco(e.view));
		}
	}, { decorations: (e) => e.decorations });
}
var Hs = "•";
function Us(e) {
	return e >= 32 ? Hs : e == 10 ? "␤" : String.fromCharCode(9216 + e);
}
var Ws = class extends yn {
	constructor(e, t) {
		super(), this.options = e, this.code = t;
	}
	eq(e) {
		return e.code == this.code;
	}
	toDOM(e) {
		let t = Us(this.code), n = e.state.phrase("Control character") + " " + (Fs[this.code] || "0x" + this.code.toString(16)), r = this.options.render && this.options.render(this.code, n, t);
		if (r) return r;
		let i = document.createElement("span");
		return i.textContent = t, i.title = n, i.setAttribute("aria-label", n), i.className = "cm-specialChar", i;
	}
	ignoreEvent() {
		return !1;
	}
}, Gs = class extends yn {
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
function Ks() {
	return Js;
}
var qs = /*@__PURE__*/ P.line({ class: "cm-activeLine" }), Js = /*@__PURE__*/ L.fromClass(class {
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
			i.from > t && (n.push(qs.range(i.from)), t = i.from);
		}
		return P.set(n);
	}
}, { decorations: (e) => e.decorations }), Ys = 2e3;
function Xs(e, t, n) {
	let r = Math.min(t.line, n.line), i = Math.max(t.line, n.line), a = [];
	if (t.off > Ys || n.off > Ys || t.col < 0 || n.col < 0) {
		let o = Math.min(t.off, n.off), s = Math.max(t.off, n.off);
		for (let t = r; t <= i; t++) {
			let n = e.doc.line(t);
			n.length <= s && a.push(C.range(n.from + o, n.to + s));
		}
	} else {
		let o = Math.min(t.col, n.col), s = Math.max(t.col, n.col);
		for (let t = r; t <= i; t++) {
			let n = e.doc.line(t), r = Vt(n.text, o, e.tabSize, !0);
			if (r < 0) a.push(C.cursor(n.to));
			else {
				let t = Vt(n.text, s, e.tabSize);
				a.push(C.range(n.from + r, n.from + t));
			}
		}
	}
	return a;
}
function Zs(e, t) {
	let n = e.coordsAtPos(e.viewport.from);
	return n ? Math.round(Math.abs((n.left - t) / e.defaultCharacterWidth)) : -1;
}
function Qs(e, t) {
	let n = e.posAtCoords({
		x: t.clientX,
		y: t.clientY
	}, !1), r = e.state.doc.lineAt(n), i = n - r.from, a = i > Ys ? -1 : i == r.length ? Zs(e, t.clientX) : Bt(r.text, e.state.tabSize, n - r.from);
	return {
		line: r.number,
		col: a,
		off: i
	};
}
function $s(e, t) {
	let n = Qs(e, t), r = e.state.selection;
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
			let o = Qs(e, t);
			if (!o) return r;
			let s = Xs(e.state, n, o);
			return s.length ? a ? C.create(s.concat(r.ranges)) : C.create(s) : r;
		}
	} : null;
}
function ec(e) {
	let t = e?.eventFilter || ((e) => e.altKey && e.button == 0);
	return V.mouseSelectionStyle.of((e, n) => t(n) ? $s(e, n) : null);
}
var tc = {
	Alt: [18, (e) => !!e.altKey],
	Control: [17, (e) => !!e.ctrlKey],
	Shift: [16, (e) => !!e.shiftKey],
	Meta: [91, (e) => !!e.metaKey]
}, nc = { style: "cursor: crosshair" };
function rc(e = {}) {
	let [t, n] = tc[e.key || "Alt"], r = L.fromClass(class {
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
	return [r, V.contentAttributes.of((e) => e.plugin(r)?.isDown ? nc : null)];
}
var ic = "-10000px", ac = class {
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
function oc(e) {
	let t = e.dom.ownerDocument.documentElement;
	return {
		top: 0,
		left: 0,
		bottom: t.clientHeight,
		right: t.clientWidth
	};
}
var sc = /*@__PURE__*/ w.define({ combine: (e) => ({
	position: M.ios ? "absolute" : e.find((e) => e.position)?.position || "fixed",
	parent: e.find((e) => e.parent)?.parent || null,
	tooltipSpace: e.find((e) => e.tooltipSpace)?.tooltipSpace || oc
}) }), cc = /*@__PURE__*/ new WeakMap(), lc = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.view = e, this.above = [], this.inView = !0, this.madeAbsolute = !1, this.lastTransaction = 0, this.measureTimeout = -1;
		let t = e.state.facet(sc);
		this.position = t.position, this.parent = t.parent, this.classes = e.themeClasses, this.createContainer(), this.measureReq = {
			read: this.readMeasure.bind(this),
			write: this.writeMeasure.bind(this),
			key: this
		}, this.resizeObserver = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.measureSoon()) : null, this.manager = new ac(e, pc, (e, t) => this.createTooltip(e, t), (e) => {
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
		let n = t || e.geometryChanged, r = e.state.facet(sc);
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
		return n.dom.style.position = this.position, n.dom.style.top = ic, n.dom.style.left = "0px", this.container.insertBefore(n.dom, r), n.mount && n.mount(this.view), this.resizeObserver && this.resizeObserver.observe(n.dom), n;
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
		let r = this.view.scrollDOM.getBoundingClientRect(), i = Zr(this.view);
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
			space: this.view.state.facet(sc).tooltipSpace(this.view),
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
				l.style.top = ic;
				continue;
			}
			let f = s.arrow ? c.dom.querySelector(".cm-tooltip-arrow") : null, p = f ? 7 : 0, m = d.right - d.left, h = cc.get(c) ?? d.bottom - d.top, g = c.offset || fc, _ = this.view.textDirection == F.LTR, v = d.width > n.right - n.left ? _ ? n.left : n.right - d.width : _ ? Math.max(n.left, Math.min(u.left - (f ? 14 : 0) + g.x, n.right - m)) : Math.min(Math.max(n.left, u.left - m + (f ? 14 : 0) - g.x), n.right - m), y = this.above[o];
			!s.strictSide && (y ? u.top - h - p - g.y < n.top : u.bottom + h + p + g.y > n.bottom) && y == n.bottom - u.bottom > u.top - n.top && (y = this.above[o] = !y);
			let ee = (y ? u.top - n.top : n.bottom - u.bottom) - p;
			if (ee < h && c.resize !== !1) {
				if (ee < this.view.defaultLineHeight) {
					l.style.top = ic;
					continue;
				}
				cc.set(c, h), l.style.height = (h = ee) / i + "px";
			} else l.style.height && (l.style.height = "");
			let te = y ? u.top - h - p - g.y : u.bottom + p + g.y, ne = v + m;
			if (c.overlap !== !0) for (let e of a) e.left < ne && e.right > v && e.top < te + h && e.bottom > te && (te = y ? e.top - h - 2 - p : e.bottom + p + 2);
			if (this.position == "absolute" ? (l.style.top = (te - e.parent.top) / i + "px", uc(l, (v - e.parent.left) / r)) : (l.style.top = te / i + "px", uc(l, v / r)), f) {
				let e = u.left + (_ ? g.x : -g.x) - (v + 14 - 7);
				f.style.left = e / r + "px";
			}
			c.overlap !== !0 && a.push({
				left: v,
				top: te,
				right: ne,
				bottom: te + h
			}), l.classList.toggle("cm-tooltip-above", y), l.classList.toggle("cm-tooltip-below", !y), c.positioned && c.positioned(e.space);
		}
	}
	maybeMeasure() {
		if (this.manager.tooltips.length && (this.view.inView && this.view.requestMeasure(this.measureReq), this.inView != this.view.inView && (this.inView = this.view.inView, !this.inView))) for (let e of this.manager.tooltipViews) e.dom.style.top = ic;
	}
}, { eventObservers: { scroll() {
	this.maybeMeasure();
} } });
function uc(e, t) {
	let n = parseInt(e.style.left, 10);
	(isNaN(n) || Math.abs(t - n) > 1) && (e.style.left = t + "px");
}
var dc = /*@__PURE__*/ V.baseTheme({
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
}), fc = {
	x: 0,
	y: 0
}, pc = /*@__PURE__*/ w.define({ enables: [lc, dc] }), mc = /*@__PURE__*/ w.define({ combine: (e) => e.reduce((e, t) => e.concat(t), []) }), hc = class e {
	static create(t) {
		return new e(t);
	}
	constructor(e) {
		this.view = e, this.mounted = !1, this.dom = document.createElement("div"), this.dom.classList.add("cm-tooltip-hover"), this.manager = new ac(e, mc, (e, t) => this.createHostedView(e, t), (e) => e.dom.remove());
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
}, gc = /*@__PURE__*/ pc.compute([mc], (e) => {
	let t = e.facet(mc);
	return t.length === 0 ? null : {
		pos: Math.min(...t.map((e) => e.pos)),
		end: Math.max(...t.map((e) => e.end ?? e.pos)),
		create: hc.create,
		above: t[0].above,
		arrow: t.some((e) => e.arrow)
	};
}), _c = /*@__PURE__*/ w.define(), vc = class {
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
			let a = e.bidiSpans(e.state.doc.lineAt(r)).find((e) => e.from <= r && e.to >= r), o = a && a.dir == F.RTL ? -1 : 1;
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
			}, (t) => Lr(e.state, t, "hover tooltip"));
		} else a(i);
	}
	get tooltip() {
		let e = this.view.plugin(lc), t = e ? e.manager.tooltips.findIndex((e) => e.create == hc.create) : -1;
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
		if (t.length && !this.locked.has(t) && n && !bc(n.dom, e) || this.pending) {
			let { pos: n } = t[0] || this.pending, r = t[0]?.end ?? n;
			(n == r ? this.view.posAtCoords(this.lastMove) != n : !xc(this.view, n, r, e.clientX, e.clientY)) && (this.view.dispatch({ effects: this.setHover.of([]) }), this.pending = null);
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
}, yc = 4;
function bc(e, t) {
	let { left: n, right: r, top: i, bottom: a } = e.getBoundingClientRect(), o;
	if (o = e.querySelector(".cm-tooltip-arrow")) {
		let e = o.getBoundingClientRect();
		i = Math.min(e.top, i), a = Math.max(e.bottom, a);
	}
	return t.clientX >= n - yc && t.clientX <= r + yc && t.clientY >= i - yc && t.clientY <= a + yc;
}
function xc(e, t, n, r, i, a) {
	let o = e.scrollDOM.getBoundingClientRect(), s = e.documentTop + e.documentPadding.top + e.contentHeight;
	if (o.left > r || o.right < r || o.top > i || Math.min(o.bottom, s) < i) return !1;
	let c = e.posAtCoords({
		x: r,
		y: i
	}, !1);
	return c >= t && c <= n;
}
function Sc(e, t = {}) {
	let n = T.define(), r = /* @__PURE__ */ new WeakMap(), i = He.define({
		create() {
			return [];
		},
		update(e, a) {
			let o = r.get(e);
			if (e.length && (t.hideOnChange && (a.docChanged || a.selection) || o && o(a) ? e = [] : t.hideOn && (e = e.filter((e) => !t.hideOn(a, e)))), a.docChanged && e.length) {
				let t = [];
				for (let n of e) {
					let e = a.changes.mapPos(n.pos, -1, Te.TrackDel);
					if (e != null) {
						let r = Object.assign(Object.create(null), n);
						r.pos = e, r.end != null && (r.end = a.changes.mapPos(r.end)), t.push(r);
					}
				}
				e = t;
			}
			for (let t of a.effects) t.is(n) && (e = t.value, o = void 0), (t.is(Tc) && !t.value || t.value == i) && (e = []);
			return e.length && o && r.set(e, o), e;
		},
		provide: (e) => mc.from(e)
	}), a = L.define((a) => new vc(a, e, i, r, n, t.hoverTime || 300));
	return {
		active: i,
		extension: [
			i,
			a,
			_c.of(a),
			gc
		]
	};
}
function Cc(e, t, n, r = {}) {
	let i = e.state.facet(_c).map((t) => e.plugin(t)).filter((e) => !!e);
	if (r.tooltip && r.tooltip.active) {
		let e = i.find((e) => e.field == r.tooltip.active);
		e && (i = [e]);
	}
	for (let a of i) a.activateHover(e, t, n, r.until ?? (() => !1));
}
function wc(e, t) {
	let n = e.plugin(lc);
	if (!n) return null;
	let r = n.manager.tooltips.indexOf(t);
	return r < 0 ? null : n.manager.tooltipViews[r];
}
var Tc = /*@__PURE__*/ T.define(), Ec = /*@__PURE__*/ w.define({ combine(e) {
	let t, n;
	for (let r of e) t ||= r.topContainer, n ||= r.bottomContainer;
	return {
		topContainer: t,
		bottomContainer: n
	};
} });
function Dc(e, t) {
	let n = e.plugin(Oc), r = n ? n.specs.indexOf(t) : -1;
	return r > -1 ? n.panels[r] : null;
}
var Oc = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.input = e.state.facet(jc), this.specs = this.input.filter((e) => e), this.panels = this.specs.map((t) => t(e));
		let t = e.state.facet(Ec);
		this.top = new kc(e, !0, t.topContainer), this.bottom = new kc(e, !1, t.bottomContainer), this.top.sync(this.panels.filter((e) => e.top)), this.bottom.sync(this.panels.filter((e) => !e.top));
		for (let e of this.panels) e.dom.classList.add("cm-panel"), e.mount && e.mount();
	}
	update(e) {
		let t = e.state.facet(Ec);
		this.top.container != t.topContainer && (this.top.sync([]), this.top = new kc(e.view, !0, t.topContainer)), this.bottom.container != t.bottomContainer && (this.bottom.sync([]), this.bottom = new kc(e.view, !1, t.bottomContainer)), this.top.syncClasses(), this.bottom.syncClasses();
		let n = e.state.facet(jc);
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
}, { provide: (e) => V.scrollMargins.of((t) => {
	let n = t.plugin(e);
	return n && {
		top: n.top.scrollMargin(),
		bottom: n.bottom.scrollMargin()
	};
}) }), kc = class {
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
			for (; e != t.dom;) e = Ac(e);
			e = e.nextSibling;
		} else this.dom.insertBefore(t.dom, e);
		for (; e;) e = Ac(e);
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
function Ac(e) {
	let t = e.nextSibling;
	return e.remove(), t;
}
var jc = /*@__PURE__*/ w.define({ enables: Oc });
function Mc(e, t) {
	let n, r = new Promise((e) => n = e), i = (e) => Ic(e, t, n);
	e.state.field(Nc, !1) ? e.dispatch({ effects: Pc.of(i) }) : e.dispatch({ effects: T.appendConfig.of(Nc.init(() => [i])) });
	let a = Fc.of(i);
	return {
		close: a,
		result: r.then((t) => ((e.win.queueMicrotask || ((t) => e.win.setTimeout(t, 10)))(() => {
			e.state.field(Nc).indexOf(i) > -1 && e.dispatch({ effects: a });
		}), t))
	};
}
var Nc = /*@__PURE__*/ He.define({
	create() {
		return [];
	},
	update(e, t) {
		for (let n of t.effects) n.is(Pc) ? e = [n.value].concat(e) : n.is(Fc) && (e = e.filter((e) => e != n.value));
		return e;
	},
	provide: (e) => jc.computeN([e], (t) => t.field(e))
}), Pc = /*@__PURE__*/ T.define(), Fc = /*@__PURE__*/ T.define();
function Ic(e, t, n) {
	let r = t.content ? t.content(e, () => o(null)) : null;
	if (!r) {
		if (r = A("form"), t.input) {
			let e = A("input", t.input);
			/^(text|password|number|email|tel|url)$/.test(e.type) && e.classList.add("cm-textfield"), e.name ||= "input", r.appendChild(A("label", (t.label || "") + ": ", e));
		} else r.appendChild(document.createTextNode(t.label || ""));
		r.appendChild(document.createTextNode(" ")), r.appendChild(A("button", {
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
	let a = A("div", r, A("button", {
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
var Lc = class extends Ct {
	compare(e) {
		return this == e || this.constructor == e.constructor && this.eq(e);
	}
	eq(e) {
		return !1;
	}
	destroy(e) {}
};
Lc.prototype.elementClass = "", Lc.prototype.toDOM = void 0, Lc.prototype.mapMode = Te.TrackBefore, Lc.prototype.startSide = Lc.prototype.endSide = -1, Lc.prototype.point = !0;
var Rc = /*@__PURE__*/ w.define(), zc = /*@__PURE__*/ w.define(), Bc = {
	class: "",
	renderEmptyElements: !1,
	elementStyle: "",
	markers: () => O.empty,
	lineMarker: () => null,
	widgetMarker: () => null,
	lineMarkerChange: null,
	initialSpacer: null,
	updateSpacer: null,
	domEventHandlers: {},
	side: "before"
}, Vc = /*@__PURE__*/ w.define();
function Hc(e) {
	return [Wc(), Vc.of({
		...Bc,
		...e
	})];
}
var Uc = /*@__PURE__*/ w.define({ combine: (e) => e.some((e) => e) });
function Wc(e) {
	let t = [Gc];
	return e && e.fixed === !1 && t.push(Uc.of(!0)), t;
}
var Gc = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.view = e, this.domAfter = null, this.prevViewport = e.viewport, this.dom = document.createElement("div"), this.dom.className = "cm-gutters cm-gutters-before", this.dom.setAttribute("aria-hidden", "true"), this.dom.style.minHeight = this.view.contentHeight / this.view.scaleY + "px", this.gutters = e.state.facet(Vc).map((t) => new Yc(e, t)), this.fixed = !e.state.facet(Uc);
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
		this.view.state.facet(Uc) != !this.fixed && (this.fixed = !this.fixed, this.dom.style.position = this.fixed ? "sticky" : "", this.domAfter && (this.domAfter.style.position = this.fixed ? "sticky" : "")), this.prevViewport = e.view.viewport;
	}
	syncGutters(e) {
		let t = this.dom.nextSibling;
		e && (this.dom.remove(), this.domAfter && this.domAfter.remove());
		let n = O.iter(this.view.state.facet(Rc), this.view.viewport.from), r = [], i = this.gutters.map((e) => new Jc(e, this.view.viewport, -this.view.documentPadding.top));
		for (let e of this.view.viewportLineBlocks) if (r.length && (r = []), Array.isArray(e.type)) {
			let t = !0;
			for (let a of e.type) if (a.type == N.Text && t) {
				qc(n, r, a.from);
				for (let e of i) e.line(this.view, a, r);
				t = !1;
			} else if (a.widget) for (let e of i) e.widget(this.view, a);
		} else if (e.type == N.Text) {
			qc(n, r, e.from);
			for (let t of i) t.line(this.view, e, r);
		} else if (e.widget) for (let t of i) t.widget(this.view, e);
		for (let e of i) e.finish();
		e && (this.view.scrollDOM.insertBefore(this.dom, t), this.domAfter && this.view.scrollDOM.appendChild(this.domAfter));
	}
	updateGutters(e) {
		let t = e.startState.facet(Vc), n = e.state.facet(Vc), r = e.docChanged || e.heightChanged || e.viewportChanged || !O.eq(e.startState.facet(Rc), e.state.facet(Rc), e.view.viewport.from, e.view.viewport.to);
		if (t == n) for (let t of this.gutters) t.update(e) && (r = !0);
		else {
			r = !0;
			let i = [];
			for (let r of n) {
				let n = t.indexOf(r);
				n < 0 ? i.push(new Yc(this.view, r)) : (this.gutters[n].update(e), i.push(this.gutters[n]));
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
}, { provide: (e) => V.scrollMargins.of((t) => {
	let n = t.plugin(e);
	if (!n || n.gutters.length == 0 || !n.fixed) return null;
	let r = n.dom.offsetWidth * t.scaleX, i = n.domAfter ? n.domAfter.offsetWidth * t.scaleX : 0;
	return t.textDirection == F.LTR ? {
		left: r,
		right: i
	} : {
		right: r,
		left: i
	};
}) });
function Kc(e) {
	return Array.isArray(e) ? e : [e];
}
function qc(e, t, n) {
	for (; e.value && e.from <= n;) e.from == n && t.push(e.value), e.next();
}
var Jc = class {
	constructor(e, t, n) {
		this.gutter = e, this.height = n, this.i = 0, this.cursor = O.iter(e.markers, t.from);
	}
	addElement(e, t, n) {
		let { gutter: r } = this, i = (t.top - this.height) / e.scaleY, a = t.height / e.scaleY;
		if (this.i == r.elements.length) {
			let t = new Xc(e, a, i, n);
			r.elements.push(t), r.dom.appendChild(t.dom);
		} else r.elements[this.i].update(e, a, i, n);
		this.height = t.bottom, this.i++;
	}
	line(e, t, n) {
		let r = [];
		qc(this.cursor, r, t.from), n.length && (r = r.concat(n));
		let i = this.gutter.config.lineMarker(e, t, r);
		i && r.unshift(i);
		let a = this.gutter;
		r.length == 0 && !a.config.renderEmptyElements || this.addElement(e, t, r);
	}
	widget(e, t) {
		let n = this.gutter.config.widgetMarker(e, t.widget, t), r = n ? [n] : null;
		for (let n of e.state.facet(zc)) {
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
}, Yc = class {
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
		this.markers = Kc(t.markers(e)), t.initialSpacer && (this.spacer = new Xc(e, 0, 0, [t.initialSpacer(e)]), this.dom.appendChild(this.spacer.dom), this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none");
	}
	update(e) {
		let t = this.markers;
		if (this.markers = Kc(this.config.markers(e.view)), this.spacer && this.config.updateSpacer) {
			let t = this.config.updateSpacer(this.spacer.markers[0], e);
			t != this.spacer.markers[0] && this.spacer.update(e.view, 0, 0, [t]);
		}
		let n = e.view.viewport;
		return !O.eq(this.markers, t, n.from, n.to) || (this.config.lineMarkerChange ? this.config.lineMarkerChange(e) : !1);
	}
	destroy() {
		for (let e of this.elements) e.destroy();
	}
}, Xc = class {
	constructor(e, t, n, r) {
		this.height = -1, this.above = 0, this.markers = [], this.dom = document.createElement("div"), this.dom.className = "cm-gutterElement", this.update(e, t, n, r);
	}
	update(e, t, n, r) {
		this.height != t && (this.height = t, this.dom.style.height = t + "px"), this.above != n && (this.dom.style.marginTop = (this.above = n) ? n + "px" : ""), Zc(this.markers, r) || this.setMarkers(e, r);
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
function Zc(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (!e[n].compare(t[n])) return !1;
	return !0;
}
var Qc = /*@__PURE__*/ w.define(), $c = /*@__PURE__*/ w.define(), el = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, {
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
} }), tl = class extends Lc {
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
function nl(e, t) {
	return e.state.facet(el).formatNumber(t, e.state);
}
var rl = /*@__PURE__*/ Vc.compute([el], (e) => ({
	class: "cm-lineNumbers",
	renderEmptyElements: !1,
	markers(e) {
		return e.state.facet(Qc);
	},
	lineMarker(e, t, n) {
		return n.some((e) => e.toDOM) ? null : new tl(nl(e, e.state.doc.lineAt(t.from).number));
	},
	widgetMarker: (e, t, n) => {
		for (let r of e.state.facet($c)) {
			let i = r(e, t, n);
			if (i) return i;
		}
		return null;
	},
	lineMarkerChange: (e) => e.startState.facet(el) != e.state.facet(el),
	initialSpacer(e) {
		return new tl(nl(e, al(e.state.doc.lines)));
	},
	updateSpacer(e, t) {
		let n = nl(t.view, al(t.view.state.doc.lines));
		return n == e.number ? e : new tl(n);
	},
	domEventHandlers: e.facet(el).domEventHandlers,
	side: "before"
}));
function il(e = {}) {
	return [
		el.of(e),
		Wc(),
		rl
	];
}
function al(e) {
	let t = 9;
	for (; t < e;) t = t * 10 + 9;
	return t;
}
var ol = /*@__PURE__*/ new class extends Lc {
	constructor() {
		super(...arguments), this.elementClass = "cm-activeLineGutter";
	}
}(), sl = /*@__PURE__*/ Rc.compute(["selection"], (e) => {
	let t = [], n = -1;
	for (let r of e.selection.ranges) {
		let i = e.doc.lineAt(r.head).from;
		i > n && (n = i, t.push(ol.range(i)));
	}
	return O.of(t);
});
function cl() {
	return sl;
}
//#endregion
//#region node_modules/@lezer/common/dist/index.js
var ll = 1024, ul = 0, dl = class {
	constructor(e, t) {
		this.from = e, this.to = t;
	}
}, H = class {
	constructor(e = {}) {
		this.id = ul++, this.perNode = !!e.perNode, this.deserialize = e.deserialize || (() => {
			throw Error("This node type doesn't define a deserialize function");
		}), this.combine = e.combine || null;
	}
	add(e) {
		if (this.perNode) throw RangeError("Can't add per-node props to node types");
		return typeof e != "function" && (e = ml.match(e)), (t) => {
			let n = e(t);
			return n === void 0 ? null : [this, n];
		};
	}
};
H.closedBy = new H({ deserialize: (e) => e.split(" ") }), H.openedBy = new H({ deserialize: (e) => e.split(" ") }), H.group = new H({ deserialize: (e) => e.split(" ") }), H.isolate = new H({ deserialize: (e) => {
	if (e && e != "rtl" && e != "ltr" && e != "auto") throw RangeError("Invalid value for isolate: " + e);
	return e || "auto";
} }), H.contextHash = new H({ perNode: !0 }), H.lookAhead = new H({ perNode: !0 }), H.mounted = new H({ perNode: !0 });
var fl = class {
	constructor(e, t, n, r = !1) {
		this.tree = e, this.overlay = t, this.parser = n, this.bracketed = r;
	}
	static get(e) {
		return e && e.props && e.props[H.mounted.id];
	}
}, pl = Object.create(null), ml = class e {
	constructor(e, t, n, r = 0) {
		this.name = e, this.props = t, this.id = n, this.flags = r;
	}
	static define(t) {
		let n = t.props && t.props.length ? Object.create(null) : pl, r = !!t.top | (t.skipped ? 2 : 0) | (t.error ? 4 : 0) | (t.name == null ? 8 : 0), i = new e(t.name || "", n, t.id, r);
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
			let t = this.prop(H.group);
			return t ? t.indexOf(e) > -1 : !1;
		}
		return this.id == e;
	}
	static match(e) {
		let t = Object.create(null);
		for (let n in e) for (let r of n.split(" ")) t[r] = e[n];
		return (e) => {
			for (let n = e.prop(H.group), r = -1; r < (n ? n.length : 0); r++) {
				let i = t[r < 0 ? e.name : n[r]];
				if (i) return i;
			}
		};
	}
};
ml.none = new ml("", Object.create(null), 0, 8);
var hl = /* @__PURE__ */ new WeakMap(), gl = /* @__PURE__ */ new WeakMap(), U;
(function(e) {
	e[e.ExcludeBuffers = 1] = "ExcludeBuffers", e[e.IncludeAnonymous = 2] = "IncludeAnonymous", e[e.IgnoreMounts = 4] = "IgnoreMounts", e[e.IgnoreOverlays = 8] = "IgnoreOverlays", e[e.EnterBracketed = 16] = "EnterBracketed";
})(U ||= {});
var _l = class e {
	constructor(e, t, n, r, i) {
		if (this.type = e, this.children = t, this.positions = n, this.length = r, this.props = null, i && i.length) {
			this.props = Object.create(null);
			for (let [e, t] of i) this.props[typeof e == "number" ? e : e.id] = t;
		}
	}
	toString() {
		let e = fl.get(this);
		if (e && !e.overlay) return e.tree.toString();
		let t = "";
		for (let e of this.children) {
			let n = e.toString();
			n && (t && (t += ","), t += n);
		}
		return this.type.name ? (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (t.length ? "(" + t + ")" : "") : t;
	}
	cursor(e = 0) {
		return new jl(this.topNode, e);
	}
	cursorAt(e, t = 0, n = 0) {
		let r = new jl(hl.get(this) || this.topNode);
		return r.moveTo(e, t), hl.set(this, r._tree), r;
	}
	get topNode() {
		return new Cl(this, 0, 0, null);
	}
	resolve(e, t = 0) {
		let n = xl(hl.get(this) || this.topNode, e, t, !1);
		return hl.set(this, n), n;
	}
	resolveInner(e, t = 0) {
		let n = xl(gl.get(this) || this.topNode, e, t, !0);
		return gl.set(this, n), n;
	}
	resolveStack(e, t = 0) {
		return Al(this, e, t);
	}
	iterate(e) {
		let { enter: t, leave: n, from: r = 0, to: i = this.length } = e, a = e.mode || 0, o = (a & U.IncludeAnonymous) > 0;
		for (let e = this.cursor(a | U.IncludeAnonymous);;) {
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
		return this.children.length <= 8 ? this : Il(ml.none, this.children, this.positions, 0, this.children.length, 0, this.length, (t, n, r) => new e(this.type, t, n, r, this.propValues), t.makeTree || ((t, n, r) => new e(ml.none, t, n, r)));
	}
	static build(e) {
		return Nl(e);
	}
};
_l.empty = new _l(ml.none, [], [], 0);
var vl = class e {
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
}, yl = class e {
	constructor(e, t, n) {
		this.buffer = e, this.length = t, this.set = n;
	}
	get type() {
		return ml.none;
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
		for (let s = e; s != t && !(bl(i, r, a[s + 1], a[s + 2]) && (o = s, n > 0)); s = a[s + 3]);
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
function bl(e, t, n, r) {
	switch (e) {
		case -2: return n < t;
		case -1: return r >= t && n < t;
		case 0: return n < t && r > t;
		case 1: return n <= t && r > t;
		case 2: return r > t;
		case 4: return !0;
	}
}
function xl(e, t, n, r) {
	for (; e.from == e.to || (n < 1 ? e.from >= t : e.from > t) || (n > -1 ? e.to <= t : e.to < t);) {
		let t = !r && e instanceof Cl && e.index < 0 ? null : e.parent;
		if (!t) return e;
		e = t;
	}
	let i = r ? 0 : U.IgnoreOverlays;
	if (r) for (let r = e, a = r.parent; a; r = a, a = r.parent) r instanceof Cl && r.index < 0 && a.enter(t, n, i)?.from != r.from && (e = a);
	for (;;) {
		let r = e.enter(t, n, i);
		if (!r) return e;
		e = r;
	}
}
var Sl = class {
	cursor(e = 0) {
		return new jl(this, e);
	}
	getChild(e, t = null, n = null) {
		let r = wl(this, e, t, n);
		return r.length ? r[0] : null;
	}
	getChildren(e, t = null, n = null) {
		return wl(this, e, t, n);
	}
	resolve(e, t = 0) {
		return xl(this, e, t, !1);
	}
	resolveInner(e, t = 0) {
		return xl(this, e, t, !0);
	}
	matchContext(e) {
		return Tl(this.parent, e);
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
}, Cl = class e extends Sl {
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
				if (!(!(a & U.EnterBracketed && l instanceof _l && (d = fl.get(l)) && !d.overlay && d.bracketed && r >= u && r <= u + l.length) && !bl(i, r, u, u + l.length))) {
					if (l instanceof yl) {
						if (a & U.ExcludeBuffers) continue;
						let e = l.findChild(0, l.buffer.length, n, r - u, i);
						if (e > -1) return new Dl(new El(o, l, t, u), null, e);
					} else if (a & U.IncludeAnonymous || !l.type.isAnonymous || Ml(l)) {
						let s;
						if (!(a & U.IgnoreMounts) && (s = fl.get(l)) && !s.overlay) return new e(s.tree, u, t, o);
						let c = new e(l, u, t, o);
						return a & U.IncludeAnonymous || !c.type.isAnonymous ? c : c.nextChild(n < 0 ? l.children.length - 1 : 0, n, r, i, a);
					}
				}
			}
			if (a & U.IncludeAnonymous || !o.type.isAnonymous || (t = o.index >= 0 ? o.index + n : n < 0 ? -1 : o._parent._tree.children.length, o = o._parent, !o)) return null;
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
		if (!(r & U.IgnoreOverlays) && (i = fl.get(this._tree)) && i.overlay) {
			let a = t - this.from, o = r & U.EnterBracketed && i.bracketed;
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
function wl(e, t, n, r) {
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
function Tl(e, t, n = t.length - 1) {
	for (let r = e; n >= 0; r = r.parent) {
		if (!r) return !1;
		if (!r.type.isAnonymous) {
			if (t[n] && t[n] != r.name) return !1;
			n--;
		}
	}
	return !0;
}
var El = class {
	constructor(e, t, n, r) {
		this.parent = e, this.buffer = t, this.index = n, this.start = r;
	}
}, Dl = class e extends Sl {
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
		if (r & U.ExcludeBuffers) return null;
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
		return new _l(this.type, e, t, this.to - this.from);
	}
	toString() {
		return this.context.buffer.childString(this.index);
	}
};
function Ol(e) {
	if (!e.length) return null;
	let t = 0, n = e[0];
	for (let r = 1; r < e.length; r++) {
		let i = e[r];
		(i.from > n.from || i.to < n.to) && (n = i, t = r);
	}
	let r = n instanceof Cl && n.index < 0 ? null : n.parent, i = e.slice();
	return r ? i[t] = r : i.splice(t, 1), new kl(i, n);
}
var kl = class {
	constructor(e, t) {
		this.heads = e, this.node = t;
	}
	get next() {
		return Ol(this.heads);
	}
};
function Al(e, t, n) {
	let r = e.resolveInner(t, n), i = null;
	for (let e = r instanceof Cl ? r : r.context.parent; e; e = e.parent) if (e.index < 0) {
		let a = e.parent;
		(i ||= [r]).push(a.resolve(t, n)), e = a;
	} else {
		let a = fl.get(e.tree);
		if (a && a.overlay && a.overlay[0].from <= t && a.overlay[a.overlay.length - 1].to >= t) {
			let o = new Cl(a.tree, a.overlay[0].from + e.from, -1, e);
			(i ||= [r]).push(xl(o, t, n, !1));
		}
	}
	return i ? Ol(i) : r;
}
var jl = class {
	get name() {
		return this.type.name;
	}
	constructor(e, t = 0) {
		if (this.buffer = null, this.stack = [], this.index = 0, this.bufferNode = null, this.mode = t & ~U.EnterBracketed, e instanceof Cl) this.yieldNode(e);
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
		return e ? e instanceof Cl ? (this.buffer = null, this.yieldNode(e)) : (this.buffer = e.context, this.yieldBuf(e.index, e.type)) : !1;
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
		return this.buffer ? n & U.ExcludeBuffers ? !1 : this.enterChild(1, e, t) : this.yield(this._tree.enter(e, t, n));
	}
	parent() {
		if (!this.buffer) return this.yieldNode(this.mode & U.IncludeAnonymous ? this._tree._parent : this._tree.parent);
		if (this.stack.length) return this.yieldBuf(this.stack.pop());
		let e = this.mode & U.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
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
			if (this.mode & U.IncludeAnonymous || e instanceof yl || !e.type.isAnonymous || Ml(e)) return !1;
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
		for (let e = n; e < this.stack.length; e++) t = new Dl(this.buffer, t, this.stack[e]);
		return this.bufferNode = new Dl(this.buffer, t, this.index);
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
		if (!this.buffer) return Tl(this.node.parent, e);
		let { buffer: t } = this.buffer, { types: n } = t.set;
		for (let r = e.length - 1, i = this.stack.length - 1; r >= 0; i--) {
			if (i < 0) return Tl(this._tree, e, r);
			let a = n[t.buffer[this.stack[i]]];
			if (!a.isAnonymous) {
				if (e[r] && e[r] != a.name) return !1;
				r--;
			}
		}
		return !0;
	}
};
function Ml(e) {
	return e.children.some((e) => e instanceof yl || !e.type.isAnonymous || Ml(e));
}
function Nl(e) {
	let { buffer: t, nodeSet: n, maxBufferLength: r = ll, reused: i = [], minRepeatType: a = n.types.length } = e, o = Array.isArray(t) ? new vl(t, t.length) : t, s = n.types, c = 0, l = 0;
	function u(e, t, _, v, y, ee) {
		let { id: te, start: ne, end: re, size: ie } = o, ae = l, oe = c;
		if (ie < 0) {
			if (o.next(), ie == -1) {
				let t = i[te];
				_.push(t), v.push(ne - e);
				return;
			}
			if (ie == -3) {
				c = te;
				return;
			}
			if (ie == -4) {
				l = te;
				return;
			}
			throw RangeError(`Unrecognized record size: ${ie}`);
		}
		let se = s[te], ce, b, le = ne - e;
		if (re - ne <= r && (b = h(o.pos - t, y))) {
			let t = new Uint16Array(b.size - b.skip), r = o.pos - b.size, i = t.length;
			for (; o.pos > r;) i = g(b.start, t, i);
			ce = new yl(t, re - b.start, n), le = b.start - e;
		} else {
			let e = o.pos - ie;
			o.next();
			let t = [], n = [], i = te >= a ? te : -1, s = 0, c = re;
			for (; o.pos > e;) i >= 0 && o.id == i && o.size >= 0 ? (o.end <= c - r && (p(t, n, ne, s, o.end, c, i, ae, oe), s = t.length, c = o.end), o.next()) : ee > 2500 ? d(ne, e, t, n) : u(ne, e, t, n, i, ee + 1);
			if (i >= 0 && s > 0 && s < t.length && p(t, n, ne, s, ne, c, i, ae, oe), t.reverse(), n.reverse(), i > -1 && s > 0) {
				let e = f(se, oe);
				ce = Il(se, t, n, 0, t.length, 0, re - ne, e, e);
			} else ce = m(se, t, n, re - ne, ae - re, oe);
		}
		_.push(ce), v.push(le);
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
			i.push(new yl(t, s[2] - r, n)), a.push(r - e);
		}
	}
	function f(e, t) {
		return (n, r, i) => {
			let a = 0, o = n.length - 1, s, c;
			if (o >= 0 && (s = n[o]) instanceof _l) {
				if (!o && s.type == e && s.length == i) return s;
				(c = s.prop(H.lookAhead)) && (a = r[o] + s.length + c);
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
			let e = [H.contextHash, a];
			o = o ? [e].concat(o) : [e];
		}
		if (i > 25) {
			let e = [H.lookAhead, i];
			o = o ? [e].concat(o) : [e];
		}
		return new _l(e, t, n, r, o);
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
	return new _l(s[e.topID], _.reverse(), v.reverse(), y);
}
var Pl = /* @__PURE__ */ new WeakMap();
function Fl(e, t) {
	if (!e.isAnonymous || t instanceof yl || t.type != e) return 1;
	let n = Pl.get(t);
	if (n == null) {
		n = 1;
		for (let r of t.children) {
			if (r.type != e || !(r instanceof _l)) {
				n = 1;
				break;
			}
			n += Fl(e, r);
		}
		Pl.set(t, n);
	}
	return n;
}
function Il(e, t, n, r, i, a, o, s, c) {
	let l = 0;
	for (let n = r; n < i; n++) l += Fl(e, t[n]);
	let u = Math.ceil(l * 1.5 / 8), d = [], f = [];
	function p(t, n, r, i, o) {
		for (let s = r; s < i;) {
			let r = s, l = n[s], m = Fl(e, t[s]);
			for (s++; s < i; s++) {
				let n = Fl(e, t[s]);
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
				d.push(Il(e, t, n, r, s, l, i, null, c));
			}
			f.push(l + o - a);
		}
	}
	return p(t, n, r, i, 0), (s || c)(d, f, o);
}
var Ll = class e {
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
}, Rl = class {
	startParse(e, t, n) {
		return typeof e == "string" && (e = new zl(e)), n = n ? n.length ? n.map((e) => new dl(e.from, e.to)) : [new dl(0, 0)] : [new dl(0, e.length)], this.createParse(e, t || [], n);
	}
	parse(e, t, n) {
		let r = this.startParse(e, t, n);
		for (;;) {
			let e = r.advance();
			if (e) return e;
		}
	}
}, zl = class {
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
new H({ perNode: !0 });
//#endregion
//#region node_modules/@lezer/highlight/dist/index.js
var Bl = 0, Vl = class e {
	constructor(e, t, n, r) {
		this.name = e, this.set = t, this.base = n, this.modified = r, this.id = Bl++;
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
		let t = new Ul(e);
		return (e) => e.modified.indexOf(t) > -1 ? e : Ul.get(e.base || e, e.modified.concat(t).sort((e, t) => e.id - t.id));
	}
}, Hl = 0, Ul = class e {
	constructor(e) {
		this.name = e, this.instances = [], this.id = Hl++;
	}
	static get(t, n) {
		if (!n.length) return t;
		let r = n[0].instances.find((e) => e.base == t && Wl(n, e.modified));
		if (r) return r;
		let i = [], a = new Vl(t.name, i, t, n);
		for (let e of n) e.instances.push(a);
		let o = Gl(n);
		for (let n of t.set) if (!n.modified.length) for (let t of o) i.push(e.get(n, t));
		return a;
	}
};
function Wl(e, t) {
	return e.length == t.length && e.every((e, n) => e == t[n]);
}
function Gl(e) {
	let t = [[]];
	for (let n = 0; n < e.length; n++) for (let r = 0, i = t.length; r < i; r++) t.push(t[r].concat(e[n]));
	return t.sort((e, t) => t.length - e.length);
}
function Kl(e) {
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
			t[s] = new Jl(r, i, o > 0 ? n.slice(0, o) : null).sort(t[s]);
		}
	}
	return ql.add(t);
}
var ql = new H({ combine(e, t) {
	let n, r, i;
	for (; e || t;) {
		if (!e || t && e.depth >= t.depth ? (i = t, t = t.next) : (i = e, e = e.next), n && n.mode == i.mode && !i.context && !n.context) continue;
		let a = new Jl(i.tags, i.mode, i.context);
		n ? n.next = a : r = a, n = a;
	}
	return r;
} }), Jl = class {
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
Jl.empty = new Jl([], 2, null);
function Yl(e, t) {
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
function Xl(e, t) {
	let n = null;
	for (let r of e) {
		let e = r.style(t);
		e && (n = n ? n + " " + e : e);
	}
	return n;
}
function Zl(e, t, n, r = 0, i = e.length) {
	let a = new Ql(r, Array.isArray(t) ? t : [t], n);
	a.highlightRange(e.cursor(), r, i, "", a.highlighters), a.flush(i);
}
var Ql = class {
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
		let c = r, l = $l(e) || Jl.empty, u = Xl(i, l.tags);
		if (u && (c && (c += " "), c += u, l.mode == 1 && (r += (r ? " " : "") + u)), this.startSpan(Math.max(t, o), c), l.opaque) return;
		let d = e.tree && e.tree.prop(H.mounted);
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
function $l(e) {
	let t = e.type.prop(ql);
	for (; t && t.context && !e.matchContext(t.context);) t = t.next;
	return t || null;
}
var W = Vl.define, eu = W(), tu = W(), nu = W(tu), ru = W(tu), iu = W(), au = W(iu), ou = W(iu), su = W(), cu = W(su), lu = W(), uu = W(), du = W(), fu = W(du), pu = W(), G = {
	comment: eu,
	lineComment: W(eu),
	blockComment: W(eu),
	docComment: W(eu),
	name: tu,
	variableName: W(tu),
	typeName: nu,
	tagName: W(nu),
	propertyName: ru,
	attributeName: W(ru),
	className: W(tu),
	labelName: W(tu),
	namespace: W(tu),
	macroName: W(tu),
	literal: iu,
	string: au,
	docString: W(au),
	character: W(au),
	attributeValue: W(au),
	number: ou,
	integer: W(ou),
	float: W(ou),
	bool: W(iu),
	regexp: W(iu),
	escape: W(iu),
	color: W(iu),
	url: W(iu),
	keyword: lu,
	self: W(lu),
	null: W(lu),
	atom: W(lu),
	unit: W(lu),
	modifier: W(lu),
	operatorKeyword: W(lu),
	controlKeyword: W(lu),
	definitionKeyword: W(lu),
	moduleKeyword: W(lu),
	operator: uu,
	derefOperator: W(uu),
	arithmeticOperator: W(uu),
	logicOperator: W(uu),
	bitwiseOperator: W(uu),
	compareOperator: W(uu),
	updateOperator: W(uu),
	definitionOperator: W(uu),
	typeOperator: W(uu),
	controlOperator: W(uu),
	punctuation: du,
	separator: W(du),
	bracket: fu,
	angleBracket: W(fu),
	squareBracket: W(fu),
	paren: W(fu),
	brace: W(fu),
	content: su,
	heading: cu,
	heading1: W(cu),
	heading2: W(cu),
	heading3: W(cu),
	heading4: W(cu),
	heading5: W(cu),
	heading6: W(cu),
	contentSeparator: W(su),
	list: W(su),
	quote: W(su),
	emphasis: W(su),
	strong: W(su),
	link: W(su),
	monospace: W(su),
	strikethrough: W(su),
	inserted: W(),
	deleted: W(),
	changed: W(),
	invalid: W(),
	meta: pu,
	documentMeta: W(pu),
	annotation: W(pu),
	processingInstruction: W(pu),
	definition: Vl.defineModifier("definition"),
	constant: Vl.defineModifier("constant"),
	function: Vl.defineModifier("function"),
	standard: Vl.defineModifier("standard"),
	local: Vl.defineModifier("local"),
	special: Vl.defineModifier("special")
};
for (let e in G) {
	let t = G[e];
	t instanceof Vl && (t.name = e);
}
Yl([
	{
		tag: G.link,
		class: "tok-link"
	},
	{
		tag: G.heading,
		class: "tok-heading"
	},
	{
		tag: G.emphasis,
		class: "tok-emphasis"
	},
	{
		tag: G.strong,
		class: "tok-strong"
	},
	{
		tag: G.keyword,
		class: "tok-keyword"
	},
	{
		tag: G.atom,
		class: "tok-atom"
	},
	{
		tag: G.bool,
		class: "tok-bool"
	},
	{
		tag: G.url,
		class: "tok-url"
	},
	{
		tag: G.labelName,
		class: "tok-labelName"
	},
	{
		tag: G.inserted,
		class: "tok-inserted"
	},
	{
		tag: G.deleted,
		class: "tok-deleted"
	},
	{
		tag: G.literal,
		class: "tok-literal"
	},
	{
		tag: G.string,
		class: "tok-string"
	},
	{
		tag: G.number,
		class: "tok-number"
	},
	{
		tag: [
			G.regexp,
			G.escape,
			G.special(G.string)
		],
		class: "tok-string2"
	},
	{
		tag: G.variableName,
		class: "tok-variableName"
	},
	{
		tag: G.local(G.variableName),
		class: "tok-variableName tok-local"
	},
	{
		tag: G.definition(G.variableName),
		class: "tok-variableName tok-definition"
	},
	{
		tag: G.special(G.variableName),
		class: "tok-variableName2"
	},
	{
		tag: G.definition(G.propertyName),
		class: "tok-propertyName tok-definition"
	},
	{
		tag: G.typeName,
		class: "tok-typeName"
	},
	{
		tag: G.namespace,
		class: "tok-namespace"
	},
	{
		tag: G.className,
		class: "tok-className"
	},
	{
		tag: G.macroName,
		class: "tok-macroName"
	},
	{
		tag: G.propertyName,
		class: "tok-propertyName"
	},
	{
		tag: G.operator,
		class: "tok-operator"
	},
	{
		tag: G.comment,
		class: "tok-comment"
	},
	{
		tag: G.meta,
		class: "tok-meta"
	},
	{
		tag: G.invalid,
		class: "tok-invalid"
	},
	{
		tag: G.punctuation,
		class: "tok-punctuation"
	}
]);
//#endregion
//#region node_modules/@codemirror/language/dist/index.js
var mu = /*@__PURE__*/ new H(), hu = /*@__PURE__*/ new H(), gu = class {
	constructor(e, t, n = [], r = "") {
		this.data = e, this.name = r, D.prototype.hasOwnProperty("tree") || Object.defineProperty(D.prototype, "tree", { get() {
			return K(this);
		} }), this.parser = t, this.extension = [Eu.of(this), D.languageData.of((e, t, n) => {
			let r = _u(e, t, n), i = r.type.prop(mu);
			if (!i) return [];
			let a = e.facet(i), o = r.type.prop(hu);
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
		return _u(e, t, n).type.prop(mu) == this.data;
	}
	findRegions(e) {
		let t = e.facet(Eu);
		if (t?.data == this.data) return [{
			from: 0,
			to: e.doc.length
		}];
		if (!t || !t.allowsNesting) return [];
		let n = [], r = (e, t) => {
			if (e.prop(mu) == this.data) {
				n.push({
					from: t,
					to: t + e.length
				});
				return;
			}
			let i = e.prop(H.mounted);
			if (i) {
				if (i.tree.prop(mu) == this.data) {
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
				i instanceof _l && r(i, e.positions[n] + t);
			}
		};
		return r(K(e), 0), n;
	}
	get allowsNesting() {
		return !0;
	}
};
gu.setState = /*@__PURE__*/ T.define();
function _u(e, t, n) {
	let r = e.facet(Eu), i = K(e).topNode;
	if (!r || r.allowsNesting) for (let e = i; e; e = e.enter(t, n, U.ExcludeBuffers | U.EnterBracketed)) e.type.isTop && (i = e);
	return i;
}
function K(e) {
	let t = e.field(gu.state, !1);
	return t ? t.tree : _l.empty;
}
var vu = class {
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
}, yu = null, bu = class e {
	constructor(e, t, n = [], r, i, a, o, s) {
		this.parser = e, this.state = t, this.fragments = n, this.tree = r, this.treeLen = i, this.viewport = a, this.skipped = o, this.scheduleOn = s, this.parse = null, this.tempSkipped = [];
	}
	static create(t, n, r) {
		return new e(t, n, [], _l.empty, 0, r, [], null);
	}
	startParse() {
		return this.parser.startParse(new vu(this.state.doc), this.fragments);
	}
	work(e, t) {
		return t != null && t >= this.state.doc.length && (t = void 0), this.tree != _l.empty && this.isDone(t ?? this.state.doc.length) ? (this.takeTree(), !0) : this.withContext(() => {
			if (typeof e == "number") {
				let t = Date.now() + e;
				e = () => Date.now() > t;
			}
			for (this.parse ||= this.startParse(), t != null && (this.parse.stoppedAt == null || this.parse.stoppedAt > t) && t < this.state.doc.length && this.parse.stopAt(t);;) {
				let n = this.parse.advance();
				if (n) {
					if (this.fragments = this.withoutTempSkipped(Ll.addTree(n, this.fragments, this.parse.stoppedAt != null)), this.treeLen = this.parse.stoppedAt ?? this.state.doc.length, this.tree = n, this.parse = null, this.treeLen < (t ?? this.state.doc.length)) this.parse = this.startParse();
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
		}), this.treeLen = e, this.tree = t, this.fragments = this.withoutTempSkipped(Ll.addTree(this.tree, this.fragments, !0)), this.parse = null);
	}
	withContext(e) {
		let t = yu;
		yu = this;
		try {
			return e();
		} finally {
			yu = t;
		}
	}
	withoutTempSkipped(e) {
		for (let t; t = this.tempSkipped.pop();) e = xu(e, t.from, t.to);
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
			})), r = Ll.applyChanges(r, e), i = _l.empty, a = 0, o = {
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
			n < e.to && r > e.from && (this.fragments = xu(this.fragments, n, r), this.skipped.splice(t--, 1));
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
		return new class extends Rl {
			createParse(t, n, r) {
				let i = r[0].from, a = r[r.length - 1].to;
				return {
					parsedPos: i,
					advance() {
						let t = yu;
						if (t) {
							for (let e of r) t.tempSkipped.push(e);
							e && (t.scheduleOn = t.scheduleOn ? Promise.all([t.scheduleOn, e]) : e);
						}
						return this.parsedPos = a, new _l(ml.none, [], [], a - i);
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
		return yu;
	}
};
function xu(e, t, n) {
	return Ll.applyChanges(e, [{
		fromA: t,
		toA: n,
		fromB: t,
		toB: n
	}]);
}
var Su = class e {
	constructor(e) {
		this.context = e, this.tree = e.tree;
	}
	apply(t) {
		if (!t.docChanged && this.tree == this.context.tree) return this;
		let n = this.context.changes(t.changes, t.state), r = this.context.treeLen == t.startState.doc.length ? void 0 : Math.max(t.changes.mapPos(this.context.treeLen), n.viewport.to);
		return n.work(20, r) || n.takeTree(), new e(n);
	}
	static init(t) {
		let n = Math.min(3e3, t.doc.length), r = bu.create(t.facet(Eu).parser, t, {
			from: 0,
			to: n
		});
		return r.work(20, n) || r.takeTree(), new e(r);
	}
};
gu.state = /*@__PURE__*/ He.define({
	create: Su.init,
	update(e, t) {
		for (let e of t.effects) if (e.is(gu.setState)) return e.value;
		return t.startState.facet(Eu) == t.state.facet(Eu) ? e.apply(t) : Su.init(t.state);
	}
});
var Cu = (e) => {
	let t = setTimeout(() => e(), 500);
	return () => clearTimeout(t);
};
typeof requestIdleCallback < "u" && (Cu = (e) => {
	let t = -1, n = setTimeout(() => {
		t = requestIdleCallback(e, { timeout: 400 });
	}, 100);
	return () => t < 0 ? clearTimeout(n) : cancelIdleCallback(t);
});
var wu = typeof navigator < "u" && navigator.scheduling?.isInputPending ? () => navigator.scheduling.isInputPending() : null, Tu = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.view = e, this.working = null, this.workScheduled = 0, this.chunkEnd = -1, this.chunkBudget = -1, this.work = this.work.bind(this), this.scheduleWork();
	}
	update(e) {
		let t = this.view.state.field(gu.state).context;
		(t.updateViewport(e.view.viewport) || this.view.viewport.to > t.treeLen) && this.scheduleWork(), (e.docChanged || e.selectionSet) && (this.view.hasFocus && (this.chunkBudget += 50), this.scheduleWork()), this.checkAsyncSchedule(t);
	}
	scheduleWork() {
		if (this.working) return;
		let { state: e } = this.view, t = e.field(gu.state);
		(t.tree != t.context.tree || !t.context.isDone(e.doc.length)) && (this.working = Cu(this.work));
	}
	work(e) {
		this.working = null;
		let t = Date.now();
		if (this.chunkEnd < t && (this.chunkEnd < 0 || this.view.hasFocus) && (this.chunkEnd = t + 3e4, this.chunkBudget = 3e3), this.chunkBudget <= 0) return;
		let { state: n, viewport: { to: r } } = this.view, i = n.field(gu.state);
		if (i.tree == i.context.tree && i.context.isDone(r + 1e5)) return;
		let a = Date.now() + Math.min(this.chunkBudget, 100, e && !wu ? Math.max(25, e.timeRemaining() - 5) : 1e9), o = i.context.treeLen < r && n.doc.length > r + 1e3, s = i.context.work(() => wu && wu() || Date.now() > a, r + (o ? 0 : 1e5));
		this.chunkBudget -= Date.now() - t, (s || this.chunkBudget <= 0) && (i.context.takeTree(), this.view.dispatch({ effects: gu.setState.of(new Su(i.context)) })), this.chunkBudget > 0 && !(s && !o) && this.scheduleWork(), this.checkAsyncSchedule(i.context);
	}
	checkAsyncSchedule(e) {
		e.scheduleOn &&= (this.workScheduled++, e.scheduleOn.then(() => this.scheduleWork()).catch((e) => Lr(this.view.state, e)).then(() => this.workScheduled--), null);
	}
	destroy() {
		this.working && this.working();
	}
	isWorking() {
		return !!(this.working || this.workScheduled > 0);
	}
}, { eventHandlers: { focus() {
	this.scheduleWork();
} } }), Eu = /*@__PURE__*/ w.define({
	combine(e) {
		return e.length ? e[0] : null;
	},
	enables: (e) => [
		gu.state,
		Tu,
		V.contentAttributes.compute([e], (t) => {
			let n = t.facet(e);
			return n && n.name ? { "data-language": n.name } : {};
		})
	]
}), Du = /*@__PURE__*/ w.define(), Ou = /*@__PURE__*/ w.define({ combine: (e) => {
	if (!e.length) return "  ";
	let t = e[0];
	if (!t || /\S/.test(t) || Array.from(t).some((e) => e != t[0])) throw Error("Invalid indent unit: " + JSON.stringify(e[0]));
	return t;
} });
function ku(e) {
	let t = e.facet(Ou);
	return t.charCodeAt(0) == 9 ? e.tabSize * t.length : t.length;
}
function Au(e, t) {
	let n = "", r = e.tabSize, i = e.facet(Ou)[0];
	if (i == "	") {
		for (; t >= r;) n += "	", t -= r;
		i = " ";
	}
	for (let e = 0; e < t; e++) n += i;
	return n;
}
function ju(e, t) {
	e instanceof D && (e = new Mu(e));
	for (let n of e.state.facet(Du)) {
		let r = n(e, t);
		if (r !== void 0) return r;
	}
	let n = K(e.state);
	return n.length >= t ? Pu(e, n, t) : null;
}
var Mu = class {
	constructor(e, t = {}) {
		this.state = e, this.options = t, this.unit = ku(e);
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
		return Bt(e, this.state.tabSize, t);
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
}, Nu = /*@__PURE__*/ new H();
function Pu(e, t, n) {
	let r = t.resolveStack(n), i = t.resolveInner(n, -1).resolve(n, 0).enterUnfinishedNodesBefore(n);
	if (i != r.node) {
		let e = [];
		for (let t = i; t && !(t.from < r.node.from || t.to > r.node.to || t.from == r.node.from && t.type == r.node.type); t = t.parent) e.push(t);
		for (let t = e.length - 1; t >= 0; t--) r = {
			node: e[t],
			next: r
		};
	}
	return Fu(r, e, n);
}
function Fu(e, t, n) {
	for (let r = e; r; r = r.next) {
		let e = Lu(r.node);
		if (e) return e(zu.create(t, n, r));
	}
	return 0;
}
function Iu(e) {
	return e.pos == e.options.simulateBreak && e.options.simulateDoubleBreak;
}
function Lu(e) {
	let t = e.type.prop(Nu);
	if (t) return t;
	let n = e.firstChild, r;
	if (n && (r = n.type.prop(H.closedBy))) {
		let t = e.lastChild, n = t && r.indexOf(t.name) > -1;
		return (e) => Hu(e, !0, 1, void 0, n && !Iu(e) ? t.from : void 0);
	}
	return e.parent == null ? Ru : null;
}
function Ru() {
	return 0;
}
var zu = class e extends Mu {
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
			if (Bu(n, e)) break;
			t = this.state.doc.lineAt(n.from);
		}
		return this.lineIndent(t.from);
	}
	continue() {
		return Fu(this.context.next, this.base, this.pos);
	}
};
function Bu(e, t) {
	for (let n = t; n; n = n.parent) if (e == n) return !0;
	return !1;
}
function Vu(e) {
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
function Hu(e, t, n, r, i) {
	let a = e.textAfter, o = a.match(/^\s*/)[0].length, s = r && a.slice(o, o + r.length) == r || i == e.pos + o, c = t ? Vu(e) : null;
	return c ? s ? e.column(c.from) : e.column(c.to) : e.baseIndent + (s ? 0 : e.unit * n);
}
var Uu = 200;
function Wu() {
	return D.transactionFilter.of((e) => {
		if (!e.docChanged || !e.isUserEvent("input.type") && !e.isUserEvent("input.complete")) return e;
		let t = e.startState.languageDataAt("indentOnInput", e.startState.selection.main.head);
		if (!t.length) return e;
		let n = e.newDoc, { head: r } = e.newSelection.main, i = n.lineAt(r);
		if (r > i.from + Uu) return e;
		let a = n.sliceString(i.from, r);
		if (!t.some((e) => e.test(a))) return e;
		let { state: o } = e, s = -1, c = [];
		for (let { head: e } of o.selection.ranges) {
			let t = o.doc.lineAt(e);
			if (t.from == s) continue;
			s = t.from;
			let n = ju(o, t.from);
			if (n == null) continue;
			let r = /^\s*/.exec(t.text)[0], i = Au(o, n);
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
var Gu = /*@__PURE__*/ w.define(), Ku = /*@__PURE__*/ new H();
function qu(e, t, n) {
	let r = K(e);
	if (r.length < n) return null;
	let i = r.resolveStack(n, 1), a = null;
	for (let o = i; o; o = o.next) {
		let i = o.node;
		if (i.to <= n || i.from > n) continue;
		if (a && i.from < t) break;
		let s = i.type.prop(Ku);
		if (s && (i.to < r.length - 50 || r.length == e.doc.length || !Ju(i))) {
			let r = s(i, e);
			r && r.from <= n && r.from >= t && r.to > n && (a = r);
		}
	}
	return a;
}
function Ju(e) {
	let t = e.lastChild;
	return t && t.to == e.to && t.type.isError;
}
function Yu(e, t, n) {
	for (let r of e.facet(Gu)) {
		let i = r(e, t, n);
		if (i) return i;
	}
	return qu(e, t, n);
}
function Xu(e, t) {
	let n = t.mapPos(e.from, 1), r = t.mapPos(e.to, -1);
	return n >= r ? void 0 : {
		from: n,
		to: r
	};
}
var Zu = /*@__PURE__*/ T.define({ map: Xu }), Qu = /*@__PURE__*/ T.define({ map: Xu });
function $u(e) {
	let t = [];
	for (let { head: n } of e.state.selection.ranges) t.some((e) => e.from <= n && e.to >= n) || t.push(e.lineBlockAt(n));
	return t;
}
var ed = /*@__PURE__*/ He.define({
	create() {
		return P.none;
	},
	update(e, t) {
		t.isUserEvent("delete") && t.changes.iterChangedRanges((t, n) => e = td(e, t, n)), e = e.map(t.changes);
		let n = [];
		for (let r of t.effects) r.is(Zu) && !rd(e, r.value.from, r.value.to) ? n.push(r.value) : r.is(Qu) && (e = e.update({
			filter: (e, t) => r.value.from != e || r.value.to != t,
			filterFrom: r.value.from,
			filterTo: r.value.to
		}));
		if (n.length) {
			let { preparePlaceholder: r } = t.state.facet(ud), i = n.map((e) => (r ? P.replace({ widget: new md(r(t.state, e)) }) : pd).range(e.from, e.to));
			e = e.update({ add: i });
		}
		return t.selection && (e = td(e, t.selection.main.head)), e;
	},
	provide: (e) => V.decorations.from(e),
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
			t.push(pd.range(r, i));
		}
		return P.set(t, !0);
	}
});
function td(e, t, n = t) {
	let r = !1;
	return e.between(t, n, (e, i) => {
		e < n && i > t && (r = !0);
	}), r ? e.update({
		filterFrom: t,
		filterTo: n,
		filter: (e, r) => e >= n || r <= t
	}) : e;
}
function nd(e, t, n) {
	var r;
	let i = null;
	return (r = e.field(ed, !1)) == null || r.between(t, n, (e, t) => {
		(!i || i.from > e) && (i = {
			from: e,
			to: t
		});
	}), i;
}
function rd(e, t, n) {
	let r = !1;
	return e.between(t, t, (e, i) => {
		e == t && i == n && (r = !0);
	}), r;
}
function id(e, t) {
	return e.field(ed, !1) ? t : t.concat(T.appendConfig.of(dd()));
}
var ad = (e) => {
	for (let t of $u(e)) {
		let n = Yu(e.state, t.from, t.to);
		if (n) return e.dispatch({ effects: id(e.state, [Zu.of(n), sd(e, n)]) }), !0;
	}
	return !1;
}, od = (e) => {
	if (!e.state.field(ed, !1)) return !1;
	let t = [];
	for (let n of $u(e)) {
		let r = nd(e.state, n.from, n.to);
		r && t.push(Qu.of(r), sd(e, r, !1));
	}
	return t.length && e.dispatch({ effects: t }), t.length > 0;
};
function sd(e, t, n = !0) {
	let r = e.state.doc.lineAt(t.from).number, i = e.state.doc.lineAt(t.to).number;
	return V.announce.of(`${e.state.phrase(n ? "Folded lines" : "Unfolded lines")} ${r} ${e.state.phrase("to")} ${i}.`);
}
var cd = [
	{
		key: "Ctrl-Shift-[",
		mac: "Cmd-Alt-[",
		run: ad
	},
	{
		key: "Ctrl-Shift-]",
		mac: "Cmd-Alt-]",
		run: od
	},
	{
		key: "Ctrl-Alt-[",
		run: (e) => {
			let { state: t } = e, n = [];
			for (let r = 0; r < t.doc.length;) {
				let i = e.lineBlockAt(r), a = Yu(t, i.from, i.to);
				a && n.push(Zu.of(a)), r = (a ? e.lineBlockAt(a.to) : i).to + 1;
			}
			return n.length && e.dispatch({ effects: id(e.state, n) }), !!n.length;
		}
	},
	{
		key: "Ctrl-Alt-]",
		run: (e) => {
			let t = e.state.field(ed, !1);
			if (!t || !t.size) return !1;
			let n = [];
			return t.between(0, e.state.doc.length, (e, t) => {
				n.push(Qu.of({
					from: e,
					to: t
				}));
			}), e.dispatch({ effects: n }), !0;
		}
	}
], ld = {
	placeholderDOM: null,
	preparePlaceholder: null,
	placeholderText: "…"
}, ud = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, ld);
} });
function dd(e) {
	let t = [ed, vd];
	return e && t.push(ud.of(e)), t;
}
function fd(e, t) {
	let { state: n } = e, r = n.facet(ud), i = (t) => {
		let n = e.lineBlockAt(e.posAtDOM(t.target)), r = nd(e.state, n.from, n.to);
		r && e.dispatch({ effects: Qu.of(r) }), t.preventDefault();
	};
	if (r.placeholderDOM) return r.placeholderDOM(e, i, t);
	let a = document.createElement("span");
	return a.textContent = r.placeholderText, a.setAttribute("aria-label", n.phrase("folded code")), a.title = n.phrase("unfold"), a.className = "cm-foldPlaceholder", a.onclick = i, a;
}
var pd = /*@__PURE__*/ P.replace({ widget: /*@__PURE__*/ new class extends yn {
	toDOM(e) {
		return fd(e, null);
	}
}() }), md = class extends yn {
	constructor(e) {
		super(), this.value = e;
	}
	eq(e) {
		return this.value == e.value;
	}
	toDOM(e) {
		return fd(e, this.value);
	}
}, hd = {
	openText: "⌄",
	closedText: "›",
	markerDOM: null,
	domEventHandlers: {},
	foldingChanged: () => !1
}, gd = class extends Lc {
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
function _d(e = {}) {
	let t = {
		...hd,
		...e
	}, n = new gd(t, !0), r = new gd(t, !1), i = L.fromClass(class {
		constructor(e) {
			this.from = e.viewport.from, this.markers = this.buildMarkers(e);
		}
		update(e) {
			(e.docChanged || e.viewportChanged || e.startState.facet(Eu) != e.state.facet(Eu) || e.startState.field(ed, !1) != e.state.field(ed, !1) || K(e.startState) != K(e.state) || t.foldingChanged(e)) && (this.markers = this.buildMarkers(e.view));
		}
		buildMarkers(e) {
			let t = new kt();
			for (let i of e.viewportLineBlocks) {
				let a = nd(e.state, i.from, i.to) ? r : Yu(e.state, i.from, i.to) ? n : null;
				a && t.add(i.from, i.from, a);
			}
			return t.finish();
		}
	}), { domEventHandlers: a } = t;
	return [
		i,
		Hc({
			class: "cm-foldGutter",
			markers(e) {
				return e.plugin(i)?.markers || O.empty;
			},
			initialSpacer() {
				return new gd(t, !1);
			},
			domEventHandlers: {
				...a,
				click: (e, t, n) => {
					if (a.click && a.click(e, t, n)) return !0;
					let r = nd(e.state, t.from, t.to);
					if (r) return e.dispatch({ effects: Qu.of(r) }), !0;
					let i = Yu(e.state, t.from, t.to);
					return i ? (e.dispatch({ effects: Zu.of(i) }), !0) : !1;
				}
			}
		}),
		dd()
	];
}
var vd = /*@__PURE__*/ V.baseTheme({
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
}), yd = class e {
	constructor(e, t) {
		this.specs = e;
		let n;
		function r(e) {
			let t = Kt.newName();
			return (n ||= Object.create(null))["." + t] = e, t;
		}
		let i = typeof t.all == "string" ? t.all : t.all ? r(t.all) : void 0, a = t.scope;
		this.scope = a instanceof gu ? (e) => e.prop(mu) == a.data : a ? (e) => e == a : void 0, this.style = Yl(e.map((e) => ({
			tag: e.tag,
			class: e.class || r(Object.assign({}, e, { tag: null }))
		})), { all: i }).style, this.module = n ? new Kt(n) : null, this.themeType = t.themeType;
	}
	static define(t, n) {
		return new e(t, n || {});
	}
}, bd = /*@__PURE__*/ w.define(), xd = /*@__PURE__*/ w.define({ combine(e) {
	return e.length ? [e[0]] : null;
} });
function Sd(e) {
	let t = e.facet(bd);
	return t.length ? t : e.facet(xd);
}
function Cd(e, t) {
	let n = [Td], r;
	return e instanceof yd && (e.module && n.push(V.styleModule.of(e.module)), r = e.themeType), t?.fallback ? n.push(xd.of(e)) : r ? n.push(bd.computeN([V.darkTheme], (t) => t.facet(V.darkTheme) == (r == "dark") ? [e] : [])) : n.push(bd.of(e)), n;
}
var wd = class {
	constructor(e) {
		this.markCache = Object.create(null), this.tree = K(e.state), this.decorations = this.buildDeco(e, Sd(e.state)), this.decoratedTo = e.viewport.to;
	}
	update(e) {
		let t = K(e.state), n = Sd(e.state), r = n != Sd(e.startState), { viewport: i } = e.view, a = e.changes.mapPos(this.decoratedTo, 1);
		t.length < i.to && !r && t.type == this.tree.type && a >= i.to ? (this.decorations = this.decorations.map(e.changes), this.decoratedTo = a) : (t != this.tree || e.viewportChanged || r) && (this.tree = t, this.decorations = this.buildDeco(e.view, n), this.decoratedTo = i.to);
	}
	buildDeco(e, t) {
		if (!t || !this.tree.length) return P.none;
		let n = new kt();
		for (let { from: r, to: i } of e.visibleRanges) Zl(this.tree, t, (e, t, r) => {
			n.add(e, t, this.markCache[r] || (this.markCache[r] = P.mark({ class: r })));
		}, r, i);
		return n.finish();
	}
}, Td = /*@__PURE__*/ Ge.high(/*@__PURE__*/ L.fromClass(wd, { decorations: (e) => e.decorations })), Ed = /*@__PURE__*/ yd.define([
	{
		tag: G.meta,
		color: "#404740"
	},
	{
		tag: G.link,
		textDecoration: "underline"
	},
	{
		tag: G.heading,
		textDecoration: "underline",
		fontWeight: "bold"
	},
	{
		tag: G.emphasis,
		fontStyle: "italic"
	},
	{
		tag: G.strong,
		fontWeight: "bold"
	},
	{
		tag: G.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: G.keyword,
		color: "#708"
	},
	{
		tag: [
			G.atom,
			G.bool,
			G.url,
			G.contentSeparator,
			G.labelName
		],
		color: "#219"
	},
	{
		tag: [G.literal, G.inserted],
		color: "#164"
	},
	{
		tag: [G.string, G.deleted],
		color: "#a11"
	},
	{
		tag: [
			G.regexp,
			G.escape,
			/*@__PURE__*/ G.special(G.string)
		],
		color: "#e40"
	},
	{
		tag: /*@__PURE__*/ G.definition(G.variableName),
		color: "#00f"
	},
	{
		tag: /*@__PURE__*/ G.local(G.variableName),
		color: "#30a"
	},
	{
		tag: [G.typeName, G.namespace],
		color: "#085"
	},
	{
		tag: G.className,
		color: "#167"
	},
	{
		tag: [/*@__PURE__*/ G.special(G.variableName), G.macroName],
		color: "#256"
	},
	{
		tag: /*@__PURE__*/ G.definition(G.propertyName),
		color: "#00c"
	},
	{
		tag: G.comment,
		color: "#940"
	},
	{
		tag: G.invalid,
		color: "#f00"
	}
]), Dd = /*@__PURE__*/ V.baseTheme({
	"&.cm-focused .cm-matchingBracket": { backgroundColor: "#328c8252" },
	"&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "#bb555544" }
}), Od = 1e4, kd = "()[]{}", Ad = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, {
		afterCursor: !0,
		brackets: kd,
		maxScanDistance: Od,
		renderMatch: Nd
	});
} }), jd = /*@__PURE__*/ P.mark({ class: "cm-matchingBracket" }), Md = /*@__PURE__*/ P.mark({ class: "cm-nonmatchingBracket" });
function Nd(e) {
	let t = [], n = e.matched ? jd : Md;
	return t.push(n.range(e.start.from, e.start.to)), e.end && t.push(n.range(e.end.from, e.end.to)), t;
}
function Pd(e) {
	let t = [], n = e.facet(Ad);
	for (let r of e.selection.ranges) {
		if (!r.empty) continue;
		let i = Bd(e, r.head, -1, n) || r.head > 0 && Bd(e, r.head - 1, 1, n) || n.afterCursor && (Bd(e, r.head, 1, n) || r.head < e.doc.length && Bd(e, r.head + 1, -1, n));
		i && (t = t.concat(n.renderMatch(i, e)));
	}
	return P.set(t, !0);
}
var Fd = [/* @__PURE__ */ L.fromClass(class {
	constructor(e) {
		this.paused = !1, this.decorations = Pd(e.state);
	}
	update(e) {
		(e.docChanged || e.selectionSet || this.paused) && (e.view.composing ? (this.decorations = this.decorations.map(e.changes), this.paused = !0) : (this.decorations = Pd(e.state), this.paused = !1));
	}
}, { decorations: (e) => e.decorations }), Dd];
function Id(e = {}) {
	return [Ad.of(e), Fd];
}
var Ld = /*@__PURE__*/ new H();
function Rd(e, t, n) {
	let r = e.prop(t < 0 ? H.openedBy : H.closedBy);
	if (r) return r;
	if (e.name.length == 1) {
		let r = n.indexOf(e.name);
		if (r > -1 && r % 2 == +(t < 0)) return [n[r + t]];
	}
	return null;
}
function zd(e) {
	let t = e.type.prop(Ld);
	return t ? t(e.node) : e;
}
function Bd(e, t, n, r = {}) {
	let i = r.maxScanDistance || Od, a = r.brackets || kd, o = K(e), s = o.resolveInner(t, n);
	for (let r = s; r; r = r.parent) {
		let i = Rd(r.type, n, a);
		if (i && r.from < r.to) {
			let o = zd(r);
			if (o && (n > 0 ? t >= o.from && t < o.to : t > o.from && t <= o.to)) return Vd(e, t, n, r, o, i, a);
		}
	}
	return Hd(e, t, n, o, s.type, i, a);
}
function Vd(e, t, n, r, i, a, o) {
	let s = r.parent, c = {
		from: i.from,
		to: i.to
	}, l = 0, u = s?.cursor();
	if (u && (n < 0 ? u.childBefore(r.from) : u.childAfter(r.to))) do
		if (n < 0 ? u.to <= r.from : u.from >= r.to) {
			if (l == 0 && a.indexOf(u.type.name) > -1 && u.from < u.to) {
				let e = zd(u);
				return {
					start: c,
					end: e ? {
						from: e.from,
						to: e.to
					} : void 0,
					matched: !0
				};
			}
			if (Rd(u.type, n, o)) l++;
			else if (Rd(u.type, -n, o)) {
				if (l == 0) {
					let e = zd(u);
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
function Hd(e, t, n, r, i, a, o) {
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
var Ud = /*@__PURE__*/ Object.create(null), Wd = [ml.none], Gd = [], Kd = /*@__PURE__*/ Object.create(null), qd = /*@__PURE__*/ Object.create(null);
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
]) qd[e] = /*@__PURE__*/ Yd(Ud, t);
function Jd(e, t) {
	Gd.indexOf(e) > -1 || (Gd.push(e), console.warn(t));
}
function Yd(e, t) {
	let n = [];
	for (let r of t.split(" ")) {
		let t = [];
		for (let n of r.split(".")) {
			let r = e[n] || G[n];
			r ? typeof r == "function" ? t.length ? t = t.map(r) : Jd(n, `Modifier ${n} used at start of tag`) : t.length ? Jd(n, `Tag ${n} used as modifier`) : t = Array.isArray(r) ? r : [r] : Jd(n, `Unknown highlighting tag ${n}`);
		}
		for (let e of t) n.push(e);
	}
	if (!n.length) return 0;
	let r = t.replace(/ /g, "_"), i = r + " " + n.map((e) => e.id), a = Kd[i];
	if (a) return a.id;
	let o = Kd[i] = ml.define({
		id: Wd.length,
		name: r,
		props: [Kl({ [r]: n })]
	});
	return Wd.push(o), o.id;
}
F.RTL, F.LTR;
//#endregion
//#region node_modules/@codemirror/commands/dist/index.js
var Xd = (e) => {
	let { state: t } = e, n = t.doc.lineAt(t.selection.main.from), r = tf(e.state, n.from);
	return r.line ? Qd(e) : r.block ? ef(e) : !1;
};
function Zd(e, t) {
	return ({ state: n, dispatch: r }) => {
		if (n.readOnly) return !1;
		let i = e(t, n);
		return i ? (r(n.update(i)), !0) : !1;
	};
}
var Qd = /*@__PURE__*/ Zd(sf, 0), $d = /*@__PURE__*/ Zd(of, 0), ef = /*@__PURE__*/ Zd((e, t) => of(e, t, af(t)), 0);
function tf(e, t) {
	let n = e.languageDataAt("commentTokens", t, 1);
	return n.length ? n[0] : {};
}
var nf = 50;
function rf(e, { open: t, close: n }, r, i) {
	let a = e.sliceDoc(r - nf, r), o = e.sliceDoc(i, i + nf), s = /\s*$/.exec(a)[0].length, c = /^\s*/.exec(o)[0].length, l = a.length - s;
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
	i - r <= 100 ? u = d = e.sliceDoc(r, i) : (u = e.sliceDoc(r, r + nf), d = e.sliceDoc(i - nf, i));
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
function af(e) {
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
function of(e, t, n = t.selection.ranges) {
	let r = n.map((e) => tf(t, e.from).block);
	if (!r.every((e) => e)) return null;
	let i = n.map((e, n) => rf(t, r[n], e.from, e.to));
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
function sf(e, t, n = t.selection.ranges) {
	let r = [], i = -1;
	ranges: for (let { from: e, to: a } of n) {
		let n = r.length, o = 1e9, s;
		for (let n = e; n <= a;) {
			let c = t.doc.lineAt(n);
			if (s == null && (s = tf(t, c.from).line, !s)) continue ranges;
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
var cf = /*@__PURE__*/ ot.define(), lf = /*@__PURE__*/ ot.define(), uf = /*@__PURE__*/ w.define(), df = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, {
		minDepth: 100,
		newGroupDelay: 500,
		joinToEvent: (e, t) => t
	}, {
		minDepth: Math.max,
		newGroupDelay: Math.min,
		joinToEvent: (e, t) => (n, r) => e(n, r) || t(n, r)
	});
} }), ff = /*@__PURE__*/ He.define({
	create() {
		return jf.empty;
	},
	update(e, t) {
		let n = t.state.facet(df), r = t.annotation(cf);
		if (r) {
			let i = yf.fromTransaction(t, r.selection), a = r.side, o = a == 0 ? e.undone : e.done;
			return o = i ? bf(o, o.length, n.minDepth, i) : Ef(o, t.startState.selection), new jf(a == 0 ? r.rest : o, a == 0 ? o : r.rest);
		}
		let i = t.annotation(lf);
		if ((i == "full" || i == "before") && (e = e.isolate()), t.annotation(lt.addToHistory) === !1) return t.changes.empty ? e : e.addMapping(t.changes.desc);
		let a = yf.fromTransaction(t), o = t.annotation(lt.time), s = t.annotation(lt.userEvent);
		return a ? e = e.addChanges(a, o, s, n, t) : t.selection && (e = e.addSelection(t.startState.selection, o, s, n.newGroupDelay)), (i == "full" || i == "after") && (e = e.isolate()), e;
	},
	toJSON(e) {
		return {
			done: e.done.map((e) => e.toJSON()),
			undone: e.undone.map((e) => e.toJSON())
		};
	},
	fromJSON(e) {
		return new jf(e.done.map(yf.fromJSON), e.undone.map(yf.fromJSON));
	}
});
function pf(e = {}) {
	return [
		ff,
		df.of(e),
		V.domEventHandlers({ beforeinput(e, t) {
			let n = e.inputType == "historyUndo" ? hf : e.inputType == "historyRedo" ? gf : null;
			return n ? (e.preventDefault(), n(t)) : !1;
		} })
	];
}
function mf(e, t) {
	return function({ state: n, dispatch: r }) {
		if (!t && n.readOnly) return !1;
		let i = n.field(ff, !1);
		if (!i) return !1;
		let a = i.pop(e, n, t);
		return a ? (r(a), !0) : !1;
	};
}
var hf = /*@__PURE__*/ mf(0, !1), gf = /*@__PURE__*/ mf(1, !1), _f = /*@__PURE__*/ mf(0, !0), vf = /*@__PURE__*/ mf(1, !0), yf = class e {
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
		return new e(t.changes && De.fromJSON(t.changes), [], t.mapped && Ee.fromJSON(t.mapped), t.startSelection && C.fromJSON(t.startSelection), t.selectionsAfter.map(C.fromJSON));
	}
	static fromTransaction(t, n) {
		let r = wf;
		for (let e of t.startState.facet(uf)) {
			let n = e(t);
			n.length && (r = r.concat(n));
		}
		return !r.length && t.changes.empty ? null : new e(t.changes.invert(t.startState.doc), r, void 0, n || t.startState.selection, wf);
	}
	static selection(t) {
		return new e(void 0, wf, void 0, void 0, t);
	}
};
function bf(e, t, n, r) {
	let i = t + 1 > n + 20 ? t - n - 1 : 0, a = e.slice(i, t);
	return a.push(r), a;
}
function xf(e, t) {
	let n = [], r = !1;
	return e.iterChangedRanges((e, t) => n.push(e, t)), t.iterChangedRanges((e, t, i, a) => {
		for (let e = 0; e < n.length;) {
			let t = n[e++], o = n[e++];
			a >= t && i <= o && (r = !0);
		}
	}), r;
}
function Sf(e, t) {
	return e.ranges.length == t.ranges.length && e.ranges.filter((e, n) => e.empty != t.ranges[n].empty).length === 0;
}
function Cf(e, t) {
	return e.length ? t.length ? e.concat(t) : e : t;
}
var wf = [], Tf = 200;
function Ef(e, t) {
	if (e.length) {
		let n = e[e.length - 1], r = n.selectionsAfter.slice(Math.max(0, n.selectionsAfter.length - Tf));
		return r.length && r[r.length - 1].eq(t) ? e : (r.push(t), bf(e, e.length - 1, 1e9, n.setSelAfter(r)));
	}
	return [yf.selection([t])];
}
function Df(e) {
	let t = e[e.length - 1], n = e.slice();
	return n[e.length - 1] = t.setSelAfter(t.selectionsAfter.slice(0, t.selectionsAfter.length - 1)), n;
}
function Of(e, t) {
	if (!e.length) return e;
	let n = e.length, r = wf;
	for (; n;) {
		let i = kf(e[n - 1], t, r);
		if (i.changes && !i.changes.empty || i.effects.length) {
			let t = e.slice(0, n);
			return t[n - 1] = i, t;
		}
		t = i.mapped, n--, r = i.selectionsAfter;
	}
	return r.length ? [yf.selection(r)] : wf;
}
function kf(e, t, n) {
	let r = Cf(e.selectionsAfter.length ? e.selectionsAfter.map((e) => e.map(t)) : wf, n);
	if (!e.changes) return yf.selection(r);
	let i = e.changes.map(t), a = t.mapDesc(e.changes, !0), o = e.mapped ? e.mapped.composeDesc(a) : a;
	return new yf(i, T.mapEffects(e.effects, t), o, e.startSelection.map(a), r);
}
var Af = /^(input\.type|delete)($|\.)/, jf = class e {
	constructor(e, t, n = 0, r = void 0) {
		this.done = e, this.undone = t, this.prevTime = n, this.prevUserEvent = r;
	}
	isolate() {
		return this.prevTime ? new e(this.done, this.undone) : this;
	}
	addChanges(t, n, r, i, a) {
		let o = this.done, s = o[o.length - 1];
		return o = s && s.changes && !s.changes.empty && t.changes && (!r || Af.test(r)) && (!s.selectionsAfter.length && n - this.prevTime < i.newGroupDelay && i.joinToEvent(a, xf(s.changes, t.changes)) || r == "input.type.compose") ? bf(o, o.length - 1, i.minDepth, new yf(t.changes.compose(s.changes), Cf(T.mapEffects(t.effects, s.changes), s.effects), s.mapped, s.startSelection, wf)) : bf(o, o.length, i.minDepth, t), new e(o, wf, n, r);
	}
	addSelection(t, n, r, i) {
		let a = this.done.length ? this.done[this.done.length - 1].selectionsAfter : wf;
		return a.length > 0 && n - this.prevTime < i && r == this.prevUserEvent && r && /^select($|\.)/.test(r) && Sf(a[a.length - 1], t) ? this : new e(Ef(this.done, t), this.undone, n, r);
	}
	addMapping(t) {
		return new e(Of(this.done, t), Of(this.undone, t), this.prevTime, this.prevUserEvent);
	}
	pop(e, t, n) {
		let r = e == 0 ? this.done : this.undone;
		if (r.length == 0) return null;
		let i = r[r.length - 1], a = i.selectionsAfter[0] || (i.startSelection ? i.startSelection.map(i.changes.invertedDesc, 1) : t.selection);
		if (n && i.selectionsAfter.length) return t.update({
			selection: i.selectionsAfter[i.selectionsAfter.length - 1],
			annotations: cf.of({
				side: e,
				rest: Df(r),
				selection: a
			}),
			userEvent: e == 0 ? "select.undo" : "select.redo",
			scrollIntoView: !0
		});
		if (i.changes) {
			let n = r.length == 1 ? wf : r.slice(0, r.length - 1);
			return i.mapped && (n = Of(n, i.mapped)), t.update({
				changes: i.changes,
				selection: i.startSelection,
				effects: i.effects,
				annotations: cf.of({
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
jf.empty = /*@__PURE__*/ new jf(wf, wf);
var Mf = [
	{
		key: "Mod-z",
		run: hf,
		preventDefault: !0
	},
	{
		key: "Mod-y",
		mac: "Mod-Shift-z",
		run: gf,
		preventDefault: !0
	},
	{
		linux: "Ctrl-Shift-z",
		run: gf,
		preventDefault: !0
	},
	{
		key: "Mod-u",
		run: _f,
		preventDefault: !0
	},
	{
		key: "Alt-u",
		mac: "Mod-Shift-u",
		run: vf,
		preventDefault: !0
	}
];
function Nf(e, t) {
	return C.create(e.ranges.map(t), e.mainIndex);
}
function Pf(e, t) {
	return e.update({
		selection: t,
		scrollIntoView: !0,
		userEvent: "select"
	});
}
function Ff({ state: e, dispatch: t }, n) {
	let r = Nf(e.selection, n);
	return !r.eq(e.selection, !0) && (t(Pf(e, r)), !0);
}
function If(e, t) {
	return C.cursor(t ? e.to : e.from);
}
function Lf(e, t) {
	return Ff(e, (n) => n.empty ? e.moveByChar(n, t) : If(n, t));
}
function q(e) {
	return e.textDirectionAt(e.state.selection.main.head) == F.LTR;
}
var Rf = (e) => Lf(e, !q(e)), zf = (e) => Lf(e, q(e));
function Bf(e, t) {
	return Ff(e, (n) => n.empty ? e.moveByGroup(n, t) : If(n, t));
}
var Vf = (e) => Bf(e, !q(e)), Hf = (e) => Bf(e, q(e));
typeof Intl < "u" && Intl.Segmenter;
function Uf(e, t, n) {
	if (t.type.prop(n)) return !0;
	let r = t.to - t.from;
	return r && (r > 2 || /[^\s,.;:]/.test(e.sliceDoc(t.from, t.to))) || t.firstChild;
}
function Wf(e, t, n) {
	let r = K(e).resolveInner(t.head), i = n ? H.closedBy : H.openedBy;
	for (let a = t.head;;) {
		let t = n ? r.childAfter(a) : r.childBefore(a);
		if (!t) break;
		Uf(e, t, i) ? r = t : a = n ? t.to : t.from;
	}
	let a = r.type.prop(i), o, s;
	return s = a && (o = n ? Bd(e, r.from, 1) : Bd(e, r.to, -1)) && o.matched ? n ? o.end.to : o.end.from : n ? r.to : r.from, C.cursor(s, n ? -1 : 1);
}
var Gf = (e) => Ff(e, (t) => Wf(e.state, t, !q(e))), Kf = (e) => Ff(e, (t) => Wf(e.state, t, q(e)));
function qf(e, t) {
	return Ff(e, (n) => {
		if (!n.empty) return If(n, t);
		let r = e.moveVertically(n, t);
		return r.head == n.head ? e.moveToLineBoundary(n, t) : r;
	});
}
var Jf = (e) => qf(e, !1), Yf = (e) => qf(e, !0);
function Xf(e) {
	let t = e.scrollDOM.clientHeight < e.scrollDOM.scrollHeight - 2, n = 0, r = 0, i;
	if (t) {
		for (let t of e.state.facet(V.scrollMargins)) {
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
function Zf(e, t) {
	let n = Xf(e), { state: r } = e, i = Nf(r.selection, (r) => r.empty ? e.moveVertically(r, t, n.height) : If(r, t));
	if (i.eq(r.selection)) return !1;
	let a;
	if (n.selfScroll) {
		let t = e.coordsAtPos(r.selection.main.head), o = e.scrollDOM.getBoundingClientRect(), s = o.top + n.marginTop, c = o.bottom - n.marginBottom;
		t && t.top > s && t.bottom < c && (a = V.scrollIntoView(i.main.head, {
			y: "start",
			yMargin: t.top - s
		}));
	}
	return e.dispatch(Pf(r, i), { effects: a }), !0;
}
var Qf = (e) => Zf(e, !1), $f = (e) => Zf(e, !0);
function ep(e, t, n) {
	let r = e.lineBlockAt(t.head), i = e.moveToLineBoundary(t, n);
	if (i.head == t.head && i.head != (n ? r.to : r.from) && (i = e.moveToLineBoundary(t, n, !1)), !n && i.head == r.from && r.length) {
		let n = /^\s*/.exec(e.state.sliceDoc(r.from, Math.min(r.from + 100, r.to)))[0].length;
		n && t.head != r.from + n && (i = C.cursor(r.from + n));
	}
	return i;
}
var tp = (e) => Ff(e, (t) => ep(e, t, !0)), np = (e) => Ff(e, (t) => ep(e, t, !1)), rp = (e) => Ff(e, (t) => ep(e, t, !q(e))), ip = (e) => Ff(e, (t) => ep(e, t, q(e))), ap = (e) => Ff(e, (t) => C.cursor(e.lineBlockAt(t.head).from, 1)), op = (e) => Ff(e, (t) => C.cursor(e.lineBlockAt(t.head).to, -1));
function sp(e, t, n) {
	let r = !1, i = Nf(e.selection, (t) => {
		let i = Bd(e, t.head, -1) || Bd(e, t.head, 1) || t.head > 0 && Bd(e, t.head - 1, 1) || t.head < e.doc.length && Bd(e, t.head + 1, -1);
		if (!i || !i.end) return t;
		r = !0;
		let a = i.start.from == t.head ? i.end.to : i.end.from;
		return n ? C.range(t.anchor, a) : C.cursor(a);
	});
	return r ? (t(Pf(e, i)), !0) : !1;
}
var cp = ({ state: e, dispatch: t }) => sp(e, t, !1);
function lp(e, t, n) {
	let r = Nf(e.state.selection, (e) => {
		e.undirectional && e.head >= e.anchor != t && (e = C.range(e.head, e.anchor));
		let r = n(e);
		return C.range(e.anchor, r.head, r.goalColumn, r.bidiLevel || void 0, r.assoc);
	});
	return !r.eq(e.state.selection) && (e.dispatch(Pf(e.state, r)), !0);
}
function up(e, t) {
	return lp(e, t, (n) => e.moveByChar(n, t));
}
var dp = (e) => up(e, !q(e)), fp = (e) => up(e, q(e));
function pp(e, t) {
	return lp(e, t, (n) => e.moveByGroup(n, t));
}
var mp = (e) => pp(e, !q(e)), hp = (e) => pp(e, q(e)), gp = (e) => {
	let t = !q(e);
	return lp(e, t, (n) => Wf(e.state, n, t));
}, _p = (e) => {
	let t = q(e);
	return lp(e, t, (n) => Wf(e.state, n, t));
};
function vp(e, t) {
	return lp(e, t, (n) => e.moveVertically(n, t));
}
var yp = (e) => vp(e, !1), bp = (e) => vp(e, !0);
function xp(e, t) {
	return lp(e, t, (n) => e.moveVertically(n, t, Xf(e).height));
}
var Sp = (e) => xp(e, !1), Cp = (e) => xp(e, !0), wp = (e) => lp(e, !0, (t) => ep(e, t, !0)), Tp = (e) => lp(e, !1, (t) => ep(e, t, !1)), Ep = (e) => {
	let t = !q(e);
	return lp(e, t, (n) => ep(e, n, t));
}, Dp = (e) => {
	let t = q(e);
	return lp(e, t, (n) => ep(e, n, t));
}, Op = (e) => lp(e, !1, (t) => C.cursor(e.lineBlockAt(t.head).from)), kp = (e) => lp(e, !0, (t) => C.cursor(e.lineBlockAt(t.head).to)), Ap = ({ state: e, dispatch: t }) => (t(Pf(e, { anchor: 0 })), !0), jp = ({ state: e, dispatch: t }) => (t(Pf(e, { anchor: e.doc.length })), !0), Mp = ({ state: e, dispatch: t }) => (t(Pf(e, {
	anchor: e.selection.main.anchor,
	head: 0
})), !0), Np = ({ state: e, dispatch: t }) => (t(Pf(e, {
	anchor: e.selection.main.anchor,
	head: e.doc.length
})), !0), Pp = ({ state: e, dispatch: t }) => (t(e.update({
	selection: {
		anchor: 0,
		head: e.doc.length
	},
	userEvent: "select"
})), !0), Fp = ({ state: e, dispatch: t }) => {
	let n = em(e).map(({ from: t, to: n }) => C.undirectionalRange(t, Math.min(n + 1, e.doc.length)));
	return t(e.update({
		selection: C.create(n),
		userEvent: "select"
	})), !0;
}, Ip = ({ state: e, dispatch: t }) => {
	let n = Nf(e.selection, (t) => {
		let n = K(e), r = n.resolveStack(t.from, 1);
		if (t.empty) {
			let e = n.resolveStack(t.from, -1);
			e.node.from >= r.node.from && e.node.to <= r.node.to && (r = e);
		}
		for (let e = r; e; e = e.next) {
			let { node: n } = e;
			if ((n.from < t.from && n.to >= t.to || n.to > t.to && n.from <= t.from) && e.next) return C.undirectionalRange(n.from, n.to);
		}
		return t;
	});
	return !n.eq(e.selection) && (t(Pf(e, n)), !0);
};
function Lp(e, t) {
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
	return i.length != r.ranges.length && (e.dispatch(Pf(n, C.create(i, i.length - 1))), !0);
}
var Rp = (e) => Lp(e, !1), zp = (e) => Lp(e, !0), Bp = ({ state: e, dispatch: t }) => {
	let n = e.selection, r = null;
	return n.ranges.length > 1 ? r = C.create([n.main]) : n.main.empty || (r = C.create([C.cursor(n.main.head)])), r ? (t(Pf(e, r)), !0) : !1;
};
function Vp(e, t) {
	if (e.state.readOnly) return !1;
	let n = "delete.selection", { state: r } = e, i = r.changeByRange((r) => {
		let { from: i, to: a } = r;
		if (i == a) {
			let o = t(r);
			o < i ? (n = "delete.backward", o = Hp(e, o, !1)) : o > i && (n = "delete.forward", o = Hp(e, o, !0)), i = Math.min(i, o), a = Math.max(a, o);
		} else i = Hp(e, i, !1), a = Hp(e, a, !0);
		return i == a ? { range: r } : {
			changes: {
				from: i,
				to: a
			},
			range: C.cursor(i, i < r.head ? -1 : 1)
		};
	});
	return !i.changes.empty && (e.dispatch(r.update(i, {
		scrollIntoView: !0,
		userEvent: n,
		effects: n == "delete.selection" ? V.announce.of(r.phrase("Selection deleted")) : void 0
	})), !0);
}
function Hp(e, t, n) {
	if (e instanceof V) for (let r of e.state.facet(V.atomicRanges).map((t) => t(e))) r.between(t, t, (e, r) => {
		e < t && r > t && (t = n ? r : e);
	});
	return t;
}
var Up = (e, t, n) => Vp(e, (r) => {
	let i = r.from, { state: a } = e, o = a.doc.lineAt(i), s, c;
	if (n && !t && i > o.from && i < o.from + 200 && !/[^ \t]/.test(s = o.text.slice(0, i - o.from))) {
		if (s[s.length - 1] == "	") return i - 1;
		let e = Bt(s, a.tabSize) % ku(a) || ku(a);
		for (let t = 0; t < e && s[s.length - 1 - t] == " "; t++) i--;
		c = i;
	} else c = x(o.text, i - o.from, t, t) + o.from, c == i && o.number != (t ? a.doc.lines : 1) ? c += t ? 1 : -1 : !t && /[\ufe00-\ufe0f]/.test(o.text.slice(c - o.from, i - o.from)) && (c = x(o.text, c - o.from, !1, !1) + o.from);
	return c;
}), Wp = (e) => Up(e, !1, !0), Gp = (e) => Up(e, !0, !1), Kp = (e, t) => Vp(e, (n) => {
	let r = n.head, { state: i } = e, a = i.doc.lineAt(r), o = i.charCategorizer(r);
	for (let e = null;;) {
		if (r == (t ? a.to : a.from)) {
			r == n.head && a.number != (t ? i.doc.lines : 1) && (r += t ? 1 : -1);
			break;
		}
		let s = x(a.text, r - a.from, t) + a.from, c = a.text.slice(Math.min(r, s) - a.from, Math.max(r, s) - a.from), l = o(c);
		if (e != null && l != e) break;
		(c != " " || r != n.head) && (e = l), r = s;
	}
	return r;
}), qp = (e) => Kp(e, !1), Jp = (e) => Kp(e, !0), Yp = (e) => Vp(e, (t) => {
	let n = e.lineBlockAt(t.head).to;
	return t.head < n ? n : Math.min(e.state.doc.length, t.head + 1);
}), Xp = (e) => Vp(e, (t) => {
	let n = e.moveToLineBoundary(t, !1).head;
	return t.head > n ? n : Math.max(0, t.head - 1);
}), Zp = (e) => Vp(e, (t) => {
	let n = e.moveToLineBoundary(t, !0).head;
	return t.head < n ? n : Math.min(e.state.doc.length, t.head + 1);
}), Qp = ({ state: e, dispatch: t }) => {
	if (e.readOnly) return !1;
	let n = e.changeByRange((e) => ({
		changes: {
			from: e.from,
			to: e.to,
			insert: b.of(["", ""])
		},
		range: C.cursor(e.from)
	}));
	return t(e.update(n, {
		scrollIntoView: !0,
		userEvent: "input"
	})), !0;
}, $p = ({ state: e, dispatch: t }) => {
	if (e.readOnly) return !1;
	let n = e.changeByRange((t) => {
		if (!t.empty || t.from == 0 || t.from == e.doc.length) return { range: t };
		let n = t.from, r = e.doc.lineAt(n), i = n == r.from ? n - 1 : x(r.text, n - r.from, !1) + r.from, a = n == r.to ? n + 1 : x(r.text, n - r.from, !0) + r.from;
		return {
			changes: {
				from: i,
				to: a,
				insert: e.doc.slice(n, a).append(e.doc.slice(i, n))
			},
			range: C.cursor(a)
		};
	});
	return !n.changes.empty && (t(e.update(n, {
		scrollIntoView: !0,
		userEvent: "move.character"
	})), !0);
};
function em(e) {
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
function tm(e, t, n) {
	if (e.readOnly) return !1;
	let r = [], i = [];
	for (let t of em(e)) {
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
			for (let n of t.ranges) i.push(C.range(Math.min(e.doc.length, n.anchor + o), Math.min(e.doc.length, n.head + o)));
		} else {
			r.push({
				from: a.from,
				to: t.from
			}, {
				from: t.to,
				insert: e.lineBreak + a.text
			});
			for (let e of t.ranges) i.push(C.range(e.anchor - o, e.head - o));
		}
	}
	return r.length ? (t(e.update({
		changes: r,
		scrollIntoView: !0,
		selection: C.create(i, e.selection.mainIndex),
		userEvent: "move.line"
	})), !0) : !1;
}
var nm = ({ state: e, dispatch: t }) => tm(e, t, !1), rm = ({ state: e, dispatch: t }) => tm(e, t, !0);
function im(e, t, n) {
	if (e.readOnly) return !1;
	let r = [];
	for (let t of em(e)) n ? r.push({
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
var am = ({ state: e, dispatch: t }) => im(e, t, !1), om = ({ state: e, dispatch: t }) => im(e, t, !0), sm = (e) => {
	if (e.state.readOnly) return !1;
	let { state: t } = e, n = t.changes(em(t).map(({ from: e, to: n }) => (e > 0 ? e-- : n < t.doc.length && n++, {
		from: e,
		to: n
	}))), r = Nf(t.selection, (t) => {
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
function cm(e, t) {
	if (/\(\)|\[\]|\{\}/.test(e.sliceDoc(t - 1, t + 1))) return {
		from: t,
		to: t
	};
	let n = K(e).resolveInner(t), r = n.childBefore(t), i = n.childAfter(t), a;
	return r && i && r.to <= t && i.from >= t && (a = r.type.prop(H.closedBy)) && a.indexOf(i.name) > -1 && e.doc.lineAt(r.to).from == e.doc.lineAt(i.from).from && !/\S/.test(e.sliceDoc(r.to, i.from)) ? {
		from: r.to,
		to: i.from
	} : null;
}
var lm = /*@__PURE__*/ dm(!1), um = /*@__PURE__*/ dm(!0);
function dm(e) {
	return ({ state: t, dispatch: n }) => {
		if (t.readOnly) return !1;
		let r = t.changeByRange((n) => {
			let { from: r, to: i } = n, a = t.doc.lineAt(r), o = !e && r == i && cm(t, r);
			e && (r = i = (i <= a.to ? a : t.doc.lineAt(i)).to);
			let s = new Mu(t, {
				simulateBreak: r,
				simulateDoubleBreak: !!o
			}), c = ju(s, r);
			for (c ??= Bt(/^\s*/.exec(t.doc.lineAt(r).text)[0], t.tabSize); i < a.to && /\s/.test(a.text[i - a.from]);) i++;
			o ? {from: r, to: i} = o : r > a.from && r < a.from + 100 && !/\S/.test(a.text.slice(0, r)) && (r = a.from);
			let l = ["", Au(t, c)];
			return o && l.push(Au(t, s.lineIndent(a.from, -1))), {
				changes: {
					from: r,
					to: i,
					insert: b.of(l)
				},
				range: C.cursor(r + 1 + l[1].length)
			};
		});
		return n(t.update(r, {
			scrollIntoView: !0,
			userEvent: "input"
		})), !0;
	};
}
function fm(e, t) {
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
			range: C.range(a.mapPos(r.anchor, 1), a.mapPos(r.head, 1))
		};
	});
}
var pm = ({ state: e, dispatch: t }) => {
	if (e.readOnly) return !1;
	let n = Object.create(null), r = new Mu(e, { overrideIndentation: (e) => n[e] ?? -1 }), i = fm(e, (t, i, a) => {
		let o = ju(r, t.from);
		if (o == null) return;
		/\S/.test(t.text) || (o = 0);
		let s = /^\s*/.exec(t.text)[0], c = Au(e, o);
		(s != c || a.from < t.from + s.length) && (n[t.from] = o, i.push({
			from: t.from,
			to: t.from + s.length,
			insert: c
		}));
	});
	return i.changes.empty || t(e.update(i, { userEvent: "indent" })), !0;
}, mm = ({ state: e, dispatch: t }) => !e.readOnly && (t(e.update(fm(e, (t, n) => {
	n.push({
		from: t.from,
		insert: e.facet(Ou)
	});
}), { userEvent: "input.indent" })), !0), hm = ({ state: e, dispatch: t }) => !e.readOnly && (t(e.update(fm(e, (t, n) => {
	let r = /^\s*/.exec(t.text)[0];
	if (!r) return;
	let i = Bt(r, e.tabSize), a = 0, o = Au(e, Math.max(0, i - ku(e)));
	for (; a < r.length && a < o.length && r.charCodeAt(a) == o.charCodeAt(a);) a++;
	n.push({
		from: t.from + a,
		to: t.from + r.length,
		insert: o.slice(a)
	});
}), { userEvent: "delete.dedent" })), !0), gm = (e) => (e.setTabFocusMode(), !0), _m = [
	{
		key: "Ctrl-b",
		run: Rf,
		shift: dp,
		preventDefault: !0
	},
	{
		key: "Ctrl-f",
		run: zf,
		shift: fp
	},
	{
		key: "Ctrl-p",
		run: Jf,
		shift: yp
	},
	{
		key: "Ctrl-n",
		run: Yf,
		shift: bp
	},
	{
		key: "Ctrl-a",
		run: ap,
		shift: Op
	},
	{
		key: "Ctrl-e",
		run: op,
		shift: kp
	},
	{
		key: "Ctrl-d",
		run: Gp
	},
	{
		key: "Ctrl-h",
		run: Wp
	},
	{
		key: "Ctrl-k",
		run: Yp
	},
	{
		key: "Ctrl-Alt-h",
		run: qp
	},
	{
		key: "Ctrl-o",
		run: Qp
	},
	{
		key: "Ctrl-t",
		run: $p
	},
	{
		key: "Ctrl-v",
		run: $f
	}
], vm = /*@__PURE__*/ [
	{
		key: "ArrowLeft",
		run: Rf,
		shift: dp,
		preventDefault: !0
	},
	{
		key: "Mod-ArrowLeft",
		mac: "Alt-ArrowLeft",
		run: Vf,
		shift: mp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowLeft",
		run: rp,
		shift: Ep,
		preventDefault: !0
	},
	{
		key: "ArrowRight",
		run: zf,
		shift: fp,
		preventDefault: !0
	},
	{
		key: "Mod-ArrowRight",
		mac: "Alt-ArrowRight",
		run: Hf,
		shift: hp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowRight",
		run: ip,
		shift: Dp,
		preventDefault: !0
	},
	{
		key: "ArrowUp",
		run: Jf,
		shift: yp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowUp",
		run: Ap,
		shift: Mp
	},
	{
		mac: "Ctrl-ArrowUp",
		run: Qf,
		shift: Sp
	},
	{
		key: "ArrowDown",
		run: Yf,
		shift: bp,
		preventDefault: !0
	},
	{
		mac: "Cmd-ArrowDown",
		run: jp,
		shift: Np
	},
	{
		mac: "Ctrl-ArrowDown",
		run: $f,
		shift: Cp
	},
	{
		key: "PageUp",
		run: Qf,
		shift: Sp
	},
	{
		key: "PageDown",
		run: $f,
		shift: Cp
	},
	{
		key: "Home",
		run: np,
		shift: Tp,
		preventDefault: !0
	},
	{
		key: "Mod-Home",
		run: Ap,
		shift: Mp
	},
	{
		key: "End",
		run: tp,
		shift: wp,
		preventDefault: !0
	},
	{
		key: "Mod-End",
		run: jp,
		shift: Np
	},
	{
		key: "Enter",
		run: lm,
		shift: lm
	},
	{
		key: "Mod-a",
		run: Pp
	},
	{
		key: "Backspace",
		run: Wp,
		shift: Wp,
		preventDefault: !0
	},
	{
		key: "Delete",
		run: Gp,
		preventDefault: !0
	},
	{
		key: "Mod-Backspace",
		mac: "Alt-Backspace",
		run: qp,
		preventDefault: !0
	},
	{
		key: "Mod-Delete",
		mac: "Alt-Delete",
		run: Jp,
		preventDefault: !0
	},
	{
		mac: "Mod-Backspace",
		run: Xp,
		preventDefault: !0
	},
	{
		mac: "Mod-Delete",
		run: Zp,
		preventDefault: !0
	}
].concat(/*@__PURE__*/ _m.map((e) => ({
	mac: e.key,
	run: e.run,
	shift: e.shift
}))), ym = /*@__PURE__*/ [
	{
		key: "Alt-ArrowLeft",
		mac: "Ctrl-ArrowLeft",
		run: Gf,
		shift: gp
	},
	{
		key: "Alt-ArrowRight",
		mac: "Ctrl-ArrowRight",
		run: Kf,
		shift: _p
	},
	{
		key: "Alt-ArrowUp",
		run: nm
	},
	{
		key: "Shift-Alt-ArrowUp",
		run: am
	},
	{
		key: "Alt-ArrowDown",
		run: rm
	},
	{
		key: "Shift-Alt-ArrowDown",
		run: om
	},
	{
		key: "Mod-Alt-ArrowUp",
		run: Rp
	},
	{
		key: "Mod-Alt-ArrowDown",
		run: zp
	},
	{
		key: "Escape",
		run: Bp
	},
	{
		key: "Mod-Enter",
		run: um
	},
	{
		key: "Alt-l",
		mac: "Ctrl-l",
		run: Fp
	},
	{
		key: "Mod-i",
		run: Ip,
		preventDefault: !0
	},
	{
		key: "Mod-[",
		run: hm
	},
	{
		key: "Mod-]",
		run: mm
	},
	{
		key: "Mod-Alt-\\",
		run: pm
	},
	{
		key: "Shift-Mod-k",
		run: sm
	},
	{
		key: "Shift-Mod-\\",
		run: cp
	},
	{
		key: "Mod-/",
		run: Xd
	},
	{
		key: "Alt-A",
		mac: "Ctrl-A",
		run: $d
	},
	{
		key: "Ctrl-m",
		mac: "Shift-Alt-m",
		run: gm
	}
].concat(vm), bm = {
	key: "Tab",
	run: mm,
	shift: hm
}, xm = typeof String.prototype.normalize == "function" ? (e) => e.normalize("NFKD") : (e) => e, Sm = class {
	constructor(e, t, n = 0, r = e.length, i, a) {
		this.test = a, this.value = {
			from: 0,
			to: 0,
			precise: !1
		}, this.done = !1, this.matches = [], this.buffer = "", this.bufferPos = 0, this.iter = e.iterRange(n, r), this.bufferStart = n, this.normalize = i ? (e) => i(xm(e)) : xm, this.query = this.normalize(t);
	}
	peek() {
		if (this.bufferPos == this.buffer.length) {
			if (this.bufferStart += this.buffer.length, this.iter.next(), this.iter.done) return -1;
			this.bufferPos = 0, this.buffer = this.iter.value;
		}
		return xe(this.buffer, this.bufferPos);
	}
	next() {
		for (; this.matches.length;) this.matches.pop();
		return this.nextOverlapping();
	}
	nextOverlapping() {
		for (;;) {
			let e = this.peek();
			if (e < 0) return this.done = !0, this;
			let t = Se(e), n = this.bufferStart + this.bufferPos;
			this.bufferPos += Ce(e);
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
typeof Symbol < "u" && (Sm.prototype[Symbol.iterator] = function() {
	return this;
});
var Cm = {
	from: -1,
	to: -1,
	match: /*@__PURE__*/ /.*/.exec(""),
	precise: !0
}, wm = "gm" + (/x/.unicode == null ? "" : "u"), Tm = class {
	constructor(e, t, n, r = 0, i = e.length) {
		if (this.text = e, this.to = i, this.curLine = "", this.done = !1, this.value = Cm, /\\[sWDnr]|\n|\r|\[\^/.test(t)) return new Om(e, t, n, r, i);
		this.re = new RegExp(t, wm + (n?.ignoreCase ? "i" : "")), this.test = n?.test, this.iter = e.iter();
		let a = e.lineAt(r);
		this.curLineStart = a.from, this.matchPos = Am(e, r), this.getLine(this.curLineStart);
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
				if (this.matchPos = Am(this.text, r + +(n == r)), n == this.curLineStart + this.curLine.length && this.nextLine(), (n < r || n > this.value.to) && (!this.test || this.test(n, r, t))) return this.value = {
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
}, Em = /*@__PURE__*/ new WeakMap(), Dm = class e {
	constructor(e, t) {
		this.from = e, this.text = t;
	}
	get to() {
		return this.from + this.text.length;
	}
	static get(t, n, r) {
		let i = Em.get(t);
		if (!i || i.from >= r || i.to <= n) {
			let i = new e(n, t.sliceString(n, r));
			return Em.set(t, i), i;
		}
		if (i.from == n && i.to == r) return i;
		let { text: a, from: o } = i;
		return o > n && (a = t.sliceString(n, o) + a, o = n), i.to < r && (a += t.sliceString(i.to, r)), Em.set(t, new e(o, a)), new e(n, a.slice(n - o, r - o));
	}
}, Om = class {
	constructor(e, t, n, r, i) {
		this.text = e, this.to = i, this.done = !1, this.value = Cm, this.matchPos = Am(e, r), this.re = new RegExp(t, wm + (n?.ignoreCase ? "i" : "")), this.test = n?.test, this.flat = Dm.get(e, r, this.chunkEnd(r + 5e3));
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
				}, this.matchPos = Am(this.text, n + +(e == n)), this;
			}
			if (this.flat.to == this.to) return this.done = !0, this;
			this.flat = Dm.get(this.text, this.flat.from, this.chunkEnd(this.flat.from + this.flat.text.length * 2));
		}
	}
};
typeof Symbol < "u" && (Tm.prototype[Symbol.iterator] = Om.prototype[Symbol.iterator] = function() {
	return this;
});
function km(e) {
	try {
		return new RegExp(e, wm), !0;
	} catch {
		return !1;
	}
}
function Am(e, t) {
	if (t >= e.length) return t;
	let n = e.lineAt(t), r;
	for (; t < n.to && (r = n.text.charCodeAt(t - n.from)) >= 56320 && r < 57344;) t++;
	return t;
}
var jm = (e) => {
	let { state: t } = e, n = String(t.doc.lineAt(e.state.selection.main.head).number), { close: r, result: i } = Mc(e, {
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
		let f = t.doc.line(Math.max(1, Math.min(t.doc.lines, d))), p = C.cursor(f.from + Math.max(0, Math.min(u, f.length)));
		e.dispatch({
			effects: [r, V.scrollIntoView(p.from, { y: "center" })],
			selection: p
		});
	}), !0;
}, Mm = {
	highlightWordAroundCursor: !1,
	minSelectionLength: 1,
	maxMatches: 100,
	wholeWords: !1
}, Nm = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, Mm, {
		highlightWordAroundCursor: (e, t) => e || t,
		minSelectionLength: Math.min,
		maxMatches: Math.min
	});
} });
function Pm(e) {
	let t = [Bm, zm];
	return e && t.push(Nm.of(e)), t;
}
var Fm = /*@__PURE__*/ P.mark({ class: "cm-selectionMatch" }), Im = /*@__PURE__*/ P.mark({ class: "cm-selectionMatch cm-selectionMatch-main" });
function Lm(e, t, n, r) {
	return (n == 0 || e(t.sliceDoc(n - 1, n)) != E.Word) && (r == t.doc.length || e(t.sliceDoc(r, r + 1)) != E.Word);
}
function Rm(e, t, n, r) {
	return e(t.sliceDoc(n, n + 1)) == E.Word && e(t.sliceDoc(r - 1, r)) == E.Word;
}
var zm = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.decorations = this.getDeco(e);
	}
	update(e) {
		(e.selectionSet || e.docChanged || e.viewportChanged) && (this.decorations = this.getDeco(e.view));
	}
	getDeco(e) {
		let t = e.state.facet(Nm), { state: n } = e, r = n.selection;
		if (r.ranges.length > 1) return P.none;
		let i = r.main, a, o = null;
		if (i.empty) {
			if (!t.highlightWordAroundCursor) return P.none;
			let e = n.wordAt(i.head);
			if (!e) return P.none;
			o = n.charCategorizer(i.head), a = n.sliceDoc(e.from, e.to);
		} else {
			let e = i.to - i.from;
			if (e < t.minSelectionLength || e > 200) return P.none;
			if (t.wholeWords) {
				if (a = n.sliceDoc(i.from, i.to), o = n.charCategorizer(i.head), !(Lm(o, n, i.from, i.to) && Rm(o, n, i.from, i.to))) return P.none;
			} else if (a = n.sliceDoc(i.from, i.to), !a) return P.none;
		}
		let s = [];
		for (let r of e.visibleRanges) {
			let e = new Sm(n.doc, a, r.from, r.to);
			for (; !e.next().done;) {
				let { from: r, to: a } = e.value;
				if ((!o || Lm(o, n, r, a)) && (i.empty && r <= i.from && a >= i.to ? s.push(Im.range(r, a)) : (r >= i.to || a <= i.from) && s.push(Fm.range(r, a)), s.length > t.maxMatches)) return P.none;
			}
		}
		return P.set(s);
	}
}, { decorations: (e) => e.decorations }), Bm = /*@__PURE__*/ V.baseTheme({
	".cm-selectionMatch": { backgroundColor: "#99ff7780" },
	".cm-searchMatch .cm-selectionMatch": { backgroundColor: "transparent" }
}), Vm = ({ state: e, dispatch: t }) => {
	let { selection: n } = e, r = C.create(n.ranges.map((t) => e.wordAt(t.head) || C.cursor(t.head)), n.mainIndex);
	return !r.eq(n) && (t(e.update({ selection: r })), !0);
};
function Hm(e, t) {
	let { main: n, ranges: r } = e.selection, i = e.wordAt(n.head), a = i && i.from == n.from && i.to == n.to;
	for (let n = !1, i = new Sm(e.doc, t, r[r.length - 1].to);;) if (i.next(), i.done) {
		if (n) return null;
		i = new Sm(e.doc, t, 0, Math.max(0, r[r.length - 1].from - 1)), n = !0;
	} else {
		if (n && r.some((e) => e.from == i.value.from)) continue;
		if (a) {
			let t = e.wordAt(i.value.from);
			if (!t || t.from != i.value.from || t.to != i.value.to) continue;
		}
		return i.value;
	}
}
var Um = ({ state: e, dispatch: t }) => {
	let { ranges: n } = e.selection;
	if (n.some((e) => e.from === e.to)) return Vm({
		state: e,
		dispatch: t
	});
	let r = e.sliceDoc(n[0].from, n[0].to);
	if (e.selection.ranges.some((t) => e.sliceDoc(t.from, t.to) != r)) return !1;
	let i = Hm(e, r);
	return i ? (t(e.update({
		selection: e.selection.addRange(C.range(i.from, i.to), !1),
		effects: V.scrollIntoView(i.to)
	})), !0) : !1;
}, Wm = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, {
		top: !1,
		caseSensitive: !1,
		literal: !1,
		regexp: !1,
		wholeWord: !1,
		createPanel: (e) => new wh(e),
		scrollToMatch: (e) => V.scrollIntoView(e)
	});
} }), Gm = class {
	constructor(e) {
		this.search = e.search, this.caseSensitive = !!e.caseSensitive, this.literal = !!e.literal, this.regexp = !!e.regexp, this.replace = e.replace || "", this.valid = !!this.search && (!this.regexp || km(this.search)), this.unquoted = this.unquote(this.search), this.wholeWord = !!e.wholeWord, this.test = e.test;
	}
	unquote(e) {
		return this.literal ? e : e.replace(/\\([nrt\\])/g, (e, t) => t == "n" ? "\n" : t == "r" ? "\r" : t == "t" ? "	" : "\\");
	}
	eq(e) {
		return this.search == e.search && this.replace == e.replace && this.caseSensitive == e.caseSensitive && this.regexp == e.regexp && this.wholeWord == e.wholeWord && this.test == e.test;
	}
	create() {
		return this.regexp ? new nh(this) : new Xm(this);
	}
	getCursor(e, t = 0, n) {
		let r = e.doc ? e : D.create({ doc: e });
		return n ??= r.doc.length, this.regexp ? Qm(this, r, t, n) : Jm(this, r, t, n);
	}
}, Km = class {
	constructor(e) {
		this.spec = e;
	}
};
function qm(e, t, n) {
	return (r, i, a, o) => n && !n(r, i, a, o) ? !1 : e(r >= o && i <= o + a.length ? a.slice(r - o, i - o) : t.doc.sliceString(r, i), t, r, i);
}
function Jm(e, t, n, r) {
	let i;
	return e.wholeWord && (i = Ym(t.doc, t.charCategorizer(t.selection.main.head))), e.test && (i = qm(e.test, t, i)), new Sm(t.doc, e.unquoted, n, r, e.caseSensitive ? void 0 : (e) => e.toLowerCase(), i);
}
function Ym(e, t) {
	return (n, r, i, a) => ((a > n || a + i.length < r) && (a = Math.max(0, n - 2), i = e.sliceString(a, Math.min(e.length, r + 2))), (t($m(i, n - a)) != E.Word || t(eh(i, n - a)) != E.Word) && (t(eh(i, r - a)) != E.Word || t($m(i, r - a)) != E.Word));
}
var Xm = class extends Km {
	constructor(e) {
		super(e);
	}
	nextMatch(e, t, n) {
		let r = Jm(this.spec, e, n, e.doc.length).nextOverlapping();
		if (r.done) {
			let n = Math.min(e.doc.length, t + this.spec.unquoted.length);
			r = Jm(this.spec, e, 0, n).nextOverlapping();
		}
		return r.done || r.value.from == t && r.value.to == n ? null : r.value;
	}
	prevMatchInRange(e, t, n) {
		for (let r = n;;) {
			let n = Math.max(t, r - 1e4 - this.spec.unquoted.length), i = Jm(this.spec, e, n, r), a = null;
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
		let n = Jm(this.spec, e, 0, e.doc.length), r = [];
		for (; !n.next().done;) {
			if (r.length >= t) return null;
			r.push(n.value);
		}
		return r;
	}
	highlight(e, t, n, r) {
		let i = Jm(this.spec, e, Math.max(0, t - this.spec.unquoted.length), Math.min(n + this.spec.unquoted.length, e.doc.length));
		for (; !i.next().done;) r(i.value.from, i.value.to);
	}
};
function Zm(e, t, n) {
	return (r, i, a) => (!n || n(r, i, a)) && e(a[0], t, r, i);
}
function Qm(e, t, n, r) {
	let i;
	return e.wholeWord && (i = th(t.charCategorizer(t.selection.main.head))), e.test && (i = Zm(e.test, t, i)), new Tm(t.doc, e.search, {
		ignoreCase: !e.caseSensitive,
		test: i
	}, n, r);
}
function $m(e, t) {
	return e.slice(x(e, t, !1), t);
}
function eh(e, t) {
	return e.slice(t, x(e, t));
}
function th(e) {
	return (t, n, r) => !r[0].length || (e($m(r.input, r.index)) != E.Word || e(eh(r.input, r.index)) != E.Word) && (e(eh(r.input, r.index + r[0].length)) != E.Word || e($m(r.input, r.index + r[0].length)) != E.Word);
}
var nh = class extends Km {
	nextMatch(e, t, n) {
		let r = Qm(this.spec, e, n, e.doc.length).next();
		return r.done && (r = Qm(this.spec, e, 0, t).next()), r.done ? null : r.value;
	}
	prevMatchInRange(e, t, n) {
		for (let r = 1;; r++) {
			let i = Math.max(t, n - r * 1e4), a = Qm(this.spec, e, i, n), o = null;
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
		let n = Qm(this.spec, e, 0, e.doc.length), r = [];
		for (; !n.next().done;) {
			if (r.length >= t) return null;
			r.push(n.value);
		}
		return r;
	}
	highlight(e, t, n, r) {
		let i = Qm(this.spec, e, Math.max(0, t - 250), Math.min(n + 250, e.doc.length));
		for (; !i.next().done;) r(i.value.from, i.value.to);
	}
}, rh = /*@__PURE__*/ T.define(), ih = /*@__PURE__*/ T.define(), ah = /*@__PURE__*/ He.define({
	create(e) {
		return new oh(vh(e).create(), null);
	},
	update(e, t) {
		for (let n of t.effects) n.is(rh) ? e = new oh(n.value.create(), e.panel) : n.is(ih) && (e = new oh(e.query, n.value ? _h : null));
		return e;
	},
	provide: (e) => jc.from(e, (e) => e.panel)
}), oh = class {
	constructor(e, t) {
		this.query = e, this.panel = t;
	}
}, sh = /*@__PURE__*/ P.mark({ class: "cm-searchMatch" }), ch = /*@__PURE__*/ P.mark({ class: "cm-searchMatch cm-searchMatch-selected" }), lh = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.view = e, this.decorations = this.highlight(e.state.field(ah));
	}
	update(e) {
		let t = e.state.field(ah);
		(t != e.startState.field(ah) || e.docChanged || e.selectionSet || e.viewportChanged) && (this.decorations = this.highlight(t));
	}
	highlight({ query: e, panel: t }) {
		if (!t || !e.spec.valid) return P.none;
		let { view: n } = this, r = new kt();
		for (let t = 0, i = n.visibleRanges, a = i.length; t < a; t++) {
			let { from: o, to: s } = i[t];
			for (; t < a - 1 && s > i[t + 1].from - 500;) s = i[++t].to;
			e.highlight(n.state, o, s, (e, t) => {
				let i = n.state.selection.ranges.some((n) => n.from == e && n.to == t);
				r.add(e, t, i ? ch : sh);
			});
		}
		return r.finish();
	}
}, { decorations: (e) => e.decorations });
function uh(e) {
	return (t) => {
		let n = t.state.field(ah, !1);
		return n && n.query.spec.valid ? e(t, n) : xh(t);
	};
}
var dh = /*@__PURE__*/ uh((e, { query: t }) => {
	let { to: n } = e.state.selection.main, r = t.nextMatch(e.state, n, n);
	if (!r) return !1;
	let i = C.single(r.from, r.to), a = e.state.facet(Wm);
	return e.dispatch({
		selection: i,
		effects: [Oh(e, r), a.scrollToMatch(i.main, e)],
		userEvent: "select.search"
	}), bh(e), !0;
}), fh = /*@__PURE__*/ uh((e, { query: t }) => {
	let { state: n } = e, { from: r } = n.selection.main, i = t.prevMatch(n, r, r);
	if (!i) return !1;
	let a = C.single(i.from, i.to), o = e.state.facet(Wm);
	return e.dispatch({
		selection: a,
		effects: [Oh(e, i), o.scrollToMatch(a.main, e)],
		userEvent: "select.search"
	}), bh(e), !0;
}), ph = /*@__PURE__*/ uh((e, { query: t }) => {
	let n = t.matchAll(e.state, 1e3);
	return !n || !n.length ? !1 : (e.dispatch({
		selection: C.create(n.map((e) => C.range(e.from, e.to))),
		userEvent: "select.search.matches"
	}), !0);
}), mh = ({ state: e, dispatch: t }) => {
	let n = e.selection;
	if (n.ranges.length > 1 || n.main.empty) return !1;
	let { from: r, to: i } = n.main, a = [], o = 0;
	for (let t = new Sm(e.doc, e.sliceDoc(r, i)); !t.next().done;) {
		if (a.length > 1e3) return !1;
		t.value.from == r && (o = a.length), a.push(C.range(t.value.from, t.value.to));
	}
	return t(e.update({
		selection: C.create(a, o),
		userEvent: "select.search.matches"
	})), !0;
}, hh = /*@__PURE__*/ uh((e, { query: t }) => {
	let { state: n } = e, { from: r, to: i } = n.selection.main;
	if (n.readOnly) return !1;
	let a = t.nextMatch(n, r, r);
	if (!a) return !1;
	let o = a, s = [], c, l, u = [];
	o.precise ? o.from == r && o.to == i && (l = n.toText(t.getReplacement(o)), s.push({
		from: o.from,
		to: o.to,
		insert: l
	}), o = t.nextMatch(n, o.from, o.to), u.push(V.announce.of(n.phrase("replaced match on line $", n.doc.lineAt(r).number) + "."))) : o = t.nextMatch(n, o.from, o.to);
	let d = e.state.changes(s);
	return o && (c = C.single(o.from, o.to).map(d), u.push(Oh(e, o)), u.push(n.facet(Wm).scrollToMatch(c.main, e))), e.dispatch({
		changes: d,
		selection: c,
		effects: u,
		userEvent: "input.replace"
	}), !0;
}), gh = /*@__PURE__*/ uh((e, { query: t }) => {
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
		effects: V.announce.of(r),
		userEvent: "input.replace.all"
	}), !0;
});
function _h(e) {
	return e.state.facet(Wm).createPanel(e);
}
function vh(e, t) {
	let n = e.selection.main, r = n.empty || n.to > n.from + 100 ? "" : e.sliceDoc(n.from, n.to);
	if (t && !r) return t;
	let i = e.facet(Wm);
	return new Gm({
		search: t?.literal ?? i.literal ? r : r.replace(/\n/g, "\\n"),
		caseSensitive: t?.caseSensitive ?? i.caseSensitive,
		literal: t?.literal ?? i.literal,
		regexp: t?.regexp ?? i.regexp,
		wholeWord: t?.wholeWord ?? i.wholeWord
	});
}
function yh(e) {
	let t = Dc(e, _h);
	return t && t.dom.querySelector("[main-field]");
}
function bh(e) {
	let t = yh(e);
	t && t == e.root.activeElement && t.select();
}
var xh = (e) => {
	let t = e.state.field(ah, !1);
	if (t && t.panel) {
		let n = yh(e);
		if (n && n != e.root.activeElement) {
			let r = vh(e.state, t.query.spec);
			r.valid && e.dispatch({ effects: rh.of(r) }), n.focus(), n.select();
		}
	} else e.dispatch({ effects: [ih.of(!0), t ? rh.of(vh(e.state, t.query.spec)) : T.appendConfig.of(Ah)] });
	return !0;
}, Sh = (e) => {
	let t = e.state.field(ah, !1);
	if (!t || !t.panel) return !1;
	let n = Dc(e, _h);
	return n && n.dom.contains(e.root.activeElement) && e.focus(), e.dispatch({ effects: ih.of(!1) }), !0;
}, Ch = [
	{
		key: "Mod-f",
		run: xh,
		scope: "editor search-panel"
	},
	{
		key: "F3",
		run: dh,
		shift: fh,
		scope: "editor search-panel",
		preventDefault: !0
	},
	{
		key: "Mod-g",
		run: dh,
		shift: fh,
		scope: "editor search-panel",
		preventDefault: !0
	},
	{
		key: "Escape",
		run: Sh,
		scope: "editor search-panel"
	},
	{
		key: "Mod-Shift-l",
		run: mh
	},
	{
		key: "Mod-Alt-g",
		run: jm
	},
	{
		key: "Mod-d",
		run: Um,
		preventDefault: !0
	}
], wh = class {
	constructor(e) {
		this.view = e;
		let t = this.query = e.state.field(ah).query.spec;
		this.commit = this.commit.bind(this), this.searchField = A("input", {
			value: t.search,
			placeholder: Th(e, "Find"),
			"aria-label": Th(e, "Find"),
			class: "cm-textfield",
			name: "search",
			form: "",
			"main-field": "true",
			onchange: this.commit,
			onkeyup: this.commit
		}), this.replaceField = A("input", {
			value: t.replace,
			placeholder: Th(e, "Replace"),
			"aria-label": Th(e, "Replace"),
			class: "cm-textfield",
			name: "replace",
			form: "",
			onchange: this.commit,
			onkeyup: this.commit
		}), this.caseField = A("input", {
			type: "checkbox",
			name: "case",
			form: "",
			checked: t.caseSensitive,
			onchange: this.commit
		}), this.reField = A("input", {
			type: "checkbox",
			name: "re",
			form: "",
			checked: t.regexp,
			onchange: this.commit
		}), this.wordField = A("input", {
			type: "checkbox",
			name: "word",
			form: "",
			checked: t.wholeWord,
			onchange: this.commit
		});
		function n(e, t, n) {
			return A("button", {
				class: "cm-button",
				name: e,
				onclick: t,
				type: "button"
			}, n);
		}
		this.dom = A("div", {
			onkeydown: (e) => this.keydown(e),
			class: "cm-search"
		}, [
			this.searchField,
			n("next", () => dh(e), [Th(e, "next")]),
			n("prev", () => fh(e), [Th(e, "previous")]),
			n("select", () => ph(e), [Th(e, "all")]),
			A("label", null, [this.caseField, Th(e, "match case")]),
			A("label", null, [this.reField, Th(e, "regexp")]),
			A("label", null, [this.wordField, Th(e, "by word")]),
			...e.state.readOnly ? [] : [
				A("br"),
				this.replaceField,
				n("replace", () => hh(e), [Th(e, "replace")]),
				n("replaceAll", () => gh(e), [Th(e, "replace all")])
			],
			A("button", {
				name: "close",
				onclick: () => Sh(e),
				"aria-label": Th(e, "close"),
				type: "button"
			}, ["×"])
		]);
	}
	commit() {
		let e = new Gm({
			search: this.searchField.value,
			caseSensitive: this.caseField.checked,
			regexp: this.reField.checked,
			wholeWord: this.wordField.checked,
			replace: this.replaceField.value
		});
		e.eq(this.query) || (this.query = e, this.view.dispatch({ effects: rh.of(e) }));
	}
	keydown(e) {
		is(this.view, e, "search-panel") ? e.preventDefault() : e.keyCode == 13 && e.target == this.searchField ? (e.preventDefault(), (e.shiftKey ? fh : dh)(this.view)) : e.keyCode == 13 && e.target == this.replaceField && (e.preventDefault(), hh(this.view));
	}
	update(e) {
		for (let t of e.transactions) for (let e of t.effects) e.is(rh) && !e.value.eq(this.query) && this.setQuery(e.value);
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
		return this.view.state.facet(Wm).top;
	}
};
function Th(e, t) {
	return e.state.phrase(t);
}
var Eh = 30, Dh = /[\s\.,:;?!]/;
function Oh(e, { from: t, to: n }) {
	let r = e.state.doc.lineAt(t), i = e.state.doc.lineAt(n).to, a = Math.max(r.from, t - Eh), o = Math.min(i, n + Eh), s = e.state.sliceDoc(a, o);
	if (a != r.from) {
		for (let e = 0; e < Eh; e++) if (!Dh.test(s[e + 1]) && Dh.test(s[e])) {
			s = s.slice(e);
			break;
		}
	}
	if (o != i) {
		for (let e = s.length - 1; e > s.length - Eh; e--) if (!Dh.test(s[e - 1]) && Dh.test(s[e])) {
			s = s.slice(0, e);
			break;
		}
	}
	return V.announce.of(`${e.state.phrase("current match")}. ${s} ${e.state.phrase("on line")} ${r.number}.`);
}
var kh = /*@__PURE__*/ V.baseTheme({
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
}), Ah = [
	ah,
	/*@__PURE__*/ Ge.low(lh),
	kh
], jh = class {
	constructor(e, t, n, r) {
		this.state = e, this.pos = t, this.explicit = n, this.view = r, this.abortListeners = [], this.abortOnDocChange = !1;
	}
	tokenBefore(e) {
		let t = K(this.state).resolveInner(this.pos, -1);
		for (; t && e.indexOf(t.name) < 0;) t = t.parent;
		return t ? {
			from: t.from,
			to: this.pos,
			text: this.state.sliceDoc(t.from, this.pos),
			type: t.type
		} : null;
	}
	matchBefore(e) {
		let t = this.state.doc.lineAt(this.pos), n = Math.max(t.from, this.pos - 250), r = t.text.slice(n - t.from, this.pos - t.from), i = r.search(Lh(e, !1));
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
function Mh(e) {
	let t = Object.keys(e).join(""), n = /\w/.test(t);
	return n && (t = t.replace(/\w/g, "")), `[${n ? "\\w" : ""}${t.replace(/[^\w\s]/g, "\\$&")}]`;
}
function Nh(e) {
	let t = Object.create(null), n = Object.create(null);
	for (let { label: r } of e) {
		t[r[0]] = !0;
		for (let e = 1; e < r.length; e++) n[r[e]] = !0;
	}
	let r = Mh(t) + Mh(n) + "*$";
	return [RegExp("^" + r), new RegExp(r)];
}
function Ph(e) {
	let t = e.map((e) => typeof e == "string" ? { label: e } : e), [n, r] = t.every((e) => /^\w+$/.test(e.label)) ? [/\w*$/, /\w+$/] : Nh(t);
	return (e) => {
		let i = e.matchBefore(r);
		return i || e.explicit ? {
			from: i ? i.from : e.pos,
			options: t,
			validFor: n
		} : null;
	};
}
var Fh = class {
	constructor(e, t, n, r) {
		this.completion = e, this.source = t, this.match = n, this.score = r;
	}
};
function Ih(e) {
	return e.selection.main.from;
}
function Lh(e, t) {
	let { source: n } = e, r = t && n[0] != "^", i = n[n.length - 1] != "$";
	return !r && !i ? e : RegExp(`${r ? "^" : ""}(?:${n})${i ? "$" : ""}`, e.flags ?? (e.ignoreCase ? "i" : ""));
}
var Rh = /*@__PURE__*/ ot.define();
function zh(e, t, n, r) {
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
				range: C.cursor(s.from + a + c.length)
			};
		}),
		scrollIntoView: !0,
		userEvent: "input.complete"
	};
}
var Bh = /*@__PURE__*/ new WeakMap();
function Vh(e) {
	if (!Array.isArray(e)) return e;
	let t = Bh.get(e);
	return t || Bh.set(e, t = Ph(e)), t;
}
var Hh = /*@__PURE__*/ T.define(), Uh = /*@__PURE__*/ T.define(), Wh = class {
	constructor(e) {
		this.pattern = e, this.chars = [], this.folded = [], this.any = [], this.precise = [], this.byWord = [], this.score = 0, this.matched = [];
		for (let t = 0; t < e.length;) {
			let n = xe(e, t), r = Ce(n);
			this.chars.push(n);
			let i = e.slice(t, t + r), a = i.toUpperCase();
			this.folded.push(xe(a == i ? i.toLowerCase() : a, 0)), t += r;
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
			let r = xe(e, 0), i = Ce(r), a = i == e.length ? 0 : -100;
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
				let a = xe(e, i);
				(a == t[c] || a == n[c]) && (r[c++] = i), i += Ce(a);
			}
			if (c < s) return null;
		}
		let l = 0, u = 0, d = !1, f = 0, p = -1, m = -1, h = /[a-z]/.test(e), g = !0;
		for (let r = 0, c = Math.min(e.length, 200), _ = 0; r < c && u < s;) {
			let c = xe(e, r);
			o < 0 && (l < s && c == t[l] && (i[l++] = r), f < s && (c == t[f] || c == n[f] ? (f == 0 && (p = r), m = r + 1, f++) : f = 0));
			let v, y = c < 255 ? c >= 48 && c <= 57 || c >= 97 && c <= 122 ? 2 : +(c >= 65 && c <= 90) : (v = Se(c)) == v.toLowerCase() ? v == v.toUpperCase() ? 0 : 2 : 1;
			(!r || y == 1 && h || _ == 0 && y != 0) && (t[u] == c || n[u] == c && (d = !0) ? a[u++] = r : a.length && (g = !1)), _ = y, r += Ce(c);
		}
		return u == s && a[0] == 0 && g ? this.result(-100 + (d ? -200 : 0), a, e) : f == s && p == 0 ? this.ret(-200 - e.length + (m == e.length ? 0 : -100), [0, m]) : o > -1 ? this.ret(-700 - e.length, [o, o + this.pattern.length]) : f == s ? this.ret(-900 - e.length, [p, m]) : u == s ? this.result(-100 + (d ? -200 : 0) + -700 + (g ? 0 : -1100), a, e) : t.length == 2 ? null : this.result((r[0] ? -700 : 0) + -200 + -1100, r, e);
	}
	result(e, t, n) {
		let r = [], i = 0;
		for (let e of t) {
			let t = e + (this.astral ? Ce(xe(n, e)) : 1);
			i && r[i - 1] == e ? r[i - 1] = t : (r[i++] = e, r[i++] = t);
		}
		return this.ret(e - n.length, r);
	}
}, Gh = class {
	constructor(e) {
		this.pattern = e, this.matched = [], this.score = 0, this.folded = e.toLowerCase();
	}
	match(e) {
		if (e.length < this.pattern.length) return null;
		let t = e.slice(0, this.pattern.length), n = t == this.pattern ? 0 : t.toLowerCase() == this.folded ? -200 : null;
		return n == null ? null : (this.matched = [0, t.length], this.score = n + (e.length == this.pattern.length ? 0 : -100), this);
	}
}, J = /*@__PURE__*/ w.define({ combine(e) {
	return St(e, {
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
		positionInfo: qh,
		filterStrict: !1,
		compareCompletions: (e, t) => (e.sortText || e.label).localeCompare(t.sortText || t.label),
		interactionDelay: 75,
		updateSyncTime: 100
	}, {
		defaultKeymap: (e, t) => e && t,
		closeOnBlur: (e, t) => e && t,
		icons: (e, t) => e && t,
		tooltipClass: (e, t) => (n) => Kh(e(n), t(n)),
		optionClass: (e, t) => (n) => Kh(e(n), t(n)),
		addToOptions: (e, t) => e.concat(t),
		filterStrict: (e, t) => e || t
	});
} });
function Kh(e, t) {
	return e ? t ? e + " " + t : e : t;
}
function qh(e, t, n, r, i, a) {
	let o = e.textDirection == F.RTL, s = o, c = !1, l = "top", u, d, f = t.left - i.left, p = i.right - t.right, m = r.right - r.left, h = r.bottom - r.top;
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
var Jh = /*@__PURE__*/ T.define();
function Yh(e) {
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
function Xh(e, t, n) {
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
var Zh = class {
	constructor(e, t, n) {
		this.view = e, this.stateField = t, this.applyCompletion = n, this.info = null, this.infoDestroy = null, this.placeInfoReq = {
			read: () => this.measureInfo(),
			write: (e) => this.placeInfo(e),
			key: this
		}, this.space = null, this.currentClass = "";
		let r = e.state.field(t), { options: i, selected: a } = r.open, o = e.state.facet(J);
		this.optionContent = Yh(o), this.optionClass = o.optionClass, this.tooltipClass = o.tooltipClass, this.range = Xh(i.length, a, o.maxRenderedOptions), this.dom = document.createElement("div"), this.dom.className = "cm-tooltip-autocomplete", this.updateTooltipClass(e.state), this.dom.addEventListener("mousedown", (n) => {
			let { options: r } = e.state.field(t).open;
			for (let t = n.target, i; t && t != this.dom; t = t.parentNode) if (t.nodeName == "LI" && (i = /-(\d+)$/.exec(t.id)) && +i[1] < r.length) {
				this.applyCompletion(e, r[+i[1]]), n.preventDefault();
				return;
			}
			if (n.target == this.list) {
				let t = this.list.classList.contains("cm-completionListIncompleteTop") && n.clientY < this.list.firstChild.getBoundingClientRect().top ? this.range.from - 1 : this.list.classList.contains("cm-completionListIncompleteBottom") && n.clientY > this.list.lastChild.getBoundingClientRect().bottom ? this.range.to : null;
				t != null && (e.dispatch({ effects: Jh.of(t) }), n.preventDefault());
			}
		}), this.dom.addEventListener("focusout", (t) => {
			let n = e.state.field(this.stateField, !1);
			n && n.tooltip && e.state.facet(J).closeOnBlur && t.relatedTarget != e.contentDOM && e.dispatch({ effects: Uh.of(null) });
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
			(!n.open || n.open.options != r) && (this.range = Xh(r.length, i, e.state.facet(J).maxRenderedOptions), this.showOptions(r, t.id)), this.updateSel(), a != n.open?.disabled && this.dom.classList.toggle("cm-tooltip-autocomplete-disabled", !!a);
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
		(t.selected > -1 && t.selected < this.range.from || t.selected >= this.range.to) && (this.range = Xh(t.options.length, t.selected, this.view.state.facet(J).maxRenderedOptions), this.showOptions(t.options, e.id));
		let n = this.updateSelectedOption(t.selected);
		if (n) {
			this.destroyInfo();
			let { completion: r } = t.options[t.selected], { info: i } = r;
			if (!i) return;
			let a = typeof i == "string" ? document.createTextNode(i) : i(r);
			if (!a) return;
			"then" in a ? a.then((t) => {
				t && this.view.state.field(this.stateField, !1) == e && this.addInfoPane(t, r);
			}).catch((e) => Lr(this.view.state, e, "completion info")) : (this.addInfoPane(a, r), n.setAttribute("aria-describedby", this.info.id));
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
		return t && $h(this.list, t), t;
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
		return r.top > Math.min(i.bottom, t.bottom) - 10 || r.bottom < Math.max(i.top, t.top) + 10 ? null : this.view.state.facet(J).positionInfo(this.view, t, r, n, i, this.dom);
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
function Qh(e, t) {
	return (n) => new Zh(n, e, t);
}
function $h(e, t) {
	let n = e.getBoundingClientRect(), r = t.getBoundingClientRect(), i = n.height / e.offsetHeight;
	r.top < n.top ? e.scrollTop -= (n.top - r.top) / i : r.bottom > n.bottom && (e.scrollTop += (r.bottom - n.bottom) / i);
}
function eg(e) {
	return (e.boost || 0) * 100 + (e.apply ? 10 : 0) + (e.info ? 5 : 0) + +!!e.type;
}
function tg(e, t) {
	let n = [], r = null, i = null, a = (e) => {
		n.push(e);
		let { section: t } = e.completion;
		if (t) {
			r ||= [];
			let e = typeof t == "string" ? t : t.name;
			r.some((t) => t.name == e) || r.push(typeof t == "string" ? { name: e } : t);
		}
	}, o = t.facet(J);
	for (let r of e) if (r.hasResult()) {
		let e = r.result.getMatch;
		if (r.result.filter === !1) for (let t of r.result.options) a(new Fh(t, r.source, e ? e(t) : [], 1e9 - n.length));
		else {
			let n = t.sliceDoc(r.from, r.to), s, c = o.filterStrict ? new Gh(n) : new Wh(n);
			for (let t of r.result.options) if (s = c.match(t.label)) {
				let n = t.displayLabel ? e ? e(t, s.matched) : [] : s.matched, o = s.score + (t.boost || 0);
				if (a(new Fh(t, r.source, n, o)), typeof t.section == "object" && t.section.rank === "dynamic") {
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
		!c || c.label != t.label || c.detail != t.detail || c.type != null && t.type != null && c.type != t.type || c.apply != t.apply || c.boost != t.boost ? s.push(e) : eg(e.completion) > eg(c) && (s[s.length - 1] = e), c = e.completion;
	}
	return s;
}
var ng = class e {
	constructor(e, t, n, r, i, a) {
		this.options = e, this.attrs = t, this.tooltip = n, this.timestamp = r, this.selected = i, this.disabled = a;
	}
	setSelected(t, n) {
		return t == this.selected || t >= this.options.length ? this : new e(this.options, sg(n, t), this.tooltip, this.timestamp, t, this.disabled);
	}
	static build(t, n, r, i, a, o) {
		if (i && !o && t.some((e) => e.isPending)) return i.setDisabled();
		let s = tg(t, n);
		if (!s.length) return i && t.some((e) => e.isPending) ? i.setDisabled() : null;
		let c = n.facet(J).selectOnOpen ? 0 : -1;
		if (i && i.selected != c && i.selected != -1) {
			let e = i.options[i.selected].completion;
			for (let t = 0; t < s.length; t++) if (s[t].completion == e) {
				c = t;
				break;
			}
		}
		return new e(s, sg(r, c), {
			pos: t.reduce((e, t) => t.hasResult() ? Math.min(e, t.from) : e, 1e8),
			create: gg,
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
}, rg = class e {
	constructor(e, t, n) {
		this.active = e, this.id = t, this.open = n;
	}
	static start() {
		return new e(cg, "cm-ac-" + Math.floor(Math.random() * 2e6).toString(36), null);
	}
	update(t) {
		let { state: n } = t, r = n.facet(J), i = (r.override || n.languageDataAt("autocomplete", Ih(n)).map(Vh)).map((e) => (this.active.find((t) => t.source == e) || new ug(e, +!!this.active.some((e) => e.state != 0))).update(t, r));
		i.length == this.active.length && i.every((e, t) => e == this.active[t]) && (i = this.active);
		let a = this.open, o = t.effects.some((e) => e.is(pg));
		a && t.docChanged && (a = a.map(t.changes)), t.selection || i.some((e) => e.hasResult() && t.changes.touchesRange(e.from, e.to)) || !ig(i, this.active) || o ? a = ng.build(i, n, this.id, a, r, o) : a && a.disabled && !i.some((e) => e.isPending) && (a = null), !a && i.every((e) => !e.isPending) && i.some((e) => e.hasResult()) && (i = i.map((e) => e.hasResult() ? new ug(e.source, 0) : e));
		for (let e of t.effects) e.is(Jh) && (a &&= a.setSelected(e.value, this.id));
		return i == this.active && a == this.open ? this : new e(i, this.id, a);
	}
	get tooltip() {
		return this.open ? this.open.tooltip : null;
	}
	get attrs() {
		return this.open ? this.open.attrs : this.active.length ? ag : og;
	}
};
function ig(e, t) {
	if (e == t) return !0;
	for (let n = 0, r = 0;;) {
		for (; n < e.length && !e[n].hasResult();) n++;
		for (; r < t.length && !t[r].hasResult();) r++;
		let i = n == e.length, a = r == t.length;
		if (i || a) return i == a;
		if (e[n++].result != t[r++].result) return !1;
	}
}
var ag = { "aria-autocomplete": "list" }, og = {};
function sg(e, t) {
	let n = {
		"aria-autocomplete": "list",
		"aria-haspopup": "listbox",
		"aria-controls": e
	};
	return t > -1 && (n["aria-activedescendant"] = e + "-" + t), n;
}
var cg = [];
function lg(e, t) {
	if (e.isUserEvent("input.complete")) {
		let n = e.annotation(Rh);
		if (n && t.activateOnCompletion(n)) return 12;
	}
	let n = e.isUserEvent("input.type");
	return n && t.activateOnTyping ? 5 : n ? 1 : e.isUserEvent("delete.backward") ? 2 : e.selection ? 8 : e.docChanged ? 16 : 0;
}
var ug = class e {
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
		let r = lg(t, n), i = this;
		(r & 8 || r & 16 && this.touches(t)) && (i = new e(i.source, 0)), r & 4 && i.state == 0 && (i = new e(this.source, 1)), i = i.updateFor(t, r);
		for (let n of t.effects) if (n.is(Hh)) i = new e(i.source, 1, n.value);
		else if (n.is(Uh)) i = new e(i.source, 0);
		else if (n.is(pg)) for (let e of n.value) e.source == i.source && (i = e);
		return i;
	}
	updateFor(e, t) {
		return this.map(e.changes);
	}
	map(e) {
		return this;
	}
	touches(e) {
		return e.changes.touchesRange(Ih(e.state));
	}
}, dg = class e extends ug {
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
		let i = t.changes.mapPos(this.from), a = t.changes.mapPos(this.to, 1), o = Ih(t.state);
		if (o > a || !r || n & 2 && (Ih(t.startState) == this.from || o < this.limit)) return new ug(this.source, n & 4 ? 1 : 0);
		let s = t.changes.mapPos(this.limit);
		return fg(r.validFor, t.state, i, a) ? new e(this.source, this.explicit, s, r, i, a) : r.update && (r = r.update(r, i, a, new jh(t.state, o, !1))) ? new e(this.source, this.explicit, s, r, r.from, r.to ?? Ih(t.state)) : new ug(this.source, 1, this.explicit);
	}
	map(t) {
		if (t.empty) return this;
		let n = this.result.map ? this.result.map(this.result, t) : this.result;
		return n ? new e(this.source, this.explicit, t.mapPos(this.limit), n, t.mapPos(this.from), t.mapPos(this.to, 1)) : new ug(this.source, 0);
	}
	touches(e) {
		return e.changes.touchesRange(this.from, this.to);
	}
};
function fg(e, t, n, r) {
	if (!e) return !1;
	let i = t.sliceDoc(n, r);
	return typeof e == "function" ? e(i, n, r, t) : Lh(e, !0).test(i);
}
var pg = /*@__PURE__*/ T.define({ map(e, t) {
	return e.map((e) => e.map(t));
} }), mg = /*@__PURE__*/ He.define({
	create() {
		return rg.start();
	},
	update(e, t) {
		return e.update(t);
	},
	provide: (e) => [pc.from(e, (e) => e.tooltip), V.contentAttributes.from(e, (e) => e.attrs)]
});
function hg(e, t) {
	let n = t.completion.apply || t.completion.label, r = e.state.field(mg).active.find((e) => e.source == t.source);
	return r instanceof dg && (typeof n == "string" ? e.dispatch({
		...zh(e.state, n, r.from, r.to),
		annotations: Rh.of(t.completion)
	}) : n(e, t.completion, r.from, r.to), !0);
}
var gg = /*@__PURE__*/ Qh(mg, hg);
function _g(e, t = "option") {
	return (n) => {
		let r = n.state.field(mg, !1);
		if (!r || !r.open || r.open.disabled || Date.now() - r.open.timestamp < n.state.facet(J).interactionDelay) return !1;
		let i = 1, a;
		t == "page" && (a = wc(n, r.open.tooltip)) && (i = Math.max(2, Math.floor(a.dom.offsetHeight / a.dom.querySelector("li").offsetHeight) - 1));
		let { length: o } = r.open.options, s = r.open.selected > -1 ? r.open.selected + i * (e ? 1 : -1) : e ? 0 : o - 1;
		return s < 0 ? s = t == "page" ? 0 : o - 1 : s >= o && (s = t == "page" ? o - 1 : 0), n.dispatch({ effects: Jh.of(s) }), !0;
	};
}
var vg = (e) => {
	let t = e.state.field(mg, !1);
	return e.state.readOnly || !t || !t.open || t.open.selected < 0 || t.open.disabled || Date.now() - t.open.timestamp < e.state.facet(J).interactionDelay ? !1 : hg(e, t.open.options[t.open.selected]);
}, yg = (e) => e.state.field(mg, !1) ? (e.dispatch({ effects: Hh.of(!0) }), !0) : !1, bg = (e) => {
	let t = e.state.field(mg, !1);
	return !t || !t.active.some((e) => e.state != 0) ? !1 : (e.dispatch({ effects: Uh.of(null) }), !0);
}, xg = class {
	constructor(e, t) {
		this.active = e, this.context = t, this.time = Date.now(), this.updates = [], this.done = void 0;
	}
}, Sg = 50, Cg = 1e3, wg = /*@__PURE__*/ L.fromClass(class {
	constructor(e) {
		this.view = e, this.debounceUpdate = -1, this.running = [], this.debounceAccept = -1, this.pendingStart = !1, this.composing = 0;
		for (let t of e.state.field(mg).active) t.isPending && this.startQuery(t);
	}
	update(e) {
		let t = e.state.field(mg), n = e.state.facet(J);
		if (!e.selectionSet && !e.docChanged && e.startState.field(mg) == t) return;
		let r = e.transactions.some((e) => {
			let t = lg(e, n);
			return t & 8 || (e.selection || e.docChanged) && !(t & 3);
		});
		for (let t = 0; t < this.running.length; t++) {
			let n = this.running[t];
			if (r || n.context.abortOnDocChange && e.docChanged || n.updates.length + e.transactions.length > Sg && Date.now() - n.time > Cg) {
				for (let e of n.context.abortListeners) try {
					e();
				} catch (e) {
					Lr(this.view.state, e);
				}
				n.context.abortListeners = null, this.running.splice(t--, 1);
			} else n.updates.push(...e.transactions);
		}
		this.debounceUpdate > -1 && clearTimeout(this.debounceUpdate), e.transactions.some((e) => e.effects.some((e) => e.is(Hh))) && (this.pendingStart = !0);
		let i = this.pendingStart ? 50 : n.activateOnTypingDelay;
		if (this.debounceUpdate = t.active.some((e) => e.isPending && !this.running.some((t) => t.active.source == e.source)) ? setTimeout(() => this.startUpdate(), i) : -1, this.composing != 0) for (let t of e.transactions) t.isUserEvent("input.type") ? this.composing = 2 : this.composing == 2 && t.selection && (this.composing = 3);
	}
	startUpdate() {
		this.debounceUpdate = -1, this.pendingStart = !1;
		let { state: e } = this.view, t = e.field(mg);
		for (let e of t.active) e.isPending && !this.running.some((t) => t.active.source == e.source) && this.startQuery(e);
		this.running.length && t.open && t.open.disabled && (this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(J).updateSyncTime));
	}
	startQuery(e) {
		let { state: t } = this.view, n = new jh(t, Ih(t), e.explicit, this.view), r = new xg(e, n);
		this.running.push(r), Promise.resolve(e.source(n)).then((e) => {
			r.context.aborted || (r.done = e || null, this.scheduleAccept());
		}, (e) => {
			this.view.dispatch({ effects: Uh.of(null) }), Lr(this.view.state, e);
		});
	}
	scheduleAccept() {
		this.running.every((e) => e.done !== void 0) ? this.accept() : this.debounceAccept < 0 && (this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(J).updateSyncTime));
	}
	accept() {
		this.debounceAccept > -1 && clearTimeout(this.debounceAccept), this.debounceAccept = -1;
		let e = [], t = this.view.state.facet(J), n = this.view.state.field(mg);
		for (let r = 0; r < this.running.length; r++) {
			let i = this.running[r];
			if (i.done === void 0) continue;
			if (this.running.splice(r--, 1), i.done) {
				let n = Ih(i.updates.length ? i.updates[0].startState : this.view.state), r = Math.min(n, i.done.from + +!i.active.explicit), a = new dg(i.active.source, i.active.explicit, r, i.done, i.done.from, i.done.to ?? n);
				for (let e of i.updates) a = a.update(e, t);
				if (a.hasResult()) {
					e.push(a);
					continue;
				}
			}
			let a = n.active.find((e) => e.source == i.active.source);
			if (a && a.isPending) {
				if (i.done == null) {
					let n = new ug(i.active.source, 0);
					for (let e of i.updates) n = n.update(e, t);
					n.isPending || e.push(n);
				} else this.startQuery(a);
			}
		}
		(e.length || n.open && n.open.disabled) && this.view.dispatch({ effects: pg.of(e) });
	}
}, { eventHandlers: {
	blur(e) {
		let t = this.view.state.field(mg, !1);
		if (t && t.tooltip && this.view.state.facet(J).closeOnBlur) {
			let n = t.open && wc(this.view, t.open.tooltip);
			(!n || !n.dom.contains(e.relatedTarget)) && setTimeout(() => this.view.dispatch({ effects: Uh.of(null) }), 10);
		}
	},
	compositionstart() {
		this.composing = 1;
	},
	compositionend() {
		this.composing == 3 && setTimeout(() => this.view.dispatch({ effects: Hh.of(!1) }), 20), this.composing = 0;
	}
} }), Tg = typeof navigator == "object" && /*@__PURE__*/ /Win/.test(navigator.platform), Eg = /*@__PURE__*/ Ge.highest(/*@__PURE__*/ V.domEventHandlers({ keydown(e, t) {
	let n = t.state.field(mg, !1);
	if (!n || !n.open || n.open.disabled || n.open.selected < 0 || e.key.length > 1 || e.ctrlKey && !(Tg && e.altKey) || e.metaKey) return !1;
	let r = n.open.options[n.open.selected], i = n.active.find((e) => e.source == r.source), a = r.completion.commitCharacters || i.result.commitCharacters;
	return a && a.indexOf(e.key) > -1 && hg(t, r), !1;
} })), Dg = /*@__PURE__*/ V.baseTheme({
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
}), Og = {
	brackets: [
		"(",
		"[",
		"{",
		"'",
		"\""
	],
	before: ")]}:;>",
	stringPrefixes: []
}, kg = /*@__PURE__*/ T.define({ map(e, t) {
	return t.mapPos(e, -1, Te.TrackAfter) ?? void 0;
} }), Ag = /*@__PURE__*/ new class extends Ct {}();
Ag.startSide = 1, Ag.endSide = -1;
var jg = /*@__PURE__*/ He.define({
	create() {
		return O.empty;
	},
	update(e, t) {
		if (e = e.map(t.changes), t.selection) {
			let n = t.state.doc.lineAt(t.selection.main.head);
			e = e.update({ filter: (e) => e >= n.from && e <= n.to });
		}
		for (let n of t.effects) n.is(kg) && (e = e.update({ add: [Ag.range(n.value, n.value + 1)] }));
		return e;
	}
});
function Mg() {
	return [Lg, jg];
}
var Ng = "()[]{}<>«»»«［］｛｝";
function Pg(e) {
	for (let t = 0; t < 16; t += 2) if (Ng.charCodeAt(t) == e) return Ng.charAt(t + 1);
	return Se(e < 128 ? e : e + 1);
}
function Fg(e, t) {
	return e.languageDataAt("closeBrackets", t)[0] || Og;
}
var Ig = typeof navigator == "object" && /*@__PURE__*/ /Android\b/.test(navigator.userAgent), Lg = /*@__PURE__*/ V.inputHandler.of((e, t, n, r) => {
	if ((Ig ? e.composing : e.compositionStarted) || e.state.readOnly) return !1;
	let i = e.state.selection.main;
	if (r.length > 2 || r.length == 2 && Ce(xe(r, 0)) == 1 || t != i.from || n != i.to) return !1;
	let a = zg(e.state, r);
	return a ? (e.dispatch(a), !0) : !1;
}), Rg = [{
	key: "Backspace",
	run: ({ state: e, dispatch: t }) => {
		if (e.readOnly) return !1;
		let n = Fg(e, e.selection.main.head).brackets || Og.brackets, r = null, i = e.changeByRange((t) => {
			if (t.empty) {
				let r = Hg(e.doc, t.head);
				for (let i of n) if (i == r && Vg(e.doc, t.head) == Pg(xe(i, 0))) return {
					changes: {
						from: t.head - i.length,
						to: t.head + i.length
					},
					range: C.cursor(t.head - i.length)
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
function zg(e, t) {
	let n = Fg(e, e.selection.main.head), r = n.brackets || Og.brackets;
	for (let i of r) {
		let a = Pg(xe(i, 0));
		if (t == i) return a == i ? Gg(e, i, r.indexOf(i + i + i) > -1, n) : Ug(e, i, a, n.before || Og.before);
		if (t == a && Bg(e, e.selection.main.from)) return Wg(e, i, a);
	}
	return null;
}
function Bg(e, t) {
	let n = !1;
	return e.field(jg).between(0, e.doc.length, (e) => {
		e == t && (n = !0);
	}), n;
}
function Vg(e, t) {
	let n = e.sliceString(t, t + 2);
	return n.slice(0, Ce(xe(n, 0)));
}
function Hg(e, t) {
	let n = e.sliceString(t - 2, t);
	return Ce(xe(n, 0)) == n.length ? n : n.slice(1);
}
function Ug(e, t, n, r) {
	let i = null, a = e.changeByRange((a) => {
		if (!a.empty) return {
			changes: [{
				insert: t,
				from: a.from
			}, {
				insert: n,
				from: a.to
			}],
			effects: kg.of(a.to + t.length),
			range: C.range(a.anchor + t.length, a.head + t.length)
		};
		let o = Vg(e.doc, a.head);
		return !o || /\s/.test(o) || r.indexOf(o) > -1 ? {
			changes: {
				insert: t + n,
				from: a.head
			},
			effects: kg.of(a.head + t.length),
			range: C.cursor(a.head + t.length)
		} : { range: i = a };
	});
	return i ? null : e.update(a, {
		scrollIntoView: !0,
		userEvent: "input.type"
	});
}
function Wg(e, t, n) {
	let r = null, i = e.changeByRange((t) => t.empty && Vg(e.doc, t.head) == n ? {
		changes: {
			from: t.head,
			to: t.head + n.length,
			insert: n
		},
		range: C.cursor(t.head + n.length)
	} : r = { range: t });
	return r ? null : e.update(i, {
		scrollIntoView: !0,
		userEvent: "input.type"
	});
}
function Gg(e, t, n, r) {
	let i = r.stringPrefixes || Og.stringPrefixes, a = null, o = e.changeByRange((r) => {
		if (!r.empty) return {
			changes: [{
				insert: t,
				from: r.from
			}, {
				insert: t,
				from: r.to
			}],
			effects: kg.of(r.to + t.length),
			range: C.range(r.anchor + t.length, r.head + t.length)
		};
		let o = r.head, s = Vg(e.doc, o), c;
		if (s == t) {
			if (Kg(e, o)) return {
				changes: {
					insert: t + t,
					from: o
				},
				effects: kg.of(o + t.length),
				range: C.cursor(o + t.length)
			};
			if (Bg(e, o)) {
				let r = n && e.sliceDoc(o, o + t.length * 3) == t + t + t ? t + t + t : t;
				return {
					changes: {
						from: o,
						to: o + r.length,
						insert: r
					},
					range: C.cursor(o + r.length)
				};
			}
		} else if (n && e.sliceDoc(o - 2 * t.length, o) == t + t && (c = Jg(e, o - 2 * t.length, i)) > -1 && Kg(e, c)) return {
			changes: {
				insert: t + t + t + t,
				from: o
			},
			effects: kg.of(o + t.length),
			range: C.cursor(o + t.length)
		};
		else if (e.charCategorizer(o)(s) != E.Word && Jg(e, o, i) > -1 && !qg(e, o, t, i)) return {
			changes: {
				insert: t + t,
				from: o
			},
			effects: kg.of(o + t.length),
			range: C.cursor(o + t.length)
		};
		return { range: a = r };
	});
	return a ? null : e.update(o, {
		scrollIntoView: !0,
		userEvent: "input.type"
	});
}
function Kg(e, t) {
	let n = K(e).resolveInner(t + 1);
	return n.parent && n.from == t;
}
function qg(e, t, n, r) {
	let i = K(e).resolveInner(t, -1), a = r.reduce((e, t) => Math.max(e, t.length), 0);
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
function Jg(e, t, n) {
	let r = e.charCategorizer(t);
	if (r(e.sliceDoc(t - 1, t)) != E.Word) return t;
	for (let i of n) {
		let n = t - i.length;
		if (e.sliceDoc(n, t) == i && r(e.sliceDoc(n - 1, n)) != E.Word) return n;
	}
	return -1;
}
function Yg(e = {}) {
	return [
		Eg,
		mg,
		J.of(e),
		wg,
		Zg,
		Dg
	];
}
var Xg = [
	{
		key: "Ctrl-Space",
		run: yg
	},
	{
		mac: "Alt-`",
		run: yg
	},
	{
		mac: "Alt-i",
		run: yg
	},
	{
		key: "Escape",
		run: bg
	},
	{
		key: "ArrowDown",
		run: /*@__PURE__*/ _g(!0)
	},
	{
		key: "ArrowUp",
		run: /*@__PURE__*/ _g(!1)
	},
	{
		key: "PageDown",
		run: /*@__PURE__*/ _g(!0, "page")
	},
	{
		key: "PageUp",
		run: /*@__PURE__*/ _g(!1, "page")
	},
	{
		key: "Enter",
		run: vg
	}
], Zg = /*@__PURE__*/ Ge.highest(/*@__PURE__*/ ts.computeN([J], (e) => e.facet(J).defaultKeymap ? [Xg] : [])), Qg = class {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.diagnostic = n;
	}
}, $g = class e {
	constructor(e, t, n) {
		this.diagnostics = e, this.panel = t, this.selected = n;
	}
	static init(t, n, r) {
		let i = r.facet(p_).markerFilter;
		i && (t = i(t, r));
		let a = t.slice().sort((e, t) => e.from - t.from || e.to - t.to), o = new kt(), s = [], c = 0, l = r.doc.iter(), u = 0, d = r.doc.length;
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
			let f = w_(s);
			if (i) o.add(n, n, P.widget({
				widget: new __(f),
				diagnostics: s.slice()
			}));
			else {
				let e = s.reduce((e, t) => t.markClass ? e + " " + t.markClass : e, "");
				o.add(n, r, P.mark({
					class: "cm-lintRange cm-lintRange-" + f + e,
					diagnostics: s.slice(),
					inclusiveEnd: s.some((e) => e.to > r)
				}));
			}
			if (c = r, c == d) break;
			for (let e = 0; e < s.length; e++) s[e].to <= c && s.splice(e--, 1);
		}
		let f = o.finish();
		return new e(f, n, e_(f));
	}
};
function e_(e, t = null, n = 0) {
	let r = null;
	return e.between(n, 1e9, (e, n, { spec: i }) => {
		if (!(t && i.diagnostics.indexOf(t) < 0)) {
			if (!r) r = new Qg(e, n, t || i.diagnostics[0]);
			else if (i.diagnostics.indexOf(r.diagnostic) < 0) return !1;
			else r = new Qg(r.from, n, r.diagnostic);
		}
	}), r;
}
function t_(e, t) {
	let n = t.pos, r = t.end || n, i = e.state.facet(p_).hideOn(e, n, r);
	if (i != null) return i;
	let a = e.startState.doc.lineAt(t.pos);
	return !!(e.effects.some((e) => e.is(r_)) || e.changes.touchesRange(a.from, Math.max(a.to, r)));
}
function n_(e, t) {
	return e.field(o_, !1) ? t : t.concat(T.appendConfig.of(E_));
}
var r_ = /*@__PURE__*/ T.define(), i_ = /*@__PURE__*/ T.define(), a_ = /*@__PURE__*/ T.define(), o_ = /*@__PURE__*/ He.define({
	create() {
		return new $g(P.none, null, null);
	},
	update(e, t) {
		if (t.docChanged && e.diagnostics.size) {
			let n = e.diagnostics.map(t.changes), r = null, i = e.panel;
			if (e.selected) {
				let i = t.changes.mapPos(e.selected.from, 1);
				r = e_(n, e.selected.diagnostic, i) || e_(n, null, i);
			}
			!n.size && i && t.state.facet(p_).autoPanel && (i = null), e = new $g(n, i, r);
		}
		for (let n of t.effects) if (n.is(r_)) {
			let r = t.state.facet(p_).autoPanel ? n.value.length ? y_.open : null : e.panel;
			e = $g.init(n.value, r, t.state);
		} else n.is(i_) ? e = new $g(e.diagnostics, n.value ? y_.open : null, e.selected) : n.is(a_) && (e = new $g(e.diagnostics, e.panel, n.value));
		return e;
	},
	provide: (e) => [jc.from(e, (e) => e.panel), V.decorations.from(e, (e) => e.diagnostics)]
}), s_ = /*@__PURE__*/ P.mark({ class: "cm-lintRange cm-lintRange-active" });
function c_(e, t, n) {
	let { diagnostics: r } = e.state.field(o_), i, a = -1, o = -1;
	r.between(t - +(n < 0), t + +(n > 0), (e, r, { spec: s }) => {
		if (t >= e && t <= r && (e == r || (t > e || n > 0) && (t < r || n < 0))) return i = s.diagnostics, a = e, o = r, !1;
	});
	let s = e.state.facet(p_).tooltipFilter;
	return i && s && (i = s(i, e.state)), i ? {
		pos: a,
		end: o,
		above: !0,
		create() {
			return { dom: l_(e, i) };
		}
	} : null;
}
function l_(e, t) {
	return A("ul", { class: "cm-tooltip-lint" }, t.map((t) => g_(e, t, !1)));
}
var u_ = (e) => {
	let t = e.state.field(o_, !1);
	(!t || !t.panel) && e.dispatch({ effects: n_(e.state, [i_.of(!0)]) });
	let n = Dc(e, y_.open);
	return n && n.dom.querySelector(".cm-panel-lint ul").focus(), !0;
}, d_ = (e) => {
	let t = e.state.field(o_, !1);
	return !t || !t.panel ? !1 : (e.dispatch({ effects: i_.of(!1) }), !0);
}, f_ = [{
	key: "Mod-Shift-m",
	run: u_,
	preventDefault: !0
}, {
	key: "F8",
	run: (e) => {
		let t = e.state.field(o_, !1);
		if (!t) return !1;
		let n = e.state.selection.main, r = e_(t.diagnostics, null, n.to + 1);
		return !r && (r = e_(t.diagnostics, null, 0), !r || r.from == n.from && r.to == n.to) ? !1 : (e.dispatch({
			selection: {
				anchor: r.from,
				head: r.to
			},
			scrollIntoView: !0
		}), Cc(e, r.from, 1, {
			tooltip: T_,
			until: (e) => e.docChanged || e.newSelection.main.head < r.from || e.newSelection.main.head > r.to
		}), !0);
	}
}], p_ = /*@__PURE__*/ w.define({ combine(e) {
	return {
		sources: e.map((e) => e.source).filter((e) => e != null),
		...St(e.map((e) => e.config), {
			delay: 750,
			markerFilter: null,
			tooltipFilter: null,
			needsRefresh: null,
			hideOn: () => null
		}, {
			delay: Math.max,
			markerFilter: m_,
			tooltipFilter: m_,
			needsRefresh: (e, t) => e ? t ? (n) => e(n) || t(n) : e : t,
			hideOn: (e, t) => e ? t ? (n, r, i) => e(n, r, i) || t(n, r, i) : e : t,
			autoPanel: (e, t) => e || t
		})
	};
} });
function m_(e, t) {
	return e ? t ? (n, r) => t(e(n, r), r) : e : t;
}
function h_(e) {
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
function g_(e, t, n) {
	let r = n ? h_(t.actions) : [];
	return A("li", { class: "cm-diagnostic cm-diagnostic-" + t.severity }, A("span", { class: "cm-diagnosticText" }, t.renderMessage ? t.renderMessage(e) : t.message), t.actions?.map((n, i) => {
		let a = !1, o = (r) => {
			if (r.preventDefault(), a) return;
			a = !0;
			let i = e_(e.state.field(o_).diagnostics, t);
			i && n.apply(e, i.from, i.to);
		}, { name: s } = n, c = r[i] ? s.indexOf(r[i]) : -1, l = c < 0 ? s : [
			s.slice(0, c),
			A("u", s.slice(c, c + 1)),
			s.slice(c + 1)
		];
		return A("button", {
			type: "button",
			class: "cm-diagnosticAction" + (n.markClass ? " " + n.markClass : ""),
			onclick: o,
			onmousedown: o,
			"aria-label": ` Action: ${s}${c < 0 ? "" : ` (access key "${r[i]})"`}.`
		}, l);
	}), t.source && A("div", { class: "cm-diagnosticSource" }, t.source));
}
var __ = class extends yn {
	constructor(e) {
		super(), this.sev = e;
	}
	eq(e) {
		return e.sev == this.sev;
	}
	toDOM() {
		return A("span", { class: "cm-lintPoint cm-lintPoint-" + this.sev });
	}
}, v_ = class {
	constructor(e, t) {
		this.diagnostic = t, this.id = "item_" + Math.floor(Math.random() * 4294967295).toString(16), this.dom = g_(e, t, !0), this.dom.id = this.id, this.dom.setAttribute("role", "option");
	}
}, y_ = class e {
	constructor(e) {
		this.view = e, this.items = [];
		let t = (t) => {
			if (!(t.ctrlKey || t.altKey || t.metaKey)) {
				if (t.keyCode == 27) d_(this.view), this.view.focus();
				else if (t.keyCode == 38 || t.keyCode == 33) this.moveSelection((this.selectedIndex - 1 + this.items.length) % this.items.length);
				else if (t.keyCode == 40 || t.keyCode == 34) this.moveSelection((this.selectedIndex + 1) % this.items.length);
				else if (t.keyCode == 36) this.moveSelection(0);
				else if (t.keyCode == 35) this.moveSelection(this.items.length - 1);
				else if (t.keyCode == 13) this.view.focus();
				else if (t.keyCode >= 65 && t.keyCode <= 90 && this.selectedIndex >= 0) {
					let { diagnostic: n } = this.items[this.selectedIndex], r = h_(n.actions);
					for (let i = 0; i < r.length; i++) if (r[i].toUpperCase().charCodeAt(0) == t.keyCode) {
						let t = e_(this.view.state.field(o_).diagnostics, n);
						t && n.actions[i].apply(e, t.from, t.to);
					}
				} else return;
				t.preventDefault();
			}
		}, n = (e) => {
			for (let t = 0; t < this.items.length; t++) this.items[t].dom.contains(e.target) && this.moveSelection(t);
		};
		this.list = A("ul", {
			tabIndex: 0,
			role: "listbox",
			"aria-label": this.view.state.phrase("Diagnostics"),
			onkeydown: t,
			onclick: n
		}), this.dom = A("div", { class: "cm-panel-lint" }, this.list, A("button", {
			type: "button",
			name: "close",
			"aria-label": this.view.state.phrase("close"),
			onclick: () => d_(this.view)
		}, "×")), this.update();
	}
	get selectedIndex() {
		let e = this.view.state.field(o_).selected;
		if (!e) return -1;
		for (let t = 0; t < this.items.length; t++) if (this.items[t].diagnostic == e.diagnostic) return t;
		return -1;
	}
	update() {
		let { diagnostics: e, selected: t } = this.view.state.field(o_), n = 0, r = !1, i = null, a = /* @__PURE__ */ new Set();
		for (e.between(0, this.view.state.doc.length, (e, o, { spec: s }) => {
			for (let e of s.diagnostics) {
				if (a.has(e)) continue;
				a.add(e);
				let o = -1, s;
				for (let t = n; t < this.items.length; t++) if (this.items[t].diagnostic == e) {
					o = t;
					break;
				}
				o < 0 ? (s = new v_(this.view, e), this.items.splice(n, 0, s), r = !0) : (s = this.items[o], o > n && (this.items.splice(n, o - n), r = !0)), t && s.diagnostic == t.diagnostic ? s.dom.hasAttribute("aria-selected") || (s.dom.setAttribute("aria-selected", "true"), i = s) : s.dom.hasAttribute("aria-selected") && s.dom.removeAttribute("aria-selected"), n++;
			}
		}); n < this.items.length && !(this.items.length == 1 && this.items[0].diagnostic.from < 0);) r = !0, this.items.pop();
		this.items.length == 0 && (this.items.push(new v_(this.view, {
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
		let t = e_(this.view.state.field(o_).diagnostics, this.items[e].diagnostic);
		t && this.view.dispatch({
			selection: {
				anchor: t.from,
				head: t.to
			},
			scrollIntoView: !0,
			effects: a_.of(t)
		});
	}
	static open(t) {
		return new e(t);
	}
};
function b_(e, t = "viewBox=\"0 0 40 40\"") {
	return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ${t}>${encodeURIComponent(e)}</svg>')`;
}
function x_(e) {
	return b_(`<path d="m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0" stroke="${e}" fill="none" stroke-width=".7"/>`, "width=\"6\" height=\"3\"");
}
var S_ = /*@__PURE__*/ V.baseTheme({
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
	".cm-lintRange-error": { backgroundImage: /*@__PURE__*/ x_("#f11") },
	".cm-lintRange-warning": { backgroundImage: /*@__PURE__*/ x_("orange") },
	".cm-lintRange-info": { backgroundImage: /*@__PURE__*/ x_("#999") },
	".cm-lintRange-hint": { backgroundImage: /*@__PURE__*/ x_("#66d") },
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
function C_(e) {
	return e == "error" ? 4 : e == "warning" ? 3 : e == "info" ? 2 : 1;
}
function w_(e) {
	let t = "hint", n = 1;
	for (let r of e) {
		let e = C_(r.severity);
		e > n && (n = e, t = r.severity);
	}
	return t;
}
var T_ = /*@__PURE__*/ Sc(c_, { hideOn: t_ }), E_ = [
	o_,
	/*@__PURE__*/ V.decorations.compute([o_], (e) => {
		let { selected: t, panel: n } = e.field(o_);
		return !t || !n || t.from == t.to ? P.none : P.set([s_.range(t.from, t.to)]);
	}),
	T_,
	S_
], D_ = [
	il(),
	cl(),
	zs(),
	pf(),
	_d(),
	ys(),
	ks(),
	D.allowMultipleSelections.of(!0),
	Wu(),
	Cd(Ed, { fallback: !0 }),
	Id(),
	Mg(),
	Yg(),
	ec(),
	rc(),
	Ks(),
	Pm(),
	ts.of([
		...Rg,
		...ym,
		...Ch,
		...Mf,
		...cd,
		...Xg,
		...f_
	])
], O_ = /* @__PURE__ */ "import,primitive,semantic,theme,variant,enum,typeStyle,protocol,requires,host,catalog,mount,as,use,emits,emit,component,page,screen,usage,fixtures,extend,rules,previewBackground,layout,text,icon,media,spacer,Spacer,children,let,if,else,ForEach,in,case,self,null,true,false,hidden,editable,beginEditing,cancelEditing,commitEditing,PointerInput,EditableText,hoverStart,hoverEnd,pressStart,pressEnd,pressCancel,focusStart,focusEnd,activate,appear,dismiss,keyboardDismissed,keyboardCancelled,direction,align,justify,wrap,gap,padding,margin,width,height,background,content,fontSize,fontWeight,fontFamily,lineHeight,letterSpacing,LineHeight,LetterSpacing,Size,Weight,FontFamily,color,cornerRadius,Corner,EdgeInsets,Shadow,Icon,MediaSource,sfSymbols,materialSymbols,file,system,name,url,tl,tr,br,bl,x,y,blurRadius,spread,top,right,bottom,left,opacity,embed,fill,hug,.fill,.hug,.row,.column,.rowReverse,.columnReverse,.stack,.reverseStack,.stretch,.center,.start,.end,Sizing,aspect,.aspect,Direction,Wrap,Align,Justify,Overflow,BorderPosition,TruncateStyle,truncateStyle,ContentMode,AlignSelf,Position,overflow,.visible,.scroll,.clip,visible,scroll,clip,row,column,stretch,center,start,end,spaceBetween,spaceAround,spaceEvenly,nowrap".split(",");
//#endregion
//#region ../../playground/src/pdl-completions.js
function k_(e, t) {
	let n = e.doc.lineAt(t);
	return n.text.slice(0, t - n.from);
}
function A_(e, t) {
	let n = k_(e.state, e.pos), r = e.matchBefore(/[\w.]+$/), i = r ? r.from : e.pos, a = e.pos, o = (r?.text ?? "").toLowerCase(), s = /^\s*cornerRadius\s*=\s*[\w.]*$/i.test(n), c = /^\s*padding\s*=\s*[\w.]*$/i.test(n) || /^\s*margin\s*=\s*[\w.]*$/i.test(n) || /^\s*inset\s*=\s*[\w.]*$/i.test(n), l = /^\s*width\s*=\s*[\w.]*$/i.test(n) || /^\s*height\s*=\s*[\w.]*$/i.test(n), u = s || c || l;
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
	for (let e of O_) (!o || e.toLowerCase().startsWith(o)) && p(e, "keyword");
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
var j_ = [
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
function M_(e, t, n) {
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
var N_ = {
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
function P_(e, t) {
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
function F_(e, t, n) {
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
function I_(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function L_(e, t) {
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
function R_(e, t, n) {
	let r = String(e).replace(/\\/g, "/"), i = r.includes("/") ? r.slice(0, r.lastIndexOf("/")) : "", a = (i ? `${i}/` : "") + String(t).replace(/^\.\//, ""), o = [];
	for (let e of a.split("/")) !e || e === "." || (e === ".." ? o.pop() : o.push(e));
	let s = o.join("/");
	if (n[s] !== void 0) return s;
	let c = String(t).replace(/^.*\//, "");
	return Object.keys(n).find((e) => e === t || e.endsWith(`/${c}`) || e === c) ?? null;
}
function z_(e, t, n) {
	if (!e) return null;
	let r = [
		{
			kind: "component",
			re: RegExp(`^\\s*(?:component|page|screen)\\s+${I_(e)}\\b`)
		},
		{
			kind: "primitive",
			re: RegExp(`^\\s*primitive\\s+${I_(e)}\\b`)
		},
		{
			kind: "semantic",
			re: RegExp(`^\\s*semantic\\s+${I_(e)}\\b`)
		},
		{
			kind: "typeStyle",
			re: RegExp(`^\\s*typeStyle\\s+${I_(e)}\\b`)
		},
		{
			kind: "variant",
			re: RegExp(`^\\s*(?:variant|enum)\\s+${I_(e)}\\b`)
		},
		{
			kind: "protocol",
			re: RegExp(`^\\s*protocol\\s+${I_(e)}\\b`)
		},
		{
			kind: "theme",
			re: RegExp(`^\\s*theme\\s+${I_(e)}\\b`)
		},
		{
			kind: "usage",
			re: RegExp(`^\\s*usage\\s+${I_(e)}\\b`)
		},
		{
			kind: "fixtures",
			re: RegExp(`^\\s*fixtures\\s+${I_(e)}\\b`)
		},
		{
			kind: "case",
			re: RegExp(`^\\s*case\\s+${I_(e)}\\b`)
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
function B_(e, t, n) {
	if (e.kind === "import") {
		let r = R_(n, e.text, t);
		return r ? {
			path: r,
			line: 1,
			kind: "import",
			name: e.text
		} : null;
	}
	return z_(e.text, t, n);
}
//#endregion
//#region src/symbols.js
function V_(e, t) {
	if (!e || !t) return null;
	let n = [
		RegExp(`^[ \\t]*(component|page|screen)\\s+${q_(t)}\\b`, "m"),
		RegExp(`^[ \\t]*fixtures\\s+${q_(t)}\\b`, "m"),
		RegExp(`^[ \\t]*samples\\s+${q_(t)}\\b`, "m"),
		RegExp(`^[ \\t]*(primitive|semantic)\\s+[\\w.]*${q_(t)}\\b`, "m")
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
function H_(e) {
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
function U_(e, t, n) {
	let r = H_(t[e] || "").filter((e) => [
		"component",
		"page",
		"screen"
	].includes(e.kind)).map((e) => e.name);
	if (r.length) return G_(r);
	let i = [];
	if (n?.componentFiles) for (let [t, r] of Object.entries(n.componentFiles)) (K_(r) === K_(e) || String(r).endsWith(e)) && i.push(t);
	return G_(i);
}
function W_(e, t) {
	let n = H_(e);
	if (!n.length) return null;
	let r = Math.max(0, Math.min(Number(t) || 0, String(e || "").length)), i = String(e || "").slice(0, r).split("\n").length - 1, a = null;
	for (let e of n) if (e.line <= i) a = e;
	else break;
	return a;
}
function G_(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e) !r || t.has(r) || (t.add(r), n.push(r));
	return n;
}
function K_(e) {
	return String(e || "").replace(/\\/g, "/").replace(/^\.\//, "");
}
function q_(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function J_(e) {
	let t = JSON.stringify(e ?? {}), n = /* @__PURE__ */ new Set(), r = /\b([A-Z][A-Za-z0-9_]*)\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+\b/g, i;
	for (; i = r.exec(t);) n.add(i[0]);
	return [...n];
}
//#endregion
//#region src/editor.js
var Y = null, Y_ = null, X_ = null, Z_ = null, Q_ = null, $_ = !1;
function ev() {
	let t = e.catalogue, n = [];
	t?.components && n.push(...t.components), t?.themes && n.push(...t.themes);
	for (let e of t?.designSummary?.typeStyles ?? []) typeof e == "string" ? n.push(e) : e?.name && n.push(e.name);
	for (let e of t?.designSummary?.primitives ?? []) typeof e == "string" ? n.push(e) : e?.name && n.push(e.name);
	for (let e of t?.designSummary?.semantics ?? []) typeof e == "string" ? n.push(e) : e?.name && n.push(e.name);
	for (let e of Object.keys(t?.samples ?? {})) n.push(e);
	return n;
}
function tv() {
	if (!Y || !Y_) return !1;
	let t = Y.state.selection.main.head, n = L_(Y.state.doc, t);
	if (!n) return !1;
	let r = B_(n, e.files, Y_);
	return r ? (Z_?.(r.path, r.line, r.name), !0) : !1;
}
function nv(t, n = {}) {
	return X_ = n.onChange ?? null, Z_ = n.onGoto ?? null, Q_ = n.onCursorScope ?? null, Y = new V({
		parent: t,
		state: D.create({
			doc: "",
			extensions: [
				D_,
				V.lineWrapping,
				ts.of([
					bm,
					...Xg,
					{
						key: "F12",
						run: () => tv()
					},
					{
						key: "Mod-b",
						run: () => tv()
					}
				]),
				Yg({ override: [(e) => A_(e, ev)] }),
				V.domEventHandlers({ click(t, n) {
					if (!(t.metaKey || t.ctrlKey)) return !1;
					let r = n.posAtCoords({
						x: t.clientX,
						y: t.clientY
					});
					if (r == null) return !1;
					let i = L_(n.state.doc, r);
					if (!i) return !1;
					let a = B_(i, e.files, Y_ || e.editFile || "");
					return a ? (Z_?.(a.path, a.line, a.name), !0) : !1;
				} }),
				V.updateListener.of((t) => {
					if (!$_) {
						if (t.docChanged && Y_) {
							let n = t.state.doc.toString();
							e.files[Y_] = n, i(Y_), X_?.(Y_, n);
						}
						(t.selectionSet || t.docChanged) && (iv(), Q_?.());
					}
				}),
				V.theme({
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
	}), rv(), iv(), av(), Y;
}
function rv() {
	let e = document.getElementById("insertTemplate");
	e && (e.innerHTML = "<option value=\"\">Template…</option>" + j_.map((e) => `<option value="${e.id}">${dv(e.label)}</option>`).join(""));
}
function iv() {
	let e = document.getElementById("addProperty"), t = document.getElementById("addPropertyKind");
	if (!e || !Y) return;
	let n = Y.state.selection.main.head, r = P_(Y.state.doc.toString(), n);
	t && (t.textContent = `Kind: ${r}`);
	let i = N_[r] || N_.unknown, a = e.value;
	e.innerHTML = "<option value=\"\">Property…</option>" + i.map((e) => `<option value="${e.id}">${dv(e.label)}</option>`).join(""), i.some((e) => e.id === a) && (e.value = a);
}
function av() {
	document.getElementById("insertTemplate")?.addEventListener("change", (e) => {
		let t = e.target.value;
		if (!t || !Y) return;
		let n = j_.find((e) => e.id === t);
		if (e.target.value = "", !n) return;
		let r = Y.state.selection.main.head, i = M_(Y.state.doc.toString(), r, n.snippet);
		Y.dispatch({
			changes: {
				from: r,
				insert: i
			},
			selection: { anchor: r + i.length }
		}), Y.focus();
	}), document.getElementById("addProperty")?.addEventListener("change", (e) => {
		let t = e.target.value;
		if (!t || !Y) return;
		let n = Y.state.selection.main.head, r = (N_[P_(Y.state.doc.toString(), n)] || N_.unknown).find((e) => e.id === t);
		if (e.target.value = "", !r) return;
		let i = F_(Y.state.doc.toString(), n, r.snippet);
		Y.dispatch({
			changes: {
				from: n,
				insert: i
			},
			selection: { anchor: n + i.length }
		}), Y.focus(), iv();
	});
}
function ov() {
	if (!Y) return;
	let t = e.editFile;
	$_ = !0;
	try {
		if (!t) {
			Y_ = null, Y.dispatch({ changes: {
				from: 0,
				to: Y.state.doc.length,
				insert: ""
			} });
			return;
		}
		let n = e.files[t] ?? "";
		if (Y_ === t && Y.state.doc.toString() === n) return;
		Y_ = t, Y.dispatch({ changes: {
			from: 0,
			to: Y.state.doc.length,
			insert: n
		} });
	} finally {
		$_ = !1, iv();
	}
}
function sv(t) {
	if (!Y || !e.editFile) return;
	let n = V_(e.files[e.editFile] || "", t);
	n && cv(n.line + 1);
}
function cv(e) {
	if (!Y) return;
	let t = Y.state.doc.line(Math.min(Math.max(1, e), Y.state.doc.lines));
	Y.dispatch({
		selection: { anchor: t.from },
		effects: V.scrollIntoView(t.from, { y: "start" })
	}), Y.focus();
}
function lv() {
	!Y || !Y_ || (e.files[Y_] = Y.state.doc.toString());
}
function uv() {
	return Y ? Y.state.selection.main.head : null;
}
function dv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
//#endregion
//#region src/navigator.js
function fv(t) {
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
		return t.length ? `<div class="nav-section"><div class="nav-section-title">${pv(e)}</div>${t.join("")}</div>` : "";
	}
	function s({ id: e, label: t, role: n, selected: r, inFile: i, kind: a, file: o }) {
		let s = n ? `<span class="role">${pv(n)}</span>` : "";
		return `<button type="button" class="${[
			"nav-item",
			r ? "is-selected" : "",
			!r && i ? "is-in-file" : ""
		].filter(Boolean).join(" ")}" data-kind="${a}" data-name="${mv(e)}" data-file="${mv(o || "")}">${pv(t)}${s}</button>`;
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
		i.innerHTML = a.length ? `<div class="nav-section">${a.map((e) => e.replace("nav-item", "nav-item nav-file")).join("")}</div>` : "<p class=\"hint\">No files</p>", i.innerHTML = a.length ? `<div class="nav-section">${r.filter((e) => !n || e.toLowerCase().includes(n)).map((t) => `<button type="button" class="nav-item nav-file${e.selectedKind === "file" && e.editFile === t || e.editFile === t && e.selectedKind === "component" || e.editFile === t && (e.selectedKind === "tokens" || e.selectedKind === "theme" || e.selectedKind === "typeStyles") ? " is-selected" : ""}" data-kind="file" data-name="${mv(t)}" data-file="${mv(t)}">${pv(t)}</button>`).join("")}</div>` : "<p class=\"hint\">No files</p>", i.querySelectorAll(".nav-item").forEach((e) => {
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
function pv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mv(e) {
	return pv(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/world.js
function hv(t) {
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
		else if (!g) n.innerHTML = `<span class="hint">No fixtures for ${_v(u)}. Switch to Params to edit knobs.</span>`, i.hidden = !0;
		else {
			n.innerHTML = [`<button type="button" class="chip${m ? "" : " is-active"}" data-world="">Default</button>`, ...p.map((e) => `<button type="button" class="chip${m === e ? " is-active" : ""}" data-world="${vv(e)}">${_v(e)}</button>`)].join(""), n.querySelectorAll(".chip").forEach((n) => {
				n.addEventListener("click", () => {
					let i = n.getAttribute("data-world") || null;
					e.activeWorld[u] = i, e.worldMode = "fixtures", i && f[i] ? e.paramOverrides[u] = {
						...e.paramOverrides[u] ?? {},
						...gv(f[i])
					} : e.paramOverrides[u] = {}, r(), t.onChange(), l();
				});
			});
			let a = J_(m && f[m] ? f[m] : {});
			a.length ? (i.hidden = !1, i.innerHTML = "Samples used " + a.map((e) => `<button type="button" data-sample="${vv(e)}">${_v(e)}</button>`).join(" "), i.querySelectorAll("button").forEach((e) => {
				e.addEventListener("click", () => t.onSampleClick?.(e.getAttribute("data-sample")));
			})) : (i.hidden = !0, i.innerHTML = "");
		}
		if (!y) {
			a.innerHTML = "";
			return;
		}
		let ee = e.paramOverrides[u] ?? {};
		if (!h.length) {
			a.innerHTML = "<span class=\"hint\">No editable params on this component.</span>";
			return;
		}
		a.innerHTML = "<div class=\"hint\" style=\"margin-bottom:6px\">Param knobs · preview only (clears active fixture)</div>" + h.map((e) => {
			let t = d.variantCases?.[e.typeName], n = ee[e.name] ?? e.default ?? "";
			return Array.isArray(t) && t.length ? `<label><span>${_v(e.name)}</span><select data-param="${vv(e.name)}">${t.map((e) => `<option value="${vv(e)}"${String(n) === e || String(n) === `.${e}` ? " selected" : ""}>${_v(e)}</option>`).join("")}</select></label>` : `<label><span>${_v(e.name)}</span><input data-param="${vv(e.name)}" value="${vv(String(n ?? ""))}" /></label>`;
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
function gv(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = r);
	return t;
}
function _v(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function vv(e) {
	return _v(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/companions.js
function yv(t) {
	let n = document.getElementById("companionDock");
	function r(t) {
		if (!t) return null;
		for (let [n, r] of Object.entries(e.files)) if (RegExp(`\\b(fixtures|usage|rules|extend)\\s+${Sv(t)}\\b`).test(r)) return n;
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
		let o = a.usageByComponent?.[i], s = a.rulesByComponent?.[i], c = r(i), l = Object.keys(e.files).find((t) => RegExp(`\\b(component|page|screen)\\s+${Sv(i)}\\b`).test(e.files[t])) || null, u = [];
		if (u.push(`<div class="notes-title">${bv(i)}</div>`), c || l) {
			if (u.push("<div class=\"notes-actions\">"), l && u.push(`<button type="button" class="btn ghost btn-tiny" data-reveal="${xv(l)}" data-sym="${xv(i)}">Open layout</button>`), c && u.push(`<button type="button" class="btn ghost btn-tiny" data-reveal="${xv(c)}" data-sym="${xv(i)}">Open companions</button>`), c && e.files[c]) {
				let t = V_(e.files[c], i);
				t && u.push(`<span class="hint">${bv(c)}${t.line == null ? "" : `:${t.line + 1}`}</span>`);
			}
			u.push("</div>");
		}
		if (o ? u.push(`<div class="notes-section"><div class="notes-label">Usage</div><pre class="notes-body">${bv(o)}</pre></div>`) : u.push("<div class=\"notes-section\"><div class=\"notes-label\">Usage</div><p class=\"hint\">No usage note for this symbol.</p></div>"), s && (s.rules?.length || s.tagOps?.length)) {
			let e = (s.rules ?? []).map((e) => {
				let t = e.severity || e.level || "should", n = e.message || e.text || JSON.stringify(e);
				return `<li class="rule rule-${xv(String(t))}"><span class="sev">${bv(String(t))}</span> ${bv(String(n))}</li>`;
			}).join("");
			u.push(`<div class="notes-section"><div class="notes-label">Rules</div><ul class="rule-list">${e || "<li class=\"hint\">Tags only</li>"}</ul></div>`);
		} else u.push("<div class=\"notes-section\"><div class=\"notes-label\">Rules</div><p class=\"hint\">No rules companion.</p></div>");
		let d = a.interactionsByComponent?.[i];
		if (Array.isArray(d) && d.length) {
			let e = [];
			for (let t of d) for (let n of t.handlers ?? []) n?.event && e.push(String(n.event));
			e.length && u.push(`<div class="notes-section"><div class="notes-label">Host events</div><p class="hint">${bv(e.join(" · "))} — runtime → this component (not parent emits)</p></div>`);
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
function bv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function xv(e) {
	return bv(e).replace(/"/g, "&quot;");
}
function Sv(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//#endregion
//#region src/problems.js
var Cv = [], wv = null;
function Tv(e = {}) {
	wv = e.onGoto ?? null, document.getElementById("btnClearProblems")?.addEventListener("click", () => {
		Dv();
	});
}
function Ev(e, t = {}) {
	if (!e) {
		Dv();
		return;
	}
	Cv = Ov(e, t.file), kv();
}
function Dv() {
	Cv = [], kv();
}
function Ov(e, t) {
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
function kv() {
	let e = document.getElementById("problems"), t = document.getElementById("btnClearProblems");
	if (e) {
		if (!Cv.length) {
			e.hidden = !0, e.innerHTML = "", t && (t.hidden = !0);
			return;
		}
		e.hidden = !1, t && (t.hidden = !1), e.innerHTML = Cv.map((e, t) => `<div class="prob-row">${e.file && e.line ? `<button type="button" class="prob-loc" data-i="${t}">${jv(Av(e.file))}:${e.line}</button>` : e.file ? `<span class="prob-loc">${jv(Av(e.file))}</span>` : ""}<span class="prob-msg">${jv(e.message || e.raw || "")}</span></div>`).join(""), e.querySelectorAll(".prob-loc[data-i]").forEach((e) => {
			e.addEventListener("click", () => {
				let t = Number(e.getAttribute("data-i")), n = Cv[t];
				n && wv?.(n);
			});
		});
	}
}
function Av(e) {
	return String(e).replace(/\\/g, "/").split("/").slice(-2).join("/");
}
function jv(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
//#endregion
//#region ../../playground/src/wasm-bake.js
var Mv = null;
function Nv(e, t) {
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
function Pv() {
	return Mv ||= (async () => {
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
	})(), Mv;
}
//#endregion
//#region ../../playground/src/preview-apply.js
function Fv(e) {
	return !e || e.nodeType !== 1 || typeof e.getAttribute != "function" ? null : e.getAttribute("data-pdl-instance-let") || e.getAttribute("data-pdl-id") || e.getAttribute("data-pdl-state") || e.getAttribute("data-pdl-instance-key") || null;
}
var Iv = [
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
function Lv(e, t) {
	for (let n of Iv) {
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
	for (let n of Array.from(t.attributes)) !n.name.startsWith("data-") && n.name !== "style" && n.name !== "class" || Iv.includes(n.name) || e.getAttribute(n.name) !== n.value && e.setAttribute(n.name, n.value);
}
function Rv(e, t) {
	let n = Array.from(t.children), r = Array.from(e.children), i = /* @__PURE__ */ new Map();
	for (let e of r) {
		let t = Fv(e);
		t && !i.has(t) && i.set(t, e);
	}
	let a = [], o = /* @__PURE__ */ new Set();
	function s(e) {
		let t = e.className || "";
		return r.find((n) => !o.has(n) && !Fv(n) && n.tagName === e.tagName && (n.className || "") === t);
	}
	for (let t of n) {
		let n = Fv(t), r = n ? i.get(n) : null;
		r && o.has(r) && (r = null), !r && !n && (r = s(t) || null), r && r.tagName === t.tagName ? (o.add(r), zv(r, t), a.push(r)) : a.push(e.ownerDocument.importNode(t, !0));
	}
	for (; e.firstChild;) e.removeChild(e.firstChild);
	for (let t of a) e.appendChild(t);
}
function zv(e, t) {
	if (e.tagName !== t.tagName) {
		e.replaceWith(e.ownerDocument.importNode(t, !0));
		return;
	}
	if (Lv(e, t), e.tagName === "INPUT") return;
	if (e.tagName === "SELECT") {
		let n = e.children.length > 0, r = t.children.length > 0;
		(n || r) && Rv(e, t);
		let i = t, a = e;
		a.value !== i.value && (a.value = i.value);
		return;
	}
	let n = e.children.length > 0, r = t.children.length > 0;
	if (!n && !r) {
		e.textContent !== t.textContent && (e.textContent = t.textContent);
		return;
	}
	Rv(e, t);
}
function Bv(e, t) {
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
		if (o && c) zv(o, c);
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
		let p = Vv(e), m = Vv(n);
		if (p.length === m.length && p.length > 0) for (let e = 0; e < p.length; e++) zv(p[e], m[e]);
		else Hv(e, n);
	}
	return !0;
}
function Vv(e) {
	let t = [];
	for (let n of Array.from(e.children)) n.classList.contains("pdl-preview-head") || n.classList.contains("pdl-preview-params") || n.classList.contains("pdl-param-bar") || n.classList.contains("pdl-fixture-bar") || n.classList.contains("pdl-world-mode") || n.classList.contains("pdl-source-link") || t.push(n);
	return t;
}
function Hv(e, t) {
	let n = Vv(e), r = Vv(t);
	for (let e of n) e.remove();
	let i = e.querySelector(".pdl-param-bar") || e.querySelector(".pdl-fixture-bar") || e.querySelector(".pdl-preview-params");
	for (let t of r) {
		let n = e.ownerDocument.importNode(t, !0);
		i && i.parentElement === e ? i.insertAdjacentElement("afterend", n) : e.appendChild(n);
	}
}
function Uv(e) {
	try {
		e.contentWindow?.postMessage({ type: "pdl-rebind-interactive" }, "*");
	} catch {}
}
//#endregion
//#region src/inspector.js
function Wv() {
	return document.getElementById("inspectPane");
}
function Gv() {
	return document.querySelector(".preview-frame-wrap");
}
function Kv() {
	let e = Wv(), t = Gv();
	e && (e.hidden = !0, e.innerHTML = ""), t && (t.hidden = !1);
}
function qv(e, t, n) {
	let r = Wv(), i = Gv();
	if (i && (i.hidden = !0), r) return r.hidden = !1, r.innerHTML = `<div class="inspect-head"><strong>${X(e)}</strong></div><div class="inspect-body">${t}</div>`, n;
}
function Jv() {
	let t = e.selectedKind;
	if (!t || t === "component") return Kv(), { handled: !1 };
	let n = e.catalogue;
	if (!n) return qv("—", "<p class=\"hint\">No catalogue loaded.</p>"), {
		handled: !0,
		status: "No catalogue"
	};
	if (t === "tokens") {
		let e = Yv(n), t = Object.keys(n.tokenTables?.primitives ?? {}).length + Object.keys(n.tokenTables?.semantics ?? {}).length;
		return qv("Tokens", e, `${t} token(s)`), {
			handled: !0,
			status: `Tokens · ${t}`
		};
	}
	if (t === "theme") {
		let t = e.selectedSymbol || e.theme, r = Xv(n, t);
		return qv(t ? `Theme · ${t}` : "Theme", r), {
			handled: !0,
			status: t ? `Theme · ${t}` : "Theme"
		};
	}
	if (t === "typeStyles") {
		let e = Zv(n), t = Object.keys(n.tokenTables?.typeStyles ?? {}).length;
		return qv("Type styles", e), {
			handled: !0,
			status: `Type styles · ${t}`
		};
	}
	if (t === "samples") {
		let t = e.selectedSymbol, r = Qv(n, t);
		return qv(t ? `Samples · ${t}` : "Samples", r), {
			handled: !0,
			status: t ? `Samples · ${t}` : "Samples"
		};
	}
	if (t === "file") {
		let t = e.editFile, r = $v(t, n);
		return qv(t || "File", r), {
			handled: !0,
			status: t ? `File · ${t}` : "File"
		};
	}
	return Kv(), { handled: !1 };
}
function Yv(e) {
	let t = e.tokenTables ?? {}, n = t.primitives ?? {}, r = t.semantics ?? {}, i = [];
	return i.push(ey("Primitives", Object.values(n), n, r)), i.push(ey("Semantics", Object.values(r), n, r)), !Object.keys(n).length && !Object.keys(r).length ? "<p class=\"hint\">No tokens in this catalogue.</p>" : i.join("");
}
function Xv(e, t) {
	if (!t) return "<p class=\"hint\">Select a theme.</p>";
	let n = e.tokenTables?.themes?.[t];
	if (!n) return `<p class="hint">Theme <code>${X(t)}</code> not found.</p>`;
	let r = n.overrides ?? {}, i = e.tokenTables?.primitives ?? {}, a = e.tokenTables?.semantics ?? {}, o = Object.entries(r).map(([e, t]) => ({
		name: e,
		tokenType: ry(e, i, a),
		definition: t
	}));
	return o.length ? ey("Overrides", o, i, a) : "<p class=\"hint\">No overrides on this theme.</p>";
}
function Zv(e) {
	let t = e.tokenTables?.typeStyles ?? {}, n = Object.values(t);
	return n.length ? `<ul class="token-list type-style-list">${n.map((e) => {
		let t = e.props ?? {}, n = iy(t.fontFamily) ?? "system-ui", r = iy(t.fontSize) ?? 16, i = iy(t.fontWeight) ?? 400, a = iy(t.lineHeight), o = [
			`font-family:${oy(String(n))}`,
			`font-size:${Math.min(Number(r) || 16, 36)}px`,
			`font-weight:${Number(i) || 400}`,
			a == null ? "" : `line-height:${a}`
		].filter(Boolean).join(";"), s = [
			n,
			`${r}px`,
			i,
			a == null ? null : `lh ${a}`
		].filter(Boolean).join(" · ");
		return `<li><span class="type-sample" style="${sy(o)}" aria-hidden="true">Ag</span><code class="name">${X(e.name)}</code><span class="type">${X(s)}</span></li>`;
	}).join("")}</ul>` : "<p class=\"hint\">No type styles.</p>";
}
function Qv(e, t) {
	let n = t ? e.samples?.[t] : null;
	if (!t || !n) return "<p class=\"hint\">Select a samples bank.</p>";
	let r = Array.isArray(n) ? n.map((e, t) => ({
		key: String(t),
		value: e
	})) : Object.entries(n).map(([e, t]) => ({
		key: e,
		value: t
	}));
	return r.length ? `<ul class="token-list samples-list">${r.map((e) => `<li><code class="name">${X(e.key)}</code><code class="hex">${X(ay(e.value))}</code></li>`).join("")}</ul>` : "<p class=\"hint\">Empty samples bank.</p>";
}
function $v(t, n) {
	if (!t) return "<p class=\"hint\">No file selected.</p>";
	let r = e.files[t] ?? "", i = /\b(primitive|semantic)\s+/.test(r), a = /\btheme\s+\w+/.test(r), o = /\btypeStyle\s+/.test(r), s = (n.components ?? []).filter((e) => {
		let i = n.componentFiles?.[e];
		if (i) {
			let e = String(i).replace(/\\/g, "/");
			if (e.endsWith(t) || t.endsWith(e) || e.includes(t)) return !0;
		}
		return RegExp(`\\b(component|page|screen)\\s+${cy(e)}\\b`).test(r);
	});
	if (i && !s.length) return Yv(n);
	if (a && !s.length) return Xv(n, r.match(/\btheme\s+(\w+)/)?.[1] ?? e.theme);
	if (o && !s.length) return Zv(n);
	let c = [];
	return c.push(`<p class="hint">${X(t)}</p>`), s.length ? c.push(`<ul class="token-list">${s.map((e) => `<li><code class="name">${X(e)}</code><span class="type">${X(n.componentRoles?.[e] || "component")}</span></li>`).join("")}</ul>`) : c.push("<p class=\"hint\">No previewable symbols in this file. Open System and pick Tokens or a component.</p>"), c.join("");
}
function ey(e, t, n, r) {
	if (!t.length) return "";
	let i = [...t].sort((e, t) => String(e.name).localeCompare(String(t.name)));
	return `<div class="token-section"><div class="token-section-title">${X(e)}</div><ul class="token-list">${i.map((e) => ty(e, n, r)).join("")}</ul></div>`;
}
function ty(e, t, n) {
	let r = ny(e, t, n), i = e.tokenType || r.tokenType || "", a = "<span class=\"swatch empty\" aria-hidden=\"true\"></span>", o = "";
	if (i === "Color" && r.cssColor) a = `<span class="swatch" title="${sy(r.label || r.cssColor)}"><span class="fill" style="background:${sy(r.cssColor)}"></span></span>`, o = `<code class="hex">${X(r.label || r.cssColor)}</code>`;
	else if (i === "Distance" && r.number != null) {
		let e = Math.max(2, Math.min(Math.round(Math.abs(r.number)), 96));
		a = `<span class="ruler" title="${sy(String(r.number))}px" aria-hidden="true"><span class="tick"></span><span class="beam" style="width:${e}px"></span><span class="tick"></span></span>`, o = `<code class="hex">${X(String(r.number))}px</code>`;
	} else if (i === "Radius" && r.number != null) {
		let e = Math.max(0, r.number), t = Math.max(14, Math.min(Math.round(e) || 14, 48)), n = Math.min(e, t);
		a = `<span class="radius-corner" title="${sy(String(e))}px" aria-hidden="true" style="width:${t}px;height:${t}px;border-top-left-radius:${n}px"></span>`, o = `<code class="hex">${X(String(e))}px</code>`;
	} else i === "Opacity" && r.number != null ? o = `<code class="hex">${X(String(r.number))}</code>` : r.label ? o = `<code class="hex">${X(r.label)}</code>` : r.ref && (o = `<code class="hex">${X(r.ref)}</code>`);
	let s = i ? `<span class="type">${X(i)}</span>` : "";
	return `<li>${a}<code class="name">${X(e.name)}</code>${s}${o}</li>`;
}
function ny(e, t, n, r = 0) {
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
				...ny(e, t, n, r + 1),
				ref: i
			} : {
				ref: i,
				label: i
			};
		}
		if (i.startsWith("semantic:")) {
			let e = n[i.slice(9)];
			return e ? {
				...ny(e, t, n, r + 1),
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
	return { label: ay(i) };
}
function ry(e, t, n) {
	return t[e]?.tokenType || n[e]?.tokenType || "Color";
}
function iy(e) {
	return e == null ? null : typeof e == "object" && "value" in e ? e.value : e;
}
function ay(e) {
	if (e == null) return "—";
	if (typeof e == "string") return e;
	if (typeof e == "number" || typeof e == "boolean") return String(e);
	try {
		return JSON.stringify(e);
	} catch {
		return String(e);
	}
}
function oy(e) {
	return `"${String(e).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}
function X(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function sy(e) {
	return X(e).replace(/"/g, "&quot;");
}
function cy(e) {
	return String(e).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//#endregion
//#region src/preview.js
var ly = null, uy = 0, dy = 0, fy = null, py = null, my = null, hy = null;
function gy(t, n = {}) {
	ly = t, fy = n.onStatus ?? null, py = n.onError ?? null, my = n.onOpenSource ?? null, hy = n.onWorldMutated ?? null, window.addEventListener("message", (e) => {
		let t = e.data;
		!t || typeof t != "object" || _y(t);
	}), document.getElementById("previewPin")?.addEventListener("change", (t) => {
		e.previewPinned = t.target.checked, r();
	}), document.querySelectorAll("[data-preview-mode]").forEach((t) => {
		t.addEventListener("click", () => {
			e.previewMode = t.getAttribute("data-preview-mode") === "gallery" ? "gallery" : "primary", Ey(), Z();
		});
	}), document.getElementById("themeSelect")?.addEventListener("change", (t) => {
		e.theme = t.target.value, Z();
	}), document.getElementById("btnResetWorld")?.addEventListener("click", () => {
		let t = e.previewRoot;
		t && (e.activeWorld[t] = null, e.paramOverrides[t] = {}), e.worldMode = "fixtures", r(), hy?.(), Z();
	});
}
function _y(t) {
	let n = t.type;
	if (n === "pdl-open-source" && typeof t.component == "string" && t.component) {
		my?.(t.component);
		return;
	}
	if (n === "pdl-world-mode" && (t.mode === "fixtures" || t.mode === "params")) {
		e.worldMode = t.mode, r(), hy?.();
		return;
	}
	if (n === "pdl-fixture" && typeof t.component == "string" && t.component) {
		vy(t.component, typeof t.label == "string" && t.label.trim() ? String(t.label) : null);
		return;
	}
	if (n === "pdl-param" && typeof t.component == "string" && t.kv && typeof t.kv == "object") {
		yy(t.component, t.kv);
		return;
	}
}
function vy(t, n) {
	let i = e.catalogue?.fixturesByComponent?.[t] ?? {};
	e.selectedKind = "component", e.previewPinned || (e.previewRoot = t), e.selectedSymbol = t, e.worldMode = "fixtures", n && i[n] ? (e.activeWorld[t] = n, e.paramOverrides[t] = { ...xy(i[n]) }) : (e.activeWorld[t] = null, e.paramOverrides[t] = {}), r(), hy?.(), Z(0);
}
function yy(t, n) {
	e.selectedKind = "component", e.previewPinned || (e.previewRoot = t), e.selectedSymbol = t, e.activeWorld[t] = null, e.worldMode = "params", e.paramOverrides[t] = by(t, n), r(), hy?.(), Z(0);
}
function by(t, n) {
	let r = e.catalogue?.componentParams?.[t] ?? [], i = {};
	for (let [t, a] of Object.entries(n ?? {})) {
		if (a == null || typeof a == "object") continue;
		let n = a, o = r.find((e) => e.name === t), s = o ? e.catalogue?.variantCases?.[o.typeName] : void 0;
		typeof n == "string" && (Array.isArray(s) && s.includes(n.replace(/^\./, "")) ? n = `.${n.replace(/^\./, "")}` : n === "true" ? n = !0 : n === "false" ? n = !1 : n !== "" && !Number.isNaN(Number(n)) && /^-?\d+(\.\d+)?$/.test(n) && (n = Number(n))), i[t] = n;
	}
	return i;
}
function xy(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = r);
	return t;
}
function Z(e = 280) {
	window.clearTimeout(dy), dy = window.setTimeout(() => {
		Sy();
	}, e);
}
async function Sy() {
	let t = ++uy;
	if (!e.root || !e.entry || !ly) return;
	let n = Jv();
	if (n.handled) {
		py?.(null), fy?.(n.status || "Inspector");
		return;
	}
	let r = e.previewRoot;
	if (!r && e.previewMode === "primary") {
		fy?.("Select a component to preview");
		return;
	}
	lv(), py?.(null), fy?.("Baking…");
	try {
		let n = await Pv();
		if (!n) throw Error("WASM bake unavailable — run npm run build:wasm");
		let { filesJson: i, entry: a } = Nv({
			...(await p(e.root, e.entry)).files ?? {},
			...e.files
		}, e.entry), o = e.theme || "", s = (e.catalogue?.hostParams?.length ?? 0) > 0, c = s ? "Default" : "", l = JSON.stringify(s ? e.hostFacts ?? {} : {}), u, d;
		e.previewMode === "gallery" && e.editFile ? (u = U_(e.editFile, e.files, e.catalogue), !u.length && r && (u = [r]), r && u.includes(r) && (u = [r, ...u.filter((e) => e !== r)])) : d = r || void 0;
		let f = performance.now(), m;
		if (u && u.length > 1) {
			let t = { components: {} };
			for (let r of u) {
				let s = wy(e.paramOverrides[r] ?? {}), u = n.bake_component_sources(i, a, r, o, JSON.stringify(s), c, l, void 0), d = JSON.parse(u);
				Object.assign(t.components, d.components ?? {}), t.tokens || Object.assign(t, {
					...d,
					components: t.components
				});
			}
			m = t;
		} else {
			let t = d || u?.[0];
			if (!t) {
				fy?.("Nothing to preview");
				return;
			}
			let r = wy(e.paramOverrides[t] ?? {}), s = n.bake_component_sources(i, a, t, o, JSON.stringify(r), c, l, void 0);
			m = JSON.parse(s), u?.length === 1 ? d = void 0 : (d = t, u = void 0);
		}
		let g = Math.round(performance.now() - f);
		if (t !== uy) return;
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
		if (t !== uy) return;
		if (!y.ok) throw Error(y.error || "render-from-bake failed");
		Cy(y.html), Dy(e.selectedSymbol || e.previewRoot), fy?.(v > 1 ? `Preview · file gallery · ${v} · bake ${g}ms` : `Preview · wasm · bake ${g}ms`), py?.(null);
	} catch (e) {
		if (t !== uy) return;
		let n = e instanceof Error ? e.message : String(e);
		py?.(n), fy?.("Preview failed");
	}
}
function Cy(t) {
	if (!ly) return;
	let n = ly.contentDocument;
	if (n && n.documentElement && n.body?.querySelector?.(".pdl-root, .pdl-page, [data-pdl-id]")) try {
		if (Bv(n, t)) {
			n.querySelectorAll("section.pdl-preview").forEach((t) => {
				t.setAttribute("data-world-mode", e.worldMode), t.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((t) => {
					t.classList.toggle("is-active", t.getAttribute("data-world-mode") === e.worldMode);
				});
			}), Uv(ly), Dy(e.selectedSymbol || e.previewRoot);
			return;
		}
	} catch {}
	ly.srcdoc = t, ly.addEventListener("load", () => {
		let t = ly?.contentDocument;
		t && t.querySelectorAll("section.pdl-preview").forEach((t) => {
			t.setAttribute("data-world-mode", e.worldMode), t.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((t) => {
				t.classList.toggle("is-active", t.getAttribute("data-world-mode") === e.worldMode);
			});
		});
	}, { once: !0 });
}
function wy(e) {
	let t = {};
	for (let [n, r] of Object.entries(e ?? {})) r != null && typeof r != "object" && (t[n] = r);
	return t;
}
function Ty() {
	let t = document.getElementById("themeSelect");
	t && (t.innerHTML = "<option value=\"\">Default</option>" + (e.catalogue?.themes ?? []).map((e) => `<option value="${e}">${e}</option>`).join(""), t.value = e.theme || "");
}
function Ey() {
	document.querySelectorAll("[data-preview-mode]").forEach((t) => {
		let n = t.getAttribute("data-preview-mode");
		t.classList.toggle("is-active", n === e.previewMode);
	});
}
function Dy(e) {
	if (!ly) return;
	let t = ly.contentDocument;
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
function Oy() {
	let t = document.getElementById("hostChrome");
	if (!t) return;
	let n = e.catalogue?.hostParams ?? [];
	if (!n.length) {
		t.hidden = !0, t.innerHTML = "";
		return;
	}
	t.hidden = !1, t.innerHTML = n.map((e) => {
		let t = Array.isArray(e.cases) ? e.cases : [];
		return `<label>${ky(e.name)} <select data-host="${Ay(e.name)}"><option value="">Auto</option>${t.map((e) => `<option value="${Ay(e)}">${ky(e)}</option>`).join("")}</select></label>`;
	}).join(""), t.querySelectorAll("select").forEach((t) => {
		t.addEventListener("change", () => {
			let n = t.getAttribute("data-host");
			n && (t.value ? e.hostFacts[n] = t.value.startsWith(".") ? t.value : `.${t.value}` : delete e.hostFacts[n], Z());
		});
	});
}
function ky(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ay(e) {
	return ky(e).replace(/"/g, "&quot;");
}
//#endregion
//#region src/main.js
var jy = "pdl-studio-recent-v1", My = "pdl-studio-last-v1", Ny = document.getElementById("welcome"), Py = document.getElementById("workspace"), Fy = document.getElementById("openDialog"), Iy = document.getElementById("newDialog"), Q = fv({ onSelect: Qy }), Ly = hv({
	onChange: () => {
		Ly.renderWorld(), Z();
	},
	onSampleClick: (e) => {
		let t = String(e).split(".")[0];
		Qy({
			kind: "samples",
			name: t
		});
	}
}), Ry = yv({ onReveal: (t, n) => {
	e.editFile = t, ov(), n && sv(n), Q.renderNavigator(), $();
} });
Tv({ onGoto: (t) => {
	if (!t.file) return;
	let n = Object.keys(e.files).find((e) => e === t.file || e.endsWith(`/${t.file}`) || t.file.endsWith(e)) || t.file;
	e.files[n] && (e.editFile = n, ov(), t.line && cv(t.line), Q.renderNavigator(), $());
} }), nv(document.getElementById("editorMount"), {
	onChange: () => {
		$(), Z(450);
	},
	onGoto: (t, n, r) => {
		e.files[t] && (e.editFile = t, r && (e.selectedSymbol = r), ov(), cv(n), Q.renderNavigator(), Ry.renderCompanion(), $());
	},
	onCursorScope: () => {
		ab();
	}
}), gy(document.getElementById("previewFrame"), {
	onStatus: (e) => {
		document.getElementById("statusLeft").textContent = e;
	},
	onError: (t) => {
		Ev(t, { file: e.editFile || void 0 });
	},
	onOpenSource: (e) => {
		rb(e);
	},
	onWorldMutated: () => {
		Ly.renderWorld(), $();
	}
}), document.querySelectorAll(".dock-tab").forEach((e) => {
	e.addEventListener("click", () => {
		let t = e.getAttribute("data-dock");
		document.querySelectorAll(".dock-tab").forEach((t) => {
			t.classList.toggle("is-active", t === e);
		}), document.getElementById("dockWorld").hidden = t !== "world", document.getElementById("dockNotes").hidden = t !== "notes", t === "notes" && Ry.renderCompanion();
	});
}), document.querySelectorAll(".mode-btn").forEach((t) => {
	t.addEventListener("click", () => {
		let n = t.getAttribute("data-mode");
		e.mode = n === "prototype" || n === "review" ? n : "design", document.querySelectorAll(".mode-btn").forEach((e) => {
			let n = e === t;
			e.classList.toggle("is-active", n), e.setAttribute("aria-selected", n ? "true" : "false");
		}), document.getElementById("app").dataset.mode = e.mode, e.mode === "prototype" && Zy(), Q.renderNavigator(), Ry.renderCompanion(), Z(), $();
	});
}), document.getElementById("btnOpen")?.addEventListener("click", () => Hy()), document.getElementById("btnWelcomeOpen")?.addEventListener("click", () => Hy()), document.getElementById("btnNew")?.addEventListener("click", () => Uy()), document.getElementById("btnWelcomeNew")?.addEventListener("click", () => Uy()), document.getElementById("openCancel")?.addEventListener("click", () => Fy.close()), document.getElementById("newCancel")?.addEventListener("click", () => Iy.close()), document.getElementById("btnReload")?.addEventListener("click", () => void Yy()), document.getElementById("btnScaffoldHere")?.addEventListener("click", () => {
	let e = document.getElementById("openRoot").value.trim();
	Fy.close(), Uy({ root: e });
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
		await qy(t, n), Fy.close();
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
		Iy.close(), await Jy(e, { preferComponent: e.defaultComponent || "Button" }), ub(`Created ${e.created?.length || 0} starter files`);
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
}), document.getElementById("btnSave")?.addEventListener("click", () => void sb());
var zy = document.getElementById("btnExport"), By = document.getElementById("exportMenu");
zy?.addEventListener("click", () => {
	By.hidden = !By.hidden;
}), document.addEventListener("click", (e) => {
	!By || By.hidden || e.target === zy || By.contains(e.target) || (By.hidden = !0);
}), By?.querySelectorAll("[data-export]").forEach((t) => {
	t.addEventListener("click", async () => {
		By.hidden = !0;
		let n = t.getAttribute("data-export");
		try {
			lv();
			let t = await g({
				root: e.root,
				entry: e.entry,
				files: Object.fromEntries([...e.dirty].map((t) => [t, e.files[t]])),
				kind: n,
				component: e.previewRoot || void 0,
				theme: e.theme || void 0
			});
			db(t.filename, t.content, t.mime), ub(`Exported ${t.filename}`), Dv();
		} catch (t) {
			Ev(t instanceof Error ? t.message : String(t), { file: e.editFile || void 0 });
		}
	});
}), window.addEventListener("keydown", (e) => {
	let t = e.metaKey || e.ctrlKey;
	if (t && e.key === "s") e.preventDefault(), sb();
	else if (t && e.key === "o") e.preventDefault(), Hy();
	else if (t && e.key === "k") {
		e.preventDefault();
		let t = document.getElementById("navSearch");
		t?.focus(), t?.select();
	} else e.key === "Escape" && (By.hidden = !0, Fy.open && Fy.close(), Iy.open && Iy.close());
}), n(() => {
	$(), Ly.renderWorld(), Ry.renderCompanion();
});
async function Vy() {
	Ky();
	let e = await c(), t = document.getElementById("starterList");
	t.innerHTML = (e.starters ?? []).map((e) => `<li><button type="button" data-root="${e.root}" data-entry="${e.entry}"><strong>${fb(e.label)}</strong><span>${fb(e.description || e.root)}</span></button></li>`).join(""), t.querySelectorAll("button").forEach((e) => {
		e.addEventListener("click", () => {
			qy(e.getAttribute("data-root"), e.getAttribute("data-entry"));
		});
	});
	try {
		let e = localStorage.getItem(My);
		if (e) {
			let t = JSON.parse(e);
			t?.root && await qy(t.root, t.entry);
		}
	} catch {}
}
function Hy() {
	document.getElementById("openError").hidden = !0, document.getElementById("openEmptyHint").hidden = !0, e.rootDisplay && (document.getElementById("openRoot").value = e.rootDisplay), Fy.showModal(), document.getElementById("openRoot")?.focus();
}
function Uy(t = {}) {
	document.getElementById("newError").hidden = !0;
	let n = document.getElementById("newRoot"), r = document.getElementById("newTitle"), i = document.getElementById("newPrefix");
	if (t.root) n.value = t.root;
	else if (!n.value && e.rootDisplay) {
		let t = String(e.rootDisplay).replace(/\\/g, "/").replace(/\/[^/]+\/?$/, "");
		n.value = t ? `${t}/my-design-system` : "";
	}
	t.title && (r.value = t.title), i.dataset.touched = "0", i.dataset.autFilled = "0", n.dispatchEvent(new Event("input")), Iy.showModal(), n.focus();
}
function Wy() {
	try {
		let e = localStorage.getItem(jy), t = e ? JSON.parse(e) : [];
		return Array.isArray(t) ? t : [];
	} catch {
		return [];
	}
}
function Gy(e, t, n) {
	let r = [{
		root: e,
		entry: t,
		label: n,
		at: Date.now()
	}, ...Wy().filter((t) => t.root !== e)].slice(0, 6);
	localStorage.setItem(jy, JSON.stringify(r));
}
function Ky() {
	let e = document.getElementById("recentList"), t = document.getElementById("recentHeading"), n = Wy();
	if (!n.length) {
		e.hidden = !0, t.hidden = !0;
		return;
	}
	e.hidden = !1, t.hidden = !1, e.innerHTML = n.map((e) => `<li><button type="button" data-root="${pb(e.root)}" data-entry="${pb(e.entry || "design.pdl")}"><strong>${fb(e.label || e.root)}</strong><span>${fb(e.root)}</span></button></li>`).join(""), e.querySelectorAll("button").forEach((e) => {
		e.addEventListener("click", () => {
			qy(e.getAttribute("data-root"), e.getAttribute("data-entry"));
		});
	});
}
async function qy(e, t, n = {}) {
	document.getElementById("statusLeft").textContent = "Opening…", Dv(), await Jy(await l(e, t), n);
}
async function Jy(t, n = {}) {
	document.getElementById("statusLeft").textContent = "Opening…", Dv(), e.root = t.root, e.rootDisplay = t.rootDisplay, e.rootLabel = t.rootLabel, e.entry = t.entry, e.files = { ...t.files }, e.baselines = { ...t.files }, e.dirty.clear(), e.activeWorld = {}, e.paramOverrides = {}, e.hostFacts = {}, e.theme = "", e.previewPinned = !1, document.getElementById("previewPin").checked = !1;
	try {
		e.catalogue = await f(e.root, e.entry, cb());
	} catch (t) {
		e.catalogue = null, Ev(t instanceof Error ? t.message : String(t));
	}
	Ny.hidden = !0, Py.hidden = !1, document.getElementById("btnSave").disabled = !1, document.getElementById("btnExport").disabled = !1, document.getElementById("btnReload").disabled = !1, Xy(n.preferComponent), Ty(), Oy(), Q.renderNavigator(), ov(), e.selectedSymbol && e.selectedSymbol !== "__tokens__" && e.selectedSymbol !== "__typeStyles__" && e.selectedKind === "component" && sv(e.selectedSymbol), Ly.renderWorld(), Ry.renderCompanion(), $(), await Sy(), localStorage.setItem(My, JSON.stringify({
		root: e.rootDisplay || e.root,
		entry: e.entry
	})), Gy(e.rootDisplay || e.root, e.entry, e.rootLabel), Ky();
}
async function Yy() {
	if (!e.root || o() && !confirm("Discard unsaved changes and reload from disk?")) return;
	let t = e.rootDisplay || e.root, n = e.entry;
	await qy(t, n), ub("Reloaded from disk");
}
function Xy(t) {
	let n = e.catalogue;
	if (!n) return;
	if (t && n.components?.includes(t)) {
		rb(t);
		return;
	}
	if (e.mode === "prototype") {
		let e = (n.components ?? []).find((e) => n.componentRoles?.[e] === "screen");
		if (e) {
			rb(e);
			return;
		}
	}
	let r = U_(e.entry, e.files, n);
	if (r.length === 1) {
		rb(r[0]);
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
		rb(e);
		return;
	}
	let i = (n.components ?? []).find((e) => !n.componentRoles?.[e]) || n.components?.[0];
	i ? rb(i) : n.designSummary?.primitives?.length || n.designSummary?.semantics?.length || Object.keys(n.tokenTables?.primitives ?? {}).length ? $y() : (e.editFile = e.entry, e.previewRoot = null, e.selectedSymbol = null, e.selectedKind = "file");
}
function Zy() {
	let t = e.catalogue, n = (t?.components ?? []).find((e) => t.componentRoles?.[e] === "screen");
	n && !e.previewPinned && rb(n);
}
function Qy(e) {
	if (e.kind === "file" && e.file) {
		ob(e.file);
		return;
	}
	if (e.kind === "foundation" || e.name === "__tokens__") {
		$y(e.file);
		return;
	}
	if (e.kind === "typeStyles" || e.name === "__typeStyles__") {
		eb(e.file);
		return;
	}
	if (e.kind === "samples" && e.name) {
		nb(e.name);
		return;
	}
	if (e.kind === "theme" && e.name) {
		tb(e.name);
		return;
	}
	e.kind === "symbol" && e.name && rb(e.name, e.file);
}
function $y(t) {
	let n = t || Object.keys(e.files).find((e) => /foundation\.pdl$/i.test(e)) || Object.keys(e.files).find((e) => /token/i.test(e)) || e.entry;
	e.selectedKind = "tokens", e.selectedSymbol = "__tokens__", e.editFile = n, ov(), Q.renderNavigator(), Ry.renderCompanion(), $(), Z(0);
}
function eb(t) {
	let n = t || Object.keys(e.files).find((e) => /foundation\.pdl$/i.test(e)) || e.entry;
	e.selectedKind = "typeStyles", e.selectedSymbol = "__typeStyles__", e.editFile = n, ov(), Q.renderNavigator(), Ry.renderCompanion(), $(), Z(0);
}
function tb(t) {
	e.selectedKind = "theme", e.selectedSymbol = t, e.theme = t;
	let n = Object.keys(e.files).find((n) => RegExp(`\\btheme\\s+${t}\\b`).test(e.files[n])) || Object.keys(e.files).find((e) => /theme/i.test(e)) || e.editFile;
	n && (e.editFile = n), Ty(), ov(), Q.renderNavigator(), Ry.renderCompanion(), $(), Z(0);
}
function nb(t) {
	for (let [n, r] of Object.entries(e.files)) if (RegExp(`\\bsamples\\s+${t}\\b`).test(r)) {
		e.selectedKind = "samples", e.selectedSymbol = t, e.editFile = n, ov(), sv(t), Q.renderNavigator(), Ry.renderCompanion(), $(), Z(0);
		return;
	}
	e.selectedKind = "samples", e.selectedSymbol = t, Q.renderNavigator(), Ry.renderCompanion(), $(), Z(0);
}
function rb(t, n, r = {}) {
	let i = r.focus !== !1;
	e.selectedKind = "component", e.selectedSymbol = t;
	let a = n || Q.resolveComponentFile(t) || Object.keys(e.files).find((n) => RegExp(`\\b(component|page|screen)\\s+${t}\\b`).test(e.files[n])) || e.editFile || e.entry;
	e.editFile = a, e.previewPinned || (e.previewRoot = t), ib(a), ov(), i && sv(t), Q.renderNavigator(), Ly.renderWorld(), Ry.renderCompanion(), $(), Z(50);
}
function ib(t) {
	if (!t) return;
	let n = U_(t, e.files, e.catalogue);
	n.length > 1 ? e.previewMode = "gallery" : n.length === 1 && (e.previewMode = "primary"), Ey();
}
function ab() {
	let t = e.editFile;
	if (!t) return;
	let n = uv();
	if (n == null) return;
	let r = W_(e.files[t] ?? "", n);
	if (!r || ![
		"component",
		"page",
		"screen"
	].includes(r.kind)) return;
	let i = U_(t, e.files, e.catalogue), a = e.selectedKind !== "component" || e.selectedSymbol !== r.name || e.editFile !== t;
	e.selectedKind = "component", e.selectedSymbol = r.name, e.previewPinned || (e.previewRoot = r.name), i.length > 1 && e.previewMode !== "gallery" ? (e.previewMode = "gallery", Ey(), Z(50)) : a && e.previewMode === "primary" ? Z(80) : Dy(r.name), a ? (Q.renderNavigator(), Ly.renderWorld(), Ry.renderCompanion(), $()) : Q.renderNavigator();
}
function ob(t) {
	e.editFile = t, ov();
	let n = e.files[t] ?? "", r = /\b(primitive|semantic)\s+/.test(n), i = /\btheme\s+\w+/.test(n), a = /\btypeStyle\s+/.test(n), o = U_(t, e.files, e.catalogue);
	if (o.length) {
		if (ib(t), e.previewPinned && e.previewRoot && o.includes(e.previewRoot)) e.selectedKind = "component", e.selectedSymbol = e.previewRoot;
		else {
			let r = uv(), i = r == null ? null : W_(n, r);
			rb(i && o.includes(i.name) ? i.name : o.length === 1 ? o[0] : o.includes(e.previewRoot) ? e.previewRoot : o[0], t, { focus: !1 });
			return;
		}
	} else if (r) e.selectedKind = "tokens", e.selectedSymbol = "__tokens__";
	else if (i) {
		let t = n.match(/\btheme\s+(\w+)/);
		e.selectedKind = "theme", e.selectedSymbol = t?.[1] ?? e.theme, t?.[1] && (e.theme = t[1]), Ty();
	} else a ? (e.selectedKind = "typeStyles", e.selectedSymbol = "__typeStyles__") : (e.selectedKind = "file", e.selectedSymbol = null);
	Q.renderNavigator(), Ly.renderWorld(), Ry.renderCompanion(), $(), Z(50);
}
async function sb() {
	if (lv(), !e.root || !e.dirty.size) {
		ub(e.root ? "Nothing to save" : "");
		return;
	}
	let t = [...e.dirty];
	for (let n of t) {
		let t = e.files[n];
		if ((await m(e.root, n, t, e.baselines[n])).conflict) {
			Ev(`Conflict saving ${n}: file changed on disk. Use Reload to discard local edits.`, { file: n });
			return;
		}
		e.baselines[n] = t, a(n);
	}
	try {
		e.catalogue = await f(e.root, e.entry, {}), Ty(), Oy(), Q.renderNavigator(), Ly.renderWorld(), Ry.renderCompanion(), Dv();
	} catch (e) {
		Ev(e instanceof Error ? e.message : String(e));
	}
	$(), ub(`Saved ${t.length} file(s)`);
}
function cb() {
	let t = {};
	for (let n of e.dirty) t[n] = e.files[n];
	return t;
}
function $() {
	document.getElementById("projectName").textContent = e.rootLabel ? e.rootDisplay || e.rootLabel : "No project";
	let t = document.getElementById("saveState");
	t.textContent = o() ? "● Unsaved" : e.root ? "Saved" : "", document.getElementById("btnSave").disabled = !e.root || !o(), document.getElementById("btnReload").disabled = !e.root, document.getElementById("btnExport").disabled = !e.root;
	let n = e.selectedSymbol || e.previewRoot, r = "—";
	e.selectedKind === "tokens" ? r = "Tokens" : e.selectedKind === "typeStyles" ? r = "Type styles" : e.selectedKind === "theme" ? r = n ? `Theme · ${n}` : "Theme" : e.selectedKind === "samples" ? r = n ? `Samples · ${n}` : "Samples" : e.selectedKind === "file" ? r = e.editFile || "File" : n && (r = n === "__tokens__" ? "Tokens" : n), document.getElementById("symbolLabel").textContent = r, document.getElementById("fileLabel").textContent = e.editFile || "";
	let i = e.previewPinned ? " · preview pinned" : "";
	document.getElementById("statusRight").textContent = e.root ? `${e.mode}${i} · ${e.dirty.size} dirty` : "", lb();
}
function lb() {
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
	t.hidden = !1, t.innerHTML = `<strong>Host events</strong> ${[...i].map(fb).join(" · ")} <span class="hint">— inbound from the runtime, not parent emits</span>`;
}
function ub(e) {
	document.getElementById("statusRight").textContent = e;
}
function db(e, t, n) {
	let r = new Blob([t], { type: n || "text/plain" }), i = URL.createObjectURL(r), a = document.createElement("a");
	a.href = i, a.download = e, a.click(), URL.revokeObjectURL(i);
}
function fb(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function pb(e) {
	return fb(e).replace(/"/g, "&quot;");
}
Vy();
//#endregion
