import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { analyzeFacade } from "./analysis";
import { logError, logInfo } from "./logger";

const QUEUE_KEY = "facadelens_offline_queue";

export interface QueuedScan {
  imagePath: string;
  userId: string;
  location: { lat: number; lng: number } | null;
  address: string;
  queuedAt: string;
}

export type EnqueueInput = Omit<QueuedScan, "queuedAt">;

function isQueuedScan(value: unknown): value is QueuedScan {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.imagePath === "string" &&
    typeof v.userId === "string" &&
    typeof v.address === "string" &&
    typeof v.queuedAt === "string" &&
    (v.location === null ||
      (typeof v.location === "object" &&
        v.location !== null &&
        typeof (v.location as Record<string, unknown>).lat === "number" &&
        typeof (v.location as Record<string, unknown>).lng === "number"))
  );
}

export async function getQueue(): Promise<QueuedScan[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueuedScan);
  } catch (err) {
    logError("offlineQueue.getQueue", err);
    return [];
  }
}

async function writeQueue(queue: QueuedScan[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(item: EnqueueInput): Promise<void> {
  const existing = await getQueue();
  const next: QueuedScan[] = [...existing, { ...item, queuedAt: new Date().toISOString() }];
  await writeQueue(next);
  logInfo("offlineQueue.enqueue", "queued scan", { size: next.length });
}

export async function queueSize(): Promise<number> {
  const q = await getQueue();
  return q.length;
}

let processing = false;

export async function processQueue(): Promise<void> {
  if (processing) return;
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  processing = true;
  try {
    const remaining: QueuedScan[] = [];
    for (const item of queue) {
      try {
        await analyzeFacade({
          imagePath: item.imagePath,
          userId: item.userId,
          location: item.location,
          address: item.address,
        });
      } catch (err) {
        logError("offlineQueue.processQueue.item", err, { imagePath: item.imagePath });
        remaining.push(item);
      }
    }
    await writeQueue(remaining);
    logInfo("offlineQueue.processQueue", "drained", { processed: queue.length - remaining.length, remaining: remaining.length });
  } finally {
    processing = false;
  }
}
