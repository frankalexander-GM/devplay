package com.devplay.dto.comment;

import java.time.LocalDateTime;

/**
 * DTO de respuesta que representa un comentario.
 *
 * @param id          ID del comentario
 * @param postId      ID de la publicacion comentada
 * @param userId      ID del autor del comentario
 * @param username    nombre de usuario del autor
 * @param userAvatar  URL del avatar del autor (puede ser null)
 * @param content     contenido del comentario
 * @param createdAt   fecha de creacion
 */
public record CommentResponse(
        Long id,
        Long postId,
        Long userId,
        String username,
        String userAvatar,
        String content,
        LocalDateTime createdAt
) {
}
