import { loadStripe } from "@stripe/stripe-js";

// Publishable keys are safe to expose in the client. Override with
// VITE_STRIPE_PUBLISHABLE_KEY in a .env file for your own account.
const PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ??
  "REDACTED";

// Call loadStripe outside of a component's render to avoid recreating the
// Stripe object on every render.
export const stripePromise = loadStripe(PUBLISHABLE_KEY);

export const PRO_PRICE_LABEL = "$8/month";
