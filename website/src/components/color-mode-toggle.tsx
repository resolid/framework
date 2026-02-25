import {
  Button,
  type ColorMode,
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useColorModeDispatch,
  useColorModeState,
} from "@resolid/react-ui";
import { SpriteIcon } from "~/components/sprite-icon";

const colorModes = {
  light: {
    label: "亮色模式",
    icon: "sun",
  },
  dark: {
    label: "暗色模式",
    icon: "moon",
  },
  auto: {
    label: "跟随系统",
    icon: "auto",
  },
};

export const ColorModeToggle = () => {
  const colorMode = useColorModeState();
  const setColorMode = useColorModeDispatch();

  return (
    <DropdownMenu placement="bottom">
      <DropdownMenuTrigger
        render={(props) => (
          <Button
            aria-label="颜色模式"
            color="neutral"
            variant="ghost"
            size="sm"
            iconOnly
            {...props}
          />
        )}
      >
        <SpriteIcon size="1.325em" name={colorModes[colorMode]?.icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="text-sm">
        <DropdownMenuArrow />
        {Object.entries(colorModes).map(([key, mode]) => (
          <DropdownMenuItem
            key={key}
            label={key}
            className={colorMode == key ? "text-link" : ""}
            onSelect={() => {
              setColorMode(key as ColorMode);
            }}
          >
            <SpriteIcon name={mode.icon} className="me-1.5" />
            {mode.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
