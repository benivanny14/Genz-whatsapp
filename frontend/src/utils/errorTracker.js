class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }
  
  captureException(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.push(errorData);
    
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    // Send to backend for logging
    this.sendToBackend(errorData).catch(() => {});
    
    console.error('[ErrorTracker]', error, context);
  }
  
  async sendToBackend(errorData) {
    try {
      await fetch('/api/telemetry/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    } catch (err) {
      // Silently fail
    }
  }
  
  getErrors() {
    return this.errors;
  }
}

export const errorTracker = new ErrorTracker();
export default errorTracker;
