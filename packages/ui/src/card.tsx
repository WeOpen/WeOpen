import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  description?: ReactNode;
  title?: ReactNode;
  variant?: "default" | "secondary" | "transparent";
};

type CardSlotProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

type CardTextProps = HTMLAttributes<HTMLHeadingElement> & {
  children?: ReactNode;
};

function CardRoot({ children, className, description, title, variant = "default", ...props }: CardProps) {
  const hasIntro = Boolean(title || description);

  return (
    <div className={cn("card", `card--${variant}`, className)} {...props}>
      {hasIntro ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      {children !== undefined && children !== null ? (hasIntro ? <CardContent>{children}</CardContent> : children) : null}
    </div>
  );
}

function CardHeader({ children, className, ...props }: CardSlotProps) {
  return (
    <div className={cn("card__header", className)} {...props}>
      {children}
    </div>
  );
}

function CardContent({ children, className, ...props }: CardSlotProps) {
  return (
    <div className={cn("card__content", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className, ...props }: CardSlotProps) {
  return (
    <div className={cn("card__footer", className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ children, className, ...props }: CardTextProps) {
  return (
    <h2 className={cn("card__title", className)} {...props}>
      {children}
    </h2>
  );
}

function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("card__description", className)} {...props}>
      {children}
    </p>
  );
}

export const Card = Object.assign(CardRoot, {
  Content: CardContent,
  Description: CardDescription,
  Footer: CardFooter,
  Header: CardHeader,
  Title: CardTitle
});
