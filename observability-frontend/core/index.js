/**
 * Core Module Index
 * Exports all core services and utilities for the observability frontend
 * 
 * @module core
 * 
 * Usage:
 * All core modules are loaded as global singletons via script tags.
 * This file serves as documentation for the available modules.
 * 
 * Available Modules:
 * 
 * 1. StateManager (stateManager)
 *    - Centralized state management with observer pattern
 *    - Methods: get, set, subscribe, getState
 * 
 * 2. EventBus (eventBus)
 *    - Pub/sub event system for decoupled communication
 *    - Methods: on, off, emit, once
 * 
 * 3. HttpClient (httpClient)
 *    - Enterprise HTTP client with interceptors, retry, caching
 *    - Methods: get, post, put, delete, addInterceptor
 * 
 * 4. Repository (repositoryFactory)
 *    - Data access layer with repository pattern
 *    - Repositories: metrics, logs, traces, services
 * 
 * 5. ErrorBoundary (errorBoundary)
 *    - Centralized error handling and recovery
 *    - Methods: handleError, wrapAsync, renderFallback
 * 
 * 6. ComponentFactory (componentFactory)
 *    - Factory for creating and managing UI components
 *    - Methods: register, create, get, destroy
 * 
 * 7. ValidationService (validationService)
 *    - Input validation with built-in and custom validators
 *    - Methods: validate, validateObject, register
 * 
 * 8. Logger (logger)
 *    - Structured logging with levels and remote reporting
 *    - Methods: debug, info, warn, error, child
 * 
 * 9. ConfigService (configService)
 *    - Centralized configuration management
 *    - Methods: get, set, load, defineSchema, freeze
 * 
 * Architecture:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                        UI Components                        │
 * │  (BaseComponent, ChartWidget, FacetFilter, etc.)           │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     ComponentFactory                        │
 * │  (Component lifecycle, dependency injection)                │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *          ┌───────────────────┼───────────────────┐
 *          ▼                   ▼                   ▼
 * ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
 * │   StateManager  │ │    EventBus     │ │  ErrorBoundary  │
 * │  (State store)  │ │  (Pub/sub)      │ │  (Error handling)│
 * └─────────────────┘ └─────────────────┘ └─────────────────┘
 *          │
 *          ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      DataService                            │
 * │  (High-level data access, caching, state sync)              │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    RepositoryFactory                        │
 * │  (MetricsRepo, LogsRepo, TracesRepo, ServicesRepo)          │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                       HttpClient                            │
 * │  (HTTP requests, interceptors, retry, caching)              │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      Backend API                            │
 * │  (/api/mock/* or /api/dashboard/*)                          │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Design Patterns Used:
 * - Singleton: All core services
 * - Observer: StateManager subscriptions
 * - Pub/Sub: EventBus
 * - Repository: Data access abstraction
 * - Factory: ComponentFactory
 * - Strategy: Validation rules
 * - Facade: DataService
 */

// This file is for documentation purposes
// All modules are loaded via script tags in HTML files
console.log('Core modules loaded');

