# Graph Report - backend  (2026-11-07)

## Corpus Check
- Corpus is ~28,255 words - fits in a single context window. You may not need a graph.

## Summary
- 618 nodes · 870 edges · 46 communities (33 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.81)
- Token cost: 75,000 input · 18,167 output

## Community Hubs (Navigation)
- Actor Authentication & Roles
- Batch Claim & Handover Services
- Backend Build Dependencies
- App & Database Modules
- Core Platform Architecture & AI
- ESG Carbon & Impact Metrics
- Batches REST Controller
- Config & Exception Filtering
- PostgreSQL Database Dependencies
- Base TypeScript Configuration
- Monorepo Build Tooling
- External Services Dependencies
- DTO Validation Schemas
- Auth & Actors Controller
- Shared Types Dependencies
- Weather Telemetry API
- ESG Analytics Controller
- Validation Library Dependencies
- Database Migrations & Seeders
- Claims REST Controller
- Claim Lifecycle Enums
- Turborepo Task Pipeline
- Decorator & Build Settings
- Food Batch State Machine
- Shared Package TSConfig
- Bio-Thermal SDK TSConfig
- Ecosystem Actor Roles
- Food Microbiology Risk Categories
- Database Package TSConfig
- State Transition Trigger Sources
- Backend Build Exclusions
- HMAC Cryptographic Handshake
- HIMTEC Competition & Problem Statement
- Docker Container Entrypoint
- Mobile Field Application
- Web Command Center
- Design System & UI Components
- Multi-Role Navigation & Permissions
- Telemetry Dashboard & Carbon Formulas
- Prototype Deliverables & E2E Testing
- TypeScript Coding Conventions
- Turborepo & pnpm Engine
- Color Palette Design Tokens
- Typography Scale Hierarchy
- HIMTEC Evaluation Criteria
- HIMTEC Hackathon Guide

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 32 edges
2. `compilerOptions` - 22 edges
3. `SirkulaWebsocketGateway` - 19 edges
4. `TriageWorkerService` - 18 edges
5. `getEnv()` - 14 edges
6. `BatchState` - 13 edges
7. `ActorRole` - 10 edges
8. `@nestjs/swagger` - 9 edges
9. `BatchesController` - 9 edges
10. `BatchesService` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Standalone WebSocket Test Client` --semantically_similar_to--> `God-Mode Time-Warp & Thermal Simulator`  [INFERRED] [semantically similar]
  tests/websocket-tester.html → context/PRD.md
- `Standalone WebSocket Test Client` --shares_data_with--> `NestJS Unified Backend Server`  [EXTRACTED]
  tests/websocket-tester.html → context/ARCHITECTURE.md
- `Phase 1: Workspace & Shared Packages Foundation` --references--> `Docker Compose PostGIS 16 Service`  [EXTRACTED]
  context/PLAN.md → docker-compose.yml
- `Phase 1: Workspace & Shared Packages Foundation` --references--> `Docker Compose Redis 7 Service`  [EXTRACTED]
  context/PLAN.md → docker-compose.yml
- `Phase 1: Workspace & Shared Packages Foundation` --references--> `pnpm Monorepo Workspace Configuration`  [EXTRACTED]
  context/PLAN.md → pnpm-workspace.yaml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Automated Bio-Thermal Triage Pipeline** — context_architecture_bio_thermal_q10_engine, context_architecture_triage_worker, context_prd_automated_3tier_triage, context_prd_safety_invariant [EXTRACTED 1.00]
- **Zero-Click Multimodal Food Ingestion Flow** — context_design_donor_camera_view, context_architecture_gemini_vision_integration, context_architecture_weather_api_integration, context_architecture_bio_thermal_q10_engine [EXTRACTED 1.00]
- **Dignity Blind Handshake & Offline Verification Flow** — context_architecture_crypto_qr_service, context_architecture_offline_handshake_state, context_prd_dignity_blind_handshake, context_design_tier1_hub_radar [INFERRED 0.95]

## Communities (46 total, 13 thin omitted)

### Community 0 - "Actor Authentication & Roles"
Cohesion: 0.06
Nodes (50): ApiExcludeController, ActorRoleGuard, AuthenticatedActor, Express, Request, Injectable, PG_POOL, createObfuscatedLocation() (+42 more)

### Community 1 - "Batch Claim & Handover Services"
Cohesion: 0.07
Nodes (17): Inject, ClaimsService, Inject, Injectable, ApiOperation, Body, Post, Inject (+9 more)

### Community 2 - "Backend Build Dependencies"
Cohesion: 0.06
Nodes (34): devDependencies, tsx, @types/express, @types/multer, @types/node, @types/pg, @types/swagger-ui-express, typescript (+26 more)

### Community 3 - "App & Database Modules"
Cohesion: 0.07
Nodes (26): AppModule, Module, DatabaseModule, Global, Inject, Module, BatchesModule, Module (+18 more)

### Community 4 - "Core Platform Architecture & AI"
Cohesion: 0.09
Nodes (27): Single Source of Truth & Layer Separation, Deterministic Fallback & Security Invariants, SIRKULA-AI Platform, Redis SETNX Distributed Atomic Lock, Bio-Thermal Q10 Calculator Service, Google Gemini 2.5 Flash Multimodal Ingestion, PostgreSQL 16 & PostGIS Spatial Storage, Redis 7 & BullMQ Distributed State Queue (+19 more)

### Community 5 - "ESG Carbon & Impact Metrics"
Cohesion: 0.11
Nodes (21): calculateCo2eAvoided(), calculateEsgMetrics(), calculateFeedSavingsIdr(), calculateMethaneAvoided(), CO2E_FACTOR_PER_KG, EsgMetrics, FEED_SAVINGS_IDR_PER_KG, METHANE_CH4_FACTOR_PER_KG (+13 more)

### Community 6 - "Batches REST Controller"
Cohesion: 0.11
Nodes (18): ApiConsumes, BatchesController, ApiHeader, ApiOperation, ApiTags, Body, Controller, Get (+10 more)

### Community 7 - "Config & Exception Filtering"
Cohesion: 0.12
Nodes (15): AllExceptionsFilter, EnvConfig, EnvSchema, getEnv(), bootstrap(), DETERMINISTIC_FALLBACK_VISION, Injectable, VisionAiService (+7 more)

### Community 8 - "PostgreSQL Database Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, pg, devDependencies, @types/node, @types/pg, typescript, pg, @types/node (+14 more)

### Community 9 - "Base TypeScript Configuration"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution (+14 more)

### Community 10 - "Monorepo Build Tooling"
Cohesion: 0.10
Nodes (20): devDependencies, turbo, typescript, typescript, name, packageManager, pnpm, onlyBuiltDependencies (+12 more)

### Community 11 - "External Services Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, bullmq, @google/genai, ioredis, multer, @nestjs/common, @nestjs/core, @nestjs/platform-express (+12 more)

### Community 12 - "DTO Validation Schemas"
Cohesion: 0.10
Nodes (19): ActorRoleSchema, BatchStateSchema, ClaimBatchDto, ClaimBatchDtoSchema, ClaimStatusSchema, CreateBatchDto, CreateBatchDtoSchema, DetectedItem (+11 more)

### Community 13 - "Auth & Actors Controller"
Cohesion: 0.15
Nodes (11): AuthController, ApiOperation, ApiTags, Controller, Get, Param, AuthModule, Module (+3 more)

### Community 14 - "Shared Types Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @sirkula/shared-types, devDependencies, @types/node, typescript, @sirkula/shared-types, @types/node, typescript (+10 more)

### Community 15 - "Weather Telemetry API"
Cohesion: 0.17
Nodes (10): ApiQuery, ApiOperation, ApiTags, Controller, Get, Query, WeatherController, Injectable (+2 more)

### Community 16 - "ESG Analytics Controller"
Cohesion: 0.16
Nodes (10): EsgAnalyticsController, ApiOperation, ApiTags, Controller, Get, EsgAnalyticsModule, Module, EsgAnalyticsService (+2 more)

### Community 17 - "Validation Library Dependencies"
Cohesion: 0.12
Nodes (15): dependencies, zod, devDependencies, typescript, typescript, zod, main, name (+7 more)

### Community 18 - "Database Migrations & Seeders"
Cohesion: 0.21
Nodes (10): __dirname, __filename, runMigration(), resetDatabase(), runSeeder(), SeedActor, SEEDED_ACTORS, ref_node_fs (+2 more)

### Community 19 - "Claims REST Controller"
Cohesion: 0.23
Nodes (11): ClaimsController, ApiHeader, ApiOperation, ApiTags, Body, Controller, Headers, Param (+3 more)

### Community 20 - "Claim Lifecycle Enums"
Cohesion: 0.19
Nodes (10): ClaimStatus, ACTIVE_EN_ROUTE, CANCELLED_BY_RECEIVER, EXPIRED_AUTO_REVOKED, HANDOVER_COMPLETED, ClaimTierType, BatchClaimedEventPayload, BatchHandoverCompletedEventPayload (+2 more)

### Community 21 - "Turborepo Task Pipeline"
Cohesion: 0.15
Nodes (12): dependsOn, outputs, cache, persistent, $schema, tasks, build, dev (+4 more)

### Community 22 - "Decorator & Build Settings"
Cohesion: 0.17
Nodes (11): compilerOptions, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, rootDir, target (+3 more)

### Community 23 - "Food Batch State Machine"
Cohesion: 0.25
Nodes (8): BatchState, CANCELLED_BY_DONOR, COMPLETED, TIER_1_CLAIMED, TIER_1_HUMAN_ACTIVE, TIER_2_ANIMAL_ACTIVE, TIER_2_CLAIMED, TIER_3_COMPOST_ACTIVE

### Community 24 - "Shared Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 25 - "Bio-Thermal SDK TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 26 - "Ecosystem Actor Roles"
Cohesion: 0.29
Nodes (7): ActorRole, DONOR, ESG_AUDITOR, SIMULATOR_ADMIN, TIER_1_HUB, TIER_2_FARMER, TIER_3_COMPOST

### Community 27 - "Food Microbiology Risk Categories"
Cohesion: 0.29
Nodes (7): FoodRiskCategory, BAKERY_PASTRY, DRY_FRIED, MOIST_PROTEIN_CARB, WET_COCONUT_MILK, WET_NON_COCONUT, BatchCreatedEventPayload

### Community 28 - "Database Package TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 29 - "State Transition Trigger Sources"
Cohesion: 0.33
Nodes (6): StateTriggerSource, BULLMQ_BIO_TIMER, GOD_MODE_SIMULATOR, INITIAL_INGESTION, QR_HANDSHAKE_SCAN, USER_CLAIM_ACTION

### Community 30 - "Backend Build Exclusions"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 31 - "HMAC Cryptographic Handshake"
Cohesion: 0.67
Nodes (3): HMAC-SHA256 QR & Digital Waiver Service, Offline-First HMAC Handshake Validation, Dignity-First Blind Handshake Protocol

### Community 32 - "HIMTEC Competition & Problem Statement"
Cohesion: 0.67
Nodes (3): Competition Theme: Build App With AI, SIRKULA-AI Implementation Roadmap, Urban Food Waste & Decay Crisis

## Knowledge Gaps
- **270 isolated node(s):** `docker-entrypoint.sh script`, `name`, `version`, `private`, `type` (+265 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 382 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `Actor Authentication & Roles` to `Backend Build Dependencies`, `App & Database Modules`, `Config & Exception Filtering`, `Auth & Actors Controller`, `Weather Telemetry API`, `ESG Analytics Controller`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `dependencies` connect `External Services Dependencies` to `Backend Build Dependencies`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `SirkulaWebsocketGateway` connect `Batch Claim & Handover Services` to `Actor Authentication & Roles`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `docker-entrypoint.sh script`, `name`, `version` to the rest of the system?**
  _270 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Actor Authentication & Roles` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Batch Claim & Handover Services` be split into smaller, more focused modules?**
  _Cohesion score 0.06852497096399536 - nodes in this community are weakly interconnected._
- **Should `Backend Build Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._