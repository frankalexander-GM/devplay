package com.devplay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad que representa una publicacion en DevPlay.
 *
 * <p>Una publicacion puede ser de tipo {@link PostType#POST} (texto),
 * {@link PostType#BETA} (beta de videojuego asociada) o
 * {@link PostType#POLL} (encuesta).</p>
 */
@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    /** Identificador unico autogenerado (PK). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Autor de la publicacion (relacion N:1 con User). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    /** Contenido textual de la publicacion (hasta 2000 caracteres). */
    @Column(length = 2000)
    private String content;

    /** Tipo de publicacion. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private PostType type = PostType.POST;

    /** Fecha de creacion. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Fecha de ultima actualizacion. */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Beta asociada (si type == BETA). Relacion 1:1. */
    @OneToOne(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Beta beta;

    /** Comentarios de la publicacion. */
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    /** Likes de la publicacion. */
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Like> likes = new ArrayList<>();

    /** Asigna la fecha de creacion antes de persistir. */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    /** Actualiza la fecha de modificacion antes de actualizar. */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
