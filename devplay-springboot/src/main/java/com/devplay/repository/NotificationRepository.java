package com.devplay.repository;

import com.devplay.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de acceso a datos para la entidad {@link Notification}.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Obtiene las notificaciones de un usuario, ordenadas por
     * fecha de creacion descendente (mas recientes primero).
     *
     * @param userId ID del usuario
     * @return lista de notificaciones
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Cuenta cuantas notificaciones no leidas tiene un usuario.
     *
     * @param userId ID del usuario
     * @return numero de notificaciones no leidas
     */
    long countByUserIdAndReadFalse(Long userId);

    /**
     * Marca todas las notificaciones de un usuario como leidas.
     *
     * @param userId ID del usuario
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    void markAllAsRead(@Param("userId") Long userId);
}
