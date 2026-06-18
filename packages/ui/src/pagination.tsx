"use client";

import type { HTMLAttributes } from "react";
import { Button } from "./button";
import { PixelIcon } from "./pixel-icon";
import { cn } from "./utils";

type PaginationItem = number | "ellipsis";

export type PaginationProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  boundaryCount?: number;
  disabled?: boolean;
  label?: string;
  onPageChange?: (page: number) => void;
  page: number;
  siblingCount?: number;
  totalPages: number;
};

export function Pagination({
  boundaryCount = 1,
  className,
  disabled = false,
  label = "Pagination",
  onPageChange,
  page,
  siblingCount = 1,
  totalPages,
  ...props
}: PaginationProps) {
  const pageCount = Math.max(1, Math.floor(totalPages));
  const currentPage = clamp(Math.floor(page), 1, pageCount);
  const isUnavailable = disabled || totalPages < 1;
  const items = paginationItems(currentPage, pageCount, siblingCount, boundaryCount);

  function goToPage(nextPage: number) {
    const normalizedPage = clamp(nextPage, 1, pageCount);
    if (isUnavailable || normalizedPage === currentPage) {
      return;
    }
    onPageChange?.(normalizedPage);
  }

  return (
    <nav aria-label={label} className={cn("weopen-pagination", className)} {...props}>
      <Button
        aria-label="Previous page"
        className="weopen-pagination__edge"
        disabled={isUnavailable || currentPage <= 1}
        isIconOnly
        onPress={() => goToPage(currentPage - 1)}
        size="icon-sm"
        variant="secondary"
      >
        <PixelIcon name="chevron-left" variant="bare" />
      </Button>
      <div className="weopen-pagination__items">
        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span className="weopen-pagination__ellipsis" key={`ellipsis-${index}`}>
                ...
              </span>
            );
          }
          const isCurrent = item === currentPage;
          return (
            <button
              aria-current={isCurrent ? "page" : undefined}
              className={cn("weopen-pagination__item", { "weopen-pagination__item--current": isCurrent })}
              disabled={isUnavailable || isCurrent}
              key={item}
              onClick={() => goToPage(item)}
              type="button"
            >
              {item}
            </button>
          );
        })}
      </div>
      <Button
        aria-label="Next page"
        className="weopen-pagination__edge"
        disabled={isUnavailable || currentPage >= pageCount}
        isIconOnly
        onPress={() => goToPage(currentPage + 1)}
        size="icon-sm"
        variant="secondary"
      >
        <PixelIcon name="chevron-right" variant="bare" />
      </Button>
    </nav>
  );
}

function paginationItems(
  page: number,
  totalPages: number,
  siblingCount: number,
  boundaryCount: number
): PaginationItem[] {
  const pageSet = new Set<number>();
  const normalizedSiblingCount = Math.max(0, Math.floor(siblingCount));
  const normalizedBoundaryCount = Math.max(0, Math.floor(boundaryCount));

  for (let pageNumber = 1; pageNumber <= Math.min(normalizedBoundaryCount, totalPages); pageNumber += 1) {
    pageSet.add(pageNumber);
  }

  for (let pageNumber = Math.max(totalPages - normalizedBoundaryCount + 1, 1); pageNumber <= totalPages; pageNumber += 1) {
    pageSet.add(pageNumber);
  }

  for (
    let pageNumber = Math.max(page - normalizedSiblingCount, 1);
    pageNumber <= Math.min(page + normalizedSiblingCount, totalPages);
    pageNumber += 1
  ) {
    pageSet.add(pageNumber);
  }

  const sortedPages = [...pageSet].sort((left, right) => left - right);
  const items: PaginationItem[] = [];

  for (const pageNumber of sortedPages) {
    const lastItem = items[items.length - 1];
    const previousPage = typeof lastItem === "number" ? lastItem : undefined;
    if (previousPage !== undefined && pageNumber - previousPage > 1) {
      if (pageNumber - previousPage === 2) {
        items.push(previousPage + 1);
      } else {
        items.push("ellipsis");
      }
    }
    items.push(pageNumber);
  }

  return items;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
