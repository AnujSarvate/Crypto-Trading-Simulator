package com.crypto.simulator.backend.controller;

import com.crypto.simulator.backend.dto.UserDto;
import com.crypto.simulator.backend.dto.LoginRequest;
import com.crypto.simulator.backend.model.User;
import com.crypto.simulator.backend.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.security.Key;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class CryptoController {

    private final RestTemplate restTemplate = new RestTemplate();
    private Object cachedResponse = null;
    private Instant lastFetchedTime = Instant.EPOCH;

    private Object[] cachedCoinList = null;
    private Instant lastCoinFetchTime = Instant.EPOCH;

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Key SECRET_KEY = Keys.hmacShaKeyFor("secret_key_12345678901234567890123456789012".getBytes());
    private final long EXPIRATION_TIME = 1000 * 60 * 60 * 24; // 24 hours

    private boolean isValidCoin(String coinId) {
        Instant now = Instant.now();
        long secondsSinceLastFetch = java.time.Duration.between(lastCoinFetchTime, now).getSeconds();

        if (cachedCoinList == null || secondsSinceLastFetch > 300) {
            try {
                String url = "https://api.coingecko.com/api/v3/coins/markets" +
                        "?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false";

                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0");
                HttpEntity<String> entity = new HttpEntity<>(headers);

                ResponseEntity<Object[]> response = restTemplate.exchange(
                        url, HttpMethod.GET, entity, Object[].class);

                cachedCoinList = response.getBody();
                lastCoinFetchTime = now;
            } catch (Exception e) {
                return false;
            }
        }

        for (Object obj : cachedCoinList) {
            Map<?, ?> coinMap = (Map<?, ?>) obj;
            if (coinMap.get("id").toString().equalsIgnoreCase(coinId)) {
                return true;
            }
        }
        return false;
    }

    @GetMapping("/crypto/list")
    public ResponseEntity<?> getCryptoList() {
        Instant now = Instant.now();
        long secondsSinceLastFetch = java.time.Duration.between(lastFetchedTime, now).getSeconds();

        if (cachedResponse != null && secondsSinceLastFetch < 300) {
            return ResponseEntity.ok(cachedResponse);
        }

        try {
            String url = "https://api.coingecko.com/api/v3/coins/markets" +
                    "?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; CryptoSimBot/1.0)");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Object> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Object.class);

            cachedResponse = response.getBody();
            lastFetchedTime = now;

            return ResponseEntity.ok(cachedResponse);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to fetch crypto data: " + e.getMessage());
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody UserDto userDto) {
        if (userRepository.findByUsername(userDto.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists.");
        }

        User newUser = new User();
        newUser.setUsername(userDto.getUsername());
        newUser.setPassword(passwordEncoder.encode(userDto.getPassword()));
        newUser.setWalletBalance(0.0);
        newUser.setPortfolio(new HashMap<>());

        userRepository.save(newUser);
        return ResponseEntity.ok("User registered successfully.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .map(user -> {
                    if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                        String token = Jwts.builder()
                                .setSubject(user.getUsername())
                                .setIssuedAt(new Date())
                                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                                .signWith(SECRET_KEY)
                                .compact();
                        return ResponseEntity.ok(token);
                    } else {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
                    }
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUserData(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String username = Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();

        return userRepository.findByUsername(username)
                .<ResponseEntity<?>>map(user -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("walletBalance", user.getWalletBalance());
                    data.put("portfolio", user.getPortfolio());
                    return ResponseEntity.ok(data);
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found"));
    }

    @PutMapping("/update-portfolio")
    public ResponseEntity<?> updatePortfolio(@RequestBody Map<String, Object> payload,
                                             @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String username = Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();

        return userRepository.findByUsername(username)
                .map(user -> {
                    user.setWalletBalance(Double.parseDouble(payload.get("walletBalance").toString()));

                    Object portfolioObj = payload.get("portfolio");
                    if (portfolioObj instanceof Map<?, ?> map) {
                        Map<String, Double> portfolio = new HashMap<>();
                        for (Map.Entry<?, ?> entry : map.entrySet()) {
                            if (entry.getKey() instanceof String key && entry.getValue() instanceof Number value) {
                                portfolio.put(key, value.doubleValue());
                            }
                        }
                        user.setPortfolio(portfolio);
                    }

                    userRepository.save(user);
                    return ResponseEntity.ok("Updated");
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found"));
    }

    @PutMapping("/trade")
    public ResponseEntity<?> trade(@RequestBody Map<String, Object> payload,
                                   @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            String username = Jwts.parserBuilder()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();

            return userRepository.findByUsername(username)
                    .map(user -> {
                        String action = payload.get("action").toString().toLowerCase();
                        String coin = payload.get("coin").toString();
                        double quantity, price;

                        try {
                            quantity = Double.parseDouble(payload.get("amount").toString());
                            price = Double.parseDouble(payload.get("price").toString());
                            if (quantity <= 0 || price <= 0) {
                                return ResponseEntity.badRequest().body("Quantity and price must be positive.");
                            }
                        } catch (NumberFormatException e) {
                            return ResponseEntity.badRequest().body("Invalid quantity or price.");
                        }

                        if (!isValidCoin(coin)) {
                            return ResponseEntity.badRequest().body("Invalid coin: " + coin);
                        }

                        double tradeValue = price * quantity;
                        Map<String, Double> portfolio = user.getPortfolio();

                        if (action.equals("buy")) {
                            if (user.getWalletBalance() < tradeValue) {
                                return ResponseEntity.badRequest().body("Insufficient wallet balance.");
                            }
                            user.setWalletBalance(user.getWalletBalance() - tradeValue);
                            portfolio.put(coin, portfolio.getOrDefault(coin, 0.0) + quantity);

                        } else if (action.equals("sell")) {
                            if (!portfolio.containsKey(coin) || portfolio.get(coin) < quantity) {
                                return ResponseEntity.badRequest().body("Insufficient coin holdings.");
                            }
                            user.setWalletBalance(user.getWalletBalance() + tradeValue);
                            double remaining = portfolio.get(coin) - quantity;
                            if (remaining <= 0) {
                                portfolio.remove(coin);
                            } else {
                                portfolio.put(coin, remaining);
                            }

                        } else {
                            return ResponseEntity.badRequest().body("Invalid action. Use 'buy' or 'sell'.");
                        }

                        userRepository.save(user);
                        return ResponseEntity.ok("Trade successful.");
                    })
                    .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Malformed trade request.");
        }
    }

    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(@RequestHeader("Authorization") String authHeader,
                                     @RequestBody Map<String, Object> payload) {
        String token = authHeader.replace("Bearer ", "");
        String username = Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();

        return userRepository.findByUsername(username)
                .map(user -> {
                    try {
                        double amount = Double.parseDouble(payload.get("amount").toString());
                        if (amount <= 0) {
                            return ResponseEntity.badRequest().body("Deposit amount must be positive.");
                        }
                        user.setWalletBalance(user.getWalletBalance() + amount);
                        userRepository.save(user);
                        return ResponseEntity.ok("Deposit successful.");
                    } catch (Exception e) {
                        return ResponseEntity.badRequest().body("Invalid deposit request.");
                    }
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found"));
    }
}
