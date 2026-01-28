import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Ride } from '../data/rides';
import { RideCard } from '../components/RideCard';
import { Cart } from '../components/Cart';
import { Ticket } from '../components/Ticket';
// TicketVerifier removed
import { Ticket as TicketIcon, ScanLine, LogOut, WifiOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface CartItem extends Ride {
    quantity: number;
}

export default function POS() {
    const [cart, setCart] = useState<CartItem[]>([]);
    // currentTicketId and currentTicketDate removed as they were unused state
    const [mobileNumber, setMobileNumber] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);
    const [loadingPoints, setLoadingPoints] = useState(false);
    const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | null>(null);
    const [rides, setRides] = useState<Ride[]>([]);
    const [loadingRides, setLoadingRides] = useState(true);

    const loggedUser = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

    // State to hold the ticket currently being printed/reprinted
    const [printData, setPrintData] = useState<{
        items: CartItem[];
        total: number;
        date: string;
        id: string;
        mobile: string;
        paymentMode?: string;
        subTickets?: any[];
        skipMaster?: boolean;
        earnedPoints?: number;
    } | null>(null);


    // Offline Logic State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const ticketRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fetch Rides from API
    useEffect(() => {
        const fetchRides = async () => {
            setLoadingRides(true);
            try {
                // Use relative path (/api) in production by default
                const API_URL = import.meta.env.VITE_API_URL || '';
                const response = await axios.get(`${API_URL}/api/products`);
                setRides(response.data);
            } catch (error) {
                console.error('Failed to fetch rides', error);
                // Fallback to static rides if API fails? 
                // Better to show error or empty. 
            } finally {
                setLoadingRides(false);
            }
        };
        fetchRides();
    }, []);

    // Monitor Network Status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check for pending tickets
        const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
        setPendingCount(pending.length);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-Sync when Online
    useEffect(() => {
        if (isOnline && pendingCount > 0 && !isSyncing) {
            syncOfflineTickets();
        }
    }, [isOnline, pendingCount]);

    // Fetch Loyalty Points (Debounced)
    useEffect(() => {
        if (mobileNumber.length === 10) {
            const timer = setTimeout(() => {
                fetchLoyaltyPoints(mobileNumber);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setLoyaltyPoints(null);
        }
    }, [mobileNumber]);

    const fetchLoyaltyPoints = async (mobile: string) => {
        setLoadingPoints(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const res = await axios.get(`${API_URL}/api/loyalty/${mobile}`);
            if (res.data.points !== undefined) {
                setLoyaltyPoints(res.data.points);
            }
        } catch (e) {
            console.error('Failed to fetch points', e);
        } finally {
            setLoadingPoints(false);
        }
    };

    const addRewardToCart = useCallback(() => {
        setCart(prev => [...prev, {
            id: 'reward-1',
            name: '🎁 Free Priority Ride',
            price: 0,
            quantity: 1,
            description: 'Loyalty Reward (100 Pts)'
        }]);
    }, []);

    const syncOfflineTickets = async () => {
        setIsSyncing(true);
        const stored = localStorage.getItem('pending_tickets') || '[]';
        let pending: any[];

        try {
            pending = JSON.parse(stored);
        } catch (e) {
            pending = [];
        }

        if (!Array.isArray(pending)) {
            console.error('Pending tickets is not an array, resetting.');
            localStorage.setItem('pending_tickets', '[]');
            setPendingCount(0);
            setIsSyncing(false);
            return;
        }

        if (pending.length === 0) {
            setIsSyncing(false);
            return;
        }

        console.log(`Attempting to sync ${pending.length} tickets to ${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/tickets`);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/tickets`, pending);
            localStorage.setItem('pending_tickets', '[]');
            setPendingCount(0);
            alert(`Synced ${pending.length} offline tickets to server.`);
        } catch (error: any) {
            console.error('Sync failed', error);
            if (error.response?.status === 400) {
                console.error('Bad request, data might be malformed. Clearing queue.');
                localStorage.setItem('pending_tickets', '[]');
                setPendingCount(0);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const addToCart = useCallback((ride: Ride) => {
        setCart(prev => {
            const rideId = ride._id || ride.id;
            const existing = prev.find(item => (item._id || item.id) === rideId);
            if (existing) {
                return prev.map(item =>
                    (item._id || item.id) === rideId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...ride, quantity: 1 }];
        });
    }, []);

    const updateQuantitySimple = useCallback((id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            const itemId = item._id || item.id;
            if (itemId === id) {
                return { ...item, quantity: item.quantity + delta };
            }
            return item;
        }).filter(item => item.quantity > 0));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const total = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
    const totalWithTax = total; // Tax removed


    const confirmPrint = async () => {
        // Generate Ticket ID
        const ticketId = `TXN-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
        const date = new Date().toLocaleString();

        // Removed unused state setters

        const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');

        // Handle Split Saving: Regular Items vs Combo Items
        const ticketsToSave: any[] = [];
        const subTickets: any[] = [];

        // 1. Prepare Regular Summary Ticket (for context/accounting)
        const regularTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const masterTicket = {
            id: ticketId,
            amount: regularTotal,
            date: date,
            items: cart,
            status: 'valid',
            mobile: mobileNumber,
            paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
            createdBy: loggedUser.name || 'Unknown',
            createdAt: new Date().toISOString()
        };
        ticketsToSave.push(masterTicket);

        // 2. Prepare Individual Ride Tickets
        cart.forEach(item => {
            const isCombo = ['19', '20', '21'].includes(item.id);
            if (isCombo) {
                // Special Case: Combo Ride prints 6 tickets per quantity (updated from 5)
                for (let i = 0; i < item.quantity * 6; i++) {
                    const subId = `${ticketId}-C${subTickets.length + 1}`;
                    const subTicket = {
                        id: subId,
                        amount: 100, // Fixed price per sub-ticket for combo
                        date: date,
                        items: [{ ...item, quantity: 1, name: 'ANY RIDE', price: 100 }],
                        status: 'valid',
                        mobile: mobileNumber,
                        paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
                        createdBy: loggedUser.name || 'Unknown',
                        createdAt: new Date().toISOString(),
                        isCoupon: true,
                        parentId: ticketId
                    };
                    ticketsToSave.push(subTicket);
                    subTickets.push(subTicket);
                }
            } else {
                // General Case: Every other ride prints one ticket per quantity
                for (let i = 0; i < item.quantity; i++) {
                    const subId = `${ticketId}-R${subTickets.length + 1}`;
                    const subTicket = {
                        id: subId,
                        amount: item.price,
                        date: date,
                        items: [{ ...item, quantity: 1 }], // Single ride per ticket
                        status: 'valid',
                        mobile: mobileNumber,
                        paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
                        createdBy: loggedUser.name || 'Unknown',
                        createdAt: new Date().toISOString(),
                        isCoupon: false,
                        parentId: ticketId
                    };
                    ticketsToSave.push(subTicket);
                    subTickets.push(subTicket);
                }
            }
        });

        // Save to localStorage (Legacy/Redundancy)
        const tickets = JSON.parse(localStorage.getItem('pos_tickets') || '{}');
        ticketsToSave.forEach(t => tickets[t.id] = t);
        localStorage.setItem('pos_tickets', JSON.stringify(tickets));

        // Set print data for the Ticket component
        setPrintData({
            items: [...cart],
            total: totalWithTax,
            date: date,
            id: ticketId,
            mobile: mobileNumber,
            paymentMode: paymentMode as string | undefined,
            subTickets: subTickets, // Pass sub-tickets for printing
            skipMaster: true, // Skip summary receipt, print only individual tickets
            earnedPoints: mobileNumber ? (Math.floor(totalWithTax / 100) * 10) : 0
        });

        // 3. Trigger Print Immediately (Fastest UX)
        setTimeout(() => {
            window.print();
            setShowSuccessModal(true);
            setCart([]);
            setPaymentMode(null);
        }, 100);

        // 4. Save to Backend in Background (Non-blocking)
        const saveToBackend = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                if (!isOnline) throw new Error('Offline');

                // Bulk Save Tickets
                await axios.post(`${API_URL}/api/tickets`, ticketsToSave);

                // Process Loyalty
                if (mobileNumber && mobileNumber.length === 10) {
                    if (totalWithTax >= 100) {
                        try {
                            const loyaltyRes = await axios.post(`${API_URL}/api/loyalty/earn`, {
                                mobile: mobileNumber,
                                amount: totalWithTax,
                                ticketId
                            });
                            if (loyaltyRes.data.points !== undefined) {
                                setLoyaltyPoints(loyaltyRes.data.points);
                            }
                        } catch (e) { }
                    }
                    const rewardItem = cart.find(i => i.id === 'reward-1');
                    if (rewardItem) {
                        for (let i = 0; i < rewardItem.quantity; i++) {
                            try {
                                await axios.post(`${API_URL}/api/loyalty/redeem`, { mobile: mobileNumber, ticketId });
                            } catch (e) { }
                        }
                    }
                }
            } catch (error) {
                console.log('Background save failed, queueing locally.');
                const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
                ticketsToSave.forEach(t => pending.push(t));
                localStorage.setItem('pending_tickets', JSON.stringify(pending));
                setPendingCount(prev => prev + ticketsToSave.length);
            }
        };

        saveToBackend();
    };

    const handleReprint = async () => {
        if (!printData) return;

        // Security Feature: Generate NEW Ticket ID for reprints to prevent scams/reuse
        // This forces the cashier to account for every printed slip as a new transaction in the system.
        const newTicketId = `TXN-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
        const date = new Date().toLocaleString();

        const newTicketData = {
            id: newTicketId,
            amount: printData.total, // Fix: backend expects 'amount', printData has 'total'
            date: date,
            items: printData.items,
            mobile: printData.mobile,
            paymentMode: (printData.paymentMode || 'cash') as 'cash' | 'upi',
            status: 'valid',
            createdAt: new Date().toISOString()
        };

        // Handle SubTickets regeneration if needed
        let newSubTickets: any[] = [];
        if (printData.subTickets && printData.subTickets.length > 0) {
            newSubTickets = printData.subTickets.map((t, index) => {
                const suffix = t.id.includes('-C') ? 'C' : 'R';
                return {
                    ...t,
                    id: `${newTicketId}-${suffix}${index + 1}`,
                    parentId: newTicketId,
                    date: date,
                    createdAt: new Date().toISOString()
                };
            });
        }

        const ticketsToSave = [newTicketData, ...newSubTickets];

        // Update UI State for Printing
        setPrintData({
            ...printData, // Preserve items, earnedPoints, etc.
            date: date,
            id: newTicketId,
            subTickets: newSubTickets
        });

        // Save New Transaction to Backend
        try {
            if (!isOnline) throw new Error('Offline');
            await Promise.all(ticketsToSave.map(t => axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/tickets`, t)));
        } catch (error) {
            console.log('Backend unavailable during reprint, queueing locally.');
            const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
            ticketsToSave.forEach(t => pending.push(t));
            localStorage.setItem('pending_tickets', JSON.stringify(pending));
            setPendingCount(prev => prev + ticketsToSave.length);
        }

        // Wait for state update then print
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Screen Layout */}
            <div className="print:hidden flex flex-col h-screen">
                <header className="bg-slate-900 border-b border-slate-800 text-white p-3 md:p-4 shadow-xl z-20 sticky top-0">
                    <div className="container mx-auto flex items-center justify-between">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-300 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
                                <img
                                    src="E4LOGO.jpeg"
                                    alt="E4 Logo"
                                    className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain bg-white ring-1 ring-slate-900"
                                />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">EFOUR <span className="text-amber-400">POS</span></h1>
                                <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-wide hidden sm:block">ELURU ENTERTAINMENT NETWORK</p>
                            </div>

                            {/* User Info */}
                            <div className="hidden lg:flex flex-col border-l border-slate-700 pl-4 ml-2">
                                <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest leading-none mb-1">Authenticated Email</span>
                                <span className="text-xs font-bold text-white tracking-wide">{loggedUser.email || 'staff@company.com'}</span>
                            </div>

                            {/* Status Indicators (Mobile Optimized) */}
                            <div className="ml-2 md:ml-4 flex items-center gap-2">
                                {isOnline ? (
                                    <div className="px-2 py-0.5 md:py-1 bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 border border-emerald-500/20 backdrop-blur-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="hidden md:inline">Online</span>
                                    </div>
                                ) : (
                                    <div className="px-2 py-0.5 md:py-1 bg-rose-500/10 text-rose-400 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 border border-rose-500/20 backdrop-blur-sm">
                                        <WifiOff size={10} />
                                        <span>Offline</span>
                                    </div>
                                )}

                                {pendingCount > 0 && (
                                    <div className="px-2 py-0.5 md:py-1 bg-amber-500/10 text-amber-400 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 border border-amber-500/20">
                                        <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                                        <span>{pendingCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 md:gap-4">
                            <button
                                onClick={() => navigate('/verify')}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 md:px-4 md:py-2 rounded-xl transition-all border border-slate-700 active:scale-95"
                            >
                                <ScanLine size={18} />
                                <span className="hidden md:inline font-bold text-sm">Verify</span>
                            </button>

                            <div className="h-6 md:h-8 w-px bg-slate-800 mx-0.5"></div>

                            <button
                                onClick={handleLogout}
                                className="group relative p-2 md:px-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                                title="Logout"
                            >
                                <div className="hidden sm:flex flex-col items-end mr-1 lg:hidden">
                                    <span className="text-[10px] font-bold text-white leading-none mb-0.5">{loggedUser.name?.split(' ')[0]}</span>
                                    <span className="text-[8px] font-bold text-slate-500 tracking-tighter uppercase">{loggedUser.role}</span>
                                </div>
                                <LogOut size={20} className="relative z-10" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden container mx-auto p-4 flex gap-6">
                    <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-2 pb-20 md:pb-0 custom-scrollbar">
                            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-3 text-blue-950 sticky top-0 bg-slate-100 z-10 py-2">
                                <span className="w-1.5 h-6 md:h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-sm"></span>
                                Available Rides
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 md:gap-3 pb-24 md:pb-0">
                                {loadingRides ? (
                                    <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-400">
                                        <RefreshCw size={32} className="animate-spin mb-2" />
                                        <span className="text-sm font-bold">Loading rides...</span>
                                    </div>
                                ) : rides.length === 0 ? (
                                    <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                        No rides available
                                    </div>
                                ) : (
                                    rides.map(ride => (
                                        <RideCard key={ride._id || ride.id} ride={ride} onAdd={addToCart} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Cart Sidebar */}
                    <div className="hidden md:block w-[350px] lg:w-[400px] shrink-0 border-l border-slate-200 pl-4 bg-slate-100">
                        <Cart
                            items={cart}
                            onUpdateQuantity={updateQuantitySimple}
                            onClear={clearCart}
                            onPrint={confirmPrint}
                            paymentMode={paymentMode}
                            onPaymentModeChange={setPaymentMode}
                            mobileNumber={mobileNumber}
                            onMobileNumberChange={setMobileNumber}
                            loyaltyPoints={loyaltyPoints}
                            loadingPoints={loadingPoints}
                            onAddReward={addRewardToCart}
                            hasReward={!!cart.find(i => i.id === 'reward-1')}
                        />
                    </div>
                </main>

                {/* Mobile Cart Floating Button */}
                <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
                    {cart.length > 0 && (
                        <button
                            onClick={() => setShowMobileCart(true)}
                            className="w-full bg-slate-900 text-white rounded-xl p-4 shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-400 text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                    {cart.reduce((s, i) => s + i.quantity, 0)}
                                </div>
                                <span className="font-bold text-lg">View Cart</span>
                            </div>
                            <span className="font-mono text-xl font-black text-amber-400">₹{totalWithTax}</span>
                        </button>
                    )}
                </div>

                {/* Mobile Cart Modal */}
                {showMobileCart && (
                    <div className="md:hidden fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in slide-in-from-bottom duration-200">
                        <div className="bg-white p-4 flex items-center justify-between shadow-sm border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
                            <button
                                onClick={() => setShowMobileCart(false)}
                                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-4">
                            <Cart
                                items={cart}
                                onUpdateQuantity={updateQuantitySimple}
                                onClear={clearCart}
                                onPrint={confirmPrint}
                                paymentMode={paymentMode}
                                onPaymentModeChange={setPaymentMode}
                                mobileNumber={mobileNumber}
                                onMobileNumberChange={setMobileNumber}
                                loyaltyPoints={loyaltyPoints}
                                loadingPoints={loadingPoints}
                                onAddReward={addRewardToCart}
                                hasReward={!!cart.find(i => i.id === 'reward-1')}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Print Layout - Managed by visibility rules in Ticket.tsx */}
            <div className="hidden print:block print-container" style={{ width: '3in' }}>
                <div className="p-0">
                    <Ticket
                        ref={ticketRef}
                        items={printData?.items || []}
                        total={printData?.total || 0}
                        date={printData?.date || ''}
                        ticketId={printData?.id || ''}
                        mobileNumber={printData?.mobile || ''}
                        subTickets={printData?.subTickets}
                        skipMaster={printData?.skipMaster}
                        earnedPoints={printData?.earnedPoints}
                    />
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-in fade-in zoom-in duration-300 ring-1 ring-slate-900/5">
                        <div className="mx-auto bg-emerald-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-inner">
                            <TicketIcon className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Printing Complete</h2>
                        {printData?.earnedPoints && printData.earnedPoints > 0 ? (
                            <div className="mb-8">
                                <p className="text-slate-500 text-lg leading-relaxed">Please collect your tickets.</p>
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm">
                                    <span>✨ Earned {printData.earnedPoints} Loyalty Points</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 mb-8 text-lg leading-relaxed">Please collect your tickets from the printer.</p>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={closeSuccessModal}
                                className="w-full px-4 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 text-lg active:scale-[0.98]"
                            >
                                Done
                            </button>
                            <button
                                onClick={handleReprint}
                                className="w-full px-4 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-base flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Reprint Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
