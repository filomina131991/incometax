import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Teacher, FinancialYear } from '../types';
import { Plus, Trash2, Edit2, Search, UserPlus, Eye, Calculator, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { calculateRetirementDate } from '../lib/retirement';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFY, setActiveFY] = useState<FinancialYear | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveFY();
    fetchTeachers();
  }, []);

  async function fetchActiveFY() {
    try {
      const q = query(collection(db, 'financialYears'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setActiveFY({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FinancialYear);
      }
    } catch (error) {
      console.error("Error fetching active FY:", error);
    }
  }

  async function fetchTeachers() {
    setLoading(true);
    try {
      const q = query(collection(db, 'teachers'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!activeFY) {
      setNotification({ message: 'No active financial year found', type: 'error' });
      return;
    }
    if (!confirm(`Are you sure you want to delete this teacher from the ${activeFY.year} financial year?`)) return;
    
    try {
      const teacher = teachers.find(t => t.id === id);
      if (!teacher) return;

      const deletedInFY = teacher.deletedInFY || [];
      if (!deletedInFY.includes(activeFY.id!)) {
        deletedInFY.push(activeFY.id!);
      }

      await updateDoc(doc(db, 'teachers', id), { deletedInFY });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'delete',
        description: `Deleted teacher ${teacher.name} from FY ${activeFY.year}`,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setNotification({ message: 'Teacher removed from current financial year', type: 'success' });
      fetchTeachers();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      setNotification({ message: 'Error deleting teacher', type: 'error' });
    }
  }

  const filteredTeachers = teachers.filter(t => {
    const isDeletedInCurrentFY = activeFY && t.deletedInFY?.includes(activeFY.id!);
    if (isDeletedInCurrentFY) return false;

    return t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           t.penNumber.includes(searchTerm);
  });

  return (
    <div className="space-y-6">
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-lg flex items-center space-x-3 animate-in fade-in slide-in-from-top-4",
          notification.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-80"><XCircle className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
        <button
          onClick={() => navigate('/teacher/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Teacher</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or PEN number..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PEN Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retirement Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{teacher.name}</div>
                    <div className="text-xs text-gray-500">{teacher.subject}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{teacher.penNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase">{teacher.designation}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {teacher.dor ? format(new Date(teacher.dor), 'dd MMM yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => navigate(`/calculate/${teacher.id}`)} className="text-green-600 hover:text-green-900" title="Calculate Tax">
                      <Calculator className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/teacher/${teacher.id}`)} className="text-blue-600 hover:text-blue-900" title="View Profile">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(teacher.id!)} className="text-red-600 hover:text-red-900" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No teachers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
