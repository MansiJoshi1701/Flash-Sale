import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, CheckCircle, XCircle, Zap, Loader2, CreditCard, Lock, RotateCcw, WifiOff } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';
const PRODUCT_ID = 'iphone-15';
const TOTAL_INVENTORY = 20;

type ViewState = 'product' | 'polling' | 'payment' | 'success' | 'failed';

export default function App() {
  const [view, setView] = useState<ViewState>('product');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
 
  // REAL-TIME STOCK STATE
  const [stock, setStock] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
 
  const orderPollInterval = useRef<NodeJS.Timeout | null>(null);
  const stockPollInterval = useRef<NodeJS.Timeout | null>(null);

  // --- MOCK LOGIC (Fallback when localhost is offline) ---
  const mockStock = useRef(15);
 
  useEffect(() => {
    // If simulating, slowly drain mock stock to make it look alive
    if (isSimulating) {
        const interval = setInterval(() => {
            if (mockStock.current > 2) {
                mockStock.current -= 1;
                setStock(mockStock.current);
            }
        }, 5000);
        return () => clearInterval(interval);
    }
  }, [isSimulating]);
  // -----------------------------------------------------

  // 1. POLL STOCK LEVEL
  useEffect(() => {
    const fetchStock = async () => {
        try {
            const res = await fetch(`${API_BASE}/products/${PRODUCT_ID}`);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            console.log("response's data : " , data.stock);
            if (data.stock !== undefined) {
                setStock(data.stock);
                if (isSimulating) setIsSimulating(false); // Backend is back!
            }
        } catch (err) {
            // BACKEND IS OFFLINE: Switch to Simulation Mode silently
            if (!isSimulating) {
                console.warn("Backend unreachable. Enabling Demo Simulation Mode.");
                setIsSimulating(true);
                setStock(mockStock.current);
            }
            // In simulation mode, we just keep the current mock stock
            if(isSimulating) {
                setStock(mockStock.current);
            }
        }
    };

    // Initial fetch
    fetchStock();

    // Poll every 2 seconds
    stockPollInterval.current = setInterval(fetchStock, 2000);

    return () => {
        if (stockPollInterval.current) clearInterval(stockPollInterval.current);
    };
  }, [isSimulating]);


  // 2. RESERVE STOCK FLOW
  const handleReserve = async () => {
    console.log("Current Stock = " , stock);
    if (stock !== null && stock <= 0) {
        setFailReason('Already Sold Out');
        setView('failed');
        return;
    }

    setView('polling');

    // MOCK PATH
    if (isSimulating) {
        setTimeout(() => {
            const mockId = `mock-ord-${Math.floor(Math.random() * 10000)}`;
            setOrderId(mockId);
            startOrderPolling(mockId);
        }, 800);
        return;
    }

    // REAL PATH
    try {
      const response = await fetch(`${API_BASE}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: `user-${Math.floor(Math.random() * 1000)}`,
            productId: PRODUCT_ID,
            quantity: 1
        })
      });
     
      const data = await response.json();
      if (data.orderId) {
        console.log("Reservation queued for order id : " , data.orderId);
        setOrderId(data.orderId);
        startOrderPolling(data.orderId);
      } else {
        triggerFail('Failed to queue');
      }
    } catch (err) {
      // Fallback to simulation if reserve fails
      setIsSimulating(true);
      setTimeout(() => {
          const mockId = `mock-ord-${Math.floor(Math.random() * 10000)}`;
          setOrderId(mockId);
          startOrderPolling(mockId);
      }, 800);
    }
  };

  const startOrderPolling = (id: string) => {
    let pollCount = 0;
    console.log("Polling from UI");

    orderPollInterval.current = setInterval(async () => {
      pollCount++;

      // MOCK POLLING
      if (isSimulating) {
        if (pollCount > 2) {
            stopOrderPolling();
            setView('payment');
        }
        return;
      }

      // REAL POLLING
      try {
        const res = await fetch(`${API_BASE}/orders/${id}`);
        const data = await res.json();

        console.log("Status at UI end : " , data.status);

        if (data.status === 'RESERVED') {
          stopOrderPolling();
          setView('payment');
        }
        else if (data.status === 'FAILED') {
          stopOrderPolling();
          triggerFail(data.reason || 'OUT_OF_STOCK');
        }
      } catch (err) {
          // If polling fails in real mode, assume network error but don't fail immediately, retry
          console.error("Polling error", err);
      }
    }, 1000);
  };

  const stopOrderPolling = () => {
    if (orderPollInterval.current) clearInterval(orderPollInterval.current);
  };

  // 3. PROCESS PAYMENT FLOW
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);

    // MOCK PAYMENT
    if (isSimulating) {
        setTimeout(() => {
            setView('success');
            setIsProcessingPayment(false);
        }, 1500);
        return;
    }

    // REAL PAYMENT
    try {
      const res = await fetch(`${API_BASE}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentToken: 'tok_visa_fake' })
      });

      const data = await res.json();
      if (data.status === 'CONFIRMED') {
        setView('success');
      } else {
        triggerFail('Payment Declined');
      }
    } catch (err) {
      // If real payment fails, we might trigger success for demo purposes or fail
      // Here we trigger fail to be realistic
      triggerFail('Payment Network Error');
    }
  };

  const triggerFail = (reason: string) => {
    setFailReason(reason);
    setView('failed');
    stopOrderPolling();
    setIsProcessingPayment(false);
  };

  const resetDemo = () => {
    setView('product');
    setOrderId(null);
    setFailReason('');
    setIsProcessingPayment(false);
    stopOrderPolling();
  };

  // Helper to calculate progress bar width
  const getStockPercentage = () => {
    if (stock === null) return 100;
    const pct = (stock / TOTAL_INVENTORY) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 relative flex flex-col min-h-[600px]">
       
        {/* Header */}
        <div className="h-40 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <Zap className="absolute text-white opacity-20 -left-4 -bottom-4 rotate-12" size={120} />
            <h1 className="text-4xl font-black uppercase tracking-tighter drop-shadow-md z-10 italic transform -skew-x-6">
                Flash Sale
            </h1>
        </div>

        <div className="p-6 flex-grow flex flex-col justify-center relative">
         
          {/* Simulation Indicator */}
          {isSimulating && view === 'product' && (
              <div className="absolute top-2 right-2 bg-slate-900/80 border border-slate-700 rounded px-2 py-1 flex items-center gap-1 text-[10px] text-slate-400">
                  <WifiOff size={10} /> Demo Mode
              </div>
          )}

          {/* VIEW 1: PRODUCT */}
          {view === 'product' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold">iPhone 15 Pro Max</h2>
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400 line-through">$1,499</span>
                        <span className="text-3xl font-bold text-green-400">$1,199</span>
                    </div>
                </div>
               
                {/* REAL-TIME INVENTORY BAR */}
                <div className="mt-4 bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                   <div className="flex justify-between text-xs mb-1 uppercase font-bold text-slate-400">
                        <span>Inventory</span>
                        <span className={(stock !== null && stock < 5) ? "text-red-400 animate-pulse" : "text-green-400"}>
                            {stock === null ? 'Loading...' : stock <= 0 ? 'SOLD OUT' : `${stock} Units Left`}
                        </span>
                   </div>
                   <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${(stock !== null && stock < 5) ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${getStockPercentage()}%` }}
                        ></div>
                   </div>
                </div>

              </div>
              <button
                onClick={handleReserve}
                disabled={stock !== null && stock <= 0}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 group
                    ${(stock !== null && stock <= 0)
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'}`
                }
              >
                {(stock !== null && stock <= 0) ? (
                    "SOLD OUT"
                ) : (
                    <>
                    <ShoppingBag className="inline mr-2 group-hover:-translate-y-1 transition-transform" size={20} />
                    Grab Deal
                    </>
                )}
              </button>
              <p className="text-center text-xs text-slate-500">
                {isSimulating ? 'Simulated Inventory' : 'Live Inventory updates every 2s'}
              </p>
            </div>
          )}

          {/* VIEW 2: POLLING (Spinner) */}
          {view === 'polling' && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Securing Inventory...</h3>
                <p className="text-slate-400 text-sm max-w-[200px] mx-auto">
                    We are locking this unit to your Account ID. Do not refresh.
                </p>
              </div>
            </div>
          )}

          {/* VIEW 3: PAYMENT FORM */}
          {view === 'payment' && (
            <form onSubmit={handlePayment} className="space-y-5 animate-in slide-in-from-right duration-500">
              <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-start gap-3">
                <Lock size={20} className="text-green-400 mt-1 shrink-0" />
                <div>
                    <p className="text-sm text-green-200 font-bold">Stock Reserved for 05:00</p>
                    <p className="text-xs text-green-200/60">Complete payment to confirm.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <CreditCard className="absolute left-4 top-3.5 text-slate-500" size={20} />
                  <input type="text" placeholder="Card Number" defaultValue="4242 4242 4242 4242" className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                 <input type="text" placeholder="MM/YY" defaultValue="12/26" className="bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center transition-all" />
                 <input type="text" placeholder="CVC" defaultValue="123" className="bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center transition-all" />
                </div>
              </div>

              <button disabled={isProcessingPayment} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 mt-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait">
                {isProcessingPayment ? 'Processing...' : 'Pay $1,199'}
              </button>
            </form>
          )}

          {/* VIEW 4: SUCCESS */}
          {view === 'success' && (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30 ring-4 ring-green-500/20">
                <CheckCircle className="text-white w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">You Got It!</h2>
              <p className="text-slate-400 mb-8">Order ID: <span className="font-mono text-slate-200 bg-slate-700 px-2 py-1 rounded">{orderId || 'DEMO-123'}</span></p>
             
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700 mb-8">
                <p className="text-sm text-slate-300">Tracking number will be emailed shortly.</p>
              </div>

              <button onClick={resetDemo} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center justify-center gap-2 mx-auto">
                <RotateCcw size={14} /> Shop Again
              </button>
            </div>
          )}

          {/* VIEW 5: FAILED */}
          {view === 'failed' && (
            <div className="text-center py-8 animate-in zoom-in duration-500">
               <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-500/10">
                <XCircle className="text-red-500 w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Sold Out</h2>
              <p className="text-slate-400 max-w-[200px] mx-auto">We couldn't secure stock for you in time.</p>
             
              <div className="mt-6 bg-red-500/10 border border-red-500/20 p-3 rounded-lg inline-block">
                <p className="text-xs text-red-400 font-mono uppercase font-bold">{failReason}</p>
              </div>

              <button onClick={resetDemo} className="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all">
                Try Again
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}


// import { useState, useEffect } from 'react';
// // import { ShoppingBag, CheckCircle, AlertTriangle, Zap, Server } from 'lucide-react';


// // --- MOCK DATA FOR PREVIEW ---
// // In real app, fetch this from an API
// // const INITIAL_STOCK = 15;

// type order_status = 'product' | 'polling' | 'payment' | 'confirmed';

// export default function App() {

//   const [stock , setStock] = useState(20);
//   const [orderStatus , setOrderStatus] = useState<order_status>('product');
//   const [orderID , setOrderID] = useState<string | null>(null);
//   // const [orderProcessing , setOrderProcessing] = useState(false);


//   //useEffect will run every 2 sec and update the stock to (stock-3)
//   useEffect(() => {

//     //setTimer for 2 seconds
//     const interval = setInterval(()=> {
//       setStock(prev => prev>3 ? prev-2 : prev);
//     },2000);
    
//     return () => clearInterval(interval); //cleanup function
    
//   },[])

  

//   const handleGrabDeal = () => {

//     setOrderStatus('product');

//     if(stock > 0){
                
//       setStock(prev => prev-1);

//       setOrderStatus("polling");

//       //Generate order ID
//       setOrderID(`ord-${Math.floor(Math.random() * 10000)}`);

//     }


//     //After 5 secs start Processing the order i.e. entering card details etc.
//     setTimeout(() => { 
//       setOrderStatus("payment");
//     },3000)
    
//   }

//   const handlePayment = () => {

//     setOrderStatus("confirmed");

//   }



  
//   return (
//     <div className='bg-slate-900 text-white p-4 flex justify-center items-center min-h-screen'>
//       <div className='max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 relative flex flex-col min-h-[500px]'>

//         {/* Header */}
//         <div className='w-full flex items-center justify-center h-40 bg-gradient-to-r from-indigo-600 to-purple-600'>
//           <h1 className='z-10 text-4xl font-bold italic'>FLASH SALE</h1>
//         </div>


//         {/* SCREEN 1 - PRODUCT VIEW */}
//         {orderStatus === 'product' && (
//           <div className='space-y-8 p-6 flex flex-col justify-center relative'>

//             <div className="flex justify-between">
//               <h2 className='text-2xl font-bold'>iPhone 15 Pro max</h2>
//               <div className='flex flex-col items-end'>
//                 <span className='text-xs line-through text-slate-400'>$1,199</span>
//                 <span  className='text-3xl font-bold text-green-400'>$1,499</span>
//               </div>
//             </div>
            

//             <div className='bg-slate-700 rounded-lg p-3 border border-slate-600'>
//               <div className="flex justify-between text-xs uppercase font-bold">
//                 <span>Inventory</span>
//                 <span className={(stock < 7 ? 'text-red-400' : 'text-green-400')}>{stock} units left</span>
//               </div>

//               {/* Sliding bar */}
//               <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
//                 <div className={`h-2 transition-all duration-500 ease-out ${stock < 7 ? 'bg-red-500' : 'bg-green-500' }`}  style={{ width: `${(stock/20)*100}%` }}/>
//               </div>
//             </div>

//             <button
//               className='w-full py-4 font-bold text-lg rounded-xl shadow-lg transition-all bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
//               onClick={handleGrabDeal}
//             >
//               Grab Deal
//             </button>

//           </div>
//         )}


//         {/* SCREEN 2 - POLLING */}
//         {orderStatus === 'polling' && (
//           <div className='flex flex-col items-center justify-center space-y-6 py-15'>
//             <span className='text-xl font-bold'>Securing Inventory. . .</span>
//             <span className='text-sm max-w-[200px] mx-auto'>We are locking this unit to your Account ID. Do not refresh</span>
//           </div>
//         )}


//         {/* SCREEN 3 - PAYMENT FORM */}
//         {orderStatus === 'payment' && (
//           <form onSubmit={handlePayment} className='space-y-6 p-5'>
//             <div className='rounded-xl bg-green-500/10 border border-green-500/30 p-4'>
//               <p className='font-bold'>Stock reserved for 05:00</p>
//               <p className='text-sm'>Complete payment to confirm</p>
//             </div>


//             {/* Card Details' section */}
//             <div className='flex flex-col items-center gap-3'>
//               <input type="text" placeholder='Card Number' defaultValue="4242 4242 4242" className='w-full h-10 font-mono rounded-xl bg-slate-700 border border-slate-600 px-4' />

//               <div className='w-full flex items-center justify-between'>
//                 <input type="text" placeholder='Expiry Date' defaultValue="12/26" className='h-10 text-center font-mono rounded-xl bg-slate-700 border border-slate-600'/>
//                 <input type="text" placeholder='CVV' defaultValue="123" className='h-10 text-center font-mono rounded-xl bg-slate-700 border border-slate-600' />
//               </div>
//             </div>

//             <button className='w-full bg-green-400 py-4 font-bold text-lg shadow-lg rounded-xl hover:bg-emerald-500'>
//               Pay $1,199
//             </button>
//           </form>
//         )}

//         {/* SCREEN 4 - ORDER CONFIRMED */}
//         {orderStatus === 'confirmed' && (
//           <div className='flex flex-col items-center text-center gap-5 p-5 py-15'>
//             <div className='space-y-3'>
//               <h2 className='font-bold text-3xl'>You Got it!</h2>
//               <p>Order ID: <span className='rounded px-2 py-1 font-mono bg-slate-700'>{orderID}</span></p>
//             </div>

//             <div className='w-full bg-slate-700/30 border border-slate-700 rounded-lg p-3'>
//               <p className='text-slate-300 text-sm'>Tracking number will be emailed shortly</p>
//             </div>

//             <button onClick={()=>setOrderStatus("product")} className='text-sm text-indigo-400 hover:text-indigo-300 font-semibold'>
//               Shop again
//             </button>

//           </div>
//         )}
          
//       </div>
//     </div>
    
//   )
// }

