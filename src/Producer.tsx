import express from 'express';
import type { Request, Response } from 'express'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';


dotenv.config();


const app = express();

//Middlewares
app.use(cors()); //Allows browsers to make requests to this server from other domains e.g. your React app
app.use(express.json()); //to parse any incoming JSON text to JS object, which is then attached to the request object as 'req.body'


// Initialize AWS SQS Client
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });


// interface OrderRequest {
//    userId: string;
//    productId: string;
//    quantity: number;
// }


// THE "FLASH SALE" ENDPOINT
app.post('/api/buy', async (req: Request, res: Response) => {
   try {
       const { userId, productId, quantity } = req.body;


       // 1. Basic Validation
       if (!userId || !productId || quantity <= 0) {
            res.status(400).json({ error: 'Invalid order data' });
            return;
       }


       // 2. Generate a unique Order ID
       const orderId = uuidv4();


       // 3. Construct the Event Message
       const orderEvent = {
           orderId,
           userId,
           productId,
           quantity,
           timestamp: new Date().toISOString(),
           status: 'PENDING'
       };


       // 4. Send to SQS (The Decoupling Magic)
       const params = {
           QueueUrl: process.env.SQS_QUEUE_URL,
           MessageBody: JSON.stringify(orderEvent),
           // MessageDeduplicationId: orderId // Only for FIFO queues
       };

       await sqsClient.send(new SendMessageCommand(params));


       // 5. Respond immediately to the user
       console.log(`[Producer] Order ${orderId} pushed to queue.`);
       res.status(202).json({
           message: 'Order received! We are processing it.',
           orderId: orderId,
           status: 'QUEUED'
       });


   } catch (error) {
       console.error('Error sending to SQS:', error);
       res.status(500).json({ error: 'Internal Server Error' });
   }
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Producer API running on port ${PORT}`));