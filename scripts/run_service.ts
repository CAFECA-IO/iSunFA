import fs from "fs";
import path from "path";
import "dotenv/config";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("❌ Usage: npm run service <ServiceName> <MethodName> [arg1] [arg2] ...");
    console.error("💡 Example: npm run service CrawlerService crawl https://cafeca.com.tw");
    process.exit(1);
  }

  const [serviceName, methodName, ...rawParams] = args;

  // Info: (20260407 - Luphia) Try to parse parameters intelligently (JSON strings, numbers, booleans)
  const parsedParams = rawParams.map(param => {
    try {
      return JSON.parse(param);
    } catch {
      return param; // Info: (20260407 - Luphia) If it's pure text that isn't JSON, leave it as string
    }
  });

  console.log(`\n======================================================`);
  console.log(`🚀 Executing Service : ${serviceName}`);
  console.log(`🔧 Method          : ${methodName}`);
  console.log(`📦 Parameters      :`, parsedParams);
  console.log(`======================================================\n`);

  try {
    const servicesDir = path.resolve(__dirname, "../src/services");
    const files = fs.readdirSync(servicesDir).filter(f => f.endsWith(".service.ts") || f.endsWith(".service.tsx"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let TargetServiceClass: any = null;

    // Info: (20260407 - Luphia) Scan all service files to find the exported class matching 'serviceName'
    for (const file of files) {
      const modulePath = path.resolve(servicesDir, file);
      const importedModule = await import(modulePath);

      if (importedModule[serviceName]) {
        TargetServiceClass = importedModule[serviceName];
        break;
      }
    }

    if (!TargetServiceClass) {
      throw new Error(`Service class '${serviceName}' not found in any src/services/*.service.ts file.`);
    }

    // Info: (20260407 - Luphia) Instantiate service (Assuming constructor expects no rigorous parameters for simple testing, or handles it safely)
    const instance = new TargetServiceClass();

    if (typeof instance[methodName] !== "function") {
      throw new Error(`Method '${methodName}' does not exist on '${serviceName}'.`);
    }

    // Info: (20260407 - Luphia) Execute the dynamically resolved method
    const result = await instance[methodName](...parsedParams);

    console.log(`\n✅ Execution Completed Successfully!`);
    console.log(`\n[Result Payload]:\n`);
    console.dir(result, { depth: null, colors: true });

  } catch (error) {
    console.error(`\n❌ Execution Failed:`);
    console.error(error);
    process.exit(1);
  }
}

main();
