package com.devplay.controller;

import com.devplay.dto.comment.CommentResponse;
import com.devplay.dto.comment.CreateCommentRequest;
import com.devplay.security.SecurityUtils;
import com.devplay.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para la gestion de comentarios.
 *
 * <p>Endpoints bajo {@code /api/posts/{postId}/comments}.</p>
 */
@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final SecurityUtils securityUtils;

    /**
     * Lista los comentarios de una publicacion. Publico.
     */
    @GetMapping
    public ResponseEntity<List<CommentResponse>> list(@PathVariable Long postId) {
        return ResponseEntity.ok(commentService.getByPostId(postId));
    }

    /**
     * Crea un comentario en una publicacion.
     * Requiere autenticacion.
     */
    @PostMapping
    public ResponseEntity<CommentResponse> create(@PathVariable Long postId,
                                                  @Valid @RequestBody CreateCommentRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        CommentResponse response = commentService.create(userId, postId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
