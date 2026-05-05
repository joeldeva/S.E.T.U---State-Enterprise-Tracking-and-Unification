import { AlertTriangle, CheckCircle2, FileUp, SearchCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BusinessSubmission,
  BusinessSubmissionPayload,
  IdentifierVerificationResponse,
  MockDatabaseSummary,
  fetchMockDatabaseSummary,
  submitBusinessInformation,
  verifyBusinessIdentifiers,
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
  bwssb_consumer_number: "",
  labour_registration_number: "",
  trade_license_number: "",
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
  const hasReference = Boolean(
    form.factory_licence_number?.trim() ||
      form.shop_licence_number?.trim() ||
      form.kspcb_consent_number?.trim() ||
      form.bescom_consumer_number?.trim() ||
      form.bwssb_consumer_number?.trim() ||
      form.labour_registration_number?.trim() ||
      form.trade_license_number?.trim(),
  );

  if (!form.business_name.trim()) errors.push("Business name is required.");
  if (!pan && !gstin && !hasReference) errors.push("PAN, GSTIN, or department reference number is required.");
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
  const [isVerifyingIdentifiers, setIsVerifyingIdentifiers] = useState(false);
  const [identifierVerification, setIdentifierVerification] = useState<IdentifierVerificationResponse | null>(null);
  const [mockSummary, setMockSummary] = useState<MockDatabaseSummary | null>(null);

  const validationPreview = useMemo(() => clientValidate(form), [form]);
  const hasDepartmentReference = Boolean(
    form.factory_licence_number?.trim() ||
      form.shop_licence_number?.trim() ||
      form.kspcb_consent_number?.trim() ||
      form.bescom_consumer_number?.trim() ||
      form.bwssb_consumer_number?.trim() ||
      form.labour_registration_number?.trim() ||
      form.trade_license_number?.trim(),
  );

  useEffect(() => {
    fetchMockDatabaseSummary()
      .then(setMockSummary)
      .catch(() => {
        setMockSummary({
          unique_businesses: 120,
          department_records: 456,
          activity_events: 720,
          departments: ["Shops and Establishments", "Factories", "Labour", "KSPCB", "BESCOM", "BWSSB"],
          ambiguous_or_review_cases: 48,
          last_loaded_status: "fallback_summary",
          note: "Synthetic CSV-based department database for prototype",
          sample_records: [],
        });
      });
  }, []);

  function updateField<K extends keyof BusinessSubmissionPayload>(field: K, value: BusinessSubmissionPayload[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "pan" || field === "gstin") {
      setIdentifierVerification(null);
    }
  }

  async function handleVerifyIdentifiers() {
    const pan = cleanIdentifier(form.pan);
    const gstin = cleanIdentifier(form.gstin);

    setErrors([]);
    setWarnings([]);
    if (!pan && !gstin) {
      setErrors(["Enter PAN or GSTIN before checking identifier existence."]);
      return;
    }

    setIsVerifyingIdentifiers(true);
    setStatusText("Checking PAN/GSTIN against synthetic CSV registry.");
    try {
      const result = await verifyBusinessIdentifiers({ pan, gstin });
      setIdentifierVerification(result);
      setWarnings(result.warnings);
      const foundCount = Number(result.pan.exists_in_mock_database) + Number(result.gstin.exists_in_mock_database);
      setStatusText(
        foundCount
          ? "Identifier exists in the synthetic CSV department database."
          : "Identifier format checked; no synthetic CSV registry match found.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Identifier verification failed.";
      setErrors([message]);
      setStatusText("Identifier verification API failed.");
    } finally {
      setIsVerifyingIdentifiers(false);
    }
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
    setStatusText("Checking synthetic CSV department database and generating UBID.");
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
          ? "UBID generated with officer review required."
          : "UBID generated after mock department lookup.",
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
            Check synthetic department records, licence references, names, and addresses to generate a UBID with evidence.
          </p>
        </div>
        <div className="registration-note">
          <ShieldCheck size={17} aria-hidden="true" />
          Format validation and simulated mock-database verification for prototype.
        </div>
      </div>

      <div className="mock-db-note">
        Prototype uses CSV/Excel-style synthetic department data. Production deployment would use authorized department APIs,
        secure data pipelines, or scheduled exports from e-Karmika, Factories/e-Suraksha, KSPCB, BESCOM/BWSSB,
        and local-body systems.
        Karnataka department forms may omit PAN/GSTIN, so SETU can also use licence numbers, local identifiers, names,
        addresses, PIN code, district, owner details, and contact references for matching.
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
              <span className="panel-title">Optional Tax Identifiers</span>
              <button
                className="btn-ghost compact-action"
                type="button"
                onClick={() => void handleVerifyIdentifiers()}
                disabled={isVerifyingIdentifiers}
              >
                <SearchCheck size={14} aria-hidden="true" />
                {isVerifyingIdentifiers ? "Checking" : "Check Exists"}
              </button>
            </div>
            <div className="form-grid">
              <Field label="PAN" required={!form.gstin && !hasDepartmentReference}>
                <input
                  value={form.pan}
                  onChange={(event) => updateField("pan", cleanIdentifier(event.target.value))}
                  maxLength={10}
                  autoComplete="off"
                />
              </Field>
              <Field label="GSTIN" required={!form.pan && !hasDepartmentReference}>
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
            <IdentifierVerificationPanel result={identifierVerification} />
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
              <span className="panel-title">Department References / Local Identifiers</span>
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
              <Field label="BWSSB consumer number">
                <input value={form.bwssb_consumer_number} onChange={(event) => updateField("bwssb_consumer_number", event.target.value)} />
              </Field>
              <Field label="Labour registration number">
                <input value={form.labour_registration_number} onChange={(event) => updateField("labour_registration_number", event.target.value)} />
              </Field>
              <Field label="Trade licence number">
                <input value={form.trade_license_number} onChange={(event) => updateField("trade_license_number", event.target.value)} />
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
              {isSubmitting ? "Checking..." : "Check Mock Department Database & Generate UBID"}
            </button>
          </div>
        </form>

        <aside className="registration-side">
          <MockDatabasePanel summary={mockSummary} />

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
                <span className="panel-title">UBID Result</span>
                <span className={`status-pill ${statusClass(submission.ubid_status)}`}>
                  {submission.status_label}
                </span>
              </div>
              <div className="generated-ubid">{submission.ubid}</div>
              <div className="submission-summary">
                <span>{submission.business_name}</span>
                <span>PAN: {submission.identifiers.pan_masked ?? "Not provided"}</span>
                <span>GSTIN: {submission.identifiers.gstin_masked ?? "Not provided"}</span>
                <span>Match confidence: {submission.match_confidence}%</span>
                <span>{submission.next_step}</span>
              </div>
              <ValidationResult validation={submission.validation_results} warnings={submission.warnings} />
              {submission.matched_records.length ? <MatchedRecordsTable records={submission.matched_records} /> : null}
              {submission.match_notes?.length ? <MessageList tone="info" items={submission.match_notes} /> : null}
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

function IdentifierVerificationPanel({ result }: { result: IdentifierVerificationResponse | null }) {
  return (
    <div className="identifier-check-panel">
      <div className="identifier-check-title">
        <SearchCheck size={15} aria-hidden="true" />
        Identifier existence check
      </div>
      {result ? (
        <>
          <IdentifierCheckRow item={result.pan} />
          <IdentifierCheckRow item={result.gstin} />
          {result.warnings.length ? <MessageList tone="warning" items={result.warnings} /> : null}
          <p>{result.production_note}</p>
        </>
      ) : (
        <p>
          Use Check Exists to verify whether the submitted PAN/GSTIN exists in the synthetic CSV department database.
          Production can connect the same backend adapter to authorized GSTN/GSP and PAN OPV APIs.
        </p>
      )}
    </div>
  );
}

function IdentifierCheckRow({ item }: { item: IdentifierVerificationResponse["pan"] }) {
  const tone = item.status === "exists_in_mock_database" ? "ok" : item.status === "invalid_format" ? "bad" : "muted";
  const badgeClass = item.status === "exists_in_mock_database" ? "sp-active" : item.status === "invalid_format" ? "sp-closed" : "sp-dormant";

  return (
    <div className={`identifier-check-row ${tone}`}>
      <div>
        <strong>{item.kind.toUpperCase()}</strong>
        <span>{item.masked_value ?? "Not provided"}</span>
      </div>
      <div>
        <span className={`status-pill ${badgeClass}`}>
          {item.exists_in_mock_database ? "Exists" : item.status === "not_found_in_mock_database" ? "Not found" : item.status.split("_").join(" ")}
        </span>
        <small>{item.message}</small>
        {item.match_count ? <small>{item.match_count} masked department record match{item.match_count === 1 ? "" : "es"}</small> : null}
      </div>
    </div>
  );
}

function ValidationResult({ validation, warnings }: { validation: Record<string, boolean | string>; warnings: string[] }) {
  const labels: Array<[string, string]> = [
    ["pan_format_valid", "PAN format valid"],
    ["gstin_format_valid", "GSTIN format valid"],
    ["pin_valid", "PIN valid"],
    ["mock_database_match", "Mock database match"],
    ["official_verification", "Official verification simulated for prototype"],
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

function statusClass(status: BusinessSubmission["ubid_status"]) {
  if (status === "verified_mock_match") return "sp-active";
  if (status === "provisional_needs_review") return "sp-review";
  return "sp-dormant";
}

function MockDatabasePanel({ summary }: { summary: MockDatabaseSummary | null }) {
  return (
    <section className="form-panel mock-db-panel">
      <div className="panel-header compact">
        <span className="panel-title">Mock Database</span>
        <span className="status-pill sp-review">{summary?.last_loaded_status ?? "loading"}</span>
      </div>
      <div className="mock-db-stats">
        <Stat label="Unique businesses" value={summary?.unique_businesses ?? 120} />
        <Stat label="Department records" value={summary?.department_records ?? 456} />
        <Stat label="Activity events" value={summary?.activity_events ?? 720} />
        <Stat label="Review cases" value={summary?.ambiguous_or_review_cases ?? 48} />
      </div>
      <div className="dept-chips">
        {(summary?.departments ?? []).slice(0, 7).map((department) => (
          <span className="dept-chip" key={department}>
            {department}
          </span>
        ))}
      </div>
      {summary?.sample_records?.length ? (
        <div className="sample-records">
          {summary.sample_records.slice(0, 3).map((record) => (
            <div key={record.record_id}>
              <strong>{record.business_name}</strong>
              <span>{record.department} - {record.pan_masked ?? record.gstin_masked ?? "identifier masked"}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p>{summary?.note ?? "Synthetic CSV-based department database for prototype"}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MatchedRecordsTable({ records }: { records: BusinessSubmission["matched_records"] }) {
  return (
    <div className="matched-records">
      <div className="section-title">Matched department records</div>
      <div className="matched-table">
        <span>Department</span>
        <span>Record</span>
        <span>Business</span>
        <span>Status</span>
        {records.slice(0, 6).map((record) => (
          <div className="matched-row" key={record.record_id}>
            <span>{record.department}</span>
            <span>{record.department_record_id}</span>
            <span>{record.business_name}</span>
            <span>{record.status_in_department}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageList({ tone, items }: { tone: "error" | "warning" | "info"; items: string[] }) {
  return (
    <div className={`message-list ${tone}`}>
      {items.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}

export default BusinessRegistrationScreen;
