package com.observability.mapper;

import java.util.List;

/**
 * Generic mapper interface for entity-DTO conversions.
 * Follows the Interface Segregation Principle.
 *
 * @param <E> Entity type
 * @param <D> DTO type
 * @param <R> Request type
 */
public interface EntityMapper<E, D, R> {

    /**
     * Convert entity to DTO
     */
    D toDto(E entity);

    /**
     * Convert request to entity
     */
    E toEntity(R request);

    /**
     * Convert list of entities to list of DTOs
     */
    default List<D> toDtoList(List<E> entities) {
        return entities.stream().map(this::toDto).toList();
    }

    /**
     * Convert list of requests to list of entities
     */
    default List<E> toEntityList(List<R> requests) {
        return requests.stream().map(this::toEntity).toList();
    }
}

