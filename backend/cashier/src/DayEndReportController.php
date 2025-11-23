<?php
/**
 * Day End Report Controller
 * Handles day-based reports that aggregate all sessions for a specific date
 */

// Config is loaded by index.php

class DayEndReportController {
    
    /**
     * Generate Day End Report
     * POST /api/reports/day-end/generate
     * Body: {
     *   "report_date": "2025-11-17",
     *   "report_type": "full|summary",
     *   "cashier_id": "C001",
     *   "is_final": true
     * }
     */
    public function generateDayEndReport() {
        try {
            $db = getDBConnection();
            $data = getJsonInput();
            
            if (!isset($data['report_date']) || !isset($data['cashier_id'])) {
                handleError('Missing required fields: report_date and cashier_id', 400);
            }
            
            $reportDate = $data['report_date'];
            $cashierId = $data['cashier_id'];
            $reportType = $data['report_type'] ?? 'full';
            $isFinal = $data['is_final'] ?? false;
            
            // Get all sessions for this date and cashier
            $stmt = $db->prepare("
                SELECT * FROM cashier_sessions 
                WHERE DATE(session_date) = ? 
                AND cashier_id = ?
                ORDER BY first_login_time ASC
            ");
            $stmt->execute([$reportDate, $cashierId]);
            $sessions = $stmt->fetchAll();
            if (empty($sessions)) {
                handleError('No sessions found for this date', 404);
            }
            $cashierName = $sessions[0]['cashier_name'] ?? 'Unknown';

            // Aggregate all session data for this day
            $totalCollections = 0;
            $totalReceipts = 0;
            $totalCashOut = 0;
            $openingBalance = floatval($sessions[0]['opening_balance'] ?? 0);
            $actualClosing = 0;
            $sessionSummaries = [];
            $perClassMap = [];
            $cardSummary = [
                'full_count' => 0,
                'half_count' => 0,
                'free_count' => 0,
                'full_amount' => 0,
                'half_amount' => 0,
                'free_amount' => 0
            ];

            foreach ($sessions as $session) {
                $sessionId = $session['session_id'];
                $sessionStatus = empty($session['day_end_time']) ? 'In Progress' : 'Closed';
                $sessionCollections = floatval($session['total_collections'] ?? 0);
                $sessionReceipts = intval($session['receipts_issued'] ?? 0);

                // Get cash-out for this session
                $stmt = $db->prepare("
                    SELECT MAX(amount) as cash_out_amount 
                    FROM cash_drawer_transactions 
                    WHERE session_id = ? AND transaction_type = 'cash_out'
                ");
                $stmt->execute([$sessionId]);
                $cashOutResult = $stmt->fetch();
                $sessionCashOut = $cashOutResult ? floatval($cashOutResult['cash_out_amount']) : 0;
                $totalCashOut += $sessionCashOut;

                $sessionSummaries[] = [
                    'session_id' => $sessionId,
                    'session_start' => $session['first_login_time'],
                    'session_end' => $session['day_end_time'],
                    'status' => $sessionStatus,
                    'opening_balance' => floatval($session['opening_balance']),
                    'collections' => $sessionCollections,
                    'cash_out' => $sessionCashOut,
                    'receipts' => $sessionReceipts
                ];

                $totalCollections += $sessionCollections;
                $totalReceipts += $sessionReceipts;

                // Aggregate per-class/card-type from session_activities
                $stmt = $db->prepare("
                    SELECT activity_data FROM session_activities
                    WHERE session_id = ?
                    AND activity_type IN ('receipt_issued', 'payment_collected')
                    AND activity_data IS NOT NULL
                ");
                $stmt->execute([$sessionId]);
                $activities = $stmt->fetchAll();
                foreach ($activities as $activity) {
                    $activityData = json_decode($activity['activity_data'], true);
                    if ($activityData) {
                        $classId = $activityData['class_id'] ?? 'unknown';
                        $className = $activityData['class_name'] ?? 'Class ' . $classId;
                        $cardType = strtolower($activityData['card_type'] ?? '');
                        $amount = floatval($activityData['amount'] ?? 0);
                        if (!isset($perClassMap[$classId])) {
                            $perClassMap[$classId] = [
                                'class_id' => $classId,
                                'class_name' => $className,
                                'full_count' => 0,
                                'half_count' => 0,
                                'free_count' => 0,
                                'total_amount' => 0,
                                'transactions' => 0
                            ];
                        }
                        $perClassMap[$classId]['total_amount'] += $amount;
                        $perClassMap[$classId]['transactions']++;
                        if ($cardType === 'full') {
                            $cardSummary['full_count']++;
                            $cardSummary['full_amount'] += $amount;
                            $perClassMap[$classId]['full_count']++;
                        } elseif ($cardType === 'half') {
                            $cardSummary['half_count']++;
                            $cardSummary['half_amount'] += $amount;
                            $perClassMap[$classId]['half_count']++;
                        } elseif ($cardType === 'free') {
                            $cardSummary['free_count']++;
                            $cardSummary['free_amount'] += $amount;
                            $perClassMap[$classId]['free_count']++;
                        }
                    }
                }
            }
            $perClass = array_values($perClassMap);
            
            $sessionIds = [];
            $sessionSummaries = [];
            $totalCashOut = 0;
            
            // Process each session for session summaries
            foreach ($sessions as $session) {
                $sessionIds[] = $session['session_id'];
                
                // Use session's own totals (already tracked in cashier_sessions table)
                $sessionCollections = floatval($session['total_collections'] ?? 0);
                $sessionReceipts = intval($session['receipts_issued'] ?? 0);
                
                // Get cash-out for this session
                $stmt = $db->prepare("
                    SELECT MAX(amount) as cash_out_amount 
                    FROM cash_drawer_transactions 
                    WHERE session_id = ? AND transaction_type = 'cash_out'
                ");
                $stmt->execute([$session['session_id']]);
                $cashOutResult = $stmt->fetch();
                $sessionCashOut = $cashOutResult ? floatval($cashOutResult['cash_out_amount']) : 0;
                $totalCashOut += $sessionCashOut;
                
                // Determine session status
                $sessionStatus = 'Closed';
                if (empty($session['day_end_time']) || $session['day_end_time'] === null) {
                    $sessionStatus = 'In Progress';
                }
                
                $sessionSummaries[] = [
                    'session_id' => $session['session_id'],
                    'session_start' => $session['first_login_time'],
                    'session_end' => $session['day_end_time'],
                    'status' => $sessionStatus,
                    'opening_balance' => floatval($session['opening_balance']),
                    'collections' => $sessionCollections,
                    'cash_out' => $sessionCashOut,
                    'receipts' => $sessionReceipts
                ];
            }

            // Attempt to reconcile totals from the payment database (if available).
            // Some payments may be recorded in `payment_db.financial_records` and not
            // reflected in `session_activities`. If the payment DB is accessible and
            // `session_id` is present on those records, prefer those sums as authoritative.
            $paymentConn = getPaymentDBConnection();
            if ($paymentConn && count($sessionIds) > 0) {
                try {
                    // Build placeholders for IN()
                    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
                    $sql = "SELECT session_id, SUM(amount) as sum_amount, COUNT(DISTINCT transaction_id) as tx_count FROM financial_records WHERE session_id IN ($placeholders) GROUP BY session_id";
                    $pstmt = $paymentConn->prepare($sql);
                    $pstmt->execute($sessionIds);
                    $payments = $pstmt->fetchAll();

                    $paymentsBySession = [];
                    foreach ($payments as $prow) {
                        $sid = $prow['session_id'];
                        $paymentsBySession[$sid] = [
                            'sum' => floatval($prow['sum_amount'] ?? 0),
                            'tx_count' => intval($prow['tx_count'] ?? 0)
                        ];
                    }

                    // Replace per-session collections and receipts when payment DB has authoritative data
                    $reconciledTotal = 0;
                    $reconciledReceipts = 0;
                    foreach ($sessionSummaries as &$ss) {
                        $sid = $ss['session_id'];
                        if (isset($paymentsBySession[$sid])) {
                            $ss['collections'] = $paymentsBySession[$sid]['sum'];
                            // Use the distinct transaction count from payment DB as receipts issued
                            $ss['receipts'] = intval($paymentsBySession[$sid]['tx_count']);
                        }
                        $reconciledTotal += floatval($ss['collections']);
                        $reconciledReceipts += intval($ss['receipts'] ?? 0);
                    }

                    // If we found any payments, use the reconciled totals as the day's authoritative values
                    if ($reconciledTotal > 0) {
                        $totalCollections = $reconciledTotal;
                    }
                    if ($reconciledReceipts > 0) {
                        $totalReceipts = $reconciledReceipts;
                    }
                    // Additionally, if payment DB contains detailed records, try to derive
                    // per-class aggregates and card issuance summary from those rows so
                    // the UI can display card counts even when session_activities are missing.
                    try {
                        $detailSql = "SELECT * FROM financial_records WHERE session_id IN ($placeholders) AND type = 'income' AND status = 'paid'";
                        $dstmt = $paymentConn->prepare($detailSql);
                        $dstmt->execute($sessionIds);
                        $detailRows = $dstmt->fetchAll();

                        if (!empty($detailRows)) {
                            // Reset/prepare maps derived from payment DB
                            $perClassMapFromPayments = [];
                            $cardSummaryFromPayments = [
                                'full_count' => 0,
                                'half_count' => 0,
                                'free_count' => 0,
                                'full_amount' => 0,
                                'half_amount' => 0,
                                'free_amount' => 0
                            ];

                            foreach ($detailRows as $prow) {
                                $classId = $prow['class_id'] ?? 'unknown';
                                $className = $prow['class_name'] ?? ('Class ' . $classId);
                                $amount = floatval($prow['amount'] ?? 0);
                                $paymentType = $prow['payment_type'] ?? '';
                                $notes = strtolower($prow['notes'] ?? '');
                                if (!isset($perClassMapFromPayments[$classId])) {
                                    $perClassMapFromPayments[$classId] = [
                                        'class_id' => $classId,
                                        'class_name' => $className,
                                        'full_count' => 0,
                                        'half_count' => 0,
                                        'free_count' => 0,
                                        'total_amount' => 0,
                                        'transactions' => 0,
                                        'admission_fee' => 0
                                    ];
                                }

                                $perClassMapFromPayments[$classId]['total_amount'] += $amount;
                                $perClassMapFromPayments[$classId]['transactions']++;

                                // If this payment is explicitly an admission_fee OR notes mention admission,
                                // record the amount under admission_fee so Day End reports can surface it.
                                if ($paymentType === 'admission_fee' || strpos($notes, 'admission') !== false) {
                                    $perClassMapFromPayments[$classId]['admission_fee'] += $amount;
                                }

                                // Only analyze card-type for class payments (admission fees usually not card-typed)
                                if ($paymentType === 'class_payment') {
                                    // Determine card type similar to PaymentController logic
                                    $isFreeCard = false;
                                    $isHalfCard = false;

                                    if (strpos($notes, 'full free card') !== false || strpos($notes, '100%') !== false || strpos($notes, '100 %') !== false) {
                                        $isFreeCard = true;
                                    } elseif ($amount == 0 && (strpos($notes, 'free card') !== false || strpos($notes, 'complimentary') !== false || strpos($notes, 'free') !== false)) {
                                        $isFreeCard = true;
                                    }

                                    if (!$isFreeCard) {
                                        if (strpos($notes, 'half free card') !== false || strpos($notes, '50%') !== false || strpos($notes, '50 %') !== false || (strpos($notes, 'half') !== false && strpos($notes, 'discount') !== false)) {
                                            $isHalfCard = true;
                                        }
                                    }

                                    if ($isFreeCard) {
                                        $cardSummaryFromPayments['free_count']++;
                                        $cardSummaryFromPayments['free_amount'] += $amount;
                                        $perClassMapFromPayments[$classId]['free_count']++;
                                    } elseif ($isHalfCard) {
                                        $cardSummaryFromPayments['half_count']++;
                                        $cardSummaryFromPayments['half_amount'] += $amount;
                                        $perClassMapFromPayments[$classId]['half_count']++;
                                    } else {
                                        $cardSummaryFromPayments['full_count']++;
                                        $cardSummaryFromPayments['full_amount'] += $amount;
                                        $perClassMapFromPayments[$classId]['full_count']++;
                                    }
                                }
                            }

                            // If we derived anything from payment DB, prefer those per-class/card summaries
                            if (!empty($perClassMapFromPayments)) {
                                // Merge/replace only missing/zero perClass entries to avoid losing server-side session_activities if present
                                if (empty($perClass) || count($perClass) === 0) {
                                    $perClass = array_values($perClassMapFromPayments);
                                } else {
                                    // Merge sums by class id: prefer existing perClass if it has transactions, else use payment-derived
                                    $existingById = [];
                                    foreach ($perClass as $pc) {
                                        $existingById[$pc['class_id'] ?? $pc['class_name']] = $pc;
                                    }
                                    foreach ($perClassMapFromPayments as $cid => $pinfo) {
                                        $key = $cid;
                                        if (!isset($existingById[$key]) || (isset($existingById[$key]) && intval($existingById[$key]['transactions'] ?? 0) === 0)) {
                                            $existingById[$key] = $pinfo;
                                        }
                                    }
                                    $perClass = array_values($existingById);
                                }

                                // If original cardSummary is zero (no session activity), replace with payment-derived
                                $origCountTotal = intval($cardSummary['full_count'] ?? 0) + intval($cardSummary['half_count'] ?? 0) + intval($cardSummary['free_count'] ?? 0);
                                $newCountTotal = intval($cardSummaryFromPayments['full_count']) + intval($cardSummaryFromPayments['half_count']) + intval($cardSummaryFromPayments['free_count']);
                                if ($newCountTotal > 0 && $origCountTotal === 0) {
                                    $cardSummary = $cardSummaryFromPayments;
                                }
                            }
                        }
                    } catch (Exception $e) {
                        // Non-fatal: if detailed payment processing fails, fall back to session activity totals
                        error_log('Failed to extract detailed per-class/card summary from payment DB: ' . $e->getMessage());
                    }
                } catch (PDOException $e) {
                    error_log('Payment DB reconciliation failed: ' . $e->getMessage());
                    // proceed with previously computed totals if payment DB fails
                }
            }
            
            // Calculate closing balance from last session
            $lastSession = end($sessions);
            if ($lastSession) {
                $stmt = $db->prepare("
                    SELECT MAX(amount) as cash_out_amount 
                    FROM cash_drawer_transactions 
                    WHERE session_id = ? AND transaction_type = 'cash_out'
                ");
                $stmt->execute([$lastSession['session_id']]);
                $cashOutResult = $stmt->fetch();
                $actualClosing = $cashOutResult ? floatval($cashOutResult['cash_out_amount']) : 0;
            }
            
            $expectedClosing = $openingBalance + $totalCollections;
            $variance = $actualClosing - $expectedClosing;
            
            // Prepare report data
            $reportData = [
                'sessions' => $sessionSummaries,
                'per_class' => $perClass,
                'card_summary' => $cardSummary
            ];
            
            // Check if report already exists
            $stmt = $db->prepare("
                SELECT report_id FROM day_end_reports 
                WHERE report_date = ? AND cashier_id = ? AND report_type = ?
            ");
            $stmt->execute([$reportDate, $cashierId, $reportType]);
            $existing = $stmt->fetch();
            
            if ($existing && !$isFinal) {
                // Update existing draft report
                $stmt = $db->prepare("
                    UPDATE day_end_reports SET
                        report_time = NOW(),
                        opening_balance = ?,
                        total_collections = ?,
                        total_cash_out = ?,
                        expected_closing = ?,
                        actual_closing = ?,
                        variance = ?,
                        total_receipts = ?,
                        full_cards_issued = ?,
                        half_cards_issued = ?,
                        free_cards_issued = ?,
                        report_data = ?,
                        session_ids = ?,
                        is_final = ?
                    WHERE report_id = ?
                ");
                $stmt->execute([
                    $openingBalance,
                    $totalCollections,
                    $totalCashOut,
                    $expectedClosing,
                    $actualClosing,
                    $variance,
                    $totalReceipts,
                    $cardSummary['full_count'],
                    $cardSummary['half_count'],
                    $cardSummary['free_count'],
                    json_encode($reportData),
                    json_encode($sessionIds),
                    $isFinal ? 1 : 0,
                    $existing['report_id']
                ]);
                
                $reportId = $existing['report_id'];
            } else {
                // Insert new report
                $stmt = $db->prepare("
                    INSERT INTO day_end_reports (
                        report_date,
                        report_time,
                        report_type,
                        cashier_id,
                        cashier_name,
                        opening_balance,
                        total_collections,
                        total_cash_out,
                        expected_closing,
                        actual_closing,
                        variance,
                        total_receipts,
                        full_cards_issued,
                        half_cards_issued,
                        free_cards_issued,
                        report_data,
                        session_ids,
                        is_final,
                        created_by
                    ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->execute([
                    $reportDate,
                    $reportType,
                    $cashierId,
                    $cashierName,
                    $openingBalance,
                    $totalCollections,
                    $totalCashOut,
                    $expectedClosing,
                    $actualClosing,
                    $variance,
                    $totalReceipts,
                    $cardSummary['full_count'],
                    $cardSummary['half_count'],
                    $cardSummary['free_count'],
                    json_encode($reportData),
                    json_encode($sessionIds),
                    $isFinal ? 1 : 0,
                    $cashierId
                ]);
                
                $reportId = $db->lastInsertId();
            }
            
            sendSuccess([
                'report_id' => $reportId,
                'message' => 'Day end report generated successfully',
                'report' => [
                    'report_id' => $reportId,
                    'report_date' => $reportDate,
                    'report_type' => $reportType,
                    'cashier_id' => $cashierId,
                    'cashier_name' => $cashierName,
                    'opening_balance' => $openingBalance,
                    'total_collections' => $totalCollections,
                    'total_cash_out' => $totalCashOut,
                    'expected_closing' => $expectedClosing,
                    'actual_closing' => $actualClosing,
                    'variance' => $variance,
                    'total_receipts' => $totalReceipts,
                    'full_cards_issued' => $cardSummary['full_count'],
                    'half_cards_issued' => $cardSummary['half_count'],
                    'free_cards_issued' => $cardSummary['free_count'],
                    'session_count' => count($sessions),
                    'report_data' => $reportData  // Include full report data
                ]
            ]);
            
        } catch (PDOException $e) {
            error_log("Generate day end report error: " . $e->getMessage());
            handleError('Failed to generate day end report: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get Day End Report History
     * GET /api/reports/day-end/history
     * Query params: ?cashier_id=C001&from_date=2025-01-01&to_date=2025-01-31&only_final=true
     */
    public function getDayEndReportHistory() {
        try {
            $db = getDBConnection();
            $cashierId = $_GET['cashier_id'] ?? null;
            $fromDate = $_GET['from_date'] ?? null;
            $toDate = $_GET['to_date'] ?? null;
            $onlyFinal = isset($_GET['only_final']) && $_GET['only_final'] === 'true';
            $limit = intval($_GET['limit'] ?? 50);
            
            if (!$cashierId) {
                handleError('cashier_id is required', 400);
            }
            
            $query = "SELECT * FROM day_end_reports WHERE cashier_id = ?";
            $params = [$cashierId];
            
            if ($fromDate) {
                $query .= " AND report_date >= ?";
                $params[] = $fromDate;
            }
            
            if ($toDate) {
                $query .= " AND report_date <= ?";
                $params[] = $toDate;
            }
            
            if ($onlyFinal) {
                $query .= " AND is_final = 1";
            }
            
            $query .= " ORDER BY report_date DESC, report_time DESC LIMIT " . $limit;
            
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $reports = $stmt->fetchAll();
            
            sendSuccess([
                'reports' => $reports,
                'count' => count($reports)
            ]);
            
        } catch (PDOException $e) {
            error_log("Get day end report history error: " . $e->getMessage());
            handleError('Failed to fetch day end reports: ' . $e->getMessage(), 500);
        }
    }
}
