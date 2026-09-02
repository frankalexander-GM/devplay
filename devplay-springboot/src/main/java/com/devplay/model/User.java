package com.devplay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad que representa a un usuario de DevPlay.
 *
 * <p>Mapea la tabla {@code users} en PostgreSQL. Un usuario puede crear
 * publicaciones, comentar, dar like, seguir a otros usuarios y recibir
 * notificaciones.</p>
 */
@Entity
@Table(name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "username"),
                @UniqueConstraint(columnNames = "email")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    /** Identificador unico autogenerado (PK). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre de usuario unico (3-20 caracteres). */
    @Column(nullable = false, unique = true, length = 20)
    private String username;

    /** Email unico, usado para login. */
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /** Password hasheado con BCrypt (nunca se guarda en texto plano). */
    @Column(nullable = false)
    private String password;

    /** Biografia del usuario (opcional, hasta 500 caracteres). */
    @Column(length = 500)
    private String bio;

    /** URL del avatar (opcional). */
    @Column(length = 500)
    private String avatar;

    /** URL del banner de perfil (opcional). */
    @Column(length = 500)
    private String banner;

    /** Rol del usuario: USER (por defecto) o ADMIN. */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String role = "USER";

    /** Fecha de creacion de la cuenta. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Publicaciones creadas por el usuario. */
    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Post> posts = new ArrayList<>();

    /** Usuarios que siguen a este usuario (seguidores). */
    @OneToMany(mappedBy = "followee", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Follow> followers = new ArrayList<>();

    /** Usuarios a los que sigue este usuario (seguidos). */
    @OneToMany(mappedBy = "follower", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Follow> following = new ArrayList<>();

    /** Notificaciones recibidas por este usuario. */
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Notification> notifications = new ArrayList<>();

    /**
     * Callback de JPA que asigna la fecha de creacion antes de persistir.
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
