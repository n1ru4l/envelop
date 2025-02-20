class RateLimitError extends Error {
  public readonly isRateLimitError = true;

  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export { RateLimitError };
