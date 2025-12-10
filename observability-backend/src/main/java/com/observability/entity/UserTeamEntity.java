package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * User-Team membership entity.
 * Defines which teams a user has access to and their role within each team.
 */
@Entity
@Table(name = "user_teams", indexes = {
    @Index(name = "idx_user_team_user", columnList = "user_id"),
    @Index(name = "idx_user_team_team", columnList = "team_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_team", columnNames = {"user_id", "team_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserTeamEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String role = "member"; // owner, admin, member, viewer

    @Column(name = "joined_at")
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();
}

