import {useEffect, useRef, useState} from 'react';
import type {OrderTrackingResponse} from '@last-slice/contracts';

type LookupState = {
  code:string;
  order:OrderTrackingResponse|null;
  lastChecked:Date|null;
  loading:boolean;
  error:'not_found'|'connection'|null;
};

const terminal = (order:OrderTrackingResponse|null) =>
  order?.status === 'completed' || order?.status === 'cancelled';

// A single foreground request loop is shared by confirmation and tracking.
export function useOrderTracking(api:string, code:string, active:boolean, initialOrder:OrderTrackingResponse|null = null) {
  const [state, setState] = useState<LookupState>({code, order:initialOrder, lastChecked:null, loading:false, error:null});
  const refreshRef = useRef<() => void>(() => {});
  const currentState = useRef(state);
  currentState.current = state;

  useEffect(() => {
    let alive = true;
    let busy = false;
    let timer:number|undefined;
    let controller:AbortController|undefined;
    let snapshot:LookupState = currentState.current.code === code
      ? {...currentState.current, loading:false}
      : {code, order:initialOrder, lastChecked:null, loading:false, error:null};

    const publish = (changes:Partial<LookupState>) => {
      snapshot = {...snapshot, ...changes};
      if (alive) setState(snapshot);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (alive && active && document.visibilityState === 'visible' && !terminal(snapshot.order)) {
        timer = window.setTimeout(() => void refresh(), 15000);
      }
    };
    const refresh = async () => {
      if (!alive || !active || !code || busy || document.visibilityState !== 'visible') return;
      window.clearTimeout(timer);
      busy = true;
      controller = new AbortController();
      publish({loading:true, error:null});
      try {
        const response = await fetch(`${api}/orders/${encodeURIComponent(code)}`, {signal:controller.signal});
        const data = await response.json();
        if (!alive) return;
        if (!response.ok) {
          publish({error:!snapshot.order && data.error?.code === 'order_not_found' ? 'not_found' : 'connection'});
        } else {
          publish({order:data, lastChecked:new Date(), error:null});
        }
      } catch {
        if (alive) publish({error:'connection'});
      } finally {
        busy = false;
        if (alive) {
          publish({loading:false});
          // Schedule from completion, so manual refresh and resume reset the interval.
          if (snapshot.order) schedule();
        }
      }
    };
    const visibility = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'visible' && !terminal(snapshot.order)) void refresh();
    };

    publish({loading:false});
    refreshRef.current = () => void refresh();
    if (active && code) {
      void refresh();
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      alive = false;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [api, code, active, initialOrder]);

  return {...state, refresh:() => refreshRef.current()};
}
