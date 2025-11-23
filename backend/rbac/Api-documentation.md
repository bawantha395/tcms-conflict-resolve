###### RBAC API Documentation
##### Permission Management

# Create Permission

    Description:
        Creates a new permission with the specified name, target user role, and description. This endpoint is restricted to admin users only.

    Endpoint:
        `POST http://localhost:8094/permissions`

    Request Headers:
        - `Content-Type: application/json`
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Request Body:
        {
            "name": "string",
            "target_userrole": "string",
            "description": "string"
        }

    Example Request:
        Post - `http://localhost:8094/permissions`
        headers:
            - `Content-Type: application/json`
        body:
        {
            "name": "manage_users",
            "target_userrole": "admin",
            "description": "Permission to manage user accounts"
        }
    Response:
        - Status Code: 201 Created
        - Response Body:
            {
                "id": 1,
                "name": "manage_users",
                "target_userrole": "admin",
                "description": "Permission to manage user accounts",
                "created_at": "2025-11-07T10:00:00Z"
            }

    Error Responses:
    - 400 Bad Request: Invalid request body or missing required fields.
    - 409 Conflict: Permission with this name already exists.
    - 500 Internal Server Error: Server error occurred while creating the permission.

# Update Permission

    Description:
        Updates an existing permission with the specified ID. This endpoint is restricted to admin users only.

    Endpoint:
        `PUT http://localhost:8094/permissions/{id}`

    Request Headers:
        - `Content-Type: application/json`
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Request Body:
        {
            "name": "string",
            "target_userrole": "string",
            "description": "string"
        }

    Example Request:
        PUT - `http://localhost:8094/permissions/1`
        headers:
            - `Content-Type: application/json`
        body:
        {
            "name": "manage_users_updated",
            "target_userrole": "admin",
            "description": "Updated permission to manage user accounts"
        }
    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Permission updated successfully",
                "permission": {
                    "id": 1,
                    "name": "manage_users_updated",
                    "target_userrole": "admin",
                    "description": "Updated permission to manage user accounts",
                    "created_at": "2025-11-07T10:00:00Z"
                }
            }

    Error Responses:
    - 400 Bad Request: Invalid request body or missing required fields.
    - 404 Not Found: Permission with the specified ID not found.
    - 409 Conflict: Permission with this name already exists.
    - 500 Internal Server Error: Server error occurred while updating the permission.

# Delete Permission

    Description:
        Deletes an existing permission with the specified ID. This endpoint is restricted to admin users only.

    Endpoint:
        `DELETE http://localhost:8094/permissions/{id}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        DELETE - `http://localhost:8094/permissions/1`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Permission deleted successfully"
            }

    Error Responses:
    - 404 Not Found: Permission with the specified ID not found.
    - 500 Internal Server Error: Server error occurred while deleting the permission.

##### Role Management

# Create Role

    Description:
        Creates a new role with the specified name, description, and assigned permissions. This endpoint is restricted to admin users only.

    Endpoint:
        `POST http://localhost:8094/roles`

    Request Headers:
        - `Content-Type: application/json`
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Request Body:
        {
            "name": "string",
            "description": "string",
            "permission_ids": [1, 2, 3]
        }

    Example Request:
        POST - `http://localhost:8094/roles`
        headers:
            - `Content-Type: application/json`
        body:
        {
            "name": "content_manager",
            "description": "Role for managing website content",
            "permission_ids": [1, 2, 3]
        }
    Response:
        - Status Code: 201 Created
        - Response Body:
            {
                "success": true,
                "message": "Role created successfully",
                "role": {
                    "id": 1,
                    "name": "content_manager",
                    "description": "Role for managing website content",
                    "created_at": "2025-11-07T10:00:00Z",
                    "permissions": [
                        {
                            "id": 1,
                            "name": "manage_users",
                            "target_userrole": "admin",
                            "description": "Permission to manage user accounts"
                        }
                    ]
                }
            }

    Error Responses:
    - 400 Bad Request: Invalid request body or missing required fields.
    - 409 Conflict: Role with this name already exists.
    - 500 Internal Server Error: Server error occurred while creating the role.

# Get All Roles

    Description:
        Retrieves all roles from the system with their assigned permissions. This endpoint is restricted to admin users only.

    Endpoint:
        `GET http://localhost:8094/roles`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        GET - `http://localhost:8094/roles`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "roles": [
                    {
                        "id": 1,
                        "name": "content_manager",
                        "description": "Role for managing website content",
                        "created_at": "2025-11-07T10:00:00Z",
                        "permissions": [
                            {
                                "id": 1,
                                "name": "manage_users",
                                "target_userrole": "admin",
                                "description": "Permission to manage user accounts"
                            }
                        ]
                    }
                ]
            }

    Error Responses:
    - 500 Internal Server Error: Server error occurred while fetching roles.

# Get Role by ID

    Description:
        Retrieves a specific role by its ID with all assigned permissions. This endpoint is restricted to admin users only.

    Endpoint:
        `GET http://localhost:8094/roles/{id}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        GET - `http://localhost:8094/roles/1`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "role": {
                    "id": 1,
                    "name": "content_manager",
                    "description": "Role for managing website content",
                    "created_at": "2025-11-07T10:00:00Z",
                    "permissions": [
                        {
                            "id": 1,
                            "name": "manage_users",
                            "target_userrole": "admin",
                            "description": "Permission to manage user accounts"
                        }
                    ]
                }
            }

    Error Responses:
    - 404 Not Found: Role with the specified ID not found.
    - 500 Internal Server Error: Server error occurred while fetching the role.

# Update Role

    Description:
        Updates an existing role with the specified ID, including its name, description, and permission assignments. This endpoint is restricted to admin users only.

    Endpoint:
        `PUT http://localhost:8094/roles/{id}`

    Request Headers:
        - `Content-Type: application/json`
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Request Body:
        {
            "name": "string",
            "description": "string",
            "permission_ids": [1, 2, 3]
        }

    Example Request:
        PUT - `http://localhost:8094/roles/1`
        headers:
            - `Content-Type: application/json`
        body:
        {
            "name": "content_manager_updated",
            "description": "Updated role for managing website content",
            "permission_ids": [1, 2, 4, 5]
        }
    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Role updated successfully",
                "role": {
                    "id": 1,
                    "name": "content_manager_updated",
                    "description": "Updated role for managing website content",
                    "created_at": "2025-11-07T10:00:00Z",
                    "permissions": [
                        {
                            "id": 1,
                            "name": "manage_users",
                            "target_userrole": "admin",
                            "description": "Permission to manage user accounts"
                        },
                        {
                            "id": 2,
                            "name": "manage_content",
                            "target_userrole": "admin",
                            "description": "Permission to manage content"
                        }
                    ]
                }
            }

    Error Responses:
    - 400 Bad Request: Invalid request body or missing required fields.
    - 404 Not Found: Role with the specified ID not found.
    - 409 Conflict: Role with this name already exists.
    - 500 Internal Server Error: Server error occurred while updating the role.

# Delete Role

    Description:
        Deletes an existing role with the specified ID and removes all its permission assignments. This endpoint is restricted to admin users only.

    Endpoint:
        `DELETE http://localhost:8094/roles/{id}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        DELETE - `http://localhost:8094/roles/1`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Role deleted successfully"
            }

    Error Responses:
    - 404 Not Found: Role with the specified ID not found.
    - 500 Internal Server Error: Server error occurred while deleting the role.

# Assign Permission to Role

    Description:
        Assigns a specific permission to a role. This endpoint is restricted to admin users only.

    Endpoint:
        `POST http://localhost:8094/roles/{role_id}/permissions/{permission_id}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        POST - `http://localhost:8094/roles/1/permissions/2`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Permission assigned to role successfully"
            }

    Error Responses:
    - 404 Not Found: Role or permission with the specified ID not found.
    - 409 Conflict: Permission is already assigned to this role.
    - 500 Internal Server Error: Server error occurred while assigning the permission.

# Revoke Permission from Role

    Description:
        Revokes a specific permission from a role. This endpoint is restricted to admin users only.

    Endpoint:
        `DELETE http://localhost:8094/roles/{role_id}/permissions/{permission_id}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        DELETE - `http://localhost:8094/roles/1/permissions/2`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Permission revoked from role successfully"
            }

    Error Responses:
    - 404 Not Found: Role or permission with the specified ID not found, or permission is not assigned to this role.
    - 500 Internal Server Error: Server error occurred while revoking the permission.

# Get Role Permissions

    Description:
        Retrieves all permissions assigned to a specific role. This endpoint is restricted to admin users only.

    Endpoint:
        `GET http://localhost:8094/roles/{id}/permissions`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        GET - `http://localhost:8094/roles/1/permissions`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "permissions": [
                    {
                        "id": 1,
                        "name": "manage_users",
                        "target_userrole": "admin",
                        "description": "Permission to manage user accounts",
                        "assigned_at": "2025-11-07T10:00:00Z"
                    },
                    {
                        "id": 2,
                        "name": "manage_content",
                        "target_userrole": "admin",
                        "description": "Permission to manage content",
                        "assigned_at": "2025-11-07T10:15:00Z"
                    }
                ]
            }

    Error Responses:
    - 404 Not Found: Role with the specified ID not found.
    - 500 Internal Server Error: Server error occurred while fetching role permissions.

##### User Management

# Create User

    Description:
        Creates a new user in the RBAC system and automatically assigns the appropriate role based on user type. This endpoint is called by the auth backend when users are created to keep RBAC user database synchronized.

    Endpoint:
        `POST http://localhost:8094/users`

    Request Headers:
        - `Content-Type: application/json`

    Request Body:
        {
            "userid": "string",
            "firstName": "string",
            "lastName": "string",
            "email": "string",
            "role": "string"
        }

    Example Request:
        POST - `http://localhost:8094/users`
        headers:
            - `Content-Type: application/json`
        body:
        {
            "userid": "CASH002",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@cashier.com",
            "role": "cashier"
        }

    Response:
        - Status Code: 201 Created
        - Response Body:
            {
                "success": true,
                "message": "User created and role assigned successfully",
                "user": {
                    "userid": "CASH002",
                    "firstName": "John",
                    "lastName": "Doe",
                    "email": "john.doe@cashier.com",
                    "role": "cashier",
                    "assigned_role": "cashier"
                }
            }

    Error Responses:
    - 400 Bad Request: Invalid request body or missing required fields.
    - 409 Conflict: User with this userid already exists.
    - 500 Internal Server Error: Server error occurred while creating the user.

##### User Role Assignment

# Get All Users

    Description:
        Retrieves all users from the system (used for selection in the admin UI). Each user entry includes basic profile details and currently active roles.

    Endpoint:
        `GET http://localhost:8094/users`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "users": [
                    {
                        "userid": "ADMIN001",
                        "firstName": "Mahesh",
                        "lastName": "Wij",
                        "email": "mahesh@example.com",
                        "mobile": "077xxxxxxx",
                        "current_roles": ["admin", "content_manager"]
                    }
                ]
            }

    Error Responses:
    - 500 Internal Server Error: Server error occurred while fetching users.

# Get User by ID

    Description:
        Retrieves detailed information for a specific user including currently active roles.

    Endpoint:
        `GET http://localhost:8094/users/{userId}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "user": {
                    "userid": "ADMIN001",
                    "firstName": "Mahesh",
                    "lastName": "Wij",
                    "email": "mahesh@example.com",
                    "mobile": "077xxxxxxx",
                    "current_roles": ["admin"]
                }
            }

    Error Responses:
    - 404 Not Found: User not found.
    - 500 Internal Server Error: Server error occurred while fetching the user.

# Get User Roles

    Description:
        Retrieves active roles assigned to a specific user.

    Endpoint:
        `GET http://localhost:8094/users/{userId}/roles`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "roles": [
                    {
                        "id": 1,
                        "name": "admin",
                        "description": "Administrator",
                        "assigned_at": "2025-11-07T10:00:00Z"
                    }
                ]
            }

    Error Responses:
    - 404 Not Found: User not found.
    - 500 Internal Server Error: Server error occurred while fetching user roles.

# Assign Role to User

    Description:
        Assigns a role to a user. Creates an active user-role assignment recorded in the audit table.

    Endpoint:
        `POST http://localhost:8094/users/{userId}/roles/{roleId}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        POST - `http://localhost:8094/users/USER001/roles/2`

    Response:
        - Status Code: 201 Created
        - Response Body:
            {
                "success": true,
                "message": "Role assigned to user successfully",
                "assignment_id": 123
            }

    Error Responses:
    - 404 Not Found: User or role not found.
    - 409 Conflict: User already has this role assigned.
    - 500 Internal Server Error: Server error occurred while assigning role.

# Revoke Role from User

    Description:
        Revokes (deactivates) a role assignment from a user. The record is kept for history.

    Endpoint:
        `DELETE http://localhost:8094/users/{userId}/roles/{roleId}`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        DELETE - `http://localhost:8094/users/USER001/roles/2`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "message": "Role revoked from user successfully"
            }

    Error Responses:
    - 404 Not Found: User or role not found, or user does not have this role.
    - 500 Internal Server Error: Server error occurred while revoking role.

# Get User Role Assignment History

    Description:
        Retrieves the role assignment history for a specific user, including who assigned/revoked and timestamps.

    Endpoint:
        `GET http://localhost:8094/users/{userId}/roles/history`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "history": [
                    {
                        "id": 1,
                        "role_id": 2,
                        "role_name": "content_manager",
                        "assigned_by": "ADMIN001",
                        "assigned_at": "2025-11-07T10:00:00Z",
                        "revoked_by": null,
                        "revoked_at": null,
                        "is_active": true
                    }
                ]
            }

    Error Responses:
    - 404 Not Found: User not found.
    - 500 Internal Server Error: Server error occurred while fetching history.

# Get User Permissions

    Description:
        Retrieves all permissions for a specific user, combining both inherent user role permissions (from the users table) and permissions from assigned RBAC roles. This endpoint is used by the frontend to implement permission-based UI access control.

    Endpoint:
        `GET http://localhost:8094/users/{userId}/permissions`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        GET - `http://localhost:8094/users/ADMIN001/permissions`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "permissions": [
                    {
                        "id": 1,
                        "name": "user_roles.permissions",
                        "target_userrole": "admin",
                        "description": "Permission to manage permissions"
                    },
                    {
                        "id": 2,
                        "name": "user_roles.all_roles",
                        "target_userrole": "admin",
                        "description": "Permission to view all roles"
                    }
                ]
            }

    Error Responses:
    - 404 Not Found: User not found.
    - 500 Internal Server Error: Server error occurred while fetching user permissions.

# Get User Permissions

    Description:
        Retrieves all permissions for a specific user, combining both inherent user role permissions (from the users table) and permissions from assigned RBAC roles. This provides a complete view of what a user can do in the system.

    Endpoint:
        `GET http://localhost:8094/users/{userId}/permissions`

    Request Headers:
        - `Authorization: Bearer <admin_token>` (TODO: Authentication to be added later)

    Example Request:
        GET - `http://localhost:8094/users/STUD001/permissions`
        headers:
            - `Authorization: Bearer <admin_token>`

    Response:
        - Status Code: 200 OK
        - Response Body:
            {
                "success": true,
                "permissions": [
                    {
                        "id": 1,
                        "name": "view_student_dashboard",
                        "target_userrole": "student",
                        "description": "Permission to view student dashboard"
                    },
                    {
                        "id": 2,
                        "name": "enroll_course",
                        "target_userrole": "student",
                        "description": "Permission to enroll in courses"
                    },
                    {
                        "id": 5,
                        "name": "manage_content",
                        "target_userrole": "content_manager",
                        "description": "Permission to manage website content"
                    }
                ]
            }

    Error Responses:
    - 404 Not Found: User not found.
    - 500 Internal Server Error: Server error occurred while fetching user permissions.
