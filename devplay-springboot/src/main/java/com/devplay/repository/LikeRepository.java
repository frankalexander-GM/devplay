package com.devplay.repository;

import com.devplay.model.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio de acceso a datos para la entidad {@link Like}.
 */
@Repository
public interface LikeRepository extends JpaRepository<Like, Long> {

    /**
     * Busca el like de un usuario concreto en una publicacion concreta.
     *
     * @param postId ID de la publicacion
     * @param userId ID del usuario
     * @return el like (si existe)
     */
    Optional<Like> findByPostIdAndUserId(Long postId, Long userId);

    /**
     * Verifica si un usuario ya dio like a una publicacion.
     *
     * @param postId ID de la publicacion
     * @param userId ID del usuario
     * @return {@code true} si ya existe el like
     */
    boolean existsByPostIdAndUserId(Long postId, Long userId);

    /**
     * Cuenta cuantos likes tiene una publicacion.
     *
     * @param postId ID de la publicacion
     * @return numero de likes
     */
    long countByPostId(Long postId);
}
