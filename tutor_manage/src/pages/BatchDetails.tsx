import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, CalendarCheck, DollarSign, Phone, Edit, Trash2, ArrowRightLeft, Search, Filter, ChevronLeft, FileText, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  subscribeToBatches, 
  subscribeToStudents, 
  subscribeToAttendanceForMonth, 
  subscribeToFees,
  createStudent,
  updateStudent,
  deleteStudent,
  markAttendance,
  markBulkAttendance,
  removeAttendance,
  autoCreateFees,
  markFeePaid
} from '../services/db';
import { Batch, Student, Attendance, Fee } from '../models/types';
import CalendarView from '../components/CalendarView';

export default function BatchDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'fees'>('students');
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  
  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  
  // Fees state
  const [feeMonth, setFeeMonth] = useState(new Date().getMonth() + 1);
  const [feeYear, setFeeYear] = useState(new Date().getFullYear());
  const [feeRecords, setFeeRecords] = useState<Fee[]>([]);
  const [feeFilter, setFeeFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');

  // Student filter state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFeeFilter, setStudentFeeFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    name: '', fatherName: '', mobileNumber: '', joiningDate: format(new Date(), 'yyyy-MM-dd'), monthlyFee: '' as string | number
  });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);
  const [targetBatchId, setTargetBatchId] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const unsubBatches = subscribeToBatches((batches) => {
      setAllBatches(batches);
      const current = batches.find(b => b.id === id);
      if (current) setBatch(current);
    });
    
    const unsubStudents = subscribeToStudents(id, setStudents);
    
    return () => {
      unsubBatches();
      unsubStudents();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const start = format(startOfMonth(parseISO(attendanceDate)), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(attendanceDate)), 'yyyy-MM-dd');
    const unsubAttendance = subscribeToAttendanceForMonth(id, start, end, setAttendanceRecords);
    return () => unsubAttendance();
  }, [id, attendanceDate]);

  useEffect(() => {
    if (!id) return;
    const unsubFees = subscribeToFees(id, feeMonth, feeYear, setFeeRecords);
    return () => unsubFees();
  }, [id, feeMonth, feeYear]);

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          ...studentForm,
          monthlyFee: Number(studentForm.monthlyFee) || 0
        });
        toast.success('Student updated successfully');
      } else {
        await createStudent({
          ...studentForm,
          monthlyFee: Number(studentForm.monthlyFee) || 0,
          batchId: batch!.id
        });
        toast.success('Student added successfully');
      }
      setIsStudentModalOpen(false);
      setEditingStudent(null);
      setStudentForm({ name: '', fatherName: '', mobileNumber: '', joiningDate: new Date().toISOString().split('T')[0], monthlyFee: '' });
    } catch (error: any) {
      console.error("Failed to save student:", error);
      let errMsg = "Failed to save student. Please try again.";
      if (error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) errMsg = `Database Error: ${parsed.error}`;
        } catch(e) {
          errMsg = error.message;
        }
      }
      toast.error(errMsg);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      fatherName: student.fatherName,
      mobileNumber: student.mobileNumber,
      joiningDate: student.joiningDate,
      monthlyFee: student.monthlyFee
    });
    setIsStudentModalOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (studentToDelete) {
      await deleteStudent(studentToDelete);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    }
  };

  const confirmDeleteStudent = (studentId: string) => {
    setStudentToDelete(studentId);
    setIsDeleteModalOpen(true);
  };

  const handleTransferStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStudent || !targetBatchId) return;
    await updateStudent(transferStudent.id, { batchId: targetBatchId });
    setIsTransferModalOpen(false);
    setTransferStudent(null);
  };

  const handleMarkAttendance = async (studentId: string, status: 'Present' | 'Absent' | 'Holiday' | null) => {
    if (status === null) {
      await removeAttendance(studentId, attendanceDate);
    } else {
      await markAttendance(studentId, batch.id, attendanceDate, status);
    }
  };

  const handleGridCellClick = async (studentId: string, dateStr: string, currentStatus: string | undefined) => {
    let nextStatus: 'Present' | 'Absent' | 'Holiday' | null = 'Present';
    if (currentStatus === 'Present') nextStatus = 'Absent';
    else if (currentStatus === 'Absent') nextStatus = 'Holiday';
    else if (currentStatus === 'Holiday') nextStatus = null;
    
    if (nextStatus === null) {
      await removeAttendance(studentId, dateStr);
    } else {
      await markAttendance(studentId, batch.id, dateStr, nextStatus);
    }
  };

  const handleMarkAllPresent = async () => {
    await markBulkAttendance(students, batch.id, attendanceDate, 'Present');
  };

  const handleMarkUnmarkedAbsent = async () => {
    const unmarkedStudents = students.filter(student => !attendanceRecords.some(r => r.studentId === student.id && r.date === attendanceDate));
    if (unmarkedStudents.length > 0) {
      await markBulkAttendance(unmarkedStudents, batch.id, attendanceDate, 'Absent');
    }
  };

  const handleMarkDayAsHoliday = async () => {
    await markBulkAttendance(students, batch.id, attendanceDate, 'Holiday');
  };

  const handleGenerateFees = async () => {
    await autoCreateFees(students, feeMonth, feeYear);
  };

  const filteredFees = useMemo(() => {
    return feeRecords.filter(fee => {
      if (feeFilter === 'All') return true;
      return fee.status === feeFilter;
    });
  }, [feeRecords, feeFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (studentFeeFilter === 'All') return true;

      const studentFee = feeRecords.find(f => f.studentId === student.id);
      const isPaid = studentFee?.status === 'Paid';

      if (studentFeeFilter === 'Paid') return isPaid;
      if (studentFeeFilter === 'Unpaid') return !isPaid;

      return true;
    });
  }, [students, studentSearch, studentFeeFilter, feeRecords]);

  // Compute attendance stats for selected date
  const selectedDateRecords = attendanceRecords.filter(r => r.date === attendanceDate);
  const presentCount = selectedDateRecords.filter(r => r.status === 'Present').length;
  const absentCount = selectedDateRecords.filter(r => r.status === 'Absent').length;
  const holidayCount = selectedDateRecords.filter(r => r.status === 'Holiday').length;
  const unmarkedCount = students.length - (presentCount + absentCount + holidayCount);

  // Compute days in the month for Register Grid
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(parseISO(attendanceDate));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [attendanceDate]);

  if (!batch) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6 relative z-10">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 -ml-2 text-white/60 hover:text-indigo-200 hover:bg-white/10 rounded-xl transition-all shadow-sm border border-transparent hover:border-white/60">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-sm">{batch.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm font-medium text-white/80">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/60 shadow-sm">
                <CalendarCheck className="w-4 h-4 text-indigo-200" />
                Started {format(parseISO(batch.startDate), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/60 shadow-sm">
                <Users className="w-4 h-4 text-emerald-200" />
                {students.length} Students
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 rounded-3xl overflow-hidden">
        <div className="border-b border-white/40 bg-white/30 backdrop-blur-md">
          <nav className="flex relative">
            {(['students', 'attendance', 'fees'] as const).map((tab) => {
              const Icon = tab === 'students' ? Users : tab === 'attendance' ? CalendarCheck : DollarSign;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'w-1/3 py-4 px-1 text-center font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 relative z-10',
                    activeTab === tab ? 'text-indigo-200 bg-white/10 shadow-[inset_0_-2px_0_rgba(79,70,229,1)]' : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className={clsx("w-4 h-4 transition-transform", activeTab === tab ? 'text-indigo-200 scale-110' : 'text-white/50')} /> 
                  <span className="hidden sm:inline capitalize tracking-wide">{tab}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 sm:p-8 bg-white/20 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
              <motion.div 
                key="students-tab"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-white drop-shadow-sm">Students List</h2>
                <button
                  onClick={() => {
                    try {
                      setEditingStudent(null);
                      setStudentForm({ 
                        name: '', 
                        fatherName: '', 
                        mobileNumber: '', 
                        joiningDate: new Date().toISOString().split('T')[0], 
                        monthlyFee: '' 
                      });
                      setIsStudentModalOpen(true);
                    } catch (error) {
                      console.error("Error opening modal:", error);
                    }
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 whitespace-nowrap shadow-lg shadow-indigo-200/50 transition-all hover:scale-[1.02]"
                >
                  Add Student
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
                  <input
                    type="text"
                    placeholder="Search students by name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/60 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-[0_4px_15px_rgba(0,0,0,0.03)] font-medium text-white placeholder-slate-400"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-indigo-200" />
                  </div>
                  <select
                    value={studentFeeFilter}
                    onChange={(e) => setStudentFeeFilter(e.target.value as any)}
                    className="pl-11 pr-10 py-3 bg-white/10 backdrop-blur-md border border-white/60 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none shadow-[0_4px_15px_rgba(0,0,0,0.03)] font-bold text-white/90"
                  >
                    <option value="All">All Fee Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/10 backdrop-blur-md">
                <table className="min-w-full divide-y divide-white/40">
                  <thead className="bg-white/10 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Fee</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white/60 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-white/10 transition-colors group">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <Link to={`/student/${student.id}`} className="text-indigo-200 hover:text-indigo-200 font-bold text-base flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs text-indigo-200 border border-white/20 shadow-sm">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            {student.name}
                          </Link>
                          <div className="text-sm font-medium text-white/60 mt-1 pl-10">D/O, S/O: {student.fatherName}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm text-white font-bold">{student.mobileNumber}</div>
                          <a href={`tel:${student.mobileNumber}`} className="text-xs text-indigo-200 hover:text-indigo-200 font-semibold flex items-center mt-1 transition-colors">
                            <Phone className="w-3.5 h-3.5 mr-1" /> Call
                          </a>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-white/90 font-bold">
                          <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 shadow-sm">
                            ₹{student.monthlyFee}/mo
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button onClick={() => openEditStudent(student)} className="p-2 bg-white/10 border border-white/20 text-white/60 hover:text-indigo-200 hover:bg-white/10 rounded-xl shadow-sm transition-all" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setTransferStudent(student); setIsTransferModalOpen(true); }} 
                            className="p-2 bg-white/10 border border-white/20 text-white/60 hover:text-amber-600 hover:bg-amber-50 rounded-xl shadow-sm transition-all" title="Transfer Batch"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => confirmDeleteStudent(student.id)} className="p-2 bg-white/10 border border-white/20 text-white/60 hover:text-rose-200 hover:bg-rose-50 rounded-xl shadow-sm transition-all" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-white/60">
                            <div className="w-20 h-20 bg-white/10 border border-white/20 shadow-sm rounded-full flex items-center justify-center mb-5">
                              <Users className="w-10 h-10 text-indigo-200" />
                            </div>
                            <p className="text-lg font-bold text-white">No students found</p>
                            <p className="text-sm mt-1.5 font-medium max-w-sm mx-auto text-white/80 border-2 border-white/20">Try adjusting your search or filters, or add a new student to this batch.</p>
                            <button
                              onClick={() => {
                                setEditingStudent(null);
                                setStudentForm({ name: '', fatherName: '', mobileNumber: '', joiningDate: new Date().toISOString().split('T')[0], monthlyFee: '' });
                                setIsStudentModalOpen(true);
                              }}
                              className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200/50 transition-all hover:scale-[1.02]"
                            >
                              Add Student
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <motion.div 
                key="attendance-tab"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
              {/* Daily Overview & Actions Header */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/50 rounded-3xl p-5 sm:p-7 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                
                {/* Date & Quick Stats */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full xl:w-auto">
                  <div className="flex items-center gap-3">
                    <input 
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="cursor-pointer text-white font-bold px-4 py-2.5 bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors backdrop-blur-sm"
                    />
                  </div>
                  
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100/50 text-emerald-200 rounded-xl text-sm border border-emerald-200/60 font-semibold shadow-sm backdrop-blur-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Present: {presentCount}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-rose-100/50 text-rose-200 rounded-xl text-sm border border-rose-200/60 font-semibold shadow-sm backdrop-blur-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span> Absent: {absentCount}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-100/50 text-amber-800 rounded-xl text-sm border border-amber-200/60 font-semibold shadow-sm backdrop-blur-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span> Unmarked: {unmarkedCount}
                    </div>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0 border-white/40">
                  <button
                    onClick={handleMarkAllPresent}
                    className="w-full sm:w-auto whitespace-nowrap bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all hover:scale-[1.02]"
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={handleMarkDayAsHoliday}
                    className="w-full sm:w-auto whitespace-nowrap bg-amber-100/80 text-amber-800 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-200 min-w-max shadow-sm transition-all hover:scale-[1.02] border border-amber-300/50 backdrop-blur-sm"
                  >
                    Mark as Holiday
                  </button>
                  {unmarkedCount > 0 && (
                    <button
                      onClick={handleMarkUnmarkedAbsent}
                      className="w-full sm:w-auto whitespace-nowrap bg-rose-100/80 text-rose-200 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-200 shadow-sm transition-all hover:scale-[1.02] border border-rose-300/50 backdrop-blur-sm"
                    >
                      Mark Rest Absent
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance List Area (Month Register Grid) */}
              {students.length === 0 ? (
                <div className="text-center py-20 bg-white/10 backdrop-blur-xl rounded-3xl border border-dashed border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mx-auto w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-5 shadow-sm border border-white/20">
                    <Users className="h-10 w-10 text-indigo-200" />
                  </div>
                  <h3 className="text-xl font-bold text-white">No students in this batch</h3>
                  <p className="mt-2 text-sm font-medium text-white/80 max-w-sm mx-auto">Add students to this batch to start tracking their attendance.</p>
                  <button
                    onClick={() => {
                      setEditingStudent(null);
                      setStudentForm({ name: '', fatherName: '', mobileNumber: '', joiningDate: new Date().toISOString().split('T')[0], monthlyFee: '' });
                      setIsStudentModalOpen(true);
                    }}
                    className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200/50 transition-all hover:scale-[1.02]"
                  >
                    Add Student
                  </button>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 overflow-x-auto relative mt-6 custom-scrollbar">
                  <table className="w-full text-sm text-left min-w-max border-collapse">
                    <thead className="bg-white/10 border-b border-white/20 backdrop-blur-md">
                      <tr>
                        <th className="sticky left-0 z-20 bg-white/10 px-5 py-4 font-bold text-white border-r border-white/40 whitespace-nowrap shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                          Student Name
                        </th>
                        {daysInMonth.map(day => {
                          const isSun = isSunday(day);
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isSelected = dateStr === attendanceDate;
                          return (
                            <th 
                              key={day.toISOString()}
                              onClick={() => setAttendanceDate(dateStr)}
                              className={clsx(
                                "px-2 py-3 text-center cursor-pointer select-none transition-all duration-300 border-r border-white/30 min-w-[50px]",
                                isSun ? "bg-rose-100/60 hover:bg-rose-200/60 text-rose-200" : "hover:bg-white/10 text-white/90",
                                isSelected && "bg-indigo-100/80 border-b-[3px] border-b-indigo-500 shadow-[inset_0_-4px_10px_-4px_rgba(79,70,229,0.2)]"
                              )}
                            >
                              <div className={clsx("text-[10px] font-bold uppercase tracking-wider", isSun ? "text-rose-200 font-extrabold" : "text-white/60")}>
                                {format(day, 'EEEEE')}
                              </div>
                              <div className={clsx("font-extrabold mt-1 text-base", isSun ? "text-rose-200" : "text-white")}>
                                {format(day, 'd')}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/40">
                      {students.map((student, idx) => {
                        const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
                        const totalPresent = studentRecords.filter(r => r.status === 'Present').length;
                        const totalAbsent = studentRecords.filter(r => r.status === 'Absent').length;
                        const totalMarked = totalPresent + totalAbsent;
                        const attendancePercentage = totalMarked === 0 ? 0 : Math.round((totalPresent / totalMarked) * 100);

                        return (
                        <tr key={student.id} className="hover:bg-white/10 group transition-colors">
                          <td className={clsx(
                            "sticky left-0 z-10 px-5 py-3 font-semibold text-white border-r border-white/40 truncate max-w-[200px] sm:max-w-[250px] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.03)] backdrop-blur-xl transition-colors",
                            idx % 2 === 0 ? "bg-white/10" : "bg-white/10",
                            "group-hover:bg-white/95"
                          )}>
                            <div className="flex flex-col">
                              <span className="group-hover:text-indigo-200 transition-colors truncate">{student.name}</span>
                              {totalMarked > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                                    <div 
                                      className={clsx("h-full rounded-full transition-all duration-500", attendancePercentage >= 75 ? "bg-emerald-500" : attendancePercentage >= 50 ? "bg-amber-500" : "bg-rose-500")}
                                      style={{ width: `${attendancePercentage}%` }}
                                    />
                                  </div>
                                  <span className={clsx("text-[10px] font-extrabold", attendancePercentage >= 75 ? "text-emerald-200" : attendancePercentage >= 50 ? "text-amber-600" : "text-rose-200")}>
                                    {attendancePercentage}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          {daysInMonth.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const record = attendanceRecords.find(r => r.studentId === student.id && r.date === dateStr);
                            const isSun = isSunday(day);
                            const isSelected = dateStr === attendanceDate;
                            
                            return (
                              <td 
                                key={dateStr} 
                                onClick={() => handleGridCellClick(student.id, dateStr, record?.status)}
                                className={clsx(
                                  "px-2 py-2 text-center border-r border-white/30 font-extrabold text-lg select-none cursor-pointer transition-all duration-200 transform",
                                  isSelected ? "bg-indigo-50/50" : isSun && !record ? "bg-rose-50/50" : "hover:bg-white/10 hover:scale-110",
                                  "active:scale-95"
                                )}
                              >
                                {record?.status === 'Present' && <span className="text-emerald-200 drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]">P</span>}
                                {record?.status === 'Absent' && <span className="text-rose-200 drop-shadow-[0_2px_4px_rgba(225,29,72,0.3)]">A</span>}
                                {record?.status === 'Holiday' && <span className="text-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]">H</span>}
                                {!record && isSun && <span className="text-rose-300">S</span>}
                                {!record && !isSun && <span className="text-white/50">·</span>}
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

            {/* FEES TAB */}
            {activeTab === 'fees' && (
              <motion.div 
                key="fees-tab"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/10 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select
                      value={feeMonth}
                      onChange={(e) => setFeeMonth(Number(e.target.value))}
                      className="appearance-none bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-sm py-3 pl-5 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold text-white transition-colors cursor-pointer"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{format(new Date(2000, i, 1), 'MMMM')}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-200">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  <input
                    type="number"
                    value={feeYear}
                    onChange={(e) => setFeeYear(Number(e.target.value))}
                    className="w-28 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-sm py-3 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold text-white transition-colors"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Filter className="h-5 w-5 text-indigo-200" />
                    </div>
                    <select
                      value={feeFilter}
                      onChange={(e) => setFeeFilter(e.target.value as any)}
                      className="w-full appearance-none bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-sm py-3 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold text-white transition-colors cursor-pointer"
                    >
                      <option value="All">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-200">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateFees}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200/50 transition-all hover:scale-[1.02] w-full sm:w-auto whitespace-nowrap"
                  >
                    Generate Records
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/10 backdrop-blur-md">
                <table className="min-w-full divide-y divide-white/40">
                  <thead className="bg-white/10 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider">Payment Date</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white/60 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40">
                    {filteredFees.map((fee) => {
                      const student = students.find(s => s.id === fee.studentId);
                      return (
                        <tr key={fee.id} className={clsx(
                          "transition-colors hover:bg-white/10 group",
                          fee.status === 'Unpaid' ? 'bg-rose-50/40 backdrop-blur-sm' : ''
                        )}>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="font-bold text-white text-base">{student?.name || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-white/90 font-bold">
                            <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 shadow-sm">
                              ₹{fee.amount}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={clsx(
                              'px-3.5 py-1.5 inline-flex text-xs font-bold rounded-xl shadow-sm backdrop-blur-sm border',
                              fee.status === 'Paid' ? 'bg-emerald-100/80 text-emerald-200 border-emerald-200' : 'bg-rose-100/80 text-rose-200 border-rose-200'
                            )}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-white/80 font-bold">
                            {fee.paymentDate ? (
                              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/60">
                                {format(parseISO(fee.paymentDate), 'MMM d, yyyy')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                            {fee.status === 'Unpaid' ? (
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => {
                                    if(student) {
                                      const message = `Hi ${student.name},\n\nThis is a gentle reminder that your tuition fee of ₹${fee.amount} for ${format(new Date(feeYear, feeMonth-1, 1), 'MMMM yyyy')} is pending. Please process the payment at your earliest convenience.\n\nThank you!`;
                                      const url = `https://wa.me/${student.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                                      window.open(url, '_blank');
                                    }
                                  }}
                                  className="text-[#128C7E] font-bold hover:text-[#075E54] transition-all bg-[#25D366]/10 hover:bg-[#25D366]/20 px-3 py-2 rounded-xl border border-[#25D366]/30 shadow-sm flex items-center justify-center border-b-2 active:border-b active:translate-y-[1px]"
                                  title="Send WhatsApp Reminder"
                                >
                                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </button>
                                <button
                                  onClick={() => markFeePaid(fee.id, 'Paid')}
                                  className="text-emerald-200 font-bold hover:text-emerald-200 transition-all bg-emerald-100/80 hover:bg-emerald-200 px-4 py-2 rounded-xl shadow-sm border border-emerald-200 border-b-2 active:border-b active:translate-y-[1px]"
                                >
                                  Mark Paid
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => markFeePaid(fee.id, 'Unpaid')}
                                className="text-white/80 font-bold hover:text-white transition-all bg-white/10 hover:bg-white/10 px-4 py-2 rounded-xl shadow-sm border border-white/20 border-b-2 active:border-b active:translate-y-[1px]"
                              >
                                Mark Unpaid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredFees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-white/60">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-5 border border-white/20 shadow-sm">
                              <FileText className="w-10 h-10 text-indigo-200" />
                            </div>
                            <p className="text-lg font-bold text-white">No fee records found</p>
                            <p className="text-sm mt-1.5 font-medium max-w-sm mx-auto text-white/80">Click "Generate Records" to create them for this month.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Student Modal */}
      <AnimatePresence>
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 transition-opacity bg-white/10 backdrop-blur-sm" 
              onClick={() => setIsStudentModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 w-full max-w-2xl p-8 my-8 overflow-hidden text-left bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20"
            >
              <h3 className="text-2xl font-bold leading-6 text-white mb-8 drop-shadow-sm">{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
              <form onSubmit={handleSaveStudent} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-white/90 mb-2">Full Name</label>
                    <input type="text" required maxLength={90} value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-white font-medium" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/90 mb-2">Father's Name</label>
                    <input type="text" required maxLength={90} value={studentForm.fatherName} onChange={e => setStudentForm({...studentForm, fatherName: e.target.value})} className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-white font-medium" placeholder="e.g. Robert Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/90 mb-2">Mobile Number</label>
                    <input type="tel" required maxLength={15} value={studentForm.mobileNumber} onChange={e => setStudentForm({...studentForm, mobileNumber: e.target.value})} className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-white font-medium" placeholder="e.g. +1 234 567 8900" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/90 mb-2">Joining Date</label>
                    <input type="date" required value={studentForm.joiningDate} onChange={e => setStudentForm({...studentForm, joiningDate: e.target.value})} className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-white font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white/90 mb-2">Monthly Fee (₹)</label>
                    <input type="number" required min="0" value={studentForm.monthlyFee} onChange={e => {
                      setStudentForm({...studentForm, monthlyFee: e.target.value});
                    }} className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-white font-medium" placeholder="0" />
                  </div>
                </div>
                <div className="mt-10 flex gap-4 sm:flex-row-reverse">
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 rounded-2xl shadow-lg shadow-indigo-200/50 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Saving...' : 'Save Student'}
                  </button>
                  <button type="button" disabled={isSubmitting} onClick={() => setIsStudentModalOpen(false)} className="w-full sm:w-auto mt-3 sm:mt-0 inline-flex justify-center items-center px-8 py-3 border border-white/20/60 rounded-2xl shadow-sm text-sm font-bold text-white/90 bg-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 transition-opacity bg-white/10 backdrop-blur-sm" 
              onClick={() => setIsTransferModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 w-full max-w-md p-8 my-8 overflow-hidden text-left bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-amber-100/80 text-amber-600 rounded-2xl border border-amber-200 shadow-sm">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold leading-6 text-white drop-shadow-sm">Transfer Student</h3>
              </div>
              <p className="text-base text-white/80 mb-8 font-medium">Move <span className="font-bold text-white">{transferStudent?.name}</span> to another batch.</p>
              <form onSubmit={handleTransferStudent} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-white/90 mb-2">Target Batch</label>
                  <div className="relative">
                    <select required value={targetBatchId} onChange={e => setTargetBatchId(e.target.value)} className="block w-full px-4 py-3 text-white/80 font-medium bg-white/10 border border-white/20 rounded-2xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors appearance-none pr-10 cursor-pointer">
                      <option value="" className="text-gray-900">Select a batch...</option>
                      {allBatches.filter(b => b.id !== batch.id).map(b => (
                        <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/60">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-4 sm:flex-row-reverse">
                  <button type="submit" className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 rounded-2xl shadow-lg shadow-amber-200/50 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all hover:scale-[1.02]">
                    Transfer Student
                  </button>
                  <button type="button" onClick={() => setIsTransferModalOpen(false)} className="w-full sm:w-auto mt-3 sm:mt-0 inline-flex justify-center items-center px-8 py-3 border border-white/20/60 rounded-2xl shadow-sm text-sm font-bold text-white/90 bg-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 transition-opacity bg-white/10 backdrop-blur-sm" 
              onClick={() => { setIsDeleteModalOpen(false); setStudentToDelete(null); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 w-full max-w-md p-8 my-8 overflow-hidden text-left bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-rose-100/80 text-rose-200 rounded-2xl border border-rose-200 shadow-sm">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold leading-6 text-white drop-shadow-sm">Delete Student</h3>
              </div>
              <p className="text-base text-white/80 mb-8 font-medium">Are you sure you want to delete this student? All associated attendance and fee records will also be permanently removed. This action cannot be undone.</p>
              <div className="mt-10 flex gap-4 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteStudent}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 rounded-2xl shadow-lg shadow-rose-200/50 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all hover:scale-[1.02]"
                >
                  Delete Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setStudentToDelete(null);
                  }}
                  className="w-full sm:w-auto mt-3 sm:mt-0 inline-flex justify-center items-center px-8 py-3 border border-white/20/60 rounded-2xl shadow-sm text-sm font-bold text-white/90 bg-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      </AnimatePresence>

    </div>
  );
}
