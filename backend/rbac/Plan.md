## User Creation and Synchronization

### RBAC User Creation API
- **Endpoint**: `POST /users`
- **Purpose**: Create new users in the RBAC system when they are created in the auth backend
- **Required Fields**: `userid`, `firstName`, `lastName`, `email`, `role`
- **Implementation**: Add `UserController.php` and `UserModel.php` to RBAC backend
- **Database Integration**: Insert user into RBAC `users` table

### Auth ↔ RBAC Integration Flow

#### User Registration Synchronization
- **Trigger Point**: When a user registers/completes registration in the auth backend
- **Integration Method**: Auth backend sends HTTP POST request to RBAC `/users` endpoint
- **Data Flow**:
  ```
  Auth Backend → RBAC Backend
  User registers → POST /users with user data → Create user in RBAC system
  ```
- **Request Payload**:
  ```json
  {
    "userid": "S001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@student.com",
    "role": "student"
  }
  ```

#### Automatic Role Assignment
- **Role Mapping Logic**:
  - `student` (from auth) → `student` role (RBAC)
  - `teacher` (from auth) → `teacher` role (RBAC)
  - `cashier` (from auth) → `cashier` role (RBAC)
  - `admin` (from auth) → `admin` role (RBAC)
- **Implementation**: RBAC backend automatically assigns appropriate RBAC role based on user type during user creation

#### Error Handling & Rollback
- **Failure Scenarios**:
  - RBAC API unavailable → Log error, retry later, or mark user for manual sync
  - RBAC user creation fails → Auth backend should handle gracefully (user still exists in auth)
  - Network timeout → Implement retry mechanism with exponential backoff
- **Transaction Consistency**: Use eventual consistency - auth user creation succeeds even if RBAC sync fails initially

#### Implementation Steps
1. **RBAC Backend**:
   - Create `POST /users` endpoint in `UserController.php`
   - Implement user creation logic in `UserModel.php`
   - Add automatic role assignment based on user type
   - Return success/error responses with appropriate HTTP status codes

2. **Auth Backend Integration**:
   - Modify user registration completion logic
   - Add HTTP client to call RBAC `/users` endpoint
   - Handle sync failures gracefully (don't block user registration)
   - Implement retry queue for failed syncs

3. **Testing & Monitoring**:
   - Test user creation flow end-to-end
   - Monitor sync success/failure rates
   - Add logging for troubleshooting sync issues
   - Implement health checks for RBAC API availability

### User Synchronization Flow
- **Trigger**: When a user is created in auth backend (student, teacher, cashier, admin)
- **Process**: Auth backend sends POST request to RBAC `/users` endpoint with user data
- **Role Assignment**: Automatically assign appropriate RBAC role based on user type:
  - `student` → `student` role
  - `teacher` → `teacher` role
  - `cashier` → `cashier` role
  - `admin` → `admin` role
- **Benefits**:
  - Keeps RBAC user database in sync with main auth system
  - Automatic role assignment based on user type
  - Centralized permission management for all user types

### Implementation Steps
1. Create `UserController.php` in RBAC backend with `createUser()` method
2. Create `UserModel.php` in RBAC backend with user creation logic
3. Add `POST /users` route to RBAC `routes.php`
4. Update auth backend user creation methods to call RBAC sync API
5. Test user creation flow and automatic role assignment

## Auth ↔ RBAC Integration Implementation

### Minimal Code Changes Required

To avoid project collapse, the RBAC integration will be implemented with minimal changes to existing code. The strategy is to add HTTP calls to the RBAC `/users` endpoint at specific points in the auth backend where user creation is completed successfully.

### Specific Integration Points

#### 1. Student Registration (`/routes.php/user` POST endpoint)
**File**: `backend/auth/src/routes.php` (lines ~45-75)
**Location**: After successful student creation in auth DB and student backend registration
**Current Code**:
```php
// First create the user in auth database
$user = new UserModel($mysqli);
if ($user->createUser($data['role'], $data['password'])) {
    $userid = $user->userid;
    
    // Then register student data in student backend
    $studentRegistrationData = [
        'userid' => $userid,
        'password' => $data['password'],
        'studentData' => $studentData
    ];
    
    $response = file_get_contents('http://student-backend/routes.php/register-student', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($studentRegistrationData)
        ]
    ]));
    
    echo $response; // This returns the student backend response
}
```
**Required Change**: Add RBAC sync call after successful student backend registration
```php
// After successful student backend registration, sync with RBAC
$rbacData = [
    'userid' => $userid,
    'firstName' => $studentData['firstName'],
    'lastName' => $studentData['lastName'],
    'email' => $studentData['email'],
    'role' => 'student'
];

$rbacResponse = file_get_contents('http://rbac-backend:8094/users', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($rbacData)
    ]
]));
// Log RBAC sync result but don't fail the registration if RBAC fails
```

#### 2. Teacher Registration (`/routes.php/teacher` POST endpoint)
**File**: `backend/auth/src/routes.php` (lines ~320-380)
**Location**: After successful teacher creation in auth DB and teacher backend registration
**Current Code**:
```php
// Create teacher in auth database
$result = $user->createTeacherUser($teacherId, $data['password'], $data['name'], $data['email'], $data['phone']);

if ($result) {
    // Then register teacher data in teacher backend
    $teacherRegistrationData = [
        'teacherId' => $teacherId,
        'designation' => $data['designation'] ?? 'Mr.',
        'name' => $data['name'],
        'stream' => $data['stream'] ?? 'Not Specified',
        'email' => $data['email'],
        'phone' => $data['phone'],
        'password' => $data['password'],
        'status' => 'active'
    ];
    
    $response = file_get_contents('http://host.docker.internal:8088/routes.php/create_teacher', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($teacherRegistrationData)
        ]
    ]));
    
    if ($response !== false) {
        $teacherBackendResponse = json_decode($response, true);
        if ($teacherBackendResponse && $teacherBackendResponse['success']) {
            // Send welcome message via WhatsApp
            $whatsappResult = $controller->sendTeacherWelcomeMessage($teacherId, $data['name'], $data['phone'], $data['password']);
            
            echo json_encode([
                'success' => true, 
                'message' => 'Teacher created successfully',
                'teacherId' => $teacherId,
                'whatsapp_sent' => $whatsappResult,
                'whatsapp_message' => $whatsappResult ? 'Welcome message sent successfully' : 'WhatsApp service unavailable'
            ]);
        }
    }
}
```
**Required Change**: Add RBAC sync call after successful teacher backend registration
```php
if ($teacherBackendResponse && $teacherBackendResponse['success']) {
    // Sync with RBAC system
    $rbacData = [
        'userid' => $teacherId,
        'firstName' => $data['name'],
        'lastName' => '', // Teachers may not have last name in current system
        'email' => $data['email'],
        'role' => 'teacher'
    ];
    
    $rbacResponse = file_get_contents('http://rbac-backend:8094/users', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($rbacData)
        ]
    ]));
    // Log RBAC sync result
    
    // Send welcome message via WhatsApp
    $whatsappResult = $controller->sendTeacherWelcomeMessage($teacherId, $data['name'], $data['phone'], $data['password']);
    
    echo json_encode([
        'success' => true, 
        'message' => 'Teacher created successfully',
        'teacherId' => $teacherId,
        'whatsapp_sent' => $whatsappResult,
        'rbac_synced' => ($rbacResponse !== false),
        'whatsapp_message' => $whatsappResult ? 'Welcome message sent successfully' : 'WhatsApp service unavailable'
    ]);
}
```

#### 3. Cashier Creation (`createCashier` method in UserController.php)
**File**: `backend/auth/src/UserController.php` (lines ~850-890)
**Location**: After successful cashier creation in auth DB
**Current Code**:
```php
// Create the cashier user
$stmt = $this->db->prepare("
    INSERT INTO users (userid, password, role, name, email, phone) 
    VALUES (?, ?, 'cashier', ?, ?, ?)
");
$stmt->bind_param("sssss", $cashierId, $hashedPassword, $name, $email, $phone);

if ($stmt->execute()) {
    // Format phone number for external service
    $formatted_phone = $phone;
    // ... WhatsApp message sending code ...
    
    return json_encode([
        'success' => true,
        'message' => 'Cashier account created successfully',
        'cashier_id' => $cashierId,
        'credentials_sent' => $externalServiceSuccess,
        'credentials_message' => $externalServiceMessage
    ]);
}
```
**Required Change**: Add RBAC sync call after successful cashier creation
```php
if ($stmt->execute()) {
    // Sync with RBAC system
    $rbacData = [
        'userid' => $cashierId,
        'firstName' => $name,
        'lastName' => '', // Cashiers may not have separate first/last names
        'email' => $email,
        'role' => 'cashier'
    ];
    
    $rbacResponse = file_get_contents('http://rbac-backend:8094/users', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($rbacData)
        ]
    ]));
    // Log RBAC sync result but don't fail creation
    
    // Format phone number for external service
    $formatted_phone = $phone;
    // ... existing WhatsApp code ...
    
    return json_encode([
        'success' => true,
        'message' => 'Cashier account created successfully',
        'cashier_id' => $cashierId,
        'credentials_sent' => $externalServiceSuccess,
        'rbac_synced' => ($rbacResponse !== false),
        'credentials_message' => $externalServiceMessage
    ]);
}
```

#### 4. Admin User Creation (Future Implementation)
**Location**: When admin users are created (currently manual or through direct DB insertion)
**Required Change**: Add RBAC sync call in admin creation workflow
```php
$rbacData = [
    'userid' => $adminId,
    'firstName' => $adminData['firstName'],
    'lastName' => $adminData['lastName'],
    'email' => $adminData['email'],
    'role' => 'admin'
];

$rbacResponse = file_get_contents('http://rbac-backend:8094/users', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($rbacData)
    ]
]));
```

### Error Handling Strategy

- **Non-blocking Integration**: RBAC sync failures should not prevent user registration
- **Logging**: Log all RBAC sync attempts and results for monitoring
- **Retry Mechanism**: Implement background retry for failed syncs (future enhancement)
- **Monitoring**: Add metrics to track sync success/failure rates

### Docker Network Configuration

Ensure RBAC backend is accessible via Docker network:
```yaml
# In docker-compose.yml
services:
  rbac-backend:
    # ... existing config ...
    ports:
      - "8094:80"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Testing Strategy

1. **Unit Tests**: Test RBAC sync calls in isolation
2. **Integration Tests**: Test complete user registration flow with RBAC sync
3. **Failure Tests**: Test user registration when RBAC is unavailable
4. **Data Consistency**: Verify RBAC user data matches auth system data

### Rollback Plan

If RBAC integration causes issues:
1. Comment out RBAC sync calls
2. Users created during integration period may need manual RBAC sync
3. No data loss in auth system
4. RBAC system remains functional for existing users

## Frontend Permission Management Page

- **Access Control**: The permission management page can only be accessed by users with admin role.
- **Fields**:
  - Permission Name: Input field for the name of the permission.
- Target User Role: Input field for the target user role of the permission.
  - Description: Input field for the description of the permission.
- **Create Functionality**:
  - When the "Create" button is clicked, a POST request is sent to the backend.
  - The request includes the permission name, target user role, and description.
  - Upon successful creation, the permission is saved in the database.
- **Edit Functionality**:
  - Each permission row has an "Edit" button/icon.
  - Clicking edit opens a modal/form with pre-filled fields (name, target user role, description).
  - When "Update" button is clicked, a PUT request is sent to the backend with the permission ID.
  - The request includes updated permission name, target user role, and description.
  - Upon successful update, the permission is updated in the database and the list refreshes.
- **Delete Functionality**:
  - Each permission row has a "Delete" button/icon.
  - Clicking delete shows a confirmation dialog.
  - Upon confirmation, a DELETE request is sent to the backend with the permission ID.
  - Upon successful deletion, the permission is removed from the database and the list refreshes.
- **Database Schema**:
  - Permission Table:
    - `id`: Autoincrement primary key.
    - `name`: VARCHAR or TEXT field for permission name.
    - `target_userrole`: VARCHAR or TEXT field for target user role.
    - `description`: VARCHAR or TEXT field for permission description.

## Frontend Role Management Page

- **Access Control**: The role management page can only be accessed by users with admin role.
- **Location**: Available under "User Roles > Manage Roles" in the admin sidebar.
- **Fields**:
  - Role Name: Input field for the name of the role.
  - Description: Input field for the description of the role.
  - Permissions: Multi-select field to assign permissions to the role.
- **Create Role Functionality**:
  - When the "Create Role" button is clicked, a form modal opens.
  - User enters role name, description, and selects permissions to assign.
  - When "Create" button is clicked, a POST request is sent to the backend.
  - The request includes role name, description, and array of permission IDs.
  - Upon successful creation, the role is saved in the database with assigned permissions.
- **Edit Role Functionality**:
  - Each role row has an "Edit" button/icon.
  - Clicking edit opens a modal/form with pre-filled fields (name, description, assigned permissions).
  - User can modify role details and add/remove permissions.
  - When "Update" button is clicked, a PUT request is sent to the backend with the role ID.
  - The request includes updated role name, description, and array of permission IDs.
  - Upon successful update, the role is updated in the database and the list refreshes.
- **Delete Role Functionality**:
  - Each role row has a "Delete" button/icon.
  - Clicking delete shows a confirmation dialog.
  - Upon confirmation, a DELETE request is sent to the backend with the role ID.
  - Upon successful deletion, the role and all its permission assignments are removed from the database.
- **Assign/Revoke Permissions**:
  - In edit mode, user can check/uncheck permissions to assign or revoke them.
  - Changes are saved when the role is updated.
  - Permission assignments are managed through a junction table.
- **View Role Details**:
  - Each role row shows basic info (name, description, number of permissions).
  - Clicking on a role could expand to show assigned permissions.
- **Database Schema**:
  - Role Table:
    - `id`: Autoincrement primary key.
    - `name`: VARCHAR field for role name (unique).
    - `description`: TEXT field for role description.
    - `created_at`: TIMESTAMP for creation date.
  - Role_Permissions Table (junction table for many-to-many relationship):
    - `id`: Autoincrement primary key.
    - `role_id`: Foreign key to roles table.
    - `permission_id`: Foreign key to permissions table.
    - `assigned_at`: TIMESTAMP for when permission was assigned.
    - Unique constraint on (role_id, permission_id) to prevent duplicates.

## Frontend User Role Assignment Page

- **Access Control**: The user role assignment page can only be accessed by users with admin role.
- **Location**: Available under "User Management > Assign Roles" in the admin sidebar.
- **Purpose**: Allow administrators to assign and revoke roles from users, managing user access levels.
- **Fields**:
  - User Selection: Dropdown or search field to select a user from the system.
  - Current Roles: Display list of roles currently assigned to the selected user.
  - Available Roles: List of all available roles that can be assigned.
  - Role Assignment: Multi-select interface to assign/revoke roles.
- **User Selection Functionality**:
  - Search users by name, email, or ID.
  - Display user details (name, email, current roles) when selected.
  - Show current role assignments for the selected user.
- **Assign Role Functionality**:
  - Display all available roles in a list or grid.
  - Allow admin to select roles to assign to the user.
  - When "Assign Role" button is clicked, a POST request is sent to the backend.
  - The request includes user ID and role ID to assign.
  - Upon successful assignment, the user's role list is updated.
- **Revoke Role Functionality**:
  - For each role currently assigned to the user, show a "Revoke" button.
  - Clicking revoke shows a confirmation dialog.
  - Upon confirmation, a DELETE request is sent to the backend with user ID and role ID.
  - Upon successful revocation, the role is removed from the user's assignments.
- **Bulk Role Management**:
  - Allow assigning multiple roles at once to a user.
  - Allow revoking multiple roles at once from a user.
  - Provide "Assign All" and "Revoke All" options for convenience.
- **Role Assignment History**:
  - Track when roles were assigned/revoked and by whom.
  - Display assignment timestamps for audit purposes.
- **Validation and Constraints**:
  - Prevent assigning the same role twice to a user.
  - Ensure users always have at least one role (if required).
  - Validate that the admin has permission to assign/revoke roles.
- **Database Schema**:
  - User_Roles Table (junction table for user-role assignments):
    - `id`: Autoincrement primary key.
    - `user_id`: Foreign key to users table (references userid).
    - `role_id`: Foreign key to roles table.
    - `assigned_by`: Foreign key to users table (admin who assigned the role).
    - `assigned_at`: TIMESTAMP for when role was assigned.
    - `revoked_by`: Foreign key to users table (nullable, admin who revoked).
    - `revoked_at`: TIMESTAMP for when role was revoked (nullable).
    - `is_active`: BOOLEAN to track current assignments (true = active, false = revoked).
    - Unique constraint on (user_id, role_id, is_active) to prevent duplicate active assignments.
- **API Endpoints Required**:
  - GET /users - Get all users for selection
  - GET /users/{userId}/roles - Get current roles for a user
  - POST /users/{userId}/roles/{roleId} - Assign role to user
  - DELETE /users/{userId}/roles/{roleId} - Revoke role from user
  - GET /users/{userId}/roles/history - Get role assignment history for a user
  - GET /users/{userId}/permissions - Get all permissions for a user (combines inherent user role permissions and assigned RBAC role permissions)

## Frontend Permission-Based Access Control

- **Permission Checking System**:
  - Create permission checking utility (`permissionChecker.js`) with functions to get user permissions and check access rights
  - Implement caching mechanism to avoid repeated API calls for the same user's permissions
  - Support for checking single permissions, any of multiple permissions, or all of multiple permissions

- **Sidebar Access Control**:
  - Modify sidebar components to filter menu items based on user permissions
  - Add `requiredPermissions` array to each sidebar menu item specifying which permissions are needed to access it
  - Hide menu items that user doesn't have permission to access
  - Remove entire sections if all items in the section are hidden due to permissions

- **Permission Requirements by Feature**:
  - **User Roles Management**: Requires `user_roles.permissions` and `user_roles.all_roles` permissions
  - **Permission Management**: Requires `user_roles.permissions` permission
  - **Role Management**: Requires `user_roles.all_roles` permission
  - **User Role Assignment**: Requires `user_roles.all_roles` permission
  - **Admin Management**: Requires `admin.view` and `admin.create` permissions respectively
  - **Student Management**: Requires various student-related permissions (`student.enroll`, `student.cards`, etc.)
  - **Financial Operations**: Requires `finance.view` and `payment.view` permissions
  - **System Administration**: Requires various system-level permissions (`system.settings`, `system.backup`, etc.)

- **Implementation Approach**:
  - **Step 1**: Create permission checking utility with API integration
  - **Step 2**: Add permission requirements to sidebar menu items
  - **Step 3**: Modify dashboard components to fetch user permissions on load
  - **Step 4**: Filter sidebar items based on user permissions before rendering
  - **Step 5**: Handle loading states while permissions are being fetched
  - **Step 6**: Implement fallback behavior for permission loading failures

- **Security Considerations**:
  - Frontend permission checks are for UI/UX purposes only - all backend operations must still validate permissions server-side
  - Permission cache should be cleared on user logout or session changes
  - Handle cases where permission API calls fail gracefully (show limited UI or all options as fallback)
  - Log permission check failures for security monitoring

- **User Experience**:
  - Show loading indicator while permissions are being loaded
  - Clean UI with only relevant menu items visible to each user
  - No "Access Denied" messages for hidden menu items - items simply don't appear
  - Consistent permission checking across all dashboard types (admin, teacher, student, cashier)

---

# 🎯 **TODAY'S FOCUS: Adding Permissions to Teachers**

## Teacher Permission System Implementation Plan

### Overview
Implement a comprehensive permission system specifically for teachers, allowing fine-grained control over what each teacher can access and do within the Tuition Class Management System.

### Database Schema Updates

#### 1. Teacher Permissions Table
```sql
CREATE TABLE IF NOT EXISTS teacher_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    permission_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'student_management', 'attendance', 'communication', 'reports', 'system'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default teacher permissions
INSERT INTO teacher_permissions (permission_key, permission_name, description, category) VALUES
-- Student Management
('teacher.students.view', 'View Students', 'Can view student information in assigned classes', 'student_management'),
('teacher.students.edit', 'Edit Student Info', 'Can edit student information', 'student_management'),
('teacher.students.enroll', 'Enroll Students', 'Can enroll new students in classes', 'student_management'),

-- Attendance Management
('teacher.attendance.view', 'View Attendance', 'Can view attendance records', 'attendance'),
('teacher.attendance.mark', 'Mark Attendance', 'Can mark student attendance', 'attendance'),
('teacher.attendance.edit', 'Edit Attendance', 'Can edit attendance records', 'attendance'),

-- Communication
('teacher.communication.email', 'Send Emails', 'Can send emails to students/parents', 'communication'),
('teacher.communication.sms', 'Send SMS', 'Can send SMS notifications', 'communication'),
('teacher.communication.whatsapp', 'Send WhatsApp', 'Can send WhatsApp messages', 'communication'),

-- Reports & Analytics
('teacher.reports.view', 'View Reports', 'Can view class performance reports', 'reports'),
('teacher.reports.generate', 'Generate Reports', 'Can generate custom reports', 'reports'),
('teacher.reports.export', 'Export Reports', 'Can export reports to PDF/Excel', 'reports'),

-- System Access
('teacher.profile.edit', 'Edit Profile', 'Can edit own profile information', 'system'),
('teacher.password.change', 'Change Password', 'Can change own password', 'system');
```

#### 2. Teacher Permission Assignments Table
```sql
CREATE TABLE IF NOT EXISTS teacher_permission_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id VARCHAR(10) NOT NULL,
    permission_id INT NOT NULL,
    assigned_by VARCHAR(10) NOT NULL, -- Admin who assigned the permission
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL, -- Optional expiration date
    FOREIGN KEY (teacher_id) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES teacher_permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(userid),
    UNIQUE KEY unique_teacher_permission (teacher_id, permission_id)
);
```

### Backend API Implementation

#### 1. Teacher Permission Controller
**File**: `backend/rbac/src/TeacherPermissionController.php`
- `getAllPermissions()` - Get all available teacher permissions
- `getTeacherPermissions($teacherId)` - Get permissions assigned to a specific teacher
- `assignPermission($teacherId, $permissionId, $assignedBy)` - Assign permission to teacher
- `revokePermission($teacherId, $permissionId)` - Revoke permission from teacher
- `bulkAssignPermissions($teacherId, $permissionIds, $assignedBy)` - Assign multiple permissions
- `getPermissionsByCategory($category)` - Get permissions grouped by category

#### 2. Teacher Permission Model
**File**: `backend/rbac/src/TeacherPermissionModel.php`
- Database operations for teacher permissions
- CRUD operations for permission assignments
- Permission validation and checking

#### 3. API Routes
**File**: `backend/rbac/src/routes.php`
```php
// Teacher Permissions Management
GET /teacher-permissions - Get all available permissions
GET /teachers/{teacherId}/permissions - Get teacher's permissions
POST /teachers/{teacherId}/permissions - Assign permission to teacher
DELETE /teachers/{teacherId}/permissions/{permissionId} - Revoke permission
POST /teachers/{teacherId}/permissions/bulk - Bulk assign permissions
GET /teacher-permissions/categories/{category} - Get permissions by category
```

### Frontend Implementation

#### 1. Teacher Permission Management Page
**Location**: Admin Dashboard → Teacher Management → Teacher Permissions
**Features**:
- Search and select teacher
- View current permissions by category
- Assign/revoke individual permissions
- Bulk permission operations
- Permission assignment history
- Export permission reports

#### 2. Permission-Based UI Components
**File**: `frontend/src/components/teacher/PermissionGuard.jsx`
```jsx
// Component to conditionally render content based on teacher permissions
const PermissionGuard = ({ permission, children, fallback = null }) => {
  const hasPermission = useTeacherPermission(permission);
  return hasPermission ? children : fallback;
};
```

#### 3. Teacher Permission Hook
**File**: `frontend/src/hooks/useTeacherPermissions.js`
```jsx
const useTeacherPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherPermissions();
  }, []);

  const fetchTeacherPermissions = async () => {
    try {
      const response = await api.get('/teachers/me/permissions');
      setPermissions(response.data.permissions);
    } catch (error) {
      console.error('Failed to fetch teacher permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionKey) => {
    return permissions.includes(permissionKey);
  };

  const hasAnyPermission = (permissionKeys) => {
    return permissionKeys.some(key => permissions.includes(key));
  };

  const hasAllPermissions = (permissionKeys) => {
    return permissionKeys.every(key => permissions.includes(key));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: fetchTeacherPermissions
  };
};
```

### Implementation Steps

#### Phase 1: Database & Backend Setup
1. ✅ Create `teacher_permissions` table with default permissions
2. ✅ Create `teacher_permission_assignments` table
3. ✅ Implement TeacherPermissionController and TeacherPermissionModel
4. ✅ Add API routes for permission management
5. ✅ Test backend APIs

#### Phase 2: Admin Permission Management UI
1. ✅ Create teacher permission management page
2. ✅ Implement permission assignment interface
3. ✅ Add bulk operations
4. ✅ Implement permission history tracking
5. ✅ Add validation and error handling

#### Phase 3: Teacher Dashboard Integration
1. ✅ Update teacher sidebar to show only allowed menu items
2. ✅ Implement PermissionGuard component
3. ✅ Add permission checks to teacher-specific features
4. ✅ Update teacher dashboard to respect permissions
5. ✅ Test permission-based access control

#### Phase 4: Default Permission Assignment
1. ✅ Automatically assign default permissions to new teachers
2. ✅ Create permission templates for different teacher types
3. ✅ Implement permission inheritance system
4. ✅ Add permission expiration functionality

### Permission Categories & Default Assignments

#### Basic Teacher Permissions (Assigned by Default)
- `teacher.students.view`
- `teacher.attendance.view`
- `teacher.attendance.mark`
- `teacher.profile.edit`
- `teacher.password.change`

#### Advanced Teacher Permissions (Assigned by Admin)
- `teacher.students.edit`
- `teacher.students.enroll`
- `teacher.attendance.edit`
- `teacher.communication.email`
- `teacher.communication.sms`
- `teacher.communication.whatsapp`
- `teacher.reports.view`
- `teacher.reports.generate`
- `teacher.reports.export`

### Testing Strategy

#### Unit Tests
- Test permission assignment/removal logic
- Test permission checking functions
- Test bulk operations

#### Integration Tests
- Test complete permission assignment workflow
- Test teacher dashboard with different permission sets
- Test permission-based UI rendering

#### User Acceptance Tests
- Admin assigns permissions to teacher
- Teacher logs in and sees only allowed features
- Permission changes reflect immediately
- Permission expiration works correctly

### Security Considerations

#### Backend Security
- All permission checks must be validated server-side
- Permission assignments can only be modified by admins
- Audit trail for all permission changes
- Rate limiting on permission API calls

#### Frontend Security
- Permission checks are for UI/UX only
- All data operations require backend validation
- Clear permission cache on logout
- Handle permission loading failures gracefully

### Rollback Plan

If teacher permission system causes issues:
1. Disable permission checks in frontend (show all features)
2. Keep existing teacher functionality unchanged
3. Remove permission assignments from database
4. Revert to role-based access (teacher role has all permissions)
5. No data loss for existing teachers

### Success Metrics

- ✅ All teachers can access their assigned features
- ✅ Admins can easily manage teacher permissions
- ✅ Permission changes take effect immediately
- ✅ System performance remains unaffected
- ✅ Audit trail provides complete permission history

---

## Next Steps After Teacher Permissions

1. **Student Permissions** - Implement permission system for students
2. **Cashier Permissions** - Add granular permissions for cashiers
3. **Permission Analytics** - Add reporting on permission usage
4. **Advanced Permission Rules** - Time-based, location-based permissions
5. **Integration Testing** - End-to-end testing of complete permission system
