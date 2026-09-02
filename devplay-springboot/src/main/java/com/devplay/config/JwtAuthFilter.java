package com.devplay.config;

import com.devplay.security.CustomUserDetailsService;
import com.devplay.security.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro de Spring Security que se ejecuta una vez por cada peticion
 * (hereda de {@link OncePerRequestFilter}).
 *
 * <p>Su responsabilidad es:</p>
 * <ol>
 *     <li>Extraer el token JWT del header {@code Authorization: Bearer ...}.</li>
 *     <li>Validar el token con {@link JwtService}.</li>
 *     <li>Cargar el usuario con {@link CustomUserDetailsService}.</li>
 *     <li>Establecer la autenticacion en el {@link SecurityContextHolder}.</li>
 * </ol>
 *
 * <p>Si el token no esta presente o no es valido, la peticion continua sin
 * autenticar; sera la configuracion de seguridad quien decida si se permite
 * o no el acceso segun la URL.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader(AUTHORIZATION_HEADER);

        // Si no hay header Authorization o no empieza con "Bearer ", se omite
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(BEARER_PREFIX.length());

        try {
            if (jwtService.validateToken(jwt)) {
                Long userId = jwtService.extractUserId(jwt);

                // Solo autenticamos si no hay ya una autenticacion en el contexto
                if (userId != null
                        && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails userDetails = userDetailsService.loadUserById(userId);

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities());

                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException | IllegalArgumentException ex) {
            log.warn("Error procesando token JWT: {}", ex.getMessage());
            // Limpiamos el contexto por seguridad
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
