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

class TablePrefixTransformer extends OperationNodeTransformer {
  private readonly _prefix: string;

  constructor(prefix: string) {
    super();
    this._prefix = prefix;
  }

  protected override transformTable(node: TableNode): TableNode {
    const transformed = super.transformTable(node);

    return {
      ...transformed,
      table: {
        ...transformed.table,
        identifier: {
          ...transformed.table.identifier,
          name: this._prefix + transformed.table.identifier.name,
        },
      },
    };
  }
}

export class TablePrefixPlugin implements KyselyPlugin {
  private readonly _transformer: TablePrefixTransformer;

  constructor(prefix: string) {
    this._transformer = new TablePrefixTransformer(prefix);
  }

  transformQuery({ node, queryId }: PluginTransformQueryArgs): RootOperationNode {
    return this._transformer.transformNode(node, queryId);
  }

  async transformResult({ result }: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return result;
  }
}
