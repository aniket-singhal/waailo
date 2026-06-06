import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppErrorDetail {
  field?: string;
  issue: string;
}

/**
 * Base for domain/application errors. Carries a stable machine-readable `code`
 * (which the frontend can branch on) alongside the HTTP status and message.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: AppErrorDetail[],
  ) {
    super({ code, message, details }, status);
  }
}

export class NotFoundError extends AppException {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends AppException {
  constructor(message: string, code = 'CONFLICT', details?: AppErrorDetail[]) {
    super(code, message, HttpStatus.CONFLICT, details);
  }
}

export class UnprocessableError extends AppException {
  constructor(message: string, code = 'UNPROCESSABLE', details?: AppErrorDetail[]) {
    super(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class ForbiddenError extends AppException {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedError extends AppException {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}
