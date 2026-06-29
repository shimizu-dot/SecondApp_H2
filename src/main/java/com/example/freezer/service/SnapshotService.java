package com.example.freezer.service;

import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SnapshotService {
    private static final String SNAPSHOT_ID = "main";

    private final JdbcTemplate jdbcTemplate;

    public SnapshotService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> loadSnapshotJson() {
        return jdbcTemplate.query(
            "SELECT payload_json FROM app_snapshots WHERE id = ?",
            rs -> rs.next() ? Optional.ofNullable(rs.getString(1)) : Optional.empty(),
            SNAPSHOT_ID
        );
    }

    public void saveSnapshotJson(String payloadJson) {
        jdbcTemplate.update(
            """
            MERGE INTO app_snapshots (id, payload_json, saved_at)
            KEY (id)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            """,
            SNAPSHOT_ID,
            payloadJson
        );
    }
}
