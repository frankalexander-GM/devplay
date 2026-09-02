package com.devplay.dto.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de peticion para actualizar el contenido de una publicacion.
 *
 * <p>Solo el autor de la publicacion puede actualizarla.</p>
 *
 * @param content nuevo contenido textual (max 2000 caracteres)
 */
public record UpdatePostRequest(
        @NotBlank(message = "El contenido no puede estar vacio")
        @Size(max = 2000, message = "El contenido no puede superar 2000 caracteres")
        String content
) {
}
