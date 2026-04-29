import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, DollarSign, Phone, User, Users, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase';
import { Student, Attendance, Fee, Batch } from '../models/types';
import { subscribeToStudents, subscribeToBatches } from '../services/db';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    // Subscribe to student
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
        // Fetch all attendance for this student
        const attQuery = query(collection(db, 'attendance'), 
          where('userId', '==', uid),
          where('studentId', '==', id)
        );
        let attSnapshot;
        try {
          attSnapshot = await getDocs(attQuery);
          setAttendance(attSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'attendance');
        }

        // Fetch all fees for this student
        const feeQuery = query(collection(db, 'fees'), 
          where('userId', '==', uid),
          where('studentId', '==', id)
        );
        let feeSnapshot;
        try {
          feeSnapshot = await getDocs(feeQuery);
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

  const { totalPresent, totalAbsent, totalAttendance, attendancePercentage } = useMemo(() => {
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { totalPresent: present, totalAbsent: absent, totalAttendance: total, attendancePercentage: percentage };
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

  if (!student || loading) return <div className="p-8 text-center">Loading...</div>;

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
        <div className="absolute top-0 right-0 p-32 bg-indigo-400/10 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 p-32 bg-purple-400/10 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
        
        <div className="p-6 sm:p-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 border-b border-white/40 pb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 border border-white/20 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200/50 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <User className="w-12 h-12 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">{student.name}</h2>
              <p className="text-white/80 font-bold mt-2 text-xl bg-white/10 px-4 py-1.5 rounded-xl border border-white/60 inline-flex shadow-sm">D/O, S/O: {student.fatherName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10">
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold text-white/60 uppercase tracking-widest drop-shadow-sm">Contact Information</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4 text-white bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => window.location.href = `tel:${student.mobileNumber}`}>
                  <div className="p-3 bg-white/10 rounded-xl shadow-sm border border-white/20 group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5 text-indigo-200" />
                  </div>
                  <span className="font-bold text-lg group-hover:text-indigo-200 transition-colors">{student.mobileNumber}</span>
                </div>
                <div className="flex items-center gap-4 text-white bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
                  <div className="p-3 bg-white/10 rounded-xl shadow-sm border border-white/20">
                    <CalendarCheck className="w-5 h-5 text-indigo-200" />
                  </div>
                  <span className="font-bold">Joined: {format(parseISO(student.joiningDate), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-4 text-white bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
                  <div className="p-3 bg-white/10 rounded-xl shadow-sm border border-white/20">
                    <Users className="w-5 h-5 text-indigo-200" />
                  </div>
                  <span className="font-bold">Batch: <Link to={`/batch/${student.batchId}`} className="text-indigo-200 hover:text-indigo-200 transition-colors">{batch?.name || 'Loading...'}</Link></span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-extrabold text-white/60 uppercase tracking-widest drop-shadow-sm">Financial Information</h3>
              <div className="flex items-center gap-4 text-white bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
                <div className="p-3 bg-emerald-100/80 rounded-xl shadow-sm border border-emerald-200">
                  <DollarSign className="w-5 h-5 text-emerald-200" />
                </div>
                <span className="font-bold">Monthly Fee: <span className="font-extrabold text-indigo-200 text-xl md:text-2xl ml-2">₹{student.monthlyFee}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Attendance Summary */}
        <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-24 bg-indigo-300/10 rounded-full blur-2xl -z-10 mix-blend-multiply"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white/10 text-indigo-200 rounded-2xl shadow-sm border border-white/20">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white drop-shadow-sm">Attendance Summary</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-emerald-100/50 rounded-3xl p-6 border border-emerald-200/60 shadow-sm backdrop-blur-md">
              <div className="text-sm text-emerald-200 font-extrabold uppercase tracking-wider mb-2">Total Present</div>
              <div className="text-4xl font-extrabold text-emerald-200 drop-shadow-sm">{totalPresent}</div>
            </div>
            <div className="bg-rose-100/50 rounded-3xl p-6 border border-rose-200/60 shadow-sm backdrop-blur-md">
              <div className="text-sm text-rose-200 font-extrabold uppercase tracking-wider mb-2">Total Absent</div>
              <div className="text-4xl font-extrabold text-rose-200 drop-shadow-sm">{totalAbsent}</div>
            </div>
          </div>

          <div className="bg-white/10 p-5 rounded-2xl border border-white/60 shadow-sm">
            <div className="flex justify-between text-sm font-extrabold text-white/90 mb-3 uppercase tracking-wider">
              <span>Attendance Rate</span>
              <span className={clsx(
                attendancePercentage >= 75 ? "text-emerald-200" : attendancePercentage >= 50 ? "text-amber-600" : "text-rose-200"
              )}>{attendancePercentage}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden border border-white/60 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${attendancePercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={clsx("h-full rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]", attendancePercentage >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : attendancePercentage >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-rose-400 to-rose-500")} 
              />
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-24 bg-purple-300/10 rounded-full blur-2xl -z-10 mix-blend-multiply"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white/10 text-purple-600 rounded-2xl shadow-sm border border-white/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white drop-shadow-sm">Fee Summary</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-emerald-100/50 rounded-3xl p-6 border border-emerald-200/60 shadow-sm backdrop-blur-md">
              <div className="text-sm text-emerald-200 font-extrabold uppercase tracking-wider mb-2">Total Paid</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-200 drop-shadow-sm">₹{totalPaid}</div>
            </div>
            <div className="bg-rose-100/50 rounded-3xl p-6 border border-rose-200/60 shadow-sm backdrop-blur-md">
              <div className="text-sm text-rose-200 font-extrabold uppercase tracking-wider mb-2">Total Due</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-rose-200 drop-shadow-sm">₹{totalDue}</div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/60 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-white/60 mb-1 uppercase tracking-wider">Last Payment</div>
              <div className="font-bold text-white text-lg">{lastPaymentDate}</div>
            </div>
            <div className="p-3 bg-white/10 rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-white/20">
              <DollarSign className="w-5 h-5 text-white/50" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
