package com.yas.product.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Standalone profile: disable OAuth2/JWT so the service runs without Keycloak.
 * Used by the TCC Continuous Testing platform to deploy third-party services
 * with mocked dependencies.
 */
@Configuration
@Profile("standalone")
public class StandaloneSecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(csrf -> csrf.disable())
                .build();
    }
}
