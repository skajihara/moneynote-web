package com.example.moneynote.config;

import com.example.moneynote.common.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.ForwardedHeaderFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // セキュリティ: CORS の許可オリジンを環境変数から読み込む（本番 URL の設定忘れを防ぐ）
    @Value("${app.frontend.url}")
    private String frontendUrl;

    // セキュリティ: HSTS は HTTPS 環境（本番）でのみ有効化する。HTTP の開発環境で有効化すると
    // ブラウザが強制 HTTPS リダイレクトを記憶して開発に支障が出るため profile で制御する
    @Value("${app.security.hsts.enabled:false}")
    private boolean hstsEnabled;

    // Swagger UI が有効なプロファイル（dev）でのみ permitAll に追加する
    @Value("${springdoc.swagger-ui.enabled:false}")
    private boolean swaggerEnabled;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // セキュリティ: レスポンスヘッダーで各種攻撃を緩和する
            .headers(headers -> {
                headers.contentTypeOptions(contentTypeOptions -> {});    // X-Content-Type-Options: nosniff
                headers.frameOptions(frame -> frame.deny());             // X-Frame-Options: DENY（クリックジャッキング対策）
                if (hstsEnabled) {
                    // セキュリティ: HSTS は HTTPS 本番環境でのみ有効化する（app.security.hsts.enabled=true）
                    headers.httpStrictTransportSecurity(hsts -> hsts
                        .maxAgeInSeconds(31536000)
                        .includeSubDomains(true));
                } else {
                    headers.httpStrictTransportSecurity(hsts -> hsts.disable());
                }
                headers.contentSecurityPolicy(csp -> csp                // CSP（XSS 緩和）
                    .policyDirectives("default-src 'self'"));
            })
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers("/api/v1/auth/**").permitAll();
                if (swaggerEnabled) {
                    // セキュリティ: Swagger UI は dev profile でのみ permitAll に追加する
                    auth.requestMatchers(
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/v3/api-docs/**"
                    ).permitAll();
                }
                auth.anyRequest().authenticated();
            })
            // セキュリティ: 未認証リクエストは 403 ではなく 401 を返す
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, e) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * セキュリティ: 信頼済みプロキシからの X-Forwarded-For を処理する。
     * HIGHEST_PRECEDENCE で登録することで、Security フィルターより先に実行され
     * request.getRemoteAddr() がクライアントの実 IP を返すようになる。
     */
    @Bean
    public FilterRegistrationBean<ForwardedHeaderFilter> forwardedHeaderFilter() {
        FilterRegistrationBean<ForwardedHeaderFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new ForwardedHeaderFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }
}
