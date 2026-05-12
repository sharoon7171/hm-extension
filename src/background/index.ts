import { registerAgeGateBypass } from "./age-gate-bypass";
import { registerAuthBridge } from "./auth-bridge";
import { registerFetchProxy } from "./fetch-proxy";
import { registerFirestoreSync } from "./firestore-sync";
import { registerOpenOptions } from "./open-options";
import { startScenesMirror } from "./scenes-mirror";

registerAgeGateBypass();
registerFetchProxy();
registerOpenOptions();
registerAuthBridge();
registerFirestoreSync();
void startScenesMirror();
