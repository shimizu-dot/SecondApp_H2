package com.example.freezer.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class SnapshotServiceTests {

    @Autowired
    private SnapshotService snapshotService;

    @Test
    void saveAndLoadSnapshotJsonRoundTrips() {
        var payloadJson = "{\"lists\":{\"shopping\":[]}}";

        snapshotService.saveSnapshotJson(payloadJson);

        var loaded = snapshotService.loadSnapshotJson();
        assertTrue(loaded.isPresent());
        assertEquals(payloadJson, loaded.orElseThrow());
    }
}
