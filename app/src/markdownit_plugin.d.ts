import {
  PluginSimple,
  PluginWithOptions,
} from 'https://cdn.skypack.dev/@types/markdown-it@12.2.3?dts';

declare const plugin: PluginSimple | PluginWithOptions<Record<string, unknown>>;
export = plugin;
