import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

def db_conn():
    db_path = os.getenv('SQLITE_DB') or os.path.join(os.path.dirname(__file__), 'database.db')
    conn = sqlite3.connect(db_path, isolation_level=None)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)"
    )
    cur.execute(
        "CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, publisher TEXT NOT NULL, price INTEGER NOT NULL, discount_percentage INTEGER NOT NULL, discounted_price INTEGER NOT NULL, description TEXT, cover_image BLOB, isbn TEXT NOT NULL, uploaded_by TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.close()

@app.post('/api/register')
def register():
    data = request.get_json(force=True)
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    if not name or not email or not password:
        return jsonify({'error': 'invalid_input'}), 400
    ph = generate_password_hash(password)
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO users (name, email, password_hash) VALUES (?,?,?)", (name, email, ph))
        return jsonify({'ok': True})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'email_exists'}), 409
    finally:
        conn.close()

@app.post('/api/login')
def login():
    data = request.get_json(force=True)
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, password_hash FROM users WHERE email=?", (email,))
        row = cur.fetchone()
        row = dict(row) if row else None
        if not row or not check_password_hash(row['password_hash'], password):
            return jsonify({'error': 'invalid_credentials'}), 401
        return jsonify({'ok': True, 'user': {'name': row['name'], 'email': row['email']}})
    finally:
        conn.close()

@app.get('/api/books')
def list_books():
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT uid as id, title, author, publisher, price, discount_percentage as discountPercentage, discounted_price as discountedPrice, description, isbn, uploaded_by as uploadedBy FROM books WHERE status='approved' ORDER BY id DESC")
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r['coverImage'] = f"/api/books/{r['id']}/cover"
        return jsonify({'ok': True, 'books': rows})
    finally:
        conn.close()

@app.get('/api/books/<uid>/cover')
def book_cover(uid):
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT cover_image FROM books WHERE uid=?", (uid,))
        row = cur.fetchone()
        row = dict(row) if row else None
        if not row or not row['cover_image']:
            return ('', 404)
        return (row['cover_image'], 200, {'Content-Type': 'image/jpeg'})
    finally:
        conn.close()

@app.post('/api/books')
def upload_book():
    data = request.get_json(force=True)
    uid = data.get('id')
    title = data.get('title')
    author = data.get('author')
    publisher = data.get('publisher')
    price = int(data.get('price') or 0)
    discount = int(data.get('discountPercentage') or 0)
    discounted_price = int(data.get('discountedPrice') or max(price - (price*discount//100), 0))
    description = data.get('description')
    cover_b64 = data.get('coverImage')
    isbn = data.get('isbn')
    uploaded_by = data.get('uploadedBy')
    if not (uid and title and author and publisher and price and isbn and uploaded_by and cover_b64):
        return jsonify({'error': 'invalid_input'}), 400
    try:
        header, b64data = cover_b64.split(',', 1) if ',' in cover_b64 else ('', cover_b64)
        import base64
        blob = base64.b64decode(b64data)
    except Exception:
        return jsonify({'error': 'invalid_image'}), 400
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO books (uid, title, author, publisher, price, discount_percentage, discounted_price, description, cover_image, isbn, uploaded_by, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')",
            (uid, title, author, publisher, price, discount, discounted_price, description, blob, isbn, uploaded_by)
        )
        return jsonify({'ok': True, 'status': 'pending'})
    finally:
        conn.close()

@app.get('/api/pending')
def list_pending():
    admin_email = request.args.get('admin_email', '').lower()
    if admin_email != 'admin@bookbazaar.com':
        return jsonify({'error': 'forbidden'}), 403
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT uid as id, title, author, publisher, price, discount_percentage as discountPercentage, discounted_price as discountedPrice, description, isbn, uploaded_by as uploadedBy FROM books WHERE status='pending' ORDER BY id DESC")
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r['coverImage'] = f"/api/books/{r['id']}/cover"
        return jsonify({'ok': True, 'books': rows})
    finally:
        conn.close()

@app.post('/api/books/<uid>/approve')
def approve(uid):
    data = request.get_json(force=True)
    admin_email = (data.get('admin_email') or '').lower()
    if admin_email != 'admin@bookbazaar.com':
        return jsonify({'error': 'forbidden'}), 403
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE books SET status='approved' WHERE uid=?", (uid,))
        return jsonify({'ok': True})
    finally:
        conn.close()

@app.delete('/api/books/<uid>')
def reject(uid):
    admin_email = (request.args.get('admin_email') or '').lower()
    if admin_email != 'admin@bookbazaar.com':
        return jsonify({'error': 'forbidden'}), 403
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM books WHERE uid=?", (uid,))
        return jsonify({'ok': True})
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)))
