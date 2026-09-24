import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { PurchaseOrder } from '../src/types';

// In-memory persistent cache for instant fast lookup & fallback
const inMemoryOrders = new Map<string, PurchaseOrder>();

// Initialize Firebase App for server context
const serverApp = getApps().length === 0 ? initializeApp(firebaseConfig, 'SERVER_APP') : getApps()[0];
const db = getFirestore(serverApp, firebaseConfig.firestoreDatabaseId);

/**
 * Logs or updates an order in Firestore and in-memory cache
 */
export async function logOrderToFirestore(order: PurchaseOrder): Promise<void> {
  // Always update in-memory cache
  inMemoryOrders.set(order.orderId, order);

  try {
    const orderDocRef = doc(db, 'orders', order.orderId);
    await setDoc(orderDocRef, {
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      customerName: order.customerName || 'Valued Customer',
      userId: order.userId || '',
      productId: order.productId,
      productTitle: order.productTitle,
      productCategory: order.productCategory,
      amount: Number(order.amount),
      currency: order.currency || 'USD',
      status: order.status || 'completed',
      downloadToken: order.downloadToken,
      downloadExpiresAt: order.downloadExpiresAt,
      downloadUrl: order.downloadUrl,
      downloadCount: order.downloadCount || 0,
      maxDownloads: order.maxDownloads || 5,
      assetType: order.assetType,
      assetFileName: order.assetFileName,
      receiptEmailSent: order.receiptEmailSent,
      receiptSentAt: order.receiptSentAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }, { merge: true });
    console.log(`[Firestore] Order ${order.orderId} successfully logged to Firestore collection 'orders'.`);
  } catch (error) {
    console.warn(`[Firestore] Note: Could not write order ${order.orderId} directly to Firestore:`, (error as Error).message);
  }
}

/**
 * Retrieves an order by orderId
 */
export async function getOrderFromFirestore(orderId: string): Promise<PurchaseOrder | null> {
  if (inMemoryOrders.has(orderId)) {
    return inMemoryOrders.get(orderId)!;
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderDocRef);
    if (snap.exists()) {
      const data = snap.data() as PurchaseOrder;
      inMemoryOrders.set(orderId, data);
      return data;
    }
  } catch (error) {
    console.warn(`[Firestore] Fetch error for ${orderId}:`, (error as Error).message);
  }

  return null;
}

/**
 * Increments download count
 */
export async function incrementDownloadCount(orderId: string): Promise<number> {
  const existing = await getOrderFromFirestore(orderId);
  const newCount = existing ? (existing.downloadCount || 0) + 1 : 1;

  if (existing) {
    existing.downloadCount = newCount;
    existing.updatedAt = new Date().toISOString();
    inMemoryOrders.set(orderId, existing);
  }

  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await updateDoc(orderDocRef, {
      downloadCount: newCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Non-fatal
  }

  return newCount;
}

/**
 * Fetches all orders (with optional email filter)
 */
export async function listOrdersFromFirestore(email?: string): Promise<PurchaseOrder[]> {
  const results: PurchaseOrder[] = Array.from(inMemoryOrders.values());

  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as PurchaseOrder;
      if (!inMemoryOrders.has(data.orderId)) {
        inMemoryOrders.set(data.orderId, data);
        results.push(data);
      }
    });
  } catch (err) {
    // Return memory cache
  }

  if (email) {
    return results.filter((o) => o.customerEmail.toLowerCase() === email.toLowerCase());
  }

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
