package com.devplay.model;

/**
 * Tipo de notificacion que recibe un usuario en DevPlay.
 *
 * <ul>
 *     <li>{@link #FOLLOW} - Alguien comenzo a seguir al usuario.</li>
 *     <li>{@link #LIKE} - Alguien dio like a una publicacion del usuario.</li>
 *     <li>{@link #COMMENT} - Alguien comento una publicacion del usuario.</li>
 *     <li>{@link #LIVE} - Un usuario seguido inicio transmision en vivo.</li>
 * </ul>
 */
public enum NotificationType {
    FOLLOW,
    LIKE,
    COMMENT,
    LIVE
}
