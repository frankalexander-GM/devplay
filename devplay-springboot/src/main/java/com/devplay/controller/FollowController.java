package com.devplay.controller;

import com.devplay.dto.user.FollowResponse;
import com.devplay.security.SecurityUtils;
import com.devplay.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestion de relaciones de seguimiento.
 *
 * <p>Endpoints bajo {@code /api/follow}.</p>
 */
@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final SecurityUtils securityUtils;

    /**
     * Hace que el usuario autenticado siga a otro usuario.
     * Requiere autenticacion.
     *
     * @param userId ID del usuario a seguir
     */
    @PostMapping("/{userId}")
    public ResponseEntity<Map<String, String>> follow(@PathVariable Long userId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        followService.follow(currentUserId, userId);
        return ResponseEntity.ok(Map.of("message", "Ahora sigues al usuario " + userId));
    }

    /**
     * Hace que el usuario autenticado deje de seguir a otro usuario.
     * Requiere autenticacion.
     *
     * @param userId ID del usuario a dejar de seguir
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> unfollow(@PathVariable Long userId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        followService.unfollow(currentUserId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lista los seguidores de un usuario. Publico.
     *
     * @param userId ID del usuario
     */
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowResponse>> followers(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    /**
     * Lista los usuarios que sigue un usuario. Publico.
     *
     * @param userId ID del usuario
     */
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowResponse>> following(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getFollowing(userId));
    }

    /**
     * Devuelve el conteo de seguidores y seguidos de un usuario.
     * Publico.
     */
    @GetMapping("/{userId}/stats")
    public ResponseEntity<Map<String, Long>> stats(@PathVariable Long userId) {
        return ResponseEntity.ok(Map.of(
                "followers", followService.countFollowers(userId),
                "following", followService.countFollowing(userId)
        ));
    }
}
