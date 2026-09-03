package com.devplay.model;

/**
 * Tipo de publicacion en DevPlay.
 *
 * <ul>
 *     <li>{@link #POST} - Publicacion de texto normal.</li>
 *     <li>{@link #BETA} - Publicacion asociada a una beta de videojuego.</li>
 *     <li>{@link #POLL} - Encuesta con opciones votables.</li>
 * </ul>
 */
public enum PostType {
    POST,
    BETA,
    POLL
}
