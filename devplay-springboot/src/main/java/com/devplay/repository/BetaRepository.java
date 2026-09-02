package com.devplay.repository;

import com.devplay.model.Beta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de acceso a datos para la entidad {@link Beta}.
 */
@Repository
public interface BetaRepository extends JpaRepository<Beta, Long> {

    /**
     * Busca la beta asociada a una publicacion concreta.
     *
     * @param postId ID de la publicacion
     * @return la beta (si existe)
     */
    Optional<Beta> findByPostId(Long postId);

    /**
     * Busca betas cuyo titulo contenga el texto indicado (case-insensitive).
     *
     * @param title texto a buscar
     * @return lista de betas coincidentes
     */
    List<Beta> findByTitleContainingIgnoreCase(String title);

    /**
     * Incrementa en 1 el contador de descargas de una beta.
     *
     * @param id ID de la beta
     */
    @Modifying
    @Query("UPDATE Beta b SET b.downloads = b.downloads + 1 WHERE b.id = :id")
    void incrementDownloads(@Param("id") Long id);
}
