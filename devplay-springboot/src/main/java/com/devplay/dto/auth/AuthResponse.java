package com.devplay.dto.auth;

import java.time.LocalDateTime;

/**
 * DTO de respuesta tras un login o registro exitoso.
 *
 * <p>Incluye el token JWT y los datos basicos del usuario autenticado.</p>
 *
 * @param token     token JWT para autenticar peticiones posteriores
 * @param type      tipo de token (siempre "Bearer")
 * @param userId    ID del usuario
 * @param username  nombre de usuario
 * @param email     email del usuario
 * @param createdAt fecha de creacion de la cuenta
 */
public record AuthResponse(
        String token,
        String type,
        Long userId,
        String username,
        String email,
        LocalDateTime createdAt
) {
}
