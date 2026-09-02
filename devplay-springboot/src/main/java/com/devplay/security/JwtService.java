package com.devplay.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

/**
 * Servicio encargado de generar, validar y extraer informacion de los
 * tokens JWT usados para autenticar a los usuarios de DevPlay.
 *
 * <p>Utiliza la libreria <strong>jjwt 0.12.x</strong> con un secreto
 * compartido (HMAC-SHA256) configurado en {@code application.properties}.</p>
 */
@Slf4j
@Service
public class JwtService {

    /** Claim personalizado que guarda el ID del usuario dentro del token. */
    public static final String CLAIM_USER_ID = "userId";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private long expirationMillis;

    /** Clave HMAC derivada del secreto configurado. */
    private SecretKey key;

    /**
     * Inicializa la clave HMAC a partir del secreto configurado.
     * Si el secreto esta en Base64 lo decodifica; si no, lo usa como texto.
     */
    @PostConstruct
    protected void init() {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            // No es Base64 valido: usamos el texto plano como bytes
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        // jjwt 0.12 requiere al menos 256 bits (32 bytes)
        this.key = Keys.hmacShaKeyFor(keyBytes);
        log.debug("JwtService inicializado con expiracion={}ms", expirationMillis);
    }

    /**
     * Genera un token JWT firmado para el usuario indicado.
     *
     * @param userId   ID del usuario
     * @param username nombre de usuario (se usa como subject)
     * @return token JWT compacto
     */
    public String generateToken(Long userId, String username) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMillis);
        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_USER_ID, userId)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    /**
     * Valida la firma y la expiracion de un token JWT.
     *
     * @param token token JWT
     * @return {@code true} si el token es valido
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.warn("Token JWT invalido: {}", ex.getMessage());
            return false;
        }
    }

    /**
     * Extrae el ID del usuario embebido en el token.
     *
     * @param token token JWT
     * @return ID del usuario, o {@code null} si no esta presente
     */
    public Long extractUserId(String token) {
        return parseClaims(token).get(CLAIM_USER_ID, Long.class);
    }

    /**
     * Extrae el nombre de usuario (subject) del token.
     *
     * @param token token JWT
     * @return nombre de usuario
     */
    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Extrae los claims del token sin verificar la firma por separado
     * (la verificacion se hace en {@link #validateToken}).
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
