import { ArrowLeft, Download, FileSpreadsheet, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchMockDatabaseRecords, type MockDepartmentRecord } from "../lib/api";
import type { ScreenId } from "../types";

interface MockSpreadsheetScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const columns: Array<{ key: keyof MockDepartmentRecord; label: string }> = [
  { key: "record_id", label: "Record ID" },
  { key: "company_group_id", label: "Group" },
  { key: "department", label: "Department" },
  { key: "department_record_id", label: "Dept Record" },
  { key: "business_name", label: "Business" },
  { key: "pan_masked", label: "PAN" },
  { key: "gstin_masked", label: "GSTIN" },
  { key: "address", label: "Address" },
  { key: "pin_code", label: "PIN" },
  { key: "business_sector", label: "Sector" },
  { key: "status_in_department", label: "Status" },
  { key: "last_updated", label: "Last Updated" },
  { key: "date_of_commencement", label: "Commencement" },
  { key: "registration_date", label: "Registration" },
  { key: "renewal_date", label: "Renewal" },
  { key: "last_inspection_date", label: "Last Inspection" },
  { key: "active_flag", label: "Active Flag" },
  { key: "factory_license_no", label: "Factory Licence" },
  { key: "shop_license_no", label: "Shop Licence" },
  { key: "labour_registration_no", label: "Labour Reg." },
  { key: "kspcb_consent_no", label: "KSPCB Consent" },
  { key: "bescom_consumer_no", label: "BESCOM No." },
  { key: "bwssb_consumer_no", label: "BWSSB No." },
  { key: "trade_license_no", label: "Trade Licence" },
];

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

      <div className="spreadsheet-table-wrap">
        <table className="spreadsheet-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.record_id}>
                {columns.map((column) => (
                  <td key={`${record.record_id}-${column.key}`}>{record[column.key] ?? ""}</td>
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
