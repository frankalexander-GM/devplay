package com.devplay.dto.post;

/**
 * DTO de respuesta tras hacer toggle sobre el like de una publicacion.
 *
 * @param postId   ID de la publicacion
 * @param liked    estado actual del like (true = le gusta, false = ya no)
 * @param likeCount numero total de likes de la publicacion
 */
public record LikeResponse(
        Long postId,
        boolean liked,
        long likeCount
) {
}
