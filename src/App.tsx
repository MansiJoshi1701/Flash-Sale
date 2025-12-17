import { useState, useEffect } from 'react';
// import { ShoppingBag, CheckCircle, AlertTriangle, Zap, Server } from 'lucide-react';


// --- MOCK DATA FOR PREVIEW ---
// In real app, fetch this from an API
// const INITIAL_STOCK = 15;


export default function App() {

  const [stock , setStock] = useState(20);
  const [orderStatus , setOrderStatus] = useState<string | null>(null);
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

    setOrderStatus(null);

    if(stock > 0){
                
      setStock(prev => prev-1);

      setOrderStatus("Queued");

      //Generate order ID
      setOrderID(`ord-${Math.floor(Math.random() * 10000)}`);

    }


    //After 5 secs start Processing the order i.e. entering card details etc.
    setTimeout(() => { 
      setOrderStatus("Processing");
    },5000)
    
  }

  

  const renderContent = () => {
    switch (orderStatus) {
          case 'Queued':
            return(
              <div className='w-full flex flex-col items-center gap-2'>
                <h2>Securing Inventory. . .</h2>
                <p>We are locking this unit to your Account ID. Do not refresh</p>
              </div>
            );
            
          case 'Processing':
            return(
              <div className='w-full flex flex-col rounded-xl gap-4 '>
                <div>
                  <p className='font-bold'>Stock reserved for 05:00</p>
                  <p>Complete payment to confirm</p>
                </div>

                <div>
                  <input type="text" placeholder='4242 4242 4242 4242'/>
                </div>

                <div className='w-full flex justify-between rounded-xl'>
                  <input type="text" placeholder='12/26' />
                  <input type="text" placeholder='123' />
                </div>
                
                <button 
                  className='flex w-full py-4 font-bold text-lg rounded-xl items-center justify-center'
                  onClick={() => setOrderStatus("Confirmed")}
                >
                  Pay $1,199
                </button>
              </div>
            )

          case 'Confirmed':
            return(
              <div className='w-full flex flex-col items-center gap-2'>
                <h2 className='font-bold text-3xl'>You Got it!</h2>
                <p>Order ID: {orderID}</p>
              </div>
            )
        
          default:
            return(
              <div>
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

                <div>
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
                  onClick={handleGrabDeal}
                >
                  Grab Deal
                </button>

              </div>
            )
        }
  }


  
  return (
    <div className='w-full bg-slate-900 text-white p-4 flex justify-center items-center min-h-screen'>
      <div className='mx-auto max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700'>

        <div className='w-full flex flex-col items-center h-20 bg-purple-500 text-3xl font-bold'>
          <h1>Flash Sale</h1>
        </div>

        {renderContent()}

          
      </div>
    </div>
    
  )
}

