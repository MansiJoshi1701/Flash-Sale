import { useState, useEffect } from 'react';
// import { ShoppingBag, CheckCircle, AlertTriangle, Zap, Server } from 'lucide-react';


// --- MOCK DATA FOR PREVIEW ---
// In real app, fetch this from an API
// const INITIAL_STOCK = 15;

type order_status = 'product' | 'polling' | 'payment' | 'confirmed';

export default function App() {

  const [stock , setStock] = useState(20);
  const [orderStatus , setOrderStatus] = useState<order_status>('product');
  const [orderID , setOrderID] = useState<string | null>(null);
  // const [orderProcessing , setOrderProcessing] = useState(false);


  //useEffect will run every 2 sec and update the stock to (stock-3)
  useEffect(() => {

    //setTimer for 2 seconds
    const interval = setInterval(()=> {
      setStock(prev => prev>3 ? prev-2 : prev);
    },2000);
    
    return () => clearInterval(interval); //cleanup function
    
  },[])

  

  const handleGrabDeal = () => {

    setOrderStatus('product');

    if(stock > 0){
                
      setStock(prev => prev-1);

      setOrderStatus("polling");

      //Generate order ID
      setOrderID(`ord-${Math.floor(Math.random() * 10000)}`);

    }


    //After 5 secs start Processing the order i.e. entering card details etc.
    setTimeout(() => { 
      setOrderStatus("payment");
    },3000)
    
  }

  const handlePayment = () => {

    setOrderStatus("confirmed");

  }



  
  return (
    <div className='bg-slate-900 text-white p-4 flex justify-center items-center min-h-screen'>
      <div className='max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 relative flex flex-col min-h-[500px]'>

        {/* Header */}
        <div className='w-full flex items-center justify-center h-40 bg-gradient-to-r from-indigo-600 to-purple-600'>
          <h1 className='z-10 text-4xl font-bold italic'>FLASH SALE</h1>
        </div>


        {/* SCREEN 1 - PRODUCT VIEW */}
        {orderStatus === 'product' && (
          <div className='space-y-8 p-6 flex flex-col justify-center relative'>

            <div className="flex justify-between">
              <h2 className='text-2xl font-bold'>iPhone 15 Pro max</h2>
              <div className='flex flex-col items-end'>
                <span className='text-xs line-through text-slate-400'>$1,199</span>
                <span  className='text-3xl font-bold text-green-400'>$1,499</span>
              </div>
            </div>
            

            <div className='bg-slate-700 rounded-lg p-3 border border-slate-600'>
              <div className="flex justify-between text-xs uppercase font-bold">
                <span>Inventory</span>
                <span className={(stock < 7 ? 'text-red-400' : 'text-green-400')}>{stock} units left</span>
              </div>

              {/* Sliding bar */}
              <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                <div className={`h-2 transition-all duration-500 ease-out ${stock < 7 ? 'bg-red-500' : 'bg-green-500' }`}  style={{ width: `${(stock/20)*100}%` }}/>
              </div>
            </div>

            <button
              className='w-full py-4 font-bold text-lg rounded-xl shadow-lg transition-all bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
              onClick={handleGrabDeal}
            >
              Grab Deal
            </button>

          </div>
        )}


        {/* SCREEN 2 - POLLING */}
        {orderStatus === 'polling' && (
          <div className='flex flex-col items-center justify-center space-y-6 py-15'>
            <span className='text-xl font-bold'>Securing Inventory. . .</span>
            <span className='text-sm max-w-[200px] mx-auto'>We are locking this unit to your Account ID. Do not refresh</span>
          </div>
        )}


        {/* SCREEN 3 - PAYMENT FORM */}
        {orderStatus === 'payment' && (
          <form onSubmit={handlePayment} className='space-y-6 p-5'>
            <div className='rounded-xl bg-green-500/10 border border-green-500/30 p-4'>
              <p className='font-bold'>Stock reserved for 05:00</p>
              <p className='text-sm'>Complete payment to confirm</p>
            </div>


            {/* Card Details' section */}
            <div className='flex flex-col items-center gap-3'>
              <input type="text" placeholder='Card Number' defaultValue="4242 4242 4242" className='w-full h-10 font-mono rounded-xl bg-slate-700 border border-slate-600 px-4' />

              <div className='w-full flex items-center justify-between'>
                <input type="text" placeholder='Expiry Date' defaultValue="12/26" className='h-10 text-center font-mono rounded-xl bg-slate-700 border border-slate-600'/>
                <input type="text" placeholder='CVV' defaultValue="123" className='h-10 text-center font-mono rounded-xl bg-slate-700 border border-slate-600' />
              </div>
            </div>

            <button className='w-full bg-green-400 py-4 font-bold text-lg shadow-lg rounded-xl hover:bg-emerald-500'>
              Pay $1,199
            </button>
          </form>
        )}

        {/* SCREEN 4 - ORDER CONFIRMED */}
        {orderStatus === 'confirmed' && (
          <div className='flex flex-col items-center text-center gap-5 p-5 py-15'>
            <div className='space-y-3'>
              <h2 className='font-bold text-3xl'>You Got it!</h2>
              <p>Order ID: <span className='rounded px-2 py-1 font-mono bg-slate-700'>{orderID}</span></p>
            </div>

            <div className='w-full bg-slate-700/30 border border-slate-700 rounded-lg p-3'>
              <p className='text-slate-300 text-sm'>Tracking number will be emailed shortly</p>
            </div>

            <button onClick={()=>setOrderStatus("product")} className='text-sm text-indigo-400 hover:text-indigo-300 font-semibold'>
              Shop again
            </button>

          </div>
        )}
          
      </div>
    </div>
    
  )
}

