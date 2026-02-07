import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-lg font-bold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 touch-manipulation active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-destructive",
        success:
          "bg-success text-success-foreground hover:bg-success/90 border-2 border-success",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 border-2 border-warning",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-2 border-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        industrial:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 border-2 border-primary",
      },
      size: {
        default: "min-h-[56px] px-6 py-3",
        sm: "min-h-[44px] px-4 py-2 text-base",
        lg: "min-h-[64px] px-8 py-4 text-xl",
        xl: "min-h-[72px] px-10 py-5 text-2xl",
        icon: "min-h-[56px] min-w-[56px]",
        "icon-lg": "min-h-[64px] min-w-[64px]",
        full: "min-h-[64px] w-full px-8 py-4 text-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
