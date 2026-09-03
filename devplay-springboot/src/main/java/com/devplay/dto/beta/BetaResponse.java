package com.devplay.dto.beta;

import com.devplay.model.DownloadType;

import java.time.LocalDateTime;

/**
 * DTO de respuesta que representa una beta visible para el cliente.
 *
 * @param id            ID de la beta
 * @param postId        ID de la publicacion asociada
 * @param authorId      ID del autor
 * @param authorName    nombre de usuario del autor
 * @param title         titulo de la beta
 * @param description   descripcion
 * @param downloadType  tipo de descarga
 * @param externalUrl   URL externa (si aplica)
 * @param version       version de la beta
 * @param genre         genero del videojuego
 * @param downloads     numero de descargas
 * @param coverImage    URL de la portada
 * @param createdAt     fecha de creacion
 */
public record BetaResponse(
        Long id,
        Long postId,
        Long authorId,
        String authorName,
        String title,
        String description,
        DownloadType downloadType,
        String externalUrl,
        String version,
        String genre,
        Integer downloads,
        String coverImage,
        LocalDateTime createdAt
) {
}
