import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import { subscriptionApi } from "../../api/client";
import "./Pricing.css";

export default function PricingReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refresh } = useSubscription();
  const [state, setState] = useState("loading"); // loading | success | error

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      return;
    }

    let active = true;
    subscriptionApi
      .getSessionStatus(sessionId)
      .then(async (data) => {
        if (!active) return;
        if (data.pro) {
          await refresh();
          setState("success");
        } else {
          setState("error");
        }
      })
      .catch(() => active && setState("error"));

    return () => {
      active = false;
    };
  }, [sessionId, refresh]);

  if (!sessionId) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <div className="pricing-page">
      <div className="pricing-shell pricing-return">
        {state === "loading" && (
          <>
            <h1>Confirming your payment…</h1>
            <p>Hang tight while we activate Pianly Pro.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="pricing-return-badge" aria-hidden="true">
              ✓
            </div>
            <h1>Welcome to Pro!</h1>
            <p>Every Medium and Hard song is now unlocked.</p>
            <Link to="/songs" className="pricing-cta">
              Browse all songs
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1>We couldn't confirm your payment</h1>
            <p>If you were charged, your plan will update shortly.</p>
            <Link to="/pricing" className="pricing-cta">
              Back to pricing
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
