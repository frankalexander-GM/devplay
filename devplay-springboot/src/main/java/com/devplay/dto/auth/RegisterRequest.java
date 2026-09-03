package com.devplay.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de peticion para registrar un nuevo usuario en DevPlay.
 *
 * @param username nombre de usuario (3-20 caracteres, unico)
 * @param email    email valido y unico
 * @param password password en texto plano (minimo 6 caracteres,
 *                 se hasheara con BCrypt antes de guardar)
 */
public record RegisterRequest(
        @NotBlank(message = "El nombre de usuario es obligatorio")
        @Size(min = 3, max = 20, message = "El nombre de usuario debe tener entre 3 y 20 caracteres")
        String username,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato valido")
        String email,

        @NotBlank(message = "El password es obligatorio")
        @Size(min = 6, message = "El password debe tener al menos 6 caracteres")
        String password
) {
}
