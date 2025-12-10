package com.observability.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base exception for all observability-related errors.
 * Provides consistent error handling across the application.
 */
@Getter
public class ObservabilityException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public ObservabilityException(String message) {
        this(message, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR");
    }

    public ObservabilityException(String message, HttpStatus status) {
        this(message, status, "ERROR");
    }

    public ObservabilityException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public ObservabilityException(String message, Throwable cause) {
        super(message, cause);
        this.status = HttpStatus.INTERNAL_SERVER_ERROR;
        this.errorCode = "INTERNAL_ERROR";
    }

    public ObservabilityException(String message, HttpStatus status, String errorCode, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }
}

