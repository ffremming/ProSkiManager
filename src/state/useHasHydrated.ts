import { useEffect, useState } from "react";

import { useGameStore } from "./gameStore";

/**
 * Small helper so pages/components can wait until Zustand persistence has rehydrated
 * before rendering. This avoids server/client mismatches when localStorage data
 * diverges from the server-rendered snapshot.
 */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());

  useEffect(() => {
    setHydrated(useGameStore.persist.hasHydrated());
    const unsubHydrate = useGameStore.persist.onHydrate?.(() => setHydrated(false));
    const unsubFinish = useGameStore.persist.onFinishHydration?.(() => setHydrated(true));
    return () => {
      unsubHydrate?.();
      unsubFinish?.();
    };
  }, []);

  return hydrated;
}
