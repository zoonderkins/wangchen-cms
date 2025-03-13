# Role Permissions in 大南方新矽谷

This document outlines the permissions assigned to each role in the 大南方新矽谷 system.

## Roles Overview

### Super Admin
The Super Admin role has full access to all features and functionalities of the CMS.

**Permissions:**
- ✅ Access Dashboard (`access:dashboard`)
- User Management
  - ✅ View Users (`user:list`)
  - ✅ Create Users (`user:create`)
  - ✅ Edit Users (`user:edit`)
  - ✅ Delete Users (`user:delete`)
  - ✅ Manage User Roles (`user:manage_roles`)
- Article Management
  - ✅ View Articles (`article:list`)
  - ✅ Create Articles (`article:create`)
  - ✅ Edit All Articles (`article:edit_all`)
  - ✅ Delete All Articles (`article:delete_all`)
  - ✅ Publish/Unpublish Articles (`article:publish`)
  - ✅ Feature Articles (`article:feature`)
- Category Management
  - ✅ View Categories (`category:list`)
  - ✅ Create Categories (`category:create`)
  - ✅ Edit Categories (`category:edit`)
  - ✅ Delete Categories (`category:delete`)
  - ✅ Manage Category Permissions (`category:manage_permissions`)
- Media Management
  - ✅ View Media Library (`media:list`)
  - ✅ Upload Media (`media:upload`)
  - ✅ Delete Media (`media:delete`)
  - ✅ Edit Media Details (`media:edit`)
- System Settings
  - ✅ View Settings (`settings:view`)
  - ✅ Edit Settings (`settings:edit`)
  - ✅ Manage Site Configuration (`settings:manage`)

### Admin
The Admin role has extensive access but cannot manage users or system settings.

**Permissions:**
- ✅ Access Dashboard (`access:dashboard`)
- User Management
  - ✅ View Users (`user:list`)
  - ❌ Create Users
  - ❌ Edit Users
  - ❌ Delete Users
  - ❌ Manage User Roles
- Article Management
  - ✅ View Articles (`article:list`)
  - ✅ Create Articles (`article:create`)
  - ✅ Edit All Articles (`article:edit_all`)
  - ✅ Delete All Articles (`article:delete_all`)
  - ✅ Publish/Unpublish Articles (`article:publish`)
  - ✅ Feature Articles (`article:feature`)
- Category Management
  - ✅ View Categories (`category:list`)
  - ✅ Create Categories (`category:create`)
  - ✅ Edit Categories (`category:edit`)
  - ✅ Delete Categories (`category:delete`)
  - ✅ Manage Category Permissions (`category:manage_permissions`)
- Media Management
  - ✅ View Media Library (`media:list`)
  - ✅ Upload Media (`media:upload`)
  - ✅ Delete Media (`media:delete`)
  - ✅ Edit Media Details (`media:edit`)
- System Settings
  - ✅ View Settings (`settings:view`)
  - ❌ Edit Settings
  - ❌ Manage Site Configuration

### Editor
The Editor role focuses on content management with category-specific permissions.

**Permissions:**
- ✅ Access Dashboard (`access:dashboard`)
- User Management
  - ❌ View Users
  - ❌ Create Users
  - ❌ Edit Users
  - ❌ Delete Users
  - ❌ Manage User Roles
- Article Management
  - ✅ View Articles in Assigned Categories (`article:list_assigned`)
  - ✅ Create Articles in Assigned Categories (`article:create_assigned`)
  - ✅ Edit Articles in Assigned Categories (`article:edit_assigned`)
  - ✅ Delete Articles in Assigned Categories (`article:delete_assigned`)
  - ❌ Publish/Unpublish Articles
  - ❌ Feature Articles
- Category Management
  - ✅ View Assigned Categories (`category:list_assigned`)
  - ❌ Create Categories
  - ❌ Edit Categories
  - ❌ Delete Categories
  - ❌ Manage Category Permissions
- Media Management
  - ✅ View Media Library (`media:list`)
  - ✅ Upload Media (`media:upload`)
  - ❌ Delete Media
  - ✅ Edit Own Media Details (`media:edit_own`)
- System Settings
  - ✅ View Settings (`settings:view`)
  - ❌ Edit Settings
  - ❌ Manage Site Configuration

## Category-Specific Permissions

Editors can be assigned specific permissions for individual categories. These permissions include:

1. **View Permission (`category:view:$id`)**
   - View articles within the category
   - View category details

2. **Create Permission (`category:create:$id`)**
   - Create new articles in the category

3. **Edit Permission (`category:edit:$id`)**
   - Edit existing articles in the category
   - Update article metadata

4. **Delete Permission (`category:delete:$id`)**
   - Delete articles within the category

### Permission Assignment

- Super Admins and Admins can assign category permissions to Editors
- Permissions are granular and can be assigned per category
- An Editor must have explicit permissions for a category to perform actions
- Permissions can be assigned through the user management interface

### Examples

1. **Category-Specific Editor**
   ```json
   {
     "role": "editor",
     "categoryPermissions": {
       "2": {
         "canView": true,
         "canCreate": true,
         "canEdit": true,
         "canDelete": true
       }
     }
   }
   ```

2. **Multi-Category Editor**
   ```json
   {
     "role": "editor",
     "categoryPermissions": {
       "2": {
         "canView": true,
         "canCreate": true,
         "canEdit": true,
         "canDelete": false
       },
       "3": {
         "canView": true,
         "canEdit": true,
         "canCreate": false,
         "canDelete": false
       }
     }
   }
   ```

## Permission Codes

This section lists all available permission codes that can be assigned to roles:

### Dashboard
- `access:dashboard`: Access to the admin dashboard

### User Management
- `user:list`: View list of users
- `user:create`: Create new users
- `user:edit`: Edit user details
- `user:delete`: Delete users
- `user:manage_roles`: Assign and manage user roles

### Article Management
- `article:list`: View all articles
- `article:list_assigned`: View articles in assigned categories
- `article:create`: Create articles in any category
- `article:create_assigned`: Create articles in assigned categories
- `article:edit_all`: Edit any article
- `article:edit_assigned`: Edit articles in assigned categories
- `article:delete_all`: Delete any article
- `article:delete_assigned`: Delete articles in assigned categories
- `article:publish`: Publish or unpublish articles
- `article:feature`: Feature articles on the homepage

### Category Management
- `category:list`: View all categories
- `category:list_assigned`: View assigned categories
- `category:create`: Create new categories
- `category:edit`: Edit categories
- `category:delete`: Delete categories
- `category:manage_permissions`: Manage category-specific permissions

### Media Management
- `media:list`: View media library
- `media:upload`: Upload new media
- `media:delete`: Delete media files
- `media:edit`: Edit media details
- `media:edit_own`: Edit own media details

### System Settings
- `settings:view`: View system settings
- `settings:edit`: Edit system settings
- `settings:manage`: Manage site configuration

### Category-Specific Permissions
- `category:view:$id`: View specific category and its articles
- `category:create:$id`: Create articles in specific category
- `category:edit:$id`: Edit articles in specific category
- `category:delete:$id`: Delete articles in specific category
