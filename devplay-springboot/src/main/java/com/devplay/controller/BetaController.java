package com.devplay.controller;

import com.devplay.dto.beta.BetaResponse;
import com.devplay.dto.beta.CreateBetaRequest;
import com.devplay.security.SecurityUtils;
import com.devplay.service.BetaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para la gestion de betas de videojuegos.
 *
 * <p>Endpoints bajo {@code /api/betas}.</p>
 */
@RestController
@RequestMapping("/api/betas")
@RequiredArgsConstructor
public class BetaController {

    private final BetaService betaService;
    private final SecurityUtils securityUtils;

    /**
     * Lista todas las betas. Publico.
     */
    @GetMapping
    public ResponseEntity<List<BetaResponse>> getAll() {
        return ResponseEntity.ok(betaService.getAll());
    }

    /**
     * Obtiene una beta por ID. Publico.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BetaResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(betaService.getById(id));
    }

    /**
     * Crea una nueva beta (y su publicacion asociada).
     * Requiere autenticacion.
     */
    @PostMapping
    public ResponseEntity<BetaResponse> create(@Valid @RequestBody CreateBetaRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        BetaResponse response = betaService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Incrementa el contador de descargas de una beta. Publico.
     *
     * @param id ID de la beta
     * @return la beta actualizada con el nuevo contador
     */
    @PostMapping("/{id}/download")
    public ResponseEntity<BetaResponse> download(@PathVariable Long id) {
        return ResponseEntity.ok(betaService.incrementDownloads(id));
    }
}
