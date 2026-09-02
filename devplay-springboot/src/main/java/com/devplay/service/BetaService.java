package com.devplay.service;

import com.devplay.dto.beta.BetaResponse;
import com.devplay.dto.beta.CreateBetaRequest;
import com.devplay.exception.BadRequestException;
import com.devplay.exception.ResourceNotFoundException;
import com.devplay.model.Beta;
import com.devplay.model.DownloadType;
import com.devplay.model.Post;
import com.devplay.model.PostType;
import com.devplay.model.User;
import com.devplay.repository.BetaRepository;
import com.devplay.repository.PostRepository;
import com.devplay.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio con la logica de negocio para gestionar betas de videojuegos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BetaService {

    private final BetaRepository betaRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    /**
     * Crea una nueva beta y la publicacion asociada.
     *
     * <p>Se crea automaticamente una {@link Post} de tipo
     * {@link PostType#BETA} cuyo contenido es el titulo de la beta.</p>
     *
     * @param userId  ID del autor (usuario autenticado)
     * @param request datos de la beta
     * @return la beta creada
     */
    @Transactional
    public BetaResponse create(Long userId, CreateBetaRequest request) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado con ID: " + userId));

        // Si el tipo de descarga es LINK, la URL externa es obligatoria
        if (request.effectiveDownloadType() == DownloadType.LINK
                && (request.externalUrl() == null || request.externalUrl().isBlank())) {
            throw new BadRequestException(
                    "La URL externa es obligatoria cuando el tipo de descarga es LINK");
        }

        // 1. Crear la publicacion asociada de tipo BETA
        Post post = Post.builder()
                .author(author)
                .content(request.title())
                .type(PostType.BETA)
                .build();
        post = postRepository.save(post);

        // 2. Crear la beta vinculada a la publicacion
        Beta beta = Beta.builder()
                .post(post)
                .title(request.title())
                .description(request.description())
                .downloadType(request.effectiveDownloadType())
                .externalUrl(request.externalUrl())
                .version(request.version())
                .genre(request.genre())
                .coverImage(request.coverImage())
                .build();
        beta = betaRepository.save(beta);

        log.info("Beta creada: id={}, titulo={}, autor={}",
                beta.getId(), beta.getTitle(), author.getUsername());
        return toResponse(beta);
    }

    /**
     * Obtiene todas las betas.
     *
     * @return lista de betas
     */
    @Transactional(readOnly = true)
    public List<BetaResponse> getAll() {
        return betaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Obtiene una beta por su ID.
     *
     * @param id ID de la beta
     * @return la beta
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public BetaResponse getById(Long id) {
        Beta beta = betaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beta no encontrada con ID: " + id));
        return toResponse(beta);
    }

    /**
     * Incrementa en 1 el contador de descargas de una beta.
     *
     * @param id ID de la beta
     * @return la beta actualizada
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional
    public BetaResponse incrementDownloads(Long id) {
        Beta beta = betaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Beta no encontrada con ID: " + id));

        betaRepository.incrementDownloads(id);
        betaRepository.flush(); // asegura que el UPDATE se ejecute
        beta.setDownloads(beta.getDownloads() + 1);

        log.info("Descarga registrada: betaId={}, total={}", id, beta.getDownloads());
        return toResponse(beta);
    }

    /**
     * Mapea una entidad {@link Beta} a {@link BetaResponse}.
     */
    private BetaResponse toResponse(Beta beta) {
        return new BetaResponse(
                beta.getId(),
                beta.getPost().getId(),
                beta.getPost().getAuthor().getId(),
                beta.getPost().getAuthor().getUsername(),
                beta.getTitle(),
                beta.getDescription(),
                beta.getDownloadType(),
                beta.getExternalUrl(),
                beta.getVersion(),
                beta.getGenre(),
                beta.getDownloads(),
                beta.getCoverImage(),
                beta.getCreatedAt()
        );
    }
}
