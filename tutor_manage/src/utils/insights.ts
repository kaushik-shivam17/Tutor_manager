import { Batch, Student, Fee, Attendance } from '../models/types';

export type InsightSeverity = 'info' | 'warn' | 'critical';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  /** Internal route to navigate to when clicked. */
  href?: string;
  /** Sortable timestamp for ordering newest-first; higher = newer. */
  timestamp: number;
  category: 'fees' | 'attendance' | 'students' | 'batches';
}

export function buildInsights(
  batches: Batch[],
  students: Student[],
  fees: Fee[],
  attendance: Attendance[],
): Insight[] {
  const out: Insight[] = [];
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const dayMs = 86_400_000;

  // 1. Students with multiple unpaid months
  const unpaidByStudent = new Map<string, number>();
  fees.filter(f => f.status === 'Unpaid').forEach(f => {
    unpaidByStudent.set(f.studentId, (unpaidByStudent.get(f.studentId) || 0) + 1);
  });
  unpaidByStudent.forEach((count, studentId) => {
    if (count >= 2) {
      const st = students.find(s => s.id === studentId);
      if (!st) return;
      out.push({
        id: `overdue-${studentId}`,
        severity: count >= 3 ? 'critical' : 'warn',
        title: `${st.name} has ${count} unpaid months`,
        description: `Outstanding fee record across ${count} billing cycles.`,
        href: `/student/${st.id}`,
        timestamp: now.getTime() - count * 1000,
        category: 'fees',
      });
    }
  });

  // 2. Pending fees this month per batch
  const monthFees = fees.filter(f => f.month === currentMonth && f.year === currentYear);
  batches.forEach(b => {
    const batchUnpaid = monthFees.filter(f => f.batchId === b.id && f.status === 'Unpaid');
    if (batchUnpaid.length >= 3) {
      out.push({
        id: `pending-${b.id}-${currentYear}-${currentMonth}`,
        severity: batchUnpaid.length >= 5 ? 'warn' : 'info',
        title: `${batchUnpaid.length} students pending fees in ${b.name}`,
        description: `Send a quick reminder from the batch page.`,
        href: `/batch/${b.id}`,
        timestamp: now.getTime() - batchUnpaid.length * 100,
        category: 'fees',
      });
    }
  });

  // 3. Low attendance batches (last 30 days, < 60%)
  const cutoff = new Date(now.getTime() - 30 * dayMs).toISOString().slice(0, 10);
  batches.forEach(b => {
    const recent = attendance.filter(a => a.batchId === b.id && a.date >= cutoff);
    const present = recent.filter(a => a.status === 'Present').length;
    const absent = recent.filter(a => a.status === 'Absent').length;
    const denom = present + absent;
    if (denom < 5) return; // need a baseline
    const rate = Math.round((present / denom) * 100);
    if (rate < 60) {
      out.push({
        id: `low-att-${b.id}`,
        severity: rate < 40 ? 'critical' : 'warn',
        title: `${b.name} attendance is ${rate}%`,
        description: `Below 60% over the last 30 days.`,
        href: `/batch/${b.id}`,
        timestamp: now.getTime() - 86400000 + rate,
        category: 'attendance',
      });
    }
  });

  // 4. New students this week
  const weekAgo = new Date(now.getTime() - 7 * dayMs);
  students.forEach(s => {
    const created = new Date(s.createdAt || s.joiningDate);
    if (!isNaN(created.getTime()) && created >= weekAgo) {
      out.push({
        id: `new-${s.id}`,
        severity: 'info',
        title: `Welcome ${s.name}`,
        description: `Joined ${new Date(s.joiningDate).toLocaleDateString()}.`,
        href: `/student/${s.id}`,
        timestamp: created.getTime(),
        category: 'students',
      });
    }
  });

  // 5. Empty batches
  batches.forEach(b => {
    const count = students.filter(s => s.batchId === b.id).length;
    if (count === 0) {
      out.push({
        id: `empty-${b.id}`,
        severity: 'info',
        title: `${b.name} has no students yet`,
        description: `Add your first student to start tracking attendance.`,
        href: `/batch/${b.id}`,
        timestamp: now.getTime() - 100000,
        category: 'batches',
      });
    }
  });

  // sort: critical first, then warn, then info; newest first within each severity
  const order: Record<InsightSeverity, number> = { critical: 0, warn: 1, info: 2 };
  return out.sort((a, b) => {
    const sev = order[a.severity] - order[b.severity];
    if (sev !== 0) return sev;
    return b.timestamp - a.timestamp;
  });
}
