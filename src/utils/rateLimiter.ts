interface RateLimiterOptions {
  maxRequests: number;
  timeWindow: number;
}

export class RateLimiter {
  private maxRequests: number;
  private timeWindow: number;
  private requests: number[];

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.timeWindow = options.timeWindow;
    this.requests = [];
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Remove expired timestamps
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate delay needed
      const oldestRequest = this.requests[0];
      const delay = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.acquire();
    }

    this.requests.push(now);
  }

  getAvailableRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    return this.maxRequests - this.requests.length;
  }
}
