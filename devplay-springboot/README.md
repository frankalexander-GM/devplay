# DevPlay — API REST con Spring Boot 3

> Proyecto complementario al frontend Next.js de **DevPlay** (plataforma
> social para compartir betas de videojuegos). Esta API REST está
> construida con **Spring Boot 3.3.x + Java 21 + PostgreSQL** y sigue la
> guía oficial de [spring.enlinea.sbs](https://spring.enlinea.sbs/).
>
> SENA ADSO — Sprint de Spring Boot 3.

---

## 📑 Tabla de contenidos

1. [Descripción del proyecto](#-descripción-del-proyecto)
2. [Arquitectura](#-arquitectura)
3. [Prerrequisitos](#-prerrequisitos)
4. [Instalación y ejecución](#-instalación-y-ejecución)
5. [Variables de entorno](#-variables-de-entorno)
6. [Endpoints de la API](#-endpoints-de-la-api)
7. [Ejemplos con curl](#-ejemplos-con-curl)
8. [Seguridad (JWT)](#-seguridad-jwt)
9. [Estructura del proyecto](#-estructura-del-proyecto)

---

## 🎮 Descripción del proyecto

**DevPlay** es una plataforma social donde desarrolladores independientes
comparten **betas de videojuegos**, reciben feedback de la comunidad y
construyen una audiencia mediante publicaciones, comentarios, likes y
seguidores.

Esta API REST expone todos los recursos necesarios para alimentar al
frontend:

- **Autenticación** con JWT (registro, login, perfil del usuario actual).
- **Publicaciones** (POST, BETA, POLL) con autoría, edición y borrado.
- **Betas** de videojuegos con contador de descargas.
- **Comentarios** anidados a publicaciones.
- **Likes** (operación *toggle*: dar o quitar like).
- **Follow / unfollow** entre usuarios.
- **Notificaciones** (FOLLOW, LIKE, COMMENT) generadas automáticamente.
- **Perfiles de usuario** públicos y privados.

---

## 🏗 Arquitectura

La aplicación sigue una **arquitectura en capas** clásica de Spring Boot:

```
┌────────────────────────────────────────────────────────────────┐
│                    Cliente (Frontend / cURL)                   │
└──────────────────────────────┬─────────────────────────────────┘
                               │  HTTP / JSON
                               ▼
┌────────────────────────────────────────────────────────────────┐
│  Controller (REST)                                             │
│  - AuthController, PostController, BetaController,             │
│    CommentController, UserController, FollowController         │
│  - Recibe la petición, valida el DTO y devuelve ResponseEntity│
└──────────────────────────────┬─────────────────────────────────┘
                               │  llama a
                               ▼
┌────────────────────────────────────────────────────────────────┐
│  Service (Lógica de negocio)                                   │
│  - AuthService, PostService, BetaService, CommentService,      │
│    LikeService, FollowService, NotificationService, UserService│
│  - Contiene las reglas de negocio, transacciones y validaciones│
└──────────────────────────────┬─────────────────────────────────┘
                               │  usa
                               ▼
┌────────────────────────────────────────────────────────────────┐
│  Repository (Spring Data JPA)                                  │
│  - UserRepository, PostRepository, BetaRepository, ...         │
│  - Genera las consultas SQL automáticamente (findBy*, existsBy*)│
└──────────────────────────────┬─────────────────────────────────┘
                               │  JDBC
                               ▼
┌────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                    │
│  - Tablas: users, posts, betas, comments, likes, follows,     │
│    notifications                                               │
└────────────────────────────────────────────────────────────────┘
```

**Capas transversales:**

- **Security**: `JwtService` (generación/validación de tokens),
  `JwtAuthFilter` (filtro que autentica cada petición),
  `SecurityConfig` (configuración de Spring Security),
  `CustomUserDetailsService` (carga usuarios desde la BD).
- **DTO**: objetos de transferencia con validación Jakarta.
- **Exception**: manejo centralizado de errores con `@RestControllerAdvice`.

---

## ✅ Prerrequisitos

| Herramienta | Versión mínima | Verificación                     |
|-------------|----------------|----------------------------------|
| **JDK**     | 21             | `java -version`                  |
| **Maven**   | 3.9            | `mvn -version`                   |
| **PostgreSQL** | 14          | `psql --version`                 |

> También puedes usar el *wrapper* de Maven incluido en el proyecto:
> `./mvnw` (Linux/macOS) o `mvnw.cmd` (Windows) tras generar la primera
> vez con `mvn wrapper:wrapper`.

---

## 🚀 Instalación y ejecución

### 1. Clonar / entrar al proyecto

```bash
cd /home/z/my-project/devplay-springboot
```

### 2. Crear la base de datos en PostgreSQL

```sql
-- Conéctate a PostgreSQL como superusuario
CREATE DATABASE devplay;
CREATE USER devplay_user WITH ENCRYPTED PASSWORD 'devplay_pass';
GRANT ALL PRIVILEGES ON DATABASE devplay TO devplay_user;
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y ajústalo:

```bash
cp .env.example .env
# Edita .env con tus credenciales reales
```

O exporta las variables en tu shell:

```bash
export DB_URL="jdbc:postgresql://localhost:5432/devplay"
export DB_USER="postgres"
export DB_PASSWORD="tu_password"
export JWT_SECRET="tu_secreto_jwt_en_base64"
export JWT_EXPIRATION="86400000"
export PORT="8080"
```

### 4. Compilar y ejecutar

```bash
# Compila el proyecto
mvn clean compile

# Ejecuta la aplicación (perfil por defecto)
mvn spring-boot:run

# Ejecuta con perfil de desarrollo
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

La API estará disponible en **http://localhost:8080**.

> Spring Boot creará automáticamente las tablas en PostgreSQL gracias a
> `spring.jpa.hibernate.ddl-auto=update`.

### 5. Empaquetar en JAR

```bash
mvn clean package
java -jar target/devplay-springboot-1.0.0.jar
```

---

## 🔐 Variables de entorno

| Variable          | Descripción                                | Valor por defecto                                          |
|-------------------|--------------------------------------------|------------------------------------------------------------|
| `DB_URL`          | URL JDBC de PostgreSQL                     | `jdbc:postgresql://localhost:5432/devplay`                 |
| `DB_USER`         | Usuario de la BD                           | `postgres`                                                 |
| `DB_PASSWORD`     | Password de la BD                          | `postgres`                                                 |
| `JWT_SECRET`      | Secreto HMAC (mínimo 256 bits en Base64)   | clave de desarrollo (no usar en producción)                |
| `JWT_EXPIRATION`  | Expiración del token en milisegundos       | `86400000` (24 h)                                          |
| `PORT`            | Puerto HTTP del servidor                   | `8080`                                                     |

---

## 📡 Endpoints de la API

Todas las rutas están bajo el prefijo `/api`. Las rutas marcadas con 🔒
requieren el header `Authorization: Bearer <JWT>`.

### Autenticación — `/api/auth`

| Método | Ruta        | Descripción                       | Auth |
|--------|-------------|-----------------------------------|------|
| POST   | `/register` | Registra un nuevo usuario         | —    |
| POST   | `/login`    | Inicia sesión y devuelve un JWT   | —    |
| GET    | `/me`       | Devuelve el usuario autenticado   | 🔒   |

### Publicaciones — `/api/posts`

| Método | Ruta                | Descripción                              | Auth |
|--------|---------------------|------------------------------------------|------|
| GET    | `/`                 | Lista todas las publicaciones            | —    |
| GET    | `/{id}`             | Obtiene una publicación por ID           | —    |
| POST   | `/`                 | Crea una publicación                     | 🔒   |
| PUT    | `/{id}`             | Actualiza una publicación (autor)        | 🔒   |
| DELETE | `/{id}`             | Elimina una publicación (autor)          | 🔒   |
| GET    | `/user/{userId}`    | Lista las publicaciones de un usuario    | —    |
| POST   | `/{id}/like`        | Alterna el like del usuario autenticado  | 🔒   |

### Betas — `/api/betas`

| Método | Ruta             | Descripción                          | Auth |
|--------|------------------|--------------------------------------|------|
| GET    | `/`              | Lista todas las betas                | —    |
| GET    | `/{id}`          | Obtiene una beta por ID              | —    |
| POST   | `/`              | Crea una beta (y su publicación)     | 🔒   |
| POST   | `/{id}/download` | Incrementa el contador de descargas  | —    |

### Comentarios — `/api/posts/{postId}/comments`

| Método | Ruta | Descripción                        | Auth |
|--------|------|------------------------------------|------|
| GET    | `/`  | Lista comentarios de una publicación | —    |
| POST   | `/`  | Crea un comentario                 | 🔒   |

### Usuarios — `/api/users`

| Método | Ruta                            | Descripción                              | Auth |
|--------|---------------------------------|------------------------------------------|------|
| GET    | `/{id}`                         | Perfil público por ID                    | —    |
| GET    | `/username/{username}`          | Perfil público por nombre de usuario     | —    |
| PUT    | `/me`                           | Actualiza el perfil propio               | 🔒   |
| GET    | `/me/notifications`             | Lista notificaciones del usuario         | 🔒   |
| PUT    | `/me/notifications/read`        | Marca notificaciones como leídas         | 🔒   |
| GET    | `/me/notifications/unread-count`| Conteo de no leídas                      | 🔒   |

### Follow — `/api/follow`

| Método | Ruta                       | Descripción                       | Auth |
|--------|----------------------------|-----------------------------------|------|
| POST   | `/{userId}`                | Seguir a un usuario               | 🔒   |
| DELETE | `/{userId}`                | Dejar de seguir a un usuario      | 🔒   |
| GET    | `/{userId}/followers`      | Lista seguidores de un usuario    | —    |
| GET    | `/{userId}/following`      | Lista a quienes sigue un usuario  | —    |
| GET    | `/{userId}/stats`          | Conteo de followers / following   | —    |

---

## 🧪 Ejemplos con curl

### 1. Registrar un usuario

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "devuser",
    "email": "dev@example.com",
    "password": "secret123"
  }'
```

**Respuesta (201 Created):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "userId": 1,
  "username": "devuser",
  "email": "dev@example.com",
  "createdAt": "2025-01-15T10:30:00"
}
```

### 2. Iniciar sesión

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "secret123"
  }'
```

### 3. Crear una publicación (autenticado)

```bash
TOKEN="eyJhbGciOiJIUzI1NiJ9..."

curl -X POST http://localhost:8080/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "¡Hola DevPlay! Esta es mi primera publicación.",
    "type": "POST"
  }'
```

### 4. Crear una beta

```bash
curl -X POST http://localhost:8080/api/betas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Pixel Quest Alpha",
    "description": "Aventura RPG en pixel art de mundo abierto.",
    "downloadType": "LINK",
    "externalUrl": "https://itch.io/upload/abc123",
    "version": "v0.1",
    "genre": "RPG"
  }'
```

### 5. Dar like a una publicación

```bash
curl -X POST http://localhost:8080/api/posts/1/like \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Comentar una publicación

```bash
curl -X POST http://localhost:8080/api/posts/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "¡Se ve increíble! No veo la hora de probarlo."
  }'
```

### 7. Seguir a un usuario

```bash
curl -X POST http://localhost:8080/api/follow/2 \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Obtener perfil del usuario autenticado

```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Listar notificaciones no leídas

```bash
curl -X GET http://localhost:8080/api/users/me/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

### 10. Manejo de errores (ejemplo 404)

```bash
curl -X GET http://localhost:8080/api/posts/9999
```

```json
{
  "timestamp": "2025-01-15T10:35:00",
  "status": 404,
  "error": "Not Found",
  "message": "Publicacion no encontrada con ID: 9999",
  "path": "/api/posts/9999"
}
```

---

## 🔑 Seguridad (JWT)

La autenticación se basa en **JSON Web Tokens (JWT)** firmados con
HMAC-SHA256 usando la librería [jjwt 0.12.x](https://github.com/jwtk/jjwt).

### Flujo de autenticación

1. El cliente envía `POST /api/auth/login` con email y password.
2. El servidor valida las credenciales y devuelve un JWT firmado.
3. El cliente incluye el token en las peticiones posteriores:
   ```
   Authorization: Bearer <token>
   ```
4. El filtro `JwtAuthFilter` intercepta cada petición, valida el token,
   carga el usuario desde la BD y lo establece en el
   `SecurityContextHolder`.
5. Los endpoints protegidos solo son accesibles si hay un usuario
   autenticado.

### Almacenamiento del password

Los passwords **nunca** se guardan en texto plano: se hashean con
**BCrypt** (costo por defecto 10) mediante el bean `PasswordEncoder`.

### Endpoints públicos

- `/api/auth/register` y `/api/auth/login`
- Todos los `GET` de `/api/posts`, `/api/betas`, `/api/posts/*/comments`,
  `/api/users` (perfiles públicos) y `/api/follow/*/followers|following`.

---

## 📁 Estructura del proyecto

```
devplay-springboot/
├── pom.xml                              # Dependencias Maven + Java 21
├── .env.example                         # Variables de entorno de ejemplo
├── README.md                            # Este documento
├── src/main/java/com/devplay/
│   ├── DevPlayApplication.java          # Punto de entrada (@SpringBootApplication)
│   ├── config/
│   │   ├── SecurityConfig.java          # Filtro de seguridad, reglas de auth
│   │   ├── JwtAuthFilter.java           # Filtro JWT por petición
│   │   └── CorsConfig.java              # Configuración CORS
│   ├── security/
│   │   ├── JwtService.java              # Generación y validación de JWT
│   │   ├── CustomUserDetailsService.java# Carga usuarios desde la BD
│   │   ├── CustomUserDetails.java       # Wrapper UserDetails con ID
│   │   └── SecurityUtils.java           # Helper para obtener usuario actual
│   ├── model/
│   │   ├── User.java                    # Entidad usuario
│   │   ├── Post.java                    # Entidad publicación
│   │   ├── Beta.java                    # Entidad beta de videojuego
│   │   ├── Comment.java                 # Entidad comentario
│   │   ├── Like.java                    # Entidad like
│   │   ├── Follow.java                  # Entidad relación de seguimiento
│   │   ├── Notification.java            # Entidad notificación
│   │   ├── PostType.java                # Enum: POST, BETA, POLL
│   │   ├── DownloadType.java            # Enum: DIRECT, LINK
│   │   └── NotificationType.java        # Enum: FOLLOW, LIKE, COMMENT, LIVE
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── PostRepository.java
│   │   ├── BetaRepository.java
│   │   ├── CommentRepository.java
│   │   ├── LikeRepository.java
│   │   ├── FollowRepository.java
│   │   └── NotificationRepository.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── PostService.java
│   │   ├── BetaService.java
│   │   ├── CommentService.java
│   │   ├── LikeService.java
│   │   ├── FollowService.java
│   │   ├── NotificationService.java
│   │   └── UserService.java
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── PostController.java
│   │   ├── BetaController.java
│   │   ├── CommentController.java
│   │   ├── UserController.java
│   │   └── FollowController.java
│   ├── dto/
│   │   ├── auth/{LoginRequest, RegisterRequest, AuthResponse}.java
│   │   ├── post/{CreatePostRequest, UpdatePostRequest, PostResponse, LikeResponse}.java
│   │   ├── beta/{CreateBetaRequest, BetaResponse}.java
│   │   ├── comment/{CreateCommentRequest, CommentResponse}.java
│   │   └── user/{UserProfileResponse, UpdateProfileRequest,
│   │            NotificationResponse, FollowResponse}.java
│   └── exception/
│       ├── GlobalExceptionHandler.java  # @RestControllerAdvice central
│       ├── ResourceNotFoundException.java# → 404
│       ├── BadRequestException.java      # → 400
│       └── ErrorResponse.java            # Estructura JSON de error
├── src/main/resources/
│   ├── application.properties           # Configuración principal
│   └── application-dev.properties       # Perfil de desarrollo
└── src/test/java/com/devplay/
    └── DevPlayApplicationTests.java     # Test de contexto (H2 en memoria)
```

---

## 🛠 Tecnologías utilizadas

| Tecnología                  | Versión  | Uso                                |
|-----------------------------|----------|------------------------------------|
| Java                        | 21       | Lenguaje (records, pattern matching) |
| Spring Boot                 | 3.3.5    | Framework principal                |
| Spring Data JPA             | 3.3.x    | Acceso a datos (Hibernate)         |
| Spring Security             | 6.3.x    | Autenticación y autorización       |
| Spring Validation           | 3.3.x    | Validación de DTOs (Jakarta)       |
| PostgreSQL Driver           | 42.x     | Conexión JDBC a PostgreSQL         |
| jjwt                        | 0.12.6   | Generación y validación de JWT     |
| Lombok                      | 1.18.34  | Reducción de boilerplate           |
| H2                          | 2.x      | Base de datos en memoria (tests)   |

---

## 📜 Licencia

Proyecto educativo — SENA ADSO. Uso libre para fines académicos.

---

## 🔗 Enlaces

- Guía Spring Boot: <https://spring.enlinea.sbs/>
- Spring Boot Reference: <https://docs.spring.io/spring-boot/>
- jjwt: <https://github.com/jwtk/jjwt>
- Frontend DevPlay (Next.js): ver `worklog.md` del proyecto principal.
