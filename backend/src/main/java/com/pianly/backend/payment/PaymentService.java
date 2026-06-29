package com.pianly.backend.payment;

import com.pianly.backend.user.User;
import com.pianly.backend.user.UserRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final StripeConfig stripeConfig;
    private final UserRepository userRepository;

    /**
     * Creates an embedded Checkout Session for the Pianly Pro monthly subscription
     * and returns the client secret used by the frontend Embedded Checkout.
     */
    public String createCheckoutSession(User user) throws StripeException {
        SessionCreateParams.LineItem.PriceData.Recurring recurring =
                SessionCreateParams.LineItem.PriceData.Recurring.builder()
                        .setInterval(SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH)
                        .build();

        SessionCreateParams.LineItem.PriceData priceData =
                SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(stripeConfig.getCurrency())
                        .setUnitAmount(stripeConfig.getPriceAmount())
                        .setRecurring(recurring)
                        .setProductData(
                                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(stripeConfig.getProductName())
                                        .build())
                        .build();

        SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setUiMode(SessionCreateParams.UiMode.EMBEDDED)
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setReturnUrl(stripeConfig.getFrontendUrl()
                        + "/pricing/return?session_id={CHECKOUT_SESSION_ID}")
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(priceData)
                                .build())
                .putMetadata("user_email", user.getEmail())
                .setSubscriptionData(
                        SessionCreateParams.SubscriptionData.builder()
                                .putMetadata("user_email", user.getEmail())
                                .build());

        if (user.getStripeCustomerId() != null) {
            builder.setCustomer(user.getStripeCustomerId());
        } else {
            builder.setCustomerEmail(user.getEmail());
        }

        Session session = Session.create(builder.build());
        return session.getClientSecret();
    }

    /**
     * Retrieves a Checkout Session after the customer returns from Embedded Checkout.
     * If the session has completed, the user is upgraded to Pro. Returns the latest
     * pro status for the user.
     */
    public boolean syncSessionStatus(User user, String sessionId) throws StripeException {
        Session session = Session.retrieve(sessionId);

        boolean completed = "complete".equals(session.getStatus());
        if (completed) {
            user.setPro(true);
            if (session.getCustomer() != null) {
                user.setStripeCustomerId(session.getCustomer());
            }
            if (session.getSubscription() != null) {
                user.setStripeSubscriptionId(session.getSubscription());
            }
            userRepository.save(user);
        }
        return user.isPro();
    }

    /**
     * Verifies and processes Stripe webhook events to keep subscription state in sync.
     */
    public void handleWebhook(String payload, String signatureHeader) throws SignatureVerificationException {
        String webhookSecret = stripeConfig.getWebhookSecret();
        if (webhookSecret == null || webhookSecret.isBlank()) {
            // No webhook secret configured (e.g. local dev). Skip verification/processing.
            return;
        }

        Event event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutCompleted(event);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
            default -> {
                // Unhandled event types are ignored.
            }
        }
    }

    private void handleCheckoutCompleted(Event event) {
        event.getDataObjectDeserializer().getObject().ifPresent(obj -> {
            if (obj instanceof Session session) {
                String email = session.getMetadata() != null
                        ? session.getMetadata().get("user_email")
                        : null;
                if (email == null && session.getCustomerEmail() != null) {
                    email = session.getCustomerEmail();
                }
                if (email == null) return;

                final String customerId = session.getCustomer();
                final String subscriptionId = session.getSubscription();
                userRepository.findByEmail(email).ifPresent(user -> {
                    user.setPro(true);
                    if (customerId != null) user.setStripeCustomerId(customerId);
                    if (subscriptionId != null) user.setStripeSubscriptionId(subscriptionId);
                    userRepository.save(user);
                });
            }
        });
    }

    private void handleSubscriptionDeleted(Event event) {
        event.getDataObjectDeserializer().getObject().ifPresent(obj -> {
            if (obj instanceof Subscription subscription) {
                userRepository.findAll().stream()
                        .filter(u -> subscription.getId().equals(u.getStripeSubscriptionId()))
                        .findFirst()
                        .ifPresent(user -> {
                            user.setPro(false);
                            user.setStripeSubscriptionId(null);
                            userRepository.save(user);
                        });
            }
        });
    }
}
