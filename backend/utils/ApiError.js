export class ApiError extends Error {
  constructor(statusCode, message) {
    supper(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace?.(this, this.constructor)
  }
}
