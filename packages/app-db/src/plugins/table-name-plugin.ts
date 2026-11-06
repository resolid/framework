import {
  OperationNodeTransformer,
  type KyselyPlugin,
  type PluginTransformQueryArgs,
  type PluginTransformResultArgs,
  type QueryResult,
  type RootOperationNode,
  type TableNode,
  type UnknownRow,
} from "kysely";

const WORD = /[\d\p{Ll}\p{Lo}]+|\p{Lu}+(?![\p{Ll}\p{Lo}])|\p{Lu}[\d\p{Ll}\p{Lo}]+/gu;
const APOSTROPHE = /['\u2019]/g;

const tableNameCache: Map<string, Map<string, string>> = new Map();

function getTableNameCache(prefix: string, snakeCase: boolean): Map<string, string> {
  const optionKey = `${prefix}:${snakeCase}`;

  const cache = tableNameCache.get(optionKey);

  if (cache) {
    return cache;
  }

  const created: Map<string, string> = new Map();

  tableNameCache.set(optionKey, created);

  return created;
}

export type TableNamePluginOptions = {
  prefix?: string;
  snakeCase?: boolean;
};

class TableNameTransformer extends OperationNodeTransformer {
  private readonly _prefix: string;
  private readonly _snakeCase: boolean;
  private readonly _cache: Map<string, string>;

  constructor({ prefix, snakeCase }: Required<TableNamePluginOptions>) {
    super();
    this._prefix = prefix;
    this._snakeCase = snakeCase;
    this._cache = getTableNameCache(prefix, snakeCase);
  }

  protected override transformTable(node: TableNode): TableNode {
    const transformed = super.transformTable(node);
    const { identifier } = transformed.table;

    return {
      ...transformed,
      table: {
        ...transformed.table,
        identifier: {
          ...identifier,
          name: this._transformName(identifier.name),
        },
      },
    };
  }

  private _transformName(name: string): string {
    const cached = this._cache.get(name);

    if (cached !== undefined) {
      return cached;
    }

    const transformed =
      this._prefix +
      (this._snakeCase
        ? (name.replaceAll(APOSTROPHE, "").match(WORD) ?? []).join("_").toLowerCase()
        : name);

    this._cache.set(name, transformed);

    return transformed;
  }
}

export class TableNamePlugin implements KyselyPlugin {
  private readonly _transformer: TableNameTransformer;

  constructor(options: TableNamePluginOptions = {}) {
    this._transformer = new TableNameTransformer({
      snakeCase: options.snakeCase ?? true,
      prefix: options.prefix ?? "",
    });
  }

  transformQuery({ node, queryId }: PluginTransformQueryArgs): RootOperationNode {
    return this._transformer.transformNode(node, queryId);
  }

  async transformResult({ result }: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return result;
  }
}
