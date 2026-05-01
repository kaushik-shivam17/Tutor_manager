import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, DollarSign, Phone, User, Users, ChevronRight, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase';
import { Student, Attendance, Fee, Batch } from '../models/types';
import { subscribeToStudents, subscribeToBatches } from '../services/db';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function AttendanceHeatmap({ attendance }: { attendance: Attendance[] }) {
  const months = useMemo(() => {
    const result = [];
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const days: { date: string; status: string | null }[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const record = attendance.find(a => a.date === dateStr);
        days.push({ date: dateStr, status: record?.status || null });
      }
      result.push({ label: format(date, 'MMM yyyy'), days });
    }
    return result;
  }, [attendance]);

  const getColor = (status: string | null) => {
    if (status === 'Present') return 'bg-emerald-400/80 border-emerald-300/60';
    if (status === 'Absent') return 'bg-rose-400/80 border-rose-300/60';
    if (status === 'Holiday') return 'bg-amber-400/80 border-amber-300/60';
    return 'bg-white/10 border-white/10';
  };

  return (
    <div className="space-y-4">
      {months.map(({ label, days }) => (
        <div key={label}>
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">{label}</p>
          <div className="flex flex-wrap gap-1">
            {days.map(({ date, status }) => (
              <div
                key={date}
                className={`w-6 h-6 rounded-md border ${getColor(status)} transition-all`}
                title={`${format(parseISO(date), 'MMM d')}: ${status || 'Unmarked'}`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-2">
        {[
          { color: 'bg-emerald-400/80', label: 'Present' },
          { color: 'bg-rose-400/80', label: 'Absent' },
          { color: 'bg-amber-400/80', label: 'Holiday' },
          { color: 'bg-white/10', label: 'Unmarked' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-xs font-bold text-white/60">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const unsubStudents = subscribeToStudents(null, (students) => {
      const current = students.find(s => s.id === id);
      if (current) setStudent(current);
    });

    const unsubBatches = subscribeToBatches((batches) => {
      if (student) {
        const currentBatch = batches.find(b => b.id === student.batchId);
        if (currentBatch) setBatch(currentBatch);
      }
    });

    return () => {
      unsubStudents();
      unsubBatches();
    };
  }, [id, student?.batchId]);

  useEffect(() => {
    if (!id) return;
    
    const fetchStats = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const attQuery = query(collection(db, 'attendance'), 
          where('userId', '==', uid),
          where('studentId', '==', id)
        );
        try {
          const attSnapshot = await getDocs(attQuery);
          setAttendance(attSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'attendance');
        }

        const feeQuery = query(collection(db, 'fees'), 
          where('userId', '==', uid),
          where('studentId', '==', id)
        );
        try {
          const feeSnapshot = await getDocs(feeQuery);
          setFees(feeSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Fee)));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'fees');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [id]);

  const { totalPresent, totalAbsent, attendancePercentage } = useMemo(() => {
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { totalPresent: present, totalAbsent: absent, attendancePercentage: percentage };
  }, [attendance]);

  const { totalPaid, totalDue, lastPaymentDate } = useMemo(() => {
    const paid = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
    const due = fees.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0);
    const paidFees = fees.filter(f => f.status === 'Paid').sort((a, b) => {
      if (!a.paymentDate || !b.paymentDate) return 0;
      return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
    });
    const lastDate = paidFees.length > 0 && paidFees[0].paymentDate 
      ? format(parseISO(paidFees[0].paymentDate), 'MMM d, yyyy') 
      : 'No payments yet';
    return { totalPaid: paid, totalDue: due, lastPaymentDate: lastDate };
  }, [fees]);

  const sortedFees = useMemo(() => {
    return [...fees].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [fees]);

  if (!student || loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-5xl mx-auto relative z-10"
    >
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center text-sm text-white/80 font-bold drop-shadow-sm bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl self-start border border-white/50 shadow-sm">
          <Link to="/" className="hover:text-indigo-200 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 mx-1.5 opacity-50" />
          <Link to={`/batch/${student.batchId}`} className="hover:text-indigo-200 transition-colors">{batch?.name || 'Batch'}</Link>
          <ChevronRight className="w-4 h-4 mx-1.5 opacity-50" />
          <span className="text-white">{student.name}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to={`/batch/${student.batchId}`} className="p-3 bg-white/10 backdrop-blur-md border border-white/60 rounded-2xl hover:bg-white/10 hover:scale-105 transition-all shadow-sm group">
            <ArrowLeft className="w-6 h-6 text-white/90 group-hover:text-indigo-200 transition-colors" />
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-sm">Student Profile</h1>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-32 bg-indigo-400/10 rounded-full blur-3xl -z-10 mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 p-32 bg-purple-400/10 rounded-full blur-3xl -z-10 mix-blend-multiply" />
        
        <div className="p-6 sm:p-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 border-b border-white/40 pb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/60 to-purple-600/60 border border-white/30 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-4xl font-black text-white">{student.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">{student.name}</h2>
              <p className="text-white/80 font-bold mt-2 text-lg bg-white/10 px-4 py-1.5 rounded-xl border border-white/60 inline-flex shadow-sm">D/O, S/O: {student.fatherName}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white/80 text-sm font-bold px-3 py-1.5 rounded-xl">
                  <Users className="w-4 h-4 text-indigo-300" />
                  {batch?.name || '—'}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white/80 text-sm font-bold px-3 py-1.5 rounded-xl">
                  <CalendarCheck className="w-4 h-4 text-emerald-300" />
                  Joined {format(parseISO(student.joiningDate), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-bold px-3 py-1.5 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                  ₹{student.monthlyFee}/month
                </span>
              </div>
            </div>
            <a
              href={`tel:${student.mobileNumber}`}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-bold rounded-2xl transition-all hover:scale-105 shadow-sm flex-shrink-0"
            >
              <Phone className="w-5 h-5" />
              {student.mobileNumber}
            </a>
          </div>

          {/* Quick Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
            {[
              { label: 'Days Present', value: totalPresent, color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-400/30' },
              { label: 'Days Absent', value: totalAbsent, color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-400/30' },
              { label: 'Attendance', value: `${attendancePercentage}%`, color: attendancePercentage >= 75 ? 'text-emerald-300' : attendancePercentage >= 50 ? 'text-amber-300' : 'text-rose-300', bg: 'bg-white/5 border-white/20' },
              { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-400/30' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-2xl p-4 border ${bg}`}>
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Attendance Heatmap */}
        <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/10 text-indigo-200 rounded-2xl shadow-sm border border-white/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white drop-shadow-sm">Attendance Heatmap</h3>
              <p className="text-xs text-white/60 font-bold">Last 3 months</p>
            </div>
          </div>
          
          {/* Attendance rate bar */}
          <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between text-sm font-extrabold text-white/90 mb-2 uppercase tracking-wider">
              <span>Overall Rate</span>
              <span className={clsx(
                attendancePercentage >= 75 ? "text-emerald-300" : attendancePercentage >= 50 ? "text-amber-300" : "text-rose-300"
              )}>{attendancePercentage}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border border-white/20">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${attendancePercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={clsx("h-full rounded-full", attendancePercentage >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : attendancePercentage >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-rose-400 to-rose-500")} 
              />
            </div>
          </div>

          {attendance.length === 0 ? (
            <div className="py-8 text-center text-white/50 text-sm font-bold border border-dashed border-white/20 rounded-2xl">
              No attendance records found
            </div>
          ) : (
            <AttendanceHeatmap attendance={attendance} />
          )}
        </div>

        {/* Fee Summary + History */}
        <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/10 text-purple-300 rounded-2xl shadow-sm border border-white/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white drop-shadow-sm">Fee History</h3>
              <p className="text-xs text-white/60 font-bold">All payment records</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-400/30">
              <p className="text-xs font-bold text-emerald-300/70 uppercase tracking-widest mb-1">Total Paid</p>
              <p className="text-2xl font-black text-emerald-300">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-rose-500/10 rounded-2xl p-4 border border-rose-400/30">
              <p className="text-xs font-bold text-rose-300/70 uppercase tracking-widest mb-1">Total Due</p>
              <p className="text-2xl font-black text-rose-300">₹{totalDue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {sortedFees.length === 0 ? (
            <div className="flex-1 py-8 text-center text-white/50 text-sm font-bold border border-dashed border-white/20 rounded-2xl flex items-center justify-center">
              No fee records yet
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
              {sortedFees.map((fee) => (
                <div
                  key={fee.id}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                    fee.status === 'Paid'
                      ? 'bg-emerald-500/10 border-emerald-400/30'
                      : 'bg-rose-500/10 border-rose-400/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {fee.status === 'Paid' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">
                        {MONTH_NAMES[(fee.month ?? 1) - 1]} {fee.year}
                      </p>
                      {fee.paymentDate && (
                        <p className="text-xs text-white/50 font-semibold">
                          Paid on {format(parseISO(fee.paymentDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={clsx('text-sm font-black', fee.status === 'Paid' ? 'text-emerald-300' : 'text-rose-300')}>
                      ₹{fee.amount.toLocaleString('en-IN')}
                    </p>
                    <p className={clsx('text-xs font-bold', fee.status === 'Paid' ? 'text-emerald-400/70' : 'text-rose-400/70')}>
                      {fee.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-white/50">Last Payment</span>
            <span className="text-sm font-bold text-white">{lastPaymentDate}</span>
          </div>
        </div>
      </div>

      {/* WhatsApp quick contact */}
      {totalDue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-white font-bold text-sm">₹{totalDue.toLocaleString('en-IN')} pending from this student</p>
            <p className="text-white/60 text-xs font-semibold mt-0.5">Send a quick WhatsApp reminder</p>
          </div>
          <a
            href={`https://wa.me/${student.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${student.name},\n\nThis is a gentle reminder that you have a pending tuition fee of ₹${totalDue}. Please process the payment at your earliest convenience.\n\nThank you!`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-[#25D366]/30"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Send Reminder
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}
