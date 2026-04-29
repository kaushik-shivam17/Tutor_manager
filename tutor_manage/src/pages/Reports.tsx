import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Users, DollarSign, CalendarCheck, Printer, Filter } from 'lucide-react';
import { format } from 'date-fns';
import {
  subscribeToBatches,
  subscribeToStudents,
  subscribeAllFees,
  subscribeAllAttendance,
} from '../services/db';
import { Batch, Student, Fee, Attendance } from '../models/types';
import { toCSV, downloadCSV } from '../utils/csv';
import { toast } from 'sonner';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Reports() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const u1 = subscribeToBatches(setBatches);
    const u2 = subscribeToStudents(null, setStudents);
    const u3 = subscribeAllFees(setFees);
    const u4 = subscribeAllAttendance(setAttendance);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const filteredStudents = useMemo(() => {
    if (batchFilter === 'all') return students;
    return students.filter(s => s.batchId === batchFilter);
  }, [students, batchFilter]);

  const filteredFees = useMemo(() => {
    return fees.filter(f => {
      if (f.month !== monthFilter || f.year !== yearFilter) return false;
      if (batchFilter !== 'all' && f.batchId !== batchFilter) return false;
      return true;
    });
  }, [fees, monthFilter, yearFilter, batchFilter]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const d = new Date(a.date);
      if (d.getMonth() + 1 !== monthFilter || d.getFullYear() !== yearFilter) return false;
      if (batchFilter !== 'all' && a.batchId !== batchFilter) return false;
      return true;
    });
  }, [attendance, monthFilter, yearFilter, batchFilter]);

  const summary = useMemo(() => {
    const paid = filteredFees.filter(f => f.status === 'Paid').reduce((s,f)=>s+f.amount,0);
    const unpaid = filteredFees.filter(f => f.status === 'Unpaid').reduce((s,f)=>s+f.amount,0);
    const present = filteredAttendance.filter(a => a.status === 'Present').length;
    const absent = filteredAttendance.filter(a => a.status === 'Absent').length;
    const holiday = filteredAttendance.filter(a => a.status === 'Holiday').length;
    return { paid, unpaid, present, absent, holiday, total: paid + unpaid };
  }, [filteredFees, filteredAttendance]);

  const exportStudents = () => {
    const rows = filteredStudents.map(s => ({
      Name: s.name,
      'Father Name': s.fatherName,
      'Mobile Number': s.mobileNumber,
      'Joining Date': s.joiningDate,
      'Monthly Fee (INR)': s.monthlyFee,
      Batch: batches.find(b => b.id === s.batchId)?.name || '',
    }));
    if (rows.length === 0) {
      toast.error('No students to export.');
      return;
    }
    downloadCSV(`students-${batchFilter === 'all' ? 'all' : batchFilter}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} students`);
  };

  const exportFees = () => {
    const rows = filteredFees.map(f => {
      const st = students.find(s => s.id === f.studentId);
      const b = batches.find(b => b.id === f.batchId);
      return {
        Student: st?.name || f.studentId,
        Mobile: st?.mobileNumber || '',
        Batch: b?.name || '',
        Month: MONTH_NAMES[f.month - 1],
        Year: f.year,
        'Amount (INR)': f.amount,
        Status: f.status,
        'Payment Date': f.paymentDate ? format(new Date(f.paymentDate), 'yyyy-MM-dd') : '',
      };
    });
    if (rows.length === 0) {
      toast.error('No fees to export for the selected period.');
      return;
    }
    downloadCSV(`fees-${yearFilter}-${monthFilter}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} fee records`);
  };

  const exportAttendance = () => {
    const rows = filteredAttendance.map(a => {
      const st = students.find(s => s.id === a.studentId);
      const b = batches.find(b => b.id === a.batchId);
      return {
        Student: st?.name || a.studentId,
        Batch: b?.name || '',
        Date: a.date,
        Status: a.status,
      };
    });
    if (rows.length === 0) {
      toast.error('No attendance records for the selected period.');
      return;
    }
    downloadCSV(`attendance-${yearFilter}-${monthFilter}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} attendance records`);
  };

  const handlePrint = () => window.print();

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    fees.forEach(f => set.add(f.year));
    attendance.forEach(a => set.add(new Date(a.date).getFullYear()));
    return Array.from(set).sort((a,b)=>b-a);
  }, [fees, attendance]);

  return (
    <div className="space-y-8 relative z-10">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-3">
            <FileText className="w-8 h-8" />
            Reports
          </h1>
          <p className="text-base text-white/80 mt-2 font-medium">
            Generate, export and print reports for any period.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white text-sm font-bold shadow-lg transition-all hover:scale-[1.02]"
        >
          <Printer className="w-4 h-4" /> Print Summary
        </button>
      </div>

      {/* Filters */}
      <div className="no-print bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4 text-white/80 font-bold text-xs uppercase tracking-widest">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold text-white/70 uppercase tracking-widest mb-1.5">Batch</label>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/30 rounded-xl text-white font-semibold backdrop-blur-md focus:ring-2 focus:ring-white outline-none"
            >
              <option value="all" className="text-slate-800">All batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id} className="text-slate-800">{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-white/70 uppercase tracking-widest mb-1.5">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/30 rounded-xl text-white font-semibold backdrop-blur-md focus:ring-2 focus:ring-white outline-none"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i+1} className="text-slate-800">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-white/70 uppercase tracking-widest mb-1.5">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/30 rounded-xl text-white font-semibold backdrop-blur-md focus:ring-2 focus:ring-white outline-none"
            >
              {years.map(y => (
                <option key={y} value={y} className="text-slate-800">{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-card">
        <SummaryCard label="Students" value={String(filteredStudents.length)} icon={<Users className="w-5 h-5" />} />
        <SummaryCard label="Collected" value={`₹${summary.paid.toLocaleString('en-IN')}`} icon={<DollarSign className="w-5 h-5" />} accent="text-emerald-300" />
        <SummaryCard label="Pending" value={`₹${summary.unpaid.toLocaleString('en-IN')}`} icon={<DollarSign className="w-5 h-5" />} accent="text-rose-300" />
        <SummaryCard label="Attendance" value={`${summary.present}P / ${summary.absent}A`} icon={<CalendarCheck className="w-5 h-5" />} />
      </div>

      {/* Export cards */}
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-5">
        <ExportCard
          title="Students"
          desc={`Export ${filteredStudents.length} student record${filteredStudents.length === 1 ? '' : 's'}.`}
          icon={<Users className="w-6 h-6" />}
          onExport={exportStudents}
          accent="from-indigo-500 to-purple-600"
        />
        <ExportCard
          title="Fees"
          desc={`Export ${filteredFees.length} fee record${filteredFees.length === 1 ? '' : 's'} for ${MONTH_NAMES[monthFilter-1]} ${yearFilter}.`}
          icon={<DollarSign className="w-6 h-6" />}
          onExport={exportFees}
          accent="from-emerald-500 to-teal-600"
        />
        <ExportCard
          title="Attendance"
          desc={`Export ${filteredAttendance.length} attendance record${filteredAttendance.length === 1 ? '' : 's'} for ${MONTH_NAMES[monthFilter-1]} ${yearFilter}.`}
          icon={<CalendarCheck className="w-6 h-6" />}
          onExport={exportAttendance}
          accent="from-amber-500 to-orange-600"
        />
      </div>

      {/* Print-friendly summary */}
      <div className="print-card bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-lg">
        <h2 className="text-xl font-extrabold text-white mb-4">
          Summary — {MONTH_NAMES[monthFilter-1]} {yearFilter}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <Row label="Total students" value={String(filteredStudents.length)} />
            <Row label="Total collected" value={`₹${summary.paid.toLocaleString('en-IN')}`} />
            <Row label="Total pending" value={`₹${summary.unpaid.toLocaleString('en-IN')}`} />
            <Row label="Collection rate" value={summary.total ? `${Math.round(summary.paid/summary.total*100)}%` : '—'} />
          </div>
          <div className="space-y-2">
            <Row label="Present marks" value={String(summary.present)} />
            <Row label="Absent marks" value={String(summary.absent)} />
            <Row label="Holiday marks" value={String(summary.holiday)} />
            <Row label="Batch scope" value={batchFilter === 'all' ? 'All batches' : batches.find(b=>b.id===batchFilter)?.name || '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between text-white/70 mb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-black ${accent || 'text-white'}`}>{value}</div>
    </motion.div>
  );
}

function ExportCard({ title, desc, icon, onExport, accent }: { title: string; desc: string; icon: React.ReactNode; onExport: () => void; accent: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-lg flex flex-col">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-md mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-extrabold text-white">{title}</h3>
      <p className="text-sm text-white/70 mt-1 font-medium flex-1">{desc}</p>
      <button
        onClick={onExport}
        className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02]"
      >
        <Download className="w-4 h-4" /> Download CSV
      </button>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2">
      <span className="text-white/70 font-semibold">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
