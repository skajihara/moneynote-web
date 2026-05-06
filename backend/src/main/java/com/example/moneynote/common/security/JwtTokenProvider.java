package com.example.moneynote.common.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiration}") long accessTokenExpiration,
            @Value("${app.jwt.refresh-token-expiration}") long refreshTokenExpiration) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    public String generateAccessToken(String userId, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId)
                .claim("type", "ACCESS")
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(String userId) {
        return generate(userId, "REFRESH", refreshTokenExpiration);
    }

    private String generate(String userId, String type, long expiration) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId)
                .claim("type", type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiration))
                .signWith(secretKey)
                .compact();
    }

    public String getUserId(String token) {
        return getClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** トークンの type クレームを返す。解析失敗時は空文字を返す */
    public String getTokenType(String token) {
        try {
            Object type = getClaims(token).get("type");
            return type != null ? type.toString() : "";
        } catch (JwtException | IllegalArgumentException e) {
            return "";
        }
    }

    /** トークンの role クレームを返す。存在しない場合は "USER" を返す */
    public String getRole(String token) {
        try {
            Object role = getClaims(token).get("role");
            return role != null ? role.toString() : "USER";
        } catch (JwtException | IllegalArgumentException e) {
            return "USER";
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
