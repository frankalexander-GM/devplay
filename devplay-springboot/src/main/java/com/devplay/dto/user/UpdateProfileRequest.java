package com.devplay.dto.user;

import jakarta.validation.constraints.Size;

/**
 * DTO de peticion para que un usuario actualice su propio perfil.
 *
 * <p>Todos los campos son opcionales; solo se actualizaran los que se
 * incluyan en la peticion.</p>
 *
 * @param bio     nueva biografia (max 500 caracteres)
 * @param avatar  nueva URL de avatar
 * @param banner  nueva URL de banner
 */
public record UpdateProfileRequest(
        @Size(max = 500, message = "La biografia no puede superar 500 caracteres")
        String bio,

        @Size(max = 500, message = "La URL del avatar no puede superar 500 caracteres")
        String avatar,

        @Size(max = 500, message = "La URL del banner no puede superar 500 caracteres")
        String banner
) {
}
