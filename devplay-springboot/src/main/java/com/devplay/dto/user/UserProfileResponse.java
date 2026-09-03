package com.devplay.dto.user;

import java.time.LocalDateTime;

/**
 * DTO de respuesta que representa el perfil publico de un usuario.
 *
 * <p>Omite el password y otros datos sensibles.</p>
 *
 * @param id          ID del usuario
 * @param username    nombre de usuario
 * @param email       email (solo se devuelve en /me)
 * @param bio         biografia
 * @param avatar      URL del avatar
 * @param banner      URL del banner
 * @param role        rol del usuario
 * @param followers   numero de seguidores
 * @param following   numero de usuarios que sigue
 * @param postCount   numero de publicaciones
 * @param createdAt   fecha de creacion de la cuenta
 */
public record UserProfileResponse(
        Long id,
        String username,
        String email,
        String bio,
        String avatar,
        String banner,
        String role,
        long followers,
        long following,
        long postCount,
        LocalDateTime createdAt
) {
}
