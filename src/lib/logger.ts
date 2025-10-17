/**
 * Structured logging utility for production observability
 * Features:
 * - Request correlation IDs for tracing
 * - Consistent log format across application
 * - Environment-aware log levels
 * - Performance metrics tracking
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  [key: string]: any;
}

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log at INFO level
   */
  info(message: string, data?: LogContext) {
    this.log('INFO', message, data);
  }

  /**
   * Log at WARNING level
   */
  warn(message: string, data?: LogContext) {
    this.log('WARN', message, data);
  }

  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error | LogContext, data?: LogContext) {
    let errorData = data || {};
    if (error instanceof Error) {
      errorData = {
        ...errorData,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      };
    } else if (error) {
      errorData = { ...errorData, ...error };
    }
    this.log('ERROR', message, errorData);
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, data?: LogContext) {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * Internal log method - outputs structured JSON
   */
  private log(level: string, message: string, data?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...data,
    };

    // In production, output JSON; in dev, pretty-print
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(
        `[${timestamp}] [${level}] ${message}`,
        Object.keys(logEntry).length > 4 ? logEntry : ''
      );
    }
  }
}

/**
 * Global logger instance
 */
export const globalLogger = new Logger({
  service: 'plottr-api',
  version: process.env.APP_VERSION || '0.1.0',
  environment: process.env.NODE_ENV || 'development',
});

/**
 * Generate a unique request ID for correlation
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
