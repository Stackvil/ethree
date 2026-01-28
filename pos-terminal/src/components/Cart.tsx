import type { Ride } from '../data/rides';
import { Trash2, Printer, ShoppingCart } from 'lucide-react';

interface CartItem extends Ride {
    quantity: number;
}

interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onClear: () => void;
    onPrint: () => void;
    paymentMode: 'cash' | 'upi' | null;
    onPaymentModeChange: (mode: 'cash' | 'upi') => void;
    mobileNumber: string;
    onMobileNumberChange: (val: string) => void;
    loyaltyPoints: number | null;
    loadingPoints: boolean;
    onAddReward: () => void;
    hasReward: boolean;
}

export function Cart({
    items,
    onUpdateQuantity,
    onClear,
    onPrint,
    paymentMode,
    onPaymentModeChange,
    mobileNumber,
    onMobileNumberChange,
    loyaltyPoints,
    loadingPoints,
    onAddReward,
    hasReward
}: CartProps) {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col h-full sticky top-24 overflow-hidden ring-1 ring-slate-900/5">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3 text-slate-800">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100/50">
                        <ShoppingCart className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-sm uppercase tracking-wide text-slate-500">Current Order</h2>
                        <div className="font-bold text-slate-900 leading-none">Ticket Summary</div>
                    </div>
                </div>
                <span className="bg-slate-900 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-slate-900/10">
                    {count}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">Your cart is empty</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="group flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative">
                                {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                                <h4 className="font-bold text-slate-900 text-sm truncate pr-2">{item.name}</h4>
                                <div className="text-slate-500 text-xs mt-1 font-medium">₹{item.price} each</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                                    <button
                                        onClick={() => onUpdateQuantity(item.id, -1)}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md text-slate-500 transition-colors"
                                    >-</button>
                                    <span className="text-xs font-bold w-6 text-center text-slate-900">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.id, 1)}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md text-slate-500 transition-colors"
                                    >+</button>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-slate-900 text-sm">₹{item.price * item.quantity}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-5 bg-white border-t border-slate-100 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
                {items.length > 0 && (
                    <div className="space-y-4 pb-4 border-b border-slate-200">
                        {/* Mobile & Loyalty */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Mobile (Optional)</label>
                            <input
                                type="tel"
                                placeholder="Enter 10-digit number"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                value={mobileNumber}
                                onChange={(e) => onMobileNumberChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            />

                            {mobileNumber.length === 10 && (
                                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg animate-in fade-in slide-in-from-top-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-indigo-900 uppercase">Points</span>
                                        {loadingPoints ? (
                                            <div className="animate-spin text-indigo-500 w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                                        ) : (
                                            <span className="text-sm font-black text-indigo-600">{loyaltyPoints !== null ? loyaltyPoints : 0}</span>
                                        )}
                                    </div>
                                    {(loyaltyPoints || 0) >= 100 && !hasReward && (
                                        <button
                                            onClick={onAddReward}
                                            className="w-full mt-1.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded shadow-sm transition-colors"
                                        >
                                            Redeem Free Ride
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onPaymentModeChange('cash')}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${paymentMode === 'cash'
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold shadow-sm'
                                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${paymentMode === 'cash' ? 'border-emerald-600' : 'border-slate-200'}`}>
                                        {paymentMode === 'cash' && <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />}
                                    </div>
                                    <span className="text-xs">CASH</span>
                                </button>
                                <button
                                    onClick={() => onPaymentModeChange('upi')}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${paymentMode === 'upi'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${paymentMode === 'upi' ? 'border-blue-600' : 'border-slate-200'}`}>
                                        {paymentMode === 'upi' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                                    </div>
                                    <span className="text-xs">UPI</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3 pb-4 border-b border-dashed border-slate-200">
                    <div className="flex justify-between text-slate-500 text-sm">
                        <span>Subtotal</span>
                        <span>₹{total}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-sm">
                        <span>Taxes</span>
                        <span className="text-emerald-500 font-medium">Included</span>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Payable</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">₹{total}</div>
                </div>

                <div className="grid grid-cols-5 gap-3 pt-2">
                    <button
                        onClick={onClear}
                        disabled={items.length === 0}
                        className="col-span-1 flex items-center justify-center p-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 disabled:opacity-50 transition-all duration-200"
                        title="Clear Cart"
                    >
                        <Trash2 size={20} />
                    </button>
                    {paymentMode && (
                        <button
                            onClick={onPrint}
                            disabled={items.length === 0}
                            className="col-span-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transition-all active:scale-[0.98] group animate-in slide-in-from-bottom-2 duration-300"
                        >
                            <Printer size={20} className="group-hover:text-amber-400 transition-colors" />
                            <span className="group-hover:text-amber-50 transition-colors uppercase tracking-tight">Print Ticket</span>
                        </button>
                    )}
                    {!paymentMode && items.length > 0 && (
                        <div className="col-span-4 bg-slate-50 text-slate-400 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 text-xs uppercase tracking-widest italic">
                            Select mode to print
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
