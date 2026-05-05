# FastAPI Backend Documentation

This project has been migrated from Node.js/Express to a **Python FastAPI** backend.

## Architecture

*   **Framework:** FastAPI (Python)
*   **Database:** SQLite (via SQLAlchemy) - Data is saved to `backend/eduly.db`.
*   **Authentication:** JWT (JSON Web Tokens)
*   **Data Validation:** Pydantic

## Folder Structure

All backend code is located in the `/backend` folder.
*   `main.py`: Contains the FastAPI application, database models, schemas, and all API routes.
*   `requirements.txt`: Lists all Python dependencies.
*   `eduly.db`: The SQLite database file (created automatically on first run).

## How to Run Locally

You will need to run the frontend and backend in **two separate terminal windows**.

### 1. Start the FastAPI Backend
Open a new terminal in VS Code and run:
```bash
cd backend

# 1. Create a virtual environment (fixes the "externally-managed-environment" error)
python3 -m venv venv

# 2. Activate the virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn main:app --reload
```
The backend will start on `http://localhost:8000`. You can view the interactive API documentation at `http://localhost:8000/docs`.

### 2. Start the React Frontend
Open a **second** terminal in VS Code and run:
```bash
npm install
npm run dev
```
The frontend will start on `http://localhost:5173` (or 3000). It is configured to automatically proxy all `/api` requests to the Python backend on port 8000.

## Default Login Credentials
When you start the backend for the first time, it automatically creates an admin user:
*   **Email:** `admin@edusaas.com`
*   **Password:** `Admin1234!`

## Migrating to PostgreSQL or MySQL
Currently, the app uses SQLite (`sqlite:///./eduly.db`). To switch to a production database like PostgreSQL or MySQL:

1. Install the appropriate driver (e.g., `pip install psycopg2-binary` for Postgres or `pip install pymysql` for MySQL).
2. Open `backend/main.py`.
3. Change the `SQLALCHEMY_DATABASE_URL`:
   ```python
   # For PostgreSQL:
   SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
   
   # For MySQL:
   SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:password@localhost/dbname"
   ```
4. Remove the `connect_args={"check_same_thread": False}` from the `create_engine` call (this is only needed for SQLite).
