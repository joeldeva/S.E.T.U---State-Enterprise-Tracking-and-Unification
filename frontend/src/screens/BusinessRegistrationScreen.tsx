import { AlertTriangle, CheckCircle2, FileUp, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useMemo, useState } from "react";
import {
  BusinessSubmission,
  BusinessSubmissionPayload,
  submitBusinessInformation,
} from "../lib/api";

type BusinessType = BusinessSubmissionPayload["business_type"];

const businessTypes: BusinessType[] = ["Proprietorship", "Partnership", "LLP", "Pvt Ltd", "Public Ltd", "Other"];

const initialForm: BusinessSubmissionPayload = {
  business_name: "",
  business_type: "Proprietorship",
  pan: "",
  gstin: "",
  owner_name: "",
  email: "",
  phone: "",
  address_line: "",
  city: "",
  district: "",
  state: "Karnataka",
  pin_code: "",
  business_sector: "",
  factory_licence_number: "",
  shop_licence_number: "",
  kspcb_consent_number: "",
  bescom_consumer_number: "",
  supporting_document_name: "",
};

const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$/;
const pinPattern = /^[0-9]{6}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const phonePattern = /^\+?[0-9][0-9\s-]{7,14}[0-9]$/;

function cleanIdentifier(value?: string) {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function clientValidate(form: BusinessSubmissionPayload) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pan = cleanIdentifier(form.pan);
  const gstin = cleanIdentifier(form.gstin);

  if (!form.business_name.trim()) errors.push("Business name is required.");
  if (!pan && !gstin) errors.push("PAN or GSTIN is required.");
  if (pan && !panPattern.test(pan)) errors.push("PAN format is invalid.");
  if (gstin && !gstinPattern.test(gstin)) errors.push("GSTIN format must include state code and PAN section.");
  if (!form.address_line.trim()) errors.push("Address line is required.");
  if (!pinPattern.test(form.pin_code.trim())) errors.push("PIN code must be 6 digits.");
  if (form.email?.trim() && !emailPattern.test(form.email.trim())) errors.push("Email format is invalid.");
  if (form.phone?.trim() && !phonePattern.test(form.phone.trim())) errors.push("Phone format is invalid.");
  if (pan && gstin && panPattern.test(pan) && gstinPattern.test(gstin) && gstin.slice(2, 12) !== pan) {
    warnings.push("GSTIN PAN section does not match the submitted PAN.");
  }

  return { errors, warnings };
}

function BusinessRegistrationScreen() {
  const [form, setForm] = useState<BusinessSubmissionPayload>(initialForm);
  const [submission, setSubmission] = useState<BusinessSubmission | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("Ready to validate business information.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationPreview = useMemo(() => clientValidate(form), [form]);

  function updateField<K extends keyof BusinessSubmissionPayload>(field: K, value: BusinessSubmissionPayload[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = clientValidate(form);
    setErrors(validation.errors);
    setWarnings(validation.warnings);
    setSubmission(null);

    if (validation.errors.length) {
      setStatusText("Validation failed. Fix the highlighted fields before generating a UBID.");
      return;
    }

    setIsSubmitting(true);
    setStatusText("Submitting business information for format validation.");
    try {
      const result = await submitBusinessInformation({
        ...form,
        pan: cleanIdentifier(form.pan),
        gstin: cleanIdentifier(form.gstin),
      });
      setSubmission(result);
      setWarnings(result.validation_warnings);
      setStatusText(
        result.validation_warnings.length
          ? "Provisional UBID generated with officer review required."
          : "Provisional UBID generated successfully.",
      );
      setForm({ ...initialForm, state: form.state });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed.";
      setErrors([message]);
      setStatusText("Backend validation rejected this submission.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="registration-screen">
      <div className="registration-header">
        <div>
          <p className="eyebrow">Data Ingestion / Business Registration</p>
          <h1>Submit Business Information</h1>
          <p>
            Generate a provisional UBID using identifier format checks and simulated verification for prototype.
          </p>
        </div>
        <div className="registration-note">
          <ShieldCheck size={17} aria-hidden="true" />
          Official registry verification can be integrated in production.
        </div>
      </div>

      <div className="resolution-status">
        <span>{statusText}</span>
      </div>

      <div className="registration-layout">
        <form className="registration-form" onSubmit={handleSubmit}>
          <section className="form-panel">
            <div className="panel-header compact">
              <span className="panel-title">Business Profile</span>
            </div>
            <div className="form-grid">
              <Field label="Business name" required>
                <input value={form.business_name} onChange={(event) => updateField("business_name", event.target.value)} />
              </Field>
              <Field label="Business type">
                <select
                  value={form.business_type}
                  onChange={(event) => updateField("business_type", event.target.value as BusinessType)}
                >
                  {businessTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="Owner / authorized person">
                <input value={form.owner_name} onChange={(event) => updateField("owner_name", event.target.value)} />
              </Field>
              <Field label="Business sector">
                <input value={form.business_sector} onChange={(event) => updateField("business_sector", event.target.value)} />
              </Field>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header compact">
              <span className="panel-title">Identifiers</span>
            </div>
            <div className="form-grid">
              <Field label="PAN" required={!form.gstin}>
                <input
                  value={form.pan}
                  onChange={(event) => updateField("pan", cleanIdentifier(event.target.value))}
                  maxLength={10}
                  autoComplete="off"
                />
              </Field>
              <Field label="GSTIN" required={!form.pan}>
                <input
                  value={form.gstin}
                  onChange={(event) => updateField("gstin", cleanIdentifier(event.target.value))}
                  maxLength={15}
                  autoComplete="off"
                />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={(event) => updateField("email", event.target.value)} type="email" />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
              </Field>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header compact">
              <span className="panel-title">Address</span>
            </div>
            <div className="form-grid">
              <Field label="Address line" required wide>
                <input value={form.address_line} onChange={(event) => updateField("address_line", event.target.value)} />
              </Field>
              <Field label="City">
                <input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
              </Field>
              <Field label="District">
                <input value={form.district} onChange={(event) => updateField("district", event.target.value)} />
              </Field>
              <Field label="State">
                <input value={form.state} onChange={(event) => updateField("state", event.target.value)} />
              </Field>
              <Field label="PIN code" required>
                <input value={form.pin_code} onChange={(event) => updateField("pin_code", event.target.value.replace(/\D/g, ""))} maxLength={6} />
              </Field>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header compact">
              <span className="panel-title">Department References</span>
            </div>
            <div className="form-grid">
              <Field label="Factory licence number">
                <input value={form.factory_licence_number} onChange={(event) => updateField("factory_licence_number", event.target.value)} />
              </Field>
              <Field label="Shop licence number">
                <input value={form.shop_licence_number} onChange={(event) => updateField("shop_licence_number", event.target.value)} />
              </Field>
              <Field label="KSPCB consent number">
                <input value={form.kspcb_consent_number} onChange={(event) => updateField("kspcb_consent_number", event.target.value)} />
              </Field>
              <Field label="BESCOM consumer number">
                <input value={form.bescom_consumer_number} onChange={(event) => updateField("bescom_consumer_number", event.target.value)} />
              </Field>
              <Field label="Supporting document" wide>
                <label className="upload-placeholder">
                  <FileUp size={16} aria-hidden="true" />
                  <span>{form.supporting_document_name || "PDF, image, or CSV placeholder"}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*,.csv"
                    onChange={(event) => updateField("supporting_document_name", event.target.files?.[0]?.name ?? "")}
                  />
                </label>
              </Field>
            </div>
          </section>

          <div className="form-actions">
            <button className="btn-ghost" type="button" onClick={() => setForm(initialForm)}>
              Clear
            </button>
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Generating..." : "Generate Provisional UBID"}
            </button>
          </div>
        </form>

        <aside className="registration-side">
          <section className="form-panel">
            <div className="panel-header compact">
              <span className="panel-title">Validation Preview</span>
            </div>
            <ValidationRows form={form} warnings={validationPreview.warnings} />
            {validationPreview.errors.length ? <MessageList tone="error" items={validationPreview.errors} /> : null}
            {validationPreview.warnings.length ? <MessageList tone="warning" items={validationPreview.warnings} /> : null}
          </section>

          {submission ? (
            <section className="form-panel success-panel">
              <div className="panel-header compact">
                <span className="panel-title">Provisional UBID</span>
                <span className={`status-pill ${submission.ubid_status === "needs_review" ? "sp-review" : "sp-active"}`}>
                  {submission.ubid_status === "needs_review" ? "Requires Officer Review" : "Provisional"}
                </span>
              </div>
              <div className="generated-ubid">{submission.ubid}</div>
              <div className="submission-summary">
                <span>{submission.business_name}</span>
                <span>PAN: {submission.identifiers.pan_masked ?? "Not provided"}</span>
                <span>GSTIN: {submission.identifiers.gstin_masked ?? "Not provided"}</span>
                <span>{submission.next_step}</span>
              </div>
              <ValidationResult validation={submission.validation} warnings={submission.validation_warnings} />
            </section>
          ) : null}

          {errors.length ? <MessageList tone="error" items={errors} /> : null}
          {warnings.length ? <MessageList tone="warning" items={warnings} /> : null}
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`form-field ${wide ? "wide" : ""}`}>
      <span>
        {label}
        {required ? <em>*</em> : null}
      </span>
      {children}
    </label>
  );
}

function ValidationRows({ form, warnings }: { form: BusinessSubmissionPayload; warnings: string[] }) {
  const pan = cleanIdentifier(form.pan);
  const gstin = cleanIdentifier(form.gstin);
  const rows = [
    { label: "PAN format valid", ok: pan ? panPattern.test(pan) : false, optional: !pan },
    { label: "GSTIN format valid", ok: gstin ? gstinPattern.test(gstin) : false, optional: !gstin },
    { label: "PIN valid", ok: pinPattern.test(form.pin_code.trim()) },
    { label: "Official verification simulated", ok: true },
    { label: "Identifier Format Valid", ok: warnings.length === 0, warning: warnings.length > 0 },
  ];

  return (
    <div className="validation-list">
      {rows.map((row) => (
        <div className={`validation-row ${row.warning ? "warn" : row.ok ? "ok" : row.optional ? "muted" : "bad"}`} key={row.label}>
          {row.warning ? <AlertTriangle size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
          <span>{row.optional ? `${row.label} - optional if alternate identifier is supplied` : row.label}</span>
        </div>
      ))}
    </div>
  );
}

function ValidationResult({ validation, warnings }: { validation: Record<string, boolean>; warnings: string[] }) {
  const labels: Array<[string, string]> = [
    ["pan_format_valid", "PAN format valid"],
    ["gstin_format_valid", "GSTIN format valid"],
    ["pin_valid", "PIN valid"],
    ["official_verification_simulated", "Official verification simulated"],
  ];

  return (
    <div className="validation-list">
      {labels.map(([key, label]) => (
        <div className={`validation-row ${validation[key] ? "ok" : "muted"}`} key={key}>
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>{label}</span>
        </div>
      ))}
      {warnings.length ? (
        <div className="validation-row warn">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>Requires Officer Review</span>
        </div>
      ) : null}
    </div>
  );
}

function MessageList({ tone, items }: { tone: "error" | "warning"; items: string[] }) {
  return (
    <div className={`message-list ${tone}`}>
      {items.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}

export default BusinessRegistrationScreen;
