package com.devplay.repository;

import com.devplay.model.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de acceso a datos para la entidad {@link Follow}.
 */
@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    /**
     * Verifica si un usuario sigue a otro.
     *
     * @param followerId ID del seguidor
     * @param followeeId ID del usuario seguido
     * @return {@code true} si existe la relacion de seguimiento
     */
    boolean existsByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    /**
     * Busca la relacion de seguimiento entre dos usuarios.
     *
     * @param followerId ID del seguidor
     * @param followeeId ID del usuario seguido
     * @return la relacion (si existe)
     */
    Optional<Follow> findByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    /**
     * Obtiene los usuarios que sigue un usuario concreto (following).
     *
     * @param followerId ID del seguidor
     * @return lista de relaciones de seguimiento
     */
    List<Follow> findByFollowerId(Long followerId);

    /**
     * Obtiene los seguidores de un usuario concreto (followers).
     *
     * @param followeeId ID del usuario seguido
     * @return lista de relaciones de seguimiento
     */
    List<Follow> findByFolloweeId(Long followeeId);

    /**
     * Cuenta cuantos seguidores tiene un usuario.
     *
     * @param followeeId ID del usuario seguido
     * @return numero de seguidores
     */
    long countByFolloweeId(Long followeeId);

    /**
     * Cuenta cuantos usuarios sigue un usuario.
     *
     * @param followerId ID del seguidor
     * @return numero de seguidos
     */
    long countByFollowerId(Long followerId);
}
