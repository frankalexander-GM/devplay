package com.devplay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada principal de la API REST de DevPlay.
 *
 * <p>DevPlay es una plataforma social para compartir betas de videojuegos.
 * Esta aplicacion expone una API REST construida con Spring Boot 3,
 * Java 21, Spring Data JPA, PostgreSQL, Spring Security (JWT) y
 * Spring Validation.</p>
 *
 * <p>Arquitectura en capas:</p>
 * <ol>
 *     <li><b>Controller</b> - Recibe peticiones HTTP y devuelve JSON.</li>
 *     <li><b>Service</b> - Contiene la logica de negocio.</li>
 *     <li><b>Repository</b> - Acceso a datos con Spring Data JPA.</li>
 *     <li><b>Model</b> - Entidades JPA mapeadas a tablas PostgreSQL.</li>
 * </ol>
 *
 * @see <a href="https://spring.enlinea.sbs/">Guia Spring Boot</a>
 */
@SpringBootApplication
public class DevPlayApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevPlayApplication.class, args);
    }
}
