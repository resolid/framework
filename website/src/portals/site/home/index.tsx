import { Button } from "@resolid/react-ui";
import { SpriteIcon } from "~/components/sprite-icon";

export default function HomeIndex() {
  return (
    <main className="max-w-3xl mx-auto prose px-4 py-8 dark:prose-invert">
      <h1 className="mt-16 text-center text-[3rem] leading-normal font-[800] md:text-[4rem]">
        Resolid
      </h1>
      <p className="text-center">
        使用 React Router 驱动的全栈网站，展示使用现代 Web 技术构建高性能、可扩展和用户友好的 Web
        应用程序的最佳实践。
      </p>
      <div className="not-prose mt-10 inline-flex w-full items-center justify-center gap-9">
        <Button color="neutral" size="xl">
          快速开始
        </Button>
        <Button
          color="neutral"
          variant="outline"
          size="xl"
          render={(props) => (
            <a
              {...props}
              href="https://github.com/resolid/framework"
              target="_blank"
              rel="noreferrer"
            >
              <SpriteIcon size="1.5em" className="me-2" name="github" />
              Github
            </a>
          )}
        />
      </div>
    </main>
  );
}
