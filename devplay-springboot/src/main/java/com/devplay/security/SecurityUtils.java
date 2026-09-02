package com.devplay.security;

import com.devplay.exception.ResourceNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Utilidad para acceder al usuario autenticado actualmente desde cualquier
 * parte de la aplicacion.
 *
 * <p>Lee el {@link CustomUserDetails} almacenado en el
 * {@link SecurityContextHolder} por {@link com.devplay.config.JwtAuthFilter}.</p>
 */
@Component
public class SecurityUtils {

    /**
     * Obtiene el ID del usuario autenticado actualmente.
     *
     * @return ID del usuario autenticado
     * @throws ResourceNotFoundException si no hay usuario autenticado
     */
    public Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || !(auth.getPrincipal() instanceof CustomUserDetails details)) {
            throw new ResourceNotFoundException("No hay usuario autenticado");
        }
        return details.getId();
    }

    /**
     * Obtiene el nombre de usuario autenticado actualmente.
     *
     * @return username autenticado
     * @throws ResourceNotFoundException si no hay usuario autenticado
     */
    public String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || !(auth.getPrincipal() instanceof CustomUserDetails details)) {
            throw new ResourceNotFoundException("No hay usuario autenticado");
        }
        return details.getUsername();
    }

    /**
     * Comprueba si hay un usuario autenticado en el contexto actual.
     *
     * @return {@code true} si hay usuario autenticado
     */
    public boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof CustomUserDetails;
    }
}
