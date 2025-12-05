import { useState, useEffect } from 'react';
// import { ShoppingBag, CheckCircle, AlertTriangle, Zap, Server } from 'lucide-react';


// --- MOCK DATA FOR PREVIEW ---
// In real app, fetch this from an API
// const INITIAL_STOCK = 15;


export default function App() {

  const [stock , setStock] = useState(20);
  const [requestQueued , setRequestQueued] = useState(false);
  const [orderID , setOrderID] = useState<string | null>(null);
  const [orderProcessing , setOrderProcessing] = useState(false);


  //useEffect will run every 2 sec and update the stock to (stock-3)
  useEffect(() => {

    //setTimer for 2 seconds
    const interval = setInterval(()=> {
      setStock(prev => prev>3 ? prev-2 : prev);
    },2000);
    
    return () => clearInterval(interval); //cleanup function
    
  },[])


  const handleBuyStock = () => {

    setOrderProcessing(true);
    setRequestQueued(false);

    //The function inside the setTimeout will run after 2000ms
    setTimeout(() => {

      if(stock > 0){
        setStock(prev => prev-1);

        //set 'requestQueued' to true & 'orderProcessing' to false
        setRequestQueued(true);
        setOrderProcessing(false);

        //generate order ID
        genarateOrderID();
      }
    } , 2000)
    

  }

  const genarateOrderID = () => {

    let ID : string = "ord-" + Math.floor(Math.random() * 10000);
    setOrderID(ID);
  }


  const buttonText = orderProcessing ? "Processing..." : "Buy Now";

  
  return (
    <div className='w-full bg-slate-900 text-white p-4 flex justify-center items-center min-h-screen'>
        <div className='mx-auto max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700'>

          <div>
            <h1>Flash Sale</h1>
            <p>Ends in 10:00 minutes</p>
          </div>

          <div>
            <div className="flex justify-between">
              <h2>iPhone 15 Pro max</h2>
              <h2>$1,199</h2>
            </div>

            <div className="flex justify-between">
              <p>Titanium Blue  256 GB</p>
              <p className='line-through'>$1,499</p>
            </div>
          </div>

          
          <div >
            <div className="flex justify-between">
              <p>Inventory</p>
              <p>{stock} units left</p>
            </div>

            {/* Sliding bar */}
            <div className='w-full h-3 bg-gray-200 rounded-full relative overflow-hidden'>
              <div className={`w-full h-3 transition-all duration-500 ease-out ${stock < 7 ? 'bg-red-500' : 'bg-green-500' }`}  style={{ width: `${(stock/20)*100}%` }}/>
            </div>

          </div>


          <button
            className='flex w-full py-4 font-bold text-lg rounded-xl items-center justify-center'
            onClick={handleBuyStock}
          >
            {buttonText}
          </button>


          {/* if(requestQueued) then show the dialog box */}
          {requestQueued && (
            <div className='rounded-lg'>
              <p>Request Queued</p>
              <p>Your order ID is {orderID}. Check your dashboard for confirmation</p>
            </div>
          )}

        </div>
    </div>
    
  )
}

