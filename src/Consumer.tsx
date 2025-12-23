import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand} from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import type { Message } from '@aws-sdk/client-sqs'

//Read from the bottom for better understanding

dotenv.config();


const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);


const QUEUE_URL = process.env.SQS_QUEUE_URL;


// THE CORE LOGIC (Resume-worthy: Idempotent Transactions)
async function processOrder(order: any) {
   console.log(`[Worker] Processing Order: ${order.orderId}`);


   try {
       const transactionParams = {
           TransactItems: [
               {
                   // Operation 1: Decrement Inventory
                   Update: {
                       TableName: process.env.DYNAMO_TABLE_PRODUCTS,
                       Key: { productId: order.productId },
                       UpdateExpression: 'set stock = stock - :qty',
                       ConditionExpression: 'stock >= :qty',
                       ExpressionAttributeValues: {
                           ':qty': order.quantity
                       }
                   }
               },
               {
                   // Operation 2: Create Order Record (Idempotency Check)
                   Put: {
                       TableName: process.env.DYNAMO_TABLE_ORDERS,
                       Item: {
                           orderId: order.orderId,
                           userId: order.userId,
                           productId: order.productId,
                           status: 'CONFIRMED',
                           processedAt: new Date().toISOString()
                       },
                       // Guard: Idempotency. If orderId exists, this fails.
                       ConditionExpression: 'attribute_not_exists(orderId)'
                   }
               }
           ]
       };


       await docClient.send(new TransactWriteCommand(transactionParams));
       console.log(`[Worker] ✅ Order ${order.orderId} Confirmed!`);


   } catch (err: any) {
       if (err.name === 'TransactionCanceledException') {
           const reasons = err.CancellationReasons;


           if (reasons[0].Code === 'ConditionalCheckFailed') {
               console.error(`[Worker] ❌ Order ${order.orderId} Failed: OUT OF STOCK`);
               // We treat "Out of Stock" as a processed message (so we delete it from SQS)
               // In a real app, you might move this to a Dead Letter Queue or notify user.
               return;
           }
           else if (reasons[1].Code === 'ConditionalCheckFailed') {
               console.log(`[Worker] ⚠️ Order ${order.orderId} was ALREADY PROCESSED. Ignoring.`);
               // Idempotency success: We treat this as "done" so it gets deleted from SQS.
               return;
           }
       }
       // For other errors (Network, Auth, etc), we THROW.
       // This ensures the message is NOT deleted and SQS retries it later.
       console.error(`[Worker] Error processing order ${order.orderId}:`, err);
       throw err;
   }
}


// Wrapper to handle individual message lifecycle (Process -> Delete)
async function handleMessage(msg: Message) {
   if (!msg.Body || !msg.ReceiptHandle) return;


   try {
       const orderData = JSON.parse(msg.Body);
      
       // 1. Process Logic
       await processOrder(orderData);


       // 2. Delete from SQS only if processing didn't throw an error
       await sqsClient.send(new DeleteMessageCommand({
           QueueUrl: QUEUE_URL,
           ReceiptHandle: msg.ReceiptHandle
       }));
      
   } catch (error) {
       // If processOrder threw an error (e.g. Network fail), we catch it here.
       // We do NOT delete the message. SQS will make it visible again after the VisibilityTimeout.
       console.error(`[Worker] Failed to process message ${msg.MessageId}. Leaving in queue.`);
   }
}


// POLLING LOOP (Concurrency Enabled)
async function startPolling() {
   console.log('[Worker] Listening for orders (Concurrent Mode)...');
  
   while (true) {
       try {
           const { Messages } = await sqsClient.send(new ReceiveMessageCommand({
               QueueUrl: QUEUE_URL,
               // SQS allows up to 10 messages per batch
               MaxNumberOfMessages: 10,
               WaitTimeSeconds: 20 // Long polling (reduces empty responses)
           }));


           if (Messages && Messages.length > 0) {
               console.log(`[Worker] Received batch of ${Messages.length} messages.`);
              
               // CONCURRENCY MAGIC:
               // Instead of `for..of` loop with await (Sequential),
               // we map to an array of Promises and run them all at once.
               // This means 10 DB transactions happen in parallel.
               await Promise.all(Messages.map(msg => handleMessage(msg)));
           }
       } catch (error) {
           console.error('[Worker] Polling Error:', error);
           await new Promise(resolve => setTimeout(resolve, 5000));
       }
   }
}


startPolling(); //Polling the SQS
