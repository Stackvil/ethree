import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, RefreshCw, Receipt, Search, Trash2, AlertTriangle, BarChart3, List, Users } from 'lucide-react';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    rewardPoints: number;
    createdAt: string;
}

interface Ticket {
    _id: string;
    id: string;
    amount: number;
    date: string;
    mobile?: string;
    paymentMode?: string;
    createdBy?: string;
    createdAt: string;
    items: any[];
}

export default function AdminDashboard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserSales, setSelectedUserSales] = useState<string | null>(null);
    const [view, setView] = useState<'transactions' | 'analytics' | 'users'>('transactions');
    const navigate = useNavigate();

    useEffect(() => {
        fetchTickets();
        fetchUsers();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await axios.get(`${API_URL}/api/tickets`);
            // Show all transactions (Cash + UPI) as requested for analytics
            setTickets(response.data);
        } catch (error) {
            console.error('Failed to fetch tickets', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const downloadCSV = () => {
        if (tickets.length === 0) return;

        const headers = ['Ticket ID', 'Date', 'Amount', 'Mobile', 'Payment Mode', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...tickets.map(t => [
                t.id,
                `"${t.date}"`,
                t.amount,
                t.mobile || '',
                t.paymentMode?.toLowerCase() || 'cash',
                t.createdAt
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAnalyticsCSV = () => {
        const data = getAnalyticsData();
        const headers = ['Date', 'Total Tickets', 'Total Revenue', 'Cash Revenue', 'UPI Revenue'];
        const csvContent = [
            headers.join(','),
            ...data.map(d => [
                d.date,
                d.count,
                d.revenue,
                d.cash,
                d.upi
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `daily_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Derived Stats
    const totalRevenue = tickets.reduce((sum, t) => sum + t.amount, 0);

    // Filtered Tickets
    const filteredTickets = tickets.filter(t => {
        const idMatch = t.id ? t.id.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const mobileMatch = t.mobile ? t.mobile.includes(searchTerm) : false;
        const userMatch = selectedUserSales ? t.createdBy === selectedUserSales : true;
        return (idMatch || mobileMatch) && userMatch;
    });

    // Filtered Users
    const filteredUsers = users.filter(u => {
        const nameMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = u.email.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || emailMatch;
    });

    const getAnalyticsData = () => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });

        const aggregation = last7Days.map(date => {
            const dailyTickets = tickets.filter(t => new Date(t.createdAt).toISOString().split('T')[0] === date);
            return {
                date,
                count: dailyTickets.length,
                revenue: dailyTickets.reduce((sum, t) => sum + t.amount, 0),
                cash: dailyTickets.filter(t => !t.paymentMode || t.paymentMode.toLowerCase() === 'cash').reduce((sum, t) => sum + t.amount, 0),
                upi: dailyTickets.filter(t => t.paymentMode?.toLowerCase() === 'upi').reduce((sum, t) => sum + t.amount, 0),
            };
        });

        return aggregation;
    };

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ email: '', newPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage('');
        try {
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            await axios.post(
                `${API_URL}/api/auth/change-password`,
                passwordData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPasswordMessage('Password updated successfully!');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordMessage('');
                setPasswordData({ email: '', newPassword: '' });
            }, 1500);
        } catch (error: any) {
            setPasswordMessage(error.response?.data?.message || 'Failed to update password');
        }
    };

    // Clear All Data State
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearConfirmText, setClearConfirmText] = useState('');

    const handleClearAll = async () => {
        if (clearConfirmText !== 'DELETE ALL') return;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            await axios.delete(`${API_URL}/api/tickets/clear-all`);
            fetchTickets();
            setShowClearModal(false);
            setClearConfirmText('');
        } catch (error) {
            console.error('Failed to clear tickets', error);
            alert('Failed to clear tickets');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-20 border-b border-white/10">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                            <img
                                src="/e3logo.jpeg"
                                alt="Admin Logo"
                                className="relative w-10 h-10 rounded-lg object-contain bg-white ring-2 ring-white/10"
                            />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none text-white">ETHREE POS</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Admin Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors mr-2"
                        >
                            Change User Password
                        </button>
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-slate-200">Administrator</span>
                            <span className="text-xs text-slate-500 font-medium">System Access</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-rose-600 text-white p-2.5 rounded-xl transition-all shadow-lg border border-slate-700 hover:border-rose-500 group"
                            title="Logout"
                        >
                            <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-6 max-w-7xl">
                {/* Stats Grid */}
                {/* ... existing stats ... */}

                {/* Password Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Change User Password</h2>

                            {passwordMessage && (
                                <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${passwordMessage.includes('success') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {passwordMessage}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="user@ethree.com"
                                        value={passwordData.email}
                                        onChange={(e) => setPasswordData({ ...passwordData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Min 6 characters"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Update
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Clear Data Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={40} className="text-rose-600" />
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 text-center mb-2">Clear All Records?</h2>
                            <p className="text-slate-500 text-center mb-8 font-medium">
                                This action will <span className="text-rose-600 font-bold underline">delete all bills and tickets</span> forever. This cannot be undone.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest text-center">Type <span className="text-slate-900">DELETE ALL</span> to confirm</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-center font-black uppercase tracking-widest transition-all"
                                        placeholder="Type here..."
                                        value={clearConfirmText}
                                        onChange={(e) => setClearConfirmText(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => { setShowClearModal(false); setClearConfirmText(''); }}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
                                    >
                                        Go Back
                                    </button>
                                    <button
                                        onClick={handleClearAll}
                                        disabled={clearConfirmText !== 'DELETE ALL'}
                                        className={`flex-[1.5] py-4 font-black rounded-2xl transition-all shadow-lg border-b-4 ${clearConfirmText === 'DELETE ALL'
                                            ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-800 shadow-rose-500/40 active:border-b-0 active:translate-y-1'
                                            : 'bg-slate-100 text-slate-300 border-slate-200 grayscale cursor-not-allowed'
                                            }`}
                                    >
                                        DELETE EVERYTHING
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Switcher & Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl w-full md:w-auto">
                        <button
                            onClick={() => setView('transactions')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${view === 'transactions' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={18} />
                            <span>Transactions</span>
                        </button>
                        <button
                            onClick={() => setView('analytics')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${view === 'analytics' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart3 size={18} />
                            <span>Analytics</span>
                        </button>
                        <button
                            onClick={() => setView('users')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${view === 'users' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={18} />
                            <span>Users</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center justify-center md:justify-end w-full md:w-auto">
                        {(view === 'transactions' || view === 'users') && (
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={view === 'transactions' ? "Search ID or Mobile..." : "Search Name or Email..."}
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={fetchTickets}
                                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold transition-all shadow-sm active:scale-95"
                                title="Refresh Data"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>

                            <button
                                onClick={view === 'transactions' ? downloadCSV : downloadAnalyticsCSV}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-md active:scale-95"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">{view === 'transactions' ? 'All Transactions' : '7-Day Report'}</span>
                            </button>

                            <button
                                onClick={() => navigate('/accounts')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-md active:scale-95"
                            >
                                <Receipt size={18} />
                                <span className="hidden sm:inline">Accounts</span>
                            </button>

                            <button
                                onClick={() => setShowClearModal(true)}
                                className="p-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all group"
                                title="Clear All History"
                            >
                                <Trash2 size={18} className="group-hover:animate-pulse" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Status Badge */}
                {selectedUserSales && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                <Users size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider leading-none mb-1">Active Filter</p>
                                <p className="text-sm font-black text-slate-800">Showing sales for: <span className="text-blue-700">{selectedUserSales}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedUserSales(null)}
                            className="text-xs font-black text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 transition-all hover:scale-105 active:scale-95"
                        >
                            CLEAR FILTER
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                    {view === 'transactions' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Payment</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Issued By</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <RefreshCw size={32} className="animate-spin mb-3 text-slate-300" />
                                                    <span className="font-medium">Loading sales data...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No tickets found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTickets.map((ticket) => (
                                            <tr key={ticket._id} className="group hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                            <Receipt size={16} />
                                                        </div>
                                                        <span className="font-mono text-sm font-bold text-slate-700">{ticket.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {ticket.mobile ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                            {ticket.mobile}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${ticket.paymentMode?.toLowerCase() === 'upi'
                                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {ticket.paymentMode?.toUpperCase() || 'CASH'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                        {ticket.createdBy || 'System'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-emerald-600 font-black text-base">₹{ticket.amount.toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : view === 'analytics' ? (
                        <div className="overflow-x-auto">
                            {/* Analytics content ... */}
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Tickets Sold</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Cash Revenue</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">UPI Revenue</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Daily Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {getAnalyticsData().map((day) => (
                                        <tr key={day.date} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-700">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-black text-slate-600">{day.count}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-amber-600 font-bold">₹{day.cash.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-blue-600 font-bold">₹{day.upi.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-emerald-600 font-black text-lg">₹{day.revenue.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">User Name</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Email Address</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Role</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Points</th>
                                        <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium italic">
                                                No users found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user._id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-500 group-hover:bg-white transition-all shadow-sm">
                                                            <Users size={16} />
                                                        </div>
                                                        <span className="font-bold text-slate-900">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{user.email}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-indigo-600">{user.rewardPoints}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-slate-400 text-xs font-bold whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUserSales(user.name);
                                                                setView('transactions');
                                                                setSearchTerm(''); // Clear search to see all their sales
                                                            }}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50 transition-all"
                                                        >
                                                            <BarChart3 size={12} />
                                                            View Sales
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer Summary */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
                        <span className="font-medium">Summary for last <span className="text-slate-900 font-bold">{tickets.length}</span> tickets</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-slate-400 font-bold text-xs uppercase">Overall Total:</span>
                                <span className="font-black text-slate-900 text-lg">₹{totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
