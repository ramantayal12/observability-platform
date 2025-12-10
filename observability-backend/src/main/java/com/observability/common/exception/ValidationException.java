package com.observability.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Exception thrown when request validation fails.
 */
public class ValidationException extends ObservabilityException {

    private final Map<String, String> fieldErrors;

    public ValidationException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        this.fieldErrors = Map.of();
    }

    public ValidationException(String message, Map<String, String> fieldErrors) {
        super(message, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        this.fieldErrors = fieldErrors;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}

