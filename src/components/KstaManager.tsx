import React, { useState, useEffect } from 'react';
import { dbService } from '../api';
import {
  Check, X, Users, Download, IndianRupee, BookOpen,
  AlertCircle, Save, UserPlus, Search, Trash2,
  ChevronRight, Info, User, CreditCard, Calendar,
  ShieldCheck, ArrowLeft, Star, Heart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { KstaMember, Teacher } from '../types';

export default function KstaManager() {
  const [fys, setFys] = useState<any[]>([]);
  const [selectedFyId, setSelectedFyId] = useState<string>('');
  const [members, setMembers] = useState<KstaMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<KstaMember | null>(null);
  const [listModal, setListModal] = useState<{ title: string; list: any[]; type: 'diary' | 'fund' | 'newspaper' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [prevMemberCount, setPrevMemberCount] = useState<number>(0);

  // States for Editing in Modal
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailForm, setDetailForm] = useState<Partial<KstaMember>>({});

  // Selection states for Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'pen'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [importSearch, setImportSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const fyData = await dbService.getFinancialYears();
      const activeFy = fyData.find((f: any) => f.isActive) || fyData[0];
      setFys(fyData);

      if (activeFy) {
        setSelectedFyId(activeFy.id);
        await loadMembers(activeFy.id);

        // Load previous FY members for comparison
        const sortedFys = [...fyData].sort((a, b) => b.year.localeCompare(a.year));
        const currentIndex = sortedFys.findIndex(f => f.id === activeFy.id);
        if (currentIndex < sortedFys.length - 1) {
          const prevFy = sortedFys[currentIndex + 1];
          const prevData = await dbService.getKstaMembers(prevFy.id);
          setPrevMemberCount(prevData.length);
        } else {
          setPrevMemberCount(0);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (fyId: string) => {
    try {
      setLoading(true);
      const data = await dbService.getKstaMembers(fyId);
      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fyId = e.target.value;
    setSelectedFyId(fyId);
    if (fyId) {
      await loadMembers(fyId);

      // Update previous count
      const sortedFys = [...fys].sort((a, b) => b.year.localeCompare(a.year));
      const currentIndex = sortedFys.findIndex(f => f.id === fyId);
      if (currentIndex < sortedFys.length - 1) {
        const prevFy = sortedFys[currentIndex + 1];
        const prevData = await dbService.getKstaMembers(prevFy.id);
        setPrevMemberCount(prevData.length);
      } else {
        setPrevMemberCount(0);
      }
    } else {
      setMembers([]);
      setPrevMemberCount(0);
    }
  };

  const openImportModal = async () => {
    if (!selectedFyId) return;
    try {
      setLoading(true);
      const data = await dbService.getTeachers();
      const currentMemberIds = members.map(m => m.teacherId?.id).filter(Boolean);
      const available = data.filter((t: any) => !currentMemberIds.includes(t.id));
      setAllTeachers(available);
      setSelectedTeacherIds([]);
      setShowImportModal(true);
    } catch (err) {
      console.error('Error fetching teachers for import:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFyId || selectedTeacherIds.length === 0) return;
    try {
      setImporting(true);
      await dbService.importKstaMembers(selectedFyId, selectedTeacherIds);
      await loadMembers(selectedFyId);
      setShowImportModal(false);
    } catch (err) {
      console.error('Error importing:', err);
      alert('Error importing teachers.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!id) {
      console.error('Missing ID for deletion');
      alert('Cannot delete: Missing member ID');
      return;
    }

    setDeleteConfirm({ id, name });
  };

  const confirmDeleteMember = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;

    try {
      setLoading(true);
      await dbService.deleteKstaMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      if (selectedMember?.id === id) setSelectedMember(null);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('Failed to remove member: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberDetail = async () => {
    if (!selectedMember || !selectedMember.id) return;
    try {
      setLoading(true);
      const updated = await dbService.updateKstaMember(selectedMember.id, detailForm);
      setMembers(members.map(m => m.id === selectedMember.id ? updated : m));
      setSelectedMember(updated);
      setDetailEditMode(false);
    } catch (err) {
      console.error('Error updating member:', err);
      alert('Failed to update details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const activeFyName = fys.find(f => f.id === selectedFyId)?.year || '';

  // Stats
  const totalMembershipFee = members.reduce((acc, m) => acc + (Number(m.membershipFee) || 0), 0);
  const totalYearlyFee = members.reduce((acc, m) => acc + (Number(m.yearlyFee) || 0), 0);
  const newspaperSubscribers = members.filter(m => m.isNewspaperSubscriber).length;
  const specialFundCount = members.filter(m => m.specialFundPaid).length;
  const totalSpecialFundAmount = members.reduce((acc, m) => acc + (Number(m.specialFundAmount) || 0), 0);
  const diaryCount = members.filter(m => m.diaryIssued).length;

  const maleCount = members.filter(m => m.teacherId?.gender === 'Male').length;
  const femaleCount = members.filter(m => m.teacherId?.gender === 'Female').length;

  const growth = members.length - prevMemberCount;
  const growthPercent = prevMemberCount > 0 ? (growth / prevMemberCount) * 100 : 0;

  // Filtered and Sorted Members
  const filteredMembers = members
    .filter(m => {
      const searchMatch = !searchTerm || 
        m.teacherId?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.teacherId?.penNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const genderMatch = !genderFilter || m.teacherId?.gender === genderFilter;
      const designationMatch = !designationFilter || m.teacherId?.designation === designationFilter;
      return searchMatch && genderMatch && designationMatch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.teacherId?.name || '').localeCompare(b.teacherId?.name || '');
      } else {
        comparison = (a.teacherId?.penNumber || '').localeCompare(b.teacherId?.penNumber || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const designations = ['LPST', 'UPST', 'HST', 'VHSE', 'Clerk', 'Office Assistant'];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-800 px-8 py-10 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-20 -mb-20 blur-2xl"></div>

          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                <Users className="h-10 w-10 text-blue-100" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                  KSTA Membership
                  <span className="hidden md:inline px-3 py-1 bg-blue-500/30 backdrop-blur-sm rounded-full text-xs font-bold border border-white/20 uppercase tracking-widest text-blue-100">
                    Pro Management
                  </span>
                </h1>
                <p className="text-blue-100/80 font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Session {activeFyName || '...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <select
                value={selectedFyId}
                onChange={handleFyChange}
                className="bg-white/10 border-white/20 text-white placeholder-blue-200 outline-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-white/20 focus:bg-white/20 transition-all backdrop-blur-md cursor-pointer appearance-none min-w-[180px]"
              >
                <option value="" className="text-gray-900">Choose Academic Year</option>
                {fys.map(fy => (
                  <option key={fy.id} value={fy.id} className="text-gray-900">{fy.year}</option>
                ))}
              </select>

              <button
                onClick={openImportModal}
                disabled={loading || !selectedFyId}
                className="bg-white text-indigo-700 hover:bg-blue-50 active:scale-95 transition-all px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-black/10 flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                IMPORT
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {/* Growth / Total Card */}
            <div className={cn(
              "group relative rounded-3xl p-6 border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white",
              growth >= 0 ? "border-green-100 ring-1 ring-green-50" : "border-red-100 ring-1 ring-red-50"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Total Members</h3>
                  <div className="text-5xl font-black text-gray-900">{members.length}</div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1",
                  growth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-1000", growth >= 0 ? "bg-green-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, Math.max(10, (members.length / (prevMemberCount || 1)) * 50))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>Last Year: {prevMemberCount}</span>
                  <span className={growth >= 0 ? "text-green-600" : "text-red-600"}>
                    {growth >= 0 ? `+${growthPercent.toFixed(1)}%` : `${growthPercent.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Gender Stats Card */}
            <div className="group relative rounded-3xl p-6 border border-blue-100 bg-blue-50/30 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-blue-600">
                <Users className="h-24 w-24" />
              </div>
              <div className="relative z-10">
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Gender Distribution</h3>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-black text-blue-900">{members.length}</div>
                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Total Members</div>
                </div>
              </div>
              <div className="flex justify-around items-end gap-4 h-20 pt-2">
                <div className="flex flex-col items-center flex-1">
                  <div className="text-blue-700 font-black text-base mb-1">{maleCount}</div>
                  <div className="w-full bg-blue-200 rounded-t-lg transition-all duration-1000" style={{ height: `${(maleCount / Math.max(1, members.length)) * 100}%` }}></div>
                  <div className="text-[9px] font-black text-blue-400 mt-2">MALE</div>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="text-rose-700 font-black text-base mb-1">{femaleCount}</div>
                  <div className="w-full bg-rose-200 rounded-t-lg transition-all duration-1000" style={{ height: `${(femaleCount / Math.max(1, members.length)) * 100}%` }}></div>
                  <div className="text-[9px] font-black text-rose-400 mt-2">FEMALE</div>
                </div>
              </div>
            </div>

            {/* Newspaper Subscribers Card */}
            <div
              onClick={() => setListModal({ title: 'Newspaper Subscribers', list: members, type: 'newspaper' })}
              className="group relative rounded-3xl p-6 border border-amber-100 bg-amber-50 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-amber-600">
                <BookOpen className="h-20 w-20" />
              </div>
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Subscribers</h3>
              <div className="text-3xl font-black text-amber-700">{newspaperSubscribers}</div>
              <p className="text-[10px] font-bold text-amber-500/80 mt-2">அத்தியாபக லோகம் News Paper</p>
              <div className="text-[10px] font-semibold text-gray-400 mt-4 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                {members.length - newspaperSubscribers} Remaining
              </div>
            </div>

            {/* Special Fund Card */}
            <div
              onClick={() => setListModal({ title: 'Special Fund Registry', list: members, type: 'fund' })}
              className="group relative rounded-3xl p-6 border border-rose-100 bg-rose-50 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-600">
                <Heart className="h-20 w-20" />
              </div>
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Special Fund</h3>
              <div className="text-3xl font-black text-rose-700">₹{totalSpecialFundAmount.toLocaleString()}</div>
              <p className="text-[10px] font-bold text-rose-500/80 mt-2">{specialFundCount} Members Paid</p>
              <div className="text-[10px] font-semibold text-gray-400 mt-4 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                {members.length - specialFundCount} Pending
              </div>
            </div>

            {/* Diaries Card */}
            <div
              onClick={() => setListModal({ title: 'Diaries Issued', list: members, type: 'diary' })}
              className="group relative rounded-3xl p-6 border border-emerald-100 bg-emerald-50 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-600">
                <Star className="h-20 w-20" />
              </div>
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">Diaries Issued</h3>
              <div className="text-3xl font-black text-emerald-700">{diaryCount}</div>
              <p className="text-[10px] font-bold text-emerald-500/80 mt-2">Annual Professional Diary</p>
              <div className="text-[10px] font-semibold text-gray-400 mt-4 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {members.length - diaryCount} Remaining
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-center ring-1 ring-black/[0.02]">
            <div className="flex-1 w-full relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by name or PEN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-bold transition-all"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-xs font-black text-gray-600 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
              >
                <option value="">All Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-xs font-black text-gray-600 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
              >
                <option value="">All Designations</option>
                {designations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-xs font-black text-gray-600 hover:bg-white transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Users className="h-3.5 w-3.5" />
                Sort: {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>

          {/* Members Table Section */}
          <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-black/[0.02]">
            <div className="overflow-x-auto">
              {loading && members.length === 0 ? (
                <div className="p-16 flex flex-col justify-center items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-b-blue-600"></div>
                  </div>
                  <p className="text-gray-400 font-bold animate-pulse">Syncing Database...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="p-20 text-center bg-gray-50/30">
                  <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <Users className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Initialize KSTA Registry</h3>
                  <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                    Start by importing teachers into the KSTA registry for the {activeFyName} financial year.
                  </p>
                  <button onClick={openImportModal} className="mt-8 bg-gray-900 text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-black transition-all">
                    Import Now
                  </button>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Member Info</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gender</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Newspaper</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Diary</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Special Fund</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => { setSelectedMember(member); setDetailEditMode(false); setDetailForm(member); }}
                        className="group hover:bg-blue-50/40 transition-all cursor-pointer"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                              <User className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                            </div>
                            <div>
                              <div className="font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight text-sm">{member.teacherId?.name}</div>
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 group-hover:text-blue-400 transition-colors">
                                <CreditCard className="h-3 w-3" />
                                {member.teacherId?.penNumber}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                            member.teacherId?.gender === 'Male' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {member.teacherId?.gender}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                            member.isNewspaperSubscriber ? "bg-amber-100 text-amber-700 ring-4 ring-amber-50" : "bg-gray-100 text-gray-400"
                          )}>
                            {member.isNewspaperSubscriber ? <BookOpen className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {member.isNewspaperSubscriber ? 'Subscribed' : 'No'}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                            member.diaryIssued ? "bg-green-100 text-green-700 ring-4 ring-green-50" : "bg-gray-100 text-gray-400"
                          )}>
                            {member.diaryIssued ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {member.diaryIssued ? 'Issued' : 'N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center text-sm font-medium">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                            member.specialFundPaid ? "bg-rose-100 text-rose-700 ring-4 ring-rose-50" : "bg-gray-100 text-gray-400"
                          )}>
                            {member.specialFundPaid ? <Heart className="h-3 w-3 fill-current" /> : <X className="h-3 w-3" />}
                            {member.specialFundPaid ? `₹${member.specialFundAmount || 0}` : 'Unpaid'}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (member.id) {
                                handleDeleteMember(member.id, member.teacherId?.name);
                              }
                            }}
                            className="p-3 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                            title="Remove Member"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Member Detail Modal - STUNNING DESIGN */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[95vh] animate-in zoom-in-95 duration-300">
            {/* Sidebar / Profile Card */}
            <div className="md:w-1/3 bg-gradient-to-br from-blue-700 to-indigo-900 p-10 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Users className="h-32 w-32" />
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="mb-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all inline-block"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="relative mb-8 text-center md:text-left">
                <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mx-auto md:mx-0 shadow-lg mb-6">
                  <User className="h-12 w-12 text-blue-100" />
                </div>
                <h2 className="text-3xl font-black mb-1">{selectedMember.teacherId?.name}</h2>
                <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-blue-200 border border-white/10 mb-6">
                  PEN: {selectedMember.teacherId?.penNumber}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-medium text-blue-100/70">
                    <CreditCard className="h-4 w-4" />
                    {selectedMember.teacherId?.designation}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-blue-100/70">
                    <Search className="h-4 w-4" />
                    {selectedMember.teacherId?.subject || 'N/A'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-blue-100/70">
                    <CreditCard className="h-4 w-4" />
                    {selectedMember.teacherId?.mobile || 'No Mobile'}
                  </div>
                </div>
              </div>

              <div className="mt-auto px-6 py-4 bg-black/20 rounded-3xl backdrop-blur-sm border border-white/5">
                <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">Member Since</div>
                <div className="text-sm font-black">{selectedMember.createdAt ? new Date(selectedMember.createdAt).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-10 bg-gray-50/50">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Membership Registry
                  {selectedMember.specialFundPaid && <Star className="h-5 w-5 text-amber-400 fill-current" />}
                </h3>
                <button
                  onClick={() => setDetailEditMode(!detailEditMode)}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                    detailEditMode ? "bg-rose-600 text-white shadow-rose-200" : "bg-gray-900 text-white shadow-black/10"
                  )}
                >
                  {detailEditMode ? 'Cancel Edit' : 'Modify Record'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar">
                {/* Fees Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 text-emerald-100 group-hover:text-emerald-200 transition-colors">
                      <IndianRupee className="h-10 w-10" />
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Membership Fee</div>
                    {detailEditMode ? (
                      <input
                        type="number"
                        value={detailForm.membershipFee}
                        onChange={(e) => setDetailForm({ ...detailForm, membershipFee: Number(e.target.value) })}
                        className="text-3xl font-black w-full border-b-2 border-emerald-500 focus:outline-none bg-emerald-50/50 p-2 rounded-t-lg"
                      />
                    ) : (
                      <div className="text-3xl font-black text-gray-900">₹{selectedMember.membershipFee}</div>
                    )}
                    <p className="text-[10px] font-bold text-gray-400 mt-2">Initial registration charge</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 text-blue-100 group-hover:text-blue-200 transition-colors">
                      <CreditCard className="h-10 w-10" />
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Yearly Subscription</div>
                    {detailEditMode ? (
                      <input
                        type="number"
                        value={detailForm.yearlyFee}
                        onChange={(e) => setDetailForm({ ...detailForm, yearlyFee: Number(e.target.value) })}
                        className="text-3xl font-black w-full border-b-2 border-blue-500 focus:outline-none bg-blue-50/50 p-2 rounded-t-lg"
                      />
                    ) : (
                      <div className="text-3xl font-black text-gray-900">₹{selectedMember.yearlyFee}</div>
                    )}
                    <p className="text-[10px] font-bold text-gray-400 mt-2">Annual membership dues</p>
                  </div>
                </div>

                {/* Newspaper Subscription Toggle */}
                <div
                  onClick={() => detailEditMode && setDetailForm({ ...detailForm, isNewspaperSubscriber: !detailForm.isNewspaperSubscriber })}
                  className={cn(
                    "flex items-center justify-between p-5 rounded-3xl border transition-all",
                    detailEditMode ? "cursor-pointer" : "pointer-events-none",
                    (detailEditMode ? detailForm.isNewspaperSubscriber : selectedMember.isNewspaperSubscriber)
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-gray-100 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      (detailEditMode ? detailForm.isNewspaperSubscriber : selectedMember.isNewspaperSubscriber) ? "bg-amber-600 text-white shadow-lg shadow-amber-200" : "bg-gray-100 text-gray-400"
                    )}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900 text-sm">அத்தியாபக லோகம் News Paper</div>
                      <div className="text-[10px] font-bold text-amber-500">Official Newspaper Subscription</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                    (detailEditMode ? detailForm.isNewspaperSubscriber : selectedMember.isNewspaperSubscriber) ? "bg-amber-600 border-amber-600 text-white" : "border-gray-200"
                  )}>
                    {(detailEditMode ? detailForm.isNewspaperSubscriber : selectedMember.isNewspaperSubscriber) && <Check className="h-5 w-5" />}
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Entitlements & Funds</h4>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Diary */}
                    <div
                      onClick={() => detailEditMode && setDetailForm({ ...detailForm, diaryIssued: !detailForm.diaryIssued })}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-3xl border transition-all",
                        detailEditMode ? "cursor-pointer" : "pointer-events-none",
                        (detailEditMode ? detailForm.diaryIssued : selectedMember.diaryIssued)
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-white border-gray-100 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          (detailEditMode ? detailForm.diaryIssued : selectedMember.diaryIssued) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-gray-100 text-gray-400"
                        )}>
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-black text-gray-900 text-sm">Official KSTA Diary</div>
                          <div className="text-[10px] font-bold text-indigo-500">Annual issue distributed to members</div>
                        </div>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                        (detailEditMode ? detailForm.diaryIssued : selectedMember.diaryIssued) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200"
                      )}>
                        {(detailEditMode ? detailForm.diaryIssued : selectedMember.diaryIssued) && <Check className="h-5 w-5" />}
                      </div>
                    </div>

                    {/* Special Fund */}
                    <div
                      className={cn(
                        "flex flex-col p-5 rounded-3xl border transition-all",
                        (detailEditMode ? detailForm.specialFundPaid : selectedMember.specialFundPaid)
                          ? "bg-rose-50 border-rose-200"
                          : "bg-white border-gray-100 opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            (detailEditMode ? detailForm.specialFundPaid : selectedMember.specialFundPaid) ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "bg-gray-100 text-gray-400"
                          )}>
                            <Heart className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-black text-gray-900 text-sm">Special Welfare Fund</div>
                            <div className="text-[10px] font-bold text-rose-500">Additional voluntary contribution</div>
                          </div>
                        </div>
                        <div
                          onClick={() => detailEditMode && setDetailForm({ ...detailForm, specialFundPaid: !detailForm.specialFundPaid })}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                            detailEditMode ? "cursor-pointer" : "pointer-events-none",
                            (detailEditMode ? detailForm.specialFundPaid : selectedMember.specialFundPaid) ? "bg-rose-600 border-rose-600 text-white" : "border-gray-200"
                          )}
                        >
                          {(detailEditMode ? detailForm.specialFundPaid : selectedMember.specialFundPaid) && <Check className="h-5 w-5" />}
                        </div>
                      </div>

                      {(detailEditMode ? detailForm.specialFundPaid : selectedMember.specialFundPaid) && (
                        <div className="pt-4 border-t border-rose-200 mt-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-2">Fund Name & Amount</label>
                          <div className="flex gap-3">
                            {detailEditMode ? (
                              <>
                                <input
                                  type="text"
                                  placeholder="Fund Name"
                                  value={detailForm.specialFundName || ''}
                                  onChange={(e) => setDetailForm({ ...detailForm, specialFundName: e.target.value })}
                                  className="flex-[2] bg-white border border-rose-200 rounded-2xl px-4 py-3 text-sm font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                                />
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={detailForm.specialFundAmount || ''}
                                  onChange={(e) => setDetailForm({ ...detailForm, specialFundAmount: Number(e.target.value) })}
                                  className="flex-1 bg-white border border-rose-200 rounded-2xl px-4 py-3 text-sm font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                                />
                              </>
                            ) : (
                              <div className="w-full bg-rose-100 text-rose-900 px-4 py-3 rounded-2xl text-sm font-black shadow-inner flex justify-between">
                                <span>{selectedMember.specialFundName || 'General Welfare Fund'}</span>
                                <span>₹{selectedMember.specialFundAmount || 0}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 border border-blue-50">
                    <Info className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-black text-blue-900 mb-1">Professional Registry Data</div>
                    <p className="text-xs text-blue-600 font-medium leading-relaxed">
                      Bank details, payroll info, and service history are synced from the master Teacher Profile.
                    </p>
                  </div>
                </div>
              </div>

              {detailEditMode && (
                <div className="mt-auto pt-8 flex gap-4">
                  <button
                    onClick={handleUpdateMemberDetail}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedMember.id) {
                        const id = selectedMember.id;
                        const name = selectedMember.teacherId?.name;
                        handleDeleteMember(id, name);
                      }
                    }}
                    className="px-6 py-4 rounded-3xl text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-10 py-10 bg-gradient-to-br from-gray-900 to-black text-white relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-2 flex items-center gap-4">
                  <UserPlus className="h-8 w-8 text-blue-500" />
                  Add New Members
                </h2>
                <p className="text-gray-400 font-medium">{activeFyName} KSTA Registry Initialization</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="absolute top-8 right-8 text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                disabled={importing}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 border-b border-gray-100 bg-gray-50/80">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by candidate name or PEN number..."
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm text-sm font-bold transition-all"
                />
              </div>
              <div className="mt-6 flex justify-between items-center px-4">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Selected: <span className="text-blue-600">{selectedTeacherIds.length} Candidates</span>
                </span>
                <button
                  onClick={() => {
                    const filtered = allTeachers.filter(t => t.name.toLowerCase().includes(importSearch.toLowerCase()) || t.penNumber.includes(importSearch));
                    const filteredIds = filtered.map(t => t.id!);
                    if (selectedTeacherIds.length === filteredIds.length) {
                      setSelectedTeacherIds([]);
                    } else {
                      setSelectedTeacherIds(filteredIds);
                    }
                  }}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full"
                >
                  {selectedTeacherIds.length === allTeachers.filter(t => t.name.toLowerCase().includes(importSearch.toLowerCase()) || t.penNumber.includes(importSearch)).length ? 'Deselect All' : 'Select All Match'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white space-y-3 custom-scrollbar">
              {allTeachers
                .filter(t => t.name.toLowerCase().includes(importSearch.toLowerCase()) || t.penNumber.includes(importSearch))
                .map(teacher => (
                  <label
                    key={teacher.id}
                    className={cn(
                      "flex items-center p-5 rounded-[28px] border-2 transition-all cursor-pointer group",
                      selectedTeacherIds.includes(teacher.id!)
                        ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-100/50"
                        : "border-gray-50 hover:border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      hidden
                      checked={selectedTeacherIds.includes(teacher.id!)}
                      onChange={() => toggleTeacherSelection(teacher.id!)}
                    />
                    <div className={cn(
                      "w-12 h-12 rounded-2xl border-2 mr-5 flex items-center justify-center transition-all",
                      selectedTeacherIds.includes(teacher.id!)
                        ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg"
                        : "bg-white border-gray-200 group-hover:border-blue-300"
                    )}>
                      {selectedTeacherIds.includes(teacher.id!) ? <Check className="h-6 w-6 stroke-[3]" /> : <User className="h-5 w-5 text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-gray-900 group-hover:text-blue-800 transition-colors uppercase tracking-tight">{teacher.name}</div>
                      <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                        <span className="bg-gray-100 group-hover:bg-blue-100 px-2 py-0.5 rounded transition-colors uppercase">{teacher.designation}</span>
                        <span>PEN: {teacher.penNumber}</span>
                      </div>
                    </div>
                  </label>
                ))}

              {allTeachers.length === 0 && !loading && (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                    <Users className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="font-black text-gray-900">Registry Complete</p>
                  <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">All valid teachers are already members.</p>
                </div>
              )}
            </div>

            <div className="px-10 py-8 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-8 py-4 rounded-3xl text-sm font-black text-gray-400 hover:text-gray-900 transition-all uppercase tracking-widest"
                disabled={importing}
              >
                Close
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selectedTeacherIds.length === 0}
                className="flex-[2] bg-indigo-600 text-white px-10 py-4 rounded-3xl text-sm font-black hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none"
              >
                {importing ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    REGISTER {selectedTeacherIds.length} MEMBERS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Remove Member?</h3>
            <p className="text-gray-500 text-center text-sm mb-1">Are you sure you want to remove</p>
            <p className="text-rose-600 font-bold text-center mb-6 uppercase tracking-tight">{deleteConfirm.name}</p>

            <div className="bg-amber-50 rounded-2xl p-4 mb-8 border border-amber-100">
              <p className="text-[11px] font-bold text-amber-700 text-center leading-relaxed">
                இந்த உறுப்பினரை நீக்க விரும்புகிறீர்களா? <br />
                Action cannot be undone for this year.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-3 rounded-2xl text-xs font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                disabled={loading}
                className="flex-1 bg-rose-600 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? 'Wait...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed List Modal */}
      {listModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-3">
                  {listModal.type === 'fund' && <Heart className="h-6 w-6 text-rose-500" />}
                  {listModal.type === 'diary' && <Star className="h-6 w-6 text-emerald-500" />}
                  {listModal.type === 'newspaper' && <BookOpen className="h-6 w-6 text-amber-500" />}
                  {listModal.title}
                </h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Registry Details for {activeFyName}</p>
              </div>
              <button onClick={() => setListModal(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-x divide-gray-100">
              {/* Left Column: Negative/Not Done */}
              <div className="flex-1 flex flex-col bg-gray-50/30">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-l-4 border-gray-200 pl-3">Remaining Guests / Pending</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black">
                    {listModal.list.filter(m =>
                      listModal.type === 'fund' ? !m.specialFundPaid :
                        listModal.type === 'diary' ? !m.diaryIssued :
                          !m.isNewspaperSubscriber
                    ).length} Members
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {listModal.list.filter(m =>
                    listModal.type === 'fund' ? !m.specialFundPaid :
                      listModal.type === 'diary' ? !m.diaryIssued :
                        !m.isNewspaperSubscriber
                  ).map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center gap-4 group hover:border-gray-200 transition-all">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 font-bold text-xs ring-1 ring-gray-100">
                        {m.teacherId?.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-black">{m.teacherId?.name}</div>
                        <div className="text-[10px] font-bold text-gray-400">PEN: {m.teacherId?.penNumber}</div>
                      </div>
                      <div className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-200">
                        <X className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Positive/Done */}
              <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur flex justify-between items-center">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest border-l-4 pl-3",
                    listModal.type === 'fund' ? "border-rose-500 text-rose-500" :
                      listModal.type === 'diary' ? "border-emerald-500 text-emerald-500" :
                        "border-amber-500 text-amber-500"
                  )}>
                    Completed Registry / Received
                  </span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black shadow-sm",
                    listModal.type === 'fund' ? "bg-rose-100 text-rose-600" :
                      listModal.type === 'diary' ? "bg-emerald-100 text-emerald-600" :
                        "bg-amber-100 text-amber-600"
                  )}>
                    {listModal.list.filter(m =>
                      listModal.type === 'fund' ? m.specialFundPaid :
                        listModal.type === 'diary' ? m.diaryIssued :
                          m.isNewspaperSubscriber
                    ).length} Members
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/10">
                  {listModal.list.filter(m =>
                    listModal.type === 'fund' ? m.specialFundPaid :
                      listModal.type === 'diary' ? m.diaryIssued :
                        m.isNewspaperSubscriber
                  ).map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-gray-900/10 transition-all">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg",
                        listModal.type === 'fund' ? "bg-rose-500 shadow-rose-100" :
                          listModal.type === 'diary' ? "bg-emerald-500 shadow-emerald-100" :
                            "bg-amber-500 shadow-amber-100"
                      )}>
                        {m.teacherId?.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black text-gray-900 uppercase tracking-tight">{m.teacherId?.name}</div>
                        <div className="text-[10px] font-bold text-gray-400">{m.teacherId?.designation}</div>
                      </div>
                      {listModal.type === 'fund' && (
                        <div className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                          ₹{m.specialFundAmount || 0}
                        </div>
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center text-white",
                        listModal.type === 'fund' ? "bg-rose-500 border-rose-500" :
                          listModal.type === 'diary' ? "bg-emerald-500 border-emerald-500" :
                            "bg-amber-500 border-amber-500"
                      )}>
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Totals for Fund */}
                {listModal.type === 'fund' && (
                  <div className="p-8 bg-rose-50 border-t border-rose-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Fund Collection</span>
                      <span className="text-2xl font-black text-rose-600">₹{totalSpecialFundAmount.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-rose-200 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(specialFundCount / members.length) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {listModal.type === 'diary' && (
                  <div className="p-8 bg-emerald-50 border-t border-emerald-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Diary Distribution Progress</span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-emerald-600">{Math.round((diaryCount / members.length) * 100)}%</span>
                      <div className="w-32 h-2 bg-emerald-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(diaryCount / members.length) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-10 py-6 border-t border-gray-100 flex justify-end">
              <button onClick={() => setListModal(null)} className="bg-gray-900 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-200 uppercase tracking-widest">
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
