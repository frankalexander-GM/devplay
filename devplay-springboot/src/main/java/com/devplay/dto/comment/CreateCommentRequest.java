package com.devplay.dto.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de peticion para crear un comentario en una publicacion.
 *
 * @param content contenido del comentario (max 1000 caracteres)
 */
public record CreateCommentRequest(
        @NotBlank(message = "El contenido del comentario no puede estar vacio")
        @Size(max = 1000, message = "El comentario no puede superar 1000 caracteres")
        String content
) {
}
