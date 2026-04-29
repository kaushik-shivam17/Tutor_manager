import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, BookOpen, DollarSign,
  Activity, Award, AlertTriangle, Calendar
} from 'lucide-react';
import {
  subscribeToBatches,
  subscribeToStudents,
  subscribeAllFees,
  subscribeAllAttendance,
} from '../services/db';
import { Batch, Student, Fee, Attendance } from '../models/types';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Analytics() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    const u1 = subscribeToBatches(setBatches);
    const u2 = subscribeToStudents(null, setStudents);
    const u3 = subscribeAllFees(setFees);
    const u4 = subscribeAllAttendance(setAttendance);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Revenue last 6 months
  const revenueByMonth = useMemo(() => {
    const now = new Date();
    const result: { label: string; paid: number; pending: number; total: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthFees = fees.filter(f => f.month === m && f.year === y);
      const paid = monthFees.filter(f => f.status === 'Paid').reduce((s,f)=>s+f.amount,0);
      const pending = monthFees.filter(f => f.status === 'Unpaid').reduce((s,f)=>s+f.amount,0);
      result.push({
        label: `${MONTH_NAMES[d.getMonth()]} ${String(y).slice(2)}`,
        paid, pending, total: paid + pending,
        key: `${y}-${m}`,
      });
    }
    return result;
  }, [fees]);

  const totalRevenuePaid = useMemo(() =>
    fees.filter(f => f.status === 'Paid').reduce((s,f)=>s+f.amount, 0)
  , [fees]);

  const totalRevenuePending = useMemo(() =>
    fees.filter(f => f.status === 'Unpaid').reduce((s,f)=>s+f.amount, 0)
  , [fees]);

  const collectionRate = useMemo(() => {
    const total = totalRevenuePaid + totalRevenuePending;
    if (total === 0) return 0;
    return Math.round((totalRevenuePaid / total) * 100);
  }, [totalRevenuePaid, totalRevenuePending]);

  // Month-over-month change
  const momChange = useMemo(() => {
    if (revenueByMonth.length < 2) return 0;
    const last = revenueByMonth[revenueByMonth.length - 1].paid;
    const prev = revenueByMonth[revenueByMonth.length - 2].paid;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  }, [revenueByMonth]);

  // Per-batch performance
  const batchStats = useMemo(() => {
    return batches.map(b => {
      const bStudents = students.filter(s => s.batchId === b.id);
      const bFees = fees.filter(f => f.batchId === b.id);
      const paid = bFees.filter(f => f.status === 'Paid').reduce((s,f)=>s+f.amount,0);
      const pending = bFees.filter(f => f.status === 'Unpaid').reduce((s,f)=>s+f.amount,0);
      const bAtt = attendance.filter(a => a.batchId === b.id);
      const present = bAtt.filter(a => a.status === 'Present').length;
      const absent  = bAtt.filter(a => a.status === 'Absent').length;
      const denom = present + absent;
      const attendanceRate = denom > 0 ? Math.round((present / denom) * 100) : 0;
      const expectedRevenue = bStudents.reduce((s, st) => s + (st.monthlyFee || 0), 0);
      return { batch: b, studentCount: bStudents.length, paid, pending, attendanceRate, expectedRevenue };
    }).sort((a, b) => b.paid - a.paid);
  }, [batches, students, fees, attendance]);

  // Top paying students (lifetime)
  const topStudents = useMemo(() => {
    const map = new Map<string, number>();
    fees.filter(f => f.status === 'Paid').forEach(f => {
      map.set(f.studentId, (map.get(f.studentId) || 0) + f.amount);
    });
    return Array.from(map.entries())
      .map(([studentId, total]) => ({
        student: students.find(s => s.id === studentId),
        total,
      }))
      .filter(x => x.student)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [fees, students]);

  // Attendance trend last 30 days
  const attendanceTrend = useMemo(() => {
    const days: { label: string; rate: number; date: string }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().slice(0,10);
      const rec = attendance.filter(a => a.date === dateStr);
      const p = rec.filter(a => a.status === 'Present').length;
      const a_ = rec.filter(a => a.status === 'Absent').length;
      const denom = p + a_;
      days.push({
        label: `${d.getDate()}/${d.getMonth()+1}`,
        rate: denom > 0 ? Math.round((p/denom)*100) : 0,
        date: dateStr,
      });
    }
    return days;
  }, [attendance]);

  const maxRevenue = Math.max(1, ...revenueByMonth.map(m => m.total));

  return (
    <div className="space-y-8 relative z-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-3">
          <Activity className="w-8 h-8" />
          Analytics
        </h1>
        <p className="text-base text-white/80 mt-2 font-medium">
          Real-time insights into revenue, attendance, and batch performance.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Total Collected"
          value={`₹${totalRevenuePaid.toLocaleString('en-IN')}`}
          accent="from-emerald-400 to-teal-500"
        />
        <KpiCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Outstanding"
          value={`₹${totalRevenuePending.toLocaleString('en-IN')}`}
          accent="from-rose-400 to-pink-500"
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Collection Rate"
          value={`${collectionRate}%`}
          accent="from-indigo-400 to-purple-500"
          subtitle={
            <span className={`flex items-center gap-1 text-xs font-bold ${momChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {momChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(momChange)}% vs last month
            </span>
          }
        />
        <KpiCard
          icon={<Users className="w-6 h-6" />}
          label="Active Students"
          value={String(students.length)}
          accent="from-amber-400 to-orange-500"
          subtitle={<span className="text-xs font-bold text-white/70">{batches.length} batches</span>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card title="Revenue — Last 6 Months" icon={<DollarSign className="w-5 h-5" />}>
          {revenueByMonth.every(m => m.total === 0) ? (
            <Empty text="No fee data yet for the last 6 months." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-3 h-48 pt-2">
                {revenueByMonth.map((m) => {
                  const paidH = (m.paid / maxRevenue) * 100;
                  const pendH = (m.pending / maxRevenue) * 100;
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col justify-end h-full relative group">
                        <div
                          className="w-full bg-gradient-to-t from-rose-500/70 to-rose-400/70 rounded-t-md transition-all"
                          style={{ height: `${pendH}%` }}
                          title={`Pending: ₹${m.pending}`}
                        />
                        <div
                          className="w-full bg-gradient-to-t from-emerald-500/90 to-emerald-400/90 transition-all"
                          style={{ height: `${paidH}%` }}
                          title={`Paid: ₹${m.paid}`}
                        />
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap z-10">
                          ₹{m.total.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-white/70">{m.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 text-xs font-bold">
                <span className="flex items-center gap-2 text-white/80">
                  <span className="w-3 h-3 rounded bg-emerald-400" /> Paid
                </span>
                <span className="flex items-center gap-2 text-white/80">
                  <span className="w-3 h-3 rounded bg-rose-400" /> Pending
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Attendance trend */}
        <Card title="Attendance Rate — Last 14 Days" icon={<Calendar className="w-5 h-5" />}>
          {attendanceTrend.every(d => d.rate === 0) ? (
            <Empty text="No attendance data for the last 14 days." />
          ) : (
            <div className="space-y-3">
              <SparklineSVG points={attendanceTrend.map(d => d.rate)} labels={attendanceTrend.map(d => d.label)} />
              <div className="flex justify-between text-xs font-bold text-white/70">
                <span>{attendanceTrend[0].label}</span>
                <span>Today</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Batch performance table */}
      <Card title="Batch Performance" icon={<BookOpen className="w-5 h-5" />}>
        {batchStats.length === 0 ? (
          <Empty text="Create a batch to see performance metrics." />
        ) : (
          <div className="overflow-x-auto -m-2">
            <table className="min-w-full">
              <thead>
                <tr className="text-[11px] font-extrabold text-white/60 uppercase tracking-widest">
                  <th className="text-left py-3 px-2">Batch</th>
                  <th className="text-right py-3 px-2">Students</th>
                  <th className="text-right py-3 px-2">Collected</th>
                  <th className="text-right py-3 px-2">Pending</th>
                  <th className="text-right py-3 px-2">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {batchStats.map(({ batch, studentCount, paid, pending, attendanceRate }) => (
                  <tr key={batch.id} className="hover:bg-white/5 transition">
                    <td className="py-4 px-2 text-white font-bold">{batch.name}</td>
                    <td className="py-4 px-2 text-right text-white/90 font-semibold">{studentCount}</td>
                    <td className="py-4 px-2 text-right text-emerald-300 font-bold">₹{paid.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-right text-rose-300 font-bold">₹{pending.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
                            style={{ width: `${attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-white font-bold text-sm w-10 text-right">{attendanceRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top students */}
      <Card title="Top Paying Students" icon={<Award className="w-5 h-5" />}>
        {topStudents.length === 0 ? (
          <Empty text="No payment records yet." />
        ) : (
          <ul className="space-y-3">
            {topStudents.map((t, i) => (
              <motion.li
                key={t.student!.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-md ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-600' :
                    i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                    i === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700' :
                              'bg-white/20'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-white font-bold">{t.student!.name}</p>
                    <p className="text-xs text-white/60 font-semibold">{t.student!.mobileNumber}</p>
                  </div>
                </div>
                <span className="text-emerald-300 font-black text-lg">₹{t.total.toLocaleString('en-IN')}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function KpiCard({
  icon, label, value, accent, subtitle,
}: { icon: React.ReactNode; label: string; value: string; accent: string; subtitle?: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
        <span className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl xl:text-3xl font-black text-white">{value}</div>
      {subtitle && <div className="mt-1">{subtitle}</div>}
    </motion.div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-white">{icon}</div>
        <h3 className="text-lg font-extrabold text-white tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-10 text-center text-white/60 text-sm font-bold border border-dashed border-white/20 rounded-2xl">
      {text}
    </div>
  );
}

function SparklineSVG({ points, labels }: { points: number[]; labels: string[] }) {
  const w = 600, h = 160, pad = 16;
  const max = 100;
  const stepX = (w - pad * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (p / max) * (h - pad * 2);
    return [x, y] as [number, number];
  });
  const path = coords.map((c, i) => (i === 0 ? `M ${c[0]} ${c[1]}` : `L ${c[0]} ${c[1]}`)).join(' ');
  const areaPath = `${path} L ${coords[coords.length - 1][0]} ${h - pad} L ${coords[0][0]} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(16,185,129,0.55)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0)" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(g => {
        const y = h - pad - (g / max) * (h - pad * 2);
        return (
          <line key={g} x1={pad} y1={y} x2={w - pad} y2={y}
                stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
        );
      })}
      <path d={areaPath} fill="url(#spark-grad)" />
      <path d={path} stroke="rgb(52,211,153)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c[0]} cy={c[1]} r="4" fill="white" stroke="rgb(16,185,129)" strokeWidth="2" />
          <title>{`${labels[i]}: ${points[i]}%`}</title>
        </g>
      ))}
    </svg>
  );
}
