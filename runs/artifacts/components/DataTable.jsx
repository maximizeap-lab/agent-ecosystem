import React, { useState, useMemo } from "react";

/**
 * DataTable — A fully featured, reusable data table component.
 *
 * Props:
 *  columns      : Array<{ key, label, sortable?, render?(value, row)?, align? }>
 *  data         : Array<Object>
 *  loading      : boolean
 *  selectable   : boolean  — show checkboxes
 *  pagination   : boolean  — show pagination controls
 *  pageSize     : number   — rows per page (default 10)
 *  onRowClick   : (row) => void
 *  emptyMessage : string
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  selectable = false,
  pagination = true,
  pageSize: initialPageSize = 10,
  onRowClick,
  emptyMessage = "No data available.",
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");

  /* ── Sorting ── */
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  /* ── Filtered + Sorted data ── */
  const processed = useMemo(() => {
    let rows = [...data];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        columns.some((col) =>
          String(row[col.key] ?? "").toLowerCase().includes(q)
        )
      );
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, search, sortKey, sortDir, columns]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const paginated = pagination
    ? processed.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processed;

  /* ── Selection ── */
  const allSelected =
    paginated.length > 0 && paginated.every((_, i) => selected.has(i + (currentPage - 1) * pageSize));

  const toggleAll = () => {
    const indices = paginated.map((_, i) => i + (currentPage - 1) * pageSize);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) indices.forEach((i) => next.delete(i));
      else indices.forEach((i) => next.add(i));
      return next;
    });
  };

  const toggleRow = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  /* ── Page range helper ── */
  const pageNumbers = useMemo(() => {
    const range = [];
    const delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  return (
    <div className="dt-wrapper">
      {/* ── Toolbar ── */}
      <div className="dt-toolbar">
        <div className="dt-search-wrap">
          <span className="dt-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            className="dt-search"
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {selectable && selected.size > 0 && (
          <span className="dt-selection-badge">{selected.size} selected</span>
        )}

        <div className="dt-rows-select">
          <label>Rows</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="dt-scroll">
        <table className="dt-table">
          <thead>
            <tr>
              {selectable && (
                <th className="dt-th dt-check-col">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`dt-th ${col.sortable !== false ? "dt-th-sortable" : ""} dt-align-${col.align || "left"}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="dt-th-label">{col.label}</span>
                  {col.sortable !== false && (
                    <span className={`dt-sort-icon ${sortKey === col.key ? (sortDir === "asc" ? "asc" : "desc") : ""}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3l4 8H8l4-8zM12 21l-4-8h8l-4 8z" />
                      </svg>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="dt-skeleton-row">
                  {selectable && <td><div className="dt-skeleton dt-skeleton-sm" /></td>}
                  {columns.map((col) => (
                    <td key={col.key}><div className="dt-skeleton" /></td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="dt-empty">
                  <div className="dt-empty-content">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3h18v18H3z" rx="2" /><path d="M9 9h6M9 13h4" />
                    </svg>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, ri) => {
                const globalIdx = ri + (currentPage - 1) * pageSize;
                return (
                  <tr
                    key={globalIdx}
                    className={`dt-row ${onRowClick ? "dt-row-clickable" : ""} ${selected.has(globalIdx) ? "dt-row-selected" : ""}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="dt-check-col" onClick={(e) => { e.stopPropagation(); toggleRow(globalIdx); }}>
                        <input type="checkbox" checked={selected.has(globalIdx)} onChange={() => toggleRow(globalIdx)} />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`dt-td dt-align-${col.align || "left"}`}>
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pagination && (
        <div className="dt-pagination">
          <span className="dt-pagination-info">
            {processed.length === 0
              ? "0 results"
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, processed.length)} of ${processed.length}`}
          </span>

          <div className="dt-pagination-controls">
            <button
              className="dt-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
            >«</button>
            <button
              className="dt-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >‹</button>

            {pageNumbers[0] > 1 && <span className="dt-page-ellipsis">…</span>}

            {pageNumbers.map((n) => (
              <button
                key={n}
                className={`dt-page-btn ${n === currentPage ? "dt-page-active" : ""}`}
                onClick={() => setCurrentPage(n)}
              >{n}</button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages && <span className="dt-page-ellipsis">…</span>}

            <button
              className="dt-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
            >›</button>
            <button
              className="dt-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
}
