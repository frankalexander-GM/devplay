package com.devplay.service;

import com.devplay.dto.user.NotificationResponse;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.Notification;
import com.devplay.model.NotificationType;
import com.devplay.model.User;
import com.devplay.repository.NotificationRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio con la logica de negocio para gestionar notificaciones
 * de usuario.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Crea una nueva notificacion para un usuario.
     *
     * @param userId     ID del usuario que recibe la notificacion
     * @param fromUserId ID del usuario que genero la notificacion
     * @param type       tipo de notificacion
     * @param message    mensaje descriptivo
     * @return la notificacion creada
     */
    @Transactional
    public Notification create(Long userId, Long fromUserId,
                               NotificationType type, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));
        User fromUser = userRepository.findById(fromUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + fromUserId));

        Notification notification = Notification.builder()
                .user(user)
                .fromUser(fromUser)
                .type(type)
                .message(message)
                .read(false)
                .build();
        notification = notificationRepository.save(notification);
        log.debug("Notificacion creada: usuario={}, tipo={}, de={}",
                userId, type, fromUserId);
        return notification;
    }

    /**
     * Obtiene las notificaciones de un usuario, ordenadas por fecha de
     * creacion descendente (mas recientes primero).
     *
     * @param userId ID del usuario
     * @return lista de notificaciones
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + userId);
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Marca todas las notificaciones no leidas de un usuario como leidas.
     *
     * @param userId ID del usuario
     */
    @Transactional
    public void markAsRead(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + userId);
        }
        notificationRepository.markAllAsRead(userId);
        log.info("Notificaciones marcadas como leidas: usuario={}", userId);
    }

    /**
     * Cuenta cuantas notificaciones no leidas tiene un usuario.
     *
     * @param userId ID del usuario
     * @return numero de notificaciones no leidas
     */
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    /**
     * Mapea una entidad {@link Notification} a {@link NotificationResponse}.
     */
    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getFromUser().getId(),
                n.getFromUser().getUsername(),
                n.getFromUser().getAvatar(),
                n.getType(),
                n.getMessage(),
                n.getRead(),
                n.getCreatedAt()
        );
    }
}
