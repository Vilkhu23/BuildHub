export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
