import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ---
const API_URL = 'http://localhost:3000/api/reserve'; // Updated to hit /reserve endpoint
const PRODUCT_ID = 'iphone-15';
const TOTAL_BUYERS = 30; // How many concurrent requests to send
// TIP: Set DynamoDB stock to 10 manually before running this to see 20 failures.

let results: ({
    status: string;
    data: any;
} | {
    status: string;
    error: any;
})[]


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function simulateFlashSale() {

    console.log(`\n⚡ STARTING FLASH SALE SIMULATION`);
    console.log(`🎯 Scenario: ${TOTAL_BUYERS} users are clicking 'Reserve' simultaneously.`);
    console.log(`---------------------------------------------------`);

    const requests = [];
    const startTime = Date.now();

    // 1. Prepare the Traffic
    for (let i = 0; i < TOTAL_BUYERS; i++) {
        const payload = {
            userId: `user-${uuidv4().substring(0, 8)}`, 
            productId: PRODUCT_ID,
            quantity: 1
        };

        // We push the Promise to an array, but we do NOT 'await' it yet.
        requests.push(
            axios.post(API_URL, payload)
                .then(res => ({ status: 'success', data: res.data }))
                .catch(err => ({ status: 'failed', error: err.message }))
        );
    }

    // 2. Fire the "Flash Mob"
    console.log(`🔥 Firing ${TOTAL_BUYERS} requests now...`);
    
    // Promise.all sends all requests at virtually the same time
    results = await Promise.all(requests);

    
    const endTime = Date.now();
    console.log(`🛑 Traffic burst finished in ${endTime - startTime}ms`);
    console.log(`---------------------------------------------------`);

    // 3. Analyze Producer Results
    const accepted = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`📡 PRODUCER API REPORT:`);
    console.log(`✅ Accepted (Queued): ${accepted}`);
    console.log(`❌ Failed (API Error): ${failed}`);
    
    if (accepted === TOTAL_BUYERS) {
        console.log(`\n✨ SUCCESS: The Producer API queued all requests.`);
        console.log(`   Check 'consumer_worker' logs to see reservations vs OOS failures.`);
    } else {
        console.log(`\n⚠️ WARNING: Some API requests failed.`);
    }

    checkOrderReservation();

};
    
    
simulateFlashSale();





async function checkOrderReservation () {
    //WAIT FOR 10 SECONDS BEFORE PROCEEDING
console.log("WAITING FOR 120 SECS!");



    await sleep(120000); //function call for waiting 10 secs
        
    //Logic to check if the all 'Queued' orders were successfully added to the DB or not
    console.log("This is to check DB if all the successfully queued requests were processed by the Consumer or not");
    console.log("Verifying order reservation");

    let orderCount = 0;
    results.map(async (r) => {

        const orderID = r.data.orderId;

        await axios.get(`http://localhost:3000/api/orders/${orderID}`)
            .then(res => {

                if(res.data.status === 'RESERVED'){
                    console.log(`Status: Order ${res.data.status} , ${orderID} added to DB`);
                    orderCount++;
                    console.log("Reserved order count = " , orderCount);
                }
            })
            .catch(err => {
                console.log("FAILED reason : " , err);
            })
    })

    if(orderCount === accepted) console.log("All queued orders reserved.");
    else console.log("Mismatch b/w orders queued and orders reserved");

}


    



