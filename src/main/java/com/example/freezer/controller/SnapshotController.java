package com.example.freezer.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.freezer.service.SnapshotService;

@RestController
@RequestMapping("/api/snapshot")
public class SnapshotController {
    private final SnapshotService snapshotService;

    public SnapshotController(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @GetMapping
    public ResponseEntity<String> getSnapshot() {
        var snapshotOpt = snapshotService.loadSnapshotJson();
        if (snapshotOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(snapshotOpt.get());
    }

    @PutMapping(consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> putSnapshot(@RequestBody String payloadJson) {
        snapshotService.saveSnapshotJson(payloadJson);
        return ResponseEntity.noContent().build();
    }
}
