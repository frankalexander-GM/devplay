package com.devplay.dto.post;

import com.devplay.model.PostType;

import java.time.LocalDateTime;

/**
 * DTO de respuesta que representa una publicacion visible para el cliente.
 *
 * <p>Omite datos sensibles (passwords) y usa tipos simples para evitar
 * referencias circulares en la serializacion JSON.</p>
 *
 * @param id            ID de la publicacion
 * @param authorId      ID del autor
 * @param authorName    nombre de usuario del autor
 * @param authorAvatar  URL del avatar del autor (puede ser null)
 * @param content       contenido textual
 * @param type          tipo de publicacion
 * @param commentCount  numero de comentarios
 * @param likeCount     numero de likes
 * @param likedByMe     true si el usuario actual le dio like
 * @param createdAt     fecha de creacion
 * @param updatedAt     fecha de ultima actualizacion (puede ser null)
 */
public record PostResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorAvatar,
        String content,
        PostType type,
        long commentCount,
        long likeCount,
        boolean likedByMe,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
