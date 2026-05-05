import { ArrowLeft, Download, FileSpreadsheet, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fetchMockDatabaseRecords, type MockDepartmentRecord } from "../lib/api";
import type { ScreenId } from "../types";

interface MockSpreadsheetScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const columns: Array<{ key: keyof MockDepartmentRecord; label: string; width: number }> = [
  { key: "record_id", label: "Record ID", width: 112 },
  { key: "company_group_id", label: "Group", width: 94 },
  { key: "department", label: "Department", width: 220 },
  { key: "department_record_id", label: "Dept Record", width: 170 },
  { key: "business_name", label: "Business", width: 320 },
  { key: "pan_masked", label: "PAN", width: 118 },
  { key: "gstin_masked", label: "GSTIN", width: 154 },
  { key: "address", label: "Address", width: 360 },
  { key: "pin_code", label: "PIN", width: 92 },
  { key: "business_sector", label: "Sector", width: 150 },
  { key: "status_in_department", label: "Status", width: 128 },
  { key: "last_updated", label: "Last Updated", width: 150 },
  { key: "date_of_commencement", label: "Commencement", width: 168 },
  { key: "registration_date", label: "Registration", width: 156 },
  { key: "renewal_date", label: "Renewal", width: 138 },
  { key: "last_inspection_date", label: "Last Inspection", width: 168 },
  { key: "active_flag", label: "Active Flag", width: 118 },
  { key: "factory_license_no", label: "Factory Licence", width: 168 },
  { key: "shop_license_no", label: "Shop Licence", width: 156 },
  { key: "labour_registration_no", label: "Labour Reg.", width: 168 },
  { key: "kspcb_consent_no", label: "KSPCB Consent", width: 166 },
  { key: "bescom_consumer_no", label: "BESCOM No.", width: 160 },
  { key: "bwssb_consumer_no", label: "BWSSB No.", width: 160 },
  { key: "trade_license_no", label: "Trade Licence", width: 160 },
];

const frozenColumnCount = 2;
const totalColumnWidth = columns.reduce((total, column) => total + column.width, 0);
const columnLeftOffsets = columns.map((_, index) =>
  columns.slice(0, index).reduce((total, column) => total + column.width, 0),
);

function columnStyle(index: number): CSSProperties {
  const width = columns[index].width;
  return index < frozenColumnCount
    ? { width, minWidth: width, left: columnLeftOffsets[index] }
    : { width, minWidth: width };
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadMaskedCsv(records: MockDepartmentRecord[]) {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const rows = records.map((record) =>
    columns.map((column) => csvEscape(record[column.key])).join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "setu-masked-mock-department-records.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function MockSpreadsheetScreen({ onNavigate }: MockSpreadsheetScreenProps) {
  const [records, setRecords] = useState<MockDepartmentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusText, setStatusText] = useState("Loading masked mock CSV records...");
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMockDatabaseRecords(500)
      .then((items) => {
        setRecords(items);
        setStatusText(`${items.length} masked mock CSV records loaded`);
      })
      .catch(() => {
        setRecords([]);
        setStatusText("Mock CSV records could not be loaded from backend");
      });
  }, []);

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return records;

    return records.filter((record) =>
      [
        record.record_id,
        record.company_group_id,
        record.department,
        record.department_record_id,
        record.business_name,
        record.pan_masked,
        record.gstin_masked,
        record.pin_code,
        record.status_in_department,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [records, query]);

  function syncTopScrollbar() {
    if (!tableScrollRef.current || !topScrollRef.current) return;
    topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
  }

  function syncTableScrollbar() {
    if (!tableScrollRef.current || !topScrollRef.current) return;
    tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  }

  function scrollToColumn(key: keyof MockDepartmentRecord) {
    const index = columns.findIndex((column) => column.key === key);
    if (index < 0) return;
    tableScrollRef.current?.scrollTo({ left: columnLeftOffsets[index], behavior: "smooth" });
    topScrollRef.current?.scrollTo({ left: columnLeftOffsets[index], behavior: "smooth" });
  }

  function scrollToEnd() {
    const maxScroll = tableScrollRef.current?.scrollWidth ?? totalColumnWidth;
    tableScrollRef.current?.scrollTo({ left: maxScroll, behavior: "smooth" });
    topScrollRef.current?.scrollTo({ left: maxScroll, behavior: "smooth" });
  }

  return (
    <section className="spreadsheet-screen">
      <div className="spreadsheet-header">
        <button className="btn-ghost" type="button" onClick={() => onNavigate("ingestion")}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back to Ingestion
        </button>
        <div>
          <p className="eyebrow">Mock Database Spreadsheet</p>
          <h1>Department Business Records</h1>
          <p>Spreadsheet-style view of the synthetic CSV. PAN/GSTIN are masked for privacy.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => downloadMaskedCsv(filteredRecords)}>
          <Download size={14} aria-hidden="true" />
          Download Masked CSV
        </button>
      </div>

      <div className="spreadsheet-toolbar">
        <div className="resolution-status">
          <FileSpreadsheet size={16} aria-hidden="true" />
          <span>{statusText}</span>
          <strong>{filteredRecords.length} visible</strong>
        </div>
        <div className="spreadsheet-tools">
          <button
            className="btn-ghost compact-action"
            type="button"
            onClick={() => scrollToColumn("date_of_commencement")}
          >
            Dates
          </button>
          <button
            className="btn-ghost compact-action"
            type="button"
            onClick={() => scrollToColumn("factory_license_no")}
          >
            Licence refs
          </button>
          <button className="btn-ghost compact-action" type="button" onClick={scrollToEnd}>
            Right edge
          </button>
          <label className="spreadsheet-search">
            <Search size={15} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records, departments, masked IDs, PIN"
              type="search"
            />
          </label>
        </div>
      </div>

      <div
        className="spreadsheet-x-scroll"
        ref={topScrollRef}
        onScroll={syncTableScrollbar}
        aria-label="Spreadsheet horizontal scroll"
      >
        <div style={{ width: totalColumnWidth }} />
      </div>

      <div className="spreadsheet-table-wrap" ref={tableScrollRef} onScroll={syncTopScrollbar}>
        <table className="spreadsheet-table" style={{ minWidth: totalColumnWidth, width: totalColumnWidth }}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  className={index < frozenColumnCount ? "sticky-col" : undefined}
                  key={column.key}
                  style={columnStyle(index)}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.record_id}>
                {columns.map((column, index) => (
                  <td
                    className={index < frozenColumnCount ? "sticky-col" : undefined}
                    key={`${record.record_id}-${column.key}`}
                    style={columnStyle(index)}
                    title={String(record[column.key] ?? "")}
                  >
                    {record[column.key] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredRecords.length ? <div className="empty-state">No records match this search.</div> : null}
      </div>
    </section>
  );
}

export default MockSpreadsheetScreen;
