export interface Batch {
  id: string;
  name: string;
  startDate: string;
  schedule: string;
  userId: string;
  createdAt: string;
  isActive?: boolean;
}

export interface Student {
  id: string;
  name: string;
  fatherName: string;
  mobileNumber: string;
  joiningDate: string;
  monthlyFee: number;
  batchId: string;
  userId: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  batchId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Holiday';
  userId: string;
}

export interface Fee {
  id: string;
  studentId: string;
  batchId: string;
  month: number;
  year: number;
  amount: number;
  status: 'Paid' | 'Unpaid';
  paymentDate?: string | null;
  userId: string;
}
