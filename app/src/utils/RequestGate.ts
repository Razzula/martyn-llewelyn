class RequestGate {

    private inFlight = new Map<string, Promise<unknown>>();
    private cache = new Map<string, { value: unknown; expires: number }>();

    run<T>(id: string, fn: (opts?: { signal?: AbortSignal }) => Promise<T>, cacheTolerance = 0, signal?: AbortSignal): Promise<T> {

        // check cache
        const now = Date.now();
        const cached = this.cache.get(id);
        if (cached && cached.expires > now) {
            return Promise.resolve(cached.value as T);
        }

        // request is already underway
        const existing = this.inFlight.get(id) as Promise<T> | undefined;
        if (existing) {
            // returning the existing promise for when the request is finished
            return existing;
        }

        // initiate the request
        const p = fn({ signal })
            .then((v) => {
                if (cacheTolerance > 0) {
                    // cache result
                    this.cache.set(id, {
                        value: v,
                        expires: now + cacheTolerance, // expiry time
                    });
                }
                return v;
            })
            .finally(() => {
                // request finished, remove from in-flight map  
                this.inFlight.delete(id);
            });
        console.log(id);

        // store in-progress request for future calls
        this.inFlight.set(id, p);
        return p;
    }

    clear(id?: string) {
        if (id) {
            // clear specific cache entry
            this.cache.delete(id);
            this.inFlight.delete(id);
        }
        else {
            // empty cache
            this.cache.clear();
            this.inFlight.clear();
        }
    }

}

const requestGate: RequestGate = (globalThis as any).__requestGate ?? new RequestGate();

(globalThis as any).__requestGate = requestGate; // survive HMR

export default requestGate;
