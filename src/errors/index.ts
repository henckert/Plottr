export class AppError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function validationError(message = 'Validation failed') {
  return new AppError(message, 500, 'VALIDATION_ERROR');
}
