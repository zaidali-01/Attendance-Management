from datetime import datetime
from flask import Blueprint, render_template, request, make_response, flash, redirect, url_for
from flask_login import login_required
from weasyprint import HTML
from app.models import Student, WeeklyAttendance, CLASS_CHOICES

reports_bp = Blueprint("reports", __name__, url_prefix="/reports")


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


@reports_bp.route("/", methods=["GET", "POST"])
@login_required
def build_report():
    students = Student.query.order_by(Student.class_name, Student.name).all()

    if request.method == "POST":
        student_id = request.form.get("student_id", type=int)
        from_date_raw = request.form.get("from_date", "")
        to_date_raw = request.form.get("to_date", "")

        student = Student.query.get(student_id) if student_id else None

        if not student:
            flash("Please select a student.", "error")
            return render_template("reports/select.html", students=students)

        try:
            from_date = _parse_date(from_date_raw) if from_date_raw else None
            to_date = _parse_date(to_date_raw) if to_date_raw else None
        except ValueError:
            flash("Please provide valid dates.", "error")
            return render_template("reports/select.html", students=students)

        query = student.attendance_records
        if from_date:
            query = query.filter(WeeklyAttendance.start_date >= from_date)
        if to_date:
            query = query.filter(WeeklyAttendance.end_date <= to_date)
        records = query.order_by(WeeklyAttendance.start_date.asc()).all()

        totals = {
            "total_days": sum(r.total_days for r in records),
            "present_days": sum(r.present_days for r in records),
        }
        totals["absent_days"] = totals["total_days"] - totals["present_days"]
        totals["percentage"] = (
            round((totals["present_days"] / totals["total_days"]) * 100, 1) if totals["total_days"] else 0.0
        )

        html_content = render_template(
            "reports/pdf_report.html",
            student=student,
            records=records,
            from_date=from_date,
            to_date=to_date,
            totals=totals,
        )

        pdf_bytes = HTML(string=html_content).write_pdf()
        response = make_response(pdf_bytes)
        response.headers["Content-Type"] = "application/pdf"
        filename = f"attendance_report_{student.name.replace(' ', '_')}.pdf"
        response.headers["Content-Disposition"] = f"inline; filename={filename}"
        return response

    return render_template("reports/select.html", students=students)
