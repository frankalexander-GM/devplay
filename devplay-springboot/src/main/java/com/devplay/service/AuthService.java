package com.devplay.service;

import com.devplay.dto.auth.AuthResponse;
import com.devplay.dto.auth.LoginRequest;
import com.devplay.dto.auth.RegisterRequest;
import com.devplay.exception.BadRequestException;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.User;
import com.devplay.repository.UserRepository;
import com.devplay.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio que implementa la logica de negocio de autenticacion:
 * registro de nuevos usuarios y login.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Registra un nuevo usuario en DevPlay.
     *
     * <p>Valida que el username y el email no existan ya, hashea el
     * password con BCrypt y genera un JWT para la sesion.</p>
     *
     * @param request datos de registro
     * @return respuesta con el JWT y los datos del nuevo usuario
     * @throws BadRequestException si el username o el email ya existen
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BadRequestException("El nombre de usuario ya esta en uso");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("El email ya esta registrado");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role("USER")
                .build();

        user = userRepository.save(user);
        log.info("Usuario registrado: id={}, username={}", user.getId(), user.getUsername());

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getCreatedAt()
        );
    }

    /**
     * Autentica a un usuario con email + password.
     *
     * @param request credenciales de login
     * @return respuesta con el JWT y los datos del usuario
     * @throws BadRequestException si las credenciales son invalidas
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadRequestException("Credenciales invalidas"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadRequestException("Credenciales invalidas");
        }

        log.info("Login exitoso: id={}, username={}", user.getId(), user.getUsername());

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getCreatedAt()
        );
    }

    /**
     * Obtiene el usuario autenticado actualmente a partir de su ID.
     *
     * @param userId ID del usuario autenticado
     * @return entidad {@link User}
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public User getCurrentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));
    }
}
