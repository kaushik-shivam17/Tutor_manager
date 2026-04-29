import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, DollarSign, Plus, AlertCircle, Clock, BookOpen, ChevronRight, Search, Bell, CheckCircle2 } from 'lucide-react';
import { subscribeToBatches, subscribeToStudents, subscribeToFees, createBatch } from '../services/db';
import { Batch, Student, Fee } from '../models/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Dashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDate, setNewBatchDate] = useState('');
  const [newBatchSchedule, setNewBatchSchedule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubBatches = subscribeToBatches(setBatches);
    const unsubStudents = subscribeToStudents(null, setStudents);
    const now = new Date();
    const unsubFees = subscribeToFees(null, now.getMonth() + 1, now.getFullYear(), setFees);

    return () => {
      unsubBatches();
      unsubStudents();
      unsubFees();
    };
  }, []);

  const totalUnpaidFees = useMemo(() => {
    return fees
      .filter(f => f.status === 'Unpaid')
      .reduce((sum, f) => sum + f.amount, 0);
  }, [fees]);

  const unpaidStudentsList = useMemo(() => {
    const unpaidFeeRecords = fees.filter(f => f.status === 'Unpaid');
    return unpaidFeeRecords.map(fee => {
      const student = students.find(s => s.id === fee.studentId);
      const batch = batches.find(b => b.id === student?.batchId);
      return { fee, student, batch };
    }).filter(item => item.student != null);
  }, [fees, students, batches]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.mobileNumber.includes(query) ||
      s.fatherName.toLowerCase().includes(query)
    ).slice(0, 5); // Max 5 results
  }, [searchQuery, students]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName || !newBatchDate || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await createBatch({
        name: newBatchName,
        startDate: newBatchDate,
        schedule: newBatchSchedule || 'Regular Schedule'
      });
      
      setIsModalOpen(false);
      setNewBatchName('');
      setNewBatchDate('');
      setNewBatchSchedule('');
      toast.success('Batch created successfully');
    } catch (error) {
      console.error("Failed to create batch:", error);
      toast.error("Failed to create batch. Please try again.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminder = (student: Student, amount: number) => {
    const message = `Hi ${student.name},\n\nThis is a gentle reminder that your tuition fee of ₹${amount} for this month is pending. Please process the payment at your earliest convenience.\n\nThank you!`;
    const url = `https://wa.me/${student.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(`WhatsApp reminder opened for ${student.name}`);
  };

  return (
    <div className="space-y-10 relative z-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">Dashboard Overview</h1>
          <p className="text-base text-white/80 mt-2 font-medium">Welcome back, here are your smart insights today.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
          {/* Smart Search */}
          <div className="relative w-full sm:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search students by name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)] focus:ring-2 focus:ring-white focus:border-white sm:text-sm font-medium text-white placeholder-white/50 transition-all focus:bg-white/20"
            />
            {/* Search Dropdown */}
            <AnimatePresence>
              {searchQuery.trim() && searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute z-50 mt-2 w-full bg-white/20 backdrop-blur-3xl rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                >
                  <ul className="max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {searchResults.map((student) => {
                      const batch = batches.find(b => b.id === student.batchId);
                      return (
                        <li key={student.id}>
                          <button
                            onClick={() => navigate(`/student/${student.id}`)}
                            className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors flex justify-between items-center group/item"
                          >
                            <div>
                              <p className="text-sm font-bold text-white group-hover/item:text-white transition-colors">{student.name}</p>
                              <p className="text-xs font-medium text-white/70 mt-0.5">{student.mobileNumber} • {batch?.name}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/50 group-hover/item:text-white group-hover/item:translate-x-1 transition-all" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 shadow-lg shadow-indigo-200/50 text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all hover:scale-[1.02] whitespace-nowrap"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5 drop-shadow-sm" />
            Create Batch
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          className="bg-white/10 backdrop-blur-xl overflow-hidden shadow-lg border border-white/20 rounded-3xl"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-white/20 p-4 rounded-2xl shadow-inner border border-white/30 text-white">
                  <BookOpen className="h-7 w-7" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-extrabold text-white/70 truncate uppercase tracking-widest">Total Batches</dt>
                  <dd className="flex items-baseline mt-1">
                    <div className="text-4xl font-black text-white drop-shadow-sm">{batches.length}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          className="bg-white/10 backdrop-blur-xl overflow-hidden shadow-lg border border-white/20 rounded-3xl"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-white/20 p-4 rounded-2xl shadow-inner border border-white/30 text-white">
                  <Users className="h-7 w-7" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-extrabold text-white/70 truncate uppercase tracking-widest">Total Students</dt>
                  <dd className="flex items-baseline mt-1">
                    <div className="text-4xl font-black text-white drop-shadow-sm">{students.length}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          className="bg-white/10 backdrop-blur-xl overflow-hidden shadow-lg border border-white/20 rounded-3xl relative"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl flex"></div>
          <div className="p-6 relative z-10">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-white/20 p-4 rounded-2xl shadow-inner border border-white/30 text-white">
                  <DollarSign className="h-7 w-7" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-extrabold text-white/70 truncate uppercase tracking-widest flex items-center gap-2">
                    Pending Fees <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] hidden sm:inline">THIS MONTH</span>
                  </dt>
                  <dd className="flex items-baseline mt-1">
                    <div className="text-4xl font-black text-white drop-shadow-sm">₹{totalUnpaidFees}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Batches List - Takes 2 columns on lg */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">Your Batches</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {batches.map((batch, index) => {
              const batchStudents = students.filter(s => s.batchId === batch.id).length;
              const unpaidStudentIds = new Set(fees.filter(f => f.batchId === batch.id && f.status === 'Unpaid').map(f => f.studentId));
              const unpaidCount = unpaidStudentIds.size;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  key={batch.id}
                  className="h-full"
                >
                  <Link
                    to={`/batch/${batch.id}`}
                    className="group bg-white/10 backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:bg-white/20 hover:border-white/40 rounded-3xl flex flex-col h-full relative"
                  >
                    <div className="p-7 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform duration-500 shadow-inner border border-white/30 backdrop-blur-sm">
                          <BookOpen className="w-7 h-7" />
                        </div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/30 text-white group-hover:bg-white/30 group-hover:text-white shadow-sm transition-all duration-300">
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white transition-colors truncate mb-1.5">{batch.name}</h3>
                      
                      <div className="mt-auto pt-5 space-y-3">
                        <div className="flex items-center text-sm font-bold text-white/70">
                          <Clock className="flex-shrink-0 mr-3 h-4 w-4 text-white/60" />
                          <span className="truncate">{batch.schedule || 'Regular Schedule'}</span>
                        </div>
                        <div className="flex items-center text-sm font-bold text-white/70">
                          <Users className="flex-shrink-0 mr-3 h-4 w-4 text-white/60" />
                          <span>{batchStudents} Students enrolled</span>
                        </div>
                      </div>

                      {unpaidCount > 0 && (
                        <div className="mt-6 flex items-center text-sm text-white bg-rose-500/30 p-3.5 rounded-2xl border border-rose-400/50 backdrop-blur-sm shadow-inner group-hover:bg-rose-500/40 transition-colors">
                          <AlertCircle className="flex-shrink-0 mr-2.5 h-5 w-5 text-white" />
                          <span className="font-bold">{unpaidCount} student{unpaidCount > 1 ? 's' : ''} pending fees</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            
            {batches.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center py-24 bg-white/10 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-white/30 shadow-inner"
              >
                <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/30">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">No batches yet</h3>
                <p className="mt-3 text-sm font-medium text-white/70 max-w-md mx-auto leading-relaxed">Get started by creating your first batch to manage students, track attendance, and monitor fees.</p>
                <div className="mt-8">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-6 py-3 shadow-lg bg-white/20 text-base font-bold rounded-2xl text-white hover:bg-white/30 border border-white/30 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5 border border-white/20 rounded-full" />
                    Create First Batch
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Smart Insights & Action Center - Takes 1 column on lg */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-1 space-y-6 sticky top-24"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm flex items-center gap-2">
              <Bell className="w-6 h-6 text-white drop-shadow-sm" />
              Action Center
            </h2>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-lg overflow-hidden flex flex-col max-h-[600px]">
            {/* Header of Action Center */}
            <div className="p-6 border-b border-white/20 bg-white/10 flex justify-between items-center z-10 relative">
              <h3 className="font-extrabold text-white tracking-tight text-lg">Pending Fees Tracker</h3>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-black px-3 py-1 rounded-full shadow-inner">{unpaidStudentsList.length} Due</span>
            </div>
            
            {/* Action List */}
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar relative z-0">
              <div className="absolute top-0 right-0 p-32 bg-rose-300/10 rounded-full blur-3xl -z-10 mix-blend-overlay pointer-events-none"></div>
              {unpaidStudentsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5 shadow-inner border border-white/30">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-black text-xl text-white tracking-tight">All caught up!</h4>
                  <p className="text-sm font-bold text-white mt-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">No pending fees right now</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {unpaidStudentsList.map((item, idx) => (
                    <motion.li 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={item.fee.id} 
                      className="bg-white/10 backdrop-blur-md p-5 rounded-[1.25rem] border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col gap-4 hover:border-white/40 group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={`/student/${item.student?.id}`} className="font-bold text-white hover:text-white/80 transition-colors text-base line-clamp-1">
                            {item.student?.name}
                          </Link>
                          <p className="text-xs font-bold text-white/50 mt-0.5 line-clamp-1">{item.batch?.name}</p>
                        </div>
                        <div className="text-right pl-2">
                          <p className="font-black text-rose-300 text-lg bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">₹{item.fee.amount}</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleSendReminder(item.student!, item.fee.amount)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:to-[#075E54] text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] shadow-[0_4px_10px_rgba(37,211,102,0.3)] shadow-[#25D366]/30"
                      >
                        <svg className="w-4 h-4 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        Send WhatsApp Reminder
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
            {unpaidStudentsList.length > 0 && (
              <div className="p-4 bg-white/10 backdrop-blur-xl border-t border-white/20 text-center relative z-10">
                <p className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest drop-shadow-sm">
                  Smart Notifications
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Batch Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 transition-opacity bg-[#0f172a]/80 backdrop-blur-md" 
                onClick={() => setIsModalOpen(false)}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10 w-full max-w-md p-8 my-8 overflow-hidden text-left bg-white/10 backdrop-blur-2xl shadow-2xl rounded-3xl border border-white/20"
              >
                <div>
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-3xl bg-white/20 border border-white/30 shadow-inner mb-6 transform rotate-3">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-white text-center mb-8 drop-shadow-sm tracking-tight">Create New Batch</h3>
                <form onSubmit={handleCreateBatch} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-extrabold text-white/80 mb-2 uppercase tracking-wide">Batch Name *</label>
                    <input
                      type="text"
                      id="name"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      className="block w-full border-white/30 bg-white/10 text-white backdrop-blur-sm rounded-2xl shadow-inner focus:ring-2 focus:ring-white focus:border-white sm:text-base px-5 py-4 placeholder-white/40 font-bold transition-all hover:bg-white/20"
                      placeholder="e.g., Class 10 Science"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="date" className="block text-sm font-extrabold text-white/80 mb-2 uppercase tracking-wide">Start Date *</label>
                    <input
                      type="date"
                      id="date"
                      value={newBatchDate}
                      onChange={(e) => setNewBatchDate(e.target.value)}
                      className="block w-full border-white/30 bg-white/10 text-white backdrop-blur-sm rounded-2xl shadow-inner focus:ring-2 focus:ring-white focus:border-white sm:text-base px-5 py-4 font-bold cursor-pointer transition-all hover:bg-white/20"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="schedule" className="block text-sm font-extrabold text-white/80 mb-2 uppercase tracking-wide">Schedule</label>
                    <input
                      type="text"
                      id="schedule"
                      value={newBatchSchedule}
                      onChange={(e) => setNewBatchSchedule(e.target.value)}
                      className="block w-full border-white/30 bg-white/10 text-white backdrop-blur-sm rounded-2xl shadow-inner focus:ring-2 focus:ring-white focus:border-white sm:text-base px-5 py-4 placeholder-white/40 font-bold transition-all hover:bg-white/20"
                      placeholder="e.g., Mon-Wed-Fri, 5 PM - 6 PM"
                    />
                  </div>
                  <div className="mt-10 flex gap-4 sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3.5 rounded-2xl shadow-lg bg-white text-indigo-900 border-none text-sm font-bold hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Batch'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full sm:w-auto mt-3 sm:mt-0 inline-flex justify-center items-center px-8 py-3.5 border border-white/30 rounded-2xl shadow-sm text-sm font-bold text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
