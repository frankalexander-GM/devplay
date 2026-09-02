package com.devplay.service;

import com.devplay.dto.user.FollowResponse;
import com.devplay.exception.BadRequestException;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.Follow;
import com.devplay.model.NotificationType;
import com.devplay.model.User;
import com.devplay.repository.FollowRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio con la logica de negocio para gestionar relaciones de
 * seguimiento entre usuarios (follow / unfollow).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Hace que un usuario siga a otro.
     *
     * @param followerId ID del seguidor
     * @param followeeId ID del usuario a seguir
     * @throws ResourceNotFoundException si alguno de los usuarios no existe
     * @throws BadRequestException       si se intenta seguir a si mismo
     */
    @Transactional
    public void follow(Long followerId, Long followeeId) {
        if (followerId.equals(followeeId)) {
            throw new BadRequestException("No puedes seguirte a ti mismo");
        }

        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + followerId));
        User followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + followeeId));

        if (followRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId)) {
            // Idempotente: ya sigue al usuario, no hacemos nada
            return;
        }

        Follow follow = Follow.builder()
                .follower(follower)
                .followee(followee)
                .build();
        followRepository.save(follow);

        // Notificar al usuario seguido
        notificationService.create(
                followeeId,
                followerId,
                NotificationType.FOLLOW,
                follower.getUsername() + " empezo a seguirte");

        log.info("Follow: {} -> {}", follower.getUsername(), followee.getUsername());
    }

    /**
     * Hace que un usuario deje de seguir a otro.
     *
     * @param followerId ID del seguidor
     * @param followeeId ID del usuario a dejar de seguir
     * @throws ResourceNotFoundException si alguno de los usuarios no existe
     */
    @Transactional
    public void unfollow(Long followerId, Long followeeId) {
        if (!userRepository.existsById(followerId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + followerId);
        }
        if (!userRepository.existsById(followeeId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + followeeId);
        }

        followRepository.findByFollowerIdAndFolloweeId(followerId, followeeId)
                .ifPresent(f -> {
                    followRepository.delete(f);
                    log.info("Unfollow: {} dejo de seguir a {}",
                            f.getFollower().getUsername(), f.getFollowee().getUsername());
                });
    }

    /**
     * Obtiene la lista de seguidores de un usuario.
     *
     * @param userId ID del usuario
     * @return lista de seguidores
     * @throws ResourceNotFoundException si el usuario no existe
     */
    @Transactional(readOnly = true)
    public List<FollowResponse> getFollowers(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + userId);
        }
        return followRepository.findByFolloweeId(userId).stream()
                .map(f -> new FollowResponse(
                        f.getId(),
                        f.getFollower().getId(),
                        f.getFollower().getUsername(),
                        f.getFollower().getAvatar()))
                .toList();
    }

    /**
     * Obtiene la lista de usuarios a los que sigue un usuario.
     *
     * @param userId ID del usuario
     * @return lista de seguidos
     * @throws ResourceNotFoundException si el usuario no existe
     */
    @Transactional(readOnly = true)
    public List<FollowResponse> getFollowing(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException(
                    "Usuario no encontrado con ID: " + userId);
        }
        return followRepository.findByFollowerId(userId).stream()
                .map(f -> new FollowResponse(
                        f.getId(),
                        f.getFollowee().getId(),
                        f.getFollowee().getUsername(),
                        f.getFollowee().getAvatar()))
                .toList();
    }

    /**
     * Cuenta cuantos seguidores tiene un usuario.
     */
    @Transactional(readOnly = true)
    public long countFollowers(Long userId) {
        return followRepository.countByFolloweeId(userId);
    }

    /**
     * Cuenta cuantos usuarios sigue un usuario.
     */
    @Transactional(readOnly = true)
    public long countFollowing(Long userId) {
        return followRepository.countByFollowerId(userId);
    }
}
