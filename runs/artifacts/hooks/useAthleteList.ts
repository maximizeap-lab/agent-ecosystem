// ─────────────────────────────────────────────
//  useAthleteList – List, Search & Filter Logic
// ─────────────────────────────────────────────
import { useState, useMemo, useCallback } from "react";
import type { AthleteListItem, AthleteFilters, ProfileStatus } from "../types/athlete";
import { MOCK_ATHLETES } from "../lib/athleteDefaults";

const DEFAULT_FILTERS: AthleteFilters = {
  search:      "",
  sportId:     "",
  teamId:      "",
  status:      "",
  nationality: "",
  page:        1,
  perPage:     10,
  sortBy:      "updatedAt",
  sortDir:     "desc",
};

export interface UseAthleteListReturn {
  athletes: AthleteListItem[];
  total: number;
  totalPages: number;
  filters: AthleteFilters;
  setFilter: <K extends keyof AthleteFilters>(key: K, value: AthleteFilters[K]) => void;
  resetFilters: () => void;
  deleteAthlete: (id: string) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  bulkDelete: () => void;
  isLoading: boolean;
}

export function useAthleteList(): UseAthleteListReturn {
  const [allAthletes, setAllAthletes] = useState<AthleteListItem[]>(MOCK_ATHLETES);
  const [filters, setFilters] = useState<AthleteFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading] = useState(false);

  // ── Filtering & Sorting ───────────────────
  const filtered = useMemo(() => {
    let list = [...allAthletes];

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          (a.preferredName ?? "").toLowerCase().includes(q) ||
          (a.primarySport ?? "").toLowerCase().includes(q) ||
          (a.primaryTeam ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.sportId) {
      list = list.filter((a) => a.primarySport?.toLowerCase().replace(/ /g, "") === filters.sportId);
    }

    if (filters.status) {
      list = list.filter((a) => a.status === filters.status);
    }

    if (filters.nationality) {
      list = list.filter((a) => a.nationality === filters.nationality);
    }

    // Sort
    list.sort((a, b) => {
      const key = filters.sortBy;
      const aVal = String(a[key] ?? "");
      const bVal = String(b[key] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return filters.sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [allAthletes, filters]);

  // ── Pagination ────────────────────────────
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.perPage));

  const paginated = useMemo(() => {
    const start = (filters.page - 1) * filters.perPage;
    return filtered.slice(start, start + filters.perPage);
  }, [filtered, filters.page, filters.perPage]);

  // ── Filter Actions ────────────────────────
  const setFilter = useCallback(
    <K extends keyof AthleteFilters>(key: K, value: AthleteFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== "page" ? { page: 1 } : {}),
      }));
      setSelectedIds(new Set());
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedIds(new Set());
  }, []);

  // ── Delete ────────────────────────────────
  const deleteAthlete = useCallback((id: string) => {
    setAllAthletes((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const bulkDelete = useCallback(() => {
    setAllAthletes((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  // ── Selection ─────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = paginated.map((a) => a.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }, [paginated, selectedIds]);

  return {
    athletes: paginated,
    total,
    totalPages,
    filters,
    setFilter,
    resetFilters,
    deleteAthlete,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    bulkDelete,
    isLoading,
  };
}
