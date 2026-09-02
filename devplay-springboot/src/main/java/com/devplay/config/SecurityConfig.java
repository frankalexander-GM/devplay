package com.devplay.config;

import com.devplay.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Configuracion central de Spring Security para DevPlay.
 *
 * <p>Estrategia:</p>
 * <ul>
 *     <li>Estado stateless (sin sesiones HTTP) - la autenticacion es por JWT.</li>
 *     <li>Endpoints publicos: {@code /api/auth/**}, OPTIONS y los GET de
 *     publicaciones, betas, comentarios y perfiles.</li>
 *     <li>El resto requiere autenticacion.</li>
 *     <li>CSRF deshabilitado (API REST stateless).</li>
 *     <li>CORS habilitado con la configuracion de {@link CorsConfig}.</li>
 *     <li>Filtro {@link JwtAuthFilter} se ejecuta antes del filtro de
 *     usuario/password estandar.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomUserDetailsService customUserDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * Bean de {@link PasswordEncoder} que usa BCrypt (costo por defecto 10).
     *
     * @return encoder BCrypt
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Proveedor de autenticacion que usa nuestro
     * {@link CustomUserDetailsService} y el encoder BCrypt.
     */
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Expone el {@link AuthenticationManager} para que pueda usarse en
     * el servicio de autenticacion.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Cadena de filtros de seguridad.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Desactiva CSRF: las APIs REST stateless no lo necesitan
                .csrf(AbstractHttpConfigurer::disable)
                // Habilita CORS con la configuracion de CorsConfig
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // Sin sesiones HTTP: cada peticion se autentica via JWT
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Reglas de autorizacion
                .authorizeHttpRequests(auth -> auth
                        // Preflight CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Endpoints publicos de autenticacion
                        .requestMatchers("/api/auth/**").permitAll()
                        // Lectura publica de publicaciones, betas, comentarios y perfiles
                        .requestMatchers(HttpMethod.GET,
                                "/api/posts",
                                "/api/posts/**",
                                "/api/betas",
                                "/api/betas/**",
                                "/api/posts/*/comments",
                                "/api/users/**",
                                "/api/follow/*/followers",
                                "/api/follow/*/following"
                        ).permitAll()
                        // El resto requiere autenticacion
                        .anyRequest().authenticated())
                // Proveedor de autenticacion personalizado
                .authenticationProvider(authenticationProvider())
                // Inserta nuestro filtro JWT antes del filtro estandar
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
