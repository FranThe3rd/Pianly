import { loadStripe } from "@stripe/stripe-js";

// Publishable keys are safe in the client but must come from your env — never commit them.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();

// Call loadStripe outside of a component's render to avoid recreating the
// Stripe object on every render.
export const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : null;

export const PRO_PRICE_LABEL = "$8/month";
