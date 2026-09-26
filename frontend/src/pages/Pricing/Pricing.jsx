import { useCallback, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../context/SubscriptionContext";
import { subscriptionApi } from "../../api/client";
import { AnimatedEnter } from "../../components/AnimatedEnter/AnimatedEnter";
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
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  const fetchClientSecret = useCallback(() => {
    return subscriptionApi
      .createCheckoutSession()
      .then((data) => data.clientSecret);
  }, []);

  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { url } = await subscriptionApi.createPortalSession();
      window.location.href = url;
    } catch (err) {
      setPortalError(err.message || "Could not open the billing portal.");
      setPortalLoading(false);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-shell">
        <AnimatedEnter as="header" className="pricing-header" y={16} duration={0.45}>
          <span className="pricing-eyebrow">Pianly Pro</span>
          <h1>Unlock every song</h1>
          <p>
            The free plan lets you try <strong>Mary Had A Little Lamb</strong>.
            Go Pro to play the full Medium and Hard catalog.
          </p>
        </AnimatedEnter>

        <div className="pricing-grid">
          <AnimatedEnter
            as="section"
            className="pricing-card"
            y={16}
            delay={0.08}
            duration={0.5}
          >
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
                <button
                  type="button"
                  className="pricing-manage"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? "Opening…" : "Manage or cancel subscription"}
                </button>
                {portalError && (
                  <p className="pricing-error">{portalError}</p>
                )}
              </div>
            ) : !showCheckout ? (
              stripePromise ? (
                <button
                  type="button"
                  className="pricing-cta"
                  onClick={() => setShowCheckout(true)}
                >
                  Upgrade for $8/month
                </button>
              ) : (
                <p className="pricing-note">
                  Checkout is unavailable — set{" "}
                  <code>VITE_STRIPE_PUBLISHABLE_KEY</code> for this build.
                </p>
              )
            ) : null}
          </AnimatedEnter>

          {!loading && !pro && showCheckout && (
            <AnimatedEnter
              as="section"
              className="pricing-checkout"
              y={16}
              delay={0.16}
              duration={0.5}
            >
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </AnimatedEnter>
          )}
        </div>
      </div>
    </div>
  );
}
