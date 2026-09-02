package com.devplay.repository;

import com.devplay.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio de acceso a datos para la entidad {@link User}.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Busca un usuario por su nombre de usuario.
     *
     * @param username nombre de usuario
     * @return el usuario (si existe)
     */
    Optional<User> findByUsername(String username);

    /**
     * Busca un usuario por su email.
     *
     * @param email email del usuario
     * @return el usuario (si existe)
     */
    Optional<User> findByEmail(String email);

    /**
     * Verifica si ya existe un usuario con el nombre de usuario indicado.
     *
     * @param username nombre de usuario a verificar
     * @return {@code true} si ya existe
     */
    boolean existsByUsername(String username);

    /**
     * Verifica si ya existe un usuario con el email indicado.
     *
     * @param email email a verificar
     * @return {@code true} si ya existe
     */
    boolean existsByEmail(String email);
}
