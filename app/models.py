from datetime import date
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

CLASS_CHOICES = ["9", "10", "11", "12"]


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    class_name = db.Column(db.String(10), nullable=False)
    roll_no = db.Column(db.String(30))
    created_at = db.Column(db.Date, default=date.today)

    attendance_records = db.relationship(
        "WeeklyAttendance", backref="student", cascade="all, delete-orphan", lazy="dynamic"
    )


class WeeklyAttendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_days = db.Column(db.Integer, nullable=False)
    present_days = db.Column(db.Integer, nullable=False)

    @property
    def absent_days(self):
        return max(self.total_days - self.present_days, 0)

    @property
    def percentage(self):
        if not self.total_days:
            return 0.0
        return round((self.present_days / self.total_days) * 100, 1)
