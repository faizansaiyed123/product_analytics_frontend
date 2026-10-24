// src/index.ts
var DEFAULTS = {
  endpoint: "",
  flushInterval: 2e3,
  maxBatchSize: 20,
  maxQueueSize: 1e3,
  autocapturePageviews: false,
  persistence: "localStorage",
  respectDoNotTrack: false,
  maxRetries: 3,
  debug: false
};
var LIB = "product-analytics-js/1.0.0";
function uuid() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    return (ch === "x" ? r : r & 3 | 8).toString(16);
  });
}
function memoryStore() {
  const m = /* @__PURE__ */ new Map();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}
function localStore() {
  const fallback = memoryStore();
  return {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return fallback.get(k);
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        fallback.set(k, v);
      }
    },
    remove: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        fallback.remove(k);
      }
    }
  };
}
function cookieStore() {
  return {
    get: (k) => {
      const m = document.cookie.match(new RegExp("(?:^|; )" + k.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    },
    set: (k, v) => {
      document.cookie = `${k}=${encodeURIComponent(v)}; max-age=31536000; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    },
    remove: (k) => {
      document.cookie = `${k}=; max-age=0; path=/`;
    }
  };
}
var AnalyticsClient = class {
  constructor() {
    this.cfg = { ...DEFAULTS };
    this.key = "";
    this.store = memoryStore();
    this.queue = [];
    this.timer = null;
    this.flushing = null;
    this.anonId = "";
    this.distinctId = "";
    this.ready = false;
    this.optedOut = false;
    this.k = { anon: "", id: "", queue: "" };
  }
  init(apiKey, options = {}) {
    if (!apiKey) throw new Error("Analytics.init: API key is required");
    this.key = apiKey;
    this.cfg = { ...DEFAULTS, ...options };
    this.cfg.endpoint = (this.cfg.endpoint || (typeof location !== "undefined" ? location.origin : "")).replace(/\/+$/, "");
    this.store = typeof window === "undefined" ? memoryStore() : this.cfg.persistence === "cookie" ? cookieStore() : this.cfg.persistence === "memory" ? memoryStore() : localStore();
    this.optedOut = this.cfg.respectDoNotTrack && typeof navigator !== "undefined" && navigator.doNotTrack === "1";
    const ns = `pa_${apiKey.slice(0, 12)}`;
    this.k = { anon: `${ns}_anon`, id: `${ns}_id`, queue: `${ns}_queue` };
    this.anonId = this.store.get(this.k.anon) || this.newAnon();
    this.distinctId = this.store.get(this.k.id) || this.anonId;
    this.queue = this.loadQueue();
    this.ready = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => void this.flush(), this.cfg.flushInterval);
    this.timer.unref?.();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void this.flush());
      window.addEventListener("pagehide", () => this.flushBeacon());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flushBeacon();
      });
      if (this.cfg.autocapturePageviews) this.setupAutoPageviews();
    }
    if (this.queue.length) void this.flush();
    return this;
  }
  newAnon() {
    const id = uuid();
    this.store.set(this.k.anon, id);
    return id;
  }
  log(...a) {
    if (this.cfg.debug) console.debug("[analytics]", ...a);
  }
  /** The id events are currently attributed to (anonymous id until identify() is called). */
  getDistinctId() {
    return this.distinctId;
  }
  getAnonymousId() {
    return this.anonId;
  }
  track(event, properties = {}) {
    if (!this.ready) {
      console.warn("Analytics.track called before init()");
      return;
    }
    if (!event || typeof event !== "string") return;
    if (this.optedOut) return;
    this.enqueue(event, { ...this.autoProps(), ...properties });
  }
  page(properties = {}) {
    this.track("$pageview", properties);
  }
  identify(userId, traits = {}) {
    if (!this.ready || !userId) return;
    const previous = this.distinctId;
    this.distinctId = String(userId);
    this.store.set(this.k.id, this.distinctId);
    this.enqueue("$identify", { ...this.autoProps(), $set: traits, $anon_distinct_id: previous !== this.distinctId ? previous : void 0 }, previous !== this.distinctId ? previous : this.anonId);
    void this.flush();
  }
  /** Forget the current user (call on logout): new anonymous id, identified id cleared. */
  reset() {
    this.store.remove(this.k.id);
    this.anonId = this.newAnon();
    this.distinctId = this.anonId;
  }
  optOut() {
    this.optedOut = true;
    this.queue = [];
    this.persistQueue();
  }
  optIn() {
    this.optedOut = false;
  }
  autoProps() {
    if (typeof window === "undefined") return { $lib: LIB };
    const p = {
      $lib: LIB,
      $current_url: location.href,
      $pathname: location.pathname,
      $host: location.hostname,
      $title: document.title,
      $referrer: document.referrer || void 0,
      $screen_width: screen.width,
      $screen_height: screen.height,
      $viewport_width: innerWidth,
      $viewport_height: innerHeight,
      $language: navigator.language
    };
    try {
      const sp = new URLSearchParams(location.search);
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        const v = sp.get(k);
        if (v) p[`$${k}`] = v;
      }
    } catch {
    }
    return p;
  }
  enqueue(event, properties, anonymousId = this.anonId) {
    const clean = {};
    for (const [k, v] of Object.entries(properties)) if (v !== void 0) clean[k] = v;
    this.queue.push({
      event,
      distinct_id: this.distinctId,
      anonymous_id: anonymousId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uuid: uuid(),
      properties: clean,
      context: typeof navigator !== "undefined" ? { user_agent: navigator.userAgent } : {}
    });
    if (this.queue.length > this.cfg.maxQueueSize) this.queue.splice(0, this.queue.length - this.cfg.maxQueueSize);
    this.persistQueue();
    this.log("queued", event);
    if (this.queue.length >= this.cfg.maxBatchSize) void this.flush();
  }
  loadQueue() {
    try {
      const q = JSON.parse(this.store.get(this.k.queue) || "[]");
      return Array.isArray(q) ? q : [];
    } catch {
      return [];
    }
  }
  persistQueue() {
    try {
      this.store.set(this.k.queue, JSON.stringify(this.queue));
    } catch {
    }
  }
  /** Send everything queued. Safe to call repeatedly; concurrent calls share one flush. */
  flush() {
    if (this.flushing) return this.flushing;
    this.flushing = this.doFlush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }
  async doFlush() {
    while (this.queue.length) {
      const batch = this.queue.slice(0, 100);
      const ok = await this.send(batch);
      if (!ok) return;
      this.queue.splice(0, batch.length);
      this.persistQueue();
    }
  }
  async send(batch) {
    const body = JSON.stringify({ events: batch, sent_at: (/* @__PURE__ */ new Date()).toISOString() });
    for (let attempt = 0; attempt <= this.cfg.maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.cfg.endpoint}/api/v1/events/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` },
          body,
          keepalive: body.length < 6e4
        });
        if (res.ok) return true;
        if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) {
          this.log("dropping batch", res.status);
          return true;
        }
        const retryAfter = Number(res.headers.get("retry-after"));
        await this.sleep(retryAfter > 0 ? Math.min(retryAfter, 30) * 1e3 : this.backoff(attempt));
      } catch (e) {
        this.log("network error", e);
        if (attempt < this.cfg.maxRetries) await this.sleep(this.backoff(attempt));
      }
    }
    return false;
  }
  backoff(attempt) {
    return Math.min(3e4, 500 * 2 ** attempt) + Math.random() * 250;
  }
  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  /** Best-effort delivery while the page is being unloaded. The key travels in the body (sendBeacon cannot set headers). */
  flushBeacon() {
    if (!this.queue.length || typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const batch = this.queue.slice(0, 100);
    const ok = navigator.sendBeacon(`${this.cfg.endpoint}/api/v1/events/batch`, new Blob([JSON.stringify({ api_key: this.key, events: batch, sent_at: (/* @__PURE__ */ new Date()).toISOString() })], { type: "text/plain" }));
    if (ok) {
      this.queue.splice(0, batch.length);
      this.persistQueue();
    }
  }
  setupAutoPageviews() {
    this.page();
    const fire = () => setTimeout(() => this.page(), 0);
    for (const m of ["pushState", "replaceState"]) {
      const orig = history[m];
      history[m] = function(...args) {
        const r = orig.apply(this, args);
        fire();
        return r;
      };
    }
    window.addEventListener("popstate", fire);
  }
};
var Analytics = new AnalyticsClient();
var src_default = Analytics;
export {
  AnalyticsClient,
  src_default as default
};
