import os
from flask import Flask, render_template, redirect, url_for, request, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import re

app = Flask(__name__)
app.secret_key = 'super-secret-key-for-lab-use'

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 
    'postgresql://chaos_user:chaos_password@postgres-service:5432/chaos_db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    # FIX: Expanded column size from 50 to 256 to stop string truncation on security hashes
    password = db.Column(db.String(256), nullable=False) 

class Record(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Create the database tables
with app.app_context():
    db.create_all()

# Insert this right below your db.create_all() block and above your routes in app.py

@app.before_request
def handle_automation_testing():
    # If the secure token is passed from Jenkins/Playwright, inject a test session
    if request.headers.get('X-Automation-Test-Token') == 'ChaosSecretToken123!':
        # Ensure a default test user exists in the database context
        test_user = User.query.filter_by(username='automation_test_user').first()
        if not test_user:
            test_user = User(username='automation_test_user', password='StaticHashedPasswordPlaceholder')
            db.session.add(test_user)
            db.session.commit()
        
        session['user_id'] = test_user.id
        session['user_name'] = test_user.username

# --- Routes ---

@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Combination layer validation
        if len(password) < 8:
            flash("Password must be at least 8 characters long.", "warning")
            return render_template('signup.html')
        if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password):
            flash("Password must contain both uppercase and lowercase letters.", "warning")
            return render_template('signup.html')
        if not re.search(r"\d", password):
            flash("Password must contain at least one number.", "warning")
            return render_template('signup.html')
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            flash("Password must contain at least one special character.", "warning")
            return render_template('signup.html')
        
        # Hashing password now stores safely inside the expanded schema
        hashed_pw = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_pw)
        try:
            db.session.add(new_user)
            db.session.commit()
            flash("Account created!")
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash("Username already exists.")
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and check_password_hash(user.password, request.form['password']):
            session['user_id'] = user.id
            session['user_name'] = user.username
            return redirect(url_for('dashboard'))
        flash("Invalid Credentials")
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session: 
        return redirect(url_for('login'))
    user_records = Record.query.filter_by(user_id=session['user_id']).all()
    return render_template('dashboard.html', records=user_records)

@app.route('/add', methods=['POST'])
def add_record():
    if 'user_id' in session:
        new_record = Record(content=request.form.get('content'), user_id=session['user_id'])
        db.session.add(new_record)
        db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/edit/<int:record_id>', methods=['GET', 'POST'])
def edit_record(record_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    record = Record.query.get_or_404(record_id)
    if record.user_id != session.get('user_id'):
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        record.content = request.form['content']
        db.session.commit()
        return redirect(url_for('dashboard'))
    return render_template('edit.html', record=record)

@app.route('/delete/<int:record_id>')
def delete_record(record_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    record = Record.query.get(record_id)
    if record and record.user_id == session['user_id']:
        db.session.delete(record)
        db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    host = os.environ.get('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    app.run(host=host, port=port, debug=True)
