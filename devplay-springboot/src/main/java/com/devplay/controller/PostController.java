package com.devplay.controller;

import com.devplay.dto.post.CreatePostRequest;
import com.devplay.dto.post.LikeResponse;
import com.devplay.dto.post.PostResponse;
import com.devplay.dto.post.UpdatePostRequest;
import com.devplay.security.SecurityUtils;
import com.devplay.service.LikeService;
import com.devplay.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Controlador REST para la gestion de publicaciones.
 *
 * <p>Endpoints bajo {@code /api/posts}.</p>
 */
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final LikeService likeService;
    private final SecurityUtils securityUtils;

    /**
     * Lista todas las publicaciones (ordenadas por fecha descendente).
     * Publico.
     */
    @GetMapping
    public ResponseEntity<List<PostResponse>> getAll() {
        Optional<Long> currentUserId = currentUserIdIfAuth();
        return ResponseEntity.ok(postService.getAll(currentUserId));
    }

    /**
     * Obtiene una publicacion por ID. Publico.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(postService.getById(id, currentUserIdIfAuth()));
    }

    /**
     * Crea una nueva publicacion. Requiere autenticacion.
     */
    @PostMapping
    public ResponseEntity<PostResponse> create(@Valid @RequestBody CreatePostRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        PostResponse response = postService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Actualiza una publicacion. Requiere autenticacion y ser el autor.
     */
    @PutMapping("/{id}")
    public ResponseEntity<PostResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody UpdatePostRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(postService.update(userId, id, request));
    }

    /**
     * Elimina una publicacion. Requiere autenticacion y ser el autor.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        postService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lista las publicaciones de un usuario concreto. Publico.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PostResponse>> getByAuthor(@PathVariable Long userId) {
        return ResponseEntity.ok(postService.getByAuthor(userId, currentUserIdIfAuth()));
    }

    /**
     * Alterna el like del usuario autenticado sobre una publicacion.
     * Requiere autenticacion.
     *
     * @param id ID de la publicacion
     * @return estado del like y conteo total
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<LikeResponse> toggleLike(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(likeService.toggle(userId, id));
    }

    /**
     * Devuelve el ID del usuario autenticado si lo hay; empty si la
     * peticion es anonima.
     */
    private Optional<Long> currentUserIdIfAuth() {
        return securityUtils.isAuthenticated() ? Optional.of(securityUtils.getCurrentUserId()) : Optional.empty();
    }
}
