// Safe Client Application Error Model
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    // Correctly restore prototype chain for subclass of Error
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
