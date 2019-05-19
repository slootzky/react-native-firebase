import { NativeModules } from 'react-native';
import { initialiseNativeModuleEventEmitter } from './events';
import INTERNALS from './internals';

const NATIVE_MODULES = {};

/**
 * Prepends appName arg to all native method calls
 * @param appName
 * @param NativeModule
 */
const nativeWithApp = (appName, NativeModule) => {
  const native = {};
  const methods = Object.keys(NativeModule);

  for (let i = 0, len = methods.length; i < len; i++) {
    const method = methods[i];
    native[method] = (...args) => NativeModule[method](...[appName, ...args]);
  }

  return native;
};

const getModuleKey = module => `${module.app.name}:${module.namespace}`;

export const getNativeModule = module => {
  const key = getModuleKey(module);
  return NATIVE_MODULES[key];
};

export const initialiseNativeModule = (module, config) => {
  const { moduleName, multiApp, namespace } = config;
  const nativeModule = NativeModules[moduleName];
  const key = getModuleKey(module);

  if (!nativeModule && namespace !== 'utils') {
    throw new Error(INTERNALS.STRINGS.ERROR_MISSING_MODULE(namespace, moduleName));
  }

  // used by the modules that extend ModuleBase
  // to access their native module counterpart
  if (multiApp) {
    NATIVE_MODULES[key] = nativeWithApp(module.app.name, nativeModule);
  } else {
    NATIVE_MODULES[key] = nativeModule;
  }

  initialiseNativeModuleEventEmitter(module, config);

  return NATIVE_MODULES[key];
};