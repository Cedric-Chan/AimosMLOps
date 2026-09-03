import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Outlet } from "react-router";
import {
  INITIAL_FG_LIST_SEED,
  INITIAL_MODULES,
  type FeatureGroup,
} from "@/app/components/feature-group/fgSeed";

const SYNC_MOCK_DELAY_MS = 450;

type FeatureGroupsContextValue = {
  fgList: FeatureGroup[];
  setFgList: React.Dispatch<React.SetStateAction<FeatureGroup[]>>;
  updateFg: (
    id: string,
    patch: Partial<FeatureGroup> | ((prev: FeatureGroup) => FeatureGroup)
  ) => void;
  getFg: (id: string) => FeatureGroup | undefined;
  syncFgMetadata: (id: string) => Promise<void>;
  modules: string[];
  setModules: React.Dispatch<React.SetStateAction<string[]>>;
};

const FeatureGroupsContext = createContext<FeatureGroupsContextValue | null>(
  null
);

export function FeatureGroupsProvider({ children }: { children: ReactNode }) {
  const [fgList, setFgList] = useState<FeatureGroup[]>(() => [
    ...INITIAL_FG_LIST_SEED,
  ]);
  const [modules, setModules] = useState<string[]>(() => [...INITIAL_MODULES]);

  const updateFg = useCallback(
    (
      id: string,
      patch: Partial<FeatureGroup> | ((prev: FeatureGroup) => FeatureGroup)
    ) => {
      setFgList((list) =>
        list.map((fg) => {
          if (fg.id !== id) return fg;
          return typeof patch === "function" ? patch(fg) : { ...fg, ...patch };
        })
      );
    },
    []
  );

  const getFg = useCallback(
    (id: string) => fgList.find((f) => f.id === id),
    [fgList]
  );

  const syncFgMetadata = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, SYNC_MOCK_DELAY_MS));
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    setFgList((list) =>
      list.map((fg) => (fg.id === id ? { ...fg, updateTime: now } : fg))
    );
  }, []);

  const value = useMemo(
    () => ({
      fgList,
      setFgList,
      updateFg,
      getFg,
      syncFgMetadata,
      modules,
      setModules,
    }),
    [fgList, modules, updateFg, getFg, syncFgMetadata]
  );

  return (
    <FeatureGroupsContext.Provider value={value}>
      {children}
    </FeatureGroupsContext.Provider>
  );
}

export function useFeatureGroups() {
  const ctx = useContext(FeatureGroupsContext);
  if (!ctx) {
    throw new Error("useFeatureGroups must be used within FeatureGroupsProvider");
  }
  return ctx;
}

export function FeatureGroupsLayout() {
  return (
    <FeatureGroupsProvider>
      <Outlet />
    </FeatureGroupsProvider>
  );
}
