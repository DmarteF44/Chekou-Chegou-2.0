import AsyncStorage from "@react-native-async-storage/async-storage";

const DIAGNOSTIC_KEY = "chekou_diag_boot_v1";

export type NavigationDiagnosticState = {
  indexMountCount: number;
  lastAction: string;
  lastRoute: string;
  lastEvent: string;
  lastAt: string;
  redirectNextBoot: boolean;
};

const EMPTY_STATE: NavigationDiagnosticState = {
  indexMountCount: 0,
  lastAction: "nenhuma",
  lastRoute: "nenhuma",
  lastEvent: "nenhum evento registrado",
  lastAt: "nenhum",
  redirectNextBoot: false,
};

async function readState(): Promise<NavigationDiagnosticState> {
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTIC_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const saved = JSON.parse(raw) as Partial<NavigationDiagnosticState>;
    return {
      indexMountCount: typeof saved.indexMountCount === "number" ? saved.indexMountCount : 0,
      lastAction: typeof saved.lastAction === "string" ? saved.lastAction : EMPTY_STATE.lastAction,
      lastRoute: typeof saved.lastRoute === "string" ? saved.lastRoute : EMPTY_STATE.lastRoute,
      lastEvent: typeof saved.lastEvent === "string" ? saved.lastEvent : EMPTY_STATE.lastEvent,
      lastAt: typeof saved.lastAt === "string" ? saved.lastAt : EMPTY_STATE.lastAt,
      redirectNextBoot: saved.redirectNextBoot === true,
    };
  } catch {
    console.warn("[diag-nav] Estado diagnóstico inválido; reiniciando somente o diagnóstico.");
    try {
      await AsyncStorage.removeItem(DIAGNOSTIC_KEY);
    } catch {
      console.warn("[diag-nav] Não foi possível limpar o estado diagnóstico inválido.");
    }
    return { ...EMPTY_STATE };
  }
}

async function saveState(state: NavigationDiagnosticState): Promise<NavigationDiagnosticState> {
  try {
    await AsyncStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(state));
  } catch {
    console.warn("[diag-nav] Não foi possível persistir o evento diagnóstico.");
  }
  return state;
}

export async function registerIndexMount(): Promise<{
  state: NavigationDiagnosticState;
  shouldRedirect: boolean;
}> {
  const previous = await readState();
  const shouldRedirect = previous.redirectNextBoot;
  const state = await saveState({
    ...previous,
    indexMountCount: previous.indexMountCount + 1,
    lastEvent: shouldRedirect ? "index montou com redirect pendente" : "index montou",
    lastAt: new Date().toISOString(),
    redirectNextBoot: false,
  });
  return { state, shouldRedirect };
}

export async function recordNavigationRequest(
  action: string,
  route: string,
  redirectNextBoot = false,
): Promise<NavigationDiagnosticState> {
  const previous = await readState();
  return saveState({
    ...previous,
    lastAction: action,
    lastRoute: route,
    lastEvent: redirectNextBoot ? "redirect armado para próximo boot" : "navegação solicitada",
    lastAt: new Date().toISOString(),
    redirectNextBoot,
  });
}

export async function recordDestinationMount(
  event: string,
  route: string,
): Promise<NavigationDiagnosticState> {
  const previous = await readState();
  return saveState({
    ...previous,
    lastRoute: route,
    lastEvent: event,
    lastAt: new Date().toISOString(),
  });
}
