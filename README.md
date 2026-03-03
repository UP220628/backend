# Nissan Body App — Backend

API REST + WebSocket para la trazabilidad de reparación de unidades vehiculares (planchas para madrinas).

**Stack:** Node.js · Express · TypeScript · PostgreSQL (`postgres` driver) · JWT · WebSocket (`ws`)

---

## Cómo correr

```bash
npm install
npm run dev       # ts-node con recarga automática
npm run build     # compila a dist/
npm start         # corre dist/app.js en producción
```

Requiere un archivo `.env` en la raíz de `backend/` con las variables definidas en `src/config/environment.ts`.

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar/verificar tokens JWT |
| `PORT` | Puerto del servidor (default: 3001) |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma |
| `USE_HTTPS` | `true` para habilitar HTTPS |

---

## Estructura de carpetas

```
backend/src/
├── app.ts                      # Punto de entrada: Express app, middlewares globales, rutas
│
├── config/
│   ├── database.ts             # Instancia del cliente PostgreSQL (postgres.js)
│   └── environment.ts          # Carga y valida variables de entorno con dotenv
│
├── constants/
│   └── index.ts                # Constantes globales: ROLE_IDS, VALID_GRADES,
│                               # VALID_SCM_DECISIONS, VALID_PLANTS, límites de paginación,
│                               # estilos Excel, etc.
│
├── types/
│   └── index.ts                # Interfaces TypeScript: Unit, User, UnitStatus, UnitDefect,
│                               # Notification, DTOs de entrada/salida, etc.
│
├── middleware/
│   ├── auth.ts                 # authMiddleware: verifica JWT o header x-user-role (dev fallback)
│   │                           # requireAuth: guard que rechaza la petición si no hay usuario
│   ├── rateLimit.ts            # apiLimiter: rate limiting general con express-rate-limit
│   └── roleGuard.ts            # validateOverridePermission: solo WWS puede hacer override
│                               # de defectos con isFromWws=true
│
├── routes/                     # Define las rutas y las asocia a controllers
│   ├── auth.ts                 # POST /auth/login, POST /auth/register
│   ├── units.ts                # CRUD de unidades, estados, defectos, prioridad, SCM
│   ├── users.ts                # GET/PUT de usuarios
│   ├── providers.ts            # CRUD de proveedores (carriers)
│   ├── notifications.ts        # GET notificaciones, PUT marcar leída
│   ├── dashboard.ts            # GET estadísticas mensuales y por defecto
│   ├── logs.ts                 # GET historial completo con paginación y exportación Excel
│   ├── events.ts               # GET /events — SSE stream de eventos de unidades
│   └── health.ts               # GET /health — health check
│
├── controllers/                # Recibe req/res, valida inputs básicos y delega a services
│   ├── AuthController.ts       # login, register
│   ├── UnitController.ts       # listUnits, createUnit, updateUnitStatus, updatePriority,
│   │                           # addDefect, updateDefect, setScmDecision, archiveUnit,
│   │                           # getArchivableUnits, getUnitsInRepair, updateEstimatedRepairTime
│   ├── UserController.ts       # getUsers, getUserById, updateUser
│   ├── ProviderController.ts   # getProviders, createProvider, updateProvider
│   ├── NotificationController.ts # getNotifications, markRead, markAllRead
│   ├── DashboardController.ts  # getMonthlyStats, getDefectTrends
│   ├── StatusHistoryController.ts # getStatusHistory (vía UnitEvent)
│   └── NotificationController.ts
│
├── services/                   # Lógica de negocio: orquesta repository + notificaciones + SSE
│   ├── AuthService.ts          # hashPassword, verifyPassword, generarJWT
│   ├── UnitService.ts          # createUnit, updateUnitStatus (dispara notificaciones y SSE),
│   │                           # addDefect, reorderPriority, setScmDecision, archiveUnit
│   ├── NotificationService.ts  # notifyUnitReported/Released/Delivered/WwsReleased/Accepted/
│   │                           # Rejected/Archived/VqaPending — filtra por planta y proveedor
│   ├── UserService.ts          # CRUD de usuarios con hash de contraseña
│   ├── ProviderService.ts      # CRUD de proveedores
│   └── StatusHistoryService.ts # Consulta historial de eventos de una unidad
│
├── repositories/               # Acceso a base de datos con postgres.js (SQL tag)
│   ├── UnitRepository.ts       # findAll, findById, findByStatusName, findByVin,
│   │                           # create, updateStatus (con side effects por estado),
│   │                           # updatePriority, reorderPriority, setScmDecision,
│   │                           # archiveUnit, getArchivableUnits, createDefect,
│   │                           # updateDefectGrade, getTodayUnits, getStatusStats,
│   │                           # getUnitsInRepair, updateEstimatedRepairTime
│   ├── UserRepository.ts       # findByEmail, findById, findByRoleIds, create, update
│   ├── ProviderRepository.ts   # CRUD de proveedores
│   ├── NotificationRepository.ts # createMany, findByUserId, markRead, markAllRead
│   ├── RefreshTokenRepository.ts # (reservado para refresh tokens)
│   └── StatusHistoryRepository.ts # Consulta UnitEvent por unitId
│
├── realtime/
│   ├── unitEventStream.ts      # SSE: broadcastUnitEvent() envía eventos a todos los
│   │                           # clientes conectados en /events filtrando por planta
│   └── notificationHub.ts      # WebSocket: broadcastNotifications() envía notificaciones
│                               # push a usuarios conectados por userId
│
└── utils/
    ├── asyncHandler.ts         # Wrapper para controllers async (evita try/catch repetido)
    └── helpers.ts              # getCarrierProviderId, getUserPlantFilter — extraen
                                # filtros del usuario autenticado para queries multi-planta
```

---

## API Endpoints principales

### Autenticación — `/auth`
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Retorna JWT con datos del usuario |
| POST | `/auth/register` | Crea un usuario nuevo |

### Unidades — `/units`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/units` | Lista unidades (filtros: `?status=`, `?limit=`) |
| POST | `/units` | Crea una unidad nueva (estado inicial: `REPORTED` o `SENT` según rol) |
| GET | `/units/:id` | Detalle de una unidad con sus defectos |
| PUT | `/units/:id/status` | Cambia el estado de una unidad |
| PUT | `/units/:id/priority` | Asigna prioridad individual a una unidad |
| PUT | `/units/priority/order` | Reordena toda la cola de prioridad (drag & drop) |
| PUT | `/units/:id/estimated-time` | Actualiza horas estimadas de reparación |
| PUT | `/units/:id/scm-decision` | SCM registra decisión para unidad no disponible |
| PUT | `/units/:id/archive` | Archiva una unidad UNAVAILABLE con decisión SCM |
| GET | `/units/archivable` | Lista UNAVAILABLE con decisión SCM pendientes de archivar |
| POST | `/units/:id/defects` | Agrega un defecto a una unidad |
| PUT | `/units/:id/defects/:defectId` | Actualiza el grado de un defecto |
| GET | `/units/today` | Unidades del día con datos de SCM (para DailyTrackingWidget) |
| GET | `/units/in-repair` | Unidades actuales en reparación con tiempos estimados |
| GET | `/units/stats/defects` | Conteo de defectos V1/V2/V3 |
| GET | `/units/stats/by-status` | Conteo de unidades por estado |

### Logs — `/logs`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/logs` | Historial paginado con timestamps por estado y filtros de fecha |
| GET | `/logs/export` | Exporta el historial a Excel (.xlsx) |

### Notificaciones — `/notifications`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/notifications` | Notificaciones del usuario autenticado |
| PUT | `/notifications/:id/read` | Marca una notificación como leída |
| PUT | `/notifications/read-all` | Marca todas como leídas |

### Tiempo real
| Protocolo | Endpoint | Descripción |
|-----------|----------|-------------|
| SSE | `GET /events` | Stream de eventos de unidades (STATUS_CHANGED, DEFECT_UPDATED, etc.) |
| WebSocket | `ws://host/` | Notificaciones push por userId |

---

## Side effects al cambiar estado de unidad

La lógica de `UnitRepository.updateStatus()` aplica efectos secundarios automáticos según el estado destino:

| Estado destino | Efecto |
|---------------|--------|
| `IN_REPAIR` | Calcula `estimatedCompletionDate` considerando la cola; limpia `priorityRank` |
| `RELEASED` | Marca todos los defectos activos como `isResolved = true`; limpia `priorityRank` |
| `WWS_RELEASED` | Marca defectos activos como `isResolved = true` (VQA aprobó, se salta Body); limpia `priorityRank` |
| `REJECTED` | Reabre todos los defectos (`isResolved = false`); guarda `rejectionNote`; limpia `priorityRank` |
| `ACCEPTED` | Limpia `priorityRank` |
| `ARCHIVED` | Guarda `archivedAt` + `archivedById`; limpia `priorityRank` |

---

## Notificaciones por evento

| Evento | Método | Destinatarios |
|--------|--------|--------------|
| Unidad reportada | `notifyUnitReported` | WWS, SCM, BODY |
| Entregada a Body | `notifyUnitDelivered` | BODY, SCM |
| Liberada por Body | `notifyUnitReleased` | WWS, SCM, CARRIER (mismo proveedor) |
| Liberada por WWS | `notifyUnitWwsReleased` | CARRIER (mismo proveedor), SCM |
| Aceptada | `notifyUnitAccepted` | WWS, SCM, BODY |
| Rechazada por Carrier | `notifyUnitRejected` | WWS, SCM, BODY |
| Enviada a VQA | `notifyVqaPending` | VQA, SCM |
| Archivada | `notifyUnitArchived` | SCM, WWS |

Las notificaciones están filtradas por **planta** (A1/A2) y, para CARRIER, solo se envían a usuarios del **mismo proveedor** de la unidad.

---

## Base de datos

El schema completo está en `docs/database-schema-postgresql.sql`.  
Las migraciones incrementales están en `docs/migration-*.sql`.

Tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `User` | Usuarios con rol, planta y proveedor |
| `Role` | WWS(1), SCM(2), BODY(3), CARRIER(4), ADMIN(5), VQA(6) |
| `Provider` | Empresas carrier |
| `UnitStatus` | Catálogo de estados posibles |
| `Unit` | Unidades vehiculares con todos sus campos de estado y prioridad |
| `UnitDefect` | Defectos por unidad con grado V1/V2/V3 y flag `isResolved` |
| `UnitEvent` | Auditoría de todos los cambios (status, defectos, notas, SCM) en JSONB |
| `UnitStatusHistory` | Vista de compatibilidad sobre `UnitEvent` |
| `Notification` | Notificaciones por usuario con tipo y estado de lectura |
| `RepairCatalog` | Catálogo de tipos de reparación con horas estimadas por grado |
