from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required
from app import db
from app.models import Student, CLASS_CHOICES

students_bp = Blueprint("students", __name__, url_prefix="/students")


@students_bp.route("/")
@login_required
def list_students():
    class_filter = request.args.get("class_name", "")
    query = Student.query
    if class_filter:
        query = query.filter_by(class_name=class_filter)
    students = query.order_by(Student.class_name, Student.name).all()
    return render_template(
        "students/list.html", students=students, class_choices=CLASS_CHOICES, class_filter=class_filter
    )


@students_bp.route("/new", methods=["GET", "POST"])
@login_required
def new_student():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        class_name = request.form.get("class_name", "")
        roll_no = request.form.get("roll_no", "").strip()

        if not name or class_name not in CLASS_CHOICES:
            flash("Please provide a valid name and class.", "error")
            return render_template("students/form.html", class_choices=CLASS_CHOICES, student=None)

        student = Student(name=name, class_name=class_name, roll_no=roll_no)
        db.session.add(student)
        db.session.commit()
        flash("Student added.", "success")
        return redirect(url_for("students.list_students"))

    return render_template("students/form.html", class_choices=CLASS_CHOICES, student=None)


@students_bp.route("/<int:student_id>/edit", methods=["GET", "POST"])
@login_required
def edit_student(student_id):
    student = Student.query.get_or_404(student_id)

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        class_name = request.form.get("class_name", "")
        roll_no = request.form.get("roll_no", "").strip()

        if not name or class_name not in CLASS_CHOICES:
            flash("Please provide a valid name and class.", "error")
            return render_template("students/form.html", class_choices=CLASS_CHOICES, student=student)

        student.name = name
        student.class_name = class_name
        student.roll_no = roll_no
        db.session.commit()
        flash("Student updated.", "success")
        return redirect(url_for("students.list_students"))

    return render_template("students/form.html", class_choices=CLASS_CHOICES, student=student)


@students_bp.route("/<int:student_id>/delete", methods=["POST"])
@login_required
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    db.session.delete(student)
    db.session.commit()
    flash("Student deleted.", "success")
    return redirect(url_for("students.list_students"))
