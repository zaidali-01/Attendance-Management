import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Student, WeeklyAttendance } from "@prisma/client";

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function absentDays(totalDays: number, presentDays: number) {
  return Math.max(totalDays - presentDays, 0);
}

function percentage(totalDays: number, presentDays: number) {
  if (!totalDays) return 0;
  return Math.round((presentDays / totalDays) * 1000) / 10;
}

const BRAND_GREEN = "#2e7d52";
const BRAND_GREEN_DARK = "#235f3f";
const BORDER = "#d4e3da";
const LIGHT = "#e6f2eb";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica", color: "#1f2d25" },
  header: {
    textAlign: "center",
    borderBottom: `3px solid ${BRAND_GREEN}`,
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: { color: BRAND_GREEN, fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 11 },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { width: 140, fontWeight: 700, color: BRAND_GREEN_DARK },
  table: { display: "flex", width: "100%", borderStyle: "solid", borderColor: BORDER, borderWidth: 1 },
  row: { flexDirection: "row" },
  headerCell: {
    flex: 1,
    backgroundColor: LIGHT,
    color: BRAND_GREEN_DARK,
    fontWeight: 700,
    padding: 6,
    borderStyle: "solid",
    borderColor: BORDER,
    borderWidth: 0.5,
  },
  cell: {
    flex: 1,
    padding: 6,
    borderStyle: "solid",
    borderColor: BORDER,
    borderWidth: 0.5,
  },
  footerRow: { flexDirection: "row", backgroundColor: "#f5f8f6", fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 9, color: "#777", textAlign: "center" },
});

type ReportTotals = {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
};

export function ReportDocument({
  student,
  records,
  fromDate,
  toDate,
  totals,
}: {
  student: Student;
  records: WeeklyAttendance[];
  fromDate: Date | null;
  toDate: Date | null;
  totals: ReportTotals;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Al-Ismat Academy</Text>
          <Text style={styles.subtitle}>Weekly Attendance Report</Text>
        </View>

        <View style={{ marginBottom: 18 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Student Name:</Text>
            <Text>{student.name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Class:</Text>
            <Text>{student.className}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Roll No.:</Text>
            <Text>{student.rollNo || "-"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Report Period:</Text>
            <Text>
              {formatDate(fromDate) || "Beginning"} to {formatDate(toDate) || "Latest"}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.headerCell}>Week Start</Text>
            <Text style={styles.headerCell}>Week End</Text>
            <Text style={styles.headerCell}>Total Days</Text>
            <Text style={styles.headerCell}>Present</Text>
            <Text style={styles.headerCell}>Absent</Text>
            <Text style={styles.headerCell}>Attendance %</Text>
          </View>

          {records.length === 0 && (
            <View style={styles.row}>
              <Text style={{ ...styles.cell, flex: 6 }}>No attendance records found for this period.</Text>
            </View>
          )}

          {records.map((r) => (
            <View style={styles.row} key={r.id}>
              <Text style={styles.cell}>{formatDate(r.startDate)}</Text>
              <Text style={styles.cell}>{formatDate(r.endDate)}</Text>
              <Text style={styles.cell}>{r.totalDays}</Text>
              <Text style={styles.cell}>{r.presentDays}</Text>
              <Text style={styles.cell}>{absentDays(r.totalDays, r.presentDays)}</Text>
              <Text style={styles.cell}>{percentage(r.totalDays, r.presentDays)}%</Text>
            </View>
          ))}

          {records.length > 0 && (
            <View style={styles.footerRow}>
              <Text style={{ ...styles.cell, flex: 2 }}>Overall</Text>
              <Text style={styles.cell}>{totals.totalDays}</Text>
              <Text style={styles.cell}>{totals.presentDays}</Text>
              <Text style={styles.cell}>{totals.absentDays}</Text>
              <Text style={styles.cell}>{totals.percentage}%</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>Generated by Al-Ismat Academy Attendance System</Text>
      </Page>
    </Document>
  );
}
