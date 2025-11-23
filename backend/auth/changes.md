# Auth Backend Changes - RBAC Integration

## Overview
This document details all changes made to the auth backend for RBAC (Role-Based Access Control) integration. The changes implement non-blocking synchronization between the auth system and RBAC system during user creation.

## Date: November 9, 2025
## Developer: GitHub Copilot

## Changes Made

### 1. File: `routes.php`
**Purpose:** Added RBAC synchronization calls for student and teacher registration

#### Change 1: Student Registration RBAC Sync
**Location:** Lines 55-75 (after auth user creation, before student backend call)
**Type:** Addition
**Description:** Added non-blocking RBAC sync call when students are registered

**Before:**
```php
// First create the user in auth database
$user = new UserModel($mysqli);
if ($user->createUser($data['role'], $data['password'])) {
    $userid = $user->userid;
    
    // Then register student data in student backend
```

**After:**
```php
// First create the user in auth database
$user = new UserModel($mysqli);
if ($user->createUser($data['role'], $data['password'])) {
    $userid = $user->userid;

    // Sync user to RBAC system (non-blocking)
    $rbacSyncData = [
        'userid' => $userid,
        'role' => 'student',
        'firstName' => $data['firstName'],
        'lastName' => $data['lastName'],
        'email' => $data['email'] ?? ''
    ];

    // Call RBAC backend to create user (don't block on failure)
    $rbacResponse = @file_get_contents('http://rbac-backend:80/users', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($rbacSyncData)
        ]
    ]));

    $rbacSyncSuccess = false;
    if ($rbacResponse !== false) {
        $rbacResult = json_decode($rbacResponse, true);
        $rbacSyncSuccess = isset($rbacResult['success']) && $rbacResult['success'];
    }

    // Then register student data in student backend
```

#### Change 2: Teacher Registration RBAC Sync
**Location:** Lines 410-430 (after auth teacher creation, before teacher backend call)
**Type:** Addition
**Description:** Added non-blocking RBAC sync call when teachers are registered

**Before:**
```php
// Create teacher in auth database
$result = $user->createTeacherUser($teacherId, $data['password'], $data['name'], $data['email'], $data['phone']);

if ($result) {
    // Then register teacher data in teacher backend
```

**After:**
```php
// Create teacher in auth database
$result = $user->createTeacherUser($teacherId, $data['password'], $data['name'], $data['email'], $data['phone']);

if ($result) {
    // Sync user to RBAC system (non-blocking)
    $rbacSyncData = [
        'userid' => $teacherId,
        'role' => 'teacher',
        'firstName' => $data['name'],
        'lastName' => '', // Empty lastName for teachers
        'email' => $data['email']
    ];

    // Call RBAC backend to create user (don't block on failure)
    $rbacResponse = @file_get_contents('http://rbac-backend:80/users', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($rbacSyncData)
        ]
    ]));

    $rbacSyncSuccess = false;
    if ($rbacResponse !== false) {
        $rbacResult = json_decode($rbacResponse, true);
        $rbacSyncSuccess = isset($rbacResult['success']) && $rbacResult['success'];
    }

    // Then register teacher data in teacher backend
```

### 2. File: `UserController.php`
**Purpose:** Added RBAC synchronization call for general user registration (admin and other roles)

#### Change 1: General User Registration RBAC Sync
**Location:** Lines 25-45 (in the `register` method, after auth user creation)
**Type:** Addition
**Description:** Added non-blocking RBAC sync call when admin or other non-student users are registered

**Before:**
```php
public function register($role, $password, $studentData = null) {
    $user = new UserModel($this->db);
    if ($user->createUser($role, $password)) {
        $userid = $user->userid;
        
        // Enhanced response for better user experience
        $response = [
            'success' => true,
            'userid' => $userid,
            'role' => $user->role,
            'message' => 'Account created successfully in TCMS',
            'system' => 'TCMS (Tuition Class Management System)',
            'timestamp' => date('Y-m-d H:i:s'),
            'status' => 'active'
        ];
```

**After:**
```php
public function register($role, $password, $studentData = null) {
    $user = new UserModel($this->db);
    if ($user->createUser($role, $password)) {
        $userid = $user->userid;
        
        // Sync user to RBAC system (non-blocking)
        $rbacSyncData = [
            'userid' => $userid,
            'role' => $role,
            'firstName' => $role === 'admin' ? 'Admin User ' . $userid : $userid, // Use more descriptive name for admin users
            'lastName' => '', // Empty lastName for admin users
            'email' => '' // Admin users may not have email in basic registration
        ];
        
        // Call RBAC backend to create user (don't block on failure)
        $rbacResponse = @file_get_contents('http://rbac-backend:80/users', false, stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($rbacSyncData)
            ]
        ]));
        
        $rbacSyncSuccess = false;
        if ($rbacResponse !== false) {
            $rbacResult = json_decode($rbacResponse, true);
            $rbacSyncSuccess = isset($rbacResult['success']) && $rbacResult['success'];
        }
        
        // Enhanced response for better user experience
        $response = [
            'success' => true,
            'userid' => $userid,
            'role' => $user->role,
            'message' => 'Account created successfully in TCMS',
            'system' => 'TCMS (Tuition Class Management System)',
            'timestamp' => date('Y-m-d H:i:s'),
            'status' => 'active'
        ];
```

#### Change 2: Cashier Creation RBAC Sync
**Location:** Lines 1250-1270 (in the `createCashier` method, after auth cashier creation)
**Type:** Addition
**Description:** Added non-blocking RBAC sync call when cashiers are created

**Before:**
```php
if ($stmt->execute()) {
    // Format phone number for external service
```

**After:**
```php
if ($stmt->execute()) {
    // Sync user to RBAC system (non-blocking)
    $rbacSyncData = [
        'userid' => $cashierId,
        'role' => 'cashier',
        'firstName' => $name,
        'lastName' => '', // Empty lastName for cashiers
        'email' => $email
    ];
    
    // Call RBAC backend to create user (don't block on failure)
    $rbacResponse = @file_get_contents('http://rbac-backend:80/users', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($rbacSyncData)
        ]
    ]));
    
    $rbacSyncSuccess = false;
    if ($rbacResponse !== false) {
        $rbacResult = json_decode($rbacResponse, true);
        $rbacSyncSuccess = isset($rbacResult['success']) && $rbacResult['success'];
    }
    
    // Format phone number for external service
```## Technical Details

### RBAC Sync Implementation
- **Endpoint:** `http://rbac-backend:80/users` (Updated from port 8094 to 80 for Docker inter-container communication)
- **Method:** POST
- **Content-Type:** application/json
- **Non-blocking:** Uses `@file_get_contents()` to prevent blocking on network failures
- **Data Structure:** Updated to use firstName/lastName format instead of single name field
  ```json
  {
    "userid": "S001|T001|C001|A001",
    "role": "student|teacher|cashier|admin",
    "firstName": "First Name or 'Admin User X' for admins",
    "lastName": "Last Name (empty for non-students)",
    "email": "user@example.com"
  }
  ```

### Error Handling
- RBAC sync failures don't prevent user registration
- Uses `@` operator to suppress warnings from `file_get_contents()`
- Checks response validity before parsing JSON
- Continues with existing flow regardless of RBAC sync result

### Integration Points
1. **Student Registration:** POST `/routes.php/user` with `role: 'student'` - syncs with firstName/lastName from form data
2. **Teacher Registration:** POST `/routes.php/teacher` - syncs with firstName from name field, empty lastName
3. **Cashier Creation:** POST `/routes.php/cashier` - syncs with firstName from name field, empty lastName
4. **Admin Registration:** POST `/routes.php/user` with `role: 'admin'` - syncs with "Admin User {userid}" as firstName

### Dependencies
- Requires RBAC backend running on internal port 80 (Docker networking)
- Uses Docker networking (`rbac-backend` hostname)
- No changes to existing database schema
- No changes to existing API contracts

## Recent Updates (November 9, 2025)

### Port Configuration Fix
**Issue:** RBAC sync calls were using external port 8094 instead of internal Docker port 80
**Solution:** Updated all RBAC sync calls to use `http://rbac-backend:80/users`
**Files Changed:** `routes.php`, `UserController.php`
**Impact:** Fixed inter-container communication between auth and RBAC services

### Data Structure Standardization
**Issue:** RBAC API expects firstName/lastName fields, but sync was using inconsistent field names
**Solution:** Standardized all RBAC sync calls to use firstName/lastName format
**Files Changed:** `routes.php`, `UserController.php`
**Impact:** Consistent data structure across all user types in RBAC system

### Admin User Naming Improvement
**Issue:** Admin users appeared identical in RBAC (A004, A007, etc.)
**Solution:** Changed admin user firstName from userid to "Admin User {userid}"
**Files Changed:** `UserController.php`
**Impact:** Admin users now have distinguishable names in RBAC (Admin User A004, Admin User A007, etc.)

### Cashier RBAC Sync Addition
**Issue:** Cashier creation was missing RBAC synchronization
**Solution:** Added RBAC sync call in createCashier method
**Files Changed:** `UserController.php`
**Impact:** Cashiers now automatically get RBAC permissions upon creation

## Testing Recommendations
1. Test student registration with RBAC backend online - verify firstName/lastName sync
2. Test student registration with RBAC backend offline (should still succeed)
3. Test teacher registration with RBAC backend online - verify firstName sync
4. Test teacher registration with RBAC backend offline (should still succeed)
5. Test cashier creation with RBAC backend online - verify firstName sync
6. Test cashier creation with RBAC backend offline (should still succeed)
7. Test admin registration with RBAC backend online - verify "Admin User {userid}" naming
8. Test admin registration with RBAC backend offline (should still succeed)
9. Verify RBAC database has correct user entries with proper firstName/lastName format after registration
10. Verify Docker inter-container communication works on port 80

## Rollback Instructions
To rollback these changes:
1. Change all RBAC sync URLs from `http://rbac-backend:80/users` back to `http://rbac-backend:8094/users`
2. Change RBAC sync data structure from firstName/lastName back to single name field
3. Remove the admin user naming improvement (change back to just userid)
4. Remove the cashier RBAC sync code block
5. Restart auth backend service
6. Test user registration still works without RBAC sync

