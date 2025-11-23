import React from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

/**
 * BasicTable - A reusable table component for displaying tabular data.
 * Props:
 *  - columns: Array<{ key: string, label: string, render?: (row) => ReactNode, sortable?: boolean }>
 *  - data: Array<Object>
 *  - actions?: (row) => ReactNode (optional, for action buttons)
 *  - className?: string (optional)
 *  - onSort?: (key) => void (optional, for sorting)
 *  - sortConfig?: { key: string, direction: 'asc' | 'desc' } (optional)
 */

import { useState } from 'react';

const BasicTable = ({
  columns,
  data,
  actions,
  className = '',
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalCount = null,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  sortConfig,
  loading = false,
  emptyMessage = "No data available",
}) => {
  // Internal state if not controlled
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(controlledRowsPerPage || 25);
  const [internalPage, setInternalPage] = useState(controlledPage || 1);

  const rowsPerPage = controlledRowsPerPage !== undefined ? controlledRowsPerPage : internalRowsPerPage;
  const page = controlledPage !== undefined ? controlledPage : internalPage;

  // Calculate pagination info
  const totalRows = totalCount !== null ? totalCount : data.length;
  const from = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(page * rowsPerPage, totalRows);
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  // Data slice for current page
  const pagedData = data.slice((page - 1) * rowsPerPage, (page - 1) * rowsPerPage + rowsPerPage);

  // Handlers
  const handleRowsPerPageChange = (newRows) => {
    if (onRowsPerPageChange) onRowsPerPageChange(newRows);
    else setInternalRowsPerPage(newRows);
    if (onPageChange) onPageChange(1);
    else setInternalPage(1);
  };
  const handlePageChange = (newPage) => {
    if (onPageChange) onPageChange(newPage);
    else setInternalPage(newPage);
  };

  // Render sort indicator
  const renderSortIndicator = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <FaSort className="w-3 h-3 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="w-3 h-3 text-blue-600" />
      : <FaSortDown className="w-3 h-3 text-blue-600" />;
  };

  // Handle column header click
  const handleColumnClick = (column) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  return (
    <div className={`w-full max-w-full px-2 sm:px-0 py-2 sm:py-0`}>
      <div className={`overflow-x-auto rounded-2xl shadow-lg border border-[#e0e3f7] bg-white ${className}`.trim()}>
        <table className="w-full min-w-[600px] text-left font-['Inter','Roboto',sans-serif] text-[13px]">
        <thead>
            <tr className="bg-[#a4a9fc] text-[#1a1a2e] rounded-t-2xl">
            {columns.map(col => (
                <th 
                  key={col.key} 
                  className={`p-4 font-semibold text-[14px] tracking-wide border-b border-[#d1d5db] ${
                    col.sortable ? 'cursor-pointer hover:bg-[#8b8ffc] transition-colors' : ''
                  }`}
                  onClick={() => handleColumnClick(col)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.sortable && renderSortIndicator(col.key)}
                  </div>
                </th>
            ))}
              {actions && <th className="p-4 font-semibold text-[14px] tracking-wide border-b border-[#d1d5db]">Action</th>}
          </tr>
        </thead>
          <tbody className="bg-white text-[13px]">
          {loading ? (
            <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="p-6 text-center text-gray-500 font-semibold">Loading...</td>
            </tr>
          ) : pagedData.length === 0 ? (
            <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="p-6 text-center text-gray-500 font-semibold">{emptyMessage}</td>
            </tr>
          ) : (
            pagedData.map((row, idx) => (
              <tr
                key={row.id || row.teacherId || idx}
                className={
                    `transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f6f7fb]'} hover:bg-[#e0e7ff]` +
                  (row.status === 'Error' ? ' bg-red-50' : '')
                }
                  style={{ fontWeight: 500 }}
              >
                {columns.map((col, idxCol) => (
                    <td key={col.key} className="p-4 align-middle text-[#22223b] border-b border-[#f0f1f6] last:border-0">
                      {col.key === 'status' ? (
                        row.status === 'Approved' ? (
                          <span className="flex items-center gap-1 text-green-600 font-semibold"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#22c55e"/><path d="M8 12.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg> Approved</span>
                        ) : row.status === 'Error' ? (
                          <span className="flex items-center gap-1 text-red-600 font-semibold"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ef4444"/><path d="M12" v="8v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#fff"/></svg> Error</span>
                        ) : row.status === 'Disable' ? (
                          <span className="flex items-center gap-1 text-gray-500 font-semibold"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#a3a3a3"/><path d="M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg> Disable</span>
                        ) : (
                          col.render ? col.render(row, idx) : row.status
                        )
                      ) : col.render ? col.render(row, idx) : row[col.key]}
                  </td>
                ))}
                  {actions && <td className="p-4 align-middle border-b border-[#f0f1f6] last:border-0">{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pagination/Footer Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#a4a9fc] px-8 py-4 rounded-b-2xl text-[14px] mt-0 font-['Inter','Roboto',sans-serif] font-semibold border-t border-[#d1d5db]">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <span className="font-bold">Rows Per Page</span>
          <input
            type="number"
            min={1}
            className="border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            value={rowsPerPage}
            onChange={e => {
              let newRows = Number(e.target.value);
              if (isNaN(newRows) || newRows < 1) newRows = 1;
              handleRowsPerPageChange(newRows);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span>{from}-{to} of {totalRows}</span>
          <button
            className="px-2 py-1 rounded disabled:opacity-50"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous Page"
          >
            &#60;
          </button>
          <button
            className="px-2 py-1 rounded disabled:opacity-50"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next Page"
          >
            &#62;
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicTable;
