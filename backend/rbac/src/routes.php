<?php
// Set JSON content type for all responses
header('Content-Type: application/json');

require_once __DIR__ . '/PermissionController.php';

require_once __DIR__ . '/RoleController.php';

require_once __DIR__ . '/UserRoleController.php';

require_once __DIR__ . '/UserController.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Database connection with error handling
try {
    // Read DB configuration from environment when available (useful in Docker)
    $dbHost = getenv('DB_HOST') ?: 'mysql';
    $dbUser = getenv('DB_USER') ?: 'devuser';
    $dbPass = getenv('DB_PASS') ?: 'devpass';
    $dbName = getenv('DB_NAME') ?: 'rbac-db';

    $mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($mysqli->connect_error) {
        throw new Exception('Database connection failed: ' . $mysqli->connect_error);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => $e->getMessage()
    ]);
    exit;
}

$controller = new PermissionController($mysqli);

$roleController = new RoleController($mysqli);

$userRoleController = new UserRoleController($mysqli);

$userController = new UserController($mysqli);

// Root path test
if ($method === 'GET' && ($path === '/' || $path === '/index.php')) {
    echo json_encode([
        'success' => true,
        'message' => 'RBAC API is working!',
        'service' => 'RBAC (Role-Based Access Control)',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// CREATE permission
if ($method === 'POST' && $path === '/permissions') {
    $data = json_decode(file_get_contents('php://input'), true);
    echo $controller->createPermission($data);
    exit;
}

// GET all permissions
if ($method === 'GET' && $path === '/permissions') {
    echo $controller->getAllPermissions();
    exit;
}

// GET permission by ID
if ($method === 'GET' && preg_match('#^/permissions/(\d+)$#', $path, $matches)) {
    $permissionId = $matches[1];
    echo $controller->getPermissionById($permissionId);
    exit;
}

// UPDATE permission by ID
if ($method === 'PUT' && preg_match('#^/permissions/(\d+)$#', $path, $matches)) {
    $permissionId = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    echo $controller->updatePermission($permissionId, $data);
    exit;
}

// DELETE permission by ID
if ($method === 'DELETE' && preg_match('#^/permissions/(\d+)$#', $path, $matches)) {
    $permissionId = $matches[1];
    echo $controller->deletePermission($permissionId);
    exit;
}

// CREATE role
if ($method === 'POST' && $path === '/roles') {
    $data = json_decode(file_get_contents('php://input'), true);
    echo $roleController->createRole($data);
    exit;
}

// GET all roles
if ($method === 'GET' && $path === '/roles') {
    echo $roleController->getAllRoles();
    exit;
}

// GET role by ID
if ($method === 'GET' && preg_match('#^/roles/(\d+)$#', $path, $matches)) {
    $roleId = $matches[1];
    echo $roleController->getRoleById($roleId);
    exit;
}

// UPDATE role by ID
if ($method === 'PUT' && preg_match('#^/roles/(\d+)$#', $path, $matches)) {
    $roleId = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    echo $roleController->updateRole($roleId, $data);
    exit;
}

// DELETE role by ID
if ($method === 'DELETE' && preg_match('#^/roles/(\d+)$#', $path, $matches)) {
    $roleId = $matches[1];
    echo $roleController->deleteRole($roleId);
    exit;
}

// ASSIGN permission to role
if ($method === 'POST' && preg_match('#^/roles/(\d+)/permissions/(\d+)$#', $path, $matches)) {
    $roleId = $matches[1];
    $permissionId = $matches[2];
    echo $roleController->assignPermissionToRole($roleId, $permissionId);
    exit;
}

// REVOKE permission from role
if ($method === 'DELETE' && preg_match('#^/roles/(\d+)/permissions/(\d+)$#', $path, $matches)) {
    $roleId = $matches[1];
    $permissionId = $matches[2];
    echo $roleController->revokePermissionFromRole($roleId, $permissionId);
    exit;
}

// GET role permissions
if ($method === 'GET' && preg_match('#^/roles/(\d+)/permissions$#', $path, $matches)) {
    $roleId = $matches[1];
    echo $roleController->getRolePermissions($roleId);
    exit;
}

// GET permissions for target role by name
if ($method === 'GET' && preg_match('#^/roles/name/([^/]+)/permissions$#', $path, $matches)) {
    $roleName = urldecode($matches[1]);
    echo $roleController->getRolePermissionsByName($roleName);
    exit;
}

// CREATE user (for auth backend sync)
if ($method === 'POST' && $path === '/users') {
    $data = json_decode(file_get_contents('php://input'), true);
    echo $userController->createUser($data);
    exit;
}

// GET all users
if ($method === 'GET' && $path === '/users') {
    echo $userRoleController->getAllUsers();
    exit;
}

// GET user by ID
if ($method === 'GET' && preg_match('#^/users/([^/]+)$#', $path, $matches)) {
    $userId = $matches[1];
    echo $userRoleController->getUserById($userId);
    exit;
}

// GET user roles
if ($method === 'GET' && preg_match('#^/users/([^/]+)/roles$#', $path, $matches)) {
    $userId = $matches[1];
    echo $userRoleController->getUserRoles($userId);
    exit;
}

// GET user role history
if ($method === 'GET' && preg_match('#^/users/([^/]+)/roles/history$#', $path, $matches)) {
    $userId = $matches[1];
    echo $userRoleController->getUserRoleHistory($userId);
    exit;
}

// GET user permissions
if ($method === 'GET' && preg_match('#^/users/([^/]+)/permissions$#', $path, $matches)) {
    $userId = $matches[1];
    echo $userRoleController->getUserPermissions($userId);
    exit;
}

// ASSIGN role to user
if ($method === 'POST' && preg_match('#^/users/([^/]+)/roles/(\d+)$#', $path, $matches)) {
    $userId = $matches[1];
    $roleId = $matches[2];
    echo $userRoleController->assignRoleToUser($userId, $roleId);
    exit;
}

// REVOKE role from user
if ($method === 'DELETE' && preg_match('#^/users/([^/]+)/roles/(\d+)$#', $path, $matches)) {
    $userId = $matches[1];
    $roleId = $matches[2];
    echo $userRoleController->revokeRoleFromUser($userId, $roleId);
    exit;
}

// GET users by role
if ($method === 'GET' && preg_match('#^/roles/(\d+)/users$#', $path, $matches)) {
    $roleId = $matches[1];
    echo $userRoleController->getUsersByRole($roleId);
    exit;
}

echo json_encode([
    'success' => false,
    'message' => 'Route not found',
    'path' => $path,
    'method' => $method
]);