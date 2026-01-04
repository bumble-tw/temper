import { useState, useMemo, useEffect } from 'react'

export interface UsePaginationOptions<T> {
  items: T[]
  itemsPerPage: number
  initialPage?: number
}

export interface UsePaginationReturn<T> {
  currentPage: number
  totalPages: number
  currentItems: T[]
  setCurrentPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * 自定義分頁 Hook
 *
 * @template T - 項目類型
 * @param options - 分頁選項
 * @returns 分頁狀態和操作函數
 *
 * @example
 * ```tsx
 * const { currentItems, currentPage, totalPages, setCurrentPage } = usePagination({
 *   items: myList,
 *   itemsPerPage: 10,
 *   initialPage: 1
 * })
 * ```
 */
export function usePagination<T>({
  items,
  itemsPerPage,
  initialPage = 1
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage)

  // 計算總頁數
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerPage))
  }, [items.length, itemsPerPage])

  // 計算當前頁的項目
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage])

  // 當項目數量變化導致總頁數減少時，自動調整當前頁碼
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // 導航函數
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToFirstPage = () => {
    setCurrentPage(1)
  }

  const goToLastPage = () => {
    setCurrentPage(totalPages)
  }

  // 檢查是否有下一頁/上一頁
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  return {
    currentPage,
    totalPages,
    currentItems,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage,
    hasPreviousPage
  }
}
