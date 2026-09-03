package com.devplay.controller;

import com.devplay.dto.auth.AuthResponse;
import com.devplay.dto.auth.LoginRequest;
import com.devplay.dto.auth.RegisterRequest;
import com.devplay.dto.user.UserProfileResponse;
import com.devplay.security.SecurityUtils;
import com.devplay.service.AuthService;
import com.devplay.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para la autenticacion y gestion del usuario actual.
 *
 * <p>Endpoints bajo {@code /api/auth}.</p>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final SecurityUtils securityUtils;

    /**
     * Registra un nuevo usuario.
     *
     * @param request datos de registro
     * @return 201 Created con el JWT y los datos del usuario
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Autentica a un usuario existente.
     *
     * @param request credenciales de login
     * @return 200 OK con el JWT y los datos del usuario
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Obtiene la informacion del usuario autenticado actualmente.
     *
     * @return 200 OK con el perfil del usuario (incluye email)
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me() {
        Long userId = securityUtils.getCurrentUserId();
        UserProfileResponse profile = userService.getCurrentProfile(userId);
        return ResponseEntity.ok(profile);
    }
}
