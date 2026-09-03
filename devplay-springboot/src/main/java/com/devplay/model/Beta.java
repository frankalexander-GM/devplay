package com.devplay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entidad que representa una beta de videojuego publicada en DevPlay.
 *
 * <p>Una beta siempre esta asociada a una {@link Post} de tipo
 * {@link PostType#BETA}. Contiene metadatos del videojuego (titulo,
 * descripcion, genero, version, etc.) y un contador de descargas.</p>
 */
@Entity
@Table(name = "betas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Beta {

    /** Identificador unico autogenerado (PK). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Publicacion a la que pertenece la beta (relacion 1:1). */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false, unique = true)
    private Post post;

    /** Titulo de la beta (3-100 caracteres). */
    @Column(nullable = false, length = 100)
    private String title;

    /** Descripcion del videojuego (hasta 2000 caracteres). */
    @Column(nullable = false, length = 2000)
    private String description;

    /** Tipo de descarga: {@link DownloadType#DIRECT} o {@link DownloadType#LINK}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "download_type", nullable = false, length = 10)
    @Builder.Default
    private DownloadType downloadType = DownloadType.LINK;

    /** URL externa de descarga (cuando downloadType == LINK). */
    @Column(name = "external_url", length = 500)
    private String externalUrl;

    /** Version de la beta (ej. "v0.1", "Alpha 1.2"). */
    @Column(length = 50)
    private String version;

    /** Genero del videojuego (Plataformas, RPG, Puzzle, etc.). */
    @Column(length = 50)
    private String genre;

    /** Numero de descargas realizadas. */
    @Column(nullable = false)
    @Builder.Default
    private Integer downloads = 0;

    /** URL de la imagen de portada. */
    @Column(name = "cover_image", length = 500)
    private String coverImage;

    /** Fecha de creacion. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Asigna la fecha de creacion antes de persistir. */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.downloads == null) {
            this.downloads = 0;
        }
    }
}
