import os
import sqlite3
from flask import Flask, jsonify, request, session, send_from_directory, g
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_cors import CORS
import smtplib
from email.message import EmailMessage
import threading
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)  # Enable CORS for all routes

def send_welcome_email(to_email, name, raw_password, grade, course_class, duration):
    sender_email = os.environ.get("SMTP_EMAIL")
    sender_password = os.environ.get("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        print("SMTP Credentials missing in .env. Skipping welcome email.")
        return
        
    msg = EmailMessage()
    msg.set_content(f"""Hello {name},
    
Welcome to Mehwish Online Institute! Your enrollment application has been processed.

Here are your course details:
Grade: {grade}
Class: {course_class}
Duration: {duration}

Your Secure Login Credentials:
Email: {to_email}
Password: {raw_password}

Teacher Portal Link: https://mehwishonline.institute/login.html

Happy Learning!
- The Admissions Team
""")
    msg['Subject'] = 'Welcome to Mehwish Online Institute - Registration Confirmed!'
    msg['From'] = f"Admissions <{sender_email}>"
    msg['To'] = to_email

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"Sent confirmation email to {to_email}")
    except Exception as e:
        print("Error sending email:", e)


DATABASE = 'student_data.db'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.secret_key = 'super_secret_key_mehwish_institute'  # Change this in production!

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

def execute_db(query, args=()):
    db = get_db()
    cur = db.execute(query, args)
    db.commit()
    cur.close()
    return cur.lastrowid

def init_db():
    with app.app_context():
        db = get_db()
        with open('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()
        print('Initialized the database.')

@app.cli.command('initdb')
def initdb_command():
    """Initializes the database."""
    init_db()

# --- Login Decorators ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'is_admin' not in session:
            return jsonify({'message': 'Admin access required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- Authentication & Enrollment Routes ---

@app.route('/api/enroll-wizard', methods=['POST'])
def enroll_wizard():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    grade = data.get('grade')
    student_class = data.get('student_class')
    duration = data.get('duration')
    password = data.get('password')

    if not all([name, email, phone, grade, student_class, duration, password]):
        return jsonify({'message': 'All fields are required'}), 400

    hashed_pw = generate_password_hash(password)
    try:
        execute_db('''
            INSERT INTO students (name, email, password, class, phone, grade, duration) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, email, hashed_pw, student_class, phone, grade, duration))
        
        # Send email asynchronously to avoid blocking the UI response
        threading.Thread(target=send_welcome_email, args=(email, name, password, grade, student_class, duration)).start()
        
        return jsonify({'message': 'Enrollment successful'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': 'An account with this email already exists.'}), 400


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student') # 'student' or 'admin'

    if not email or not password:
        return jsonify({'message': 'Email and password required'}), 400

    if role == 'admin':
        user = query_db('SELECT * FROM admins WHERE username = ?', (email,), one=True)
    else:
        user = query_db('SELECT * FROM students WHERE email = ?', (email,), one=True)

    if user and check_password_hash(user['password'], password):
        session.clear()
        session['user_id'] = user['id']
        session['role'] = role
        if role == 'admin':
            session['is_admin'] = True
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['username'] if role == 'admin' else user['name'],
                'email': user['username'] if role == 'admin' else user['email'],
                'role': role
            }
        })
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'role': session.get('role'),
            'user_id': session.get('user_id')
        })
    return jsonify({'authenticated': False})

# --- Admin (Teacher) Routes ---

@app.route('/api/admin/students', methods=['GET', 'POST'])
@admin_required
def manage_students():
    if request.method == 'GET':
        students = query_db('SELECT * FROM students ORDER BY id DESC')
        return jsonify([dict(row) for row in students])
        
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    major = data.get('major')
    semester = data.get('semester')

    if not all([name, email, password]):
        return jsonify({'message': 'Name, email, and password are required'}), 400

    hashed_pw = generate_password_hash(password)
    try:
        execute_db('INSERT INTO students (name, email, password, major, semester) VALUES (?, ?, ?, ?, ?)',
                   (name, email, hashed_pw, major, semester))
        return jsonify({'message': 'Student account created successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Email already exists'}), 400

@app.route('/api/admin/subjects', methods=['GET', 'POST'])
@admin_required
def manage_subjects():
    if request.method == 'GET':
        subjects = query_db('SELECT * FROM subjects')
        return jsonify([dict(row) for row in subjects])
    
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'message': 'Subject name is required'}), 400
    try:
        execute_db('INSERT INTO subjects (name) VALUES (?)', (name,))
        return jsonify({'message': 'Subject created successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Subject already exists'}), 400

@app.route('/api/admin/lessons', methods=['GET', 'POST'])
@admin_required
def manage_lessons():
    if request.method == 'GET':
        subject_id = request.args.get('subject_id')
        if subject_id:
            lessons = query_db('SELECT * FROM lessons WHERE subject_id = ? ORDER BY order_index', (subject_id,))
        else:
            lessons = query_db('SELECT l.*, s.name as subject_name FROM lessons l JOIN subjects s ON l.subject_id = s.id ORDER BY s.name, l.order_index')
        return jsonify([dict(row) for row in lessons])
    
    data = request.get_json()
    subject_id = data.get('subject_id')
    title = data.get('title')
    content = data.get('content', '')
    video_url = data.get('video_url', '')
    order_index = data.get('order_index', 0)

    if not all([subject_id, title]):
        return jsonify({'message': 'Subject ID and Title are required'}), 400

    execute_db('INSERT INTO lessons (subject_id, title, content, video_url, order_index) VALUES (?, ?, ?, ?, ?)',
               (subject_id, title, content, video_url, order_index))
    return jsonify({'message': 'Lesson created successfully'}), 201

@app.route('/api/admin/enrollments', methods=['POST'])
@admin_required
def enroll_student():
    data = request.get_json()
    student_id = data.get('student_id')
    subject_id = data.get('subject_id')
    
    if not all([student_id, subject_id]):
        return jsonify({'message': 'Student ID and Subject ID required'}), 400
        
    try:
        execute_db('INSERT INTO enrollments (student_id, subject_id) VALUES (?, ?)', (student_id, subject_id))
        return jsonify({'message': 'Student enrolled successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Student is already enrolled in this subject'}), 400

@app.route('/api/admin/assignments', methods=['POST'])
@admin_required
def create_assignment():
    data = request.get_json()
    subject_id = data.get('subject_id')
    title = data.get('title')
    description = data.get('description')
    due_date = data.get('due_date')

    if not all([subject_id, title]):
        return jsonify({'message': 'Subject and Title are required'}), 400

    execute_db('INSERT INTO assignments (subject_id, title, description, due_date) VALUES (?, ?, ?, ?)',
               (subject_id, title, description, due_date))
    return jsonify({'message': 'Assignment created successfully'}), 201

@app.route('/api/admin/attendance', methods=['POST'])
@admin_required
def mark_attendance():
    data = request.get_json()
    student_id = data.get('student_id')
    subject_id = data.get('subject_id')
    date = data.get('date')
    status = data.get('status')
    
    if not all([student_id, subject_id, date, status]):
        return jsonify({'message': 'All fields are required'}), 400
        
    execute_db('INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)',
               (student_id, subject_id, date, status))
    return jsonify({'message': 'Attendance marked successfully'}), 201

@app.route('/api/admin/submissions', methods=['GET'])
@admin_required
def get_all_submissions():
    # Helper to see submissions waiting for review
    submissions = query_db('''
        SELECT s.id, stu.name as student_name, a.title as assignment_title, s.submitted_at, s.grade, s.file_path
        FROM submissions s
        JOIN students stu ON s.student_id = stu.id
        JOIN assignments a ON s.assignment_id = a.id
        ORDER BY s.submitted_at DESC
    ''')
    return jsonify([dict(row) for row in submissions])

@app.route('/api/admin/submissions/<int:sub_id>/grade', methods=['POST'])
@admin_required
def grade_submission(sub_id):
    data = request.get_json()
    grade = data.get('grade')
    feedback = data.get('feedback')

    execute_db('UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?', (grade, feedback, sub_id))
    return jsonify({'message': 'Grade updated successfully'})

# --- Student Routes ---

@app.route('/api/student/lessons/<int:subject_id>', methods=['GET'])
@login_required
def get_student_lessons(subject_id):
    student_id = session['user_id']
    
    # Verify enrollment
    enrollment = query_db('SELECT * FROM enrollments WHERE student_id = ? AND subject_id = ?', (student_id, subject_id), one=True)
    if not enrollment:
        return jsonify({'message': 'Not enrolled in this subject'}), 403
        
    lessons = query_db('SELECT * FROM lessons WHERE subject_id = ? ORDER BY order_index', (subject_id,))
    return jsonify([dict(row) for row in lessons])

@app.route('/api/student/data', methods=['GET'])
@login_required
def get_student_dashboard():
    student_id = session['user_id']
    student = query_db('SELECT id, name, major, semester FROM students WHERE id = ?', (student_id,), one=True)
    
    # Enrolled subjects
    enrollments_data = query_db('''
        SELECT s.id, s.name 
        FROM enrollments e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.student_id = ?
    ''', (student_id,))
    
    subjects_enrolled = len(enrollments_data)
    
    # Recent grades
    grades = query_db('''
        SELECT s.name as subject_name, g.grade, g.marks_obtained, g.total_marks 
        FROM grades g
        JOIN subjects s ON g.subject_id = s.id
        WHERE g.student_id = ?
    ''', (student_id,))

    # Pending Assignments
    assignments = query_db('''
        SELECT a.id, a.title, s.name as subject_name, a.due_date, a.status 
        FROM assignments a
        JOIN enrollments e ON a.subject_id = e.subject_id
        JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
        WHERE e.student_id = ? AND sub.id IS NULL
    ''', (student_id, student_id))

    return jsonify({
        'student': dict(student) if student else {},
        'subjects_enrolled': subjects_enrolled,
        'enrolled_subjects_list': [dict(row) for row in enrollments_data],
        'grades': [dict(row) for row in grades],
        'assignments_pending': [dict(row) for row in assignments]
    })

@app.route('/api/student/assignments', methods=['GET'])
@login_required
def check_assignments():
    student_id = session['user_id']
    # Get all assignments for enrolled subjects
    assignments = query_db('''
        SELECT a.id, a.title, a.description, a.due_date, s.name as subject_name,
               sub.grade, sub.feedback, sub.submitted_at
        FROM assignments a
        JOIN enrollments e ON a.subject_id = e.subject_id
        JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
        WHERE e.student_id = ?
    ''', (student_id, student_id))
    
    return jsonify([dict(row) for row in assignments])

@app.route('/api/student/assignments/submit', methods=['POST'])
@login_required
def submit_assignment():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    assignment_id = request.form.get('assignment_id')
    
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        # Unique filename: assignmentID_studentID_filename
        save_name = f"{assignment_id}_{session['user_id']}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], save_name))
        
        execute_db('''
            INSERT INTO submissions (assignment_id, student_id, file_path) 
            VALUES (?, ?, ?)
        ''', (assignment_id, session['user_id'], save_name))
        
        return jsonify({'message': 'Assignment submitted successfully'}), 201

# --- Setup & Static Files ---

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('public', path)):
        return send_from_directory('public', path)
    return send_from_directory('public', 'index.html')

if __name__ == '__main__':
    # Initialize DB if not exists (simple check)
    if not os.path.exists(DATABASE):
        init_db()
        # Create default admin if needed
        # In a real app, use the CLI or a setup script
        with app.app_context():
            try:
                # Default admin: admin / admin123
                pwd = generate_password_hash('admin123')
                execute_db('INSERT INTO admins (username, password) VALUES (?, ?)', ('admin', pwd))
                print("Default admin created: admin / admin123")
            except:
                pass

    app.run(debug=True, port=5000)
