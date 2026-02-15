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

/** Optional details for 404 response (e.g. available subtitle languages) */
export type NotFoundDetails = {
  official?: string[];
  auto?: string[];
};

/** 404 Not Found – resource or subtitles not found */
export class NotFoundError extends HttpError {
  readonly details?: NotFoundDetails;

  constructor(message: string, errorLabel = 'Not found', details?: NotFoundDetails) {
    super(404, message, errorLabel);
    this.name = 'NotFoundError';
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
