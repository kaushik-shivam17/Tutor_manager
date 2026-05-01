import { collection, doc, setDoc, deleteDoc, query, where, getDocs, onSnapshot, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Batch, Student, Attendance, Fee } from '../models/types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

// Helper to get user ID
const getUserId = () => {
  return auth.currentUser?.uid || null;
};

// Batches
export const subscribeToBatches = (callback: (batches: Batch[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  
  const q = query(collection(db, 'batches'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'batches'));
};

export const createBatch = async (data: Omit<Batch, 'id' | 'userId' | 'createdAt'>) => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  
  const newRef = doc(collection(db, 'batches'));
  try {
    await setDoc(newRef, {
      ...data,
      userId: uid,
      createdAt: new Date().toISOString()
    });
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'batches');
  }
};

export const updateBatch = async (id: string, data: Partial<Pick<Batch, 'name' | 'schedule' | 'startDate' | 'isActive'>>) => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  const ref = doc(db, 'batches', id);
  try {
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'batches');
    throw error;
  }
};

export const deleteBatch = async (id: string) => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  try {
    await deleteDoc(doc(db, 'batches', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'batches');
    throw error;
  }
};

// Students
export const subscribeToStudents = (batchId: string | null, callback: (students: Student[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  
  let q = query(collection(db, 'students'), where('userId', '==', uid));
  if (batchId) {
    q = query(collection(db, 'students'), where('userId', '==', uid), where('batchId', '==', batchId));
  }
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));
};

export const createStudent = async (data: Omit<Student, 'id' | 'userId' | 'createdAt'>) => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  
  const newRef = doc(collection(db, 'students'));
  try {
    await setDoc(newRef, {
      ...data,
      userId: uid,
      createdAt: new Date().toISOString()
    });
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
  }
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  try {
    await setDoc(doc(db, 'students', id), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
  }
};

export const deleteStudent = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'students', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
  }
};

// Attendance
export const subscribeToAttendance = (batchId: string, date: string, callback: (attendance: Attendance[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  
  const q = query(collection(db, 'attendance'), 
    where('userId', '==', uid),
    where('batchId', '==', batchId),
    where('date', '==', date)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));
};

export const subscribeToAttendanceForMonth = (batchId: string, startOfMonthStr: string, endOfMonthStr: string, callback: (attendance: Attendance[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  
  const q = query(collection(db, 'attendance'), 
    where('userId', '==', uid),
    where('batchId', '==', batchId),
    where('date', '>=', startOfMonthStr),
    where('date', '<=', endOfMonthStr)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));
};

export const markAttendance = async (studentId: string, batchId: string, date: string, status: 'Present' | 'Absent' | 'Holiday') => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  
  // Use a composite ID for easy querying/updating
  const id = `${studentId}_${date}`;
  try {
    await setDoc(doc(db, 'attendance', id), {
      studentId,
      batchId,
      date,
      status,
      userId: uid
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `attendance/${id}`);
  }
};

export const removeAttendance = async (studentId: string, date: string) => {
  const id = `${studentId}_${date}`;
  try {
    await deleteDoc(doc(db, 'attendance', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
  }
};

export const markBulkAttendance = async (students: Student[], batchId: string, date: string, status: 'Present' | 'Absent' | 'Holiday') => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  
  const batch = writeBatch(db);
  
  students.forEach(student => {
    const id = `${student.id}_${date}`;
    const ref = doc(db, 'attendance', id);
    batch.set(ref, {
      studentId: student.id,
      batchId,
      date,
      status,
      userId: uid
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'attendance');
  }
};

// Fees
export const subscribeToFees = (batchId: string | null, month: number, year: number, callback: (fees: Fee[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  
  let q = query(collection(db, 'fees'), 
    where('userId', '==', uid),
    where('month', '==', month),
    where('year', '==', year)
  );
  if (batchId) {
    q = query(collection(db, 'fees'), 
      where('userId', '==', uid),
      where('batchId', '==', batchId),
      where('month', '==', month),
      where('year', '==', year)
    );
  }
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fee)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'fees'));
};

export const autoCreateFees = async (students: Student[], month: number, year: number) => {
  const uid = getUserId();
  if (!uid) throw new Error("User not authenticated");
  
  // Fetch existing fee records to avoid overwriting them
  const existingQuery = query(collection(db, 'fees'), 
    where('userId', '==', uid),
    where('month', '==', month),
    where('year', '==', year)
  );
  
  let existingIds = new Set<string>();
  try {
    const snap = await getDocs(existingQuery);
    existingIds = new Set(snap.docs.map(d => d.data().studentId));
  } catch (error) {
    console.error("Failed to fetch existing fees before creation", error);
  }

  const batch = writeBatch(db);
  let recordsAdded = 0;
  
  students.forEach(student => {
    if (existingIds.has(student.id)) return; // Skip if fee record already exists

    const id = `${student.id}_${year}_${month}`;
    const ref = doc(db, 'fees', id);
    batch.set(ref, {
      studentId: student.id,
      batchId: student.batchId,
      month,
      year,
      amount: student.monthlyFee,
      status: 'Unpaid',
      paymentDate: null,
      userId: uid
    });
    recordsAdded++;
  });

  if (recordsAdded === 0) return; // Nothing to commit

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'fees');
  }
};

export const markFeePaid = async (feeId: string, status: 'Paid' | 'Unpaid') => {
  try {
    await setDoc(doc(db, 'fees', feeId), {
      status,
      paymentDate: status === 'Paid' ? new Date().toISOString() : null
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `fees/${feeId}`);
  }
};

// Analytics / bulk fetches
export const subscribeAllFees = (callback: (fees: Fee[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  const q = query(collection(db, 'fees'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Fee)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'fees'));
};

export const subscribeAllAttendance = (callback: (records: Attendance[]) => void) => {
  const uid = getUserId();
  if (!uid) return () => {};
  const q = query(collection(db, 'attendance'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));
};
