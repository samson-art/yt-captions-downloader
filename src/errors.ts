/**
 * Base HTTP error with status code for use in setErrorHandler.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errorLabel: string
  ) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 Bad Request – validation, invalid input */
export class ValidationError extends HttpError {
  constructor(message: string, errorLabel = 'Bad request') {
    super(400, message, errorLabel);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 404 Not Found – resource or subtitles not found */
export class NotFoundError extends HttpError {
  constructor(message: string, errorLabel = 'Not found') {
    super(404, message, errorLabel);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
