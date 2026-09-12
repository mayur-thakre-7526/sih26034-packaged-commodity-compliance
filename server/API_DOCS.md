# Package Checker API Documentation

This document provides a simple overview of the backend workflow and all available API endpoints.

## 🔄 Backend Workflow

The core functionality of the backend is to manage users, products, and handle the "Package Checking" scanning process.

1. **Authentication**: Users log in to receive a JWT (JSON Web Token). This token is required in the `Authorization: Bearer <token>` header for all other endpoints.
2. **Product Definition**: Before scanning, a product must be defined (name, brand, generic name) in the database via the `/api/products` endpoint.
3. **Scan Execution**: 
   - A user uploads package images linked to a `product_id` to the `/api/scans` endpoint.
   - The server stores the images in a Supabase Storage bucket.
   - The server forwards these images to a local Python image processing service (`IMAGE_PROCESSING_URL`).
   - The Python service returns a structured compliance result, and the backend stores this result in the database.
4. **Reporting**: Users can retrieve a generated PDF compliance report of any scan via `/api/scans/:id/report`.
5. **Dashboard Insights**: The frontend displays aggregated statistics on compliance and violations over time using `/api/dashboard`.

---

## 🌐 API Reference

### 🔐 Authentication
*All endpoints except `/login` require the `Authorization: Bearer <token>` header.*

- **`POST /api/auth/login`**
  - **Body**: `{ "email": "user@example.com", "password": "password123" }`
  - **Description**: Authenticates the user and returns session data including the JWT access token.

- **`GET /api/auth/me`**
  - **Description**: Returns the currently authenticated user's profile details.

### 👥 Users (Admin Only)
*These endpoints require the authenticated user to have the `admin` role.*

- **`POST /api/users`**
  - **Body**: `{ "name": "John", "email": "john@ex.com", "password": "pass", "role": "inspector" }`
  - **Description**: Creates a new user in Supabase and the local database.
- **`GET /api/users`**
  - **Description**: Retrieves a list of all users.
- **`PATCH /api/users/:id/status`**
  - **Body**: `{ "is_active": false }`
  - **Description**: Activates or bans a user from the system.

### 📦 Products

- **`POST /api/products`**
  - **Body**: `{ "product_name": "...", "brand_name": "...", "generic_name": "..." }`
  - **Description**: Creates a new product entity.
- **`GET /api/products`**
  - **Query (Optional)**: `?search=term`
  - **Description**: Retrieves all products, ordered by newest first.
- **`GET /api/products/:id`**
  - **Description**: Retrieves a single product's details by its ID.

### 📸 Scans & Reports

- **`POST /api/scans`**
  - **Content-Type**: `multipart/form-data`
  - **Form Fields**: `product_id` (string), `images` (file / array of files).
  - **Description**: Uploads images, runs the external Python image processor for compliance checking, and saves the results.
- **`GET /api/scans`**
  - **Query (Optional)**: `?search=term`, `?status=compliant|non_compliant`
  - **Description**: Retrieves a history of all scans with product names and overall statuses.
- **`GET /api/scans/:id`**
  - **Description**: Retrieves the full, detailed JSON result of a specific scan.
- **`GET /api/scans/:id/report`**
  - **Description**: Generates and returns a downloadable PDF compliance report containing the extracted declarations, rule violations, and original images.

### 📊 Dashboard

- **`GET /api/dashboard`**
  - **Description**: Retrieves aggregated compliance metrics (total scans, critical violations, 7-day activity graph data) to populate the frontend dashboard.
