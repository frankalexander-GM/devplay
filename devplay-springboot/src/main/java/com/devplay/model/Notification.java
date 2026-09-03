package com.devplay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entidad que representa una notificacion recibida por un usuario.
 *
 * <p>Las notificaciones se generan cuando otro usuario sigue, da like,
 * comenta o inicia transmision en vivo.</p>
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    /** Identificador unico autogenerado (PK). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Usuario que recibe la notificacion. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Usuario que genero la notificacion. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    /** Tipo de notificacion. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationType type;

    /** Mensaje descriptivo de la notificacion. */
    @Column(nullable = false, length = 300)
    private String message;

    /** Indica si la notificacion ya fue leida. */
    @Column(nullable = false)
    @Builder.Default
    private Boolean read = false;

    /** Fecha de creacion. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Asigna la fecha de creacion antes de persistir. */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.read == null) {
            this.read = false;
        }
    }
}
