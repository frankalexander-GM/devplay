package com.devplay.security;

import com.devplay.model.User;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementacion de {@link UserDetailsService} que carga los datos del
 * usuario desde la base de datos PostgreSQL a traves de
 * {@link UserRepository}.
 *
 * <p>Spring Security invoca este servicio durante la autenticacion para
 * obtener el usuario por su nombre de usuario.</p>
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Carga un usuario por su nombre de usuario.
     *
     * @param username nombre de usuario a buscar
     * @return {@link UserDetails} con los datos del usuario
     * @throws UsernameNotFoundException si el usuario no existe
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado: " + username));
        return new CustomUserDetails(user);
    }

    /**
     * Carga un usuario por su ID. Util para reconstruir el contexto de
     * seguridad a partir del claim {@code userId} del token JWT.
     *
     * @param userId ID del usuario
     * @return {@link UserDetails} con los datos del usuario
     * @throws UsernameNotFoundException si el usuario no existe
     */
    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado con ID: " + userId));
        return new CustomUserDetails(user);
    }
}
