package com.devplay.dto.post;

import com.devplay.model.PostType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de peticion para crear una nueva publicacion.
 *
 * @param content contenido textual (max 2000 caracteres)
 * @param type    tipo de publicacion (POST, BETA, POLL).
 *                Por defecto POST.
 */
public record CreatePostRequest(
        @NotBlank(message = "El contenido no puede estar vacio")
        @Size(max = 2000, message = "El contenido no puede superar 2000 caracteres")
        String content,

        PostType type
) {
    /**
     * Devuelve el tipo de publicacion, por defecto {@link PostType#POST}
     * si no se especifico.
     */
    public PostType effectiveType() {
        return type != null ? type : PostType.POST;
    }
}
