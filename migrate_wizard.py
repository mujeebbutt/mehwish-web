import sqlite3

def upgrade_db():
    conn = sqlite3.connect('student_data.db')
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE students ADD COLUMN phone TEXT')
        cursor.execute('ALTER TABLE students ADD COLUMN grade TEXT')
        cursor.execute('ALTER TABLE students ADD COLUMN duration TEXT')
        conn.commit()
        print("Successfully added columns.")
    except Exception as e:
        print("Error or already added:", e)
    conn.close()

if __name__ == '__main__':
    upgrade_db()
