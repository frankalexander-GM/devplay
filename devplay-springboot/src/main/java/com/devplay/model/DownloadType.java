package com.devplay.model;

/**
 * Tipo de descarga de una beta.
 *
 * <ul>
 *     <li>{@link #DIRECT} - El archivo se descarga directamente del servidor.</li>
 *     <li>{@link #LINK} - Se redirige a una URL externa (Google Drive, itch.io, Mega, etc.).</li>
 * </ul>
 */
public enum DownloadType {
    DIRECT,
    LINK
}
