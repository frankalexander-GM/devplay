package com.devplay.exception;

import java.time.LocalDateTime;

/**
 * Estructura estandar de error devuelta por la API REST de DevPlay.
 *
 * <p>Record inmutable de Java 21 que se serializa a JSON.</p>
 *
 * @param timestamp marca de tiempo del error
 * @param status    codigo HTTP (404, 400, 403, 500, etc.)
 * @param error     descripcion corta del error
 * @param message   mensaje descriptivo del error
 * @param path      ruta de la peticion que genero el error
 */
public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
) {
}
