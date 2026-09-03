package com.devplay.service;

import com.devplay.dto.post.LikeResponse;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.Like;
import com.devplay.model.NotificationType;
import com.devplay.model.Post;
import com.devplay.model.User;
import com.devplay.repository.LikeRepository;
import com.devplay.repository.PostRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Servicio con la logica de negocio para gestionar likes.
 *
 * <p>Implementa la operacion <em>toggle</em>: si el usuario no ha dado
 * like, lo crea; si ya lo habia dado, lo elimina.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Alterna el estado del like de un usuario sobre una publicacion.
     *
     * @param userId ID del usuario
     * @param postId ID de la publicacion
     * @return respuesta con el nuevo estado del like y el conteo total
     * @throws ResourceNotFoundException si el usuario o la publicacion no existen
     */
    @Transactional
    public LikeResponse toggle(Long userId, Long postId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Publicacion no encontrada con ID: " + postId));

        Optional<Like> existing = likeRepository.findByPostIdAndUserId(postId, userId);

        boolean liked;
        if (existing.isPresent()) {
            // Ya tiene like: lo eliminamos (unlike)
            likeRepository.delete(existing.get());
            liked = false;
            log.info("Like eliminado: postId={}, usuario={}", postId, user.getUsername());
        } else {
            // No tiene like: lo creamos
            Like like = Like.builder()
                    .post(post)
                    .user(user)
                    .build();
            likeRepository.save(like);
            liked = true;
            log.info("Like creado: postId={}, usuario={}", postId, user.getUsername());

            // Notificacion al autor de la publicacion (si no es el mismo)
            if (!post.getAuthor().getId().equals(userId)) {
                notificationService.create(
                        post.getAuthor().getId(),
                        userId,
                        NotificationType.LIKE,
                        user.getUsername() + " le gusto tu publicacion");
            }
        }

        long total = likeRepository.countByPostId(postId);
        return new LikeResponse(postId, liked, total);
    }
}
