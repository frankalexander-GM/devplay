package com.devplay.exception;

/**
 * Excepcion lanzada cuando la peticion del cliente es invalida a nivel
 * de negocio (ej. intentar seguirse a uno mismo, datos duplicados).
 * Se mapea a HTTP 400 Bad Request.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }

    public BadRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
