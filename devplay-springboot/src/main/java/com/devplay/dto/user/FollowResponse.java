package com.devplay.dto.user;

/**
 * DTO de respuesta que representa una relacion de seguimiento (follow).
 *
 * @param id        ID de la relacion
 * @param userId    ID del usuario (seguidor o seguido, segun el contexto)
 * @param username  nombre de usuario
 * @param avatar    URL del avatar (puede ser null)
 */
public record FollowResponse(
        Long id,
        Long userId,
        String username,
        String avatar
) {
}
