package com.devplay.repository;

import com.devplay.model.Post;
import com.devplay.model.PostType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de acceso a datos para la entidad {@link Post}.
 */
@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * Obtiene todas las publicaciones de un autor, ordenadas
     * por fecha de creacion descendente (mas recientes primero).
     *
     * @param authorId ID del autor
     * @return lista de publicaciones
     */
    List<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    /**
     * Obtiene las publicaciones de un tipo concreto, ordenadas
     * por fecha de creacion descendente.
     *
     * @param type tipo de publicacion
     * @return lista de publicaciones
     */
    List<Post> findByTypeOrderByCreatedAtDesc(PostType type);
}
