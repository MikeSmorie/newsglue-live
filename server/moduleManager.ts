export interface IModule {
  name: string;
  inputSchema: any; // Will use Zod later
  outputSchema: any;
  process(input: any): Promise<any>;
}

export class ModuleManager {
  private modules: { [key: string]: IModule } = {};

  registerModule(module: IModule) {
    console.log(`[DEBUG] Registering module: ${module.name}`);
    this.modules[module.name] = module;
  }

  async runModule(moduleName: string, input: any) {
    const module = this.modules[moduleName];
    if (!module) throw new Error(`[ERROR] Module ${moduleName} not found`);
    console.log(`[DEBUG] Running ${moduleName} with input:`, input);
    return await module.process(input);
  }
}
