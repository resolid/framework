import { createClient, createCluster } from "@redis/client";
import { retry } from "@resolid/utils";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

export default async function (): Promise<() => Promise<void>> {
  const composeFile = resolve(import.meta.dirname, `./docker/redis-compose.yaml`);

  execSync(`docker compose -f ${composeFile} --project-name resolid up -d`, {
    stdio: "inherit",
  });

  await retry(
    async () => {
      const client = createClient({ url: "redis://localhost:6379" });

      await client.connect();
      await client.ping();
      await client.close();

      const clusterClient = createCluster({
        rootNodes: [
          {
            url: "redis://localhost:7001",
          },
          {
            url: "redis://localhost:7002",
          },
          {
            url: "redis://localhost:7003",
          },
        ],
        useReplicas: true,
      });
      await clusterClient.connect();

      const ok = (await clusterClient.clusterInfo()).includes("cluster_state:ok");

      await clusterClient.close();

      if (!ok) {
        throw new Error("cluster not ready");
      }
    },
    {
      retries: 60,
      delay: 500,
    },
  );

  return async () => {
    execSync(`docker compose -f ${composeFile} --project-name resolid down -v --remove-orphans`, {
      stdio: "inherit",
    });
  };
}
