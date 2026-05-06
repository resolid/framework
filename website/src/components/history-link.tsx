import {
  HistoryLink,
  HistoryNavLink,
  useHistoryBack,
  type UseHistoryBackOptions,
} from "@resolid/dev/router";
import { Button, type ButtonProps, type PrimitiveProps } from "@resolid/react-ui";

export { HistoryLink, HistoryNavLink };

type HistoryBackProps = ButtonProps & UseHistoryBackOptions;

export function HistoryBack(props: PrimitiveProps<"button", HistoryBackProps, "children">) {
  const { onClick, backTo = "/", ...rest } = props;

  const historyBack = useHistoryBack(backTo);

  return (
    <Button
      onClick={async (e) => {
        onClick?.(e);
        await historyBack();
      }}
      {...rest}
    >
      点击返回
    </Button>
  );
}
