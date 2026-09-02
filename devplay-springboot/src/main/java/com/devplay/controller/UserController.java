package com.devplay.controller;

import com.devplay.dto.user.NotificationResponse;
import com.devplay.dto.user.UpdateProfileRequest;
import com.devplay.dto.user.UserProfileResponse;
import com.devplay.security.SecurityUtils;
import com.devplay.service.NotificationService;
import com.devplay.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestion de usuarios y sus notificaciones.
 *
 * <p>Endpoints bajo {@code /api/users}.</p>
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    /**
     * Obtiene el perfil publico de un usuario por ID. Publico.
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserProfileResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    /**
     * Obtiene el perfil publico de un usuario por nombre de usuario.
     * Publico.
     */
    @GetMapping("/username/{username}")
    public ResponseEntity<UserProfileResponse> getByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getByUsername(username));
    }

    /**
     * Actualiza el perfil del usuario autenticado.
     * Requiere autenticacion.
     */
    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    /**
     * Lista las notificaciones del usuario autenticado.
     * Requiere autenticacion.
     */
    @GetMapping("/me/notifications")
    public ResponseEntity<List<NotificationResponse>> myNotifications() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(notificationService.getByUserId(userId));
    }

    /**
     * Marca todas las notificaciones del usuario autenticado como leidas.
     * Requiere autenticacion.
     */
    @PutMapping("/me/notifications/read")
    public ResponseEntity<Map<String, String>> markNotificationsRead() {
        Long userId = securityUtils.getCurrentUserId();
        notificationService.markAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "Notificaciones marcadas como leidas"));
    }

    /**
     * Devuelve el numero de notificaciones no leidas del usuario autenticado.
     * Requiere autenticacion.
     */
    @GetMapping("/me/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }
}
