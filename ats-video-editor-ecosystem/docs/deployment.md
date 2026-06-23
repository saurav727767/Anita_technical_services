# Deployment & Production Architecture Guide

Comprehensive documentation detailing production deployment patterns, DB hosting, and core REST API documentation for the ATS Video Editor ecosystem.

---

## 1. REST API Specification

### Authentication Enpoints
* **`POST /api/auth/register`**
  * Description: Sign up a new user.
  * Request Body: ` { "name": "Name", "email": "user@domain.com", "password": "secure_password" } `
  * Response: Returns JWT auth token and user profile model.
* **`POST /api/auth/login`**
  * Description: Login with email and password.
  * Request Body: ` { "email": "user@domain.com", "password": "secure_password" } `
  * Response: Returns JWT auth token and user profile model.
* **`POST /api/auth/google-login`**
  * Description: Synchronize client OAuth profile model with database record.
  * Request Body: ` { "googleId": "id_str", "name": "Name", "email": "user@domain.com", "tokens": { ... } } `
  * Response: Returns JWT auth token.

### Project Storage Endpoints (Authenticated: JWT Bearer)
* **`GET /api/projects`**
  * Description: Retrieve list of backed-up projects for current user.
  * Response: `{ "success": true, "count": 2, "data": [...] }`
* **`POST /api/projects`**
  * Description: Save a new project backup.
  * Request Body: `{ "title": "Project Name", "timeline": { "tracks": {...} }, "duration": 45.2 }`
* **`PUT /api/projects/:id`**
  * Description: Update an existing project backup.
* **`DELETE /api/projects/:id`**
  * Description: Delete a project backup from local DB.

---

## 2. MongoDB Database & Index Optimization
To support high request throughput and concurrent queries, configure the following database indices:
* `UserSchema`: Unique index on `email`.
* `ProjectSchema`: Compound index on `{ userId: 1, updatedAt: -1 }` to optimize timeline retrieval feeds.

---

## 3. Optional Cloudinary Storage Setup
For users requesting web file access or preview links:
1. Sign up on [Cloudinary](https://cloudinary.com/).
2. Copy your Cloud name, API Key, and Secret.
3. Configure them inside the backend `.env` variables:
   ```env
   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
   ```

---

## 4. Production Deployment Guidelines (PM2 + Nginx reverse proxy)

1. Clone backend to your host (e.g. AWS EC2 or DigitalOcean Droplet).
2. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```
3. Start backend using PM2 to manage lifecycle:
   ```bash
   pm2 start server.js --name "ats-backend"
   ```
4. Set up Nginx as a reverse proxy mapping port 80/443 traffic to backend port `5000`.
