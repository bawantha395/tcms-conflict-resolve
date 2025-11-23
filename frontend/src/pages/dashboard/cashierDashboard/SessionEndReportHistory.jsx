import React, { useState, useEffect, useMemo } from 'react';
import { FaHistory, FaTimes, FaSyncAlt, FaEye, FaDownload, FaFileInvoice } from 'react-icons/fa';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import cashierSidebarSections from './CashierDashboardSidebar';
import { getUserData } from '../../../api/apiUtils';
import { sessionAPI } from '../../../api/cashier';

// Simple modal to view a report
const ViewReportModal = ({ report, onClose }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [liveData, setLiveData] = React.useState(null);
  const [loadingLive, setLoadingLive] = React.useState(false);
  
  // Determine if session is ongoing (not cashed out or finalized)
  const isOngoingSession = report && !report.is_final && (!report.cash_out_amount || Number(report.cash_out_amount) === 0);
  
  // Fetch live data for ongoing sessions
  React.useEffect(() => {
    const fetchLiveData = async () => {
      if (!report || !isOngoingSession) return;
      
      setLoadingLive(true);
        try {
        console.log('🔄 Fetching live data for ongoing session:', report.session_id);
        const { getCashierStats } = await import('../../../api/payments');
        const res = await getCashierStats(report.cashier_id, 'session', report.session_id);

        if (res && res.success && res.data) {
          console.log('✅ Live data fetched:', res.data);

          // Backend returns { data: { stats, transactions, perClass } }
          const stats = res.data.stats || {};
          const transactions = res.data.transactions || [];
          const perClass = res.data.perClass || [];

          // Compute card amounts by scanning transactions (mirror backend detection)
          let fullAmount = 0;
          let halfAmount = 0;
          let freeAmount = 0;

          const normalize = (s) => (s || '').toString().toLowerCase();

          
          for (const tx of transactions) {
            const paymentType = tx.payment_type || tx.paymentType || '';
            const status = tx.status || '';
            if (paymentType === 'class_payment' && status === 'paid') {
              const notes = normalize(tx.notes);
              const amount = Number(tx.amount || 0);

              // Free card detection
              const isFree = notes.includes('full free card') || notes.includes('100%') || notes.includes('100 %') || (amount === 0 && (notes.includes('free card') || notes.includes('complimentary') || notes.includes('free')));

              // Half card detection
              const isHalf = !isFree && (notes.includes('half free card') || notes.includes('50%') || notes.includes('50 %') || (notes.includes('half') && notes.includes('discount')));

              if (isFree) freeAmount += amount;
              else if (isHalf) halfAmount += amount;
              else fullAmount += amount;
            }
          }

          setLiveData({
            transactions,
            perClass,
            cardSummary: {
              full_count: Number(stats.full_cards_issued || stats.fullCardsIssued || 0),
              full_amount: fullAmount,
              half_count: Number(stats.half_cards_issued || stats.halfCardsIssued || 0),
              half_amount: halfAmount,
              free_count: Number(stats.free_cards_issued || stats.freeCardsIssued || 0),
              free_amount: freeAmount
            },
            totalCollections: Number(stats.total_collected || stats.totalCollections || 0),
            totalReceipts: Number(stats.total_receipts || stats.totalReceipts || 0)
          });
        }
      } catch (error) {
        console.error('Failed to fetch live data:', error);
      } finally {
        setLoadingLive(false);
      }
    };
    
    fetchLiveData();
  }, [report, isOngoingSession]);
  
  // Enhanced debug logging
  React.useEffect(() => {
    if (report) {
      console.log('📊 === SessionEndReportHistory - Report Data ===');
      console.log('Report ID:', report.report_id);
      console.log('Session ID:', report.session_id);
      console.log('Is Ongoing Session:', isOngoingSession);
      console.log('isCashedOut:', isCashedOut);
      console.log('Live Data Available:', !!liveData);
      console.log('🔍 DATA SOURCES ANALYSIS:');
      console.log('  DB Fields - Total Collections:', report.total_collections);
      console.log('  DB Fields - Total Receipts:', report.total_receipts);
      console.log('  DB Fields - Opening Balance:', report.opening_balance);
      console.log('  DB Fields - Cash Out Amount:', report.cash_out_amount);
      console.log('  DB Fields - Cash Drawer Balance:', report.cash_drawer_balance);
      console.log('  Snapshot - report_data:', report.report_data);
      
      // Parse and analyze snapshot data
      const parsedSnapshot = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
      console.log('  Snapshot - Parsed:', parsedSnapshot);
      console.log('  Snapshot - per_class count:', Array.isArray(parsedSnapshot?.per_class) ? parsedSnapshot.per_class.length : 0);
      console.log('  Snapshot - transactions count:', Array.isArray(parsedSnapshot?.transactions) ? parsedSnapshot.transactions.length : 0);
      console.log('  Snapshot - has card_summary:', !!parsedSnapshot?.card_summary);
      
      if (liveData) {
        console.log('  Live API - Total Collections:', liveData.totalCollections);
        console.log('  Live API - Total Receipts:', liveData.totalReceipts);
        console.log('  Live API - Transactions count:', liveData.transactions?.length || 0);
        console.log('  Live API - PerClass count:', liveData.perClass?.length || 0);
      }
      
      console.log('🧮 COMPUTED TOTALS:');
      console.log('  snapshotCollections:', snapshotCollections);
      console.log('  perClassCollectionsFallback:', perClassCollectionsFallback);
      console.log('  transactionsCollectionsFallback:', transactionsCollectionsFallback);
      console.log('  computedSnapshotCollections:', computedSnapshotCollections);
      console.log('  finalComputedCollections:', finalComputedCollections);
      console.log('  FINAL totalCollections:', totalCollections);
      console.log('  FINAL totalReceipts:', totalReceipts);
      
      console.log('Full Report Object:', report);
    }
  });
  
  // Parse report_data if it's a string. If liveData exists (ongoing session) include
  // live totals, but for closed/cashed sessions we will prefer snapshot values
  // from `report.report_data` because the live DB fields are often zeroed after cash-out.
  const reportData = report ? (
    liveData ? {
      card_summary: liveData.cardSummary,
      per_class: liveData.perClass,
      transactions: liveData.transactions,
      total_collections: liveData.totalCollections,
      total_receipts: liveData.totalReceipts
    } : (typeof report.report_data === 'string'
      ? JSON.parse(report.report_data)
      : report.report_data || {})
  ) : {};

  // Extract data
  const cardSummary = reportData.card_summary || {};
  const perClass = reportData.per_class || [];

  // Opening / cash out values from DB (may be stale after snapshot) - MOVED UP to fix TDZ
  const openingBalance = report ? Number(report.opening_balance || 0) : 0;
  const cashOutAmount = report ? Number(report.cash_out_amount || 0) : 0;
  const isCashedOut = cashOutAmount > 0 || (report && report.is_final);

  // Snapshot-derived totals (if present in reportData). These are authoritative
  // for closed sessions because the live system zeros out some fields post cash-out.
  const snapshotCollections = Number(reportData.total_collections || reportData.totalCollections || (report ? report.total_collections : 0) || 0);
  const snapshotReceipts = Number(reportData.total_receipts || reportData.totalReceipts || (report ? report.total_receipts : 0) || 0);

  // If snapshot fields are missing/zero (some snapshots only include per_class rows),
  // compute reasonable fallbacks from per_class or transactions so closed sessions
  // still display meaningful KPIs.
  const perClassCollectionsFallback = Number(
    (Array.isArray(perClass) ? perClass.reduce((s, p) => s + (Number(p.total_amount || p.totalAmount || 0)), 0) : 0)
  );

  const perClassReceiptsFallback = Number(
    (Array.isArray(perClass) ? perClass.reduce((s, p) => s + (Number(p.tx_count || p.transactions || 0) || 0), 0) : 0)
  );

  const transactions = Array.isArray(reportData.transactions) ? reportData.transactions : [];
  const transactionsCollectionsFallback = Number(
    transactions.reduce((s, tx) => s + ((tx && (tx.status === 'paid' || tx.status === 'PAID')) ? Number(tx.amount || 0) : 0), 0)
  );

  const transactionsReceiptsFallback = Number(transactions.length || 0);

  // Final computed snapshot totals (prefer explicit snapshot fields, otherwise fall back)
  const computedSnapshotCollections = snapshotCollections || perClassCollectionsFallback || transactionsCollectionsFallback || Number(report.total_collections || 0);
  const computedSnapshotReceipts = snapshotReceipts || perClassReceiptsFallback || transactionsReceiptsFallback || Number(report.total_receipts || 0);

  // If snapshot / per-class / transactions gave zero for collections but the
  // report contains a `cash_out_amount` (meaning the session was cashed out),
  // attempt to derive collections from cash_out_amount - opening_balance.
  // This handles cases where live/DB totals were zeroed but cash_out_amount
  // preserves the final drawer amount.
  let finalComputedCollections = Number(computedSnapshotCollections || 0);
  if (isCashedOut && finalComputedCollections === 0 && Number(cashOutAmount || 0) > 0) {
    const derived = Number(cashOutAmount || 0) - Number(openingBalance || 0);
    if (derived > 0) finalComputedCollections = derived;
  }

  // Choose totals: prefer snapshot when session is cashed out / finalized, otherwise
  // use liveData (if fetched) or the DB fields on the report record.
  const totalCollections = React.useMemo(() => {
    if (isCashedOut) return finalComputedCollections;
    if (liveData) return Number(liveData.totalCollections || 0);
    return report ? Number(report.total_collections || 0) : 0;
  }, [isCashedOut, liveData, report, finalComputedCollections]);

  const totalReceipts = React.useMemo(() => {
    if (isCashedOut) return computedSnapshotReceipts;
    if (liveData) return Number(liveData.totalReceipts || 0);
    return report ? Number(report.total_receipts || 0) : 0;
  }, [isCashedOut, liveData, report, computedSnapshotReceipts]);

  const expectedClosing = openingBalance + totalCollections;
  const cashDrawerBalance = report ? Number(report.cash_drawer_balance || 0) : 0;

  // Display logic: when session is not cashed out, show expected closing (opening + collections)
  // as the current cash drawer balance; when cashed out, show the recorded cash_drawer_balance.
  const drawerDisplay = isCashedOut ? cashDrawerBalance : expectedClosing;

  // Enhanced debug logging - MOVED HERE after all variables are defined
  React.useEffect(() => {
    if (report) {
      console.log('📊 === SessionEndReportHistory - Report Data ===');
      console.log('Report ID:', report.report_id);
      console.log('Session ID:', report.session_id);
      console.log('Is Ongoing Session:', isOngoingSession);
      console.log('isCashedOut:', isCashedOut);
      console.log('Live Data Available:', !!liveData);
      console.log('🔍 DATA SOURCES ANALYSIS:');
      console.log('  DB Fields - Total Collections:', report.total_collections);
      console.log('  DB Fields - Total Receipts:', report.total_receipts);
      console.log('  DB Fields - Opening Balance:', report.opening_balance);
      console.log('  DB Fields - Cash Out Amount:', report.cash_out_amount);
      console.log('  DB Fields - Cash Drawer Balance:', report.cash_drawer_balance);
      console.log('  Snapshot - report_data:', report.report_data);
      
      // Parse and analyze snapshot data
      const parsedSnapshot = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
      console.log('  Snapshot - Parsed:', parsedSnapshot);
      console.log('  Snapshot - per_class count:', Array.isArray(parsedSnapshot?.per_class) ? parsedSnapshot.per_class.length : 0);
      console.log('  Snapshot - transactions count:', Array.isArray(parsedSnapshot?.transactions) ? parsedSnapshot.transactions.length : 0);
      console.log('  Snapshot - has card_summary:', !!parsedSnapshot?.card_summary);
      
      if (liveData) {
        console.log('  Live API - Total Collections:', liveData.totalCollections);
        console.log('  Live API - Total Receipts:', liveData.totalReceipts);
        console.log('  Live API - Transactions count:', liveData.transactions?.length || 0);
        console.log('  Live API - PerClass count:', liveData.perClass?.length || 0);
      }
      
      console.log('🧮 COMPUTED TOTALS:');
      console.log('  snapshotCollections:', snapshotCollections);
      console.log('  perClassCollectionsFallback:', perClassCollectionsFallback);
      console.log('  transactionsCollectionsFallback:', transactionsCollectionsFallback);
      console.log('  computedSnapshotCollections:', computedSnapshotCollections);
      console.log('  finalComputedCollections:', finalComputedCollections);
      console.log('  FINAL totalCollections:', totalCollections);
      console.log('  FINAL totalReceipts:', totalReceipts);
      
      console.log('Full Report Object:', report);
    }
  }, [report, liveData, isOngoingSession, isCashedOut, snapshotCollections, perClassCollectionsFallback, transactionsCollectionsFallback, computedSnapshotCollections, finalComputedCollections, totalCollections, totalReceipts]);

  // Aggregate totals from card summary
  const aggregatedTotals = React.useMemo(() => {
    return {
      fullCount: Number(cardSummary.full_count || 0),
      fullAmount: Number(cardSummary.full_amount || 0),
      halfCount: Number(cardSummary.half_count || 0),
      halfAmount: Number(cardSummary.half_amount || 0),
      freeCount: Number(cardSummary.free_count || 0),
      freeAmount: Number(cardSummary.free_amount || 0),
      totalUniqueTransactions: Number(cardSummary.full_count || 0) + Number(cardSummary.half_count || 0) + Number(cardSummary.free_count || 0),
    };
  }, [cardSummary]);

  // Aggregate by class (include admission fee as its own column)
  const aggregatedByClass = React.useMemo(() => {
    // transactions can come from liveData (preferred) or reportData
    const transactions = (reportData && Array.isArray(reportData.transactions)) ? reportData.transactions : [];

    const map = {};

    // Seed with perClass entries (mark seeded classes so we don't double-count
    // when we also iterate raw transactions — backend perClass already includes
    // aggregated amounts for those classes)
    if (Array.isArray(perClass) && perClass.length > 0) {
      for (const p of perClass) {
        const name = p.class_name || p.className || "Unspecified";
        map[name] = {
          className: name,
          teacher: p.teacher || p.teacher_name || p.teacherName || "-",
          fullCards: Number(p.full_count || p.fullCount || 0),
          halfCards: Number(p.half_count || p.halfCount || 0),
          freeCards: Number(p.free_count || p.freeCount || 0),
          totalAmount: Number(p.total_amount || p.totalAmount || 0),
          txCount: Number(p.tx_count || p.transactions || 0),
          admissionFee: Number(p.admission_fee || p.admissionFee || 0),
          // Flag this entry came from server aggregation
          seeded: true,
        };
      }
    }

    // Ensure classes present in transactions exist and accumulate admission fees
    for (const tx of transactions) {
      const cname = tx.class_name || tx.className || 'Unspecified';
      if (!map[cname]) {
        map[cname] = {
          className: cname,
          teacher: tx.teacher || tx.teacher_name || tx.teacherName || '-',
          fullCards: 0,
          halfCards: 0,
          freeCards: 0,
          totalAmount: 0,
          txCount: 0,
          admissionFee: 0,
          seeded: false,
        };
      }

      const paymentType = tx.payment_type || tx.paymentType || '';
      const status = tx.status || '';
      const amount = Number(tx.amount || 0);
      // Only count paid transactions
      if (status === 'paid') {
        // If this class row was seeded from backend `perClass`, skip adding
        // transaction-level amounts because the server aggregation already
        // includes them (otherwise we'd double-count). For classes not
        // present in `perClass`, accumulate from transactions.
        const isSeeded = Boolean(map[cname].seeded);

        if (!isSeeded) {
          if (paymentType === 'admission_fee') {
            map[cname].admissionFee = (map[cname].admissionFee || 0) + amount;
          }

          // Increment totals for class (both class_payment and admission_fee counted)
          map[cname].totalAmount = (map[cname].totalAmount || 0) + amount;
          map[cname].txCount = (map[cname].txCount || 0) + 1;
        }
      }
    }

    return Object.values(map);
  }, [perClass, reportData]);

  const aggregatedClassTotal = React.useMemo(
    () =>
      aggregatedByClass.reduce(
        (sum, row) => sum + (Number(row.totalAmount) || 0),
        0
      ),
    [aggregatedByClass]
  );

  const admissionFeesTotal = React.useMemo(
    () => aggregatedByClass.reduce((s, r) => s + (Number(r.admissionFee || 0) || 0), 0),
    [aggregatedByClass]
  );

  if (!report) return null;

  const today = new Date(report.report_time);
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = today.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const sessionOpeningTime = report.session_start_time || report.session_date
    ? new Date(report.session_start_time || report.session_date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const sessionClosingTime = report.session_end_time || (report.is_final ? report.report_time : null)
    ? new Date(report.session_end_time || report.report_time).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const sessionStatus = isCashedOut ? "Session Completed" : "Ongoing Session";

  const handlePrint = async () => {
    setIsGenerating(true);

    // If this is an ongoing session and live data is still loading,
    // wait up to 5 seconds for the live data to arrive so the PDF includes
    // correct, up-to-date mappings.
    if (isOngoingSession && loadingLive) {
      const deadline = Date.now() + 5000;
      while (loadingLive && Date.now() < deadline) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 150));
      }
    }

    setTimeout(() => {
      const printWindow = window.open("", "_blank", "width=1000,height=700");
      if (!printWindow) {
        alert("Please allow pop-ups to print the report");
        setIsGenerating(false);
        return;
      }

      const classItems = aggregatedByClass
        .map(
          (r) => `
        <div class="item">
          <div class="item-header">${r.className || "-"}</div>
          <div class="item-detail"><span>Teacher:</span><span>${r.teacher || "-"}</span></div>
          <div class="item-detail"><span>Full Cards:</span><span>${r.fullCards || 0}</span></div>
          <div class="item-detail"><span>Half Cards:</span><span>${r.halfCards || 0}</span></div>
          <div class="item-detail"><span>Free Cards:</span><span>${r.freeCards || 0}</span></div>
          <div class="item-detail"><span>Admission Fee:</span><span>LKR ${Number(r.admissionFee || 0).toLocaleString()}</span></div>
          <div class="item-detail"><span>Amount:</span><span>LKR ${Number(r.totalAmount || 0).toLocaleString()}</span></div>
          <div class="item-detail"><span>Transactions:</span><span>${r.txCount || 0}</span></div>
        </div>
      `
        )
        .join("");

      const reportHTML = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Session End Report - ${dateStr}</title>
          <style>
            @media print { @page { margin: 0; } body { margin: 0.5cm; } }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              padding: 10px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .receipt {
              border: 2px dashed #333;
              padding: 15px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header .subtitle {
              font-size: 11px;
              color: #666;
              margin-top: 5px;
            }
            .section {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #999;
            }
            .section:last-child {
              border-bottom: none;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 11px;
            }
            .row .label {
              font-weight: bold;
              color: #333;
            }
            .row .value {
              text-align: right;
              color: #000;
            }
            .summary-box {
              background: #f5f5f5;
              padding: 10px;
              margin: 15px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 12px;
              font-weight: bold;
            }
            .summary-row .label {
              color: #333;
            }
            .summary-row .value {
              color: #059669;
            }
            .item-list {
              margin: 15px 0;
            }
            .item {
              border-bottom: 1px dotted #ccc;
              padding: 8px 0;
            }
            .item:last-child {
              border-bottom: none;
            }
            .item-header {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #000;
            }
            .item-detail {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              margin-bottom: 3px;
              color: #333;
            }
            .item-detail span:first-child {
              color: #666;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #333;
              font-size: 10px;
            }
            .thank-you {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .grand-total {
              background: #333;
              color: #fff;
              padding: 8px;
              margin: 10px 0;
              border-radius: 4px;
              text-align: center;
              font-size: 13px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo">🎓 TCMS</div>
              <div class="subtitle">Session End Report - Full Report</div>
            </div>

            <div class="section">
              <div class="row"><span class="label">Date:</span><span class="value">${dateStr}</span></div>
              <div class="row"><span class="label">Generated:</span><span class="value">${timeStr}</span></div>
              <div class="row"><span class="label">Cashier:</span><span class="value">${report.cashier_name || getUserData()?.name || "Cashier"}</span></div>
              <div class="row"><span class="label">Opening:</span><span class="value">${sessionOpeningTime || "-"}</span></div>
              <div class="row"><span class="label">Closing:</span><span class="value">${sessionClosingTime || "-"}</span></div>
            </div>

            <div class="summary-box">
              <div class="summary-row"><span class="label">Opening Balance:</span><span class="value">LKR ${openingBalance.toLocaleString()}</span></div>
              <div class="summary-row"><span class="label">Collections:</span><span class="value">LKR ${totalCollections.toLocaleString()}</span></div>
              <div class="summary-row"><span class="label">Expected Close:</span><span class="value">LKR ${expectedClosing.toLocaleString()}</span></div>
              <div class="summary-row"><span class="label">Cash Drawer:</span><span class="value">LKR ${drawerDisplay.toLocaleString()}</span></div>
              <div class="summary-row"><span class="label">Cash Out:</span><span class="value">LKR ${cashOutAmount.toLocaleString()}</span></div>
              <div class="summary-row"><span class="label">Receipts:</span><span class="value">${totalReceipts}</span></div>
            </div>

            <div class="section">
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; text-align: center;">Card Breakdown</div>
              <div class="row"><span class="label">Full Cards:</span><span class="value">${aggregatedTotals.fullCount || 0} (LKR ${Number(aggregatedTotals.fullAmount || 0).toLocaleString()})</span></div>
              <div class="row"><span class="label">Half Cards:</span><span class="value">${aggregatedTotals.halfCount || 0} (LKR ${Number(aggregatedTotals.halfAmount || 0).toLocaleString()})</span></div>
              <div class="row"><span class="label">Free Cards:</span><span class="value">${aggregatedTotals.freeCount || 0} (LKR ${Number(aggregatedTotals.freeAmount || 0).toLocaleString()})</span></div>
              <div class="row"><span class="label">Total Txns:</span><span class="value">${aggregatedTotals.totalUniqueTransactions || totalReceipts}</span></div>
            </div>

            <div style="font-size: 12px; font-weight: bold; margin: 15px 0 8px; text-align: center; border-bottom: 1px solid #333; padding-bottom: 5px;">Collections by Class</div>
            <div class="item-list">
              ${classItems}
            </div>

            <div class="grand-total">
              GRAND TOTAL: LKR ${Number(totalCollections).toLocaleString()}
            </div>

            <div class="footer">
              <div class="thank-you">Thank You!</div>
              <div>TCMS - Tuition Management</div>
              <div style="margin-top: 5px;">Computer-generated report</div>
              <div style="margin-top: 3px;">Requires authorization</div>
            </div>
          </div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
        </body>
        </html>
      `;

      printWindow.document.write(reportHTML);
      printWindow.document.close();
      setTimeout(() => setIsGenerating(false), 500);
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FaFileInvoice className="text-3xl" />
                Session End Report
                {isOngoingSession && (
                  <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                    LIVE DATA
                  </span>
                )}
              </h2>
              <div className="text-sm opacity-90 mt-1">
                {dateStr} • {timeStr}
                {loadingLive && <span className="ml-2">🔄 Refreshing...</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <style>
            {`
              #session-report-content .report-container {
                max-width: 800px;
                margin: 0 auto;
              }
              #session-report-content .header {
                text-align: center;
                border-bottom: 3px solid #059669;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              #session-report-content .header-title {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-bottom: 10px;
              }
              #session-report-content .logo-icon {
                font-size: 36px;
              }
              #session-report-content .header h1 {
                font-size: 28px;
                color: #059669;
                margin: 0;
              }
              #session-report-content .header .subtitle {
                font-size: 14px;
                color: #64748b;
              }
              #session-report-content .meta-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 30px;
                padding: 15px;
                background: #f1f5f9;
                border-radius: 8px;
              }
              #session-report-content .meta-item strong {
                color: #334155;
                margin-right: 8px;
              }
              #session-report-content .section {
                margin-bottom: 30px;
              }
              #session-report-content .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
              }
              #session-report-content .summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 20px;
              }
              #session-report-content .summary-card {
                padding: 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                background: #ffffff;
              }
              #session-report-content .summary-card .label {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 5px;
              }
              #session-report-content .summary-card .value {
                font-size: 24px;
                font-weight: bold;
                color: #1e293b;
              }
              #session-report-content .summary-card .value.success {
                color: #059669;
              }
              #session-report-content .table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
              }
              #session-report-content .table th,
              #session-report-content .table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
              }
              #session-report-content .table th {
                background: #f8fafc;
                font-weight: 600;
                color: #475569;
                font-size: 13px;
              }
              #session-report-content .table td {
                font-size: 14px;
                color: #334155;
              }
              #session-report-content .signature-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 50px;
              }
              #session-report-content .signature-box {
                text-align: center;
              }
              #session-report-content .signature-line {
                border-top: 2px solid #000;
                margin: 40px 20px 10px;
              }
              #session-report-content .signature-label {
                font-size: 13px;
                color: #475569;
              }
            `}
          </style>

          <div id="session-report-content">
            <div className="report-container">
              {/* Header */}
              <div className="header">
                <div className="header-title">
                  <span className="logo-icon">🎓</span>
                  <h1>TCMS</h1>
                </div>
                <div className="subtitle">Session End Report</div>
              </div>

              {/* Meta Information */}
              <div className="meta-info">
                <div className="meta-item">
                  <strong>Date:</strong> {dateStr}
                </div>
                <div className="meta-item">
                  <strong>Report Generated:</strong> {timeStr}
                </div>
                <div className="meta-item">
                  <strong>Cashier:</strong> {report.cashier_name || getUserData()?.name || "Cashier"}
                </div>
                <div className="meta-item">
                  <strong>Session ID:</strong> {report.session_id || 'N/A'}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="section">
                <div className="section-title">Financial Summary</div>
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="label">Opening Balance</div>
                    <div className="value">
                      LKR {openingBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Session's Collection (Net)</div>
                    <div className="value success">
                      LKR {totalCollections.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Expected Closing Balance</div>
                    <div className="value">
                      LKR {expectedClosing.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Opening + Collections
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Cash Drawer Balance</div>
                    <div className="value">
                      LKR {drawerDisplay.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Cash Out Balance</div>
                    <div className="value" style={{ color: '#10b981' }}>
                      LKR {cashOutAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Admission Fees</div>
                    <div className="value" style={{ color: '#059669' }}>
                      LKR {Number(admissionFeesTotal || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Receipts Issued</div>
                    <div className="value">{totalReceipts}</div>
                  </div>
                </div>
              </div>

              {/* Card Breakdown */}
              <div className="section">
                <div className="section-title">Card Issuance Breakdown</div>
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="label">Full Cards Issued (count)</div>
                    <div className="value">{aggregatedTotals.fullCount || 0}</div>
                    <div className="text-sm text-slate-500">
                      Amount: LKR {Number(aggregatedTotals.fullAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Half Cards Issued (count)</div>
                    <div className="value">{aggregatedTotals.halfCount || 0}</div>
                    <div className="text-sm text-slate-500">
                      Amount: LKR {Number(aggregatedTotals.halfAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Free Cards Issued</div>
                    <div className="value">{aggregatedTotals.freeCount || 0}</div>
                    <div className="text-sm text-slate-500">
                      Amount: LKR {Number(aggregatedTotals.freeAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="label">Total Transactions</div>
                    <div className="value">
                      {aggregatedTotals.totalUniqueTransactions || totalReceipts}
                    </div>
                    <div className="text-sm text-slate-500">
                      Total Collected: LKR {totalCollections.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Collections by Class */}
              <div className="section">
                <div className="section-title">Collections by Class</div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Class Name</th>
                        <th>Teacher</th>
                        <th style={{ textAlign: "center" }}>Full Cards</th>
                        <th style={{ textAlign: "center" }}>Half Cards</th>
                        <th style={{ textAlign: "center" }}>Free Cards</th>
                        <th style={{ textAlign: "right" }}>Admission Fee</th>
                        <th style={{ textAlign: "right" }}>Total Amount</th>
                        <th style={{ textAlign: "center" }}>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedByClass.length > 0 ? (
                        aggregatedByClass.map((r, idx) => (
                          <tr key={idx}>
                            <td>{r.className}</td>
                            <td>{r.teacher || "-"}</td>
                            <td style={{ textAlign: "center" }}>{r.fullCards || 0}</td>
                            <td style={{ textAlign: "center" }}>{r.halfCards || 0}</td>
                            <td style={{ textAlign: "center" }}>{r.freeCards || 0}</td>
                            <td style={{ textAlign: "right" }}>LKR {Number(r.admissionFee || 0).toLocaleString()}</td>
                            <td style={{ textAlign: "right" }}>
                              LKR {Number(r.totalAmount || 0).toLocaleString()}
                            </td>
                            <td style={{ textAlign: "center" }}>{r.txCount || 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                            No class collections recorded for this session
                          </td>
                        </tr>
                      )}
                      {aggregatedByClass.length > 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "right", fontWeight: "bold" }}>
                            Grand Total
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "bold" }}>
                            LKR {aggregatedClassTotal.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Notes */}
              <div className="section">
                <div className="section-title">Summary & Notes</div>
                <table className="table">
                  <tbody>
                    <tr>
                      <td><strong>Opening Time:</strong></td>
                      <td>{sessionOpeningTime || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Closing Time:</strong></td>
                      <td>{sessionClosingTime || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Transactions:</strong></td>
                      <td>{totalReceipts} receipts issued</td>
                    </tr>
                    <tr>
                      <td><strong>Payment Methods:</strong></td>
                      <td>Cash</td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td style={{ 
                        color: isCashedOut ? "#059669" : "#f59e0b", 
                        fontWeight: "bold" 
                      }}>
                        {sessionStatus}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="signature-section">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">Cashier Signature</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">Admin Signature</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                marginTop: "40px", 
                paddingTop: "20px", 
                borderTop: "2px solid #e2e8f0", 
                textAlign: "center", 
                fontSize: "12px", 
                color: "#64748b" 
              }}>
                <div>Generated by TCMS (Tuition Class Management System)</div>
                <div>This is a computer-generated report and requires proper authorization.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Report ready for printing
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              data-print-btn="true"
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isGenerating
                  ? "bg-slate-400 text-white cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <FaFileInvoice />
                  Print Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SessionEndReportHistory = () => {
  const user = useMemo(() => getUserData(), []);
  const cashierId = user?.userid;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', onlyFinal: false });
  const [selectedReport, setSelectedReport] = useState(null);

  // Helper to get session_id from report
  const getSessionId = (report) => report?.session_id || report?.sessionId || null;

  // Helper to determine session status based on report data
  const getSessionStatus = (report) => {
    if (!report) return 'Unknown';
    
    // If is_final is true, session is closed
    if (report.is_final) return 'Closed';
    
    // If cash_out_amount exists and > 0, it's cashed out
    if (report.cash_out_amount && Number(report.cash_out_amount) > 0) return 'Cashed Out';
    
    // Otherwise it's ongoing
    return 'Ongoing';
  };

  // Load reports and deduplicate by session_id (keep most recent report per session)
  const loadReports = async () => {
    if (!cashierId) return;
    setLoading(true);
    setError(null);
    
    try {
      const res = await sessionAPI.getSessionReportHistory({
        cashierId,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        onlyFinal: filters.onlyFinal,
        limit: 200
      });

      if (res && res.success && Array.isArray(res.data?.reports)) {
        const fetched = res.data.reports;
        
        // Deduplicate by session_id - keep the most recent report_time per session
        const bySession = new Map();
        
        for (const r of fetched) {
          const sid = getSessionId(r);
          if (!sid) continue; // Skip reports without session_id
          
          const existing = bySession.get(sid);
          if (!existing) {
            bySession.set(sid, r);
          } else {
            // Keep the one with the later report_time
            const existingTime = new Date(existing.report_time || 0).getTime();
            const newTime = new Date(r.report_time || 0).getTime();
            if (newTime > existingTime) {
              bySession.set(sid, r);
            }
          }
        }
        
        // Convert to array and sort by report_time descending
        const dedupedReports = Array.from(bySession.values()).sort(
          (a, b) => new Date(b.report_time) - new Date(a.report_time)
        );
        
        setReports(dedupedReports);
      } else {
        setReports([]);
      }
    } catch (e) {
      console.error('loadReports error:', e);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [cashierId]);

  // Merge a saved report into the list (called from other pages after save)
  const mergeSavedReport = (savedReport) => {
    if (!savedReport) return;
    
    const sid = getSessionId(savedReport);
    if (!sid) return;
    
    setReports((prev) => {
      // Remove any existing report with same session_id
      const filtered = prev.filter(r => getSessionId(r) !== sid);
      // Add new report at the top
      filtered.unshift(savedReport);
      // Re-sort by report_time
      return filtered.sort((a, b) => new Date(b.report_time) - new Date(a.report_time));
    });
  };

  // Expose merge function globally so CashierDashboard can call it
  useEffect(() => {
    window.__mergeSavedSessionReport = mergeSavedReport;
    return () => {
      window.__mergeSavedSessionReport = undefined;
    };
  }, []);

  const formatDate = (s) => (s ? new Date(s).toLocaleDateString() : '-');
  const formatDateTime = (s) => (s ? new Date(s).toLocaleString() : '-');
  const formatCurrency = (v) => `LKR ${Number(v || 0).toLocaleString()}`;

  return (
    <DashboardLayout
      userRole="Cashier"
      sidebarItems={cashierSidebarSections}
      customTitle="TCMS"
      customSubtitle={`Cashier Dashboard - ${user?.name || 'Cashier'}`}
    >
      <div className="min-h-screen p-6 bg-gray-50">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FaHistory className="text-emerald-600" />
              Session End Report History
            </h1>
            <p className="text-sm text-gray-600">
              Shows latest report per session (one row per session ID)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadReports}
              className="px-3 py-2 bg-emerald-600 text-white rounded flex items-center gap-2"
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold">From</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">To</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.onlyFinal}
                  onChange={(e) => setFilters({ ...filters, onlyFinal: e.target.checked })}
                />
                Final only
              </label>
            </div>
            <div className="flex items-end justify-end gap-2">
              <button
                onClick={() => {
                  setFilters({ fromDate: '', toDate: '', onlyFinal: false });
                  setTimeout(loadReports, 50);
                }}
                className="px-3 py-2 border rounded"
              >
                Reset
              </button>
              <button onClick={loadReports} className="px-3 py-2 bg-emerald-600 text-white rounded">
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded shadow overflow-auto">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No reports found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Session ID</th>
                  <th className="px-4 py-3 text-left">Session Date</th>
                  <th className="px-4 py-3 text-left">Last Updated</th>
                  <th className="px-4 py-3 text-left">Report Type</th>
                  <th className="px-4 py-3 text-right">Collections</th>
                  <th className="px-4 py-3 text-right">Receipts</th>
                  <th className="px-4 py-3 text-left">Session Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const status = getSessionStatus(r);
                  const statusColor =
                    status === 'Closed'
                      ? 'text-green-700 bg-green-100'
                      : status === 'Cashed Out'
                      ? 'text-blue-700 bg-blue-100'
                      : 'text-yellow-700 bg-yellow-100';

                  return (
                    <tr key={r.report_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{getSessionId(r) || '-'}</td>
                      <td className="px-4 py-3">{formatDate(r.session_date)}</td>
                      <td className="px-4 py-3">{formatDateTime(r.report_time)}</td>
                      <td className="px-4 py-3 capitalize">{r.report_type}</td>
                      <td className="px-4 py-3 text-right">{Number(r.total_collections|| 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{r.total_receipts || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 hover:bg-blue-700 transition-colors"
                            title="View Report"
                          >
                            <FaEye /> View
                          </button>
                          <button
                            onClick={() => {
                              // Trigger print directly by setting selected report and auto-triggering print
                              setSelectedReport(r);
                              setTimeout(() => {
                                // The modal will handle the print automatically
                                const printBtn = document.querySelector('[data-print-btn]');
                                if (printBtn) printBtn.click();
                              }, 300);
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs flex items-center gap-1 hover:bg-emerald-700 transition-colors"
                            title="Download PDF"
                          >
                            <FaDownload /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total sessions shown: <strong className="text-emerald-600">{reports.length}</strong>
        </div>

        {selectedReport && <ViewReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default SessionEndReportHistory;
