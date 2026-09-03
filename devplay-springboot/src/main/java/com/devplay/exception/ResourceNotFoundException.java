package com.devplay.exception;

/**
 * Excepcion lanzada cuando un recurso solicitado no existe en la base
 * de datos. Se mapea a HTTP 404 Not Found.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
