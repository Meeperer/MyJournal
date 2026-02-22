/**
 * Client-side queue for entry save/delete requests that failed due to being offline.
 * When back online, drainQueue() retries each item in order.
 * In-memory only (queue is lost on page refresh); can be extended with IndexedDB for persistence.
 */

export type QueuedPost = {
  type: "post";
  date: string;
  body: { title?: string; rawContent: string; mood?: string; tags?: string };
};

export type QueuedDelete = {
  type: "delete";
  date: string;
};

export type QueuedItem = QueuedPost | QueuedDelete;

const queue: QueuedItem[] = [];

export function addToQueue(item: QueuedItem): void {
  queue.push(item);
}

export function getQueueLength(): number {
  return queue.length;
}

export function drainQueue(): Promise<void> {
  if (queue.length === 0) return Promise.resolve();
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const processNext = (index: number): Promise<void> => {
    if (index >= queue.length) return Promise.resolve();
    const item = queue[index];
    if (!item) return Promise.resolve();
    const promise =
      item.type === "post"
        ? fetch(`${base}/api/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: item.date,
              title: item.body.title,
              rawContent: item.body.rawContent,
              mood: item.body.mood,
              tags: item.body.tags,
            }),
          })
        : fetch(`${base}/api/entries?date=${encodeURIComponent(item.date)}`, { method: "DELETE" });
    return promise.then((res) => {
      if (res.ok) queue.splice(index, 1);
      return processNext(res.ok ? index : index + 1);
    });
  };
  return processNext(0);
}
