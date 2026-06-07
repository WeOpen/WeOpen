"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { createContext, useContext } from "react";
import { cn } from "./utils";

type TabKey = string | number;

type TabsContextValue = {
  selectedKey: TabKey;
  onSelectionChange?: (key: TabKey) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  orientation?: "horizontal" | "vertical";
  selectedKey: TabKey;
  onSelectionChange?: (key: TabKey) => void;
};

function TabsRoot({ children, className, onSelectionChange, orientation = "horizontal", selectedKey, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ selectedKey, onSelectionChange }}>
      <div className={cn("tabs", `tabs--${orientation}`, className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsListContainer({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("tabs__list-container", className)} {...props}>
      {children}
    </div>
  );
}

function TabsList({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("tabs__list", className)} role="tablist" {...props}>
      {children}
    </div>
  );
}

function TabsTab({ children, className, id, ...props }: HTMLAttributes<HTMLButtonElement> & { id: TabKey }) {
  const context = useTabsContext();
  const isSelected = String(context.selectedKey) === String(id);
  return (
    <button
      aria-selected={isSelected}
      className={cn("tabs__tab", { "tabs__tab--selected": isSelected }, className)}
      id={`tab-${id}`}
      onClick={() => context.onSelectionChange?.(id)}
      role="tab"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function TabsIndicator({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden="true" className={cn("tabs__indicator", className)} {...props} />;
}

function TabsPanel({ children, className, id, ...props }: HTMLAttributes<HTMLDivElement> & { id: TabKey }) {
  const context = useTabsContext();
  if (String(context.selectedKey) !== String(id)) {
    return null;
  }
  return (
    <div aria-labelledby={`tab-${id}`} className={cn("tabs__panel", className)} role="tabpanel" {...props}>
      {children}
    </div>
  );
}

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs subcomponents must be rendered within <Tabs />");
  }
  return context;
}

export const Tabs = Object.assign(TabsRoot, {
  Indicator: TabsIndicator,
  List: TabsList,
  ListContainer: TabsListContainer,
  Panel: TabsPanel,
  Tab: TabsTab
});
