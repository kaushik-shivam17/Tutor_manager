import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, BookOpen, DollarSign,
  Activity, Award, AlertTriangle, Calendar, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
  subscribeToBatches,
  subscribeToStudents,
  subscribeAllFees,
  subscribeAllAttendance,
} from '../services/db';
import { Batch, Student, Fee, Attendance } from '../models/types';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
        <p className="text-white font-black text-sm mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: ₹{p.value.toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
        <p className="text-white font-black text-sm mb-1">{label}</p>
        <p className="text-emerald-400 font-bold text-sm">Attendance: {payload[0]?.value}%</p>
      </div>
    );
  }
  return null;
};

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

  const revenueByMonth = useMemo(() => {
    const now = new Date();
    const result: { label: string; Paid: number; Pending: number; total: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthFees = fees.filter(f => f.month === m && f.year === y);
      const paid = monthFees.filter(f => f.status === 'Paid').reduce((s,f)=>s+f.amount,0);
      const pending = monthFees.filter(f => f.status === 'Unpaid').reduce((s,f)=>s+f.amount,0);
      result.push({
        label: `${MONTH_NAMES[d.getMonth()]} '${String(y).slice(2)}`,
        Paid: paid,
        Pending: pending,
        total: paid + pending,
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

  const momChange = useMemo(() => {
    if (revenueByMonth.length < 2) return 0;
    const last = revenueByMonth[revenueByMonth.length - 1].Paid;
    const prev = revenueByMonth[revenueByMonth.length - 2].Paid;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  }, [revenueByMonth]);

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

  const pieData = [
    { name: 'Collected', value: totalRevenuePaid, color: '#34d399' },
    { name: 'Pending', value: totalRevenuePending, color: '#fb7185' },
  ];

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue bar chart - takes 2 cols */}
        <Card title="Revenue — Last 6 Months" icon={<DollarSign className="w-5 h-5" />} className="lg:col-span-2">
          {revenueByMonth.every(m => m.total === 0) ? (
            <Empty text="No fee data yet for the last 6 months." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByMonth} barCategoryGap="30%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }} />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }} />
                <Bar dataKey="Paid" stackId="a" fill="#34d399" radius={[0,0,0,0]} />
                <Bar dataKey="Pending" stackId="a" fill="#fb7185" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Collection pie */}
        <Card title="Collection Split" icon={<BarChart2 className="w-5 h-5" />}>
          {totalRevenuePaid + totalRevenuePending === 0 ? (
            <Empty text="No fee data yet." />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-6 mt-2">
                {pieData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <div className="text-center">
                      <p className="text-xs font-bold text-white/60">{p.name}</p>
                      <p className="text-sm font-black text-white">₹{p.value.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Attendance trend */}
      <Card title="Attendance Rate — Last 14 Days" icon={<Calendar className="w-5 h-5" />}>
        {attendanceTrend.every(d => d.rate === 0) ? (
          <Empty text="No attendance data for the last 14 days." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={attendanceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="#34d399" strokeWidth={3} fill="url(#attGrad)" dot={{ fill: '#34d399', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

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
                  <th className="text-right py-3 px-2">Expected</th>
                  <th className="text-right py-3 px-2">Collected</th>
                  <th className="text-right py-3 px-2">Pending</th>
                  <th className="text-right py-3 px-2 min-w-[140px]">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {batchStats.map(({ batch, studentCount, paid, pending, attendanceRate, expectedRevenue }) => (
                  <tr key={batch.id} className="hover:bg-white/5 transition group">
                    <td className="py-4 px-2 text-white font-bold group-hover:text-indigo-200 transition-colors">{batch.name}</td>
                    <td className="py-4 px-2 text-right text-white/90 font-semibold">{studentCount}</td>
                    <td className="py-4 px-2 text-right text-white/60 font-bold">₹{expectedRevenue.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-right text-emerald-300 font-bold">₹{paid.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-right text-rose-300 font-bold">₹{pending.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${attendanceRate >= 75 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : attendanceRate >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-rose-400 to-pink-400'}`}
                            style={{ width: `${attendanceRate}%` }}
                          />
                        </div>
                        <span className={`font-bold text-sm w-10 text-right ${attendanceRate >= 75 ? 'text-emerald-300' : attendanceRate >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>{attendanceRate}%</span>
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
                className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
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
                <div className="text-right">
                  <span className="text-emerald-300 font-black text-lg">₹{t.total.toLocaleString('en-IN')}</span>
                  <p className="text-xs text-white/50 font-bold">lifetime</p>
                </div>
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

function Card({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-lg ${className}`}>
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
