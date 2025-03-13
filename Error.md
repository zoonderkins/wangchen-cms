# Error Reference Guide

This document provides a reference for common errors encountered in the Wangchen Backend application, their causes, and potential solutions. Use this guide to quickly identify and resolve issues.

## HTTP Status Codes

| Status Code | Description | Common Causes | Solution |
|-------------|-------------|---------------|----------|
| 400 | Bad Request | Invalid form data, missing required fields | Check form data for completeness and validity |
| 401 | Unauthorized | Missing or invalid authentication credentials | Ensure user is logged in with valid credentials |
| 403 | Forbidden | User lacks permission to access resource | Verify user role and permissions |
| 404 | Not Found | Resource or route doesn't exist | Check URL path, route configuration, or resource ID |
| 500 | Internal Server Error | Server-side error in application code | Check server logs for detailed error information |

## Form Submission Errors

### Route Mismatch Errors

**Error**: "Oops! Something went wrong. The page you are looking for could not be found."

**Cause**: Form action URL doesn't match the defined route in the router.

**Example**: Form submitting to `/admin/about/edit/2` when route is defined as `/admin/about/2`

**Solution**: Update the form action to match the route defined in the router:
```html
<!-- Incorrect -->
<form action="/admin/about/edit/<%= item.id %>" method="POST">

<!-- Correct -->
<form action="/admin/about/<%= item.id %>" method="POST">
```

### File Upload Errors

**Error**: "Failed to process file upload"

**Cause**: Missing middleware for file uploads or incorrect enctype in form

**Solution**: 
1. Ensure form has `enctype="multipart/form-data"` attribute
2. Add upload middleware to route:
```javascript
router.post('/about/:id', hasRole(['super_admin', 'admin']), aboutController.upload, aboutController.updateItem);
```

## Database Errors

### Unique Constraint Violation

**Error**: "Unique constraint failed on the {field}"

**Cause**: Attempting to create a record with a value that must be unique but already exists

**Solution**: Check if the record already exists before creating, or update the existing record

### Foreign Key Constraint Violation

**Error**: "Foreign key constraint failed on the field {field}"

**Cause**: Referencing a record that doesn't exist or deleting a record that is referenced by other records

**Solution**: Ensure referenced records exist or handle cascading deletes appropriately

### Type Errors

**Error**: "Argument {argument} must be a {type}, but got {actual_type}"

**Cause**: Passing incorrect data type to Prisma query

**Solution**: Convert data to the correct type before passing to Prisma:
```javascript
// Incorrect
const item = await prisma.aboutItem.findUnique({ where: { id: req.params.id } });

// Correct
const item = await prisma.aboutItem.findUnique({ where: { id: parseInt(req.params.id) } });
```

## Authentication Errors

### Session Expired

**Error**: "Please log in to access this resource"

**Cause**: User session has expired or is invalid

**Solution**: Redirect user to login page and clear invalid session data

### Permission Denied

**Error**: "您沒有權限訪問此資源" (You do not have permission to access this resource)

**Cause**: User lacks required role or permission for the requested action

**Solution**: Check user roles and permissions, or request elevated privileges

## File System Errors

### File Not Found

**Error**: "ENOENT: no such file or directory"

**Cause**: Attempting to access a file that doesn't exist

**Solution**: Check file paths and ensure directories exist before accessing files

### Permission Denied

**Error**: "EACCES: permission denied"

**Cause**: Insufficient permissions to read/write files

**Solution**: Check file permissions and ensure application has appropriate access

## Middleware Errors

### Missing Middleware

**Error**: "Cannot read property 'file' of undefined" or "req.file is undefined"

**Cause**: Missing file upload middleware in route definition

**Solution**: Add appropriate middleware to route:
```javascript
router.post('/route', uploadMiddleware, controller.method);
```

## Common Troubleshooting Steps

1. **Check Server Logs**: Most detailed error information will be in the server logs
2. **Verify Route Configuration**: Ensure routes are correctly defined and match form actions
3. **Check Middleware Order**: Middleware execution order matters; ensure they're in the correct sequence
4. **Validate Form Data**: Ensure all required fields are present and in the correct format
5. **Check File Paths**: For file operations, verify paths are correct and directories exist
6. **Inspect Database Queries**: Log database queries to verify they're correctly formed
7. **Check Authentication**: Verify user is authenticated and has appropriate permissions

## Logging Best Practices

Add detailed logging to help troubleshoot issues:

```javascript
try {
    // Operation that might fail
} catch (error) {
    logger.error(`Failed to update item: ${error.message}`, {
        error,
        userId: req.session.user.id,
        itemId: req.params.id
    });
    req.flash('error_msg', `Failed to update item: ${error.message}`);
    res.redirect('/admin/items');
}
```

## Adding Custom Error Codes

For more systematic error handling, consider implementing custom error codes:

```javascript
// Define error codes
const ERROR_CODES = {
    INVALID_INPUT: 'E001',
    RESOURCE_NOT_FOUND: 'E002',
    PERMISSION_DENIED: 'E003',
    DATABASE_ERROR: 'E004',
    FILE_UPLOAD_ERROR: 'E005'
};

// Use in error handling
try {
    // Operation
} catch (error) {
    logger.error(`${ERROR_CODES.DATABASE_ERROR}: ${error.message}`);
    req.flash('error_msg', `Error code ${ERROR_CODES.DATABASE_ERROR}: ${error.message}`);
}
```

## Implementing Global Error Handler

Consider adding a global error handler middleware to catch and format all errors consistently:

```javascript
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    // Determine status code
    const statusCode = err.statusCode || 500;
    
    // Format error for display
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message;
    
    // Respond based on request type
    if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(statusCode).json({ error: errorMessage });
    }
    
    // For regular requests, render error page
    req.flash('error_msg', errorMessage);
    res.status(statusCode).render('error', {
        title: 'Error',
        message: errorMessage,
        error: process.env.NODE_ENV === 'production' ? {} : err
    });
});
``` 