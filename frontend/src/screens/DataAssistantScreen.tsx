import {
  Bot,
  Database,
  Download,
  Loader2,
  MessageSquareText,
  SearchCheck,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { askDataAssistant, type AssistantColumn, type AssistantContext, type AssistantResponse } from "../lib/api";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const examplePrompts = [
  "Show all company data in PIN code 560058",
  "List BESCOM records in PIN 560058",
  "Show active factories",
  "Show closed businesses",
  "Show activity events for PIN 560058",
  "Which columns are available?",
];

const introMessage =
  "Ask me naturally. I retrieve relevant masked rows from the SETU backend, ground the answer in source records, and remember context for follow-ups like 'now only BESCOM'.";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadAssistantRows(response: AssistantResponse) {
  const header = response.columns.map((column) => csvEscape(column.label)).join(",");
  const rows = response.rows.map((row) => response.columns.map((column) => csvEscape(row[column.key])).join(","));
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `setu-assistant-${response.dataset}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function valueToText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Missing";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function maskSensitiveText(value: string) {
  return value
    .replace(/\b([A-Z]{5})([0-9]{4})([A-Z])\b/gi, (_match, prefix: string, _digits: string, suffix: string) => {
      return `${prefix.toUpperCase()}****${suffix.toUpperCase()}`;
    })
    .replace(
      /\b([0-9]{2}[A-Z]{5})([0-9]{4})([A-Z][1-9A-Z]Z[0-9A-Z])\b/gi,
      (_match, prefix: string, _digits: string, suffix: string) => `${prefix.toUpperCase()}****${suffix.toUpperCase()}`,
    );
}

function countEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, count]) => typeof count === "number")
    .sort((a, b) => Number(b[1]) - Number(a[1]));
}

function firstVisibleColumns(columns: AssistantColumn[]) {
  const preferred = [
    "record_id",
    "department",
    "business_name",
    "pin_code",
    "status_in_department",
    "event_id",
    "event_type",
    "event_date",
  ];
  return columns.filter((column) => preferred.includes(column.key)).slice(0, 5);
}

function DataAssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: introMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState<AssistantResponse | null>(null);
  const [assistantContext, setAssistantContext] = useState<AssistantContext | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleSummary = useMemo(() => {
    if (!latestResponse) return [];
    return [
      { label: "Departments", value: latestResponse.summary.by_department },
      { label: "Status", value: latestResponse.summary.by_status ?? latestResponse.summary.by_event_status },
      { label: "PIN Codes", value: latestResponse.summary.by_pin_code },
      { label: "Event Types", value: latestResponse.summary.by_event_type },
    ].filter((item) => countEntries(item.value).length);
  }, [latestResponse]);

  async function runPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: maskSensitiveText(trimmed) },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askDataAssistant(trimmed, 500, assistantContext);
      setLatestResponse(response);
      setAssistantContext(response.context);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: "assistant", text: response.answer },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assistant query failed";
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: `I could not query the backend assistant endpoint: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runPrompt(input);
  }

  function clearAssistantContext() {
    setAssistantContext(null);
    setLatestResponse(null);
    setMessages([
      {
        id: "intro-reset",
        role: "assistant",
        text: "Context cleared. Ask a fresh question over department records or activity events.",
      },
    ]);
    inputRef.current?.focus();
  }

  const compactColumns = latestResponse ? firstVisibleColumns(latestResponse.columns) : [];

  return (
    <section className="assistant-screen">
      <div className="assistant-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <Bot size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Backend-powered data chatbot</p>
            <h1>SETU Data Assistant</h1>
            <p>
              RAG-style retrieval over masked department records and activity events without sending raw identifiers to any hosted LLM.
            </p>
          </div>
        </div>
        <div className="assistant-trust-strip">
          <span>
            <Database size={14} aria-hidden="true" />
            Backend CSV query
          </span>
          <span>
            <ShieldCheck size={14} aria-hidden="true" />
            Masked PAN/GSTIN only
          </span>
          <span>
            <Sparkles size={14} aria-hidden="true" />
            Local RAG retrieval
          </span>
        </div>
      </div>

      <div className="assistant-layout">
        <div className="assistant-chat-panel">
          <div className="panel-header">
            <span className="panel-title">Interactive retrieval chat</span>
            <span className="panel-count">Context-aware</span>
          </div>

          {assistantContext ? (
            <div className="assistant-context-bar">
              <div>
                <SearchCheck size={13} aria-hidden="true" />
                <span>
                  Context: {assistantContext.pin_codes[0] ?? assistantContext.departments[0] ?? assistantContext.terms[0] ?? assistantContext.dataset}
                </span>
              </div>
              <button type="button" onClick={clearAssistantContext} aria-label="Clear assistant context">
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div className="assistant-messages">
            {messages.map((message) => (
              <div className={`assistant-message ${message.role}`} key={message.id}>
                <div className="assistant-avatar">
                  {message.role === "assistant" ? <Bot size={15} aria-hidden="true" /> : <MessageSquareText size={15} aria-hidden="true" />}
                </div>
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading ? (
              <div className="assistant-message assistant">
                <div className="assistant-avatar">
                  <Loader2 className="spin" size={15} aria-hidden="true" />
                </div>
                <p>Querying backend records...</p>
              </div>
            ) : null}
          </div>

          <div className="assistant-examples">
            {(latestResponse?.suggestions.length ? latestResponse.suggestions : examplePrompts).map((prompt) => (
              <button type="button" key={prompt} onClick={() => void runPrompt(prompt)} disabled={isLoading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="assistant-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask: give all company data in pincode 560058"
              type="text"
            />
            <button className="btn-primary" type="submit" disabled={isLoading || !input.trim()}>
              <SendHorizontal size={14} aria-hidden="true" />
              Ask
            </button>
          </form>
        </div>

        <div className="assistant-results-panel">
          <div className="panel-header">
            <span className="panel-title">Backend result workspace</span>
            <span className="panel-count">
              {latestResponse ? `${latestResponse.returned_count}/${latestResponse.total_matches} grounded rows` : "Waiting for query"}
            </span>
          </div>

          {latestResponse ? (
            <>
              <div className="assistant-result-summary">
                <div className="assistant-metric primary">
                  <span>Total matches</span>
                  <strong>{latestResponse.total_matches}</strong>
                  <small>{latestResponse.dataset.replace("_", " ")}</small>
                </div>
                <div className="assistant-metric">
                  <span>Returned rows</span>
                  <strong>{latestResponse.returned_count}</strong>
                  <small>Backend response</small>
                </div>
                <div className="assistant-metric">
                  <span>Sources</span>
                  <strong>{latestResponse.sources.length}</strong>
                  <small>Grounded citations</small>
                </div>
              </div>

              <div className="assistant-mode-line">
                <span>{latestResponse.retrieval_mode.replace(/_/g, " ")}</span>
                <strong>No hosted LLM used</strong>
              </div>

              {latestResponse.filters.length ? (
                <div className="assistant-filter-strip">
                  {latestResponse.filters.map((filter) => (
                    <span key={filter}>{filter}</span>
                  ))}
                </div>
              ) : null}

              {visibleSummary.length ? (
                <div className="assistant-summary-grid">
                  {visibleSummary.map((item) => (
                    <div className="assistant-summary-card" key={item.label}>
                      <span>{item.label}</span>
                      {countEntries(item.value).slice(0, 5).map(([label, count]) => (
                        <div key={`${item.label}-${label}`}>
                          <strong>{label}</strong>
                          <em>{String(count)}</em>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}

              {latestResponse.sources.length ? (
                <div className="assistant-source-list">
                  <span className="section-title">Grounded sources</span>
                  <div>
                    {latestResponse.sources.map((source) => (
                      <article key={`${source.source_type}-${source.id}`}>
                        <strong>{source.id}</strong>
                        <span>{source.title}</span>
                        <em>{source.department} · {source.why} · {source.score}%</em>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="assistant-table-actions">
                <div>
                  <Table2 size={15} aria-hidden="true" />
                  <span>
                    {latestResponse.rows.length
                      ? "Scroll sideways to inspect every returned column."
                      : "No table rows returned for this response."}
                  </span>
                </div>
                <button
                  className="btn-ghost compact-action"
                  type="button"
                  onClick={() => downloadAssistantRows(latestResponse)}
                  disabled={!latestResponse.rows.length}
                >
                  <Download size={13} aria-hidden="true" />
                  Export result
                </button>
              </div>

              {latestResponse.rows.length ? (
                <div className="assistant-table-wrap">
                  <table className="assistant-table">
                    <thead>
                      <tr>
                        {latestResponse.columns.map((column) => (
                          <th key={column.key}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {latestResponse.rows.map((row, rowIndex) => (
                        <tr key={`${latestResponse.dataset}-${rowIndex}`}>
                          {latestResponse.columns.map((column) => (
                            <td key={`${rowIndex}-${column.key}`} title={valueToText(row[column.key])}>
                              {valueToText(row[column.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : latestResponse.intent === "schema_lookup" ? (
                <div className="assistant-column-list">
                  {latestResponse.columns.map((column) => (
                    <span key={column.key}>{column.label}</span>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No rows matched this question.</div>
              )}

              {compactColumns.length ? (
                <div className="assistant-preview-note">
                  Main visible fields: {compactColumns.map((column) => column.label).join(", ")}
                </div>
              ) : null}

              <div className="assistant-privacy-note">{latestResponse.privacy_note}</div>
            </>
          ) : (
            <div className="assistant-empty">
              <Bot size={30} aria-hidden="true" />
              <strong>Ask a backend data question</strong>
              <p>
                Example: <button type="button" onClick={() => void runPrompt("Show all company data in PIN code 560058")}>Show all company data in PIN code 560058</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default DataAssistantScreen;
