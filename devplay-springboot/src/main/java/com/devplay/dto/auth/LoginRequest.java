package com.devplay.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO de peticion para el login de un usuario.
 *
 * <p>Se usa un record de Java 21 ya que es inmutable y no requiere
 * boilerplate de getters/setters.</p>
 *
 * @param email    email del usuario (obligatorio, formato email)
 * @param password password en texto plano (obligatorio)
 */
public record LoginRequest(
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato valido")
        String email,

        @NotBlank(message = "El password es obligatorio")
        String password
) {
}
