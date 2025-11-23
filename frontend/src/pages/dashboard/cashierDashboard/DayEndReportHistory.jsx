import React, { useState, useEffect, useMemo } from 'react';
import { FaHistory, FaFileInvoice, FaDownload, FaEye, FaCalendarAlt, FaFilter, FaTimes, FaPrint } from 'react-icons/fa';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import cashierSidebarSections from './CashierDashboardSidebar';
import { getUserData } from '../../../api/apiUtils';
import { sessionAPI } from '../../../api/cashier';

// View Report Modal Component for Day End Reports
const ViewReportModal = ({ report, onClose }) => {
  if (!report) return null;

  // report_data may be stringified
  const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : (report.report_data || {});
  const cardSummary = reportData.card_summary || {};
  const perClass = reportData.per_class || [];

  const calculatedCollections = perClass.reduce((sum, cls) => sum + Number(cls.total_amount || 0), 0);
  const calculatedReceipts = perClass.reduce((sum, cls) => sum + Number(cls.tx_count || 0), 0);

  const totalCollections = Math.max(Number(report.total_collections || 0), calculatedCollections);
  const totalReceipts = Math.max(Number(report.total_receipts || 0), calculatedReceipts);
  const expectedClosing = Number(report.opening_balance || 0) + totalCollections;

  // Compute admission fees total for this saved report.
  const admissionFeesTotal = (() => {
    // 1) Snapshot may contain a precomputed admission_fees_total
    if (reportData && (reportData.admission_fees_total !== undefined || reportData.admissionFeesTotal !== undefined)) {
      return Number(reportData.admission_fees_total ?? reportData.admissionFeesTotal ?? 0);
    }

    // 2) Sum any explicit admission_fee fields in per_class
    if (Array.isArray(perClass) && perClass.length > 0) {
      const sumByField = perClass.reduce((s, p) => s + (Number(p.admission_fee ?? p.admissionFee ?? 0) || 0), 0);
      if (sumByField > 0) return sumByField;

      // 3) Fallback: some reports include an "Admission Fee" class row where total_amount holds the value
      const sumByName = perClass.reduce((s, p) => {
        const name = (p.class_name || p.className || '').toString().toLowerCase();
        if (name.includes('admission')) return s + (Number(p.total_amount || 0) || 0);
        return s;
      }, 0);
      return sumByName;
    }

    return 0;
  })();

  const formatCurrency = (amount) => `LKR ${Number(amount || 0).toLocaleString()}`;
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-5 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FaFileInvoice className="text-3xl" />
                Day End Report
              </h2>
              <div className="text-sm opacity-90 mt-1">
                {formatDate(report.report_date)} • {formatTime(report.report_time)}
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors text-xl">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl">🎓</span>
              <h1 className="text-2xl font-bold text-emerald-700">TCMS</h1>
            </div>
            <div className="text-gray-600 text-base">Day End Report</div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4 mb-4 grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Date:</span>
              <span className="text-gray-900">{formatDate(report.report_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Report Generated:</span>
              <span className="text-gray-900">{formatTime(report.report_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Cashier:</span>
              <span className="text-gray-900">{report.cashier_name || 'Cashier'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Report Type:</span>
              <span className="text-gray-900">{report.report_type === 'full' ? 'Full Day Report' : 'Day Summary'}</span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Day's Collections (Net)</div>
                <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalCollections)}</div>
              </div>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Receipts Issued</div>
                <div className="text-3xl font-bold text-gray-800">{totalReceipts}</div>
              </div>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Admission Fees</div>
                <div className="text-3xl font-bold text-emerald-600">{formatCurrency(admissionFeesTotal)}</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Card Issuance Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Full Cards Issued (count)</div>
                <div className="text-xl font-bold text-gray-800">{cardSummary.full_count || 0}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Amount: {formatCurrency(cardSummary.full_amount)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Half Cards Issued (count)</div>
                <div className="text-xl font-bold text-gray-800">{cardSummary.half_count || 0}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Amount: {formatCurrency(cardSummary.half_amount)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Free Cards Issued</div>
                <div className="text-xl font-bold text-gray-800">{cardSummary.free_count || 0}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Amount: {formatCurrency(cardSummary.free_amount)}</div>
              </div>
            </div>
          </div>

          {report.report_type !== 'summary' && (
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Collections by Class</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Class Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Teacher</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Full Cards Issued</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Half Cards Issued</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Free Cards Issued</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Total Amount Collected</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {perClass.length > 0 ? perClass.map((cls, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-xs">{cls.class_name || '-'}</td>
                      <td className="px-3 py-2 text-xs">{cls.teacher || '-'}</td>
                      <td className="px-3 py-2 text-center text-xs">{Number(cls.full_count) || 0}</td>
                      <td className="px-3 py-2 text-center text-xs">{Number(cls.half_count) || 0}</td>
                      <td className="px-3 py-2 text-center text-xs">{Number(cls.free_count) || 0}</td>
                      <td className="px-3 py-2 text-right font-semibold text-xs">{formatCurrency(Number(cls.total_amount) || 0)}</td>
                      <td className="px-3 py-2 text-center text-xs">{Number(cls.tx_count) || 0}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-3 py-4 text-center text-gray-500 text-xs">No class data available</td>
                    </tr>
                  )}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="5" className="px-3 py-2 text-right text-xs">Grand Total</td>
                    <td className="px-3 py-2 text-right text-xs">{formatCurrency(totalCollections)}</td>
                    <td className="px-3 py-2 text-center text-xs"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Session Details</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm">
              {/* Show sessions included in this day report if provided in report_data.sessions */}
              {reportData.sessions && reportData.sessions.length > 0 ? (
                <div className="grid gap-2">
                  {reportData.sessions.map((s, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <div>
                        <div className="font-semibold">Session #{s.session_id}</div>
                        <div className="text-xs text-gray-500">Start: {s.session_start || '-'}</div>
                        <div className="text-xs text-gray-500">End: {s.session_end || '-'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">Collections: {formatCurrency(s.collections)}</div>
                        <div className="text-xs text-gray-500">Receipts: {s.receipts || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No session details embedded in this report.</div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Summary & Notes</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">Report Generated:</span>
                  <span className="text-gray-900">{formatTime(report.report_time)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">Total Transactions:</span>
                  <span className="text-gray-900">{totalReceipts} receipts</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">Total Collections:</span>
                  <span className="text-gray-900">{formatCurrency(totalCollections)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span className={`font-semibold ${report.is_final ? 'text-green-600' : 'text-gray-600'}`}>
                    {report.is_final ? 'Final' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-500 text-[10px] mt-4 pb-3 border-t pt-3">
            <div className="mb-0.5">Generated by TCMS (Tuition Class Management System)</div>
            <div className="text-emerald-600 font-semibold mt-2 text-xs print:hidden">Report ready for printing</div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t flex gap-3 justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

const DayEndReportHistory = () => {
  const user = useMemo(() => getUserData(), []);
  const cashierId = user?.userid;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    onlyFinal: false,
  });
  const [selectedReport, setSelectedReport] = useState(null);

  // Helpers to compute collections/receipts from embedded per_class
  const getActualCollections = (report) => {
    try {
      const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : (report.report_data || {});
      const perClass = reportData.per_class || [];
      const calculated = perClass.reduce((sum, cls) => sum + Number(cls.total_amount || 0), 0);
      return Math.max(Number(report.total_collections || 0), calculated);
    } catch (e) {
      return Number(report.total_collections || 0);
    }
  };

  const getActualReceipts = (report) => {
    try {
      const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : (report.report_data || {});
      const perClass = reportData.per_class || [];
      const calculated = perClass.reduce((sum, cls) => sum + Number(cls.tx_count || 0), 0);
      return Math.max(Number(report.total_receipts || 0), calculated);
    } catch (e) {
      return Number(report.total_receipts || 0);
    }
  };

  useEffect(() => {
    if (cashierId) loadReports();
  }, [cashierId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await sessionAPI.getDayEndReportHistory({
        cashierId: cashierId,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        onlyFinal: filters.onlyFinal,
        limit: 200,
      });

      if (response.success && response.reports) {
        setReports(response.reports);
      } else if (response.success && response.data && response.data.reports) {
        setReports(response.data.reports);
      } else {
        setError('Failed to load day end reports');
      }
    } catch (err) {
      console.error('Error loading day end reports:', err);
      setError('Failed to load day end reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => loadReports();
  const handleResetFilters = () => {
    setFilters({ fromDate: '', toDate: '', onlyFinal: false });
    setTimeout(loadReports, 50);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatCurrency = (amount) => `LKR ${Number(amount || 0).toLocaleString()}`;

  const handleViewReport = (report) => setSelectedReport(report);

  const handleDownloadReport = (report) => {
    // Reuse same download/print behavior as session reports
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) { alert('Please allow pop-ups to download the report'); return; }

    const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : (report.report_data || {});
    const cardSummary = reportData.card_summary || {};
    const perClass = reportData.per_class || [];

    const calculatedCollections = perClass.reduce((sum, cls) => sum + Number(cls.total_amount || 0), 0);
    const calculatedReceipts = perClass.reduce((sum, cls) => sum + Number(cls.tx_count || 0), 0);
    const totalCollections = Math.max(Number(report.total_collections || 0), calculatedCollections);
    const totalReceipts = Math.max(Number(report.total_receipts || 0), calculatedReceipts);
    const expectedClosing = Number(report.opening_balance || 0) + totalCollections;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Day End Report #${report.report_id}</title></head><body><pre>${JSON.stringify(report, null, 2)}</pre></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <DashboardLayout userRole="Cashier" sidebarItems={cashierSidebarSections} customTitle="TCMS" customSubtitle={`Cashier Dashboard - ${user?.name || 'Cashier'}`}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3"><FaHistory className="text-emerald-600" /> Day End Report History</h1>
          <p className="text-gray-600">View and manage all day end reports</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4"><FaFilter className="text-emerald-600" /><h2 className="text-lg font-semibold text-gray-800">Filter Reports</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2"><FaCalendarAlt className="inline mr-2" /> From Date</label>
              <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2"><FaCalendarAlt className="inline mr-2" /> To Date</label>
              <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Options</label>
              <label className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg cursor-pointer">
                <input type="checkbox" checked={filters.onlyFinal} onChange={(e) => setFilters({ ...filters, onlyFinal: e.target.checked })} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                <span className="text-sm font-medium text-gray-700">Final Reports Only</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Actions</label>
              <div className="flex gap-2">
                <button onClick={handleApplyFilters} className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold">Apply</button>
                <button onClick={handleResetFilters} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold">Reset</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div><p className="text-gray-600">Loading reports...</p></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12"><p className="text-red-600 mb-4">{error}</p><button onClick={loadReports} className="bg-emerald-600 text-white px-6 py-2 rounded-lg">Retry</button></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 bg-gray-50"><FaFileInvoice className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No day end reports found</p><small className="text-gray-400">Generate day end reports to see them here</small></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Report ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Report Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Generated</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Opening Balance</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Collections</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Cash Out</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Receipts</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.report_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap"><span className="text-emerald-600 font-bold">#{report.report_id}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatDate(report.report_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatDateTime(report.report_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${report.report_type === 'full' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{report.report_type === 'full' ? 'Full' : 'Summary'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatCurrency(report.opening_balance)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{formatCurrency(getActualCollections(report))}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{report.total_cash_out ? (<span className="text-emerald-600 font-semibold">{formatCurrency(report.total_cash_out)}</span>) : (<span className="text-gray-400">-</span>)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{getActualReceipts(report)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-full text-xs font-bold ${report.is_final ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{report.is_final ? '✓ Final' : 'Draft'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => handleViewReport(report)} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center gap-1"><FaEye /> View</button>
                          <button onClick={() => handleDownloadReport(report)} className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-purple-600 flex items-center gap-1"><FaDownload /> PDF</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6 text-center"><p className="text-gray-600">Total Reports: <strong className="text-emerald-600 text-xl">{reports.length}</strong></p></div>
      </div>

      {selectedReport && <ViewReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </DashboardLayout>
  );
};

export default DayEndReportHistory;
