import {
  Bot,
  ChevronDown,
  Download,
  Loader2,
  MessageSquareText,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { askDataAssistant, type AssistantContext, type AssistantResponse } from "../lib/api";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const starterPrompts = [
  "Show all company data in PIN code 560058",
  "Now only BESCOM",
  "Show activity events for the same PIN",
  "Show active factories",
];

const introMessage =
  "I can query masked backend records, activity events, departments, PIN codes, statuses, licences, and follow-up context.";

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

function contextLabel(context: AssistantContext | null) {
  if (!context) return "Fresh question";
  return context.pin_codes[0] ?? context.departments[0] ?? context.statuses[0] ?? context.terms[0] ?? context.dataset;
}

function FloatingDataAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState<AssistantResponse | null>(null);
  const [assistantContext, setAssistantContext] = useState<AssistantContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "intro", role: "assistant", text: introMessage },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const summaryCards = useMemo(() => {
    if (!latestResponse) return [];
    return [
      { label: "Departments", value: latestResponse.summary.by_department },
      { label: "Status", value: latestResponse.summary.by_status ?? latestResponse.summary.by_event_status },
      { label: "PIN", value: latestResponse.summary.by_pin_code },
      { label: "Events", value: latestResponse.summary.by_event_type },
    ].filter((item) => countEntries(item.value).length);
  }, [latestResponse]);

  async function runPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setIsOpen(true);
    setInput("");
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: maskSensitiveText(trimmed) },
    ]);
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
        { id: `${Date.now()}-assistant-error`, role: "assistant", text: `Backend assistant failed: ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runPrompt(input);
  }

  function clearContext() {
    setAssistantContext(null);
    setLatestResponse(null);
    setMessages([{ id: "context-cleared", role: "assistant", text: "Context cleared. Ask a fresh SETU data question." }]);
    inputRef.current?.focus();
  }

  const prompts = latestResponse?.suggestions.length ? latestResponse.suggestions : starterPrompts;

  return (
    <div className={`floating-assistant ${isOpen ? "open" : ""}`}>
      {isOpen ? (
        <section className="floating-assistant-panel" aria-label="SETU virtual assistant">
          <header className="floating-assistant-head">
            <div className="floating-assistant-title">
              <span>
                <Bot size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>SETU Assistant</strong>
                <small>Local RAG retrieval</small>
              </div>
            </div>
            <div className="floating-assistant-head-actions">
              <button type="button" onClick={clearContext} title="Clear context">
                <Sparkles size={14} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="floating-assistant-trust">
            <span>
              <ShieldCheck size={12} aria-hidden="true" />
              Masked data only
            </span>
            <span>{contextLabel(assistantContext)}</span>
          </div>

          <div className="floating-assistant-messages">
            {messages.map((message) => (
              <div className={`floating-message ${message.role}`} key={message.id}>
                <div className="floating-message-icon">
                  {message.role === "assistant" ? <Bot size={14} aria-hidden="true" /> : <MessageSquareText size={14} aria-hidden="true" />}
                </div>
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading ? (
              <div className="floating-message assistant">
                <div className="floating-message-icon">
                  <Loader2 className="spin" size={14} aria-hidden="true" />
                </div>
                <p>Retrieving grounded backend rows...</p>
              </div>
            ) : null}
          </div>

          <div className="floating-assistant-prompts">
            {prompts.slice(0, 4).map((prompt) => (
              <button type="button" key={prompt} onClick={() => void runPrompt(prompt)} disabled={isLoading}>
                {prompt}
              </button>
            ))}
          </div>

          {latestResponse ? (
            <div className="floating-assistant-results">
              <div className="floating-result-metrics">
                <div>
                  <span>Matches</span>
                  <strong>{latestResponse.total_matches}</strong>
                </div>
                <div>
                  <span>Rows</span>
                  <strong>{latestResponse.returned_count}</strong>
                </div>
                <div>
                  <span>Sources</span>
                  <strong>{latestResponse.sources.length}</strong>
                </div>
              </div>

              {summaryCards.length ? (
                <div className="floating-summary-list">
                  {summaryCards.slice(0, 2).map((card) => (
                    <div key={card.label}>
                      <span>{card.label}</span>
                      {countEntries(card.value).slice(0, 3).map(([label, count]) => (
                        <p key={`${card.label}-${label}`}>
                          <strong>{label}</strong>
                          <em>{String(count)}</em>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}

              {latestResponse.sources.length ? (
                <div className="floating-sources">
                  {latestResponse.sources.slice(0, 3).map((source) => (
                    <span key={`${source.source_type}-${source.id}`}>
                      {source.id} - {source.department}
                    </span>
                  ))}
                </div>
              ) : null}

              {latestResponse.rows.length ? (
                <details className="floating-table-detail">
                  <summary>
                    <span>
                      <Table2 size={13} aria-hidden="true" />
                      View grounded rows
                    </span>
                    <ChevronDown size={13} aria-hidden="true" />
                  </summary>
                  <div className="floating-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {latestResponse.columns.slice(0, 8).map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {latestResponse.rows.slice(0, 12).map((row, rowIndex) => (
                          <tr key={`${latestResponse.dataset}-${rowIndex}`}>
                            {latestResponse.columns.slice(0, 8).map((column) => (
                              <td key={`${rowIndex}-${column.key}`}>{valueToText(row[column.key])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}

              <div className="floating-result-actions">
                <span>{latestResponse.retrieval_mode.replace(/_/g, " ")}</span>
                <button type="button" onClick={() => downloadAssistantRows(latestResponse)} disabled={!latestResponse.rows.length}>
                  <Download size={12} aria-hidden="true" />
                  CSV
                </button>
              </div>
            </div>
          ) : null}

          <form className="floating-assistant-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about PINs, companies, licences..."
              type="text"
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Ask assistant">
              <SendHorizontal size={15} aria-hidden="true" />
            </button>
          </form>
        </section>
      ) : null}

      <button className="floating-assistant-launcher" type="button" onClick={() => setIsOpen(true)}>
        <Bot size={20} aria-hidden="true" />
        <span>Ask SETU</span>
      </button>
    </div>
  );
}

export default FloatingDataAssistant;
