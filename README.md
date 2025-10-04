Developer's Guide: Reviving the Blue Collar Services Platform

This guide provides all the necessary steps to set up and run the project from a fresh clone of the GitHub repository.
I. Core Project Goals & Reminders

    Main Goal: To create a full-stack, two-sided marketplace connecting customers with blue-collar service providers.

    User Roles: The system is built around two key user roles: Customers (who book services) and Providers (who offer services). This is controlled by the is_provider boolean field on our custom User model.

    Authentication: We are using JWT (JSON Web Tokens) for a stateless API. The frontend is responsible for storing the access and refresh tokens. We built a custom serializer (MyTokenObtainPairSerializer) to add user roles (is_provider) and user_id directly into the token payload for frontend convenience.

    Real-time Chat: This is a core feature, not an afterthought. We used Django Channels and WebSockets. A key challenge we solved was WebSocket authentication, which we handled by passing the JWT in the URL's query parameter (?token=...) and creating a custom TokenAuthMiddleware on the backend to validate it.

    Permissions: The backend is heavily reliant on custom DRF permission classes to enforce business logic (e.g., IsCustomerUser for creating bookings, IsProviderOfBooking for updating status). This makes the API secure and role-aware.

    Frontend State: Global authentication state (user info, tokens, login/logout status) is managed via React's Context API (AuthContext.js). This avoids prop drilling and centralizes auth logic.

II. System Requirements & Setup

You'll need to set up both the backend and frontend environments.

A. Required Software:

    Git: For cloning the repository.

    Python (3.8+): The runtime for the Django backend.

    PostgreSQL (12+): The project's database.

    Node.js (LTS version, e.g., 18.x or 20.x): The runtime for the React frontend development server and its tooling.

    npm or yarn: Node.js package manager.

    (Optional but Recommended) Redis: The message broker for Django Channels. For initial local development, you can fall back to the in-memory channel layer, but Redis is needed for a full-featured setup.

B. Backend Setup (Django)

    Clone the Repository:
    code Bash

    
git clone <your-github-repository-url>
cd <repository-folder-name>/bluecollar_backend # Navigate into the backend directory

  

Create and Activate Virtual Environment:
code Bash

    
python -m venv venv
source venv/Scripts/activate  # On Windows Git Bash
# Or: venv\Scripts\activate      # On Windows CMD/PowerShell
# Or: source venv/bin/activate    # On macOS/Linux

  

Install Python Dependencies:
All required packages are listed in requirements.txt (you should create this file if it doesn't exist: pip freeze > requirements.txt).
code Bash

    
pip install -r requirements.txt

  

Set up PostgreSQL Database:

    Make sure your PostgreSQL server is running.

    Create a database and a user for the project using psql or a GUI tool like pgAdmin.
    code SQL

        
    CREATE USER myprojectuser WITH PASSWORD 'mypassword123';
    CREATE DATABASE myprojectdb OWNER myprojectuser;

      

Configure Environment Variables / settings.py:

    Open bluecollar_backend/settings.py.

    Locate the DATABASES setting and update the NAME, USER, and PASSWORD to match what you created in the previous step.

    Check the SECRET_KEY. For local development, the one in the repository is fine.

    If you are using Redis, ensure the CHANNEL_LAYERS config points to the correct Redis host and port.

Run Database Migrations:
This will create all the necessary tables in your PostgreSQL database.
code Bash

    
python manage.py migrate

  

Create a Superuser:
This is for accessing the Django Admin panel.
code Bash

    
python manage.py createsuperuser

  

Run the Backend Server:
code Bash

        
    python manage.py runserver

      

    The Django ASGI/Daphne server should start, typically at http://127.0.0.1:8000.

C. Frontend Setup (React)

    Navigate to the Frontend Directory:
    Open a new, separate terminal.
    code Bash

    
cd <repository-folder-name>/bluecollar_frontend # Navigate into the frontend directory

  

Install JavaScript Dependencies:
This command reads package.json and installs all necessary libraries like React, Axios, etc.
code Bash

    
npm install

  

Configure Environment Variables (if any):

    Check for a .env file or .env.example file. This is where you might store the base URL for the backend API (e.g., REACT_APP_API_URL=http://127.0.0.1:8000).

    If it's not set, your axiosConfig.js might have the URL hardcoded, which is fine for local development.

Run the Frontend Server:
code Bash

        
    npm start

      

    The React development server should start, typically opening a new browser tab at http://localhost:3000.

III. Common Errors and Solutions on Revival

A. Backend Errors:

    Error: ImportError: Couldn't import Django... Did you forget to activate a virtual environment?

        Solution: Your terminal is using the system Python. Stop the server and run source venv/Scripts/activate (or your OS equivalent) before running python manage.py runserver.

    Error: psycopg2.errors.OperationalError: FATAL: password authentication failed for user "..."

        Solution: The database credentials in bluecollar_backend/settings.py (USER or PASSWORD) are incorrect. Verify them against what you set up in PostgreSQL.

    Error: django.db.utils.ProgrammingError: column "..." does not exist

        Solution: Your database schema is out of sync with your models. You likely made a model change but didn't create or apply the migration. Run python manage.py makemigrations and then python manage.py migrate.

    Error: redis.exceptions.ConnectionError: Error ... connecting to 127.0.0.1:6379.

        Solution: Your CHANNEL_LAYERS is configured to use Redis, but your Redis server is not running.

            Fix 1 (Run Redis): Install and start your local Redis server (command is often redis-server).

            Fix 2 (Temporary): For quick development, switch to the in-memory layer in settings.py: CHANNEL_LAYERS = { "default": { "BACKEND": "channels.layers.InMemoryChannelLayer" } }.

B. Frontend Errors:

    Error: npm ERR! code ENOENT ... Could not read package.json

        Solution: You are in the wrong directory. npm commands must be run from the root of your React project (the bluecollar_frontend folder).

    Error: 'cross-env' is not recognized as an internal or external command...

        Solution: The cross-env dependency is missing or corrupted. Stop the server, delete the node_modules folder and package-lock.json file, and then run npm install again.

    Error: CORS policy: No 'Access-Control-Allow-Origin' header is present...

        Solution: Your Django backend is blocking the request from your frontend's origin. Open bluecollar_backend/settings.py and add your frontend's origin (e.g., http://localhost:3000, and any local network IP you might be using like http://192.168.1.107:3000) to the CORS_ALLOWED_ORIGINS list. Restart the Django server.

    Error: 401 Unauthorized or 403 Forbidden on API calls after login.

        401 (Unauthorized): Your axiosConfig.js is likely not sending the Authorization: Bearer <token> header correctly, or your token has expired and the refresh mechanism is failing. Use browser dev tools (Network tab) to inspect the request headers.

        403 (Forbidden): You are authenticated, but you don't have permission for the action (e.g., a provider trying to create a booking). This is your backend permissions working correctly! Test the action with a user who has the proper role (e.g., log in as a customer).

    Error: WebSocket connection fails with Code 1006 or 1011.

        Solution: This is almost always a backend issue.

            Code 1006: The server is likely closing the connection during the handshake. Check the Django server logs for authorization failures from your check_user_authorization_for_room consumer method. Ensure the user is authorized for that specific chat room.

            Code 1011 (Server Error): There is an unhandled Python exception happening on the backend after the connection was accepted (e.g., in send_message_history or mark_messages_as_read). The Django server terminal will show a full traceback pointing to the exact line of code that failed.

By following this guide, you should be able to get both the frontend and backend running smoothly and quickly get back up to speed with the project's architecture and goals
