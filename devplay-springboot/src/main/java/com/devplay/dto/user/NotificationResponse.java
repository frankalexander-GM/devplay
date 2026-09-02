package com.devplay.dto.user;

import com.devplay.model.NotificationType;

import java.time.LocalDateTime;

/**
 * DTO de respuesta que representa una notificacion recibida por el usuario.
 *
 * @param id           ID de la notificacion
 * @param fromUserId   ID del usuario que genero la notificacion
 * @param fromUsername nombre del usuario que genero la notificacion
 * @param fromAvatar   avatar del usuario que genero la notificacion
 * @param type         tipo de notificacion
 * @param message      mensaje descriptivo
 * @param read         si ya fue leida
 * @param createdAt    fecha de creacion
 */
public record NotificationResponse(
        Long id,
        Long fromUserId,
        String fromUsername,
        String fromAvatar,
        NotificationType type,
        String message,
        Boolean read,
        LocalDateTime createdAt
) {
}
