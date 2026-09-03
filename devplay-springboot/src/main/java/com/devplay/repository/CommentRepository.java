package com.devplay.repository;

import com.devplay.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de acceso a datos para la entidad {@link Comment}.
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * Obtiene los comentarios de una publicacion, ordenados por
     * fecha de creacion ascendente (mas antiguos primero).
     *
     * @param postId ID de la publicacion
     * @return lista de comentarios
     */
    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
}
