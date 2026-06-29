package com.pianly.backend.payment;

import com.pianly.backend.user.User;
import com.pianly.backend.user.UserRepository;
import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession(@AuthenticationPrincipal User principal) {
        User user = userRepository.findByEmail(principal.getEmail()).orElseThrow();
        try {
            String clientSecret = paymentService.createCheckoutSession(user);
            return ResponseEntity.ok(Map.of("clientSecret", clientSecret));
        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status(@AuthenticationPrincipal User principal) {
        User user = userRepository.findByEmail(principal.getEmail()).orElseThrow();
        return ResponseEntity.ok(Map.of("pro", user.isPro()));
    }

    @GetMapping("/session-status")
    public ResponseEntity<?> sessionStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("session_id") String sessionId
    ) {
        User user = userRepository.findByEmail(principal.getEmail()).orElseThrow();
        try {
            boolean pro = paymentService.syncSessionStatus(user, sessionId);
            return ResponseEntity.ok(Map.of("pro", pro));
        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature
    ) {
        try {
            paymentService.handleWebhook(payload, signature);
            return ResponseEntity.ok("");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
