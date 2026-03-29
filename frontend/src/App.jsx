import { useState, useEffect } from "react";

const CURRICULUM = [
  // PHASE 1: PYTHON
  {
    day: 1, phase: "Python", topic: "Variables & Data Types",
    method: "Open Python. Type everything yourself. Don't copy.",
    learn: "String, int, float, bool. Variable assignment. print(). type(). f-strings.",
    exercise: "Create variables for your name, age, city, is_student. Print them using f-strings.",
    resource: "Search: 'Python variables for beginners Corey Schafer' (watch max 15 min, then close and code)",
    project: null,
  },
  {
    day: 2, phase: "Python", topic: "Conditions (if/elif/else)",
    method: "Think in real life logic. If this → do this. Else → do that.",
    learn: "if, elif, else. Comparison operators (==, !=, >, <). Logical (and, or, not).",
    exercise: "Write a program: input a number, print if it's positive, negative, or zero. Then check if student age is eligible to vote.",
    resource: "Search: 'Python if else statements 10 minutes' on YouTube",
    project: null,
  },
  {
    day: 3, phase: "Python", topic: "Loops (for & while)",
    method: "Loops = doing same thing multiple times. Master range() first.",
    learn: "for loop, while loop, range(), break, continue, nested loops.",
    exercise: "Print multiplication table of 5. Then reverse a list using a loop. Then sum all numbers 1-100.",
    resource: "Search: 'Python loops for beginners Tech With Tim'",
    project: null,
  },
  {
    day: 4, phase: "Python", topic: "Functions",
    method: "Function = reusable block. Parameters go in, result comes out.",
    learn: "def, parameters, return, default args, *args, **kwargs.",
    exercise: "Write: greet(name), calculate_area(length, width), is_even(number), find_max(list). All from scratch.",
    resource: "Search: 'Python functions Corey Schafer' (15 min max)",
    project: null,
  },
  {
    day: 5, phase: "Python", topic: "Lists & Tuples",
    method: "List = ordered, changeable. Tuple = ordered, fixed. Use both.",
    learn: "append, remove, pop, sort, slice, len, index, in operator. List iteration.",
    exercise: "Create a student list. Add, remove, sort. Find the highest mark using a loop (no max() function).",
    resource: "Search: 'Python lists tutorial 15 minutes' on YouTube",
    project: null,
  },
  {
    day: 6, phase: "Python", topic: "Dictionaries & Sets",
    method: "Dictionary = key-value pairs. Most important for backend — JSON is a dict.",
    learn: "dict creation, get(), keys(), values(), items(), update(). Nested dicts.",
    exercise: "Create a customer dict with name, phone, email, orders. Loop through it. Nest another dict inside for address.",
    resource: "Search: 'Python dictionaries Corey Schafer'",
    project: null,
  },
  {
    day: 7, phase: "Python", topic: "MINI PROJECT 1 — Grade Calculator",
    method: "Build from scratch. No tutorial. Use everything from Day 1-6.",
    learn: "Combining variables, loops, conditions, lists, dicts together.",
    exercise: "Build CLI app: input student names and marks. Calculate average. Print grade (A/B/C/F). Store all students in a list of dicts.",
    resource: "No tutorial. Only you and the blank file. Google only for syntax errors.",
    project: "Grade Calculator CLI",
  },
  {
    day: 8, phase: "Python", topic: "OOP — Classes & Objects",
    method: "Class = blueprint. Object = actual thing built from it.",
    learn: "class, __init__, self, instance variables, instance methods.",
    exercise: "Create a Customer class with name, phone, email. Add methods: greet(), update_email(). Create 3 customer objects.",
    resource: "Search: 'Python OOP for beginners Corey Schafer class tutorial'",
    project: null,
  },
  {
    day: 9, phase: "Python", topic: "OOP — Inheritance & Encapsulation",
    method: "Inheritance = child class gets parent class features. Very used in FastAPI models.",
    learn: "Inheritance, super(), method overriding, private attributes with __",
    exercise: "Create Person class. Make Customer and Admin inherit from it. Admin has extra delete_customer() method. Customer has place_order().",
    resource: "Search: 'Python inheritance tutorial Corey Schafer'",
    project: null,
  },
  {
    day: 10, phase: "Python", topic: "File Handling",
    method: "Backend reads/writes files constantly — logs, CSVs, config files.",
    learn: "open(), read(), write(), with statement, JSON file handling, csv module.",
    exercise: "Save your customer list to a JSON file. Read it back. Update one customer's email and save again.",
    resource: "Search: 'Python file handling JSON tutorial'",
    project: null,
  },
  {
    day: 11, phase: "Python", topic: "Error Handling",
    method: "Every real app must handle errors. Crashes in production = bad.",
    learn: "try, except, finally, raise, specific exceptions (ValueError, KeyError, FileNotFoundError).",
    exercise: "Wrap your grade calculator in try/except. Handle: invalid input, file not found, division by zero. Print helpful error messages.",
    resource: "Search: 'Python error handling try except tutorial'",
    project: null,
  },
  {
    day: 12, phase: "Python", topic: "Modules & Packages",
    method: "Real projects split code into multiple files. Learn to import your own code.",
    learn: "import, from...import, creating your own module, pip, requirements.txt.",
    exercise: "Split your grade calculator into: models.py (Student class), utils.py (grade function), main.py (runs the app). Import between files.",
    resource: "Search: 'Python modules packages tutorial Real Python'",
    project: null,
  },
  {
    day: 13, phase: "Python", topic: "List Comprehensions & Lambda",
    method: "These are shortcuts — used everywhere in professional Python code.",
    learn: "List comprehension, dict comprehension, lambda, map(), filter().",
    exercise: "From a list of students, get only those who passed (marks > 40) using list comprehension. Then sort by marks using lambda.",
    resource: "Search: 'Python list comprehension lambda 10 minutes'",
    project: null,
  },
  {
    day: 14, phase: "Python", topic: "MINI PROJECT 2 — Contact Book CLI",
    method: "Full Python project. Uses classes, file handling, error handling, dicts.",
    learn: "Combining everything from week 2.",
    exercise: "CLI Contact Book: add contact, view all, search by name, update, delete. Save to JSON file. Handle all errors.",
    resource: "No tutorial. Build yourself. Take 2-3 hours. This is your Python final exam.",
    project: "Contact Book CLI App",
  },
  // PHASE 2: SQL
  {
    day: 15, phase: "SQL", topic: "What is a Database & Tables",
    method: "Go to sqliteonline.com — free, no install. Just type SQL.",
    learn: "CREATE TABLE, data types (VARCHAR, INTEGER, TEXT, TIMESTAMP, BOOLEAN), PRIMARY KEY, NOT NULL.",
    exercise: "Create a customers table with: id, name, email, phone, created_at. Then create a campaigns table.",
    resource: "sqliteonline.com — just start typing. Search: 'SQL CREATE TABLE tutorial W3Schools'",
    project: null,
  },
  {
    day: 16, phase: "SQL", topic: "SELECT, WHERE, ORDER BY",
    method: "SELECT is the most used SQL command. Master it fully.",
    learn: "SELECT *, SELECT columns, WHERE conditions, AND/OR, LIKE, IN, ORDER BY, LIMIT.",
    exercise: "Insert 10 fake customers. Select all. Select only name and email. Filter by city. Find all customers whose name starts with 'A'. Order by name.",
    resource: "Search: 'SQL SELECT WHERE tutorial W3Schools'",
    project: null,
  },
  {
    day: 17, phase: "SQL", topic: "INSERT, UPDATE, DELETE",
    method: "CRUD in SQL. Every API you build will use these.",
    learn: "INSERT INTO, UPDATE SET WHERE, DELETE WHERE. Always use WHERE with UPDATE and DELETE!",
    exercise: "Insert 5 customers. Update one's email. Delete one by id. Update all customers from 'Hyderabad' to add a tag.",
    resource: "Search: 'SQL INSERT UPDATE DELETE tutorial'",
    project: null,
  },
  {
    day: 18, phase: "SQL", topic: "JOINs — Connect Tables",
    method: "JOINs are the most important SQL skill for backend. Take time here.",
    learn: "INNER JOIN, LEFT JOIN. Understand foreign keys — customers.id → campaigns.customer_id.",
    exercise: "Create customers + orders tables. Join them to show: customer name + their order details. LEFT JOIN to show customers with NO orders.",
    resource: "Search: 'SQL JOINs explained visually' — find one with diagrams",
    project: null,
  },
  {
    day: 19, phase: "SQL", topic: "GROUP BY, COUNT, SUM, AVG",
    method: "Aggregations = analytics. Tribly uses this for campaign stats.",
    learn: "COUNT(), SUM(), AVG(), MIN(), MAX(), GROUP BY, HAVING.",
    exercise: "Count how many customers per city. Find total orders per customer. Get average order value. Find customers with more than 5 orders (use HAVING).",
    resource: "Search: 'SQL GROUP BY tutorial for beginners'",
    project: null,
  },
  {
    day: 20, phase: "SQL", topic: "Foreign Keys & Relationships",
    method: "Real databases always have relationships. Design them correctly.",
    learn: "FOREIGN KEY, REFERENCES, CASCADE, one-to-many, many-to-many junction tables.",
    exercise: "Design: users table, campaigns table (user_id references users), messages table (campaign_id references campaigns). Draw it on paper first.",
    resource: "Search: 'SQL foreign key relationships tutorial'",
    project: null,
  },
  {
    day: 21, phase: "SQL", topic: "MINI PROJECT — Design Tribly's DB",
    method: "Design the actual database schema Tribly might use.",
    learn: "Full schema design with relationships, proper data types, indexes.",
    exercise: "Design tables for: customers, campaigns, messages, users, campaign_logs. Write all CREATE TABLE statements. Add at least 3 JOINs to test it.",
    resource: "No tutorial. Think like a backend developer. What data does Tribly need?",
    project: "Tribly Database Schema",
  },
  // PHASE 3: FastAPI
  {
    day: 22, phase: "FastAPI", topic: "Install FastAPI & First Endpoint",
    method: "pip install fastapi uvicorn. Then run it. See the magic.",
    learn: "pip install, uvicorn server, @app.get, @app.post, return dict, Swagger UI at /docs.",
    exercise: "Create main.py. Make 3 endpoints: GET /health, GET /hello/{name}, GET /customers (returns fake list). Run and test in browser.",
    resource: "FastAPI official docs: fastapi.tiangolo.com — read Getting Started only",
    project: null,
  },
  {
    day: 23, phase: "FastAPI", topic: "Path Params & Query Params",
    method: "These are how frontend sends data to your API.",
    learn: "Path params: /customers/{id}. Query params: /customers?city=Hyderabad&limit=10.",
    exercise: "Build: GET /customers/{id} (return fake customer). GET /customers?city=&status= (filter by query params). Test in Postman.",
    resource: "fastapi.tiangolo.com/tutorial/path-params",
    project: null,
  },
  {
    day: 24, phase: "FastAPI", topic: "Pydantic Models & Request Body",
    method: "Pydantic validates your input automatically. No more bad data.",
    learn: "BaseModel, field types, optional fields, POST with request body, response_model.",
    exercise: "Create CustomerCreate model with name, email, phone. Make POST /customers that accepts this model. Validate that email has @ symbol.",
    resource: "fastapi.tiangolo.com/tutorial/body",
    project: null,
  },
  {
    day: 25, phase: "FastAPI", topic: "Full CRUD Endpoints",
    method: "This is 80% of your internship work. Build it cleanly.",
    learn: "GET all, GET one, POST create, PUT update, DELETE. HTTP status codes. HTTPException.",
    exercise: "Build complete Customer CRUD: GET /customers, GET /customers/{id}, POST /customers, PUT /customers/{id}, DELETE /customers/{id}. Use in-memory list (no DB yet).",
    resource: "fastapi.tiangolo.com/tutorial/bigger-applications",
    project: null,
  },
  {
    day: 26, phase: "FastAPI", topic: "Connect FastAPI to PostgreSQL",
    method: "Install PostgreSQL locally. Connect using SQLAlchemy. This is the big step.",
    learn: "pip install sqlalchemy psycopg2, create_engine, SessionLocal, get_db dependency.",
    exercise: "Connect your FastAPI app to a local PostgreSQL database. Create the customers table via SQLAlchemy. Verify connection.",
    resource: "Search: 'FastAPI PostgreSQL SQLAlchemy tutorial full' — pick one with GitHub code",
    project: null,
  },
  {
    day: 27, phase: "FastAPI", topic: "SQLAlchemy Models & DB Queries",
    method: "ORM = write Python instead of SQL. SQLAlchemy translates for you.",
    learn: "db.add(), db.commit(), db.query(), db.filter(), db.first(), db.all().",
    exercise: "Rewrite all your CRUD endpoints to use real PostgreSQL instead of the in-memory list. Test every endpoint in Postman.",
    resource: "Search: 'SQLAlchemy CRUD FastAPI tutorial'",
    project: null,
  },
  {
    day: 28, phase: "FastAPI", topic: "MINI PROJECT — Customer API with DB",
    method: "Full working API connected to real database. This is deployable.",
    learn: "Everything from FastAPI phase combined.",
    exercise: "Complete Customer Management API: full CRUD, PostgreSQL, Pydantic validation, proper error handling, 404 when not found. Test all endpoints in Postman. Save Postman collection.",
    resource: "No tutorial. Build from scratch using your notes.",
    project: "Customer Management API",
  },
  // PHASE 4: JWT Auth
  {
    day: 29, phase: "JWT Auth", topic: "How JWT Works",
    method: "Understand theory first before coding. Draw the flow on paper.",
    learn: "Token structure (header.payload.signature), how login works, stateless auth, where token is stored.",
    exercise: "Draw on paper: User logs in → server checks DB → creates token → returns token → user sends token next time → server verifies. Understand each step.",
    resource: "Search: 'JWT explained in 10 minutes' on YouTube — watch fully before coding",
    project: null,
  },
  {
    day: 30, phase: "JWT Auth", topic: "Password Hashing with bcrypt",
    method: "NEVER store plain text passwords. This is security rule #1.",
    learn: "pip install bcrypt, bcrypt.hashpw(), bcrypt.checkpw(), salt.",
    exercise: "Write a function: hash_password(plain) and verify_password(plain, hashed). Test: hash 'mypassword123' and verify it. Try wrong password — should fail.",
    resource: "Search: 'Python bcrypt password hashing tutorial'",
    project: null,
  },
  {
    day: 31, phase: "JWT Auth", topic: "Login Endpoint & Token Generation",
    method: "POST /login is the most important endpoint. Build it perfectly.",
    learn: "pip install python-jose, JWT encode/decode, SECRET_KEY, expiry time.",
    exercise: "Build POST /login: takes email+password, checks DB, hashes match? → generate JWT token with user_id + role + expiry. Return token.",
    resource: "fastapi.tiangolo.com/tutorial/security/oauth2-jwt",
    project: null,
  },
  {
    day: 32, phase: "JWT Auth", topic: "Protected Routes & Middleware",
    method: "Once login works, protect your routes. Only logged-in users can access.",
    learn: "Depends(), OAuth2PasswordBearer, verify_token function, current_user dependency.",
    exercise: "Add auth to GET /customers — it should return 401 if no token. With valid token → return data. Test in Postman: with token vs without token.",
    resource: "fastapi.tiangolo.com/tutorial/security/get-current-user",
    project: null,
  },
  {
    day: 33, phase: "JWT Auth", topic: "Role-Based Access Control",
    method: "Admin can do anything. Regular user has limits. Common in every startup.",
    learn: "Store role in JWT payload. Check role in dependency. Raise 403 if wrong role.",
    exercise: "Add roles: ADMIN and USER. DELETE /customers → only ADMIN. GET /customers → both. Test with two different tokens.",
    resource: "Search: 'FastAPI role based access control tutorial'",
    project: null,
  },
  {
    day: 34, phase: "JWT Auth", topic: "MINI PROJECT — Add Auth to Customer API",
    method: "Take your Day 28 Customer API. Add full auth system to it.",
    learn: "Complete auth flow in a real API.",
    exercise: "Add to your Customer API: POST /register, POST /login, protect all routes, admin-only for DELETE. Full working auth system.",
    resource: "No tutorial. Combine Day 29-33 knowledge.",
    project: "Customer API with Full Auth",
  },
  // PHASE 5: External APIs
  {
    day: 35, phase: "Integrations", topic: "Calling External APIs (requests library)",
    method: "You'll call external APIs constantly at Tribly. Learn this well.",
    learn: "pip install requests, requests.get(), requests.post(), headers, params, json body, response.json(), status codes.",
    exercise: "Call a free public API (jsonplaceholder.typicode.com). GET users, POST a new post. Print the response. Handle errors with try/except.",
    resource: "Search: 'Python requests library tutorial Real Python'",
    project: null,
  },
  {
    day: 36, phase: "Integrations", topic: "Twilio SMS API",
    method: "Sign up for free Twilio trial. Real API, real SMS to your phone.",
    learn: "Twilio SDK, account SID, auth token, client.messages.create(), from/to numbers.",
    exercise: "Send a real SMS to your own phone using Twilio trial. Then wrap it in a FastAPI endpoint: POST /send-sms with {phone, message} body.",
    resource: "twilio.com/docs/sms/quickstart/python — official docs only",
    project: null,
  },
  {
    day: 37, phase: "Integrations", topic: "Twilio WhatsApp API",
    method: "Same as SMS but WhatsApp. Tribly uses this heavily.",
    learn: "WhatsApp sandbox setup, whatsapp: prefix, template messages.",
    exercise: "Send a WhatsApp message to your phone from your FastAPI app. Then make POST /send-whatsapp endpoint with {phone, message}.",
    resource: "twilio.com/docs/whatsapp/quickstart/python",
    project: null,
  },
  {
    day: 38, phase: "Integrations", topic: "Cron Jobs with APScheduler",
    method: "Automated tasks that run at a schedule. Birthday campaigns use this.",
    learn: "pip install apscheduler, BlockingScheduler, @scheduled_job, cron trigger, interval trigger.",
    exercise: "Write a job that runs every minute and prints 'Checking birthdays...'. Then write one that runs daily at 8am. Add a simulated birthday check.",
    resource: "Search: 'APScheduler Python tutorial cron job'",
    project: null,
  },
  {
    day: 39, phase: "Integrations", topic: "Environment Variables & Secrets",
    method: "Never hardcode API keys. This is professional dev rule #1.",
    learn: "pip install python-dotenv, .env file, os.getenv(), .gitignore for .env.",
    exercise: "Move all your Twilio keys, DB passwords, JWT secret to .env. Load with dotenv. Verify nothing breaks. Add .env to .gitignore.",
    resource: "Search: 'Python dotenv tutorial environment variables'",
    project: null,
  },
  {
    day: 40, phase: "Integrations", topic: "MINI PROJECT — Birthday WhatsApp System",
    method: "Combine DB + cron job + WhatsApp API. This is a real Tribly feature.",
    learn: "Full integration combining all skills.",
    exercise: "Build: cron job runs daily, queries DB for customers with today's birthday, sends WhatsApp message to each. Run it, verify it works.",
    resource: "No tutorial. You have all the pieces. Combine them.",
    project: "Birthday WhatsApp Automation",
  },
  // PHASE 6: Deploy
  {
    day: 41, phase: "Deploy", topic: "Git Basics",
    method: "Git is non-negotiable. You'll use it every single day.",
    learn: "git init, add, commit, status, log, branch, checkout, merge.",
    exercise: "Create a git repo for your Customer API. Make 5 commits with meaningful messages. Create a feature branch. Merge it back.",
    resource: "Search: 'Git tutorial for beginners The Coding Train' (30 min max)",
    project: null,
  },
  {
    day: 42, phase: "Deploy", topic: "GitHub — Push Your Code",
    method: "All startups use GitHub. Push your project today.",
    learn: "git remote add, git push, git pull, README.md, .gitignore, pull requests.",
    exercise: "Create a GitHub account. Push your Customer API project. Write a good README with setup instructions. Add .gitignore for .env and __pycache__.",
    resource: "Search: 'How to push to GitHub first time tutorial'",
    project: null,
  },
  {
    day: 43, phase: "Deploy", topic: "Deploy to Railway",
    method: "railway.app is the easiest deploy for FastAPI. Free tier available.",
    learn: "railway.app setup, connect GitHub, set environment variables in dashboard, Procfile or railway.toml.",
    exercise: "Deploy your Customer API to Railway. Get a live URL. Test all endpoints using the live URL in Postman. Share the URL.",
    resource: "Search: 'Deploy FastAPI Railway tutorial 2024'",
    project: null,
  },
  {
    day: 44, phase: "Deploy", topic: "Postman Collections & API Docs",
    method: "Postman collection = documentation for your team. Always do this.",
    learn: "Postman environments, collections, variables, export, Swagger UI in FastAPI.",
    exercise: "Create a Postman collection for all your API endpoints. Add descriptions. Set environment variables for base URL and token. Export and save.",
    resource: "Search: 'Postman collections tutorial for beginners'",
    project: null,
  },
  {
    day: 45, phase: "Deploy", topic: "FINAL PROJECT — MiniCRM (Deployed)",
    method: "This is your internship proof. Take 3-4 days if needed.",
    learn: "Everything combined end to end.",
    exercise: "Full MiniCRM: customer CRUD + campaign creation + birthday cron job + WhatsApp trigger + JWT auth + PostgreSQL + deployed on Railway. Live URL in GitHub README.",
    resource: "You don't need a tutorial. You built all the pieces. Now combine.",
    project: "MiniCRM — Deployed & Live",
  },
];

const PHASES = ["Python", "SQL", "FastAPI", "JWT Auth", "Integrations", "Deploy"];
const PHASE_COLORS = {
  Python: { bg: "#1a2744", accent: "#3b82f6", light: "#dbeafe" },
  SQL: { bg: "#1a2d1a", accent: "#22c55e", light: "#dcfce7" },
  FastAPI: { bg: "#2d1a2d", accent: "#a855f7", light: "#f3e8ff" },
  "JWT Auth": { bg: "#2d2000", accent: "#f59e0b", light: "#fef3c7" },
  Integrations: { bg: "#2d1a1a", accent: "#ef4444", light: "#fee2e2" },
  Deploy: { bg: "#001a2d", accent: "#06b6d4", light: "#cffafe" },
};

const PHASE_CELEBRATION = {
  Python: "🎉 Python Phase Complete! You are ready for SQL",
  SQL: "🎉 SQL Phase Complete! You are ready for FastAPI",
  FastAPI: "🎉 FastAPI Phase Complete! You are ready for JWT Auth",
  "JWT Auth": "🎉 JWT Auth Phase Complete! You are ready for Integrations",
  Integrations: "🎉 Integrations Phase Complete! You are ready for Deploy",
  Deploy: "🎉 Deploy Phase Complete! You finished the roadmap — ship it!",
};

const MOTIVATIONAL_QUOTES = [
  "Code is cheap to write and expensive to read — invest in clarity today.",
  "Small daily reps beat a perfect plan you never run.",
  "Every bug you fix is a skill you keep; show up and type.",
  "Consistency turns tutorials into muscle memory.",
  "You are not behind; you are building depth one day at a time.",
  "Ship ugly drafts in private; polish in public later.",
  "Reading code is as important as writing it — trace one function fully today.",
  "One focused hour beats six distracted tabs.",
  "Errors are data, not judgment — read the stack trace calmly.",
  "Name things well once; future-you will thank you.",
  "If it works but you do not understand it, you are not done yet.",
  "Repetition is not failure; it is how experts are forged.",
  "Learn the rule, then break it on purpose with tests.",
  "Your future role is built from today’s reps, not tomorrow’s intentions.",
  "Finish the exercise, then tweak one line and predict the outcome.",
  "Courage is opening the editor when you feel rusty.",
  "You belong in rooms where systems are designed — keep building.",
  "SQL is just asking better questions of your data.",
  "JOINs connect ideas the way APIs connect services.",
  "Schema design is product thinking with constraints.",
  "Aggregations turn noise into decisions — practice them often.",
  "Model your domain honestly; the database will follow.",
  "FastAPI rewards clarity — let types be your guardrails.",
  "Path and query params are contracts; treat them like UX.",
  "Validation is kindness to every client that calls you.",
  "CRUD is the heartbeat of most backends — own it cold.",
  "ORMs are translators; still think in SQL underneath.",
  "A working API on real data is worth more than any certificate.",
  "JWT is trust in a string — understand expiry and verification.",
  "Hash passwords like your users’ trust depends on it — it does.",
  "Login is a handshake; protect it like a vault door.",
  "401 vs 403 matters — learn the semantics once, use them forever.",
  "RBAC is how teams scale responsibility without chaos.",
  "Auth in production is discipline, not a single npm install.",
  "External APIs fail — retries, timeouts, and logs are your friends.",
  "Integrations are promises across network boundaries — test them.",
  "WhatsApp and SMS are UX channels; handle failures gracefully.",
  "Schedulers turn ideas into reliable behavior at 3 a.m.",
  "Secrets belong in env vars, not in git — no exceptions.",
  "Automations compound — one cron job can delight thousands.",
  "Git is your time machine; commit messages are love letters to future-you.",
  "GitHub is collaboration infrastructure — push early, push often.",
  "Deploying is the moment learning meets the real world.",
  "Document the API you wish you had on day one — then build it.",
  "MiniCRM to production: you did not shortcut the journey — you finished it.",
];

const LS_STREAK = "tracker-streak";
const LS_LAST_DONE = "tracker-last-completed-date";
const LS_COMPLETION_DATES = "tracker-completion-dates";

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetweenCalendar(olderKey, newerKey) {
  const [y1, m1, d1] = olderKey.split("-").map(Number);
  const [y2, m2, d2] = newerKey.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function last7DayKeys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    keys.push(dateKey(addDays(new Date(), -i)));
  }
  return keys;
}

function shortWeekdayLabel(dateKeyStr) {
  const [y, m, d] = dateKeyStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

export default function App() {
  const [completed, setCompleted] = useState({});
  const [notes, setNotes] = useState({});
  const [activeDay, setActiveDay] = useState(1);
  const [activePhase, setActivePhase] = useState("Python");
  const [view, setView] = useState("today");
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [streak, setStreak] = useState(0);
  const [completionByDay, setCompletionByDay] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [todayTick, setTodayTick] = useState(() => dateKey(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      const n = dateKey(new Date());
      setTodayTick((prev) => (prev !== n ? n : prev));
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const c = await window.storage.get("tracker-completed");
        const n = await window.storage.get("tracker-notes");
        const d = await window.storage.get("tracker-activeday");
        if (c) setCompleted(JSON.parse(c.value));
        if (n) setNotes(JSON.parse(n.value));
        if (d) setActiveDay(parseInt(d.value));
      } catch {}
      try {
        const raw = localStorage.getItem(LS_COMPLETION_DATES);
        if (raw) setCompletionByDay(JSON.parse(raw));
      } catch {}
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const first = CURRICULUM.find((d) => !completed[d.day]);
    if (first) setActiveDay(first.day);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      const last = localStorage.getItem(LS_LAST_DONE);
      const today = dateKey(new Date());
      if (last && daysBetweenCalendar(last, today) >= 2) {
        localStorage.setItem(LS_STREAK, "0");
        setStreak(0);
      } else {
        setStreak(parseInt(localStorage.getItem(LS_STREAK) || "0", 10) || 0);
      }
    } catch {
      setStreak(0);
    }
  }, [loaded, todayTick]);

  async function toggleComplete(day) {
    const wasComplete = !!completed[day];
    const next = { ...completed, [day]: !completed[day] };
    setCompleted(next);
    try {
      await window.storage.set("tracker-completed", JSON.stringify(next));
    } catch {}

    if (!wasComplete && next[day]) {
      setCompletionByDay((prev) => {
        const updated = { ...prev, [day]: dateKey(new Date()) };
        try {
          localStorage.setItem(LS_COMPLETION_DATES, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      const today = dateKey(new Date());
      let last = "";
      try {
        last = localStorage.getItem(LS_LAST_DONE) || "";
      } catch {}
      if (last !== today) {
        let newStreak = 0;
        try {
          newStreak = parseInt(localStorage.getItem(LS_STREAK) || "0", 10) || 0;
        } catch {}
        const yest = dateKey(addDays(new Date(), -1));
        if (last === yest) newStreak += 1;
        else newStreak = 1;
        try {
          localStorage.setItem(LS_STREAK, String(newStreak));
          localStorage.setItem(LS_LAST_DONE, today);
        } catch {}
        setStreak(newStreak);
      }
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 2000);
    } else if (wasComplete && !next[day]) {
      setCompletionByDay((prev) => {
        const updated = { ...prev };
        delete updated[day];
        try {
          localStorage.setItem(LS_COMPLETION_DATES, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    const nextDay = CURRICULUM.find((d) => !next[d.day]);
    if (nextDay) {
      setActiveDay(nextDay.day);
      try {
        await window.storage.set("tracker-activeday", String(nextDay.day));
      } catch {}
    }
  }

  async function saveNote(day) {
    const next = { ...notes, [day]: noteText };
    setNotes(next);
    setEditingNote(false);
    try {
      await window.storage.set("tracker-notes", JSON.stringify(next));
    } catch {}
  }

  const dayData = CURRICULUM.find((d) => d.day === activeDay);
  const phaseColor = dayData ? PHASE_COLORS[dayData.phase] : PHASE_COLORS.Python;
  const totalDone = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((totalDone / CURRICULUM.length) * 100);

  const phaseDays = (phase) => CURRICULUM.filter((d) => d.phase === phase);
  const phaseDone = (phase) => phaseDays(phase).filter((d) => completed[d.day]).length;

  const headerDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const firstIncomplete = CURRICULUM.find((d) => !completed[d.day]);
  const showTaskPending = !!firstIncomplete;

  const weekKeys = last7DayKeys();
  const weekCounts = weekKeys.map((k) =>
    Object.values(completionByDay).filter((v) => v === k).length
  );
  const weekMax = Math.max(1, ...weekCounts);

  const phaseCompleteForView =
    dayData && phaseDays(dayData.phase).every((d) => completed[d.day]);

  const quoteText =
    MOTIVATIONAL_QUOTES[Math.min(Math.max(activeDay, 1), 45) - 1] || "";

  if (!loaded)
    return (
      <div
        style={{
          background: "#0a0a0f",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#3b82f6", fontFamily: "monospace", fontSize: 18 }}>
          Loading your progress...
        </div>
      </div>
    );

  return (
    <div
      className="tracker-root"
      style={{
        background: "#0a0a0f",
        minHeight: "100vh",
        fontFamily: "'Courier New', monospace",
        color: "#e2e8f0",
      }}
    >
      <style>{`
        @keyframes tracker-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes tracker-confetti-fall {
          0% {
            transform: translate3d(0, -20vh, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--dx, 0), 100vh, 0) rotate(720deg);
            opacity: 0;
          }
        }
        .tracker-pending-badge {
          animation: tracker-blink 1.2s ease-in-out infinite;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #f59e0b;
          color: #fbbf24;
          background: #f59e0b22;
          white-space: nowrap;
        }
        .tracker-confetti-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }
        .tracker-confetti-bit {
          position: absolute;
          top: -12px;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: tracker-confetti-fall 2s ease-out forwards;
        }
        .tracker-week-chart {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 72px;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #1e293b;
        }
        .tracker-week-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .tracker-week-bar-wrap {
          width: 100%;
          height: 52px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .tracker-week-bar {
          width: 100%;
          max-width: 28px;
          border-radius: 4px 4px 2px 2px;
          background: linear-gradient(180deg, #8b5cf6, #3b82f6);
          transition: height 0.35s ease;
        }
        .tracker-week-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
        }
        .tracker-week-count {
          font-size: 10px;
          color: #94a3b8;
        }
        @media (min-width: 1200px) {
          .tracker-root {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .tracker-top-bar {
            flex-shrink: 0;
            width: 100%;
          }
          .tracker-header-inner {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding-left: 28px !important;
            padding-right: 28px !important;
          }
          .tracker-header-dashboard-grid {
            display: grid;
            grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) auto;
            gap: 28px;
            align-items: center;
          }
          .tracker-header-progress-cluster {
            min-width: 0;
          }
          .tracker-header-phase-pills {
            display: none !important;
          }
          .tracker-body-row {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: row;
            width: 100%;
          }
          .tracker-sidebar {
            display: flex !important;
            flex-direction: column;
            width: 280px;
            flex-shrink: 0;
            overflow-x: hidden;
            overflow-y: auto;
            border-right: 1px solid #1e293b;
            background: linear-gradient(180deg, #06060b 0%, #0a0a0f 100%);
            padding: 20px 14px 32px;
            box-shadow: inset -1px 0 0 #0f172a;
          }
          .tracker-sidebar-label {
            font-size: 10px;
            color: #475569;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            margin-bottom: 6px;
            padding: 0 4px;
          }
          .tracker-sidebar-path {
            font-size: 11px;
            color: #22c55e;
            margin-bottom: 20px;
            padding: 0 4px;
            opacity: 0.9;
          }
          .tracker-sidebar-phase {
            margin-bottom: 22px;
          }
          .tracker-sidebar-phase-head {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 10px;
            padding: 0 4px;
            border-left: 3px solid var(--phase-accent, #3b82f6);
            padding-left: 10px;
          }
          .tracker-sidebar-phase-title {
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.12em;
            color: var(--phase-accent, #3b82f6);
          }
          .tracker-sidebar-phase-meta {
            font-size: 10px;
            color: #64748b;
            font-variant-numeric: tabular-nums;
          }
          .tracker-sidebar-day-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 5px;
          }
          .tracker-sidebar-day-btn {
            aspect-ratio: 1;
            min-width: 0;
            border-radius: 6px;
            border: 1px solid #1e293b;
            background: #0f172a;
            color: #475569;
            font-size: 10px;
            font-family: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            padding: 0;
            transition: border-color 0.15s, background 0.15s, color 0.15s;
          }
          .tracker-sidebar-day-btn:hover {
            border-color: #334155;
            color: #94a3b8;
          }
          .tracker-sidebar-day-btn[data-active="true"] {
            border-width: 2px;
            font-weight: bold;
          }
          .tracker-sidebar-day-btn[data-done="true"] {
            color: #f8fafc;
          }
          .tracker-main {
            flex: 1;
            min-width: 0;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 28px 40px 56px !important;
            -webkit-overflow-scrolling: touch;
          }
          .tracker-day-strip {
            display: none !important;
          }
          .tracker-week-chart {
            width: 100%;
            max-width: none;
          }
          .tracker-sidebar::-webkit-scrollbar,
          .tracker-main::-webkit-scrollbar {
            width: 8px;
          }
          .tracker-sidebar::-webkit-scrollbar-thumb,
          .tracker-main::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
          }
        }
        @media (max-width: 1199px) {
          .tracker-sidebar {
            display: none !important;
          }
          .tracker-body-row {
            display: block;
            width: 100%;
          }
          .tracker-main {
            width: 100%;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
          }
          .tracker-header-dashboard-grid {
            display: block;
          }
        }
        @media (max-width: 640px) {
          .tracker-header-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .tracker-meta-row {
            width: 100%;
            flex-wrap: wrap;
          }
          .tracker-nav-btns {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>

      {showConfetti && (
        <div className="tracker-confetti-layer" aria-hidden>
          {Array.from({ length: 48 }).map((_, i) => {
            const hue = (i * 47) % 360;
            const left = `${(i * 2.1) % 100}%`;
            const dx = `${(Math.sin(i) * 80).toFixed(1)}px`;
            return (
              <span
                key={i}
                className="tracker-confetti-bit"
                style={{
                  left,
                  background: `hsl(${hue} 85% 58%)`,
                  animationDelay: `${(i % 12) * 0.04}s`,
                  ["--dx"]: dx,
                }}
              />
            );
          })}
        </div>
      )}

      <header
        className="tracker-top-bar"
        style={{
          background: "linear-gradient(135deg, #0c1222 0%, #12102a 50%, #0f172a 100%)",
          borderBottom: "1px solid #1e293b",
          padding: "18px 0 16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        <div className="tracker-header-inner" style={{ width: "100%", margin: 0, padding: "0 16px" }}>
          <div className="tracker-header-dashboard-grid">
            <div className="tracker-header-row" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  letterSpacing: 4,
                  textTransform: "uppercase",
                }}
              >
                Backend Intern Prep
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#f8fafc",
                  letterSpacing: -0.5,
                  fontFamily: "'Courier New', monospace",
                }}
              >
                <span style={{ color: "#22c55e" }}>$</span> dev_roadmap
                <span style={{ color: "#64748b" }}> --dashboard</span>
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>session: active · roadmap v1</div>
            </div>

            <div className="tracker-header-progress-cluster">
              <div style={{ marginTop: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    PROGRESS · {totalDone} / {CURRICULUM.length} modules
                  </span>
                  <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: "bold" }}>{progress}%</span>
                </div>
                <div
                  style={{
                    background: "#1e293b",
                    borderRadius: 4,
                    height: 8,
                    overflow: "hidden",
                    border: "1px solid #334155",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #2563eb, #7c3aed, #06b6d4)",
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                      boxShadow: "0 0 12px rgba(59,130,246,0.4)",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2, marginBottom: 6 }}>
                  LAST_7_DAYS · completions / day
                </div>
                <div className="tracker-week-chart" aria-label="Last 7 days completions">
                  {weekKeys.map((k, i) => (
                    <div key={k} className="tracker-week-col">
                      <div className="tracker-week-bar-wrap">
                        <div
                          className="tracker-week-bar"
                          style={{ height: `${(weekCounts[i] / weekMax) * 100}%` }}
                          title={`${weekCounts[i]} on ${k}`}
                        />
                      </div>
                      <span className="tracker-week-count">{weekCounts[i]}</span>
                      <span className="tracker-week-label">{shortWeekdayLabel(k)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
              <div
                className="tracker-meta-row"
                style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    fontFamily: "monospace",
                    textAlign: "right",
                  }}
                >
                  {headerDate}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#f97316",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span aria-hidden>🔥</span>
                  <span>{streak}d streak</span>
                </div>
                {showTaskPending && <span className="tracker-pending-badge">Task Pending</span>}
              </div>
              <div className="tracker-nav-btns" style={{ display: "flex", gap: 8 }}>
                {["today", "roadmap"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      background: view === v ? "#1e3a5f" : "transparent",
                      border: `1px solid ${view === v ? "#3b82f6" : "#334155"}`,
                      color: view === v ? "#93c5fd" : "#94a3b8",
                      padding: "8px 14px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {v === "today" ? "Task View" : "Roadmap"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tracker-header-phase-pills" style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {PHASES.map((phase) => {
              const done = phaseDone(phase);
              const total = phaseDays(phase).length;
              const color = PHASE_COLORS[phase].accent;
              return (
                <button
                  key={phase}
                  onClick={() => {
                    setActivePhase(phase);
                    setView("roadmap");
                  }}
                  style={{
                    background: "#0f172a",
                    border: `1px solid ${color}40`,
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 11,
                    color: done === total ? color : "#64748b",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "monospace",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: done === total ? color : "#334155",
                      flexShrink: 0,
                    }}
                  />
                  {phase} {done}/{total}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="tracker-body-row">
        <aside className="tracker-sidebar" aria-label="Curriculum navigation">
          <div className="tracker-sidebar-label">Navigator</div>
          <div className="tracker-sidebar-path">~/prep/curriculum/phases</div>
          {PHASES.map((phase) => {
            const color = PHASE_COLORS[phase].accent;
            const done = phaseDone(phase);
            const total = phaseDays(phase).length;
            return (
              <div key={phase} className="tracker-sidebar-phase" style={{ ["--phase-accent"]: color }}>
                <div className="tracker-sidebar-phase-head">
                  <span className="tracker-sidebar-phase-title">{phase}</span>
                  <span className="tracker-sidebar-phase-meta">
                    {done}/{total}
                  </span>
                </div>
                <div className="tracker-sidebar-day-grid">
                  {phaseDays(phase).map((d) => {
                    const isActive = activeDay === d.day;
                    const isDone = !!completed[d.day];
                    const isNext = firstIncomplete?.day === d.day;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        className="tracker-sidebar-day-btn"
                        data-active={isActive}
                        data-done={isDone}
                        title={d.topic}
                        onClick={() => {
                          setActiveDay(d.day);
                          setView("today");
                        }}
                        style={{
                          borderColor: isActive ? color : isDone ? `${color}66` : "#1e293b",
                          background: isActive ? `${color}28` : isDone ? `${color}18` : "#0f172a",
                          color: isDone ? color : isActive ? "#e2e8f0" : "#64748b",
                          boxShadow: isNext && !isDone ? `0 0 0 1px ${color}88` : "none",
                        }}
                      >
                        {isDone ? "✓" : d.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        <main className="tracker-main" style={{ padding: "20px 16px", boxSizing: "border-box" }}>
        {view === "today" && dayData && (
          <div>
            {phaseCompleteForView && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #22c55e55",
                  background: "linear-gradient(90deg, #14532d33, #0f172a)",
                  color: "#86efac",
                  fontSize: 13,
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                {PHASE_CELEBRATION[dayData.phase]}
              </div>
            )}

            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${phaseColor.accent}40`,
                background: "#0f172a",
                color: "#cbd5e1",
                fontSize: 12,
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              “{quoteText}”
            </div>

            <div className="tracker-day-strip" style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {CURRICULUM.map((d) => (
                <button
                  key={d.day}
                  onClick={() => setActiveDay(d.day)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border:
                      activeDay === d.day
                        ? `2px solid ${PHASE_COLORS[d.phase].accent}`
                        : "1px solid #1e293b",
                    background: completed[d.day]
                      ? PHASE_COLORS[d.phase].accent + "33"
                      : activeDay === d.day
                        ? "#1e293b"
                        : "#0f172a",
                    color: completed[d.day] ? PHASE_COLORS[d.phase].accent : "#475569",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontWeight: activeDay === d.day ? "bold" : "normal",
                    position: "relative",
                  }}
                >
                  {completed[d.day] ? "✓" : d.day}
                </button>
              ))}
            </div>

            <div
              style={{
                background: phaseColor.bg,
                border: `1px solid ${phaseColor.accent}30`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${phaseColor.accent}20, ${phaseColor.bg})`,
                  borderBottom: `1px solid ${phaseColor.accent}30`,
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: phaseColor.accent,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Day {dayData.day} · {dayData.phase}
                    {dayData.project && (
                      <span
                        style={{
                          marginLeft: 10,
                          background: phaseColor.accent + "33",
                          border: `1px solid ${phaseColor.accent}`,
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 10,
                        }}
                      >
                        MINI PROJECT
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: "bold",
                      color: "#f8fafc",
                      lineHeight: 1.3,
                    }}
                  >
                    {dayData.topic}
                  </div>
                </div>
                <button
                  onClick={() => toggleComplete(dayData.day)}
                  style={{
                    background: completed[dayData.day] ? phaseColor.accent : "transparent",
                    border: `2px solid ${phaseColor.accent}`,
                    borderRadius: 8,
                    padding: "10px 20px",
                    color: completed[dayData.day] ? "white" : phaseColor.accent,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    transition: "all 0.2s",
                  }}
                >
                  {completed[dayData.day] ? "✓ DONE" : "Mark Done"}
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: phaseColor.accent,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    // HOW TO APPROACH
                  </div>
                  <div
                    style={{
                      background: "#0a0a0f",
                      border: `1px solid ${phaseColor.accent}20`,
                      borderLeft: `3px solid ${phaseColor.accent}`,
                      borderRadius: "0 8px 8px 0",
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "#cbd5e1",
                      lineHeight: 1.6,
                    }}
                  >
                    {dayData.method}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: phaseColor.accent,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    // WHAT TO LEARN TODAY
                  </div>
                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      padding: "14px 16px",
                      fontSize: 13,
                      color: "#94a3b8",
                      lineHeight: 1.7,
                    }}
                  >
                    {dayData.learn}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#f59e0b",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    // WRITE THIS CODE TODAY
                  </div>
                  <div
                    style={{
                      background: "#110f00",
                      border: "1px solid #f59e0b30",
                      borderRadius: 8,
                      padding: "14px 16px",
                      fontSize: 13,
                      color: "#fcd34d",
                      lineHeight: 1.7,
                    }}
                  >
                    {dayData.exercise}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#22c55e",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    // WHERE TO LEARN FROM
                  </div>
                  <div
                    style={{
                      background: "#0a1a0a",
                      border: "1px solid #22c55e30",
                      borderRadius: 8,
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "#86efac",
                      lineHeight: 1.6,
                    }}
                  >
                    📖 {dayData.resource}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#64748b",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    // YOUR NOTES
                  </div>
                  {editingNote ? (
                    <div>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="What did you learn? What confused you? What worked?"
                        style={{
                          width: "100%",
                          minHeight: 100,
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          padding: 12,
                          color: "#e2e8f0",
                          fontFamily: "monospace",
                          fontSize: 12,
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => saveNote(dayData.day)}
                          style={{
                            background: "#22c55e",
                            border: "none",
                            borderRadius: 6,
                            padding: "8px 16px",
                            color: "white",
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: 12,
                          }}
                        >
                          Save Note
                        </button>
                        <button
                          onClick={() => setEditingNote(false)}
                          style={{
                            background: "transparent",
                            border: "1px solid #334155",
                            borderRadius: 6,
                            padding: "8px 16px",
                            color: "#64748b",
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: 12,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setNoteText(notes[dayData.day] || "");
                        setEditingNote(true);
                      }}
                      style={{
                        background: "#0f172a",
                        border: "1px dashed #334155",
                        borderRadius: 8,
                        padding: "12px 16px",
                        fontSize: 12,
                        color: notes[dayData.day] ? "#94a3b8" : "#475569",
                        cursor: "pointer",
                        minHeight: 60,
                        lineHeight: 1.6,
                      }}
                    >
                      {notes[dayData.day] || "Click to add notes for today..."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              {activeDay > 1 && (
                <button
                  onClick={() => setActiveDay(activeDay - 1)}
                  style={{
                    background: "transparent",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px 20px",
                    color: "#64748b",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                >
                  ← Day {activeDay - 1}
                </button>
              )}
              {activeDay < CURRICULUM.length && (
                <button
                  onClick={() => setActiveDay(activeDay + 1)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px 20px",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 12,
                    marginLeft: "auto",
                  }}
                >
                  Day {activeDay + 1} →
                </button>
              )}
            </div>
          </div>
        )}

        {view === "roadmap" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {PHASES.map((phase) => {
                const color = PHASE_COLORS[phase].accent;
                const isActive = activePhase === phase;
                return (
                  <button
                    key={phase}
                    onClick={() => setActivePhase(phase)}
                    style={{
                      background: isActive ? color + "22" : "transparent",
                      border: `1px solid ${isActive ? color : "#334155"}`,
                      borderRadius: 8,
                      padding: "8px 16px",
                      color: isActive ? color : "#64748b",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {phase} ({phaseDone(phase)}/{phaseDays(phase).length})
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {phaseDays(activePhase).map((d) => {
                const color = PHASE_COLORS[d.phase].accent;
                const isDone = completed[d.day];
                const isActive = activeDay === d.day;
                return (
                  <div
                    key={d.day}
                    onClick={() => {
                      setActiveDay(d.day);
                      setView("today");
                    }}
                    style={{
                      background: isDone ? color + "11" : isActive ? "#1e293b" : "#0f172a",
                      border: `1px solid ${isActive ? color : isDone ? color + "40" : "#1e293b"}`,
                      borderRadius: 10,
                      padding: "14px 18px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: isDone ? color : "#1e293b",
                        border: `1px solid ${color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isDone ? 16 : 12,
                        color: isDone ? "white" : color,
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      {isDone ? "✓" : d.day}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          color: isDone ? "#94a3b8" : "#e2e8f0",
                          fontWeight: "bold",
                        }}
                      >
                        {d.topic}
                        {d.project && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              color: color,
                              border: `1px solid ${color}`,
                              borderRadius: 4,
                              padding: "1px 6px",
                              verticalAlign: "middle",
                            }}
                          >
                            PROJECT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                        {d.learn.substring(0, 80)}...
                      </div>
                      {notes[d.day] && (
                        <div style={{ fontSize: 10, color: "#22c55e", marginTop: 4 }}>
                          📝 Has notes
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#334155" }}>→</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
