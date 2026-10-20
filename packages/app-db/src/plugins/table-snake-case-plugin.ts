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

export function snakeCase(input: string): string {
  const s = input.replaceAll(APOSTROPHE, "");
  return (s.match(WORD) ?? []).join("_").toLowerCase();
}

class SnakeCaseTransformer extends OperationNodeTransformer {
  protected override transformTable(node: TableNode): TableNode {
    const transformed = super.transformTable(node);

    return {
      ...transformed,
      table: {
        ...transformed.table,
        identifier: {
          ...transformed.table.identifier,
          name: snakeCase(transformed.table.identifier.name),
        },
      },
    };
  }
}

export class TableSnakeCasePlugin implements KyselyPlugin {
  private readonly _transformer: SnakeCaseTransformer;

  constructor() {
    this._transformer = new SnakeCaseTransformer();
  }

  transformQuery({ node, queryId }: PluginTransformQueryArgs): RootOperationNode {
    return this._transformer.transformNode(node, queryId);
  }

  async transformResult({ result }: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return result;
  }
}
