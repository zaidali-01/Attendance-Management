from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required
from app import db
from app.models import Student, WeeklyAttendance

attendance_bp = Blueprint("attendance", __name__, url_prefix="/students/<int:student_id>/attendance")


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


@attendance_bp.route("/")
@login_required
def list_attendance(student_id):
    student = Student.query.get_or_404(student_id)
    records = student.attendance_records.order_by(WeeklyAttendance.start_date.desc()).all()
    return render_template("attendance/list.html", student=student, records=records)


@attendance_bp.route("/new", methods=["GET", "POST"])
@login_required
def new_attendance(student_id):
    student = Student.query.get_or_404(student_id)

    if request.method == "POST":
        error = None
        try:
            start_date = _parse_date(request.form.get("start_date", ""))
            end_date = _parse_date(request.form.get("end_date", ""))
            total_days = int(request.form.get("total_days", 0))
            present_days = int(request.form.get("present_days", 0))
        except (ValueError, TypeError):
            error = "Please enter valid dates and numbers."

        if not error:
            if end_date < start_date:
                error = "End date cannot be before start date."
            elif total_days <= 0:
                error = "Total days must be greater than zero."
            elif present_days < 0 or present_days > total_days:
                error = "Present days must be between 0 and total days."

        if error:
            flash(error, "error")
            return render_template("attendance/form.html", student=student, record=None)

        record = WeeklyAttendance(
            student_id=student.id,
            start_date=start_date,
            end_date=end_date,
            total_days=total_days,
            present_days=present_days,
        )
        db.session.add(record)
        db.session.commit()
        flash("Weekly attendance recorded.", "success")
        return redirect(url_for("attendance.list_attendance", student_id=student.id))

    return render_template("attendance/form.html", student=student, record=None)


@attendance_bp.route("/<int:record_id>/edit", methods=["GET", "POST"])
@login_required
def edit_attendance(student_id, record_id):
    student = Student.query.get_or_404(student_id)
    record = WeeklyAttendance.query.filter_by(id=record_id, student_id=student_id).first_or_404()

    if request.method == "POST":
        error = None
        try:
            start_date = _parse_date(request.form.get("start_date", ""))
            end_date = _parse_date(request.form.get("end_date", ""))
            total_days = int(request.form.get("total_days", 0))
            present_days = int(request.form.get("present_days", 0))
        except (ValueError, TypeError):
            error = "Please enter valid dates and numbers."

        if not error:
            if end_date < start_date:
                error = "End date cannot be before start date."
            elif total_days <= 0:
                error = "Total days must be greater than zero."
            elif present_days < 0 or present_days > total_days:
                error = "Present days must be between 0 and total days."

        if error:
            flash(error, "error")
            return render_template("attendance/form.html", student=student, record=record)

        record.start_date = start_date
        record.end_date = end_date
        record.total_days = total_days
        record.present_days = present_days
        db.session.commit()
        flash("Weekly attendance updated.", "success")
        return redirect(url_for("attendance.list_attendance", student_id=student.id))

    return render_template("attendance/form.html", student=student, record=record)


@attendance_bp.route("/<int:record_id>/delete", methods=["POST"])
@login_required
def delete_attendance(student_id, record_id):
    record = WeeklyAttendance.query.filter_by(id=record_id, student_id=student_id).first_or_404()
    db.session.delete(record)
    db.session.commit()
    flash("Weekly attendance deleted.", "success")
    return redirect(url_for("attendance.list_attendance", student_id=student_id))
