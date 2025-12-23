import express from 'express';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express'

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

// 1. START RESERVATION (Async)
app.post('/api/reserve', async (req: Request, res: Response) => {
    try {
        const { userId, productId, quantity } = req.body;
        const orderId = uuidv4();

        const orderEvent = {
            orderId, userId, productId, quantity,
            timestamp: new Date().toISOString()
        };

        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify(orderEvent),
        }));

        res.status(202).json({
            message: 'Reservation queued',
            orderId: orderId,
            status: 'PENDING'
        });

    } catch (error) {
        console.error('Producer Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. CHECK STATUS (Poll for specific Order)
app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        const result = await docClient.send(new GetCommand({
            TableName: process.env.DYNAMO_TABLE_ORDERS,
            Key: { orderId }
        }));

        if (!result.Item) return res.json({ status: 'PENDING' });

        res.json({ 
            status: result.Item.status, 
            reason: result.Item.failureReason 
        });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch status' });
    }
});

// 3. PROCESS PAYMENT (Sync)
app.post('/api/pay', async (req: Request, res: Response) => {
    const { orderId, paymentToken } = req.body; 

    try {
        const order = await docClient.send(new GetCommand({
            TableName: process.env.DYNAMO_TABLE_ORDERS,
            Key: { orderId } 
        }));

        if (!order.Item || order.Item.status !== 'RESERVED') {
             res.status(400).json({ error: 'Order not reserved or expired' });
             return; 
        }

        await new Promise(r => setTimeout(r, 1000));
        
        await docClient.send(new UpdateCommand({
            TableName: process.env.DYNAMO_TABLE_ORDERS,
            Key: { orderId },
            UpdateExpression: 'set #s = :newStatus',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':newStatus': 'CONFIRMED' }
        }));

        res.json({ status: 'CONFIRMED' });

    } catch (error) {
        console.error('Payment Error:', error);
        res.status(500).json({ error: 'Payment failed' });
    }
});

// 4. GET REAL-TIME STOCK (New Endpoint)
// The UI will poll this to show the progress bar dropping
app.get('/api/products/:productId', async (req: Request, res: Response) => {
    const { productId } = req.params;
    try {
        const result = await docClient.send(new GetCommand({
            TableName: process.env.DYNAMO_TABLE_PRODUCTS,
            Key: { productId }
        }));

        if (!result.Item) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ 
            productId: result.Item.productId, 
            stock: result.Item.stock 
        });

    } catch (error) {
        console.error('Stock Check Error:', error);
        res.status(500).json({ error: 'Could not fetch stock' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Producer API running on port ${PORT}`));


