import { createClient, createCluster } from "@redis/client";
import { retry } from "@resolid/utils";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export default async function (): Promise<() => Promise<void>> {
  const composeFile = resolve(
    dirname(fileURLToPath(import.meta.url)),
    `./docker/redis-compose.yaml`,
  );

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

      return clusterClient;
    },
    async (clusterClient) => {
      try {
        const ok = (await clusterClient.clusterInfo()).includes("cluster_state:ok");
        await clusterClient.close();

        return ok;
      } catch {
        await clusterClient.close();
        return false;
      }
    },
    200,
    () => {
      throw new Error("Redis startup timeout");
    },
    10000,
  );

  return async () => {
    execSync(`docker compose -f ${composeFile} --project-name resolid down -v --remove-orphans`, {
      stdio: "inherit",
    });
  };
}
