1. Create admin with Abc@1234
    + it should create an admin user with the specified password and return the admin id

2. Check the terminal and get the admin id and test the permission of that admin id in rbac
    + it should return the list of permissions assigned to that admin
    + it shoud send post req from auth assigning that user the role of admin if not already assigned

3. Create cashier with Cashier@123 and Phone number 0719558221
    + it should create a cashier user with the specified password and phone number and return the cashier id
    + ✅ FIXED: Now automatically assigns cashier role and permissions

4. check the role of the created cashier id in rbac
    + it should return the role assigned to that cashier
    + ✅ FIXED: Role is now automatically assigned during user creation

5. check the permission of the created cashier id in rbac
    + it should return the list of permissions assigned to that cashier

6. remove  one  permission of the cashier role in rbac
    + it should remove the specified permission from the cashier role and return the updated list of permissions

7. check the permission of the created cashier id in rbac again
    + it should return the updated list of permissions assigned to that cashier, reflecting the removed permission

8. Test revokable permissions: revoke cashier role from user
    + it should remove all permissions from the user immediately

9. Test permission restoration: reassign cashier role to user
    + it should restore all permissions to the user immediately

10. creat teacher with Teacher@123 and Phone number 0719958221
    + it should create a teacher user with the specified password and phone number and return the teacher id
    + ✅ FIXED: Now automatically assigns teacher role and permissions

11. check the role of the created teacher id in rbac
    + it should return the role assigned to that teacher
    + ✅ COMPLETED: Teacher role automatically assigned

12. check the permission of the created teacher id in rbac
    + it should return the list of permissions assigned to that teacher
    + ✅ COMPLETED: All teacher permissions automatically granted

13. remove  one  permission of the teacher role in rbac
    + it should remove the specified permission from the teacher role and return the updated list of permissions
    + ✅ COMPLETED: Removed class_management permission from teacher role

14. check the permission of the created teacher id in rbac again
    + it should return the updated list of permissions assigned to that teacher, reflecting the removed permission
    + ✅ COMPLETED: Teacher T003 now has 17 permissions (class_management removed)