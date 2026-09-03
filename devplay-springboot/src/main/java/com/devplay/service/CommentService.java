package com.devplay.service;

import com.devplay.dto.comment.CommentResponse;
import com.devplay.dto.comment.CreateCommentRequest;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.Comment;
import com.devplay.model.NotificationType;
import com.devplay.model.Post;
import com.devplay.model.User;
import com.devplay.repository.CommentRepository;
import com.devplay.repository.PostRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio con la logica de negocio para gestionar comentarios.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Crea un comentario en una publicacion.
     *
     * <p>Si el autor de la publicacion no es el usuario que comenta, se
     * genera una notificacion {@link NotificationType#COMMENT}.</p>
     *
     * @param userId  ID del usuario que comenta
     * @param postId  ID de la publicacion
     * @param request datos del comentario
     * @return el comentario creado
     * @throws ResourceNotFoundException si la publicacion o el usuario no existen
     */
    @Transactional
    public CommentResponse create(Long userId, Long postId, CreateCommentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Publicacion no encontrada con ID: " + postId));

        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(request.content())
                .build();
        comment = commentRepository.save(comment);

        // Notificacion al autor de la publicacion (si no es el mismo que comenta)
        if (!post.getAuthor().getId().equals(userId)) {
            notificationService.create(
                    post.getAuthor().getId(),
                    userId,
                    NotificationType.COMMENT,
                    user.getUsername() + " comento tu publicacion");
        }

        log.info("Comentario creado: id={}, postId={}, usuario={}",
                comment.getId(), postId, user.getUsername());
        return toResponse(comment);
    }

    /**
     * Obtiene los comentarios de una publicacion, ordenados por fecha
     * de creacion ascendente.
     *
     * @param postId ID de la publicacion
     * @return lista de comentarios
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> getByPostId(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException(
                    "Publicacion no encontrada con ID: " + postId);
        }
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Mapea una entidad {@link Comment} a {@link CommentResponse}.
     */
    private CommentResponse toResponse(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                comment.getUser().getId(),
                comment.getUser().getUsername(),
                comment.getUser().getAvatar(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
