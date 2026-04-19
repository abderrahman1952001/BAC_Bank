"use client";

import { useState, useTransition } from "react";
import {
  type AdminBillingSettingsResponse,
  updateAdminBillingSettings,
} from "@/lib/admin";
import type { BillingPlan } from "@/lib/billing-api";

type BillingSettingsFormState = {
  premium30DaysAmountDzd: string;
  premium30DaysDurationDays: string;
  premium90DaysAmountDzd: string;
  premium90DaysDurationDays: string;
  premiumBacSeasonAmountDzd: string;
  configuredBacSeasonEndsAt: string;
};

function formatAmountDzd(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DZD`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Automatic";
  }

  return new Date(value).toLocaleString("en-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPlanAccess(plan: BillingPlan) {
  if (plan.accessType === "FIXED_DAYS" && plan.durationDays) {
    return `${plan.durationDays} days of Premium access`;
  }

  if (plan.accessType === "SEASON_END" && plan.seasonEndsAt) {
    return `Access until ${formatDateTime(plan.seasonEndsAt)}`;
  }

  return "Premium access";
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function toSettingsFormState(
  payload: AdminBillingSettingsResponse | undefined,
): BillingSettingsFormState {
  return {
    premium30DaysAmountDzd: payload
      ? String(payload.settings.premium30DaysAmountDzd)
      : "2500",
    premium30DaysDurationDays: payload
      ? String(payload.settings.premium30DaysDurationDays)
      : "30",
    premium90DaysAmountDzd: payload
      ? String(payload.settings.premium90DaysAmountDzd)
      : "6500",
    premium90DaysDurationDays: payload
      ? String(payload.settings.premium90DaysDurationDays)
      : "90",
    premiumBacSeasonAmountDzd: payload
      ? String(payload.settings.premiumBacSeasonAmountDzd)
      : "9000",
    configuredBacSeasonEndsAt: payload
      ? toDateTimeLocalValue(payload.settings.configuredBacSeasonEndsAt)
      : "",
  };
}

function readPositiveInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function toIsoDateTimeOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("BAC season end must be a valid date and time.");
  }

  return parsed.toISOString();
}

export function AdminBillingPage({
  initialSettings,
}: {
  initialSettings?: AdminBillingSettingsResponse;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState(() => toSettingsFormState(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function updateField<Key extends keyof BillingSettingsFormState>(
    key: Key,
    value: BillingSettingsFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaveNotice(null);

    let payload: {
      premium30DaysAmountDzd: number;
      premium30DaysDurationDays: number;
      premium90DaysAmountDzd: number;
      premium90DaysDurationDays: number;
      premiumBacSeasonAmountDzd: number;
      configuredBacSeasonEndsAt: string | null;
    } | null = null;

    try {
      payload = {
        premium30DaysAmountDzd: readPositiveInteger(
          form.premium30DaysAmountDzd,
          "30-day price",
        ),
        premium30DaysDurationDays: readPositiveInteger(
          form.premium30DaysDurationDays,
          "30-day duration",
        ),
        premium90DaysAmountDzd: readPositiveInteger(
          form.premium90DaysAmountDzd,
          "90-day price",
        ),
        premium90DaysDurationDays: readPositiveInteger(
          form.premium90DaysDurationDays,
          "90-day duration",
        ),
        premiumBacSeasonAmountDzd: readPositiveInteger(
          form.premiumBacSeasonAmountDzd,
          "BAC season price",
        ),
        configuredBacSeasonEndsAt: toIsoDateTimeOrNull(
          form.configuredBacSeasonEndsAt,
        ),
      };
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "The billing settings are invalid.",
      );
      return;
    }

    startSaving(() => {
      void updateAdminBillingSettings(payload)
        .then((response) => {
          setSettings(response);
          setForm(toSettingsFormState(response));
          setSaveNotice("Billing settings saved.");
        })
        .catch((saveError) => {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "Billing settings could not be saved.",
          );
        });
    });
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>Billing</h1>
          <p className="admin-billing-note">
            Manage local premium pricing, semester access, and the BAC season
            end date from one place.
          </p>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              Fees: <strong>Merchant absorbs Chargily fees</strong>
            </span>
            <span className="admin-page-meta-pill">
              Configured plans: <strong>{settings?.plans.length ?? 0}</strong>
            </span>
            <span className="admin-page-meta-pill">
              Effective BAC season end:{" "}
              <strong>
                {formatDateTime(
                  settings?.settings.effectiveBacSeasonEndsAt ?? null,
                )}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="admin-billing-layout">
        <form className="admin-form admin-billing-form" onSubmit={handleSubmit}>
          <div className="admin-page-head">
            <div className="admin-page-intro">
              <h2>Editable billing settings</h2>
              <p className="admin-billing-note">
                Changes apply to newly created checkouts. Existing pending and
                paid checkouts keep their original plan snapshot.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label className="field">
              <span>30-day plan price (DZD)</span>
              <input
                type="number"
                min="100"
                step="1"
                value={form.premium30DaysAmountDzd}
                onChange={(event) => {
                  updateField("premium30DaysAmountDzd", event.target.value);
                }}
              />
            </label>

            <label className="field">
              <span>30-day duration (days)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.premium30DaysDurationDays}
                onChange={(event) => {
                  updateField("premium30DaysDurationDays", event.target.value);
                }}
              />
            </label>

            <label className="field">
              <span>90-day semester price (DZD)</span>
              <input
                type="number"
                min="100"
                step="1"
                value={form.premium90DaysAmountDzd}
                onChange={(event) => {
                  updateField("premium90DaysAmountDzd", event.target.value);
                }}
              />
            </label>

            <label className="field">
              <span>90-day duration (days)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.premium90DaysDurationDays}
                onChange={(event) => {
                  updateField("premium90DaysDurationDays", event.target.value);
                }}
              />
            </label>

            <label className="field">
              <span>BAC season plan price (DZD)</span>
              <input
                type="number"
                min="100"
                step="1"
                value={form.premiumBacSeasonAmountDzd}
                onChange={(event) => {
                  updateField("premiumBacSeasonAmountDzd", event.target.value);
                }}
              />
            </label>

            <label className="field">
              <span>BAC season end (optional)</span>
              <input
                type="datetime-local"
                value={form.configuredBacSeasonEndsAt}
                onChange={(event) => {
                  updateField("configuredBacSeasonEndsAt", event.target.value);
                }}
              />
            </label>
          </div>

          <article className="admin-context-card admin-billing-inline-card">
            <span className="admin-stat-label">Season fallback</span>
            <p className="admin-billing-note">
              Leave the BAC season end blank to use the automatic fallback date.
              The current effective season end is{" "}
              <strong>
                {formatDateTime(
                  settings?.settings.effectiveBacSeasonEndsAt ?? null,
                )}
              </strong>
              .
            </p>
          </article>

          <article className="admin-context-card admin-billing-inline-card">
            <span className="admin-stat-label">Last saved</span>
            <p className="admin-billing-note">
              {settings?.settings.updatedAt
                ? `${formatDateTime(settings.settings.updatedAt)}${
                    settings.settings.updatedByEmail
                      ? ` by ${settings.settings.updatedByEmail}`
                      : ""
                  }`
                : "No database override saved yet. The page is currently using environment-backed defaults."}
            </p>
          </article>

          {error ? <p className="error-text">{error}</p> : null}
          {saveNotice ? <p className="success-text">{saveNotice}</p> : null}

          <div className="admin-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save billing settings"}
            </button>
          </div>
        </form>

        <div className="admin-billing-sidebar">
          <article className="admin-context-card">
            <span className="admin-stat-label">Checkout fees</span>
            <strong>BAC Bank absorbs Chargily fees</strong>
            <p className="admin-billing-note">
              Students see the final price only. The payment gateway fee is
              always allocated to the merchant in checkout creation.
            </p>
          </article>

          <section className="admin-billing-preview-grid">
            {(settings?.plans ?? []).map((plan) => (
              <article
                key={plan.code}
                className={`admin-context-card billing-plan-card${
                  plan.recommended ? " is-recommended" : ""
                }`}
              >
                <div className="billing-plan-head">
                  <div>
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                  </div>
                </div>
                <div className="billing-plan-price">
                  <strong>{formatAmountDzd(plan.amount)}</strong>
                  <span>{formatPlanAccess(plan)}</span>
                </div>
                <p className="billing-plan-price-note">
                  Student-facing checkout shows this as the final price.
                </p>
                <ul className="billing-feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
