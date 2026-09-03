package com.devplay.dto.beta;

import com.devplay.model.DownloadType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de peticion para crear una nueva beta de videojuego.
 *
 * <p>Al crear la beta se crea tambien una publicacion asociada de tipo
 * {@link com.devplay.model.PostType#BETA}.</p>
 *
 * @param title         titulo de la beta (3-100 caracteres)
 * @param description   descripcion del videojuego (max 2000 caracteres)
 * @param downloadType  tipo de descarga (DIRECT o LINK)
 * @param externalUrl   URL externa (requerida si downloadType == LINK)
 * @param version       version de la beta (opcional)
 * @param genre         genero del videojuego (opcional)
 * @param coverImage    URL de la imagen de portada (opcional)
 */
public record CreateBetaRequest(
        @NotBlank(message = "El titulo es obligatorio")
        @Size(min = 3, max = 100, message = "El titulo debe tener entre 3 y 100 caracteres")
        String title,

        @NotBlank(message = "La descripcion es obligatoria")
        @Size(max = 2000, message = "La descripcion no puede superar 2000 caracteres")
        String description,

        DownloadType downloadType,

        @Size(max = 500, message = "La URL externa no puede superar 500 caracteres")
        String externalUrl,

        @Size(max = 50, message = "La version no puede superar 50 caracteres")
        String version,

        @Size(max = 50, message = "El genero no puede superar 50 caracteres")
        String genre,

        @Size(max = 500, message = "La URL de la portada no puede superar 500 caracteres")
        String coverImage
) {
    /** Devuelve el tipo de descarga efectivo (por defecto LINK). */
    public DownloadType effectiveDownloadType() {
        return downloadType != null ? downloadType : DownloadType.LINK;
    }
}
