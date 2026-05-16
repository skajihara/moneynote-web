package com.example.moneynote;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MoneynoteApplication {

    public static void main(String[] args) {
        SpringApplication.run(MoneynoteApplication.class, args);
    }
}
