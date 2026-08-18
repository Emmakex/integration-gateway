# Integration Gateway

<p align="center"><a href="./README.md">English</a> · <strong>Español</strong></p>

> Backend TypeScript reutilizable para APIs REST, webhooks firmados, SOAP/XML, trabajos en segundo plano, reintentos y adaptadores empresariales.

Integration Gateway es una base de integración desarrollada desde cero alrededor de puertos, adaptadores y fronteras de confianza explícitas. Demuestra cómo recibir eventos firmados, comunicarse con sistemas REST/SOAP, programar trabajos reintentables, preservar el historial de dead-letter y exponer señales operativas de baja cardinalidad sin acoplar el núcleo a un CRM, ERP, motor de reservas, proveedor de pagos o API de un proveedor concreto.

**v1.0.0** es la primera baseline estable. Todos los ejemplos y payloads incluidos son ficticios.

![Versión](https://img.shields.io/badge/version-1.0.0-0d1b2d)
![Node](https://img.shields.io/badge/Node-24.12%2B-5fa04e)
![Fastify](https://img.shields.io/badge/Fastify-5.10.0-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178c6)
![Licencia](https://img.shields.io/badge/license-MIT-45d6b5)

## Capacidades

### Webhooks entrantes firmados

- captura de raw body limitada a las rutas que la necesitan;
- verificación HMAC-SHA256 con timestamp;
- comparación del digest en tiempo constante;
- rechazo de peticiones antiguas o con timestamp futuro;
- claves de idempotencia obligatorias;
- replay de solicitudes completadas y bloqueo de duplicados en curso;
- correlation IDs y registros de auditoría.

### REST saliente

- puerto de conector independiente del proveedor;
- URL base configurada únicamente en el servidor;
- validación de rutas relativas y origen, con redirects desactivados;
- timeout y clasificación normalizada de fallos;
- backoff exponencial acotado y `Retry-After` limitado;
- reintentos solo cuando la operación tiene semántica segura/idempotente.

### SOAP / XML

- generación de envelopes SOAP 1.1 y SOAP 1.2;
- convenciones de transporte `SOAPAction` / action de SOAP 1.2;
- valores XML generados mediante un builder XML, no mediante concatenación de strings;
- procesamiento de entidades personalizadas desactivado;
- manejo normalizado de SOAP Fault;
- endpoint fijo configurado en servidor;
- timeout y límite máximo de tamaño de respuesta;
- sin reintentos SOAP automáticos genéricos.

### Trabajos en segundo plano y dead-letter

- dominio `IntegrationJob` independiente del proveedor;
- puertos explícitos de repositorio y executor;
- claim atómico de referencia antes de la ejecución;
- ciclo de vida queued / running / retry-scheduled / succeeded / dead-letter;
- presupuesto de reintentos limitado;
- el replay crea un nuevo job enlazado sin modificar el registro fallido;
- historial de transiciones y correlation IDs;
- worker de polling opt-in, desactivado por defecto;
- métricas de referencia de baja cardinalidad y locales al proceso.

## Arquitectura

```text
                         Integration Gateway

 webhook entrante                                     async / saliente
       |                                                      |
 raw body + HMAC                                      servicio de aplicación
       |                                                      |
 claim de idempotencia                     +-------------------+------------------+
       |                                   |                   |                  |
       +---------------------------> conector REST        conector SOAP       JobService
                                           |                   |                  |
                                      REST externo         SOAP externo       JobRepository
                                                                                 |
                                                                            JobExecutor
                                                                                 |
                                                                          retry / dead-letter
```

Los DTOs específicos de cada proveedor, credenciales, nombres de operación y mappings deben vivir en adaptadores/executors dedicados. Las rutas genéricas y los modelos de dominio no contienen integraciones productivas de clientes.

Documentación:

- [`docs/README.md`](docs/README.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md)
- [`docs/OUTBOUND-REST.md`](docs/OUTBOUND-REST.md)
- [`docs/SOAP-XML.md`](docs/SOAP-XML.md)
- [`docs/JOBS.md`](docs/JOBS.md)
- [`docs/ADAPTER-GUIDE.md`](docs/ADAPTER-GUIDE.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/PRODUCTION-CHECKLIST.md`](docs/PRODUCTION-CHECKLIST.md)

## Inicio rápido

Requiere **Node.js 24.12+** y **npm 11**.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

URL local por defecto: `http://127.0.0.1:3001`.

Todos los conectores externos y superficies demo operativas permanecen desactivados hasta configurarlos explícitamente. El worker de background también está desactivado por defecto.

## Valores seguros por defecto

```text
WEBHOOK_SIGNING_SECRET=
EXPOSE_AUDIT_API=false
OUTBOUND_BASE_URL=
SOAP_ENDPOINT=
JOB_WORKER_ENABLED=false
ENABLE_DEMO_API=false
ENABLE_DEMO_TARGET=false
```

## Frontera de producción

El repositorio es una base reutilizable de integración, **no un plano de control productivo listo para usar**. Los siguientes componentes incluidos son implementaciones de referencia/demo y deben sustituirse o protegerse para cargas reales:

- repositorios in-memory de eventos, auditoría de webhooks, idempotencia y jobs;
- métricas de jobs locales al proceso;
- rutas HTTP demo y targets ficticios;
- executor demo de jobs;
- superficies demo/auditoría/gestión de jobs sin autenticación.

Un despliegue productivo debe incorporar persistencia/colas durables y compartidas, claims atómicos para múltiples workers, autenticación y mapping específicos del proveedor, gestión de secretos, APIs operativas protegidas, observabilidad estructurada, rate limits y controles de red propios del despliegue. Sigue [`docs/PRODUCTION-CHECKLIST.md`](docs/PRODUCTION-CHECKLIST.md).

## Rutas públicas/demo

Rutas de referencia principales:

```text
GET  /health
GET  /ready
POST /v1/integration-events
GET  /v1/integration-events
GET  /v1/integration-events/:id
POST /v1/webhooks/:source/:eventType
```

Las rutas adicionales de auditoría/demo existen únicamente cuando se habilitan sus flags de configuración explícitos. Consulta la documentación antes de exponer cualquiera de ellas fuera de entornos locales o CI.

## Quality gate

```bash
npm run verify
npm audit --audit-level=high
```

CI ejecuta:

- escaneo de seguridad del código público;
- comprobaciones de consistencia de release;
- tests unitarios;
- comprobación estricta de TypeScript;
- build de producción;
- smoke tests HTTP sobre el servidor compilado;
- comprobaciones de webhooks válidos, inválidos y replayados;
- validación de retries REST acotados;
- validación de éxito/fallo SOAP;
- validación del ciclo retry → success, dead-letter y replay de jobs;
- auditoría de dependencias de severidad alta.

## Historial de versiones

| Versión | Enfoque |
|---|---|
| `0.1.0` | Base Fastify y dominio de integración |
| `0.2.0` | Webhooks firmados, idempotencia y auditoría |
| `0.3.0` | REST saliente, clasificación de fallos y retries |
| `0.4.0` | Frontera SOAP/XML y manejo de Fault |
| `0.5.0` | Jobs, dead-letter, replay y observabilidad |
| **`1.0.0`** | Baseline estable, documentada y reutilizable |

El trabajo futuro se mantiene en [`ROADMAP.md`](ROADMAP.md).

## Seguridad, soporte y contribuciones

- [`SECURITY.md`](SECURITY.md)
- [`SUPPORT.md`](SUPPORT.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Licencia

MIT © 2026 Eduardo Yauri. Consulta [`LICENSE`](LICENSE).
