import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ---
const API_URL = 'http://localhost:3000/api/reserve'; // Updated to hit /reserve endpoint
const PRODUCT_ID = 'iphone-15';
const TOTAL_BUYERS = 30; // How many concurrent requests to send
// TIP: Set DynamoDB stock to 10 manually before running this to see 20 failures.

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
    const results = await Promise.all(requests);
    
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
}

simulateFlashSale();

