"use client";

import { useState, useEffect } from "react";

export interface DeptOption {
  id: string;
  key: string;
  label: string;
  order: number;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setDepartments(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getDeptLabel(key: string): string {
    return departments.find((d) => d.key === key)?.label ?? key;
  }

  return { departments, loading, getDeptLabel };
}
