import { useCallback, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../context/SubscriptionContext";
import { subscriptionApi } from "../../api/client";
import { stripePromise } from "../../lib/stripe";
import "./Pricing.css";

const PRO_PERKS = [
  "Every Medium difficulty song",
  "Every Hard difficulty song",
  "Full Easy catalog, not just the sampler",
  "New songs as we add them",
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { pro, loading } = useSubscription();
  const location = useLocation();
  const [showCheckout, setShowCheckout] = useState(false);

  const fetchClientSecret = useCallback(() => {
    return subscriptionApi
      .createCheckoutSession()
      .then((data) => data.clientSecret);
  }, []);

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-shell">
        <header className="pricing-header">
          <span className="pricing-eyebrow">Pianly Pro</span>
          <h1>Unlock every song</h1>
          <p>
            The free plan lets you try <strong>Mary Had A Little Lamb</strong>.
            Go Pro to play the full Medium and Hard catalog.
          </p>
        </header>

        <div className="pricing-grid">
          <section className="pricing-card">
            <div className="pricing-plan">
              <h2>Pro</h2>
              <div className="pricing-amount">
                <span className="pricing-currency">$</span>
                <span className="pricing-value">8</span>
                <span className="pricing-period">/ month</span>
              </div>
            </div>

            <ul className="pricing-perks">
              {PRO_PERKS.map((perk) => (
                <li key={perk}>
                  <span className="pricing-check" aria-hidden="true">
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            {loading ? (
              <p className="pricing-note">Checking your plan…</p>
            ) : pro ? (
              <div className="pricing-active">
                <p className="pricing-active-title">You're on Pro 🎉</p>
                <Link to="/songs" className="pricing-cta">
                  Browse all songs
                </Link>
              </div>
            ) : !showCheckout ? (
              <button
                type="button"
                className="pricing-cta"
                onClick={() => setShowCheckout(true)}
              >
                Upgrade for $8/month
              </button>
            ) : null}
          </section>

          {!loading && !pro && showCheckout && (
            <section className="pricing-checkout">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
