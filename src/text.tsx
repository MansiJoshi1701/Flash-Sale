import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, AlertTriangle, Zap, Server } from 'lucide-react';


// --- MOCK DATA FOR PREVIEW ---
// In real app, fetch this from an API
const INITIAL_STOCK = 15;

export default function text () {
    const [stock, setStock] = useState(INITIAL_STOCK);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'queued' | 'error'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);

  // Simulate "Live" stock dropping (Flash Sale effect)
  useEffect(() => {
    const interval = setInterval(() => {
      setStock((prev) => (prev > 5 ? prev - 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleBuyNow = async () => {
    if (stock <= 0) return;
    
    setIsOrdering(true);
    setOrderStatus('idle');

    // --- REAL BACKEND CONNECTION ---
    // Uncomment this in your local setup:
    /*
    try {
      const response = await fetch('http://localhost:3000/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: 'user-123', 
            productId: 'iphone-15', 
            quantity: 1 
        })
      });
      const data = await response.json();
      setOrderId(data.orderId);
      setOrderStatus('queued');
    } catch (err) {
      setOrderStatus('error');
    }
    */

    // --- MOCK LOGIC FOR PREVIEW ---
    setTimeout(() => {
        setOrderId(`ord-${Math.floor(Math.random() * 10000)}`);
        setOrderStatus('queued');
        setIsOrdering(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex items-center justify-center p-4">
      <div className="mx-auto max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header Image */}
        <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center relative">
          <Zap className="w-24 h-24 text-white opacity-20 absolute animate-pulse" />
          <div className="text-center z-10">
            <h1 className="text-4xl font-black tracking-tighter uppercase drop-shadow-lg">
              Flash Sale
            </h1>
            <p className="text-indigo-100 text-sm font-medium tracking-wide">
              ENDS IN 10:00 MINUTES
            </p>
          </div>
        </div>

        {/* Product Details */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">iPhone 15 Pro Max</h2>
              <p className="text-slate-400 text-sm">Titanium Blue • 256GB</p>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-bold text-green-400">$1,199</span>
              <span className="text-slate-500 text-xs line-through">$1,499</span>
            </div>
          </div>

          {/* Stock Meter */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300 flex items-center gap-2">
                <Server size={14} /> Inventory
              </span>
              <span className={`${stock < 10 ? 'text-red-400 font-bold' : 'text-green-400'}`}>
                {stock} units left
              </span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${stock < 10 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${(stock / 20) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 italic">
              🔥 14 people are viewing this right now
            </p>
          </div>

          {/* Action Area */}
          <button
            onClick={handleBuyNow}
            disabled={isOrdering || stock === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
              ${stock === 0 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : isOrdering 
                  ? 'bg-indigo-600/50 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-500/20'
              }`}
          >
            {isOrdering ? (
              <span className="animate-pulse">Processing...</span>
            ) : stock === 0 ? (
              "SOLD OUT"
            ) : (
              <>
                <ShoppingBag size={20} /> Buy Now
              </>
            )}
          </button>

          {/* Status Messages */}
          {orderStatus === 'queued' && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex gap-3 items-start animate-fade-in">
              <CheckCircle className="text-green-400 shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-green-400">Request Queued!</h4>
                <p className="text-xs text-green-200/80 mt-1">
                  Your order ID is <span className="font-mono bg-green-900/50 px-1 rounded">{orderId}</span>. 
                  Check your dashboard for confirmation.
                </p>
              </div>
            </div>
          )}

          {orderStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex gap-3 items-start">
              <AlertTriangle className="text-red-400 shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-red-400">Connection Failed</h4>
                <p className="text-xs text-red-200/80 mt-1">
                  Could not reach the server. Make sure the backend is running.
                </p>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="bg-slate-900/50 p-4 text-center border-t border-slate-700">
           <p className="text-xs text-slate-500">
             ScaleOrder Demo • Powered by AWS SQS & Lambda
           </p>
        </div>
      </div>
    </div>
  );
}