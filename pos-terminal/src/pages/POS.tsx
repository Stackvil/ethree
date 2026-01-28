import { useState, useRef, useEffect } from 'react';
import { rides, type Ride } from '../data/rides';
import { RideCard } from '../components/RideCard';
import { Cart } from '../components/Cart';
import { Ticket } from '../components/Ticket';
// TicketVerifier removed
import { Ticket as TicketIcon, ScanLine, LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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

    // Fetch Loyalty Points
    useEffect(() => {
        if (mobileNumber.length === 10) {
            fetchLoyaltyPoints(mobileNumber);
        } else {
            setLoyaltyPoints(null);
        }
    }, [mobileNumber]);

    const fetchLoyaltyPoints = async (mobile: string) => {
        setLoadingPoints(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const res = await axios.get(`${API_URL}/api/loyalty/${mobile}`);
            setLoyaltyPoints(res.data.points);
        } catch (e) {
            console.error('Failed to fetch points', e);
        } finally {
            setLoadingPoints(false);
        }
    };

    const addRewardToCart = () => {
        setCart(prev => [...prev, {
            id: 'reward-1',
            name: '🎁 Free Priority Ride',
            price: 0,
            quantity: 1,
            description: 'Loyalty Reward (100 Pts)'
        }]);
    };

    const syncOfflineTickets = async () => {
        setIsSyncing(true);
        const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');

        if (pending.length === 0) {
            setIsSyncing(false);
            return;
        }

        console.log(`Attempting to sync ${pending.length} tickets...`);

        const remaining = [];
        let successCount = 0;

        for (const ticket of pending) {
            try {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/tickets`, ticket);
                successCount++;
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message;
                // If ticket already exists (E11000), consider it synced/skipped to avoid loop
                if (errorMessage.includes('E11000') || errorMessage.includes('duplicate')) {
                    console.log('Ticket already exists on server, removing from pending:', ticket.id);
                    successCount++;
                    continue; // Do not add to remaining
                }
                console.error('Sync failed for ticket:', ticket.id, errorMessage);
                remaining.push(ticket);
            }
        }

        localStorage.setItem('pending_tickets', JSON.stringify(remaining));
        setPendingCount(remaining.length);
        setIsSyncing(false);

        if (successCount > 0) {
            alert(`Synced ${successCount} offline tickets to server.`);
        }
    };

    const addToCart = (ride: Ride) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === ride.id);
            if (existing) {
                return prev.map(item =>
                    item.id === ride.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...ride, quantity: 1 }];
        });
    };

    const updateQuantitySimple = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: item.quantity + delta };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWithTax = total; // Tax removed


    const confirmPrint = async () => {
        // Generate Ticket ID
        const ticketId = `TXN-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
        const date = new Date().toLocaleString();

        // Removed unused state setters

        const ticketData = {
            id: ticketId,
            amount: totalWithTax,
            date: date,
            items: cart,
            status: 'valid',
            mobile: mobileNumber,
            paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
            createdAt: new Date().toISOString()
        };

        // Handle Combo Tickets (Generate 5 separate tickets for each Combo)
        const ticketsToSave = [ticketData];
        const subTickets: any[] = [];
        let onlyCombos = true;

        cart.forEach(item => {
            if (item.id === '21') { // Combo Ticket ID
                for (let i = 0; i < item.quantity * 5; i++) {
                    const subId = `${ticketId}-C${i + 1}`;
                    const subTicket = {
                        id: subId,
                        amount: 100, // Explicit value per ride
                        date: date,
                        items: [{ ...item, quantity: 1, name: 'ANY RIDE', price: 100 }], // Rename for coupon
                        status: 'valid',
                        mobile: mobileNumber,
                        paymentMode: (paymentMode || 'cash') as 'cash' | 'upi',
                        createdAt: new Date().toISOString(),
                        isCoupon: true,
                        parentId: ticketId
                    };
                    ticketsToSave.push(subTicket);
                    subTickets.push(subTicket);
                }
            } else {
                onlyCombos = false;
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
            skipMaster: onlyCombos && subTickets.length > 0, // Skip master if only combos
            earnedPoints: mobileNumber ? (Math.floor(totalWithTax / 100) * 10) : 0
        });

        // Save to Backend with Offline Fallback
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

            if (!isOnline) throw new Error('Offline');

            // 1. Save Tickets
            await Promise.all(ticketsToSave.map(t => axios.post(`${API_URL}/api/tickets`, t)));

            // 2. Process Loyalty (Await to ensure it finishes)
            if (mobileNumber && mobileNumber.length === 10) {
                // Earn Points
                if (totalWithTax >= 100) {
                    try {
                        const loyaltyRes = await axios.post(`${API_URL}/api/loyalty/earn`, {
                            mobile: mobileNumber,
                            amount: totalWithTax,
                            ticketId
                        });
                        console.log('Loyalty Earn Success:', loyaltyRes.data);
                        // Optional: Refresh local loyalty points state
                        if (loyaltyRes.data.points !== undefined) {
                            setLoyaltyPoints(loyaltyRes.data.points);
                        }
                    } catch (lErr) {
                        console.error('Loyalty Earn Failed:', lErr);
                    }
                }

                // Redeem Points (if reward is in cart)
                const rewardItem = cart.find(i => i.id === 'reward-1');
                if (rewardItem) {
                    // Determine how many rewards were used
                    for (let i = 0; i < rewardItem.quantity; i++) {
                        try {
                            await axios.post(`${API_URL}/api/loyalty/redeem`, {
                                mobile: mobileNumber,
                                ticketId
                            });
                        } catch (rErr) {
                            console.error('Loyalty Redeem Failed:', rErr);
                        }
                    }
                }
            }

        } catch (error) {
            console.log('Backend unavailable, queueing ticket locally.');
            const pending = JSON.parse(localStorage.getItem('pending_tickets') || '[]');
            ticketsToSave.forEach(t => pending.push(t));
            localStorage.setItem('pending_tickets', JSON.stringify(pending));
            setPendingCount(prev => prev + ticketsToSave.length);
        }

        // setShowCheckoutModal(false); // Modal removed

        // Wait for state update then print
        setTimeout(() => {
            window.print();
            // Show success message after print dialog loop
            setShowSuccessModal(true);
            setCart([]); // Clear cart here after successful print flow
            setPaymentMode(null); // Reset payment mode to null to hide print button
        }, 500);
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
            newSubTickets = printData.subTickets.map((t, index) => ({
                ...t,
                id: `${newTicketId}-C${index + 1}`,
                parentId: newTicketId,
                date: date,
                createdAt: new Date().toISOString()
            }));
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
                <header className="bg-blue-900 text-amber-400 p-4 shadow-md z-10">
                    <div className="container mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <img
                                    src="/e3logo.jpeg"
                                    alt="Ethree Logo"
                                    className="relative w-12 h-12 rounded-lg object-contain bg-white"
                                />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">ETHREE POS</h1>
                            </div>

                            {/* Offline Indicator */}
                            <div className="ml-4 flex items-center gap-2">
                                {isOnline ? (
                                    <div className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full flex items-center gap-1 border border-emerald-500/30">
                                        <Wifi size={14} />
                                        <span>Online</span>
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full flex items-center gap-1 border border-red-500/30 animate-pulse">
                                        <WifiOff size={14} />
                                        <span>Offline</span>
                                    </div>
                                )}

                                {pendingCount > 0 && (
                                    <div className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full flex items-center gap-1 border border-amber-500/30">
                                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                                        <span>{pendingCount} Pending</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/verify')}
                                className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors border border-blue-700"
                            >
                                <ScanLine size={18} />
                                <span>Verify Tickets</span>
                            </button>
                            <div className="h-8 w-px bg-slate-800 mx-1"></div>
                            <button
                                onClick={handleLogout}
                                className="group flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors px-2 py-1"
                                title="Logout"
                            >
                                <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-24 md:pb-0">
                                {rides.map(ride => (
                                    <RideCard key={ride.id} ride={ride} onAdd={addToCart} />
                                ))}
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
