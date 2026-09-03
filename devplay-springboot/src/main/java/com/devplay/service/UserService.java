package com.devplay.service;

import com.devplay.dto.user.UpdateProfileRequest;
import com.devplay.dto.user.UserProfileResponse;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.User;
import com.devplay.repository.PostRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio con la logica de negocio para gestionar perfiles de usuario.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final FollowService followService;

    /**
     * Obtiene el perfil publico de un usuario por ID.
     *
     * @param id ID del usuario
     * @return perfil del usuario
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + id));
        return toResponse(user, false);
    }

    /**
     * Obtiene el perfil publico de un usuario por su nombre de usuario.
     *
     * @param username nombre de usuario
     * @return perfil del usuario
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado: " + username));
        return toResponse(user, false);
    }

    /**
     * Obtiene el perfil completo del usuario autenticado (incluye email).
     *
     * @param userId ID del usuario autenticado
     * @return perfil del usuario
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));
        return toResponse(user, true);
    }

    /**
     * Actualiza el perfil del usuario autenticado.
     *
     * <p>Solo se actualizan los campos incluidos en la peticion.</p>
     *
     * @param userId  ID del usuario autenticado
     * @param request datos a actualizar
     * @return perfil actualizado
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));

        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.avatar() != null) {
            user.setAvatar(request.avatar());
        }
        if (request.banner() != null) {
            user.setBanner(request.banner());
        }

        user = userRepository.save(user);
        log.info("Perfil actualizado: id={}", userId);
        return toResponse(user, true);
    }

    /**
     * Mapea una entidad {@link User} a {@link UserProfileResponse}.
     *
     * @param user          entidad
     * @param includeEmail  si se debe incluir el email (solo para /me)
     */
    private UserProfileResponse toResponse(User user, boolean includeEmail) {
        long postCount = postRepository.findByAuthorIdOrderByCreatedAtDesc(user.getId()).size();
        long followers = followService.countFollowers(user.getId());
        long following = followService.countFollowing(user.getId());

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                includeEmail ? user.getEmail() : null,
                user.getBio(),
                user.getAvatar(),
                user.getBanner(),
                user.getRole(),
                followers,
                following,
                postCount,
                user.getCreatedAt()
        );
    }
}
