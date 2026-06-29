package com.example.freezer.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/send")
    public String send() {
        return "send";
    }

    @GetMapping("/manual")
    public String manual() {
        return "manual";
    }
}
