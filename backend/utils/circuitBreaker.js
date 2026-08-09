/**
 * circuitBreaker.js — dependency-free circuit breaker for external API calls
 * (Cloudinary, WhatsApp Cloud API, translation providers, GIF providers, ...).
 *
 * States:
 *   CLOSED    — normal operation, requests flow through
 *   OPEN      — too many failures; requests fail fast for `cooldownMs`
 *   HALF_OPEN — after cooldown, one probe request is allowed; success re-closes,
 *               failure re-opens the circuit.
 *
 * Every call is also wrapped in a timeout so a hung upstream never blocks us.
 */

const withTimeout = (promise, ms, name) => {
  if (!ms || ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`External call "${name}" timed out after ${ms}ms`);
      err.code = 'TIMEOUT';
      reject(err);
    }, ms);
    // Promise.resolve so synchronous (non-promise) fn results work too
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
};

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownMs = options.cooldownMs || 30000;
    this.timeoutMs = options.timeoutMs || 10000;
    this.onStateChange = options.onStateChange || null;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttemptAt = 0;
    this.lastError = null;
    this.openedAt = null;
    this.stats = { total: 0, successes: 0, failures: 0, fastFails: 0, timeouts: 0 };
  }

  getState() {
    return this.state;
  }

  getStats() {
    return { ...this.stats, state: this.state, failureCount: this.failureCount, lastError: this.lastError?.message || null };
  }

  _transition(newState) {
    const old = this.state;
    this.state = newState;
    if (newState === 'OPEN') this.openedAt = Date.now();
    if (old !== newState && this.onStateChange) {
      try {
        this.onStateChange({ name: this.name, from: old, to: newState });
      } catch (err) {
        /* never let a logger crash the breaker */
      }
    }
  }

  // Returns true when the circuit is (or just became) open.
  isOpen() {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptAt) {
      this._transition('HALF_OPEN');
    }
    return this.state === 'OPEN';
  }

  _recordSuccess() {
    this.stats.successes += 1;
    if (this.state === 'HALF_OPEN') this._transition('CLOSED');
    this.failureCount = 0;
  }

  _recordFailure(err) {
    this.stats.failures += 1;
    this.lastError = err;
    if (err?.code === 'TIMEOUT') this.stats.timeouts += 1;

    if (this.state === 'HALF_OPEN') {
      // Probe failed — the upstream is still down.
      this._transition('OPEN');
      this.nextAttemptAt = Date.now() + this.cooldownMs;
      return;
    }

    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this._transition('OPEN');
      this.nextAttemptAt = Date.now() + this.cooldownMs;
    }
  }

  /**
   * Run `fn` guarded by the breaker.
   * - Circuit OPEN  -> throws { code: 'CIRCUIT_OPEN' } immediately
   * - Otherwise     -> runs fn with timeout; success closes, failure counts
   */
  async execute(fn) {
    this.stats.total += 1;
    if (this.isOpen()) {
      this.stats.fastFails += 1;
      const err = new Error(`Circuit "${this.name}" is open — failing fast (${this.cooldownMs}ms cooldown)`);
      err.code = 'CIRCUIT_OPEN';
      err.circuit = this.name;
      throw err;
    }
    try {
      const result = await withTimeout(fn(), this.timeoutMs, this.name);
      this._recordSuccess();
      return result;
    } catch (err) {
      this._recordFailure(err);
      throw err;
    }
  }

  reset() {
    this.failureCount = 0;
    this.lastError = null;
    this._transition('CLOSED');
  }
}

// Registry so the same named breaker is shared across the process.
const breakers = new Map();

/**
 * Get (or create) the shared breaker for `name`.
 * @param {string} name
 * @param {object} [options] { failureThreshold, cooldownMs, timeoutMs, onStateChange }
 */
function getBreaker(name, options = {}) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return breakers.get(name);
}

/**
 * Run `fn` through the named circuit breaker.
 * @param {string} name circuit name
 * @param {object} [options] breaker options (ignored if the breaker already exists)
 * @param {() => Promise<any>} fn
 */
function circuit(name, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = {};
  }
  return getBreaker(name, options).execute(fn);
}

module.exports = {
  CircuitBreaker,
  getBreaker,
  circuit,
  withTimeout,
  isCircuitOpenError: (err) => err?.code === 'CIRCUIT_OPEN',
};
