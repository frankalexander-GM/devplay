package com.devplay.service;

import com.devplay.dto.post.CreatePostRequest;
import com.devplay.dto.post.PostResponse;
import com.devplay.dto.post.UpdatePostRequest;
import com.devplay.exception.BadRequestException;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.Post;
import com.devplay.model.PostType;
import com.devplay.model.User;
import com.devplay.repository.LikeRepository;
import com.devplay.repository.PostRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Servicio con la logica de negocio para gestionar publicaciones
 * (posts) en DevPlay.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;

    /**
     * Crea una nueva publicacion.
     *
     * @param userId  ID del autor (usuario autenticado)
     * @param request datos de la publicacion
     * @return la publicacion creada, mapeada a {@link PostResponse}
     */
    @Transactional
    public PostResponse create(Long userId, CreatePostRequest request) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));

        Post post = Post.builder()
                .author(author)
                .content(request.content())
                .type(request.effectiveType())
                .build();

        post = postRepository.save(post);
        log.info("Publicacion creada: id={}, autor={}, tipo={}",
                post.getId(), author.getUsername(), post.getType());
        return toResponse(post, Optional.empty());
    }

    /**
     * Obtiene todas las publicaciones, ordenadas por fecha de creacion
     * descendente (mas recientes primero).
     *
     * @param currentUserId ID del usuario autenticado (para marcar likedByMe),
     *                      o empty si es anonimo
     * @return lista de publicaciones
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getAll(Optional<Long> currentUserId) {
        List<Post> posts = postRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return posts.stream()
                .map(p -> toResponse(p, currentUserId))
                .toList();
    }

    /**
     * Obtiene una publicacion por su ID.
     *
     * @param id            ID de la publicacion
     * @param currentUserId ID del usuario autenticado (opcional)
     * @return la publicacion
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public PostResponse getById(Long id, Optional<Long> currentUserId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Publicacion no encontrada con ID: " + id));
        return toResponse(post, currentUserId);
    }

    /**
     * Obtiene todas las publicaciones de un autor concreto.
     *
     * @param authorId ID del autor
     * @return lista de publicaciones
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getByAuthor(Long authorId, Optional<Long> currentUserId) {
        if (!userRepository.existsById(authorId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + authorId);
        }
        return postRepository.findByAuthorIdOrderByCreatedAtDesc(authorId).stream()
                .map(p -> toResponse(p, currentUserId))
                .toList();
    }

    /**
     * Actualiza el contenido de una publicacion.
     *
     * <p>Solo el autor puede actualizarla.</p>
     *
     * @param userId  ID del usuario autenticado
     * @param id      ID de la publicacion a actualizar
     * @param request nuevos datos
     * @return la publicacion actualizada
     * @throws ResourceNotFoundException si la publicacion no existe
     * @throws BadRequestException       si el usuario no es el autor
     */
    @Transactional
    public PostResponse update(Long userId, Long id, UpdatePostRequest request) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Publicacion no encontrada con ID: " + id));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new BadRequestException(
                    "No tienes permisos para editar esta publicacion");
        }

        post.setContent(request.content());
        post = postRepository.save(post);
        log.info("Publicacion actualizada: id={}", post.getId());
        return toResponse(post, Optional.of(userId));
    }

    /**
     * Elimina una publicacion.
     *
     * <p>Solo el autor puede eliminarla.</p>
     *
     * @param userId ID del usuario autenticado
     * @param id     ID de la publicacion a eliminar
     * @throws ResourceNotFoundException si la publicacion no existe
     * @throws BadRequestException       si el usuario no es el autor
     */
    @Transactional
    public void delete(Long userId, Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Publicacion no encontrada con ID: " + id));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new BadRequestException(
                    "No tienes permisos para eliminar esta publicacion");
        }

        postRepository.delete(post);
        log.info("Publicacion eliminada: id={}", post.getId());
    }

    /**
     * Obtiene las publicaciones de un tipo concreto (POST, BETA, POLL).
     *
     * @param type tipo de publicacion
     * @return lista de publicaciones de ese tipo
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getByType(PostType type, Optional<Long> currentUserId) {
        return postRepository.findByTypeOrderByCreatedAtDesc(type).stream()
                .map(p -> toResponse(p, currentUserId))
                .toList();
    }

    /**
     * Mapea una entidad {@link Post} a {@link PostResponse}.
     *
     * @param post          entidad
     * @param currentUserId ID del usuario actual (para marcar likedByMe)
     * @return DTO de respuesta
     */
    private PostResponse toResponse(Post post, Optional<Long> currentUserId) {
        boolean likedByMe = currentUserId
                .filter(uid -> likeRepository.existsByPostIdAndUserId(post.getId(), uid))
                .isPresent();

        long likeCount = likeRepository.countByPostId(post.getId());
        long commentCount = post.getComments() != null ? post.getComments().size() : 0;

        return new PostResponse(
                post.getId(),
                post.getAuthor().getId(),
                post.getAuthor().getUsername(),
                post.getAuthor().getAvatar(),
                post.getContent(),
                post.getType(),
                commentCount,
                likeCount,
                likedByMe,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
