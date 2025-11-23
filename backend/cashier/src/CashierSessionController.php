<?php
// Config is loaded by index.php

class CashierSessionController {
    
    /**
     * Start or resume a cashier session for today
     * POST /api/session/start
     * Body: {
     *   "cashier_id": "C001",
     *   "cashier_name": "Bawantha Rathnayake",
     *   "opening_balance": 5000
     * }
     */
    public function startSession() {
        $data = getJsonInput();
        
        // Validate input
        if (!isset($data['cashier_id'])) {
            handleError('Missing required field: cashier_id', 400);
        }
        
        $cashierId = $data['cashier_id'];
        $openingBalance = isset($data['opening_balance']) ? floatval($data['opening_balance']) : 0;
        $today = date('Y-m-d');
        
        // Verify cashier exists in auth database
        if (!verifyCashierUser($cashierId)) {
            handleError('Invalid cashier ID or user is not a cashier', 403);
        }
        
        // Get cashier name from auth database
        $cashierName = isset($data['cashier_name']) ? $data['cashier_name'] : getCashierName($cashierId);
        
        try {
            $db = getDBConnection();
            
            // First, check if there's ANY active or locked session for this cashier (from any date)
            $stmt = $db->prepare("
                SELECT * FROM cashier_sessions 
                WHERE cashier_id = ? AND session_status IN ('active', 'locked')
                ORDER BY session_date DESC, session_id DESC
                LIMIT 1
            ");
            $stmt->execute([$cashierId]);
            $existingSession = $stmt->fetch();
            
            if ($existingSession) {
                // Resume existing session
                $stmt = $db->prepare("
                    UPDATE cashier_sessions 
                    SET last_activity_time = NOW()
                    WHERE session_id = ?
                ");
                $stmt->execute([$existingSession['session_id']]);
                
                // Log login activity
                $this->logActivityInternal($existingSession['session_id'], 'login', [
                    'cashier_name' => $cashierName,
                    'login_time' => date('Y-m-d H:i:s')
                ]);
                
                sendSuccess([
                    'session' => $existingSession,
                    'is_resumed' => true
                ], 'Session resumed successfully');
                
            } else {
                // Create new session
                $stmt = $db->prepare("
                    INSERT INTO cashier_sessions (
                        cashier_id, cashier_name, session_date,
                        first_login_time, opening_balance, cash_drawer_balance
                    ) VALUES (?, ?, ?, NOW(), ?, ?)
                ");
                $stmt->execute([$cashierId, $cashierName, $today, $openingBalance, $openingBalance]);
                $sessionId = $db->lastInsertId();
                
                // Log opening balance transaction
                $stmt = $db->prepare("
                    INSERT INTO cash_drawer_transactions (
                        session_id, transaction_type, amount, balance_after,
                        notes, created_by
                    ) VALUES (?, 'opening_balance', ?, ?, 'Initial cash drawer opening balance', ?)
                ");
                $stmt->execute([$sessionId, $openingBalance, $openingBalance, $cashierId]);
                
                // Log login activity
                $this->logActivityInternal($sessionId, 'login', [
                    'cashier_name' => $cashierName,
                    'login_time' => date('Y-m-d H:i:s')
                ]);
                
                // Get the created session
                $stmt = $db->prepare("SELECT * FROM cashier_sessions WHERE session_id = ?");
                $stmt->execute([$sessionId]);
                $newSession = $stmt->fetch();
                
                sendSuccess([
                    'session' => $newSession,
                    'is_resumed' => false
                ], 'New session started successfully');
            }
            
        } catch (PDOException $e) {
            error_log("Start session error: " . $e->getMessage());
            handleError('Failed to start session: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get current session for a cashier
     * If date parameter is provided, checks for session on that specific date
     * If date is today or not provided, returns ANY active session (even from previous dates)
     * GET /api/session/current?cashier_id=C00001&date=2025-10-18
     */
    public function getCurrentSession() {
        $cashierId = $_GET['cashier_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');
        $today = date('Y-m-d');
        
        if (!$cashierId) {
            handleError('Missing required parameter: cashier_id', 400);
        }
        
        try {
            $db = getDBConnection();
            
            // Server-authoritative behavior: first return ANY active/locked session for
            // this cashier regardless of the date provided by the client. This avoids
            // client timezone or date formatting issues causing the client to believe
            // there is no session when one is active on the server.
            $stmt = $db->prepare("
                SELECT * FROM cashier_sessions 
                WHERE cashier_id = ? AND session_status IN ('active', 'locked')
                ORDER BY session_date DESC, session_id DESC
                LIMIT 1
            ");
            $stmt->execute([$cashierId]);
            $session = $stmt->fetch();

            // If no active session exists, and a specific date was requested, attempt
            // to find a session for that historical date (useful for admin lookups).
            if (!$session && $date) {
                $stmt = $db->prepare("
                    SELECT * FROM cashier_sessions 
                    WHERE cashier_id = ? AND session_date = ? AND session_status IN ('active', 'locked')
                    ORDER BY session_id DESC
                    LIMIT 1
                ");
                $stmt->execute([$cashierId, $date]);
                $session = $stmt->fetch();
            }
            
            if ($session) {
                
                // Get recent activities
                $stmt = $db->prepare("
                    SELECT * FROM session_activities 
                    WHERE session_id = ? 
                    ORDER BY activity_time DESC 
                    LIMIT 10
                ");
                $stmt->execute([$session['session_id']]);
                $activities = $stmt->fetchAll();
                
                // Check if cash-out already recorded for this session and get the amount
                $stmt = $db->prepare("
                    SELECT COUNT(*) as cash_out_count, MAX(amount) as cash_out_amount 
                    FROM cash_drawer_transactions 
                    WHERE session_id = ? AND transaction_type = 'cash_out'
                ");
                $stmt->execute([$session['session_id']]);
                $cashOutResult = $stmt->fetch();
                $isCashedOut = ($cashOutResult['cash_out_count'] > 0);
                $cashOutAmount = $isCashedOut ? floatval($cashOutResult['cash_out_amount']) : null;
                
                sendSuccess([
                    'session' => $session,
                    'recent_activities' => $activities,
                    'is_cashed_out' => $isCashedOut,
                    'cash_out_amount' => $cashOutAmount
                ], 'Session retrieved successfully');
            } else {
                sendSuccess([
                    'session' => null
                ], 'No session found for today');
            }
            
        } catch (PDOException $e) {
            error_log("Get session error: " . $e->getMessage());
            handleError('Failed to get session: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get active session for a cashier (explicit endpoint)
     * GET /api/session/active?cashier_id=C001
     * This endpoint always returns any active/locked session for the cashier,
     * ignoring client-supplied dates. Useful for clients that want a simple
     * server-authoritative check whether a cashier has an open session.
     */
    public function getActiveSession() {
        $cashierId = $_GET['cashier_id'] ?? null;

        if (!$cashierId) {
            handleError('Missing required parameter: cashier_id', 400);
        }

        try {
            $db = getDBConnection();

            $stmt = $db->prepare("\n                SELECT * FROM cashier_sessions 
                WHERE cashier_id = ? AND session_status IN ('active', 'locked')
                ORDER BY session_date DESC, session_id DESC
                LIMIT 1
            ");
            $stmt->execute([$cashierId]);
            $session = $stmt->fetch();

            if ($session) {
                // recent activities
                $stmt = $db->prepare("SELECT * FROM session_activities WHERE session_id = ? ORDER BY activity_time DESC LIMIT 10");
                $stmt->execute([$session['session_id']]);
                $activities = $stmt->fetchAll();

                // cash out
                $stmt = $db->prepare("SELECT COUNT(*) as cash_out_count, MAX(amount) as cash_out_amount FROM cash_drawer_transactions WHERE session_id = ? AND transaction_type = 'cash_out'");
                $stmt->execute([$session['session_id']]);
                $cashOutResult = $stmt->fetch();
                $isCashedOut = ($cashOutResult['cash_out_count'] > 0);
                $cashOutAmount = $isCashedOut ? floatval($cashOutResult['cash_out_amount']) : null;

                sendSuccess([
                    'session' => $session,
                    'recent_activities' => $activities,
                    'is_cashed_out' => $isCashedOut,
                    'cash_out_amount' => $cashOutAmount
                ], 'Active session retrieved successfully');
            } else {
                sendSuccess(['session' => null], 'No active session found');
            }

        } catch (PDOException $e) {
            error_log("Get active session error: " . $e->getMessage());
            handleError('Failed to get active session: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update session KPIs
     * POST /api/session/update-kpis
     * Body: {
     *   "session_id": 123,
     *   "total_collections": 18500,
     *   "receipts_issued": 6,
     *   "pending_payments": 3,
     *   "cash_drawer_balance": 23500
     * }
     */
    public function updateKPIs() {
        $data = getJsonInput();
        
        if (!isset($data['session_id'])) {
            handleError('Missing required field: session_id', 400);
        }
        
        $sessionId = $data['session_id'];
        
        try {
            $db = getDBConnection();
            
            // Build update query dynamically based on provided fields
            $updates = [];
            $params = [];
            
            if (isset($data['total_collections'])) {
                $updates[] = "total_collections = ?";
                $params[] = floatval($data['total_collections']);
            }
            if (isset($data['receipts_issued'])) {
                $updates[] = "receipts_issued = ?";
                $params[] = intval($data['receipts_issued']);
            }
            if (isset($data['pending_payments'])) {
                $updates[] = "pending_payments = ?";
                $params[] = intval($data['pending_payments']);
            }
            if (isset($data['cash_drawer_balance'])) {
                $updates[] = "cash_drawer_balance = ?";
                $params[] = floatval($data['cash_drawer_balance']);
            }
            
            if (empty($updates)) {
                handleError('No fields to update', 400);
            }
            
            $updates[] = "last_activity_time = NOW()";
            $params[] = $sessionId;
            
            $sql = "UPDATE cashier_sessions SET " . implode(', ', $updates) . " WHERE session_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            sendSuccess([
                'updated_at' => date('Y-m-d H:i:s')
            ], 'KPIs updated successfully');
            
        } catch (PDOException $e) {
            error_log("Update KPIs error: " . $e->getMessage());
            handleError('Failed to update KPIs: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Log a session activity
     * POST /api/session/activity
     * Body: {
     *   "session_id": 123,
     *   "activity_type": "payment_collected",
     *   "activity_data": {...},
     *   "amount": 4500,
     *   "student_id": "S02950",
     *   "transaction_id": "TXN123"
     * }
     */
    public function logActivity() {
        $data = getJsonInput();
        
        if (!isset($data['session_id']) || !isset($data['activity_type'])) {
            handleError('Missing required fields: session_id, activity_type', 400);
        }
        
        $sessionId = $data['session_id'];
        $activityType = $data['activity_type'];
        $activityData = isset($data['activity_data']) ? json_encode($data['activity_data']) : null;
        $amount = isset($data['amount']) ? floatval($data['amount']) : null;
        $studentId = $data['student_id'] ?? null;
        $transactionId = $data['transaction_id'] ?? null;
        
        try {
            $activityId = $this->logActivityInternal(
                $sessionId, 
                $activityType, 
                $activityData ? json_decode($activityData, true) : null,
                $amount,
                $studentId,
                $transactionId
            );
            
            sendSuccess([
                'activity_id' => $activityId
            ], 'Activity logged successfully');
            
        } catch (PDOException $e) {
            error_log("Log activity error: " . $e->getMessage());
            handleError('Failed to log activity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record a cash-out (physical count) WITHOUT closing the session
     * POST /api/session/cash-out
     * Body: {
     *   "session_id": 123,
     *   "closing_balance": 25000,
     *   "denomination_breakdown": "{...}",
     *   "expected_balance": 25500,
     *   "variance_amount": -500,
     *   "variance_percentage": -1.96,
     *   "variance_status": "SHORTAGE",
     *   "next_opening_balance": 0,
     *   "notes": "Partial cash-out recorded"
     * }
     */
    public function recordCashOut() {
        $data = getJsonInput();
        
        error_log("🔍 === CASH-OUT REQUEST START ===");
        error_log("📥 Request data: " . json_encode($data));

        if (!isset($data['session_id'])) {
            handleError('Missing required field: session_id', 400);
        }

        $sessionId = $data['session_id'];
        $closingBalance = isset($data['closing_balance']) ? floatval($data['closing_balance']) : null;
        $expectedBalance = isset($data['expected_balance']) ? floatval($data['expected_balance']) : null;
        $varianceAmount = isset($data['variance_amount']) ? floatval($data['variance_amount']) : null;
        $variancePercentage = $data['variance_percentage'] ?? null;
        $varianceStatus = $data['variance_status'] ?? 'UNKNOWN';
        $denominationBreakdown = $data['denomination_breakdown'] ?? null;
        $notes = $data['notes'] ?? 'Cash out recorded';
        
        $nextOpeningBalance = isset($data['next_opening_balance']) ? floatval($data['next_opening_balance']) : null;
        error_log("💰 Key values - session_id: $sessionId, closing: $closingBalance, expected: $expectedBalance, next_opening: $nextOpeningBalance");

        try {
            $db = getDBConnection();

            // Get session details
            $stmt = $db->prepare("SELECT * FROM cashier_sessions WHERE session_id = ?");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch();

            if (!$session) {
                handleError('Session not found', 404);
            }

            // 🔥 CRITICAL FIX: Capture complete session data BEFORE cash-out clears anything
            error_log("📸 CAPTURING SESSION SNAPSHOT before cash-out...");
            try {
                // Use the payment-backend HTTP API to get cashier stats instead of including files across containers.
                $paymentUrl = "http://payment-backend/get_cashier_stats?cashierId=" . urlencode($session['cashier_id']) . "&period=session&sessionId=" . urlencode($sessionId);
                error_log("🔍 Fetching cashier stats from payment-backend: $paymentUrl");

                $context = stream_context_create([
                    'http' => [ 'method' => 'GET', 'timeout' => 5 ]
                ]);

                $resp = @file_get_contents($paymentUrl, false, $context);

                $stats = [];
                $transactions = [];
                $perClass = [];

                if ($resp === false) {
                    error_log("❌ Failed to fetch cashier stats from payment-backend");
                } else {
                    $json = json_decode($resp, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        error_log('Invalid JSON from payment-backend: ' . json_last_error_msg());
                    } elseif (isset($json['success']) && $json['success'] && isset($json['data'])) {
                        $stats = $json['data']['stats'] ?? [];
                        $transactions = $json['data']['transactions'] ?? [];
                        $perClass = $json['data']['perClass'] ?? [];
                    } else {
                        error_log('⚠️ payment-backend returned error: ' . ($json['message'] ?? json_encode($json)));
                    }
                }

                // Build complete report data with all session information
                $snapshotData = [
                    'card_summary' => [
                        'full_count' => intval($stats['full_cards_issued'] ?? 0),
                        'full_amount' => floatval($stats['full_cards_amount'] ?? 0),
                        'half_count' => intval($stats['half_cards_issued'] ?? 0),
                        'half_amount' => floatval($stats['half_cards_amount'] ?? 0),
                        'free_count' => intval($stats['free_cards_issued'] ?? 0),
                        'free_amount' => floatval($stats['free_cards_amount'] ?? 0)
                    ],
                    'per_class' => $perClass,
                    'transactions' => $transactions,
                    'total_collections' => floatval($stats['total_collected'] ?? 0),
                    'total_receipts' => intval($stats['total_receipts'] ?? 0),
                    'admission_fees_total' => floatval($stats['admission_fees'] ?? 0),
                    'captured_at' => date('Y-m-d H:i:s'),
                    'capture_reason' => 'auto_snapshot_on_cashout'
                ];

                // Auto-save this snapshot as a session report
                $stmt = $db->prepare("INSERT INTO session_end_reports (
                    session_id, report_date, report_time, report_type,
                    cashier_id, cashier_name, session_date,
                    session_start_time, opening_balance,
                    total_collections, total_receipts, cash_out_amount,
                    expected_closing, variance,
                    full_cards_issued, half_cards_issued, free_cards_issued,
                    report_data, is_final, created_by
                ) VALUES (?, CURDATE(), NOW(), 'auto_cashout_snapshot', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)");

                $expectedClosing = floatval($session['opening_balance']) + $snapshotData['total_collections'];
                $variance = $closingBalance ? ($closingBalance - $expectedClosing) : 0;

                $stmt->execute([
                    $sessionId,
                    $session['cashier_id'],
                    $session['cashier_name'],
                    $session['session_date'],
                    $session['first_login_time'],
                    floatval($session['opening_balance']),
                    $snapshotData['total_collections'],
                    $snapshotData['total_receipts'],
                    $closingBalance,
                    $expectedClosing,
                    $variance,
                    $snapshotData['card_summary']['full_count'],
                    $snapshotData['card_summary']['half_count'],
                    $snapshotData['card_summary']['free_count'],
                    json_encode($snapshotData),
                    $session['cashier_id']
                ]);

                error_log("✅ AUTO-SNAPSHOT SAVED: Collections=" . $snapshotData['total_collections'] . ", Receipts=" . $snapshotData['total_receipts'] . ", Classes=" . count($perClass) . ", Transactions=" . count($transactions));
            } catch (Exception $e) {
                error_log("❌ SNAPSHOT CAPTURE FAILED: " . $e->getMessage());
                // Continue with cash-out even if snapshot fails
            }

            // Create a cash_drawer_transactions record for the cash-out (no closing)
            $transactionNotes = "=== CASH OUT RECORD ===\n";
            $transactionNotes .= "Expected Balance: LKR " . number_format($expectedBalance, 2) . "\n";
            $transactionNotes .= "Physical Count: LKR " . number_format($closingBalance, 2) . "\n";
            $transactionNotes .= "Variance: LKR " . number_format($varianceAmount, 2) . " (" . $variancePercentage . "%)\n";
            $transactionNotes .= "Status: " . $varianceStatus . "\n";

            if ($denominationBreakdown) {
                $transactionNotes .= "\n--- Denomination Breakdown ---\n";
                $breakdown = is_array($denominationBreakdown) ? $denominationBreakdown : json_decode($denominationBreakdown, true);
                if ($breakdown && isset($breakdown['bills'])) {
                    $transactionNotes .= "Bills:\n";
                    foreach ($breakdown['bills'] as $denom => $count) {
                        if ($count > 0) {
                            $transactionNotes .= "  LKR $denom × $count = LKR " . ($denom * $count) . "\n";
                        }
                    }
                }
                if ($breakdown && isset($breakdown['coins'])) {
                    $transactionNotes .= "Coins:\n";
                    foreach ($breakdown['coins'] as $denom => $count) {
                        if ($count > 0) {
                            $transactionNotes .= "  LKR $denom × $count = LKR " . ($denom * $count) . "\n";
                        }
                    }
                }
            }

            $transactionNotes .= "\n" . $notes;

            $stmt = $db->prepare("
                INSERT INTO cash_drawer_transactions (
                    session_id, transaction_type, amount, balance_after,
                    notes, created_by
                ) VALUES (?, 'cash_out', ?, ?, ?, ?)
            ");
            $stmt->execute([
                $sessionId,
                $closingBalance,
                $closingBalance,
                $transactionNotes,
                $session['cashier_id']
            ]);

            // If frontend provided a next opening balance (remaining left in drawer),
            // persist it to the session's cash_drawer_balance so KPIs / next session
            // can read the expected starting amount.
            if (isset($data['next_opening_balance'])) {
                $nextOpen = floatval($data['next_opening_balance']);
                error_log("💾 Updating cash_drawer_balance to: $nextOpen for session: $sessionId");
                try {
                    $updateStmt = $db->prepare("UPDATE cashier_sessions SET cash_drawer_balance = ?, last_activity_time = NOW() WHERE session_id = ?");
                    $updateStmt->execute([$nextOpen, $sessionId]);
                    $rowsAffected = $updateStmt->rowCount();
                    error_log("✅ Database UPDATE executed. Rows affected: $rowsAffected");
                    
                    // Immediately verify the update
                    $verifyStmt = $db->prepare("SELECT cash_drawer_balance, last_activity_time FROM cashier_sessions WHERE session_id = ?");
                    $verifyStmt->execute([$sessionId]);
                    $verifyResult = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                    if ($verifyResult) {
                        error_log("✅ VERIFIED in database: cash_drawer_balance = " . $verifyResult['cash_drawer_balance'] . ", updated_at: " . $verifyResult['last_activity_time']);
                    } else {
                        error_log("❌ VERIFICATION FAILED: Could not fetch session after update!");
                    }
                } catch (PDOException $e) {
                    error_log("❌ Failed to persist next_opening_balance for session $sessionId: " . $e->getMessage());
                    // don't fail the operation because persisting next opening balance failed
                }
            } else {
                error_log("⚠️ next_opening_balance NOT PROVIDED in request data!");
            }

            // Log cash out activity (using cash_drawer_closed type)
            $this->logActivityInternal($sessionId, 'cash_drawer_closed', [
                'closing_balance' => $closingBalance,
                'expected_balance' => $expectedBalance,
                'variance_amount' => $varianceAmount,
                'variance_percentage' => $variancePercentage,
                'variance_status' => $varianceStatus,
                'denomination_breakdown' => $denominationBreakdown,
                'notes' => $notes,
                'recorded_at' => date('Y-m-d H:i:s'),
                'action' => 'cash_out_recorded'
            ]);

            sendSuccess([
                'message' => 'Cash out recorded successfully'
            ], 'Cash out recorded');

        } catch (PDOException $e) {
            error_log("Record cash out error: " . $e->getMessage());
            handleError('Failed to record cash out: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Internal method to log activity
     */
    private function logActivityInternal($sessionId, $activityType, $activityData = null, $amount = null, $studentId = null, $transactionId = null) {
        $db = getDBConnection();
        
        $stmt = $db->prepare("
            INSERT INTO session_activities (
                session_id, activity_type, activity_data,
                amount, student_id, transaction_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $sessionId,
            $activityType,
            $activityData ? json_encode($activityData) : null,
            $amount,
            $studentId,
            $transactionId
        ]);
        
        return $db->lastInsertId();
    }
    
    /**
     * Close day end session
     * POST /api/session/close-day
     * Body: {
     *   "session_id": 123,
     *   "closing_balance": 25000,
     *   "notes": "Day ended successfully"
     * }
     */
    public function closeDay() {
        $data = getJsonInput();

        if (!isset($data['session_id'])) {
            handleError('Missing required field: session_id', 400);
        }

        $sessionId = $data['session_id'];
        $closingBalance = isset($data['closing_balance']) ? floatval($data['closing_balance']) : 0;
        $expectedBalance = isset($data['expected_balance']) ? floatval($data['expected_balance']) : null;
        $varianceAmount = isset($data['variance_amount']) ? floatval($data['variance_amount']) : 0;
        $variancePercentage = $data['variance_percentage'] ?? null;
        $varianceStatus = $data['variance_status'] ?? 'UNKNOWN';
        $denominationBreakdown = $data['denomination_breakdown'] ?? null;
        $managerOverride = $data['manager_override'] ?? null;
        $notes = $data['notes'] ?? 'Day ended';

        try {
            $db = getDBConnection();

            // Use a transaction to ensure atomic update + insert
            $db->beginTransaction();

            // Get session details
            $stmt = $db->prepare("SELECT * FROM cashier_sessions WHERE session_id = ? FOR UPDATE");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch();

            if (!$session) {
                $db->rollBack();
                handleError('Session not found', 404);
            }

            // Defensive: ensure numeric values are present
            $openingBalance = isset($session['opening_balance']) ? floatval($session['opening_balance']) : 0;
            $totalCollections = isset($session['total_collections']) ? floatval($session['total_collections']) : 0;

            // Update session state
            $updateStmt = $db->prepare(
                "UPDATE cashier_sessions SET closing_balance = ?, day_end_time = NOW(), session_status = 'closed', last_activity_time = NOW() WHERE session_id = ?"
            );
            $updateStmt->execute([$closingBalance, $sessionId]);

            // Build transaction notes
            $transactionNotes = "=== DAY END RECONCILIATION ===\n";
            $transactionNotes .= "Expected Balance: LKR " . number_format($expectedBalance ?? ($openingBalance + $totalCollections), 2) . "\n";
            $transactionNotes .= "Physical Count: LKR " . number_format($closingBalance, 2) . "\n";
            $transactionNotes .= "Variance: LKR " . number_format($varianceAmount, 2) . " (" . ($variancePercentage ?? 'N/A') . "%)\n";
            $transactionNotes .= "Status: " . $varianceStatus . "\n";

            if ($denominationBreakdown) {
                $transactionNotes .= "\n--- Denomination Breakdown ---\n";
                $breakdown = is_array($denominationBreakdown) ? $denominationBreakdown : json_decode($denominationBreakdown, true);
                if ($breakdown && isset($breakdown['bills'])) {
                    $transactionNotes .= "Bills:\n";
                    foreach ($breakdown['bills'] as $denom => $count) {
                        if ($count > 0) {
                            $transactionNotes .= "  LKR $denom × $count = LKR " . ($denom * $count) . "\n";
                        }
                    }
                }
                if ($breakdown && isset($breakdown['coins'])) {
                    $transactionNotes .= "Coins:\n";
                    foreach ($breakdown['coins'] as $denom => $count) {
                        if ($count > 0) {
                            $transactionNotes .= "  LKR $denom × $count = LKR " . ($denom * $count) . "\n";
                        }
                    }
                }
            }

            if ($managerOverride) {
                $transactionNotes .= "\n🔐 MANAGER OVERRIDE APPROVED\n";
                $transactionNotes .= "Significant variance approved by management.\n";
            }

            $transactionNotes .= "\n" . $notes;

            // Insert closing balance transaction
            $insStmt = $db->prepare(
                "INSERT INTO cash_drawer_transactions (session_id, transaction_type, amount, balance_after, notes, created_by) VALUES (?, 'closing_balance', ?, ?, ?, ?)"
            );
            $insStmt->execute([
                $sessionId,
                $closingBalance,
                $closingBalance,
                $transactionNotes,
                $session['cashier_id']
            ]);

            // Persist next opening balance if provided
            if (isset($data['next_opening_balance'])) {
                $nextOpen = floatval($data['next_opening_balance']);
                try {
                    $updateNext = $db->prepare("UPDATE cashier_sessions SET cash_drawer_balance = ? WHERE session_id = ?");
                    $updateNext->execute([$nextOpen, $sessionId]);
                } catch (PDOException $e) {
                    error_log("Failed to persist next_opening_balance for session $sessionId: " . $e->getMessage());
                    // continue - don't fail day-end due to this
                }
            }

            // Log day end activity
            $this->logActivityInternal($sessionId, 'day_end_report', [
                'closing_balance' => $closingBalance,
                'expected_balance' => $expectedBalance,
                'variance_amount' => $varianceAmount,
                'variance_percentage' => $variancePercentage,
                'variance_status' => $varianceStatus,
                'denomination_breakdown' => $denominationBreakdown,
                'manager_override' => $managerOverride ? true : false,
                'notes' => $notes,
                'day_end_time' => date('Y-m-d H:i:s')
            ]);

            // Prepare enhanced report with safe DateTime handling
            try {
                if (!empty($session['first_login_time'])) {
                    $firstLogin = new DateTime($session['first_login_time']);
                } else {
                    // Fallback to session_date at midnight
                    $firstLogin = new DateTime($session['session_date'] . ' 00:00:00');
                }
            } catch (Exception $e) {
                error_log('Invalid first_login_time, using session_date fallback: ' . $e->getMessage());
                $firstLogin = new DateTime($session['session_date'] . ' 00:00:00');
            }

            $dayEnd = new DateTime();
            $hoursActive = $firstLogin->diff($dayEnd);

            $difference = $closingBalance - $openingBalance;
            $calculatedDiscrepancy = $difference - $totalCollections;

            $report = [
                'session_date' => $session['session_date'],
                'first_login' => $firstLogin->format('h:i A'),
                'day_end' => $dayEnd->format('h:i A'),
                'total_hours' => $hoursActive->format('%h hours %i minutes'),
                'total_collections' => floatval($totalCollections),
                'receipts_issued' => intval($session['receipts_issued'] ?? 0),
                'pending_payments' => intval($session['pending_payments'] ?? 0),
                'opening_balance' => floatval($openingBalance),
                'closing_balance' => $closingBalance,
                'expected_balance' => $expectedBalance,
                'difference' => $difference,
                'discrepancy' => $calculatedDiscrepancy,
                'variance_amount' => $varianceAmount,
                'variance_percentage' => $variancePercentage,
                'variance_status' => $varianceStatus,
                'manager_approved' => $managerOverride ? true : false,
                'status' => $varianceStatus
            ];

            $db->commit();

            $successMessage = 'Day ended successfully';
            if ($varianceStatus === 'BALANCED') {
                $successMessage .= ' - Cash drawer balanced';
            } elseif ($managerOverride) {
                $successMessage .= ' - Variance approved by manager';
            }

            sendSuccess([
                'report' => $report
            ], $successMessage);

        } catch (Exception $e) {
            // Ensure rollback on any error
            try { if (isset($db) && $db->inTransaction()) $db->rollBack(); } catch (Exception $ex) {}
            error_log("Close day error: " . $e->getMessage());
            handleError('Failed to close day: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Lock session
     * POST /api/session/lock
     * Body: { "session_id": 123 }
     */
    public function lockSession() {
        $data = getJsonInput();
        
        if (!isset($data['session_id'])) {
            handleError('Missing required field: session_id', 400);
        }
        
        try {
            $db = getDBConnection();
            
            $stmt = $db->prepare("
                UPDATE cashier_sessions 
                SET session_status = 'locked', last_activity_time = NOW()
                WHERE session_id = ?
            ");
            $stmt->execute([$data['session_id']]);
            
            $this->logActivityInternal($data['session_id'], 'lock');
            
            sendSuccess([], 'Session locked successfully');
            
        } catch (PDOException $e) {
            error_log("Lock session error: " . $e->getMessage());
            handleError('Failed to lock session: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Unlock session
     * POST /api/session/unlock
     * Body: { "session_id": 123 }
     */
    public function unlockSession() {
        $data = getJsonInput();
        
        if (!isset($data['session_id'])) {
            handleError('Missing required field: session_id', 400);
        }
        
        try {
            $db = getDBConnection();
            
            $stmt = $db->prepare("
                UPDATE cashier_sessions 
                SET session_status = 'active', last_activity_time = NOW()
                WHERE session_id = ?
            ");
            $stmt->execute([$data['session_id']]);
            
            $this->logActivityInternal($data['session_id'], 'unlock');
            
            sendSuccess([], 'Session unlocked successfully');
            
        } catch (PDOException $e) {
            error_log("Unlock session error: " . $e->getMessage());
            handleError('Failed to unlock session: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Save Session End Report to database
     * POST /api/reports/save-session-report
     * Body: {
     *   "session_id": 123,
     *   "report_type": "full",
     *   "report_data": {...},
     *   "is_final": true
     * }
     */
    public function saveSessionReport() {
        $data = getJsonInput();
        
        if (!isset($data['session_id']) || !isset($data['report_data'])) {
            handleError('Missing required fields: session_id, report_data', 400);
        }
        
        try {
            $db = getDBConnection();
            
            // Get session details
            $stmt = $db->prepare("
                SELECT * FROM cashier_sessions WHERE session_id = ?
            ");
            $stmt->execute([$data['session_id']]);
            $session = $stmt->fetch();
            
            if (!$session) {
                handleError('Session not found', 404);
            }
            
            // Get cash-out amount
            $stmt = $db->prepare("
                SELECT MAX(amount) as cash_out_amount 
                FROM cash_drawer_transactions 
                WHERE session_id = ? AND transaction_type = 'cash_out'
            ");
            $stmt->execute([$data['session_id']]);
            $cashOutResult = $stmt->fetch();
            $cashOutAmount = $cashOutResult ? floatval($cashOutResult['cash_out_amount']) : null;
            
            // Calculate expected closing and variance
            $openingBalance = floatval($session['opening_balance']);
            $totalCollections = floatval($session['total_collections']);
            $expectedClosing = $openingBalance + $totalCollections;
            $variance = $cashOutAmount ? ($cashOutAmount - $expectedClosing) : 0;
            
            // Extract card counts from report data
            $reportData = $data['report_data'];
            $fullCards = isset($reportData['card_summary']['full_count']) ? intval($reportData['card_summary']['full_count']) : 0;
            $halfCards = isset($reportData['card_summary']['half_count']) ? intval($reportData['card_summary']['half_count']) : 0;
            $freeCards = isset($reportData['card_summary']['free_count']) ? intval($reportData['card_summary']['free_count']) : 0;

            // Compute admission fee totals for this session and per-class so snapshots include them
            try {
                $stmt = $db->prepare("SELECT COALESCE(SUM(amount),0) as total FROM financial_records WHERE session_id = ? AND payment_type = 'admission_fee' AND status = 'paid'");
                $stmt->execute([$data['session_id']]);
                $adRow = $stmt->fetch();
                $admissionFeesTotal = $adRow ? floatval($adRow['total']) : 0;

                // Per-class admission totals
                $stmt = $db->prepare("SELECT class_id, class_name, COALESCE(SUM(amount),0) as total FROM financial_records WHERE session_id = ? AND payment_type = 'admission_fee' AND status = 'paid' GROUP BY class_id, class_name");
                $stmt->execute([$data['session_id']]);
                $adPerClassRows = $stmt->fetchAll();
                $admissionMap = [];
                foreach ($adPerClassRows as $r) {
                    $key = $r['class_id'] ?: ($r['class_name'] ?: 'Unspecified');
                    $admissionMap[$key] = floatval($r['total']);
                }

                // Attach totals into reportData
                $reportData['admission_fees_total'] = $admissionFeesTotal;

                if (isset($reportData['per_class']) && is_array($reportData['per_class'])) {
                    foreach ($reportData['per_class'] as &$pc) {
                        $cid = $pc['class_id'] ?? null;
                        $cname = $pc['class_name'] ?? ($pc['className'] ?? null);
                        $found = 0;
                        if ($cid && isset($admissionMap[$cid])) {
                            $pc['admission_fee'] = $admissionMap[$cid];
                            $found = 1;
                        } elseif ($cname && isset($admissionMap[$cname])) {
                            $pc['admission_fee'] = $admissionMap[$cname];
                            $found = 1;
                        }
                        if (!$found) {
                            $pc['admission_fee'] = isset($pc['admission_fee']) ? $pc['admission_fee'] : 0;
                        }
                    }
                    unset($pc);
                } else {
                    // Build per_class from admission map if none present
                    $reportData['per_class'] = [];
                    foreach ($adPerClassRows as $r) {
                        $reportData['per_class'][] = [
                            'class_id' => $r['class_id'] ?? null,
                            'class_name' => $r['class_name'] ?? 'Unspecified',
                            'teacher' => '-',
                            'full_count' => 0,
                            'half_count' => 0,
                            'free_count' => 0,
                            'total_amount' => 0,
                            'tx_count' => 0,
                            'admission_fee' => floatval($r['total'])
                        ];
                    }
                }
            } catch (Exception $e) {
                // Non-fatal: if admission fee calculation fails, proceed without it
                error_log('Failed to calculate admission fees for snapshot: ' . $e->getMessage());
                $reportData['admission_fees_total'] = $reportData['admission_fees_total'] ?? 0;
            }
            
            // Insert report
            $stmt = $db->prepare("
                INSERT INTO session_end_reports (
                    session_id,
                    report_date,
                    report_time,
                    report_type,
                    cashier_id,
                    cashier_name,
                    session_date,
                    session_start_time,
                    session_end_time,
                    opening_balance,
                    total_collections,
                    cash_out_amount,
                    expected_closing,
                    variance,
                    total_receipts,
                    full_cards_issued,
                    half_cards_issued,
                    free_cards_issued,
                    report_data,
                    is_final,
                    created_by
                ) VALUES (?, CURDATE(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['session_id'],
                $data['report_type'] ?? 'full',
                $session['cashier_id'],
                $session['cashier_name'],
                $session['session_date'],
                $session['first_login_time'],
                $session['day_end_time'],
                $openingBalance,
                $totalCollections,
                $cashOutAmount,
                $expectedClosing,
                $variance,
                intval($session['receipts_issued']),
                $fullCards,
                $halfCards,
                $freeCards,
                json_encode($reportData),
                isset($data['is_final']) ? ($data['is_final'] ? 1 : 0) : 0,
                $session['cashier_id']
            ]);
            
            $reportId = $db->lastInsertId();
            
            sendSuccess([
                'report_id' => $reportId,
                'message' => 'Session report saved successfully'
            ]);
            
        } catch (PDOException $e) {
            error_log("Save session report error: " . $e->getMessage());
            handleError('Failed to save session report: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get Session Report History
     * GET /api/reports/session-history
     * Query params: ?cashier_id=C001&from_date=2025-01-01&to_date=2025-01-31&limit=50
     */
    public function getSessionReportHistory() {
        try {
            $cashierId = $_GET['cashier_id'] ?? null;
            $fromDate = $_GET['from_date'] ?? null;
            $toDate = $_GET['to_date'] ?? null;
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
            $onlyFinal = isset($_GET['only_final']) && $_GET['only_final'] === 'true';
            
            $db = getDBConnection();
            
            $sql = "
                SELECT 
                    r.*,
                    s.session_status,
                    s.cash_drawer_balance
                FROM session_end_reports r
                LEFT JOIN cashier_sessions s ON r.session_id = s.session_id
                WHERE 1=1
            ";
            
            $params = [];
            
            if ($cashierId) {
                $sql .= " AND r.cashier_id = ?";
                $params[] = $cashierId;
            }
            
            if ($fromDate) {
                $sql .= " AND r.report_date >= ?";
                $params[] = $fromDate;
            }
            
            if ($toDate) {
                $sql .= " AND r.report_date <= ?";
                $params[] = $toDate;
            }
            
            if ($onlyFinal) {
                $sql .= " AND r.is_final = 1";
            }
            
            $sql .= " ORDER BY r.report_time DESC LIMIT " . intval($limit);
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll();
            
            // Parse JSON report_data for each report
            foreach ($reports as &$report) {
                $report['report_data'] = json_decode($report['report_data'], true);
            }
            
            sendSuccess([
                'reports' => $reports,
                'count' => count($reports)
            ]);
            
        } catch (PDOException $e) {
            error_log("Get session report history error: " . $e->getMessage());
            handleError('Failed to fetch session report history: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get Single Session Report by ID
     * GET /api/reports/session-report/{id}
     */
    public function getSessionReport($reportId) {
        try {
            $db = getDBConnection();
            
            $stmt = $db->prepare("
                SELECT r.*, s.session_status, s.cash_drawer_balance
                FROM session_end_reports r
                LEFT JOIN cashier_sessions s ON r.session_id = s.session_id
                WHERE r.report_id = ?
            ");
            $stmt->execute([$reportId]);
            $report = $stmt->fetch();
            
            if (!$report) {
                handleError('Report not found', 404);
            }
            
            // Parse JSON report_data
            $report['report_data'] = json_decode($report['report_data'], true);
            
            sendSuccess(['report' => $report]);
            
        } catch (PDOException $e) {
            error_log("Get session report error: " . $e->getMessage());
            handleError('Failed to fetch session report: ' . $e->getMessage(), 500);
        }
    }
}
